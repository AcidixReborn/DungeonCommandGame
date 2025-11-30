/**
 * Commander Ability Types
 */
export const AbilityTypes = {
  PASSIVE: 'PASSIVE',  // Automatically applied in background
  ACTIVE: 'ACTIVE'     // Requires UI interaction (popup/button)
}

/**
 * Commander Ability Categories
 */
export const AbilityCategories = {
  TERRAIN: 'TERRAIN',       // Affects terrain movement costs
  SPEED: 'SPEED',           // Modifies creature speed
  DEPLOYMENT: 'DEPLOYMENT', // Affects deployment rules
  COMBAT: 'COMBAT',         // Affects combat outcomes
  RESOURCE: 'RESOURCE'      // Affects morale, leadership, or cards
}

/**
 * Commander - Represents a faction commander with starting stats
 * Defines initial hand sizes, morale, leadership, and special abilities
 */
export class Commander {
  /**
   * @param {string} id - Unique commander ID
   * @param {string} name - Commander name
   * @param {string} faction - Faction affiliation
   * @param {number} startingCreatureHandSize - Initial creature cards drawn
   * @param {number} startingOrderHandSize - Initial order cards drawn
   * @param {number} startingMorale - Starting morale points (defeat condition)
   * @param {number} startingLeadership - Starting leadership pool
   * @param {string} specialAbility - Special ability name (deprecated, use abilities array)
   * @param {string} specialAbilityDescription - Ability description text (deprecated, use abilities array)
   * @param {string} imageUrl - Commander portrait URL
   * @param {Array} abilities - Structured ability data array
   */
  constructor({
    id,
    name,
    faction,
    startingCreatureHandSize,
    startingOrderHandSize,
    startingMorale,
    startingLeadership,
    specialAbility,
    specialAbilityDescription = '',
    imageUrl = null,
    abilities = []
  }) {
    this.id = id
    this.name = name
    this.faction = faction
    this.startingCreatureHandSize = startingCreatureHandSize
    this.startingOrderHandSize = startingOrderHandSize
    this.startingMorale = startingMorale
    this.startingLeadership = startingLeadership
    this.specialAbility = specialAbility
    this.specialAbilityDescription = specialAbilityDescription
    this.imageUrl = imageUrl
    this.abilities = abilities
  }

  /**
   * Check if commander has a specific ability by ID
   * @param {string} abilityId - The ability ID to check for
   * @returns {boolean} True if commander has this ability
   */
  hasAbility(abilityId) {
    return this.abilities.some(ability => ability.id === abilityId)
  }

  /**
   * Get an ability by ID
   * @param {string} abilityId - The ability ID to get
   * @returns {Object|null} The ability object or null
   */
  getAbility(abilityId) {
    return this.abilities.find(ability => ability.id === abilityId) || null
  }

  /**
   * Get all passive abilities
   * @returns {Array} Array of passive ability objects
   */
  getPassiveAbilities() {
    return this.abilities.filter(ability => ability.type === AbilityTypes.PASSIVE)
  }

  /**
   * Get all active abilities
   * @returns {Array} Array of active ability objects
   */
  getActiveAbilities() {
    return this.abilities.filter(ability => ability.type === AbilityTypes.ACTIVE)
  }
}

export default Commander
