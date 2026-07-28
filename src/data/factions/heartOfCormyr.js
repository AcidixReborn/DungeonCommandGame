// Heart of Cormyr Faction Data
import cormyrCmd1 from '../../assets/commanders/Cormyr_Commander_Card_1.webp'
import cormyrCmd2 from '../../assets/commanders/Cormyr_Commander_Card_2.webp'

// O(1) - Static imports for order card images
import arcaneRitualImg from '../../assets/orders/cormyr/Cormyr_ArcaneRitual_Order_1.png'
import battleReadyImg from '../../assets/orders/cormyr/Cormyr_BattleReady_Order_2.png'
import behindEnemyLinesImg from '../../assets/orders/cormyr/Cormyr_BehindEnemyLines_Order_3.png'
import blastOfForceImg from '../../assets/orders/cormyr/Cormyr_BlastOfForce_Order_4.png'
import cleaveImg from '../../assets/orders/cormyr/Cormyr_Cleave_Order_5.png'
import daringAttack6Img from '../../assets/orders/cormyr/Cormyr_DaringAttack_Order_6.png'
import daringAttack7Img from '../../assets/orders/cormyr/Cormyr_DaringAttack_Order_7.png'
import defendAlly8Img from '../../assets/orders/cormyr/Cormyr_DefendAlly_Order_8.png'
import defendAlly9Img from '../../assets/orders/cormyr/Cormyr_DefendAlly_Order_9.png'
import disruptingAttack10Img from '../../assets/orders/cormyr/Cormyr_DisruptingAttack_Order_10.png'
import disruptingAttack11Img from '../../assets/orders/cormyr/Cormyr_DisruptingAttack_Order_11.png'
import fireballImg from '../../assets/orders/cormyr/Cormyr_Fireball_Order_12.png'
import forcefulStrikeImg from '../../assets/orders/cormyr/Cormyr_ForcefulStrike_Order_13.png'
import healingPotionImg from '../../assets/orders/cormyr/Cormyr_HealingPotion_Order_14.png'
import heroicSurge15Img from '../../assets/orders/cormyr/Cormyr_HeroicSurge_Order_15.png'
import heroicSurge16Img from '../../assets/orders/cormyr/Cormyr_HeroicSurge_Order_16.png'
import intercept17Img from '../../assets/orders/cormyr/Cormyr_Intercept_Order_17.png'
import intercept18Img from '../../assets/orders/cormyr/Cormyr_Intercept_Order_18.png'
import intoTheFray19Img from '../../assets/orders/cormyr/Cormyr_IntoTheFray_Order_19.png'
import intoTheFray20Img from '../../assets/orders/cormyr/Cormyr_IntoTheFray_Order_20.png'
import invigoratingSmashImg from '../../assets/orders/cormyr/Cormyr_InvigoratingSmash_Order_21.png'
import killingStrikeImg from '../../assets/orders/cormyr/Cormyr_KillingStrike_Order_22.png'
import levelUpImg from '../../assets/orders/cormyr/Cormyr_LevelUp_Order_23.png'
import openPortalImg from '../../assets/orders/cormyr/Cormyr_OpenPortal_Order_24.png'
import powerAttack25Img from '../../assets/orders/cormyr/Cormyr_PowerAttack_Order_25.png'
import powerAttack26Img from '../../assets/orders/cormyr/Cormyr_PowerAttack_Order_26.png'
import quickShot27Img from '../../assets/orders/cormyr/Cormyr_QuickShot_Order_27.png'
import quickShot28Img from '../../assets/orders/cormyr/Cormyr_QuickShot_Order_28.png'
import recoilImg from '../../assets/orders/cormyr/Cormyr_Recoil_Order_29.png'
import savingThrowImg from '../../assets/orders/cormyr/Cormyr_SavingThrow_Order_30.png'
import seizeTheOpportunity31Img from '../../assets/orders/cormyr/Cormyr_SeizeTheOpportunity_Order_31.png'
import seizeTheOpportunity32Img from '../../assets/orders/cormyr/Cormyr_SeizeTheOpportunity_Order_32.png'
import shield33Img from '../../assets/orders/cormyr/Cormyr_Shield_Order_33.png'
import shield34Img from '../../assets/orders/cormyr/Cormyr_Shield_Order_34.png'
import shoveAside35Img from '../../assets/orders/cormyr/Cormyr_ShoveAside_Order_35.png'
import shoveAside36Img from '../../assets/orders/cormyr/Cormyr_ShoveAside_Order_36.png'

