// A* Pathfinding Algorithm for Dungeon Command
// Finds optimal paths with proper movement cost calculation

/**
 * Node class for A* pathfinding
 */
export class PathfindingNode {
  constructor(x, y, g = 0, h = 0, parent = null) {
    this.x = x
    this.y = y
    this.g = g // Cost from start to this node
    this.h = h // Heuristic cost to goal
    this.f = g + h // Total cost (g + h)
    this.parent = parent // Parent node for path reconstruction
  }

  /**
   * Check if two nodes represent the same position
   */
  equals(other) {
    return this.x === other.x && this.y === other.y
  }
}

/**
 * A* pathfinding algorithm
 * @param {Object} start - Starting position {x, y}
 * @param {Object} goal - Goal position {x, y}
 * @param {Function} getTerrainCost - Function to get terrain movement cost (terrain, flying) => number
 * @param {Function} isPassable - Function to check if tile is passable (tile, flying) => boolean
 * @param {Function} getTile - Function to get tile at position (x, y) => tile
 * @param {Object} options - Options: { flying: boolean, maxCost: number }
 * @returns {Object|null} - { path: [{x, y},...], cost: number } or null if no path found
 */
export function findPath(start, goal, getTerrainCost, isPassable, getTile, options = {}) {
  const { flying = false, maxCost = Infinity } = options

  const openList = []
  const closedList = []

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
      if (closedList.some(n => n.equals(neighbor))) continue

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
      const existingIndex = openList.findIndex(n => n.equals(neighbor))

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
 * @param {PathfindingNode} node - Current node
 * @param {Object} goal - Goal position {x, y}
 * @returns {number} Estimated distance to goal
 */
function heuristic(node, goal) {
  return Math.abs(node.x - goal.x) + Math.abs(node.y - goal.y)
}

/**
 * Get all neighboring tiles (8-directional movement - includes diagonals)
 * @param {PathfindingNode} node - Current node
 * @param {Function} getTile - Function to get tile at position
 * @returns {Array<PathfindingNode>} Array of neighbor nodes
 */
function getNeighbors(node, getTile) {
  const neighbors = []
  const directions = [
    { dx: 0, dy: -1 },   // North
    { dx: 1, dy: -1 },   // Northeast
    { dx: 1, dy: 0 },    // East
    { dx: 1, dy: 1 },    // Southeast
    { dx: 0, dy: 1 },    // South
    { dx: -1, dy: 1 },   // Southwest
    { dx: -1, dy: 0 },   // West
    { dx: -1, dy: -1 }   // Northwest
  ]

  directions.forEach(dir => {
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
 * @param {PathfindingNode} goalNode - Final node reached
 * @returns {Object} {path: Array, cost: number}
 */
function reconstructPath(goalNode) {
  const path = []
  let current = goalNode
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
 * Big O: O((V + E) * log V) where V = tiles in range, E = edges (8 per tile)
 * For typical movement range of 7: V ≈ 150 tiles, so O(150 * 8 * log 150) ≈ O(8700)
 *
 * @param {Object} start - Starting position {x, y}
 * @param {number} maxMovement - Maximum movement points
 * @param {Function} getTerrainCost - Function to get terrain cost
 * @param {Function} isPassable - Function to check if tile is passable
 * @param {Function} getTile - Function to get tile at position
 * @param {boolean} flying - Whether creature is flying
 * @returns {Array} - Array of {tile, path, cost} objects
 */
export function getValidMovementTiles(start, maxMovement, getTerrainCost, isPassable, getTile, flying = false) {
  const validTiles = []
  // Track best cost to reach each tile (allows updating if better path found)
  const bestCost = new Map()
  // Track best path to reach each tile
  const bestPath = new Map()

  // Priority queue: sorted by cost (lowest first) - Dijkstra's algorithm
  // Using array with sort for simplicity; could use a proper heap for better perf
  const queue = [{ node: new PathfindingNode(start.x, start.y, 0, 0), path: [start] }]

  const startKey = `${start.x},${start.y}`
  bestCost.set(startKey, 0)
  bestPath.set(startKey, [start])

  while (queue.length > 0) {
    // Sort by cost and take lowest - O(n log n) per iteration
    // For better performance, could use a binary heap: O(log n) per iteration
    queue.sort((a, b) => a.node.g - b.node.g)
    const { node: current, path } = queue.shift()

    const currentKey = `${current.x},${current.y}`

    // Skip if we've already found a better path to this node
    if (bestCost.has(currentKey) && current.g > bestCost.get(currentKey)) {
      continue
    }

    // Get all neighbors
    const neighbors = getNeighbors(current, getTile)

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`

      const tile = getTile(neighbor.x, neighbor.y)
      if (!tile) continue

      // Skip occupied tiles completely - cannot move through OR stop on them
      if (tile.occupant) continue

      // Check if passable (terrain check)
      if (!isPassable(tile, flying)) continue

      // Calculate cost to reach this tile
      const terrainCost = getTerrainCost(tile.terrain, flying)
      const newCost = current.g + terrainCost

      // Skip if exceeds movement range
      if (newCost > maxMovement) continue

      // Only process if this is a better path than previously found
      if (!bestCost.has(key) || newCost < bestCost.get(key)) {
        bestCost.set(key, newCost)

        const newPath = [...path, { x: neighbor.x, y: neighbor.y }]
        bestPath.set(key, newPath)

        // Add to queue for further exploration
        neighbor.g = newCost
        queue.push({ node: neighbor, path: newPath })
      }
    }
  }

  // Convert bestCost/bestPath maps to result array (excluding start position)
  for (const [key, cost] of bestCost.entries()) {
    if (key === startKey) continue // Don't include starting position

    const [x, y] = key.split(',').map(Number)
    const tile = getTile(x, y)

    validTiles.push({
      tile,
      path: bestPath.get(key),
      cost
    })
  }

  return validTiles
}
