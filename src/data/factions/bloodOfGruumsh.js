// Blood of Gruumsh Faction Data
import gruumshCmd1 from '../../assets/commanders/Gruumsh_Commander_Card_1.webp'
import gruumshCmd2 from '../../assets/commanders/Gruumsh_Commander_Card_2.webp'

// O(1) - Static imports for order card images
import beastmasterImg from '../../assets/orders/gruumsh/Gruumsh_Beastmaster_Order_1.png'
import boneChillingRallyCryImg from '../../assets/orders/gruumsh/Gruumsh_BoneChillingRallyCry_Order_2.png'
import changeOfPlansImg from '../../assets/orders/gruumsh/Gruumsh_ChangeOfPlans_Order_3.png'
import charge4Img from '../../assets/orders/gruumsh/Gruumsh_Charge_Order_4.png'
import charge5Img from '../../assets/orders/gruumsh/Gruumsh_Charge_Order_5.png'
import cureSeriousWounds6Img from '../../assets/orders/gruumsh/Gruumsh_CureSeriousWounds_Order_6.png'
import cureSeriousWounds7Img from '../../assets/orders/gruumsh/Gruumsh_CureSeriousWounds_Order_7.png'
import defiantStance8Img from '../../assets/orders/gruumsh/Gruumsh_DefiantStance_Order_8.png'
import defiantStance9Img from '../../assets/orders/gruumsh/Gruumsh_DefiantStance_Order_9.png'
import deflect10Img from '../../assets/orders/gruumsh/Gruumsh_Deflect_Order_10.png'
import deflect11Img from '../../assets/orders/gruumsh/Gruumsh_Deflect_Order_11.png'
import furiousBellow12Img from '../../assets/orders/gruumsh/Gruumsh_FuriousBellow_Order_12.png'
import furiousBellow13Img from '../../assets/orders/gruumsh/Gruumsh_FuriousBellow_Order_13.png'
import furyOfGruumsh14Img from '../../assets/orders/gruumsh/Gruumsh_FuryOfGruumsh_Order_14.png'
import furyOfGruumsh15Img from '../../assets/orders/gruumsh/Gruumsh_FuryOfGruumsh_Order_15.png'
import hackingFrenzy16Img from '../../assets/orders/gruumsh/Gruumsh_HackingFrenzy_Order_16.png'
import hackingFrenzy17Img from '../../assets/orders/gruumsh/Gruumsh_HackingFrenzy_Order_17.png'
import hurlRock18Img from '../../assets/orders/gruumsh/Gruumsh_HurlRock_Order_18.png'
import hurlRock19Img from '../../assets/orders/gruumsh/Gruumsh_HurlRock_Order_19.png'
import overseersWhipImg from '../../assets/orders/gruumsh/Gruumsh_OverseersWhip_Order_20.png'
import savageDemise21Img from '../../assets/orders/gruumsh/Gruumsh_SavageDemise_Order_21.png'
import savageDemise22Img from '../../assets/orders/gruumsh/Gruumsh_SavageDemise_Order_22.png'
import scentOfBloodImg from '../../assets/orders/gruumsh/Gruumsh_ScentOfBlood_Order_23.png'
import slice24Img from '../../assets/orders/gruumsh/Gruumsh_Slice_Order_24.png'
import slice25Img from '../../assets/orders/gruumsh/Gruumsh_Slice_Order_25.png'
import stompImg from '../../assets/orders/gruumsh/Gruumsh_Stomp_Order_26.png'
import tacticalBlock27Img from '../../assets/orders/gruumsh/Gruumsh_TacticalBlock_Order_27.png'
import tacticalBlock28Img from '../../assets/orders/gruumsh/Gruumsh_TacticalBlock_Order_28.png'
import tideOfIron29Img from '../../assets/orders/gruumsh/Gruumsh_TideOfIron_Order_29.png'
import tideOfIron30Img from '../../assets/orders/gruumsh/Gruumsh_TideOfIron_Order_30.png'
import turnUndeadImg from '../../assets/orders/gruumsh/Gruumsh_TurnUndead_Order_31.png'
import unexpectedResistance32Img from '../../assets/orders/gruumsh/Gruumsh_UnexpectedResistance_Order_32.png'
import unexpectedResistance33Img from '../../assets/orders/gruumsh/Gruumsh_UnexpectedResistance_Order_33.png'
import victoriousSurge34Img from '../../assets/orders/gruumsh/Gruumsh_VictoriousSurge_Order_34.png'
import victoriousSurge35Img from '../../assets/orders/gruumsh/Gruumsh_VictoriousSurge_Order_35.png'
import vorpalSwordImg from '../../assets/orders/gruumsh/Gruumsh_VorpalSword_Order_36.png'