// O(1) - Static imports for creature card images
import copperDragonImg from '../../assets/creatures/cormyr/Cormyr_CopperDragon_Card_1.png'
import dragonKnightImg from '../../assets/creatures/cormyr/Cormyr_DragonKnight_Card_2.png'
import dwarfClericImg from '../../assets/creatures/cormyr/Cormyr_DwarfCleric_Card_3.png'
import dwarvenDefender4Img from '../../assets/creatures/cormyr/Cormyr_DwarvenDefender_Card_4.png'
import dwarvenDefender5Img from '../../assets/creatures/cormyr/Cormyr_DwarvenDefender_Card_5.png'
import earthGuardianImg from '../../assets/creatures/cormyr/Cormyr_EarthGuardian_Card_6.png'
import elfArcher7Img from '../../assets/creatures/cormyr/Cormyr_ElfArcher_Card_7.png'
import elfArcher8Img from '../../assets/creatures/cormyr/Cormyr_ElfArcher_Card_8.png'
import halflingSneakImg from '../../assets/creatures/cormyr/Cormyr_HalflingSneak_Card_9.png'
import halfOrcThugImg from '../../assets/creatures/cormyr/Cormyr_HalfOrcThug_Card_10.png'
import humanRangerImg from '../../assets/creatures/cormyr/Cormyr_HumanRanger_Card_11.png'
import warWizardImg from '../../assets/creatures/cormyr/Cormyr_WarWizard_Card_12.png'

export const FACTION_NAME = 'Heart of Cormyr'

export const commanders = [
  {
    id: 'hoc_cmd_1',
    name: 'Rhynseera the Alarphon',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 6,
    startingMorale: 12,
    startingLeadership: 7,
    specialAbilityDescription:
      'SCROLLBOOK: Once during your turn, you can discard 1 Order card from your hand to draw 1 Order card.',
    imageUrl: cormyrCmd1,
    abilities: [
      {
        id: 'scrollbook',
        name: 'SCROLLBOOK',
        type: 'ACTIVE',
        category: 'RESOURCE',
        description:
          'Once during your turn, you can discard 1 Order card from your hand to draw 1 Order card.',
        effect: {
          discardToDraw: true,
          usesPerTurn: 1,
        },
      },
    ],
  },
  {
    id: 'hoc_cmd_2',
    name: 'Valnar Trueblade',
    faction: FACTION_NAME,
    startingCreatureHandSize: 3,
    startingOrderHandSize: 4,
    startingMorale: 14,
    startingLeadership: 7,
    specialAbilityDescription:
      'VERSATILE: Each Adventurer you control can use a standard action to move up to its Speed.',
    imageUrl: cormyrCmd2,
    abilities: [
      {
        id: 'versatile',
        name: 'VERSATILE',
        type: 'ACTIVE',
        category: 'COMBAT',
        description:
          'Each Adventurer you control can use a standard action to move up to its Speed.',
        effect: {
          moveAsAction: true,
          creatureTypesAffected: ['Adventurer'],
        },
      },
    ],
  },
]

