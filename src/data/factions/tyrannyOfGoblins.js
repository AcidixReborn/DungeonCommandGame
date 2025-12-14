// Tyranny of Goblins Faction Data
// ============================================================================
// IMPORTS
// ============================================================================
import goblinsCmd1 from '../../assets/commanders/Goblins_Commander_Card_1.webp'
import goblinsCmd2 from '../../assets/commanders/Goblins_Commander_Card_2.webp'

// Creature Card Images - O(1) import time, loaded once at module initialization
import bugbearBerserkerImg from '../../assets/creatures/goblins/Goblin_BugBear_Card_1.png'

// Order Card Images - O(36) = O(1) import time, loaded once at module initialization
import acrobaticsOrder1Img from '../../assets/orders/goblins/Goblin_Acrobatics_Order_1.png'
import acrobaticsOrder2Img from '../../assets/orders/goblins/Goblin_Acrobatics_Order_2.png'
import arcaneScrollOrder3Img from '../../assets/orders/goblins/Goblin_ArcaneScroll_Order_3.png'
import deathSentenceOrder4Img from '../../assets/orders/goblins/Goblin_DeathSentence_Order_4.png'
import deathSentenceOrder5Img from '../../assets/orders/goblins/Goblin_DeathSentence_Order_5.png'
import feralVitalityOrder6Img from '../../assets/orders/goblins/Goblin_FeralVitality_Order_6.png'
import forwardTheHordeOrder7Img from '../../assets/orders/goblins/Goblin_ForwardTheHorde_Order_7.png'
import forwardTheHordeOrder8Img from '../../assets/orders/goblins/Goblin_ForwardTheHorde_Order_8.png'
import goblinWarCryOrder9Img from '../../assets/orders/goblins/Goblin_GoblinWarCry_Order_9.png'
import goblinWarCryOrder10Img from '../../assets/orders/goblins/Goblin_GoblinWarCry_Order_10.png'
import grovelOrder11Img from '../../assets/orders/goblins/Goblin_Grovel_Order_11.png'
import grovelOrder12Img from '../../assets/orders/goblins/Goblin_Grovel_Order_12.png'
import leapAwayOrder13Img from '../../assets/orders/goblins/Goblin_LeapAway_Order_13.png'
import lopingStrideOrder14Img from '../../assets/orders/goblins/Goblin_LopingStride_Order_14.png'
import lopingStrideOrder15Img from '../../assets/orders/goblins/Goblin_LopingStride_Order_15.png'
import mageHandOrder16Img from '../../assets/orders/goblins/Goblin_MageHand_Order_16.png'
import mirrorImageOrder17Img from '../../assets/orders/goblins/Goblin_MirrorImage_Order_17.png'
import mortalWoundOrder18Img from '../../assets/orders/goblins/Goblin_MortalWound_Order_18.png'
import narrowEscapeOrder19Img from '../../assets/orders/goblins/Goblin_NarrowEscape_Order_19.png'
import narrowEscapeOrder20Img from '../../assets/orders/goblins/Goblin_NarrowEscape_Order_20.png'
import nimbleStrikeOrder21Img from '../../assets/orders/goblins/Goblin_NimbleStrike_Order_21.png'
import patchUpOrder22Img from '../../assets/orders/goblins/Goblin_PatchUp_Order_22.png'
import patchUpOrder23Img from '../../assets/orders/goblins/Goblin_PatchUp_Order_23.png'
import portalStoneOrder24Img from '../../assets/orders/goblins/Goblin_PortalStone_Order_24.png'
import rallyOrder25Img from '../../assets/orders/goblins/Goblin_Rally_Order_25.png'
import rayOfFrostOrder26Img from '../../assets/orders/goblins/Goblin_RayOfFrost_Order_26.png'
import recklessAttackOrder27Img from '../../assets/orders/goblins/Goblin_RecklessAttack_Order_27.png'
import recklessAttackOrder28Img from '../../assets/orders/goblins/Goblin_RecklessAttack_Order_28.png'
import reinforcementsOrder29Img from '../../assets/orders/goblins/Goblin_Reinforcements_Order_29.png'
import shatteredWeaponOrder30Img from '../../assets/orders/goblins/Goblin_ShatteredWeapon_Order_30.png'
import shatteredWeaponOrder31Img from '../../assets/orders/goblins/Goblin_ShatteredWeapon_Order_31.png'
import strengthInNumbersOrder32Img from '../../assets/orders/goblins/Goblin_StrengthInNumbers_Order_32.png'
import strengthInNumbersOrder33Img from '../../assets/orders/goblins/Goblin_StrengthInNumbers_Order_33.png'
import toughAsNailsOrder34Img from '../../assets/orders/goblins/Goblin_ToughAsNails_Order_34.png'
import undauntedSurgeOrder35Img from '../../assets/orders/goblins/Goblin_UndauntedSurge_Order_35.png'
import undauntedSurgeOrder36Img from '../../assets/orders/goblins/Goblin_UndauntedSurge_Order_36.png'
import feralTrollImg from '../../assets/creatures/goblins/Goblin_FeralTroll_Card_2.png'
import goblinArcherImg from '../../assets/creatures/goblins/Goblin_GoblinArcher_Card_3.png'
import goblinChampionImg from '../../assets/creatures/goblins/Goblin_GoblinChampion_Card_4.png'
import goblinCutter1Img from '../../assets/creatures/goblins/Goblin_GoblinCutter_Card_5.png'
import goblinCutter2Img from '../../assets/creatures/goblins/Goblin_GoblinCutter_Card_6.png'
import goblinWolfRiderImg from '../../assets/creatures/goblins/Goblin_GoblinWolfRider_Card_7.png'
import hobgoblinSoldier1Img from '../../assets/creatures/goblins/Goblin_HobgoblinSoldier_Card_8.png'
import hobgoblinSoldier2Img from '../../assets/creatures/goblins/Goblin_HobgoblinSoldier_Card_9.png'
import hobgoblinSorcererImg from '../../assets/creatures/goblins/Goblin_HobgoblinSorcerer_Card_10.png'
import hornedDevilImg from '../../assets/creatures/goblins/Goblin_HordnedDevil_Card_11.png'
import wolfImg from '../../assets/creatures/goblins/Goblin_Wolf_Card_12.png'

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
    specialAbilities: [{
      id: 'untap_on_adjacent_kill',
      name: 'UNTAP ON KILL',
      type: 'PASSIVE',
      description: 'Whenever an adjacent enemy creature is destroyed, untap this creature.'
    }],
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
    specialAbilities: ['REGENERATE 10: At the start of its controller\'s turn, this creature heals 10 damage.'],
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
    specialAbilities: ['FLANKING: This creature\'s melee attacks deal +10 DAMAGE while at least 1 ally is adjacent to the target.'],
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
    specialAbilities: ['RIDER: When this creature is destroyed, you may deploy 1 Goblin or Wolf creature (Level 3 or lower) from your hand to this tile. Morale loss = (destroyed creature level - deployed creature level).'],
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
    specialAbilities: ['MAGIC CIRCLE AURA: While this creature is in a Magic Circle, all Goblins, Hobgoblins, and Bugbears you control gain "Prevent 10 damage from 1 source" once per turn.'],
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
    reach: 2, // REACH 2: Can melee attack at range 1 OR 2
    tapOnHit: true, // TAP ON HIT: Target is tapped if it takes any damage from melee attack
    specialAbilities: [
      'FLYING: This creature ignores difficult terrain and can move over mountains (but cannot stop on them).',
      {
        id: 'reach_2',
        name: 'REACH 2',
        type: 'PASSIVE',
        description: 'This creature can make melee attacks against creatures up to 2 spaces away.'
      },
      {
        id: 'tap_on_hit',
        name: 'TAP ON HIT',
        type: 'PASSIVE',
        description: 'Whenever this creature deals melee damage, tap the target.'
      }
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
    tapOnHit: true, // TAP ON HIT: Target is tapped if it takes any damage from melee attack
    specialAbilities: [{
      id: 'tap_on_hit',
      name: 'TAP ON HIT',
      type: 'PASSIVE',
      description: 'Whenever this creature deals melee damage, tap the target.'
    }],
    faction: FACTION_NAME,
    imageUrl: wolfImg
  }
]

