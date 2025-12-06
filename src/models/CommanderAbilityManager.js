/**
 * CommanderAbilityManager - Centralized management for all commander abilities
 *
 * Extracted from gameState.js to follow Single Responsibility Principle.
 * This class manages:
 * - Commander ability checks (hasCommanderAbility, getCommanderAbility)
 * - Faction-specific ability logic (GRUUMSH COMMANDS IT, WALLS OF WEB, etc.)
 * - Defense mechanics (COWER, UNSTOPPABLE HORDES, IMMEDIATE cards)
 * - Active abilities (SCROLLBOOK, VERSATILE, ORC SCOUT)
 *
 * All abilities include faction validation to ensure they only apply to the correct faction.
 *
 * Big O Complexity Summary:
 * - Most ability checks: O(a) where a = commander abilities (1-2), effectively O(1)
 * - Defense options: O(h + c) where h = hand size, c = creatures in play
 * - Adjacent checks: O(8) = O(1) - fixed number of directions
 */

import { COMBAT, COMMANDER_ABILITIES } from '../constants/gameConstants.js'

/**
 * CommanderAbilityManager class
 * Requires a reference to gameState for accessing game data
 */
export class CommanderAbilityManager {
  /**
   * @param {GameState} gameState - Reference to the main game state
   */
  constructor(gameState) {
    this.gameState = gameState
  }

  // ============================================================================
  // CORE ABILITY CHECKS
  // ============================================================================

  /**
   * Check if a player's commander has a specific ability
   * @param {string} playerId - The player ID
   * @param {string} abilityId - The ability ID to check for
   * @returns {boolean} True if commander has this ability
   */
  hasCommanderAbility(playerId, abilityId) {
    const player = this.gameState.players[playerId]
    if (!player || !player.commander) return false
    return player.commander.hasAbility(abilityId)
  }

  /**
   * Get a commander ability by ID for a player
   * @param {string} playerId - The player ID
   * @param {string} abilityId - The ability ID to get
   * @returns {Object|null} The ability object or null
   */
  getCommanderAbility(playerId, abilityId) {
    const player = this.gameState.players[playerId]
    if (!player || !player.commander) return null
    return player.commander.getAbility(abilityId)
  }

  // ============================================================================
  // BLOOD OF GRUUMSH ABILITIES
  // ============================================================================

  /**
   * Check if a creature's owner has the "ignore difficult terrain" ability
   * (GRUUMSH COMMANDS IT ability - Blood of Gruumsh only)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {boolean} True if creature ignores difficult terrain
   */
  ignoresDifficultTerrain(creatureInstance) {
    if (!creatureInstance || !creatureInstance.owner) return false
    // Must belong to Blood of Gruumsh faction
    if (creatureInstance.creature.faction !== 'Blood of Gruumsh') return false
    return this.hasCommanderAbility(creatureInstance.owner, 'gruumsh_commands_it')
  }

  /**
   * Check if player can use ORC SCOUT ability to deploy to treasure tiles
   * (Blood of Gruumsh only, turn 1 only)
   * @param {string} playerId - Player to check
   * @returns {boolean} True if ORC SCOUT is available
   */
  canUseOrcScout(playerId) {
    // Only available on turn 1 (initial deployment)
    if (this.gameState.turnNumber !== 1) return false

    // Must have the ORC SCOUT ability
    if (!this.hasCommanderAbility(playerId, 'orc_scout')) return false

    // Must be Blood of Gruumsh faction
    const player = this.gameState.players[playerId]
    if (!player || !player.commander || player.commander.faction !== 'Blood of Gruumsh') return false

    // Check if ability has already been used
    if (player.commanderAbilityState?.orcScoutUsed) return false

    return true
  }

  /**
   * Get valid treasure tiles for ORC SCOUT deployment
   * @returns {Array} Array of valid treasure tiles
   */
  getOrcScoutValidTiles() {
    const validTiles = []
    for (let y = 0; y < this.gameState.boardHeight; y++) {
      for (let x = 0; x < this.gameState.boardWidth; x++) {
        const tile = this.gameState.getTile(x, y)
        if (tile && tile.treasure && !tile.occupant) {
          validTiles.push(tile)
        }
      }
    }
    return validTiles
  }

