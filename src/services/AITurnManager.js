// AITurnManager.js - Manages AI turn execution and action processing
// Extracted from GameBoard.jsx for single responsibility

import SimpleAI from '../ai/simpleAI.js'
import { GamePhases } from '../models/gameState.js'

/**
 * AITurnManager - Handles AI turn execution and action processing
 * Separates AI logic from UI concerns
 */
export class AITurnManager {
  constructor(gameState, gameConfig) {
    this.gameState = gameState
    this.gameConfig = gameConfig
  }

  /**
   * Check if a player is human
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if player is human
   */
  isPlayerHuman(playerId) {
    if (!this.gameConfig) return false
    const playerNum = playerId.replace('PLAYER', '')
    const playerKey = `player${playerNum}`
    return this.gameConfig[playerKey]?.isHuman || false
  }

  /**
   * Check if current player is AI
   * @returns {boolean} True if current player is AI
   */
  isCurrentPlayerAI() {
    return !this.isPlayerHuman(this.gameState.currentPlayer)
  }

  /**
   * Get AI difficulty for a player
   * @param {string} playerId - Player ID
   * @returns {string} AI difficulty ('easy', 'medium', 'hard')
   */
  getAIDifficulty(playerId) {
    const player = this.gameState.players[playerId]
    return player?.aiDifficulty || 'easy'
  }

  /**
   * Execute AI turn for current phase
   * @returns {Object} { actions, message, attackIntentions }
   */
  executeAITurn() {
    const currentPlayerId = this.gameState.currentPlayer
    const difficulty = this.getAIDifficulty(currentPlayerId)
    const ai = new SimpleAI(this.gameState, currentPlayerId, null, difficulty)
    const result = ai.executeTurn()

    // Extract attack intentions for queuing
    const actions = result.actions || []
    const attackIntentions = actions.filter(action => action.type === 'attack_intention')

    return {
      actions,
      message: result.message,
      attackIntentions,
      usedHorde: this.checkHordeUsage(actions)
    }
  }

  /**
   * Check if HORDE ability was used in actions
   * @param {Array} actions - Actions from AI turn
   * @returns {boolean} True if HORDE was used
   */
  checkHordeUsage(actions) {
    return this.gameState.currentPhase === GamePhases.REFRESH &&
           this.gameState.canDeployDuringRefresh(this.gameState.currentPlayer) &&
           actions.some(a => a.isHordeDeploy)
  }

  /**
   * Clear HORDE protection for creatures deployed this turn
   * Called after AI uses HORDE ability
   */
  clearHordeProtection() {
    const player = this.gameState.getCurrentPlayerState()
    player.creaturesInPlay.forEach(creature => {
      if (creature.deployedThisTurn && creature.turnDeployed === this.gameState.turnNumber) {
        creature.clearDeploymentProtection()
      }
    })
  }

  /**
   * Validate an AI attack intention before execution
   * Checks if attack is still valid (positions may have changed)
   * @param {Object} action - Attack intention action
   * @returns {Object} { valid, reason }
   */
  validateAttackIntention(action) {
    const { attackerInstance, defenderInstance, targetInfo } = action

    // Skip if defender's owner is already eliminated
    if (!this.gameState.activePlayers.includes(defenderInstance.owner)) {
      return { valid: false, reason: 'defender_eliminated' }
    }

    // Skip if target is already dead
    if (defenderInstance.isDestroyed() || !defenderInstance.position) {
      return { valid: false, reason: 'target_dead' }
    }

    // Skip if attacker is already dead
    if (attackerInstance.isDestroyed() || !attackerInstance.position) {
      return { valid: false, reason: 'attacker_dead' }
    }

    // Re-validate attack is still valid from current position
    const currentValidTargets = this.gameState.getValidAttackTargets(attackerInstance)
    const isStillValidTarget = currentValidTargets.some(
      t => t.creature.instanceId === defenderInstance.instanceId &&
           t.attackType === targetInfo.attackType
    )

    if (!isStillValidTarget) {
      return { valid: false, reason: 'attack_invalid' }
    }

    return { valid: true }
  }

