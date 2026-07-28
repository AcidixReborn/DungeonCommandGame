// A* Pathfinding Algorithm for Dungeon Command
// Finds optimal paths with proper movement cost calculation

import { PriorityQueue } from './PriorityQueue.js'

export interface Position {
  x: number
  y: number
}

// Loose shape for now — Board.ts (converted later in the migration) will define the
// canonical Tile type; pathfinding only needs `terrain` and `occupant` off of it.
export interface PathTile {
  terrain: string
  occupant?: unknown
  [key: string]: unknown
}

export type GetTerrainCostFn = (terrain: string, flying: boolean) => number
export type IsPassableFn = (tile: PathTile, flying: boolean) => boolean
export type GetTileFn = (x: number, y: number) => PathTile | null
export type CanPassThroughFn = (tile: PathTile, occupant: unknown) => boolean
export type CanStopOnFn = (tile: PathTile) => boolean

export interface FindPathOptions {
  flying?: boolean
  maxCost?: number
}

export interface ValidMovementTile {
  tile: PathTile | null
  path: Position[]
  cost: number
}

/**
 * Node class for A* pathfinding
 */
export class PathfindingNode {
  x: number
  y: number
  g: number // Cost from start to this node
  h: number // Heuristic cost to goal
  f: number // Total cost (g + h)
  parent: PathfindingNode | null

  constructor(x: number, y: number, g = 0, h = 0, parent: PathfindingNode | null = null) {
    this.x = x
    this.y = y
    this.g = g
    this.h = h
    this.f = g + h
    this.parent = parent
  }

  /**
   * Check if two nodes represent the same position
   */
  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y
  }
}

/**
 * A* pathfinding algorithm
 * @param start - Starting position {x, y}
 * @param goal - Goal position {x, y}
 * @param getTerrainCost - Function to get terrain movement cost (terrain, flying) => number
 * @param isPassable - Function to check if tile is passable (tile, flying) => boolean
 * @param getTile - Function to get tile at position (x, y) => tile
 * @param options - Options: { flying: boolean, maxCost: number }
 * @returns { path: [{x, y},...], cost: number } or null if no path found
 */
export function findPath(
  start: Position,
  goal: Position,
  getTerrainCost: GetTerrainCostFn,
  isPassable: IsPassableFn,
  getTile: GetTileFn,
  options: FindPathOptions = {}
): { path: Position[]; cost: number } | null {
  const { flying = false, maxCost = Infinity } = options

  const openList: PathfindingNode[] = []
  const closedList: PathfindingNode[] = []

  // Create start node
  const startNode = new PathfindingNode(start.x, start.y, 0, heuristic(start, goal))
  openList.push(startNode)

  while (openList.length > 0) {
    // Find node with lowest f cost in open list
    let currentIndex = 0
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[currentIndex].f) {
        currentIndex = i
      }
    }

    const current = openList[currentIndex]

    // Reached goal?
    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(current)
    }

    // Move current from open to closed list
    openList.splice(currentIndex, 1)
    closedList.push(current)

    // Check all neighbors
    const neighbors = getNeighbors(current, getTile)

    for (const neighbor of neighbors) {
      // Skip if already evaluated
      if (closedList.some((n) => n.equals(neighbor))) continue

      const tile = getTile(neighbor.x, neighbor.y)
      if (!tile) continue

      // Skip if not passable
      if (!isPassable(tile, flying)) continue

      // Calculate cost to move to this neighbor
      const terrainCost = getTerrainCost(tile.terrain, flying)
      const tentative_g = current.g + terrainCost

      // Skip if this path exceeds max cost
      if (tentative_g > maxCost) continue

      // Check if neighbor is in open list
      const existingIndex = openList.findIndex((n) => n.equals(neighbor))

      if (existingIndex === -1) {
        // New node - add to open list
        neighbor.g = tentative_g
        neighbor.h = heuristic(neighbor, goal)
        neighbor.f = neighbor.g + neighbor.h
        neighbor.parent = current
        openList.push(neighbor)
      } else if (tentative_g < openList[existingIndex].g) {
        // Found better path to existing node
        openList[existingIndex].g = tentative_g
        openList[existingIndex].f = tentative_g + openList[existingIndex].h
        openList[existingIndex].parent = current
      }
    }
  }

  // No path found
  return null
}

/**
 * Manhattan distance heuristic for grid-based pathfinding
 */
function heuristic(node: Position, goal: Position): number {
  return Math.abs(node.x - goal.x) + Math.abs(node.y - goal.y)
}

/**
 * Get all neighboring tiles (8-directional movement - includes diagonals)
 */
function getNeighbors(node: Position, getTile: GetTileFn): PathfindingNode[] {
  const neighbors: PathfindingNode[] = []
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
    const x = node.x + dir.dx
    const y = node.y + dir.dy

    if (getTile(x, y)) {
      neighbors.push(new PathfindingNode(x, y))
    }
  })

  return neighbors
}

/**
 * Reconstruct the path from goal node by following parent links
 */
function reconstructPath(goalNode: PathfindingNode): { path: Position[]; cost: number } {
  const path: Position[] = []
  let current: PathfindingNode | null = goalNode
  const totalCost = goalNode.g

  while (current !== null) {
    path.unshift({ x: current.x, y: current.y })
    current = current.parent
  }

  return { path, cost: totalCost }
}