  /**
   * Mark ORC SCOUT ability as used
   * @param {string} playerId - Player who used the ability
   */
  markOrcScoutUsed(playerId) {
    const player = this.gameState.players[playerId]
    if (!player.commanderAbilityState) {
      player.commanderAbilityState = {}
    }
    player.commanderAbilityState.orcScoutUsed = true
  }

  // ============================================================================
  // STING OF LOLTH ABILITIES
  // ============================================================================

  /**
   * Get commander speed bonus for a creature based on creature types
   * (WALLS OF WEB ability: +2 speed to Spider and Drow - Sting of Lolth only)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {number} Speed bonus from commander abilities
   */
  getCommanderSpeedBonus(creatureInstance) {
    if (!creatureInstance || !creatureInstance.owner) return 0

    let bonus = 0
    const player = this.gameState.players[creatureInstance.owner]
    if (!player || !player.commander) return 0

    // Check for WALLS OF WEB (speed bonus to Spider/Drow)
    if (player.commander.hasAbility('walls_of_web')) {
      // Must belong to Sting of Lolth faction
      if (creatureInstance.creature.faction !== 'Sting of Lolth') return 0
      const creatureTypes = creatureInstance.creature.type || []
      if (creatureTypes.includes('Spider') || creatureTypes.includes('Drow')) {
        bonus += COMMANDER_ABILITIES.WALLS_OF_WEB_SPEED_BONUS
      }
    }

    return bonus
  }

  /**
   * Check if SELLSWORD ability should trigger (Drow on treasure)
   * (Sting of Lolth only)
   * @param {CreatureInstance} creatureInstance - The creature that landed on treasure
   * @returns {boolean} True if should show SELLSWORD choice
   */
  shouldTriggerSellsword(creatureInstance) {
    if (!creatureInstance || !creatureInstance.owner) return false

    // Must have the SELLSWORD ability
    if (!this.hasCommanderAbility(creatureInstance.owner, 'sellsword')) return false

    // Must belong to Sting of Lolth faction
    if (creatureInstance.creature.faction !== 'Sting of Lolth') return false

    // Must be Drow type
    const creatureTypes = creatureInstance.creature.type || []
    if (!creatureTypes.includes('Drow')) return false

    // Must be standing on a tile with treasure
    const tile = this.gameState.getTile(creatureInstance.position.x, creatureInstance.position.y)
    if (!tile || !tile.treasure) return false

    return true
  }

  // ============================================================================
  // TYRANNY OF GOBLINS ABILITIES
  // ============================================================================

  /**
   * Check if a player can deploy during Refresh phase
   * (HORDE ability - Tyranny of Goblins only)
   * @param {string} playerId - The player ID
   * @returns {boolean} True if can deploy in Refresh phase
   */
  canDeployInRefreshPhase(playerId) {
    if (!this.hasCommanderAbility(playerId, 'horde')) return false
    // Must be Tyranny of Goblins faction
    const player = this.gameState.players[playerId]
    if (!player || !player.commander || player.commander.faction !== 'Tyranny of Goblins') return false
    return true
  }

  /**
   * Check if player can deploy during REFRESH phase (alias for canDeployInRefreshPhase)
   * @param {string} playerId - Player to check
   * @returns {boolean} True if player can deploy during refresh
   */
  canDeployDuringRefresh(playerId) {
    return this.canDeployInRefreshPhase(playerId)
  }

  /**
   * Check if BLACK HAND OF BANE applies (enemy cower costs extra morale)
   * (Tyranny of Goblins only)
   * @param {string} attackerOwner - The owner of the attacking creature
   * @returns {number} Extra morale cost (0 if not applicable)
   */
  getBlackHandOfBaneExtraCost(attackerOwner) {
    // Check if the attacker's owner has BLACK HAND OF BANE
    if (!this.hasCommanderAbility(attackerOwner, 'black_hand_of_bane')) return 0
    // Must be Tyranny of Goblins faction
    const player = this.gameState.players[attackerOwner]
    if (!player || !player.commander || player.commander.faction !== 'Tyranny of Goblins') return 0
    return COMMANDER_ABILITIES.BLACK_HAND_OF_BANE_EXTRA_COST
  }

  // ============================================================================
  // CURSE OF UNDEATH ABILITIES
  // ============================================================================

