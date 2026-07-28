/**
 * FLYING - Creature Ability
 *
 * Factions: Curse of Undeath, Heart of Cormyr, Tyranny of Goblins
 * Creatures:
 *   - Dracolich / cou_cr_2 (Curse of Undeath)
 *   - Copper Dragon / hoc_cr_1 (Heart of Cormyr)
 *   - Horned Devil / tog_cr_11 (Tyranny of Goblins)
 *
 * Flying creatures ignore terrain movement costs (all tiles cost 1)
 * Cannot land on mountains
 * Immune to water damage
 */
import type { CreatureInstance } from '../../models/creatures.js'

export const Flying = {
  id: 'flying',
  name: 'Flying',

  /**
   * Check if creature has FLYING ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toLowerCase().includes('flying')
    )
  },

  /**
   * Get movement cost for a flying creature on any terrain
   * @returns Always returns 1 (flying ignores terrain)
   */
  getMovementCost(): number {
    return 1
  },

  /**
   * Check if flying creature can land on terrain
   */
  canLandOn(terrainType: string): boolean {
    return terrainType !== 'mountain'
  },

  /**
   * Check if creature takes water damage
   * @returns Always false - flying creatures don't take water damage
   */
  takesWaterDamage(): boolean {
    return false
  },
}

export default Flying
