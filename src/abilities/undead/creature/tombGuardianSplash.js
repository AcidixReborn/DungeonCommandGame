/**
 * TOMB GUARDIAN SPLASH (Swirl) - Creature Ability
 *
 * Faction: Curse of Undeath
 * Creatures:
 *   - Skeletal Tomb Guardian / cou_cr_7 (Curse of Undeath)
 *
 * After melee attack deals damage, deal 20 splash damage to all adjacent enemies
 * (excluding the main attack target)
 */

import { ABILITIES } from '../../../constants/gameConstants.js'

export const TombGuardianSplash = {
  id: 'tomb_guardian_splash',
  name: 'Swirl',
  faction: 'Curse of Undeath',
  creature: 'Skeletal Tomb Guardian',
  damage: ABILITIES.TOMB_GUARDIAN_SPLASH_DAMAGE,

  /**
   * Check if creature has Tomb Guardian splash/swirl ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has splash ability
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    if (creatureInstance.creature.name !== 'Skeletal Tomb Guardian') return false
    return creatureInstance.creature.specialAbilities.some(
      a => typeof a === 'string' &&
           (a.toUpperCase().includes('SWIRL') ||
            (a.toUpperCase().includes('20 DAMAGE') && a.toUpperCase().includes('ADJACENT')))
    )
  },

  /**
   * Get all enemies adjacent to Skeletal Tomb Guardian (NOT the main target)
   * @param {Object} gameState - Game state for tile lookup
   * @param {CreatureInstance} attackerInstance - The Skeletal Tomb Guardian
   * @param {CreatureInstance} mainTargetInstance - The main attack target (excluded)
   * @returns {Array} Array of enemy creature instances to receive splash damage
   */
  getTargets(gameState, attackerInstance, mainTargetInstance = null) {
    if (!this.has(attackerInstance)) return []
    if (!attackerInstance.position) return []

    const targets = []
    const pos = attackerInstance.position

    // Check all 8 adjacent tiles to the Guardian
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue

        const x = pos.x + dx
        const y = pos.y + dy

        const tile = gameState.getTile(x, y)
        if (!tile || !tile.occupant) continue

        const occupant = tile.occupant
        // Skip the main attack target
        if (mainTargetInstance && occupant.instanceId === mainTargetInstance.instanceId) continue
        // Skip friendly creatures
        if (occupant.owner === attackerInstance.owner) continue
        // Skip dead creatures
        if (occupant.currentHP <= 0) continue

        targets.push(occupant)
      }
    }

    return targets
  }
}

export default TombGuardianSplash
