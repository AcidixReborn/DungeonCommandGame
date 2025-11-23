// Commander card model based on Dungeon Command specifications
export class Commander {
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
