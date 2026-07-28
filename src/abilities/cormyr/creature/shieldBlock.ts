/**
 * SHIELD BLOCK - Creature Ability
 *
 * Faction: Heart of Cormyr
 * Creatures:
 *   - Dwarven Defender / hoc_cr_4 (Heart of Cormyr)
 *   - Dwarven Defender / hoc_cr_5 (Heart of Cormyr)
 *
 * Adjacent Cormyr Adventurers get -10 damage per adjacent Dwarven Defender
 * Only applies to Cormyr faction Adventurers
 * Applies 0/50/100 AI difficulty rule based on DEFENDER's owner
 */
import type { CreatureInstance } from '../../../models/creatures.js'

export const ShieldBlock = {
  id: 'shield_block',
  name: 'Shield Block',
  faction: 'Heart of Cormyr',
  creature: 'Dwarven Defender',
  damageReduction: 10,

  /**
   * Check if creature has SHIELD BLOCK ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('SHIELD BLOCK')
    )
  },

  /**
   * Check if creature has Adventurer type
   */
  isAdventurerType(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.type) return false
    return creatureInstance.creature.type.some((type) => type.toUpperCase() === 'ADVENTURER')
  },

  /**
   * Check if creature is from Cormyr faction
   */
  isCormyrFaction(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.faction) return false
    const faction = creatureInstance.creature.faction.toUpperCase()
    return faction.includes('CORMYR') || faction.includes('HEART OF CORMYR')
  },

  /**
   * Get SHIELD BLOCK damage reduction for a defending creature
   * @param gameState - Game state for adjacency lookup and AI check
   * @returns Damage reduction amount (0, 10, 20, etc.)
   */
  getReduction(gameState: any, defenderInstance: CreatureInstance): number {
    // Must be Adventurer type AND Cormyr faction
    if (!this.isAdventurerType(defenderInstance)) return 0
    if (!this.isCormyrFaction(defenderInstance)) return 0
    if (!defenderInstance.position) return 0

    // Get all tiles adjacent to the defender (8-directional)
    const adjacentTiles = gameState.getAdjacentTiles8Dir(
      defenderInstance.position.x,
      defenderInstance.position.y
    )

    // Count adjacent creatures with SHIELD BLOCK (same owner)
    let shieldBlockCount = 0
    for (const tile of adjacentTiles) {
      const occupant = tile.occupant
      if (
        occupant &&
        occupant.owner === defenderInstance.owner &&
        occupant.currentHP > 0 &&
        this.has(occupant)
      ) {
        shieldBlockCount++
      }
    }

    if (shieldBlockCount === 0) return 0

    // AI difficulty check (0/50/100 rule) - based on DEFENDER's owner
    const defenderPlayer = gameState.players[defenderInstance.owner]
    if (defenderPlayer && !defenderPlayer.isHuman) {
      const aiDifficulty = defenderPlayer.aiDifficulty || 'medium'

      if (aiDifficulty === 'easy') {
        return 0 // Easy AI never benefits from SHIELD BLOCK
      } else if (aiDifficulty === 'medium') {
        if (Math.random() >= 0.5) {
          return 0 // Medium AI: 50% chance
        }
      }
    }

    return shieldBlockCount * this.damageReduction
  },
}

export default ShieldBlock
