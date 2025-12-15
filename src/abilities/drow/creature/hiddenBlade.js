/**
 * HIDDEN BLADE - Creature Ability
 *
 * Faction: Sting of Lolth
 * Creatures:
 *   - Drow Assassin / sol_cr_4 (Sting of Lolth)
 *
 * After ANY attack (melee or ranged) deals damage, can deal 10 damage to an
 * adjacent TAPPED enemy creature. Check happens AFTER attack resolves so
 * defense card usage counts (defender becomes tapped after using defense).
 */

import { ABILITIES } from '../../../constants/gameConstants.js'

export const HiddenBlade = {
  id: 'hidden_blade',
  name: 'Hidden Blade',
  faction: 'Sting of Lolth',
  creature: 'Drow Assassin',
  damage: ABILITIES.HIDDEN_BLADE_DAMAGE,

  /**
   * Check if creature has HIDDEN BLADE ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has HIDDEN BLADE
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      ability => typeof ability === 'string' && ability.toUpperCase().includes('HIDDEN BLADE')
    )
  },

  /**
   * Get valid targets for HIDDEN BLADE damage
   * Returns adjacent enemy creatures that are TAPPED
   * Unlike FLASHING BLADES, this CAN include the original target if it became tapped
   * @param {Object} gameState - Game state for adjacency lookup
   * @param {CreatureInstance} attackerInstance - The Drow Assassin
   * @returns {Array} Array of valid target CreatureInstances (must be tapped)
   */
  getTargets(gameState, attackerInstance) {
    if (!this.has(attackerInstance)) return []
    if (!attackerInstance.position) return []

    const targets = []
    const adjacent = gameState.getAdjacentTiles8Dir(attackerInstance.position.x, attackerInstance.position.y)

    for (const tile of adjacent) {
      const occupant = tile.occupant
      if (occupant &&
          occupant.owner !== attackerInstance.owner &&
          occupant.isTapped &&  // KEY: Must be tapped
          occupant.currentHP > 0) {
        targets.push(occupant)
      }
    }

    return targets
  }
}

export default HiddenBlade
