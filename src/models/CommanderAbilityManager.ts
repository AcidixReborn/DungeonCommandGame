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
import { CreatureInstance } from './creatures.js'
import type { CommanderAbility } from './commanders.js'
import type { OrderCard } from './orders.js'

export interface CowerInfo {
  canCower: boolean
  moraleCost: number
  baseMoraleCost?: number
  extraCost: number
  damageAvoided: number
  reason?: 'tapped' | 'insufficient_morale'
}

export interface UnstoppableHordesInfo {
  canUse: boolean
  moraleCost: number
  damagePrevented: number
  reason?: 'tapped' | 'insufficient_morale'
}

export interface ImmediateCardOption {
  card: OrderCard
  eligibleCreatures: CreatureInstance[]
  damagePrevented: number | 'ALL'
  moraleCost: number
  protectTargetType: string
  discardCost: number
  opponentDrawsCards: number
}

export interface DefenseOptions {
  cower: CowerInfo | null
  unstoppableHordes: UnstoppableHordesInfo | null
  adjacentUndead: CreatureInstance[]
  immediateCards: ImmediateCardOption[]
}

/**
 * CommanderAbilityManager class
 * Requires a reference to gameState for accessing game data
 *
 * `gameState` is intentionally `any` for now - see CombatResolver.ts for why (circular
 * coupling with GameState, tightened once gameState.ts exists).
 */
export class CommanderAbilityManager {
  gameState: any

  constructor(gameState: any) {
    this.gameState = gameState
  }

  // ============================================================================
  // CORE ABILITY CHECKS
  // ============================================================================

  /**
   * Check if a player's commander has a specific ability
   */
  hasCommanderAbility(playerId: string, abilityId: string): boolean {
    const player = this.gameState.players[playerId]
    if (!player || !player.commander) return false
    return player.commander.hasAbility(abilityId)
  }

  /**
   * Get a commander ability by ID for a player
   */
  getCommanderAbility(playerId: string, abilityId: string): CommanderAbility | null {
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
   */
  ignoresDifficultTerrain(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance || !creatureInstance.owner) return false
    // Must belong to Blood of Gruumsh faction
    if (creatureInstance.creature.faction !== 'Blood of Gruumsh') return false
    return this.hasCommanderAbility(creatureInstance.owner, 'gruumsh_commands_it')
  }

  /**
   * Check if player can use ORC SCOUT ability to deploy to treasure tiles
   * (Blood of Gruumsh only, turn 1 only)
   */
  canUseOrcScout(playerId: string): boolean {
    // Only available on turn 1 (initial deployment)
    if (this.gameState.turnNumber !== 1) return false

    // Must have the ORC SCOUT ability
    if (!this.hasCommanderAbility(playerId, 'orc_scout')) return false

    // Must be Blood of Gruumsh faction
    const player = this.gameState.players[playerId]
    if (!player || !player.commander || player.commander.faction !== 'Blood of Gruumsh')
      return false

    // Check if ability has already been used
    if (player.commanderAbilityState?.orcScoutUsed) return false

    return true
  }

  /**
   * Get valid treasure tiles for ORC SCOUT deployment
   */
  getOrcScoutValidTiles(): unknown[] {
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
   */
  markOrcScoutUsed(playerId: string): void {
    const player = this.gameState.players[playerId]
    if (!player.commanderAbilityState) {
      player.commanderAbilityState = {}
    }
    player.commanderAbilityState.orcScoutUsed = true
  }

  // ============================================================================
  // CHIEFTAIN CALL (Orc Chieftain Creature Ability)
  // ============================================================================

  /**
   * Check if CHIEFTAIN CALL ability should trigger (Orc Chieftain deployed)
   */
  shouldTriggerChieftainCall(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance || !creatureInstance.creature) return false
    return creatureInstance.creature.name === 'Orc Chieftain'
  }

