// Order card model based on Dungeon Command specifications
import type { Creature } from './creatures.js'

// Action type constants - determines when card can be played and if it taps creature
export const ActionTypes = {
  STANDARD: 'STANDARD', // Taps creature, main phase only
  MINOR: 'MINOR', // Doesn't tap creature, main phase only
  IMMEDIATE: 'IMMEDIATE', // Taps creature, can play on any turn (yours or opponent's)
} as const

export type ActionType = (typeof ActionTypes)[keyof typeof ActionTypes]

// Ability type constants - determines which creatures can use the card
export const AbilityTypes = {
  STR: 'STR',
  DEX: 'DEX',
  CON: 'CON',
  INT: 'INT',
  WIS: 'WIS',
  CHA: 'CHA',
  ANY: 'ANY', // Any creature can use regardless of abilities
} as const

export type AbilityRequirement = (typeof AbilityTypes)[keyof typeof AbilityTypes]

export interface AttachOnUseConfig {
  preventsMovement?: boolean
  removableAsStandard?: boolean
  destroyAtDeploy?: boolean
  blockAmount?: number
  /** Deep Wound: damage dealt at start of the attached creature's controller's ACTIVATE phase */
  damageOnActivation?: number
  [key: string]: unknown
}

export interface OrderCardOptions {
  id: string
  name: string
  level: number
  /** STR, DEX, CON, INT, WIS, CHA, ANY, or array of abilities */
  abilityRequired: AbilityRequirement | AbilityRequirement[]
  actionType: ActionType
  effectDescription: string
  /** Function that implements the effect */
  mechanicalEffect?: ((...args: unknown[]) => unknown) | null
  /** Optional: specific creature type requirement (e.g., 'Adventurer') */
  requiresCreatureType?: string | null
  faction?: string
  imageUrl?: string | null
  /** Range for Immediate cards (default 1 = adjacent) */
  range?: number
  /** Amount of damage this IMMEDIATE card prevents (null = not implemented, will default to 0) */
  damagePrevented?: number | null
  /** Morale cost to use this card (only if card ability explicitly requires it, default 0) */
  moraleCost?: number
  /** Morale gained when using this card (e.g., Defiant Stance gains 1 Morale) */
  moraleGain?: number
  /** If true, creature untaps after using this card (e.g., Tactical Block) */
  untapAfterUse?: boolean
  /** Number of order cards to draw when using this IMMEDIATE card (e.g., Parry, Defensive Advantage) */
  drawCards?: number
  /** If true, prevents ALL damage from the attack (e.g., Cloud of Bats) */
  preventsAllDamage?: boolean
  /** Squares creature can shift after using this card (e.g., Cloud of Bats = 6) */
  shiftAfterUse?: number
  /** Keyword required to use this card (e.g., 'VAMPIRE' for Cloud of Bats) */
  affinityRequired?: string | null
  /** If true, affinity match bypasses level/ability requirements */
  affinityOverridesRequirements?: boolean
  /** Fixed damage dealt by counter-attack (e.g., Riposte = 10) */
  counterAttackDamage?: number
  counterAttackTarget?: 'attacker' | 'adjacent_tapped' | 'all_adjacent_tapped' | null
  /** If true, counter-attack only works if target is adjacent */
  counterAttackRequiresAdjacent?: boolean
  /**
   * Target type for IMMEDIATE cards that protect OTHER creatures (not self):
   * 'self' (default) = card user protects themselves
   * 'adjacent_ally' = card user protects adjacent ally (e.g., Defend Ally)
   * 'ally_in_range' = card user protects ally within targetRange squares (e.g., Shield)
   * 'ally_los' = card user protects ally within line of sight (e.g., Warning Shout)
   */
  protectTargetType?: 'self' | 'adjacent_ally' | 'ally_in_range' | 'ally_los'
  /** Range in squares for 'ally_in_range' targeting (e.g., Shield = 5) */
  protectTargetRange?: number
  /** Number of order cards player must discard to use this card (e.g., Uncanny Dodge = 1) */
  discardCost?: number
  /** Cards opponent (attacker) draws when this card is used (e.g., Recoil = 1) */
  opponentDrawsCards?: number
  /** Amount of healing this card provides when used proactively (e.g., Patch Up = 20) */
  healAmount?: number
  /** If true, can be used proactively during ACTIVATE to heal (e.g., Patch Up) */
  canHealProactively?: boolean
  /** Morale opponent loses when this card is used (e.g., Unexpected Resistance = 1) */
  opponentMoraleLoss?: number
  /** Target type for morale loss: 'adjacent_tapped_enemy' for Unexpected Resistance */
  moraleLossTargetType?: string | null
  /** If true, creature dies after using this card (e.g., Savage Demise) */
  destroySelfAfterUse?: boolean
  /** If true, this is a sacrifice attack that targets adjacent tapped enemy */
  selfSacrificeAttack?: boolean
  /** If true, attack uses creature's base melee damage (e.g., Savage Demise) */
  useBaseMeleeDamage?: boolean
  /** Config: { preventsMovement, removableAsStandard, destroyAtDeploy, blockAmount } */
  attachOnUse?: AttachOnUseConfig | null
  /** If true, removes all attached cards before attaching this one (Tough as Nails) */
  removesAllAttachments?: boolean
  /** If true, can be used proactively during ACTIVATE phase (e.g., Tough as Nails) */
  canUseProactively?: boolean
  /** Bonus damage added to melee attack (e.g., Power Attack = 20, Hacking Frenzy = 40) */
  meleeDamageBonus?: number
  /** Flat damage that REPLACES base damage (e.g., Killing Strike = 100) */
  flatMeleeDamage?: number | null
  /** Bonus damage added to ranged attack (e.g., Gout of Fire = 20) */
  rangedDamageBonus?: number
  /** Cards to draw after STANDARD attack resolves (e.g., Slice = 1) */
  drawCardsOnAttack?: number
  /** Shift distance before attack (e.g., Nimble Strike = 3, Spring Attack = 3) */
  shiftBeforeAttack?: number
  /** Shift distance after attack (e.g., Spring Attack = 3) */
  shiftAfterAttack?: number
  /** 'speed' for Charge cards - move creature's full speed before melee attack */
  moveBeforeAttack?: 'speed' | null
  /** Fixed healing after attack resolves (Feral Vitality=10, Victorious Surge=20, Vampiric Touch=30) */
  healOnAttack?: number
  /** Minimum damage required to trigger healing (Vampiric Touch=10) */
  healOnAttackMinDamage?: number
}

