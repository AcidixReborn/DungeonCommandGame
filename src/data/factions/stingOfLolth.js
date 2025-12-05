// Sting of Lolth Faction Data
import lolthCmd1 from '../../assets/commanders/Lolth_Commander_Card_1.webp'
import lolthCmd2 from '../../assets/commanders/Lolth_Commander_Card_2.webp'

// O(1) - Static imports for creature card images
import demonwebSpider1Img from '../../assets/creatures/Drow_DemonwebSpider_Card_1.png'
import demonwebSpider2Img from '../../assets/creatures/Drow_DemonwebSpider_Card_2.png'
import driderImg from '../../assets/creatures/Drow_Drider_Card_3.png'
import drowAssassinImg from '../../assets/creatures/Drow_DrowAssassin_Card_4.png'
import drowBlademasterImg from '../../assets/creatures/Drow_DrowBladeMaster_Card_5.png'
import drowHouseGuard6Img from '../../assets/creatures/Drow_DrowHouseGuard_6.png'
import drowHouseGuard7Img from '../../assets/creatures/Drow_DrowHouseGuard_Card_7.png'
import drowPriestessImg from '../../assets/creatures/Drow_DrowPriestess_Card_8.png'
import drowWizardImg from '../../assets/creatures/Drow_DrowWizard_Card_9.png'
import giantSpiderImg from '../../assets/creatures/Drow_GiantSpider_Card_10.png'
import shadowMastiffImg from '../../assets/creatures/Drow_ShadowMastiff_Card_11.png'
import umberHulkImg from '../../assets/creatures/Drow_UmberHulk_Card_12.png'

export const FACTION_NAME = 'Sting of Lolth'

export const commanders = [
  {
    id: 'sol_cmd_1',
    name: 'Aliszandra Malistros',
    faction: FACTION_NAME,
    startingCreatureHandSize: 4,
    startingOrderHandSize: 5,
    startingMorale: 13,
    startingLeadership: 7,
    specialAbilityDescription: 'WALLS OF WEB: Add 2 to the Speed of each Spider and Drow you control.',
    imageUrl: lolthCmd1,
    abilities: [{
      id: 'walls_of_web',
      name: 'WALLS OF WEB',
      type: 'PASSIVE',
      category: 'SPEED',
      description: 'Add 2 to the Speed of each Spider and Drow you control.',
      effect: {
        speedBonus: 2,
        creatureTypesAffected: ['Spider', 'Drow']
      }
    }]
  },
  {
    id: 'sol_cmd_2',
    name: 'Kalteros the Sellsword',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 4,
    startingMorale: 12,
    startingLeadership: 9,
    specialAbilityDescription: 'SELLSWORD: Whenever a Drow you control collects a Treasure token, you can draw 1 Order card instead of gaining 1 Morale.',
    imageUrl: lolthCmd2,
    abilities: [{
      id: 'sellsword',
      name: 'SELLSWORD',
      type: 'ACTIVE',
      category: 'RESOURCE',
      description: 'Whenever a Drow you control collects a Treasure token, you can draw 1 Order card instead of gaining 1 Morale.',
      effect: {
        triggerOnTreasure: true,
        creatureTypeRequired: 'Drow',
        choices: ['morale', 'card']  // Player chooses +1 morale or draw 1 card
      }
    }]
  }
]

