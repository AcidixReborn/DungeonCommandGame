/**
 * PHASING - Creature Ability
 *
 * Faction: Curse of Undeath
 * Creatures:
 *   - Hypnotic Spirit / cou_cr_4 (Curse of Undeath)
 *
 * Works like FLYING (ignores terrain, all costs 1) but can also move through other creatures
 * Cannot end movement on mountains or other creatures
 * Immune to water damage (like flying)
 */
import type { CreatureInstance } from '../../../models/creatures.js'

export const Phasing = {
  id: 'phasing',
  name: 'Phasing',
  faction: 'Curse of Undeath',
  creature: 'Hypnotic Spirit',

  /**
   * Check if creature has PHASING ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('PHASING')
    )
  },

  /**
   * Get movement cost for a phasing creature on any terrain
   * @returns Always returns 1 (phasing ignores terrain)
   */
  getMovementCost(): number {
    return 1
  },

  /**
   * Check if phasing creature can move through a tile occupied by another creature
   * @returns Always true - phasing can move through creatures
   */
  canMoveThroughCreatures(): boolean {
    return true
  },

  /**
   * Check if phasing creature can end movement on a tile
   * @param hasCreature - Whether tile has another creature
   */
  canEndMovementOn(terrainType: string, hasCreature: boolean): boolean {
    if (terrainType === 'mountain') return false
    if (hasCreature) return false
    return true
  },

  /**
   * Check if creature takes water damage
   * @returns Always false - phasing creatures don't take water damage
   */
  takesWaterDamage(): boolean {
    return false
  },
}

export default Phasing
