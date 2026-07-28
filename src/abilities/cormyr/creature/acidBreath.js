/**
 * ACID BREATH - Creature Ability
 *
 * Faction: Heart of Cormyr
 * Creatures:
 *   - Copper Dragon / hoc_cr_1 (Heart of Cormyr)
 *
 * After ranged attack deals damage, deal 20 splash damage to all enemies
 * adjacent to the target (not adjacent to attacker)
 */

import { ABILITIES } from '../../../constants/gameConstants.js'

export const AcidBreath = {
  id: 'acid_breath',
  name: 'Acid Breath',
  faction: 'Heart of Cormyr',
  creature: 'Copper Dragon',
  splashDamage: ABILITIES.ACID_BREATH_SPLASH_DAMAGE,

  /**
   * Check if creature has ACID BREATH ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has ACID BREATH
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (a) => typeof a === 'string' && a.toUpperCase().includes('ACID BREATH')
    )
  },

  /**
   * Get splash damage amount
   * @returns {number} Splash damage (20)
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
        // Skip the main target (already received main attack damage)
        if (occupant.instanceId === targetInstance.instanceId) continue
        // Skip friendly creatures (relative to attacker)
        if (occupant.owner === attackerOwner) continue
        // Skip dead creatures
        if (occupant.currentHP <= 0) continue

        targets.push(occupant)
      }
    }

    return targets
  },
}

export default AcidBreath
