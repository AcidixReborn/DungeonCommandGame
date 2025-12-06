// Game state management for Dungeon Command
import { getValidMovementTiles as pathfindingGetValidMovement } from '../utils/pathfinding.js'
// Import Board class for grid operations
import { Board, TerrainTypes } from './Board.js'
// Import CombatResolver for combat operations
import { CombatResolver } from './CombatResolver.js'
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
  MAGIC_CIRCLE
} from '../constants/gameConstants.js'

// Re-export GamePhases for backward compatibility
export { GamePhases }

// Player ID constants - supports up to 5 players
export const Players = {
  PLAYER1: 'PLAYER1',
  PLAYER2: 'PLAYER2',
  PLAYER3: 'PLAYER3',
  PLAYER4: 'PLAYER4',
  PLAYER5: 'PLAYER5'
}

// Re-export TerrainTypes for backward compatibility
export { TerrainTypes }

/**
 * PlayerState - Tracks all state for a single player
 * Manages resources, cards, creatures, and gameplay stats
 */
export class PlayerState {
  /**
   * @param {Object} commander - Commander data
   * @param {Array} creatures - Creature cards
   * @param {Array} orders - Order cards
   * @param {string} faction - Faction name
   * @param {boolean} isHuman - True if human player, false if AI
   * @param {string|null} aiDifficulty - AI difficulty ('easy', 'medium', 'hard') or null for humans
   */
  constructor(commander, creatures, orders, faction, isHuman = true, aiDifficulty = null) {
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

    // Commander ability state tracking
    this.commanderAbilityState = {
      usedThisTurn: [],      // Track once-per-turn abilities (array of ability IDs)
      cooldowns: {},         // Track cooldown-based abilities { abilityId: turnsRemaining }
      orcScoutUsed: false    // Special flag for ORC SCOUT (only usable during initial deployment)
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
    }
    return drawn
  }

