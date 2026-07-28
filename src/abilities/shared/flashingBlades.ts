/**
 * FLASHING BLADES - Creature Ability
 *
 * Factions: Sting of Lolth, Heart of Cormyr
 * Creatures:
 *   - Drow Blademaster / sol_cr_5 (Sting of Lolth)
 *   - Human Ranger / hoc_cr_11 (Heart of Cormyr)
 *
 * After melee attack deals damage, can deal 10 splash damage to an adjacent enemy
 * (excluding the original attack target)
 */
import { ABILITIES } from '../../constants/gameConstants.js'
import type { CreatureInstance } from '../../models/creatures.js'

export const FlashingBlades = {
  id: 'flashing_blades',
  name: 'Flashing Blades',
  damage: ABILITIES.FLASHING_BLADES_DAMAGE,

  /**
   * Check if creature has FLASHING BLADES ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('FLASHING BLADES')
    )
  },

  /**
   * Get valid targets for FLASHING BLADES splash damage
   * Returns adjacent enemy creatures (excluding the original attack target)
   * Uses 8-directional adjacency (includes diagonals)
   * @param gameState - Game state for adjacency lookup
   */
  getTargets(
    gameState: any,
    attackerInstance: CreatureInstance,
    originalTarget: CreatureInstance | null
  ): CreatureInstance[] {
    if (!this.has(attackerInstance)) return []
    if (!attackerInstance.position) return []

    const targets: CreatureInstance[] = []
    const adjacent = gameState.getAdjacentTiles8Dir(
      attackerInstance.position.x,
      attackerInstance.position.y
    )

    for (const tile of adjacent) {
      const occupant = tile.occupant
      if (
        occupant &&
        occupant.owner !== attackerInstance.owner &&
        occupant.instanceId !== originalTarget?.instanceId &&
        occupant.currentHP > 0
      ) {
        targets.push(occupant)
      }
    }

    return targets
  },
}

export default FlashingBlades