// O(n) where n = 12 creatures - Array of creature definitions with accurate physical card stats
export const creatures = [
  {
    id: 'sol_cr_1',
    name: 'Demonweb Spider',
    level: 1,
    type: ['Beast', 'Spider'],
    speed: 7,
    hitPoints: 20,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: ['SCUTTLE: This creature shifts when it moves.'],
    faction: FACTION_NAME,
    imageUrl: demonwebSpider1Img
  },
  {
    id: 'sol_cr_2',
    name: 'Demonweb Spider',
    level: 1,
    type: ['Beast', 'Spider'],
    speed: 7,
    hitPoints: 20,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: ['SCUTTLE: This creature shifts when it moves.'],
    faction: FACTION_NAME,
    imageUrl: demonwebSpider2Img
  },
  {
    id: 'sol_cr_3',
    name: 'Drider',
    level: 4,
    type: ['Aberrant', 'Drow', 'Spider'],
    speed: 10,
    hitPoints: 100,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['SCUTTLE: This creature shifts when it moves.'],
    faction: FACTION_NAME,
    imageUrl: driderImg
  },
  {
    id: 'sol_cr_4',
    name: 'Drow Assassin',
    level: 4,
    type: ['Evil', 'Humanoid', 'Drow'],
    speed: 6,
    hitPoints: 80,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 20, range: 5 },
    specialAbilities: ['HIDDEN BLADE: (Placeholder - ability effect to be implemented)'],
    faction: FACTION_NAME,
    imageUrl: drowAssassinImg
  },
  {
    id: 'sol_cr_5',
    name: 'Drow Blademaster',
    level: 3,
    type: ['Humanoid', 'Drow', 'Adventurer'],
    speed: 6,
    hitPoints: 60,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['FLASHING BLADES: (Placeholder - ability effect to be implemented)'],
    faction: FACTION_NAME,
    imageUrl: drowBlademasterImg
  },
  {
    id: 'sol_cr_6',
    name: 'Drow House Guard',
    level: 2,
    type: ['Humanoid', 'Drow'],
    speed: 6,
    hitPoints: 40,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 10, range: 5 },
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: drowHouseGuard6Img
  },
  {
    id: 'sol_cr_7',
    name: 'Drow House Guard',
    level: 2,
    type: ['Humanoid', 'Drow'],
    speed: 6,
    hitPoints: 40,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 10, range: 5 },
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: drowHouseGuard7Img
  },
  {
    id: 'sol_cr_8',
    name: 'Drow Priestess',
    level: 3,
    type: ['Evil', 'Humanoid', 'Drow'],
    speed: 6,
    hitPoints: 60,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: true, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['SUMMON SPIDER: When deploying any Spider creature, you can place it in any unoccupied square within 5 squares of this creature.'],
    faction: FACTION_NAME,
    imageUrl: drowPriestessImg
  },
  {
    id: 'sol_cr_9',
    name: 'Drow Wizard',
    level: 2,
    type: ['Humanoid', 'Drow', 'Adventurer'],
    speed: 6,
    hitPoints: 30,
    abilities: { STR: false, DEX: true, CON: false, INT: true, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 20, range: 10 },
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: drowWizardImg
  },
  {
    id: 'sol_cr_10',
    name: 'Giant Spider',
    level: 3,
    type: ['Beast', 'Spider'],
    speed: 7,
    hitPoints: 60,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['SCUTTLE: This creature shifts when it moves.'],
    faction: FACTION_NAME,
    imageUrl: giantSpiderImg
  },
  {
    id: 'sol_cr_11',
    name: 'Shadow Mastiff',
    level: 4,
    type: ['Beast'],
    speed: 8,
    hitPoints: 80,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['SHADOW STALKER: When deploying this creature, you can place it in any unoccupied square adjacent to a wall.'],
    faction: FACTION_NAME,
    imageUrl: shadowMastiffImg
  },
  {
    id: 'sol_cr_12',
    name: 'Umber Hulk',
    level: 5,
    type: ['Aberrant'],
    speed: 6,
    hitPoints: 100,
    abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['BURROW', 'CONFUSION GAZE: As a standard action, choose 1 enemy creature within 5 squares and slide that creature 3 squares, then make a melee attack that deals melee DAMAGE.'],
    faction: FACTION_NAME,
    imageUrl: umberHulkImg
  }
]

export const orderCards = [
  {
    id: 'sol_ord_1',
    name: 'Deadly Strike',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Deal +20 damage on your next melee attack',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_2',
    name: 'Shadow Step',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Move up to your speed without provoking attacks',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_3',
    name: 'Dark Shield',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 damage',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_4',
    name: 'Order Card #4',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #4',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_5',
    name: 'Order Card #5',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #5',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_6',
    name: 'Order Card #6',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #6',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_7',
    name: 'Order Card #7',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #7',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_8',
    name: 'Order Card #8',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #8',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_9',
    name: 'Order Card #9',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #9',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_10',
    name: 'Order Card #10',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #10',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_11',
    name: 'Order Card #11',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #11',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_12',
    name: 'Order Card #12',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #12',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_13',
    name: 'Order Card #13',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #13',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_14',
    name: 'Order Card #14',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #14',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_15',
    name: 'Order Card #15',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #15',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_16',
    name: 'Order Card #16',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #16',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_17',
    name: 'Order Card #17',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #17',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_18',
    name: 'Order Card #18',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #18',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_19',
    name: 'Order Card #19',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #19',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_20',
    name: 'Order Card #20',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #20',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_21',
    name: 'Order Card #21',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #21',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_22',
    name: 'Order Card #22',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #22',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_23',
    name: 'Order Card #23',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #23',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_24',
    name: 'Order Card #24',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #24',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_25',
    name: 'Order Card #25',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #25',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_26',
    name: 'Order Card #26',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #26',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_27',
    name: 'Order Card #27',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #27',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_28',
    name: 'Order Card #28',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #28',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_29',
    name: 'Order Card #29',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #29',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_30',
    name: 'Order Card #30',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #30',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_31',
    name: 'Order Card #31',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #31',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_32',
    name: 'Order Card #32',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #32',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_33',
    name: 'Order Card #33',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #33',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_34',
    name: 'Order Card #34',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #34',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_35',
    name: 'Order Card #35',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #35',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'sol_ord_36',
    name: 'Order Card #36',
    level: 1,
    abilityRequired: 'STR',
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
