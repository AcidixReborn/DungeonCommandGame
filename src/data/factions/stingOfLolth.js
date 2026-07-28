// Sting of Lolth Faction Data
import lolthCmd1 from '../../assets/commanders/Lolth_Commander_Card_1.webp'
import lolthCmd2 from '../../assets/commanders/Lolth_Commander_Card_2.webp'

// O(1) - Static imports for order card images
import closeCall1Img from '../../assets/orders/lolth/Lolth_CloseCall_Order_1.png'
import closeCall2Img from '../../assets/orders/lolth/Lolth_CloseCall_Order_2.png'
import deepWound3Img from '../../assets/orders/lolth/Lolth_DeepWound_Order_3.png'
import deepWound4Img from '../../assets/orders/lolth/Lolth_DeepWound_Order_4.png'
import faerieFire5Img from '../../assets/orders/lolth/Lolth_FaerieFire_Order_5.png'
import faerieFire6Img from '../../assets/orders/lolth/Lolth_FaerieFire_Order_6.png'
import feint7Img from '../../assets/orders/lolth/Lolth_Feint_Order_7.png'
import fireTrap8Img from '../../assets/orders/lolth/Lolth_FireTrap_Order_8.png'
import lolthsBlessing9Img from '../../assets/orders/lolth/Lolth_LolthsBlessing_Order_9.png'
import nearMiss10Img from '../../assets/orders/lolth/Lolth_NearMiss_Order_10.png'
import nearMiss11Img from '../../assets/orders/lolth/Lolth_NearMiss_Order_11.png'
import parry12Img from '../../assets/orders/lolth/Lolth_Parry_Order_12.png'
import parry13Img from '../../assets/orders/lolth/Lolth_Parry_Order_13.png'
import piercingStrike14Img from '../../assets/orders/lolth/Lolth_PiercingStrike_Order_14.png'
import piercingStrike15Img from '../../assets/orders/lolth/Lolth_PiercingStrike_Order_15.png'
import quickJab16Img from '../../assets/orders/lolth/Lolth_QuickJab_Order_16.png'
import quickJab17Img from '../../assets/orders/lolth/Lolth_QuickJab_Order_17.png'
import riposte18Img from '../../assets/orders/lolth/Lolth_Riposte_Order_18.png'
import riposte19Img from '../../assets/orders/lolth/Lolth_Riposte_Order_19.png'
import sacrifice20Img from '../../assets/orders/lolth/Lolth_Sacrifice_Order_20.png'
import scheme21Img from '../../assets/orders/lolth/Lolth_Scheme_Order_21.png'
import scheme22Img from '../../assets/orders/lolth/Lolth_Scheme_Order_22.png'
import secretPassage23Img from '../../assets/orders/lolth/Lolth_SecretPassage_Order_23.png'
import shadowyAmbush24Img from '../../assets/orders/lolth/Lolth_ShadowyAmbush_Order_24.png'
import shadowyAmbush25Img from '../../assets/orders/lolth/Lolth_ShadowyAmbush_Order_25.png'
import sneakAttack26Img from '../../assets/orders/lolth/Lolth_SneakAttack_Order_26.png'
import springAttack27Img from '../../assets/orders/lolth/Lolth_SpringAttack_Order_27.png'
import springAttack28Img from '../../assets/orders/lolth/Lolth_SpringAttack_Order_28.png'
import stalk29Img from '../../assets/orders/lolth/Lolth_Stalk_Order_29.png'
import stalk30Img from '../../assets/orders/lolth/Lolth_Stalk_Order_30.png'
import stealth31Img from '../../assets/orders/lolth/Lolth_Stealth_Order_31.png'
import uncannyDodge32Img from '../../assets/orders/lolth/Lolth_UncannyDodge_Order_32.png'
import uncannyDodge33Img from '../../assets/orders/lolth/Lolth_UncannyDodge_Order_33.png'
import vialOfPoison34Img from '../../assets/orders/lolth/Lolth_VialOfPoison_Order_34.png'
import web35Img from '../../assets/orders/lolth/Lolth_Web_Order_35.png'
import web36Img from '../../assets/orders/lolth/Lolth_Web_Order_36.png'

