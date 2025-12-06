// Abilities Test v3.0
// This script runs automated games and reports detailed statistics on:
// - Commander abilities (all 10 across 5 factions)
// - Creature special abilities (per faction)
// - AI difficulty behavior verification
//
// Run with: npx vite-node test-abilities.js

import { GameState, GamePhases, Players, TerrainTypes } from './src/models/gameState.js'
import { Creature, CreatureInstance } from './src/models/creatures.js'
import { Commander, AbilityTypes, AbilityCategories } from './src/models/commanders.js'
import { OrderCard, ActionTypes } from './src/models/orders.js'
import { Factions, commanders, sampleCreatures, sampleOrderCards } from './src/data/factions.js'
import SimpleAI from './src/ai/simpleAI.js'

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  NUM_SIMULATIONS: 100,
  MAX_TURNS_PER_GAME: 100,
  PLAYER_COUNTS_TO_TEST: [2], // Focus on 2-player for ability testing
  VERBOSE_LOGGING: false,
  TRACK_ABILITY_USAGE: true,

  // AI Difficulty Testing Configuration
  // Set to 'easy', 'medium', 'hard', 'mixed' (random per AI), or 'all' (run tests for each difficulty)
  AI_DIFFICULTY: 'all',

  // Track creature abilities by faction (for Phase 2+ testing)
  TRACK_CREATURE_ABILITIES: true,

  // Expected ability usage rates by difficulty (for validation)
  EXPECTED_RATES: {
    flashing_blades: { easy: 0, medium: 0.5, hard: 1.0 },
    hidden_blade: { easy: 0, medium: 0.5, hard: 1.0 },
    shadow_stalker: { easy: 0, medium: 0.5, hard: 1.0 },
    versatile: { easy: 0, medium: 0.5, hard: 1.0 },
    burrow: { easy: 0, medium: 0.5, hard: 1.0 },
    confusion_gaze: { easy: 0, medium: 0.5, hard: 1.0 }
  }
}

// ============================================================================
// STATISTICS TRACKING
// ============================================================================

/**
 * Comprehensive statistics tracking for commander abilities
 */
