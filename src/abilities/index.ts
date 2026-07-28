/**
 * AbilityManager - Central export for all creature abilities
 *
 * This module provides a unified interface for all creature abilities across all factions.
 * Each ability is organized by faction and type for easy lookup and maintenance.
 *
 * Usage:
 *   import { Flying, FlashingBlades, LifeDrain } from './abilities'
 *   import Abilities from './abilities'
 *
 *   // Check if creature has ability
 *   if (Flying.has(creature)) { ... }
 *
 *   // Access by faction
 *   Abilities.Drow.FlashingBlades.has(creature)
 */

import type { CreatureInstance } from '../models/creatures.js'

// Shared abilities (multi-faction)
export * from './shared/index.js'
import SharedAbilities from './shared/index.js'

// Drow abilities (Sting of Lolth)
export * from './drow/index.js'
import DrowAbilities from './drow/index.js'

// Cormyr abilities (Heart of Cormyr)
export * from './cormyr/index.js'
import CormyrAbilities from './cormyr/index.js'

// Goblin abilities (Tyranny of Goblins)
export * from './goblins/index.js'
import GoblinAbilities from './goblins/index.js'

// Undead abilities (Curse of Undeath)
export * from './undead/index.js'
import UndeadAbilities from './undead/index.js'

// Orc abilities (Blood of Gruumsh)
export * from './orcs/index.js'
import OrcAbilities from './orcs/index.js'

// The common contract every ability module shares - individual modules also expose
// extra methods (getBonus, apply, canUse, etc.) not captured here.
interface AbilityLike {
  id: string
  has?: (creatureInstance: CreatureInstance) => boolean
}

/**
 * AbilityManager provides organized access to all abilities by faction
 */
export const AbilityManager = {
  // Shared abilities
  Shared: SharedAbilities,

  // Faction-specific abilities
  Drow: DrowAbilities,
  Cormyr: CormyrAbilities,
  Goblins: GoblinAbilities,
  Undead: UndeadAbilities,
  Orcs: OrcAbilities,

  /**
   * Get all abilities that a creature might have
   */
  getAbilities(creatureInstance: CreatureInstance): AbilityLike[] {
    const abilities: AbilityLike[] = []
    const allAbilities = [
      ...Object.values(SharedAbilities),
      ...Object.values(DrowAbilities),
      ...Object.values(CormyrAbilities),
      ...Object.values(GoblinAbilities),
      ...Object.values(UndeadAbilities),
      ...Object.values(OrcAbilities),
    ] as AbilityLike[]

    for (const ability of allAbilities) {
      if (ability.has && ability.has(creatureInstance)) {
        abilities.push(ability)
      }
    }

    return abilities
  },

  /**
   * Get ability by ID
   */
  getById(abilityId: string): AbilityLike | null {
    const allAbilities = [
      ...Object.values(SharedAbilities),
      ...Object.values(DrowAbilities),
      ...Object.values(CormyrAbilities),
      ...Object.values(GoblinAbilities),
      ...Object.values(UndeadAbilities),
      ...Object.values(OrcAbilities),
    ] as AbilityLike[]

    return allAbilities.find((a) => a.id === abilityId) || null
  },

  /**
   * Check if creature has a specific ability by ID
   */
  hasAbility(creatureInstance: CreatureInstance, abilityId: string): boolean {
    const ability = this.getById(abilityId)
    if (!ability || !ability.has) return false
    return ability.has(creatureInstance)
  },
}

export default AbilityManager
