/**
 * EXPLOSIVE BOLTS - Creature Ability
 *
 * Faction: Heart of Cormyr
 * Creatures:
 *   - Half-Orc Thug / hoc_cr_10 (Heart of Cormyr)
 *
 * After ranged attack deals damage, deal 10 splash damage to all enemies
 * adjacent to the target (not adjacent to attacker)
 */

import { ABILITIES } from '../../../constants/gameConstants.js'

export const ExplosiveBolts = {
  id: 'explosive_bolts',
  name: 'Explosive Bolts',
  faction: 'Heart of Cormyr',
  creature: 'Half-Orc Thug',
  splashDamage: ABILITIES.EXPLOSIVE_BOLTS_SPLASH_DAMAGE,

  /**
   * Check if creature has EXPLOSIVE BOLTS ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has EXPLOSIVE BOLTS
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      a => typeof a === 'string' && a.toUpperCase().includes('EXPLOSIVE BOLTS')
    )
  },

  /**
   * Get splash damage amount
   * @returns {number} Splash damage (10)
   */
  getSplashDamage() {
    return this.splashDamage
  },

  /**
   * Get all enemies adjacent to the target (for splash damage)
   * @param {Object} gameState - Game state
   * @param {CreatureInstance} targetInstance - The main attack target
   * @param {string} attackerOwner - Owner of the attacker
   * @returns {Array} Array of enemy creature instances to receive splash damage
   */
  getSplashTargets(gameState, targetInstance, attackerOwner) {
    if (!targetInstance?.position) return []

    const targets = []
    const pos = targetInstance.position

    // Check all 8 adjacent tiles to the target
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue

        const x = pos.x + dx
        const y = pos.y + dy

        const tile = gameState.getTile(x, y)
        if (!tile || !tile.occupant) continue

        const occupant = tile.occupant
        // Skip the main target
        if (occupant.instanceId === targetInstance.instanceId) continue
        // Skip friendly creatures (relative to attacker)
        if (occupant.owner === attackerOwner) continue
        // Skip dead creatures
        if (occupant.currentHP <= 0) continue

        targets.push(occupant)
      }
    }

    return targets
  }
}

export default ExplosiveBolts
