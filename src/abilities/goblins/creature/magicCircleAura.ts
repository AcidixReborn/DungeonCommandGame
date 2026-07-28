/**
 * MAGIC CIRCLE AURA - Creature Ability
 *
 * Faction: Tyranny of Goblins
 * Creatures:
 *   - Hobgoblin Sorcerer / tog_cr_10 (Tyranny of Goblins)
 *
 * When standing on a Magic Circle tile, all friendly Goblins, Hobgoblins, and
 * Bugbears gain "Prevent 10 damage from 1 source" once per turn.
 * - Global buff (affects all qualifying creatures on the board)
 * - Faction-locked to Tyranny of Goblins only
 * - Shield refreshes at start of faction's turn
 * - Shield drops immediately when Sorcerer dies OR leaves Magic Circle
 * - Applies FIRST (before Insubstantial, Shield Block, IMD cards)
 * - Does NOT tap creatures when preventing damage
 * - Applies 0/50/100 AI difficulty rule based on DEFENDER's owner
 */
import type { CreatureInstance } from '../../../models/creatures.js'

export const MagicCircleAura = {
  id: 'magic_circle_aura',
  name: 'Magic Circle Aura',
  faction: 'Tyranny of Goblins',
  creature: 'Hobgoblin Sorcerer',
  damageReduction: 10,

  /**
   * Check if creature has MAGIC CIRCLE AURA ability
   */
  has(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) =>
        typeof ability === 'string' && ability.toUpperCase().includes('MAGIC CIRCLE AURA')
    )
  },

  /**
   * Check if a Sorcerer is currently on a Magic Circle
   * @param gameState - Game state for tile lookup
   */
  isOnMagicCircle(gameState: any, sorcererInstance: CreatureInstance): boolean {
    if (!this.has(sorcererInstance)) return false
    if (!sorcererInstance.position) return false
    if (sorcererInstance.currentHP <= 0) return false

    const tile = gameState.getTile(sorcererInstance.position.x, sorcererInstance.position.y)
    return tile?.terrain === 'MAGIC_CIRCLE'
  },

  /**
   * Get the active Sorcerer on a Magic Circle for a player
   * @returns The active Sorcerer or null
   */
  getActiveSorcerer(gameState: any, playerId: string): CreatureInstance | null {
    const player = gameState.players[playerId]
    if (!player) return null

    for (const creature of player.creaturesInPlay as CreatureInstance[]) {
      if (this.isOnMagicCircle(gameState, creature)) {
        return creature
      }
    }
    return null
  },

  /**
   * Check if creature type qualifies for Magic Circle Aura buff
   * Must be Goblin, Hobgoblin, or Bugbear type
   */
  isGoblinFactionType(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.type) return false
    const types = creatureInstance.creature.type
    return types.some((type) => {
      const upperType = type.toUpperCase()
      return upperType === 'GOBLIN' || upperType === 'HOBGOBLIN' || upperType === 'BUGBEAR'
    })
  },

  /**
   * Check if creature is from Tyranny of Goblins faction
   */
  isGoblinFaction(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.creature?.faction) return false
    const faction = creatureInstance.creature.faction.toUpperCase()
    return faction.includes('GOBLIN') || faction.includes('TYRANNY OF GOBLINS')
  },

  /**
   * Check if creature has active protection from Magic Circle Aura
   */
  hasProtection(gameState: any, defenderInstance: CreatureInstance): boolean {
    if (!this.isGoblinFactionType(defenderInstance)) return false
    if (!this.isGoblinFaction(defenderInstance)) return false

    const activeSorcerer = this.getActiveSorcerer(gameState, defenderInstance.owner)
    if (!activeSorcerer) return false

    if (defenderInstance.magicCircleShieldUsed) return false

    return true
  },

  /**
   * Get damage reduction amount
   * @returns Damage reduction (10 or 0)
   */
  getReduction(gameState: any, defenderInstance: CreatureInstance): number {
    if (!this.hasProtection(gameState, defenderInstance)) return 0

    // AI difficulty check
    const defenderPlayer = gameState.players[defenderInstance.owner]
    if (defenderPlayer && !defenderPlayer.isHuman) {
      const aiDifficulty = defenderPlayer.aiDifficulty || 'medium'

      if (aiDifficulty === 'easy') {
        return 0
      } else if (aiDifficulty === 'medium') {
        if (Math.random() >= 0.5) {
          return 0
        }
      }
    }

    return this.damageReduction
  },

  /**
   * Mark shield as used for this turn
   * @returns True if shield was applied
   */
  useShield(defenderInstance: CreatureInstance): boolean {
    defenderInstance.magicCircleShieldUsed = true
    return true
  },

  /**
   * Reset shields for all creatures at start of turn
   */
  resetShields(gameState: any, playerId: string): void {
    const player = gameState.players[playerId]
    if (!player) return

    for (const creature of player.creaturesInPlay as CreatureInstance[]) {
      creature.magicCircleShieldUsed = false
    }
  },
}

export default MagicCircleAura