  /**
   * Shuffle creature deck using Fisher-Yates algorithm
   */
  shuffleCreatureDeck() {
    for (let i = this.creatureDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.creatureDeck[i], this.creatureDeck[j]] = [this.creatureDeck[j], this.creatureDeck[i]]
    }
  }

  /**
   * Shuffle order deck using Fisher-Yates algorithm
   */
  shuffleOrderDeck() {
    for (let i = this.orderDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.orderDeck[i], this.orderDeck[j]] = [this.orderDeck[j], this.orderDeck[i]]
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
    return (currentUsage + creature.level) <= this.leadership
  }

  /**
   * Lose morale (e.g., when creatures are destroyed)
   * @param {number} amount - Amount of morale to lose
   * @returns {boolean} True if player is defeated (morale <= 0)
   */
  loseMorale(amount) {
    // Guard against NaN/undefined to prevent morale corruption
    const safeAmount = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0
    this.morale = Math.max(0, this.morale - safeAmount)
    return this.morale <= 0 // Returns true if defeated
  }

  /**
   * Gain morale (e.g., from treasure tokens)
   * @param {number} amount - Amount of morale to gain
   */
  gainMorale(amount) {
    // Guard against NaN/undefined to prevent morale corruption
    const safeAmount = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0
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
export class GameState {
  constructor(playerSetups) {
    // playerSetups is an array of { playerId, commander, creatures, orders, faction }
    this.players = {}
    this.activePlayers = []

    playerSetups.forEach(setup => {
      // Pass isHuman and aiDifficulty to PlayerState for AI behavior configuration
      this.players[setup.playerId] = new PlayerState(
        setup.commander,
        setup.creatures,
        setup.orders,
        setup.faction,
        setup.isHuman !== false, // Default to human if not specified
        setup.aiDifficulty || 'easy' // Default AI difficulty to 'easy'
      )
      this.activePlayers.push(setup.playerId)
    })

    this.currentPlayer = this.activePlayers[0]
    this.currentPhase = GamePhases.DEPLOY // Start in DEPLOY phase for initial setup
    this.turnNumber = 1
    this.gameOver = false
    this.winner = null

    // Board state - Dynamic sizing based on number of players
    // 2 players: 16×16, 3 players: 20×20, 4 players: 24×24, 5 players: 28×28
    const numPlayers = this.activePlayers.length
    const baseSize = 12 + (numPlayers * 4)

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
    // Shuffle both decks and draw starting hands for all active players
    this.activePlayers.forEach(playerId => {
      const player = this.players[playerId]

      // Shuffle both decks
      player.shuffleCreatureDeck()
      player.shuffleOrderDeck()

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
   * Check if creature has flying ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature can fly
   */
  hasFlying(creatureInstance) {
    if (!creatureInstance || !creatureInstance.creature) return false
    const abilities = creatureInstance.creature.specialAbilities || []
    return abilities.some(ability =>
      typeof ability === 'string' && ability.toLowerCase().includes('flying')
    )
  }

  // ============================================================================
  // FLASHING BLADES - Drow Blademaster Creature Ability
  // After melee attack deals damage, can deal 10 splash damage to adjacent enemy
  // ============================================================================

  /**
   * Check if creature has FLASHING BLADES ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has FLASHING BLADES
   */
  hasFlashingBlades(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      ability => typeof ability === 'string' && ability.toUpperCase().includes('FLASHING BLADES')
    )
  }

  /**
   * Get valid targets for FLASHING BLADES splash damage
   * Returns adjacent enemy creatures (excluding the original attack target)
   * @param {CreatureInstance} attackerInstance - The Drow Blademaster
   * @param {CreatureInstance} originalTarget - The creature that was just attacked
   * @returns {Array} Array of valid target CreatureInstances
   */
  getFlashingBladesTargets(attackerInstance, originalTarget) {
    if (!this.hasFlashingBlades(attackerInstance)) return []
    if (!attackerInstance.position) return []

    const targets = []
    // Use 8-directional adjacency - FLASHING BLADES can hit all surrounding tiles including diagonals
    const adjacent = this.getAdjacentTiles8Dir(attackerInstance.position.x, attackerInstance.position.y)

    for (const tile of adjacent) {
      const occupant = tile.occupant
      if (occupant &&
          occupant.owner !== attackerInstance.owner &&
          occupant.instanceId !== originalTarget?.instanceId &&
          occupant.currentHP > 0) {
        targets.push(occupant)
      }
    }

    return targets
  }

  /**
   * Apply FLASHING BLADES splash damage (10 damage)
   * Handles morale changes and creature destruction
   * @param {CreatureInstance} targetInstance - The creature receiving splash damage
   * @param {string} attackerOwner - Owner of the Blademaster (for morale)
   * @returns {Object} { success, damage, destroyed, moraleChange }
   */
  applyFlashingBlades(targetInstance, attackerOwner) {
    const SPLASH_DAMAGE = 10

    if (!targetInstance) {
      return { success: false, message: 'Invalid target' }
    }

    const defenderOwner = targetInstance.owner

    // Apply damage using takeDamage (same as resolveAttack)
    const wasDestroyed = targetInstance.takeDamage(SPLASH_DAMAGE)

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
      const index = defenderPlayer.creaturesInPlay.findIndex(c => c.instanceId === targetInstance.instanceId)
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(targetInstance.creature.level)

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level
      }
    }

    return {
      success: true,
      damage: SPLASH_DAMAGE,
      destroyed: wasDestroyed,
      moraleChange,
      remainingHP: Math.max(0, targetInstance.currentHP)
    }
  }

  /**
   * Apply FLASHING BLADES splash damage with defense reduction
   * @param {CreatureInstance} targetInstance - The creature receiving splash damage
   * @param {string} attackerOwner - Owner of the Blademaster (for morale)
   * @param {number} damageReduction - Amount of damage prevented by defense
   * @returns {Object} { success, damage, destroyed, moraleChange }
   */
  applyFlashingBladesWithDefense(targetInstance, attackerOwner, damageReduction = 0) {
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
        damageReduced: damageReduction
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
      const index = defenderPlayer.creaturesInPlay.findIndex(c => c.instanceId === targetInstance.instanceId)
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(targetInstance.creature.level)

      // Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: +1,
        defender: -targetInstance.creature.level
      }
    }

    return {
      success: true,
      damage: actualDamage,
      destroyed: wasDestroyed,
      moraleChange,
      remainingHP: Math.max(0, targetInstance.currentHP),
      damageReduced: damageReduction
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
   */
  applyImmediateCardDefense(card, usingCreature) {
    return this.abilityManager.applyImmediateCardDefense(card, usingCreature)
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
   * @returns {boolean} True if passable
   */
  isTerrainPassable(tile, flying = false) {
    return this.board.isTerrainPassable(tile, flying)
  }

  /**
   * Get movement cost for terrain type
   * Wraps Board.getTerrainMovementCost to handle creature abilities
   * @param {string} terrain - Terrain type
   * @param {boolean} flying - Whether creature is flying
   * @param {CreatureInstance} creatureInstance - Optional creature for ability checks
   * @returns {number} Movement cost (999 = impassable)
   */
  getTerrainMovementCost(terrain, flying = false, creatureInstance = null) {
    // Check for GRUUMSH COMMANDS IT ability (ignore difficult terrain)
    const ignoresDifficult = creatureInstance ? this.ignoresDifficultTerrain(creatureInstance) : false

    // Delegate to Board with the ability check result
    return this.board.getTerrainMovementCost(terrain, flying, ignoresDifficult)
  }

  // Get all valid movement tiles using A* pathfinding
  // overrideSpeed: optional parameter to limit movement (used by VERSATILE ability)
  getValidMovementTiles(creatureInstance, overrideSpeed = null) {
    if (!creatureInstance.position) return []

    // Base speed + commander speed bonuses (e.g., WALLS OF WEB)
    const baseSpeed = creatureInstance.creature.speed
    const speedBonus = this.getCommanderSpeedBonus(creatureInstance)
    const speed = overrideSpeed !== null ? overrideSpeed : (baseSpeed + speedBonus)

    const startPos = creatureInstance.position
    const flying = this.hasFlying(creatureInstance)

    // Use pathfinding algorithm with creature context for ability checks
    const validMovement = pathfindingGetValidMovement(
      startPos,
      speed,
      (terrain, isFlying) => this.getTerrainMovementCost(terrain, isFlying, creatureInstance),
      (tile, isFlying) => this.isTerrainPassable(tile, isFlying),
      (x, y) => this.getTile(x, y),
      flying
    )

    // Return array of objects with tile, path, and cost
    return validMovement
  }

  // Move a creature to a new position
  moveCreature(creatureInstance, targetTile) {
    if (!creatureInstance.position) return false

    // Cannot move if tapped
    if (creatureInstance.isTapped) {
      console.log('Cannot move: creature is tapped')
      return false
    }

    // Cannot move if already moved this turn (unless using VERSATILE ability)
    if (creatureInstance.hasMovedThisTurn && !creatureInstance.usingVersatileMove) {
      console.log('Cannot move: creature has already moved this turn')
      return false
    }

    const validTiles = this.getValidMovementTiles(creatureInstance)
    // Fix - validTiles contains {tile, path, cost} objects
    const isValid = validTiles.some(t => t.tile.x === targetTile.x && t.tile.y === targetTile.y)

    if (!isValid) return false

    // Clear old position
    const oldTile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
    if (oldTile) {
      oldTile.occupant = null
    }

    // Set new position
    creatureInstance.position = { x: targetTile.x, y: targetTile.y }
    targetTile.occupant = creatureInstance

    // Reveal treasure if creature moves onto it - O(1)
    if (targetTile.treasure && !targetTile.treasure.isRevealed) {
      targetTile.treasure.reveal()
      console.log(`Treasure revealed at (${targetTile.x}, ${targetTile.y}): ${targetTile.treasure.getDisplayString()}`)
    }

    // Mark as moved
    creatureInstance.hasMovedThisTurn = true

    // Tap the creature if it has both moved AND attacked
    if (creatureInstance.hasAttackedThisTurn) {
      creatureInstance.tap()
    }

    return true
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
   * Validate an attack before execution - delegates to CombatResolver
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @returns {Object} { valid: boolean, error?: string, damage?: number }
   */
  validateAttack(attackerInstance, defenderInstance, attackType = 'melee') {
    return this.combatResolver.validateAttack(attackerInstance, defenderInstance, attackType)
  }

  /**
   * Execute an attack from one creature to another - delegates to CombatResolver
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @returns {Object} Attack result
   */
  executeAttack(attackerInstance, defenderInstance, attackType = 'melee') {
    return this.combatResolver.executeAttack(attackerInstance, defenderInstance, attackType)
  }

  /**
   * Execute attack with defense options - delegates to CombatResolver
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {number} damageReduction - Amount to reduce damage by
   * @param {string} defenseType - 'cower' | 'unstoppable_hordes' | null
   * @returns {Object} Attack result
   */
  executeAttackWithDefense(attackerInstance, defenderInstance, attackType = 'melee', damageReduction = 0, defenseType = null) {
    return this.combatResolver.executeAttackWithDefense(attackerInstance, defenderInstance, attackType, damageReduction, defenseType)
  }

  /**
   * Legacy method - kept for backwards compatibility
   * @deprecated Use executeAttackWithDefense instead
   */
  executeAttackWithCower(attackerInstance, defenderInstance, attackType = 'melee', damageReduction = 0) {
    return this.executeAttackWithDefense(attackerInstance, defenderInstance, attackType, damageReduction, 'unstoppable_hordes')
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
  collectMorale(creatureInstance) {
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
      return { success: false, message: 'Cannot collect morale: creature has already acted this turn' }
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
      treasureValue: treasure.getDisplayString()
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