const stats = {
  // ===== Core Game Stats =====
  gamesCompleted: 0,
  gamesErrored: 0,
  totalTurns: 0,
  maxTurns: 0,
  minTurns: Infinity,

  // ===== Win Tracking =====
  winsByPlayer: {},

  // ===== Error Tracking =====
  errors: [],
  warnings: [],
  infiniteLoops: 0,

  // ===== Combat Statistics =====
  attacksAttempted: 0,
  attacksSuccessful: 0,
  totalDamageDealt: 0,
  creaturesDestroyed: 0,

  // ===== Deployment Statistics =====
  creaturesDeployed: 0,

  // ===== Balance Tracking =====
  factionWins: {},
  factionGames: {},
  commanderWins: {},
  commanderGames: {},

  // ===== COMMANDER ABILITY STATISTICS =====
  abilityStats: {
    // Blood of Gruumsh
    gruumsh_commands_it: {
      name: 'GRUUMSH COMMANDS IT',
      type: 'PASSIVE',
      timesTriggered: 0,           // Times terrain cost reduced
      tilesMovedOnDifficult: 0,    // Tiles moved through difficult terrain at cost 1
      movementSaved: 0,            // Total movement points saved
      errors: []
    },
    orc_scout: {
      name: 'ORC SCOUT',
      type: 'ACTIVE',
      timesUsed: 0,                // Times ability was used
      timesAvailable: 0,           // Times ability could have been used
      orcsDeployedToTreasure: 0,   // Orcs deployed to treasure tiles
      errors: []
    },

    // Sting of Lolth
    walls_of_web: {
      name: 'WALLS OF WEB',
      type: 'PASSIVE',
      timesApplied: 0,             // Times speed bonus applied
      creaturesAffected: 0,        // Unique creatures that benefited
      extraTilesMoved: 0,          // Additional tiles moved due to +2 speed
      errors: []
    },
    sellsword: {
      name: 'SELLSWORD',
      type: 'ACTIVE',
      timesTriggered: 0,           // Times Drow collected treasure
      choseMorale: 0,              // Times player chose +1 morale
      choseCard: 0,                // Times player chose draw card
      errors: []
    },

    // Curse of Undeath
    bloodthirsty: {
      name: 'BLOODTHIRSTY',
      type: 'PASSIVE',
      timesTriggered: 0,           // Times enemy was killed
      leadershipGained: 0,         // Total leadership gained
      errors: []
    },
    unstoppable_hordes: {
      name: 'UNSTOPPABLE HORDES',
      type: 'PASSIVE',
      timesUsed: 0,                // Times ability was used
      creaturesUsed: 0,            // Total Undead creatures that used this ability
      moraleLost: 0,               // Total morale lost (1 per creature)
      damagePrevented: 0,          // Total damage prevented (20 per creature)
      adjacentUndeadHelped: 0,     // Times adjacent Undead helped defend
      errors: []
    },

    // Universal Game Mechanic (not commander-specific)
    cower: {
      name: 'COWER',
      type: 'UNIVERSAL',
      timesUsed: 0,                // Times any creature cowered
      moraleLost: 0,               // Total morale lost from cowering
      damageAvoided: 0,            // Total damage avoided (all damage from attack)
      blackHandOfBaneExtra: 0,     // Extra morale paid due to BLACK HAND OF BANE
      errors: []
    },
    immediate_card: {
      name: 'IMMEDIATE CARD',
      type: 'UNIVERSAL',
      timesUsed: 0,                // Times IMMEDIATE cards were used for defense
      damagePrevented: 0,          // Total damage prevented
      cardsUsed: 0,                // Total cards discarded
      creaturesTapped: 0,          // Total creatures tapped
      cardNames: {},               // Track which cards were used (name -> count)
      errors: []
    },

    // Tyranny of Goblins
    horde: {
      name: 'HORDE',
      type: 'PASSIVE',
      timesUsed: 0,                // Times deployed in Refresh phase
      creaturesDeployed: 0,        // Creatures deployed during Refresh
      errors: []
    },
    black_hand_of_bane: {
      name: 'BLACK HAND OF BANE',
      type: 'PASSIVE',
      timesTriggered: 0,           // Times enemy cowered
      extraMoraleDrained: 0,       // Extra morale drained
      errors: []
    },

    // Heart of Cormyr
    scrollbook: {
      name: 'SCROLLBOOK',
      type: 'ACTIVE',
      timesUsed: 0,                // Times ability was used
      timesAvailable: 0,           // Times ability could have been used (per turn)
      cardsDiscarded: 0,           // Cards discarded
      cardsDrawn: 0,               // Cards drawn
      errors: []
    },
    versatile: {
      name: 'VERSATILE',
      type: 'ACTIVE',
      timesTriggered: 0,           // Times Adventurer moved
      extraMovesUsed: 0,           // Times extra move was used
      extraMoveDeclined: 0,        // Times extra move was declined
      totalExtraTilesMoved: 0,     // Tiles moved on second move
      errors: []
    }
  },

  // ===== Per-Commander Ability Usage =====
  commanderAbilityUsage: {},

  // ===== AI DIFFICULTY STATISTICS =====
  difficultyStats: {
    easy: { gamesPlayed: 0, wins: 0, immediateCardsUsed: 0, creatureAbilitiesUsed: 0 },
    medium: { gamesPlayed: 0, wins: 0, immediateCardsUsed: 0, creatureAbilitiesUsed: 0 },
    hard: { gamesPlayed: 0, wins: 0, immediateCardsUsed: 0, creatureAbilitiesUsed: 0 }
  },

  // ===== CREATURE ABILITY STATISTICS (by faction) =====
  // These will be populated as abilities are implemented in future phases
  creatureAbilityStats: {
    // ===== STING OF LOLTH =====
    lolth: {
      scuttle: { name: 'SCUTTLE', timesTriggered: 0, extraTilesMoved: 0, creatures: ['Demonweb Spider', 'Giant Spider', 'Drider'] },
      hidden_blade: { name: 'HIDDEN BLADE', timesTriggered: 0, timesOffered: 0, timesDeclined: 0, damageDealt: 0, creatures: ['Drow Assassin'] },
      shadow_stalker: { name: 'SHADOW STALKER', timesTriggered: 0, timesOffered: 0, timesDeclined: 0, deployments: 0, creatures: ['Shadow Mastiff'] },
      summon_spider: { name: 'SUMMON SPIDER', timesTriggered: 0, spidersDeployed: 0, creatures: ['Drow Priestess'] },
      confusion_gaze: { name: 'CONFUSION GAZE', timesTriggered: 0, timesOffered: 0, timesDeclined: 0, enemiesSlid: 0, damageDealt: 0, creatures: ['Umber Hulk'] },
      burrow_lolth: { name: 'BURROW', timesTriggered: 0, timesOffered: 0, timesDeclined: 0, mountainTilesMoved: 0, creatures: ['Umber Hulk'] }
    },

    // ===== HEART OF CORMYR =====
    cormyr: {
      flanking: { name: 'FLANKING', timesTriggered: 0, bonusDamageDealt: 0, creatures: ['Halfling Sneak'] },
      flashing_blades: { name: 'FLASHING BLADES', timesTriggered: 0, timesOffered: 0, timesDeclined: 0, splashDamageDealt: 0, creatures: ['Drow Blademaster'] },
      shield_block: { name: 'SHIELD BLOCK', timesTriggered: 0, damageBlocked: 0, creatures: ['Dwarven Defender'] },
      healing_touch: { name: 'HEALING TOUCH', timesTriggered: 0, hpHealed: 0, cardsRemoved: 0, creatures: ['Dwarf Cleric'] },
      explosive_bolts: { name: 'EXPLOSIVE BOLTS', timesTriggered: 0, splashDamageDealt: 0, creatures: ['Half-Orc Thug'] },
      arcane_portal: { name: 'ARCANE PORTAL', timesTriggered: 0, portalDeployments: 0, creatures: ['War Wizard'] },
      flying_cormyr: { name: 'FLYING', timesTriggered: 0, terrainIgnored: 0, creatures: ['Copper Dragon'] },
      acid_breath: { name: 'ACID BREATH', timesTriggered: 0, splashDamageDealt: 0, creatures: ['Copper Dragon'] },
      burrow_cormyr: { name: 'BURROW', timesTriggered: 0, timesOffered: 0, timesDeclined: 0, mountainTilesMoved: 0, creatures: ['Earth Guardian'] },
      slam: { name: 'SLAM', timesTriggered: 0, enemiesSlid: 0, creatures: ['Earth Guardian'] }
    },

    // ===== BLOOD OF GRUUMSH =====
    gruumsh: {
      death_strike: { name: 'DEATH STRIKE', timesTriggered: 0, damageDealt: 0, creatures: ['Boar', 'Wereboar'] },
      untap_on_kill: { name: 'UNTAP ON KILL', timesTriggered: 0, creatures: ['Orc Barbarian'] },
      beast_deployment: { name: 'BEAST DEPLOYMENT', timesTriggered: 0, beastsDeployed: 0, creatures: ['Orc Druid'] },
      summon_orc: { name: 'SUMMON ORC', timesTriggered: 0, orcsDeployed: 0, leadershipGained: 0, creatures: ['Orc Chieftain'] },
      draw_order: { name: 'DRAW ORDER', timesTriggered: 0, cardsDrawn: 0, creatures: ['Orc Cleric of Gruumsh'] },
      morale_boost: { name: 'MORALE BOOST', timesTriggered: 0, moraleGained: 0, creatures: ['Ogre'] }
    },

    // ===== CURSE OF UNDEATH =====
    undeath: {
      graveyard_deploy: { name: 'GRAVEYARD DEPLOY', timesTriggered: 0, zombiesRedeployed: 0, moralePaid: 0, creatures: ['Zombie'] },
      life_drain: { name: 'LIFE DRAIN', timesTriggered: 0, hpHealed: 0, creatures: ['Vampire Stalker'] },
      aura_damage: { name: 'AURA DAMAGE', timesTriggered: 0, damageDealt: 0, creatures: ['Disciple of Kyuss'] },
      cleave: { name: 'CLEAVE', timesTriggered: 0, splashDamageDealt: 0, creatures: ['Skeletal Tomb Guardian'] },
      rider_undeath: { name: 'RIDER', timesTriggered: 0, skeletonsDeployed: 0, creatures: ['Skeletal Lancer'] },
      undead_deployment: { name: 'UNDEAD DEPLOYMENT', timesTriggered: 0, undeadDeployed: 0, creatures: ['Lich Necromancer'] },
      phasing: { name: 'PHASING', timesTriggered: 0, wallsIgnored: 0, creatures: ['Hypnotic Spirit'] },
      insubstantial: { name: 'INSUBSTANTIAL', timesTriggered: 0, damagePreventedCompletely: 0, creatures: ['Hypnotic Spirit'] },
      flying_undeath: { name: 'FLYING', timesTriggered: 0, terrainIgnored: 0, creatures: ['Dracolich'] },
      lightning_breath: { name: 'LIGHTNING BREATH', timesTriggered: 0, attacksMade: 0, damageDealt: 0, creatures: ['Dracolich'] }
    },

    // ===== TYRANNY OF GOBLINS =====
    goblins: {
      opportunist: { name: 'OPPORTUNIST', timesTriggered: 0, bonusDamageDealt: 0, creatures: ['Goblin Cutter'] },
      tap_on_hit: { name: 'TAP ON HIT', timesTriggered: 0, creaturesTapped: 0, creatures: ['Wolf', 'Horned Devil'] },
      flanking_goblin: { name: 'FLANKING', timesTriggered: 0, bonusDamageDealt: 0, creatures: ['Goblin Champion'] },
      magic_circle_aura: { name: 'MAGIC CIRCLE AURA', timesTriggered: 0, damageBlocked: 0, creatures: ['Hobgoblin Sorcerer'] },
      untap_on_kill_goblin: { name: 'UNTAP ON KILL', timesTriggered: 0, creatures: ['Bugbear Berserker'] },
      rider_goblin: { name: 'RIDER', timesTriggered: 0, creaturesDeployed: 0, creatures: ['Goblin Wolf Rider'] },
      regenerate: { name: 'REGENERATE', timesTriggered: 0, hpHealed: 0, creatures: ['Feral Troll'] },
      flying_goblin: { name: 'FLYING', timesTriggered: 0, terrainIgnored: 0, creatures: ['Horned Devil'] },
      reach: { name: 'REACH 2', timesTriggered: 0, attacksFromDistance: 0, creatures: ['Horned Devil'] }
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize stats tracking for a player
 */
function initPlayerStats(playerId) {
  if (!stats.winsByPlayer[playerId]) {
    stats.winsByPlayer[playerId] = 0
  }
}

/**
 * Initialize stats for faction/commander tracking
 */
function initBalanceTracking(faction, commanderName) {
  if (!stats.factionWins[faction]) {
    stats.factionWins[faction] = 0
    stats.factionGames[faction] = 0
  }
  stats.factionGames[faction]++

  if (!stats.commanderWins[commanderName]) {
    stats.commanderWins[commanderName] = 0
    stats.commanderGames[commanderName] = 0
  }
  stats.commanderGames[commanderName]++

  // Initialize ability usage tracking for this commander
  if (!stats.commanderAbilityUsage[commanderName]) {
    stats.commanderAbilityUsage[commanderName] = {
      gamesPlayed: 0,
      abilitiesTriggered: 0,
      abilityDetails: {}
    }
  }
  stats.commanderAbilityUsage[commanderName].gamesPlayed++
}

/**
 * Create a creature deck for a faction
 * Each faction has exactly 12 unique creatures (no duplicates)
 */
function createCreatureDeck(faction) {
  // Create single copy of each creature (12 total per faction)
  return sampleCreatures[faction].map(c => new Creature(c))
}

/**
 * Create an order deck for a faction
 * Each faction has 36 unique order cards (numbered #1-#36)
 * Only one copy of each card exists in the deck
 */
function createOrderDeck(faction) {
  // Create single copy of each order card (no duplicates)
  const deck = sampleOrderCards[faction].map(o => new OrderCard(o))
  return deck
}

/**
 * Track creature ability usage
 */
function trackCreatureAbility(factionKey, abilityKey, detail = {}) {
  const factionAbilities = stats.creatureAbilityStats[factionKey]
  if (!factionAbilities || !factionAbilities[abilityKey]) return

  const ability = factionAbilities[abilityKey]

  switch (abilityKey) {
    case 'flashing_blades':
      if (detail.offered) ability.timesOffered++
      if (detail.triggered) ability.timesTriggered++
      if (detail.declined) ability.timesDeclined++
      if (detail.splashDamage) ability.splashDamageDealt += detail.splashDamage
      break
    case 'hidden_blade':
      if (detail.offered) ability.timesOffered++
      if (detail.triggered) ability.timesTriggered++
      if (detail.declined) ability.timesDeclined++
      if (detail.damage) ability.damageDealt += detail.damage
      break
    case 'shadow_stalker':
      if (detail.offered) ability.timesOffered++
      if (detail.triggered) {
        ability.timesTriggered++
        ability.deployments++
      }
      if (detail.declined) ability.timesDeclined++
      break
    case 'burrow_lolth':
    case 'burrow_cormyr':
      if (detail.offered) ability.timesOffered++
      if (detail.triggered) ability.timesTriggered++
      if (detail.declined) ability.timesDeclined++
      if (detail.mountainTiles) ability.mountainTilesMoved += detail.mountainTiles
      break
    case 'confusion_gaze':
      if (detail.offered) ability.timesOffered++
      if (detail.triggered) {
        ability.timesTriggered++
        ability.enemiesSlid++
      }
      if (detail.declined) ability.timesDeclined++
      if (detail.damage) ability.damageDealt += detail.damage
      break
    default:
      if (detail.triggered) ability.timesTriggered++
      break
  }
}

/**
 * Track ability trigger
 */
function trackAbility(abilityId, detail = {}) {
  if (stats.abilityStats[abilityId]) {
    const abilityStats = stats.abilityStats[abilityId]

    switch (abilityId) {
      case 'gruumsh_commands_it':
        abilityStats.timesTriggered++
        if (detail.tilesMoved) abilityStats.tilesMovedOnDifficult += detail.tilesMoved
        if (detail.movementSaved) abilityStats.movementSaved += detail.movementSaved
        break
      case 'walls_of_web':
        abilityStats.timesApplied++
        if (detail.extraTiles) abilityStats.extraTilesMoved += detail.extraTiles
        break
      case 'bloodthirsty':
        abilityStats.timesTriggered++
        abilityStats.leadershipGained += (detail.leadershipGained || 1)
        break
      case 'sellsword':
        abilityStats.timesTriggered++
        if (detail.choseMorale) abilityStats.choseMorale++
        if (detail.choseCard) abilityStats.choseCard++
        break
      case 'horde':
        abilityStats.timesUsed++
        if (detail.creaturesDeployed) abilityStats.creaturesDeployed += detail.creaturesDeployed
        break
      case 'black_hand_of_bane':
        abilityStats.timesTriggered++
        abilityStats.extraMoraleDrained += (detail.extraMorale || 1)
        break
      case 'unstoppable_hordes':
        if (detail.used) {
          abilityStats.timesUsed++
          abilityStats.creaturesUsed += (detail.creaturesUsed || 1)
          abilityStats.moraleLost += (detail.moraleLost || detail.creaturesUsed || 1)
          abilityStats.damagePrevented += (detail.damagePrevented || (detail.creaturesUsed || 1) * 20)
          if (detail.adjacentHelped) abilityStats.adjacentUndeadHelped += detail.adjacentHelped
        }
        break
      case 'cower':
        abilityStats.timesUsed++
        abilityStats.moraleLost += (detail.moraleLost || 0)
        abilityStats.damageAvoided += (detail.damageAvoided || 0)
        if (detail.blackHandExtra) abilityStats.blackHandOfBaneExtra += detail.blackHandExtra
        break
      case 'immediate_card':
        abilityStats.timesUsed++
        abilityStats.damagePrevented += (detail.damagePrevented || 0)
        abilityStats.cardsUsed++
        abilityStats.creaturesTapped++
        if (detail.cardName) {
          abilityStats.cardNames[detail.cardName] = (abilityStats.cardNames[detail.cardName] || 0) + 1
        }
        break
      case 'scrollbook':
        if (detail.used) {
          abilityStats.timesUsed++
          abilityStats.cardsDiscarded++
          abilityStats.cardsDrawn++
        }
        if (detail.available) abilityStats.timesAvailable++
        break
      case 'versatile':
        abilityStats.timesTriggered++
        if (detail.extraMoveUsed) {
          abilityStats.extraMovesUsed++
          abilityStats.totalExtraTilesMoved += (detail.tilesMoved || 0)
        } else {
          abilityStats.extraMoveDeclined++
        }
        break
      case 'orc_scout':
        if (detail.used) {
          abilityStats.timesUsed++
          abilityStats.orcsDeployedToTreasure++
        }
        if (detail.available) abilityStats.timesAvailable++
        break
    }
  }
}

/**
 * Process attack queue with ability tracking
 * Includes tracking for defensive abilities: COWER (universal) and UNSTOPPABLE HORDES
 *
 * Big O Complexity: O(a) where a = number of attack intentions
 */
function processAttackQueue(attackIntentions, gameState, currentPlayerId) {
  const results = {
    attacksProcessed: 0,
    attacksSuccessful: 0,
    damageDealt: 0,
    creaturesDestroyed: 0
  }

  for (const intention of attackIntentions) {
    const { attackerInstance, defenderInstance, targetInfo } = intention
    results.attacksProcessed++
    stats.attacksAttempted++

    // Skip dead targets
    if (defenderInstance.isDestroyed() || !defenderInstance.position) {
      continue
    }

    // Skip dead attackers
    if (attackerInstance.isDestroyed() || !attackerInstance.position) {
      continue
    }

    // Skip deployment protection
    if (defenderInstance.deployedThisTurn) {
      continue
    }

    // Calculate incoming damage for defensive options
    const incomingDamage = targetInfo.attackType === 'melee'
      ? attackerInstance.creature.meleeAttack?.damage || 0
      : attackerInstance.creature.rangedAttack?.damage || 0

    // Check if defender can use defensive abilities (AI decision)
    // Uses defender's configured AI difficulty
    const defenderOwner = defenderInstance.owner
    const defenderPlayer = gameState.players[defenderOwner]
    const defenderDifficulty = defenderPlayer?.aiDifficulty || 'easy'
    const defenderAI = new SimpleAI(gameState, defenderOwner, null, defenderDifficulty)
    const defenseDecision = defenderAI.decideDefense
      ? defenderAI.decideDefense(defenderInstance, incomingDamage, attackerInstance.owner)
      : { type: 'none', hadOpportunity: false }

    let damageReduction = 0
    let defenseType = null

    // Apply defense if AI decided to use one
    if (defenseDecision.type === 'cower') {
      // COWER: Avoid ALL damage
      const cowerResult = gameState.applyCower
        ? gameState.applyCower(defenderInstance, incomingDamage, attackerInstance.owner)
        : { success: false }

      if (cowerResult.success) {
        damageReduction = cowerResult.damageAvoided
        defenseType = 'cower'

        // Track COWER usage
        trackAbility('cower', {
          moraleLost: cowerResult.moraleCost,
          damageAvoided: cowerResult.damageAvoided,
          blackHandExtra: cowerResult.extraCost || 0
        })

        // Track BLACK HAND OF BANE if extra cost was applied
        if (cowerResult.extraCost > 0) {
          trackAbility('black_hand_of_bane', { extraMorale: cowerResult.extraCost })
        }

        if (CONFIG.VERBOSE_LOGGING) {
          console.log(`  [COWER] ${defenderInstance.creature.name} avoids ${damageReduction} damage!`)
        }
      }
    } else if (defenseDecision.type === 'unstoppable_hordes') {
      // UNSTOPPABLE HORDES: Prevent 20 damage per creature
      let totalDamageReduction = 0
      let creaturesUsed = 0
      let adjacentHelped = 0

      // Apply for defender if can use
      if (defenseDecision.defenderCanUse) {
        const result = gameState.applyUnstoppableHordes
          ? gameState.applyUnstoppableHordes(defenderInstance)
          : { success: false }

        if (result.success) {
          totalDamageReduction += result.damagePrevented
          creaturesUsed++
        }
      }

      // Apply for adjacent Undead creatures
      for (const creature of defenseDecision.creatures || []) {
        const result = gameState.applyUnstoppableHordes
          ? gameState.applyUnstoppableHordes(creature)
          : { success: false }

        if (result.success) {
          totalDamageReduction += result.damagePrevented
          creaturesUsed++
          adjacentHelped++
        }
      }

      if (creaturesUsed > 0) {
        damageReduction = totalDamageReduction
        defenseType = 'unstoppable_hordes'

        // Track UNSTOPPABLE HORDES usage
        trackAbility('unstoppable_hordes', {
          used: true,
          creaturesUsed,
          moraleLost: creaturesUsed,
          damagePrevented: totalDamageReduction,
          adjacentHelped
        })

        if (CONFIG.VERBOSE_LOGGING) {
          console.log(`  [UNSTOPPABLE HORDES] ${creaturesUsed} Undead prevent ${totalDamageReduction} damage!`)
        }
      }
    } else if (defenseDecision.type === 'immediate_card') {
      // IMMEDIATE CARD: Prevent damage using an order card
      const result = gameState.applyImmediateCardDefense
        ? gameState.applyImmediateCardDefense(defenseDecision.card, defenseDecision.creature)
        : { success: false }

      if (result.success) {
        damageReduction = result.damagePrevented
        defenseType = 'immediate_card'

        // Track IMMEDIATE card usage
        trackAbility('immediate_card', {
          damagePrevented: result.damagePrevented,
          cardName: defenseDecision.card?.name || 'Unknown'
        })

        if (CONFIG.VERBOSE_LOGGING) {
          console.log(`  [IMMEDIATE CARD] ${defenseDecision.card?.name} prevents ${result.damagePrevented} damage! (${defenseDecision.creature.creature.name} tapped)`)
        }
      }
    }

    // Execute the attack with damage reduction
    const attackResult = gameState.executeAttackWithDefense
      ? gameState.executeAttackWithDefense(attackerInstance, defenderInstance, targetInfo.attackType, damageReduction, defenseType)
      : gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)

    if (attackResult.success) {
      results.attacksSuccessful++
      stats.attacksSuccessful++
      results.damageDealt += attackResult.damage
      stats.totalDamageDealt += attackResult.damage

      // Check for FLASHING BLADES ability (Drow Blademaster)
      if (gameState.hasFlashingBlades && gameState.hasFlashingBlades(attackerInstance)) {
        const flashingBladesTargets = gameState.getFlashingBladesTargets
          ? gameState.getFlashingBladesTargets(attackerInstance, defenderInstance)
          : []

        if (flashingBladesTargets.length > 0) {
          // Track that FLASHING BLADES was offered
          trackCreatureAbility('cormyr', 'flashing_blades', { offered: true })

          // AI decision to use FLASHING BLADES based on difficulty
          const attackerOwner = attackerInstance.owner
          const attackerPlayer = gameState.players[attackerOwner]
          const attackerDifficulty = attackerPlayer?.aiDifficulty || 'easy'

          let useFlashingBlades = false
          switch (attackerDifficulty) {
            case 'easy':
              useFlashingBlades = false  // Easy AI never uses creature abilities
              break
            case 'medium':
              useFlashingBlades = Math.random() < 0.5  // Medium AI uses 50% of the time
              break
            case 'hard':
              useFlashingBlades = true  // Hard AI always uses creature abilities
              break
          }

          if (useFlashingBlades) {
            // Pick a random target from available targets
            const target = flashingBladesTargets[Math.floor(Math.random() * flashingBladesTargets.length)]
            const splashDamage = attackerInstance.creature.meleeAttack?.damage || 0

            // Track FLASHING BLADES usage
            trackCreatureAbility('cormyr', 'flashing_blades', {
              triggered: true,
              splashDamage: splashDamage
            })

            // Track difficulty-specific usage
            stats.difficultyStats[attackerDifficulty].creatureAbilitiesUsed++

            if (CONFIG.VERBOSE_LOGGING) {
              console.log(`  [FLASHING BLADES] ${attackerInstance.creature.name} attacks ${target.creature.name} for ${splashDamage} splash damage!`)
            }
          } else {
            trackCreatureAbility('cormyr', 'flashing_blades', { declined: true })
          }
        }
      }

      // Check for HIDDEN BLADE ability (Drow Assassin) - works on melee OR ranged
      if (gameState.hasHiddenBlade && gameState.hasHiddenBlade(attackerInstance)) {
        const hiddenBladeTargets = gameState.getHiddenBladeTargets
          ? gameState.getHiddenBladeTargets(attackerInstance)
          : []

        if (hiddenBladeTargets.length > 0) {
          // Track that HIDDEN BLADE was offered
          trackCreatureAbility('lolth', 'hidden_blade', { offered: true })

          // AI decision to use HIDDEN BLADE based on difficulty
          const attackerOwner = attackerInstance.owner
          const attackerPlayer = gameState.players[attackerOwner]
          const attackerDifficulty = attackerPlayer?.aiDifficulty || 'easy'

          let useHiddenBlade = false
          switch (attackerDifficulty) {
            case 'easy':
              useHiddenBlade = false  // Easy AI never uses creature abilities
              break
            case 'medium':
              useHiddenBlade = Math.random() < 0.5  // Medium AI uses 50% of the time
              break
            case 'hard':
              useHiddenBlade = true  // Hard AI always uses creature abilities
              break
          }

          if (useHiddenBlade) {
            // Pick best target (lowest HP or highest level)
            const target = hiddenBladeTargets.reduce((best, current) => {
              if (current.currentHP <= 10 && best.currentHP > 10) return current
              if (best.currentHP <= 10 && current.currentHP > 10) return best
              return (current.creature.level || 1) > (best.creature.level || 1) ? current : best
            }, hiddenBladeTargets[0])

            const hiddenBladeDamage = 10

            // Track HIDDEN BLADE usage
            trackCreatureAbility('lolth', 'hidden_blade', {
              triggered: true,
              damage: hiddenBladeDamage
            })

            // Track difficulty-specific usage
            stats.difficultyStats[attackerDifficulty].creatureAbilitiesUsed++

            if (CONFIG.VERBOSE_LOGGING) {
              console.log(`  [HIDDEN BLADE] ${attackerInstance.creature.name} strikes ${target.creature.name} for ${hiddenBladeDamage} damage!`)
            }
          } else {
            trackCreatureAbility('lolth', 'hidden_blade', { declined: true })
          }
        }
      }

      // Check for CONFUSION GAZE ability (Umber Hulk)
      if (gameState.hasConfusionGaze && gameState.hasConfusionGaze(attackerInstance)) {
        const confusionGazeTargets = gameState.getConfusionGazeTargets
          ? gameState.getConfusionGazeTargets(attackerInstance)
          : []

        if (confusionGazeTargets.length > 0) {
          // Track that CONFUSION GAZE was offered
          trackCreatureAbility('lolth', 'confusion_gaze', { offered: true })

          // AI decision to use CONFUSION GAZE based on difficulty
          const attackerOwner = attackerInstance.owner
          const attackerPlayer = gameState.players[attackerOwner]
          const attackerDifficulty = attackerPlayer?.aiDifficulty || 'easy'

          let useConfusionGaze = false
          switch (attackerDifficulty) {
            case 'easy':
              useConfusionGaze = false  // Easy AI never uses creature abilities
              break
            case 'medium':
              useConfusionGaze = Math.random() < 0.5  // Medium AI uses 50% of the time
              break
            case 'hard':
              useConfusionGaze = true  // Hard AI always uses creature abilities
              break
          }

          if (useConfusionGaze) {
            // Pick a random target from available targets
            const target = confusionGazeTargets[Math.floor(Math.random() * confusionGazeTargets.length)]
            const confusionGazeDamage = attackerInstance.creature.meleeAttack?.damage || 30

            // Track CONFUSION GAZE usage
            trackCreatureAbility('lolth', 'confusion_gaze', {
              triggered: true,
              damage: confusionGazeDamage
            })

            // Track difficulty-specific usage
            stats.difficultyStats[attackerDifficulty].creatureAbilitiesUsed++

            if (CONFIG.VERBOSE_LOGGING) {
              console.log(`  [CONFUSION GAZE] ${attackerInstance.creature.name} slides and strikes ${target.creature.name} for ${confusionGazeDamage} damage!`)
            }
          } else {
            trackCreatureAbility('lolth', 'confusion_gaze', { declined: true })
          }
        }
      }

      // Track destruction and BLOODTHIRSTY ability
      if (attackResult.destroyed) {
        results.creaturesDestroyed++
        stats.creaturesDestroyed++

        // Check for BLOODTHIRSTY ability
        const attackerOwner = attackerInstance.owner
        if (gameState.hasCommanderAbility(attackerOwner, 'bloodthirsty')) {
          const player = gameState.players[attackerOwner]
          player.leadership = (player.leadership || 0) + 1
          trackAbility('bloodthirsty', { leadershipGained: 1 })

          if (CONFIG.VERBOSE_LOGGING) {
            console.log(`  [BLOODTHIRSTY] +1 Leadership for killing ${defenderInstance.creature.name}`)
          }
        }
      }
    }
  }

  return results
}

/**
 * Execute AI turn with ability tracking
 * Uses player's configured AI difficulty
 */
function executeAITurn(gameState, currentPlayerId) {
  const player = gameState.players[currentPlayerId]
  const difficulty = player.aiDifficulty || 'easy'
  const ai = new SimpleAI(gameState, currentPlayerId, null, difficulty)

  const result = {
    movementActions: 0,
    attackActions: 0,
    deploymentActions: 0,
    abilitiesTriggered: []
  }

  try {
    // Get AI turn result - this handles all phases
    const turnResult = ai.executeTurn()

    if (!turnResult.actions) {
      return result
    }

    // Process actions and collect attack intentions
    const attackIntentions = []

    for (const action of turnResult.actions) {
      switch (action.type) {
        case 'deploy':
          result.deploymentActions++
          stats.creaturesDeployed++

          // Track ORC SCOUT ability
          if (gameState.hasCommanderAbility(currentPlayerId, 'orc_scout')) {
            if (action.creature && action.creature.includes && action.creature.includes('Orc')) {
              const treasureTiles = gameState.treasures.map(t => t.position)
              const isTreasureTile = treasureTiles.some(
                t => t.x === action.position.x && t.y === action.position.y
              )
              if (isTreasureTile) {
                trackAbility('orc_scout', { used: true })
              }
            }
          }

          // Track SHADOW STALKER ability (Shadow Mastiff)
          if (action.creature && action.creature.includes('Shadow Mastiff')) {
            // Shadow Mastiff deployed - check if SHADOW STALKER was used
            if (action.isShadowStalker) {
              trackCreatureAbility('lolth', 'shadow_stalker', { triggered: true })
            } else {
              // Shadow Mastiff deployed to starting zone (ability offered but not used)
              trackCreatureAbility('lolth', 'shadow_stalker', { offered: true, declined: true })
            }
          }
          break

        case 'move':
          result.movementActions++

          // Track GRUUMSH COMMANDS IT - check if destination is difficult terrain
          if (gameState.hasCommanderAbility(currentPlayerId, 'gruumsh_commands_it')) {
            if (action.to) {
              const tile = gameState.getTile(action.to.x, action.to.y)
              const terrain = tile?.terrain
              if (terrain === TerrainTypes.FOREST || terrain === TerrainTypes.DIFFICULT || terrain === TerrainTypes.WATER) {
                trackAbility('gruumsh_commands_it', {
                  tilesMoved: 1,
                  movementSaved: 1
                })
              }
            }
          }

          // Track WALLS OF WEB - for Drow/Spider creatures
          if (gameState.hasCommanderAbility(currentPlayerId, 'walls_of_web')) {
            // Check if it's a Drow or Spider creature by finding the instance
            const creatures = player.creaturesInPlay || []
            const movedCreature = creatures.find(c =>
              c.position && action.to &&
              c.position.x === action.to.x &&
              c.position.y === action.to.y
            )
            if (movedCreature) {
              const types = movedCreature.creature.type || []
              if (types.includes('Drow') || types.includes('Spider')) {
                trackAbility('walls_of_web', { extraTiles: 2 })
              }
            }
          }

          // Track BURROW ability - Umber Hulk (Lolth) or Earth Guardian (Cormyr)
          if (gameState.hasBurrow) {
            const creatures = player.creaturesInPlay || []
            const movedCreature = creatures.find(c =>
              c.position && action.to &&
              c.position.x === action.to.x &&
              c.position.y === action.to.y
            )
            if (movedCreature && gameState.hasBurrow(movedCreature)) {
              const faction = movedCreature.creature.faction
              const isLolth = faction === 'Sting of Lolth'
              const abilityKey = isLolth ? 'burrow_lolth' : 'burrow_cormyr'
              const factionKey = isLolth ? 'lolth' : 'cormyr'

              // Track that BURROW was offered (creature with ability moved)
              trackCreatureAbility(factionKey, abilityKey, { offered: true })

              // Check if path went through any mountains (means BURROW was used)
              const path = action.path || []
              const mountainTilesInPath = path.filter(pos => {
                const tile = gameState.getTile(pos.x, pos.y)
                return tile && (tile.terrain === 'MOUNTAIN' || tile.terrain === TerrainTypes.MOUNTAIN)
              }).length

              if (mountainTilesInPath > 0) {
                trackCreatureAbility(factionKey, abilityKey, {
                  triggered: true,
                  mountainTiles: mountainTilesInPath
                })

                if (CONFIG.VERBOSE_LOGGING) {
                  console.log(`  [BURROW] ${movedCreature.creature.name} burrowed through ${mountainTilesInPath} mountain tile(s)!`)
                }
              } else {
                // Moved but didn't go through mountains - ability was offered but not needed/used
                trackCreatureAbility(factionKey, abilityKey, { declined: true })
              }
            }
          }
          break

        case 'collect_morale':
          // Track SELLSWORD for Drow treasure collection
          if (gameState.hasCommanderAbility(currentPlayerId, 'sellsword')) {
            const creatures = player.creaturesInPlay || []
            const collector = creatures.find(c =>
              c.position &&
              c.position.x === action.position.x &&
              c.position.y === action.position.y
            )
            if (collector) {
              const types = collector.creature.type || []
              if (types.includes('Drow')) {
                // AI decision: morale or card (50/50)
                const chooseMorale = Math.random() < 0.5
                if (chooseMorale) {
                  trackAbility('sellsword', { choseMorale: true })
                } else {
                  trackAbility('sellsword', { choseCard: true })
                }
              }
            }
          }
          break

        case 'attack_intention':
          attackIntentions.push(action)
          break
      }
    }

    // Process attack queue with ability tracking
    if (attackIntentions.length > 0) {
      const attackResults = processAttackQueue(attackIntentions, gameState, currentPlayerId)
      result.attackActions = attackResults.attacksSuccessful
    }

    // Track VERSATILE ability for Adventurers after movement
    if (gameState.currentPhase === GamePhases.ACTIVATE && gameState.hasCommanderAbility(currentPlayerId, 'versatile')) {
      const creatures = player.creaturesInPlay || []
      const adventurers = creatures.filter(c => c.creature.type?.includes('Adventurer') && !c.isTapped)

      for (const adventurer of adventurers) {
        if (result.movementActions > 0) {
          // AI decision to use VERSATILE
          const useVersatile = Math.random() < 0.4 // 40% chance to use
          trackAbility('versatile', { extraMoveUsed: useVersatile, tilesMoved: useVersatile ? adventurer.creature.speed : 0 })
        }
      }
    }

    // Track SCROLLBOOK ability availability
    if (gameState.hasCommanderAbility(currentPlayerId, 'scrollbook')) {
      const orderHand = player.orderHand || []
      if (orderHand.length > 0 && !player.hasUsedAbilityThisTurn('scrollbook')) {
        trackAbility('scrollbook', { available: true })

        // AI decision to use SCROLLBOOK
        const useScrollbook = Math.random() < 0.5 // 50% chance
        if (useScrollbook && orderHand.length > 0) {
          player.useAbility('scrollbook')
          trackAbility('scrollbook', { used: true })
        }
      }
    }

    // Track HORDE ability (deploy during refresh phase)
    if (gameState.currentPhase === GamePhases.REFRESH && gameState.canDeployInRefreshPhase(currentPlayerId)) {
      if (result.deploymentActions > 0) {
        trackAbility('horde', { creaturesDeployed: result.deploymentActions })
      }
    }

  } catch (e) {
    stats.errors.push(`AI Turn Error (${currentPlayerId}): ${e.message}`)
  }

  return result
}

// ============================================================================
// GAME SIMULATION
// ============================================================================

/**
 * Run a single game simulation
 */
function runGameSimulation(gameNum, numPlayers = 2) {
  const gameResult = {
    gameNum,
    numPlayers,
    completed: false,
    winner: null,
    turns: 0,
    error: null,
    abilitiesTriggered: []
  }

  try {
    // Get available factions and shuffle
    const factionList = Object.values(Factions)
    const shuffledFactions = [...factionList].sort(() => Math.random() - 0.5)

    // Setup players
    const playerSetups = []
    const playerIds = [Players.PLAYER1, Players.PLAYER2, Players.PLAYER3, Players.PLAYER4, Players.PLAYER5]

    for (let i = 0; i < numPlayers; i++) {
      const playerId = playerIds[i]
      const faction = shuffledFactions[i % shuffledFactions.length]
      const factionCommanders = commanders[faction]
      const commander = factionCommanders[Math.floor(Math.random() * factionCommanders.length)]

      // Determine AI difficulty based on CONFIG
      let aiDifficulty = CONFIG.AI_DIFFICULTY
      if (aiDifficulty === 'mixed') {
        const difficulties = ['easy', 'medium', 'hard']
        aiDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)]
      }

      initPlayerStats(playerId)
      initBalanceTracking(faction, commander.name)

      // Track difficulty stats
      stats.difficultyStats[aiDifficulty].gamesPlayed++

      playerSetups.push({
        playerId,
        commander: new Commander(commander),
        creatures: createCreatureDeck(faction),
        orders: createOrderDeck(faction),
        faction,
        isHuman: false,           // All test players are AI
        aiDifficulty: aiDifficulty // Pass difficulty to PlayerState
      })

      gameResult[playerId] = {
        faction,
        commander: commander.name,
        aiDifficulty: aiDifficulty
      }
    }

    // Create game state
    const gameState = new GameState(playerSetups)

    let turnCount = 0
    let consecutiveSamePhase = 0
    let lastPhase = null
    let lastPlayer = null

    // Game loop
    while (!gameState.gameOver && turnCount < CONFIG.MAX_TURNS_PER_GAME) {
      const currentPhase = gameState.currentPhase
      const currentPlayerId = gameState.currentPlayer

      // Detect infinite loops
      if (currentPhase === lastPhase && currentPlayerId === lastPlayer) {
        consecutiveSamePhase++
        if (consecutiveSamePhase > 20) {
          stats.warnings.push(`Game ${gameNum}: Possible infinite loop at turn ${turnCount}`)
          stats.infiniteLoops++
          break
        }
      } else {
        consecutiveSamePhase = 0
        lastPhase = currentPhase
        lastPlayer = currentPlayerId
      }

      try {
        switch (currentPhase) {
          case GamePhases.REFRESH:
            gameState.executeRefreshPhase()
            break

          case GamePhases.ACTIVATE:
            executeAITurn(gameState, currentPlayerId)
            gameState.advancePhase()
            break

          case GamePhases.DEPLOY:
            executeAITurn(gameState, currentPlayerId)
            gameState.advancePhase()
            break

          case GamePhases.CLEANUP:
            gameState.executeCleanupPhase()
            turnCount = gameState.turnNumber
            break

          default:
            gameState.advancePhase()
        }
      } catch (e) {
        stats.errors.push(`Game ${gameNum}, Turn ${turnCount}: ${e.message}`)
        gameResult.error = e.message
        break
      }

      gameState.checkGameOver()
    }

    // Handle timeout
    if (turnCount >= CONFIG.MAX_TURNS_PER_GAME && !gameState.gameOver) {
      stats.warnings.push(`Game ${gameNum}: Reached max turns`)
      gameState.gameOver = true
      let highestMorale = -1
      let winner = null
      gameState.activePlayers.forEach(playerId => {
        const morale = gameState.players[playerId].morale
        if (morale > highestMorale) {
          highestMorale = morale
          winner = playerId
        }
      })
      gameState.winner = winner
    }

    // Record results
    if (gameState.gameOver || turnCount >= CONFIG.MAX_TURNS_PER_GAME) {
      gameResult.completed = true
      gameResult.turns = turnCount
      gameResult.winner = gameState.winner

      stats.gamesCompleted++
      stats.totalTurns += turnCount
      stats.maxTurns = Math.max(stats.maxTurns, turnCount)
      stats.minTurns = Math.min(stats.minTurns, turnCount)

      // Track winner stats
      if (gameState.winner) {
        stats.winsByPlayer[gameState.winner] = (stats.winsByPlayer[gameState.winner] || 0) + 1

        const winnerSetup = playerSetups.find(p => p.playerId === gameState.winner)
        if (winnerSetup) {
          stats.factionWins[winnerSetup.faction]++
          stats.commanderWins[winnerSetup.commander.name]++
        }
      }
    }

  } catch (e) {
    stats.gamesErrored++
    stats.errors.push(`Game ${gameNum}: Fatal error - ${e.message}`)
    gameResult.error = e.message
  }

  return gameResult
}

