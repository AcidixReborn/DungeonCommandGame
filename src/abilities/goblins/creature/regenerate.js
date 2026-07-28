/**
 * REGENERATE - Creature Ability
 *
 * Faction: Tyranny of Goblins
 * Creatures:
 *   - Feral Troll / tog_cr_2 (Tyranny of Goblins)
 *
 * At the start of controller's REFRESH phase, heal damage
 * Works regardless of tap state, does NOT consume action
 */

import { ABILITIES } from '../../../constants/gameConstants.js'

export const Regenerate = {
  id: 'regenerate',
  name: 'Regenerate',
  faction: 'Tyranny of Goblins',
  creature: 'Feral Troll',

  /**
   * Check if creature has REGENERATE ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has REGENERATE
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('REGENERATE')
    )
  },

  /**
   * Get the regeneration amount for a creature
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {number} Amount to regenerate (default 10 for REGENERATE 10, 0 if no ability)
   */
  getAmount(creatureInstance) {
    if (!this.has(creatureInstance)) return 0

    // Parse amount from ability text if needed, default to 10
    const ability = creatureInstance.creature.specialAbilities.find(
      (a) => typeof a === 'string' && a.toUpperCase().includes('REGENERATE')
    )
    if (ability) {
      const match = ability.match(/REGENERATE\s*(\d+)/i)
      if (match) return parseInt(match[1], 10)
    }
    return ABILITIES.REGENERATE_DEFAULT
  },

  /**
   * Apply regeneration healing to a creature
   * @param {CreatureInstance} creatureInstance - Creature to heal
   * @returns {number} Amount actually healed
   */
  apply(creatureInstance) {
    const amount = this.getAmount(creatureInstance)
    if (amount <= 0) return 0

    const maxHP = creatureInstance.creature.hp
    const currentHP = creatureInstance.currentHP
    const actualHeal = Math.min(amount, maxHP - currentHP)

    if (actualHeal > 0) {
      creatureInstance.currentHP += actualHeal
    }

    return actualHeal
  },
}

export default Regenerate
