/**
 * REACH - Creature Ability
 *
 * Faction: Tyranny of Goblins
 * Creatures:
 *   - Horned Devil / tog_cr_11 (Tyranny of Goblins)
 *
 * Creature can make melee attacks at extended range (typically 2 tiles)
 */
import type { CreatureInstance } from '../../../models/creatures.js'

export const Reach = {
  id: 'reach',
  name: 'Reach',
  faction: 'Tyranny of Goblins',
  creature: 'Horned Devil',

  /**
   * Check if creature has REACH ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    return this.getDistance(creatureInstance) > 1
  },

  /**
   * Get the reach distance for a creature
   * @returns Reach distance (0 if no reach ability, typically 2 for REACH 2)
   */
  getDistance(creatureInstance: CreatureInstance): number {
    if (!creatureInstance?.creature) return 0
    return creatureInstance.creature.reach || 0
  },

  /**
   * Check if target is within reach range for melee attack
   */
  isInRange(
    attacker: CreatureInstance,
    attackerPos: { x: number; y: number },
    targetPos: { x: number; y: number }
  ): boolean {
    let reach = this.getDistance(attacker)
    if (reach === 0) reach = 1 // Default melee range

    const dx = Math.abs(attackerPos.x - targetPos.x)
    const dy = Math.abs(attackerPos.y - targetPos.y)

    // Chebyshev distance for grid-based movement
    return Math.max(dx, dy) <= reach
  },
}

export default Reach