// ============================================================================
// RESULTS OUTPUT
// ============================================================================

/**
 * Helper to format average per game
 */
function avgPerGame(total) {
  if (stats.gamesCompleted === 0) return '0.00'
  return (total / stats.gamesCompleted).toFixed(2)
}

/**
 * Print comprehensive results
 */
function printResults() {
  const divider = '='.repeat(80)
  const subDivider = '-'.repeat(80)

  console.log('\n' + divider)
  console.log('ABILITIES TEST RESULTS v3.0')
  console.log('Tests: Commander Abilities, Creature Abilities, AI Difficulty')
  console.log(divider)

  // ===== Core Statistics =====
  console.log('\n[CORE STATISTICS]')
  console.log(`  Total Simulations: ${CONFIG.NUM_SIMULATIONS}`)
  console.log(`  Games Completed: ${stats.gamesCompleted}`)
  console.log(`  Games Errored: ${stats.gamesErrored}`)
  console.log(`  Success Rate: ${((stats.gamesCompleted / CONFIG.NUM_SIMULATIONS) * 100).toFixed(1)}%`)

  // ===== Turn Statistics =====
  console.log('\n[TURN STATISTICS]')
  const avgTurns = stats.gamesCompleted > 0 ? (stats.totalTurns / stats.gamesCompleted).toFixed(2) : 'N/A'
  console.log(`  Average Turns per Game: ${avgTurns}`)
  console.log(`  Min Turns: ${stats.minTurns === Infinity ? 'N/A' : stats.minTurns}`)
  console.log(`  Max Turns: ${stats.maxTurns}`)
  console.log(`  Total Turns (all games): ${stats.totalTurns}`)
  console.log(`  Infinite Loops Detected: ${stats.infiniteLoops}`)

  // ===== Combat Statistics =====
  console.log('\n[COMBAT STATISTICS]')
  console.log(`                              TOTAL       AVG/GAME`)
  console.log(`  Attacks Attempted:         ${String(stats.attacksAttempted).padStart(6)}       ${avgPerGame(stats.attacksAttempted)}`)
  console.log(`  Attacks Successful:        ${String(stats.attacksSuccessful).padStart(6)}       ${avgPerGame(stats.attacksSuccessful)}`)
  console.log(`  Total Damage Dealt:        ${String(stats.totalDamageDealt).padStart(6)}       ${avgPerGame(stats.totalDamageDealt)}`)
  console.log(`  Creatures Destroyed:       ${String(stats.creaturesDestroyed).padStart(6)}       ${avgPerGame(stats.creaturesDestroyed)}`)
  console.log(`  Creatures Deployed:        ${String(stats.creaturesDeployed).padStart(6)}       ${avgPerGame(stats.creaturesDeployed)}`)

  // ===== COMMANDER ABILITY STATISTICS =====
  console.log('\n' + divider)
  console.log('COMMANDER ABILITY STATISTICS (TOTAL / AVG PER GAME)')
  console.log(divider)

  // Blood of Gruumsh
  console.log('\n[BLOOD OF GRUUMSH]')
  console.log(`  GRUUMSH COMMANDS IT (PASSIVE - Ignore Difficult Terrain):`)
  console.log(`    Times Triggered:           ${String(stats.abilityStats.gruumsh_commands_it.timesTriggered).padStart(6)}    (${avgPerGame(stats.abilityStats.gruumsh_commands_it.timesTriggered)}/game)`)
  console.log(`    Tiles on Difficult:        ${String(stats.abilityStats.gruumsh_commands_it.tilesMovedOnDifficult).padStart(6)}    (${avgPerGame(stats.abilityStats.gruumsh_commands_it.tilesMovedOnDifficult)}/game)`)
  console.log(`    Movement Points Saved:     ${String(stats.abilityStats.gruumsh_commands_it.movementSaved).padStart(6)}    (${avgPerGame(stats.abilityStats.gruumsh_commands_it.movementSaved)}/game)`)

  console.log(`  ORC SCOUT (ACTIVE - Deploy Orc to Treasure):`)
  console.log(`    Times Available:           ${String(stats.abilityStats.orc_scout.timesAvailable).padStart(6)}    (${avgPerGame(stats.abilityStats.orc_scout.timesAvailable)}/game)`)
  console.log(`    Times Used:                ${String(stats.abilityStats.orc_scout.timesUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.orc_scout.timesUsed)}/game)`)
  console.log(`    Orcs Deployed to Treasure: ${String(stats.abilityStats.orc_scout.orcsDeployedToTreasure).padStart(6)}    (${avgPerGame(stats.abilityStats.orc_scout.orcsDeployedToTreasure)}/game)`)

  // Sting of Lolth
  console.log('\n[STING OF LOLTH]')
  console.log(`  WALLS OF WEB (PASSIVE - +2 Speed to Drow/Spider):`)
  console.log(`    Times Applied:             ${String(stats.abilityStats.walls_of_web.timesApplied).padStart(6)}    (${avgPerGame(stats.abilityStats.walls_of_web.timesApplied)}/game)`)
  console.log(`    Extra Tiles Moved:         ${String(stats.abilityStats.walls_of_web.extraTilesMoved).padStart(6)}    (${avgPerGame(stats.abilityStats.walls_of_web.extraTilesMoved)}/game)`)

  console.log(`  SELLSWORD (ACTIVE - Card or +1 Morale on Treasure):`)
  console.log(`    Times Triggered:           ${String(stats.abilityStats.sellsword.timesTriggered).padStart(6)}    (${avgPerGame(stats.abilityStats.sellsword.timesTriggered)}/game)`)
  console.log(`    Chose +1 Morale:           ${String(stats.abilityStats.sellsword.choseMorale).padStart(6)}    (${avgPerGame(stats.abilityStats.sellsword.choseMorale)}/game)`)
  console.log(`    Chose Draw Card:           ${String(stats.abilityStats.sellsword.choseCard).padStart(6)}    (${avgPerGame(stats.abilityStats.sellsword.choseCard)}/game)`)

  // Curse of Undeath
  console.log('\n[CURSE OF UNDEATH]')
  console.log(`  BLOODTHIRSTY (PASSIVE - +1 Leadership on Kill):`)
  console.log(`    Times Triggered:           ${String(stats.abilityStats.bloodthirsty.timesTriggered).padStart(6)}    (${avgPerGame(stats.abilityStats.bloodthirsty.timesTriggered)}/game)`)
  console.log(`    Leadership Gained:         ${String(stats.abilityStats.bloodthirsty.leadershipGained).padStart(6)}    (${avgPerGame(stats.abilityStats.bloodthirsty.leadershipGained)}/game)`)

  console.log(`  UNSTOPPABLE HORDES (PASSIVE - Undead prevent 20 damage):`)
  console.log(`    Times Used:                ${String(stats.abilityStats.unstoppable_hordes.timesUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.unstoppable_hordes.timesUsed)}/game)`)
  console.log(`    Creatures Used:            ${String(stats.abilityStats.unstoppable_hordes.creaturesUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.unstoppable_hordes.creaturesUsed)}/game)`)
  console.log(`    Morale Lost:               ${String(stats.abilityStats.unstoppable_hordes.moraleLost).padStart(6)}    (${avgPerGame(stats.abilityStats.unstoppable_hordes.moraleLost)}/game)`)
  console.log(`    Damage Prevented:          ${String(stats.abilityStats.unstoppable_hordes.damagePrevented).padStart(6)}    (${avgPerGame(stats.abilityStats.unstoppable_hordes.damagePrevented)}/game)`)
  console.log(`    Adjacent Undead Helped:    ${String(stats.abilityStats.unstoppable_hordes.adjacentUndeadHelped).padStart(6)}    (${avgPerGame(stats.abilityStats.unstoppable_hordes.adjacentUndeadHelped)}/game)`)

  // Universal Mechanics
  console.log('\n[UNIVERSAL MECHANICS]')
  console.log(`  COWER (UNIVERSAL - Avoid ALL damage, costs damage/10 morale):`)
  console.log(`    Times Used:                ${String(stats.abilityStats.cower.timesUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.cower.timesUsed)}/game)`)
  console.log(`    Morale Lost:               ${String(stats.abilityStats.cower.moraleLost).padStart(6)}    (${avgPerGame(stats.abilityStats.cower.moraleLost)}/game)`)
  console.log(`    Damage Avoided:            ${String(stats.abilityStats.cower.damageAvoided).padStart(6)}    (${avgPerGame(stats.abilityStats.cower.damageAvoided)}/game)`)
  console.log(`    BLACK HAND Extra Cost:     ${String(stats.abilityStats.cower.blackHandOfBaneExtra).padStart(6)}    (${avgPerGame(stats.abilityStats.cower.blackHandOfBaneExtra)}/game)`)

  console.log(`  IMMEDIATE CARD (UNIVERSAL - Use order cards for defense):`)
  console.log(`    Times Used:                ${String(stats.abilityStats.immediate_card.timesUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.immediate_card.timesUsed)}/game)`)
  console.log(`    Damage Prevented:          ${String(stats.abilityStats.immediate_card.damagePrevented).padStart(6)}    (${avgPerGame(stats.abilityStats.immediate_card.damagePrevented)}/game)`)
  console.log(`    Cards Used:                ${String(stats.abilityStats.immediate_card.cardsUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.immediate_card.cardsUsed)}/game)`)
  console.log(`    Creatures Tapped:          ${String(stats.abilityStats.immediate_card.creaturesTapped).padStart(6)}    (${avgPerGame(stats.abilityStats.immediate_card.creaturesTapped)}/game)`)
  // Show most used card names
  const cardNamesUsed = Object.entries(stats.abilityStats.immediate_card.cardNames)
  if (cardNamesUsed.length > 0) {
    console.log(`    Cards by Name:`)
    cardNamesUsed.sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([name, count]) => {
      console.log(`      ${name.padEnd(25)} ${String(count).padStart(4)}x`)
    })
  }

  // Tyranny of Goblins
  console.log('\n[TYRANNY OF GOBLINS]')
  console.log(`  HORDE (PASSIVE - Deploy creature in Refresh phase):`)
  console.log(`    Times Used:                ${String(stats.abilityStats.horde.timesUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.horde.timesUsed)}/game)`)
  console.log(`    Creatures Deployed:        ${String(stats.abilityStats.horde.creaturesDeployed).padStart(6)}    (${avgPerGame(stats.abilityStats.horde.creaturesDeployed)}/game)`)

  console.log(`  BLACK HAND OF BANE (PASSIVE - +1 Enemy Cower Cost):`)
  console.log(`    Times Triggered:           ${String(stats.abilityStats.black_hand_of_bane.timesTriggered).padStart(6)}    (${avgPerGame(stats.abilityStats.black_hand_of_bane.timesTriggered)}/game)`)
  console.log(`    Extra Morale Drained:      ${String(stats.abilityStats.black_hand_of_bane.extraMoraleDrained).padStart(6)}    (${avgPerGame(stats.abilityStats.black_hand_of_bane.extraMoraleDrained)}/game)`)

  // Heart of Cormyr
  console.log('\n[HEART OF CORMYR]')
  console.log(`  SCROLLBOOK (ACTIVE - Discard order card to draw one):`)
  console.log(`    Times Available:           ${String(stats.abilityStats.scrollbook.timesAvailable).padStart(6)}    (${avgPerGame(stats.abilityStats.scrollbook.timesAvailable)}/game)`)
  console.log(`    Times Used:                ${String(stats.abilityStats.scrollbook.timesUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.scrollbook.timesUsed)}/game)`)
  console.log(`    Cards Cycled:              ${String(stats.abilityStats.scrollbook.cardsDrawn).padStart(6)}    (${avgPerGame(stats.abilityStats.scrollbook.cardsDrawn)}/game)`)

  console.log(`  VERSATILE (ACTIVE - Extra 2-tile move for Adventurers):`)
  console.log(`    Times Triggered:           ${String(stats.abilityStats.versatile.timesTriggered).padStart(6)}    (${avgPerGame(stats.abilityStats.versatile.timesTriggered)}/game)`)
  console.log(`    Extra Moves Used:          ${String(stats.abilityStats.versatile.extraMovesUsed).padStart(6)}    (${avgPerGame(stats.abilityStats.versatile.extraMovesUsed)}/game)`)
  console.log(`    Extra Moves Declined:      ${String(stats.abilityStats.versatile.extraMoveDeclined).padStart(6)}    (${avgPerGame(stats.abilityStats.versatile.extraMoveDeclined)}/game)`)
  console.log(`    Extra Tiles Moved:         ${String(stats.abilityStats.versatile.totalExtraTilesMoved).padStart(6)}    (${avgPerGame(stats.abilityStats.versatile.totalExtraTilesMoved)}/game)`)

  // ===== Faction Balance =====
  console.log('\n' + subDivider)
  console.log('[FACTION BALANCE]')
  const factionData = Object.entries(stats.factionGames)
    .filter(([f, games]) => games > 0)
    .map(([faction, games]) => ({
      faction,
      games,
      wins: stats.factionWins[faction] || 0,
      winRate: ((stats.factionWins[faction] || 0) / games * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))

  factionData.forEach(({ faction, games, wins, winRate }) => {
    console.log(`  ${faction}: ${wins}/${games} wins (${winRate}%)`)
  })

  // ===== Commander Balance =====
  console.log('\n[COMMANDER BALANCE]')
  const commanderData = Object.entries(stats.commanderGames)
    .filter(([c, games]) => games > 0)
    .map(([commander, games]) => ({
      commander,
      games,
      wins: stats.commanderWins[commander] || 0,
      winRate: ((stats.commanderWins[commander] || 0) / games * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))

  commanderData.forEach(({ commander, games, wins, winRate }) => {
    console.log(`  ${commander}: ${wins}/${games} wins (${winRate}%)`)
  })

  // ===== AI Difficulty Statistics =====
  console.log('\n' + subDivider)
  console.log('[AI DIFFICULTY STATISTICS]')
  console.log(`  Test Configuration: ${CONFIG.AI_DIFFICULTY.toUpperCase()}`)
  Object.entries(stats.difficultyStats).forEach(([difficulty, data]) => {
    if (data.gamesPlayed > 0) {
      const winRate = data.gamesPlayed > 0 ? ((data.wins / data.gamesPlayed) * 100).toFixed(1) : '0.0'
      console.log(`  ${difficulty.toUpperCase()}:`)
      console.log(`    Games Played:              ${String(data.gamesPlayed).padStart(6)}`)
      console.log(`    Wins:                      ${String(data.wins).padStart(6)}    (${winRate}%)`)
      console.log(`    Immediate Cards Used:      ${String(data.immediateCardsUsed).padStart(6)}`)
      console.log(`    Creature Abilities Used:   ${String(data.creatureAbilitiesUsed).padStart(6)}`)
    }
  })

  // ===== Creature Ability Statistics =====
  if (CONFIG.TRACK_CREATURE_ABILITIES) {
    console.log('\n' + subDivider)
    console.log('[CREATURE ABILITY STATISTICS]')

    // Show structure for each faction
    const factionKeys = ['lolth', 'cormyr', 'gruumsh', 'undeath', 'goblins']
    const factionNames = {
      lolth: 'STING OF LOLTH',
      cormyr: 'HEART OF CORMYR',
      gruumsh: 'BLOOD OF GRUUMSH',
      undeath: 'CURSE OF UNDEATH',
      goblins: 'TYRANNY OF GOBLINS'
    }

    let anyAbilityTracked = false

    for (const factionKey of factionKeys) {
      const factionAbilities = stats.creatureAbilityStats[factionKey]
      if (!factionAbilities) continue

      // Check if any abilities have been triggered or offered
      const hasActivity = Object.values(factionAbilities).some(a =>
        a.timesTriggered > 0 || a.timesOffered > 0
      )
      if (hasActivity) {
        anyAbilityTracked = true
        console.log(`\n  [${factionNames[factionKey]}]`)
        for (const [abilityKey, abilityData] of Object.entries(factionAbilities)) {
          if (abilityData.timesTriggered > 0 || abilityData.timesOffered > 0) {
            // Special handling for FLASHING BLADES with extended stats
            if (abilityKey === 'flashing_blades') {
              console.log(`    ${abilityData.name} (${abilityData.creatures.join(', ')}):`)
              console.log(`      Times Offered:           ${String(abilityData.timesOffered).padStart(6)}    (${avgPerGame(abilityData.timesOffered)}/game)`)
              console.log(`      Times Triggered:         ${String(abilityData.timesTriggered).padStart(6)}    (${avgPerGame(abilityData.timesTriggered)}/game)`)
              console.log(`      Times Declined:          ${String(abilityData.timesDeclined).padStart(6)}    (${avgPerGame(abilityData.timesDeclined)}/game)`)
              console.log(`      Splash Damage Dealt:     ${String(abilityData.splashDamageDealt).padStart(6)}    (${avgPerGame(abilityData.splashDamageDealt)}/game)`)
              // Calculate usage rate when offered
              if (abilityData.timesOffered > 0) {
                const usageRate = ((abilityData.timesTriggered / abilityData.timesOffered) * 100).toFixed(1)
                console.log(`      Usage Rate (when offered): ${usageRate}%`)
              }
            } else if (abilityKey === 'hidden_blade') {
              // Special handling for HIDDEN BLADE with extended stats
              console.log(`    ${abilityData.name} (${abilityData.creatures.join(', ')}):`)
              console.log(`      Times Offered:           ${String(abilityData.timesOffered).padStart(6)}    (${avgPerGame(abilityData.timesOffered)}/game)`)
              console.log(`      Times Triggered:         ${String(abilityData.timesTriggered).padStart(6)}    (${avgPerGame(abilityData.timesTriggered)}/game)`)
              console.log(`      Times Declined:          ${String(abilityData.timesDeclined).padStart(6)}    (${avgPerGame(abilityData.timesDeclined)}/game)`)
              console.log(`      Damage Dealt:            ${String(abilityData.damageDealt).padStart(6)}    (${avgPerGame(abilityData.damageDealt)}/game)`)
              // Calculate usage rate when offered
              if (abilityData.timesOffered > 0) {
                const usageRate = ((abilityData.timesTriggered / abilityData.timesOffered) * 100).toFixed(1)
                console.log(`      Usage Rate (when offered): ${usageRate}%`)
              }
            } else if (abilityKey === 'confusion_gaze') {
              // Special handling for CONFUSION GAZE with extended stats
              console.log(`    ${abilityData.name} (${abilityData.creatures.join(', ')}):`)
              console.log(`      Times Offered:           ${String(abilityData.timesOffered).padStart(6)}    (${avgPerGame(abilityData.timesOffered)}/game)`)
              console.log(`      Times Triggered:         ${String(abilityData.timesTriggered).padStart(6)}    (${avgPerGame(abilityData.timesTriggered)}/game)`)
              console.log(`      Times Declined:          ${String(abilityData.timesDeclined).padStart(6)}    (${avgPerGame(abilityData.timesDeclined)}/game)`)
              console.log(`      Enemies Slid:            ${String(abilityData.enemiesSlid).padStart(6)}    (${avgPerGame(abilityData.enemiesSlid)}/game)`)
              console.log(`      Damage Dealt:            ${String(abilityData.damageDealt).padStart(6)}    (${avgPerGame(abilityData.damageDealt)}/game)`)
              // Calculate usage rate when offered
              if (abilityData.timesOffered > 0) {
                const usageRate = ((abilityData.timesTriggered / abilityData.timesOffered) * 100).toFixed(1)
                console.log(`      Usage Rate (when offered): ${usageRate}%`)
              }
            } else {
              console.log(`    ${abilityData.name}: ${abilityData.timesTriggered} triggers (${avgPerGame(abilityData.timesTriggered)}/game)`)
            }
          }
        }
      }
    }

    if (!anyAbilityTracked) {
      console.log('  No creature abilities triggered during testing')
    }
  }

  // ===== Errors =====
  if (stats.errors.length > 0) {
    console.log('\n' + subDivider)
    console.log('ERRORS:')
    stats.errors.slice(0, 10).forEach((error, idx) => {
      console.log(`  ${idx + 1}. ${error}`)
    })
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more errors`)
    }
  }

  if (stats.warnings.length > 0 && stats.warnings.length <= 20) {
    console.log('\n' + subDivider)
    console.log('WARNINGS:')
    stats.warnings.slice(0, 10).forEach((warning, idx) => {
      console.log(`  ${idx + 1}. ${warning}`)
    })
  }

  // ===== Summary =====
  console.log('\n' + divider)
  console.log('TEST SUMMARY')
  console.log(divider)

  const abilityIssues = []
  const commanderAbilitySuccesses = []
  const universalMechanicSuccesses = []

  // Universal mechanics (not commander abilities)
  const universalMechanics = ['cower', 'immediate_card']

  // Check ability statistics
  Object.entries(stats.abilityStats).forEach(([id, data]) => {
    if (data.errors && data.errors.length > 0) {
      abilityIssues.push(`${data.name}: ${data.errors.length} errors`)
    }
    if (data.timesTriggered > 0 || data.timesUsed > 0 || data.timesApplied > 0) {
      if (universalMechanics.includes(id)) {
        universalMechanicSuccesses.push(`${data.name}: Working`)
      } else {
        commanderAbilitySuccesses.push(`${data.name}: Working`)
      }
    }
  })

  if (stats.errors.length === 0 && abilityIssues.length === 0) {
    console.log('ALL TESTS PASSED!')
    console.log(`\n  Commander Abilities (${commanderAbilitySuccesses.length}/10):`)
    commanderAbilitySuccesses.forEach(success => {
      console.log(`    ${success}`)
    })
    if (universalMechanicSuccesses.length > 0) {
      console.log(`\n  Universal Game Mechanics (${universalMechanicSuccesses.length}/2):`)
      universalMechanicSuccesses.forEach(success => {
        console.log(`    ${success}`)
      })
    }
  } else {
    console.log('ISSUES FOUND:')
    if (stats.errors.length > 0) {
      console.log(`  ${stats.errors.length} game errors`)
    }
    abilityIssues.forEach(issue => {
      console.log(`  ${issue}`)
    })
    if (commanderAbilitySuccesses.length > 0) {
      console.log(`\nWorking Commander Abilities (${commanderAbilitySuccesses.length}/10):`)
      commanderAbilitySuccesses.forEach(success => {
        console.log(`  ${success}`)
      })
    }
    if (universalMechanicSuccesses.length > 0) {
      console.log(`\nWorking Universal Mechanics (${universalMechanicSuccesses.length}/2):`)
      universalMechanicSuccesses.forEach(success => {
        console.log(`  ${success}`)
      })
    }
  }

  console.log(divider)
}

// ============================================================================
// HELPER FUNCTIONS FOR DIFFICULTY-SPECIFIC TESTING
// ============================================================================

/**
 * Reset stats for a new difficulty run
 */
function resetStats() {
  stats.gamesCompleted = 0
  stats.gamesErrored = 0
  stats.totalTurns = 0
  stats.maxTurns = 0
  stats.minTurns = Infinity
  stats.winsByPlayer = {}
  stats.errors = []
  stats.warnings = []
  stats.infiniteLoops = 0
  stats.attacksAttempted = 0
  stats.attacksSuccessful = 0
  stats.totalDamageDealt = 0
  stats.creaturesDestroyed = 0
  stats.creaturesDeployed = 0
  stats.factionWins = {}
  stats.factionGames = {}
  stats.commanderWins = {}
  stats.commanderGames = {}
  stats.commanderAbilityUsage = {}

  // Reset commander ability stats
  Object.keys(stats.abilityStats).forEach(key => {
    const ability = stats.abilityStats[key]
    Object.keys(ability).forEach(prop => {
      if (typeof ability[prop] === 'number') ability[prop] = 0
      if (Array.isArray(ability[prop])) ability[prop] = []
      if (prop === 'cardNames') ability[prop] = {}
    })
  })

  // Reset difficulty stats
  Object.keys(stats.difficultyStats).forEach(key => {
    stats.difficultyStats[key] = { gamesPlayed: 0, wins: 0, immediateCardsUsed: 0, creatureAbilitiesUsed: 0 }
  })

  // Reset creature ability stats
  Object.keys(stats.creatureAbilityStats).forEach(factionKey => {
    Object.keys(stats.creatureAbilityStats[factionKey]).forEach(abilityKey => {
      const ability = stats.creatureAbilityStats[factionKey][abilityKey]
      Object.keys(ability).forEach(prop => {
        if (typeof ability[prop] === 'number') ability[prop] = 0
      })
    })
  })
}

/**
 * Run simulations for a specific difficulty
 */
function runDifficultySimulations(difficulty, numGames) {
  const originalDifficulty = CONFIG.AI_DIFFICULTY
  CONFIG.AI_DIFFICULTY = difficulty

  for (let gameNum = 1; gameNum <= numGames; gameNum++) {
    if (gameNum % 10 === 0) {
      console.log(`  Progress: ${gameNum}/${numGames}...`)
    }
    runGameSimulation(gameNum, 2)
  }

  CONFIG.AI_DIFFICULTY = originalDifficulty
}

/**
 * Validate ability usage rates against expected rates
 */
function validateAbilityUsageRates(difficulty) {
  const issues = []

  // Validate FLASHING BLADES usage rate
  const flashingBlades = stats.creatureAbilityStats.cormyr.flashing_blades
  if (flashingBlades.timesOffered > 0) {
    const actualRate = flashingBlades.timesTriggered / flashingBlades.timesOffered
    const expectedRate = CONFIG.EXPECTED_RATES.flashing_blades[difficulty]

    // Allow some variance (±25% for medium, exact for easy/hard)
    let tolerance = 0
    if (difficulty === 'medium') {
      tolerance = 0.25  // 25% tolerance for random 50% chance
    }

    if (Math.abs(actualRate - expectedRate) > tolerance) {
      issues.push(`FLASHING BLADES: Expected ~${(expectedRate * 100).toFixed(0)}% usage, got ${(actualRate * 100).toFixed(1)}%`)
    }
  }

  // Validate HIDDEN BLADE usage rate
  const hiddenBlade = stats.creatureAbilityStats.lolth.hidden_blade
  if (hiddenBlade.timesOffered > 0) {
    const actualRate = hiddenBlade.timesTriggered / hiddenBlade.timesOffered
    const expectedRate = CONFIG.EXPECTED_RATES.hidden_blade[difficulty]

    // Allow some variance (±25% for medium, exact for easy/hard)
    let tolerance = 0
    if (difficulty === 'medium') {
      tolerance = 0.25  // 25% tolerance for random 50% chance
    }

    if (Math.abs(actualRate - expectedRate) > tolerance) {
      issues.push(`HIDDEN BLADE: Expected ~${(expectedRate * 100).toFixed(0)}% usage, got ${(actualRate * 100).toFixed(1)}%`)
    }
  }

  // Validate SHADOW STALKER usage rate
  const shadowStalker = stats.creatureAbilityStats.lolth.shadow_stalker
  if (shadowStalker.timesOffered > 0) {
    const actualRate = shadowStalker.timesTriggered / shadowStalker.timesOffered
    const expectedRate = CONFIG.EXPECTED_RATES.shadow_stalker[difficulty]

    // Allow some variance (±25% for medium, exact for easy/hard)
    let tolerance = 0
    if (difficulty === 'medium') {
      tolerance = 0.25  // 25% tolerance for random 50% chance
    }

    if (Math.abs(actualRate - expectedRate) > tolerance) {
      issues.push(`SHADOW STALKER: Expected ~${(expectedRate * 100).toFixed(0)}% usage, got ${(actualRate * 100).toFixed(1)}%`)
    }
  }

  // Validate CONFUSION GAZE usage rate
  const confusionGaze = stats.creatureAbilityStats.lolth.confusion_gaze
  if (confusionGaze.timesOffered > 0) {
    const actualRate = confusionGaze.timesTriggered / confusionGaze.timesOffered
    const expectedRate = CONFIG.EXPECTED_RATES.confusion_gaze[difficulty]

    // Allow some variance (±25% for medium, exact for easy/hard)
    let tolerance = 0
    if (difficulty === 'medium') {
      tolerance = 0.25  // 25% tolerance for random 50% chance
    }

    if (Math.abs(actualRate - expectedRate) > tolerance) {
      issues.push(`CONFUSION GAZE: Expected ~${(expectedRate * 100).toFixed(0)}% usage, got ${(actualRate * 100).toFixed(1)}%`)
    }
  }

  return issues
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('Starting Abilities Test v3.0...')
console.log(`Configuration: ${CONFIG.NUM_SIMULATIONS} games, max ${CONFIG.MAX_TURNS_PER_GAME} turns each`)
console.log(`AI Difficulty: ${CONFIG.AI_DIFFICULTY.toUpperCase()}`)
console.log(`Tracking: Commander Abilities + Creature Abilities (${CONFIG.TRACK_CREATURE_ABILITIES ? 'enabled' : 'disabled'})`)
console.log('')

if (CONFIG.AI_DIFFICULTY === 'all') {
  // Run separate tests for each difficulty level
  const difficulties = ['easy', 'medium', 'hard']
  const difficultyResults = {}

  for (const difficulty of difficulties) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`RUNNING ${difficulty.toUpperCase()} DIFFICULTY TESTS`)
    console.log(`${'='.repeat(80)}`)

    resetStats()
    runDifficultySimulations(difficulty, CONFIG.NUM_SIMULATIONS)

    // Store results for this difficulty
    difficultyResults[difficulty] = {
      gamesCompleted: stats.gamesCompleted,
      gamesErrored: stats.gamesErrored,
      flashingBlades: { ...stats.creatureAbilityStats.cormyr.flashing_blades },
      hiddenBlade: { ...stats.creatureAbilityStats.lolth.hidden_blade },
      shadowStalker: { ...stats.creatureAbilityStats.lolth.shadow_stalker },
      confusionGaze: { ...stats.creatureAbilityStats.lolth.confusion_gaze },
      difficultyStats: { ...stats.difficultyStats[difficulty] }
    }

    // Validate usage rates for this difficulty
    const validationIssues = validateAbilityUsageRates(difficulty)
    if (validationIssues.length > 0) {
      console.log(`\n[VALIDATION ISSUES for ${difficulty.toUpperCase()}]`)
      validationIssues.forEach(issue => console.log(`  ⚠️ ${issue}`))
    }

    printResults()
  }

  // Print cross-difficulty summary
  console.log(`\n${'='.repeat(80)}`)
  console.log('CROSS-DIFFICULTY SUMMARY')
  console.log(`${'='.repeat(80)}`)

  console.log('\n[FLASHING BLADES USAGE BY DIFFICULTY]')
  console.log('                        OFFERED   TRIGGERED   DECLINED   RATE')
  for (const difficulty of difficulties) {
    const fb = difficultyResults[difficulty].flashingBlades
    const rate = fb.timesOffered > 0 ? ((fb.timesTriggered / fb.timesOffered) * 100).toFixed(1) : '0.0'
    console.log(`  ${difficulty.toUpperCase().padEnd(8)}          ${String(fb.timesOffered).padStart(6)}    ${String(fb.timesTriggered).padStart(6)}     ${String(fb.timesDeclined).padStart(6)}    ${rate}%`)
  }

  console.log('\n[HIDDEN BLADE USAGE BY DIFFICULTY]')
  console.log('                        OFFERED   TRIGGERED   DECLINED   RATE')
  for (const difficulty of difficulties) {
    const hb = difficultyResults[difficulty].hiddenBlade
    const rate = hb.timesOffered > 0 ? ((hb.timesTriggered / hb.timesOffered) * 100).toFixed(1) : '0.0'
    console.log(`  ${difficulty.toUpperCase().padEnd(8)}          ${String(hb.timesOffered).padStart(6)}    ${String(hb.timesTriggered).padStart(6)}     ${String(hb.timesDeclined).padStart(6)}    ${rate}%`)
  }

  console.log('\n[SHADOW STALKER USAGE BY DIFFICULTY]')
  console.log('                        OFFERED   TRIGGERED   DECLINED   RATE')
  for (const difficulty of difficulties) {
    const ss = difficultyResults[difficulty].shadowStalker
    const rate = ss.timesOffered > 0 ? ((ss.timesTriggered / ss.timesOffered) * 100).toFixed(1) : '0.0'
    console.log(`  ${difficulty.toUpperCase().padEnd(8)}          ${String(ss.timesOffered).padStart(6)}    ${String(ss.timesTriggered).padStart(6)}     ${String(ss.timesDeclined).padStart(6)}    ${rate}%`)
  }

  console.log('\n[CONFUSION GAZE USAGE BY DIFFICULTY]')
  console.log('                        OFFERED   TRIGGERED   DECLINED   RATE')
  for (const difficulty of difficulties) {
    const cg = difficultyResults[difficulty].confusionGaze
    const rate = cg.timesOffered > 0 ? ((cg.timesTriggered / cg.timesOffered) * 100).toFixed(1) : '0.0'
    console.log(`  ${difficulty.toUpperCase().padEnd(8)}          ${String(cg.timesOffered).padStart(6)}    ${String(cg.timesTriggered).padStart(6)}     ${String(cg.timesDeclined).padStart(6)}    ${rate}%`)
  }

  console.log('\n[EXPECTED VS ACTUAL RATES - FLASHING BLADES]')
  for (const difficulty of difficulties) {
    const fb = difficultyResults[difficulty].flashingBlades
    const actualRate = fb.timesOffered > 0 ? (fb.timesTriggered / fb.timesOffered) : 0
    const expectedRate = CONFIG.EXPECTED_RATES.flashing_blades[difficulty]
    const status = Math.abs(actualRate - expectedRate) <= 0.25 ? '✓' : '✗'
    console.log(`  ${difficulty.toUpperCase().padEnd(8)} Expected: ${(expectedRate * 100).toFixed(0)}%   Actual: ${(actualRate * 100).toFixed(1)}%  ${status}`)
  }

  console.log('\n[EXPECTED VS ACTUAL RATES - HIDDEN BLADE]')
  for (const difficulty of difficulties) {
    const hb = difficultyResults[difficulty].hiddenBlade
    const actualRate = hb.timesOffered > 0 ? (hb.timesTriggered / hb.timesOffered) : 0
    const expectedRate = CONFIG.EXPECTED_RATES.hidden_blade[difficulty]
    const status = Math.abs(actualRate - expectedRate) <= 0.25 ? '✓' : '✗'
    console.log(`  ${difficulty.toUpperCase().padEnd(8)} Expected: ${(expectedRate * 100).toFixed(0)}%   Actual: ${(actualRate * 100).toFixed(1)}%  ${status}`)
  }

  console.log('\n[EXPECTED VS ACTUAL RATES - SHADOW STALKER]')
  for (const difficulty of difficulties) {
    const ss = difficultyResults[difficulty].shadowStalker
    const actualRate = ss.timesOffered > 0 ? (ss.timesTriggered / ss.timesOffered) : 0
    const expectedRate = CONFIG.EXPECTED_RATES.shadow_stalker[difficulty]
    const status = Math.abs(actualRate - expectedRate) <= 0.25 ? '✓' : '✗'
    console.log(`  ${difficulty.toUpperCase().padEnd(8)} Expected: ${(expectedRate * 100).toFixed(0)}%   Actual: ${(actualRate * 100).toFixed(1)}%  ${status}`)
  }

  console.log('\n[EXPECTED VS ACTUAL RATES - CONFUSION GAZE]')
  for (const difficulty of difficulties) {
    const cg = difficultyResults[difficulty].confusionGaze
    const actualRate = cg.timesOffered > 0 ? (cg.timesTriggered / cg.timesOffered) : 0
    const expectedRate = CONFIG.EXPECTED_RATES.confusion_gaze[difficulty]
    const status = Math.abs(actualRate - expectedRate) <= 0.25 ? '✓' : '✗'
    console.log(`  ${difficulty.toUpperCase().padEnd(8)} Expected: ${(expectedRate * 100).toFixed(0)}%   Actual: ${(actualRate * 100).toFixed(1)}%  ${status}`)
  }

} else {
  // Run simulations with single difficulty
  for (let gameNum = 1; gameNum <= CONFIG.NUM_SIMULATIONS; gameNum++) {
    if (gameNum % 10 === 0) {
      console.log(`  Progress: ${gameNum}/${CONFIG.NUM_SIMULATIONS}...`)
    }
    runGameSimulation(gameNum, 2)
  }

  // Print comprehensive results
  printResults()
}
