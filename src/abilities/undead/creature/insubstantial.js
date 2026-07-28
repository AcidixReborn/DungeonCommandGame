/**
 * INSUBSTANTIAL - Creature Ability
 *
 * Faction: Curse of Undeath
 * Creatures:
 *   - Hypnotic Spirit / cou_cr_4 (Curse of Undeath)
 *
 * Prevents all damage from 1 source, then resets at owner's refresh phase
 * Follows 0/50/100 AI difficulty rule for automatic usage
 */

export const Insubstantial = {
  id: 'insubstantial',
  name: 'Insubstantial',
  faction: 'Curse of Undeath',
  creature: 'Hypnotic Spirit',

  /**
   * Check if creature has INSUBSTANTIAL ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has INSUBSTANTIAL
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('INSUBSTANTIAL')
    )
  },

  /**
   * Check if creature can use INSUBSTANTIAL ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has INSUBSTANTIAL and hasn't used it yet
   */
  canUse(creatureInstance) {
    return this.has(creatureInstance) && !creatureInstance.insubstantialUsed
  },

  /**
   * Attempt to use INSUBSTANTIAL ability to block damage
   * Applies 0/50/100 AI difficulty rule for AI players
   * @param {CreatureInstance} creatureInstance - Creature attempting to use ability
   * @param {Object} defenderPlayer - The player who owns the defender
   * @returns {boolean} True if damage was blocked, false otherwise
   */
  use(creatureInstance, defenderPlayer) {
    if (!this.canUse(creatureInstance)) return false

    // AI difficulty check (0/50/100 rule)
    if (defenderPlayer && !defenderPlayer.isHuman) {
      const aiDifficulty = defenderPlayer.aiDifficulty || 'medium'

      if (aiDifficulty === 'easy') {
        return false // Easy AI never uses ability
      } else if (aiDifficulty === 'medium') {
        if (Math.random() >= 0.5) {
          return false // Medium AI: 50% chance
        }
      }
      // Hard AI: always use
    }

    // Mark ability as used
    creatureInstance.insubstantialUsed = true
    return true // Damage blocked
  },

  /**
   * Reset INSUBSTANTIAL ability at refresh phase
   * @param {CreatureInstance} creatureInstance - Creature to reset
   */
  reset(creatureInstance) {
    if (this.has(creatureInstance)) {
      creatureInstance.insubstantialUsed = false
      creatureInstance.insubstantialAvailable = true
    }
  },
}

export default Insubstantial
