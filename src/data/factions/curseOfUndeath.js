// Curse of Undeath Faction Data
import undeathCmd1 from '../../assets/commanders/Undeath_Commander_Card_1.webp'
import undeathCmd2 from '../../assets/commanders/Undeath_Commander_Card_2.webp'

// O(1) - Static imports for creature card images
import discipleOfKyussImg from '../../assets/creatures/undeath/Undead_DiscipleOfKyuss_Card_1.png'
import dracolichImg from '../../assets/creatures/undeath/Undead_Dracolich_Card_2.png'
import gravehoundImg from '../../assets/creatures/undeath/Undead_Gravehound_Card_3.png'
import hypnoticSpiritImg from '../../assets/creatures/undeath/Undead_HypnoticSpirit_Card_4.png'
import lichNecromancerImg from '../../assets/creatures/undeath/Undead_LichNecromaner_Card_5.png'
import skeletalLancerImg from '../../assets/creatures/undeath/Undead_SkeletalLancer_Card_6.png'
import skeletalTombGuardianImg from '../../assets/creatures/undeath/Undead_SkeletalTombGuardian_Card_7.png'
import vampireStalkerImg from '../../assets/creatures/undeath/Undead_VampireStalker_Card_8.png'
import warriorSkeleton9Img from '../../assets/creatures/undeath/Undead_WarriorSkeleton_Card_9.png'
import warriorSkeleton10Img from '../../assets/creatures/undeath/Undead_WarriorSkeleton_Card_10.png'
import zombie11Img from '../../assets/creatures/undeath/Undead_Zombie_Card_11.png'
import zombie12Img from '../../assets/creatures/undeath/Undead_Zombie_Card_12.png'