  /**
   * Execute AI defense decision for a creature being attacked
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {Object} targetInfo - Attack info (attackType, etc.)
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @returns {Object} { defenseResult, reactionDecision }
   */
  executeAIDefense(defenderInstance, targetInfo, attackerInstance) {
    const defenderPlayerId = defenderInstance.owner
    const difficulty = this.getAIDifficulty(defenderPlayerId)
    const defenderAI = new SimpleAI(this.gameState, defenderPlayerId, null, difficulty)
    const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

    // Calculate incoming damage
    const incomingDamage = targetInfo.attackType === 'melee'
      ? attackerInstance.creature.meleeAttack?.damage || 0
      : attackerInstance.creature.rangedAttack?.damage || 0

    // AI decides whether to use defensive abilities
    const defenseDecision = defenderAI.decideDefense(defenderInstance, incomingDamage, attackerInstance.owner)
    let defenseResult = null

    if (defenseDecision.type === 'cower') {
      defenseResult = this.gameState.applyCower(defenderInstance, incomingDamage, attackerInstance.owner)
      if (defenseResult.success) {
        defenseResult.type = 'cower'
        defenseResult.damagePrevented = defenseResult.damageAvoided
      }
    } else if (defenseDecision.type === 'unstoppable_hordes') {
      // Apply UNSTOPPABLE HORDES for defender and any adjacent Undead
      let totalDamagePrevented = 0
      const creaturesUsed = []

      if (defenseDecision.defenderCanUse) {
        const result = this.gameState.applyUnstoppableHordes(defenderInstance)
        if (result.success) {
          totalDamagePrevented += result.damagePrevented
          creaturesUsed.push(defenderInstance)
        }
      }

      for (const creature of defenseDecision.creatures || []) {
        const result = this.gameState.applyUnstoppableHordes(creature)
        if (result.success) {
          totalDamagePrevented += result.damagePrevented
          creaturesUsed.push(creature)
        }
      }

      if (creaturesUsed.length > 0) {
        defenseResult = {
          success: true,
          type: 'unstoppable_hordes',
          damagePrevented: totalDamagePrevented,
          moraleCost: creaturesUsed.length,
          creaturesUsed
        }
      }
    } else if (defenseDecision.type === 'immediate_card') {
      // Apply IMMEDIATE card defense
      const result = this.gameState.applyImmediateCardDefense(defenseDecision.card, defenseDecision.creature)
      if (result.success) {
        // Handle shift after use (Cloud of Bats)
        if (result.shiftAfterUse > 0 && result.creatureToShift) {
          const shiftResult = this.handleAIShiftAfterDefense(result.creatureToShift, result.shiftAfterUse, attackerInstance)
          if (shiftResult.shifted) {
            // Tap the creature after shifting
            result.creatureToShift.tap()
          } else {
            // No shift, just tap
            result.creatureToShift.tap()
          }
        }

        defenseResult = {
          success: true,
          type: 'immediate_card',
          damagePrevented: result.damagePrevented,
          moraleCost: result.moraleCost || 0,
          cardUsed: defenseDecision.card.name,
          creatureTapped: defenseDecision.creature.creature.name,
          moraleGain: result.moraleGain || 0,
          untapAfterUse: result.untapAfterUse || false,
          bonusDrawsQueued: result.bonusDrawsQueued || 0,
          shiftedTo: result.shiftAfterUse > 0 ? result.creatureToShift?.position : null
        }
      }
    }

    // Process AI reactions (IMMEDIATE cards) - legacy handling
    if (reactionDecision.reactions.length > 0) {
      const defenderPlayer = this.gameState.players[defenderPlayerId]

      // Sort by cardIndex descending to prevent array shift issues
      reactionDecision.reactions.sort((a, b) => b.cardIndex - a.cardIndex)

      reactionDecision.reactions.forEach(reaction => {
        reaction.creature.isTapped = true
        defenderPlayer.orderHand.splice(reaction.cardIndex, 1)
      })
    }

    return { defenseResult, reactionDecision }
  }