/**
 * OrderCard - Represents an order (spell/ability) card
 * Can be played by creatures that meet the requirements
 */
export class OrderCard {
  id: string
  name: string
  level: number
  abilityRequired: AbilityRequirement | AbilityRequirement[]
  actionType: ActionType
  effectDescription: string
  mechanicalEffect: ((...args: unknown[]) => unknown) | null
  requiresCreatureType: string | null
  faction: string
  imageUrl: string | null
  range: number
  damagePrevented: number | null
  moraleCost: number
  moraleGain: number
  untapAfterUse: boolean
  drawCards: number
  preventsAllDamage: boolean
  shiftAfterUse: number
  affinityRequired: string | null
  affinityOverridesRequirements: boolean
  counterAttackDamage: number
  counterAttackTarget: 'attacker' | 'adjacent_tapped' | 'all_adjacent_tapped' | null
  counterAttackRequiresAdjacent: boolean
  protectTargetType: 'self' | 'adjacent_ally' | 'ally_in_range' | 'ally_los'
  protectTargetRange: number
  discardCost: number
  opponentDrawsCards: number
  healAmount: number
  canHealProactively: boolean
  opponentMoraleLoss: number
  moraleLossTargetType: string | null
  destroySelfAfterUse: boolean
  selfSacrificeAttack: boolean
  useBaseMeleeDamage: boolean
  attachOnUse: AttachOnUseConfig | null
  removesAllAttachments: boolean
  canUseProactively: boolean
  meleeDamageBonus: number
  flatMeleeDamage: number | null
  rangedDamageBonus: number
  drawCardsOnAttack: number
  shiftBeforeAttack: number
  shiftAfterAttack: number
  moveBeforeAttack: 'speed' | null
  healOnAttack: number
  healOnAttackMinDamage: number

