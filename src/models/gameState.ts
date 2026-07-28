// Game state management for Dungeon Command
import { getValidMovementTiles as pathfindingGetValidMovement } from '../utils/pathfinding.js'
import { logger } from '../utils/logger.js'
// Import Board class for grid operations
import { Board, TerrainTypes } from './Board.js'
import type { Tile } from './Board.js'
import type { Commander } from './commanders.js'
import type { Creature } from './creatures.js'
import { CreatureInstance } from './creatures.js'
import type { OrderCard } from './orders.js'
import type { Treasure } from './treasure.js'
// Import CombatResolver for combat operations
import { CombatResolver } from './CombatResolver.js'
import type { AttackType } from './CombatResolver.js'
// Import CommanderAbilityManager for ability operations
import { CommanderAbilityManager } from './CommanderAbilityManager.js'
// Import PhaseManager for turn/phase state machine
import { PhaseManager, GamePhases } from './PhaseManager.js'
// Import game constants
import {
  BOARD,
  TERRAIN,
  COMBAT,
  COMMANDER_ABILITIES,
  TREASURE,
  GAME_RULES,
  MAGIC_CIRCLE,
  ABILITIES,
} from '../constants/gameConstants.js'
// Import creature abilities from AbilityManager
import {
  Flying,
  Burrow,
  Rider,
  Flanking,
  FlashingBlades,
  UntapOnKill,
} from '../abilities/shared/index.js'
import {
  Insubstantial,
  Phasing,
  LifeDrain,
  TombGuardianSplash,
  LightningBreath,
  DiscipleOfKyuss,
} from '../abilities/undead/index.js'
import { HiddenBlade } from '../abilities/drow/index.js'
import {
  ShieldBlock,
  HealingTouch,
  Slam,
  AcidBreath,
  ExplosiveBolts,
} from '../abilities/cormyr/index.js'
import { Cutter, MagicCircleAura, TapOnHit, Regenerate, Reach } from '../abilities/goblins/index.js'
import { DeathStrike } from '../abilities/orcs/index.js'

// Re-export GamePhases for backward compatibility
export { GamePhases }

// Player ID constants - supports up to 5 players
export const Players = {
  PLAYER1: 'PLAYER1',
  PLAYER2: 'PLAYER2',
  PLAYER3: 'PLAYER3',
  PLAYER4: 'PLAYER4',
  PLAYER5: 'PLAYER5',
}

// Re-export TerrainTypes for backward compatibility
export { TerrainTypes }

/**
 * PlayerState - Tracks all state for a single player
 * Manages resources, cards, creatures, and gameplay stats
 */
export class PlayerState {
  commander: Commander
  faction: string
  morale: number
  leadership: number
  isHuman: boolean
  aiDifficulty: string | null
  creatureDeck: Creature[]
  orderDeck: OrderCard[]
  creatureHand: Creature[]
  orderHand: OrderCard[]
  creaturesInPlay: CreatureInstance[]
  orderDiscard: OrderCard[]
  treasureTokens: number
  magicCirclePosition: { x: number; y: number } | null
  startingZoneTiles: { x: number; y: number }[]
  creatureGraveyard: Creature[]
  bonusOrderCardsToDraw: number
  bonusDrawSources: string[]
  cardsDrawnThisTurn: unknown[]
  pendingCardReveals: unknown[]
  pendingMoraleNotifications: unknown[]
  commanderAbilityState: {
    usedThisTurn: string[]
    cooldowns: Record<string, number>
    orcScoutUsed: boolean
    scrollbookUsedThisTurn?: boolean
    [key: string]: unknown
  }

  /**
   * @param commander - Commander data
   * @param creatures - Creature cards
   * @param orders - Order cards
   * @param faction - Faction name
   * @param isHuman - True if human player, false if AI
   * @param aiDifficulty - AI difficulty ('easy', 'medium', 'hard') or null for humans
   */
  constructor(
    commander: Commander,
    creatures: Creature[],
    orders: OrderCard[],
    faction: string,
    isHuman = true,
    aiDifficulty: string | null = null
  ) {
    this.commander = commander
    this.faction = faction
    this.morale = commander.startingMorale
    this.leadership = commander.startingLeadership

    // Player type
    this.isHuman = isHuman
    this.aiDifficulty = aiDifficulty // 'easy' | 'medium' | 'hard' | null

    // Decks
    this.creatureDeck = [...creatures]
    this.orderDeck = [...orders]

    // Hands
    this.creatureHand = []
    this.orderHand = []

    // Battlefield
    this.creaturesInPlay = []

    // Discard piles
    this.orderDiscard = []

    // Treasure tokens
    this.treasureTokens = 0

    // Magic circle position for this player
    this.magicCirclePosition = null

    // Starting zone tiles for this player
    this.startingZoneTiles = []

    // Graveyard - destroyed creatures go here (creature cards, not instances)
    this.creatureGraveyard = []

    // Order card draw tracking
    this.bonusOrderCardsToDraw = 0 // Pending bonus draws from cards like Parry/Defensive Advantage
    this.bonusDrawSources = [] // Names of cards that caused bonus draws (e.g., ["Parry", "Defensive Advantage"])
    this.cardsDrawnThisTurn = [] // Cards drawn during REFRESH (for modal display)
    this.pendingCardReveals = [] // Cards received from opponent effects (e.g., Recoil) to show at next ACTIVATE
    this.pendingMoraleNotifications = [] // Morale loss notifications from opponent effects (e.g., Unexpected Resistance) to show at next ACTIVATE

    // Commander ability state tracking
    this.commanderAbilityState = {
      usedThisTurn: [], // Track once-per-turn abilities (array of ability IDs)
      cooldowns: {}, // Track cooldown-based abilities { abilityId: turnsRemaining }
      orcScoutUsed: false, // Special flag for ORC SCOUT (only usable during initial deployment)
    }
  }

  /**
   * Mark an ability as used this turn
   * @param {string} abilityId - The ability ID that was used
   */
  useAbility(abilityId) {
    if (!this.commanderAbilityState.usedThisTurn.includes(abilityId)) {
      this.commanderAbilityState.usedThisTurn.push(abilityId)
    }
  }

  /**
   * Check if an ability has been used this turn
   * @param {string} abilityId - The ability ID to check
   * @returns {boolean} True if ability was used this turn
   */
  hasUsedAbilityThisTurn(abilityId) {
    return this.commanderAbilityState.usedThisTurn.includes(abilityId)
  }

  /**
   * Reset turn-based ability tracking (called at start of each turn)
   */
  resetAbilitiesForNewTurn() {
    this.commanderAbilityState.usedThisTurn = []
    // Reset SCROLLBOOK for new turn
    this.commanderAbilityState.scrollbookUsedThisTurn = false
    // Decrement cooldowns
    for (const abilityId in this.commanderAbilityState.cooldowns) {
      this.commanderAbilityState.cooldowns[abilityId]--
      if (this.commanderAbilityState.cooldowns[abilityId] <= 0) {
        delete this.commanderAbilityState.cooldowns[abilityId]
      }
    }
  }

  /**
   * Draw creature cards from deck to hand
   * @param {number} count - Number of cards to draw
   * @returns {Array} Cards drawn
   */
  drawCreatureCards(count) {
    const drawn = []
    for (let i = 0; i < count && this.creatureDeck.length > 0; i++) {
      const card = this.creatureDeck.pop()
      this.creatureHand.push(card)
      drawn.push(card)
      logger.card(card.name, 'drawn to creature hand', {
        level: card.level,
        deckRemaining: this.creatureDeck.length,
      })
    }
    return drawn
  }

  /**
   * Draw order cards from deck to hand
   * @param {number} count - Number of cards to draw
   * @returns {Array} Cards drawn
   */
  drawOrderCards(count) {
    const drawn = []
    for (let i = 0; i < count && this.orderDeck.length > 0; i++) {
      const card = this.orderDeck.pop()
      this.orderHand.push(card)
      drawn.push(card)
      logger.card(card.name, 'drawn to order hand', {
        level: card.level,
        actionType: card.actionType,
        deckRemaining: this.orderDeck.length,
      })
    }
    return drawn
  }

  /**
   * Add a card to pending reveals (shown at next ACTIVATE phase)
   * Used for cards received from opponent effects like Recoil
   * @param {Object} card - The order card received
   * @param {string} source - Name of the card/effect that caused this (e.g., "Recoil")
   * @param {string} fromPlayerId - Player ID who gave the card
   */
  addPendingCardReveal(card, source, fromPlayerId) {
    if (!this.pendingCardReveals) this.pendingCardReveals = []
    this.pendingCardReveals.push({ card, source, fromPlayer: fromPlayerId })
  }

  /**
   * TEST ONLY: Fill hand with all remaining cards from deck
   * Moves all creature cards and order cards from decks to hands
   */
  fillAllCards() {
    // Move all creatures from deck to hand
    this.creatureHand = [...this.creatureHand, ...this.creatureDeck]
    this.creatureDeck = []

    // Move all orders from deck to hand
    this.orderHand = [...this.orderHand, ...this.orderDeck]
    this.orderDeck = []
  }

  /**
   * Shuffle creature deck using Fisher-Yates algorithm
   */
  shuffleCreatureDeck() {
    for (let i = this.creatureDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.creatureDeck[i], this.creatureDeck[j]] = [this.creatureDeck[j], this.creatureDeck[i]]
    }
  }

  /**
   * Shuffle order deck using Fisher-Yates algorithm
   */
  shuffleOrderDeck() {
    for (let i = this.orderDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.orderDeck[i], this.orderDeck[j]] = [this.orderDeck[j], this.orderDeck[i]]
    }
  }

  /**
   * Calculate current leadership usage from creatures in play
   * @returns {number} Total leadership used
   */
  getCurrentLeadershipUsage() {
    return this.creaturesInPlay.reduce((sum, creature) => sum + creature.creature.level, 0)
  }

  /**
   * Check if player has enough leadership to deploy a creature
   * @param {Creature} creature - Creature to check
   * @returns {boolean} True if can deploy
   */
  canDeployCreature(creature) {
    const currentUsage = this.getCurrentLeadershipUsage()
    return currentUsage + creature.level <= this.leadership
  }

  /**
   * Lose morale (e.g., when creatures are destroyed)
   * @param {number} amount - Amount of morale to lose
   * @returns {boolean} True if player is defeated (morale <= 0)
   */
  loseMorale(amount) {
    // Guard against NaN/undefined to prevent morale corruption
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    this.morale = Math.max(0, this.morale - safeAmount)
    return this.morale <= 0 // Returns true if defeated
  }

  /**
   * Gain morale (e.g., from treasure tokens)
   * @param {number} amount - Amount of morale to gain
   */
  gainMorale(amount) {
    // Guard against NaN/undefined to prevent morale corruption
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    this.morale += safeAmount
  }

  /**
   * Increase leadership (happens each Deploy phase)
   * @param {number} amount - Amount to increase (default 1)
   */
  increaseLeadership(amount = 1) {
    this.leadership += amount
  }

  /**
   * Check if player is defeated
   * Player loses if: (1) Morale reaches 0, OR (2) All creatures killed after turn 1
   * @param {number} currentTurn - Current turn number
   * @returns {boolean} True if defeated
   */
  isDefeated(currentTurn = 1) {
    // Morale defeat applies immediately
    if (this.morale <= 0) return true

    // Creature defeat only applies after turn 1 (give players a chance to deploy)
    if (currentTurn > 1 && this.creaturesInPlay.length === 0) return true

    return false
  }
}

/**
 * GameState - Main game state manager
 * Handles board, players, turns, and game logic
 * @param {Array} playerSetups - Array of { playerId, commander, creatures, orders, faction }
 */
export interface PlayerSetup {
  playerId: string
  commander: Commander
  creatures: Creature[]
  orders: OrderCard[]
  faction: string
  isHuman?: boolean
  aiDifficulty?: string
}

export class GameState {
  players: Record<string, PlayerState>
  activePlayers: string[]
  currentPlayer: string
  currentPhase: string
  turnNumber: number
  gameOver: boolean
  winner: string | null
  board: Board
  combatResolver: CombatResolver
  abilityManager: CommanderAbilityManager
  phaseManager: PhaseManager
  boardWidth: number
  boardHeight: number
  tiles: Tile[][]
  treasures: Treasure[]
  treasurePlacementStats: { relaxedSpacing: number }
  lastMagicCircleAuraChange: {
    entered: boolean
    left: boolean
    sorcerer: CreatureInstance
    [key: string]: unknown
  } | null

  constructor(playerSetups: PlayerSetup[]) {
    // playerSetups is an array of { playerId, commander, creatures, orders, faction }
    this.players = {}
    this.activePlayers = []

    playerSetups.forEach((setup) => {
      // Pass isHuman and aiDifficulty to PlayerState for AI behavior configuration
      // Human players should have aiDifficulty = null (not 'easy')
      const isHuman = setup.isHuman !== false // Default to human if not specified
      const aiDifficulty = isHuman ? null : setup.aiDifficulty || 'easy'

      this.players[setup.playerId] = new PlayerState(
        setup.commander,
        setup.creatures,
        setup.orders,
        setup.faction,
        isHuman,
        aiDifficulty
      )
      this.activePlayers.push(setup.playerId)
    })

    this.currentPlayer = this.activePlayers[0]
    this.currentPhase = GamePhases.DEPLOY // Start in DEPLOY phase for initial setup
    this.turnNumber = 1
    this.gameOver = false
    this.winner = null

    // Board state - Dynamic sizing based on number of players
    // Formula: 12 + (numPlayers * 4) = 2 players: 20×20, 3 players: 24×24, 4 players: 28×28, 5 players: 32×32
    const numPlayers = this.activePlayers.length
    const baseSize = 12 + numPlayers * 4

    // Create Board instance for grid operations
    this.board = new Board(baseSize, baseSize)

    // Create CombatResolver instance for combat operations
    this.combatResolver = new CombatResolver(this)

    // Create CommanderAbilityManager instance for ability operations
    this.abilityManager = new CommanderAbilityManager(this)

    // Create PhaseManager instance for turn/phase state machine
    this.phaseManager = new PhaseManager(this)

    // Legacy accessors for backward compatibility
    this.boardWidth = this.board.boardWidth
    this.boardHeight = this.board.boardHeight
    this.tiles = this.board.tiles
    this.treasures = this.board.treasures
    this.treasurePlacementStats = this.board.treasurePlacementStats

    // Generate board with terrain, starting zones, magic circles, treasures
    this.board.generateBoard(this.activePlayers, this.players)

    // Update legacy references after board generation
    this.tiles = this.board.tiles
    this.treasures = this.board.treasures

    // Initialize starting hands
    this.initializeGame()
  }

  /**
   * Initialize game - shuffle decks and draw starting hands for all players
   */
  initializeGame() {
    logger.gameEvent('Initializing game - shuffling decks and drawing starting hands')
    // Shuffle both decks and draw starting hands for all active players
    this.activePlayers.forEach((playerId) => {
      const player = this.players[playerId]

      // Shuffle both decks
      player.shuffleCreatureDeck()
      player.shuffleOrderDeck()

      logger.gameEvent('Drawing starting hand', {
        player: playerId,
        commander: player.commander?.name,
        creatureCards: player.commander.startingCreatureHandSize,
        orderCards: player.commander.startingOrderHandSize,
      })

      // Draw starting hands from commander stats
      player.drawCreatureCards(player.commander.startingCreatureHandSize)
      player.drawOrderCards(player.commander.startingOrderHandSize)
    })
  }

  // ============================================================================
  // BOARD DELEGATION METHODS
  // These methods delegate to the Board instance for backward compatibility
  // ============================================================================

  /**
   * Get adjacent tiles (4-directional) - delegates to Board
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Adjacent tiles
   */
  getAdjacentTiles(x, y) {
    return this.board.getAdjacentTiles(x, y)
  }

  /**
   * Get all 8-directionally adjacent tiles - delegates to Board
   * Used for abilities that affect all surrounding tiles (including diagonals)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Array of adjacent tiles (up to 8)
   */
  getAdjacentTiles8Dir(x, y) {
    return this.board.getAdjacentTiles8Dir(x, y)
  }

  /**
   * Get all creatures occupying tiles adjacent (4-dir) to a position
   * Used for Charge card to determine valid destinations (must end adjacent to enemy)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Array of creature instances on adjacent tiles
   */
  getAdjacentCreatures(x, y) {
    const adjacentTiles = this.getAdjacentTiles(x, y)
    const creatures = []
    for (const tile of adjacentTiles) {
      if (tile.occupant) {
        creatures.push(tile.occupant)
      }
    }
    return creatures
  }

  /**
   * Get tile at position - delegates to Board (O(1))
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} Tile object or null if out of bounds
   */
  getTile(x, y) {
    return this.board.getTile(x, y)
  }

  /**
   * Get all tiles - delegates to Board
   * @returns {Array} Array of all tiles
   */
  getAllTiles() {
    return this.board.getAllTiles()
  }

  /**
   * Get current player's state
   * @returns {PlayerState} Current player state
   */
  getCurrentPlayerState() {
    return this.players[this.currentPlayer]
  }

  /**
   * Calculate distance between two positions - delegates to Board
   * @param {Object} pos1 - First position {x, y}
   * @param {Object} pos2 - Second position {x, y}
   * @returns {number} Chebyshev distance
   */
  getDistance(pos1, pos2) {
    return this.board.getDistance(pos1, pos2)
  }

  /**
   * Get all tiles along a line - delegates to Board
   * @param {Object} from - Starting position {x, y}
   * @param {Object} to - Ending position {x, y}
   * @returns {Array} Array of positions along the line
   */
  getLineTiles(from, to) {
    return this.board.getLineTiles(from, to)
  }

  /**
   * Check if creature has flying ability - delegates to Flying ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature can fly
   */
  hasFlying(creatureInstance) {
    return Flying.has(creatureInstance)
  }

  /**
   * Check if creature has PHASING ability - delegates to Phasing ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has PHASING
   */
  hasPhasing(creatureInstance) {
    return Phasing.has(creatureInstance)
  }

  /**
   * Check if creature has INSUBSTANTIAL ability - delegates to Insubstantial ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has INSUBSTANTIAL
   */
  hasInsubstantial(creatureInstance) {
    return Insubstantial.has(creatureInstance)
  }

  /**
   * Check if creature can use INSUBSTANTIAL ability - delegates to Insubstantial ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has INSUBSTANTIAL and hasn't used it yet
   */
  canUseInsubstantial(creatureInstance) {
    return Insubstantial.canUse(creatureInstance)
  }

