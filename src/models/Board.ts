/**
 * Board - Grid operations, tile management, and spatial queries
 *
 * Extracted from gameState.js to follow Single Responsibility Principle.
 * Handles all board-related operations including:
 * - Tile lookup and iteration
 * - Distance calculations
 * - Line of sight geometry
 * - Board generation (terrain, starting zones, magic circles, treasures)
 * - Terrain passability and movement costs
 */

import { TERRAIN, TREASURE, MAGIC_CIRCLE } from '../constants/gameConstants.js'
import { Treasure, createTokenPool, drawTokens } from './treasure.js'
import type { CreatureInstance } from './creatures.js'

// Terrain type constants - affects movement and gameplay
export const TerrainTypes = {
  NORMAL: 'NORMAL', // Standard terrain, 1 movement cost
  FOREST: 'FOREST', // Difficult terrain, 2 movement cost
  MOUNTAIN: 'MOUNTAIN', // Impassable terrain
  DIFFICULT: 'DIFFICULT', // Difficult terrain, 2 movement cost
  WATER: 'WATER', // Passable but dangerous, 2 movement cost, 10 damage at end of ACTIVATE phase
  MAGIC_CIRCLE: 'MAGIC_CIRCLE', // Special objective tile
  STARTING_ZONE: 'STARTING_ZONE', // Player deployment area
} as const

export type TerrainType = (typeof TerrainTypes)[keyof typeof TerrainTypes]

export interface Position {
  x: number
  y: number
}

export interface Tile {
  x: number
  y: number
  terrain: TerrainType | string
  occupant: CreatureInstance | null
  startingZoneOwner?: string
  owner?: string
  treasure?: Treasure
}

export interface EdgePosition {
  startX: number
  startY: number
  edge:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-left'
    | 'bottom-right'
    | 'top-right'
    | 'bottom-left'
    | 'top-center'
}

// Minimal shape Board needs from PlayerState - avoids a circular import with gameState.ts
export interface BoardPlayerLike {
  startingZoneTiles: Position[]
  magicCirclePosition: Position | null
}

/**
 * Board class - Manages the game board grid
 */
export class Board {
  boardWidth: number
  boardHeight: number
  tiles: Tile[][]
  treasures: Treasure[]
  treasurePlacementStats: { relaxedSpacing: number }

  constructor(width: number, height: number) {
    this.boardWidth = width
    this.boardHeight = height
    this.tiles = [] // 2D array [y][x] for O(1) tile lookup
    this.treasures = [] // Array of Treasure objects on the board
    this.treasurePlacementStats = { relaxedSpacing: 0 } // Track placement failures

    // Initialize empty board
    this.initializeEmptyBoard()
  }

  /**
   * Initialize an empty board with normal terrain
   * O(W*H) where W=width, H=height
   */
  initializeEmptyBoard(): void {
    this.tiles = []
    for (let y = 0; y < this.boardHeight; y++) {
      this.tiles[y] = []
      for (let x = 0; x < this.boardWidth; x++) {
        this.tiles[y][x] = {
          x,
          y,
          terrain: TerrainTypes.NORMAL,
          occupant: null,
        }
      }
    }
  }

  // ============================================================================
  // TILE LOOKUP - O(1) Operations
  // ============================================================================