  /**
   * Check if creature can use UNSTOPPABLE HORDES ability
   * (Morgana's ability - Curse of Undeath Undead only)
   * @param {CreatureInstance} creatureInstance - The creature taking damage
   * @returns {Object} { canUse: boolean, moraleCost: number, damagePrevented: number }
   */
  canUseUnstoppableHordes(creatureInstance) {
    if (!creatureInstance || !creatureInstance.owner) {
      return { canUse: false, moraleCost: 0, damagePrevented: 0 }
    }

    // Must have the UNSTOPPABLE HORDES ability
    if (!this.hasCommanderAbility(creatureInstance.owner, 'unstoppable_hordes')) {
      return { canUse: false, moraleCost: 0, damagePrevented: 0 }
    }

    // Must belong to Curse of Undeath faction
    if (creatureInstance.creature.faction !== 'Curse of Undeath') {
      return { canUse: false, moraleCost: 0, damagePrevented: 0 }
    }

    // Must be Undead type
    const creatureTypes = creatureInstance.creature.type || []
    if (!creatureTypes.includes('Undead')) {
      return { canUse: false, moraleCost: 0, damagePrevented: 0 }
    }

    // Must NOT be tapped
    if (creatureInstance.isTapped) {
      return { canUse: false, moraleCost: 0, damagePrevented: 0, reason: 'tapped' }
    }

    // Player must have enough morale to pay
    const player = this.gameState.players[creatureInstance.owner]
    if (player.morale < COMMANDER_ABILITIES.UNSTOPPABLE_HORDES_MORALE_COST) {
      return { canUse: false, moraleCost: 0, damagePrevented: 0, reason: 'insufficient_morale' }
    }

    return {
      canUse: true,
      moraleCost: COMMANDER_ABILITIES.UNSTOPPABLE_HORDES_MORALE_COST,
      damagePrevented: COMMANDER_ABILITIES.UNSTOPPABLE_HORDES_DAMAGE_PREVENTION
    }
  }

  /**
   * Apply UNSTOPPABLE HORDES ability - prevent damage, pay morale, tap creature
   * @param {CreatureInstance} creatureInstance - The Undead creature using the ability
   * @returns {Object} { success: boolean, damagePrevented: number, moraleCost: number }
   */
  applyUnstoppableHordes(creatureInstance) {
    const abilityInfo = this.canUseUnstoppableHordes(creatureInstance)
    if (!abilityInfo.canUse) {
      return { success: false, damagePrevented: 0, moraleCost: 0 }
    }

    // Pay morale cost
    const player = this.gameState.players[creatureInstance.owner]
    player.loseMorale(COMMANDER_ABILITIES.UNSTOPPABLE_HORDES_MORALE_COST)

    // Tap the creature that used the ability
    creatureInstance.tap()

    return {
      success: true,
      damagePrevented: COMMANDER_ABILITIES.UNSTOPPABLE_HORDES_DAMAGE_PREVENTION,
      moraleCost: COMMANDER_ABILITIES.UNSTOPPABLE_HORDES_MORALE_COST
    }
  }

  /**
   * Get all adjacent untapped Undead creatures that can use UNSTOPPABLE HORDES
   * @param {CreatureInstance} defendingCreature - The creature being attacked
   * @returns {Array} Array of CreatureInstances that can use UNSTOPPABLE HORDES
   */
  getAdjacentUndeadForUnstoppableHordes(defendingCreature) {
    if (!defendingCreature || !defendingCreature.position || !defendingCreature.owner) {
      return []
    }

    // Must have UNSTOPPABLE HORDES ability
    if (!this.hasCommanderAbility(defendingCreature.owner, 'unstoppable_hordes')) {
      return []
    }

    const adjacentUndead = []
    const pos = defendingCreature.position

    // Check all 8 directions
    const directions = [
      { dx: 0, dy: -1 },   // North
      { dx: 1, dy: -1 },   // NE
      { dx: 1, dy: 0 },    // East
      { dx: 1, dy: 1 },    // SE
      { dx: 0, dy: 1 },    // South
      { dx: -1, dy: 1 },   // SW
      { dx: -1, dy: 0 },   // West
      { dx: -1, dy: -1 }   // NW
    ]

    for (const dir of directions) {
      const tile = this.gameState.getTile(pos.x + dir.dx, pos.y + dir.dy)
      if (!tile || !tile.occupant) continue

      const adjacentCreature = tile.occupant

      // Must be same owner
      if (adjacentCreature.owner !== defendingCreature.owner) continue

      // Check if this creature can use UNSTOPPABLE HORDES
      const canUse = this.canUseUnstoppableHordes(adjacentCreature)
      if (canUse.canUse) {
        adjacentUndead.push(adjacentCreature)
      }
    }

    return adjacentUndead
  }

