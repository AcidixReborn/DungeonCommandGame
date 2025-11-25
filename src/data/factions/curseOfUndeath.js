// Curse of Undeath Faction Data
import undeathCmd1 from '../../assets/commanders/Undeath_Commander_Card_1.webp'
import undeathCmd2 from '../../assets/commanders/Undeath_Commander_Card_2.webp'
import vampireStalkerImg from '../../assets/creatures/Undead_Vampire_Stalker_Card_8.webp'

export const FACTION_NAME = 'Curse of Undeath'

export const commanders = [
  {
    id: 'cou_cmd_1',
    name: 'Delthrin Everet',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 3,
    startingMorale: 12,
    startingLeadership: 6,
    specialAbilityDescription: 'BLOODTHIRSTY: Gain 1 Leadership for each enemy creature destroyed during your turn.',
    imageUrl: undeathCmd1
  },
  {
    id: 'cou_cmd_2',
    name: 'Morgana Valistova',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 5,
    startingMorale: 14,
    startingLeadership: 7,
    specialAbilityDescription: 'UNSTOPPABLE HORDES: All Undead creatures you control gain the Cower power. Lose 1 MORALE. Prevent 20 DAMAGE to this creature from 1 source.',
    imageUrl: undeathCmd2
  }
]

export const creatures = [
  {
    id: 'cou_cr_1',
    name: 'Wraith',
    level: 5,
    type: ['Undead', 'Evil'],
    speed: 8,
    hitPoints: 80,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 50, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Incorporeal: Ignore difficult terrain'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_2',
    name: 'Skeleton Archer',
    level: 3,
    type: ['Undead', 'Skeleton'],
    speed: 6,
    hitPoints: 50,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 30, range: 7 },
    specialAbilities: ['Undead: Immune to morale effects', 'Flying: Ignores difficult terrain, can fly over mountains but cannot stop on them'], // STEP 1: Added for testing
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_3',
    name: 'Zombie',
    level: 2,
    type: ['Undead', 'Zombie'],
    speed: 4,
    hitPoints: 40,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Undead Fortitude: Takes 20% less damage'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_4',
    name: 'Ghoul',
    level: 2,
    type: ['Undead', 'Ghoul'],
    speed: 6,
    hitPoints: 40,
    abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Paralyzing Touch: Can stun enemies'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_5',
    name: 'Vampire #5',
    level: 6,
    type: ['Undead', 'Evil'],
    speed: 7,
    hitPoints: 110,
    abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 55, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #5'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_6',
    name: 'Skeleton Warrior #6',
    level: 3,
    type: ['Undead', 'Skeleton'],
    speed: 6,
    hitPoints: 55,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #6'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_7',
    name: 'Wight #7',
    level: 4,
    type: ['Undead', 'Evil'],
    speed: 6,
    hitPoints: 70,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 40, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #7'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_8',
    name: 'Vampire Stalker',
    level: 4,
    type: ['Undead', 'Evil', 'Humanoid', 'Vampire'],
    speed: 6,
    hitPoints: 80,
    abilities: { STR: false, DEX: true, CON: true, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['LIFE DRAIN: Whenever a target takes damage from this creature\'s melee attack, this creature heals 10 DAMAGE.'],
    faction: FACTION_NAME,
    imageUrl: vampireStalkerImg
  },
  {
    id: 'cou_cr_9',
    name: 'Ghast #9',
    level: 3,
    type: ['Undead', 'Ghoul'],
    speed: 7,
    hitPoints: 50,
    abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #9'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_10',
    name: 'Specter #10',
    level: 2,
    type: ['Undead', 'Evil'],
    speed: 8,
    hitPoints: 35,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 25, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #10'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_11',
    name: 'Zombie Shambler #11',
    level: 1,
    type: ['Undead', 'Zombie'],
    speed: 3,
    hitPoints: 30,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 15, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #11'],
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_cr_12',
    name: 'Skeleton Minion #12',
    level: 1,
    type: ['Undead', 'Skeleton'],
    speed: 6,
    hitPoints: 25,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 12, range: 1 },
    rangedAttack: null,
    specialAbilities: ['Placeholder Ability #12'],
    faction: FACTION_NAME,
    imageUrl: null
  }
]

export const orderCards = [
  {
    id: 'cou_ord_1',
    name: 'Order Card #1',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #1',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_2',
    name: 'Order Card #2',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #2',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_3',
    name: 'Order Card #3',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #3',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_4',
    name: 'Order Card #4',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #4',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_5',
    name: 'Order Card #5',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #5',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_6',
    name: 'Order Card #6',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #6',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_7',
    name: 'Order Card #7',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #7',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_8',
    name: 'Order Card #8',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #8',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_9',
    name: 'Order Card #9',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #9',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_10',
    name: 'Order Card #10',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #10',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_11',
    name: 'Order Card #11',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #11',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_12',
    name: 'Order Card #12',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #12',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_13',
    name: 'Order Card #13',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #13',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_14',
    name: 'Order Card #14',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #14',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_15',
    name: 'Order Card #15',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #15',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_16',
    name: 'Order Card #16',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #16',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_17',
    name: 'Order Card #17',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #17',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_18',
    name: 'Order Card #18',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #18',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_19',
    name: 'Order Card #19',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #19',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_20',
    name: 'Order Card #20',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #20',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_21',
    name: 'Order Card #21',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #21',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_22',
    name: 'Order Card #22',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #22',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_23',
    name: 'Order Card #23',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #23',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_24',
    name: 'Order Card #24',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #24',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_25',
    name: 'Order Card #25',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #25',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_26',
    name: 'Order Card #26',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #26',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_27',
    name: 'Order Card #27',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #27',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_28',
    name: 'Order Card #28',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #28',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_29',
    name: 'Order Card #29',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #29',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_30',
    name: 'Order Card #30',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #30',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_31',
    name: 'Order Card #31',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #31',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_32',
    name: 'Order Card #32',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #32',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_33',
    name: 'Order Card #33',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #33',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_34',
    name: 'Order Card #34',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #34',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_35',
    name: 'Order Card #35',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #35',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'cou_ord_36',
    name: 'Order Card #36',
    level: 1,
    abilityRequired: 'CON',
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
