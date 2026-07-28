/**
 * PHASING - Creature Ability
 *
 * Faction: Curse of Undeath
 * Creatures:
 *   - Hypnotic Spirit / cou_cr_4 (Curse of Undeath)
 *
 * Works like FLYING (ignores terrain, all costs 1) but can also move through other creatures
 * Cannot end movement on mountains or other creatures
 * Immune to water damage (like flying)
 */

export const Phasing = {
  id: 'phasing',
  name: 'Phasing',
  faction: 'Curse of Undeath',
  creature: 'Hypnotic Spirit',

  /**
   * Check if creature has PHASING ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has PHASING
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('PHASING')
    )
  },

  /**
   * Get movement cost for a phasing creature on any terrain
   * @returns {number} Always returns 1 (phasing ignores terrain)
   */
  getMovementCost() {
    return 1
  },

  /**
   * Check if phasing creature can move through a tile occupied by another creature
   * @returns {boolean} Always true - phasing can move through creatures
   */
  canMoveThroughCreatures() {
    return true
  },

  /**
   * Check if phasing creature can end movement on a tile
   * @param {string} terrainType - Type of terrain
   * @param {boolean} hasCreature - Whether tile has another creature
   * @returns {boolean} True if creature can end movement there
   */
  canEndMovementOn(terrainType, hasCreature) {
    if (terrainType === 'mountain') return false
    if (hasCreature) return false
    return true
  },

  /**
   * Check if creature takes water damage
   * @returns {boolean} Always false - phasing creatures don't take water damage
   */
  takesWaterDamage() {
    return false
  },
}

export default Phasing
