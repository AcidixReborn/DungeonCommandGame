// Blood of Gruumsh Faction Data
import gruumshCmd1 from '../../assets/commanders/Gruumsh_Commander_Card_1.webp'
import gruumshCmd2 from '../../assets/commanders/Gruumsh_Commander_Card_2.webp'

// O(1) - Static imports for creature card images
import boarImg from '../../assets/creatures/Gruumsh_Boar_Card_1.png'
import ogreImg from '../../assets/creatures/Gruumsh_Ogre_Card_2.png'
import orcArcher3Img from '../../assets/creatures/Gruumsh_OrcArcher_Card_3.png'
import orcArcher4Img from '../../assets/creatures/Gruumsh_OrcArcher_Card_4.png'
import orcBarbarianImg from '../../assets/creatures/Gruumsh_OrcBarbarian_Card_5.png'
import orcChieftainImg from '../../assets/creatures/Gruumsh_OrcChieftain_Card_6.png'
import orcClericOfGruumshImg from '../../assets/creatures/Gruumsh_OrcClericOfGruumsh_Card_7.png'
import orcDrudge8Img from '../../assets/creatures/Gruumsh_OrcDrudge_Card_8.png'
import orcDrudge9Img from '../../assets/creatures/Gruumsh_OrcDrudge_Card_9.png'
import orcDruidImg from '../../assets/creatures/Gruumsh_OrcDruid_Card_10.png'
import owlbearImg from '../../assets/creatures/Gruumsh_Owlbear_Card_11.png'
import wereboarImg from '../../assets/creatures/Gruumsh_Wereboar_Card_12.png'

export const FACTION_NAME = 'Blood of Gruumsh'

export const commanders = [
  {
    id: 'bog_cmd_1',
    name: 'Drogar, Eye of Gruumsh',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 4,
    startingMorale: 15,
    startingLeadership: 7,
    specialAbilityDescription: 'GRUUMSH COMMANDS IT: Creatures you control ignore difficult terrain.',
    imageUrl: gruumshCmd1,
    abilities: [{
      id: 'gruumsh_commands_it',
      name: 'GRUUMSH COMMANDS IT',
      type: 'PASSIVE',
      category: 'TERRAIN',
      description: 'Creatures you control ignore difficult terrain.',
      effect: {
        ignoreDifficultTerrain: true
      }
    }]
  },
  {
    id: 'bog_cmd_2',
    name: 'Lokar of the Stonelands',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 3,
    startingMorale: 11,
    startingLeadership: 9,
    specialAbilityDescription: 'ORC SCOUT: When you deploy starting Orc creatures, you can deploy 1 of them in any unoccupied Treasure square on the board.',
    imageUrl: gruumshCmd2,
    abilities: [{
      id: 'orc_scout',
      name: 'ORC SCOUT',
      type: 'ACTIVE',
      category: 'DEPLOYMENT',
      description: 'When you deploy starting Orc creatures, you can deploy 1 of them in any unoccupied Treasure square on the board.',
      effect: {
        deployToTreasure: true,
        creatureTypeRequired: 'Orc',
        usesRemaining: 1  // Only once during initial deployment
      }
    }]
  }
]

