// Curse of Undeath Faction Data
import undeathCmd1 from '../../assets/commanders/Undeath_Commander_Card_1.webp'
import undeathCmd2 from '../../assets/commanders/Undeath_Commander_Card_2.webp'

// O(1) - Static imports for creature card images
import discipleOfKyussImg from '../../assets/creatures/Undead_DiscipleOfKyuss_Card_1.png'
import dracolichImg from '../../assets/creatures/Undead_Dracolich_Card_2.png'
import gravehoundImg from '../../assets/creatures/Undead_Gravehound_Card_3.png'
import hypnoticSpiritImg from '../../assets/creatures/Undead_HypnoticSpirit_Card_4.png'
import lichNecromancerImg from '../../assets/creatures/Undead_LichNecromaner_Card_5.png'
import skeletalLancerImg from '../../assets/creatures/Undead_SkeletalLancer_Card_6.png'
import skeletalTombGuardianImg from '../../assets/creatures/Undead_SkeletalTombGuardian_Card_7.png'
import vampireStalkerImg from '../../assets/creatures/Undead_VampireStalker_Card_8.png'
import warriorSkeleton9Img from '../../assets/creatures/Undead_WarriorSkeleton_Card_9.png'
import warriorSkeleton10Img from '../../assets/creatures/Undead_WarriorSkeleton_Card_10.png'
import zombie11Img from '../../assets/creatures/Undead_Zombie_Card_11.png'
import zombie12Img from '../../assets/creatures/Undead_Zombie_Card_12.png'

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
    imageUrl: undeathCmd1,
    abilities: [{
      id: 'bloodthirsty',
      name: 'BLOODTHIRSTY',
      type: 'PASSIVE',
      category: 'RESOURCE',
      description: 'Gain 1 Leadership for each enemy creature destroyed during your turn.',
      effect: {
        gainLeadershipOnKill: 1
      }
    }]
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
    imageUrl: undeathCmd2,
    abilities: [{
      id: 'unstoppable_hordes',
      name: 'UNSTOPPABLE HORDES',
      type: 'PASSIVE',
      category: 'COMBAT',
      description: 'All Undead creatures you control can prevent damage. Tap an untapped Undead creature: Lose 1 MORALE, prevent 20 DAMAGE. Multiple creatures can stack.',
      effect: {
        grantUnstoppableHordes: true,
        creatureTypesAffected: ['Undead'],
        unstoppableHordesMoraleCost: 1,
        unstoppableHordesDamagePrevented: 20
      }
    }]
  }
]

