// PhaseManager.js - Handles turn/phase state machine for Dungeon Command
// Extracted from gameState.js for single responsibility

import { TerrainTypes } from './Board.js'
import { TERRAIN, GAME_RULES } from '../constants/gameConstants.js'

// Game phase constants - defines the turn sequence
export const GamePhases = {
  REFRESH: 'REFRESH',     // Draw cards, untap creatures
  ACTIVATE: 'ACTIVATE',   // Move creatures and attack
  DEPLOY: 'DEPLOY',       // Deploy creatures from hand
  CLEANUP: 'CLEANUP'      // End turn, draw cards
}

/**
 * PhaseManager - Manages turn/phase state machine
 * Handles phase transitions, turn order, and phase-specific logic
 */
export class PhaseManager {
  constructor(gameState) {
    this.gameState = gameState
  }

  /**
   * Apply water damage to creatures standing on water at end of ACTIVATE phase
   * Only applies to creatures owned by the CURRENT PLAYER (the one ending their activate phase)
   * Creatures on WATER terrain take 10 damage unless they are flying/phasing
   * @returns {Array} Damage results for each affected creature
   */
  applyWaterDamage() {
    const damageResults = []
    const gs = this.gameState
    const currentPlayer = gs.currentPlayer

    // Count creatures on water for debugging
    let creaturesOnWater = 0
    let flyingOnWater = 0
    let enemyCreaturesSkipped = 0

    console.log(`[WATER DEBUG] ========================================`)
    console.log(`[WATER DEBUG] Phase: END OF ACTIVATE for ${currentPlayer}`)
    console.log(`[WATER DEBUG] Checking water damage for ${currentPlayer}'s creatures only`)

    // Check all tiles for creatures standing on water
    gs.getAllTiles().forEach(tile => {
      if (tile.terrain === TerrainTypes.WATER && tile.occupant) {
        const creature = tile.occupant

        console.log(`[WATER DEBUG] Found creature on water: ${creature.creature.name} (Owner: ${creature.owner}) at (${tile.x}, ${tile.y})`)

        // Only apply water damage to creatures owned by the current player
        // Enemy creatures take damage when THEIR faction ends their activate phase
        if (creature.owner !== currentPlayer) {
          console.log(`[WATER DEBUG] SKIPPED - ${creature.creature.name} owned by ${creature.owner}, not ${currentPlayer}`)
          enemyCreaturesSkipped++
          return
        }

        creaturesOnWater++

        // Flying and Phasing creatures are immune to water damage
        if (gs.hasFlying(creature) || gs.hasPhasing(creature)) {
          const immunityType = gs.hasFlying(creature) ? 'Flying' : 'Phasing'
          console.log(`[WATER DEBUG] IMMUNE - ${creature.creature.name} has ${immunityType}`)
          flyingOnWater++
          return
        }

        const hpBefore = creature.currentHP
        console.log(`[WATER DEBUG] APPLYING 10 DAMAGE to ${creature.creature.name} (HP before: ${hpBefore})`)

        // Apply water damage to non-flying creatures
        const damageTaken = creature.takeDamage(TERRAIN.WATER_DAMAGE)

        console.log(`[WATER DEBUG] RESULT: ${creature.creature.name} now has ${creature.currentHP} HP${creature.currentHP <= 0 ? ' - DESTROYED!' : ''}`)

        damageResults.push({
          creature: creature.creature.name,
          position: { x: tile.x, y: tile.y },
          damage: damageTaken,
          destroyed: creature.currentHP <= 0
        })

        // If creature died, handle death
        if (creature.currentHP <= 0) {
          const owner = creature.owner
          tile.occupant = null

          // Remove from player's creaturesInPlay array and add to graveyard
          if (owner) {
            const ownerState = gs.players[owner]
            const index = ownerState.creaturesInPlay.indexOf(creature)
            if (index !== -1) {
              ownerState.creaturesInPlay.splice(index, 1)
            }
            // Add creature CARD to graveyard (not instance)
            ownerState.creatureGraveyard.push(creature.creature)
          }
        }
      }
    })

    console.log(`[WATER DEBUG] Summary: ${creaturesOnWater} own creatures on water, ${flyingOnWater} immune (flying/phasing), ${damageResults.length} took damage, ${enemyCreaturesSkipped} enemy creatures skipped`)
    console.log(`[WATER DEBUG] ========================================`)

    return damageResults
  }