// O(1) - Static imports for creature card images
import demonwebSpider1Img from '../../assets/creatures/lolth/Drow_DemonwebSpider_Card_1.png'
import demonwebSpider2Img from '../../assets/creatures/lolth/Drow_DemonwebSpider_Card_2.png'
import driderImg from '../../assets/creatures/lolth/Drow_Drider_Card_3.png'
import drowAssassinImg from '../../assets/creatures/lolth/Drow_DrowAssassin_Card_4.png'
import drowBlademasterImg from '../../assets/creatures/lolth/Drow_DrowBladeMaster_Card_5.png'
import drowHouseGuard6Img from '../../assets/creatures/lolth/Drow_DrowHouseGuard_6.png'
import drowHouseGuard7Img from '../../assets/creatures/lolth/Drow_DrowHouseGuard_Card_7.png'
import drowPriestessImg from '../../assets/creatures/lolth/Drow_DrowPriestess_Card_8.png'
import drowWizardImg from '../../assets/creatures/lolth/Drow_DrowWizard_Card_9.png'
import giantSpiderImg from '../../assets/creatures/lolth/Drow_GiantSpider_Card_10.png'
import shadowMastiffImg from '../../assets/creatures/lolth/Drow_ShadowMastiff_Card_11.png'
import umberHulkImg from '../../assets/creatures/lolth/Drow_UmberHulk_Card_12.png'

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
    specialAbilityDescription:
      'WALLS OF WEB: Add 2 to the Speed of each Spider and Drow you control.',
    imageUrl: lolthCmd1,
    abilities: [
      {
        id: 'walls_of_web',
        name: 'WALLS OF WEB',
        type: 'PASSIVE',
        category: 'SPEED',
        description: 'Add 2 to the Speed of each Spider and Drow you control.',
        effect: {
          speedBonus: 2,
          creatureTypesAffected: ['Spider', 'Drow'],
        },
      },
    ],
  },
  {
    id: 'sol_cmd_2',
    name: 'Kalteros the Sellsword',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 4,
    startingMorale: 12,
    startingLeadership: 9,
    specialAbilityDescription:
      'SELLSWORD: Whenever a Drow you control collects a Treasure token, you can draw 1 Order card instead of gaining 1 Morale.',
    imageUrl: lolthCmd2,
    abilities: [
      {
        id: 'sellsword',
        name: 'SELLSWORD',
        type: 'ACTIVE',
        category: 'RESOURCE',
        description:
          'Whenever a Drow you control collects a Treasure token, you can draw 1 Order card instead of gaining 1 Morale.',
        effect: {
          triggerOnTreasure: true,
          creatureTypeRequired: 'Drow',
          choices: ['morale', 'card'], // Player chooses +1 morale or draw 1 card
        },
      },
    ],
  },
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
    imageUrl: demonwebSpider1Img,
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
    imageUrl: demonwebSpider2Img,
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
    imageUrl: driderImg,
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
    specialAbilities: [
      'HIDDEN BLADE: After this creature attacks, it may deal 10 damage to an adjacent tapped enemy creature.',
    ],
    faction: FACTION_NAME,
    imageUrl: drowAssassinImg,
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
    imageUrl: drowBlademasterImg,
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
    imageUrl: drowHouseGuard6Img,
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
    imageUrl: drowHouseGuard7Img,
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
    specialAbilities: [
      'SUMMON SPIDER: When deploying any Spider creature, you can place it in any unoccupied square within 5 squares of this creature.',
    ],
    faction: FACTION_NAME,
    imageUrl: drowPriestessImg,
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
    imageUrl: drowWizardImg,
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
    imageUrl: giantSpiderImg,
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
    specialAbilities: [
      'SHADOW STALKER: When deploying this creature, you can place it in any unoccupied square adjacent to a wall.',
    ],
    faction: FACTION_NAME,
    imageUrl: shadowMastiffImg,
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
    specialAbilities: [
      'BURROW',
      'CONFUSION GAZE: As a standard action, choose 1 enemy creature within 5 squares and slide that creature 3 squares, then make a melee attack that deals melee DAMAGE.',
    ],
    faction: FACTION_NAME,
    imageUrl: umberHulkImg,
  },
]

