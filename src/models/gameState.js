// Game state management for Dungeon Command
import { getValidMovementTiles as pathfindingGetValidMovement } from '../utils/pathfinding.js'
// Import Treasure system
import { Treasure, createTokenPool, drawTokens } from './treasure.js'
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

// Game phase constants - defines the turn sequence
export const GamePhases = {
  REFRESH: 'REFRESH',     // Draw cards, untap creatures
  ACTIVATE: 'ACTIVATE',   // Move creatures and attack
  DEPLOY: 'DEPLOY',       // Deploy creatures from hand
  CLEANUP: 'CLEANUP'      // End turn, draw cards
}

// Player ID constants - supports up to 5 players
export const Players = {
  PLAYER1: 'PLAYER1',
  PLAYER2: 'PLAYER2',
  PLAYER3: 'PLAYER3',
  PLAYER4: 'PLAYER4',
  PLAYER5: 'PLAYER5'
}

// Terrain type constants - affects movement and gameplay
export const TerrainTypes = {
  NORMAL: 'NORMAL',               // Standard terrain, 1 movement cost
  FOREST: 'FOREST',               // Difficult terrain, 2 movement cost
  MOUNTAIN: 'MOUNTAIN',           // Impassable terrain
  DIFFICULT: 'DIFFICULT',         // Difficult terrain, 2 movement cost
  WATER: 'WATER',                 // Passable but dangerous, 2 movement cost, 10 damage at end of ACTIVATE phase
  MAGIC_CIRCLE: 'MAGIC_CIRCLE',   // Special objective tile
  STARTING_ZONE: 'STARTING_ZONE'  // Player deployment area
}

/**
 * PlayerState - Tracks all state for a single player
 * Manages resources, cards, creatures, and gameplay stats
 */
