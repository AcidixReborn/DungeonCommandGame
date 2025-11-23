// Faction definitions for Dungeon Command
// Based on official game data - will need card images from user

export const Factions = {
  STING_OF_LOLTH: 'Sting of Lolth',
  HEART_OF_CORMYR: 'Heart of Cormyr',
  TYRANNY_OF_GOBLINS: 'Tyranny of Goblins',
  CURSE_OF_UNDEATH: 'Curse of Undeath',
  BLOOD_OF_GRUUMSH: 'Blood of Gruumsh'
}

// Commanders for each faction - stats from actual cards
export const commanders = {
  [Factions.STING_OF_LOLTH]: [
    {
      id: 'sol_cmd_1',
      name: 'Aliszandra Malistros',
      faction: Factions.STING_OF_LOLTH,
      startingCreatureHandSize: 4,
      startingOrderHandSize: 5,
      startingMorale: 13,
      startingLeadership: 7,
      specialAbilityDescription: 'WALLS OF WEB: Add 2 to the Speed of each Spider and Drow you control.',
      imageUrl: '/assets/commanders/Lolth_Commander_Card#1.webp'
    },
    {
      id: 'sol_cmd_2',
      name: 'Kalteros the Sellsword',
      faction: Factions.STING_OF_LOLTH,
      startingCreatureHandSize: 3,
      startingOrderHandSize: 4,
      startingMorale: 12,
      startingLeadership: 9,
      specialAbilityDescription: 'SELLSWORD: Whenever a Drow you control collects a Treasure token, you can draw 1 Order card instead of gaining 1 Morale.',
      imageUrl: '/assets/commanders/Lolth_Commander_Card#2.webp'
    }
  ],
  [Factions.HEART_OF_CORMYR]: [
    {
      id: 'hoc_cmd_1',
      name: 'Rhynseera the Alarphon',
      faction: Factions.HEART_OF_CORMYR,
      startingCreatureHandSize: 3,
      startingOrderHandSize: 6,
      startingMorale: 12,
      startingLeadership: 7,
      specialAbilityDescription: 'SCROLLBOOK: Once during your turn, you can discard 1 Order card from your hand to draw 1 Order card.',
      imageUrl: '/assets/commanders/Cormyr_Commander_Card#1.webp'
    },
    {
      id: 'hoc_cmd_2',
      name: 'Valnar Trueblade',
      faction: Factions.HEART_OF_CORMYR,
      startingCreatureHandSize: 3,
      startingOrderHandSize: 4,
      startingMorale: 14,
      startingLeadership: 7,
      specialAbilityDescription: 'VERSATILE: Each Adventurer you control can use a standard action to move up to its Speed.',
      imageUrl: '/assets/commanders/Cormyr_Commander_Card#2.webp'
    }
  ],
  [Factions.TYRANNY_OF_GOBLINS]: [
    {
      id: 'tog_cmd_1',
      name: 'Snig the Axe',
      faction: Factions.TYRANNY_OF_GOBLINS,
      startingCreatureHandSize: 5,
      startingOrderHandSize: 4,
      startingMorale: 14,
      startingLeadership: 7,
      specialAbilityDescription: 'HORDE: You can deploy creatures during your Refresh Phase.',
      imageUrl: '/assets/commanders/Goblins_Commander_Card#1.webp'
    },
    {
      id: 'tog_cmd_2',
      name: 'Tarkon Draal',
      faction: Factions.TYRANNY_OF_GOBLINS,
      startingCreatureHandSize: 3,
      startingOrderHandSize: 5,
      startingMorale: 12,
      startingLeadership: 9,
      specialAbilityDescription: 'BLACK HAND OF BANE: Whenever an enemy creature cowers, its controller loses 1 extra Morale.',
      imageUrl: '/assets/commanders/Goblins_Commander_Card#2.webp'
    }
  ],
  [Factions.CURSE_OF_UNDEATH]: [
    {
      id: 'cou_cmd_1',
      name: 'Delthrin Everet',
      faction: Factions.CURSE_OF_UNDEATH,
      startingCreatureHandSize: 3,
      startingOrderHandSize: 3,
      startingMorale: 12,
      startingLeadership: 6,
      specialAbilityDescription: 'BLOODTHIRSTY: Gain 1 Leadership for each enemy creature destroyed during your turn.',
      imageUrl: '/assets/commanders/Undeath_Commander_Card#1.webp'
    },
    {
      id: 'cou_cmd_2',
      name: 'Morgana Valistova',
      faction: Factions.CURSE_OF_UNDEATH,
      startingCreatureHandSize: 3,
      startingOrderHandSize: 5,
      startingMorale: 14,
      startingLeadership: 7,
      specialAbilityDescription: 'UNSTOPPABLE HORDES: All Undead creatures you control gain the Cower power. Lose 1 MORALE. Prevent 20 DAMAGE to this creature from 1 source.',
      imageUrl: '/assets/commanders/Undeath_Commander_Card#2.webp'
    }
  ],
  [Factions.BLOOD_OF_GRUUMSH]: [
    {
      id: 'bog_cmd_1',
      name: 'Drogar, Eye of Gruumsh',
      faction: Factions.BLOOD_OF_GRUUMSH,
      startingCreatureHandSize: 3,
      startingOrderHandSize: 4,
      startingMorale: 15,
      startingLeadership: 7,
      specialAbilityDescription: 'GRUUMSH COMMANDS IT: Creatures you control ignore difficult terrain.',
      imageUrl: '/assets/commanders/Gruumsh_Commander_Card#1.webp'
    },
    {
      id: 'bog_cmd_2',
      name: 'Lokar of the Stonelands',
      faction: Factions.BLOOD_OF_GRUUMSH,
      startingCreatureHandSize: 3,
      startingOrderHandSize: 3,
      startingMorale: 11,
      startingLeadership: 9,
      specialAbilityDescription: 'ORC SCOUT: When you deploy starting Orc creatures, you can deploy 1 of them in any unoccupied Treasure square on the board.',
      imageUrl: '/assets/commanders/Gruumsh_Commander_Card#2.webp'
    }
  ]
}

