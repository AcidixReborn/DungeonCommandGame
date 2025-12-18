/**
 * DEATH STRIKE - Creature Ability
 *
 * Faction: Blood of Gruumsh
 * Creatures:
 *   - Boar / bog_cr_1 (Blood of Gruumsh)
 *   - Wereboar / bog_cr_12 (Blood of Gruumsh)
 *
 * This creature's melee attacks deal double damage to tapped creatures.
 * Applies 0/50/100 AI difficulty rule
 */

export const DeathStrike = {
  id: 'death_strike',
  name: 'Death Strike',
  faction: 'Blood of Gruumsh',

  /**
   * Check if creature has DEATH STRIKE ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has DEATH STRIKE
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) {
      return false
    }
    return creatureInstance.creature.specialAbilities.some(
      ability => {
        const isObjectMatch = typeof ability === 'object' && ability.id === 'death_strike'
        const isStringMatch = typeof ability === 'string' && ability.toUpperCase().includes('DEATH STRIKE')
        return isObjectMatch || isStringMatch
      }
    )
  },

  /**
   * Get damage multiplier for DEATH STRIKE
   * @param {Object} gameState - Game state for AI check
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The target creature
   * @returns {number} Damage multiplier (2 if triggered, 1 otherwise)
   */
  getMultiplier(gameState, attackerInstance, defenderInstance) {
    if (!this.has(attackerInstance)) return 1
    if (!defenderInstance) return 1
    if (!defenderInstance.isTapped) return 1

    // AI difficulty check
    const attackerPlayer = gameState.players[attackerInstance.owner]
    if (attackerPlayer && !attackerPlayer.isHuman) {
      const aiDifficulty = attackerPlayer.aiDifficulty || 'medium'

      if (aiDifficulty === 'easy') {
        return 1  // Easy AI never uses DEATH STRIKE
      } else if (aiDifficulty === 'medium') {
        if (Math.random() >= 0.5) {
          return 1  // Medium AI: 50% chance
        }
      }
    }

    return 2  // Double damage
  }
}

export default DeathStrike