// ============================================================================
// ORDER CARDS ARRAY - Updated with accurate data from physical cards
// Stats extracted from card images - O(n) where n = 36 order cards
// Cards 11, 12 (Grovel) and 19, 20 (Narrow Escape) have implemented abilities
// ============================================================================
export const orderCards = [
  // Card 1: Acrobatics - Level 1, DEX, MINOR
  {
    id: 'tog_ord_1',
    name: 'Acrobatics',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. This creature gains Scuttle (This creature shifts when it moves) and ignores difficult terrain.',
    faction: FACTION_NAME,
    imageUrl: acrobaticsOrder1Img
  },
  // Card 2: Acrobatics - Level 1, DEX, MINOR
  {
    id: 'tog_ord_2',
    name: 'Acrobatics',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. This creature gains Scuttle (This creature shifts when it moves) and ignores difficult terrain.',
    faction: FACTION_NAME,
    imageUrl: acrobaticsOrder2Img
  },
  // Card 3: Arcane Scroll - Level 1, ANY, MINOR
  {
    id: 'tog_ord_3',
    name: 'Arcane Scroll',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES HUMANOID. Attach this card to this creature. Discard this card to give this creature the INT ability for the rest of the turn.',
    requiresCreatureType: 'Humanoid',
    faction: FACTION_NAME,
    imageUrl: arcaneScrollOrder3Img
  },
  // Card 4: Death Sentence - Level 3, CHA, MINOR
  {
    id: 'tog_ord_4',
    name: 'Death Sentence',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: '1 creature you control within 5 squares makes a melee attack.',
    faction: FACTION_NAME,
    imageUrl: deathSentenceOrder4Img
  },
  // Card 5: Death Sentence - Level 3, CHA, MINOR
  {
    id: 'tog_ord_5',
    name: 'Death Sentence',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: '1 creature you control within 5 squares makes a melee attack.',
    faction: FACTION_NAME,
    imageUrl: deathSentenceOrder5Img
  },
  // Card 6: Feral Vitality - Level 2, CON, STANDARD
  {
    id: 'tog_ord_6',
    name: 'Feral Vitality',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +20 damage. This creature heals 10 damage.',
    faction: FACTION_NAME,
    imageUrl: feralVitalityOrder6Img
  },
  // Card 7: Forward the Horde - Level 1, CHA, MINOR
  {
    id: 'tog_ord_7',
    name: 'Forward the Horde',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Shift 3 squares. One allied creature shifts 3 squares.',
    faction: FACTION_NAME,
    imageUrl: forwardTheHordeOrder7Img
  },
  // Card 8: Forward the Horde - Level 1, CHA, MINOR
  {
    id: 'tog_ord_8',
    name: 'Forward the Horde',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Shift 3 squares. One allied creature shifts 3 squares.',
    faction: FACTION_NAME,
    imageUrl: forwardTheHordeOrder8Img
  },
  // Card 9: Goblin War Cry - Level 3, CHA, MINOR
  {
    id: 'tog_ord_9',
    name: 'Goblin War Cry',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Goblin, Hobgoblin, and Bugbear creatures you control deal +10 damage with melee and ranged attacks until the end of this turn.',
    faction: FACTION_NAME,
    imageUrl: goblinWarCryOrder9Img
  },
  // Card 10: Goblin War Cry - Level 3, CHA, MINOR
  {
    id: 'tog_ord_10',
    name: 'Goblin War Cry',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Goblin, Hobgoblin, and Bugbear creatures you control deal +10 damage with melee and ranged attacks until the end of this turn.',
    faction: FACTION_NAME,
    imageUrl: goblinWarCryOrder10Img
  },
  // Card 11: Grovel - Level 1, ANY, IMMEDIATE - ABILITY IMPLEMENTED
  {
    id: 'tog_ord_11',
    name: 'Grovel',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'IMMEDIATE',
    effectDescription: 'Lose 1 Morale to prevent 30 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: grovelOrder11Img,
    damagePrevented: 30,
    moraleCost: 1
  },
  // Card 12: Grovel - Level 1, ANY, IMMEDIATE - ABILITY IMPLEMENTED
  {
    id: 'tog_ord_12',
    name: 'Grovel',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'IMMEDIATE',
    effectDescription: 'Lose 1 Morale to prevent 30 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: grovelOrder12Img,
    damagePrevented: 30,
    moraleCost: 1
  },
  // Card 13: Leap Away - Level 1, DEX, IMMEDIATE (Placeholder - complex attach mechanic)
  {
    id: 'tog_ord_13',
    name: 'Leap Away',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 40 damage to this creature from 1 source. Attach this card to this creature. This creature cannot move or shift. (S): Remove this card as a standard action.',
    faction: FACTION_NAME,
    imageUrl: leapAwayOrder13Img
  },
  // Card 14: Loping Stride - Level 1, DEX, MINOR
  {
    id: 'tog_ord_14',
    name: 'Loping Stride',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. Add 2 to this creature\'s base Speed.',
    faction: FACTION_NAME,
    imageUrl: lopingStrideOrder14Img
  },
  // Card 15: Loping Stride - Level 1, DEX, MINOR
  {
    id: 'tog_ord_15',
    name: 'Loping Stride',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. Add 2 to this creature\'s base Speed.',
    faction: FACTION_NAME,
    imageUrl: lopingStrideOrder15Img
  },
  // Card 16: Mage Hand - Level 1, INT, MINOR
  {
    id: 'tog_ord_16',
    name: 'Mage Hand',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription: 'Choose a Treasure square within 5 squares. Reveal any Treasure Chest marker on that square, then take 1 Treasure token from that square. OR Tap 1 creature within 5 squares.',
    faction: FACTION_NAME,
    imageUrl: mageHandOrder16Img
  },
  // Card 17: Mirror Image - Level 1, INT, STANDARD
  {
    id: 'tog_ord_17',
    name: 'Mirror Image',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Attach this card to this creature. Remove this card to prevent all damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: mirrorImageOrder17Img
  },
  // Card 18: Mortal Wound - Level 4, CON, IMMEDIATE (Placeholder - complex destroy mechanic)
  {
    id: 'tog_ord_18',
    name: 'Mortal Wound',
    level: 4,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent all damage to this creature from 1 source. Attach this card to this creature. Destroy this creature at the start of your Deploy phase.',
    faction: FACTION_NAME,
    imageUrl: mortalWoundOrder18Img
  },
  // Card 19: Narrow Escape - Level 1, DEX, IMMEDIATE - ABILITY IMPLEMENTED
  {
    id: 'tog_ord_19',
    name: 'Narrow Escape',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: narrowEscapeOrder19Img,
    damagePrevented: 20,
    moraleCost: 0
  },
  // Card 20: Narrow Escape - Level 1, DEX, IMMEDIATE - ABILITY IMPLEMENTED
  {
    id: 'tog_ord_20',
    name: 'Narrow Escape',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: narrowEscapeOrder20Img,
    damagePrevented: 20,
    moraleCost: 0
  },
  // Card 21: Nimble Strike - Level 1, DEX, STANDARD
  {
    id: 'tog_ord_21',
    name: 'Nimble Strike',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Shift 3 squares. Make a melee or ranged attack that deals +10 damage.',
    faction: FACTION_NAME,
    imageUrl: nimbleStrikeOrder21Img
  },
  // Card 22: Patch Up - Level 1, CON, IMMEDIATE (Placeholder - complex OR choice)
  {
    id: 'tog_ord_22',
    name: 'Patch Up',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'This creature heals 20 damage. OR Prevent 20 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: patchUpOrder22Img
  },
  // Card 23: Patch Up - Level 1, CON, IMMEDIATE (Placeholder - complex OR choice)
  {
    id: 'tog_ord_23',
    name: 'Patch Up',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'This creature heals 20 damage. OR Prevent 20 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: patchUpOrder23Img
  },
  // Card 24: Portal Stone - Level 1, ANY, MINOR
  {
    id: 'tog_ord_24',
    name: 'Portal Stone',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'Take 1 Treasure token from the square this creature is in to place this creature in any Magic Circle square.',
    faction: FACTION_NAME,
    imageUrl: portalStoneOrder24Img
  },
  // Card 25: Rally - Level 1, CHA, MINOR
  {
    id: 'tog_ord_25',
    name: 'Rally',
    level: 1,
    abilityRequired: 'CHA',
    actionType: 'MINOR',
    effectDescription: 'Choose 1 allied creature within 5 squares. Remove all attached Order cards from that creature.',
    faction: FACTION_NAME,
    imageUrl: rallyOrder25Img
  },
  // Card 26: Ray of Frost - Level 2, INT, STANDARD
  {
    id: 'tog_ord_26',
    name: 'Ray of Frost',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription: 'Deal 30 damage to 1 creature within 5 squares. If the target takes damage from this attack, tap it.',
    faction: FACTION_NAME,
    imageUrl: rayOfFrostOrder26Img
  },
  // Card 27: Reckless Attack - Level 1, CON, STANDARD
  {
    id: 'tog_ord_27',
    name: 'Reckless Attack',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'This creature takes 10 damage to make a melee attack that deals +30 damage.',
    faction: FACTION_NAME,
    imageUrl: recklessAttackOrder27Img
  },
  // Card 28: Reckless Attack - Level 1, CON, STANDARD
  {
    id: 'tog_ord_28',
    name: 'Reckless Attack',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'This creature takes 10 damage to make a melee attack that deals +30 damage.',
    faction: FACTION_NAME,
    imageUrl: recklessAttackOrder28Img
  },
  // Card 29: Reinforcements - Level 3, ANY, MINOR
  {
    id: 'tog_ord_29',
    name: 'Reinforcements',
    level: 3,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'Discard any number of Creature cards from your hand, then reshuffle all Creature cards from your graveyard into your Creature deck and draw Creature cards up to your Creature hand size.',
    faction: FACTION_NAME,
    imageUrl: reinforcementsOrder29Img
  },
  // Card 30: Shattered Weapon - Level 1, ANY, STANDARD
  {
    id: 'tog_ord_30',
    name: 'Shattered Weapon',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'STANDARD',
    effectDescription: 'REQUIRES HUMANOID. Make a melee attack that deals +30 damage. Attach this card to this creature. This creature\'s melee attacks deal -10 damage.',
    requiresCreatureType: 'Humanoid',
    faction: FACTION_NAME,
    imageUrl: shatteredWeaponOrder30Img
  },
  // Card 31: Shattered Weapon - Level 1, ANY, STANDARD
  {
    id: 'tog_ord_31',
    name: 'Shattered Weapon',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'STANDARD',
    effectDescription: 'REQUIRES HUMANOID. Make a melee attack that deals +30 damage. Attach this card to this creature. This creature\'s melee attacks deal -10 damage.',
    requiresCreatureType: 'Humanoid',
    faction: FACTION_NAME,
    imageUrl: shatteredWeaponOrder31Img
  },
  // Card 32: Strength in Numbers - Level 3, CHA, STANDARD
  {
    id: 'tog_ord_32',
    name: 'Strength in Numbers',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Gain 1 Leadership.',
    faction: FACTION_NAME,
    imageUrl: strengthInNumbersOrder32Img
  },
  // Card 33: Strength in Numbers - Level 3, CHA, STANDARD
  {
    id: 'tog_ord_33',
    name: 'Strength in Numbers',
    level: 3,
    abilityRequired: 'CHA',
    actionType: 'STANDARD',
    effectDescription: 'Gain 1 Leadership.',
    faction: FACTION_NAME,
    imageUrl: strengthInNumbersOrder33Img
  },
  // Card 34: Tough as Nails - Level 2, CON, IMMEDIATE
  {
    id: 'tog_ord_34',
    name: 'Tough as Nails',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Remove all cards attached to this creature. Attach this card to this creature. This creature gains Block 10 (Prevent 10 damage whenever a source deals damage to this creature).',
    faction: FACTION_NAME,
    imageUrl: toughAsNailsOrder34Img
  },
  // Card 35: Undaunted Surge - Level 3, CON, MINOR
  {
    id: 'tog_ord_35',
    name: 'Undaunted Surge',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Remove all cards attached to this creature. Attach this card to this creature. This creature\'s melee attacks deal +10 damage.',
    faction: FACTION_NAME,
    imageUrl: undauntedSurgeOrder35Img
  },
  // Card 36: Undaunted Surge - Level 3, CON, MINOR
  {
    id: 'tog_ord_36',
    name: 'Undaunted Surge',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Remove all cards attached to this creature. Attach this card to this creature. This creature\'s melee attacks deal +10 damage.',
    faction: FACTION_NAME,
    imageUrl: undauntedSurgeOrder36Img
  }
]

export default {
  FACTION_NAME,
  commanders,
  creatures,
  orderCards
}