  /**
   * Attempt to use INSUBSTANTIAL ability to block damage - delegates to Insubstantial ability
   * @param {CreatureInstance} creatureInstance - Creature attempting to use ability
   * @param {number} incomingDamage - Amount of damage to block
   * @param {string} attackerOwner - Owner of the attacker (for logging)
   * @returns {boolean} True if damage was blocked, false otherwise
   */
  useInsubstantial(creatureInstance, incomingDamage, attackerOwner) {
    const defenderPlayer = this.players[creatureInstance?.owner]
    // Insubstantial.use() is a plain ability-module method, not a React Hook — the "use" naming just collides with the convention.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return Insubstantial.use(creatureInstance, defenderPlayer)
  }

  /**
   * Check if creature has BURROW ability - delegates to Burrow ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has BURROW
   */
  hasBurrow(creatureInstance) {
    return Burrow.has(creatureInstance)
  }

  // ============================================================================
  // REGENERATE 10 - Feral Troll Creature Ability
  // At the start of controller's REFRESH phase, heal 10 damage
  // Works regardless of tap state, does NOT consume action
  // ============================================================================

  /**
   * Check if creature has REGENERATE ability - delegates to Regenerate ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has REGENERATE
   */
  hasRegenerate(creatureInstance) {
    return Regenerate.has(creatureInstance)
  }

  /**
   * Get the regeneration amount for a creature - delegates to Regenerate ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {number} Amount to regenerate (10 for REGENERATE 10, 0 if no ability)
   */
  getRegenerateAmount(creatureInstance) {
    return Regenerate.getAmount(creatureInstance)
  }

  // ============================================================================
  // RIDER - Skeletal Lancer Creature Ability
  // When creature is destroyed, deploy a Skeleton (Level 3 or lower) from hand to same tile
  // Morale loss = (destroyed creature level - deployed creature level)
  // ============================================================================

  /**
   * Check if creature has RIDER ability - delegates to Rider ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has RIDER
   */
  hasRider(creatureInstance) {
    return Rider.has(creatureInstance)
  }

  /**
   * Get eligible creatures from player's hand for RIDER deployment
   * Faction-specific filtering:
   * - Curse of Undeath: Skeleton type only
   * - Tyranny of Goblins: Goblin or Wolf type only
   * @param {string} playerId - Player ID to check
   * @param {number} maxLevel - Maximum level allowed (default 3)
   * @param {string} faction - Faction of the destroyed RIDER creature (for type filtering)
   * @returns {Array} Array of eligible creature cards
   */
  getEligibleRiderCreatures(playerId, maxLevel = 3, faction = null) {
    const player = this.players[playerId]
    if (!player) return []

    return player.creatureHand.filter((creature) => {
      // Must be at or below max level
      const validLevel = creature.level <= maxLevel
      // Must have enough leadership to deploy
      const hasLeadership = player.leadership >= creature.level

      // Faction-specific type check
      let validType = false
      if (faction === 'Tyranny of Goblins') {
        // Goblin Wolf Rider: Can deploy Goblin or Wolf creatures
        validType = creature.type?.includes('Goblin') || creature.type?.includes('Wolf')
      } else {
        // Default: Curse of Undeath - Skeletal Lancer deploys Skeleton creatures
        validType = creature.type?.includes('Skeleton')
      }

      return validType && validLevel && hasLeadership
    })
  }

  /**
   * Check if RIDER ability can trigger (has eligible creatures to deploy)
   * @param {string} playerId - Player ID to check
   * @param {number} maxLevel - Maximum level allowed (default 3)
   * @param {string} faction - Faction of the destroyed RIDER creature (for type filtering)
   * @returns {boolean} True if RIDER can trigger
   */
  canTriggerRider(playerId, maxLevel = 3, faction = null) {
    return this.getEligibleRiderCreatures(playerId, maxLevel, faction).length > 0
  }

  // ============================================================================
  // FLASHING BLADES - Drow Blademaster Creature Ability
  // After melee attack deals damage, can deal 10 splash damage to adjacent enemy
  // ============================================================================

  /**
   * Check if creature has FLASHING BLADES ability - delegates to FlashingBlades ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has FLASHING BLADES
   */
  hasFlashingBlades(creatureInstance) {
    return FlashingBlades.has(creatureInstance)
  }

  /**
   * Get valid targets for FLASHING BLADES splash damage - delegates to FlashingBlades ability
   * @param {CreatureInstance} attackerInstance - The attacker with Flashing Blades
   * @param {CreatureInstance} originalTarget - The creature that was just attacked
   * @returns {Array} Array of valid target CreatureInstances
   */
  getFlashingBladesTargets(attackerInstance, originalTarget) {
    return FlashingBlades.getTargets(this, attackerInstance, originalTarget)
  }

  /**
   * Apply FLASHING BLADES splash damage (10 damage)
   * Handles morale changes and creature destruction
   * @param {CreatureInstance} targetInstance - The creature receiving splash damage
   * @param {string} attackerOwner - Owner of the Blademaster (for morale)
   * @param {number} damageReduction - Optional damage reduction from defense (default 0)
   * @returns {Object} { success, damage, destroyed, moraleChange, damageReduced }
   */
  applyFlashingBlades(targetInstance, attackerOwner, damageReduction = 0) {
    const BASE_SPLASH_DAMAGE = 10
    const actualDamage = Math.max(0, BASE_SPLASH_DAMAGE - damageReduction)

    if (!targetInstance) {
      return { success: false, message: 'Invalid target' }
    }

    // If all damage was prevented, no effect
    if (actualDamage <= 0) {
      return {
        success: true,
        damage: 0,
        destroyed: false,
        moraleChange: { attacker: 0, defender: 0 },
        remainingHP: targetInstance.currentHP,
        damageReduced: damageReduction,
      }
    }

    const defenderOwner = targetInstance.owner

    // Check INSUBSTANTIAL before applying splash damage
    if (this.canUseInsubstantial(targetInstance)) {
      const blocked = this.useInsubstantial(targetInstance, actualDamage, attackerOwner)
      if (blocked) {
        return {
          success: true,
          damage: 0,
          destroyed: false,
          damageBlocked: actualDamage,
          insubstantialUsed: true,
          moraleChange: { attacker: 0, defender: 0 },
          remainingHP: targetInstance.currentHP,
        }
      }
    }

    // Apply damage using takeDamage
    const wasDestroyed = targetInstance.takeDamage(actualDamage)

    let moraleChange = { attacker: 0, defender: 0 }

    if (wasDestroyed) {
      // Clear the tile occupant first
      if (targetInstance.position) {
        const tile = this.getTile(targetInstance.position.x, targetInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(
        (c) => c.instanceId === targetInstance.instanceId
      )
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add creature CARD to graveyard (not instance)
      defenderPlayer.creatureGraveyard.push(targetInstance.creature)

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(targetInstance.creature.level)

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level,
      }

      // UNTAP ON KILL: Check if Bugbear Berserker should untap from this kill
      if (targetInstance.position && this.checkUntapOnAdjacentKill) {
        const untapResult = this.checkUntapOnAdjacentKill(
          targetInstance.position,
          defenderOwner,
          attackerOwner,
          false // Not killed by Bugbear directly
        )
      }
    }

    return {
      success: true,
      damage: actualDamage,
      destroyed: wasDestroyed,
      moraleChange,
      remainingHP: Math.max(0, targetInstance.currentHP),
      damageReduced: damageReduction,
    }
  }

  /**
   * @deprecated Use applyFlashingBlades(target, owner, damageReduction) instead
   * Kept for backward compatibility - delegates to consolidated function
   */
  applyFlashingBladesWithDefense(targetInstance, attackerOwner, damageReduction = 0) {
    return this.applyFlashingBlades(targetInstance, attackerOwner, damageReduction)
  }

  // ============================================================================
  // HIDDEN BLADE - Drow Assassin Creature Ability
  // After ANY attack (melee or ranged) deals damage, can deal 10 damage to an
  // adjacent TAPPED enemy creature. Check happens AFTER attack resolves so
  // defense card usage counts (defender becomes tapped after using defense).
  // ============================================================================

  /**
   * Check if creature has HIDDEN BLADE ability - delegates to HiddenBlade ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has HIDDEN BLADE
   */
  hasHiddenBlade(creatureInstance) {
    return HiddenBlade.has(creatureInstance)
  }

  /**
   * Get valid targets for HIDDEN BLADE damage - delegates to HiddenBlade ability
   * @param {CreatureInstance} attackerInstance - The Drow Assassin
   * @returns {Array} Array of valid target CreatureInstances (must be tapped)
   */
  getHiddenBladeTargets(attackerInstance) {
    return HiddenBlade.getTargets(this, attackerInstance)
  }

  /**
   * Apply HIDDEN BLADE damage (10 damage)
   * Handles morale changes and creature destruction
   * @param {CreatureInstance} targetInstance - The creature receiving damage
   * @param {string} attackerOwner - Owner of the Drow Assassin (for morale)
   * @param {number} damageReduction - Optional damage reduction from defense (default 0)
   * @returns {Object} { success, damage, destroyed, moraleChange, damageReduced }
   */
  applyHiddenBlade(targetInstance, attackerOwner, damageReduction = 0) {
    const BASE_HIDDEN_BLADE_DAMAGE = 10
    const actualDamage = Math.max(0, BASE_HIDDEN_BLADE_DAMAGE - damageReduction)

    if (!targetInstance) {
      return { success: false, message: 'Invalid target' }
    }

    // If all damage was prevented, no effect
    if (actualDamage <= 0) {
      return {
        success: true,
        damage: 0,
        destroyed: false,
        moraleChange: { attacker: 0, defender: 0 },
        remainingHP: targetInstance.currentHP,
        damageReduced: damageReduction,
      }
    }

    const defenderOwner = targetInstance.owner

    // Check INSUBSTANTIAL before applying Hidden Blade damage
    if (this.canUseInsubstantial(targetInstance)) {
      const blocked = this.useInsubstantial(targetInstance, actualDamage, attackerOwner)
      if (blocked) {
        return {
          success: true,
          damage: 0,
          destroyed: false,
          damageBlocked: actualDamage,
          insubstantialUsed: true,
          moraleChange: { attacker: 0, defender: 0 },
          remainingHP: targetInstance.currentHP,
        }
      }
    }

    // Apply damage using takeDamage
    const wasDestroyed = targetInstance.takeDamage(actualDamage)

    let moraleChange = { attacker: 0, defender: 0 }

    if (wasDestroyed) {
      // Clear the tile occupant first
      if (targetInstance.position) {
        const tile = this.getTile(targetInstance.position.x, targetInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(
        (c) => c.instanceId === targetInstance.instanceId
      )
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add creature CARD to graveyard (not instance)
      defenderPlayer.creatureGraveyard.push(targetInstance.creature)

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(targetInstance.creature.level)

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level,
      }

      // UNTAP ON KILL: Check if Bugbear Berserker should untap from this kill
      if (targetInstance.position && this.checkUntapOnAdjacentKill) {
        const untapResult = this.checkUntapOnAdjacentKill(
          targetInstance.position,
          defenderOwner,
          attackerOwner,
          false // Not killed by Bugbear directly
        )
      }
    }

    return {
      success: true,
      damage: actualDamage,
      destroyed: wasDestroyed,
      moraleChange,
      remainingHP: Math.max(0, targetInstance.currentHP),
      damageReduced: damageReduction,
    }
  }

  /**
   * @deprecated Use applyHiddenBlade(target, owner, damageReduction) instead
   * Kept for backward compatibility - delegates to consolidated function
   */
  applyHiddenBladeWithDefense(targetInstance, attackerOwner, damageReduction = 0) {
    return this.applyHiddenBlade(targetInstance, attackerOwner, damageReduction)
  }

  // ============================================================================
  // SAVAGE DEMISE - Blood of Gruumsh IMMEDIATE Card
  // Defensive self-sacrifice attack: Deal base melee damage to adjacent tapped
  // enemy, then die. Original attack is negated.
  // ============================================================================

  /**
   * Apply Savage Demise damage to a target creature
   * Used when a creature uses the Savage Demise IMMEDIATE card during defense
   *
   * @param {CreatureInstance} targetInstance - The creature being attacked
   * @param {string} attackerOwner - Player ID of the attacker (creature using Savage Demise)
   * @param {number} damage - Base melee damage to deal
   * @param {number} damageReduction - Amount reduced by defender's IMMEDIATE cards
   * @returns {Object} { success, damage, destroyed, moraleChange, remainingHP, damageReduced }
   */
  applySavageDemiseDamage(targetInstance, attackerOwner, damage, damageReduction = 0) {
    const actualDamage = Math.max(0, damage - damageReduction)

    if (!targetInstance) {
      return { success: false, message: 'Invalid target' }
    }

    // If all damage was prevented, no effect
    if (actualDamage <= 0) {
      return {
        success: true,
        damage: 0,
        destroyed: false,
        moraleChange: { attacker: 0, defender: 0 },
        remainingHP: targetInstance.currentHP,
        damageReduced: damageReduction,
      }
    }

    const defenderOwner = targetInstance.owner

    // Apply damage using takeDamage
    const wasDestroyed = targetInstance.takeDamage(actualDamage)

    let moraleChange = { attacker: 0, defender: 0 }

    if (wasDestroyed) {
      // Clear the tile occupant first
      if (targetInstance.position) {
        const tile = this.getTile(targetInstance.position.x, targetInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(
        (c) => c.instanceId === targetInstance.instanceId
      )
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add creature CARD to graveyard (not instance)
      defenderPlayer.creatureGraveyard.push(targetInstance.creature)

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(targetInstance.creature.level)

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level,
      }
    }

    return {
      success: true,
      damage: actualDamage,
      destroyed: wasDestroyed,
      moraleChange,
      remainingHP: Math.max(0, targetInstance.currentHP),
      damageReduced: damageReduction,
    }
  }

  /**
   * Kill a creature due to self-sacrifice (Savage Demise)
   * Handles removal, morale loss, and cleanup without attacker morale gain
   *
   * @param {CreatureInstance} creatureInstance - The creature sacrificing itself
   * @returns {Object} { success, moraleLost }
   */
  sacrificeCreature(creatureInstance) {
    if (!creatureInstance) {
      return { success: false, message: 'Invalid creature' }
    }

    const owner = creatureInstance.owner
    const player = this.players[owner]

    // Clear the tile occupant
    if (creatureInstance.position) {
      const tile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
      if (tile) {
        tile.occupant = null
      }
    }

    // Remove from battlefield
    const index = player.creaturesInPlay.findIndex(
      (c) => c.instanceId === creatureInstance.instanceId
    )
    if (index !== -1) {
      player.creaturesInPlay.splice(index, 1)
    }

    // Add creature CARD to graveyard (not instance)
    player.creatureGraveyard.push(creatureInstance.creature)

    // Owner loses morale equal to creature's level (no attacker gain for self-sacrifice)
    const moraleLost = creatureInstance.creature.level
    player.loseMorale(moraleLost)

    return {
      success: true,
      moraleLost,
    }
  }

  // ============================================================================
  // FLANKING - Halfling Sneak Ability (Heart of Cormyr)
  // +10 damage on melee attacks when at least 1 ally is adjacent to the target
  // Does NOT stack with multiple allies, does NOT apply to ability damage
  // ============================================================================

  /**
   * Check if creature has FLANKING ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has FLANKING
   */
  hasFlanking(creatureInstance) {
    return Flanking.has(creatureInstance)
  }

  /**
   * Get FLANKING bonus damage for a melee attack
   * Returns 10 if attacker has FLANKING and at least 1 friendly (non-self) creature
   * is adjacent to the defender. Returns 0 otherwise.
   * Applies 0/50/100 AI difficulty rule for AI players.
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The target creature
   * @returns {number} Bonus damage (10 or 0)
   */
  getFlankingBonus(attackerInstance, defenderInstance) {
    return Flanking.getBonus(this, attackerInstance, defenderInstance)
  }

  // ============================================================================
  // CUTTER - Goblin Cutter Creature Ability (Tyranny of Goblins)
  // +10 melee damage against tapped creatures
  // AI difficulty: 0/50/100 rule (Easy never, Medium 50%, Hard always)
  // ============================================================================

  /**
   * Check if creature has CUTTER ability
   * Big O: O(a) where a = number of special abilities (typically 1-3)
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has CUTTER ability
   */
  hasCutter(creatureInstance) {
    return Cutter.has(creatureInstance)
  }

  /**
   * Get CUTTER bonus damage (+10 if attacker has CUTTER and defender is tapped)
   * Applies 0/50/100 AI difficulty rule based on ATTACKER's owner
   * Big O: O(1) - constant time check
   * @param {CreatureInstance} attackerInstance - Creature making the attack
   * @param {CreatureInstance} defenderInstance - Target of the attack
   * @returns {number} Bonus damage (10 or 0)
   */
  getCutterBonus(attackerInstance, defenderInstance) {
    return Cutter.getBonus(this, attackerInstance, defenderInstance)
  }

  // ============================================================================
  // UNTAP ON KILL - Bugbear Berserker Ability (Tyranny of Goblins)
  // Whenever an adjacent enemy creature is destroyed, untap this creature.
  // Only triggers during the Bugbear's faction's turn.
  // AI difficulty: 0/50/100 rule (Easy never, Medium 50%, Hard always)
  // ============================================================================

  /**
   * Check if creature has UNTAP ON KILL ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has UNTAP ON KILL
   */
  hasUntapOnAdjacentKill(creatureInstance) {
    return UntapOnKill.has(creatureInstance)
  }

  /**
   * Check if creature has DEATH STRIKE ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has DEATH STRIKE
   */
  hasDeathStrike(creatureInstance) {
    return DeathStrike.has(creatureInstance)
  }

  /**
   * Check for and trigger UNTAP ON KILL ability when a creature dies
   * Should be called after any creature death during combat
   * @param {Object} destroyedPosition - {x, y} position where creature died
   * @param {string} destroyedOwner - Player ID of the destroyed creature's owner
   * @param {string} killerOwner - Player ID of the creature that killed (attacker's owner)
   * @param {boolean} wasKilledByBugbear - True if a Bugbear Berserker made the killing blow
   * @returns {Object|null} Untap result data or null if no untap occurred
   */
  checkUntapOnAdjacentKill(
    destroyedPosition,
    destroyedOwner,
    killerOwner,
    wasKilledByBugbear = false
  ) {
    // Only trigger during the current turn player's turn
    const currentTurnPlayer = this.currentPlayer
    if (!currentTurnPlayer) {
      return null
    }

    // Find Bugbear Berserkers belonging to the current turn's player
    const currentPlayer = this.players[currentTurnPlayer]
    if (!currentPlayer) {
      return null
    }

    // Get all Bugbear Berserkers in play for the current turn player
    const bugbears = currentPlayer.creaturesInPlay.filter(
      (creature) => this.hasUntapOnAdjacentKill(creature) && creature.currentHP > 0
    )

    if (bugbears.length === 0) return null

    // Check each Bugbear for adjacency to the destroyed creature
    for (const bugbear of bugbears) {
      if (!bugbear.position) continue

      // Destroyed creature must be an enemy (different owner than Bugbear)
      if (destroyedOwner === bugbear.owner) continue

      // Check 8-directional adjacency
      const dx = Math.abs(destroyedPosition.x - bugbear.position.x)
      const dy = Math.abs(destroyedPosition.y - bugbear.position.y)
      const isAdjacent = dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)

      if (!isAdjacent) continue

      // Adjacent enemy died - check AI difficulty rules
      const aiDifficulty = currentPlayer.aiDifficulty || 'medium'
      const isHuman = currentPlayer.isHuman

      // Determine if untap should trigger (AI 0/50/100 rule)
      let shouldUntap = true
      let wasDeclined = false

      if (!isHuman) {
        if (aiDifficulty === 'easy') {
          // Easy AI: never untap (0%)
          shouldUntap = false
          wasDeclined = true
        } else if (aiDifficulty === 'medium') {
          // Medium AI: 50% chance
          if (Math.random() >= 0.5) {
            shouldUntap = false
            wasDeclined = true
          }
        }
        // Hard AI: always untap (100%)
      }

      if (shouldUntap) {
        // Untap the creature - reset movement AND action
        bugbear.isTapped = false
        bugbear.hasMovedThisTurn = false
        bugbear.hasAttackedThisTurn = false
        bugbear.remainingMovement = bugbear.creature.speed

        return {
          triggered: true,
          bugbearInstanceId: bugbear.instanceId,
          bugbearName: bugbear.creature.name,
          destroyedPosition,
          wasKilledByBugbear,
          difficulty: isHuman ? 'human' : aiDifficulty,
        }
      } else {
        return {
          triggered: false,
          declined: true,
          bugbearInstanceId: bugbear.instanceId,
          bugbearName: bugbear.creature.name,
          destroyedPosition,
          wasKilledByBugbear,
          difficulty: aiDifficulty,
        }
      }
    }

    return null
  }

  // ============================================================================
  // SCUTTLE - Spider Creature Ability (Demonweb Spider, Drider, Giant Spider)
  // This creature can move through other creatures for 1 speed cost per creature
  // Cannot stop on a creature - only pass through
  // ============================================================================

  /**
   * Check if creature has SCUTTLE ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has SCUTTLE
   */
  hasScuttle(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('SCUTTLE')
    )
  }

  // ============================================================================
  // SHADOW STALKER - Shadow Mastiff Ability (Sting of Lolth)
  // When deploying this creature, you can place it in any unoccupied square
  // adjacent to a mountain (8-directional adjacency)
  // ============================================================================

  /**
   * Check if a creature card has SHADOW STALKER ability
   * Note: Takes a creature CARD, not instance (used during deployment from hand)
   * @param {Object} creatureCard - The creature card to check
   * @returns {boolean} True if creature has SHADOW STALKER
   */
  hasShadowStalker(creatureCard) {
    if (!creatureCard?.specialAbilities) return false
    return creatureCard.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('SHADOW STALKER')
    )
  }

