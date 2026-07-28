/**
 * BURROW - Creature Ability
 *
 * Factions: Heart of Cormyr, Sting of Lolth
 * Creatures:
 *   - Earth Guardian / hoc_cr_6 (Heart of Cormyr)
 *   - Umber Hulk / sol_cr_12 (Sting of Lolth)
 *
 * Allows movement through MOUNTAIN tiles (cost=1) but cannot stop on them
 * Unlike FLYING, burrowing creatures still take water damage
 */
import type { CreatureInstance } from '../../models/creatures.js'

export const Burrow = {
  id: 'burrow',
  name: 'Burrow',

  /**
   * Check if creature has BURROW ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('BURROW')
    )
  },

  /**
   * Check if burrowing creature can move through terrain
   * @returns True if creature can pass through
   */
  canPassThrough(_terrainType: string): boolean {
    return true // Can pass through mountains
  },

  /**
   * Check if burrowing creature can end movement on terrain
   */
  canEndMovementOn(terrainType: string): boolean {
    return terrainType !== 'mountain' // Cannot stop on mountains
  },

  /**
   * Get movement cost for burrowing through mountain
   * @returns Movement cost (1 for mountains, null = use normal terrain cost)
   */
  getMovementCost(terrainType: string): number | null {
    if (terrainType === 'mountain') return 1
    return null // Use normal terrain cost
  },

  /**
   * Check if creature takes water damage
   * @returns Always true - burrowing creatures DO take water damage
   */
  takesWaterDamage(): boolean {
    return true
  },
}

export default Burrow
