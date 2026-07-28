/**
 * TAP ON HIT - Creature Ability
 *
 * Faction: Tyranny of Goblins
 * Creatures:
 *   - Horned Devil / tog_cr_11 (Tyranny of Goblins)
 *   - Wolf / tog_cr_12 (Tyranny of Goblins)
 *
 * Whenever this creature deals melee damage, tap the target.
 */

export const TapOnHit = {
  id: 'tap_on_hit',
  name: 'Tap on Hit',
  faction: 'Tyranny of Goblins',

  /**
   * Check if creature has TAP ON HIT ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has TAP ON HIT ability
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature) return false

    // Check direct property first (most efficient)
    if (creatureInstance.creature.tapOnHit === true) {
      return true
    }

    // Fallback: check specialAbilities array
    if (!creatureInstance.creature.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) =>
        (typeof ability === 'object' && ability.id === 'tap_on_hit') ||
        (typeof ability === 'string' &&
          ability.toUpperCase().includes('TAP') &&
          ability.toUpperCase().includes('HIT'))
    )
  },

  /**
   * Apply TAP ON HIT effect to target
   * @param {CreatureInstance} targetInstance - The target that was hit
   * @returns {boolean} True if target was tapped
   */
  apply(targetInstance) {
    if (!targetInstance) return false
    if (targetInstance.currentHP <= 0) return false
    if (targetInstance.isTapped) return false

    targetInstance.tap()
    return true
  },
}

export default TapOnHit