// O(1) - Static imports for creature card images
import boarImg from '../../assets/creatures/gruumsh/Gruumsh_Boar_Card_1.png'
import ogreImg from '../../assets/creatures/gruumsh/Gruumsh_Ogre_Card_2.png'
import orcArcher3Img from '../../assets/creatures/gruumsh/Gruumsh_OrcArcher_Card_3.png'
import orcArcher4Img from '../../assets/creatures/gruumsh/Gruumsh_OrcArcher_Card_4.png'
import orcBarbarianImg from '../../assets/creatures/gruumsh/Gruumsh_OrcBarbarian_Card_5.png'
import orcChieftainImg from '../../assets/creatures/gruumsh/Gruumsh_OrcChieftain_Card_6.png'
import orcClericOfGruumshImg from '../../assets/creatures/gruumsh/Gruumsh_OrcClericOfGruumsh_Card_7.png'
import orcDrudge8Img from '../../assets/creatures/gruumsh/Gruumsh_OrcDrudge_Card_8.png'
import orcDrudge9Img from '../../assets/creatures/gruumsh/Gruumsh_OrcDrudge_Card_9.png'
import orcDruidImg from '../../assets/creatures/gruumsh/Gruumsh_OrcDruid_Card_10.png'
import owlbearImg from '../../assets/creatures/gruumsh/Gruumsh_Owlbear_Card_11.png'
import wereboarImg from '../../assets/creatures/gruumsh/Gruumsh_Wereboar_Card_12.png'

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
    specialAbilities: [{
      id: 'death_strike',
      name: 'DEATH STRIKE',
      type: 'PASSIVE',
      description: 'When this creature would be destroyed, it can first make a melee attack that deals melee DAMAGE.'
    }],
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
    specialAbilities: [{
      id: 'untap_on_adjacent_kill',
      name: 'UNTAP ON KILL',
      type: 'PASSIVE',
      description: 'Whenever an adjacent enemy creature is destroyed, untap this creature.'
    }],
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
      {
        id: 'chieftain_call',
        name: 'CHIEFTAIN CALL',
        type: 'ON_DEPLOY',
        description: 'When you deploy this creature, you can reveal an Orc Creature card of Level 3 or lower from your hand. If you do, gain LEADERSHIP equal to the revealed creature\'s Level and immediately deploy that creature.',
        effect: {
          trigger: 'deploy',
          creatureTypeRequired: 'Orc',
          maxLevel: 3,
          gainLeadership: true
        }
      }
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
    specialAbilities: [{
      id: 'death_strike',
      name: 'DEATH STRIKE',
      type: 'PASSIVE',
      description: 'When this creature would be destroyed, it can first make a melee attack that deals melee DAMAGE.'
    }],
    faction: FACTION_NAME,
    imageUrl: wereboarImg
  }
]

