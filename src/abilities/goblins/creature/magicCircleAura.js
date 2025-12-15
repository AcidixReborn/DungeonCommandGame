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

export const MagicCircleAura = {
  id: 'magic_circle_aura',
  name: 'Magic Circle Aura',
  faction: 'Tyranny of Goblins',
  creature: 'Hobgoblin Sorcerer',
  damageReduction: 10,

  /**
   * Check if creature has MAGIC CIRCLE AURA ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has MAGIC CIRCLE AURA
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      ability => typeof ability === 'string' && ability.toUpperCase().includes('MAGIC CIRCLE AURA')
    )
  },

  /**
   * Check if a Sorcerer is currently on a Magic Circle
   * @param {Object} gameState - Game state for tile lookup
   * @param {CreatureInstance} sorcererInstance - The Sorcerer
   * @returns {boolean} True if Sorcerer is active on Magic Circle
   */
  isOnMagicCircle(gameState, sorcererInstance) {
    if (!this.has(sorcererInstance)) return false
    if (!sorcererInstance.position) return false
    if (sorcererInstance.currentHP <= 0) return false

    const tile = gameState.getTile(sorcererInstance.position.x, sorcererInstance.position.y)
    return tile?.terrain === 'MAGIC_CIRCLE'
  },

  /**
   * Get the active Sorcerer on a Magic Circle for a player
   * @param {Object} gameState - Game state
   * @param {string} playerId - Player to check
   * @returns {CreatureInstance|null} The active Sorcerer or null
   */
  getActiveSorcerer(gameState, playerId) {
    const player = gameState.players[playerId]
    if (!player) return null

    for (const creature of player.creaturesInPlay) {
      if (this.isOnMagicCircle(gameState, creature)) {
        return creature
      }
    }
    return null
  },

  /**
   * Check if creature type qualifies for Magic Circle Aura buff
   * Must be Goblin, Hobgoblin, or Bugbear type
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature is a valid type
   */
  isGoblinFactionType(creatureInstance) {
    if (!creatureInstance?.creature?.type) return false
    const types = creatureInstance.creature.type
    return types.some(type => {
      const upperType = type.toUpperCase()
      return upperType === 'GOBLIN' || upperType === 'HOBGOBLIN' || upperType === 'BUGBEAR'
    })
  },

  /**
   * Check if creature is from Tyranny of Goblins faction
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature is from faction
   */
  isGoblinFaction(creatureInstance) {
    if (!creatureInstance?.creature?.faction) return false
    const faction = creatureInstance.creature.faction.toUpperCase()
    return faction.includes('GOBLIN') || faction.includes('TYRANNY OF GOBLINS')
  },

  /**
   * Check if creature has active protection from Magic Circle Aura
   * @param {Object} gameState - Game state
   * @param {CreatureInstance} defenderInstance - Creature taking damage
   * @returns {boolean} True if creature has active protection
   */
  hasProtection(gameState, defenderInstance) {
    if (!this.isGoblinFactionType(defenderInstance)) return false
    if (!this.isGoblinFaction(defenderInstance)) return false

    const activeSorcerer = this.getActiveSorcerer(gameState, defenderInstance.owner)
    if (!activeSorcerer) return false

    if (defenderInstance.magicCircleShieldUsed) return false

    return true
  },

  /**
   * Get damage reduction amount
   * @param {Object} gameState - Game state
   * @param {CreatureInstance} defenderInstance - Creature taking damage
   * @returns {number} Damage reduction (10 or 0)
   */
  getReduction(gameState, defenderInstance) {
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
   * @param {CreatureInstance} defenderInstance - Creature using the shield
   * @returns {boolean} True if shield was applied
   */
  useShield(defenderInstance) {
    defenderInstance.magicCircleShieldUsed = true
    return true
  },

  /**
   * Reset shields for all creatures at start of turn
   * @param {Object} gameState - Game state
   * @param {string} playerId - Player whose turn is starting
   */
  resetShields(gameState, playerId) {
    const player = gameState.players[playerId]
    if (!player) return

    for (const creature of player.creaturesInPlay) {
      creature.magicCircleShieldUsed = false
    }
  }
}

export default MagicCircleAura
