import type { OrderCard, AttachOnUseConfig } from './orders.js'

export interface AttackProfile {
  damage: number
  range: number
}

export interface AbilityScores {
  STR?: boolean
  DEX?: boolean
  CON?: boolean
  INT?: boolean
  WIS?: boolean
  CHA?: boolean
}

export interface OrderCardLike {
  level: number
  abilityRequired: string | 'ANY'
}

export interface AttachedCard {
  card: OrderCard
  casterOwner: string
  attachedTurn: number
  /** Cached copy of card.attachOnUse for quick access - not always populated */
  attachOnUse?: AttachOnUseConfig
}

export interface CreatureOptions {
  id: string
  name: string
  level: number
  /** Array of keywords: humanoid, evil, drow, undead, etc. */
  type?: string[]
  speed: number
  hitPoints: number
  abilities?: AbilityScores
  meleeAttack?: AttackProfile | null
  rangedAttack?: AttackProfile | null
  /** Array of special ability text descriptions */
  specialAbilities?: string[]
  /** Sting of Lolth, Heart of Cormyr, etc. */
  faction?: string
  imageUrl?: string | null
  /** REACH: Extended melee attack range (e.g., 2 = can attack 2 tiles away) */
  reach?: number
  /** TAP ON HIT: Target is tapped when taking damage from melee attack */
  tapOnHit?: boolean
}

/**
 * Creature - Represents a creature card with stats and abilities
 * Base template for creatures that can be deployed in battle
 */
export class Creature {
  id: string
  name: string
  level: number
  type: string[]
  speed: number
  hitPoints: number
  abilities: AbilityScores
  meleeAttack: AttackProfile | null
  rangedAttack: AttackProfile | null
  specialAbilities: string[]
  faction: string
  imageUrl: string | null
  reach: number
  tapOnHit: boolean

  constructor({
    id,
    name,
    level,
    type = [],
    speed,
    hitPoints,
    abilities = {},
    meleeAttack = null,
    rangedAttack = null,
    specialAbilities = [],
    faction = '',
    imageUrl = null,
    reach = 0,
    tapOnHit = false,
  }: CreatureOptions) {
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
    this.reach = reach // REACH 2: Horned Devil can melee attack at range 1 OR 2
    this.tapOnHit = tapOnHit // TAP ON HIT: Horned Devil, Wolf tap target on melee damage
  }

  /**
   * Check if creature has a specific ability score
   */
  hasAbility(ability: keyof AbilityScores): boolean {
    return this.abilities[ability] === true
  }

  /**
   * Check if creature can use an order card
   * Checks level and ability requirements
   */
  canUseOrder(orderCard: OrderCardLike): boolean {
    // Creature level must be >= order card level
    if (this.level < orderCard.level) {
      return false
    }

    // Creature must have the required ability (or order requires ANY)
    if (orderCard.abilityRequired === 'ANY') {
      return true
    }

    return this.hasAbility(orderCard.abilityRequired as keyof AbilityScores)
  }
}

/**
 * CreatureInstance - Represents an actual creature in play
 * Tracks HP, position, and state during gameplay
 */
export class CreatureInstance {
  creature: Creature
  owner: string
  currentHP: number
  position: { x: number; y: number } | null
  isTapped: boolean
  damageTokens: number
  instanceId: string
  deployedThisTurn: boolean
  turnDeployed: number | null
  hasMovedThisTurn: boolean
  hasAttackedThisTurn: boolean
  insubstantialUsed: boolean
  magicCircleShieldUsed: boolean
  attachedCards: AttachedCard[];
  // Additional runtime flags get attached ad-hoc by various ability modules
  // (e.g. reachDecision, deployedThisTurn variants) - kept loosely typed for now.
  [key: string]: unknown

  constructor(creature: Creature, owner: string) {
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
    this.magicCircleShieldUsed = false // MAGIC CIRCLE AURA: Track if shield used this turn
    this.attachedCards = [] // Order cards attached to this creature (e.g., Web)
    // Each attached card: { card: OrderCard, casterOwner: playerId, attachedTurn: turnNumber }
  }

  /**
   * Mark creature as deployed this turn (protected from attacks until next turn)
   */
  markAsDeployed(turnNumber: number): void {
    this.deployedThisTurn = true
    this.turnDeployed = turnNumber
  }

  /**
   * Clear deployment protection (called at start of deployer's next turn)
   */
  clearDeploymentProtection(): void {
    this.deployedThisTurn = false
  }

  /**
   * Apply damage to creature
   * @returns True if creature is destroyed
   */
  takeDamage(amount: number): boolean {
    this.damageTokens += amount
    this.currentHP = Math.max(0, this.creature.hitPoints - this.damageTokens)
    return this.currentHP <= 0 // Returns true if destroyed
  }

  /**
   * Heal creature damage
   */
  heal(amount: number): void {
    this.damageTokens = Math.max(0, this.damageTokens - amount)
    this.currentHP = this.creature.hitPoints - this.damageTokens
  }

  /**
   * Tap creature (cannot move or attack)
   */
  tap(): void {
    this.isTapped = true
  }

  /**
   * Untap creature and reset movement/attack flags
   */
  untap(): void {
    this.isTapped = false
    this.hasMovedThisTurn = false
    this.hasAttackedThisTurn = false
  }

  /**
   * Check if creature is destroyed
   */
  isDestroyed(): boolean {
    return this.currentHP <= 0
  }
}

export default Creature