// Sample creatures - these are placeholders based on game data
// User will need to provide complete stats and images
export const sampleCreatures = {
  [Factions.STING_OF_LOLTH]: [
    {
      id: 'sol_cr_1',
      name: 'Drow Assassin',
      level: 5,
      type: ['Humanoid', 'Drow', 'Evil'],
      speed: 7,
      hitPoints: 90,
      abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 50, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Sneak Attack: +20 damage when attacking from behind'],
      faction: Factions.STING_OF_LOLTH,
      imageUrl: null
    },
    {
      id: 'sol_cr_2',
      name: 'Drow Priestess',
      level: 4,
      type: ['Humanoid', 'Drow', 'Evil'],
      speed: 6,
      hitPoints: 80,
      abilities: { STR: false, DEX: false, CON: false, INT: false, WIS: true, CHA: true },
      meleeAttack: { damage: 30, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Dark Blessing: Can heal adjacent allies'],
      faction: Factions.STING_OF_LOLTH,
      imageUrl: null
    },
    {
      id: 'sol_cr_3',
      name: 'Drow Wizard',
      level: 4,
      type: ['Humanoid', 'Drow', 'Evil'],
      speed: 6,
      hitPoints: 70,
      abilities: { STR: false, DEX: false, CON: false, INT: true, WIS: false, CHA: false },
      meleeAttack: { damage: 20, range: 1 },
      rangedAttack: { damage: 40, range: 6 },
      specialAbilities: ['Spellcaster: Can cast ranged spells'],
      faction: Factions.STING_OF_LOLTH,
      imageUrl: null
    },
    {
      id: 'sol_cr_4',
      name: 'Giant Spider',
      level: 3,
      type: ['Beast', 'Spider'],
      speed: 7,
      hitPoints: 60,
      abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 30, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Web: Can slow enemies'],
      faction: Factions.STING_OF_LOLTH,
      imageUrl: null
    }
  ],
  [Factions.HEART_OF_CORMYR]: [
    {
      id: 'hoc_cr_1',
      name: 'Knight',
      level: 5,
      type: ['Humanoid', 'Human', 'Good'],
      speed: 6,
      hitPoints: 100,
      abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 50, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Shield: Reduce damage by 10'],
      faction: Factions.HEART_OF_CORMYR,
      imageUrl: null
    },
    {
      id: 'hoc_cr_2',
      name: 'Cleric',
      level: 4,
      type: ['Humanoid', 'Human', 'Good'],
      speed: 6,
      hitPoints: 80,
      abilities: { STR: false, DEX: false, CON: false, INT: false, WIS: true, CHA: true },
      meleeAttack: { damage: 30, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Heal: Can restore HP to allies'],
      faction: Factions.HEART_OF_CORMYR,
      imageUrl: null
    },
    {
      id: 'hoc_cr_3',
      name: 'Ranger',
      level: 4,
      type: ['Humanoid', 'Human', 'Good'],
      speed: 7,
      hitPoints: 70,
      abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 35, range: 1 },
      rangedAttack: { damage: 40, range: 8 },
      specialAbilities: ['Archery: +2 range on ranged attacks'],
      faction: Factions.HEART_OF_CORMYR,
      imageUrl: null
    },
    {
      id: 'hoc_cr_4',
      name: 'Defender',
      level: 3,
      type: ['Humanoid', 'Human', 'Good'],
      speed: 6,
      hitPoints: 60,
      abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 30, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Guard: Can protect adjacent allies'],
      faction: Factions.HEART_OF_CORMYR,
      imageUrl: null
    }
  ],
  [Factions.TYRANNY_OF_GOBLINS]: [
    {
      id: 'tog_cr_1',
      name: 'Horned Devil',
      level: 6,
      type: ['Devil', 'Evil'],
      speed: 6,
      hitPoints: 120,
      abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 60, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Infernal Charge: Extra damage when charging'],
      faction: Factions.TYRANNY_OF_GOBLINS,
      imageUrl: null
    },
    {
      id: 'tog_cr_2',
      name: 'Troll',
      level: 5,
      type: ['Giant', 'Troll'],
      speed: 6,
      hitPoints: 100,
      abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 50, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Regeneration: Heals 10 HP at start of turn'],
      faction: Factions.TYRANNY_OF_GOBLINS,
      imageUrl: null
    },
    {
      id: 'tog_cr_3',
      name: 'Hobgoblin',
      level: 3,
      type: ['Humanoid', 'Goblinoid', 'Evil'],
      speed: 6,
      hitPoints: 60,
      abilities: { STR: true, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 30, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Tactical: +10 damage when adjacent to ally'],
      faction: Factions.TYRANNY_OF_GOBLINS,
      imageUrl: null
    },
    {
      id: 'tog_cr_4',
      name: 'Goblin',
      level: 1,
      type: ['Humanoid', 'Goblinoid', 'Evil'],
      speed: 7,
      hitPoints: 20,
      abilities: { STR: false, DEX: true, CON: false, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 10, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Quick: Can move twice'],
      faction: Factions.TYRANNY_OF_GOBLINS,
      imageUrl: null
    }
  ],
  [Factions.CURSE_OF_UNDEATH]: [
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
      faction: Factions.CURSE_OF_UNDEATH,
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
      specialAbilities: ['Undead: Immune to morale effects'],
      faction: Factions.CURSE_OF_UNDEATH,
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
      faction: Factions.CURSE_OF_UNDEATH,
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
      faction: Factions.CURSE_OF_UNDEATH,
      imageUrl: null
    }
  ],
  [Factions.BLOOD_OF_GRUUMSH]: [
    {
      id: 'bog_cr_1',
      name: 'Orc Warlord',
      level: 5,
      type: ['Humanoid', 'Orc', 'Evil'],
      speed: 6,
      hitPoints: 100,
      abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: true },
      meleeAttack: { damage: 50, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Rally: Adjacent allies gain +10 damage'],
      faction: Factions.BLOOD_OF_GRUUMSH,
      imageUrl: null
    },
    {
      id: 'bog_cr_2',
      name: 'Orc Berserker',
      level: 4,
      type: ['Humanoid', 'Orc', 'Evil'],
      speed: 7,
      hitPoints: 80,
      abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 45, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Rage: +20 damage when below half HP'],
      faction: Factions.BLOOD_OF_GRUUMSH,
      imageUrl: null
    },
    {
      id: 'bog_cr_3',
      name: 'Orc Shaman',
      level: 3,
      type: ['Humanoid', 'Orc', 'Evil'],
      speed: 6,
      hitPoints: 60,
      abilities: { STR: false, DEX: false, CON: false, INT: false, WIS: true, CHA: false },
      meleeAttack: { damage: 20, range: 1 },
      rangedAttack: { damage: 30, range: 5 },
      specialAbilities: ['Spiritual Weapon: Can attack at range'],
      faction: Factions.BLOOD_OF_GRUUMSH,
      imageUrl: null
    },
    {
      id: 'bog_cr_4',
      name: 'Orc Warrior',
      level: 2,
      type: ['Humanoid', 'Orc', 'Evil'],
      speed: 6,
      hitPoints: 40,
      abilities: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
      meleeAttack: { damage: 20, range: 1 },
      rangedAttack: null,
      specialAbilities: ['Aggressive: Can charge'],
      faction: Factions.BLOOD_OF_GRUUMSH,
      imageUrl: null
    }
  ]
}

// Sample order cards - simplified for now
export const sampleOrderCards = {
  [Factions.STING_OF_LOLTH]: [
    {
      id: 'sol_ord_1',
      name: 'Deadly Strike',
      level: 1,
      abilityRequired: 'DEX',
      actionType: 'STANDARD',
      effectDescription: 'Deal +20 damage on your next melee attack',
      faction: Factions.STING_OF_LOLTH,
      imageUrl: null
    },
    {
      id: 'sol_ord_2',
      name: 'Shadow Step',
      level: 2,
      abilityRequired: 'DEX',
      actionType: 'MINOR',
      effectDescription: 'Move up to your speed without provoking attacks',
      faction: Factions.STING_OF_LOLTH,
      imageUrl: null
    },
    {
      id: 'sol_ord_3',
      name: 'Dark Shield',
      level: 1,
      abilityRequired: 'WIS',
      actionType: 'IMMEDIATE',
      effectDescription: 'Prevent 20 damage',
      faction: Factions.STING_OF_LOLTH,
      imageUrl: null
    }
  ],
  [Factions.HEART_OF_CORMYR]: [
    {
      id: 'hoc_ord_1',
      name: 'Heroic Strike',
      level: 1,
      abilityRequired: 'STR',
      actionType: 'STANDARD',
      effectDescription: 'Deal +20 damage on your next melee attack',
      faction: Factions.HEART_OF_CORMYR,
      imageUrl: null
    },
    {
      id: 'hoc_ord_2',
      name: 'Divine Favor',
      level: 2,
      abilityRequired: 'WIS',
      actionType: 'MINOR',
      effectDescription: 'Adjacent ally gains +10 damage this turn',
      faction: Factions.HEART_OF_CORMYR,
      imageUrl: null
    },
    {
      id: 'hoc_ord_3',
      name: 'Shield Block',
      level: 1,
      abilityRequired: 'CON',
      actionType: 'IMMEDIATE',
      effectDescription: 'Prevent 30 damage',
      faction: Factions.HEART_OF_CORMYR,
      imageUrl: null
    }
  ],
  // Add similar for other factions...
  [Factions.TYRANNY_OF_GOBLINS]: [],
  [Factions.CURSE_OF_UNDEATH]: [],
  [Factions.BLOOD_OF_GRUUMSH]: []
}

export default {
  Factions,
  commanders,
  sampleCreatures,
  sampleOrderCards
}