export const creatures = [
  // Card #1 - Copper Dragon
  {
    id: 'hoc_cr_1',
    name: 'Copper Dragon',
    level: 6,
    type: ['Good', 'Dragon'],
    speed: 7,
    hitPoints: 120,
    abilities: { STR: true, DEX: false, CON: false, INT: true, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: { damage: 20, range: 5 },
    specialAbilities: [
      'FLYING: This creature ignores difficult terrain and can move over mountains (but cannot stop on them).',
      'ACID BREATH 20: Whenever this creature makes a ranged attack, it deals 20 DAMAGE to each enemy creature adjacent to the target.',
    ],
    faction: FACTION_NAME,
    imageUrl: copperDragonImg,
  },
  // Card #2 - Dragon Knight
  {
    id: 'hoc_cr_2',
    name: 'Dragon Knight',
    level: 5,
    type: ['Good', 'Humanoid', 'Human', 'Adventurer'],
    speed: 5,
    hitPoints: 120,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 40, range: 1 },
    rangedAttack: null,
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: dragonKnightImg,
  },
  // Card #3 - Dwarf Cleric
  {
    id: 'hoc_cr_3',
    name: 'Dwarf Cleric',
    level: 3,
    type: ['Good', 'Humanoid', 'Dwarf', 'Adventurer'],
    speed: 5,
    hitPoints: 60,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: true, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'HEALING TOUCH: ⚔ This creature or 1 adjacent ally heals 10 DAMAGE or removes 1 attached Order card.',
    ],
    faction: FACTION_NAME,
    imageUrl: dwarfClericImg,
  },
  // Card #4 - Dwarven Defender
  {
    id: 'hoc_cr_4',
    name: 'Dwarven Defender',
    level: 2,
    type: ['Humanoid', 'Dwarf'],
    speed: 5,
    hitPoints: 40,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'SHIELD BLOCK: While adjacent to this creature, each allied Adventurer gains Block 10 (Prevent 10 DAMAGE whenever a source deals damage to this creature).',
    ],
    faction: FACTION_NAME,
    imageUrl: dwarvenDefender4Img,
  },
  // Card #5 - Dwarven Defender
  {
    id: 'hoc_cr_5',
    name: 'Dwarven Defender',
    level: 2,
    type: ['Humanoid', 'Dwarf'],
    speed: 5,
    hitPoints: 40,
    abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'SHIELD BLOCK: While adjacent to this creature, each allied Adventurer gains Block 10 (Prevent 10 DAMAGE whenever a source deals damage to this creature).',
    ],
    faction: FACTION_NAME,
    imageUrl: dwarvenDefender5Img,
  },
  // Card #6 - Earth Guardian
  {
    id: 'hoc_cr_6',
    name: 'Earth Guardian',
    level: 4,
    type: ['Elemental', 'Earth'],
    speed: 6,
    hitPoints: 90,
    abilities: { STR: true, DEX: false, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 30, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      'BURROW: This creature can move through mountains (but cannot stop on them).',
      "SLAM: Whenever an adjacent creature takes damage from this creature's attack, slide the damaged creature up to 3 squares.",
    ],
    faction: FACTION_NAME,
    imageUrl: earthGuardianImg,
  },
  // Card #7 - Elf Archer
  {
    id: 'hoc_cr_7',
    name: 'Elf Archer',
    level: 1,
    type: ['Humanoid', 'Elf'],
    speed: 7,
    hitPoints: 10,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 10, range: 10 },
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: elfArcher7Img,
  },
  // Card #8 - Elf Archer
  {
    id: 'hoc_cr_8',
    name: 'Elf Archer',
    level: 1,
    type: ['Humanoid', 'Elf'],
    speed: 7,
    hitPoints: 10,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 10, range: 10 },
    specialAbilities: [],
    faction: FACTION_NAME,
    imageUrl: elfArcher8Img,
  },
  // Card #9 - Halfling Sneak
  {
    id: 'hoc_cr_9',
    name: 'Halfling Sneak',
    level: 1,
    type: ['Humanoid', 'Halfling', 'Adventurer'],
    speed: 6,
    hitPoints: 20,
    abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      "FLANKING: This creature's melee attacks deal +10 DAMAGE while at least 1 ally is adjacent to the target.",
    ],
    faction: FACTION_NAME,
    imageUrl: halflingSneakImg,
  },
  // Card #10 - Half-Orc Thug
  {
    id: 'hoc_cr_10',
    name: 'Half-Orc Thug',
    level: 3,
    type: ['Humanoid', 'Half-Orc', 'Adventurer'],
    speed: 6,
    hitPoints: 50,
    abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: { damage: 20, range: 5 },
    specialAbilities: [
      'EXPLOSIVE BOLTS 10: Whenever this creature makes a ranged attack, it deals 10 DAMAGE to each enemy creature adjacent to the target.',
    ],
    faction: FACTION_NAME,
    imageUrl: halfOrcThugImg,
  },
  // Card #11 - Human Ranger
  {
    id: 'hoc_cr_11',
    name: 'Human Ranger',
    level: 2,
    type: ['Humanoid', 'Human', 'Adventurer'],
    speed: 7,
    hitPoints: 40,
    abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: null,
    specialAbilities: [
      "FLASHING BLADES: Whenever a target takes damage from this creature's melee attack, this creature can deal 10 DAMAGE to 1 adjacent creature.",
    ],
    faction: FACTION_NAME,
    imageUrl: humanRangerImg,
  },
  // Card #12 - War Wizard
  {
    id: 'hoc_cr_12',
    name: 'War Wizard',
    level: 4,
    type: ['Humanoid', 'Human', 'Adventurer'],
    speed: 6,
    hitPoints: 60,
    abilities: { STR: false, DEX: false, CON: false, INT: true, WIS: false, CHA: false },
    meleeAttack: { damage: 10, range: 1 },
    rangedAttack: { damage: 30, range: 10 },
    specialAbilities: [
      'ARCANE PORTAL: When deploying this creature, you can place it in any unoccupied Magic Circle square.',
    ],
    faction: FACTION_NAME,
    imageUrl: warWizardImg,
  },
]

