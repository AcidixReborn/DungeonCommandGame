// Order card model based on Dungeon Command specifications

// Action type constants - determines when card can be played and if it taps creature
export const ActionTypes = {
  STANDARD: 'STANDARD',     // Taps creature, main phase only
  MINOR: 'MINOR',           // Doesn't tap creature, main phase only
  IMMEDIATE: 'IMMEDIATE'    // Taps creature, can play on any turn (yours or opponent's)
}

// Ability type constants - determines which creatures can use the card
export const AbilityTypes = {
  STR: 'STR',
  DEX: 'DEX',
  CON: 'CON',
  INT: 'INT',
  WIS: 'WIS',
  CHA: 'CHA',
  ANY: 'ANY'  // Any creature can use regardless of abilities
}

/**
 * OrderCard - Represents an order (spell/ability) card
 * Can be played by creatures that meet the requirements
 */
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
    imageUrl = null,
    range = 1, // Optional: range for Immediate cards (default 1 = adjacent)
    damagePrevented = null, // Amount of damage this IMMEDIATE card prevents (null = not implemented, will default to 0)
    moraleCost = 0, // Morale cost to use this card (only if card ability explicitly requires it, default 0)
    moraleGain = 0, // Morale gained when using this card (e.g., Defiant Stance gains 1 Morale)
    untapAfterUse = false, // If true, creature untaps after using this card (e.g., Tactical Block)
    drawCards = 0, // Number of order cards to draw when using this IMMEDIATE card (e.g., Parry, Defensive Advantage)
    preventsAllDamage = false, // If true, prevents ALL damage from the attack (e.g., Cloud of Bats)
    shiftAfterUse = 0, // Squares creature can shift after using this card (e.g., Cloud of Bats = 6)
    affinityRequired = null, // Keyword required to use this card (e.g., 'VAMPIRE' for Cloud of Bats)
    affinityOverridesRequirements = false, // If true, affinity match bypasses level/ability requirements
    counterAttackDamage = 0, // Fixed damage dealt by counter-attack (e.g., Riposte = 10)
    counterAttackTarget = null, // 'attacker' | 'adjacent_tapped' | 'all_adjacent_tapped'
    counterAttackRequiresAdjacent = false, // If true, counter-attack only works if target is adjacent
    // Target type for IMMEDIATE cards that protect OTHER creatures (not self)
    // 'self' (default) = card user protects themselves
    // 'adjacent_ally' = card user protects adjacent ally (e.g., Defend Ally)
    // 'ally_in_range' = card user protects ally within targetRange squares (e.g., Shield)
    // 'ally_los' = card user protects ally within line of sight (e.g., Warning Shout)
    protectTargetType = 'self',
    protectTargetRange = 0, // Range in squares for 'ally_in_range' targeting (e.g., Shield = 5)
    discardCost = 0, // Number of order cards player must discard to use this card (e.g., Uncanny Dodge = 1)
    opponentDrawsCards = 0, // Cards opponent (attacker) draws when this card is used (e.g., Recoil = 1)
    healAmount = 0, // Amount of healing this card provides when used proactively (e.g., Patch Up = 20)
    canHealProactively = false, // If true, can be used proactively during ACTIVATE to heal (e.g., Patch Up)
    opponentMoraleLoss = 0, // Morale opponent loses when this card is used (e.g., Unexpected Resistance = 1)
    moraleLossTargetType = null // Target type for morale loss: 'adjacent_tapped_enemy' for Unexpected Resistance
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
  }

  /**
   * Check if this card requires tapping the creature
   * @returns {boolean} True if card taps creature
   */
  requiresTap() {
    return this.actionType === ActionTypes.STANDARD || this.actionType === ActionTypes.IMMEDIATE
  }

  /**
   * Check if this is an Immediate action (can be played during any turn)
   * @returns {boolean} True if immediate
   */
  isImmediate() {
    return this.actionType === ActionTypes.IMMEDIATE
  }

  /**
   * Backwards compatibility - Immediate cards can be used as reactions
   * @returns {boolean} True if immediate (can react)
   */
  isReaction() {
    return this.isImmediate()
  }

  /**
   * Check if a creature can use this order card
   * Checks level, creature type, and ability requirements
   * @param {Creature} creature - Creature to check
   * @returns {boolean} True if creature can use this card
   */
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