  /**
   * Format attack result message for toast notification
   * @param {Object} result - Attack result from gameState
   * @param {Object} defenseResult - Defense result (if any)
   * @param {Object} reactionDecision - Reaction decision (if any)
   * @param {CreatureInstance} attackerInstance - Attacker
   * @param {CreatureInstance} defenderInstance - Defender
   * @param {string} attackType - 'melee' or 'ranged'
   * @returns {string} Formatted message
   */
  formatAttackMessage(result, defenseResult, reactionDecision, attackerInstance, defenderInstance, attackType) {
    let message = ''

    // Add defense info to message
    if (defenseResult && defenseResult.success) {
      if (defenseResult.type === 'cower') {
        message += `🛡️ AI used COWER: ${defenseResult.damagePrevented} damage avoided (cost ${defenseResult.moraleCost} morale)! `
      } else if (defenseResult.type === 'unstoppable_hordes') {
        message += `💀 AI used UNSTOPPABLE HORDES: ${defenseResult.damagePrevented} damage prevented (${defenseResult.creaturesUsed.length} Undead, cost ${defenseResult.moraleCost} morale)! `
      } else if (defenseResult.type === 'immediate_card') {
        let extraEffects = ''
        if (defenseResult.moraleGain > 0) extraEffects += ` +${defenseResult.moraleGain} morale!`
        if (defenseResult.untapAfterUse) extraEffects += ` ${defenseResult.creatureTapped} untapped!`
        if (defenseResult.bonusDrawsQueued > 0) extraEffects += ` Drew ${defenseResult.bonusDrawsQueued} card${defenseResult.bonusDrawsQueued > 1 ? 's' : ''}.`
        message += `⚡ AI used ${defenseResult.cardUsed}: ${defenseResult.damagePrevented} damage prevented${defenseResult.untapAfterUse ? '' : ` (${defenseResult.creatureTapped} tapped)`}!${extraEffects} `
      }
    }

    // Add reaction info to message
    if (reactionDecision && reactionDecision.reactions.length > 0) {
      message += `⚡ AI used ${reactionDecision.reactions.length} Immediate card${reactionDecision.reactions.length !== 1 ? 's' : ''}! `
    }

    message += `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
               `with ${attackType} for ${result.damage} damage!`

    if (result.destroyed) {
      message += ` ${defenderInstance.creature.name} was destroyed! `
      message += `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
                `Defender ${result.moraleChange.defender}`
      // BLOODTHIRSTY ability notification
      if (result.bloodthirsty) {
        message += ` 🩸 BLOODTHIRSTY: +${result.bloodthirsty.leadershipGained} Leadership!`
      }
    } else {
      message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
    }

    return message
  }

  /**
   * Handle AI shift after defense (Cloud of Bats)
   * AI logic: Move away from attacker, toward allied creatures if possible
   * @param {CreatureInstance} creature - The creature to shift
   * @param {number} maxShift - Maximum shift distance
   * @param {CreatureInstance} attacker - The attacker (to move away from)
   * @returns {Object} { shifted: boolean, newPosition: {x, y} | null }
   */
  handleAIShiftAfterDefense(creature, maxShift, attacker) {
    const validTiles = this.gameState.getValidShiftTiles(creature, maxShift)
    if (validTiles.length === 0) {
      return { shifted: false, newPosition: null }
    }

    // Find best tile: maximize distance from attacker
    let bestTile = null
    let bestScore = -Infinity

    const attackerPos = attacker?.position || { x: 0, y: 0 }
    const allies = this.gameState.players[creature.owner]?.creaturesInPlay || []

    for (const tile of validTiles) {
      // Calculate distance from attacker (Chebyshev)
      const distFromAttacker = Math.max(
        Math.abs(tile.x - attackerPos.x),
        Math.abs(tile.y - attackerPos.y)
      )

      // Calculate average distance to allied creatures (prefer staying near allies)
      let allyScore = 0
      let allyCount = 0
      for (const ally of allies) {
        if (ally.instanceId === creature.instanceId || !ally.position) continue
        const distToAlly = Math.max(
          Math.abs(tile.x - ally.position.x),
          Math.abs(tile.y - ally.position.y)
        )
        // Prefer being closer to allies (lower distance = higher score)
        allyScore += (10 - Math.min(distToAlly, 10))
        allyCount++
      }

      // Combine scores: prioritize distance from attacker, then proximity to allies
      const score = distFromAttacker * 10 + (allyCount > 0 ? allyScore / allyCount : 0)

      if (score > bestScore) {
        bestScore = score
        bestTile = tile
      }
    }

    if (bestTile) {
      // Execute the shift
      const fromTile = this.gameState.getTile(creature.position.x, creature.position.y)
      const targetTile = this.gameState.getTile(bestTile.x, bestTile.y)

      if (fromTile && targetTile) {
        fromTile.occupant = null
        targetTile.occupant = creature
        creature.position = { x: bestTile.x, y: bestTile.y }
        return { shifted: true, newPosition: bestTile }
      }
    }

    return { shifted: false, newPosition: null }
  }
}

export default AITurnManager