  /**
   * Get tile at position - O(1) using 2D array
   */
  getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= this.boardWidth || y < 0 || y >= this.boardHeight) {
      return null
    }
    return this.tiles[y][x]
  }

  /**
   * Get all tiles as flat array - O(W*H)
   */
  getAllTiles(): Tile[] {
    const allTiles: Tile[] = []
    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        allTiles.push(this.tiles[y][x])
      }
    }
    return allTiles
  }

  /**
   * Get adjacent tiles (4-directional) - O(1)
   */
  getAdjacentTiles(x: number, y: number): Tile[] {
    const adjacent: Tile[] = []
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: 0 }, // East
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 0 }, // West
    ]

    directions.forEach((dir) => {
      const newX = x + dir.dx
      const newY = y + dir.dy
      const tile = this.getTile(newX, newY)
      if (tile) {
        adjacent.push(tile)
      }
    })

    return adjacent
  }

  /**
   * Get all 8-directionally adjacent tiles (including diagonals)
   * Used for abilities like FLASHING BLADES that affect all surrounding tiles
   * Big O: O(8) = O(1) - checks exactly 8 directions
   */
  getAdjacentTiles8Dir(x: number, y: number): Tile[] {
    const adjacent: Tile[] = []
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: -1 }, // Northeast
      { dx: 1, dy: 0 }, // East
      { dx: 1, dy: 1 }, // Southeast
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 1 }, // Southwest
      { dx: -1, dy: 0 }, // West
      { dx: -1, dy: -1 }, // Northwest
    ]

    directions.forEach((dir) => {
      const newX = x + dir.dx
      const newY = y + dir.dy
      const tile = this.getTile(newX, newY)
      if (tile) {
        adjacent.push(tile)
      }
    })

    return adjacent
  }

  /**
   * Check if a position is adjacent to any MOUNTAIN tile (8-directional)
   * Used for SHADOW STALKER ability deployment
   * Big O: O(8) = O(1) - checks up to 8 adjacent tiles
   */
  isAdjacentToMountain(x: number, y: number): boolean {
    const adjacentTiles = this.getAdjacentTiles8Dir(x, y)
    return adjacentTiles.some((tile) => tile.terrain === TerrainTypes.MOUNTAIN)
  }

  // ============================================================================
  // DISTANCE & GEOMETRY
  // ============================================================================

  /**
   * Calculate distance between two positions using Chebyshev distance
   * Chebyshev distance = max(|dx|, |dy|) - correct for 8-directional movement
   */
  getDistance(pos1: Position, pos2: Position): number {
    return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y))
  }

  /**
   * Get all tiles along a line between two points (Bresenham's line algorithm)
   * Used for line of sight calculations
   */
  getLineTiles(from: Position, to: Position): Position[] {
    const tiles: Position[] = []
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

  // ============================================================================
  // TERRAIN QUERIES
  // ============================================================================

  /**
   * Check if terrain is passable
   */
  isTerrainPassable(
    tile: Tile | null,
    flying = false,
    burrowing = false,
    phasing = false
  ): boolean {
    if (!tile) return false

    // Mountains block non-flying/non-burrowing/non-phasing creatures entirely
    // Flying/Burrowing/Phasing creatures can pass over/through mountains but cannot stop on them
    if (tile.terrain === TerrainTypes.MOUNTAIN || tile.terrain === 'MOUNTAIN') {
      return flying || burrowing || phasing
    }

    return true
  }

  /**
   * Get movement cost for terrain type
   * @returns Movement cost (999 = impassable)
   */
  getTerrainMovementCost(
    terrain: string,
    flying = false,
    ignoresDifficult = false,
    burrowing = false,
    phasing = false
  ): number {
    // Flying creatures ignore difficult terrain
    // IMPORTANT: Mountains cost 1 to PASS THROUGH, but creatures cannot STOP on them
    // The "cannot stop" logic is handled in pathfinding's final destination filtering (canStopOn callback)
    if (flying) {
      // All terrain (including mountains) costs 1 for flying creatures
      return 1
    }

    // Phasing creatures ignore terrain like flying, and can also pass through other creatures
    // IMPORTANT: Mountains cost 1 to PASS THROUGH, but creatures cannot STOP on them
    // The "cannot stop" logic is handled in pathfinding's final destination filtering (canStopOn callback)
    if (phasing) {
      // All terrain (including mountains) costs 1 for phasing creatures
      return 1
    }

    // Burrowing creatures ignore terrain costs (like flying) but still take water damage
    // IMPORTANT: Mountains cost 1 to PASS THROUGH, but creatures cannot STOP on them
    // The "cannot stop" logic is handled in pathfinding's final destination filtering (canStopOn callback)
    if (burrowing) {
      // All terrain (including mountains) costs 1 for burrowing creatures
      return 1
    }

    // Check for terrain-ignoring abilities (e.g., GRUUMSH COMMANDS IT)
    if (ignoresDifficult) {
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

  // ============================================================================
  // BOARD GENERATION
  // ============================================================================

  /**
   * Generate complete board with terrain, starting zones, magic circles, treasures
   */
  generateBoard(activePlayers: string[], players: Record<string, BoardPlayerLike>): void {
    // Re-initialize empty board
    this.initializeEmptyBoard()

    // STEP 1: Add starting zones FIRST (before any terrain generation)
    this.addStartingZones(activePlayers, players)

    // STEP 2: Generate terrain regions based on board size
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
    this.addMagicCircles(activePlayers, players)

    // STEP 4: Place treasure tokens (last, after all terrain is set)
    this.placeTreasures(activePlayers, players)
  }

  /**
   * Generate a terrain region with clustered terrain
   */
  generateTerrainRegion(startX: number, startY: number, width: number, height: number): void {
    const regionTiles: Tile[] = []

    // Get all tiles in this region
    for (let y = startY; y < startY + height; y++) {
      for (let x = startX; x < startX + width; x++) {
        if (x < this.boardWidth && y < this.boardHeight) {
          const tile = this.getTile(x, y)
          if (tile) regionTiles.push(tile)
        }
      }
    }

    // Randomly decide terrain composition for this region
    const totalTiles = regionTiles.length
    const forestCount = Math.floor(totalTiles * (0.08 + Math.random() * 0.07))
    const mountainCount = Math.floor(totalTiles * (0.08 + Math.random() * 0.07))
    const difficultCount = Math.floor(totalTiles * (0.03 + Math.random() * 0.05))
    const waterCount = Math.floor(totalTiles * (0.03 + Math.random() * 0.09))

    // Add clustered terrain
    this.addClusteredTerrain(regionTiles, TerrainTypes.FOREST, forestCount, 3)
    this.addClusteredTerrain(regionTiles, TerrainTypes.MOUNTAIN, mountainCount, 2)
    this.addClusteredTerrain(regionTiles, TerrainTypes.DIFFICULT, difficultCount, 2)
    this.addClusteredTerrain(regionTiles, TerrainTypes.WATER, waterCount, 2)
  }

  /**
   * Add terrain in clusters instead of random scatter
   */
  addClusteredTerrain(
    regionTiles: Tile[],
    terrainType: TerrainType,
    count: number,
    clusterSize: number
  ): void {
    // Filter out starting zones - only place terrain on NORMAL tiles
    const availableTiles = regionTiles.filter((t) => t && t.terrain === TerrainTypes.NORMAL)
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
        const baseTile = cluster[Math.floor(Math.random() * cluster.length)]
        const adjacentTiles = this.getAdjacentTiles(baseTile.x, baseTile.y).filter(
          (t) => regionTiles.includes(t) && t.terrain === TerrainTypes.NORMAL
        )

        if (adjacentTiles.length > 0) {
          const adjTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)]
          adjTile.terrain = terrainType
          placed++
          cluster.push(adjTile)

          const availIndex = availableTiles.indexOf(adjTile)
          if (availIndex !== -1) {
            availableTiles.splice(availIndex, 1)
          }
        } else {
          break
        }
      }
    }
  }

  /**
   * Add random terrain tiles (legacy method)
   */
  addRandomTerrain(terrainType: TerrainType, count: number): void {
    const normalTiles = this.getAllTiles().filter((t) => t.terrain === TerrainTypes.NORMAL)
    for (let i = 0; i < count && normalTiles.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * normalTiles.length)
      const tile = normalTiles[randomIndex]
      tile.terrain = terrainType
      normalTiles.splice(randomIndex, 1)
    }
  }

  // ============================================================================
  // STARTING ZONES
  // ============================================================================

  /**
   * Create starting zones for each player on the board edges
   */
  addStartingZones(activePlayers: string[], players: Record<string, BoardPlayerLike>): void {
    const numPlayers = activePlayers.length
    const edgePositions = this.getEdgePositionsForPlayers(numPlayers)

    activePlayers.forEach((playerId, index) => {
      const edge = edgePositions[index]
      const zoneTiles: Position[] = []

      // Determine zone dimensions based on edge orientation
      let zoneWidth: number, zoneHeight: number
      if (
        edge.edge === 'top' ||
        edge.edge === 'bottom' ||
        edge.edge.includes('top') ||
        edge.edge.includes('bottom')
      ) {
        zoneWidth = 3
        zoneHeight = 2
      } else {
        zoneWidth = 2
        zoneHeight = 3
      }

      // Create zone at edge position
      for (let dy = 0; dy < zoneHeight; dy++) {
        for (let dx = 0; dx < zoneWidth; dx++) {
          const x = edge.startX + dx
          const y = edge.startY + dy

          if (x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight) {
            const tile = this.getTile(x, y)
            if (tile) {
              if (tile.terrain !== TerrainTypes.MAGIC_CIRCLE) {
                tile.terrain = TerrainTypes.STARTING_ZONE
                tile.startingZoneOwner = playerId
              }
              zoneTiles.push({ x, y })
            }
          }
        }
      }

      players[playerId].startingZoneTiles = zoneTiles
    })
  }

  /**
   * Get starting positions on board edges for each player
   */
  getEdgePositionsForPlayers(numPlayers: number): EdgePosition[] {
    const positions: EdgePosition[] = []
    const minDistance = 10 // Minimum gap between starting zone EDGES

    // Generate all possible edge positions
    const possiblePositions: EdgePosition[] = []

    // Top edge - 3 wide x 2 deep
    for (let x = 0; x <= this.boardWidth - 3; x++) {
      possiblePositions.push({ startX: x, startY: 0, edge: 'top' })
    }

    // Bottom edge - 3 wide x 2 deep
    for (let x = 0; x <= this.boardWidth - 3; x++) {
      possiblePositions.push({ startX: x, startY: this.boardHeight - 2, edge: 'bottom' })
    }

    // Left edge - 2 wide x 3 deep
    for (let y = 2; y < this.boardHeight - 3; y++) {
      possiblePositions.push({ startX: 0, startY: y, edge: 'left' })
    }

    // Right edge - 2 wide x 3 deep
    for (let y = 2; y < this.boardHeight - 3; y++) {
      possiblePositions.push({ startX: this.boardWidth - 2, startY: y, edge: 'right' })
    }

    const getZoneDimensions = (edge: EdgePosition['edge']) => {
      if (edge === 'top' || edge === 'bottom') {
        return { width: 3, height: 2 }
      } else {
        return { width: 2, height: 3 }
      }
    }

    const getMinGapBetweenZones = (pos1: EdgePosition, pos2: EdgePosition) => {
      const dim1 = getZoneDimensions(pos1.edge)
      const dim2 = getZoneDimensions(pos2.edge)

      const zone1 = {
        left: pos1.startX,
        right: pos1.startX + dim1.width - 1,
        top: pos1.startY,
        bottom: pos1.startY + dim1.height - 1,
      }
      const zone2 = {
        left: pos2.startX,
        right: pos2.startX + dim2.width - 1,
        top: pos2.startY,
        bottom: pos2.startY + dim2.height - 1,
      }

      let horizGap = 0
      if (zone2.left > zone1.right) {
        horizGap = zone2.left - zone1.right - 1
      } else if (zone1.left > zone2.right) {
        horizGap = zone1.left - zone2.right - 1
      }

      let vertGap = 0
      if (zone2.top > zone1.bottom) {
        vertGap = zone2.top - zone1.bottom - 1
      } else if (zone1.top > zone2.bottom) {
        vertGap = zone1.top - zone2.bottom - 1
      }

      return horizGap + vertGap
    }

    const meetsMinDistance = (candidate: EdgePosition, existingPositions: EdgePosition[]) => {
      for (const existingPos of existingPositions) {
        if (getMinGapBetweenZones(candidate, existingPos) < minDistance) {
          return false
        }
      }
      return true
    }

    const getTotalDistance = (candidate: EdgePosition, existingPositions: EdgePosition[]) => {
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
    }

    // For subsequent players, maximize distance
    while (positions.length < numPlayers) {
      const validCandidates = possiblePositions.filter((candidate) =>
        meetsMinDistance(candidate, positions)
      )

      if (validCandidates.length === 0) {
        console.warn(
          `Could not find valid position for player ${positions.length + 1} with ${minDistance} tile spacing.`
        )
        break
      }

      const scoredCandidates = validCandidates.map((candidate) => ({
        position: candidate,
        totalDistance: getTotalDistance(candidate, positions),
      }))

      scoredCandidates.sort((a, b) => b.totalDistance - a.totalDistance)

      const topCount = Math.max(3, Math.ceil(scoredCandidates.length * 0.2))
      const topCandidates = scoredCandidates.slice(0, topCount)

      const selectedIndex = Math.floor(Math.random() * topCandidates.length)
      const selected = topCandidates[selectedIndex].position

      positions.push(selected)
    }

    // Fallback to corners
    if (positions.length < numPlayers) {
      console.warn(
        `Could not find ${numPlayers} positions with ${minDistance} tile spacing. Using fallback positions.`
      )
      positions.length = 0

      const fallbackPositions: EdgePosition[] = [
        { startX: 0, startY: 0, edge: 'top-left' },
        { startX: this.boardWidth - 3, startY: this.boardHeight - 2, edge: 'bottom-right' },
        { startX: this.boardWidth - 3, startY: 0, edge: 'top-right' },
        { startX: 0, startY: this.boardHeight - 2, edge: 'bottom-left' },
        { startX: Math.floor(this.boardWidth / 2) - 1, startY: 0, edge: 'top-center' },
      ]

      for (let i = 0; i < numPlayers; i++) {
        positions.push(fallbackPositions[i])
      }
    }

    return positions
  }

  // ============================================================================
  // MAGIC CIRCLES
  // ============================================================================

  /**
   * Add magic circles as 3-4 tile clusters
   * Only 40% of players receive a magic circle cluster
   */
  addMagicCircles(activePlayers: string[], players: Record<string, BoardPlayerLike>): void {
    const availableTiles = this.getAllTiles().filter((t) => t.terrain === TerrainTypes.NORMAL)

    const numCircles = Math.max(
      MAGIC_CIRCLE.MIN_CIRCLES,
      Math.round(activePlayers.length * MAGIC_CIRCLE.PLAYER_PERCENTAGE)
    )
    const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5)
    const selectedPlayers = shuffledPlayers.slice(0, numCircles)

    selectedPlayers.forEach((playerId) => {
      if (availableTiles.length === 0) return

      const clusterSize = 3 + Math.floor(Math.random() * 2) // 3 or 4
      let placed = 0

      const seedIndex = Math.floor(Math.random() * availableTiles.length)
      const seedTile = availableTiles[seedIndex]

      if (!seedTile) return

      seedTile.terrain = TerrainTypes.MAGIC_CIRCLE
      seedTile.owner = playerId
      players[playerId].magicCirclePosition = { x: seedTile.x, y: seedTile.y }
      placed++
      availableTiles.splice(seedIndex, 1)

      const cluster = [seedTile]
      for (let i = 0; i < clusterSize - 1 && placed < clusterSize; i++) {
        const baseTile = cluster[Math.floor(Math.random() * cluster.length)]
        const adjacentTiles = this.getAdjacentTiles(baseTile.x, baseTile.y).filter(
          (t) => availableTiles.includes(t) && t.terrain === TerrainTypes.NORMAL
        )

        if (adjacentTiles.length > 0) {
          const adjTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)]
          adjTile.terrain = TerrainTypes.MAGIC_CIRCLE
          adjTile.owner = playerId
          placed++
          cluster.push(adjTile)

          const availIndex = availableTiles.indexOf(adjTile)
          if (availIndex !== -1) {
            availableTiles.splice(availIndex, 1)
          }
        } else {
          break
        }
      }
    })
  }

  // ============================================================================
  // TREASURES
  // ============================================================================

  /**
   * Place treasure tokens on the board
   * Each faction draws 3 random tokens and places them on valid tiles
   */
  placeTreasures(activePlayers: string[], players: Record<string, BoardPlayerLike>): void {
    const minDistanceFromStart = TREASURE.MIN_DISTANCE_FROM_START
    const preferredTreasureSpacing = 3
    let treasureIdCounter = 0

    // Get all valid tiles for treasure placement
    const validTiles: Tile[] = []
    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        const tile = this.tiles[y][x]

        if (
          tile.terrain === TerrainTypes.DIFFICULT ||
          tile.terrain === TerrainTypes.MOUNTAIN ||
          tile.terrain === TerrainTypes.WATER ||
          tile.terrain === TerrainTypes.MAGIC_CIRCLE ||
          tile.terrain === TerrainTypes.STARTING_ZONE
        ) {
          continue
        }

        let tooCloseToStart = false
        for (const playerId of activePlayers) {
          const startingZone = players[playerId].startingZoneTiles
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

    // Place tokens for each faction
    activePlayers.forEach((playerId) => {
      const pool = createTokenPool()
      const drawnTokens = drawTokens(pool)

      drawnTokens.forEach((moraleValue) => {
        let placedSuccessfully = false
        let attempts = 0
        const maxAttempts = 100

        while (!placedSuccessfully && attempts < maxAttempts) {
          attempts++

          if (validTiles.length === 0) {
            console.warn(`No valid tiles available for treasure placement`)
            break
          }

          const randomIndex = Math.floor(Math.random() * validTiles.length)
          const candidateTile = validTiles[randomIndex]

          let tooCloseToOtherTreasure = false
          for (const existingTreasure of this.treasures) {
            const distance =
              Math.abs(candidateTile.x - existingTreasure.position.x) +
              Math.abs(candidateTile.y - existingTreasure.position.y)

            if (distance < preferredTreasureSpacing) {
              tooCloseToOtherTreasure = true
              break
            }
          }

          if (!tooCloseToOtherTreasure) {
            const treasure = new Treasure({
              id: `treasure-${treasureIdCounter++}`,
              owner: playerId,
              moraleValue,
              position: { x: candidateTile.x, y: candidateTile.y },
            })

            this.treasures.push(treasure)
            candidateTile.treasure = treasure
            placedSuccessfully = true
          } else if (attempts >= maxAttempts - 1) {
            const treasure = new Treasure({
              id: `treasure-${treasureIdCounter++}`,
              owner: playerId,
              moraleValue,
              position: { x: candidateTile.x, y: candidateTile.y },
            })

            this.treasures.push(treasure)
            candidateTile.treasure = treasure
            placedSuccessfully = true
            this.treasurePlacementStats.relaxedSpacing++
          }
        }
      })
    })
  }
}

export default Board