  constructor({
    id,
    name,
    level,
    abilityRequired,
    actionType,
    effectDescription,
    mechanicalEffect = null,
    requiresCreatureType = null,
    faction = '',
    imageUrl = null,
    range = 1,
    damagePrevented = null,
    moraleCost = 0,
    moraleGain = 0,
    untapAfterUse = false,
    drawCards = 0,
    preventsAllDamage = false,
    shiftAfterUse = 0,
    affinityRequired = null,
    affinityOverridesRequirements = false,
    counterAttackDamage = 0,
    counterAttackTarget = null,
    counterAttackRequiresAdjacent = false,
    protectTargetType = 'self',
    protectTargetRange = 0,
    discardCost = 0,
    opponentDrawsCards = 0,
    healAmount = 0,
    canHealProactively = false,
    opponentMoraleLoss = 0,
    moraleLossTargetType = null,
    destroySelfAfterUse = false,
    selfSacrificeAttack = false,
    useBaseMeleeDamage = false,
    attachOnUse = null,
    removesAllAttachments = false,
    canUseProactively = false,
    meleeDamageBonus = 0,
    flatMeleeDamage = null,
    rangedDamageBonus = 0,
    drawCardsOnAttack = 0,
    shiftBeforeAttack = 0,
    shiftAfterAttack = 0,
    moveBeforeAttack = null,
    healOnAttack = 0,
    healOnAttackMinDamage = 0,
  }: OrderCardOptions) {
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
    this.range = range // Range in tiles for Immediate card usage (1 = adjacent)
    this.damagePrevented = damagePrevented // Amount of damage this IMMEDIATE card prevents (null = not implemented, defaults to 0)
    this.moraleCost = moraleCost // Morale cost to use this card (0 = no cost, only set if card ability explicitly requires it)
    this.moraleGain = moraleGain // Morale gained when using this card (0 = no gain)
    this.untapAfterUse = untapAfterUse // If true, creature untaps after using this IMMEDIATE card
    this.drawCards = drawCards // Number of order cards to draw when using this IMMEDIATE card
    this.preventsAllDamage = preventsAllDamage // If true, prevents ALL damage from the attack
    this.shiftAfterUse = shiftAfterUse // Squares creature can shift after using this card
    this.affinityRequired = affinityRequired // Keyword required to use this card (e.g., 'VAMPIRE')
    this.affinityOverridesRequirements = affinityOverridesRequirements // If true, affinity bypasses level/ability requirements
    this.counterAttackDamage = counterAttackDamage // Fixed damage dealt by counter-attack
    this.counterAttackTarget = counterAttackTarget // Target type: 'attacker', 'adjacent_tapped', 'all_adjacent_tapped'
    this.counterAttackRequiresAdjacent = counterAttackRequiresAdjacent // If true, counter-attack requires adjacent target
    this.protectTargetType = protectTargetType // Who can be protected: 'self', 'adjacent_ally', 'ally_in_range', 'ally_los'
    this.protectTargetRange = protectTargetRange // Range for 'ally_in_range' targeting (0 = N/A)
    this.discardCost = discardCost // Number of order cards player must discard to use this card
    this.opponentDrawsCards = opponentDrawsCards // Cards opponent (attacker) draws when this card is used
    this.healAmount = healAmount // Amount of healing this card provides when used proactively
    this.canHealProactively = canHealProactively // If true, can be used proactively during ACTIVATE to heal
    this.opponentMoraleLoss = opponentMoraleLoss // Morale opponent loses when this card is used
    this.moraleLossTargetType = moraleLossTargetType // Target type for morale loss: 'adjacent_tapped_enemy'
    this.destroySelfAfterUse = destroySelfAfterUse // If true, creature dies after using this card
    this.selfSacrificeAttack = selfSacrificeAttack // If true, targets adjacent tapped enemy for sacrifice attack
    this.useBaseMeleeDamage = useBaseMeleeDamage // If true, attack uses creature's base melee damage
    // Attachment properties
    this.attachOnUse = attachOnUse // Config: { preventsMovement, removableAsStandard, destroyAtDeploy, blockAmount }
    this.removesAllAttachments = removesAllAttachments // If true, removes all attached cards first (Tough as Nails)
    this.canUseProactively = canUseProactively // If true, can be used proactively during ACTIVATE phase
    // STANDARD damage boost properties (Phase STD-1)
    this.meleeDamageBonus = meleeDamageBonus // Bonus damage added to melee attack (e.g., Power Attack = 20)
    this.flatMeleeDamage = flatMeleeDamage // Flat damage that REPLACES base damage (e.g., Killing Strike = 100)
    // STANDARD damage boost properties (Phase STD-2)
    this.rangedDamageBonus = rangedDamageBonus // Bonus damage added to ranged attack (e.g., Gout of Fire = 20)
    // STANDARD damage boost properties (Phase STD-3)
    this.drawCardsOnAttack = drawCardsOnAttack // Cards to draw after STANDARD attack resolves (e.g., Slice = 1)
    // STANDARD shift + attack properties (Phase STD-4)
    this.shiftBeforeAttack = shiftBeforeAttack // Shift distance before attack (e.g., Nimble Strike = 3)
    this.shiftAfterAttack = shiftAfterAttack // Shift distance after attack (e.g., Spring Attack = 3)
    // STANDARD charge properties (Phase STD-5)
    this.moveBeforeAttack = moveBeforeAttack // 'speed' for Charge cards
    // STANDARD attack + heal properties (Phase STD-6)
    this.healOnAttack = healOnAttack // Fixed healing after attack resolves (e.g., Feral Vitality = 10)
    this.healOnAttackMinDamage = healOnAttackMinDamage // Minimum damage required to trigger healing (e.g., Vampiric Touch = 10)
  }

