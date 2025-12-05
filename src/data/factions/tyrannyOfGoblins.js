// Tyranny of Goblins Faction Data
// ============================================================================
// IMPORTS
// ============================================================================
import goblinsCmd1 from '../../assets/commanders/Goblins_Commander_Card_1.webp'
import goblinsCmd2 from '../../assets/commanders/Goblins_Commander_Card_2.webp'

// Creature Card Images - O(1) import time, loaded once at module initialization
import bugbearBerserkerImg from '../../assets/creatures/Goblin_BugBear_Card_1.png'
import feralTrollImg from '../../assets/creatures/Goblin_FeralTroll_Card_2.png'
import goblinArcherImg from '../../assets/creatures/Goblin_GoblinArcher_Card_3.png'
import goblinChampionImg from '../../assets/creatures/Goblin_GoblinChampion_Card_4.png'
import goblinCutter1Img from '../../assets/creatures/Goblin_GoblinCutter_Card_5.png'
import goblinCutter2Img from '../../assets/creatures/Goblin_GoblinCutter_Card_6.png'
import goblinWolfRiderImg from '../../assets/creatures/Goblin_GoblinWolfRider_Card_7.png'
import hobgoblinSoldier1Img from '../../assets/creatures/Goblin_HobgoblinSoldier_Card_8.png'
import hobgoblinSoldier2Img from '../../assets/creatures/Goblin_HobgoblinSoldier_Card_9.png'
import hobgoblinSorcererImg from '../../assets/creatures/Goblin_HobgoblinSorcerer_Card_10.png'
import hornedDevilImg from '../../assets/creatures/Goblin_HordnedDevil_Card_11.png'
import wolfImg from '../../assets/creatures/Goblin_Wolf_Card_12.png'

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
    imageUrl: goblinsCmd1,
    abilities: [{
      id: 'horde',
      name: 'HORDE',
      type: 'PASSIVE',
      category: 'DEPLOYMENT',
      description: 'You can deploy creatures during your Refresh Phase.',
      effect: {
        deployInRefreshPhase: true
      }
    }]
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
    imageUrl: goblinsCmd2,
    abilities: [{
      id: 'black_hand_of_bane',
      name: 'BLACK HAND OF BANE',
      type: 'PASSIVE',
      category: 'COMBAT',
      description: 'Whenever an enemy creature cowers, its controller loses 1 extra Morale.',
      effect: {
        extraCowerMoraleLoss: 1
      }
    }]
  }
]

