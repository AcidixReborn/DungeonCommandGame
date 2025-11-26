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
   * @param {string} specialAbility - Special ability name
   * @param {string} specialAbilityDescription - Ability description text
   * @param {string} imageUrl - Commander portrait URL
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
    imageUrl = null
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
  }
}

export default Commander
