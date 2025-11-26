// Tyranny of Goblins Faction Data
import goblinsCmd1 from '../../assets/commanders/Goblins_Commander_Card_1.webp'
import goblinsCmd2 from '../../assets/commanders/Goblins_Commander_Card_2.webp'

export const FACTION_NAME = 'Tyranny of Goblins'

export const commanders = [
  {
    id: 'tog_cmd_1',
    name: 'Snig the Axe',
    faction: FACTION_NAME,
    startingCreatureHandSize: 5,
    startingOrderHandSize: 4,
    startingMorale: 14,
    startingLeadership: 7,
    specialAbilityDescription: 'HORDE: You can deploy creatures during your Refresh Phase.',
    imageUrl: goblinsCmd1
  },
  {
    id: 'tog_cmd_2',
    name: 'Tarkon Draal',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 5,
    startingMorale: 12,
    startingLeadership: 9,
    specialAbilityDescription: 'BLACK HAND OF BANE: Whenever an enemy creature cowers, its controller loses 1 extra Morale.',
    imageUrl: goblinsCmd2
  }
]

export const creatures = [
  {
    id: 'tog_cr_1',
    name: 'Horned Devil',
    level: 6,
    type: ['Devil', 'Evil'],
    speed: 6,
    hitPoints: 120,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 60, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Infernal Charge: Extra damage when charging'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_2',
    name: 'Troll',
    level: 5,
    type: ['Giant', 'Troll'],
    speed: 6,
    hitPoints: 100,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 50, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Regeneration: Heals 10 HP at start of turn'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_3',
    name: 'Hobgoblin',
    level: 3,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 6,
    hitPoints: 60,
    abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Tactical: +10 damage when adjacent to ally'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_4',
    name: 'Goblin',
    level: 1,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 7,
    hitPoints: 20,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Quick: Can move twice'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_5',
    name: 'Bugbear #5',
    level: 4,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 6,
    hitPoints: 75,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 40, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #5'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_6',
    name: 'Goblin Shaman #6',
    level: 3,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 6,
    hitPoints: 50,
    abilities: { STR: false, DEX: false, CON: false, INT: false, WIS: true, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 35, range: 5 },
    specialAbilities: ['Placeholder Ability #6'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_7',
    name: 'Goblin Archer #7',
    level: 2,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 7,
    hitPoints: 35,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 15, range: 1 },
    rangedAttack: { damage: 25, range: 6 },
    specialAbilities: ['Placeholder Ability #7', 'Flying: Ignores difficult terrain, can fly over mountains but cannot stop on them'], // Added for testing
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_8',
    name: 'Goblin Warrior #8',
    level: 2,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 6,
    hitPoints: 40,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #8'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_9',
    name: 'Hobgoblin Soldier #9',
    level: 2,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 6,
    hitPoints: 45,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 25, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #9'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_10',
    name: 'Goblin Scout #10',
    level: 1,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 8,
    hitPoints: 25,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 15, range: 4 },
    specialAbilities: ['Placeholder Ability #10'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_11',
    name: 'Goblin Cutthroat #11',
    level: 1,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 7,
    hitPoints: 22,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 12, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #11'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_cr_12',
    name: 'Goblin Skirmisher #12',
    level: 1,
    type: ['Humanoid', 'Goblinoid', 'Evil'],
    speed: 7,
    hitPoints: 18,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 8, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #12'],
    faction: FACTION_NAME,
    imageUrl: null
  }
]

export const orderCards = [
  {
    id: 'tog_ord_1',
    name: 'Order Card #1',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #1',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_2',
    name: 'Order Card #2',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #2',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_3',
    name: 'Order Card #3',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #3',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_4',
    name: 'Order Card #4',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #4',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_5',
    name: 'Order Card #5',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #5',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_6',
    name: 'Order Card #6',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #6',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_7',
    name: 'Order Card #7',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #7',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_8',
    name: 'Order Card #8',
    level: 2,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #8',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_9',
    name: 'Order Card #9',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #9',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_10',
    name: 'Order Card #10',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #10',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_11',
    name: 'Order Card #11',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #11',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_12',
    name: 'Order Card #12',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #12',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_13',
    name: 'Order Card #13',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #13',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_14',
    name: 'Order Card #14',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #14',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_15',
    name: 'Order Card #15',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #15',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_16',
    name: 'Order Card #16',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #16',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_17',
    name: 'Order Card #17',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #17',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_18',
    name: 'Order Card #18',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #18',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_19',
    name: 'Order Card #19',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #19',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_20',
    name: 'Order Card #20',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #20',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_21',
    name: 'Order Card #21',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #21',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_22',
    name: 'Order Card #22',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #22',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_23',
    name: 'Order Card #23',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #23',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_24',
    name: 'Order Card #24',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #24',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_25',
    name: 'Order Card #25',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #25',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_26',
    name: 'Order Card #26',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #26',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_27',
    name: 'Order Card #27',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #27',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_28',
    name: 'Order Card #28',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #28',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_29',
    name: 'Order Card #29',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #29',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_30',
    name: 'Order Card #30',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #30',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_31',
    name: 'Order Card #31',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #31',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_32',
    name: 'Order Card #32',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #32',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_33',
    name: 'Order Card #33',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #33',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_34',
    name: 'Order Card #34',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #34',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_35',
    name: 'Order Card #35',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #35',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'tog_ord_36',
    name: 'Order Card #36',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
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