  /**
   * Advance to the next phase in the turn sequence
   * Phase order: REFRESH -> ACTIVATE -> DEPLOY -> CLEANUP -> (end turn)
   * @returns {Object} Result containing waterDamageResults if applicable
   */
  advancePhase() {
    const gs = this.gameState
    const phaseOrder = [GamePhases.REFRESH, GamePhases.ACTIVATE, GamePhases.DEPLOY, GamePhases.CLEANUP]
    const currentIndex = phaseOrder.indexOf(gs.currentPhase)

    let waterDamageResults = []

    // Check for water damage when leaving ACTIVATE phase
    if (gs.currentPhase === GamePhases.ACTIVATE) {
      waterDamageResults = this.applyWaterDamage()
    }

    if (currentIndex === phaseOrder.length - 1) {
      // End of turn - switch players
      this.endTurn()
    } else {
      const nextPhase = phaseOrder[currentIndex + 1]
      gs.currentPhase = nextPhase

      // Increase leadership by 1 when entering Deploy phase (but not on turn 1)
      if (nextPhase === GamePhases.DEPLOY && gs.turnNumber > 1) {
        const player = gs.getCurrentPlayerState()
        player.increaseLeadership(1)
      }
    }

    return { waterDamageResults }
  }

  /**
   * End the current player's turn and transition to next player
   * Handles player elimination, game over conditions, and turn cycling
   */
  endTurn() {
    const gs = this.gameState

    // Check for defeated players and eliminate them
    const defeatedPlayers = gs.activePlayers.filter(
      playerId => gs.players[playerId].isDefeated(gs.turnNumber)
    )

    // Eliminate defeated players (remove their creatures from board)
    for (const playerId of defeatedPlayers) {
      this.eliminatePlayer(playerId)
    }

    // Remove defeated players from active players list
    gs.activePlayers = gs.activePlayers.filter(
      playerId => !defeatedPlayers.includes(playerId)
    )

    // Check if game should end (1 or fewer players remaining)
    if (gs.activePlayers.length <= 1) {
      gs.gameOver = true
      gs.winner = gs.activePlayers[0] || null
      return
    }

    // If current player was eliminated, adjust index
    let currentIndex = gs.activePlayers.indexOf(gs.currentPlayer)
    if (currentIndex === -1) {
      // Current player was eliminated, start from beginning of remaining players
      currentIndex = -1
    }

    // Move to next active player
    const nextIndex = (currentIndex + 1) % gs.activePlayers.length
    gs.currentPlayer = gs.activePlayers[nextIndex]

    // If we've cycled back to first player, increment turn number
    if (nextIndex === 0) {
      gs.turnNumber++
    }

    // Turn 1 is deploy-only for both players
    if (gs.turnNumber === 1) {
      gs.currentPhase = GamePhases.DEPLOY
    } else {
      gs.currentPhase = GamePhases.REFRESH
    }

    // Check for game over conditions (handles turn limit, etc.)
    this.checkGameOver()
  }

  /**
   * Eliminate a player from the game - removes all their creatures from the board
   * @param {string} playerId - The player to eliminate
   */
  eliminatePlayer(playerId) {
    const gs = this.gameState
    const player = gs.players[playerId]
    if (!player) return

    // Remove all creatures from the board and clear their tiles
    for (const creature of player.creaturesInPlay) {
      if (creature.position) {
        const tile = gs.getTile(creature.position.x, creature.position.y)
        if (tile) {
          tile.occupant = null
        }
        creature.position = null
      }
    }

    // Clear the creaturesInPlay array
    player.creaturesInPlay = []
  }

  /**
   * Check for game over conditions
   * Conditions: all players defeated, one player left, or turn limit reached
   */
  checkGameOver() {
    const gs = this.gameState

    // Get all non-defeated players
    const alivePlayers = gs.activePlayers.filter(playerId => !gs.players[playerId].isDefeated(gs.turnNumber))

    if (alivePlayers.length === 0) {
      // All defeated - highest morale wins
      gs.gameOver = true
      let highestMorale = -1
      gs.activePlayers.forEach(playerId => {
        const morale = gs.players[playerId].morale
        if (morale > highestMorale) {
          highestMorale = morale
          gs.winner = playerId
        }
      })
    } else if (alivePlayers.length === 1) {
      // Only one player left
      gs.gameOver = true
      gs.winner = alivePlayers[0]
    } else if (gs.turnNumber >= GAME_RULES.MAX_TURNS) {
      // Turn limit reached - highest morale wins
      gs.gameOver = true
      let highestMorale = -1
      let winner = null
      gs.activePlayers.forEach(playerId => {
        const morale = gs.players[playerId].morale
        if (morale > highestMorale) {
          highestMorale = morale
          winner = playerId
        }
      })
      gs.winner = winner
    }
  }

