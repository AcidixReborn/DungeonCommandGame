/**
 * UNTAP ON KILL - Creature Ability
 *
 * Factions: Blood of Gruumsh, Tyranny of Goblins
 * Creatures:
 *   - Orc Barbarian / bog_cr_5 (Blood of Gruumsh)
 *   - Bugbear Berserker / tog_cr_1 (Tyranny of Goblins)
 *
 * Whenever an adjacent enemy creature is destroyed, untap this creature.
 * Only triggers during the creature's faction's turn.
 * Applies 0/50/100 AI difficulty rule
 */

export const UntapOnKill = {
  id: 'untap_on_adjacent_kill',
  name: 'Untap on Kill',

  /**
   * Check if creature has UNTAP ON KILL ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has UNTAP ON KILL
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) =>
        (typeof ability === 'object' && ability.id === 'untap_on_adjacent_kill') ||
        (typeof ability === 'string' && ability.toUpperCase().includes('UNTAP'))
    )
  },

  /**
   * Check if creature is adjacent to a position
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @param {Object} position - Position {x, y} to check adjacency to
   * @returns {boolean} True if adjacent (8-directional)
   */
  isAdjacentTo(creatureInstance, position) {
    if (!creatureInstance.position || !position) return false

    const dx = Math.abs(position.x - creatureInstance.position.x)
    const dy = Math.abs(position.y - creatureInstance.position.y)
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)
  },

  /**
   * Check and trigger untap when a creature dies
   * @param {Object} gameState - Game state
   * @param {Object} destroyedPosition - {x, y} position where creature died
   * @param {string} destroyedOwner - Player ID of the destroyed creature's owner
   * @param {string} killerOwner - Player ID of the creature that killed
   * @returns {Object|null} Untap result data or null if no untap occurred
   */
  checkTrigger(gameState, destroyedPosition, destroyedOwner, killerOwner) {
    const currentTurnPlayer = gameState.currentPlayer
    if (!currentTurnPlayer) return null

    const currentPlayer = gameState.players[currentTurnPlayer]
    if (!currentPlayer) return null

    // Find creatures with this ability belonging to the current turn's player
    const creatures = currentPlayer.creaturesInPlay.filter(
      (creature) => this.has(creature) && creature.currentHP > 0
    )

    if (creatures.length === 0) return null

    // Check each creature for adjacency to the destroyed creature
    for (const creature of creatures) {
      if (!creature.position) continue

      // Destroyed creature must be an enemy (different owner than the untapping creature)
      if (destroyedOwner === creature.owner) continue

      if (!this.isAdjacentTo(creature, destroyedPosition)) continue

      // AI difficulty check
      if (!currentPlayer.isHuman) {
        const aiDifficulty = currentPlayer.aiDifficulty || 'medium'

        if (aiDifficulty === 'easy') {
          continue // Easy AI never uses ability
        } else if (aiDifficulty === 'medium') {
          if (Math.random() >= 0.5) {
            continue // Medium AI: 50% chance
          }
        }
      }

      // Untap the creature
      if (creature.isTapped) {
        creature.untap()
        return {
          triggered: true,
          creatureName: creature.creature.name,
          instanceId: creature.instanceId,
          owner: creature.owner,
        }
      }
    }

    return null
  },
}

export default UntapOnKill