export const orderCards = [
  // Card #1 - Arcane Ritual
  {
    id: 'hoc_ord_1',
    name: 'Arcane Ritual',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription:
      'Attach this card to this creature. At the end of its activation, if this creature is in a Magic Circle square, draw 1 Order card. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: arcaneRitualImg,
  },
  // Card #2 - Battle Ready
  {
    id: 'hoc_ord_2',
    name: 'Battle Ready',
    level: 4,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription:
      'Attach this card to this creature. Remove this card to prevent 40 DAMAGE to this creature from 1 source. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: battleReadyImg,
  },
  // Card #3 - Behind Enemy Lines
  {
    id: 'hoc_ord_3',
    name: 'Behind Enemy Lines',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription:
      "Immediately deploy 1 Adventurer creature in an opponent's start zone. Attach this card to that creature. If this creature is in its controller's start zone, remove this card to gain 4 MORALE. PLACEHOLDER",
    faction: FACTION_NAME,
    imageUrl: behindEnemyLinesImg,
  },
  // Card #4 - Blast of Force
  {
    id: 'hoc_ord_4',
    name: 'Blast of Force',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription:
      'Make a melee attack that deals 30 DAMAGE. Slide the target 8 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: blastOfForceImg,
  },
  // Card #5 - Cleave
  {
    id: 'hoc_ord_5',
    name: 'Cleave',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription:
      'Attach this card to this creature. Whenever this creature destroys an enemy creature with its melee attack, it can deal 20 DAMAGE to 1 adjacent creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: cleaveImg,
  },
  // Card #6 - Daring Attack
  {
    id: 'hoc_ord_6',
    name: 'Daring Attack',
    level: 3,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription:
      'Make a melee attack that deals 30 DAMAGE. If the target takes damage from this attack, untap this creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: daringAttack6Img,
  },
  // Card #7 - Daring Attack
  {
    id: 'hoc_ord_7',
    name: 'Daring Attack',
    level: 3,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription:
      'Make a melee attack that deals 30 DAMAGE. If the target takes damage from this attack, untap this creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: daringAttack7Img,
  },
  // Card #8 - Defend Ally (IMMEDIATE - protects adjacent ally)
  {
    id: 'hoc_ord_8',
    name: 'Defend Ally',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 30 DAMAGE to 1 adjacent creature from 1 source.',
    damagePrevented: 30,
    protectTargetType: 'adjacent_ally', // Can only protect adjacent allies, not self
    faction: FACTION_NAME,
    imageUrl: defendAlly8Img,
  },
  // Card #9 - Defend Ally (IMMEDIATE - protects adjacent ally)
  {
    id: 'hoc_ord_9',
    name: 'Defend Ally',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 30 DAMAGE to 1 adjacent creature from 1 source.',
    damagePrevented: 30,
    protectTargetType: 'adjacent_ally', // Can only protect adjacent allies, not self
    faction: FACTION_NAME,
    imageUrl: defendAlly9Img,
  },
  // Card #10 - Disrupting Attack
  {
    id: 'hoc_ord_10',
    name: 'Disrupting Attack',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription:
      "Make a melee attack that deals +10 DAMAGE. If the target takes damage from this attack, tap it and the target's controller discards 1 Order card. PLACEHOLDER",
    faction: FACTION_NAME,
    imageUrl: disruptingAttack10Img,
  },
  // Card #11 - Disrupting Attack
  {
    id: 'hoc_ord_11',
    name: 'Disrupting Attack',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription:
      "Make a melee attack that deals +10 DAMAGE. If the target takes damage from this attack, tap it and the target's controller discards 1 Order card. PLACEHOLDER",
    faction: FACTION_NAME,
    imageUrl: disruptingAttack11Img,
  },
  // Card #12 - Fireball
  {
    id: 'hoc_ord_12',
    name: 'Fireball',
    level: 3,
    abilityRequired: 'INT',
    actionType: 'STANDARD',
    effectDescription:
      'Choose 1 square within 5 squares. Deal 30 DAMAGE to each creature within 2 squares of it. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: fireballImg,
  },
  // Card #13 - Forceful Strike
  {
    id: 'hoc_ord_13',
    name: 'Forceful Strike',
    level: 3,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription:
      'Make a melee attack that deals +30 DAMAGE. Slide each adjacent enemy creature 2 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: forcefulStrikeImg,
  },
  // Card #14 - Healing Potion (REQUIRES HUMANOID)
  {
    id: 'hoc_ord_14',
    name: 'Healing Potion',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription:
      'REQUIRES HUMANOID. This creature heals 20 DAMAGE or removes 1 attached Order card. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: healingPotionImg,
    requiresCreatureType: 'Humanoid',
  },
  // Card #15 - Heroic Surge (REQUIRES ADVENTURER)
  {
    id: 'hoc_ord_15',
    name: 'Heroic Surge',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES ADVENTURER. Untap this creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: heroicSurge15Img,
    requiresCreatureType: 'Adventurer',
  },
  // Card #16 - Heroic Surge (REQUIRES ADVENTURER)
  {
    id: 'hoc_ord_16',
    name: 'Heroic Surge',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'REQUIRES ADVENTURER. Untap this creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: heroicSurge16Img,
    requiresCreatureType: 'Adventurer',
  },
  // Card #17 - Intercept (IMPLEMENTED - prevents 20 damage)
  {
    id: 'hoc_ord_17',
    name: 'Intercept',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 DAMAGE to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: intercept17Img,
    damagePrevented: 20,
  },
  // Card #18 - Intercept (IMPLEMENTED - prevents 20 damage)
  {
    id: 'hoc_ord_18',
    name: 'Intercept',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription: 'Prevent 20 DAMAGE to this creature from 1 source.',
    faction: FACTION_NAME,
    imageUrl: intercept18Img,
    damagePrevented: 20,
  },
  // Card #19 - Into the Fray
  {
    id: 'hoc_ord_19',
    name: 'Into the Fray',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'This creature moves its Speed. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: intoTheFray19Img,
  },
  // Card #20 - Into the Fray
  {
    id: 'hoc_ord_20',
    name: 'Into the Fray',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'This creature moves its Speed. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: intoTheFray20Img,
  },
  // Card #21 - Invigorating Smash
  {
    id: 'hoc_ord_21',
    name: 'Invigorating Smash',
    level: 4,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription:
      'Make a melee attack that deals 50 DAMAGE. This creature heals 20 DAMAGE. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: invigoratingSmashImg,
  },
  // Card #22 - Killing Strike
  {
    id: 'hoc_ord_22',
    name: 'Killing Strike',
    level: 5,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals 100 damage.',
    faction: FACTION_NAME,
    imageUrl: killingStrikeImg,
    flatMeleeDamage: 100, // Replaces base damage (ignores flanking/cutter)
  },
  // Card #23 - Level Up (REQUIRES HUMANOID)
  {
    id: 'hoc_ord_23',
    name: 'Level Up',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription:
      'REQUIRES HUMANOID. Attach this card to this creature. +20 HP; +1 Level. Gain the Adventurer keyword. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: levelUpImg,
    requiresCreatureType: 'Humanoid',
  },
  // Card #24 - Open Portal
  {
    id: 'hoc_ord_24',
    name: 'Open Portal',
    level: 4,
    abilityRequired: 'INT',
    actionType: 'MINOR',
    effectDescription:
      'Attach this card to this creature. When deploying, if this creature is in a Magic Circle square, you can deploy your creatures in unoccupied squares in that Magic Circle. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: openPortalImg,
  },
  // Card #25 - Power Attack
  {
    id: 'hoc_ord_25',
    name: 'Power Attack',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +20 damage.',
    faction: FACTION_NAME,
    imageUrl: powerAttack25Img,
    meleeDamageBonus: 20, // Added to base melee damage
  },
  // Card #26 - Power Attack
  {
    id: 'hoc_ord_26',
    name: 'Power Attack',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'STANDARD',
    effectDescription: 'Make a melee attack that deals +20 damage.',
    faction: FACTION_NAME,
    imageUrl: powerAttack26Img,
    meleeDamageBonus: 20, // Added to base melee damage
  },
  // Card #27 - Quick Shot (REQUIRES RANGED)
  {
    id: 'hoc_ord_27',
    name: 'Quick Shot',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription:
      'REQUIRES RANGED. Make a ranged attack that deals base ranged DAMAGE. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: quickShot27Img,
  },
  // Card #28 - Quick Shot (REQUIRES RANGED)
  {
    id: 'hoc_ord_28',
    name: 'Quick Shot',
    level: 1,
    abilityRequired: 'DEX',
    actionType: 'MINOR',
    effectDescription:
      'REQUIRES RANGED. Make a ranged attack that deals base ranged DAMAGE. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: quickShot28Img,
  },
  // Card #29 - Recoil (IMMEDIATE - prevents damage but opponent draws a card)
  {
    id: 'hoc_ord_29',
    name: 'Recoil',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'IMMEDIATE',
    effectDescription:
      'Prevent 30 damage to this creature from 1 source. The attacking faction draws 1 Order card.',
    faction: FACTION_NAME,
    imageUrl: recoilImg,
    damagePrevented: 30,
    opponentDrawsCards: 1,
  },
  // Card #30 - Saving Throw
  {
    id: 'hoc_ord_30',
    name: 'Saving Throw',
    level: 1,
    abilityRequired: 'ANY',
    actionType: 'MINOR',
    effectDescription: 'Remove 1 attached card from this creature. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: savingThrowImg,
  },
  // Card #31 - Seize the Opportunity (IMMEDIATE - counter-attack vs adjacent tapped)
  {
    id: 'hoc_ord_31',
    name: 'Seize the Opportunity',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription:
      'Prevent 10 DAMAGE to this creature from 1 source. Make a melee attack against 1 tapped creature that deals 20 DAMAGE.',
    damagePrevented: 10,
    counterAttackDamage: 20,
    counterAttackTarget: 'adjacent_tapped',
    faction: FACTION_NAME,
    imageUrl: seizeTheOpportunity31Img,
  },
  // Card #32 - Seize the Opportunity (IMMEDIATE - counter-attack vs adjacent tapped)
  {
    id: 'hoc_ord_32',
    name: 'Seize the Opportunity',
    level: 2,
    abilityRequired: 'STR',
    actionType: 'IMMEDIATE',
    effectDescription:
      'Prevent 10 DAMAGE to this creature from 1 source. Make a melee attack against 1 tapped creature that deals 20 DAMAGE.',
    damagePrevented: 10,
    counterAttackDamage: 20,
    counterAttackTarget: 'adjacent_tapped',
    faction: FACTION_NAME,
    imageUrl: seizeTheOpportunity32Img,
  },
  // Card #33 - Shield (IMMEDIATE - protects self or ally within 5 squares)
  {
    id: 'hoc_ord_33',
    name: 'Shield',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'IMMEDIATE',
    effectDescription:
      'Choose this creature or a creature within 5 squares. Prevent 30 DAMAGE to that creature from 1 source.',
    damagePrevented: 30,
    protectTargetType: 'ally_in_range', // Can protect self or ally within range
    protectTargetRange: 5, // 5 squares
    faction: FACTION_NAME,
    imageUrl: shield33Img,
  },
  // Card #34 - Shield (IMMEDIATE - protects self or ally within 5 squares)
  {
    id: 'hoc_ord_34',
    name: 'Shield',
    level: 2,
    abilityRequired: 'INT',
    actionType: 'IMMEDIATE',
    effectDescription:
      'Choose this creature or a creature within 5 squares. Prevent 30 DAMAGE to that creature from 1 source.',
    damagePrevented: 30,
    protectTargetType: 'ally_in_range', // Can protect self or ally within range
    protectTargetRange: 5, // 5 squares
    faction: FACTION_NAME,
    imageUrl: shield34Img,
  },
  // Card #35 - Shove Aside
  {
    id: 'hoc_ord_35',
    name: 'Shove Aside',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Slide 1 adjacent creature 3 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: shoveAside35Img,
  },
  // Card #36 - Shove Aside
  {
    id: 'hoc_ord_36',
    name: 'Shove Aside',
    level: 1,
    abilityRequired: 'STR',
    actionType: 'MINOR',
    effectDescription: 'Slide 1 adjacent creature 3 squares. PLACEHOLDER',
    faction: FACTION_NAME,
    imageUrl: shoveAside36Img,
  },
]

export default {
  FACTION_NAME,
  commanders,
  creatures,
  orderCards,
}
