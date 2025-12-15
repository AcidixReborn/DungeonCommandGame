/**
 * SLAM - Creature Ability
 *
 * Faction: Heart of Cormyr
 * Creatures:
 *   - Earth Guardian / hoc_cr_6 (Heart of Cormyr)
 *
 * Whenever an adjacent creature takes damage from this creature's attack,
 * slide the damaged creature up to 3 squares.
 */

export const Slam = {
  id: 'slam',
  name: 'Slam',
  faction: 'Heart of Cormyr',
  creature: 'Earth Guardian',
  maxDistance: 3,

  /**
   * Check if creature has SLAM ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has SLAM ability
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      ability => typeof ability === 'string' && ability.toUpperCase().includes('SLAM')
    )
  },

  /**
   * Get valid tiles where a creature can be slammed to
   * Uses BFS - mountains block, all other tiles cost 1
   * Cannot stop on occupied tiles
   * @param {Object} gameState - Game state for tile lookup
   * @param {CreatureInstance} targetInstance - Creature being slammed
   * @param {number} maxDistance - Maximum slide distance (default 3)
   * @returns {Array} Array of {x, y} valid destinations
   */
  getValidTiles(gameState, targetInstance, maxDistance = 3) {
    if (!targetInstance?.position) return []

    const validTiles = []
    const startPos = targetInstance.position

    // BFS to find all reachable tiles within maxDistance
    const visited = new Set()
    const queue = [{ pos: startPos, cost: 0 }]
    visited.add(`${startPos.x},${startPos.y}`)

    while (queue.length > 0) {
      const { pos, cost } = queue.shift()

      // 8-directional movement (includes diagonals)
      const directions = [
        { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
      ]

      for (const dir of directions) {
        const newX = pos.x + dir.dx
        const newY = pos.y + dir.dy
        const key = `${newX},${newY}`

        if (visited.has(key)) continue
        visited.add(key)

        const tile = gameState.getTile(newX, newY)
        if (!tile) continue

        // Mountains block completely
        if (tile.terrain === 'MOUNTAIN') continue

        const newCost = cost + 1
        if (newCost > maxDistance) continue

        // Can pass through occupied tiles but cannot stop on them
        if (!tile.occupant) {
          validTiles.push({ x: newX, y: newY })
        }

        // Continue BFS even through occupied tiles
        queue.push({ pos: { x: newX, y: newY }, cost: newCost })
      }
    }

    return validTiles
  },

  /**
   * Execute SLAM slide - move creature to new position
   * @param {Object} gameState - Game state for tile lookup
   * @param {CreatureInstance} targetInstance - Creature being slammed
   * @param {Object} destination - {x, y} destination position
   * @returns {Object} Result with oldPosition and newPosition
   */
  execute(gameState, targetInstance, destination) {
    const oldPosition = { ...targetInstance.position }
    const oldTile = gameState.getTile(oldPosition.x, oldPosition.y)
    const newTile = gameState.getTile(destination.x, destination.y)

    // Clear old tile
    if (oldTile) {
      oldTile.occupant = null
    }

    // Move creature to new tile
    if (newTile) {
      newTile.occupant = targetInstance
    }
    targetInstance.position = { x: destination.x, y: destination.y }

    return { oldPosition, newPosition: { x: destination.x, y: destination.y } }
  }
}

export default Slam