  /**
   * Get valid deployment tiles for SHADOW STALKER ability
   * Returns tiles that are:
   * - Adjacent to a MOUNTAIN (8-directional)
   * - Unoccupied
   * - Not a MOUNTAIN itself (creatures can't stop on mountains)
   * Big O: O(W*H) where W=width, H=height - scans entire board
   * @returns {Array} Array of valid tiles
   */
  getShadowStalkerValidTiles() {
    const validTiles = []

    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        const tile = this.getTile(x, y)
        if (!tile) continue

        // Must be unoccupied
        if (tile.occupant) continue

        // Must NOT be a mountain (can't stop on mountains)
        if (tile.terrain === 'MOUNTAIN') continue

        // Must be adjacent to a mountain
        if (this.board.isAdjacentToMountain(x, y)) {
          validTiles.push(tile)
        }
      }
    }

    return validTiles
  }

  // ============================================================================
  // ARCANE PORTAL - War Wizard Creature Ability (Heart of Cormyr)
  // When deploying, can place on any unoccupied Magic Circle tile
  // ============================================================================

  /**
   * Check if creature CARD has ARCANE PORTAL ability
   * Note: Takes a creature CARD, not instance (used during deployment from hand)
   * @param {Object} creatureCard - The creature card to check
   * @returns {boolean} True if creature has ARCANE PORTAL
   */
  hasArcanePortal(creatureCard) {
    if (!creatureCard?.specialAbilities) return false
    return creatureCard.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('ARCANE PORTAL')
    )
  }

  /**
   * Get valid deployment tiles for ARCANE PORTAL ability
   * Returns tiles that are:
   * - MAGIC_CIRCLE terrain type
   * - Unoccupied
   * Big O: O(W*H) where W=width, H=height - scans entire board
   * @returns {Array} Array of valid tiles
   */
  getArcanePortalValidTiles() {
    const validTiles = []

    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        const tile = this.getTile(x, y)
        if (!tile) continue

        // Must be unoccupied
        if (tile.occupant) continue

        // Must be a Magic Circle
        if (tile.terrain === 'MAGIC_CIRCLE') {
          validTiles.push(tile)
        }
      }
    }

    return validTiles
  }

  // ============================================================================
  // SHIELD BLOCK - Dwarven Defender Creature Ability (Heart of Cormyr)
  // Adjacent allied Adventurers (Cormyr only) gain Block 10 per adjacent Defender
  // Stacks with multiple adjacent Dwarven Defenders
  // Applies 0/50/100 AI difficulty rule based on DEFENDER's owner
  // ============================================================================

  /**
   * Check if creature has SHIELD BLOCK ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has SHIELD BLOCK
   */
  hasShieldBlock(creatureInstance) {
    return ShieldBlock.has(creatureInstance)
  }

  /**
   * Check if creature has Adventurer type
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has Adventurer type
   */
  isAdventurerType(creatureInstance) {
    return ShieldBlock.isAdventurerType(creatureInstance)
  }

  /**
   * Check if creature is from Cormyr faction
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature is from Heart of Cormyr faction
   */
  isCormyrFaction(creatureInstance) {
    return ShieldBlock.isCormyrFaction(creatureInstance)
  }

  /**
   * Get SHIELD BLOCK damage reduction for a defending creature
   * Returns 10 per adjacent Dwarven Defender with SHIELD BLOCK
   * Only applies to Cormyr faction Adventurers
   * Applies 0/50/100 AI difficulty rule based on DEFENDER's owner
   * Big O: O(8) = O(1) - checks 8 adjacent tiles
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @returns {number} Damage reduction amount (0, 10, 20, etc.)
   */
  getShieldBlockReduction(defenderInstance) {
    return ShieldBlock.getReduction(this, defenderInstance)
  }

  // ============================================================================
  // MAGIC CIRCLE AURA - Hobgoblin Sorcerer Creature Ability (Tyranny of Goblins)
  // When standing on a Magic Circle tile, all friendly Goblins, Hobgoblins, and
  // Bugbears gain "Prevent 10 damage from 1 source" once per turn.
  // - Global buff (affects all qualifying creatures on the board)
  // - Faction-locked to Tyranny of Goblins only
  // - Shield refreshes at start of faction's turn
  // - Shield drops immediately when Sorcerer dies OR leaves Magic Circle
  // - Applies FIRST (before Insubstantial, Shield Block, IMD cards)
  // - Does NOT tap creatures when preventing damage
  // - Applies 0/50/100 AI difficulty rule based on DEFENDER's owner
  // ============================================================================

  /**
   * Check if creature has MAGIC CIRCLE AURA ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has MAGIC CIRCLE AURA
   */
  hasMagicCircleAura(creatureInstance) {
    return MagicCircleAura.has(creatureInstance)
  }

  /**
   * Check if a specific Sorcerer is currently providing Magic Circle Aura
   * (must be alive and standing on a MAGIC_CIRCLE tile)
   * @param {CreatureInstance} sorcererInstance - The potential Sorcerer
   * @returns {boolean} True if Sorcerer is active on Magic Circle
   */
  isSorcererOnMagicCircle(sorcererInstance) {
    return MagicCircleAura.isOnMagicCircle(this, sorcererInstance)
  }

  /**
   * Check if a player has an active Magic Circle Aura
   * (has a Sorcerer with the ability standing on a Magic Circle)
   * @param {string} playerId - Player to check
   * @returns {CreatureInstance|null} The active Sorcerer or null
   */
  getActiveMagicCircleSorcerer(playerId) {
    return MagicCircleAura.getActiveSorcerer(this, playerId)
  }

  /**
   * Check if creature type qualifies for Magic Circle Aura buff
   * Must be Goblin, Hobgoblin, or Bugbear type
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature is a valid type
   */
  isGoblinFactionType(creatureInstance) {
    return MagicCircleAura.isGoblinFactionType(creatureInstance)
  }

  /**
   * Check if creature is from Tyranny of Goblins faction
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature is from Tyranny of Goblins faction
   */
  isGoblinFaction(creatureInstance) {
    return MagicCircleAura.isGoblinFaction(creatureInstance)
  }

  /**
   * Check if creature is currently protected by Magic Circle Aura
   * @param {CreatureInstance} defenderInstance - Creature taking damage
   * @returns {boolean} True if creature has active Magic Circle protection
   */
  hasMagicCircleProtection(defenderInstance) {
    return MagicCircleAura.hasProtection(this, defenderInstance)
  }

  /**
   * Get Magic Circle Aura damage reduction for a creature
   * Returns 10 if protection is active and shield not used, 0 otherwise
   * Applies 0/50/100 AI difficulty rule based on DEFENDER's owner
   * Big O: O(c) where c = creatures in play (to find Sorcerer)
   * @param {CreatureInstance} defenderInstance - Creature taking damage
   * @param {boolean} preventionBlocked - If true, damage prevention is disabled (future-proofing)
   * @returns {number} Damage reduction amount (10 or 0)
   */
  getMagicCircleDamageReduction(defenderInstance, preventionBlocked = false) {
    // Future-proof: Check if damage prevention is blocked by attacker effect
    if (preventionBlocked) {
      return 0
    }

    if (!this.hasMagicCircleProtection(defenderInstance)) return 0

    // AI difficulty check (0/50/100 rule) - based on DEFENDER's owner
    const defenderOwner = defenderInstance.owner
    const defenderPlayer = this.players[defenderOwner]

    if (defenderPlayer && !defenderPlayer.isHuman) {
      const aiDifficulty = defenderPlayer.aiDifficulty || 'medium'

      // Track for AbilitiesTest - ability was offered
      if (window.trackAbility) {
        window.trackAbility('magic_circle_aura', 'offered', aiDifficulty, {
          creature: defenderInstance.creature.name,
        })
      }

      if (aiDifficulty === 'easy') {
        // Track declined
        if (window.trackAbility) {
          window.trackAbility('magic_circle_aura', 'declined', aiDifficulty, {
            creature: defenderInstance.creature.name,
          })
        }
        return 0 // Easy AI never benefits from Magic Circle Aura
      } else if (aiDifficulty === 'medium') {
        if (Math.random() >= 0.5) {
          // Track declined
          if (window.trackAbility) {
            window.trackAbility('magic_circle_aura', 'declined', aiDifficulty, {
              creature: defenderInstance.creature.name,
            })
          }
          return 0 // Medium AI: 50% chance
        }
      }
      // Hard AI: always benefits from Magic Circle Aura
    }

    // Track triggered for AbilitiesTest
    if (window.trackAbility) {
      const difficulty = defenderPlayer?.aiDifficulty || 'human'
      window.trackAbility('magic_circle_aura', 'triggered', difficulty, {
        blocked: 10,
        creature: defenderInstance.creature.name,
      })
    }

    return 10 // Magic Circle Aura prevents 10 damage
  }

  /**
   * Apply Magic Circle Aura shield (marks it as used for this turn)
   * @param {CreatureInstance} defenderInstance - Creature using the shield
   * @param {number} damageReduced - Amount of damage prevented (for logging)
   * @returns {boolean} True if shield was applied
   */
  useMagicCircleShield(defenderInstance, damageReduced = 10) {
    if (!this.hasMagicCircleProtection(defenderInstance)) return false

    defenderInstance.magicCircleShieldUsed = true
    return true
  }

  /**
   * Check if Sorcerer just entered Magic Circle (for UI notification)
   * Called after movement to detect aura activation
   * @param {CreatureInstance} creatureInstance - Creature that moved
   * @param {Object} oldPosition - Previous position {x, y}
   * @returns {boolean} True if Sorcerer entered Magic Circle
   */
  checkSorcererEnteredMagicCircle(creatureInstance, oldPosition) {
    if (!this.hasMagicCircleAura(creatureInstance)) return false
    if (!oldPosition || !creatureInstance.position) return false

    const oldTile = this.getTile(oldPosition.x, oldPosition.y)
    const newTile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)

    const wasOnMagicCircle = oldTile?.terrain === 'MAGIC_CIRCLE'
    const isOnMagicCircle = newTile?.terrain === 'MAGIC_CIRCLE'

    if (!wasOnMagicCircle && isOnMagicCircle) {
      // Track aura activation for AbilitiesTest
      if (window.trackAbility) {
        window.trackAbility('magic_circle_aura', 'aura_activated', 'n/a', {
          sorcerer: creatureInstance.creature.name,
          owner: creatureInstance.owner,
        })
      }

      return true
    }
    return false
  }

  /**
   * Check if Sorcerer just left Magic Circle (for UI notification)
   * Called after movement to detect aura deactivation
   * @param {CreatureInstance} creatureInstance - Creature that moved
   * @param {Object} oldPosition - Previous position {x, y}
   * @returns {boolean} True if Sorcerer left Magic Circle
   */
  checkSorcererLeftMagicCircle(creatureInstance, oldPosition) {
    if (!this.hasMagicCircleAura(creatureInstance)) return false
    if (!oldPosition || !creatureInstance.position) return false

    const oldTile = this.getTile(oldPosition.x, oldPosition.y)
    const newTile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)

    const wasOnMagicCircle = oldTile?.terrain === 'MAGIC_CIRCLE'
    const isOnMagicCircle = newTile?.terrain === 'MAGIC_CIRCLE'

    if (wasOnMagicCircle && !isOnMagicCircle) {
      // Track aura deactivation for AbilitiesTest
      if (window.trackAbility) {
        window.trackAbility('magic_circle_aura', 'aura_deactivated', 'n/a', {
          sorcerer: creatureInstance.creature.name,
          owner: creatureInstance.owner,
          reason: 'movement',
        })
      }

      return true
    }
    return false
  }

  /**
   * Check if dying Sorcerer was providing Magic Circle Aura
   * Called when a creature is destroyed to detect aura deactivation
   * @param {CreatureInstance} creatureInstance - Creature that died
   * @returns {boolean} True if Sorcerer's death ends the aura
   */
  checkSorcererDeathEndsAura(creatureInstance) {
    if (!this.hasMagicCircleAura(creatureInstance)) return false
    if (!creatureInstance.position) return false

    const tile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
    if (tile?.terrain === 'MAGIC_CIRCLE') {
      // Track aura deactivation for AbilitiesTest
      if (window.trackAbility) {
        window.trackAbility('magic_circle_aura', 'aura_deactivated', 'n/a', {
          sorcerer: creatureInstance.creature.name,
          owner: creatureInstance.owner,
          reason: 'death',
        })
      }

      return true
    }
    return false
  }

  // ============================================================================
  // HEALING TOUCH - Dwarf Cleric Creature Ability (Heart of Cormyr)
  // Standard action: This creature or 1 adjacent ally heals 10 DAMAGE
  // OR removes 1 attached Order card
  // Consumes standard action (creature taps only if already moved)
  // ============================================================================

  /**
   * Check if creature has HEALING TOUCH ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has HEALING TOUCH
   */
  hasHealingTouch(creatureInstance) {
    return HealingTouch.has(creatureInstance)
  }

  /**
   * Get valid HEALING TOUCH targets (self + adjacent allies)
   * Uses 8-directional adjacency
   * @param {CreatureInstance} healerInstance - The Dwarf Cleric using the ability
   * @returns {Array} Array of valid target CreatureInstances (includes self)
   */
  getHealingTouchTargets(healerInstance) {
    return HealingTouch.getTargets(this, healerInstance)
  }

  /**
   * Check if a creature is a valid Healing Touch target for a specific healer
   * @param {CreatureInstance} healerInstance - The Dwarf Cleric
   * @param {CreatureInstance} targetInstance - Potential target
   * @returns {boolean} True if target is valid
   */
  isValidHealingTouchTarget(healerInstance, targetInstance) {
    return HealingTouch.isValidTarget(this, healerInstance, targetInstance)
  }

  /**
   * Execute HEALING TOUCH ability
   * @param {CreatureInstance} healerInstance - The Dwarf Cleric using the ability
   * @param {CreatureInstance} targetInstance - Creature to heal/remove card from
   * @param {string} action - 'heal' or 'removeCard'
   * @param {number} cardIndex - Index of attached card to remove (if action is 'removeCard')
   * @returns {Object} Result { success, message, healedAmount?, removedCard? }
   */
  executeHealingTouch(healerInstance, targetInstance, action, cardIndex = 0) {
    // Validate healer has the ability
    if (!this.hasHealingTouch(healerInstance)) {
      return { success: false, message: 'Creature does not have HEALING TOUCH ability' }
    }

    // Validate healer hasn't used standard action
    if (healerInstance.hasAttackedThisTurn) {
      return { success: false, message: 'Creature has already used its standard action' }
    }

    // Validate target
    if (!this.isValidHealingTouchTarget(healerInstance, targetInstance)) {
      return { success: false, message: 'Invalid target for HEALING TOUCH' }
    }

    const result: {
      success: boolean
      healedAmount?: number
      message?: string
      removedCard?: OrderCard
    } = { success: true }

    if (action === 'heal') {
      // Heal 10 damage
      const healAmount = 10
      const damageBeforeHeal = targetInstance.damageTokens
      targetInstance.heal(healAmount)
      const actualHealed = damageBeforeHeal - targetInstance.damageTokens

      result.healedAmount = actualHealed
      result.message =
        actualHealed > 0
          ? `${targetInstance.creature.name} healed ${actualHealed} damage (HP: ${targetInstance.currentHP}/${targetInstance.creature.hitPoints})`
          : `${targetInstance.creature.name} has no damage to heal`
    } else if (action === 'removeCard') {
      // Remove attached Order card
      if (!targetInstance.attachedCards || targetInstance.attachedCards.length === 0) {
        return { success: false, message: 'Target has no attached cards to remove' }
      }

      if (cardIndex < 0 || cardIndex >= targetInstance.attachedCards.length) {
        return { success: false, message: 'Invalid card index' }
      }

      // Remove the card
      const [removedAttachment] = targetInstance.attachedCards.splice(cardIndex, 1)
      const removedCard = removedAttachment.card

      // Return card to caster's discard pile
      const casterPlayer = this.players[removedAttachment.casterOwner]
      if (casterPlayer) {
        casterPlayer.orderDiscard.push(removedCard)
      }

      result.removedCard = removedCard
      result.message = `Removed ${removedCard.name} from ${targetInstance.creature.name}`
    } else {
      return { success: false, message: 'Invalid action - must be "heal" or "removeCard"' }
    }

    // Consume standard action
    healerInstance.hasAttackedThisTurn = true

    // Tap if already moved
    if (healerInstance.hasMovedThisTurn) {
      healerInstance.tap()
    }

    return result
  }

  // ============================================================================
  // CONFUSION GAZE - Umber Hulk Ability (Sting of Lolth)
  // As a standard action, choose 1 enemy creature within 5 squares (with LOS)
  // and slide that creature up to 3 squares, then make a melee attack (30 damage)
  // ============================================================================

  /**
   * Check if creature has CONFUSION GAZE ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has CONFUSION GAZE
   */
  hasConfusionGaze(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('CONFUSION GAZE')
    )
  }

  /**
   * Get valid CONFUSION GAZE targets (enemies within 5 squares with LOS)
   * Uses same LOS rules as ranged attacks
   * @param {CreatureInstance} attackerInstance - The Umber Hulk
   * @returns {Array} Array of valid target CreatureInstances
   */
  getConfusionGazeTargets(attackerInstance) {
    if (!this.hasConfusionGaze(attackerInstance)) return []
    if (!attackerInstance.position) return []

    const validTargets = []
    const attackerPos = attackerInstance.position
    const attackerOwner = attackerInstance.owner

    // Get all enemy creatures
    for (const [playerId, player] of Object.entries(this.players)) {
      if (playerId === attackerOwner) continue

      for (const enemy of player.creaturesInPlay) {
        if (!enemy.position) continue
        if (enemy.currentHP <= 0) continue

        // Check range (5 squares using Chebyshev distance)
        const distance = this.getDistance(attackerPos, enemy.position)
        if (distance > 5) continue

        // Check LOS (reuse CombatResolver logic)
        if (!this.combatResolver.hasLineOfSight(attackerInstance, enemy, attackerOwner)) continue

        validTargets.push(enemy)
      }
    }

    return validTargets
  }

  /**
   * Get valid slide destinations for CONFUSION GAZE
   * Uses BFS to find all reachable tiles within maxDistance
   * - Can pass through creatures (cost 1) but cannot stop on them
   * - Cannot pass through or stop on mountains
   * - Cannot slide off board
   * Big O: O(D^2) where D = maxDistance (explores tiles in expanding ring)
   * @param {CreatureInstance} targetInstance - The creature being slid
   * @param {number} maxDistance - Maximum slide distance (default 3)
   * @returns {Array} Array of {x, y, tile} valid destinations
   */
  getValidSlideTiles(targetInstance, maxDistance = 3) {
    if (!targetInstance?.position) return []

    const validTiles = []
    const startPos = targetInstance.position

    // BFS to find all reachable tiles within maxDistance
    const visited = new Set()
    const queue = [{ pos: startPos, cost: 0 }]
    visited.add(`${startPos.x},${startPos.y}`)

    while (queue.length > 0) {
      const { pos, cost } = queue.shift()

      // Get 8-directional neighbors
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 1, dy: 1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: -1, dy: -1 },
      ]

      for (const dir of directions) {
        const newX = pos.x + dir.dx
        const newY = pos.y + dir.dy
        const key = `${newX},${newY}`

        if (visited.has(key)) continue
        visited.add(key)

        const tile = this.getTile(newX, newY)
        if (!tile) continue // Off board

        // Mountains block completely (cannot pass through or stop)
        if (tile.terrain === 'MOUNTAIN') continue

        const newCost = cost + 1
        if (newCost > maxDistance) continue

        // Can pass through occupied tiles but cannot stop on them
        if (!tile.occupant) {
          validTiles.push({ x: newX, y: newY, tile })
        }

        // Continue BFS even through occupied tiles (can pass through)
        queue.push({ pos: { x: newX, y: newY }, cost: newCost })
      }
    }

    return validTiles
  }

  /**
   * Execute the slide portion of CONFUSION GAZE
   * Moves the target creature to the destination tile
   * @param {CreatureInstance} targetInstance - The creature being slid
   * @param {Object} destination - The destination {x, y}
   * @returns {Object} { oldPos, newPos }
   */
  executeConfusionGazeSlide(targetInstance, destination) {
    const oldPos = { ...targetInstance.position }
    const oldTile = this.getTile(oldPos.x, oldPos.y)
    const newTile = this.getTile(destination.x, destination.y)

    // Clear old tile
    if (oldTile) {
      oldTile.occupant = null
    }

    // Move creature to new tile
    if (newTile) {
      newTile.occupant = targetInstance
    }
    targetInstance.position = { x: destination.x, y: destination.y }

    return { oldPos, newPos: { x: destination.x, y: destination.y } }
  }

  /**
   * Get valid attack targets after CONFUSION GAZE slide
   * Returns:
   * - Adjacent enemies to Umber Hulk (melee option)
   * - The slid creature (ranged option, if not adjacent)
   * @param {CreatureInstance} attackerInstance - The Umber Hulk
   * @param {CreatureInstance} slidTarget - The creature that was slid
   * @returns {Array} Array of { target, attackType } objects
   */
  getConfusionGazeAttackTargets(attackerInstance, slidTarget) {
    if (!attackerInstance?.position) return []

    const attackTargets = []

    // Get adjacent enemies for melee option
    const adjacent = this.getAdjacentTiles8Dir(
      attackerInstance.position.x,
      attackerInstance.position.y
    )

    for (const tile of adjacent) {
      if (
        tile.occupant &&
        tile.occupant.owner !== attackerInstance.owner &&
        tile.occupant.currentHP > 0
      ) {
        attackTargets.push({ target: tile.occupant, attackType: 'melee' })
      }
    }

    // Check if slid creature is already in the adjacent list
    const isAdjacent = attackTargets.some((t) => t.target.instanceId === slidTarget.instanceId)

    // Add slid creature as ranged option (if not already adjacent)
    if (!isAdjacent && slidTarget.currentHP > 0) {
      attackTargets.push({ target: slidTarget, attackType: 'ranged' })
    }

    return attackTargets
  }

  /**
   * Apply CONFUSION GAZE damage (uses attacker's melee damage)
   * @param {CreatureInstance} attackerInstance - The Umber Hulk (for damage value)
   * @param {CreatureInstance} targetInstance - The creature receiving damage
   * @returns {Object} { success, damage, destroyed, moraleChange, remainingHP }
   */
  applyConfusionGaze(attackerInstance, targetInstance) {
    const CONFUSION_GAZE_DAMAGE = attackerInstance.creature.meleeAttack?.damage || 30

    if (!targetInstance) {
      return { success: false, message: 'Invalid target' }
    }

    const attackerOwner = attackerInstance.owner
    const defenderOwner = targetInstance.owner

    // Check INSUBSTANTIAL before applying Confusion Gaze damage
    if (this.canUseInsubstantial(targetInstance)) {
      const blocked = this.useInsubstantial(targetInstance, CONFUSION_GAZE_DAMAGE, attackerOwner)
      if (blocked) {
        return {
          success: true,
          destroyed: false,
          damageBlocked: CONFUSION_GAZE_DAMAGE,
          insubstantialUsed: true,
          moraleChange: { attacker: 0, defender: 0 },
          remainingHP: targetInstance.currentHP,
        }
      }
    }

    // Check SHIELD BLOCK passive (Dwarven Defender aura for adjacent Adventurers)
    const shieldBlockReduction = this.getShieldBlockReduction(targetInstance)
    const finalDamage = Math.max(0, CONFUSION_GAZE_DAMAGE - shieldBlockReduction)

    // Apply damage using takeDamage (with SHIELD BLOCK reduction)
    const wasDestroyed = targetInstance.takeDamage(finalDamage)

    let moraleChange = { attacker: 0, defender: 0 }

    if (wasDestroyed) {
      // Clear the tile occupant first
      if (targetInstance.position) {
        const tile = this.getTile(targetInstance.position.x, targetInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(
        (c) => c.instanceId === targetInstance.instanceId
      )
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add creature CARD to graveyard (not instance)
      defenderPlayer.creatureGraveyard.push(targetInstance.creature)

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(targetInstance.creature.level)

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level,
      }

      // UNTAP ON KILL: Check if Bugbear Berserker should untap from this kill
      if (targetInstance.position && this.checkUntapOnAdjacentKill) {
        const untapResult = this.checkUntapOnAdjacentKill(
          targetInstance.position,
          defenderOwner,
          attackerOwner,
          false // Not killed by Bugbear directly
        )
      }
    }

    return {
      success: true,
      damage: finalDamage,
      originalDamage: CONFUSION_GAZE_DAMAGE,
      shieldBlockReduction,
      destroyed: wasDestroyed,
      moraleChange,
      remainingHP: Math.max(0, targetInstance.currentHP),
    }
  }

  /**
   * Apply CONFUSION GAZE damage with defense reduction
   * @param {CreatureInstance} attackerInstance - The Umber Hulk (for damage value)
   * @param {CreatureInstance} targetInstance - The creature receiving damage
   * @param {number} damageReduction - Amount of damage prevented by defense
   * @param {number} damageBoostBonus - Bonus damage from order cards (default 0)
   * @param {number|null} damageBoostFlat - Flat damage that replaces base (default null)
   * @returns {Object} { success, damage, destroyed, moraleChange, remainingHP }
   */
  applyConfusionGazeWithDefense(
    attackerInstance,
    targetInstance,
    damageReduction = 0,
    damageBoostBonus = 0,
    damageBoostFlat = null
  ) {
    // Calculate base damage with optional order card boost
    const baseDamage = attackerInstance.creature.meleeAttack?.damage || 30
    const BASE_DAMAGE = damageBoostFlat !== null ? damageBoostFlat : baseDamage + damageBoostBonus
    const actualDamage = Math.max(0, BASE_DAMAGE - damageReduction)

    if (!targetInstance) {
      return { success: false, message: 'Invalid target' }
    }

    // If all damage was prevented, no effect
    if (actualDamage <= 0) {
      return {
        success: true,
        damage: 0,
        destroyed: false,
        moraleChange: { attacker: 0, defender: 0 },
        remainingHP: targetInstance.currentHP,
        damageReduced: damageReduction,
      }
    }

    const attackerOwner = attackerInstance.owner
    const defenderOwner = targetInstance.owner

    // Check INSUBSTANTIAL before applying Confusion Gaze damage with defense
    if (this.canUseInsubstantial(targetInstance)) {
      const blocked = this.useInsubstantial(targetInstance, actualDamage, attackerOwner)
      if (blocked) {
        return {
          success: true,
          damage: 0,
          destroyed: false,
          damageBlocked: actualDamage,
          insubstantialUsed: true,
          moraleChange: { attacker: 0, defender: 0 },
          remainingHP: targetInstance.currentHP,
        }
      }
    }

    // Check SHIELD BLOCK passive (Dwarven Defender aura for adjacent Adventurers)
    const shieldBlockReduction = this.getShieldBlockReduction(targetInstance)
    const finalDamage = Math.max(0, actualDamage - shieldBlockReduction)

    // If all damage was prevented by SHIELD BLOCK, no effect
    if (finalDamage <= 0) {
      return {
        success: true,
        damage: 0,
        destroyed: false,
        moraleChange: { attacker: 0, defender: 0 },
        remainingHP: targetInstance.currentHP,
        damageReduced: damageReduction,
        shieldBlockReduction,
      }
    }

    // Apply damage using takeDamage (with SHIELD BLOCK reduction)
    const wasDestroyed = targetInstance.takeDamage(finalDamage)

    let moraleChange = { attacker: 0, defender: 0 }

    if (wasDestroyed) {
      // Clear the tile occupant first
      if (targetInstance.position) {
        const tile = this.getTile(targetInstance.position.x, targetInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(
        (c) => c.instanceId === targetInstance.instanceId
      )
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add creature CARD to graveyard (not instance)
      defenderPlayer.creatureGraveyard.push(targetInstance.creature)

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(targetInstance.creature.level)

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level,
      }

      // UNTAP ON KILL: Check if Bugbear Berserker should untap from this kill
      if (targetInstance.position && this.checkUntapOnAdjacentKill) {
        const untapResult = this.checkUntapOnAdjacentKill(
          targetInstance.position,
          defenderOwner,
          attackerOwner,
          false // Not killed by Bugbear directly
        )
      }
    }

    return {
      success: true,
      damage: finalDamage,
      originalDamage: BASE_DAMAGE,
      destroyed: wasDestroyed,
      moraleChange,
      remainingHP: Math.max(0, targetInstance.currentHP),
      damageReduced: damageReduction,
      shieldBlockReduction,
    }
  }

  // ============================================================================
  // SLAM - Earth Guardian Ability (Heart of Cormyr)
  // Whenever an adjacent creature takes damage from this creature's attack,
  // slide the damaged creature up to 3 squares
  // ============================================================================

  /**
   * Check if creature has SLAM ability (Earth Guardian)
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has SLAM ability
   */
  hasSlam(creatureInstance) {
    return Slam.has(creatureInstance)
  }

  /**
   * Get valid tiles where a creature can be slammed to
   * Uses BFS - mountains block, all other tiles cost 1
   * Cannot stop on occupied tiles
   *
   * @param {CreatureInstance} targetInstance - Creature being slammed
   * @param {number} maxDistance - Maximum slide distance (default 3)
   * @returns {Array} Array of {x, y} valid destinations
   */
  getValidSlamTiles(targetInstance, maxDistance = 3) {
    return Slam.getValidTiles(this, targetInstance, maxDistance)
  }

  /**
   * Execute SLAM slide - move creature to new position
   * @param {CreatureInstance} targetInstance - Creature being slammed
   * @param {Object} destination - {x, y} destination position
   * @returns {Object} Result with oldPosition and newPosition
   */
  executeSlamSlide(targetInstance, destination) {
    return Slam.execute(this, targetInstance, destination)
  }

  // ============================================================================
  // SUMMON SPIDER - Drow Priestess Ability (Sting of Lolth)
  // When deploying any Spider creature, you can place it in any unoccupied
  // square within 5 squares of this creature (Chebyshev distance)
  // ============================================================================

  /**
   * Check if a creature is a Spider type
   * Spiders have 'Spider' in their type array: Demonweb Spider, Giant Spider, Drider
   * Big O: O(n) where n = number of types (typically 2-3)
   * @param {Object} creature - The creature card to check
   * @returns {boolean} True if creature is a Spider type
   */
  isSpiderCreature(creature) {
    if (!creature?.type) return false
    return creature.type.some((t) => t.toLowerCase() === 'spider')
  }

  /**
   * Check if player has Drow Priestess in play with SUMMON SPIDER ability
   * Returns the Priestess instance if found, null otherwise
   * Big O: O(n) where n = creatures in play (typically < 12)
   * @param {string} playerId - The player ID to check
   * @returns {CreatureInstance|null} The Priestess instance or null
   */
  hasSummonSpider(playerId) {
    const player = this.players[playerId]
    if (!player) return null

    for (const creature of player.creaturesInPlay) {
      if (!creature.creature?.specialAbilities) continue
      const hasSummon = creature.creature.specialAbilities.some(
        (ability) => typeof ability === 'string' && ability.toUpperCase().includes('SUMMON SPIDER')
      )
      if (hasSummon) return creature // Return the Priestess instance
    }
    return null
  }

  /**
   * Get valid SUMMON SPIDER deployment tiles (within 5 squares of Priestess)
   * Returns tiles that are:
   * - Within 5 squares (Chebyshev distance) of the Priestess
   * - Unoccupied
   * - Not a MOUNTAIN (creatures can't deploy on mountains)
   * Big O: O(121) - checks at most (2*5+1)^2 = 121 tiles
   * @param {CreatureInstance} priestessInstance - The Drow Priestess in play
   * @returns {Array} Array of {x, y, tile} valid deployment positions
   */
  getSummonSpiderTiles(priestessInstance) {
    if (!priestessInstance?.position) return []

    const validTiles = []
    const pos = priestessInstance.position

    // Check all tiles within 5 squares (Chebyshev distance)
    for (let dx = -5; dx <= 5; dx++) {
      for (let dy = -5; dy <= 5; dy++) {
        const x = pos.x + dx
        const y = pos.y + dy

        const tile = this.getTile(x, y)
        if (!tile) continue // Off board

        // Cannot deploy on mountains or occupied tiles
        if (tile.terrain === 'MOUNTAIN') continue
        if (tile.occupant) continue

        validTiles.push({ x, y, tile })
      }
    }

    return validTiles
  }

  // ============================================================================
  // GRAVEYARD SYSTEM - All creatures go to graveyard when destroyed
  // Zombies from Curse of Undeath can be resurrected from graveyard
  // ============================================================================

  /**
   * Check if creature has GRAVEYARD DEPLOY ability
   * Only Zombies from Curse of Undeath have this ability
   * Big O: O(n) where n = number of special abilities (typically 1-3)
   * @param {Object} creature - The creature card to check
   * @returns {boolean} True if creature has GRAVEYARD DEPLOY
   */
  hasGraveyardDeploy(creature) {
    if (!creature?.specialAbilities) return false
    return creature.specialAbilities.some(
      (a) => typeof a === 'string' && a.toUpperCase().includes('GRAVEYARD')
    )
  }

  /**
   * Get all creatures in a player's graveyard
   * Sorted: Zombies (resurrectable) first, then others by name
   * Big O: O(n log n) where n = graveyard size
   * @param {string} playerId - The player ID
   * @returns {Array} Array of creature cards sorted by resurrectability
   */
  getGraveyardCreatures(playerId) {
    const player = this.players[playerId]
    if (!player) return []

    // Sort: resurrectable creatures first, then by name
    return [...player.creatureGraveyard].sort((a, b) => {
      const aCanRes = this.hasGraveyardDeploy(a) ? 0 : 1
      const bCanRes = this.hasGraveyardDeploy(b) ? 0 : 1
      if (aCanRes !== bCanRes) return aCanRes - bCanRes
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Get resurrectable creatures (Zombies) from graveyard
   * Big O: O(n) where n = graveyard size
   * @param {string} playerId - The player ID
   * @returns {Array} Array of creature cards that can be resurrected
   */
  getResurrectableCreatures(playerId) {
    const player = this.players[playerId]
    if (!player) return []
    return player.creatureGraveyard.filter((c) => this.hasGraveyardDeploy(c))
  }

  /**
   * Check if player can resurrect a creature (has morale + leadership)
   * Big O: O(c) where c = creatures in play (for leadership calculation)
   * @param {string} playerId - The player ID
   * @param {Object} creature - The creature card to check
   * @returns {boolean} True if player can resurrect the creature
   */
  canResurrectCreature(playerId, creature) {
    const player = this.players[playerId]
    if (!player) return false
    if (!this.hasGraveyardDeploy(creature)) return false

    // Check morale cost (1)
    if (player.morale < 1) return false

    // Check leadership cost (creature level)
    if (!player.canDeployCreature(creature)) return false

    return true
  }

  /**
   * Remove creature from graveyard when resurrected
   * Also deducts the morale cost
   * Big O: O(n) where n = graveyard size (for findIndex)
   * @param {string} playerId - The player ID
   * @param {Object} creature - The creature card to remove
   * @returns {boolean} True if creature was found and removed
   */
  removeFromGraveyard(playerId, creature) {
    const player = this.players[playerId]
    if (!player) return false

    const index = player.creatureGraveyard.findIndex((c) => c.id === creature.id)
    if (index === -1) return false

    player.creatureGraveyard.splice(index, 1)
    player.morale -= 1 // Deduct morale cost
    return true
  }

  // ============================================================================
  // PHASE 2: CREATURE ABILITIES - Curse of Undeath Combat Abilities
  // 2A: LIFE DRAIN (Vampire Stalker) - Heal 10 HP on melee damage
  // 2B: ADJACENT UNDEAD DEPLOY (Lich Necromancer) - Deploy Undead adjacent to Lich
  // 2C: SWIRL/SPLASH (Skeletal Tomb Guardian) - 20 damage to adjacent enemies
  // ============================================================================

  // --------------------------------------------------------------------------
  // 2A: LIFE DRAIN (Vampire Stalker)
  // --------------------------------------------------------------------------

  /**
   * Check if creature has LIFE DRAIN ability
   * Big O: O(n) where n = number of special abilities (typically 1-3)
   * @param {Object} creatureInstance - The creature instance to check
   * @returns {boolean} True if creature has LIFE DRAIN ability
   */
  hasLifeDrain(creatureInstance) {
    return LifeDrain.has(creatureInstance)
  }

  /**
   * Apply LIFE DRAIN healing (10 HP, capped at max HP)
   * Big O: O(1) - constant time operation
   * @param {Object} attackerInstance - The attacking creature instance
   * @returns {number} Amount actually healed (0 if already at max HP)
   */
  applyLifeDrain(attackerInstance) {
    return LifeDrain.apply(attackerInstance)
  }

  // --------------------------------------------------------------------------
  // 2A-2: TAP ON HIT (Horned Devil, Wolf - Tyranny of Goblins)
  // --------------------------------------------------------------------------

  /**
   * Check if creature has TAP ON HIT ability
   * TAP ON HIT: Whenever this creature deals melee damage, tap the target
   * Big O: O(1) - checks direct property on creature
   * @param {Object} creatureInstance - The creature instance to check
   * @returns {boolean} True if creature has TAP ON HIT ability
   */
  hasTapOnHit(creatureInstance) {
    return TapOnHit.has(creatureInstance)
  }

  /**
   * Check if creature has REACH ability and return reach distance
   * REACH: Creature can make melee attacks at extended range
   * Big O: O(1) - checks direct property on creature
   * @param {Object} creatureInstance - The creature instance to check
   * @returns {number} Reach distance (0 if no reach ability)
   */
  getCreatureReach(creatureInstance) {
    return Reach.getDistance(creatureInstance)
  }

  /**
   * Check if creature has any REACH ability
   * Big O: O(1) - checks direct property on creature
   * @param {Object} creatureInstance - The creature instance to check
   * @returns {boolean} True if creature has REACH ability
   */
  hasReach(creatureInstance) {
    return Reach.has(creatureInstance)
  }

  // --------------------------------------------------------------------------
  // 2B: WEB ORDER CARD (Sting of Lolth)
  // --------------------------------------------------------------------------

  /**
   * Check if a creature is webbed (has Web card attached)
   * Big O: O(n) where n = number of attached cards (typically 0-1)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {boolean} True if creature has Web attached
   */
  isWebbed(creatureInstance) {
    if (!creatureInstance?.attachedCards) return false
    return creatureInstance.attachedCards.some((attached) =>
      attached.card?.name?.toUpperCase().includes('WEB')
    )
  }

  /**
   * Get the Web card attached to a creature (if any)
   * Big O: O(n) where n = number of attached cards (typically 0-1)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {Object|null} The attached Web card info or null
   */
  getAttachedWeb(creatureInstance) {
    if (!creatureInstance?.attachedCards) return null
    return (
      creatureInstance.attachedCards.find((attached) =>
        attached.card?.name?.toUpperCase().includes('WEB')
      ) || null
    )
  }

  /**
   * Check if a creature can use a Web order card
   * Requires INT ability OR SPIDER AFFINITY (Spider-type creatures bypass INT requirement)
   * Big O: O(t) where t = number of creature types (typically 2-4)
   * @param {CreatureInstance} casterInstance - The creature casting Web
   * @param {OrderCard} webCard - The Web order card
   * @returns {boolean} True if creature can use Web
   */
  canUseWebCard(casterInstance, webCard) {
    if (!casterInstance?.creature || !webCard) {
      return false
    }

    // Check level requirement
    if (casterInstance.creature.level < webCard.level) {
      return false
    }

    // Check if creature has INT ability
    if (casterInstance.creature.abilities?.INT) {
      return true
    }

    // SPIDER AFFINITY: Spider-type creatures can use Web without INT
    const creatureTypes = casterInstance.creature.type || []
    const isSpider = creatureTypes.some((t) => t.toLowerCase() === 'spider')

    return isSpider
  }

  /**
   * Get valid targets for Web card (enemies within 10 squares with LOS, not through forests)
   * Big O: O(e * d^2) where e = enemy creatures, d = range (10)
   * @param {CreatureInstance} casterInstance - The creature casting Web
   * @param {OrderCard} webCard - The Web order card (for range, defaults to 10)
   * @returns {Array} Array of valid target CreatureInstances
   */
  getWebValidTargets(casterInstance, webCard) {
    if (!casterInstance?.position) return []

    const casterPos = casterInstance.position
    const range = 10 // Web range is always 10 squares
    const validTargets = []

    // Get all enemy creatures
    for (const [playerId, player] of Object.entries(this.players)) {
      if (playerId === casterInstance.owner) continue // Skip own creatures

      for (const enemy of player.creaturesInPlay) {
        if (!enemy.position) continue

        // Check if already webbed (only 1 Web per creature)
        if (this.isWebbed(enemy)) continue

        // Check distance
        const dx = Math.abs(enemy.position.x - casterPos.x)
        const dy = Math.abs(enemy.position.y - casterPos.y)
        const distance = Math.max(dx, dy) // Chebyshev distance for grid

        if (distance > range) continue

        // Check LOS (not through forests)
        // hasLineOfSight expects creature instances (with .position), not raw positions
        const hasLOS = this.hasLineOfSight(casterInstance, enemy, casterInstance.owner)
        if (!hasLOS) continue

        validTargets.push(enemy)
      }
    }

    return validTargets
  }

  /**
   * Apply Web card to target creature
   * Attaches Web card to target and removes it from caster's hand
   * Big O: O(h) where h = cards in hand
   * @param {CreatureInstance} casterInstance - The creature casting Web
   * @param {CreatureInstance} targetInstance - The target creature to Web
   * @param {OrderCard} webCard - The Web order card
   * @returns {Object} Result { success, reason, card }
   */
  applyWeb(casterInstance, targetInstance, webCard) {
    if (!casterInstance || !targetInstance || !webCard) {
      return { success: false, reason: 'Invalid parameters' }
    }

    // Validate target is not already webbed
    if (this.isWebbed(targetInstance)) {
      return { success: false, reason: 'Target is already webbed' }
    }

    // Get caster's player state
    const casterPlayer = this.players[casterInstance.owner]
    if (!casterPlayer) {
      return { success: false, reason: 'Caster player not found' }
    }

    // Find and remove Web card from hand
    const cardIndex = casterPlayer.orderHand.findIndex((c) => c.id === webCard.id)
    if (cardIndex === -1) {
      return { success: false, reason: 'Web card not in hand' }
    }

    // Remove from hand
    const [removedCard] = casterPlayer.orderHand.splice(cardIndex, 1)

    // Attach to target creature
    targetInstance.attachedCards.push({
      card: removedCard,
      casterOwner: casterInstance.owner,
      attachedTurn: this.turnNumber,
    })

    return {
      success: true,
      card: removedCard,
      caster: casterInstance,
      target: targetInstance,
    }
  }

  /**
   * Remove Web from a creature (costs standard action)
   * Returns Web card to caster's discard pile
   * Big O: O(n) where n = attached cards
   * @param {CreatureInstance} creatureInstance - The webbed creature
   * @returns {Object} Result { success, reason, card, casterOwner }
   */
  removeWeb(creatureInstance) {
    if (!creatureInstance?.attachedCards) {
      return { success: false, reason: 'Invalid creature' }
    }

    // Find Web card
    const webIndex = creatureInstance.attachedCards.findIndex((attached) =>
      attached.card?.name?.toUpperCase().includes('WEB')
    )

    if (webIndex === -1) {
      return { success: false, reason: 'Creature is not webbed' }
    }

    // Remove Web from creature
    const [webAttachment] = creatureInstance.attachedCards.splice(webIndex, 1)
    const { card, casterOwner } = webAttachment

    // Add to caster's discard pile
    const casterPlayer = this.players[casterOwner]
    if (casterPlayer) {
      casterPlayer.orderDiscard.push(card)
    }

    return {
      success: true,
      card: card,
      casterOwner: casterOwner,
    }
  }

  /**
   * Handle creature death - discard all attached cards to their owners' discard piles
   * Big O: O(a) where a = attached cards
   * @param {CreatureInstance} creatureInstance - The dying creature
   */
  discardAttachedCards(creatureInstance) {
    if (!creatureInstance?.attachedCards?.length) return

    for (const attachment of creatureInstance.attachedCards) {
      const { card, casterOwner } = attachment
      const casterPlayer = this.players[casterOwner]
      if (casterPlayer && card) {
        casterPlayer.orderDiscard.push(card)
      }
    }

    // Clear attached cards
    creatureInstance.attachedCards = []
  }

  // --------------------------------------------------------------------------
  // 2B-2: IMMEDIATE CARD ATTACHMENTS (Leap Away, Mortal Wound, Tough as Nails)
  // --------------------------------------------------------------------------

  /**
   * Check if creature has any movement-blocking attachment (Web or Leap Away)
   * Big O: O(n) where n = number of attached cards (typically 0-2)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {boolean} True if creature has a movement-blocking attachment
   */
  hasMovementBlockingAttachment(creatureInstance) {
    if (!creatureInstance?.attachedCards?.length) return false
    return creatureInstance.attachedCards.some(
      (att) =>
        att.card?.name?.toUpperCase().includes('WEB') || att.card?.attachOnUse?.preventsMovement
    )
  }

  /**
   * Check if creature has Mortal Wound attached (destroy at Deploy phase)
   * Big O: O(n) where n = number of attached cards (typically 0-2)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {boolean} True if creature has Mortal Wound
   */
  hasMortalWound(creatureInstance) {
    if (!creatureInstance?.attachedCards?.length) return false
    return creatureInstance.attachedCards.some((att) => att.card?.attachOnUse?.destroyAtDeploy)
  }

  /**
   * Check if creature has any damageOnActivation attachment (Deep Wound)
   * These deal damage at the start of the creature's owner's Activate phase
   * Big O: O(n) where n = number of attached cards (typically 0-2)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {boolean} True if creature has a damageOnActivation attachment
   */
  hasDamageOnActivationAttachment(creatureInstance) {
    if (!creatureInstance?.attachedCards?.length) return false
    return creatureInstance.attachedCards.some((att) => att.attachOnUse?.damageOnActivation > 0)
  }

  /**
   * Get Block amount from all attachments (Tough as Nails grants Block 10)
   * Block reduces damage from EACH source by this amount
   * Big O: O(n) where n = number of attached cards (typically 0-2)
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {number} Total block amount (0 if none)
   */
  getBlockAmount(creatureInstance) {
    if (!creatureInstance?.attachedCards?.length) return 0
    return creatureInstance.attachedCards.reduce(
      (total, att) => total + (att.card?.attachOnUse?.blockAmount || 0),
      0
    )
  }

  /**
   * Apply an IMMEDIATE card attachment to a creature
   * Handles cards that attach after use (Leap Away, Mortal Wound, Tough as Nails)
   * Big O: O(n) where n = attached cards (if removesAllAttachments)
   * @param {CreatureInstance} creatureInstance - The creature to attach to
   * @param {OrderCard} card - The IMMEDIATE card being used
   * @param {string} casterOwner - Player ID of the card owner
   * @returns {Array} Array of removed cards (if any were cleansed)
   */
  applyImmediateCardAttachment(creatureInstance, card, casterOwner) {
    if (!creatureInstance || !card) return []

    // Initialize attachedCards if not present
    if (!creatureInstance.attachedCards) {
      creatureInstance.attachedCards = []
    }

    let removedCards = []

    // If card removes all attachments first (Tough as Nails, Undaunted Surge)
    if (card.removesAllAttachments) {
      removedCards = this.removeAllAttachments(creatureInstance)
    }

    // Attach the card
    creatureInstance.attachedCards.push({
      card: card,
      casterOwner: casterOwner,
      attachedTurn: this.turnNumber,
    })

    return removedCards
  }

  /**
   * Remove all attachments from a creature
   * Returns each card to its caster's discard pile
   * Used by Tough as Nails, Undaunted Surge, Rally
   * Big O: O(n) where n = attached cards
   * @param {CreatureInstance} creatureInstance - The creature to cleanse
   * @returns {Array} Array of removed attachment objects
   */
  removeAllAttachments(creatureInstance) {
    if (!creatureInstance?.attachedCards?.length) return []

    const removed = [...creatureInstance.attachedCards]

    // Return each card to its caster's discard pile
    for (const att of removed) {
      const casterPlayer = this.players[att.casterOwner]
      if (casterPlayer && att.card) {
        casterPlayer.orderDiscard.push(att.card)
      }
    }

    creatureInstance.attachedCards = []
    return removed
  }

  /**
   * Remove a specific attachment that can be removed as a STANDARD action
   * Only works for attachments with removableAsStandard: true (Leap Away, Web)
   * Big O: O(n) where n = attached cards
   * @param {CreatureInstance} creatureInstance - The creature with attachment
   * @param {OrderCard} attachmentCard - The attachment to remove
   * @returns {Object} Result { success, reason, card }
   */
  removeAttachmentAsStandard(creatureInstance, attachmentCard) {
    if (!creatureInstance?.attachedCards?.length) {
      return { success: false, reason: 'No attachments found' }
    }

    // Web is always removable as standard
    const isWeb = attachmentCard?.name?.toUpperCase().includes('WEB')

    if (!isWeb && !attachmentCard?.attachOnUse?.removableAsStandard) {
      return { success: false, reason: 'This attachment cannot be removed manually' }
    }

    const index = creatureInstance.attachedCards.findIndex(
      (att) => att.card?.id === attachmentCard.id
    )

    if (index === -1) {
      return { success: false, reason: 'Attachment not found' }
    }

    const [removed] = creatureInstance.attachedCards.splice(index, 1)

    // Return to caster's discard pile
    const casterPlayer = this.players[removed.casterOwner]
    if (casterPlayer && removed.card) {
      casterPlayer.orderDiscard.push(removed.card)
    }

    return { success: true, card: removed.card }
  }

  /**
   * Get all removable attachments for a creature (for UI display)
   * Returns attachments that can be removed as STANDARD action
   * Big O: O(n) where n = attached cards
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {Array} Array of removable attachment cards
   */
  getRemovableAttachments(creatureInstance) {
    if (!creatureInstance?.attachedCards?.length) return []

    return creatureInstance.attachedCards
      .filter((att) => {
        const isWeb = att.card?.name?.toUpperCase().includes('WEB')
        return isWeb || att.card?.attachOnUse?.removableAsStandard
      })
      .map((att) => att.card)
  }

  /**
   * Get all harmful attachments for a player's creatures (for UI notification modal)
   * Categorizes attachments by their effect type:
   * - damageEffects: Cards that deal damage on activation (Deep Wound)
   * - movementBlocked: Cards that prevent movement (Web, Leap Away)
   * - pendingDeath: Cards that destroy at Deploy phase (Mortal Wound)
   * - damagePenalty: Cards that reduce damage output (Shattered Weapon)
   * Big O: O(c * a) where c = creatures in play, a = attachments per creature
   * @param {string} playerId - The player to check
   * @returns {Object} { damageEffects, movementBlocked, pendingDeath, damagePenalty }
   */
  getHarmfulAttachments(playerId) {
    const player = this.players[playerId]
    if (!player)
      return { damageEffects: [], movementBlocked: [], pendingDeath: [], damagePenalty: [] }

    const effects = {
      damageEffects: [], // damageOnActivation (Deep Wound)
      movementBlocked: [], // preventsMovement (Web, Leap Away)
      pendingDeath: [], // destroyAtDeploy (Mortal Wound)
      damagePenalty: [], // Shattered Weapon (-10 melee)
    }

    for (const creature of player.creaturesInPlay) {
      if (!creature.attachedCards?.length) continue

      for (const attachment of creature.attachedCards) {
        const card = attachment.card
        const attachOnUse = attachment.attachOnUse || card?.attachOnUse

        // Damage on activation (Deep Wound)
        if (attachOnUse?.damageOnActivation > 0) {
          effects.damageEffects.push({
            creature: creature,
            creatureName: creature.creature?.name || 'Unknown',
            damage: attachOnUse.damageOnActivation,
            destroyed: creature.currentHP <= 0,
            currentHP: creature.currentHP,
            maxHP: creature.creature?.hitPoints || 0,
            source: card?.name || 'Unknown',
          })
        }

        // Movement blocked (Web, Leap Away)
        if (attachOnUse?.preventsMovement) {
          effects.movementBlocked.push({
            creature: creature,
            creatureName: creature.creature?.name || 'Unknown',
            source: card?.name || 'Unknown',
          })
        }

        // Pending death (Mortal Wound)
        if (attachOnUse?.destroyAtDeploy) {
          effects.pendingDeath.push({
            creature: creature,
            creatureName: creature.creature?.name || 'Unknown',
            source: card?.name || 'Unknown',
          })
        }

        // Shattered Weapon (check by card name since it's a custom debuff)
        if (card?.name?.toUpperCase().includes('SHATTERED WEAPON')) {
          effects.damagePenalty.push({
            creature: creature,
            creatureName: creature.creature?.name || 'Unknown',
            source: card?.name || 'Unknown',
            penalty: 10,
          })
        }
      }
    }

    return effects
  }

  /**
   * Process Deploy phase destructions for creatures with Mortal Wound
   * Called at START of Deploy phase before creatures can be deployed
   * Big O: O(c) where c = creatures in play
   * @param {string} playerId - The player whose Deploy phase is starting
   * @returns {Array} Array of { creature, reason } for each destroyed creature
   */
  processDeployPhaseDestructions(playerId) {
    const player = this.players[playerId]
    if (!player) return []

    const destroyed = []

    // Find creatures with Mortal Wound (destroyAtDeploy)
    const creaturesWithMortalWound = player.creaturesInPlay.filter((c) => this.hasMortalWound(c))

    for (const creature of creaturesWithMortalWound) {
      destroyed.push({
        creature: creature,
        reason: 'Mortal Wound',
      })
    }

    return destroyed
  }

  /**
   * Process Activate phase damage for creatures with damageOnActivation attachments (Deep Wound)
   * Called at START of Activate phase before creatures can act
   * Damage is dealt to creatures owned by the current player with damageOnActivation attachments
   * Big O: O(c * a) where c = creatures in play, a = attachments per creature
   * @param {string} playerId - The player whose Activate phase is starting
   * @returns {Array} Array of { creature, damage, destroyed, source } for each affected creature
   */
  processActivatePhaseDamage(playerId) {
    const player = this.players[playerId]
    if (!player) return []

    const damageResults = []

    for (const creature of player.creaturesInPlay) {
      if (!creature.attachedCards?.length) continue

      // Find attachments with damageOnActivation
      for (const attachment of creature.attachedCards) {
        const damageOnActivation = attachment.attachOnUse?.damageOnActivation
        if (damageOnActivation && damageOnActivation > 0) {
          // Apply damage
          const actualDamage = creature.takeDamage(damageOnActivation)
          const destroyed = creature.currentHP <= 0

          damageResults.push({
            creature: creature,
            creatureName: creature.creature?.name || creature.name,
            damage: actualDamage,
            destroyed: destroyed,
            source: attachment.card?.name || 'Unknown',
            sourceCard: attachment.card,
          })

          // Handle creature death if destroyed
          if (destroyed) {
            // Remove from board
            if (creature.position) {
              const tile = this.getTile(creature.position.x, creature.position.y)
              if (tile) {
                tile.occupant = null
              }
            }

            // Remove from player's creaturesInPlay and add to graveyard
            const index = player.creaturesInPlay.indexOf(creature)
            if (index !== -1) {
              player.creaturesInPlay.splice(index, 1)
            }
            player.creatureGraveyard.push(creature.creature)

            // Return attached order cards to graveyard
            this.discardAttachedCards(creature)
          }
        }
      }
    }

    return damageResults
  }

  // --------------------------------------------------------------------------
  // 2C: ADJACENT UNDEAD DEPLOY (Lich Necromancer)
  // --------------------------------------------------------------------------

  /**
   * Check if creature is Undead type AND from Curse of Undeath faction
   * Only Undead from Curse of Undeath can be deployed adjacent to Lich Necromancer
   * Big O: O(t) where t = number of types (typically 2-4)
   * @param {Object} creature - The creature card to check
   * @returns {boolean} True if creature is Undead from Curse of Undeath
   */
  isUndeadCreature(creature) {
    if (!creature?.type) return false
    if (creature.faction !== 'Curse of Undeath') return false
    return creature.type.some((t) => t.toLowerCase() === 'undead')
  }

  /**
   * Check if player has Lich Necromancer in play
   * Returns the Lich instance if found, null otherwise
   * Big O: O(c) where c = creatures in play
   * @param {string} playerId - The player ID
   * @returns {Object|null} The Lich Necromancer instance or null if not found
   */
  hasLichNecromancerDeploy(playerId) {
    const player = this.players[playerId]
    if (!player) return null

    for (const creature of player.creaturesInPlay) {
      if (!creature.creature?.specialAbilities) continue
      // Check by name AND ability text to ensure we find the right creature
      if (creature.creature.name !== 'Lich Necromancer') continue
      const hasAbility = creature.creature.specialAbilities.some(
        (a) => typeof a === 'string' && a.toUpperCase().includes('ADJACENT')
      )
      if (hasAbility) {
        return creature
      }
    }
    return null
  }

  /**
   * Get valid tiles adjacent to Lich Necromancer for Undead deployment
   * Big O: O(9) - checks at most 9 tiles (8 adjacent + center skip)
   * @param {Object} lichInstance - The Lich Necromancer creature instance
   * @returns {Array} Array of valid tile objects with {x, y, tile}
   */
  getLichNecromancerDeployTiles(lichInstance) {
    if (!lichInstance?.position) return []

    const validTiles = []
    const pos = lichInstance.position

    // 8-directional adjacency (range = 1)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue // Skip Lich's own tile
        const x = pos.x + dx
        const y = pos.y + dy

        const tile = this.getTile(x, y)
        if (!tile) continue
        if (tile.terrain === 'MOUNTAIN') continue
        if (tile.occupant) continue

        validTiles.push({ x, y, tile })
      }
    }

    return validTiles
  }

  // --------------------------------------------------------------------------
  // 2D: ORC DRUID - BEAST/ELEMENTAL DEPLOY (Blood of Gruumsh)
  // --------------------------------------------------------------------------

  /**
   * Check if creature is Beast or Elemental AND from Blood of Gruumsh faction
   * Only Beast/Elemental from Blood of Gruumsh can be deployed adjacent to Orc Druid
   * Big O: O(t) where t = number of types (typically 2-4)
   * @param {Object} creature - The creature card to check
   * @returns {boolean} True if creature is Beast/Elemental from Blood of Gruumsh
   */
  isBeastOrElementalCreature(creature) {
    if (!creature?.type) return false
    if (creature.faction !== 'Blood of Gruumsh') return false
    return creature.type.some((t) => t.toLowerCase() === 'beast' || t.toLowerCase() === 'elemental')
  }

  /**
   * Check if player has Orc Druid in play
   * Returns the Orc Druid instance if found, null otherwise
   * Big O: O(c) where c = creatures in play
   * @param {string} playerId - The player ID
   * @returns {Object|null} The Orc Druid instance or null if not found
   */
  hasOrcDruidDeploy(playerId) {
    const player = this.players[playerId]
    if (!player) return null

    for (const creature of player.creaturesInPlay) {
      if (creature.creature.name === 'Orc Druid') {
        return creature
      }
    }
    return null
  }

  /**
   * Get valid tiles adjacent to Orc Druid for Beast/Elemental deployment
   * Big O: O(9) - checks at most 9 tiles (8 adjacent + center skip)
   * @param {Object} druidInstance - The Orc Druid creature instance
   * @returns {Array} Array of valid tile objects with {x, y, tile}
   */
  getOrcDruidDeployTiles(druidInstance) {
    if (!druidInstance?.position) return []

    const validTiles = []
    const pos = druidInstance.position

    // 8-directional adjacency (range = 1)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue // Skip Druid's own tile
        const x = pos.x + dx
        const y = pos.y + dy

        const tile = this.getTile(x, y)
        if (!tile) continue
        if (tile.terrain === 'MOUNTAIN') continue
        if (tile.occupant) continue

        validTiles.push({ x, y, tile })
      }
    }

    return validTiles
  }

  // --------------------------------------------------------------------------
  // 2C: SWIRL/SPLASH DAMAGE (Skeletal Tomb Guardian)
  // --------------------------------------------------------------------------

  /**
   * Check if creature has Tomb Guardian splash/swirl ability
   * Big O: O(n) where n = number of special abilities
   * @param {Object} creatureInstance - The creature instance to check
   * @returns {boolean} True if creature has splash ability
   */
  hasTombGuardianSplash(creatureInstance) {
    return TombGuardianSplash.has(creatureInstance)
  }

  /**
   * Get all enemies adjacent to Skeletal Tomb Guardian (NOT adjacent to target)
   * Includes enemies from ANY faction adjacent to the Guardian
   * Big O: O(8) - checks at most 8 adjacent tiles
   * @param {Object} attackerInstance - The Skeletal Tomb Guardian instance
   * @param {Object} mainTargetInstance - The main attack target (excluded from splash)
   * @returns {Array} Array of enemy creature instances to receive splash damage
   */
  getTombGuardianSplashTargets(attackerInstance, mainTargetInstance = null) {
    return TombGuardianSplash.getTargets(this, attackerInstance, mainTargetInstance)
  }

  /**
   * Apply Tomb Guardian splash damage (20 damage) to a single target
   * This is called AFTER defense options are resolved for each splash target
   * Big O: O(c) where c = creatures in play (for removal if destroyed)
   * @param {Object} targetInstance - The creature instance receiving splash damage
   * @param {string} attackerOwner - The owner of the attacking creature
   * @param {number} damageAfterDefense - Damage after defense options (default 20)
   * @returns {Object} Result object with damage, destroyed status, morale changes
   */
  applyTombGuardianSplash(targetInstance, attackerOwner, damageAfterDefense = 20) {
    if (!targetInstance) {
      return { success: false, message: 'Invalid target' }
    }

    const defenderOwner = targetInstance.owner
    const previousHP = targetInstance.currentHP

    // Apply damage
    targetInstance.currentHP -= damageAfterDefense
    const wasDestroyed = targetInstance.currentHP <= 0

    let moraleChange = { attacker: 0, defender: 0 }

    if (wasDestroyed) {
      // Clear tile
      if (targetInstance.position) {
        const tile = this.getTile(targetInstance.position.x, targetInstance.position.y)
        if (tile) tile.occupant = null
      }

      // Remove from battlefield
      const defenderPlayer = this.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(
        (c) => c.instanceId === targetInstance.instanceId
      )
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add creature CARD to graveyard (not instance)
      defenderPlayer.creatureGraveyard.push(targetInstance.creature)

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(targetInstance.creature.level)

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level,
      }

      // UNTAP ON KILL: Check if Bugbear Berserker should untap from this kill
      if (targetInstance.position && this.checkUntapOnAdjacentKill) {
        const untapResult = this.checkUntapOnAdjacentKill(
          targetInstance.position,
          defenderOwner,
          attackerOwner,
          false // Not killed by Bugbear directly
        )
      }
    }

    return {
      success: true,
      damage: damageAfterDefense,
      destroyed: wasDestroyed,
      moraleChange,
      remainingHP: Math.max(0, targetInstance.currentHP),
      targetName: targetInstance.creature.name,
    }
  }

  // --------------------------------------------------------------------------
  // 2D: LIGHTNING BREATH (Dracolich) - Up to 3 ranged attacks on different targets
  // --------------------------------------------------------------------------

  /**
   * Check if creature has LIGHTNING BREATH ability
   * Big O: O(n) where n = number of special abilities (typically 1-3)
   * @param {Object} creatureInstance - The creature instance to check
   * @returns {boolean} True if creature has LIGHTNING BREATH ability
   */
  hasLightningBreath(creatureInstance) {
    return LightningBreath.has(creatureInstance)
  }

  /**
   * Check if LIGHTNING BREATH can be used (requires 2+ valid targets)
   * Big O: O(e) where e = enemy creatures in play
   * @param {Object} creatureInstance - The creature instance to check
   * @returns {boolean} True if Lightning Breath can be used
   */
  canUseLightningBreath(creatureInstance) {
    return LightningBreath.canUse(this, creatureInstance)
  }

  /**
   * Get all valid targets for LIGHTNING BREATH ability
   * Requirements:
   * - Within range 5
   * - Not adjacent (distance > 1)
   * - Line of sight (not blocked by mountains or enemy creatures)
   * - Target not in FOREST (hiding)
   * - Attacker not in FOREST (cannot shoot from forest)
   *
   * Big O: O(p * c * n) where p = players, c = creatures per player, n = tiles in LOS line
   * @param {Object} creatureInstance - The Dracolich creature instance
   * @returns {Array} Array of valid target creature instances
   */
  getLightningBreathTargets(creatureInstance) {
    return LightningBreath.getTargets(this, creatureInstance)
  }

  /**
   * Get Lightning Breath damage (standard ranged damage)
   * @param {Object} creatureInstance - The Dracolich creature instance
   * @returns {number} Damage per attack (20)
   */
  getLightningBreathDamage(creatureInstance) {
    return LightningBreath.getDamage(creatureInstance)
  }

  // ============================================
  // 2E: ACID BREATH / EXPLOSIVE BOLTS (Ranged Splash Damage)
  // Copper Dragon: ACID BREATH 20 - deals 20 splash damage to adjacent enemies
  // Half-Orc Thug: EXPLOSIVE BOLTS 10 - deals 10 splash damage to adjacent enemies
  // ============================================

  /**
   * Check if creature has ACID BREATH ability
   * @param {CreatureInstance} creatureInstance
   * @returns {boolean}
   */
  hasAcidBreath(creatureInstance) {
    return AcidBreath.has(creatureInstance)
  }

  /**
   * Check if creature has EXPLOSIVE BOLTS ability
   * @param {CreatureInstance} creatureInstance
   * @returns {boolean}
   */
  hasExplosiveBolts(creatureInstance) {
    return ExplosiveBolts.has(creatureInstance)
  }

  /**
   * Check if creature has any ranged splash damage ability
   * @param {CreatureInstance} creatureInstance
   * @returns {boolean}
   */
  hasRangedSplashAbility(creatureInstance) {
    return AcidBreath.has(creatureInstance) || ExplosiveBolts.has(creatureInstance)
  }

  /**
   * Get splash damage amount for ranged splash abilities
   * @param {CreatureInstance} attackerInstance
   * @returns {number} Splash damage (20 for Acid Breath, 10 for Explosive Bolts, 0 if none)
   */
  getRangedSplashDamage(attackerInstance) {
    if (AcidBreath.has(attackerInstance)) return AcidBreath.getSplashDamage()
    if (ExplosiveBolts.has(attackerInstance)) return ExplosiveBolts.getSplashDamage()
    return 0
  }

  /**
   * Get ability name for ranged splash
   * @param {CreatureInstance} attackerInstance
   * @returns {string|null}
   */
  getRangedSplashAbilityName(attackerInstance) {
    if (AcidBreath.has(attackerInstance)) return 'ACID BREATH'
    if (ExplosiveBolts.has(attackerInstance)) return 'EXPLOSIVE BOLTS'
    return null
  }

  /**
   * Get all enemy creatures adjacent to the ranged attack target
   * Uses 8-tile adjacency (includes diagonals)
   * Includes creatures in forests (splash ignores forest protection)
   *
   * @param {CreatureInstance} attackerInstance - The creature making the ranged attack
   * @param {Object} targetPosition - {x, y} position of the ranged attack target
   * @returns {Array} Array of enemy CreatureInstances adjacent to target
   */
  getRangedSplashTargets(attackerInstance, targetPosition) {
    if (!targetPosition || targetPosition.x === undefined || targetPosition.y === undefined) {
      return []
    }

    const attackerOwner = attackerInstance.owner
    const splashTargets = []

    // 8-tile adjacency offsets
    const adjacentOffsets = [
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 },
    ]

    for (const offset of adjacentOffsets) {
      const checkX = targetPosition.x + offset.dx
      const checkY = targetPosition.y + offset.dy

      // Bounds check
      if (checkX < 0 || checkX >= this.boardWidth || checkY < 0 || checkY >= this.boardHeight) {
        continue
      }

      // Search all players' creatures for one at this position
      // Note: creaturesInPlay is on PlayerState, not GameState - iterate through this.players
      for (const playerId in this.players) {
        const playerCreatures = this.players[playerId].creaturesInPlay
        if (!playerCreatures) continue

        const creatureAtPos = playerCreatures.find(
          (c) => c.position?.x === checkX && c.position?.y === checkY && c.currentHP > 0
        )

        if (creatureAtPos && creatureAtPos.owner !== attackerOwner) {
          splashTargets.push(creatureAtPos)
          break
        }
      }
    }

    return splashTargets
  }

  /**
   * Apply ranged splash damage to a single target
   * Handles INSUBSTANTIAL check
   *
   * @param {CreatureInstance} targetInstance - Creature receiving splash damage
   * @param {string} attackerOwner - Owner of the attacking creature
   * @param {number} damageAmount - Base splash damage (20 or 10)
   * @param {number} damageReduction - Damage prevented by defense (default 0)
   * @returns {Object} Result with damage dealt, destroyed status, insubstantial block
   */
  applyRangedSplashDamage(targetInstance, attackerOwner, damageAmount, damageReduction = 0) {
    const actualDamage = Math.max(0, damageAmount - damageReduction)
    const targetOwner = targetInstance.owner

    // Check INSUBSTANTIAL
    if (this.hasInsubstantial(targetInstance) && targetInstance.insubstantialAvailable) {
      const blocked = this.useInsubstantial(targetInstance, actualDamage, attackerOwner)
      if (blocked) {
        return {
          damage: 0,
          destroyed: false,
          insubstantialBlocked: true,
          damageBlocked: actualDamage,
          moraleChange: { attacker: 0, defender: 0 },
        }
      }
    }

    const previousHP = targetInstance.currentHP
    const wasDestroyed = targetInstance.takeDamage(actualDamage)

    let moraleChange = { attacker: 0, defender: 0 }

    // Handle creature destruction - clear tile, remove from play, add to graveyard, morale
    if (wasDestroyed) {
      // Clear the tile occupant first
      if (targetInstance.position) {
        const tile = this.getTile(targetInstance.position.x, targetInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.players[targetOwner]
      if (defenderPlayer) {
        const index = defenderPlayer.creaturesInPlay.findIndex(
          (c) => c.instanceId === targetInstance.instanceId
        )
        if (index !== -1) {
          defenderPlayer.creaturesInPlay.splice(index, 1)
        }

        // Add creature CARD to graveyard (not instance)
        defenderPlayer.creatureGraveyard.push(targetInstance.creature)

        // Defender loses morale equal to creature's level
        defenderPlayer.loseMorale(targetInstance.creature.level)
      }

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      if (attackerPlayer) {
        attackerPlayer.gainMorale(1)
      }

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level,
      }

      // UNTAP ON KILL: Check if Bugbear Berserker should untap from this kill
      if (targetInstance.position && this.checkUntapOnAdjacentKill) {
        const untapResult = this.checkUntapOnAdjacentKill(
          targetInstance.position,
          targetOwner,
          attackerOwner,
          false // Not killed by Bugbear directly
        )
      }
    }

    return {
      damage: actualDamage,
      destroyed: wasDestroyed,
      previousHP: previousHP,
      remainingHP: Math.max(0, targetInstance.currentHP),
      insubstantialBlocked: false,
      moraleChange,
    }
  }

  // ============================================================================
  // DISCIPLE OF KYUSS ABILITY METHODS
  // Passive ability: Each enemy creature takes 10 DAMAGE whenever it ends its
  // activation adjacent to this creature (triggers at end of Activate Phase)
  // ============================================================================

  /**
   * Check if creature has DISCIPLE_OF_KYUSS ability
   * Big O: O(n) where n = number of special abilities (typically 1-3)
   * @param {Object} creatureInstance - The creature instance to check
   * @returns {boolean} True if creature has DISCIPLE_OF_KYUSS ability
   */
  hasDiscipleOfKyuss(creatureInstance) {
    return DiscipleOfKyuss.has(creatureInstance)
  }

  /**
   * Find all enemy Disciple of Kyuss creatures on the board
   * Big O: O(p * c) where p = players, c = creatures per player
   * @param {string} currentPlayerId - The player ending their Activate phase
   * @returns {Array<CreatureInstance>} Array of enemy Disciples of Kyuss
   */
  getEnemyDisciplesOfKyuss(currentPlayerId) {
    return DiscipleOfKyuss.getEnemyDisciples(this, currentPlayerId)
  }

  /**
   * Get all creatures of a faction that are adjacent to a Disciple of Kyuss
   * Uses 8-directional adjacency (including diagonals)
   * Big O: O(c * a) where c = creatures in faction, a = adjacent tiles (8)
   * @param {string} factionPlayerId - The player whose creatures to check
   * @param {CreatureInstance} disciple - The Disciple of Kyuss creature
   * @returns {Array<CreatureInstance>} Creatures adjacent to the Disciple
   */
  getCreaturesAdjacentToDisciple(factionPlayerId, disciple) {
    return DiscipleOfKyuss.getAdjacentCreatures(this, factionPlayerId, disciple)
  }

  /**
   * Execute Disciple of Kyuss damage at end of Activate Phase
   * Deals 10 UNPREVENTABLE damage to each creature of the ending faction
   * that is adjacent to an enemy Disciple of Kyuss
   * Big O: O(d * c) where d = enemy disciples, c = creatures in ending faction
   * @param {string} endingPlayerId - The player ending their Activate phase
   * @returns {Object} { damageEvents: Array, deaths: Array, sourceCreature: CreatureInstance }
   */
  executeDiscipleOfKyussDamage(endingPlayerId) {
    const damageEvents = []
    const deaths = []
    let sourceCreature = null

    // Find all enemy Disciples of Kyuss
    const disciples = this.getEnemyDisciplesOfKyuss(endingPlayerId)
    if (disciples.length === 0) return { damageEvents, deaths, sourceCreature }

    // Track creatures already damaged (avoid double-damage if somehow adjacent to multiple Disciples)
    const damagedCreatureIds = new Set()

    for (const disciple of disciples) {
      sourceCreature = disciple // Track the source for modal display

      // AI DIFFICULTY CHECK: 0/50/100 rule
      // Check if the Disciple's owner is AI and apply difficulty rules
      const discipleOwner = disciple.owner
      const disciplePlayer = this.players[discipleOwner]

      if (disciplePlayer && !disciplePlayer.isHuman) {
        const aiDifficulty = disciplePlayer.aiDifficulty || 'medium'

        if (aiDifficulty === 'easy') {
          // Easy AI: Never trigger Disciple of Kyuss (0%)
          continue // Skip this Disciple
        } else if (aiDifficulty === 'medium') {
          // Medium AI: 50% chance to trigger
          if (Math.random() >= 0.5) {
            continue // Skip this Disciple
          }
        }
        // Hard AI: Always trigger (100%) - no early continue
      }

      const adjacentCreatures = this.getCreaturesAdjacentToDisciple(endingPlayerId, disciple)

      for (const creature of adjacentCreatures) {
        // Skip if already damaged by another Disciple
        if (damagedCreatureIds.has(creature.instanceId)) continue
        damagedCreatureIds.add(creature.instanceId)

        const previousHP = creature.currentHP
        const damageAmount = 10 // Unpreventable damage

        // Check INSUBSTANTIAL before applying Disciple of Kyuss damage
        // Note: "Unpreventable" means no defense cards, but INSUBSTANTIAL still works
        if (this.canUseInsubstantial(creature)) {
          const blocked = this.useInsubstantial(creature, damageAmount, disciple.owner)
          if (blocked) {
            const event = {
              creatureName: creature.creature.name,
              creatureOwner: endingPlayerId,
              creatureImageUrl: creature.creature.imageUrl,
              creatureLevel: creature.creature.level,
              damage: 0,
              damageBlocked: damageAmount,
              damageSource: `Disciple of Kyuss`,
              destroyed: false,
              insubstantialUsed: true,
              previousHP,
              remainingHP: creature.currentHP,
            }
            damageEvents.push(event)
            continue // Skip to next creature
          }
        }

        // Apply damage directly (unpreventable - no defense)
        creature.currentHP = Math.max(0, creature.currentHP - damageAmount)
        const wasDestroyed = creature.currentHP <= 0

        const event = {
          creatureName: creature.creature.name,
          creatureOwner: endingPlayerId,
          creatureImageUrl: creature.creature.imageUrl,
          creatureLevel: creature.creature.level,
          damage: damageAmount,
          damageSource: `Disciple of Kyuss`,
          destroyed: wasDestroyed,
          previousHP,
          remainingHP: creature.currentHP,
        }

        if (wasDestroyed) {
          // Handle death: clear tile, remove from play, add to graveyard, lose morale
          this.handleDiscipleOfKyussDeath(creature, disciple.owner)
          deaths.push(creature)
        }

        damageEvents.push(event)
      }
    }

    return { damageEvents, deaths, sourceCreature }
  }

  /**
   * Handle creature death from Disciple of Kyuss damage
   * Centralizes death logic: clear tile, remove from play, graveyard, morale
   * @param {CreatureInstance} creature - The destroyed creature
   * @param {string} killerOwner - Owner of the Disciple (for morale bonus)
   */
  handleDiscipleOfKyussDeath(creature, killerOwner) {
    const owner = creature.owner
    const player = this.players[owner]

    // Clear tile occupant
    if (creature.position) {
      const tile = this.getTile(creature.position.x, creature.position.y)
      if (tile) tile.occupant = null
    }

    // Remove from battlefield
    const index = player.creaturesInPlay.findIndex((c) => c.instanceId === creature.instanceId)
    if (index !== -1) {
      player.creaturesInPlay.splice(index, 1)
    }

    // Add to graveyard
    player.creatureGraveyard.push(creature.creature)

    // Lose morale equal to creature level
    player.loseMorale(creature.creature.level)

    // Killer gains +1 morale (standard rule)
    if (killerOwner && this.players[killerOwner]) {
      this.players[killerOwner].gainMorale(1)
    }
  }

  // ============================================================================
  // COMMANDER ABILITY DELEGATION METHODS
  // These methods delegate to CommanderAbilityManager for backward compatibility
  // ============================================================================

  /**
   * Check if a player's commander has a specific ability - delegates to abilityManager
   */
  hasCommanderAbility(playerId, abilityId) {
    return this.abilityManager.hasCommanderAbility(playerId, abilityId)
  }

  /**
   * Get a commander ability by ID for a player - delegates to abilityManager
   */
  getCommanderAbility(playerId, abilityId) {
    return this.abilityManager.getCommanderAbility(playerId, abilityId)
  }

  /**
   * Check if creature ignores difficult terrain (GRUUMSH COMMANDS IT) - delegates to abilityManager
   */
  ignoresDifficultTerrain(creatureInstance) {
    return this.abilityManager.ignoresDifficultTerrain(creatureInstance)
  }

  /**
   * Get commander speed bonus (WALLS OF WEB) - delegates to abilityManager
   */
  getCommanderSpeedBonus(creatureInstance) {
    return this.abilityManager.getCommanderSpeedBonus(creatureInstance)
  }

  /**
   * Check if player can deploy during Refresh phase (HORDE) - delegates to abilityManager
   */
  canDeployInRefreshPhase(playerId) {
    return this.abilityManager.canDeployInRefreshPhase(playerId)
  }

  /**
   * Check if creature can use VERSATILE ability - delegates to abilityManager
   */
  canUseVersatile(creatureInstance) {
    return this.abilityManager.canUseVersatile(creatureInstance)
  }

  /**
   * Check if SELLSWORD ability should trigger - delegates to abilityManager
   */
  shouldTriggerSellsword(creatureInstance) {
    return this.abilityManager.shouldTriggerSellsword(creatureInstance)
  }

  /**
   * Check if CHIEFTAIN CALL ability should trigger - delegates to abilityManager
   */
  shouldTriggerChieftainCall(creatureInstance) {
    return this.abilityManager.shouldTriggerChieftainCall(creatureInstance)
  }

  /**
   * Check if OGRE DEPLOY MORALE ability should trigger - delegates to abilityManager
   */
  shouldTriggerOgreDeployMorale(creatureInstance) {
    return this.abilityManager.shouldTriggerOgreDeployMorale(creatureInstance)
  }

  /**
   * Check if ORC CLERIC DEPLOY DRAW ORDER ability should trigger - delegates to abilityManager
   */
  shouldTriggerClericDeployDrawOrder(creatureInstance) {
    return this.abilityManager.shouldTriggerClericDeployDrawOrder(creatureInstance)
  }

  /**
   * Get eligible Orcs for CHIEFTAIN CALL - delegates to abilityManager
   */
  getEligibleOrcsForChieftainCall(playerId) {
    return this.abilityManager.getEligibleOrcsForChieftainCall(playerId)
  }

  /**
   * Execute CHIEFTAIN CALL ability - delegates to abilityManager
   */
  executeChieftainCall(playerId, selectedCreature, deployPosition) {
    return this.abilityManager.executeChieftainCall(playerId, selectedCreature, deployPosition)
  }

  /**
   * Check if creature can use COWER - delegates to abilityManager
   */
  canCower(creatureInstance, incomingDamage, attackerOwner = null) {
    return this.abilityManager.canCower(creatureInstance, incomingDamage, attackerOwner)
  }

  /**
   * Apply COWER ability - delegates to abilityManager
   */
  applyCower(creatureInstance, incomingDamage, attackerOwner = null) {
    return this.abilityManager.applyCower(creatureInstance, incomingDamage, attackerOwner)
  }

  /**
   * Check if creature can use UNSTOPPABLE HORDES - delegates to abilityManager
   */
  canUseUnstoppableHordes(creatureInstance) {
    return this.abilityManager.canUseUnstoppableHordes(creatureInstance)
  }

  /**
   * Apply UNSTOPPABLE HORDES ability - delegates to abilityManager
   */
  applyUnstoppableHordes(creatureInstance) {
    return this.abilityManager.applyUnstoppableHordes(creatureInstance)
  }

  /**
   * Get adjacent Undead for UNSTOPPABLE HORDES - delegates to abilityManager
   */
  getAdjacentUndeadForUnstoppableHordes(defendingCreature) {
    return this.abilityManager.getAdjacentUndeadForUnstoppableHordes(defendingCreature)
  }

  /**
   * Get adjacent tapped enemy creatures for counter-attack - delegates to abilityManager
   */
  getAdjacentTappedEnemies(defenderInstance) {
    return this.abilityManager.getAdjacentTappedEnemies(defenderInstance)
  }

  /**
   * Check if attacker is adjacent to defender (for Riposte) - delegates to abilityManager
   */
  isAttackerAdjacent(defenderInstance, attackerInstance) {
    return this.abilityManager.isAttackerAdjacent(defenderInstance, attackerInstance)
  }

  /**
   * Get all defense options for a creature - delegates to abilityManager
   */
  getDefenseOptions(defenderInstance, incomingDamage, attackerOwner) {
    return this.abilityManager.getDefenseOptions(defenderInstance, incomingDamage, attackerOwner)
  }

  /**
   * Get IMMEDIATE cards for defense - delegates to abilityManager
   */
  getImmediateCardsForDefense(defenderInstance) {
    return this.abilityManager.getImmediateCardsForDefense(defenderInstance)
  }

  /**
   * Get creatures that can use IMMEDIATE cards - delegates to abilityManager
   */
  getCreaturesForImmediateCard(defenderInstance) {
    return this.abilityManager.getCreaturesForImmediateCard(defenderInstance)
  }

  /**
   * Apply IMMEDIATE card for defense - delegates to abilityManager
   * @param {OrderCard} card - The immediate card to use
   * @param {CreatureInstance} usingCreature - The creature using the card
   * @param {OrderCard} discardCard - Optional card to discard as cost (e.g., Uncanny Dodge)
   */
  applyImmediateCardDefense(card, usingCreature, discardCard = null) {
    return this.abilityManager.applyImmediateCardDefense(card, usingCreature, discardCard)
  }

  /**
   * Check if player can deploy during REFRESH phase - delegates to abilityManager
   */
  canDeployDuringRefresh(playerId) {
    return this.abilityManager.canDeployDuringRefresh(playerId)
  }

  /**
   * Check if player can use ORC SCOUT ability - delegates to abilityManager
   */
  canUseOrcScout(playerId) {
    return this.abilityManager.canUseOrcScout(playerId)
  }

  /**
   * Get valid treasure tiles for ORC SCOUT - delegates to abilityManager
   */
  getOrcScoutValidTiles() {
    return this.abilityManager.getOrcScoutValidTiles()
  }

  /**
   * Mark ORC SCOUT ability as used - delegates to abilityManager
   */
  markOrcScoutUsed(playerId) {
    return this.abilityManager.markOrcScoutUsed(playerId)
  }

  /**
   * Get BLACK HAND OF BANE extra cost - delegates to abilityManager
   */
  getBlackHandOfBaneExtraCost(attackerOwner) {
    return this.abilityManager.getBlackHandOfBaneExtraCost(attackerOwner)
  }

  /**
   * Check if player can use SCROLLBOOK - delegates to abilityManager
   */
  canUseScrollbook(playerId) {
    return this.abilityManager.canUseScrollbook(playerId)
  }

  /**
   * Use SCROLLBOOK ability - delegates to abilityManager
   */
  useScrollbook(playerId, discardIndex) {
    return this.abilityManager.useScrollbook(playerId, discardIndex)
  }

  /**
   * Check if tile is passable - delegates to Board
   * @param {Object} tile - Tile to check
   * @param {boolean} flying - Whether creature is flying
   * @param {boolean} burrowing - Whether creature has BURROW ability enabled
   * @param {boolean} phasing - Whether creature has PHASING ability enabled
   * @returns {boolean} True if passable
   */
  isTerrainPassable(tile, flying = false, burrowing = false, phasing = false) {
    return this.board.isTerrainPassable(tile, flying, burrowing, phasing)
  }

  /**
   * Get movement cost for terrain type
   * Wraps Board.getTerrainMovementCost to handle creature abilities
   * @param {string} terrain - Terrain type
   * @param {boolean} flying - Whether creature is flying
   * @param {CreatureInstance} creatureInstance - Optional creature for ability checks
   * @param {boolean} burrowing - Whether creature has BURROW ability enabled
   * @param {boolean} phasing - Whether creature has PHASING ability enabled
   * @returns {number} Movement cost (999 = impassable)
   */
  getTerrainMovementCost(
    terrain,
    flying = false,
    creatureInstance = null,
    burrowing = false,
    phasing = false
  ) {
    // Check for GRUUMSH COMMANDS IT ability (ignore difficult terrain)
    const ignoresDifficult = creatureInstance
      ? this.ignoresDifficultTerrain(creatureInstance)
      : false

    // Delegate to Board with the ability check result
    return this.board.getTerrainMovementCost(terrain, flying, ignoresDifficult, burrowing, phasing)
  }

  // Get all valid movement tiles using A* pathfinding
  // overrideSpeed: optional parameter to limit movement (used by VERSATILE ability)
  getValidMovementTiles(creatureInstance, overrideSpeed = null) {
    if (!creatureInstance.position) return []

    // Movement-blocking attachments: Web, Leap Away (cannot move or shift)
    if (this.hasMovementBlockingAttachment(creatureInstance)) {
      return []
    }

    // Base speed + commander speed bonuses (e.g., WALLS OF WEB)
    const baseSpeed = creatureInstance.creature.speed
    const speedBonus = this.getCommanderSpeedBonus(creatureInstance)
    const speed = overrideSpeed !== null ? overrideSpeed : baseSpeed + speedBonus

    const startPos = creatureInstance.position
    const flying = this.hasFlying(creatureInstance)

    // BURROW: Check if creature has ability AND apply AI difficulty logic
    // Human players ALWAYS have BURROW enabled
    // AI difficulty affects whether BURROW is enabled:
    // - Easy: BURROW disabled (treats mountains as impassable)
    // - Medium: 50% chance BURROW is enabled
    // - Hard: BURROW always enabled
    const hasBurrowAbility = this.hasBurrow(creatureInstance)
    let burrowEnabled = false

    if (hasBurrowAbility) {
      const owner = creatureInstance.owner
      const player = this.players[owner]

      // Human players always get BURROW enabled
      if (player?.isHuman) {
        burrowEnabled = true
      } else {
        // AI players use difficulty-based logic
        const aiDifficulty = player?.aiDifficulty || 'medium'

        if (aiDifficulty === 'easy') {
          burrowEnabled = false // Easy AI never uses BURROW
        } else if (aiDifficulty === 'medium') {
          burrowEnabled = Math.random() < 0.5 // Medium AI uses 50% of the time
        } else {
          burrowEnabled = true // Hard AI always uses BURROW
        }
      }
    }

    // PHASING: Check if creature has ability AND apply AI difficulty logic
    // PHASING works like FLYING (ignores terrain) but can also move through other creatures
    // Human players ALWAYS have PHASING enabled
    // AI difficulty affects whether PHASING is enabled:
    // - Easy: PHASING disabled (AI doesn't benefit from passive)
    // - Medium: 50% chance PHASING is enabled
    // - Hard: PHASING always enabled
    const hasPhasingAbility = this.hasPhasing(creatureInstance)
    let phasingEnabled = false

    if (hasPhasingAbility) {
      const owner = creatureInstance.owner
      const player = this.players[owner]

      // Human players always get PHASING enabled
      if (player?.isHuman) {
        phasingEnabled = true
      } else {
        // AI players use difficulty-based logic
        const aiDifficulty = player?.aiDifficulty || 'medium'

        if (aiDifficulty === 'easy') {
          phasingEnabled = false // Easy AI never uses PHASING
        } else if (aiDifficulty === 'medium') {
          phasingEnabled = Math.random() < 0.5 // Medium AI uses 50% of the time
        } else {
          phasingEnabled = true // Hard AI always uses PHASING
        }
      }
    }

    // SCUTTLE: Create callback if creature has the ability
    // Allows moving through any creature (enemy or ally) for 1 speed cost
    // Human players ALWAYS have SCUTTLE enabled
    // AI difficulty affects whether SCUTTLE is enabled:
    // - Easy: SCUTTLE disabled (AI doesn't benefit from passive)
    // - Medium: 50% chance SCUTTLE is enabled
    // - Hard: SCUTTLE always enabled
    const hasScuttleAbility = this.hasScuttle(creatureInstance)
    let canPassThrough = null

    // PHASING also allows passing through creatures (like SCUTTLE)
    if (phasingEnabled) {
      canPassThrough = () => {
        // PHASING can pass through ANY creature (enemy or ally)
        return true
      }
    } else if (hasScuttleAbility) {
      const owner = creatureInstance.owner
      const player = this.players[owner]

      let scuttleEnabled = true

      // Human players always get SCUTTLE enabled
      // AI players (!isHuman) use difficulty-based logic
      if (!player?.isHuman) {
        // AI players use difficulty-based logic
        const aiDifficulty = player?.aiDifficulty || 'medium'

        if (aiDifficulty === 'easy') {
          scuttleEnabled = false // Easy AI never uses SCUTTLE
        } else if (aiDifficulty === 'medium') {
          scuttleEnabled = Math.random() < 0.5 // Medium AI uses 50% of the time
        }
        // Hard AI always uses SCUTTLE (scuttleEnabled stays true)
      }

      if (scuttleEnabled) {
        canPassThrough = () => {
          // SCUTTLE can pass through ANY creature (enemy or ally)
          return true
        }
      }
    }

    // FLYING/BURROW/PHASING: Create callback to check if creature can STOP on a tile
    // Flying, burrowing, and phasing creatures can pass through mountains but cannot stop on them
    // PHASING creatures also cannot stop on occupied tiles (they can pass through but not stop)
    let canStopOn = null
    if (flying || burrowEnabled || phasingEnabled) {
      canStopOn = (tile) => {
        // Cannot stop on mountain tiles
        if (tile.terrain === 'MOUNTAIN' || tile.terrain === TerrainTypes.MOUNTAIN) {
          return false
        }
        // PHASING: Cannot stop on occupied tiles (can pass through but not stop)
        if (phasingEnabled && tile.occupant) {
          return false
        }
        return true
      }
    }

    // Use pathfinding algorithm with creature context for ability checks
    // Pass phasing flag for terrain cost/passability (phasing treats terrain like flying)
    const validMovement = pathfindingGetValidMovement(
      startPos,
      speed,
      (terrain, isFlying) =>
        this.getTerrainMovementCost(
          terrain,
          isFlying || phasingEnabled,
          creatureInstance,
          burrowEnabled,
          phasingEnabled
        ),
      (tile, isFlying) =>
        this.isTerrainPassable(tile, isFlying || phasingEnabled, burrowEnabled, phasingEnabled),
      (x, y) => this.getTile(x, y),
      flying || phasingEnabled, // Phasing creatures behave like flying for terrain purposes
      canPassThrough,
      canStopOn
    )

    // Return array of objects with tile, path, and cost
    return validMovement
  }

  // Move a creature to a new position
  moveCreature(creatureInstance, targetTile) {
    if (!creatureInstance.position) return false

    // Cannot move if tapped
    if (creatureInstance.isTapped) {
      return false
    }

    // Cannot move if already moved this turn (unless using VERSATILE ability)
    if (creatureInstance.hasMovedThisTurn && !creatureInstance.usingVersatileMove) {
      return false
    }

    const validTiles = this.getValidMovementTiles(creatureInstance)
    // Fix - validTiles contains {tile, path, cost} objects
    const isValid = validTiles.some((t) => t.tile.x === targetTile.x && t.tile.y === targetTile.y)

    if (!isValid) return false

    // Store old position for Magic Circle Aura detection
    const oldPosition = { x: creatureInstance.position.x, y: creatureInstance.position.y }

    // Clear old position
    const oldTile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
    if (oldTile) {
      oldTile.occupant = null
    }

    // Set new position
    creatureInstance.position = { x: targetTile.x, y: targetTile.y }
    targetTile.occupant = creatureInstance

    // Log the movement
    logger.movement(creatureInstance.creature.name, {
      owner: creatureInstance.owner,
      from: oldPosition,
      to: { x: targetTile.x, y: targetTile.y },
      versatileMove: creatureInstance.usingVersatileMove || false,
    })

    // Reveal treasure if creature moves onto it - O(1)
    if (targetTile.treasure && !targetTile.treasure.isRevealed) {
      targetTile.treasure.reveal()
      logger.gameEvent('Treasure revealed', {
        position: { x: targetTile.x, y: targetTile.y },
        morale: targetTile.treasure.moraleValue,
      })
    }

    // Mark as moved
    creatureInstance.hasMovedThisTurn = true

    // Tap the creature if it has both moved AND attacked
    if (creatureInstance.hasAttackedThisTurn) {
      creatureInstance.tap()
      logger.tap(creatureInstance.creature.name, 'tapped', { reason: 'moved after attacking' })
    }

    // MAGIC CIRCLE AURA: Check for state changes (Sorcerer entering/leaving Magic Circle)
    // Store result for UI to pick up and show modal notification
    const enteredMagicCircle = this.checkSorcererEnteredMagicCircle(creatureInstance, oldPosition)
    const leftMagicCircle = this.checkSorcererLeftMagicCircle(creatureInstance, oldPosition)

    if (enteredMagicCircle || leftMagicCircle) {
      this.lastMagicCircleAuraChange = {
        entered: enteredMagicCircle,
        left: leftMagicCircle,
        sorcerer: creatureInstance,
        owner: creatureInstance.owner,
        timestamp: Date.now(),
      }
      logger.ability('MAGIC CIRCLE AURA', {
        sorcerer: creatureInstance.creature.name,
        entered: enteredMagicCircle,
        left: leftMagicCircle,
      })
    }

    return true
  }

  /**
   * Get valid shift destination tiles for a creature (used by Cloud of Bats)
   * Shift ignores normal movement restrictions but respects terrain rules
   * @param {CreatureInstance} creature - The creature shifting
   * @param {number} maxDistance - Maximum shift distance in squares
   * @returns {Array} Array of valid tile positions {x, y}
   */
  getValidShiftTiles(creature, maxDistance) {
    if (!creature || !creature.position) return []

    const validTiles = []
    const startX = creature.position.x
    const startY = creature.position.y

    // Check all tiles within shift range
    for (
      let x = Math.max(0, startX - maxDistance);
      x <= Math.min(this.boardWidth - 1, startX + maxDistance);
      x++
    ) {
      for (
        let y = Math.max(0, startY - maxDistance);
        y <= Math.min(this.boardHeight - 1, startY + maxDistance);
        y++
      ) {
        // Skip current position
        if (x === startX && y === startY) continue

        // Calculate distance (Chebyshev distance for 8-directional movement)
        const distance = Math.max(Math.abs(x - startX), Math.abs(y - startY))
        if (distance > maxDistance) continue

        const tile = this.getTile(x, y)
        if (!tile) continue

        // Check if creature can enter this tile (terrain rules)
        // Mountains block all except flying/phasing
        if (
          tile.terrain === 'MOUNTAIN' &&
          !this.hasFlying(creature) &&
          !this.hasPhasing(creature)
        ) {
          continue
        }

        // Water is dangerous but not impassable (creature will take damage later)
        // No special blocking for water

        // Cannot shift onto occupied tiles
        if (tile.occupant) continue

        validTiles.push({ x, y })
      }
    }

    return validTiles
  }

  // ============================================================================
  // COMBAT DELEGATION METHODS
  // These methods delegate to the CombatResolver for backward compatibility
  // ============================================================================

  /**
   * Get all valid attack targets for a creature - delegates to CombatResolver
   * @param {CreatureInstance} creatureInstance - The attacking creature
   * @param {Object} trackStats - Optional stats tracking object
   * @returns {Array} Array of valid targets
   */
  getValidAttackTargets(creatureInstance, trackStats = null) {
    return this.combatResolver.getValidAttackTargets(creatureInstance, trackStats)
  }

  /**
   * Check if there's a clear line of sight - delegates to CombatResolver
   * @param {CreatureInstance} attacker - The attacking creature
   * @param {CreatureInstance} target - The target creature
   * @param {string} attackerOwner - Owner ID of the attacker
   * @returns {boolean} True if line of sight is clear
   */
  hasLineOfSight(attacker, target, attackerOwner) {
    return this.combatResolver.hasLineOfSight(attacker, target, attackerOwner)
  }

  /**
   * Get all tiles within ranged attack range - delegates to CombatResolver
   * @param {CreatureInstance} creatureInstance - The creature to check range for
   * @returns {Array} Array of {x, y, hasLOS, blockReason} for tiles in range
   */
  getRangedAttackRangeTiles(creatureInstance) {
    return this.combatResolver.getRangedAttackRangeTiles(creatureInstance)
  }

  /**
   * Get combined LOS tiles for ALL ranged creatures belonging to a player
   * Used for "Show All Ranged LOS" feature
   *
   * Big O Complexity: O(C * (2R+1)^2) where C = number of ranged creatures, R = max range
   *
   * @returns {Array} Array of {x, y, hasLOS, creatureCount, creatures, owners} for tiles in any ranged creature's range
   */
  getAllRangedLOSTiles() {
    // Map to track tiles: key = "x,y", value = {x, y, hasLOS, creatureCount, creatures, owners}
    const tileMap = new Map()

    // Get ALL creatures from ALL players
    const allCreatures = []
    for (const playerId of this.activePlayers) {
      const player = this.players[playerId]
      if (player?.creaturesInPlay) {
        allCreatures.push(...player.creaturesInPlay)
      }
    }

    // Safety check - return empty if no creatures in play
    if (allCreatures.length === 0) {
      return []
    }

    // Get ALL creatures on board (from all players) that have ranged attacks
    const allRangedCreatures = allCreatures.filter((c) => c.creature.rangedAttack)

    // For each ranged creature, get its LOS tiles
    for (const creature of allRangedCreatures) {
      const rangeTiles = this.getRangedAttackRangeTiles(creature)

      for (const tile of rangeTiles) {
        // Only include tiles with LOS
        if (!tile.hasLOS) continue

        const key = `${tile.x},${tile.y}`

        if (tileMap.has(key)) {
          // Tile already tracked, increment count
          const existing = tileMap.get(key)
          existing.creatureCount++
          existing.creatures.push(creature.creature.name)
          if (!existing.owners.includes(creature.owner)) {
            existing.owners.push(creature.owner)
          }
        } else {
          // New tile
          tileMap.set(key, {
            x: tile.x,
            y: tile.y,
            hasLOS: true,
            creatureCount: 1,
            creatures: [creature.creature.name],
            owners: [creature.owner],
          })
        }
      }
    }

    return Array.from(tileMap.values())
  }

  /**
   * Validate an attack before execution - delegates to CombatResolver
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @returns {Object} { valid: boolean, error?: string, damage?: number }
   */
  validateAttack(attackerInstance, defenderInstance, attackType: AttackType = 'melee') {
    return this.combatResolver.validateAttack(attackerInstance, defenderInstance, attackType)
  }

  /**
   * Execute an attack from one creature to another - delegates to CombatResolver
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {number} damageBoostBonus - Bonus damage from STANDARD order cards (default 0)
   * @param {number|null} damageBoostFlat - Flat damage that replaces base (default null)
   * @param {string} aiDifficulty - AI difficulty for DEATH STRIKE decision ('easy'|'medium'|'hard')
   * @returns {Object} Attack result
   */
  executeAttack(
    attackerInstance,
    defenderInstance,
    attackType: AttackType = 'melee',
    damageBoostBonus = 0,
    damageBoostFlat = null,
    aiDifficulty = 'medium'
  ) {
    return this.combatResolver.executeAttack(
      attackerInstance,
      defenderInstance,
      attackType,
      aiDifficulty,
      0,
      null,
      false,
      damageBoostBonus,
      damageBoostFlat
    )
  }

  /**
   * Execute attack with defense options - delegates to CombatResolver
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {number} damageReduction - Amount to reduce damage by
   * @param {string} defenseType - 'cower' | 'unstoppable_hordes' | null
   * @param {number} damageBoostBonus - Bonus damage from STANDARD order cards (default 0)
   * @param {number|null} damageBoostFlat - Flat damage that replaces base (default null)
   * @param {string} aiDifficulty - AI difficulty for DEATH STRIKE decision ('easy'|'medium'|'hard')
   * @returns {Object} Attack result
   */
  executeAttackWithDefense(
    attackerInstance,
    defenderInstance,
    attackType: AttackType = 'melee',
    damageReduction = 0,
    defenseType = null,
    damageBoostBonus = 0,
    damageBoostFlat = null,
    aiDifficulty = 'medium'
  ) {
    return this.combatResolver.executeAttackWithDefense(
      attackerInstance,
      defenderInstance,
      attackType,
      damageReduction,
      defenseType,
      aiDifficulty,
      false,
      damageBoostBonus,
      damageBoostFlat
    )
  }

  /**
   * Legacy method - kept for backwards compatibility
   * @deprecated Use executeAttackWithDefense instead
   */
  executeAttackWithCower(
    attackerInstance,
    defenderInstance,
    attackType: AttackType = 'melee',
    damageReduction = 0
  ) {
    return this.executeAttackWithDefense(
      attackerInstance,
      defenderInstance,
      attackType,
      damageReduction,
      'unstoppable_hordes'
    )
  }

  /**
   * Collect morale from a treasure token
   * - Creature must be standing on treasure tile
   * - Uses creature's ACTION (not movement)
   * - Collects 1 morale per action
   * - Creature is tapped only if it has both moved AND collected (same as attacking)
   * - Treasure removed immediately when depleted
   * - Reveals treasure value if not already revealed
   *
   * Big O Complexity: O(1) - Constant time operation
   *
   * @param {CreatureInstance} creatureInstance - The creature collecting morale
   * @returns {Object} { success, message, moraleCollected, treasureDepleted, treasureValue }
   */
  collectMorale(creatureInstance: CreatureInstance):
    | { success: true; message: string; moraleCollected: number; treasureDepleted: boolean; treasureValue: string }
    | { success: false; message: string } {
    // Safety check: ensure creature has a valid position
    if (!creatureInstance?.position) {
      return { success: false, message: 'Cannot collect morale: invalid creature position' }
    }

    // Validate creature is not tapped
    if (creatureInstance.isTapped) {
      return { success: false, message: 'Cannot collect morale: creature is tapped' }
    }

    // Cannot collect if already attacked/acted this turn
    if (creatureInstance.hasAttackedThisTurn) {
      return {
        success: false,
        message: 'Cannot collect morale: creature has already acted this turn',
      }
    }

    // Get tile creature is standing on
    const tile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
    if (!tile || !tile.treasure) {
      return { success: false, message: 'No treasure at this location' }
    }

    const treasure = tile.treasure

    // Reveal treasure if not already revealed - O(1)
    if (!treasure.isRevealed) {
      treasure.reveal()
    }

    // Collect 1 morale - O(1)
    const isDepleted = treasure.collectMorale()
    const player = this.players[creatureInstance.owner]

    // Add morale to player - O(1)
    player.morale += 1

    // Mark as acted (uses action, just like attacking) - O(1)
    creatureInstance.hasAttackedThisTurn = true

    // Tap the creature only if it has both moved AND collected - O(1)
    if (creatureInstance.hasMovedThisTurn) {
      creatureInstance.tap()
    }

    const result = {
      success: true,
      message: `Collected 1 morale from treasure`,
      moraleCollected: 1,
      treasureDepleted: isDepleted,
      treasureValue: treasure.getDisplayString(),
    }

    // Remove treasure immediately if depleted - O(n) where n=treasures (max 6)
    if (isDepleted) {
      // Remove from treasures array
      const treasureIndex = this.treasures.indexOf(treasure)
      if (treasureIndex !== -1) {
        this.treasures.splice(treasureIndex, 1)
      }

      // Remove from tile
      tile.treasure = null

      result.message = `Collected final morale from treasure (depleted)`
    }

    return result
  }

  getOpponentPlayerState() {
    return this.players[this.currentPlayer === Players.PLAYER1 ? Players.PLAYER2 : Players.PLAYER1]
  }

  // ============================================================================
  // PHASE MANAGER DELEGATION METHODS
  // These methods delegate to PhaseManager for backward compatibility
  // ============================================================================

  /**
   * Apply water damage to creatures standing on water - delegates to PhaseManager
   */
  applyWaterDamage() {
    return this.phaseManager.applyWaterDamage()
  }

  /**
   * Advance to the next phase - delegates to PhaseManager
   */
  advancePhase() {
    return this.phaseManager.advancePhase()
  }

  /**
   * End the current player's turn - delegates to PhaseManager
   */
  endTurn() {
    return this.phaseManager.endTurn()
  }

  /**
   * Resolve attack damage - delegates to CombatResolver
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {number} damageAmount - Damage to apply
   * @returns {Object} Resolution result
   */
  resolveAttack(attackerInstance, defenderInstance, damageAmount) {
    return this.combatResolver.resolveAttack(attackerInstance, defenderInstance, damageAmount)
  }

  /**
   * Eliminate a player from the game - delegates to PhaseManager
   */
  eliminatePlayer(playerId) {
    return this.phaseManager.eliminatePlayer(playerId)
  }

  /**
   * Check for game over conditions - delegates to PhaseManager
   */
  checkGameOver() {
    return this.phaseManager.checkGameOver()
  }

  /**
   * Check if a specific player should be eliminated - delegates to PhaseManager
   */
  checkAndEliminatePlayer(playerId) {
    return this.phaseManager.checkAndEliminatePlayer(playerId)
  }

  /**
   * Execute refresh phase - delegates to PhaseManager
   */
  executeRefreshPhase() {
    return this.phaseManager.executeRefreshPhase()
  }

  /**
   * Execute cleanup phase - delegates to PhaseManager
   */
  executeCleanupPhase() {
    return this.phaseManager.executeCleanupPhase()
  }

  /**
   * Execute deploy phase - delegates to PhaseManager
   */
  executeDeployPhase() {
    return this.phaseManager.executeDeployPhase()
  }
}

export default GameState