export class PlayerState {
  constructor(commander, creatures, orders, faction) {
    this.commander = commander
    this.faction = faction
    this.morale = commander.startingMorale
    this.leadership = commander.startingLeadership

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
      this.players[setup.playerId] = new PlayerState(setup.commander, setup.creatures, setup.orders, setup.faction)
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
    this.boardWidth = baseSize
    this.boardHeight = baseSize
    this.tiles = [] // 2D array [y][x] for O(1) tile lookup

    // Treasure/Morale token system
    this.treasures = [] // Array of Treasure objects on the board
    this.treasurePlacementStats = { relaxedSpacing: 0 } // Track placement failures for testing

    // Generate random board
    this.generateBoard()

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

  /**
   * Generate board with 8×8 terrain regions
   * Creates a 16×16 board with clustered terrain, magic circles, starting zones, and treasures
   */
  generateBoard() {
    // Initialize empty board as 2D array [y][x] for O(1) access
    this.tiles = []
    for (let y = 0; y < this.boardHeight; y++) {
      this.tiles[y] = []
      for (let x = 0; x < this.boardWidth; x++) {
        this.tiles[y][x] = {
          x,
          y,
          terrain: TerrainTypes.NORMAL,
          occupant: null
        }
      }
    }

    // STEP 1: Add starting zones FIRST (before any terrain generation)
    // This prevents any terrain from being placed inside starting zones
    this.addStartingZones()

    // STEP 2: Generate terrain regions based on board size
    // Terrain generation will skip starting zone tiles
    // Divide board into 8×8 regions (or as close as possible)
    const regionSize = 8
    const regionsX = Math.ceil(this.boardWidth / regionSize)
    const regionsY = Math.ceil(this.boardHeight / regionSize)

    for (let ry = 0; ry < regionsY; ry++) {
      for (let rx = 0; rx < regionsX; rx++) {
        const startX = rx * regionSize
        const startY = ry * regionSize
        const width = Math.min(regionSize, this.boardWidth - startX)
        const height = Math.min(regionSize, this.boardHeight - startY)
        this.generateTerrainRegion(startX, startY, width, height)
      }
    }

    // STEP 3: Add magic circles (after starting zones and terrain)
    this.addMagicCircles()

    // STEP 4: Place treasure tokens (last, after all terrain is set)
    this.placeTreasures()
  }

  /**
   * Generate a terrain region with clustered terrain
   * Creates realistic-looking terrain groups (forests, mountains, etc.)
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} width - Region width
   * @param {number} height - Region height
   */
  generateTerrainRegion(startX, startY, width, height) {
    const regionTiles = []

    // Get all tiles in this region
    for (let y = startY; y < startY + height; y++) {
      for (let x = startX; x < startX + width; x++) {
        if (x < this.boardWidth && y < this.boardHeight) {
          regionTiles.push(this.getTile(x, y))
        }
      }
    }

    // Randomly decide terrain composition for this region
    // 8-15% forests, 8-15% mountains, 3-8% difficult terrain, 3-12% water
    const totalTiles = regionTiles.length
    const forestCount = Math.floor(totalTiles * (0.08 + Math.random() * 0.07))
    const mountainCount = Math.floor(totalTiles * (0.08 + Math.random() * 0.07))
    const difficultCount = Math.floor(totalTiles * (0.03 + Math.random() * 0.05))
    const waterCount = Math.floor(totalTiles * (0.03 + Math.random() * 0.09))

    // Add clustered forests (trees grow in groups)
    this.addClusteredTerrain(regionTiles, TerrainTypes.FOREST, forestCount, 3)

    // Add clustered mountains (mountain ranges)
    this.addClusteredTerrain(regionTiles, TerrainTypes.MOUNTAIN, mountainCount, 2)

    // Add scattered difficult terrain (mud, swamps)
    this.addClusteredTerrain(regionTiles, TerrainTypes.DIFFICULT, difficultCount, 2)

    // Add water clusters (ponds, small lakes) - 2-3 tile clusters
    this.addClusteredTerrain(regionTiles, TerrainTypes.WATER, waterCount, 2)
  }

  // Add terrain in clusters instead of random scatter
  addClusteredTerrain(regionTiles, terrainType, count, clusterSize) {
    // Filter out starting zones - only place terrain on NORMAL tiles
    const availableTiles = regionTiles.filter(t => t && t.terrain === TerrainTypes.NORMAL)
    let placed = 0

    while (placed < count && availableTiles.length > 0) {
      // Pick a random seed tile
      const seedIndex = Math.floor(Math.random() * availableTiles.length)
      const seedTile = availableTiles[seedIndex]

      if (!seedTile) break

      // Place terrain on seed tile
      seedTile.terrain = terrainType
      placed++
      availableTiles.splice(seedIndex, 1)

      // Try to expand cluster around seed tile
      const cluster = [seedTile]
      for (let i = 0; i < clusterSize - 1 && placed < count; i++) {
        // Pick a random tile from current cluster
        const baseTile = cluster[Math.floor(Math.random() * cluster.length)]

        // Get adjacent tiles
        const adjacentTiles = this.getAdjacentTiles(baseTile.x, baseTile.y)
          .filter(t => regionTiles.includes(t) && t.terrain === TerrainTypes.NORMAL)

        if (adjacentTiles.length > 0) {
          // Place terrain on random adjacent tile
          const adjTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)]
          adjTile.terrain = terrainType
          placed++
          cluster.push(adjTile)

          // Remove from available tiles
          const availIndex = availableTiles.indexOf(adjTile)
          if (availIndex !== -1) {
            availableTiles.splice(availIndex, 1)
          }
        } else {
          break // No more adjacent tiles, start new cluster
        }
      }
    }
  }

  // Helper to get adjacent tiles (4-directional)
  getAdjacentTiles(x, y) {
    const adjacent = []
    const directions = [
      { dx: 0, dy: -1 },  // North
      { dx: 1, dy: 0 },   // East
      { dx: 0, dy: 1 },   // South
      { dx: -1, dy: 0 }   // West
    ]

    directions.forEach(dir => {
      const newX = x + dir.dx
      const newY = y + dir.dy
      const tile = this.getTile(newX, newY)
      if (tile) {
        adjacent.push(tile)
      }
    })

    return adjacent
  }

  // Create starting zones for each player on the board edges
  addStartingZones() {
    const numPlayers = this.activePlayers.length

    // Define edge positions based on number of players
    // For 2 players: opposite corners
    // For 3+ players: distributed around edges
    const edgePositions = this.getEdgePositionsForPlayers(numPlayers)

    this.activePlayers.forEach((playerId, index) => {
      const edge = edgePositions[index]
      const zoneTiles = []

      // Determine zone dimensions based on edge orientation
      // Top/Bottom edges: 3 wide × 2 deep (horizontal)
      // Left/Right edges: 2 wide × 3 deep (vertical)
      // Corners: Use 3 wide × 2 deep (horizontal orientation)
      let zoneWidth, zoneHeight

      if (edge.edge === 'top' || edge.edge === 'bottom' || edge.edge.includes('top') || edge.edge.includes('bottom')) {
        // Horizontal orientation for top/bottom edges and corners
        zoneWidth = 3
        zoneHeight = 2
      } else {
        // Vertical orientation for left/right edges
        zoneWidth = 2
        zoneHeight = 3
      }

      // Create a zone at the edge position with determined dimensions
      for (let dy = 0; dy < zoneHeight; dy++) {
        for (let dx = 0; dx < zoneWidth; dx++) {
          const x = edge.startX + dx
          const y = edge.startY + dy

          // Make sure we're within bounds
          if (x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight) {
            const tile = this.getTile(x, y)
            if (tile) {
              // Clear any terrain except magic circles
              if (tile.terrain !== TerrainTypes.MAGIC_CIRCLE) {
                tile.terrain = TerrainTypes.STARTING_ZONE
                tile.startingZoneOwner = playerId
              }
              zoneTiles.push({ x, y })
            }
          }
        }
      }

      this.players[playerId].startingZoneTiles = zoneTiles
    })
  }

  /**
   * Get starting positions on board edges for each player
   * Positions must be at least 8 tiles apart (Manhattan distance)
   * Prefers positions on opposite sides of the board to maximize player distance
   * Starting zones are 3×2 (horizontal) or 2×3 (vertical) based on edge
   */
  getEdgePositionsForPlayers(numPlayers) {
    const positions = []
    const minDistance = 10 // Minimum gap between starting zone EDGES (not corners)

    // Generate all possible edge positions (keeping zones within bounds)
    const possiblePositions = []

    // Top edge - 3 wide × 2 deep (horizontal orientation)
    for (let x = 0; x <= this.boardWidth - 3; x++) {
      possiblePositions.push({ startX: x, startY: 0, edge: 'top' })
    }

    // Bottom edge - 3 wide × 2 deep (horizontal orientation)
    for (let x = 0; x <= this.boardWidth - 3; x++) {
      possiblePositions.push({ startX: x, startY: this.boardHeight - 2, edge: 'bottom' })
    }

    // Left edge - 2 wide × 3 deep (vertical orientation)
    // Excluding corners already counted in top/bottom
    for (let y = 2; y < this.boardHeight - 3; y++) {
      possiblePositions.push({ startX: 0, startY: y, edge: 'left' })
    }

    // Right edge - 2 wide × 3 deep (vertical orientation)
    // Excluding corners already counted in top/bottom
    for (let y = 2; y < this.boardHeight - 3; y++) {
      possiblePositions.push({ startX: this.boardWidth - 2, startY: y, edge: 'right' })
    }

    // Get zone dimensions based on edge type
    const getZoneDimensions = (edge) => {
      if (edge === 'top' || edge === 'bottom') {
        return { width: 3, height: 2 }
      } else {
        return { width: 2, height: 3 }
      }
    }

    // Calculate minimum gap between two zones (edge-to-edge distance)
    const getMinGapBetweenZones = (pos1, pos2) => {
      const dim1 = getZoneDimensions(pos1.edge)
      const dim2 = getZoneDimensions(pos2.edge)

      // Calculate bounding boxes
      const zone1 = {
        left: pos1.startX,
        right: pos1.startX + dim1.width - 1,
        top: pos1.startY,
        bottom: pos1.startY + dim1.height - 1
      }
      const zone2 = {
        left: pos2.startX,
        right: pos2.startX + dim2.width - 1,
        top: pos2.startY,
        bottom: pos2.startY + dim2.height - 1
      }

      // Calculate horizontal gap (0 if overlapping)
      let horizGap = 0
      if (zone2.left > zone1.right) {
        horizGap = zone2.left - zone1.right - 1
      } else if (zone1.left > zone2.right) {
        horizGap = zone1.left - zone2.right - 1
      }

      // Calculate vertical gap (0 if overlapping)
      let vertGap = 0
      if (zone2.top > zone1.bottom) {
        vertGap = zone2.top - zone1.bottom - 1
      } else if (zone1.top > zone2.bottom) {
        vertGap = zone1.top - zone2.bottom - 1
      }

      // Return combined gap (Manhattan-style for diagonal separation)
      return horizGap + vertGap
    }

    // Helper function to check if a position meets minimum distance from all existing positions
    const meetsMinDistance = (candidate, existingPositions) => {
      for (const existingPos of existingPositions) {
        if (getMinGapBetweenZones(candidate, existingPos) < minDistance) {
          return false
        }
      }
      return true
    }

    // Helper function to calculate total distance from a candidate to all existing positions
    const getTotalDistance = (candidate, existingPositions) => {
      let total = 0
      for (const existingPos of existingPositions) {
        total += getMinGapBetweenZones(candidate, existingPos)
      }
      return total
    }

    // Place first player randomly
    if (possiblePositions.length > 0) {
      const firstIndex = Math.floor(Math.random() * possiblePositions.length)
      positions.push(possiblePositions[firstIndex])
      console.log(`Player 1 starting zone: ${positions[0].edge} edge at (${positions[0].startX}, ${positions[0].startY})`)
    }

    // For subsequent players, prefer positions that maximize distance from existing positions
    while (positions.length < numPlayers) {
      // Get all valid candidates (meet minimum distance requirement)
      const validCandidates = possiblePositions.filter(candidate =>
        meetsMinDistance(candidate, positions)
      )

      if (validCandidates.length === 0) {
        console.warn(`Could not find valid position for player ${positions.length + 1} with ${minDistance} tile spacing.`)
        break
      }

      // Score each candidate by total distance from existing positions
      const scoredCandidates = validCandidates.map(candidate => ({
        position: candidate,
        totalDistance: getTotalDistance(candidate, positions)
      }))

      // Sort by total distance (highest first - we want maximum separation)
      scoredCandidates.sort((a, b) => b.totalDistance - a.totalDistance)

      // Take top 20% of candidates (or at least 3) and randomly pick from them
      // This adds some variety while still preferring opposite positions
      const topCount = Math.max(3, Math.ceil(scoredCandidates.length * 0.2))
      const topCandidates = scoredCandidates.slice(0, topCount)

      const selectedIndex = Math.floor(Math.random() * topCandidates.length)
      const selected = topCandidates[selectedIndex].position

      positions.push(selected)
      console.log(`Player ${positions.length} starting zone: ${selected.edge} edge at (${selected.startX}, ${selected.startY}) - distance score: ${topCandidates[selectedIndex].totalDistance}`)
    }

    // Fallback: if we couldn't find enough positions with proper spacing, use corners
    if (positions.length < numPlayers) {
      console.warn(`Could not find ${numPlayers} positions with ${minDistance} tile spacing. Using fallback positions.`)
      positions.length = 0 // Clear and use corners as fallback

      const fallbackPositions = [
        { startX: 0, startY: 0, edge: 'top-left' }, // 3×2 horizontal
        { startX: this.boardWidth - 3, startY: this.boardHeight - 2, edge: 'bottom-right' }, // 3×2 horizontal
        { startX: this.boardWidth - 3, startY: 0, edge: 'top-right' }, // 3×2 horizontal
        { startX: 0, startY: this.boardHeight - 2, edge: 'bottom-left' }, // 3×2 horizontal
        { startX: Math.floor(this.boardWidth / 2) - 1, startY: 0, edge: 'top-center' } // 3×2 horizontal
      ]

      for (let i = 0; i < numPlayers; i++) {
        positions.push(fallbackPositions[i])
      }
    }

    return positions
  }

  /**
   * Place treasure tokens on the board
   * Each faction draws 3 random tokens and places them on valid tiles
   *
   * Placement Rules:
   * - Cannot be on difficult terrain or starting zones
   * - At least 2 tiles away from starting zones (Manhattan distance)
   * - At least 3 tiles apart from each other (prefer, relax if needed)
   *
   * Big O Complexity:
   * - O(W*H + N*T) where W=boardWidth, H=boardHeight, N=numPlayers, T=tokensPerPlayer
   * - For 16×16 board and 2 players: O(256 + 2*3) = O(256) effectively constant
   */
  placeTreasures() {
    const tokensPerFaction = TREASURE.TOKENS_PER_PLAYER
    const minDistanceFromStart = TREASURE.MIN_DISTANCE_FROM_START
    const preferredTreasureSpacing = 3 // Manhattan distance between treasures
    let treasureIdCounter = 0

    // Get all valid tiles for treasure placement - O(W*H) = O(256)
    const validTiles = []
    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        const tile = this.tiles[y][x]

        // Skip difficult terrain, mountains, water, magic circles, and starting zones
        if (tile.terrain === TerrainTypes.DIFFICULT ||
            tile.terrain === TerrainTypes.MOUNTAIN ||
            tile.terrain === TerrainTypes.WATER ||
            tile.terrain === TerrainTypes.MAGIC_CIRCLE ||
            tile.terrain === TerrainTypes.STARTING_ZONE) {
          continue
        }

        // Check distance from all starting zones - O(N) where N=numPlayers
        let tooCloseToStart = false
        for (const playerId of this.activePlayers) {
          const startingZone = this.players[playerId].startingZoneTiles
          if (!startingZone) continue

          for (const zoneTile of startingZone) {
            const distance = Math.abs(x - zoneTile.x) + Math.abs(y - zoneTile.y)
            if (distance < minDistanceFromStart) {
              tooCloseToStart = true
              break
            }
          }
          if (tooCloseToStart) break
        }

        if (!tooCloseToStart) {
          validTiles.push(tile)
        }
      }
    }

    // For each faction, draw tokens and place them - O(N*T) where N=numPlayers, T=3
    this.activePlayers.forEach((playerId) => {
      // Draw 3 random tokens from the pool [1,1,2,2,3,3]
      const pool = createTokenPool()
      const drawnTokens = drawTokens(pool)

      // Place each token - O(T) where T=3
      drawnTokens.forEach((moraleValue) => {
        let placedSuccessfully = false
        let attempts = 0
        const maxAttempts = 100 // Prevent infinite loops

        while (!placedSuccessfully && attempts < maxAttempts) {
          attempts++

          // Pick a random valid tile - O(1)
          if (validTiles.length === 0) {
            console.warn(`No valid tiles available for treasure placement`)
            break
          }

          const randomIndex = Math.floor(Math.random() * validTiles.length)
          const candidateTile = validTiles[randomIndex]

          // Check spacing from existing treasures - O(T*N) where T=treasuresPlaced, N=numPlayers
          // At most 6 treasures total, so effectively O(1)
          let tooCloseToOtherTreasure = false
          for (const existingTreasure of this.treasures) {
            const distance = Math.abs(candidateTile.x - existingTreasure.position.x) +
                           Math.abs(candidateTile.y - existingTreasure.position.y)

            if (distance < preferredTreasureSpacing) {
              tooCloseToOtherTreasure = true
              break
            }
          }

          if (!tooCloseToOtherTreasure) {
            // Place treasure here - O(1)
            const treasure = new Treasure({
              id: `treasure-${treasureIdCounter++}`,
              owner: playerId,
              moraleValue,
              position: { x: candidateTile.x, y: candidateTile.y }
            })

            this.treasures.push(treasure)
            candidateTile.treasure = treasure // Add reference to tile
            placedSuccessfully = true
          } else if (attempts >= maxAttempts - 1) {
            // Relax spacing constraint if we can't find a spot
            const treasure = new Treasure({
              id: `treasure-${treasureIdCounter++}`,
              owner: playerId,
              moraleValue,
              position: { x: candidateTile.x, y: candidateTile.y }
            })

            this.treasures.push(treasure)
            candidateTile.treasure = treasure
            placedSuccessfully = true
            this.treasurePlacementStats.relaxedSpacing++
            console.log(`Relaxed treasure spacing constraint (attempt ${attempts})`)
          }
        }

        if (!placedSuccessfully) {
          console.warn(`Failed to place treasure with value ${moraleValue} for ${playerId}`)
        }
      })
    })

    console.log(`Placed ${this.treasures.length} treasures on board`)
    if (this.treasurePlacementStats.relaxedSpacing > 0) {
      console.log(`Relaxed spacing constraint ${this.treasurePlacementStats.relaxedSpacing} times`)
    }
  }

  addRandomTerrain(terrainType, count) {
    const normalTiles = this.getAllTiles().filter(t => t.terrain === TerrainTypes.NORMAL)
    for (let i = 0; i < count && normalTiles.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * normalTiles.length)
      const tile = normalTiles[randomIndex]
      tile.terrain = terrainType
      normalTiles.splice(randomIndex, 1)
    }
  }

  /**
   * Add magic circles as 3-4 tile clusters
   * Only 40% of players receive a magic circle cluster
   * Magic circles cannot spawn in starting zones
   */
  addMagicCircles() {
    // Get all normal tiles that are NOT in starting zones
    const availableTiles = this.getAllTiles().filter(t =>
      t.terrain === TerrainTypes.NORMAL
    )

    // Randomly select percentage of players to receive magic circles
    const numCircles = Math.max(MAGIC_CIRCLE.MIN_CIRCLES, Math.round(this.activePlayers.length * MAGIC_CIRCLE.PLAYER_PERCENTAGE))
    const shuffledPlayers = [...this.activePlayers].sort(() => Math.random() - 0.5)
    const selectedPlayers = shuffledPlayers.slice(0, numCircles)

    console.log(`Placing magic circles for ${numCircles} out of ${this.activePlayers.length} players: ${selectedPlayers.join(', ')}`)

    selectedPlayers.forEach(playerId => {
      if (availableTiles.length === 0) return

      // Random cluster size: 3-4 tiles
      const clusterSize = 3 + Math.floor(Math.random() * 2) // 3 or 4
      let placed = 0

      // Pick a random seed tile for this player's magic circle cluster
      const seedIndex = Math.floor(Math.random() * availableTiles.length)
      const seedTile = availableTiles[seedIndex]

      if (!seedTile) return

      // Place first magic circle on seed tile
      seedTile.terrain = TerrainTypes.MAGIC_CIRCLE
      seedTile.owner = playerId
      this.players[playerId].magicCirclePosition = { x: seedTile.x, y: seedTile.y }
      placed++
      availableTiles.splice(seedIndex, 1)

      // Try to expand cluster around seed tile
      const cluster = [seedTile]
      for (let i = 0; i < clusterSize - 1 && placed < clusterSize; i++) {
        // Pick a random tile from current cluster
        const baseTile = cluster[Math.floor(Math.random() * cluster.length)]

        // Get adjacent normal tiles that are NOT in starting zones
        const adjacentTiles = this.getAdjacentTiles(baseTile.x, baseTile.y)
          .filter(t =>
            availableTiles.includes(t) &&
            t.terrain === TerrainTypes.NORMAL
          )

        if (adjacentTiles.length > 0) {
          // Place magic circle on random adjacent tile
          const adjTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)]
          adjTile.terrain = TerrainTypes.MAGIC_CIRCLE
          adjTile.owner = playerId
          placed++
          cluster.push(adjTile)

          // Remove from available tiles
          const availIndex = availableTiles.indexOf(adjTile)
          if (availIndex !== -1) {
            availableTiles.splice(availIndex, 1)
          }
        } else {
          // No adjacent tiles available, stop expanding this cluster
          break
        }
      }

      console.log(`Placed ${placed}-tile magic circle cluster for ${playerId}`)
    })
  }

  // PERFORMANCE: O(1) lookup using 2D array instead of O(n) find
  getTile(x, y) {
    // Bounds check
    if (x < 0 || x >= this.boardWidth || y < 0 || y >= this.boardHeight) {
      return null
    }
    return this.tiles[y][x]
  }

  // PERFORMANCE: Helper to iterate all tiles (needed for compatibility with 2D array)
  getAllTiles() {
    const allTiles = []
    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        allTiles.push(this.tiles[y][x])
      }
    }
    return allTiles
  }

  /**
   * Get current player's state
   * @returns {PlayerState} Current player state
   */
  getCurrentPlayerState() {
    return this.players[this.currentPlayer]
  }

  /**
   * Calculate distance between two positions using Chebyshev distance
   * Chebyshev distance = max(|dx|, |dy|) - correct for 8-directional movement
   * @param {Object} pos1 - First position {x, y}
   * @param {Object} pos2 - Second position {x, y}
   * @returns {number} Distance
   */
  getDistance(pos1, pos2) {
    return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y))
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

  // ==========================================
  // COMMANDER ABILITY HELPER METHODS
  // ==========================================

  /**
   * Check if a player's commander has a specific ability
   *
   * Big O Complexity: O(a) where a = number of commander abilities (typically 1-2, effectively O(1))
   *
   * @param {string} playerId - The player ID
   * @param {string} abilityId - The ability ID to check for
   * @returns {boolean} True if commander has this ability
   */
  hasCommanderAbility(playerId, abilityId) {
    const player = this.players[playerId] // O(1) - hash lookup
    if (!player || !player.commander) return false
    return player.commander.hasAbility(abilityId) // O(a) - searches abilities array
  }

  /**
   * Get a commander ability by ID for a player
   *
   * Big O Complexity: O(a) where a = number of commander abilities (typically 1-2, effectively O(1))
   *
   * @param {string} playerId - The player ID
   * @param {string} abilityId - The ability ID to get
   * @returns {Object|null} The ability object or null
   */
  getCommanderAbility(playerId, abilityId) {
    const player = this.players[playerId] // O(1) - hash lookup
    if (!player || !player.commander) return null
    return player.commander.getAbility(abilityId) // O(a) - searches abilities array
  }

  /**
   * Check if a creature's owner has the "ignore difficult terrain" ability
   * (GRUUMSH COMMANDS IT ability)
   *
   * Big O Complexity: O(a) where a = number of commander abilities (typically 1-2, effectively O(1))
   *
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {boolean} True if creature ignores difficult terrain
   */
  ignoresDifficultTerrain(creatureInstance) {
    if (!creatureInstance || !creatureInstance.owner) return false
    // Must belong to Blood of Gruumsh faction
    if (creatureInstance.creature.faction !== 'Blood of Gruumsh') return false
    return this.hasCommanderAbility(creatureInstance.owner, 'gruumsh_commands_it') // O(a)
  }

  /**
   * Get commander speed bonus for a creature based on creature types
   * (WALLS OF WEB ability: +2 speed to Spider and Drow)
   *
   * Big O Complexity: O(a + t) where a = commander abilities (1-2), t = creature types (1-3)
   * Both are small constants, effectively O(1)
   *
   * @param {CreatureInstance} creatureInstance - The creature to check
   * @returns {number} Speed bonus from commander abilities
   */
  getCommanderSpeedBonus(creatureInstance) {
    if (!creatureInstance || !creatureInstance.owner) return 0

    let bonus = 0
    const player = this.players[creatureInstance.owner]
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
   * Check if a player can deploy during Refresh phase
   * (HORDE ability from Tyranny of Goblins)
   *
   * Big O Complexity: O(a) where a = commander abilities (1-2), effectively O(1)
   *
   * @param {string} playerId - The player ID
   * @returns {boolean} True if can deploy in Refresh phase
   */
  canDeployInRefreshPhase(playerId) {
    if (!this.hasCommanderAbility(playerId, 'horde')) return false
    // Must be Tyranny of Goblins faction
    const player = this.players[playerId]
    if (!player || !player.commander || player.commander.faction !== 'Tyranny of Goblins') return false
    return true
  }

  /**
   * Check if a creature can use VERSATILE ability (extra move action)
   * Requires: Adventurer type, has moved this turn, hasn't attacked yet
   *
   * Big O Complexity: O(a + t) where a = commander abilities (1-2), t = creature types (1-3)
   * Both are small constants, effectively O(1)
   *
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
   * Check if SELLSWORD ability should trigger (Drow on treasure)
   *
   * Big O Complexity: O(a + t) where a = commander abilities (1-2), t = creature types (1-3)
   * getTile is O(1). Both a and t are small constants, effectively O(1)
   *
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
    const tile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
    if (!tile || !tile.treasure) return false

    return true
  }

  /**
   * Check if creature can use COWER ability (Universal mechanic - ALL creatures)
   * COWER: Avoid ALL damage from an attack, pay morale = damage/10, creature becomes tapped
   * BLACK HAND OF BANE: If attacker has this ability, defender loses 1 EXTRA morale when cowering
   *
   * Big O Complexity: O(a) where a = commander abilities (1-2), effectively O(1)
   *
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

    // Calculate morale cost: damage/COWER_DAMAGE_PREVENTION, rounded up (guard against undefined/NaN)
    const safeDamage = (typeof incomingDamage === 'number' && !isNaN(incomingDamage)) ? incomingDamage : 0
    const baseMoraleCost = Math.ceil(safeDamage / COMBAT.COWER_DAMAGE_PREVENTION)

    // Check for BLACK HAND OF BANE extra cost (only applies to COWER, not UNSTOPPABLE HORDES)
    const extraCost = attackerOwner ? this.getBlackHandOfBaneExtraCost(attackerOwner) : 0
    const totalCost = baseMoraleCost + extraCost

    // Player must have enough morale to pay
    const player = this.players[creatureInstance.owner]
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
   *
   * Big O Complexity: O(a) where a = commander abilities (1-2), effectively O(1)
   *
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
    const player = this.players[creatureInstance.owner]
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

  /**
   * Check if creature can use UNSTOPPABLE HORDES ability (Morgana's Commander Ability)
   * UNSTOPPABLE HORDES: Untapped Undead creatures can prevent 20 damage each
   * Multiple Undead can stack their damage prevention
   * NOT affected by BLACK HAND OF BANE (this is not cowering)
   *
   * Big O Complexity: O(a + t) where a = commander abilities (1-2), t = creature types (1-3)
   * Effectively O(1)
   *
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
    const player = this.players[creatureInstance.owner]
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
   * NOTE: BLACK HAND OF BANE does NOT apply to this ability (it's not cowering)
   *
   * Big O Complexity: O(a + t) where a = commander abilities (1-2), t = creature types (1-3)
   * Effectively O(1)
   *
   * @param {CreatureInstance} creatureInstance - The Undead creature using the ability
   * @returns {Object} { success: boolean, damagePrevented: number, moraleCost: number }
   */
  applyUnstoppableHordes(creatureInstance) {
    const abilityInfo = this.canUseUnstoppableHordes(creatureInstance)
    if (!abilityInfo.canUse) {
      return { success: false, damagePrevented: 0, moraleCost: 0 }
    }

    // Pay morale cost
    const player = this.players[creatureInstance.owner]
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
   * These creatures can help defend an attacked creature
   *
   * Big O Complexity: O(8 * (a + t)) where 8 = adjacent tiles, a = abilities, t = types
   * Adjacent tiles are at most 8. Effectively O(1)
   *
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

    // Check all 8 directions (including diagonals for adjacency)
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
      const tile = this.getTile(pos.x + dir.dx, pos.y + dir.dy)
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

  /**
   * Get all available defense options for a creature being attacked
   * This includes COWER (universal), UNSTOPPABLE HORDES (Morgana's Undead), and IMMEDIATE cards
   *
   * Big O Complexity: O(a + t + 8 + h + c*8) where:
   *   a = abilities, t = types, 8 = adjacent tiles, h = hand size, c = creatures in play
   * Effectively O(h + c) since hand and creatures are the larger factors
   *
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

  /**
   * Get all IMMEDIATE cards that can be used for defense
   * IMMEDIATE cards can be played by the defender or adjacent friendly creatures
   * Each card prevents 10 damage and taps the creature that uses it
   *
   * Big O Complexity: O(h * c) where h = hand size, c = eligible creatures (max 9)
   * In practice, hand size is small (5-10 cards) and creatures are limited
   *
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @returns {Array} Array of { card, eligibleCreatures: [...] } objects
   */
  getImmediateCardsForDefense(defenderInstance) {
    if (!defenderInstance || !defenderInstance.owner) {
      return []
    }

    const player = this.players[defenderInstance.owner]
    if (!player || !player.orderHand) {
      return []
    }

    // Get all eligible creatures (defender + adjacent friendly untapped creatures)
    const eligibleCreatures = this.getCreaturesForImmediateCard(defenderInstance)

    // Find IMMEDIATE cards in hand that can be used for defense
    // Only include cards that actually prevent damage (damagePrevented > 0)
    // IMMEDIATE cards without damage prevention (like Savage Demise) are offensive, not defensive
    const immediateCards = []
    for (const card of player.orderHand) {
      const preventsDamage = card.damagePrevented != null && card.damagePrevented > 0
      if (card.isImmediate && card.isImmediate() && preventsDamage) {
        // Find which creatures can use this card
        const creaturesForCard = eligibleCreatures.filter(creature => {
          // Check if creature meets card requirements
          return card.canBeUsedBy(creature.creature)
        })

        if (creaturesForCard.length > 0) {
          immediateCards.push({
            card,
            eligibleCreatures: creaturesForCard,
            // Read damagePrevented from card (null/undefined = not implemented, defaults to 0)
            damagePrevented: card.damagePrevented != null ? card.damagePrevented : 0,
            // Read moraleCost from card (default 0, only set if card ability explicitly requires it)
            moraleCost: card.moraleCost != null ? card.moraleCost : 0
          })
        }
      }
    }

    return immediateCards
  }

  /**
   * Get all creatures that can use an IMMEDIATE card for defense
   * Includes the defender (if untapped) and adjacent friendly untapped creatures
   *
   * Big O Complexity: O(8) = O(1) - Only checks 8 adjacent tiles plus defender
   *
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
      const tile = this.getTile(pos.x + dir.dx, pos.y + dir.dy)
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
   * - Discards the card from hand
   * - Taps the creature that used the card
   * - Returns damage prevention amount (from card's damagePrevented property)
   * - Deducts morale cost if card has one (from card's moraleCost property)
   *
   * Big O Complexity: O(h) where h = hand size for card removal
   *
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
    const player = this.players[usingCreature.owner]
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

    // Deduct morale cost from the defending player if card requires it
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

    // Get card's damage prevention amount (null/undefined = not implemented, defaults to 0)
    const damagePrevented = card.damagePrevented != null ? card.damagePrevented : 0

    // Handle morale gain effect (e.g., Defiant Stance gains 1 Morale)
    const moraleGain = card.moraleGain || 0
    if (moraleGain > 0) {
      player.morale += moraleGain
    }

    // Handle untap after use effect (e.g., Tactical Block untaps the creature)
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

  /**
   * Check if player can deploy during REFRESH phase (HORDE ability)
   *
   * Big O Complexity: O(a) where a = commander abilities (1-2), effectively O(1)
   *
   * @param {string} playerId - Player to check
   * @returns {boolean} True if player can deploy during refresh
   */
  canDeployDuringRefresh(playerId) {
    return this.hasCommanderAbility(playerId, 'horde')
  }

  /**
   * Check if player can use ORC SCOUT ability to deploy to treasure tiles
   *
   * Big O Complexity: O(a) where a = commander abilities (1-2), effectively O(1)
   * Turn number check and ability state check are O(1)
   *
   * @param {string} playerId - Player to check
   * @returns {boolean} True if ORC SCOUT is available
   */
  canUseOrcScout(playerId) {
    // Only available on turn 1 (initial deployment)
    if (this.turnNumber !== 1) return false

    // Must have the ORC SCOUT ability
    if (!this.hasCommanderAbility(playerId, 'orc_scout')) return false

    // Must be Blood of Gruumsh faction
    const player = this.players[playerId]
    if (!player || !player.commander || player.commander.faction !== 'Blood of Gruumsh') return false

    // Check if ability has already been used
    if (player.commanderAbilityState?.orcScoutUsed) return false

    return true
  }

  /**
   * Get valid treasure tiles for ORC SCOUT deployment
   *
   * Big O Complexity: O(W × H) where W = boardWidth, H = boardHeight
   * Iterates through all tiles to find treasure tiles. For a 16×16 board = O(256)
   *
   * @param {string} playerId - Player deploying
   * @returns {Array} Array of valid treasure tiles
   */
  getOrcScoutValidTiles() {
    const validTiles = []
    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        const tile = this.getTile(x, y)
        if (tile && tile.treasure && !tile.occupant) {
          validTiles.push(tile)
        }
      }
    }
    return validTiles
  }

  /**
   * Mark ORC SCOUT ability as used
   *
   * Big O Complexity: O(1) - Direct hash lookup and property assignment
   *
   * @param {string} playerId - Player who used the ability
   */
  markOrcScoutUsed(playerId) {
    const player = this.players[playerId]
    if (!player.commanderAbilityState) {
      player.commanderAbilityState = {}
    }
    player.commanderAbilityState.orcScoutUsed = true
  }

  /**
   * Check if BLACK HAND OF BANE applies (enemy cower costs extra morale)
   *
   * Big O Complexity: O(a) where a = commander abilities (1-2), effectively O(1)
   *
   * @param {string} attackerOwner - The owner of the attacking creature
   * @returns {number} Extra morale cost (0 if not applicable)
   */
  getBlackHandOfBaneExtraCost(attackerOwner) {
    // Check if the attacker's owner has BLACK HAND OF BANE
    if (!this.hasCommanderAbility(attackerOwner, 'black_hand_of_bane')) return 0
    // Must be Tyranny of Goblins faction
    const player = this.players[attackerOwner]
    if (!player || !player.commander || player.commander.faction !== 'Tyranny of Goblins') return 0
    return COMMANDER_ABILITIES.BLACK_HAND_OF_BANE_EXTRA_COST
  }

  /**
   * Check if player can use SCROLLBOOK ability (Heart of Cormyr)
   * - Must have SCROLLBOOK ability
   * - Must have at least 1 order card in hand
   * - Must not have used SCROLLBOOK this turn
   *
   * Big O Complexity: O(a) where a = commander abilities (1-2), effectively O(1)
   *
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if SCROLLBOOK can be used
   */
  canUseScrollbook(playerId) {
    if (!this.hasCommanderAbility(playerId, 'scrollbook')) return false

    const player = this.players[playerId]
    if (!player || player.orderHand.length === 0) return false

    // Must be Heart of Cormyr faction
    if (!player.commander || player.commander.faction !== 'Heart of Cormyr') return false

    // Check if already used this turn
    if (player.commanderAbilityState?.scrollbookUsedThisTurn) return false

    return true
  }

  /**
   * Use SCROLLBOOK ability - discard 1 order card to draw 1 order card
   *
   * Big O Complexity: O(1) - Array splice and push operations
   *
   * @param {string} playerId - Player using the ability
   * @param {number} discardIndex - Index of card to discard from hand
   * @returns {Object} { success, discardedCard, drawnCard, message }
   */
  useScrollbook(playerId, discardIndex) {
    if (!this.canUseScrollbook(playerId)) {
      return { success: false, message: 'Cannot use SCROLLBOOK ability' }
    }

    const player = this.players[playerId]

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

  /**
   * Check if tile is passable for movement (can be traversed/stopped on)
   *
   * Movement rules for terrain:
   * - MOUNTAIN: Non-flying creatures cannot pass through OR stop on mountains
   *             Flying creatures CAN pass through but CANNOT stop on mountains
   * - All other terrain: Passable for both flying and non-flying
   *
   * Note: The pathfinding uses this to determine valid waypoints, and
   * getTerrainMovementCost returns 999 for mountains to prevent stopping on them.
   *
   * @param {Object} tile - Tile to check
   * @param {boolean} flying - Whether creature is flying
   * @returns {boolean} True if passable (can traverse through this tile)
   */
  isTerrainPassable(tile, flying = false) {
    if (!tile) return false

    // Mountains block non-flying creatures entirely (cannot pass through)
    // Flying creatures can pass over mountains but cannot stop on them
    // (stopping is prevented by movement cost of 999 in getTerrainMovementCost)
    // Check both string value and TerrainTypes constant for robustness
    if (tile.terrain === TerrainTypes.MOUNTAIN || tile.terrain === 'MOUNTAIN') {
      return flying // Only flying creatures can traverse mountains
    }

    return true
  }

  /**
   * Get movement cost for terrain type
   * @param {string} terrain - Terrain type
   * @param {boolean} flying - Whether creature is flying
   * @param {CreatureInstance} creatureInstance - Optional creature for ability checks
   * @returns {number} Movement cost (999 = impassable)
   */
  getTerrainMovementCost(terrain, flying = false, creatureInstance = null) {
    // Flying creatures ignore difficult terrain
    if (flying) {
      switch (terrain) {
        case TerrainTypes.MOUNTAIN:
          return 999 // Still impassable (cannot stop on mountains)
        case TerrainTypes.WATER:
          return 1 // Flying creatures fly over water easily
        default:
          return 1 // All other terrain costs 1 for flying creatures
      }
    }

    // Check for GRUUMSH COMMANDS IT ability (ignore difficult terrain)
    if (creatureInstance && this.ignoresDifficultTerrain(creatureInstance)) {
      switch (terrain) {
        case TerrainTypes.DIFFICULT:
        case TerrainTypes.FOREST:
        case TerrainTypes.WATER:
          return 1 // Treat difficult terrain as normal
        case TerrainTypes.MOUNTAIN:
          return 999 // Still impassable
        default:
          return 1
      }
    }

    // Ground creatures without terrain-ignoring abilities
    switch (terrain) {
      case TerrainTypes.DIFFICULT:
        return TERRAIN.DIFFICULT_COST
      case TerrainTypes.FOREST:
        return TERRAIN.FOREST_COST
      case TerrainTypes.WATER:
        return TERRAIN.WATER_COST
      case TerrainTypes.MOUNTAIN:
        return 999 // Impassable
      default:
        return TERRAIN.NORMAL_COST
    }
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

  /**
   * Get all valid attack targets for a creature
   * Also tracks ranged attack restriction statistics for testing
   *
   * Ranged Attack Restrictions:
   * 1. Cannot shoot FROM forest - creature on forest can only melee
   * 2. Cannot shoot AT forest - creature on forest cannot be ranged attacked
   * 3. Cannot shoot adjacent targets - must use melee for adjacent enemies
   * 4. Line of sight - cannot shoot through enemy creatures (allies don't block)
   */
  getValidAttackTargets(creatureInstance, trackStats = null) {
    if (!creatureInstance.position) return []

    const targets = []
    const attackerOwner = creatureInstance.owner
    const hasMelee = creatureInstance.creature.meleeAttack !== null
    const hasRanged = creatureInstance.creature.rangedAttack !== null
    const rangedRange = hasRanged ? creatureInstance.creature.rangedAttack.range : 0
    const meleeRange = hasMelee ? (creatureInstance.creature.meleeAttack.range || 1) : 0

    // Ranged restriction #1: Check if attacker is on forest
    const attackerTile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
    const attackerOnForest = attackerTile?.terrain === TerrainTypes.FOREST

    // Find all enemy creatures
    for (const playerId of this.activePlayers) {
      if (playerId === attackerOwner) continue // Skip own creatures

      const player = this.players[playerId]
      for (const enemyCreature of player.creaturesInPlay) {
        if (!enemyCreature.position) continue

        // Skip creatures that were deployed this turn (protected from attacks)
        if (enemyCreature.deployedThisTurn) continue

        const distance = this.getDistance(creatureInstance.position, enemyCreature.position)
        const isAdjacent = distance === 1

        // Ranged restriction #2: Check if target is on forest
        const targetTile = this.getTile(enemyCreature.position.x, enemyCreature.position.y)
        const targetOnForest = targetTile?.terrain === TerrainTypes.FOREST

        // Melee attack: adjacent range only
        if (hasMelee && distance <= meleeRange) {
          targets.push({
            creature: enemyCreature,
            attackType: 'melee',
            distance
          })
        }

        // Ranged attack: check all restrictions
        if (hasRanged && distance > 0 && distance <= rangedRange) {
          // Restriction #1: Cannot shoot FROM forest (tracked above)
          if (attackerOnForest) {
            if (trackStats) trackStats.rangedBlockedByForestAttacker++
            continue
          }

          // Restriction #3: Cannot shoot adjacent targets with ranged
          if (isAdjacent) {
            if (trackStats) {
              trackStats.rangedBlockedByAdjacent++
              // Special case: ranged-only creatures can't attack adjacent at all
              if (!hasMelee) {
                trackStats.rangedOnlyCreaturesBlocked++
              }
            }
            continue // Skip - must use melee for adjacent
          }

          // Restriction #2: Cannot shoot at creatures on forest
          if (targetOnForest) {
            if (trackStats) trackStats.rangedBlockedByForestTarget++
            continue // Skip - forest blocks ranged attacks
          }

          // Restriction #4: Check line of sight (enemy creatures block)
          if (this.hasLineOfSight(creatureInstance, enemyCreature, attackerOwner)) {
            targets.push({
              creature: enemyCreature,
              attackType: 'ranged',
              distance
            })
          } else {
            if (trackStats) trackStats.rangedBlockedByLineOfSight++
          }
        }
      }
    }

    return targets
  }

  /**
   * Check if there's a clear line of sight between attacker and target
   * Forest terrain and enemy creatures block line of sight, but allied creatures do not
   *
   * @param {CreatureInstance} attacker - The attacking creature
   * @param {CreatureInstance} target - The target creature
   * @param {string} attackerOwner - Owner ID of the attacker
   * @returns {boolean} True if line of sight is clear
   */
  hasLineOfSight(attacker, target, attackerOwner) {
    const from = attacker.position
    const to = target.position

    // Get all tiles along the line between attacker and target
    const lineTiles = this.getLineTiles(from, to)

    // Check each tile for blocking forest terrain or enemy creatures
    for (const pos of lineTiles) {
      const tile = this.getTile(pos.x, pos.y)

      // Skip start and end positions
      if ((pos.x === from.x && pos.y === from.y) || (pos.x === to.x && pos.y === to.y)) {
        continue
      }

      // Forest terrain blocks line of sight
      if (tile?.terrain === TerrainTypes.FOREST) {
        return false // Forest blocks line of sight
      }

      // Mountain terrain blocks line of sight
      if (tile?.terrain === TerrainTypes.MOUNTAIN) {
        return false // Mountain blocks line of sight
      }

      // If there's an enemy creature on this tile, line of sight is blocked
      if (tile?.occupant && tile.occupant.owner !== attackerOwner) {
        return false // Enemy creature blocks line of sight
      }
      // Allied creatures do NOT block (no check needed, just skip them)
    }

    return true // Line of sight is clear
  }

  /**
   * Get all tiles along a line between two points (Bresenham's line algorithm)
   *
   * @param {Object} from - Starting position {x, y}
   * @param {Object} to - Ending position {x, y}
   * @returns {Array} Array of positions along the line
   */
  getLineTiles(from, to) {
    const tiles = []
    let x0 = from.x
    let y0 = from.y
    const x1 = to.x
    const y1 = to.y

    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy

    while (true) {
      tiles.push({ x: x0, y: y0 })

      if (x0 === x1 && y0 === y1) break

      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x0 += sx
      }
      if (e2 < dx) {
        err += dx
        y0 += sy
      }
    }

    return tiles
  }

  /**
   * Get all tiles within ranged attack range for a creature, with line-of-sight info
   * Used for the ranged attack preview overlay
   *
   * @param {CreatureInstance} creatureInstance - The creature to check range for
   * @returns {Array} Array of {x, y, hasLOS, blockReason} for tiles in range
   */
  getRangedAttackRangeTiles(creatureInstance) {
    if (!creatureInstance?.position) return []
    if (!creatureInstance.creature.rangedAttack) return []

    const rangeTiles = []
    const pos = creatureInstance.position
    const range = creatureInstance.creature.rangedAttack.range
    const attackerOwner = creatureInstance.owner

    // Check if attacker is on forest (can't use ranged from forest)
    const attackerTile = this.getTile(pos.x, pos.y)
    const attackerOnForest = attackerTile?.terrain === TerrainTypes.FOREST

    // O(1) - Calculate bounding box for range (avoids iterating entire board)
    // OPTIMIZATION: Instead of O(W�H) = O(320), we iterate O((2R+1)^2) = O(121) for range 5
    const minX = Math.max(0, pos.x - range)
    const maxX = Math.min(this.boardWidth - 1, pos.x + range)
    const minY = Math.max(0, pos.y - range)
    const maxY = Math.min(this.boardHeight - 1, pos.y + range)

    // O((2R+1)^2) - Only iterate tiles within range bounds
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Skip own position
        if (x === pos.x && y === pos.y) continue

        const distance = this.getDistance(pos, { x, y })

        // Skip if out of range
        if (distance > range) continue

        // Skip adjacent tiles (melee zone, can't use ranged)
        if (distance <= 1) continue

        const tile = this.getTile(x, y)
        let hasLOS = true
        let blockReason = null

        // Check blocking reasons
        if (attackerOnForest) {
          hasLOS = false
          blockReason = 'attacker_in_forest'
        } else if (tile?.terrain === TerrainTypes.FOREST) {
          hasLOS = false
          blockReason = 'target_forest'
        } else if (tile?.terrain === TerrainTypes.MOUNTAIN) {
          hasLOS = false
          blockReason = 'target_mountain'
        } else {
          // Check line of sight using existing logic
          const lineTiles = this.getLineTiles(pos, { x, y })
          for (const linePos of lineTiles) {
            // Skip start and end positions
            if ((linePos.x === pos.x && linePos.y === pos.y) || (linePos.x === x && linePos.y === y)) {
              continue
            }

            const lineTile = this.getTile(linePos.x, linePos.y)

            // Forest blocks LOS
            if (lineTile?.terrain === TerrainTypes.FOREST) {
              hasLOS = false
              blockReason = 'forest_blocking'
              break
            }

            // Mountain blocks LOS
            if (lineTile?.terrain === TerrainTypes.MOUNTAIN) {
              hasLOS = false
              blockReason = 'mountain_blocking'
              break
            }

            // Enemy creature blocks LOS
            if (lineTile?.occupant && lineTile.occupant.owner !== attackerOwner) {
              hasLOS = false
              blockReason = 'enemy_blocking'
              break
            }
          }
        }

        rangeTiles.push({ x, y, hasLOS, blockReason })
      }
    }

    return rangeTiles
  }

  /**
   * Validate an attack before execution
   * Checks creature state, range, terrain restrictions, and line of sight
   *
   * Big O Complexity: O(1) for melee, O(n) for ranged where n = tiles in line
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @returns {Object} { valid: boolean, error?: string, damage?: number }
   */
  validateAttack(attackerInstance, defenderInstance, attackType = 'melee') {
    // Safety check: ensure both creatures have valid positions
    if (!attackerInstance?.position || !defenderInstance?.position) {
      return { valid: false, error: 'Cannot attack: invalid creature position' }
    }

    // Cannot attack if tapped
    if (attackerInstance.isTapped) {
      return { valid: false, error: 'Cannot attack: creature is tapped' }
    }

    // Cannot attack if already attacked this turn
    if (attackerInstance.hasAttackedThisTurn) {
      return { valid: false, error: 'Cannot attack: creature has already attacked this turn' }
    }

    // Validate melee attack: must be adjacent (distance <= meleeRange, default 1)
    if (attackType === 'melee') {
      const distance = this.getDistance(attackerInstance.position, defenderInstance.position)
      const meleeRange = attackerInstance.creature.meleeAttack?.range || COMBAT.MELEE_RANGE
      if (distance > meleeRange) {
        console.log(`[validateAttack] BLOCKED: Melee attack invalid - distance ${distance} > meleeRange ${meleeRange}`)
        return { valid: false, error: 'Cannot attack: target is not in melee range' }
      }
    }

    // Validate ranged attack: check distance, forest restrictions, and line-of-sight
    if (attackType === 'ranged') {
      const distance = this.getDistance(attackerInstance.position, defenderInstance.position)
      const rangedRange = attackerInstance.creature.rangedAttack?.range || 0

      // Check distance is within range
      if (distance > rangedRange) {
        console.log(`[validateAttack] BLOCKED: Ranged attack invalid - distance ${distance} > rangedRange ${rangedRange}`)
        return { valid: false, error: 'Cannot attack: target is out of range' }
      }

      // Check forest restrictions - cannot shoot FROM forest
      const attackerTile = this.getTile(attackerInstance.position.x, attackerInstance.position.y)
      if (attackerTile?.terrain === TerrainTypes.FOREST) {
        console.log(`[validateAttack] BLOCKED: Cannot make ranged attack from forest`)
        return { valid: false, error: 'Cannot make ranged attack from forest' }
      }

      // Check forest restrictions - cannot shoot AT target in forest
      const targetTile = this.getTile(defenderInstance.position.x, defenderInstance.position.y)
      if (targetTile?.terrain === TerrainTypes.FOREST) {
        console.log(`[validateAttack] BLOCKED: Cannot make ranged attack at target in forest`)
        return { valid: false, error: 'Cannot make ranged attack at target in forest' }
      }

      // Check line of sight - O(n) where n = tiles between attacker and target
      if (!this.hasLineOfSight(attackerInstance, defenderInstance, attackerInstance.owner)) {
        console.log(`[validateAttack] BLOCKED: No line of sight to target`)
        return { valid: false, error: 'Cannot attack: no line of sight to target' }
      }
    }

    // Calculate damage based on attack type
    let damage = 0
    if (attackType === 'melee' && attackerInstance.creature.meleeAttack) {
      damage = attackerInstance.creature.meleeAttack.damage
    } else if (attackType === 'ranged' && attackerInstance.creature.rangedAttack) {
      damage = attackerInstance.creature.rangedAttack.damage
    } else {
      return { valid: false, error: 'Invalid attack type' }
    }

    return { valid: true, damage }
  }

  // Execute an attack from one creature to another
  executeAttack(attackerInstance, defenderInstance, attackType = 'melee') {
    // Validate the attack
    const validation = this.validateAttack(attackerInstance, defenderInstance, attackType)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    const damage = validation.damage

    // Mark as attacked
    attackerInstance.hasAttackedThisTurn = true

    // Tap the creature if it has both moved AND attacked
    if (attackerInstance.hasMovedThisTurn) {
      attackerInstance.tap()
    }

    // Use the custom combat resolution (includes +1 morale on kill)
    const result = this.resolveAttack(attackerInstance, defenderInstance, damage)

    return {
      success: true,
      ...result,
      attackType,
      damage
    }
  }

  /**
   * Execute attack with defense options (COWER or UNSTOPPABLE HORDES)
   * Supports both:
   * - COWER: Avoid ALL damage (damageReduction equals original damage)
   * - UNSTOPPABLE HORDES: Reduce damage by specific amount (can stack)
   *
   * Big O Complexity: O(c) where c = creatures in play for defender (for removal)
   * Most operations are O(1). Creature removal uses findIndex which is O(c)
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {number} damageReduction - Amount to reduce damage by (full damage for COWER)
   * @param {string} defenseType - 'cower' | 'unstoppable_hordes' | null
   * @returns {Object} Attack result
   */
  executeAttackWithDefense(attackerInstance, defenderInstance, attackType = 'melee', damageReduction = 0, defenseType = null) {
    // Validate the attack using shared validation logic
    const validation = this.validateAttack(attackerInstance, defenderInstance, attackType)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    // Apply damage reduction from defense
    const originalDamage = validation.damage
    const damage = Math.max(0, originalDamage - damageReduction)

    // Mark as attacked
    attackerInstance.hasAttackedThisTurn = true

    // Tap the creature if it has both moved AND attacked
    if (attackerInstance.hasMovedThisTurn) {
      attackerInstance.tap()
    }

    // Use the custom combat resolution (includes +1 morale on kill)
    const result = this.resolveAttack(attackerInstance, defenderInstance, damage)

    return {
      success: true,
      ...result,
      attackType,
      damage,
      originalDamage,
      damageReduced: damageReduction,
      defenseUsed: defenseType
    }
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

  /**
   * Apply water damage to creatures standing on water at end of ACTIVATE phase
   * Creatures on WATER terrain take 10 damage unless they are flying
   */
  applyWaterDamage() {
    const damageResults = []

    // Count creatures on water for debugging
    let creaturesOnWater = 0
    let flyingOnWater = 0

    // Check all tiles for creatures standing on water
    this.getAllTiles().forEach(tile => {
      if (tile.terrain === TerrainTypes.WATER && tile.occupant) {
        creaturesOnWater++
        const creature = tile.occupant

        // Flying creatures are immune to water damage
        if (this.hasFlying(creature)) {
          flyingOnWater++
          return
        }

        // Apply water damage to non-flying creatures
        const damageTaken = creature.takeDamage(TERRAIN.WATER_DAMAGE)

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

          // Remove from player's creaturesInPlay array
          if (owner) {
            const ownerState = this.players[owner]
            const index = ownerState.creaturesInPlay.indexOf(creature)
            if (index !== -1) {
              ownerState.creaturesInPlay.splice(index, 1)
            }
          }
        }
      }
    })

    // Log results if any creatures were on water
    if (creaturesOnWater > 0) {
      console.log(`Water check at end of ACTIVATE: ${creaturesOnWater} creatures on water (${flyingOnWater} flying, ${damageResults.length} took damage)`)
      if (damageResults.length > 0) {
        console.log('Water damage applied:', damageResults)
      }
    }

    return damageResults
  }

  // Phase transitions
  advancePhase() {
    const phaseOrder = [GamePhases.REFRESH, GamePhases.ACTIVATE, GamePhases.DEPLOY, GamePhases.CLEANUP]
    const currentIndex = phaseOrder.indexOf(this.currentPhase)

    // Check for water damage when leaving ACTIVATE phase
    if (this.currentPhase === GamePhases.ACTIVATE) {
      this.applyWaterDamage()
    }

    if (currentIndex === phaseOrder.length - 1) {
      // End of turn - switch players
      this.endTurn()
    } else {
      const nextPhase = phaseOrder[currentIndex + 1]
      this.currentPhase = nextPhase

      // Increase leadership by 1 when entering Deploy phase (but not on turn 1)
      if (nextPhase === GamePhases.DEPLOY && this.turnNumber > 1) {
        const player = this.getCurrentPlayerState()
        player.increaseLeadership(1)
      }
    }
  }

  endTurn() {
    // Check for defeated players and eliminate them
    const defeatedPlayers = this.activePlayers.filter(
      playerId => this.players[playerId].isDefeated(this.turnNumber)
    )

    // Eliminate defeated players (remove their creatures from board)
    for (const playerId of defeatedPlayers) {
      this.eliminatePlayer(playerId)
    }

    // Remove defeated players from active players list
    this.activePlayers = this.activePlayers.filter(
      playerId => !defeatedPlayers.includes(playerId)
    )

    // Check if game should end (1 or fewer players remaining)
    if (this.activePlayers.length <= 1) {
      this.gameOver = true
      this.winner = this.activePlayers[0] || null
      return
    }

    // If current player was eliminated, adjust index
    let currentIndex = this.activePlayers.indexOf(this.currentPlayer)
    if (currentIndex === -1) {
      // Current player was eliminated, start from beginning of remaining players
      currentIndex = -1
    }

    // Move to next active player
    const nextIndex = (currentIndex + 1) % this.activePlayers.length
    this.currentPlayer = this.activePlayers[nextIndex]

    // If we've cycled back to first player, increment turn number
    if (nextIndex === 0) {
      this.turnNumber++
    }

    // Turn 1 is deploy-only for both players
    if (this.turnNumber === 1) {
      this.currentPhase = GamePhases.DEPLOY
    } else {
      this.currentPhase = GamePhases.REFRESH
    }

    // Check for game over conditions (handles turn limit, etc.)
    this.checkGameOver()
  }

  // CUSTOM RULE: Killing a creature grants +1 morale to attacker's owner
  // NO COWER MECHANIC - creatures just take damage
  resolveAttack(attackerInstance, defenderInstance, damageAmount) {
    const attackerOwner = attackerInstance.owner
    const defenderOwner = defenderInstance.owner

    // Apply damage to defender
    const wasDestroyed = defenderInstance.takeDamage(damageAmount)

    if (wasDestroyed) {
      // Clear the tile occupant first
      if (defenderInstance.position) {
        const tile = this.getTile(defenderInstance.position.x, defenderInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(c => c.instanceId === defenderInstance.instanceId)
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(defenderInstance.creature.level)

      // CUSTOM RULE: Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      // BLOODTHIRSTY ability: Gain +1 Leadership on kill (Curse of Undeath)
      // Big O: O(a) where a = commander abilities (1-2), effectively O(1)
      let leadershipGained = 0
      if (this.hasCommanderAbility(attackerOwner, 'bloodthirsty')) {
        // Must be Curse of Undeath faction
        if (attackerPlayer.commander && attackerPlayer.commander.faction === 'Curse of Undeath') {
          attackerPlayer.leadership = (attackerPlayer.leadership || 0) + 1
          leadershipGained = 1
        }
      }

      return {
        destroyed: true,
        damage: damageAmount,
        moraleChange: {
          attacker: +1,
          defender: -defenderInstance.creature.level
        },
        bloodthirsty: leadershipGained > 0 ? { leadershipGained } : null
      }
    }

    return {
      destroyed: false,
      damage: damageAmount,
      moraleChange: null
    }
  }

  /**
   * Eliminate a player from the game - removes all their creatures from the board
   * @param {string} playerId - The player to eliminate
   */
  eliminatePlayer(playerId) {
    const player = this.players[playerId]
    if (!player) return

    // Remove all creatures from the board and clear their tiles
    for (const creature of player.creaturesInPlay) {
      if (creature.position) {
        const tile = this.getTile(creature.position.x, creature.position.y)
        if (tile) {
          tile.occupant = null
        }
        creature.position = null
      }
    }

    // Clear the creaturesInPlay array
    player.creaturesInPlay = []
  }

  checkGameOver() {
    // Get all non-defeated players
    const alivePlayers = this.activePlayers.filter(playerId => !this.players[playerId].isDefeated(this.turnNumber))

    if (alivePlayers.length === 0) {
      // All defeated - highest morale wins
      this.gameOver = true
      let highestMorale = -1
      this.activePlayers.forEach(playerId => {
        const morale = this.players[playerId].morale
        if (morale > highestMorale) {
          highestMorale = morale
          this.winner = playerId
        }
      })
    } else if (alivePlayers.length === 1) {
      // Only one player left
      this.gameOver = true
      this.winner = alivePlayers[0]
    } else if (this.turnNumber >= GAME_RULES.MAX_TURNS) {
      // Turn limit reached - highest morale wins
      this.gameOver = true
      let highestMorale = -1
      let winner = null
      this.activePlayers.forEach(playerId => {
        const morale = this.players[playerId].morale
        if (morale > highestMorale) {
          highestMorale = morale
          winner = playerId
        }
      })
      this.winner = winner
    }
  }

  /**
   * Check if a specific player should be eliminated and remove them immediately
   * Called after attacks to prevent wasted attacks on defeated players
   * @param {string} playerId - Player to check
   * @returns {Object} { eliminated: boolean, reason: string }
   */
  checkAndEliminatePlayer(playerId) {
    const player = this.players[playerId]
    if (!player || !this.activePlayers.includes(playerId)) {
      return { eliminated: false, reason: null }
    }

    // Check morale defeat
    if (player.morale <= 0) {
      this.eliminatePlayer(playerId)
      this.activePlayers = this.activePlayers.filter(id => id !== playerId)
      return { eliminated: true, reason: 'morale' }
    }

    // Check creature defeat (after turn 1)
    if (this.turnNumber > 1 && player.creaturesInPlay.length === 0) {
      this.eliminatePlayer(playerId)
      this.activePlayers = this.activePlayers.filter(id => id !== playerId)
      return { eliminated: true, reason: 'creatures' }
    }

    return { eliminated: false, reason: null }
  }

  // Execute refresh phase
  executeRefreshPhase() {
    const player = this.getCurrentPlayerState()

    // Reset commander ability state for new turn
    player.resetAbilitiesForNewTurn()

    // Draw 1 order card
    player.drawOrderCards(1)

    // Untap all creatures
    player.creaturesInPlay.forEach(creature => creature.untap())

    // Clear deployment protection from creatures deployed on previous turns
    player.creaturesInPlay.forEach(creature => {
      if (creature.deployedThisTurn && creature.turnDeployed !== this.turnNumber) {
        creature.clearDeploymentProtection()
      }
    })

    // Auto-advance to activate phase
    this.advancePhase()
  }

  // Execute cleanup phase
  executeCleanupPhase() {
    const player = this.getCurrentPlayerState()

    // Untap only current player's creatures (not opponent's)
    player.creaturesInPlay.forEach(creature => creature.untap())

    // Draw creature cards back to hand limit from commander stats
    const creatureHandLimit = player.commander.startingCreatureHandSize
    const cardsToDraw = Math.max(0, creatureHandLimit - player.creatureHand.length)
    player.drawCreatureCards(cardsToDraw)

    // Auto-advance (which will end turn)
    this.advancePhase()
  }

  // Execute deploy phase
  executeDeployPhase() {
    // Note: Leadership increase now happens in advancePhase() when entering Deploy phase
    // Note: Actual deployment of creatures is handled by player actions
    // Auto-advance to cleanup phase
    this.advancePhase()
  }
}

export default GameState