/**
 * Get all valid movement tiles within movement range using Dijkstra's algorithm
 *
 * BUG FIX: Previous BFS implementation didn't find optimal paths when terrain
 * costs vary (e.g., forest=2, normal=1). BFS explores by tile count, not cost,
 * so a 2-tile path through forest (cost 4) would be found before a 3-tile path
 * through normal terrain (cost 3), incorrectly marking the tile as visited.
 *
 * Dijkstra's algorithm uses a priority queue ordered by cost, ensuring we always
 * find the lowest-cost path to each tile.
 *
 * PERFORMANCE: Now uses binary heap PriorityQueue for O(log n) insert/extract
 * instead of array.sort() which was O(n log n) per iteration.
 *
 * Big O: O((V + E) * log V) where V = tiles in range, E = edges (8 per tile)
 * For typical movement range of 7: V ~ 150 tiles, so O(150 * 8 * log 150) ~ O(8700)
 *
 * @param canPassThrough - Optional callback (tile, occupant) => boolean for SCUTTLE ability
 * @param canStopOn - Optional callback (tile) => boolean for tiles that can be passed but not stopped on (e.g., mountains for flying/burrowing)
 */
export function getValidMovementTiles(
  start: Position,
  maxMovement: number,
  getTerrainCost: GetTerrainCostFn,
  isPassable: IsPassableFn,
  getTile: GetTileFn,
  flying = false,
  canPassThrough: CanPassThroughFn | null = null,
  canStopOn: CanStopOnFn | null = null
): ValidMovementTile[] {
  const validTiles: ValidMovementTile[] = []
  // Track best cost to reach each tile (allows updating if better path found)
  const bestCost = new Map<string, number>()
  // Track best path to reach each tile
  const bestPath = new Map<string, Position[]>()
  // Track tiles that are occupied (for SCUTTLE - can pass through but not stop on)
  const occupiedTiles = new Set<string>()
  // Track tiles that can be passed through but not stopped on (for FLYING/BURROW - mountains)
  const noStopTiles = new Set<string>()

  // Priority queue using binary heap - O(log n) insert/extract
  // Compare by node.g (cost from start)
  const queue = new PriorityQueue<{ node: PathfindingNode; path: Position[] }>(
    (a, b) => a.node.g - b.node.g
  )
  queue.insert({ node: new PathfindingNode(start.x, start.y, 0, 0), path: [start] })

  const startKey = `${start.x},${start.y}`
  bestCost.set(startKey, 0)
  bestPath.set(startKey, [start])

  while (!queue.isEmpty()) {
    // Extract minimum cost node - O(log n)
    const { node: current, path } = queue.extractMin() as {
      node: PathfindingNode
      path: Position[]
    }

    const currentKey = `${current.x},${current.y}`

    // Skip if we've already found a better path to this node
    const knownCost = bestCost.get(currentKey)
    if (knownCost !== undefined && current.g > knownCost) {
      continue
    }

    // Get all neighbors
    const neighbors = getNeighbors(current, getTile)

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`

      const tile = getTile(neighbor.x, neighbor.y)
      if (!tile) continue

      // Handle occupied tiles
      if (tile.occupant) {
        // Check if creature can pass through (SCUTTLE ability)
        if (!canPassThrough || !canPassThrough(tile, tile.occupant)) {
          // No SCUTTLE or callback returns false - block movement completely
          continue
        }
        // SCUTTLE: Can pass through but cannot stop here
        // Mark as occupied so it won't be included in final valid destinations
        occupiedTiles.add(key)
      }

      // Check if passable (terrain check)
      if (!isPassable(tile, flying)) continue

      // Check if this tile can be stopped on (FLYING/BURROW: can pass through mountains but not stop)
      if (canStopOn && !canStopOn(tile)) {
        // Can pass through but cannot stop here
        noStopTiles.add(key)
      }

      // Calculate cost to reach this tile
      // SCUTTLE: Moving through a creature costs 1 speed (ignores terrain cost for that tile)
      const isOccupied = tile.occupant !== null && tile.occupant !== undefined
      const terrainCost = isOccupied ? 1 : getTerrainCost(tile.terrain, flying)
      const newCost = current.g + terrainCost

      // Skip if exceeds movement range
      if (newCost > maxMovement) continue

      // Only process if this is a better path than previously found
      const existingCost = bestCost.get(key)
      if (existingCost === undefined || newCost < existingCost) {
        bestCost.set(key, newCost)

        const newPath = [...path, { x: neighbor.x, y: neighbor.y }]
        bestPath.set(key, newPath)

        // Add to queue for further exploration - O(log n)
        neighbor.g = newCost
        queue.insert({ node: neighbor, path: newPath })
      }
    }
  }

  // Convert bestCost/bestPath maps to result array (excluding start position, occupied tiles, and no-stop tiles)
  for (const [key, cost] of bestCost.entries()) {
    if (key === startKey) continue // Don't include starting position
    if (occupiedTiles.has(key)) continue // SCUTTLE: Don't include tiles with creatures (can pass through but not stop)
    if (noStopTiles.has(key)) continue // FLYING/BURROW: Don't include mountains (can pass through but not stop)

    const [x, y] = key.split(',').map(Number)
    const tile = getTile(x, y)

    validTiles.push({
      tile,
      path: bestPath.get(key) as Position[],
      cost,
    })
  }

  return validTiles
}
