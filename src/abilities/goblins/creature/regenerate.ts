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
import type { CreatureInstance } from '../../../models/creatures.js'

export const Regenerate = {
  id: 'regenerate',
  name: 'Regenerate',
  faction: 'Tyranny of Goblins',
  creature: 'Feral Troll',

  /**
   * Check if creature has REGENERATE ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('REGENERATE')
    )
  },

  /**
   * Get the regeneration amount for a creature
   * @returns Amount to regenerate (default 10 for REGENERATE 10, 0 if no ability)
   */
  getAmount(creatureInstance: CreatureInstance): number {
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
   * @returns Amount actually healed
   */
  apply(creatureInstance: CreatureInstance): number {
    const amount = this.getAmount(creatureInstance)
    if (amount <= 0) return 0

    // Bug fix: was reading `creature.hp`, which doesn't exist on the Creature model
    // (the field is `hitPoints`) - maxHP was always undefined, so actualHeal was always
    // NaN and REGENERATE never healed anything. Caught by the TypeScript conversion.
    const maxHP = creatureInstance.creature.hitPoints
    const currentHP = creatureInstance.currentHP
    const actualHeal = Math.min(amount, maxHP - currentHP)

    if (actualHeal > 0) {
      creatureInstance.currentHP += actualHeal
    }

    return actualHeal
  },
}

export default Regenerate
