// Order card model based on Dungeon Command specifications
export const ActionTypes = {
  STANDARD: 'STANDARD',
  MINOR: 'MINOR',
  IMMEDIATE: 'IMMEDIATE'
}

export const AbilityTypes = {
  STR: 'STR',
  DEX: 'DEX',
  CON: 'CON',
  INT: 'INT',
  WIS: 'WIS',
  CHA: 'CHA',
  ANY: 'ANY'
}

export class OrderCard {
  constructor({
    id,
    name,
    level,
    abilityRequired, // STR, DEX, CON, INT, WIS, CHA, ANY, or array of abilities
    actionType, // STANDARD, MINOR, or IMMEDIATE
    effectDescription,
    mechanicalEffect = null, // Function that implements the effect
    requiresCreatureType = null, // Optional: specific creature type requirement (e.g., 'Adventurer')
    faction = '',
    imageUrl = null
  }) {
    this.id = id
    this.name = name
    this.level = level
    // Support both single ability and array of abilities
    this.abilityRequired = Array.isArray(abilityRequired) ? abilityRequired : abilityRequired
    this.actionType = actionType
    this.effectDescription = effectDescription
    this.mechanicalEffect = mechanicalEffect
    this.requiresCreatureType = requiresCreatureType
    this.faction = faction
    this.imageUrl = imageUrl
  }

  // Check if this card requires tapping
  requiresTap() {
    return this.actionType === ActionTypes.STANDARD || this.actionType === ActionTypes.IMMEDIATE
  }

  // Check if this can be played during opponent's turn
  isReaction() {
    return this.actionType === ActionTypes.IMMEDIATE
  }

  // Check if a creature can use this order card
  canBeUsedBy(creature) {
    // Check level requirement: creature level must be >= card level
    if (creature.level < this.level) {
      return false
    }

    // Check creature type requirement
    if (this.requiresCreatureType && !creature.type.includes(this.requiresCreatureType)) {
      return false
    }

    // Check ability requirement
    if (this.abilityRequired === 'ANY') {
      return true
    }

    // If abilityRequired is an array, creature needs at least one of those abilities
    if (Array.isArray(this.abilityRequired)) {
      return this.abilityRequired.some(ability => creature.abilities[ability])
    }

    // If single ability, creature must have that ability
    return creature.abilities[this.abilityRequired]
  }
}

export default OrderCard