// O(1) - Static imports for order card images (36 cards)
import callToBattleOrder1Img from '../../assets/orders/undead/Undead_CallToBattle_Order_1.png'
import carefulAttackOrder2Img from '../../assets/orders/undead/Undead_CarefulAttack_Order_2.png'
import carefulAttackOrder3Img from '../../assets/orders/undead/Undead_CarefulAttack_Order_3.png'
import cloudOfBatsOrder4Img from '../../assets/orders/undead/Undead_CloudOfBats_Order_4.png'
import corrosiveBloodOrder5Img from '../../assets/orders/undead/Undead_CorrosiveBlood_Order_5.png'
import deathGripOrder6Img from '../../assets/orders/undead/Undead_DeathGrip_Order_6.png'
import deathGripOrder7Img from '../../assets/orders/undead/Undead_DeathGrip_Order_7.png'
import defensiveAdvantageOrder8Img from '../../assets/orders/undead/Undead_DefensiveAdvantage_Order_8.png'
import defensiveAdvantageOrder9Img from '../../assets/orders/undead/Undead_DefensiveAdvantage_Order_9.png'
import dimensionDoorOrder10Img from '../../assets/orders/undead/Undead_DimensionDoor_Order_10.png'
import dispelMagicOrder11Img from '../../assets/orders/undead/Undead_DispelMagic_Order_11.png'
import fearOrder12Img from '../../assets/orders/undead/Undead_Fear_Order_12.png'
import fearOrder13Img from '../../assets/orders/undead/Undead_Fear_Order_13.png'
import goutOfFireOrder14Img from '../../assets/orders/undead/Undead_GoutOfFire_Order_14.png'
import goutOfFireOrder15Img from '../../assets/orders/undead/Undead_GoutOfFire_Order_15.png'
import hulkingAttackOrder16Img from '../../assets/orders/undead/Undead_HulkingAttack_Order_16.png'
import hulkingAttackOrder17Img from '../../assets/orders/undead/Undead_HulkingAttack_Order_17.png'
import hypnoticGazeOrder18Img from '../../assets/orders/undead/Undead_HypnoticGaze_Order_18.png'
import hypnoticGazeOrder19Img from '../../assets/orders/undead/Undead_HypnoticGaze_Order_19.png'
import mageArmorOrder20Img from '../../assets/orders/undead/Undead_MageArmor_Order_20.png'
import mageArmorOrder21Img from '../../assets/orders/undead/Undead_MageArmor_Order_21.png'
import magicShortSwordOrder22Img from '../../assets/orders/undead/Undead_MagicShortSword_Order_22.png'
import necroticHowlOrder23Img from '../../assets/orders/undead/Undead_NecroticHowl_Order_23.png'
import necroticHowlOrder24Img from '../../assets/orders/undead/Undead_NercoticHowl_Order_24.png'
import regenerateOrder25Img from '../../assets/orders/undead/Undead_Regenerate_Order_25.png'
import relentlessAdvanceOrder26Img from '../../assets/orders/undead/Undead_RelentlessAdvance_Order_26.png'
import relentlessAdvanceOrder27Img from '../../assets/orders/undead/Undead_RelentlessAdvance_Order_27.png'
import spawnOfKyussOrder28Img from '../../assets/orders/undead/Undead_SpawnOfKyuss_Order_28.png'
import terrifyingRevelationOrder29Img from '../../assets/orders/undead/Undead_TerrifyingRevelation_Order_29.png'
import unbreakableOrder30Img from '../../assets/orders/undead/Undead_Unbreakable_Order_30.png'
import unbreakableOrder31Img from '../../assets/orders/undead/Undead_Unbreakable_Order_31.png'
import unendingHordeOrder32Img from '../../assets/orders/undead/Undead_UnendingHorde_Order_32.png'
import vampiricTouchOrder33Img from '../../assets/orders/undead/Undead_VampiricTouch_Order_33.png'
import vampiricTouchOrder34Img from '../../assets/orders/undead/Undead_VampiricTouch_Order_34.png'
import warningShoutOrder35Img from '../../assets/orders/undead/Undead_WarningShot_Order_35.png'
import warningShoutOrder36Img from '../../assets/orders/undead/Undead_WarningShot_Order_36.png'

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
    specialAbilities: ['DISCIPLE_OF_KYUSS: Each enemy creature takes 10 DAMAGE whenever it ends its activation adjacent to this creature.'],
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
    specialAbilities: ['FLYING: This creature ignores difficult terrain and can move over mountains (but cannot stop on them).', 'LIGHTNING BREATH: As a standard action, make up to 3 ranged attacks. Each attack must target a different enemy creature.'],
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
    specialAbilities: ['PHASING: This creature ignores terrain and can move through other creatures. Cannot end movement on mountains or other creatures.', 'INSUBSTANTIAL: Prevent all damage to this creature from 1 source. Resets at the start of this creature\'s faction Refresh phase.'],
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
    specialAbilities: ['ADJACENT UNDEAD DEPLOY: When deploying any Undead creature from Curse of Undeath, you can place it in any unoccupied square adjacent to this creature (not on mountains).'],
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
    specialAbilities: ['RIDER: When this creature is destroyed, you may deploy 1 Skeleton creature (Level 3 or lower) from your hand to this tile. Morale loss = (4 - deployed creature level).'],
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
    specialAbilities: ['SWIRL: Whenever this creature makes a melee attack, it deals 20 DAMAGE to each other enemy creature adjacent to this creature (automatic, each target can defend).'],
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
    specialAbilities: ['LIFE DRAIN: Whenever a target takes damage from this creature\'s melee attack, this creature heals 10 DAMAGE (capped at max HP).'],
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
    specialAbilities: ['GRAVEYARD DEPLOY: During your Deploy phase, pay 1 MORALE to deploy this creature from your graveyard.'],
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
    specialAbilities: ['GRAVEYARD DEPLOY: During your Deploy phase, pay 1 MORALE to deploy this creature from your graveyard.'],
    faction: FACTION_NAME,
    imageUrl: zombie12Img
  }
]

