/**
 * LIFE DRAIN - Creature Ability
 *
 * Faction: Curse of Undeath
 * Creatures:
 *   - Vampire Stalker / cou_cr_8 (Curse of Undeath)
 *
 * After dealing damage with a melee attack, heal 10 HP (capped at max HP)
 */

import { ABILITIES } from '../../../constants/gameConstants.js'

export const LifeDrain = {
  id: 'life_drain',
  name: 'Life Drain',
  faction: 'Curse of Undeath',
  creature: 'Vampire Stalker',
  healAmount: ABILITIES.LIFE_DRAIN_HEAL,

  /**
   * Check if creature has LIFE DRAIN ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has LIFE DRAIN ability
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      a => typeof a === 'string' && a.toUpperCase().includes('LIFE DRAIN')
    )
  },

  /**
   * Apply LIFE DRAIN healing (10 HP, capped at max HP)
   * @param {CreatureInstance} attackerInstance - The attacking creature instance
   * @returns {number} Amount actually healed (0 if already at max HP)
   */
  apply(attackerInstance) {
    if (!attackerInstance) return 0

    const maxHP = attackerInstance.creature.hitPoints
    const currentHP = attackerInstance.currentHP
    const healAmount = Math.min(this.healAmount, maxHP - currentHP)

    if (healAmount > 0) {
      attackerInstance.currentHP += healAmount
    }

    return healAmount
  }
}

export default LifeDrain
