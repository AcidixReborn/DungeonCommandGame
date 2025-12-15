/**
 * DISCIPLE OF KYUSS - Creature Ability
 *
 * Faction: Curse of Undeath
 * Creatures:
 *   - Disciple of Kyuss / cou_cr_1 (Curse of Undeath)
 *
 * At the end of each opponent's Activate phase, deal 10 unpreventable damage
 * to all enemy creatures adjacent to this creature.
 * - Damage is unpreventable (no defense cards)
 * - INSUBSTANTIAL still blocks it
 * - Applies 0/50/100 AI difficulty rule
 */

import { ABILITIES } from '../../../constants/gameConstants.js'

export const DiscipleOfKyuss = {
  id: 'disciple_of_kyuss',
  name: 'Disciple of Kyuss',
  faction: 'Curse of Undeath',
  creature: 'Disciple of Kyuss',
  damage: ABILITIES.DISCIPLE_OF_KYUSS_DAMAGE,

  /**
   * Check if creature has DISCIPLE_OF_KYUSS ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has DISCIPLE_OF_KYUSS
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      a => typeof a === 'string' && a.toUpperCase().includes('DISCIPLE_OF_KYUSS')
    )
  },

  /**
   * Get all enemy Disciples of Kyuss on the board
   * @param {Object} gameState - Game state
   * @param {string} currentPlayerId - The player ending their Activate phase
   * @returns {Array} Array of enemy Disciples of Kyuss
   */
  getEnemyDisciples(gameState, currentPlayerId) {
    const disciples = []
    for (const playerId of gameState.activePlayers) {
      if (playerId === currentPlayerId) continue
      const player = gameState.players[playerId]
      if (!player) continue
      for (const creature of player.creaturesInPlay) {
        if (creature.currentHP > 0 && this.has(creature)) {
          disciples.push(creature)
        }
      }
    }
    return disciples
  },

  /**
   * Get creatures adjacent to a Disciple
   * @param {Object} gameState - Game state
   * @param {string} playerId - Player whose creatures to check
   * @param {CreatureInstance} disciple - The Disciple of Kyuss
   * @returns {Array} Array of adjacent creatures
   */
  getAdjacentCreatures(gameState, playerId, disciple) {
    const adjacentCreatures = []
    const player = gameState.players[playerId]
    if (!player || !disciple.position) return adjacentCreatures

    const adjacentTiles = gameState.getAdjacentTiles8Dir(disciple.position.x, disciple.position.y)

    for (const creature of player.creaturesInPlay) {
      if (!creature.position) continue
      if (creature.currentHP <= 0) continue
      const isAdjacent = adjacentTiles.some(
        tile => tile.x === creature.position.x && tile.y === creature.position.y
      )
      if (isAdjacent) {
        adjacentCreatures.push(creature)
      }
    }
    return adjacentCreatures
  },

  /**
   * Check if Disciple should trigger based on AI difficulty
   * @param {Object} gameState - Game state
   * @param {CreatureInstance} disciple - The Disciple of Kyuss
   * @returns {boolean} True if should trigger
   */
  shouldTrigger(gameState, disciple) {
    const disciplePlayer = gameState.players[disciple.owner]
    if (!disciplePlayer || disciplePlayer.isHuman) return true

    const aiDifficulty = disciplePlayer.aiDifficulty || 'medium'

    if (aiDifficulty === 'easy') {
      return false  // Easy AI: 0%
    } else if (aiDifficulty === 'medium') {
      return Math.random() < 0.5  // Medium AI: 50%
    }
    return true  // Hard AI: 100%
  }
}

export default DiscipleOfKyuss