  // ============================================================================
  // HEART OF CORMYR ABILITIES
  // ============================================================================

  /**
   * Check if a creature can use VERSATILE ability (extra move action)
   * (Heart of Cormyr Adventurers only)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {boolean} True if creature can use VERSATILE
   */
  canUseVersatile(creatureInstance) {
    if (!creatureInstance || !creatureInstance.owner) return false

    // Must have the VERSATILE ability
    if (!this.hasCommanderAbility(creatureInstance.owner, 'versatile')) return false

    // Must belong to Heart of Cormyr faction
    if (creatureInstance.creature.faction !== 'Heart of Cormyr') return false

    // Must be Adventurer type
    const creatureTypes = creatureInstance.creature.type || []
    if (!creatureTypes.includes('Adventurer')) return false

    // Must have moved but not attacked yet
    if (!creatureInstance.hasMovedThisTurn) return false
    if (creatureInstance.hasAttackedThisTurn) return false
    if (creatureInstance.isTapped) return false

    return true
  }

  /**
   * Check if player can use SCROLLBOOK ability
   * (Heart of Cormyr only)
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if SCROLLBOOK can be used
   */
  canUseScrollbook(playerId) {
    if (!this.hasCommanderAbility(playerId, 'scrollbook')) return false

    const player = this.gameState.players[playerId]
    if (!player || player.orderHand.length === 0) return false

    // Must be Heart of Cormyr faction
    if (!player.commander || player.commander.faction !== 'Heart of Cormyr') return false

    // Check if already used this turn
    if (player.commanderAbilityState?.scrollbookUsedThisTurn) return false

    return true
  }

  /**
   * Use SCROLLBOOK ability - discard 1 order card to draw 1 order card
   * @param {string} playerId - Player using the ability
   * @param {number} discardIndex - Index of card to discard from hand
   * @returns {Object} { success, discardedCard, drawnCard, message }
   */
  useScrollbook(playerId, discardIndex) {
    if (!this.canUseScrollbook(playerId)) {
      return { success: false, message: 'Cannot use SCROLLBOOK ability' }
    }

    const player = this.gameState.players[playerId]

    // Validate discard index
    if (discardIndex < 0 || discardIndex >= player.orderHand.length) {
      return { success: false, message: 'Invalid card index' }
    }

    // Discard the selected card
    const discardedCard = player.orderHand.splice(discardIndex, 1)[0]

    // Draw a new card
    const drawnCards = player.drawOrderCards(1)
    const drawnCard = drawnCards.length > 0 ? drawnCards[0] : null

    // Mark ability as used this turn
    if (!player.commanderAbilityState) {
      player.commanderAbilityState = {}
    }
    player.commanderAbilityState.scrollbookUsedThisTurn = true

    return {
      success: true,
      discardedCard,
      drawnCard,
      message: `SCROLLBOOK: Discarded ${discardedCard.name}, drew ${drawnCard ? drawnCard.name : 'nothing (deck empty)'}`
    }
  }

  // ============================================================================
  // UNIVERSAL MECHANICS (COWER)
  // ============================================================================

  /**
   * Check if creature can use COWER ability (Universal mechanic - ALL creatures)
   * @param {CreatureInstance} creatureInstance - The creature being attacked
   * @param {number} incomingDamage - The amount of damage to potentially avoid
   * @param {string} attackerOwner - Attacker owner to check for BLACK HAND OF BANE
   * @returns {Object} { canCower: boolean, moraleCost: number, extraCost: number, damageAvoided: number }
   */
  canCower(creatureInstance, incomingDamage, attackerOwner = null) {
    if (!creatureInstance || !creatureInstance.owner) {
      return { canCower: false, moraleCost: 0, extraCost: 0, damageAvoided: 0 }
    }

    // Tapped creatures CANNOT cower
    if (creatureInstance.isTapped) {
      return { canCower: false, moraleCost: 0, extraCost: 0, damageAvoided: 0, reason: 'tapped' }
    }

    // Calculate morale cost: damage/COWER_DAMAGE_PREVENTION, rounded up
    const safeDamage = (typeof incomingDamage === 'number' && !isNaN(incomingDamage)) ? incomingDamage : 0
    const baseMoraleCost = Math.ceil(safeDamage / COMBAT.COWER_DAMAGE_PREVENTION)

    // Check for BLACK HAND OF BANE extra cost
    const extraCost = attackerOwner ? this.getBlackHandOfBaneExtraCost(attackerOwner) : 0
    const totalCost = baseMoraleCost + extraCost

    // Player must have enough morale to pay
    const player = this.gameState.players[creatureInstance.owner]
    if (player.morale < totalCost) {
      return { canCower: false, moraleCost: 0, extraCost: 0, damageAvoided: 0, reason: 'insufficient_morale' }
    }

    return {
      canCower: true,
      moraleCost: totalCost,
      baseMoraleCost,
      extraCost,
      damageAvoided: incomingDamage
    }
  }

