// Heart of Cormyr Faction Data
import cormyrCmd1 from '../../assets/commanders/Cormyr_Commander_Card_1.webp'
import cormyrCmd2 from '../../assets/commanders/Cormyr_Commander_Card_2.webp'
import dwarfClericImg from '../../assets/creatures/Corymr_DwarfCleric_Card_3.webp'
import halfOrcThugImg from '../../assets/creatures/Corymr_Half-OrcThug_Card_10.webp'

export const FACTION_NAME = 'Heart of Cormyr'

export const commanders = [
  {
    id: 'hoc_cmd_1',
    name: 'Rhynseera the Alarphon',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 6,
    startingMorale: 12,
    startingLeadership: 7,
    specialAbilityDescription: 'SCROLLBOOK: Once during your turn, you can discard 1 Order card from your hand to draw 1 Order card.',
    imageUrl: cormyrCmd1,
    abilities: [{
      id: 'scrollbook',
      name: 'SCROLLBOOK',
      type: 'ACTIVE',
      category: 'RESOURCE',
      description: 'Once during your turn, you can discard 1 Order card from your hand to draw 1 Order card.',
      effect: {
        discardToDraw: true,
        usesPerTurn: 1
      }
    }]
  },
  {
    id: 'hoc_cmd_2',
    name: 'Valnar Trueblade',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 4,
    startingMorale: 14,
    startingLeadership: 7,
    specialAbilityDescription: 'VERSATILE: Each Adventurer you control can use a standard action to move up to its Speed.',
    imageUrl: cormyrCmd2,
    abilities: [{
      id: 'versatile',
      name: 'VERSATILE',
      type: 'ACTIVE',
      category: 'COMBAT',
      description: 'Each Adventurer you control can use a standard action to move up to its Speed.',
      effect: {
        moveAsAction: true,
        creatureTypesAffected: ['Adventurer']
      }
    }]
  }
]

export const creatures = [
  {
    id: 'hoc_cr_1',
    name: 'Knight',
    level: 5,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 6,
    hitPoints: 100,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 50, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Shield: Reduce damage by 10'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_2',
    name: 'Cleric',
    level: 4,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 6,
    hitPoints: 80,
    abilities: { STR: false, DEX: false, CON: false, INT: false, WIS: true, CHA: true },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Heal: Can restore HP to allies'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_3',
    name: 'Dwarf Cleric',
    level: 3,
    type: ['Humanoid', 'Dwarf', 'Good', 'Adventurer'],
    speed: 5,
    hitPoints: 60,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: true, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['HEALING TOUCH: ⚔ - 1 creature or 1 adjacent ally heals 10 DAMAGE or removes 1 attached Order card.'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg
  },
  {
    id: 'hoc_cr_4',
    name: 'Defender',
    level: 3,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 6,
    hitPoints: 60,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Guard: Can protect adjacent allies'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_5',
    name: 'Paladin #5',
    level: 4,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 6,
    hitPoints: 90,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: true, CHA: false },
    meleeAttack: { damage: 50, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #5'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_6',
    name: 'Wizard #6',
    level: 3,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 6,
    hitPoints: 60,
    abilities: { STR: false, DEX: false, CON: false, INT: true, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 50, range: 7 },
    specialAbilities: ['Placeholder Ability #6', 'Flying: Ignores difficult terrain, can fly over mountains but cannot stop on them'], // Added for testing
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_7',
    name: 'Archer #7',
    level: 3,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 7,
    hitPoints: 60,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 40, range: 9 },
    specialAbilities: ['Placeholder Ability #7'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_8',
    name: 'Fighter #8',
    level: 2,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 6,
    hitPoints: 50,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #8'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_9',
    name: 'Rogue #9',
    level: 2,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 7,
    hitPoints: 50,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #9'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_10',
    name: 'Half-Orc Thug',
    level: 3,
    type: ['Humanoid', 'Half-Orc', 'Adventurer'],
    speed: 6,
    hitPoints: 50,
    abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 20, range: 5 },
    specialAbilities: ['EXPLOSIVE BOLTS 10: Whenever this creature makes a ranged attack, it deals 10 DAMAGE to each creature adjacent to the target.'],
    faction: FACTION_NAME,
    imageUrl: halfOrcThugImg
  },
  {
    id: 'hoc_cr_11',
    name: 'Soldier #11',
    level: 1,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 6,
    hitPoints: 40,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #11'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  },
  {
    id: 'hoc_cr_12',
    name: 'Militia #12',
    level: 1,
    type: ['Humanoid', 'Human', 'Good', 'Adventurer'],
    speed: 6,
    hitPoints: 30,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #12'],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg // PLACEHOLDER FOR TESTING - REMOVE AFTER UI TEST
  }
]

export const orderCards = [
  {
    id: 'hoc_ord_1',
    name: 'Arcane Ritual',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. At the end of its activation, if this creature is in a Magic Circle, discard this Order card.',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_2',
    name: 'Divine Favor',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'Adjacent ally gains +10 damage this turn',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_3',
    name: 'Shield Block',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 30 damage',
    faction: FACTION_NAME,
    imageUrl: null,
    range: 5 // TEST: Extended range - can be used from 5 tiles away
  },
  {
    id: 'hoc_ord_4',
    name: 'Order Card #4',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #4',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_5',
    name: 'Order Card #5',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #5',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_6',
    name: 'Order Card #6',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #6',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_7',
    name: 'Order Card #7',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #7',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_8',
    name: 'Order Card #8',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #8',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_9',
    name: 'Order Card #9',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #9',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_10',
    name: 'Order Card #10',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #10',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_11',
    name: 'Order Card #11',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #11',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_12',
    name: 'Order Card #12',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #12',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_13',
    name: 'Order Card #13',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #13',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_14',
    name: 'Order Card #14',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #14',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_15',
    name: 'Order Card #15',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #15',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_16',
    name: 'Heroic Surge',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    requiresCreatureType: 'Adventurer',
    effectDescription: 'REQUIRES ADVENTURER: Untap this creature.',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_17',
    name: 'Order Card #17',
    level: 2,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #17',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_18',
    name: 'Order Card #18',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #18',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_19',
    name: 'Order Card #19',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #19',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_20',
    name: 'Order Card #20',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #20',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_21',
    name: 'Order Card #21',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #21',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_22',
    name: 'Order Card #22',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #22',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_23',
    name: 'Order Card #23',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #23',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_24',
    name: 'Order Card #24',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #24',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_25',
    name: 'Order Card #25',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #25',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_26',
    name: 'Order Card #26',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #26',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_27',
    name: 'Order Card #27',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #27',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_28',
    name: 'Order Card #28',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #28',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_29',
    name: 'Order Card #29',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #29',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_30',
    name: 'Order Card #30',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #30',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_31',
    name: 'Order Card #31',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #31',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_32',
    name: 'Order Card #32',
    level: 2,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #32',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_33',
    name: 'Order Card #33',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #33',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_34',
    name: 'Order Card #34',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #34',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_35',
    name: 'Order Card #35',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #35',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'hoc_ord_36',
    name: 'Order Card #36',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #36',
    faction: FACTION_NAME,
    imageUrl: null
  }
]

export default {
  FACTION_NAME,
  commanders,
  creatures,
  orderCards
}