// O(n) where n = 36 order cards - Array of order card definitions
export const orderCards = [
  // Card 1: Call to Battle - Level 3, CHA, MINOR
  {
    id: 'cou_ord_1',
    name: 'Call to Battle',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. (S): As a standard action, deploy 1 creature now. If this creature is in a Magic Circle square, you gain 1 Morale before deploying.',
    faction: FACTION_NAME,
    imageUrl: callToBattleOrder1Img
  },
  // Card 2: Careful Attack - Level 1, CON, STANDARD
  {
    id: 'cou_ord_2',
    name: 'Careful Attack',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +10 damage. Attach this card to this creature. Remove this card to prevent 10 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: carefulAttackOrder2Img
  },
  // Card 3: Careful Attack - Level 1, CON, STANDARD
  {
    id: 'cou_ord_3',
    name: 'Careful Attack',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +10 damage. Attach this card to this creature. Remove this card to prevent 10 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: carefulAttackOrder3Img
  },
  // Card 4: Cloud of Bats - Level 5, INT, IMMEDIATE
  {
    id: 'cou_ord_4',
    name: 'Cloud of Bats',
    level: 5,
    abilityRequired: 'INT',
    actionType: 'IMMEDIATE',
    effectDescription: 'VAMPIRE AFFINITY (Any Vampire creature can take this action.) Prevent all damage to this creature from 1 source, then shift 6 squares.',
    faction: FACTION_NAME,
    imageUrl: cloudOfBatsOrder4Img
  },
  // Card 5: Corrosive Blood - Level 1, CON, IMMEDIATE
  {
    id: 'cou_ord_5',
    name: 'Corrosive Blood',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'REQUIRES UNDEAD. Prevent 10 damage to this creature from 1 source. Deal 10 damage to each tapped creature adjacent to this creature.',
    requiresCreatureType: 'Undead',
    faction: FACTION_NAME,
    imageUrl: corrosiveBloodOrder5Img
  },
  // Card 6: Death Grip - Level 1, ANY, STANDARD
  {
    id: 'cou_ord_6',
    name: 'Death Grip',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'STANDARD',
    effectDescription: 'REQUIRES UNDEAD. Make a melee attack that deals +10 damage for each other Undead creature you control that is adjacent to the target.',
    requiresCreatureType: 'Undead',
    faction: FACTION_NAME,
    imageUrl: deathGripOrder6Img
  },
  // Card 7: Death Grip - Level 1, ANY, STANDARD
  {
    id: 'cou_ord_7',
    name: 'Death Grip',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'STANDARD',
    effectDescription: 'REQUIRES UNDEAD. Make a melee attack that deals +10 damage for each other Undead creature you control that is adjacent to the target.',
    requiresCreatureType: 'Undead',
    faction: FACTION_NAME,
    imageUrl: deathGripOrder7Img
  },
  // Card 8: Defensive Advantage - Level 2, CON, IMMEDIATE
  {
    id: 'cou_ord_8',
    name: 'Defensive Advantage',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 damage to this creature from 1 source. Draw 1 Order card.',
    faction: FACTION_NAME,
    imageUrl: defensiveAdvantageOrder8Img
  },
  // Card 9: Defensive Advantage - Level 2, CON, IMMEDIATE
  {
    id: 'cou_ord_9',
    name: 'Defensive Advantage',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 damage to this creature from 1 source. Draw 1 Order card.',
    faction: FACTION_NAME,
    imageUrl: defensiveAdvantageOrder9Img
  },
  // Card 10: Dimension Door - Level 4, INT, MINOR
  {
    id: 'cou_ord_10',
    name: 'Dimension Door',
    level: 4,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Place this creature in any square within 9 squares. (This creature does not need line of sight to the target square.)',
    faction: FACTION_NAME,
    imageUrl: dimensionDoorOrder10Img
  },
  // Card 11: Dispel Magic - Level 3, INT, MINOR
  {
    id: 'cou_ord_11',
    name: 'Dispel Magic',
    level: 3,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Choose this creature or any creature within 5 squares. The chosen creature removes 1 attached Order card of your choice.',
    faction: FACTION_NAME,
    imageUrl: dispelMagicOrder11Img
  },
  // Card 12: Fear - Level 3, CHA, MINOR
  {
    id: 'cou_ord_12',
    name: 'Fear',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'DRAGON AFFINITY (Any Dragon creature can take this action.) Slide each adjacent enemy creature 5 squares.',
    faction: FACTION_NAME,
    imageUrl: fearOrder12Img
  },
  // Card 13: Fear - Level 3, CHA, MINOR
  {
    id: 'cou_ord_13',
    name: 'Fear',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'DRAGON AFFINITY (Any Dragon creature can take this action.) Slide each adjacent enemy creature 5 squares.',
    faction: FACTION_NAME,
    imageUrl: fearOrder13Img
  },
  // Card 14: Gout of Fire - Level 3, INT, STANDARD
  {
    id: 'cou_ord_14',
    name: 'Gout of Fire',
    level: 3,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'REQUIRES RANGED. Make a ranged attack that deals +20 damage.',
    faction: FACTION_NAME,
    imageUrl: goutOfFireOrder14Img
  },
  // Card 15: Gout of Fire - Level 3, INT, STANDARD
  {
    id: 'cou_ord_15',
    name: 'Gout of Fire',
    level: 3,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'REQUIRES RANGED. Make a ranged attack that deals +20 damage.',
    faction: FACTION_NAME,
    imageUrl: goutOfFireOrder15Img
  },
  // Card 16: Hulking Attack - Level 2, CON, STANDARD
  {
    id: 'cou_ord_16',
    name: 'Hulking Attack',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +10 damage. If the target takes damage from this attack, you gain 1 morale.',
    faction: FACTION_NAME,
    imageUrl: hulkingAttackOrder16Img
  },
  // Card 17: Hulking Attack - Level 2, CON, STANDARD
  {
    id: 'cou_ord_17',
    name: 'Hulking Attack',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +10 damage. If the target takes damage from this attack, you gain 1 morale.',
    faction: FACTION_NAME,
    imageUrl: hulkingAttackOrder17Img
  },
  // Card 18: Hypnotic Gaze - Level 3, CHA, STANDARD
  {
    id: 'cou_ord_18',
    name: 'Hypnotic Gaze',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Choose 1 enemy creature within 5 squares. Slide that creature 3 squares. Make a melee attack that deals +20 damage.',
    faction: FACTION_NAME,
    imageUrl: hypnoticGazeOrder18Img
  },
  // Card 19: Hypnotic Gaze - Level 3, CHA, STANDARD
  {
    id: 'cou_ord_19',
    name: 'Hypnotic Gaze',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Choose 1 enemy creature within 5 squares. Slide that creature 3 squares. Make a melee attack that deals +20 damage.',
    faction: FACTION_NAME,
    imageUrl: hypnoticGazeOrder19Img
  },
  // Card 20: Mage Armor - Level 1, INT, MINOR
  {
    id: 'cou_ord_20',
    name: 'Mage Armor',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. (S): Prevent 10 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: mageArmorOrder20Img
  },
  // Card 21: Mage Armor - Level 1, INT, MINOR
  {
    id: 'cou_ord_21',
    name: 'Mage Armor',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. (S): Prevent 10 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: mageArmorOrder21Img
  },
  // Card 22: Magic Short Sword - Level 1, ANY, MINOR
  {
    id: 'cou_ord_22',
    name: 'Magic Short Sword',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES HUMANOID. Attach this card to this creature. Damage from this creature\'s melee attacks cannot be prevented.',
    requiresCreatureType: 'Humanoid',
    faction: FACTION_NAME,
    imageUrl: magicShortSwordOrder22Img
  },
  // Card 23: Necrotic Howl - Level 3, CHA, MINOR
  {
    id: 'cou_ord_23',
    name: 'Necrotic Howl',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES UNDEAD. Deal 10 damage to each enemy creature adjacent to this creature.',
    requiresCreatureType: 'Undead',
    faction: FACTION_NAME,
    imageUrl: necroticHowlOrder23Img
  },
  // Card 24: Necrotic Howl - Level 3, CHA, MINOR
  {
    id: 'cou_ord_24',
    name: 'Necrotic Howl',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES UNDEAD. Deal 10 damage to each enemy creature adjacent to this creature.',
    requiresCreatureType: 'Undead',
    faction: FACTION_NAME,
    imageUrl: necroticHowlOrder24Img
  },
  // Card 25: Regenerate - Level 4, CON, MINOR
  {
    id: 'cou_ord_25',
    name: 'Regenerate',
    level: 4,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. REGENERATE 10 (At the start of its controller\'s turn, this creature heals 10 damage).',
    faction: FACTION_NAME,
    imageUrl: regenerateOrder25Img
  },
  // Card 26: Relentless Advance - Level 1, CON, MINOR
  {
    id: 'cou_ord_26',
    name: 'Relentless Advance',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'This creature takes 10 damage to shift 5 squares.',
    faction: FACTION_NAME,
    imageUrl: relentlessAdvanceOrder26Img
  },
  // Card 27: Relentless Advance - Level 1, CON, MINOR
  {
    id: 'cou_ord_27',
    name: 'Relentless Advance',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'This creature takes 10 damage to shift 5 squares.',
    faction: FACTION_NAME,
    imageUrl: relentlessAdvanceOrder27Img
  },
  // Card 28: Spawn of Kyuss - Level 1, CON, MINOR
  {
    id: 'cou_ord_28',
    name: 'Spawn of Kyuss',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES UNDEAD. Attach this card to this creature. Each enemy creature takes 10 damage whenever it ends its activation adjacent to this creature.',
    requiresCreatureType: 'Undead',
    faction: FACTION_NAME,
    imageUrl: spawnOfKyussOrder28Img
  },
  // Card 29: Terrifying Revelation - Level 6, CHA, STANDARD
  {
    id: 'cou_ord_29',
    name: 'Terrifying Revelation',
    level: 6,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Target opponent loses 3 Morale.',
    faction: FACTION_NAME,
    imageUrl: terrifyingRevelationOrder29Img
  },
  // Card 30: Unbreakable - Level 3, CON, IMMEDIATE (IMPLEMENTED)
  {
    id: 'cou_ord_30',
    name: 'Unbreakable',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 50 damage to this creature from 1 source.',
    damagePrevented: 50,
    faction: FACTION_NAME,
    imageUrl: unbreakableOrder30Img
  },
  // Card 31: Unbreakable - Level 3, CON, IMMEDIATE (IMPLEMENTED)
  {
    id: 'cou_ord_31',
    name: 'Unbreakable',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 50 damage to this creature from 1 source.',
    damagePrevented: 50,
    faction: FACTION_NAME,
    imageUrl: unbreakableOrder31Img
  },
  // Card 32: Unending Horde - Level 3, CHA, MINOR
  {
    id: 'cou_ord_32',
    name: 'Unending Horde',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Each creature you control other than this creature shifts 3 squares.',
    faction: FACTION_NAME,
    imageUrl: unendingHordeOrder32Img
  },
  // Card 33: Vampiric Touch - Level 3, INT, STANDARD
  {
    id: 'cou_ord_33',
    name: 'Vampiric Touch',
    level: 3,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'VAMPIRE AFFINITY (Any Vampire creature can take this action.) Make a melee attack that deals 30 damage. If the target takes damage from this attack, this creature heals 30 damage.',
    faction: FACTION_NAME,
    imageUrl: vampiricTouchOrder33Img
  },
  // Card 34: Vampiric Touch - Level 3, INT, STANDARD
  {
    id: 'cou_ord_34',
    name: 'Vampiric Touch',
    level: 3,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'VAMPIRE AFFINITY (Any Vampire creature can take this action.) Make a melee attack that deals 30 damage. If the target takes damage from this attack, this creature heals 30 damage.',
    faction: FACTION_NAME,
    imageUrl: vampiricTouchOrder34Img
  },
  // Card 35: Warning Shout - Level 3, CHA, IMMEDIATE
  {
    id: 'cou_ord_35',
    name: 'Warning Shout',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Choose 1 allied creature within line of sight. Prevent 30 damage to that creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: warningShoutOrder35Img
  },
  // Card 36: Warning Shout - Level 3, CHA, IMMEDIATE
  {
    id: 'cou_ord_36',
    name: 'Warning Shout',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'IMMEDIATE',
    effectDescription: 'Choose 1 allied creature within line of sight. Prevent 30 damage to that creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: warningShoutOrder36Img
  }
]

export default {
  FACTION_NAME,
  commanders,
  creatures,
  orderCards
}