  /**
   * Apply COWER ability - avoid ALL damage, pay morale cost, tap creature
   * @param {CreatureInstance} creatureInstance - The creature using Cower
   * @param {number} incomingDamage - The amount of damage being avoided
   * @param {string} attackerOwner - Attacker owner for BLACK HAND OF BANE check
   * @returns {Object} { success: boolean, damageAvoided: number, moraleCost: number }
   */
  applyCower(creatureInstance, incomingDamage, attackerOwner = null) {
    const cowerInfo = this.canCower(creatureInstance, incomingDamage, attackerOwner)
    if (!cowerInfo.canCower) {
      return { success: false, damageAvoided: 0, moraleCost: 0 }
    }

    // Pay the morale cost (includes BLACK HAND OF BANE extra)
    const player = this.gameState.players[creatureInstance.owner]
    player.loseMorale(cowerInfo.moraleCost)

    // Tap the creature that cowered
    creatureInstance.tap()

    return {
      success: true,
      damageAvoided: cowerInfo.damageAvoided,
      moraleCost: cowerInfo.moraleCost,
      extraCost: cowerInfo.extraCost
    }
  }

  // ============================================================================
  // IMMEDIATE CARD DEFENSE
  // ============================================================================

  /**
   * Get all IMMEDIATE cards that can be used for defense
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @returns {Array} Array of { card, eligibleCreatures: [...] } objects
   */
  getImmediateCardsForDefense(defenderInstance) {
    if (!defenderInstance || !defenderInstance.owner) {
      return []
    }

    const player = this.gameState.players[defenderInstance.owner]
    if (!player || !player.orderHand) {
      return []
    }

    // Get all eligible creatures (defender + adjacent friendly untapped creatures)
    const eligibleCreatures = this.getCreaturesForImmediateCard(defenderInstance)

    // Find IMMEDIATE cards that prevent damage
    const immediateCards = []
    for (const card of player.orderHand) {
      const preventsDamage = card.damagePrevented != null && card.damagePrevented > 0
      if (card.isImmediate && card.isImmediate() && preventsDamage) {
        const creaturesForCard = eligibleCreatures.filter(creature => {
          return card.canBeUsedBy(creature.creature)
        })

        if (creaturesForCard.length > 0) {
          immediateCards.push({
            card,
            eligibleCreatures: creaturesForCard,
            damagePrevented: card.damagePrevented != null ? card.damagePrevented : 0,
            moraleCost: card.moraleCost != null ? card.moraleCost : 0
          })
        }
      }
    }

    return immediateCards
  }

  /**
   * Get all creatures that can use an IMMEDIATE card for defense
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @returns {Array} Array of CreatureInstances that can use immediate cards
   */
  getCreaturesForImmediateCard(defenderInstance) {
    if (!defenderInstance || !defenderInstance.position || !defenderInstance.owner) {
      return []
    }

    const eligibleCreatures = []

    // Check if defender itself can use immediate cards (must be untapped)
    if (!defenderInstance.isTapped) {
      eligibleCreatures.push(defenderInstance)
    }

    // Check adjacent friendly creatures
    const pos = defenderInstance.position
    const directions = [
      { dx: 0, dy: -1 },   // North
      { dx: 1, dy: -1 },   // NE
      { dx: 1, dy: 0 },    // East
      { dx: 1, dy: 1 },    // SE
      { dx: 0, dy: 1 },    // South
      { dx: -1, dy: 1 },   // SW
      { dx: -1, dy: 0 },   // West
      { dx: -1, dy: -1 }   // NW
    ]

    for (const dir of directions) {
      const tile = this.gameState.getTile(pos.x + dir.dx, pos.y + dir.dy)
      if (!tile || !tile.occupant) continue

      const adjacentCreature = tile.occupant

      // Must be same owner and untapped
      if (adjacentCreature.owner !== defenderInstance.owner) continue
      if (adjacentCreature.isTapped) continue

      eligibleCreatures.push(adjacentCreature)
    }

    return eligibleCreatures
  }