// ============================================================================
// CREATURES ARRAY - Updated with accurate stats from physical cards
// Stats extracted from card images - O(n) where n = 12 creatures
// ============================================================================
export const creatures = [
  // Card 1: Bugbear Berserker - Level 4, HP 90, Speed 7, Melee 20
  {
    id: 'tog_cr_1',
    name: 'Bugbear Berserker',
    level: 4,
    type: ['Humanoid', 'Bugbear'],
    speed: 7,
    hitPoints: 90,
    abilities: { STR: true, DEX: true, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: Whenever an adjacent enemy creature is destroyed, untap this creature.'],
    faction: FACTION_NAME,
    imageUrl: bugbearBerserkerImg
  },
  // Card 2: Feral Troll - Level 5, HP 120, Speed 6, Melee 30
  {
    id: 'tog_cr_2',
    name: 'Feral Troll',
    level: 5,
    type: ['Humanoid', 'Troll'],
    speed: 6,
    hitPoints: 120,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: REGENERATE 10 - At the start of its controllers turn, this creature heals 10 damage.'],
    faction: FACTION_NAME,
    imageUrl: feralTrollImg
  },
  // Card 3: Goblin Archer - Level 1, HP 10, Speed 6, Melee 0, Ranged 20 (range 5)
  {
    id: 'tog_cr_3',
    name: 'Goblin Archer',
    level: 1,
    type: ['Humanoid', 'Goblin'],
    speed: 6,
    hitPoints: 10,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: null, // No melee attack (0 damage on card)
    rangedAttack: { damage: 20, range: 5 },
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: goblinArcherImg
  },
  // Card 4: Goblin Champion - Level 3, HP 50, Speed 6, Melee 20
  {
    id: 'tog_cr_4',
    name: 'Goblin Champion',
    level: 3,
    type: ['Humanoid', 'Goblin'],
    speed: 6,
    hitPoints: 50,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: FLANKING - This creatures melee attacks deal +10 damage while at least 1 allied creature is adjacent to the target.'],
    faction: FACTION_NAME,
    imageUrl: goblinChampionImg
  },
  // Card 5: Goblin Cutter (1 of 2) - Level 1, HP 10, Speed 6, Melee 10
  {
    id: 'tog_cr_5',
    name: 'Goblin Cutter',
    level: 1,
    type: ['Humanoid', 'Goblin'],
    speed: 6,
    hitPoints: 10,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: This creatures melee attacks deal +10 damage against tapped creatures.'],
    faction: FACTION_NAME,
    imageUrl: goblinCutter1Img
  },
  // Card 6: Goblin Cutter (2 of 2) - Level 1, HP 10, Speed 6, Melee 10
  {
    id: 'tog_cr_6',
    name: 'Goblin Cutter',
    level: 1,
    type: ['Humanoid', 'Goblin'],
    speed: 6,
    hitPoints: 10,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: This creatures melee attacks deal +10 damage against tapped creatures.'],
    faction: FACTION_NAME,
    imageUrl: goblinCutter2Img
  },
  // Card 7: Goblin Wolf Rider - Level 4, HP 80, Speed 8, Melee 20
  {
    id: 'tog_cr_7',
    name: 'Goblin Wolf Rider',
    level: 4,
    type: ['Beast', 'Humanoid', 'Goblin', 'Wolf'],
    speed: 8,
    hitPoints: 80,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: RIDER - When this creature is destroyed, you can immediately deploy 1 Goblin or Wolf creature of Level 3 or lower in the square it occupied.'],
    faction: FACTION_NAME,
    imageUrl: goblinWolfRiderImg
  },
  // Card 8: Hobgoblin Soldier (1 of 2) - Level 3, HP 70, Speed 6, Melee 20
  {
    id: 'tog_cr_8',
    name: 'Hobgoblin Soldier',
    level: 3,
    type: ['Humanoid', 'Hobgoblin'],
    speed: 6,
    hitPoints: 70,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: hobgoblinSoldier1Img
  },
  // Card 9: Hobgoblin Soldier (2 of 2) - Level 3, HP 70, Speed 6, Melee 20
  {
    id: 'tog_cr_9',
    name: 'Hobgoblin Soldier',
    level: 3,
    type: ['Humanoid', 'Hobgoblin'],
    speed: 6,
    hitPoints: 70,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: hobgoblinSoldier2Img
  },
  // Card 10: Hobgoblin Sorcerer - Level 3, HP 40, Speed 6, Melee 10, Ranged 20 (range 10)
  {
    id: 'tog_cr_10',
    name: 'Hobgoblin Sorcerer',
    level: 3,
    type: ['Humanoid', 'Hobgoblin'],
    speed: 6,
    hitPoints: 40,
    abilities: { STR: false, DEX: false, CON: false, INT: true, WIS: false, CHA: true },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 20, range: 10 },
    specialAbilities: ['PLACEHOLDER: While this creature is in a Magic Circle square, all Goblins, Hobgoblins, and Bugbears you control gain - Prevent 10 damage to this creature from 1 source.'],
    faction: FACTION_NAME,
    imageUrl: hobgoblinSorcererImg
  },
  // Card 11: Horned Devil - Level 6, HP 140, Speed 6, Melee 40
  {
    id: 'tog_cr_11',
    name: 'Horned Devil',
    level: 6,
    type: ['Evil', 'Humanoid', 'Devil'],
    speed: 6,
    hitPoints: 140,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 40, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'PLACEHOLDER: FLYING',
      'PLACEHOLDER: REACH 2 - Creatures 2 spaces away count as adjacent to this creature.',
      'PLACEHOLDER: As a standard action, make a melee attack. If the target takes damage from this attack, tap it.'
    ],
    faction: FACTION_NAME,
    imageUrl: hornedDevilImg
  },
  // Card 12: Wolf - Level 2, HP 40, Speed 8, Melee 10
  {
    id: 'tog_cr_12',
    name: 'Wolf',
    level: 2,
    type: ['Beast', 'Wolf'],
    speed: 8,
    hitPoints: 40,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: Whenever a target creature takes damage from this creatures melee attack, tap the target.'],
    faction: FACTION_NAME,
    imageUrl: wolfImg
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