  /**
   * Check if a specific player should be eliminated and remove them immediately
   * Called after attacks to prevent wasted attacks on defeated players
   * @param {string} playerId - Player to check
   * @returns {Object} { eliminated: boolean, reason: string }
   */
  checkAndEliminatePlayer(playerId) {
    const gs = this.gameState
    const player = gs.players[playerId]
    if (!player || !gs.activePlayers.includes(playerId)) {
      return { eliminated: false, reason: null }
    }

    // Check morale defeat
    if (player.morale <= 0) {
      this.eliminatePlayer(playerId)
      gs.activePlayers = gs.activePlayers.filter(id => id !== playerId)
      return { eliminated: true, reason: 'morale' }
    }

    // Check creature defeat (after turn 1)
    if (gs.turnNumber > 1 && player.creaturesInPlay.length === 0) {
      this.eliminatePlayer(playerId)
      gs.activePlayers = gs.activePlayers.filter(id => id !== playerId)
      return { eliminated: true, reason: 'creatures' }
    }

    return { eliminated: false, reason: null }
  }

  /**
   * Execute refresh phase for current player
   * - Reset commander ability state
   * - Draw 1 order card
   * - Untap all creatures
   * - Clear deployment protection from previous turns
   * - Auto-advance to activate phase
   */
  executeRefreshPhase() {
    const gs = this.gameState
    const player = gs.getCurrentPlayerState()

    // Reset commander ability state for new turn
    player.resetAbilitiesForNewTurn()

    // Draw 1 order card
    player.drawOrderCards(1)

    // Untap all creatures
    player.creaturesInPlay.forEach(creature => creature.untap())

    // Clear deployment protection from creatures deployed on previous turns
    player.creaturesInPlay.forEach(creature => {
      if (creature.deployedThisTurn && creature.turnDeployed !== gs.turnNumber) {
        creature.clearDeploymentProtection()
      }
    })

    // INSUBSTANTIAL: Reset ability for Curse of Undeath creatures
    // Only reset when the Undead faction enters their refresh phase
    if (player.faction === 'Curse of Undeath') {
      player.creaturesInPlay.forEach(creature => {
        if (creature.insubstantialUsed !== undefined) {
          creature.insubstantialUsed = false
        }
      })
    }

    // REGENERATE: Heal creatures with Regenerate ability at start of refresh
    // AI difficulty affects whether regeneration is applied (0/50/100 pattern)
    const regeneratedCreatures = []
    player.creaturesInPlay.forEach(creature => {
      if (gs.hasRegenerate(creature) && creature.damageTokens > 0) {
        // AI difficulty check (0/50/100 pattern)
        // Human players (no aiDifficulty) always regenerate
        const shouldRegenerate = this.shouldUseRegenerate(player.aiDifficulty)

        if (shouldRegenerate) {
          const healAmount = Math.min(gs.getRegenerateAmount(creature), creature.damageTokens)
          creature.heal(gs.getRegenerateAmount(creature))
          regeneratedCreatures.push({ creature, healAmount })
        }
      }
    })

    // Store for UI notification
    if (regeneratedCreatures.length > 0) {
      gs.lastRegenerateResult = regeneratedCreatures
    }

    // Auto-advance to activate phase
    this.advancePhase()
  }

  /**
   * Determine if AI should use REGENERATE based on difficulty
   * @param {string} aiDifficulty - 'easy', 'medium', 'hard', or undefined for human
   * @returns {boolean} True if regeneration should be applied
   */
  shouldUseRegenerate(aiDifficulty) {
    // Human players (no aiDifficulty) always regenerate
    if (!aiDifficulty) return true
    // Easy AI never regenerates (0%)
    if (aiDifficulty === 'easy') return false
    // Hard AI always regenerates (100%)
    if (aiDifficulty === 'hard') return true
    // Medium AI: 50% chance
    return Math.random() < 0.5
  }

  /**
   * Execute cleanup phase for current player
   * - Untap all current player's creatures
   * - Draw creature cards back to hand limit
   * - Auto-advance (ends turn)
   */
  executeCleanupPhase() {
    const gs = this.gameState
    const player = gs.getCurrentPlayerState()

    // Untap only current player's creatures (not opponent's)
    player.creaturesInPlay.forEach(creature => creature.untap())

    // Draw creature cards back to hand limit from commander stats
    const creatureHandLimit = player.commander.startingCreatureHandSize
    const cardsToDraw = Math.max(0, creatureHandLimit - player.creatureHand.length)
    player.drawCreatureCards(cardsToDraw)

    // Auto-advance (which will end turn)
    this.advancePhase()
  }

  /**
   * Execute deploy phase for current player
   * Note: Leadership increase happens in advancePhase() when entering Deploy phase
   * Note: Actual deployment of creatures is handled by player actions
   * Auto-advances to cleanup phase
   */
  executeDeployPhase() {
    // Note: Leadership increase now happens in advancePhase() when entering Deploy phase
    // Note: Actual deployment of creatures is handled by player actions
    // Auto-advance to cleanup phase
    this.advancePhase()
  }
}

export default PhaseManager