  /**
   * Apply an IMMEDIATE card for defense
   * @param {OrderCard} card - The immediate card to use
   * @param {CreatureInstance} usingCreature - The creature using the card
   * @returns {Object} { success: boolean, damagePrevented: number, cardUsed: card, moraleCost: number }
   */
  applyImmediateCardDefense(card, usingCreature) {
    if (!card || !usingCreature || !usingCreature.owner) {
      return { success: false, damagePrevented: 0, cardUsed: null, moraleCost: 0 }
    }

    // Verify creature is untapped
    if (usingCreature.isTapped) {
      return { success: false, damagePrevented: 0, cardUsed: null, reason: 'creature_tapped', moraleCost: 0 }
    }

    // Verify card is in player's hand
    const player = this.gameState.players[usingCreature.owner]
    const cardIndex = player.orderHand.findIndex(c => c.id === card.id)
    if (cardIndex === -1) {
      return { success: false, damagePrevented: 0, cardUsed: null, reason: 'card_not_in_hand', moraleCost: 0 }
    }

    // Verify creature can use the card
    if (!card.canBeUsedBy(usingCreature.creature)) {
      return { success: false, damagePrevented: 0, cardUsed: null, reason: 'creature_cannot_use', moraleCost: 0 }
    }

    // Get card's morale cost (default 0 if not defined)
    const moraleCost = card.moraleCost !== undefined ? card.moraleCost : 0

    // Deduct morale cost if card requires it
    if (moraleCost > 0) {
      player.loseMorale(moraleCost)
    }

    // Remove card from hand (discard it)
    player.orderHand.splice(cardIndex, 1)
    if (player.orderDiscard) {
      player.orderDiscard.push(card)
    }

    // Tap the creature
    usingCreature.tap()

    // Get card's damage prevention amount
    const damagePrevented = card.damagePrevented != null ? card.damagePrevented : 0

    // Handle morale gain effect
    const moraleGain = card.moraleGain || 0
    if (moraleGain > 0) {
      player.morale += moraleGain
    }

    // Handle untap after use effect
    const untapAfterUse = card.untapAfterUse || false
    if (untapAfterUse) {
      usingCreature.untap()
    }

    return {
      success: true,
      damagePrevented: damagePrevented,
      cardUsed: card,
      moraleCost: moraleCost,
      moraleGain: moraleGain,
      untapAfterUse: untapAfterUse
    }
  }

  // ============================================================================
  // COMBINED DEFENSE OPTIONS
  // ============================================================================

  /**
   * Get all available defense options for a creature being attacked
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @param {number} incomingDamage - The damage amount
   * @param {string} attackerOwner - The attacker's owner ID
   * @returns {Object} { cower: {...}, unstoppableHordes: {...}, adjacentUndead: [...], immediateCards: [...] }
   */
  getDefenseOptions(defenderInstance, incomingDamage, attackerOwner) {
    const options = {
      cower: null,
      unstoppableHordes: null,
      adjacentUndead: [],
      immediateCards: []
    }

    // Check COWER availability (universal)
    const cowerInfo = this.canCower(defenderInstance, incomingDamage, attackerOwner)
    if (cowerInfo.canCower) {
      options.cower = cowerInfo
    }

    // Check UNSTOPPABLE HORDES availability (Morgana's Undead only)
    const unstoppableInfo = this.canUseUnstoppableHordes(defenderInstance)
    if (unstoppableInfo.canUse) {
      options.unstoppableHordes = unstoppableInfo
      // Also get adjacent Undead that can help
      options.adjacentUndead = this.getAdjacentUndeadForUnstoppableHordes(defenderInstance)
    }

    // Check IMMEDIATE cards availability
    options.immediateCards = this.getImmediateCardsForDefense(defenderInstance)

    return options
  }
}

export default CommanderAbilityManager