export const orderCards = [
  // Card #1 - Beastmaster
  {
    id: 'bog_ord_1',
    name: 'Beastmaster',
    level: 3,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'Attach this card to this creature. Beast creatures you control deal +10 damage with melee attacks. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: beastmasterImg
  },
  // Card #2 - Bone-Chilling Rally Cry
  {
    id: 'bog_ord_2',
    name: 'Bone-Chilling Rally Cry',
    level: 3,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Lose 1 Morale. Gain 2 Leadership. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: boneChillingRallyCryImg
  },
  // Card #3 - Change of Plans
  {
    id: 'bog_ord_3',
    name: 'Change of Plans',
    level: 1,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'Draw 2 Order cards, then discard 1 Order card. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: changeOfPlansImg
  },
  // Card #4 - Charge
  {
    id: 'bog_ord_4',
    name: 'Charge',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'This creature moves its Speed. Make a melee attack that deals +10 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: charge4Img
  },
  // Card #5 - Charge
  {
    id: 'bog_ord_5',
    name: 'Charge',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'This creature moves its Speed. Make a melee attack that deals +10 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: charge5Img
  },
  // Card #6 - Cure Serious Wounds
  {
    id: 'bog_ord_6',
    name: 'Cure Serious Wounds',
    level: 3,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'This creature or 1 adjacent ally heals 40 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: cureSeriousWounds6Img
  },
  // Card #7 - Cure Serious Wounds
  {
    id: 'bog_ord_7',
    name: 'Cure Serious Wounds',
    level: 3,
    abilityRequired: 'WIS',
    actionType: 'MINOR',
    effectDescription: 'This creature or 1 adjacent ally heals 40 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: cureSeriousWounds7Img
  },
  // Card #8 - Defiant Stance (IMPLEMENTED - prevents 20 damage, gains 1 morale)
  {
    id: 'bog_ord_8',
    name: 'Defiant Stance',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 damage to this creature from 1 source. Gain 1 Morale.',
    faction: FACTION_NAME,
    imageUrl: defiantStance8Img,
    damagePrevented: 20,
    moraleGain: 1
  },
  // Card #9 - Defiant Stance (IMPLEMENTED - prevents 20 damage, gains 1 morale)
  {
    id: 'bog_ord_9',
    name: 'Defiant Stance',
    level: 2,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 damage to this creature from 1 source. Gain 1 Morale.',
    faction: FACTION_NAME,
    imageUrl: defiantStance9Img,
    damagePrevented: 20,
    moraleGain: 1
  },
  // Card #10 - Deflect (IMPLEMENTED - prevents 30 damage)
  {
    id: 'bog_ord_10',
    name: 'Deflect',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 30 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: deflect10Img,
    damagePrevented: 30
  },
  // Card #11 - Deflect (IMPLEMENTED - prevents 30 damage)
  {
    id: 'bog_ord_11',
    name: 'Deflect',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 30 damage to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: deflect11Img,
    damagePrevented: 30
  },
  // Card #12 - Furious Bellow
  {
    id: 'bog_ord_12',
    name: 'Furious Bellow',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Tap each enemy creature adjacent to this creature, and slide each of those creatures 2 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: furiousBellow12Img
  },
  // Card #13 - Furious Bellow
  {
    id: 'bog_ord_13',
    name: 'Furious Bellow',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'Tap each enemy creature adjacent to this creature, and slide each of those creatures 2 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: furiousBellow13Img
  },
  // Card #14 - Fury of Gruumsh (REQUIRES ORC)
  {
    id: 'bog_ord_14',
    name: 'Fury of Gruumsh',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES ORC. Attach this card to this creature. This creature\'s melee attacks deal +20 damage. At the end of its activation, this creature takes 20 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: furyOfGruumsh14Img,
    requiresCreatureType: 'Orc'
  },
  // Card #15 - Fury of Gruumsh (REQUIRES ORC)
  {
    id: 'bog_ord_15',
    name: 'Fury of Gruumsh',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES ORC. Attach this card to this creature. This creature\'s melee attacks deal +20 damage. At the end of its activation, this creature takes 20 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: furyOfGruumsh15Img,
    requiresCreatureType: 'Orc'
  },
  // Card #16 - Hacking Frenzy
  {
    id: 'bog_ord_16',
    name: 'Hacking Frenzy',
    level: 3,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +40 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: hackingFrenzy16Img
  },
  // Card #17 - Hacking Frenzy
  {
    id: 'bog_ord_17',
    name: 'Hacking Frenzy',
    level: 3,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +40 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: hackingFrenzy17Img
  },
  // Card #18 - Hurl Rock
  {
    id: 'bog_ord_18',
    name: 'Hurl Rock',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Choose 1 creature within 5 squares. Deal this creature\'s base damage to that creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: hurlRock18Img
  },
  // Card #19 - Hurl Rock
  {
    id: 'bog_ord_19',
    name: 'Hurl Rock',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Choose 1 creature within 5 squares. Deal this creature\'s base damage to that creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: hurlRock19Img
  },
  // Card #20 - Overseer's Whip
  {
    id: 'bog_ord_20',
    name: 'Overseer\'s Whip',
    level: 3,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Attach this card to this creature. Add 2 to the Speed of each creature you control. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: overseersWhipImg
  },
  // Card #21 - Savage Demise (IMMEDIATE but not damage prevention)
  {
    id: 'bog_ord_21',
    name: 'Savage Demise',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Make a melee attack that deals this creature\'s base damage against 1 tapped creature. Destroy this creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: savageDemise21Img
  },
  // Card #22 - Savage Demise (IMMEDIATE but not damage prevention)
  {
    id: 'bog_ord_22',
    name: 'Savage Demise',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Make a melee attack that deals this creature\'s base damage against 1 tapped creature. Destroy this creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: savageDemise22Img
  },
  // Card #23 - Scent of Blood
  {
    id: 'bog_ord_23',
    name: 'Scent of Blood',
    level: 1,
    abilityRequired: 'CON',
    actionType: 'MINOR',
    effectDescription: 'This creature heals 10 damage for each enemy creature adjacent to it. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: scentOfBloodImg
  },
  // Card #24 - Slice
  {
    id: 'bog_ord_24',
    name: 'Slice',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +10 damage. Draw 1 Order card. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: slice24Img
  },
  // Card #25 - Slice
  {
    id: 'bog_ord_25',
    name: 'Slice',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +10 damage. Draw 1 Order card. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: slice25Img
  },
  // Card #26 - Stomp
  {
    id: 'bog_ord_26',
    name: 'Stomp',
    level: 4,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Shift 3 squares. Deal 30 damage to each enemy creature adjacent to this creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: stompImg
  },
  // Card #27 - Tactical Block (IMPLEMENTED - prevents 30 damage, untaps creature)
  {
    id: 'bog_ord_27',
    name: 'Tactical Block',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 30 damage to this creature from 1 source. Untap this creature.',
    faction: FACTION_NAME,
    imageUrl: tacticalBlock27Img,
    damagePrevented: 30,
    untapAfterUse: true
  },
  // Card #28 - Tactical Block (IMPLEMENTED - prevents 30 damage, untaps creature)
  {
    id: 'bog_ord_28',
    name: 'Tactical Block',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 30 damage to this creature from 1 source. Untap this creature.',
    faction: FACTION_NAME,
    imageUrl: tacticalBlock28Img,
    damagePrevented: 30,
    untapAfterUse: true
  },
  // Card #29 - Tide of Iron
  {
    id: 'bog_ord_29',
    name: 'Tide of Iron',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Slide 1 adjacent creature 2 squares. Shift 2 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: tideOfIron29Img
  },
  // Card #30 - Tide of Iron
  {
    id: 'bog_ord_30',
    name: 'Tide of Iron',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Slide 1 adjacent creature 2 squares. Shift 2 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: tideOfIron30Img
  },
  // Card #31 - Turn Undead
  {
    id: 'bog_ord_31',
    name: 'Turn Undead',
    level: 3,
    abilityRequired: 'WIS',
    actionType: 'STANDARD',
    effectDescription: 'Deal 20 damage to each Undead creature within 5 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: turnUndeadImg
  },
  // Card #32 - Unexpected Resistance (IMMEDIATE - low prevention + complex effect)
  {
    id: 'bog_ord_32',
    name: 'Unexpected Resistance',
    level: 3,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 10 damage to this creature from 1 source. Choose 1 adjacent tapped creature. That creature\'s controller loses 1 Morale. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: unexpectedResistance32Img
  },
  // Card #33 - Unexpected Resistance (IMMEDIATE - low prevention + complex effect)
  {
    id: 'bog_ord_33',
    name: 'Unexpected Resistance',
    level: 3,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 10 damage to this creature from 1 source. Choose 1 adjacent tapped creature. That creature\'s controller loses 1 Morale. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: unexpectedResistance33Img
  },
  // Card #34 - Victorious Surge
  {
    id: 'bog_ord_34',
    name: 'Victorious Surge',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +20 damage. This creature heals 20 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: victoriousSurge34Img
  },
  // Card #35 - Victorious Surge
  {
    id: 'bog_ord_35',
    name: 'Victorious Surge',
    level: 3,
    abilityRequired: 'CON',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +20 damage. This creature heals 20 damage. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: victoriousSurge35Img
  },
  // Card #36 - Vorpal Sword (REQUIRES HUMANOID)
  {
    id: 'bog_ord_36',
    name: 'Vorpal Sword',
    level: 4,
    abilityRequired: 'ANY',
    actionType: 'STANDARD',
    effectDescription: 'REQUIRES HUMANOID. Attach this card to this creature. If the target of this creature\'s melee attack takes at least 50 damage from that attack, destroy the target. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: vorpalSwordImg,
    requiresCreatureType: 'Humanoid'
  }
]

export default {
  FACTION_NAME,
  commanders,
  creatures,
  orderCards
}
