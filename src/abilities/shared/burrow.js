/**
 * BURROW - Creature Ability
 *
 * Factions: Heart of Cormyr, Sting of Lolth
 * Creatures:
 *   - Earth Guardian / hoc_cr_6 (Heart of Cormyr)
 *   - Umber Hulk / sol_cr_12 (Sting of Lolth)
 *
 * Allows movement through MOUNTAIN tiles (cost=1) but cannot stop on them
 * Unlike FLYING, burrowing creatures still take water damage
 */

export const Burrow = {
  id: 'burrow',
  name: 'Burrow',

  /**
   * Check if creature has BURROW ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has BURROW
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('BURROW')
    )
  },

  /**
   * Check if burrowing creature can move through terrain
   * @param {string} terrainType - Type of terrain
   * @returns {boolean} True if creature can pass through
   */
  canPassThrough(terrainType) {
    return true // Can pass through mountains
  },

  /**
   * Check if burrowing creature can end movement on terrain
   * @param {string} terrainType - Type of terrain
   * @returns {boolean} True if creature can end movement there
   */
  canEndMovementOn(terrainType) {
    return terrainType !== 'mountain' // Cannot stop on mountains
  },

  /**
   * Get movement cost for burrowing through mountain
   * @param {string} terrainType - Type of terrain
   * @returns {number} Movement cost (1 for mountains, normal cost otherwise)
   */
  getMovementCost(terrainType) {
    if (terrainType === 'mountain') return 1
    return null // Use normal terrain cost
  },

  /**
   * Check if creature takes water damage
   * @returns {boolean} Always true - burrowing creatures DO take water damage
   */
  takesWaterDamage() {
    return true
  },
}

export default Burrow
