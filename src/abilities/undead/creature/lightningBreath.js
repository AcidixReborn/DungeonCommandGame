/**
 * LIGHTNING BREATH - Creature Ability
 *
 * Faction: Curse of Undeath
 * Creatures:
 *   - Dracolich / cou_cr_2 (Curse of Undeath)
 *
 * Standard action: Make up to 3 ranged attacks on different targets within range
 * Requires at least 2 valid targets to use
 */

export const LightningBreath = {
  id: 'lightning_breath',
  name: 'Lightning Breath',
  faction: 'Curse of Undeath',
  creature: 'Dracolich',
  maxTargets: 3,
  minTargets: 2,

  /**
   * Check if creature has LIGHTNING BREATH ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has LIGHTNING BREATH
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      a => typeof a === 'string' && a.toUpperCase().includes('LIGHTNING BREATH')
    )
  },

  /**
   * Check if LIGHTNING BREATH can be used (requires 2+ valid targets)
   * @param {Object} gameState - Game state
   * @param {CreatureInstance} creatureInstance - The Dracolich
   * @returns {boolean} True if can use Lightning Breath
   */
  canUse(gameState, creatureInstance) {
    if (!this.has(creatureInstance)) return false
    const validTargets = this.getTargets(gameState, creatureInstance)
    return validTargets.length >= this.minTargets
  },

  /**
   * Get all valid targets for LIGHTNING BREATH
   * Requirements:
   * - Within range 5
   * - Not adjacent (distance > 1)
   * - Line of sight
   * - Target not in FOREST
   * - Attacker not in FOREST
   * @param {Object} gameState - Game state
   * @param {CreatureInstance} creatureInstance - The Dracolich
   * @returns {Array} Array of valid target creature instances
   */
  getTargets(gameState, creatureInstance) {
    if (!creatureInstance?.position) return []
    if (!this.has(creatureInstance)) return []

    const attackerPos = creatureInstance.position
    const attackerOwner = creatureInstance.owner
    const rangedRange = creatureInstance.creature.rangedAttack?.range || 5

    // Check if attacker is in FOREST
    const attackerTile = gameState.getTile(attackerPos.x, attackerPos.y)
    if (attackerTile?.terrain === 'FOREST') return []

    const validTargets = []

    for (const playerId of Object.keys(gameState.players)) {
      if (playerId === attackerOwner) continue

      const player = gameState.players[playerId]
      for (const enemy of player.creaturesInPlay) {
        if (!enemy.position) continue
        if (enemy.currentHP <= 0) continue

        const targetPos = enemy.position
        const distance = gameState.getDistance(attackerPos, targetPos)

        if (distance > rangedRange) continue
        if (distance <= 1) continue

        const targetTile = gameState.getTile(targetPos.x, targetPos.y)
        if (targetTile?.terrain === 'FOREST') continue

        if (!gameState.hasLineOfSight(creatureInstance, enemy, attackerOwner)) continue

        validTargets.push(enemy)
      }
    }

    return validTargets
  },

  /**
   * Get Lightning Breath damage per attack
   * @param {CreatureInstance} creatureInstance - The Dracolich
   * @returns {number} Damage per attack (20)
   */
  getDamage(creatureInstance) {
    return creatureInstance?.creature?.rangedAttack?.damage || 20
  }
}

export default LightningBreath