// O(n) where n = 12 creatures - Array of creature definitions with accurate physical card stats
export const creatures = [
  // Card 1: Disciple of Kyuss - Level 4, HP 70, Speed 6, INT CHA, Ranged 20 (10), Melee 10
  {
    id: 'cou_cr_1',
    name: 'Disciple of Kyuss',
    level: 4,
    type: ['Evil', 'Beast', 'Humanoid', 'Undead'],
    speed: 6,
    hitPoints: 70,
    abilities: { STR: false, DEX: false, CON: false, INT: true, WIS: false, CHA: true },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 20, range: 10 },
    specialAbilities: ['PLACEHOLDER: Each enemy creature takes 10 DAMAGE whenever it ends its activation adjacent to this creature.'],
    faction: FACTION_NAME,
    imageUrl: discipleOfKyussImg
  },
  // Card 2: Dracolich - Level 6, HP 110, Speed 6, INT CHA, Ranged 20 (5), Melee 30
  {
    id: 'cou_cr_2',
    name: 'Dracolich',
    level: 6,
    type: ['Evil', 'Dragon', 'Undead'],
    speed: 6,
    hitPoints: 110,
    abilities: { STR: false, DEX: false, CON: false, INT: true, WIS: false, CHA: true },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: { damage: 20, range: 5 },
    specialAbilities: ['PLACEHOLDER: FLYING', 'PLACEHOLDER: LIGHTNING BREATH - As a standard action, make up to 3 ranged attacks. Each attack must target a different enemy creature.'],
    faction: FACTION_NAME,
    imageUrl: dracolichImg
  },
  // Card 3: Gravehound - Level 2, HP 40, Speed 8, DEX CON, Melee 10
  {
    id: 'cou_cr_3',
    name: 'Gravehound',
    level: 2,
    type: ['Beast', 'Undead', 'Zombie'],
    speed: 8,
    hitPoints: 40,
    abilities: { STR: false, DEX: true, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: gravehoundImg
  },
  // Card 4: Hypnotic Spirit - Level 3, HP 40, Speed 6, CHA, Melee 20
  {
    id: 'cou_cr_4',
    name: 'Hypnotic Spirit',
    level: 3,
    type: ['Undead', 'Spirit'],
    speed: 6,
    hitPoints: 40,
    abilities: { STR: false, DEX: false, CON: false, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: PHASING - This creature shifts and ignores walls while moving. It cannot end its movement in a wall space.', 'PLACEHOLDER: INSUBSTANTIAL - Prevent all damage to this creature from 1 source.'],
    faction: FACTION_NAME,
    imageUrl: hypnoticSpiritImg
  },
  // Card 5: Lich Necromancer - Level 5, HP 80, Speed 6, INT CHA, Ranged 30 (5), Melee 20
  {
    id: 'cou_cr_5',
    name: 'Lich Necromancer',
    level: 5,
    type: ['Evil', 'Humanoid', 'Undead'],
    speed: 6,
    hitPoints: 80,
    abilities: { STR: false, DEX: false, CON: false, INT: true, WIS: false, CHA: true },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 30, range: 5 },
    specialAbilities: ['PLACEHOLDER: When deploying any Undead creature, you can place it in any unoccupied square adjacent to this creature.'],
    faction: FACTION_NAME,
    imageUrl: lichNecromancerImg
  },
  // Card 6: Skeletal Lancer - Level 4, HP 100, Speed 8, CON, Melee 20
  {
    id: 'cou_cr_6',
    name: 'Skeletal Lancer',
    level: 4,
    type: ['Beast', 'Humanoid', 'Undead', 'Skeleton'],
    speed: 8,
    hitPoints: 100,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: RIDER - When this creature is destroyed, you can immediately deploy 1 Skeleton creature of Level 3 or lower in any square it occupied.'],
    faction: FACTION_NAME,
    imageUrl: skeletalLancerImg
  },
  // Card 7: Skeletal Tomb Guardian - Level 3, HP 60, Speed 6, CON, Melee 20
  {
    id: 'cou_cr_7',
    name: 'Skeletal Tomb Guardian',
    level: 3,
    type: ['Humanoid', 'Undead', 'Skeleton'],
    speed: 6,
    hitPoints: 60,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: Whenever this creature makes a melee attack, it deals 20 DAMAGE to each other enemy creature adjacent to this creature.'],
    faction: FACTION_NAME,
    imageUrl: skeletalTombGuardianImg
  },
  // Card 8: Vampire Stalker - Level 4, HP 80, Speed 6, DEX CON CHA, Melee 30
  {
    id: 'cou_cr_8',
    name: 'Vampire Stalker',
    level: 4,
    type: ['Evil', 'Humanoid', 'Undead', 'Vampire'],
    speed: 6,
    hitPoints: 80,
    abilities: { STR: false, DEX: true, CON: true, INT: false, WIS: false, CHA: true },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: LIFE DRAIN - Whenever a target takes damage from this creature\'s melee attack, this creature heals 10 DAMAGE.'],
    faction: FACTION_NAME,
    imageUrl: vampireStalkerImg
  },
  // Card 9: Warrior Skeleton - Level 2, HP 50, Speed 6, CON, Melee 20
  {
    id: 'cou_cr_9',
    name: 'Warrior Skeleton',
    level: 2,
    type: ['Humanoid', 'Undead', 'Skeleton'],
    speed: 6,
    hitPoints: 50,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: warriorSkeleton9Img
  },
  // Card 10: Warrior Skeleton - Level 2, HP 50, Speed 6, CON, Melee 20
  {
    id: 'cou_cr_10',
    name: 'Warrior Skeleton',
    level: 2,
    type: ['Humanoid', 'Undead', 'Skeleton'],
    speed: 6,
    hitPoints: 50,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: warriorSkeleton10Img
  },
  // Card 11: Zombie - Level 1, HP 40, Speed 4, CON, Melee 10
  {
    id: 'cou_cr_11',
    name: 'Zombie',
    level: 1,
    type: ['Humanoid', 'Undead', 'Zombie'],
    speed: 4,
    hitPoints: 40,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: During your Deploy phase, you can pay 1 MORALE to deploy this creature from your graveyard.'],
    faction: FACTION_NAME,
    imageUrl: zombie11Img
  },
  // Card 12: Zombie - Level 1, HP 40, Speed 4, CON, Melee 10
  {
    id: 'cou_cr_12',
    name: 'Zombie',
    level: 1,
    type: ['Humanoid', 'Undead', 'Zombie'],
    speed: 4,
    hitPoints: 40,
    abilities: { STR: false, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: ['PLACEHOLDER: During your Deploy phase, you can pay 1 MORALE to deploy this creature from your graveyard.'],
    faction: FACTION_NAME,
    imageUrl: zombie12Img
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