export const orderCards = [
  {
    id: 'sol_ord_1',
    name: 'Close Call',
    level: 3,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 40 DAMAGE to this creature from 1 source.',
    damagePrevented: 40,
    faction: FACTION_NAME,
    imageUrl: closeCall1Img,
  },
  {
    id: 'sol_ord_2',
    name: 'Close Call',
    level: 3,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 40 DAMAGE to this creature from 1 source.',
    damagePrevented: 40,
    faction: FACTION_NAME,
    imageUrl: closeCall2Img,
  },
  {
    id: 'sol_ord_3',
    name: 'Deep Wound',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    meleeDamageBonus: 10, // +10 melee damage - triggers DamageBoostModal
    attachOnUse: {
      preventsMovement: false,
      removableAsStandard: false,
      damageOnActivation: 10, // 10 damage at start of activation
    },
    effectDescription:
      'Make a melee attack that deals +10 DAMAGE. Attach this card to the target. At the start of its activation, this creature takes 10 DAMAGE.',
    faction: FACTION_NAME,
    imageUrl: deepWound3Img,
  },
  {
    id: 'sol_ord_4',
    name: 'Deep Wound',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    meleeDamageBonus: 10, // +10 melee damage - triggers DamageBoostModal
    attachOnUse: {
      preventsMovement: false,
      removableAsStandard: false,
      damageOnActivation: 10, // 10 damage at start of activation
    },
    effectDescription:
      'Make a melee attack that deals +10 DAMAGE. Attach this card to the target. At the start of its activation, this creature takes 10 DAMAGE.',
    faction: FACTION_NAME,
    imageUrl: deepWound4Img,
  },
  {
    id: 'sol_ord_5',
    name: 'Faerie Fire',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription:
      'DROW AFFINITY. Attach this card to 1 enemy creature within 10 squares. Attacks deal +10 DAMAGE to this creature.',
    faction: FACTION_NAME,
    imageUrl: faerieFire5Img,
  },
  {
    id: 'sol_ord_6',
    name: 'Faerie Fire',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription:
      'DROW AFFINITY. Attach this card to 1 enemy creature within 10 squares. Attacks deal +10 DAMAGE to this creature.',
    faction: FACTION_NAME,
    imageUrl: faerieFire6Img,
  },
  {
    id: 'sol_ord_7',
    name: 'Feint',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Tap 1 adjacent creature.',
    faction: FACTION_NAME,
    imageUrl: feint7Img,
  },
  {
    id: 'sol_ord_8',
    name: 'Fire Trap',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription:
      'REQUIRES HUMANOID. Deal 20 DAMAGE to each creature within 2 squares of hazardous terrain.',
    requiresCreatureType: 'Humanoid',
    faction: FACTION_NAME,
    imageUrl: fireTrap8Img,
  },
  {
    id: 'sol_ord_9',
    name: "Lolth's Blessing",
    level: 3,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription:
      "REQUIRES EVIL. Attach this card to this creature. During Refresh, this creature's controller draws 1 extra Order card.",
    requiresCreatureType: 'Evil',
    faction: FACTION_NAME,
    imageUrl: lolthsBlessing9Img,
  },
  {
    id: 'sol_ord_10',
    name: 'Near Miss',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 DAMAGE to this creature from 1 source. Untap this creature.',
    damagePrevented: 20,
    untapAfterUse: true,
    faction: FACTION_NAME,
    imageUrl: nearMiss10Img,
  },
  {
    id: 'sol_ord_11',
    name: 'Near Miss',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 DAMAGE to this creature from 1 source. Untap this creature.',
    damagePrevented: 20,
    untapAfterUse: true,
    faction: FACTION_NAME,
    imageUrl: nearMiss11Img,
  },
  {
    id: 'sol_ord_12',
    name: 'Parry',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 10 DAMAGE to this creature from 1 source. Draw 1 Order card.',
    faction: FACTION_NAME,
    imageUrl: parry12Img,
    damagePrevented: 10,
    drawCards: 1,
  },
  {
    id: 'sol_ord_13',
    name: 'Parry',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 10 DAMAGE to this creature from 1 source. Draw 1 Order card.',
    faction: FACTION_NAME,
    imageUrl: parry13Img,
    damagePrevented: 10,
    drawCards: 1,
  },
  {
    id: 'sol_ord_14',
    name: 'Piercing Strike',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription:
      'Make a melee attack that deals +10 DAMAGE. This damage cannot be prevented.',
    faction: FACTION_NAME,
    imageUrl: piercingStrike14Img,
  },
  {
    id: 'sol_ord_15',
    name: 'Piercing Strike',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription:
      'Make a melee attack that deals +10 DAMAGE. This damage cannot be prevented.',
    faction: FACTION_NAME,
    imageUrl: piercingStrike15Img,
  },
  {
    id: 'sol_ord_16',
    name: 'Quick Jab',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Make a melee attack that deals base melee DAMAGE.',
    faction: FACTION_NAME,
    imageUrl: quickJab16Img,
  },
  {
    id: 'sol_ord_17',
    name: 'Quick Jab',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Make a melee attack that deals base melee DAMAGE.',
    faction: FACTION_NAME,
    imageUrl: quickJab17Img,
  },
  {
    id: 'sol_ord_18',
    name: 'Riposte',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription:
      'Prevent 20 DAMAGE to this creature from 1 source. Make a melee attack that deals 10 DAMAGE.',
    damagePrevented: 20,
    counterAttackDamage: 10,
    counterAttackTarget: 'attacker',
    counterAttackRequiresAdjacent: true,
    faction: FACTION_NAME,
    imageUrl: riposte18Img,
  },
  {
    id: 'sol_ord_19',
    name: 'Riposte',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription:
      'Prevent 20 DAMAGE to this creature from 1 source. Make a melee attack that deals 10 DAMAGE.',
    damagePrevented: 20,
    counterAttackDamage: 10,
    counterAttackTarget: 'attacker',
    counterAttackRequiresAdjacent: true,
    faction: FACTION_NAME,
    imageUrl: riposte19Img,
  },
  {
    id: 'sol_ord_20',
    name: 'Sacrifice',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'STANDARD',
    effectDescription:
      'Discard 1 Order card to have this creature make a melee attack that deals +30 DAMAGE.',
    faction: FACTION_NAME,
    imageUrl: sacrifice20Img,
  },
  {
    id: 'sol_ord_21',
    name: 'Scheme',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Draw 2 Order cards.',
    faction: FACTION_NAME,
    imageUrl: scheme21Img,
  },
  {
    id: 'sol_ord_22',
    name: 'Scheme',
    level: 2,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Draw 2 Order cards.',
    faction: FACTION_NAME,
    imageUrl: scheme22Img,
  },
  {
    id: 'sol_ord_23',
    name: 'Secret Passage',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription:
      'This creature shifts and ignores walls while moving during this turn. It cannot end its movement in a wall square.',
    faction: FACTION_NAME,
    imageUrl: secretPassage23Img,
  },
  // Card 24: Shadowy Ambush - Level 3, DEX, STANDARD (Phase STD-4: Shift + Attack)
  {
    id: 'sol_ord_24',
    name: 'Shadowy Ambush',
    level: 3,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Shift up to 2 squares. Make a melee attack that deals 50 DAMAGE.',
    shiftBeforeAttack: 2,
    flatMeleeDamage: 50,
    faction: FACTION_NAME,
    imageUrl: shadowyAmbush24Img,
  },
  // Card 25: Shadowy Ambush - Level 3, DEX, STANDARD (Phase STD-4: Shift + Attack)
  {
    id: 'sol_ord_25',
    name: 'Shadowy Ambush',
    level: 3,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Shift up to 2 squares. Make a melee attack that deals 50 DAMAGE.',
    shiftBeforeAttack: 2,
    flatMeleeDamage: 50,
    faction: FACTION_NAME,
    imageUrl: shadowyAmbush25Img,
  },
  {
    id: 'sol_ord_26',
    name: 'Sneak Attack',
    level: 6,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription:
      'Make a melee attack that deals 100 DAMAGE. Creatures you control that are adjacent to the target can assist with this action.',
    faction: FACTION_NAME,
    imageUrl: sneakAttack26Img,
  },
  // Card 27: Spring Attack - Level 2, DEX, STANDARD (Phase STD-4: Shift + Attack)
  {
    id: 'sol_ord_27',
    name: 'Spring Attack',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Shift up to 6 squares. Make an attack. Shift up to 6 squares.',
    shiftBeforeAttack: 6,
    shiftAfterAttack: 6,
    faction: FACTION_NAME,
    imageUrl: springAttack27Img,
  },
  // Card 28: Spring Attack - Level 2, DEX, STANDARD (Phase STD-4: Shift + Attack)
  {
    id: 'sol_ord_28',
    name: 'Spring Attack',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription: 'Shift up to 6 squares. Make an attack. Shift up to 6 squares.',
    shiftBeforeAttack: 6,
    shiftAfterAttack: 6,
    faction: FACTION_NAME,
    imageUrl: springAttack28Img,
  },
  {
    id: 'sol_ord_29',
    name: 'Stalk',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Shift 6 squares.',
    faction: FACTION_NAME,
    imageUrl: stalk29Img,
  },
  {
    id: 'sol_ord_30',
    name: 'Stalk',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription: 'Shift 6 squares.',
    faction: FACTION_NAME,
    imageUrl: stalk30Img,
  },
  {
    id: 'sol_ord_31',
    name: 'Stealth',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription:
      "If no enemy creatures have line of sight to this creature, remove it from the battlefield and place it on its Creature card. (It is still considered deployed.) At the start of its controller's next turn, place the creature in any unoccupied square on the battlefield.",
    faction: FACTION_NAME,
    imageUrl: stealth31Img,
  },
  {
    id: 'sol_ord_32',
    name: 'Uncanny Dodge',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Discard 1 Order card to prevent all damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: uncannyDodge32Img,
    preventsAllDamage: true, // Prevents ALL damage from attack
    discardCost: 1, // Must discard 1 card from hand to use
  },
  {
    id: 'sol_ord_33',
    name: 'Uncanny Dodge',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'IMMEDIATE',
    effectDescription: 'Discard 1 Order card to prevent all damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: uncannyDodge33Img,
    preventsAllDamage: true, // Prevents ALL damage from attack
    discardCost: 1, // Must discard 1 card from hand to use
  },
  {
    id: 'sol_ord_34',
    name: 'Vial of Poison',
    level: 2,
    abilityRequired: 'DEX',
    actionType: 'STANDARD',
    effectDescription:
      "REQUIRES HUMANOID. Attach this card to this creature. Remove this card to deal +30 DAMAGE with this creature's next melee attack.",
    requiresCreatureType: 'Humanoid',
    faction: FACTION_NAME,
    imageUrl: vialOfPoison34Img,
  },
  {
    id: 'sol_ord_35',
    name: 'Web',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription:
      'SPIDER AFFINITY. Attach this card to 1 creature within 10 squares. This creature cannot move or shift. Remove this card as a standard action.',
    attachOnUse: {
      preventsMovement: true,
    },
    faction: FACTION_NAME,
    imageUrl: web35Img,
  },
  {
    id: 'sol_ord_36',
    name: 'Web',
    level: 1,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription:
      'SPIDER AFFINITY. Attach this card to 1 creature within 10 squares. This creature cannot move or shift. Remove this card as a standard action.',
    attachOnUse: {
      preventsMovement: true,
    },
    faction: FACTION_NAME,
    imageUrl: web36Img,
  },
]

export default {
  FACTION_NAME,
  commanders,
  creatures,
  orderCards,
}
