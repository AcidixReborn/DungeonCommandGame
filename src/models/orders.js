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
    abilityRequired, // STR, DEX, CON, INT, WIS, CHA, or ANY
    actionType, // STANDARD, MINOR, or IMMEDIATE
    effectDescription,
    mechanicalEffect = null, // Function that implements the effect
    faction = '',
    imageUrl = null
  }) {
    this.id = id
    this.name = name
    this.level = level
    this.abilityRequired = abilityRequired
    this.actionType = actionType
    this.effectDescription = effectDescription
    this.mechanicalEffect = mechanicalEffect
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
}

export default OrderCard
