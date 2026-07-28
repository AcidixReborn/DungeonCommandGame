/**
 * Commander Ability Types
 */
export const AbilityTypes = {
  PASSIVE: 'PASSIVE', // Automatically applied in background
  ACTIVE: 'ACTIVE', // Requires UI interaction (popup/button)
} as const

export type AbilityType = (typeof AbilityTypes)[keyof typeof AbilityTypes]

/**
 * Commander Ability Categories
 */
export const AbilityCategories = {
  TERRAIN: 'TERRAIN', // Affects terrain movement costs
  SPEED: 'SPEED', // Modifies creature speed
  DEPLOYMENT: 'DEPLOYMENT', // Affects deployment rules
  COMBAT: 'COMBAT', // Affects combat outcomes
  RESOURCE: 'RESOURCE', // Affects morale, leadership, or cards
} as const

export type AbilityCategory = (typeof AbilityCategories)[keyof typeof AbilityCategories]

export interface CommanderAbility {
  id: string
  name: string
  type: AbilityType
  category?: AbilityCategory
  description?: string
  [key: string]: unknown
}

export interface CommanderOptions {
  id: string
  name: string
  faction: string
  startingCreatureHandSize: number
  startingOrderHandSize: number
  startingMorale: number
  startingLeadership: number
  specialAbility?: string
  specialAbilityDescription?: string
  imageUrl?: string | null
  abilities?: CommanderAbility[]
}

/**
 * Commander - Represents a faction commander with starting stats
 * Defines initial hand sizes, morale, leadership, and special abilities
 */
export class Commander {
  id: string
  name: string
  faction: string
  startingCreatureHandSize: number
  startingOrderHandSize: number
  startingMorale: number
  startingLeadership: number
  specialAbility?: string
  specialAbilityDescription: string
  imageUrl: string | null
  abilities: CommanderAbility[]

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
    abilities = [],
  }: CommanderOptions) {
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
   */
  hasAbility(abilityId: string): boolean {
    return this.abilities.some((ability) => ability.id === abilityId)
  }

  /**
   * Get an ability by ID
   */
  getAbility(abilityId: string): CommanderAbility | null {
    return this.abilities.find((ability) => ability.id === abilityId) || null
  }

  /**
   * Get all passive abilities
   */
  getPassiveAbilities(): CommanderAbility[] {
    return this.abilities.filter((ability) => ability.type === AbilityTypes.PASSIVE)
  }

  /**
   * Get all active abilities
   */
  getActiveAbilities(): CommanderAbility[] {
    return this.abilities.filter((ability) => ability.type === AbilityTypes.ACTIVE)
  }
}

export default Commander
