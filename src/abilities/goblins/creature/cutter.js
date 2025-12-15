/**
 * CUTTER - Creature Ability
 *
 * Faction: Tyranny of Goblins
 * Creatures:
 *   - Goblin Cutter / tog_cr_5 (Tyranny of Goblins)
 *   - Goblin Cutter / tog_cr_6 (Tyranny of Goblins)
 *
 * +10 melee damage against tapped creatures
 * Applies 0/50/100 AI difficulty rule based on ATTACKER's owner
 */

export const Cutter = {
  id: 'cutter',
  name: 'Cutter',
  faction: 'Tyranny of Goblins',
  creature: 'Goblin Cutter',
  bonusDamage: 10,

  /**
   * Check if creature has CUTTER ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has CUTTER ability
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      ability => typeof ability === 'string' && ability.toUpperCase().includes('CUTTER')
    )
  },

  /**
   * Get CUTTER bonus damage (+10 if attacker has CUTTER and defender is tapped)
   * @param {Object} gameState - Game state for AI check
   * @param {CreatureInstance} attackerInstance - Creature making the attack
   * @param {CreatureInstance} defenderInstance - Target of the attack
   * @returns {number} Bonus damage (10 or 0)
   */
  getBonus(gameState, attackerInstance, defenderInstance) {
    if (!this.has(attackerInstance)) return 0
    if (!defenderInstance) return 0
    if (!defenderInstance.isTapped) return 0

    // AI difficulty check (0/50/100 rule)
    const attackerPlayer = gameState.players[attackerInstance.owner]
    if (attackerPlayer && !attackerPlayer.isHuman) {
      const aiDifficulty = attackerPlayer.aiDifficulty || 'medium'

      if (aiDifficulty === 'easy') {
        return 0  // Easy AI never uses CUTTER bonus
      } else if (aiDifficulty === 'medium') {
        if (Math.random() >= 0.5) {
          return 0  // Medium AI: 50% chance
        }
      }
    }

    return this.bonusDamage
  }
}

export default Cutter
