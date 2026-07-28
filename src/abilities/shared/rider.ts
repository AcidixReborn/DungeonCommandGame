/**
 * RIDER - Creature Ability
 *
 * Factions: Curse of Undeath, Tyranny of Goblins
 * Creatures:
 *   - Skeletal Lancer / cou_cr_6 (Curse of Undeath)
 *   - Goblin Wolf Rider / tog_cr_7 (Tyranny of Goblins)
 *
 * When creature is destroyed, deploy a creature (typically Level 3 or lower) from hand to same tile
 * Morale loss = (destroyed creature level - deployed creature level)
 */
import type { CreatureInstance } from '../../models/creatures.js'

export const Rider = {
  id: 'rider',
  name: 'Rider',

  /**
   * Check if creature has RIDER ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('RIDER')
    )
  },

  /**
   * Get the maximum level of creature that can be deployed via RIDER
   * @returns Maximum deployable creature level (typically 3)
   */
  getMaxDeployLevel(creatureInstance: CreatureInstance): number {
    if (!this.has(creatureInstance)) return 0

    // Parse level from ability text if present (e.g., "RIDER: Level 3 or less")
    const ability = creatureInstance.creature.specialAbilities.find(
      (a) => typeof a === 'string' && a.toUpperCase().includes('RIDER')
    )
    if (ability) {
      const match = ability.match(/LEVEL\s*(\d+)/i)
      if (match) return parseInt(match[1], 10)
    }
    return 3 // Default max level
  },

  /**
   * Get valid creatures from hand that can be deployed via RIDER
   */
  getValidDeployments<T extends { level: number }>(creatureHand: T[], maxLevel: number): T[] {
    if (!creatureHand?.length) return []
    return creatureHand.filter((card) => card.level <= maxLevel)
  },

  /**
   * Calculate morale loss when RIDER deploys a creature
   * @returns Morale loss (difference in levels, minimum 0)
   */
  calculateMoraleLoss(destroyedCreatureLevel: number, deployedCreatureLevel: number): number {
    return Math.max(0, destroyedCreatureLevel - deployedCreatureLevel)
  },
}

export default Rider