  /**
   * Check if this card requires tapping the creature
   */
  requiresTap(): boolean {
    return this.actionType === ActionTypes.STANDARD || this.actionType === ActionTypes.IMMEDIATE
  }

  /**
   * Check if this is an Immediate action (can be played during any turn)
   */
  isImmediate(): boolean {
    return this.actionType === ActionTypes.IMMEDIATE
  }

  /**
   * Backwards compatibility - Immediate cards can be used as reactions
   */
  isReaction(): boolean {
    return this.isImmediate()
  }

  /**
   * Check if a creature can use this order card
   * Checks level, creature type, and ability requirements
   * Also handles affinity overrides (e.g., VAMPIRE AFFINITY bypasses level/ability requirements)
   */
  canBeUsedBy(creature: Creature): boolean {
    // AFFINITY CHECK: If card has affinityRequired, check if creature has matching type
    // When affinityOverridesRequirements is true:
    //   - Creature with matching affinity BYPASSES level and ability requirements
    //   - Creature WITHOUT matching affinity CANNOT use the card at all
    if (this.affinityRequired) {
      const hasAffinity = creature.type.some(
        (t) => t.toUpperCase() === this.affinityRequired!.toUpperCase()
      )

      if (this.affinityOverridesRequirements) {
        // Affinity overrides everything - creature MUST have matching type
        // If they do, they can use it regardless of level/ability
        // If they don't, they cannot use it at all
        return hasAffinity
      }
      // Affinity is optional boost but creature must still meet requirements
      // (currently not used, but supported for future cards) - fall through either way
    }

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
      return this.abilityRequired.some((ability) => creature.abilities[ability])
    }

    // If single ability, creature must have that ability
    return Boolean(creature.abilities[this.abilityRequired])
  }
}

export default OrderCard
