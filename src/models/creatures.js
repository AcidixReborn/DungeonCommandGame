/**
 * Creature - Represents a creature card with stats and abilities
 * Base template for creatures that can be deployed in battle
 */
export class Creature {
  /**
   * @param {string} id - Unique creature ID
   * @param {string} name - Creature name
   * @param {number} level - Leadership cost (1-6)
   * @param {Array} type - Creature types (humanoid, evil, drow, undead, etc.)
   * @param {number} speed - Movement range
   * @param {number} hitPoints - Max HP
   * @param {Object} abilities - Ability scores { STR, DEX, INT, WIS, CON, CHA }
   * @param {Object} meleeAttack - Melee attack { damage, range }
   * @param {Object} rangedAttack - Ranged attack { damage, range }
   * @param {Array} specialAbilities - Special ability text descriptions
   * @param {string} faction - Faction name
   * @param {string} imageUrl - Creature image URL
   */
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

  /**
   * Check if creature has a specific ability score
   * @param {string} ability - Ability name (STR, DEX, etc.)
   * @returns {boolean} True if creature has this ability
   */
  hasAbility(ability) {
    return this.abilities[ability] === true
  }

  /**
   * Check if creature can use an order card
   * Checks level and ability requirements
   * @param {OrderCard} orderCard - Order card to check
   * @returns {boolean} True if creature can use this card
   */
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

/**
 * CreatureInstance - Represents an actual creature in play
 * Tracks HP, position, and state during gameplay
 */
export class CreatureInstance {
  /**
   * @param {Creature} creature - Base creature card
   * @param {string} owner - Player ID who owns this creature
   */
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
    this.hasMovedThisTurn = false // Track if creature has moved this turn
    this.hasAttackedThisTurn = false // Track if creature has attacked this turn
    this.insubstantialUsed = false // INSUBSTANTIAL: Track if ability used this refresh cycle
  }

  /**
   * Mark creature as deployed this turn (protected from attacks until next turn)
   * @param {number} turnNumber - Turn number when deployed
   */
  markAsDeployed(turnNumber) {
    this.deployedThisTurn = true
    this.turnDeployed = turnNumber
  }

  /**
   * Clear deployment protection (called at start of deployer's next turn)
   */
  clearDeploymentProtection() {
    this.deployedThisTurn = false
  }

  /**
   * Apply damage to creature
   * @param {number} amount - Damage amount
   * @returns {boolean} True if creature is destroyed
   */
  takeDamage(amount) {
    this.damageTokens += amount
    this.currentHP = Math.max(0, this.creature.hitPoints - this.damageTokens)
    return this.currentHP <= 0 // Returns true if destroyed
  }

  /**
   * Heal creature damage
   * @param {number} amount - Healing amount
   */
  heal(amount) {
    this.damageTokens = Math.max(0, this.damageTokens - amount)
    this.currentHP = this.creature.hitPoints - this.damageTokens
  }

  /**
   * Tap creature (cannot move or attack)
   */
  tap() {
    this.isTapped = true
  }

  /**
   * Untap creature and reset movement/attack flags
   */
  untap() {
    this.isTapped = false
    this.hasMovedThisTurn = false
    this.hasAttackedThisTurn = false
  }

  /**
   * Check if creature is destroyed
   * @returns {boolean} True if HP <= 0
   */
  isDestroyed() {
    return this.currentHP <= 0
  }
}

export default Creature
