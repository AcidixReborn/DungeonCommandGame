/**
 * FLANKING - Creature Ability
 *
 * Factions: Heart of Cormyr, Tyranny of Goblins
 * Creatures:
 *   - Halfling Sneak / hoc_cr_9 (Heart of Cormyr)
 *   - Goblin Champion / tog_cr_4 (Tyranny of Goblins)
 *
 * +10 damage on melee attacks when at least 1 ally is adjacent to the target
 * Does NOT stack with multiple allies, does NOT apply to ability damage
 * Applies 0/50/100 AI difficulty rule
 */
import type { CreatureInstance } from '../../models/creatures.js'

export const Flanking = {
  id: 'flanking',
  name: 'Flanking',
  bonusDamage: 10,

  /**
   * Check if creature has FLANKING ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('FLANKING')
    )
  },

  /**
   * Get FLANKING bonus damage for a melee attack
   * @param gameState - Game state for adjacency lookup and AI check
   * @returns Bonus damage (10 or 0)
   */
  getBonus(
    gameState: any,
    attackerInstance: CreatureInstance,
    defenderInstance: CreatureInstance
  ): number {
    if (!this.has(attackerInstance)) return 0
    if (!defenderInstance?.position) return 0

    // Get all tiles adjacent to the defender (8-directional)
    const adjacentTiles = gameState.getAdjacentTiles8Dir(
      defenderInstance.position.x,
      defenderInstance.position.y
    )

    // Check if any friendly creature (not the attacker itself) is adjacent to the defender
    let hasAdjacentAlly = false
    for (const tile of adjacentTiles) {
      const occupant = tile.occupant
      if (
        occupant &&
        occupant.owner === attackerInstance.owner &&
        occupant.instanceId !== attackerInstance.instanceId &&
        occupant.currentHP > 0
      ) {
        hasAdjacentAlly = true
        break
      }
    }

    if (!hasAdjacentAlly) return 0

    // AI difficulty check (0/50/100 rule)
    const attackerPlayer = gameState.players[attackerInstance.owner]
    if (attackerPlayer && !attackerPlayer.isHuman) {
      const aiDifficulty = attackerPlayer.aiDifficulty || 'medium'

      if (aiDifficulty === 'easy') {
        return 0 // Easy AI never uses FLANKING bonus
      } else if (aiDifficulty === 'medium') {
        if (Math.random() >= 0.5) {
          return 0 // Medium AI: 50% chance
        }
      }
    }

    return this.bonusDamage
  },
}

export default Flanking
