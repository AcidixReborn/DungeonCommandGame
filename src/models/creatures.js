// Creature card model based on Dungeon Command specifications
export class Creature {
  constructor({
    id,
    name,
    level,
    type = [], // Array of keywords: humanoid, evil, drow, undead, etc.
    speed,
    hitPoints,
    abilities = {}, // { STR: true, DEX: true, INT: false, WIS: false, CON: true, CHA: false }
    meleeAttack = null, // { damage: number, range: 1 }
    rangedAttack = null, // { damage: number, range: number }
    specialAbilities = [], // Array of special ability descriptions
    faction = '', // Sting of Lolth, Heart of Cormyr, etc.
    imageUrl = null
  }) {
    this.id = id
    this.name = name
    this.level = level
    this.type = type
    this.speed = speed
    this.hitPoints = hitPoints
    this.abilities = abilities
    this.meleeAttack = meleeAttack
    this.rangedAttack = rangedAttack
    this.specialAbilities = specialAbilities
    this.faction = faction
    this.imageUrl = imageUrl
  }

  // Check if creature has a specific ability
  hasAbility(ability) {
    return this.abilities[ability] === true
  }

  // Check if creature can use an order card
  canUseOrder(orderCard) {
    // Creature level must be >= order card level
    if (this.level < orderCard.level) {
      return false
    }

    // Creature must have the required ability (or order requires ANY)
    if (orderCard.abilityRequired === 'ANY') {
      return true
    }

    return this.hasAbility(orderCard.abilityRequired)
  }
}

// Game instance of a creature (tracks state during gameplay)
export class CreatureInstance {
  constructor(creature, owner) {
    this.creature = creature // Reference to base Creature
    this.owner = owner // Player 1 or Player 2
    this.currentHP = creature.hitPoints
    this.position = null // { x, y } on the board
    this.isTapped = false
    this.damageTokens = 0
    this.instanceId = `${creature.id}-${Date.now()}-${Math.random()}`
    this.deployedThisTurn = false // Safe from attacks until next turn
    this.turnDeployed = null // Track which turn it was deployed
  }

  // Mark creature as deployed this turn (safe from attacks)
  markAsDeployed(turnNumber) {
    this.deployedThisTurn = true
    this.turnDeployed = turnNumber
  }

  // Clear deployment protection (called at start of deployer's next turn)
  clearDeploymentProtection() {
    this.deployedThisTurn = false
  }

  takeDamage(amount) {
    this.damageTokens += amount
    this.currentHP = Math.max(0, this.creature.hitPoints - this.damageTokens)
    return this.currentHP <= 0 // Returns true if destroyed
  }

  heal(amount) {
    this.damageTokens = Math.max(0, this.damageTokens - amount)
    this.currentHP = this.creature.hitPoints - this.damageTokens
  }

  tap() {
    this.isTapped = true
  }

  untap() {
    this.isTapped = false
  }

  isDestroyed() {
    return this.currentHP <= 0
  }
}

export default Creature