export const creatures = [
  // Card #1 - Boar
  {
    id: 'bog_cr_1',
    name: 'Boar',
    level: 3,
    type: ['Beast', 'Boar'],
    speed: 7,
    hitPoints: 60,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'DEATH STRIKE: When this creature would be destroyed, it can first make a melee attack that deals melee DAMAGE. PLACEHOLDER'
    ],
    faction: FACTION_NAME,
    imageUrl: boarImg
  },
  // Card #2 - Ogre
  {
    id: 'bog_cr_2',
    name: 'Ogre',
    level: 6,
    type: ['Humanoid', 'Ogre'],
    speed: 6,
    hitPoints: 100,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 50, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'When you deploy this creature, gain 1 MORALE. PLACEHOLDER'
    ],
    faction: FACTION_NAME,
    imageUrl: ogreImg
  },
  // Card #3 - Orc Archer
  {
    id: 'bog_cr_3',
    name: 'Orc Archer',
    level: 2,
    type: ['Humanoid', 'Orc'],
    speed: 6,
    hitPoints: 30,
    abilities: { STR: false, DEX: true, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 20, range: 10 },
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: orcArcher3Img
  },
  // Card #4 - Orc Archer
  {
    id: 'bog_cr_4',
    name: 'Orc Archer',
    level: 2,
    type: ['Humanoid', 'Orc'],
    speed: 6,
    hitPoints: 30,
    abilities: { STR: false, DEX: true, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 20, range: 10 },
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: orcArcher4Img
  },
  // Card #5 - Orc Barbarian
  {
    id: 'bog_cr_5',
    name: 'Orc Barbarian',
    level: 3,
    type: ['Humanoid', 'Orc'],
    speed: 7,
    hitPoints: 60,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'Whenever an adjacent enemy creature is destroyed, untap this creature. PLACEHOLDER'
    ],
    faction: FACTION_NAME,
    imageUrl: orcBarbarianImg
  },
  // Card #6 - Orc Chieftain
  {
    id: 'bog_cr_6',
    name: 'Orc Chieftain',
    level: 5,
    type: ['Humanoid', 'Orc'],
    speed: 6,
    hitPoints: 90,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'When you deploy this creature, you can reveal an Orc Creature card of Level 3 or lower from your hand. If you do, gain LEADERSHIP equal to the revealed creature\'s Level and immediately deploy that creature. PLACEHOLDER'
    ],
    faction: FACTION_NAME,
    imageUrl: orcChieftainImg
  },
  // Card #7 - Orc Cleric of Gruumsh
  {
    id: 'bog_cr_7',
    name: 'Orc Cleric of Gruumsh',
    level: 5,
    type: ['Evil', 'Humanoid', 'Orc'],
    speed: 6,
    hitPoints: 120,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: true, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'When you deploy this creature, draw 1 Order card. PLACEHOLDER'
    ],
    faction: FACTION_NAME,
    imageUrl: orcClericOfGruumshImg
  },
  // Card #8 - Orc Drudge
  {
    id: 'bog_cr_8',
    name: 'Orc Drudge',
    level: 1,
    type: ['Humanoid', 'Orc'],
    speed: 6,
    hitPoints: 10,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: orcDrudge8Img
  },
  // Card #9 - Orc Drudge
  {
    id: 'bog_cr_9',
    name: 'Orc Drudge',
    level: 1,
    type: ['Humanoid', 'Orc'],
    speed: 6,
    hitPoints: 10,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: orcDrudge9Img
  },
  // Card #10 - Orc Druid
  {
    id: 'bog_cr_10',
    name: 'Orc Druid',
    level: 3,
    type: ['Humanoid', 'Orc'],
    speed: 6,
    hitPoints: 60,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: true, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'When deploying any Beast or Elemental creature, you can place it in any unoccupied square adjacent to this creature. PLACEHOLDER'
    ],
    faction: FACTION_NAME,
    imageUrl: orcDruidImg
  },
  // Card #11 - Owlbear
  {
    id: 'bog_cr_11',
    name: 'Owlbear',
    level: 4,
    type: ['Beast'],
    speed: 6,
    hitPoints: 100,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: owlbearImg
  },
  // Card #12 - Wereboar
  {
    id: 'bog_cr_12',
    name: 'Wereboar',
    level: 4,
    type: ['Beast', 'Humanoid', 'Boar', 'Orc'],
    speed: 6,
    hitPoints: 80,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'DEATH STRIKE: When this creature would be destroyed, it can first make a melee attack that deals melee DAMAGE. PLACEHOLDER'
    ],
    faction: FACTION_NAME,
    imageUrl: wereboarImg
  }
]

export const orderCards = [
  {
    id: 'bog_ord_1',
    name: 'Order Card #1',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #1',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_2',
    name: 'Order Card #2',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #2',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_3',
    name: 'Order Card #3',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #3',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_4',
    name: 'Order Card #4',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #4',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_5',
    name: 'Order Card #5',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #5',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_6',
    name: 'Order Card #6',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #6',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_7',
    name: 'Order Card #7',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #7',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_8',
    name: 'Order Card #8',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #8',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_9',
    name: 'Order Card #9',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #9',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_10',
    name: 'Order Card #10',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #10',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_11',
    name: 'Order Card #11',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #11',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_12',
    name: 'Order Card #12',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #12',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_13',
    name: 'Order Card #13',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #13',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_14',
    name: 'Order Card #14',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #14',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_15',
    name: 'Order Card #15',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #15',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_16',
    name: 'Order Card #16',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #16',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_17',
    name: 'Order Card #17',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #17',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_18',
    name: 'Order Card #18',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #18',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_19',
    name: 'Order Card #19',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #19',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_20',
    name: 'Order Card #20',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #20',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_21',
    name: 'Order Card #21',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #21',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_22',
    name: 'Order Card #22',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #22',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_23',
    name: 'Order Card #23',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #23',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_24',
    name: 'Order Card #24',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #24',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_25',
    name: 'Order Card #25',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #25',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_26',
    name: 'Order Card #26',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #26',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_27',
    name: 'Order Card #27',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #27',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_28',
    name: 'Order Card #28',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #28',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_29',
    name: 'Order Card #29',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #29',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_30',
    name: 'Order Card #30',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #30',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_31',
    name: 'Order Card #31',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #31',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_32',
    name: 'Order Card #32',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #32',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_33',
    name: 'Order Card #33',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Placeholder effect #33',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_34',
    name: 'Order Card #34',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Placeholder effect #34',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_35',
    name: 'Order Card #35',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Placeholder effect #35',
    faction: FACTION_NAME,
    imageUrl: null
  },
  {
    id: 'bog_ord_36',
    name: 'Order Card #36',
    level: 1,
    abilityRequired: 'STR',
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