  /**
   * Check if OGRE DEPLOY MORALE ability should trigger
   * (Ogre was just deployed - player gains 1 MORALE)
   */
  shouldTriggerOgreDeployMorale(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance || !creatureInstance.creature) return false
    return creatureInstance.creature.name === 'Ogre'
  }

  /**
   * Check if ORC CLERIC DEPLOY DRAW ORDER ability should trigger
   * (Orc Cleric of Gruumsh was just deployed - player draws 1 Order card)
   */
  shouldTriggerClericDeployDrawOrder(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance || !creatureInstance.creature) return false
    return creatureInstance.creature.name === 'Orc Cleric of Gruumsh'
  }

  /**
   * Get eligible Orcs from player's hand for CHIEFTAIN CALL
   * (Orc creatures with Level 3 or lower)
   */
  getEligibleOrcsForChieftainCall(playerId: string): unknown[] {
    const player = this.gameState.players[playerId]
    if (!player || !player.creatureHand) return []

    return player.creatureHand.filter(
      (creature: { type?: string[]; level: number }) =>
        creature.type?.includes('Orc') && creature.level <= 3
    )
  }

  /**
   * Execute CHIEFTAIN CALL ability - gain leadership and deploy creature
   */
  executeChieftainCall(
    playerId: string,
    selectedCreature: { id: string },
    deployPosition: { x: number; y: number }
  ): Record<string, unknown> {
    const player = this.gameState.players[playerId]
    if (!player) {
      return { success: false, message: 'Invalid player' }
    }

    // Validate selected creature is in hand and eligible
    const cardIndex = player.creatureHand.findIndex(
      (c: { id: string }) => c.id === selectedCreature.id
    )
    if (cardIndex === -1) {
      return { success: false, message: 'Creature not in hand' }
    }

    const creature = player.creatureHand[cardIndex]
    if (!creature.type?.includes('Orc') || creature.level > 3) {
      return { success: false, message: 'Creature must be an Orc of Level 3 or lower' }
    }

    // Gain leadership equal to creature's level
    const leadershipGained = creature.level
    player.increaseLeadership(leadershipGained)

    // Remove creature from hand
    player.creatureHand.splice(cardIndex, 1)

    // Create and deploy creature instance
    const creatureInstance = new CreatureInstance(creature, playerId)
    creatureInstance.position = deployPosition
    creatureInstance.markAsDeployed(this.gameState.turnNumber)

    // Add to player's creatures in play
    player.creaturesInPlay.push(creatureInstance)

    // Place on board
    const tile = this.gameState.getTile(deployPosition.x, deployPosition.y)
    if (tile) {
      tile.occupant = creatureInstance
    }

    return {
      success: true,
      leadershipGained,
      deployedCreature: creatureInstance,
      message: `CHIEFTAIN CALL: Gained ${leadershipGained} Leadership and deployed ${creature.name}`,
    }
  }

  // ============================================================================
  // STING OF LOLTH ABILITIES
  // ============================================================================

  /**
   * Get commander speed bonus for a creature based on creature types
   * (WALLS OF WEB ability: +2 speed to Spider and Drow - Sting of Lolth only)
   */
  getCommanderSpeedBonus(creatureInstance: CreatureInstance): number {
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
   */
  shouldTriggerSellsword(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance || !creatureInstance.owner) return false

    // Must have the SELLSWORD ability
    if (!this.hasCommanderAbility(creatureInstance.owner, 'sellsword')) return false

    // Must belong to Sting of Lolth faction
    if (creatureInstance.creature.faction !== 'Sting of Lolth') return false

    // Must be Drow type
    const creatureTypes = creatureInstance.creature.type || []
    if (!creatureTypes.includes('Drow')) return false

    // Must be standing on a tile with treasure
    if (!creatureInstance.position) return false
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
   */
  canDeployInRefreshPhase(playerId: string): boolean {
    if (!this.hasCommanderAbility(playerId, 'horde')) return false
    // Must be Tyranny of Goblins faction
    const player = this.gameState.players[playerId]
    if (!player || !player.commander || player.commander.faction !== 'Tyranny of Goblins')
      return false
    return true
  }

  /**
   * Check if player can deploy during REFRESH phase (alias for canDeployInRefreshPhase)
   */
  canDeployDuringRefresh(playerId: string): boolean {
    return this.canDeployInRefreshPhase(playerId)
  }

  /**
   * Check if BLACK HAND OF BANE applies (enemy cower costs extra morale)
   * (Tyranny of Goblins only)
   * @returns Extra morale cost (0 if not applicable)
   */
  getBlackHandOfBaneExtraCost(attackerOwner: string): number {
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
   */
  canUseUnstoppableHordes(creatureInstance: CreatureInstance): UnstoppableHordesInfo {
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
      damagePrevented: COMMANDER_ABILITIES.UNSTOPPABLE_HORDES_DAMAGE_PREVENTION,
    }
  }

  /**
   * Apply UNSTOPPABLE HORDES ability - prevent damage, pay morale, tap creature
   */
  applyUnstoppableHordes(creatureInstance: CreatureInstance): {
    success: boolean
    damagePrevented: number
    moraleCost: number
  } {
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
      moraleCost: COMMANDER_ABILITIES.UNSTOPPABLE_HORDES_MORALE_COST,
    }
  }

  /**
   * Get all adjacent untapped Undead creatures that can use UNSTOPPABLE HORDES
   */
  getAdjacentUndeadForUnstoppableHordes(defendingCreature: CreatureInstance): CreatureInstance[] {
    if (!defendingCreature || !defendingCreature.position || !defendingCreature.owner) {
      return []
    }

    // Must have UNSTOPPABLE HORDES ability
    if (!this.hasCommanderAbility(defendingCreature.owner, 'unstoppable_hordes')) {
      return []
    }

    const adjacentUndead: CreatureInstance[] = []
    const pos = defendingCreature.position

    // Check all 8 directions
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: -1 }, // NE
      { dx: 1, dy: 0 }, // East
      { dx: 1, dy: 1 }, // SE
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 1 }, // SW
      { dx: -1, dy: 0 }, // West
      { dx: -1, dy: -1 }, // NW
    ]

    for (const dir of directions) {
      const tile = this.gameState.getTile(pos.x + dir.dx, pos.y + dir.dy)
      if (!tile || !tile.occupant) continue

      const adjacentCreature = tile.occupant as CreatureInstance

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
   */
  canUseVersatile(creatureInstance: CreatureInstance): boolean {
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
   */
  canUseScrollbook(playerId: string): boolean {
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
   */
  useScrollbook(playerId: string, discardIndex: number): Record<string, unknown> {
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
      message: `SCROLLBOOK: Discarded ${discardedCard.name}, drew ${drawnCard ? drawnCard.name : 'nothing (deck empty)'}`,
    }
  }

  // ============================================================================
  // UNIVERSAL MECHANICS (COWER)
  // ============================================================================

  /**
   * Check if creature can use COWER ability (Universal mechanic - ALL creatures)
   * @param incomingDamage - The amount of damage to potentially avoid
   * @param attackerOwner - Attacker owner to check for BLACK HAND OF BANE
   */
  canCower(
    creatureInstance: CreatureInstance,
    incomingDamage: number,
    attackerOwner: string | null = null
  ): CowerInfo {
    if (!creatureInstance || !creatureInstance.owner) {
      return { canCower: false, moraleCost: 0, extraCost: 0, damageAvoided: 0 }
    }

    // Tapped creatures CANNOT cower
    if (creatureInstance.isTapped) {
      return { canCower: false, moraleCost: 0, extraCost: 0, damageAvoided: 0, reason: 'tapped' }
    }

    // Calculate morale cost: damage/COWER_DAMAGE_PREVENTION, rounded up
    const safeDamage =
      typeof incomingDamage === 'number' && !isNaN(incomingDamage) ? incomingDamage : 0
    const baseMoraleCost = Math.ceil(safeDamage / COMBAT.COWER_DAMAGE_PREVENTION)

    // Check for BLACK HAND OF BANE extra cost
    const extraCost = attackerOwner ? this.getBlackHandOfBaneExtraCost(attackerOwner) : 0
    const totalCost = baseMoraleCost + extraCost

    // Player must have enough morale to pay
    const player = this.gameState.players[creatureInstance.owner]
    if (player.morale < totalCost) {
      return {
        canCower: false,
        moraleCost: 0,
        extraCost: 0,
        damageAvoided: 0,
        reason: 'insufficient_morale',
      }
    }

    return {
      canCower: true,
      moraleCost: totalCost,
      baseMoraleCost,
      extraCost,
      damageAvoided: incomingDamage,
    }
  }

  /**
   * Apply COWER ability - avoid ALL damage, pay morale cost, tap creature
   */
  applyCower(
    creatureInstance: CreatureInstance,
    incomingDamage: number,
    attackerOwner: string | null = null
  ): { success: boolean; damageAvoided: number; moraleCost: number; extraCost?: number } {
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
      extraCost: cowerInfo.extraCost,
    }
  }

  // ============================================================================
  // IMMEDIATE CARD DEFENSE
  // ============================================================================

  /**
   * Get all IMMEDIATE cards that can be used for defense
   */
  getImmediateCardsForDefense(defenderInstance: CreatureInstance): ImmediateCardOption[] {
    if (!defenderInstance || !defenderInstance.owner) {
      return []
    }

    const player = this.gameState.players[defenderInstance.owner]
    if (!player || !player.orderHand) {
      return []
    }

    // Get all eligible creatures for 'self' protection (defender + adjacent friendly untapped)
    const selfProtectCreatures = this.getCreaturesForImmediateCard(defenderInstance)

    // Find IMMEDIATE cards that prevent damage or have special defense effects
    const immediateCards: ImmediateCardOption[] = []
    for (const card of player.orderHand as OrderCard[]) {
      // Card must prevent damage (either fixed amount or all damage) OR be a self-sacrifice attack (Savage Demise)
      const preventsDamage =
        (card.damagePrevented != null && card.damagePrevented > 0) || card.preventsAllDamage
      const isSelfSacrifice = card.selfSacrificeAttack === true
      if (card.isImmediate && card.isImmediate() && (preventsDamage || isSelfSacrifice)) {
        // Check discard cost - player needs the card itself + additional cards to discard
        // e.g., Uncanny Dodge requires discarding 1 card, so player needs at least 2 cards total
        if (card.discardCost && card.discardCost > 0) {
          const cardsInHand = player.orderHand.length
          if (cardsInHand < card.discardCost + 1) {
            continue // Skip - not enough cards to discard
          }
        }
        // Determine which creatures can use this card based on protectTargetType
        const protectType = card.protectTargetType || 'self'
        let potentialCreatures: CreatureInstance[] = []

        if (protectType === 'self') {
          // Self-protection: creature must be defender or adjacent to defender
          potentialCreatures = selfProtectCreatures
        } else if (protectType === 'adjacent_ally') {
          // Adjacent ally protection (Defend Ally): card user must be adjacent to defender
          potentialCreatures = this.getCreaturesAdjacentToDefender(defenderInstance)
        } else if (protectType === 'ally_in_range') {
          // Ally in range protection (Shield): card user must be within range of defender
          const range = card.protectTargetRange || 5
          potentialCreatures = this.getCreaturesInRangeOfDefender(defenderInstance, range)
        } else if (protectType === 'ally_los') {
          // Ally in LOS protection (Warning Shout): card user must have LOS to defender
          potentialCreatures = this.getCreaturesWithLOSToDefender(defenderInstance)
        }

        const creaturesForCard = potentialCreatures.filter((creature) => {
          // Check if affinity overrides normal requirements (e.g., Cloud of Bats, Vampiric Touch)
          // When affinityOverridesRequirements is true:
          // - Creature WITH matching affinity bypasses level/ability requirements
          // - Creature WITHOUT matching affinity CANNOT use the card at all
          if (card.affinityRequired && card.affinityOverridesRequirements) {
            // Check creature type array for affinity match
            const creatureTypes = creature.creature.type || []
            const hasAffinity = creatureTypes.some(
              (type) => type.toUpperCase() === card.affinityRequired!.toUpperCase()
            )
            // With affinityOverridesRequirements, affinity is the ONLY requirement
            return hasAffinity
          }

          // Check standard requirements (level, ability, creature type)
          if (!card.canBeUsedBy(creature.creature)) return false

          // Check affinity requirement for cards without affinityOverridesRequirements
          if (card.affinityRequired && !card.affinityOverridesRequirements) {
            const creatureTypes = creature.creature.type || []
            const hasAffinity = creatureTypes.some(
              (type) => type.toUpperCase() === card.affinityRequired!.toUpperCase()
            )
            if (!hasAffinity) return false
          }

          return true
        })

        if (creaturesForCard.length > 0) {
          immediateCards.push({
            card,
            eligibleCreatures: creaturesForCard,
            damagePrevented: card.preventsAllDamage
              ? 'ALL'
              : card.damagePrevented != null
                ? card.damagePrevented
                : 0,
            moraleCost: card.moraleCost != null ? card.moraleCost : 0,
            protectTargetType: protectType, // Include for UI to know if this protects defender vs self
            discardCost: card.discardCost || 0, // Number of cards player must discard to use this card
            opponentDrawsCards: card.opponentDrawsCards || 0, // Cards opponent draws when this card is used (e.g., Recoil)
          })
        }
      }
    }

    return immediateCards
  }

  /**
   * Get all creatures that can use an IMMEDIATE card for defense
   */
  getCreaturesForImmediateCard(defenderInstance: CreatureInstance): CreatureInstance[] {
    if (!defenderInstance || !defenderInstance.position || !defenderInstance.owner) {
      return []
    }

    const eligibleCreatures: CreatureInstance[] = []

    // Check if defender itself can use immediate cards (must be untapped)
    if (!defenderInstance.isTapped) {
      eligibleCreatures.push(defenderInstance)
    }

    // Check adjacent friendly creatures
    const pos = defenderInstance.position
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: -1 }, // NE
      { dx: 1, dy: 0 }, // East
      { dx: 1, dy: 1 }, // SE
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 1 }, // SW
      { dx: -1, dy: 0 }, // West
      { dx: -1, dy: -1 }, // NW
    ]

    for (const dir of directions) {
      const tile = this.gameState.getTile(pos.x + dir.dx, pos.y + dir.dy)
      if (!tile || !tile.occupant) continue

      const adjacentCreature = tile.occupant as CreatureInstance

      // Must be same owner and untapped
      if (adjacentCreature.owner !== defenderInstance.owner) continue
      if (adjacentCreature.isTapped) continue

      eligibleCreatures.push(adjacentCreature)
    }

    return eligibleCreatures
  }

  /**
   * Get all untapped friendly creatures ADJACENT to the defender
   * Used for 'adjacent_ally' protection cards like Defend Ally
   * @returns CreatureInstances adjacent to defender (NOT including defender)
   */
  getCreaturesAdjacentToDefender(defenderInstance: CreatureInstance): CreatureInstance[] {
    if (!defenderInstance || !defenderInstance.position || !defenderInstance.owner) {
      return []
    }

    const adjacentCreatures: CreatureInstance[] = []
    const pos = defenderInstance.position
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: -1 }, // NE
      { dx: 1, dy: 0 }, // East
      { dx: 1, dy: 1 }, // SE
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 1 }, // SW
      { dx: -1, dy: 0 }, // West
      { dx: -1, dy: -1 }, // NW
    ]

    for (const dir of directions) {
      const tile = this.gameState.getTile(pos.x + dir.dx, pos.y + dir.dy)
      if (!tile || !tile.occupant) continue

      const adjacentCreature = tile.occupant as CreatureInstance

      // Must be same owner and untapped
      if (adjacentCreature.owner !== defenderInstance.owner) continue
      if (adjacentCreature.isTapped) continue
      // Must NOT be the defender itself (they protect OTHERS, not self)
      if (adjacentCreature.instanceId === defenderInstance.instanceId) continue

      adjacentCreatures.push(adjacentCreature)
    }

    return adjacentCreatures
  }

  /**
   * Get all untapped friendly creatures within range of the defender
   * Used for 'ally_in_range' protection cards like Shield
   * @returns CreatureInstances within range (INCLUDING defender for self-targeting)
   */
  getCreaturesInRangeOfDefender(
    defenderInstance: CreatureInstance,
    range: number
  ): CreatureInstance[] {
    if (!defenderInstance || !defenderInstance.position || !defenderInstance.owner) {
      return []
    }

    const creaturesInRange: CreatureInstance[] = []
    const player = this.gameState.players[defenderInstance.owner]

    if (!player || !player.creaturesInPlay) {
      return []
    }

    const defenderPos = defenderInstance.position

    for (const creature of player.creaturesInPlay as CreatureInstance[]) {
      // Must be untapped
      if (creature.isTapped) continue
      if (!creature.position) continue

      // Calculate distance (Chebyshev distance for grid movement)
      const dx = Math.abs(creature.position.x - defenderPos.x)
      const dy = Math.abs(creature.position.y - defenderPos.y)
      const distance = Math.max(dx, dy)

      // Must be within range
      if (distance > range) continue

      creaturesInRange.push(creature)
    }

    return creaturesInRange
  }

  /**
   * Get all untapped friendly creatures with line of sight to the defender
   * Used for 'ally_los' protection cards like Warning Shout
   * @returns CreatureInstances with LOS to defender (NOT including defender)
   */
  getCreaturesWithLOSToDefender(defenderInstance: CreatureInstance): CreatureInstance[] {
    if (!defenderInstance || !defenderInstance.position || !defenderInstance.owner) {
      return []
    }

    const creaturesWithLOS: CreatureInstance[] = []
    const player = this.gameState.players[defenderInstance.owner]

    if (!player || !player.creaturesInPlay) {
      return []
    }

    for (const creature of player.creaturesInPlay as CreatureInstance[]) {
      // Must be untapped
      if (creature.isTapped) continue
      if (!creature.position) continue
      // Must NOT be the defender itself
      if (creature.instanceId === defenderInstance.instanceId) continue

      // Check line of sight from this creature to defender
      const hasLOS = this.gameState.hasLineOfSight(creature, defenderInstance, creature.owner)
      if (!hasLOS) continue

      creaturesWithLOS.push(creature)
    }

    return creaturesWithLOS
  }

  /**
   * Apply an IMMEDIATE card for defense
   * @param discardCard - Optional card to discard as cost (e.g., Uncanny Dodge)
   */
  applyImmediateCardDefense(
    card: OrderCard,
    usingCreature: CreatureInstance,
    discardCard: OrderCard | null = null
  ): Record<string, unknown> {
    if (!card || !usingCreature || !usingCreature.owner) {
      return { success: false, damagePrevented: 0, cardUsed: null, moraleCost: 0 }
    }

    // Verify creature is untapped
    if (usingCreature.isTapped) {
      return {
        success: false,
        damagePrevented: 0,
        cardUsed: null,
        reason: 'creature_tapped',
        moraleCost: 0,
      }
    }

    // Verify card is in player's hand
    const player = this.gameState.players[usingCreature.owner]
    const cardIndex = player.orderHand.findIndex((c: OrderCard) => c.id === card.id)
    if (cardIndex === -1) {
      return {
        success: false,
        damagePrevented: 0,
        cardUsed: null,
        reason: 'card_not_in_hand',
        moraleCost: 0,
      }
    }

    // Verify creature can use the card
    // Check if affinity override applies
    let canUse = false
    if (card.affinityRequired && card.affinityOverridesRequirements) {
      const creatureTypes = usingCreature.creature.type || []
      const hasAffinity = creatureTypes.some(
        (type) => type.toUpperCase() === card.affinityRequired!.toUpperCase()
      )
      if (hasAffinity) {
        canUse = true // Affinity match bypasses normal requirements
      }
    }
    // Fall back to normal check if no affinity override
    if (!canUse && !card.canBeUsedBy(usingCreature.creature)) {
      return {
        success: false,
        damagePrevented: 0,
        cardUsed: null,
        reason: 'creature_cannot_use',
        moraleCost: 0,
      }
    }

    // Get card's morale cost (default 0 if not defined)
    const moraleCost = card.moraleCost !== undefined ? card.moraleCost : 0

    // Deduct morale cost if card requires it
    if (moraleCost > 0) {
      player.loseMorale(moraleCost)
    }

    // Remove card from hand
    player.orderHand.splice(cardIndex, 1)

    // If card has attachOnUse, attach it to the creature instead of discarding
    let attachedCard = false
    let removedAttachments: unknown[] = []
    if (card.attachOnUse) {
      // Use gameState's attachment method to handle cleansing (Tough as Nails)
      removedAttachments = this.gameState.applyImmediateCardAttachment(
        usingCreature,
        card,
        usingCreature.owner
      )
      attachedCard = true
    } else {
      // Normal discard behavior
      if (player.orderDiscard) {
        player.orderDiscard.push(card)
      }
    }

    // Handle discard cost - discard the additional card (Uncanny Dodge)
    let discardedCardName = null
    if (discardCard && card.discardCost > 0) {
      const discardIndex = player.orderHand.findIndex((c: OrderCard) => c.id === discardCard.id)
      if (discardIndex !== -1) {
        discardedCardName = discardCard.name
        player.orderHand.splice(discardIndex, 1)
        if (player.orderDiscard) {
          player.orderDiscard.push(discardCard)
        }
      }
    }

    // Get shift after use value (for Cloud of Bats)
    const shiftAfterUse = card.shiftAfterUse || 0

    // Tap the creature ONLY if there's no shift after use
    // If there's a shift, the tap happens AFTER the shift decision (handled by UI)
    if (shiftAfterUse === 0) {
      usingCreature.tap()
    }

    // Get card's damage prevention amount
    // If preventsAllDamage is true, return Infinity so Math.max(0, damage - prevented) = 0
    const damagePrevented = card.preventsAllDamage
      ? Infinity
      : card.damagePrevented != null
        ? card.damagePrevented
        : 0

    // Handle morale gain effect
    const moraleGain = card.moraleGain || 0
    if (moraleGain > 0) {
      player.morale += moraleGain
    }

    // Handle untap after use effect (Near Miss)
    // This keeps the creature untapped after using the card
    const untapAfterUse = card.untapAfterUse || false
    if (untapAfterUse && shiftAfterUse === 0) {
      // Only untap if we already tapped (no shift pending)
      usingCreature.untap()
    }

    // Handle draw cards effect - queue for next REFRESH phase (not drawn immediately)
    // This ensures the attacking player cannot see the drawn card (important for PvP)
    const drawCards = card.drawCards || 0
    if (drawCards > 0) {
      player.bonusOrderCardsToDraw += drawCards
      // Track which card caused the bonus draw (for modal display)
      if (!player.bonusDrawSources) player.bonusDrawSources = []
      player.bonusDrawSources.push(card.name)
    }

    // Build counter-attack info if card has counter-attack ability
    const counterAttack =
      card.counterAttackDamage > 0
        ? {
            damage: card.counterAttackDamage,
            targetType: card.counterAttackTarget,
            requiresAdjacent: card.counterAttackRequiresAdjacent || false,
            defenderInstance: usingCreature,
          }
        : null

    return {
      success: true,
      damagePrevented: damagePrevented,
      preventsAllDamage: card.preventsAllDamage || false,
      cardUsed: card,
      moraleCost: moraleCost,
      moraleGain: moraleGain,
      untapAfterUse: untapAfterUse,
      bonusDrawsQueued: drawCards,
      shiftAfterUse: shiftAfterUse,
      creatureToShift: shiftAfterUse > 0 ? usingCreature : null,
      counterAttack: counterAttack,
      discardedCardName: discardedCardName, // Name of card discarded as cost (e.g., Uncanny Dodge)
      opponentDrawsCards: card.opponentDrawsCards || 0, // Cards opponent (attacker) draws (e.g., Recoil = 1)
      // Attachment info for cards that attach instead of discard (Leap Away, Mortal Wound, Tough as Nails)
      attachedCard: attachedCard,
      removedAttachments: removedAttachments,
      attachOnUse: card.attachOnUse || null,
    }
  }

  // ============================================================================
  // COUNTER-ATTACK HELPERS
  // ============================================================================

  /**
   * Get all adjacent tapped enemy creatures for counter-attack targeting
   * Used by Seize the Opportunity and Corrosive Blood
   * @returns Adjacent tapped enemy CreatureInstances
   */
  getAdjacentTappedEnemies(defenderInstance: CreatureInstance): CreatureInstance[] {
    if (!defenderInstance || !defenderInstance.position || !defenderInstance.owner) {
      return []
    }

    const adjacentTapped: CreatureInstance[] = []
    const pos = defenderInstance.position

    // Check all 8 directions
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: -1 }, // NE
      { dx: 1, dy: 0 }, // East
      { dx: 1, dy: 1 }, // SE
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 1 }, // SW
      { dx: -1, dy: 0 }, // West
      { dx: -1, dy: -1 }, // NW
    ]

    for (const dir of directions) {
      const tile = this.gameState.getTile(pos.x + dir.dx, pos.y + dir.dy)
      if (!tile || !tile.occupant) continue

      const adjacentCreature = tile.occupant as CreatureInstance

      // Must be an enemy (different owner)
      if (adjacentCreature.owner === defenderInstance.owner) continue

      // Must be tapped
      if (!adjacentCreature.isTapped) continue

      adjacentTapped.push(adjacentCreature)
    }

    return adjacentTapped
  }

  /**
   * Check if attacker is adjacent to defender (for Riposte)
   */
  isAttackerAdjacent(
    defenderInstance: CreatureInstance,
    attackerInstance: CreatureInstance
  ): boolean {
    if (!defenderInstance?.position || !attackerInstance?.position) {
      return false
    }

    const dx = Math.abs(defenderInstance.position.x - attackerInstance.position.x)
    const dy = Math.abs(defenderInstance.position.y - attackerInstance.position.y)

    // Adjacent means within 1 tile in any direction (including diagonal)
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)
  }

  // ============================================================================
  // COMBINED DEFENSE OPTIONS
  // ============================================================================

  /**
   * Get all available defense options for a creature being attacked
   */
  getDefenseOptions(
    defenderInstance: CreatureInstance,
    incomingDamage: number,
    attackerOwner: string
  ): DefenseOptions {
    const options: DefenseOptions = {
      cower: null,
      unstoppableHordes: null,
      adjacentUndead: [],
      immediateCards: [],
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
