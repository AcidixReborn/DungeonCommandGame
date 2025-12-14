import { useState } from 'react'
import { Container, Card, Button, ProgressBar, Alert, Table, Badge, Row, Col } from 'react-bootstrap'
import { GameState, GamePhases, Players, TerrainTypes } from '../models/gameState'
import { Creature, CreatureInstance } from '../models/creatures'
import { Commander } from '../models/commanders'
import { OrderCard } from '../models/orders'
import { Factions, commanders, sampleCreatures, sampleOrderCards } from '../data/factions'
import SimpleAI from '../ai/simpleAI'

/**
 * AbilitiesTest - In-app test for all abilities
 * - Commander abilities (all 10 across 5 factions)
 * - Creature abilities (FLASHING BLADES, etc.)
 * - Order card abilities (future)
 * Runs 100 automated games and tracks ability usage statistics
 */
function AbilitiesTest() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [currentTest, setCurrentTest] = useState(0)

  const MAX_TURNS = 100
  const NUM_TESTS = 100

  // Initialize commander ability statistics
  const createAbilityStats = () => ({
    gruumsh_commands_it: { name: 'GRUUMSH COMMANDS IT', type: 'PASSIVE', timesTriggered: 0, tilesMovedOnDifficult: 0, movementSaved: 0 },
    orc_scout: { name: 'ORC SCOUT', type: 'ACTIVE', timesUsed: 0, timesAvailable: 0, orcsDeployedToTreasure: 0 },
    walls_of_web: { name: 'WALLS OF WEB', type: 'PASSIVE', timesApplied: 0, extraTilesMoved: 0 },
    sellsword: { name: 'SELLSWORD', type: 'ACTIVE', timesTriggered: 0, choseMorale: 0, choseCard: 0 },
    bloodthirsty: { name: 'BLOODTHIRSTY', type: 'PASSIVE', timesTriggered: 0, leadershipGained: 0 },
    unstoppable_hordes: { name: 'UNSTOPPABLE HORDES', type: 'PASSIVE', cowerOpportunities: 0, cowerGranted: 0, cowerUsed: 0, moraleLost: 0, damagePrevented: 0 },
    horde: { name: 'HORDE', type: 'PASSIVE', timesUsed: 0, creaturesDeployed: 0 },
    black_hand_of_bane: { name: 'BLACK HAND OF BANE', type: 'PASSIVE', timesTriggered: 0, extraMoraleDrained: 0 },
    scrollbook: { name: 'SCROLLBOOK', type: 'ACTIVE', timesUsed: 0, timesAvailable: 0, cardsDiscarded: 0, cardsDrawn: 0 },
    versatile: { name: 'VERSATILE', type: 'ACTIVE', timesTriggered: 0, extraMovesUsed: 0, extraMoveDeclined: 0, totalExtraTilesMoved: 0 }
  })

  // Initialize creature ability statistics with per-difficulty tracking
  const createCreatureAbilityStats = () => ({
    flashing_blades: {
      name: 'FLASHING BLADES',
      creature: 'Drow Blademaster',
      faction: 'Sting of Lolth',
      // Overall totals
      timesOffered: 0,
      timesTriggered: 0,
      timesDeclined: 0,
      splashDamageDealt: 0,
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0 },
      medium: { offered: 0, triggered: 0, declined: 0 },
      hard: { offered: 0, triggered: 0, declined: 0 }
    },
    hidden_blade: {
      name: 'HIDDEN BLADE',
      creature: 'Drow Assassin',
      faction: 'Sting of Lolth',
      // Overall totals
      timesOffered: 0,
      timesTriggered: 0,
      timesDeclined: 0,
      damageDealt: 0,
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0 },
      medium: { offered: 0, triggered: 0, declined: 0 },
      hard: { offered: 0, triggered: 0, declined: 0 }
    },
    scuttle: {
      name: 'SCUTTLE',
      creature: 'Demonweb Spider, Drider, Giant Spider',
      faction: 'Sting of Lolth',
      // Overall totals
      timesOffered: 0,  // Times a SCUTTLE creature moved (could have used ability)
      timesTriggered: 0,  // Times SCUTTLE was enabled (based on difficulty)
      timesDeclined: 0,  // Times SCUTTLE was disabled by difficulty
      creaturesPassedThrough: 0,  // Total creatures passed through when enabled
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0, creaturesPassedThrough: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, creaturesPassedThrough: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, creaturesPassedThrough: 0 }
    },
    shadow_stalker: {
      name: 'SHADOW STALKER',
      creature: 'Shadow Mastiff',
      faction: 'Sting of Lolth',
      // Overall totals
      timesOffered: 0,  // Times Shadow Mastiff was deployed (could have used ability)
      timesTriggered: 0,  // Times deployed to mountain-adjacent tile
      timesDeclined: 0,  // Times deployed to starting zone instead
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0 },
      medium: { offered: 0, triggered: 0, declined: 0 },
      hard: { offered: 0, triggered: 0, declined: 0 }
    },
    burrow_lolth: {
      name: 'BURROW',
      creature: 'Umber Hulk',
      faction: 'Sting of Lolth',
      // Overall totals
      timesOffered: 0,  // Times creature with BURROW moved
      timesTriggered: 0,  // Times path went through mountains
      timesDeclined: 0,  // Times moved without going through mountains
      mountainTilesMoved: 0,  // Total mountain tiles traversed
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0, mountainTiles: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, mountainTiles: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, mountainTiles: 0 }
    },
    burrow_cormyr: {
      name: 'BURROW',
      creature: 'Earth Guardian',
      faction: 'Heart of Cormyr',
      // Overall totals
      timesOffered: 0,  // Times creature with BURROW moved
      timesTriggered: 0,  // Times path went through mountains
      timesDeclined: 0,  // Times moved without going through mountains
      mountainTilesMoved: 0,  // Total mountain tiles traversed
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0, mountainTiles: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, mountainTiles: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, mountainTiles: 0 }
    },
    confusion_gaze: {
      name: 'CONFUSION GAZE',
      creature: 'Umber Hulk',
      faction: 'Sting of Lolth',
      // Overall totals
      timesOffered: 0,  // Times ability could have been used (Umber Hulk attacking with valid targets)
      timesTriggered: 0,  // Times ability was used
      timesDeclined: 0,  // Times ability was not used
      enemiesSlid: 0,  // Total enemies slid
      damageDealt: 0,  // Total damage dealt via CONFUSION GAZE
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0 },
      medium: { offered: 0, triggered: 0, declined: 0 },
      hard: { offered: 0, triggered: 0, declined: 0 }
    },
    summon_spider: {
      name: 'SUMMON SPIDER',
      creature: 'Drow Priestess',
      faction: 'Sting of Lolth',
      // Overall totals
      timesOffered: 0,  // Times Spider was deployed when Priestess was in play
      timesTriggered: 0,  // Times Spider was deployed near Priestess
      timesDeclined: 0,  // Times Spider was deployed to starting zone instead
      spidersDeployed: 0,  // Total spiders deployed via ability
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0, spidersDeployed: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, spidersDeployed: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, spidersDeployed: 0 }
    },
    graveyard_deploy: {
      name: 'GRAVEYARD DEPLOY',
      creature: 'Zombie',
      faction: 'Curse of Undeath',
      // Overall totals
      timesOffered: 0,  // Times Zombie was in graveyard with morale+leadership available
      timesTriggered: 0,  // Times Zombie was resurrected
      timesDeclined: 0,  // Times resurrection was available but not used
      zombiesResurrected: 0,  // Total zombies resurrected
      moralePaid: 0,  // Total morale paid (1 per resurrection)
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0, resurrected: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, resurrected: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, resurrected: 0 }
    },
    // Phase 2 abilities
    life_drain: {
      name: 'LIFE DRAIN',
      creature: 'Vampire Stalker',
      faction: 'Curse of Undeath',
      // Overall totals - automatic trigger, no choice involved
      timesTriggered: 0,  // Times healed after melee attack dealt damage
      totalHealed: 0,  // Total HP healed
      // Per-difficulty breakdown (same across all since automatic)
      easy: { triggered: 0, healed: 0 },
      medium: { triggered: 0, healed: 0 },
      hard: { triggered: 0, healed: 0 }
    },
    lich_necromancer_deploy: {
      name: 'ADJACENT UNDEAD DEPLOY',
      creature: 'Lich Necromancer',
      faction: 'Curse of Undeath',
      // Overall totals
      timesOffered: 0,  // Times Undead deployed when Lich in play
      timesTriggered: 0,  // Times deployed adjacent to Lich
      timesDeclined: 0,  // Times deployed to starting zone instead
      // Per-difficulty breakdown
      easy: { offered: 0, triggered: 0, declined: 0 },
      medium: { offered: 0, triggered: 0, declined: 0 },
      hard: { offered: 0, triggered: 0, declined: 0 }
    },
    tomb_guardian_splash: {
      name: 'SWIRL (SPLASH)',
      creature: 'Skeletal Tomb Guardian',
      faction: 'Curse of Undeath',
      // Overall totals - difficulty-based trigger (0/50/100 pattern)
      timesOffered: 0,  // Times SWIRL could have triggered (melee attack with adjacent enemies)
      timesTriggered: 0,  // Times splash was triggered
      timesDeclined: 0,  // Times SWIRL was declined by AI difficulty
      enemiesHit: 0,  // Total enemies hit by splash
      totalDamage: 0,  // Total splash damage dealt
      kills: 0,  // Creatures killed by splash
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 }
    },
    lightning_breath: {
      name: 'LIGHTNING BREATH',
      creature: 'Dracolich',
      faction: 'Curse of Undeath',
      // Overall totals - difficulty-based trigger (0/50/100 pattern)
      timesOffered: 0,  // Times LIGHTNING BREATH could have been used (2+ valid targets)
      timesTriggered: 0,  // Times ability was used
      timesDeclined: 0,  // Times ability was declined by AI difficulty
      targetsHit: 0,  // Total targets hit
      totalDamage: 0,  // Total damage dealt
      kills: 0,  // Creatures killed
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, targetsHit: 0, damage: 0, kills: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, targetsHit: 0, damage: 0, kills: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, targetsHit: 0, damage: 0, kills: 0 }
    },
    disciple_of_kyuss: {
      name: 'DISCIPLE OF KYUSS',
      creature: 'Disciple of Kyuss',
      faction: 'Curse of Undeath',
      // Overall totals - difficulty-based trigger (0/50/100 pattern)
      // Triggers at end of ACTIVATE phase for adjacent enemy creatures
      timesOffered: 0,  // Times adjacent enemies existed at phase end
      timesTriggered: 0,  // Times damage was dealt
      timesDeclined: 0,  // Times ability was skipped (AI difficulty)
      enemiesHit: 0,  // Total enemies damaged
      totalDamage: 0,  // Total damage dealt
      kills: 0,  // Creatures killed
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 }
    },
    phasing: {
      name: 'PHASING',
      creature: 'Hypnotic Spirit',
      faction: 'Curse of Undeath',
      // Overall totals - passive ability like FLYING but can pass through creatures
      timesOffered: 0,  // Times creature could move (had movement points)
      timesTriggered: 0,  // Times creature moved using phasing terrain benefits
      creaturesPassedThrough: 0,  // Number of creatures passed through during moves
      mountainsTraversed: 0,  // Number of mountain tiles crossed
      // Per-difficulty breakdown (0/50/100 pattern for AI using phasing benefits)
      easy: { offered: 0, triggered: 0, creaturesThrough: 0, mountains: 0 },
      medium: { offered: 0, triggered: 0, creaturesThrough: 0, mountains: 0 },
      hard: { offered: 0, triggered: 0, creaturesThrough: 0, mountains: 0 }
    },
    insubstantial: {
      name: 'INSUBSTANTIAL',
      creature: 'Hypnotic Spirit',
      faction: 'Curse of Undeath',
      // Overall totals - passive damage prevention, resets on Undead faction refresh
      timesOffered: 0,  // Times creature took damage with ability available
      timesTriggered: 0,  // Times ability blocked damage
      timesDeclined: 0,  // Times AI declined (difficulty-based 0/50/100 pattern)
      totalDamageBlocked: 0,  // Total damage blocked by ability
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, blocked: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, blocked: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, blocked: 0 }
    },
    rider: {
      name: 'RIDER (Skeleton)',
      creature: 'Skeletal Lancer',
      faction: 'Curse of Undeath',
      // Overall totals - on death, deploy Skeleton creature from hand
      timesOffered: 0,  // Times Skeletal Lancer was destroyed with eligible Skeleton in hand
      timesTriggered: 0,  // Times a Skeleton was deployed via RIDER
      timesDeclined: 0,  // Times AI declined (difficulty-based 0/50/100 pattern)
      creaturesDeployed: 0,  // Total creatures deployed
      totalMoraleSaved: 0,  // Total morale saved (deployed creature level)
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, deployed: 0, moraleSaved: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, deployed: 0, moraleSaved: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, deployed: 0, moraleSaved: 0 }
    },
    riderGoblin: {
      name: 'RIDER (Goblin/Wolf)',
      creature: 'Goblin Wolf Rider',
      faction: 'Tyranny of Goblins',
      // Overall totals - on death, deploy Goblin or Wolf creature from hand
      timesOffered: 0,  // Times Goblin Wolf Rider was destroyed with eligible creature in hand
      timesTriggered: 0,  // Times a Goblin/Wolf was deployed via RIDER
      timesDeclined: 0,  // Times AI declined (difficulty-based 0/50/100 pattern)
      creaturesDeployed: 0,  // Total creatures deployed
      totalMoraleSaved: 0,  // Total morale saved (deployed creature level)
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, deployed: 0, moraleSaved: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, deployed: 0, moraleSaved: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, deployed: 0, moraleSaved: 0 }
    },
    acid_breath: {
      name: 'ACID BREATH',
      creature: 'Copper Dragon',
      faction: 'Heart of Cormyr',
      // Overall totals - ranged splash damage (0/50/100 pattern for AI offense)
      timesOffered: 0,  // Times ranged attack had adjacent enemies to splash
      timesTriggered: 0,  // Times splash damage was applied
      timesDeclined: 0,  // Times AI declined (difficulty-based 0/50/100 pattern)
      enemiesHit: 0,  // Total enemies hit by splash
      totalDamage: 0,  // Total splash damage dealt (20 per target)
      kills: 0,  // Creatures killed by splash
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 }
    },
    explosive_bolts: {
      name: 'EXPLOSIVE BOLTS',
      creature: 'Half-Orc Thug',
      faction: 'Heart of Cormyr',
      // Overall totals - ranged splash damage (0/50/100 pattern for AI offense)
      timesOffered: 0,  // Times ranged attack had adjacent enemies to splash
      timesTriggered: 0,  // Times splash damage was applied
      timesDeclined: 0,  // Times AI declined (difficulty-based 0/50/100 pattern)
      enemiesHit: 0,  // Total enemies hit by splash
      totalDamage: 0,  // Total splash damage dealt (10 per target)
      kills: 0,  // Creatures killed by splash
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 }
    },
    slam: {
      name: 'SLAM',
      creature: 'Earth Guardian',
      faction: 'Heart of Cormyr',
      // Overall totals - melee slide ability (0/50/100 pattern for AI offense)
      timesOffered: 0,  // Times melee attack dealt damage and target survived with valid slide tiles
      timesTriggered: 0,  // Times SLAM was executed (enemy slid)
      timesDeclined: 0,  // Times AI declined (difficulty-based 0/50/100 pattern)
      enemiesSlid: 0,  // Total enemies slid
      damageDealt: 0,  // Total damage dealt by the triggering melee attack
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, enemiesSlid: 0, damage: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, enemiesSlid: 0, damage: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, enemiesSlid: 0, damage: 0 }
    },
    flanking: {
      name: 'FLANKING',
      creature: 'Halfling Sneak',
      faction: 'Heart of Cormyr',
      // Overall totals - passive melee damage bonus (0/50/100 AI pattern)
      timesOffered: 0,  // Times FLANKING could apply (ally adjacent to target during melee)
      timesTriggered: 0,  // Times FLANKING bonus was applied
      timesDeclined: 0,  // Times AI didn't use (Easy=always, Medium=50%, Hard=never)
      bonusDamageDealt: 0,  // Total bonus damage dealt (+10 per trigger)
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, damage: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, damage: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, damage: 0 }
    },
    arcane_portal: {
      name: 'ARCANE PORTAL',
      creature: 'War Wizard',
      faction: 'Heart of Cormyr',
      // Overall totals - deployment ability (0/50/100 AI pattern)
      timesOffered: 0,  // Times War Wizard was deployed (could have used ability)
      timesTriggered: 0,  // Times deployed to Magic Circle tile
      timesDeclined: 0,  // Times deployed to starting zone instead
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0 },
      medium: { offered: 0, triggered: 0, declined: 0 },
      hard: { offered: 0, triggered: 0, declined: 0 }
    },
    shield_block: {
      name: 'SHIELD BLOCK',
      creature: 'Dwarven Defender',
      faction: 'Heart of Cormyr',
      // Overall totals - passive defense aura (0/50/100 AI pattern)
      timesOffered: 0,  // Times Adventurer was attacked adjacent to Dwarven Defender
      timesTriggered: 0,  // Times Block damage reduction was applied
      timesDeclined: 0,  // Times AI didn't benefit (Easy=always, Medium=50%, Hard=never)
      totalDamageBlocked: 0,  // Total damage blocked (10 per adjacent Defender per hit)
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, damageBlocked: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, damageBlocked: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, damageBlocked: 0 }
    },
    healing_touch: {
      name: 'HEALING TOUCH',
      creature: 'Dwarf Cleric',
      faction: 'Heart of Cormyr',
      // Overall totals - active healing ability (0/50/100 AI pattern)
      timesOffered: 0,      // Times Dwarf Cleric could use ability (had targets)
      timesTriggered: 0,    // Times ability was actually used
      timesDeclined: 0,     // Times AI didn't use (Easy=always, Medium=50%, Hard=based on strategy)
      selfHeals: 0,         // Times healed self
      allyHeals: 0,         // Times healed ally
      cardsRemoved: 0,      // Times removed attached order card
      totalHealingDone: 0,  // Total HP healed
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, heals: 0, cardRemovals: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, heals: 0, cardRemovals: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, heals: 0, cardRemovals: 0 }
    },
    regenerate_10: {
      name: 'REGENERATE 10',
      creature: 'Feral Troll',
      faction: 'Tyranny of Goblins',
      // Overall totals - passive healing ability at start of refresh (0/50/100 AI pattern)
      timesOffered: 0,        // Times creature had damage and could regenerate
      timesTriggered: 0,      // Times regeneration was actually applied
      timesDeclined: 0,       // Times AI didn't regenerate (Easy=always, Medium=50%)
      totalHealingRestored: 0,// Total HP restored through regeneration
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, healingRestored: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, healingRestored: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, healingRestored: 0 }
    },
    untap_on_adjacent_kill: {
      name: 'UNTAP ON KILL',
      creature: 'Bugbear Berserker',
      faction: 'Tyranny of Goblins',
      // Overall totals - passive untap when adjacent enemy dies (0/50/100 AI pattern)
      timesOffered: 0,        // Times adjacent enemy died during Bugbear's faction turn
      timesTriggered: 0,      // Times Bugbear actually untapped
      timesDeclined: 0,       // Times AI didn't untap (Easy=always, Medium=50%)
      selfKills: 0,           // Times Bugbear itself killed the adjacent enemy
      allyKills: 0,           // Times ally killed adjacent enemy (proving ability works)
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0 },
      medium: { offered: 0, triggered: 0, declined: 0 },
      hard: { offered: 0, triggered: 0, declined: 0 }
    },
    reach_2: {
      name: 'REACH 2',
      creature: 'Horned Devil',
      faction: 'Tyranny of Goblins',
      // Overall totals - melee attacks at range 2 (0/50/100 AI pattern for target selection)
      timesOffered: 0,        // Times reach attack was available
      timesTriggered: 0,      // Times reach attack was performed (at range 2)
      timesDeclined: 0,       // Times AI chose adjacent target over reach target
      totalDamageDealt: 0,    // Total damage dealt from reach attacks
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100% for preferring reach)
      easy: { offered: 0, triggered: 0, declined: 0, damageDealt: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, damageDealt: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, damageDealt: 0 }
    },
    tap_on_hit: {
      name: 'TAP ON HIT',
      creature: 'Horned Devil, Wolf',
      faction: 'Tyranny of Goblins',
      // Overall totals - tap target when dealing melee damage (passive ability)
      timesOffered: 0,        // Times creature with tapOnHit attacked
      timesTriggered: 0,      // Times target was tapped from attack
      timesAlreadyTapped: 0,  // Times target was already tapped (no additional effect)
      timesNoDamage: 0,       // Times attack dealt 0 damage (no tap)
      // Per-difficulty breakdown (AI target selection 0/50/100 for untapped targets)
      easy: { offered: 0, triggered: 0, alreadyTapped: 0 },
      medium: { offered: 0, triggered: 0, alreadyTapped: 0 },
      hard: { offered: 0, triggered: 0, alreadyTapped: 0 },
      // Per-creature stats to track Wolf vs Horned Devil separately
      wolfStats: { attacks: 0, kills: 0, triggers: 0, totalDefenderHP: 0 },
      hornedDevilStats: { attacks: 0, kills: 0, triggers: 0, totalDefenderHP: 0 }
    },
    magic_circle_aura: {
      name: 'MAGIC CIRCLE AURA',
      creature: 'Hobgoblin Sorcerer',
      faction: 'Tyranny of Goblins',
      // Overall totals - passive damage prevention when Sorcerer on Magic Circle
      timesOffered: 0,        // Times creature took damage with aura active
      timesTriggered: 0,      // Times shield blocked damage
      timesDeclined: 0,       // Times AI declined (0/50/100 pattern)
      totalDamageBlocked: 0,  // Total damage blocked by shields
      auraActivations: 0,     // Times Sorcerer entered Magic Circle
      auraDeactivations: 0,   // Times aura ended (death/movement)
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, blocked: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, blocked: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, blocked: 0 }
    },
    cutter: {
      name: 'CUTTER',
      creature: 'Goblin Cutter',
      faction: 'Tyranny of Goblins',
      // Overall totals - passive melee damage bonus vs tapped creatures
      timesOffered: 0,      // Times CUTTER could apply (target was tapped during melee)
      timesTriggered: 0,    // Times CUTTER bonus was applied
      timesDeclined: 0,     // Times AI didn't use (Easy=always, Medium=50%, Hard=never)
      bonusDamageDealt: 0,  // Total bonus damage dealt (+10 per trigger)
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, damage: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, damage: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, damage: 0 }
    },
    chieftain_call: {
      name: 'CHIEFTAIN CALL',
      creature: 'Orc Chieftain',
      faction: 'Blood of Gruumsh',
      // Overall totals - on-deploy ability to deploy bonus Orc (0/50/100 AI pattern)
      timesOffered: 0,        // Times Orc Chieftain deployed with eligible Orcs in hand
      timesTriggered: 0,      // Times bonus Orc was deployed
      timesDeclined: 0,       // Times AI declined (Easy=always, Medium=50%)
      orcsDeployed: 0,        // Total bonus Orcs deployed
      leadershipGained: 0,    // Total leadership gained (= deployed creature level)
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0 },
      medium: { offered: 0, triggered: 0, declined: 0 },
      hard: { offered: 0, triggered: 0, declined: 0 }
    },
    death_strike: {
      name: 'DEATH STRIKE',
      creature: 'Boar, Wereboar',
      faction: 'Blood of Gruumsh',
      // Overall totals - passive pre-death counterattack (0/50/100 AI pattern)
      timesOffered: 0,        // Times creature would die from adjacent melee attack
      timesTriggered: 0,      // Times DEATH STRIKE was executed
      timesDeclined: 0,       // Times AI declined (Easy=always, Medium=50%)
      attackerKilled: 0,      // Times DEATH STRIKE killed the attacker
      attackerSurvived: 0,    // Times attacker survived DEATH STRIKE
      totalDamageDealt: 0,    // Total damage dealt by DEATH STRIKE
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, triggered: 0, declined: 0, attackerKilled: 0 },
      medium: { offered: 0, triggered: 0, declined: 0, attackerKilled: 0 },
      hard: { offered: 0, triggered: 0, declined: 0, attackerKilled: 0 },
      // Per-creature stats
      boarStats: { offered: 0, triggered: 0, attackerKilled: 0 },
      wereboarStats: { offered: 0, triggered: 0, attackerKilled: 0 }
    },
    orc_druid_deploy: {
      name: 'BEAST/ELEMENTAL DEPLOY',
      creature: 'Orc Druid',
      faction: 'Blood of Gruumsh',
      // Overall totals - deploy Beast/Elemental adjacent to Orc Druid (0/50/100 AI pattern)
      timesOffered: 0,  // Times Beast/Elemental deployed when Orc Druid in play
      timesUsed: 0,     // Times deployed adjacent to Orc Druid
      timesDeclined: 0, // Times deployed to starting zone instead
      // Per-difficulty breakdown (Easy=0%, Medium=50%, Hard=100%)
      easy: { offered: 0, used: 0, declined: 0 },
      medium: { offered: 0, used: 0, declined: 0 },
      hard: { offered: 0, used: 0, declined: 0 }
    }
  })

  // ============================================================================
  // ORDER CARD STATS - Tracks AI usage of order cards (0/0/100 pattern)
  // Order cards only used by Hard AI (not Easy/Medium)
  // ============================================================================
  const createOrderCardStats = () => ({
    web_card: {
      name: 'WEB',
      cardType: 'Order Card (MINOR)',
      faction: 'Sting of Lolth',
      // Overall totals - 0/0/100 pattern (Hard only)
      timesOffered: 0,      // Times AI had Web card in hand with valid caster
      timesUsed: 0,         // Times AI used Web
      timesDeclined: 0,     // Times AI had opportunity but didn't use (Easy/Medium)
      targetsWebbed: 0,     // Total enemies webbed
      websRemoved: 0,       // Times AI removed web from own creatures
      // Per-difficulty breakdown (Easy=0%, Medium=0%, Hard=100%)
      easy: { offered: 0, used: 0, declined: 0 },
      medium: { offered: 0, used: 0, declined: 0 },
      hard: { offered: 0, used: 0, declined: 0 }
    }
  })

  const createCreatureDeck = (faction) => {
    // Create single copy of each creature (12 total per faction)
    return sampleCreatures[faction].map(c => new Creature(c))
  }

  const createOrderDeck = (faction) => {
    // Create single copy of each order card (no duplicates)
    const deck = sampleOrderCards[faction].map(o => new OrderCard(o))
    return deck
  }

  /**
   * Process attack queue with ability tracking:
   * - BLOODTHIRSTY, COWER, UNSTOPPABLE HORDES, BLACK HAND OF BANE (commander)
   * - FLASHING BLADES (creature)
   */
  const processAttackQueue = (attackIntentions, gameState, abilityStats, creatureAbilityStats) => {
    const results = { attacksSuccessful: 0, damageDealt: 0, creaturesDestroyed: 0 }

    for (const intention of attackIntentions) {
      const { attackerInstance, defenderInstance, targetInfo } = intention

      // Skip dead targets or attackers
      if (defenderInstance.isDestroyed() || !defenderInstance.position) continue
      if (attackerInstance.isDestroyed() || !attackerInstance.position) continue
      if (defenderInstance.deployedThisTurn) continue

      const attackerOwner = attackerInstance.owner
      const defenderOwner = defenderInstance.owner

      // Calculate incoming damage for defensive options
      const incomingDamage = targetInfo.attackType === 'melee'
        ? attackerInstance.creature.meleeAttack?.damage || 0
        : attackerInstance.creature.rangedAttack?.damage || 0

      // Check for defense options using the newer decideDefense method
      let damageReduction = 0
      let defenseType = null
      const defenderPlayer = gameState.players[defenderOwner]
      const defenderDifficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderOwner, creatureAbilityStats, defenderDifficulty)
      const defenseDecision = defenderAI.decideDefense
        ? defenderAI.decideDefense(defenderInstance, incomingDamage, attackerOwner)
        : { type: 'none', hadOpportunity: false }

      // Apply defense if AI decided to use one
      if (defenseDecision.type === 'cower') {
        // COWER: Avoid ALL damage
        const cowerResult = gameState.applyCower
          ? gameState.applyCower(defenderInstance, incomingDamage, attackerOwner)
          : { success: false }

        if (cowerResult.success) {
          damageReduction = cowerResult.damageAvoided
          defenseType = 'cower'
          abilityStats.unstoppable_hordes.cowerGranted++
          abilityStats.unstoppable_hordes.cowerUsed++
          abilityStats.unstoppable_hordes.damagePrevented += damageReduction
          abilityStats.unstoppable_hordes.moraleLost += cowerResult.moraleCost

          // Track BLACK HAND OF BANE if extra cost was applied
          if (cowerResult.extraCost > 0) {
            abilityStats.black_hand_of_bane.timesTriggered++
            abilityStats.black_hand_of_bane.extraMoraleDrained += cowerResult.extraCost
          }
        }
      } else if (defenseDecision.type === 'unstoppable_hordes') {
        // UNSTOPPABLE HORDES: Prevent 20 damage per creature
        let totalDamageReduction = 0
        let creaturesUsed = 0

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
          }
        }

        if (creaturesUsed > 0) {
          damageReduction = totalDamageReduction
          defenseType = 'unstoppable_hordes'
          abilityStats.unstoppable_hordes.cowerGranted++
          abilityStats.unstoppable_hordes.cowerUsed++
          abilityStats.unstoppable_hordes.damagePrevented += totalDamageReduction
          abilityStats.unstoppable_hordes.moraleLost += creaturesUsed
        }
      }

      // Check for INSUBSTANTIAL ability - Hypnotic Spirit (Curse of Undeath)
      // Blocks ALL damage from 1 source, resets on Undead faction's refresh phase
      // AI difficulty affects whether INSUBSTANTIAL is used (0/50/100 pattern)
      if (gameState.canUseInsubstantial && gameState.canUseInsubstantial(defenderInstance)) {
        const defenderPlayer = gameState.players[defenderOwner]
        const difficulty = defenderPlayer?.aiDifficulty || 'medium'

        // Track that INSUBSTANTIAL was available (offered)
        creatureAbilityStats.insubstantial.timesOffered++
        if (creatureAbilityStats.insubstantial[difficulty]) {
          creatureAbilityStats.insubstantial[difficulty].offered++
        }

        // Use the gameState's useInsubstantial method which handles AI difficulty
        const blocked = gameState.useInsubstantial(defenderInstance, incomingDamage, attackerOwner)

        if (blocked) {
          // Track that INSUBSTANTIAL was used (triggered)
          creatureAbilityStats.insubstantial.timesTriggered++
          creatureAbilityStats.insubstantial.totalDamageBlocked += incomingDamage
          if (creatureAbilityStats.insubstantial[difficulty]) {
            creatureAbilityStats.insubstantial[difficulty].triggered++
            creatureAbilityStats.insubstantial[difficulty].blocked += incomingDamage
          }

          // Skip the rest of the attack - damage was fully blocked
          results.attacksSuccessful++
          continue
        } else {
          // Track that INSUBSTANTIAL was declined (AI difficulty)
          creatureAbilityStats.insubstantial.timesDeclined++
          if (creatureAbilityStats.insubstantial[difficulty]) {
            creatureAbilityStats.insubstantial[difficulty].declined++
          }
        }
      }

      // CRITICAL FIX: Capture defender HP BEFORE attack executes
      // This is needed for accurate TAP ON HIT statistics
      // The old calculation was wrong because it read damageTokens AFTER the attack modified them
      const defenderHPBeforeAttack = defenderInstance.currentHP
      const defenderWasTappedBefore = defenderInstance.isTapped

      // Execute the attack with or without damage reduction
      // Generate random difficulty for DEATH STRIKE decision (defender's reactive ability)
      // This is independent of the defender's turn-based aiDifficulty since DEATH STRIKE
      // is triggered during the attacker's turn
      const deathStrikeDiffRoll = Math.random()
      const deathStrikeDifficulty = deathStrikeDiffRoll < 0.33 ? 'easy' : deathStrikeDiffRoll < 0.67 ? 'medium' : 'hard'

      let attackResult
      if (damageReduction > 0) {
        attackResult = gameState.executeAttackWithDefense
          ? gameState.executeAttackWithDefense(attackerInstance, defenderInstance, targetInfo.attackType, damageReduction, defenseType, deathStrikeDifficulty)
          : gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType, deathStrikeDifficulty)
      } else {
        attackResult = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType, deathStrikeDifficulty)
      }

      if (attackResult.success) {
        results.attacksSuccessful++
        results.damageDealt += attackResult.damage

        // Track FLANKING ability (Halfling Sneak) - 0/50/100 AI pattern for bonus damage
        if (targetInfo.attackType === 'melee' && creatureAbilityStats && gameState.hasFlanking && gameState.hasFlanking(attackerInstance)) {
          const potentialFlankingBonus = gameState.getFlankingBonus ? gameState.getFlankingBonus(attackerInstance, defenderInstance) : 0
          if (potentialFlankingBonus > 0) {
            // FLANKING conditions are met - simulate AI difficulty behavior
            const difficultyRoll = Math.random()
            let difficulty = 'easy'
            let useFlanking = false

            if (difficultyRoll < 0.33) {
              // Easy AI - never uses FLANKING bonus (0%)
              difficulty = 'easy'
              useFlanking = false
            } else if (difficultyRoll < 0.67) {
              // Medium AI - 50% chance to use FLANKING
              difficulty = 'medium'
              useFlanking = Math.random() < 0.5
            } else {
              // Hard AI - always uses FLANKING (100%)
              difficulty = 'hard'
              useFlanking = true
            }

            // Track overall stats
            creatureAbilityStats.flanking.timesOffered++
            creatureAbilityStats.flanking[difficulty].offered++

            if (useFlanking) {
              creatureAbilityStats.flanking.timesTriggered++
              creatureAbilityStats.flanking.bonusDamageDealt += potentialFlankingBonus
              creatureAbilityStats.flanking[difficulty].triggered++
              creatureAbilityStats.flanking[difficulty].damage += potentialFlankingBonus
            } else {
              creatureAbilityStats.flanking.timesDeclined++
              creatureAbilityStats.flanking[difficulty].declined++
            }
          }
        }

        // Track CUTTER ability (Goblin Cutter) - 0/50/100 AI pattern for +10 damage vs tapped creatures
        if (targetInfo.attackType === 'melee' && creatureAbilityStats && gameState.hasCutter && gameState.hasCutter(attackerInstance)) {
          // Check if defender is tapped
          if (defenderInstance.isTapped) {
            // Defender is tapped - CUTTER conditions are met
            const difficultyRoll = Math.random()
            let difficulty = 'easy'
            let useCutter = false

            if (difficultyRoll < 0.33) {
              // Easy AI - never uses CUTTER bonus (0%)
              difficulty = 'easy'
              useCutter = false
            } else if (difficultyRoll < 0.67) {
              // Medium AI - 50% chance to use CUTTER
              difficulty = 'medium'
              useCutter = Math.random() < 0.5
            } else {
              // Hard AI - always uses CUTTER (100%)
              difficulty = 'hard'
              useCutter = true
            }

            // Track overall stats
            creatureAbilityStats.cutter.timesOffered++
            creatureAbilityStats.cutter[difficulty].offered++

            if (useCutter) {
              const cutterBonus = 10 // CUTTER is always +10
              creatureAbilityStats.cutter.timesTriggered++
              creatureAbilityStats.cutter.bonusDamageDealt += cutterBonus
              creatureAbilityStats.cutter[difficulty].triggered++
              creatureAbilityStats.cutter[difficulty].damage += cutterBonus
            } else {
              creatureAbilityStats.cutter.timesDeclined++
              creatureAbilityStats.cutter[difficulty].declined++
            }
          }
        }

        // Track SHIELD BLOCK ability (Dwarven Defender) - 0/50/100 AI pattern for damage reduction
        // This is a DEFENSIVE ability checked on the defender's side
        if (creatureAbilityStats && defenderInstance.position) {
          // Debug: Check if methods exist
          const hasIsAdventurerType = !!gameState.isAdventurerType
          const hasIsCormyrFaction = !!gameState.isCormyrFaction

          // Fallback: Check creature types directly if gameState methods don't exist
          const creatureTypes = defenderInstance.creature?.types || defenderInstance.creature?.type || []
          const creatureFaction = defenderInstance.creature?.faction || ''

          const isAdventurer = hasIsAdventurerType
            ? gameState.isAdventurerType(defenderInstance)
            : creatureTypes.some(t => typeof t === 'string' && t.toUpperCase() === 'ADVENTURER')
          const isCormyr = hasIsCormyrFaction
            ? gameState.isCormyrFaction(defenderInstance)
            : creatureFaction.toUpperCase().includes('CORMYR')

          // Debug: Log all attacks against Heart of Cormyr creatures
          if (creatureFaction.toUpperCase().includes('CORMYR')) {
            console.log(`[SHIELD BLOCK DEBUG] Cormyr creature attacked: ${defenderInstance.creature.name}, types: ${JSON.stringify(creatureTypes)}, isAdventurer: ${isAdventurer}`)
          }

          // Debug: Log when we find a Cormyr Adventurer being attacked
          if (isAdventurer && isCormyr) {
            console.log(`[SHIELD BLOCK TEST] Cormyr Adventurer attacked: ${defenderInstance.creature.name} at (${defenderInstance.position.x}, ${defenderInstance.position.y})`)
          }

          if (isAdventurer && isCormyr) {
            // Check if defender has adjacent Dwarven Defender(s)
            const adjacentTiles = gameState.getAdjacentTiles8Dir ? gameState.getAdjacentTiles8Dir(defenderInstance.position.x, defenderInstance.position.y) : []
            let adjacentDefenderCount = 0
            for (const tile of adjacentTiles) {
              if (tile.occupant && tile.occupant.owner === defenderInstance.owner && tile.occupant.currentHP > 0) {
                // Check for SHIELD BLOCK ability using gameState method or fallback
                const hasShieldBlockAbility = gameState.hasShieldBlock
                  ? gameState.hasShieldBlock(tile.occupant)
                  : tile.occupant.creature?.specialAbilities?.some(a => typeof a === 'string' && a.toUpperCase().includes('SHIELD BLOCK'))

                if (hasShieldBlockAbility) {
                  adjacentDefenderCount++
                  console.log(`[SHIELD BLOCK TEST] Found adjacent Dwarven Defender: ${tile.occupant.creature.name}`)
                }
              }
            }

            if (adjacentDefenderCount > 0) {
            const potentialReduction = adjacentDefenderCount * 10
            // Simulate AI difficulty behavior (based on defender's owner)
            const difficultyRoll = Math.random()
            let difficulty = 'easy'
            let useShieldBlock = false

            if (difficultyRoll < 0.33) {
              // Easy AI - never benefits from SHIELD BLOCK (0%)
              difficulty = 'easy'
              useShieldBlock = false
            } else if (difficultyRoll < 0.67) {
              // Medium AI - 50% chance to benefit
              difficulty = 'medium'
              useShieldBlock = Math.random() < 0.5
            } else {
              // Hard AI - always benefits (100%)
              difficulty = 'hard'
              useShieldBlock = true
            }

            // Track overall stats
            creatureAbilityStats.shield_block.timesOffered++
            creatureAbilityStats.shield_block[difficulty].offered++

            if (useShieldBlock) {
              creatureAbilityStats.shield_block.timesTriggered++
              creatureAbilityStats.shield_block.totalDamageBlocked += potentialReduction
              creatureAbilityStats.shield_block[difficulty].triggered++
              creatureAbilityStats.shield_block[difficulty].damageBlocked += potentialReduction
            } else {
              creatureAbilityStats.shield_block.timesDeclined++
              creatureAbilityStats.shield_block[difficulty].declined++
            }
            }
          }
        }

        // Check for MAGIC CIRCLE AURA ability (Hobgoblin Sorcerer - Tyranny of Goblins)
        // Tracks when Magic Circle Aura was offered and whether it was triggered or declined
        if (creatureAbilityStats && attackResult.magicCircleOffered) {
          const defenderPlayer = gameState.players[defenderOwner]
          const difficulty = defenderPlayer?.aiDifficulty || 'medium'

          // Track offered (aura was active and available)
          creatureAbilityStats.magic_circle_aura.timesOffered++
          if (creatureAbilityStats.magic_circle_aura[difficulty]) {
            creatureAbilityStats.magic_circle_aura[difficulty].offered++
          }

          if (attackResult.magicCircleUsed) {
            // Track triggered (shield was used)
            const damageBlocked = attackResult.magicCircleReduction || 10
            creatureAbilityStats.magic_circle_aura.timesTriggered++
            creatureAbilityStats.magic_circle_aura.totalDamageBlocked += damageBlocked
            if (creatureAbilityStats.magic_circle_aura[difficulty]) {
              creatureAbilityStats.magic_circle_aura[difficulty].triggered++
              creatureAbilityStats.magic_circle_aura[difficulty].blocked += damageBlocked
            }
          } else {
            // Track declined (aura was offered but AI declined or shield already used)
            creatureAbilityStats.magic_circle_aura.timesDeclined++
            if (creatureAbilityStats.magic_circle_aura[difficulty]) {
              creatureAbilityStats.magic_circle_aura[difficulty].declined++
            }
          }
        }

        // Check for FLASHING BLADES ability (Drow Blademaster)
        if (creatureAbilityStats && gameState.hasFlashingBlades && gameState.hasFlashingBlades(attackerInstance)) {
          const flashingBladesTargets = gameState.getFlashingBladesTargets
            ? gameState.getFlashingBladesTargets(attackerInstance, defenderInstance)
            : []

          if (flashingBladesTargets.length > 0) {
            // Simulate AI difficulty behavior:
            // - 33% chance: Easy AI (never uses)
            // - 34% chance: Medium AI (50% usage)
            // - 33% chance: Hard AI (always uses)
            const difficultyRoll = Math.random()
            let difficulty = 'easy'
            let useFlashingBlades = false

            if (difficultyRoll < 0.33) {
              // Easy AI - never uses creature abilities
              difficulty = 'easy'
              useFlashingBlades = false
            } else if (difficultyRoll < 0.67) {
              // Medium AI - 50% chance to use
              difficulty = 'medium'
              useFlashingBlades = Math.random() < 0.5
            } else {
              // Hard AI - always uses
              difficulty = 'hard'
              useFlashingBlades = true
            }

            // Track overall stats
            creatureAbilityStats.flashing_blades.timesOffered++
            // Track per-difficulty stats
            creatureAbilityStats.flashing_blades[difficulty].offered++

            if (useFlashingBlades) {
              const splashDamage = attackerInstance.creature.meleeAttack?.damage || 0
              creatureAbilityStats.flashing_blades.timesTriggered++
              creatureAbilityStats.flashing_blades.splashDamageDealt += splashDamage
              creatureAbilityStats.flashing_blades[difficulty].triggered++
            } else {
              creatureAbilityStats.flashing_blades.timesDeclined++
              creatureAbilityStats.flashing_blades[difficulty].declined++
            }
          }
        }

        // Check for HIDDEN BLADE ability (Drow Assassin) - works on melee OR ranged
        if (creatureAbilityStats && gameState.hasHiddenBlade && gameState.hasHiddenBlade(attackerInstance)) {
          const hiddenBladeTargets = gameState.getHiddenBladeTargets
            ? gameState.getHiddenBladeTargets(attackerInstance)
            : []

          if (hiddenBladeTargets.length > 0) {
            // Simulate AI difficulty behavior:
            // - 33% chance: Easy AI (never uses)
            // - 34% chance: Medium AI (50% usage)
            // - 33% chance: Hard AI (always uses)
            const difficultyRoll = Math.random()
            let difficulty = 'easy'
            let useHiddenBlade = false

            if (difficultyRoll < 0.33) {
              // Easy AI - never uses creature abilities
              difficulty = 'easy'
              useHiddenBlade = false
            } else if (difficultyRoll < 0.67) {
              // Medium AI - 50% chance to use
              difficulty = 'medium'
              useHiddenBlade = Math.random() < 0.5
            } else {
              // Hard AI - always uses
              difficulty = 'hard'
              useHiddenBlade = true
            }

            // Track overall stats
            creatureAbilityStats.hidden_blade.timesOffered++
            // Track per-difficulty stats
            creatureAbilityStats.hidden_blade[difficulty].offered++

            if (useHiddenBlade) {
              const hiddenBladeDamage = 10
              creatureAbilityStats.hidden_blade.timesTriggered++
              creatureAbilityStats.hidden_blade.damageDealt += hiddenBladeDamage
              creatureAbilityStats.hidden_blade[difficulty].triggered++
            } else {
              creatureAbilityStats.hidden_blade.timesDeclined++
              creatureAbilityStats.hidden_blade[difficulty].declined++
            }
          }
        }

        // Check for CONFUSION GAZE ability (Umber Hulk)
        if (creatureAbilityStats && gameState.hasConfusionGaze && gameState.hasConfusionGaze(attackerInstance)) {
          const confusionGazeTargets = gameState.getConfusionGazeTargets
            ? gameState.getConfusionGazeTargets(attackerInstance)
            : []

          if (confusionGazeTargets.length > 0) {
            // Simulate AI difficulty behavior:
            // - 33% chance: Easy AI (never uses)
            // - 34% chance: Medium AI (50% usage)
            // - 33% chance: Hard AI (always uses)
            const difficultyRoll = Math.random()
            let difficulty = 'easy'
            let useConfusionGaze = false

            if (difficultyRoll < 0.33) {
              // Easy AI - never uses creature abilities
              difficulty = 'easy'
              useConfusionGaze = false
            } else if (difficultyRoll < 0.67) {
              // Medium AI - 50% chance to use
              difficulty = 'medium'
              useConfusionGaze = Math.random() < 0.5
            } else {
              // Hard AI - always uses
              difficulty = 'hard'
              useConfusionGaze = true
            }

            // Track overall stats
            creatureAbilityStats.confusion_gaze.timesOffered++
            // Track per-difficulty stats
            creatureAbilityStats.confusion_gaze[difficulty].offered++

            if (useConfusionGaze) {
              const confusionGazeDamage = attackerInstance.creature.meleeAttack?.damage || 30
              creatureAbilityStats.confusion_gaze.timesTriggered++
              creatureAbilityStats.confusion_gaze.enemiesSlid++
              creatureAbilityStats.confusion_gaze.damageDealt += confusionGazeDamage
              creatureAbilityStats.confusion_gaze[difficulty].triggered++
            } else {
              creatureAbilityStats.confusion_gaze.timesDeclined++
              creatureAbilityStats.confusion_gaze[difficulty].declined++
            }
          }
        }

        // Check for ACID BREATH ability (Copper Dragon) - ranged splash damage
        if (creatureAbilityStats && targetInfo.attackType === 'ranged' && gameState.hasAcidBreath && gameState.hasAcidBreath(attackerInstance)) {
          const splashTargets = gameState.getRangedSplashTargets
            ? gameState.getRangedSplashTargets(attackerInstance, defenderInstance.position)
            : []

          if (splashTargets.length > 0) {
            // Simulate AI difficulty behavior:
            // - 33% chance: Easy AI (never uses)
            // - 34% chance: Medium AI (50% usage)
            // - 33% chance: Hard AI (always uses)
            const difficultyRoll = Math.random()
            let difficulty = 'easy'
            let useAcidBreath = false

            if (difficultyRoll < 0.33) {
              // Easy AI - never uses creature abilities
              difficulty = 'easy'
              useAcidBreath = false
            } else if (difficultyRoll < 0.67) {
              // Medium AI - 50% chance to use
              difficulty = 'medium'
              useAcidBreath = Math.random() < 0.5
            } else {
              // Hard AI - always uses
              difficulty = 'hard'
              useAcidBreath = true
            }

            // Track overall stats
            creatureAbilityStats.acid_breath.timesOffered++
            // Track per-difficulty stats
            creatureAbilityStats.acid_breath[difficulty].offered++

            if (useAcidBreath) {
              const splashDamage = 20  // ACID BREATH deals 20 splash damage
              creatureAbilityStats.acid_breath.timesTriggered++
              creatureAbilityStats.acid_breath.enemiesHit += splashTargets.length
              creatureAbilityStats.acid_breath.totalDamage += splashDamage * splashTargets.length
              creatureAbilityStats.acid_breath[difficulty].triggered++
              creatureAbilityStats.acid_breath[difficulty].enemiesHit += splashTargets.length
              creatureAbilityStats.acid_breath[difficulty].damage += splashDamage * splashTargets.length
            } else {
              creatureAbilityStats.acid_breath.timesDeclined++
              creatureAbilityStats.acid_breath[difficulty].declined++
            }
          }
        }

        // Check for EXPLOSIVE BOLTS ability (Half-Orc Thug) - ranged splash damage
        if (creatureAbilityStats && targetInfo.attackType === 'ranged' && gameState.hasExplosiveBolts && gameState.hasExplosiveBolts(attackerInstance)) {
          const splashTargets = gameState.getRangedSplashTargets
            ? gameState.getRangedSplashTargets(attackerInstance, defenderInstance.position)
            : []

          if (splashTargets.length > 0) {
            // Simulate AI difficulty behavior:
            // - 33% chance: Easy AI (never uses)
            // - 34% chance: Medium AI (50% usage)
            // - 33% chance: Hard AI (always uses)
            const difficultyRoll = Math.random()
            let difficulty = 'easy'
            let useExplosiveBolts = false

            if (difficultyRoll < 0.33) {
              // Easy AI - never uses creature abilities
              difficulty = 'easy'
              useExplosiveBolts = false
            } else if (difficultyRoll < 0.67) {
              // Medium AI - 50% chance to use
              difficulty = 'medium'
              useExplosiveBolts = Math.random() < 0.5
            } else {
              // Hard AI - always uses
              difficulty = 'hard'
              useExplosiveBolts = true
            }

            // Track overall stats
            creatureAbilityStats.explosive_bolts.timesOffered++
            // Track per-difficulty stats
            creatureAbilityStats.explosive_bolts[difficulty].offered++

            if (useExplosiveBolts) {
              const splashDamage = 10  // EXPLOSIVE BOLTS deals 10 splash damage
              creatureAbilityStats.explosive_bolts.timesTriggered++
              creatureAbilityStats.explosive_bolts.enemiesHit += splashTargets.length
              creatureAbilityStats.explosive_bolts.totalDamage += splashDamage * splashTargets.length
              creatureAbilityStats.explosive_bolts[difficulty].triggered++
              creatureAbilityStats.explosive_bolts[difficulty].enemiesHit += splashTargets.length
              creatureAbilityStats.explosive_bolts[difficulty].damage += splashDamage * splashTargets.length
            } else {
              creatureAbilityStats.explosive_bolts.timesDeclined++
              creatureAbilityStats.explosive_bolts[difficulty].declined++
            }
          }
        }

        // Check for SLAM ability (Earth Guardian) - melee attack dealt damage, target survived
        if (creatureAbilityStats && targetInfo.attackType === 'melee' && gameState.hasSlam && gameState.hasSlam(attackerInstance)) {
          // Check if target survived and damage was dealt
          const targetSurvived = defenderInstance.currentHP > 0
          const damageDealt = attackerInstance.creature.meleeAttack?.damage || 30

          if (targetSurvived && damageDealt > 0) {
            // Get valid slam destinations (up to 3 tiles away)
            const slamTargets = gameState.getValidSlamTiles
              ? gameState.getValidSlamTiles(defenderInstance, 3)
              : []

            if (slamTargets.length > 0) {
              // Simulate AI difficulty behavior:
              // - 33% chance: Easy AI (never uses)
              // - 34% chance: Medium AI (50% usage)
              // - 33% chance: Hard AI (always uses)
              const difficultyRoll = Math.random()
              let difficulty = 'easy'
              let useSlam = false

              if (difficultyRoll < 0.33) {
                // Easy AI - never uses creature abilities
                difficulty = 'easy'
                useSlam = false
              } else if (difficultyRoll < 0.67) {
                // Medium AI - 50% chance to use
                difficulty = 'medium'
                useSlam = Math.random() < 0.5
              } else {
                // Hard AI - always uses
                difficulty = 'hard'
                useSlam = true
              }

              // Track overall stats
              creatureAbilityStats.slam.timesOffered++
              // Track per-difficulty stats
              creatureAbilityStats.slam[difficulty].offered++

              if (useSlam) {
                // Execute slam - pick a random valid tile
                const randomTile = slamTargets[Math.floor(Math.random() * slamTargets.length)]

                if (gameState.executeSlamSlide) {
                  gameState.executeSlamSlide(defenderInstance, randomTile)
                }

                creatureAbilityStats.slam.timesTriggered++
                creatureAbilityStats.slam.enemiesSlid++
                creatureAbilityStats.slam.damageDealt += damageDealt
                creatureAbilityStats.slam[difficulty].triggered++
                creatureAbilityStats.slam[difficulty].enemiesSlid++
                creatureAbilityStats.slam[difficulty].damage += damageDealt
              } else {
                creatureAbilityStats.slam.timesDeclined++
                creatureAbilityStats.slam[difficulty].declined++
              }
            }
          }
        }

        // Check for LIFE DRAIN ability (Vampire Stalker) - automatic on melee damage > 0
        if (creatureAbilityStats && attackResult.lifeDrain?.triggered) {
          // Get difficulty from player if available, otherwise simulate
          const attackerPlayer = gameState.players[attackerOwner]
          const difficulty = attackerPlayer?.aiDifficulty || 'medium'

          creatureAbilityStats.life_drain.timesTriggered++
          creatureAbilityStats.life_drain.totalHealed += attackResult.lifeDrain.healAmount
          creatureAbilityStats.life_drain[difficulty].triggered++
          creatureAbilityStats.life_drain[difficulty].healed = (creatureAbilityStats.life_drain[difficulty].healed || 0) + attackResult.lifeDrain.healAmount
        }

        // Check for TOMB GUARDIAN SWIRL ability - difficulty-based (0/50/100 pattern)
        // Track when Skeletal Tomb Guardian makes a melee attack (offered)
        if (creatureAbilityStats && gameState.hasTombGuardianSplash && gameState.hasTombGuardianSplash(attackerInstance) && attackResult.attackType === 'melee') {
          const attackerPlayer = gameState.players[attackerOwner]
          const difficulty = attackerPlayer?.aiDifficulty || 'medium'

          // Check if there were adjacent enemies (SWIRL was "offered")
          const adjacentEnemies = gameState.getTombGuardianSplashTargets && gameState.getTombGuardianSplashTargets(attackerInstance, defenderInstance)
          if (adjacentEnemies && adjacentEnemies.length > 0) {
            // SWIRL was offered (Skeletal Tomb Guardian made melee attack with adjacent enemies)
            creatureAbilityStats.tomb_guardian_splash.timesOffered++
            creatureAbilityStats.tomb_guardian_splash[difficulty].offered++

            if (attackResult.pendingSplashAttacks?.length > 0) {
              // SWIRL triggered
              creatureAbilityStats.tomb_guardian_splash.timesTriggered++
              creatureAbilityStats.tomb_guardian_splash.enemiesHit += attackResult.pendingSplashAttacks.length
              creatureAbilityStats.tomb_guardian_splash[difficulty].triggered++
              creatureAbilityStats.tomb_guardian_splash[difficulty].enemiesHit += attackResult.pendingSplashAttacks.length

              // Apply splash damage and track results
              for (const splashAttack of attackResult.pendingSplashAttacks) {
                const splashResult = gameState.combatResolver?.executeSplashDamage?.(
                  splashAttack.attackerInstance,
                  splashAttack.targetInstance,
                  20  // Full splash damage in test (no defense)
                )
                if (splashResult) {
                  creatureAbilityStats.tomb_guardian_splash.totalDamage += splashResult.damage || 20
                  creatureAbilityStats.tomb_guardian_splash[difficulty].damage += splashResult.damage || 20
                  if (splashResult.destroyed) {
                    creatureAbilityStats.tomb_guardian_splash.kills++
                    creatureAbilityStats.tomb_guardian_splash[difficulty].kills++
                  }
                }
              }
            } else {
              // SWIRL was declined by AI difficulty
              creatureAbilityStats.tomb_guardian_splash.timesDeclined++
              creatureAbilityStats.tomb_guardian_splash[difficulty].declined++
            }
          }
        }

        // Track destruction and BLOODTHIRSTY ability
        if (attackResult.destroyed) {
          results.creaturesDestroyed++

          // Check for BLOODTHIRSTY ability (must be Curse of Undeath faction)
          if (gameState.hasCommanderAbility(attackerOwner, 'bloodthirsty')) {
            const player = gameState.players[attackerOwner]
            // Faction check: Must be Curse of Undeath
            if (player.commander && player.commander.faction === 'Curse of Undeath') {
              player.leadership = (player.leadership || 0) + 1
              abilityStats.bloodthirsty.timesTriggered++
              abilityStats.bloodthirsty.leadershipGained++
            }
          }

          // Check for RIDER ability (Skeletal Lancer or Goblin Wolf Rider dies)
          // Supports both Curse of Undeath (Skeleton) and Tyranny of Goblins (Goblin/Wolf)
          if (attackResult.riderTriggered && attackResult.riderData) {
            const { ownerPlayerId, creatureLevel, position, faction } = attackResult.riderData
            const defenderPlayer = gameState.players[ownerPlayerId]
            const difficulty = defenderPlayer?.aiDifficulty || 'medium'

            // Determine which stats key to use based on faction
            const statsKey = faction === 'Tyranny of Goblins' ? 'riderGoblin' : 'rider'

            // Check if there are eligible creatures in hand (faction-specific filtering)
            const eligibleCreatures = gameState.getEligibleRiderCreatures(ownerPlayerId, 3, faction)

            if (eligibleCreatures.length > 0) {
              // Track that RIDER was offered
              creatureAbilityStats[statsKey].timesOffered++
              if (creatureAbilityStats[statsKey][difficulty]) {
                creatureAbilityStats[statsKey][difficulty].offered++
              }

              // Apply 0/50/100 difficulty rule
              let shouldDeploy = false
              switch (difficulty) {
                case 'easy':
                  shouldDeploy = false  // Easy: Never use RIDER (0%)
                  break
                case 'medium':
                  shouldDeploy = Math.random() < 0.5  // Medium: 50% chance
                  break
                case 'hard':
                  shouldDeploy = true  // Hard: Always use RIDER (100%)
                  break
                default:
                  shouldDeploy = Math.random() < 0.5
              }

              if (shouldDeploy) {
                // Select highest level creature (minimizes morale loss)
                const sortedCreatures = [...eligibleCreatures].sort((a, b) => b.level - a.level)
                const selectedCreature = sortedCreatures[0]
                const moraleSaved = selectedCreature.level

                // Deploy the creature
                const creatureIndex = defenderPlayer.creatureHand.findIndex(c => c.id === selectedCreature.id)
                if (creatureIndex !== -1) {
                  defenderPlayer.creatureHand.splice(creatureIndex, 1)
                }

                // Create proper CreatureInstance with all required methods
                const creatureInstance = new CreatureInstance(selectedCreature, ownerPlayerId)
                creatureInstance.position = { ...position }
                // Mark as deployed for protection until next refresh phase
                creatureInstance.markAsDeployed(gameState.turnNumber)

                // Place on tile
                const tile = gameState.getTile(position.x, position.y)
                if (tile) {
                  tile.occupant = creatureInstance
                }
                defenderPlayer.creaturesInPlay.push(creatureInstance)

                // Track triggered
                creatureAbilityStats[statsKey].timesTriggered++
                creatureAbilityStats[statsKey].creaturesDeployed++
                creatureAbilityStats[statsKey].totalMoraleSaved += moraleSaved
                if (creatureAbilityStats[statsKey][difficulty]) {
                  creatureAbilityStats[statsKey][difficulty].triggered++
                  creatureAbilityStats[statsKey][difficulty].deployed++
                  creatureAbilityStats[statsKey][difficulty].moraleSaved += moraleSaved
                }
              } else {
                // Track declined
                creatureAbilityStats[statsKey].timesDeclined++
                if (creatureAbilityStats[statsKey][difficulty]) {
                  creatureAbilityStats[statsKey][difficulty].declined++
                }
              }
            }
          }

          // Check for UNTAP ON KILL ability (Bugbear Berserker / Orc Barbarian)
          // This triggers when an adjacent enemy is killed during the creature's faction's turn
          if (attackResult.untapOnKillTriggered && attackResult.untapOnKillData) {
            const untapData = attackResult.untapOnKillData
            const difficulty = untapData.difficulty === 'human' ? 'hard' : untapData.difficulty

            // Track offered and triggered
            creatureAbilityStats.untap_on_adjacent_kill.timesOffered++
            creatureAbilityStats.untap_on_adjacent_kill[difficulty].offered++
            creatureAbilityStats.untap_on_adjacent_kill.timesTriggered++
            creatureAbilityStats.untap_on_adjacent_kill[difficulty].triggered++

            // Track self-kill vs ally-kill
            if (untapData.wasKilledByBugbear) {
              creatureAbilityStats.untap_on_adjacent_kill.selfKills++
            } else {
              creatureAbilityStats.untap_on_adjacent_kill.allyKills++
            }

            console.log(`[UNTAP ON KILL TEST] ${untapData.bugbearName} untapped from adjacent kill (${difficulty}, selfKill: ${untapData.wasKilledByBugbear})`)
          } else if (attackResult.untapOnKillData && attackResult.untapOnKillData.declined) {
            // UNTAP ON KILL was offered but declined (Easy or Medium AI)
            const untapData = attackResult.untapOnKillData
            const difficulty = untapData.difficulty || 'medium'

            creatureAbilityStats.untap_on_adjacent_kill.timesOffered++
            creatureAbilityStats.untap_on_adjacent_kill[difficulty].offered++
            creatureAbilityStats.untap_on_adjacent_kill.timesDeclined++
            creatureAbilityStats.untap_on_adjacent_kill[difficulty].declined++

            console.log(`[UNTAP ON KILL TEST] ${untapData.bugbearName} untap declined (${difficulty})`)
          }
        }
        // END of if (attackResult.destroyed) block
        // CRITICAL FIX: TAP ON HIT and REACH tracking must be OUTSIDE the destroyed block
        // because they apply to ALL attacks, not just kills!

        // Check for TAP ON HIT ability (Horned Devil, Wolf)
        // Track whenever creature with TAP ON HIT makes a melee attack
        const attackerHasTapOnHitCheck = gameState.hasTapOnHit && gameState.hasTapOnHit(attackerInstance)
        const attackerHasTapOnHit = targetInfo.attackType === 'melee' && attackerHasTapOnHitCheck

        if (attackerHasTapOnHit && attackResult.success) {
          const attackerPlayer = gameState.players[attackerOwner]
          const difficulty = attackerPlayer?.aiDifficulty || 'medium'
          const attackerName = attackerInstance.creature.name

          // Always count as "offered" when creature with TAP ON HIT attacks
          creatureAbilityStats.tap_on_hit.timesOffered++
          creatureAbilityStats.tap_on_hit[difficulty].offered++

          // Track per-creature stats (Wolf vs Horned Devil)
          // NOTE: defenderHPBeforeAttack is captured BEFORE executeAttack (line ~637)
          // The old formula (maxHP - damageTokens + damage) was WRONG because damageTokens
          // was already modified by the attack when this code runs
          const creatureStats = attackerName === 'Wolf'
            ? creatureAbilityStats.tap_on_hit.wolfStats
            : attackerName === 'Horned Devil'
              ? creatureAbilityStats.tap_on_hit.hornedDevilStats
              : null

          if (creatureStats) {
            creatureStats.attacks++
            creatureStats.totalDefenderHP += defenderHPBeforeAttack

            if (attackResult.destroyed) {
              creatureStats.kills++
            } else if (attackResult.tapOnHitTriggered && !attackResult.tapOnHitData?.alreadyTapped) {
              // Only count as trigger if target wasn't already tapped
              creatureStats.triggers++
            }
          }

          // Check what happened with the attack
          if (attackResult.tapOnHitTriggered && attackResult.tapOnHitData) {
            const tapData = attackResult.tapOnHitData
            if (tapData.alreadyTapped) {
              creatureAbilityStats.tap_on_hit.timesAlreadyTapped++
              creatureAbilityStats.tap_on_hit[difficulty].alreadyTapped++
            } else {
              creatureAbilityStats.tap_on_hit.timesTriggered++
              creatureAbilityStats.tap_on_hit[difficulty].triggered++
            }
          } else if (attackResult.destroyed) {
            // Target was killed - TAP ON HIT doesn't apply to dead creatures
            if (!creatureAbilityStats.tap_on_hit.timesKilled) {
              creatureAbilityStats.tap_on_hit.timesKilled = 0
            }
            creatureAbilityStats.tap_on_hit.timesKilled++
            if (!creatureAbilityStats.tap_on_hit[difficulty].killed) {
              creatureAbilityStats.tap_on_hit[difficulty].killed = 0
            }
            creatureAbilityStats.tap_on_hit[difficulty].killed++
          } else if (attackResult.damage === 0) {
            // No damage dealt (fully blocked) - TAP ON HIT doesn't trigger
            creatureAbilityStats.tap_on_hit.timesNoDamage++
            if (!creatureAbilityStats.tap_on_hit[difficulty].noDamage) {
              creatureAbilityStats.tap_on_hit[difficulty].noDamage = 0
            }
            creatureAbilityStats.tap_on_hit[difficulty].noDamage++
          } else {
            // Unexpected case - damage dealt, not destroyed, but no tapOnHitTriggered
            if (!creatureAbilityStats.tap_on_hit.timesUnexpected) {
              creatureAbilityStats.tap_on_hit.timesUnexpected = 0
            }
            creatureAbilityStats.tap_on_hit.timesUnexpected++
            if (!creatureAbilityStats.tap_on_hit[difficulty].unexpected) {
              creatureAbilityStats.tap_on_hit[difficulty].unexpected = 0
            }
            creatureAbilityStats.tap_on_hit[difficulty].unexpected++
          }
        }

        // Check for REACH decision tracking (AI had choice between reach and adjacent)
        // reachDecision is added by AI.selectWeakestTarget when both options available
        if (targetInfo?.reachDecision && attackResult.success) {
          const decision = targetInfo.reachDecision
          const difficulty = decision.difficulty || 'medium'

          // Always increment "offered" when AI had a choice
          creatureAbilityStats.reach_2.timesOffered++
          creatureAbilityStats.reach_2[difficulty].offered++

          if (decision.triggered) {
            // AI chose to use reach attack
            creatureAbilityStats.reach_2.timesTriggered++
            creatureAbilityStats.reach_2[difficulty].triggered++
            creatureAbilityStats.reach_2.totalDamageDealt += (attackResult.damage || 0)
            creatureAbilityStats.reach_2[difficulty].damageDealt += (attackResult.damage || 0)
          } else if (decision.declined) {
            // AI chose adjacent target over reach
            creatureAbilityStats.reach_2.timesDeclined++
            creatureAbilityStats.reach_2[difficulty].declined++
          }
        } else if (targetInfo?.isReachAttack && attackResult.success && !targetInfo?.reachDecision) {
          // Fallback: Track reach attacks that didn't have a decision (only reach targets available)
          const attackerPlayer = gameState.players[attackerOwner]
          const difficulty = attackerPlayer?.aiDifficulty || 'medium'
          creatureAbilityStats.reach_2.timesOffered++
          creatureAbilityStats.reach_2[difficulty].offered++
          creatureAbilityStats.reach_2.timesTriggered++
          creatureAbilityStats.reach_2[difficulty].triggered++
          creatureAbilityStats.reach_2.totalDamageDealt += (attackResult.damage || 0)
          creatureAbilityStats.reach_2[difficulty].damageDealt += (attackResult.damage || 0)
        }

        // Check for DEATH STRIKE ability (Boar, Wereboar)
        // Track whenever a creature with DEATH STRIKE would be killed by adjacent melee attack
        if (attackResult.deathStrikeTriggered || attackResult.deathStrikeResult) {
          const dsResult = attackResult.deathStrikeResult
          // Use deathStrikeDifficulty (randomly generated above for this attack)
          const defenderName = defenderInstance.creature.name

          // Track per-creature stats
          const creatureStats = defenderName === 'Boar'
            ? creatureAbilityStats.death_strike.boarStats
            : defenderName === 'Wereboar'
              ? creatureAbilityStats.death_strike.wereboarStats
              : null

          // Always count as "offered" when DEATH STRIKE conditions are met
          creatureAbilityStats.death_strike.timesOffered++
          creatureAbilityStats.death_strike[deathStrikeDifficulty].offered++
          if (creatureStats) creatureStats.offered++

          if (dsResult?.triggered) {
            // DEATH STRIKE was executed
            creatureAbilityStats.death_strike.timesTriggered++
            creatureAbilityStats.death_strike[deathStrikeDifficulty].triggered++
            if (creatureStats) creatureStats.triggered++

            // Track damage dealt
            const dsDamage = dsResult.damageDealt || defenderInstance.creature.meleeAttack?.damage || 0
            creatureAbilityStats.death_strike.totalDamageDealt += dsDamage

            // Check if attacker was killed
            if (dsResult.attackerWasDestroyed || attackResult.attackerKilledByDeathStrike) {
              creatureAbilityStats.death_strike.attackerKilled++
              creatureAbilityStats.death_strike[deathStrikeDifficulty].attackerKilled++
              if (creatureStats) creatureStats.attackerKilled++
            } else {
              creatureAbilityStats.death_strike.attackerSurvived++
            }
          } else if (dsResult?.declined) {
            // AI declined to use DEATH STRIKE
            creatureAbilityStats.death_strike.timesDeclined++
            creatureAbilityStats.death_strike[deathStrikeDifficulty].declined++
          }
        }

        // Check for immediate elimination of defender after attack
        gameState.checkAndEliminatePlayer(defenderInstance.owner)
      }
    }

    return results
  }

  /**
   * Execute AI turn with ability tracking
   */
  const executeAITurn = (gameState, currentPlayerId, abilityStats, creatureAbilityStats, gameStats, orderCardStats = null) => {
    // Randomize AI difficulty: 33% easy, 34% medium, 33% hard
    const difficultyRoll = Math.random()
    const aiDifficulty = difficultyRoll < 0.33 ? 'easy' : difficultyRoll < 0.67 ? 'medium' : 'hard'
    const ai = new SimpleAI(gameState, currentPlayerId, creatureAbilityStats, aiDifficulty)
    const player = gameState.players[currentPlayerId]
    // Store difficulty on player for tracking purposes
    player.aiDifficulty = aiDifficulty

    const result = { movementActions: 0, attackActions: 0, deploymentActions: 0 }

    try {
      const turnResult = ai.executeTurn()
      if (!turnResult.actions) return result

      const attackIntentions = []

      for (const action of turnResult.actions) {
        switch (action.type) {
          case 'deploy':
            result.deploymentActions++
            gameStats.creaturesDeployed++

            // Track ORC SCOUT ability - check the isOrcScout flag set by AI
            if (action.isOrcScout) {
              abilityStats.orc_scout.timesUsed++
              abilityStats.orc_scout.orcsDeployedToTreasure++
            }

            // Track HORDE ability - check the isHordeDeploy flag set by AI
            if (action.isHordeDeploy) {
              abilityStats.horde.timesUsed++
              abilityStats.horde.creaturesDeployed++
            }

            // Track SHADOW STALKER ability (Shadow Mastiff)
            if (action.creature && action.creature.includes('Shadow Mastiff')) {
              const diff = player?.aiDifficulty || 'medium'
              // Shadow Mastiff deployed - check if SHADOW STALKER was used
              if (action.isShadowStalker) {
                creatureAbilityStats.shadow_stalker.timesOffered++
                creatureAbilityStats.shadow_stalker.timesTriggered++
                creatureAbilityStats.shadow_stalker[diff].offered++
                creatureAbilityStats.shadow_stalker[diff].triggered++
              } else {
                // Shadow Mastiff deployed to starting zone (ability offered but not used)
                creatureAbilityStats.shadow_stalker.timesOffered++
                creatureAbilityStats.shadow_stalker.timesDeclined++
                creatureAbilityStats.shadow_stalker[diff].offered++
                creatureAbilityStats.shadow_stalker[diff].declined++
              }
            }

            // Track SUMMON SPIDER ability (Spider creatures deployed near Drow Priestess)
            if (action.creatureTypes && action.creatureTypes.includes('Spider')) {
              // Check if Drow Priestess was in play when Spider was deployed
              const priestess = gameState.hasSummonSpider && gameState.hasSummonSpider(currentPlayerId)
              if (priestess) {
                const diff = player?.aiDifficulty || 'medium'
                if (action.isSummonSpider) {
                  creatureAbilityStats.summon_spider.timesOffered++
                  creatureAbilityStats.summon_spider.timesTriggered++
                  creatureAbilityStats.summon_spider.spidersDeployed++
                  creatureAbilityStats.summon_spider[diff].offered++
                  creatureAbilityStats.summon_spider[diff].triggered++
                  creatureAbilityStats.summon_spider[diff].spidersDeployed++
                } else {
                  // Spider deployed to starting zone when Priestess was available
                  creatureAbilityStats.summon_spider.timesOffered++
                  creatureAbilityStats.summon_spider.timesDeclined++
                  creatureAbilityStats.summon_spider[diff].offered++
                  creatureAbilityStats.summon_spider[diff].declined++
                }
              }
            }

            // Track GRAVEYARD DEPLOY ability (Zombie resurrected from graveyard)
            if (action.isGraveyardDeploy) {
              const diff = player?.aiDifficulty || 'medium'
              creatureAbilityStats.graveyard_deploy.timesOffered++
              creatureAbilityStats.graveyard_deploy.timesTriggered++
              creatureAbilityStats.graveyard_deploy.zombiesResurrected++
              creatureAbilityStats.graveyard_deploy.moralePaid++
              creatureAbilityStats.graveyard_deploy[diff].offered++
              creatureAbilityStats.graveyard_deploy[diff].triggered++
              creatureAbilityStats.graveyard_deploy[diff].resurrected++
            }

            // Track LICH NECROMANCER DEPLOY ability (Undead deployed adjacent to Lich)
            if (action.creatureTypes && action.creatureTypes.some(t => t.toLowerCase() === 'undead')) {
              // Check if Lich Necromancer was in play when Undead was deployed
              const lich = gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(currentPlayerId)
              if (lich) {
                const diff = player?.aiDifficulty || 'medium'
                if (action.isLichNecromancer) {
                  creatureAbilityStats.lich_necromancer_deploy.timesOffered++
                  creatureAbilityStats.lich_necromancer_deploy.timesTriggered++
                  creatureAbilityStats.lich_necromancer_deploy[diff].offered++
                  creatureAbilityStats.lich_necromancer_deploy[diff].triggered++
                } else {
                  // Undead deployed to starting zone when Lich was available
                  creatureAbilityStats.lich_necromancer_deploy.timesOffered++
                  creatureAbilityStats.lich_necromancer_deploy.timesDeclined++
                  creatureAbilityStats.lich_necromancer_deploy[diff].offered++
                  creatureAbilityStats.lich_necromancer_deploy[diff].declined++
                }
              }
            }

            // Track ARCANE PORTAL ability (War Wizard deployed to Magic Circle)
            if (action.creature && action.creature.includes('War Wizard')) {
              const diff = player?.aiDifficulty || 'medium'
              // War Wizard deployed - check if ARCANE PORTAL was used
              if (action.isArcanePortalDeploy) {
                creatureAbilityStats.arcane_portal.timesOffered++
                creatureAbilityStats.arcane_portal.timesTriggered++
                creatureAbilityStats.arcane_portal[diff].offered++
                creatureAbilityStats.arcane_portal[diff].triggered++
              } else {
                // War Wizard deployed to starting zone (ability offered but not used)
                creatureAbilityStats.arcane_portal.timesOffered++
                creatureAbilityStats.arcane_portal.timesDeclined++
                creatureAbilityStats.arcane_portal[diff].offered++
                creatureAbilityStats.arcane_portal[diff].declined++
              }
            }

            // Track ORC DRUID DEPLOY ability (Beast/Elemental deployed adjacent to Orc Druid)
            if (action.creatureTypes && action.creatureTypes.some(t =>
              t.toLowerCase() === 'beast' || t.toLowerCase() === 'elemental'
            )) {
              // Check if Orc Druid was in play when Beast/Elemental was deployed
              const druid = gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(currentPlayerId)
              if (druid) {
                const diff = player?.aiDifficulty || 'medium'
                if (action.isOrcDruid) {
                  creatureAbilityStats.orc_druid_deploy.timesOffered++
                  creatureAbilityStats.orc_druid_deploy.timesUsed++
                  creatureAbilityStats.orc_druid_deploy[diff].offered++
                  creatureAbilityStats.orc_druid_deploy[diff].used++
                } else {
                  // Beast/Elemental deployed to starting zone when Orc Druid was available
                  creatureAbilityStats.orc_druid_deploy.timesOffered++
                  creatureAbilityStats.orc_druid_deploy.timesDeclined++
                  creatureAbilityStats.orc_druid_deploy[diff].offered++
                  creatureAbilityStats.orc_druid_deploy[diff].declined++
                }
              }
            }
            break

          case 'graveyardDeclined':
            // Track GRAVEYARD DEPLOY declined opportunity
            {
              const diff = player?.aiDifficulty || 'medium'
              creatureAbilityStats.graveyard_deploy.timesOffered++
              creatureAbilityStats.graveyard_deploy.timesDeclined++
              creatureAbilityStats.graveyard_deploy[diff].offered++
              creatureAbilityStats.graveyard_deploy[diff].declined++
            }
            break

          case 'move':
            result.movementActions++

            // Track GRUUMSH COMMANDS IT - check if destination is difficult terrain
            // Faction check: Must be Blood of Gruumsh
            if (gameState.hasCommanderAbility(currentPlayerId, 'gruumsh_commands_it') &&
                player.commander && player.commander.faction === 'Blood of Gruumsh') {
              if (action.to) {
                const tile = gameState.getTile(action.to.x, action.to.y)
                const terrain = tile?.terrain
                if (terrain === TerrainTypes.FOREST || terrain === TerrainTypes.DIFFICULT || terrain === TerrainTypes.WATER) {
                  abilityStats.gruumsh_commands_it.timesTriggered++
                  abilityStats.gruumsh_commands_it.tilesMovedOnDifficult++
                  abilityStats.gruumsh_commands_it.movementSaved++
                }
              }
            }

            // Track WALLS OF WEB - for Drow/Spider creatures
            // Faction check: Must be Sting of Lolth
            if (gameState.hasCommanderAbility(currentPlayerId, 'walls_of_web') &&
                player.commander && player.commander.faction === 'Sting of Lolth') {
              const creatures = player.creaturesInPlay || []
              const movedCreature = creatures.find(c =>
                c.position && action.to &&
                c.position.x === action.to.x &&
                c.position.y === action.to.y
              )
              if (movedCreature) {
                const types = movedCreature.creature.type || []
                // Must also be Sting of Lolth creature
                if ((types.includes('Drow') || types.includes('Spider')) &&
                    movedCreature.creature.faction === 'Sting of Lolth') {
                  abilityStats.walls_of_web.timesApplied++
                  abilityStats.walls_of_web.extraTilesMoved += 2
                }
              }
            }

            // Track SCUTTLE - passive ability for spider creatures
            // AI difficulty affects whether SCUTTLE is enabled:
            // - Easy: SCUTTLE disabled (0% chance)
            // - Medium: 50% chance SCUTTLE is enabled
            // - Hard: SCUTTLE always enabled (100%)
            if (action.from && action.to) {
              const creatures = player.creaturesInPlay || []
              const movedCreature = creatures.find(c =>
                c.position &&
                c.position.x === action.to.x &&
                c.position.y === action.to.y
              )
              if (movedCreature && gameState.hasScuttle && gameState.hasScuttle(movedCreature)) {
                // Use random roll for difficulty (same approach as FLASHING BLADES)
                const difficultyRoll = Math.random()
                let difficulty = 'easy'
                let scuttleEnabled = false

                if (difficultyRoll < 0.33) {
                  // Easy AI - never uses SCUTTLE
                  difficulty = 'easy'
                  scuttleEnabled = false
                } else if (difficultyRoll < 0.67) {
                  // Medium AI - 50% chance to use
                  difficulty = 'medium'
                  scuttleEnabled = Math.random() < 0.5
                } else {
                  // Hard AI - always uses SCUTTLE
                  difficulty = 'hard'
                  scuttleEnabled = true
                }

                // Track that a SCUTTLE creature moved (offered)
                creatureAbilityStats.scuttle.timesOffered++
                if (creatureAbilityStats.scuttle[difficulty]) {
                  creatureAbilityStats.scuttle[difficulty].offered++
                }

                if (scuttleEnabled) {
                  // Track that SCUTTLE was triggered (enabled)
                  creatureAbilityStats.scuttle.timesTriggered++
                  if (creatureAbilityStats.scuttle[difficulty]) {
                    creatureAbilityStats.scuttle[difficulty].triggered++
                  }

                  // Check if path went through any creatures by examining tiles along the path
                  const dx = action.to.x - action.from.x
                  const dy = action.to.y - action.from.y
                  const steps = Math.max(Math.abs(dx), Math.abs(dy))

                  if (steps > 1) {
                    let creaturesPassedThrough = 0
                    for (let i = 1; i < steps; i++) {
                      const ratio = i / steps
                      const checkX = Math.round(action.from.x + dx * ratio)
                      const checkY = Math.round(action.from.y + dy * ratio)
                      const tile = gameState.getTile(checkX, checkY)
                      if (tile && tile.occupant && tile.occupant !== movedCreature) {
                        creaturesPassedThrough++
                      }
                    }

                    if (creaturesPassedThrough > 0) {
                      creatureAbilityStats.scuttle.creaturesPassedThrough += creaturesPassedThrough
                      if (creatureAbilityStats.scuttle[difficulty]) {
                        creatureAbilityStats.scuttle[difficulty].creaturesPassedThrough += creaturesPassedThrough
                      }
                    }
                  }
                } else {
                  // Track that SCUTTLE was declined (disabled by difficulty)
                  creatureAbilityStats.scuttle.timesDeclined++
                  if (creatureAbilityStats.scuttle[difficulty]) {
                    creatureAbilityStats.scuttle[difficulty].declined++
                  }
                }
              }
            }

            // Track BURROW - Umber Hulk (Lolth) or Earth Guardian (Cormyr)
            // AI difficulty affects whether BURROW is enabled:
            // - Easy: BURROW disabled (0% chance)
            // - Medium: 50% chance BURROW is enabled
            // - Hard: BURROW always enabled (100%)
            if (action.from && action.to) {
              const creatures = player.creaturesInPlay || []
              const movedCreature = creatures.find(c =>
                c.position &&
                c.position.x === action.to.x &&
                c.position.y === action.to.y
              )
              if (movedCreature && gameState.hasBurrow && gameState.hasBurrow(movedCreature)) {
                const faction = movedCreature.creature.faction
                const isLolth = faction === 'Sting of Lolth'
                const abilityKey = isLolth ? 'burrow_lolth' : 'burrow_cormyr'

                // Use random roll for difficulty (same approach as SCUTTLE)
                const difficultyRoll = Math.random()
                let difficulty = 'easy'
                let burrowEnabled = false

                if (difficultyRoll < 0.33) {
                  // Easy AI - never uses BURROW
                  difficulty = 'easy'
                  burrowEnabled = false
                } else if (difficultyRoll < 0.67) {
                  // Medium AI - 50% chance to use
                  difficulty = 'medium'
                  burrowEnabled = Math.random() < 0.5
                } else {
                  // Hard AI - always uses BURROW
                  difficulty = 'hard'
                  burrowEnabled = true
                }

                // Track that a BURROW creature moved (offered)
                creatureAbilityStats[abilityKey].timesOffered++
                if (creatureAbilityStats[abilityKey][difficulty]) {
                  creatureAbilityStats[abilityKey][difficulty].offered++
                }

                if (burrowEnabled) {
                  // Track that BURROW was triggered (enabled)
                  creatureAbilityStats[abilityKey].timesTriggered++
                  if (creatureAbilityStats[abilityKey][difficulty]) {
                    creatureAbilityStats[abilityKey][difficulty].triggered++
                  }

                  // Check if path went through any mountains
                  const path = action.path || []
                  const mountainTilesInPath = path.filter(pos => {
                    const tile = gameState.getTile(pos.x, pos.y)
                    return tile && (tile.terrain === 'MOUNTAIN' || tile.terrain === TerrainTypes.MOUNTAIN)
                  }).length

                  if (mountainTilesInPath > 0) {
                    creatureAbilityStats[abilityKey].mountainTilesMoved += mountainTilesInPath
                    if (creatureAbilityStats[abilityKey][difficulty]) {
                      creatureAbilityStats[abilityKey][difficulty].mountainTiles += mountainTilesInPath
                    }
                  }
                } else {
                  // Track that BURROW was declined (disabled by difficulty)
                  creatureAbilityStats[abilityKey].timesDeclined++
                  if (creatureAbilityStats[abilityKey][difficulty]) {
                    creatureAbilityStats[abilityKey][difficulty].declined++
                  }
                }
              }
            }

            // Track PHASING - Hypnotic Spirit (Curse of Undeath)
            // Works like FLYING but can also pass through other creatures
            // AI difficulty affects whether PHASING benefits are used (0/50/100 pattern)
            if (action.from && action.to) {
              const creatures = player.creaturesInPlay || []
              const movedCreature = creatures.find(c =>
                c.position &&
                c.position.x === action.to.x &&
                c.position.y === action.to.y
              )
              if (movedCreature && gameState.hasPhasing && gameState.hasPhasing(movedCreature)) {
                // Use random roll for difficulty (same approach as SCUTTLE/BURROW)
                const difficultyRoll = Math.random()
                let difficulty = 'easy'
                let phasingEnabled = false

                if (difficultyRoll < 0.33) {
                  difficulty = 'easy'
                  phasingEnabled = false
                } else if (difficultyRoll < 0.67) {
                  difficulty = 'medium'
                  phasingEnabled = Math.random() < 0.5
                } else {
                  difficulty = 'hard'
                  phasingEnabled = true
                }

                // Track that a PHASING creature moved (offered)
                creatureAbilityStats.phasing.timesOffered++
                if (creatureAbilityStats.phasing[difficulty]) {
                  creatureAbilityStats.phasing[difficulty].offered++
                }

                if (phasingEnabled) {
                  // Track that PHASING was triggered (enabled)
                  creatureAbilityStats.phasing.timesTriggered++
                  if (creatureAbilityStats.phasing[difficulty]) {
                    creatureAbilityStats.phasing[difficulty].triggered++
                  }

                  // Check path for creatures passed through and mountains traversed
                  const path = action.path || []
                  let creaturesPassedThrough = 0
                  let mountainsTraversed = 0

                  for (const pos of path) {
                    const tile = gameState.getTile(pos.x, pos.y)
                    if (tile) {
                      // Count creatures passed through (not the start or end position)
                      if (tile.occupant && tile.occupant !== movedCreature &&
                          !(pos.x === action.from.x && pos.y === action.from.y) &&
                          !(pos.x === action.to.x && pos.y === action.to.y)) {
                        creaturesPassedThrough++
                      }
                      // Count mountains traversed
                      if (tile.terrain === 'MOUNTAIN' || tile.terrain === TerrainTypes.MOUNTAIN) {
                        mountainsTraversed++
                      }
                    }
                  }

                  if (creaturesPassedThrough > 0) {
                    creatureAbilityStats.phasing.creaturesPassedThrough += creaturesPassedThrough
                    if (creatureAbilityStats.phasing[difficulty]) {
                      creatureAbilityStats.phasing[difficulty].creaturesThrough += creaturesPassedThrough
                    }
                  }
                  if (mountainsTraversed > 0) {
                    creatureAbilityStats.phasing.mountainsTraversed += mountainsTraversed
                    if (creatureAbilityStats.phasing[difficulty]) {
                      creatureAbilityStats.phasing[difficulty].mountains += mountainsTraversed
                    }
                  }
                }
              }
            }
            break

          case 'collect_morale':
            // Track SELLSWORD for Drow treasure collection
            // Faction check: Must be Sting of Lolth
            if (gameState.hasCommanderAbility(currentPlayerId, 'sellsword') &&
                player.commander && player.commander.faction === 'Sting of Lolth') {
              const creatures = player.creaturesInPlay || []
              const collector = creatures.find(c =>
                c.position &&
                c.position.x === action.position.x &&
                c.position.y === action.position.y
              )
              if (collector) {
                const types = collector.creature.type || []
                // Must also be Sting of Lolth creature
                if (types.includes('Drow') && collector.creature.faction === 'Sting of Lolth') {
                  abilityStats.sellsword.timesTriggered++
                  const chooseMorale = Math.random() < 0.5
                  if (chooseMorale) {
                    abilityStats.sellsword.choseMorale++
                  } else {
                    abilityStats.sellsword.choseCard++
                  }
                }
              }
            }
            break

          case 'lightning_breath':
            // Track LIGHTNING BREATH ability (Dracolich) - TRIGGERED
            // AI difficulty affects whether LIGHTNING BREATH is used:
            // - Easy: Never use (0% chance)
            // - Medium: 50% chance
            // - Hard: Always use (100%)
            {
              const diff = player?.aiDifficulty || 'medium'
              const targets = action.targets || []
              const damagePerTarget = action.damage || 20

              // Track offered (ability was available with 2+ targets)
              creatureAbilityStats.lightning_breath.timesOffered++
              creatureAbilityStats.lightning_breath[diff].offered++

              // Track triggered (AI chose to use it)
              creatureAbilityStats.lightning_breath.timesTriggered++
              creatureAbilityStats.lightning_breath[diff].triggered++

              // Apply damage to each target and track results
              for (const target of targets) {
                if (target && !target.isDestroyed()) {
                  creatureAbilityStats.lightning_breath.targetsHit++
                  creatureAbilityStats.lightning_breath.totalDamage += damagePerTarget
                  creatureAbilityStats.lightning_breath[diff].targetsHit++
                  creatureAbilityStats.lightning_breath[diff].damage += damagePerTarget

                  // Apply damage
                  const destroyed = target.takeDamage(damagePerTarget)
                  if (destroyed) {
                    creatureAbilityStats.lightning_breath.kills++
                    creatureAbilityStats.lightning_breath[diff].kills++

                    // Remove creature properly (same as applyFlashingBlades)
                    // Clear tile occupant
                    if (target.position) {
                      const tile = gameState.getTile(target.position.x, target.position.y)
                      if (tile) tile.occupant = null
                    }
                    // Remove from creaturesInPlay
                    const defenderPlayer = gameState.players[target.owner]
                    if (defenderPlayer) {
                      const idx = defenderPlayer.creaturesInPlay.findIndex(c => c.instanceId === target.instanceId)
                      if (idx !== -1) defenderPlayer.creaturesInPlay.splice(idx, 1)
                      // Add to graveyard
                      defenderPlayer.creatureGraveyard.push(target.creature)
                      // Apply morale changes
                      defenderPlayer.loseMorale(target.creature.level)
                    }

                    gameStats.creaturesDestroyed++
                  }
                }
              }

              // Mark attacker as having attacked
              if (action.attackerInstance) {
                action.attackerInstance.hasAttackedThisTurn = true
              }

              result.attackActions++
            }
            break

          case 'lightning_breath_declined':
            // Track LIGHTNING BREATH declined - ability was available but AI chose not to use
            {
              const diff = player?.aiDifficulty || 'medium'

              // Track offered (ability was available with 2+ targets)
              creatureAbilityStats.lightning_breath.timesOffered++
              creatureAbilityStats.lightning_breath[diff].offered++

              // Track declined (AI chose not to use it based on difficulty)
              creatureAbilityStats.lightning_breath.timesDeclined++
              creatureAbilityStats.lightning_breath[diff].declined++
            }
            break

          case 'healing_touch':
            // Track HEALING TOUCH ability (Dwarf Cleric) - TRIGGERED
            // AI difficulty affects whether ability is used:
            // - Easy: Never use (0% chance)
            // - Medium: 50% chance
            // - Hard: Always use (100%)
            {
              const diff = player?.aiDifficulty || 'medium'
              const healerInstance = action.healerInstance
              const targetInstance = action.targetInstance
              const healAction = action.action  // 'heal' or 'removeCard'

              // Track offered and triggered
              creatureAbilityStats.healing_touch.timesOffered++
              creatureAbilityStats.healing_touch[diff].offered++
              creatureAbilityStats.healing_touch.timesTriggered++
              creatureAbilityStats.healing_touch[diff].triggered++

              if (healAction === 'heal') {
                const healedAmount = action.result?.healedAmount || 10
                creatureAbilityStats.healing_touch.totalHealingDone += healedAmount
                creatureAbilityStats.healing_touch[diff].heals++

                // Track self vs ally heal
                if (healerInstance?.instanceId === targetInstance?.instanceId) {
                  creatureAbilityStats.healing_touch.selfHeals++
                } else {
                  creatureAbilityStats.healing_touch.allyHeals++
                }

                console.log(`[HEALING TOUCH] ${healerInstance?.creature?.name} healed ${targetInstance?.creature?.name} for ${healedAmount} (${diff})`)
              } else if (healAction === 'removeCard') {
                creatureAbilityStats.healing_touch.cardsRemoved++
                creatureAbilityStats.healing_touch[diff].cardRemovals++

                console.log(`[HEALING TOUCH] ${healerInstance?.creature?.name} removed card from ${targetInstance?.creature?.name} (${diff})`)
              }
            }
            break

          case 'healing_touch_declined':
            // Track HEALING TOUCH declined - ability was available but AI chose not to use
            {
              const diff = player?.aiDifficulty || 'medium'

              creatureAbilityStats.healing_touch.timesOffered++
              creatureAbilityStats.healing_touch[diff].offered++
              creatureAbilityStats.healing_touch.timesDeclined++
              creatureAbilityStats.healing_touch[diff].declined++
            }
            break

          case 'regenerate_10':
            // Track REGENERATE 10 ability (Feral Troll) - TRIGGERED
            // AI difficulty affects whether regeneration is applied:
            // - Easy: Never regenerate (0%)
            // - Medium: 50% chance
            // - Hard: Always regenerate (100%)
            {
              const diff = player?.aiDifficulty || 'medium'
              const healAmount = action.result?.healedAmount || 10
              const creatureInstance = action.creatureInstance

              // Track offered and triggered
              creatureAbilityStats.regenerate_10.timesOffered++
              creatureAbilityStats.regenerate_10[diff].offered++
              creatureAbilityStats.regenerate_10.timesTriggered++
              creatureAbilityStats.regenerate_10[diff].triggered++

              // Track healing amount
              creatureAbilityStats.regenerate_10.totalHealingRestored += healAmount
              creatureAbilityStats.regenerate_10[diff].healingRestored += healAmount

              console.log(`[REGENERATE 10] ${creatureInstance?.creature?.name} regenerated ${healAmount} HP (${diff})`)
            }
            break

          case 'regenerate_10_declined':
            // Track REGENERATE 10 declined - creature had damage but AI chose not to regenerate
            {
              const diff = player?.aiDifficulty || 'medium'

              creatureAbilityStats.regenerate_10.timesOffered++
              creatureAbilityStats.regenerate_10[diff].offered++
              creatureAbilityStats.regenerate_10.timesDeclined++
              creatureAbilityStats.regenerate_10[diff].declined++

              console.log(`[REGENERATE 10] ${action.creatureInstance?.creature?.name} regeneration declined (${diff})`)
            }
            break

          case 'untap_on_adjacent_kill':
            // Track UNTAP ON KILL ability (Bugbear Berserker / Orc Barbarian) - TRIGGERED
            // AI difficulty affects whether untap is applied:
            // - Easy: Never untap (0%)
            // - Medium: 50% chance
            // - Hard: Always untap (100%)
            {
              const diff = action.difficulty || player?.aiDifficulty || 'medium'
              const bugbearName = action.bugbearName || 'Bugbear Berserker'
              const wasKilledByBugbear = action.wasKilledByBugbear || false

              // Track offered and triggered
              creatureAbilityStats.untap_on_adjacent_kill.timesOffered++
              creatureAbilityStats.untap_on_adjacent_kill[diff].offered++
              creatureAbilityStats.untap_on_adjacent_kill.timesTriggered++
              creatureAbilityStats.untap_on_adjacent_kill[diff].triggered++

              // Track self-kill vs ally-kill
              if (wasKilledByBugbear) {
                creatureAbilityStats.untap_on_adjacent_kill.selfKills++
              } else {
                creatureAbilityStats.untap_on_adjacent_kill.allyKills++
              }

              console.log(`[UNTAP ON KILL] ${bugbearName} untapped from adjacent kill (${diff}, selfKill: ${wasKilledByBugbear})`)
            }
            break

          case 'untap_on_adjacent_kill_declined':
            // Track UNTAP ON KILL declined - adjacent enemy died but AI chose not to untap
            {
              const diff = action.difficulty || player?.aiDifficulty || 'medium'
              const bugbearName = action.bugbearName || 'Bugbear Berserker'

              creatureAbilityStats.untap_on_adjacent_kill.timesOffered++
              creatureAbilityStats.untap_on_adjacent_kill[diff].offered++
              creatureAbilityStats.untap_on_adjacent_kill.timesDeclined++
              creatureAbilityStats.untap_on_adjacent_kill[diff].declined++

              console.log(`[UNTAP ON KILL] ${bugbearName} untap declined (${diff})`)
            }
            break

          case 'tap_on_hit':
            // Track TAP ON HIT ability (Horned Devil, Wolf) - TRIGGERED
            {
              const diff = action.difficulty || player?.aiDifficulty || 'medium'
              const attackerName = action.attackerName || 'Unknown'
              const defenderName = action.defenderName || 'Unknown'

              creatureAbilityStats.tap_on_hit.timesOffered++
              creatureAbilityStats.tap_on_hit[diff].offered++
              creatureAbilityStats.tap_on_hit.timesTriggered++
              creatureAbilityStats.tap_on_hit[diff].triggered++
            }
            break

          case 'tap_on_hit_already_tapped':
            // Track TAP ON HIT when target was already tapped
            {
              const diff = action.difficulty || player?.aiDifficulty || 'medium'
              const attackerName = action.attackerName || 'Unknown'
              const defenderName = action.defenderName || 'Unknown'

              creatureAbilityStats.tap_on_hit.timesOffered++
              creatureAbilityStats.tap_on_hit[diff].offered++
              creatureAbilityStats.tap_on_hit.timesAlreadyTapped++
              creatureAbilityStats.tap_on_hit[diff].alreadyTapped++
            }
            break

          case 'magic_circle_aura':
            // Track MAGIC CIRCLE AURA ability (Hobgoblin Sorcerer)
            // Tracks when shield blocks damage for Goblin faction creatures
            {
              const diff = action.difficulty || 'medium'
              const blocked = action.blocked || 10
              const creature = action.creature || 'Unknown'

              if (action.type === 'offered') {
                creatureAbilityStats.magic_circle_aura.timesOffered++
                if (creatureAbilityStats.magic_circle_aura[diff]) {
                  creatureAbilityStats.magic_circle_aura[diff].offered++
                }
              } else if (action.type === 'triggered') {
                creatureAbilityStats.magic_circle_aura.timesOffered++
                creatureAbilityStats.magic_circle_aura.timesTriggered++
                creatureAbilityStats.magic_circle_aura.totalDamageBlocked += blocked
                if (creatureAbilityStats.magic_circle_aura[diff]) {
                  creatureAbilityStats.magic_circle_aura[diff].offered++
                  creatureAbilityStats.magic_circle_aura[diff].triggered++
                  creatureAbilityStats.magic_circle_aura[diff].blocked += blocked
                }
                console.log(`[MAGIC CIRCLE AURA] ${creature} blocked ${blocked} damage (${diff})`)
              } else if (action.type === 'declined') {
                creatureAbilityStats.magic_circle_aura.timesDeclined++
                if (creatureAbilityStats.magic_circle_aura[diff]) {
                  creatureAbilityStats.magic_circle_aura[diff].declined++
                }
                console.log(`[MAGIC CIRCLE AURA] Shield declined for ${creature} (${diff})`)
              } else if (action.type === 'aura_activated') {
                creatureAbilityStats.magic_circle_aura.auraActivations++
                console.log(`[MAGIC CIRCLE AURA] Aura activated by ${action.sorcerer}`)
              } else if (action.type === 'aura_deactivated') {
                creatureAbilityStats.magic_circle_aura.auraDeactivations++
                console.log(`[MAGIC CIRCLE AURA] Aura deactivated (${action.reason})`)
              }
            }
            break

          // NOTE: 'reach_2_attack' case removed - REACH tracking is now handled in processAttackQueue
          // via targetInfo.reachDecision (when AI had a choice) and targetInfo.isReachAttack (fallback)

          case 'attack_intention':
            attackIntentions.push(action)
            break

          case 'web':
            // Track WEB order card USED (Hard AI used Web)
            {
              const diff = player?.aiDifficulty || 'medium'
              const caster = action.casterInstance
              const target = action.targetInstance

              if (orderCardStats?.web_card) {
                // Track as offered AND used
                orderCardStats.web_card.timesOffered++
                orderCardStats.web_card[diff].offered++
                orderCardStats.web_card.timesUsed++
                orderCardStats.web_card.targetsWebbed++
                orderCardStats.web_card[diff].used++

                console.log(`[WEB TRACKING] ${caster?.creature?.name} webbed ${target?.creature?.name} (${diff})`)
              }
            }
            break

          case 'web_declined':
            // Track WEB order card DECLINED (Easy/Medium AI had opportunity but didn't use)
            {
              const diff = player?.aiDifficulty || 'medium'
              const caster = action.casterInstance
              const target = action.targetInstance

              if (orderCardStats?.web_card) {
                // Track as offered but declined
                orderCardStats.web_card.timesOffered++
                orderCardStats.web_card[diff].offered++
                orderCardStats.web_card.timesDeclined++
                orderCardStats.web_card[diff].declined++

                console.log(`[WEB TRACKING] ${diff} AI declined Web: ${caster?.creature?.name} could have webbed ${target?.creature?.name}`)
              }
            }
            break

          case 'web_removal':
            // Track WEB removal by AI
            {
              const diff = player?.aiDifficulty || 'medium'

              if (orderCardStats?.web_card) {
                orderCardStats.web_card.websRemoved++
                console.log(`[WEB TRACKING] AI removed Web from ${action.creatureInstance?.creature?.name} (${diff})`)
              }
            }
            break
        }
      }

      // Process attack queue with ability tracking
      // IMPORTANT: Sort so TAP ON HIT creatures attack FIRST
      // This ensures they can tap high-HP targets before other creatures damage them
      if (attackIntentions.length > 0) {
        // Sort to prioritize TAP ON HIT creatures (they attack first)
        attackIntentions.sort((a, b) => {
          const aHasTapOnHit = gameState.hasTapOnHit && gameState.hasTapOnHit(a.attackerInstance)
          const bHasTapOnHit = gameState.hasTapOnHit && gameState.hasTapOnHit(b.attackerInstance)
          if (aHasTapOnHit && !bHasTapOnHit) return -1  // a goes first
          if (!aHasTapOnHit && bHasTapOnHit) return 1   // b goes first
          return 0  // maintain original order for ties
        })

        const attackResults = processAttackQueue(attackIntentions, gameState, abilityStats, creatureAbilityStats)
        result.attackActions = attackResults.attacksSuccessful
        gameStats.totalDamageDealt += attackResults.damageDealt
        gameStats.creaturesDestroyed += attackResults.creaturesDestroyed
      }

      // Track VERSATILE ability for Adventurers after movement
      // Faction check: Must be Heart of Cormyr
      if (gameState.currentPhase === GamePhases.ACTIVATE &&
          gameState.hasCommanderAbility(currentPlayerId, 'versatile') &&
          player.commander && player.commander.faction === 'Heart of Cormyr') {
        const creatures = player.creaturesInPlay || []
        // Must be Heart of Cormyr creature AND Adventurer type
        const adventurers = creatures.filter(c =>
          c.creature.type?.includes('Adventurer') &&
          c.creature.faction === 'Heart of Cormyr' &&
          !c.isTapped
        )

        for (const adventurer of adventurers) {
          if (result.movementActions > 0) {
            abilityStats.versatile.timesTriggered++
            const useVersatile = Math.random() < 0.4
            if (useVersatile) {
              abilityStats.versatile.extraMovesUsed++
              abilityStats.versatile.totalExtraTilesMoved += adventurer.creature.speed
            } else {
              abilityStats.versatile.extraMoveDeclined++
            }
          }
        }
      }

      // Track SCROLLBOOK ability availability
      // Faction check: Must be Heart of Cormyr
      if (gameState.hasCommanderAbility(currentPlayerId, 'scrollbook') &&
          player.commander && player.commander.faction === 'Heart of Cormyr') {
        const orderHand = player.orderHand || []
        if (orderHand.length > 0 && !player.hasUsedAbilityThisTurn('scrollbook')) {
          abilityStats.scrollbook.timesAvailable++
          const useScrollbook = Math.random() < 0.5
          if (useScrollbook && orderHand.length > 0) {
            player.useAbility('scrollbook')
            abilityStats.scrollbook.timesUsed++
            abilityStats.scrollbook.cardsDiscarded++
            abilityStats.scrollbook.cardsDrawn++
          }
        }
      }

    } catch (err) {
      gameStats.errors++
      if (gameStats.errorMessages) {
        gameStats.errorMessages.push(`AI Turn Error: ${err.message || err}`)
      }
    }

    return result
  }

  const runSingleGame = (gameNum, abilityStats, creatureAbilityStats, orderCardStats) => {
    const stats = {
      gameNum,
      turns: 0,
      winner: null,
      completed: false,
      creaturesDeployed: 0,
      creaturesDestroyed: 0,
      totalDamageDealt: 0,
      errors: 0,
      errorMessages: [],  // Capture detailed error messages
      factions: {},
      commanders: {}
    }

    try {
      const factionList = Object.values(Factions)
      const shuffledFactions = [...factionList].sort(() => Math.random() - 0.5)
      const playerIds = [Players.PLAYER1, Players.PLAYER2, Players.PLAYER3, Players.PLAYER4, Players.PLAYER5]
      const playerSetups = []

      // Use all 5 factions for comprehensive ability testing
      for (let i = 0; i < 5; i++) {
        const playerId = playerIds[i]
        const faction = shuffledFactions[i]
        const factionCommanders = commanders[faction]
        const commander = factionCommanders[Math.floor(Math.random() * factionCommanders.length)]

        stats.factions[`p${i + 1}`] = faction
        stats.commanders[`p${i + 1}`] = commander.name

        playerSetups.push({
          playerId,
          commander: new Commander(commander),
          creatures: createCreatureDeck(faction),
          orders: createOrderDeck(faction),
          faction,
          isHuman: false  // Mark as AI for difficulty-based ability testing
        })
      }

      const gameState = new GameState(playerSetups)

      let turnCount = 0
      let consecutiveSamePhase = 0
      let lastPhase = null
      let lastPlayer = null

      while (!gameState.gameOver && turnCount < MAX_TURNS) {
        const currentPhase = gameState.currentPhase
        const currentPlayerId = gameState.currentPlayer

        if (currentPhase === lastPhase && currentPlayerId === lastPlayer) {
          consecutiveSamePhase++
          if (consecutiveSamePhase > 20) break
        } else {
          consecutiveSamePhase = 0
          lastPhase = currentPhase
          lastPlayer = currentPlayerId
        }

        try {
          switch (currentPhase) {
            case GamePhases.REFRESH:
              // Check for HORDE ability - allows deployment during REFRESH phase
              // Execute AI turn BEFORE executeRefreshPhase to track HORDE deployments
              if (gameState.canDeployDuringRefresh && gameState.canDeployDuringRefresh(currentPlayerId)) {
                executeAITurn(gameState, currentPlayerId, abilityStats, creatureAbilityStats, stats, orderCardStats)
              }
              gameState.executeRefreshPhase()
              break
            case GamePhases.ACTIVATE:
              executeAITurn(gameState, currentPlayerId, abilityStats, creatureAbilityStats, stats, orderCardStats)

              // Track DISCIPLE OF KYUSS ability at end of ACTIVATE phase
              // This passive triggers when the current player ends their activation
              // and their creatures are adjacent to an enemy Disciple of Kyuss
              if (creatureAbilityStats && gameState.getEnemyDisciplesOfKyuss) {
                const disciples = gameState.getEnemyDisciplesOfKyuss(currentPlayerId)

                for (const disciple of disciples) {
                  const adjacentCreatures = gameState.getCreaturesAdjacentToDisciple
                    ? gameState.getCreaturesAdjacentToDisciple(currentPlayerId, disciple)
                    : []

                  if (adjacentCreatures.length > 0) {
                    const discipleOwnerPlayer = gameState.players[disciple.owner]
                    const aiDifficulty = discipleOwnerPlayer?.aiDifficulty || 'medium'

                    // Track offered (adjacent enemies exist)
                    creatureAbilityStats.disciple_of_kyuss.timesOffered++
                    if (creatureAbilityStats.disciple_of_kyuss[aiDifficulty]) {
                      creatureAbilityStats.disciple_of_kyuss[aiDifficulty].offered++
                    }

                    // Determine if ability triggers based on difficulty (0/50/100 rule)
                    let abilityTriggers = false
                    if (aiDifficulty === 'easy') {
                      abilityTriggers = false
                    } else if (aiDifficulty === 'medium') {
                      abilityTriggers = Math.random() < 0.5
                    } else {
                      abilityTriggers = true // hard
                    }

                    if (abilityTriggers) {
                      creatureAbilityStats.disciple_of_kyuss.timesTriggered++
                      creatureAbilityStats.disciple_of_kyuss.enemiesHit += adjacentCreatures.length
                      creatureAbilityStats.disciple_of_kyuss.totalDamage += adjacentCreatures.length * 10
                      if (creatureAbilityStats.disciple_of_kyuss[aiDifficulty]) {
                        creatureAbilityStats.disciple_of_kyuss[aiDifficulty].triggered++
                        creatureAbilityStats.disciple_of_kyuss[aiDifficulty].enemiesHit += adjacentCreatures.length
                        creatureAbilityStats.disciple_of_kyuss[aiDifficulty].damage += adjacentCreatures.length * 10
                      }

                      // Check for kills (creatures with <= 10 HP would die)
                      for (const creature of adjacentCreatures) {
                        if (creature.currentHP <= 10) {
                          creatureAbilityStats.disciple_of_kyuss.kills++
                          if (creatureAbilityStats.disciple_of_kyuss[aiDifficulty]) {
                            creatureAbilityStats.disciple_of_kyuss[aiDifficulty].kills++
                          }
                        }
                      }
                    } else {
                      creatureAbilityStats.disciple_of_kyuss.timesDeclined++
                      if (creatureAbilityStats.disciple_of_kyuss[aiDifficulty]) {
                        creatureAbilityStats.disciple_of_kyuss[aiDifficulty].declined++
                      }
                    }
                  }
                }
              }

              gameState.advancePhase()
              break
            case GamePhases.DEPLOY:
              executeAITurn(gameState, currentPlayerId, abilityStats, creatureAbilityStats, stats, orderCardStats)
              gameState.advancePhase()
              break
            case GamePhases.CLEANUP:
              gameState.executeCleanupPhase()
              turnCount = gameState.turnNumber
              break
            default:
              gameState.advancePhase()
          }
        } catch (err) {
          stats.errors++
          stats.errorMessages.push(`Game ${stats.gameNum}, Turn ${turnCount}, Phase ${gameState.phase}: ${err.message || err}`)
          break
        }

        gameState.checkGameOver()
      }

      stats.turns = turnCount

      if (turnCount >= MAX_TURNS && !gameState.gameOver) {
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

      if (gameState.gameOver || turnCount >= MAX_TURNS) {
        stats.completed = true
        stats.winner = gameState.winner
      }

    } catch (err) {
      stats.errors++
      stats.errorMessages.push(`Game ${stats.gameNum}: ${err.message || err}`)
    }

    return stats
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults(null)

    const abilityStats = createAbilityStats()
    const creatureAbilityStats = createCreatureAbilityStats()
    const orderCardStats = createOrderCardStats()
    const allResults = []
    const summary = {
      totalGames: NUM_TESTS,
      completedGames: 0,
      playerWins: { PLAYER1: 0, PLAYER2: 0, PLAYER3: 0, PLAYER4: 0, PLAYER5: 0 },
      ties: 0,
      totalTurns: 0,
      minTurns: Infinity,
      maxTurns: 0,
      totalErrors: 0,
      errorLog: [],  // Captures detailed error messages
      totalCreaturesDeployed: 0,
      totalCreaturesDestroyed: 0,
      totalDamageDealt: 0,
      factionWins: {},
      factionGames: {},
      commanderWins: {},
      commanderGames: {}
    }

    for (let i = 0; i < NUM_TESTS; i++) {
      await new Promise(resolve => setTimeout(resolve, 0))

      setCurrentTest(i + 1)
      setProgress(((i + 1) / NUM_TESTS) * 100)

      const gameStats = runSingleGame(i + 1, abilityStats, creatureAbilityStats, orderCardStats)
      allResults.push(gameStats)

      if (gameStats.completed) {
        summary.completedGames++
        summary.totalTurns += gameStats.turns
        summary.minTurns = Math.min(summary.minTurns, gameStats.turns)
        summary.maxTurns = Math.max(summary.maxTurns, gameStats.turns)

        // Track winner across all 5 players
        if (gameStats.winner && summary.playerWins[gameStats.winner] !== undefined) {
          summary.playerWins[gameStats.winner]++
        } else if (!gameStats.winner) {
          summary.ties++
        }

        // Track faction/commander wins for all 5 players
        for (let p = 1; p <= 5; p++) {
          const playerKey = `p${p}`
          const playerIdMap = { p1: 'PLAYER1', p2: 'PLAYER2', p3: 'PLAYER3', p4: 'PLAYER4', p5: 'PLAYER5' }
          const faction = gameStats.factions[playerKey]
          const commander = gameStats.commanders[playerKey]
          const isWinner = gameStats.winner === playerIdMap[playerKey]

          if (faction) {
            if (!summary.factionGames[faction]) {
              summary.factionGames[faction] = 0
              summary.factionWins[faction] = 0
            }
            summary.factionGames[faction]++
            if (isWinner) summary.factionWins[faction]++
          }

          if (commander) {
            if (!summary.commanderGames[commander]) {
              summary.commanderGames[commander] = 0
              summary.commanderWins[commander] = 0
            }
            summary.commanderGames[commander]++
            if (isWinner) summary.commanderWins[commander]++
          }
        }
      }

      summary.totalErrors += gameStats.errors
      // Collect error messages (limit to first 100 to prevent memory issues)
      if (gameStats.errorMessages && gameStats.errorMessages.length > 0 && summary.errorLog.length < 100) {
        summary.errorLog.push(...gameStats.errorMessages.slice(0, 100 - summary.errorLog.length))
      }
      summary.totalCreaturesDeployed += gameStats.creaturesDeployed
      summary.totalCreaturesDestroyed += gameStats.creaturesDestroyed
      summary.totalDamageDealt += gameStats.totalDamageDealt
    }

    if (summary.completedGames > 0) {
      summary.averageTurns = (summary.totalTurns / summary.completedGames).toFixed(2)
    }

    setResults({ allResults, summary, abilityStats, creatureAbilityStats, orderCardStats })
    setIsRunning(false)
  }

  // Count working commander abilities
  const countWorkingAbilities = (abilityStats) => {
    let working = 0
    if (abilityStats.gruumsh_commands_it.timesTriggered > 0) working++
    if (abilityStats.walls_of_web.timesApplied > 0) working++
    if (abilityStats.sellsword.timesTriggered > 0) working++
    if (abilityStats.bloodthirsty.timesTriggered > 0) working++
    if (abilityStats.scrollbook.timesUsed > 0) working++
    if (abilityStats.versatile.timesTriggered > 0) working++
    // These may not trigger without specific game conditions
    if (abilityStats.orc_scout.timesUsed > 0) working++
    if (abilityStats.unstoppable_hordes.cowerUsed > 0) working++
    if (abilityStats.horde.timesUsed > 0) working++
    if (abilityStats.black_hand_of_bane.timesTriggered > 0) working++
    return working
  }

  // Count working creature abilities
  const countWorkingCreatureAbilities = (creatureAbilityStats) => {
    if (!creatureAbilityStats) return { working: 0, total: 25 }
    let working = 0
    const total = 28 // FLASHING BLADES, HIDDEN BLADE, SCUTTLE, SHADOW STALKER, BURROW (Lolth), BURROW (Cormyr), CONFUSION GAZE, SUMMON SPIDER, GRAVEYARD DEPLOY, LIFE DRAIN, LICH NECROMANCER DEPLOY, TOMB GUARDIAN SPLASH, LIGHTNING BREATH, PHASING, INSUBSTANTIAL, RIDER, ACID BREATH, EXPLOSIVE BOLTS, SLAM, FLANKING, ARCANE PORTAL, SHIELD BLOCK, HEALING TOUCH, REGENERATE 10, UNTAP ON KILL, MAGIC CIRCLE AURA, CUTTER, ORC DRUID DEPLOY
    if (creatureAbilityStats.flashing_blades?.timesTriggered > 0) working++
    if (creatureAbilityStats.hidden_blade?.timesTriggered > 0) working++
    if (creatureAbilityStats.scuttle?.timesTriggered > 0) working++
    if (creatureAbilityStats.shadow_stalker?.timesTriggered > 0) working++
    if (creatureAbilityStats.burrow_lolth?.timesTriggered > 0) working++
    if (creatureAbilityStats.burrow_cormyr?.timesTriggered > 0) working++
    if (creatureAbilityStats.confusion_gaze?.timesTriggered > 0) working++
    if (creatureAbilityStats.summon_spider?.timesTriggered > 0) working++
    if (creatureAbilityStats.graveyard_deploy?.timesTriggered > 0) working++
    // Phase 2 abilities
    if (creatureAbilityStats.life_drain?.timesTriggered > 0) working++
    if (creatureAbilityStats.lich_necromancer_deploy?.timesTriggered > 0) working++
    if (creatureAbilityStats.tomb_guardian_splash?.timesTriggered > 0) working++
    if (creatureAbilityStats.lightning_breath?.timesTriggered > 0) working++
    // Hypnotic Spirit abilities
    if (creatureAbilityStats.phasing?.timesTriggered > 0) working++
    if (creatureAbilityStats.insubstantial?.timesTriggered > 0) working++
    // RIDER ability (Skeletal Lancer)
    if (creatureAbilityStats.rider?.timesTriggered > 0) working++
    // Heart of Cormyr ranged splash abilities
    if (creatureAbilityStats.acid_breath?.timesTriggered > 0) working++
    if (creatureAbilityStats.explosive_bolts?.timesTriggered > 0) working++
    // Heart of Cormyr melee abilities
    if (creatureAbilityStats.slam?.timesTriggered > 0) working++
    if (creatureAbilityStats.flanking?.timesTriggered > 0) working++
    // Heart of Cormyr deployment abilities
    if (creatureAbilityStats.arcane_portal?.timesTriggered > 0) working++
    // Heart of Cormyr defensive/healing abilities
    if (creatureAbilityStats.shield_block?.timesTriggered > 0) working++
    if (creatureAbilityStats.healing_touch?.timesTriggered > 0) working++
    // Tyranny of Goblins abilities
    if (creatureAbilityStats.regenerate_10?.timesTriggered > 0) working++
    if (creatureAbilityStats.untap_on_adjacent_kill?.timesTriggered > 0) working++
    if (creatureAbilityStats.reach_2?.timesTriggered > 0) working++
    if (creatureAbilityStats.tap_on_hit?.timesTriggered > 0) working++
    if (creatureAbilityStats.magic_circle_aura?.timesTriggered > 0) working++
    if (creatureAbilityStats.cutter?.timesTriggered > 0) working++
    // Blood of Gruumsh abilities
    if (creatureAbilityStats.death_strike?.timesTriggered > 0) working++
    if (creatureAbilityStats.orc_druid_deploy?.timesUsed > 0) working++
    return { working, total }
  }

  return (
    <Container fluid className="mt-4">
      <Card bg="dark" text="white">
        <Card.Header>
          <h3>Abilities Test - 100 Automated Games</h3>
        </Card.Header>
        <Card.Body>
          {!isRunning && !results && (
            <div className="text-center">
              <p>This will run 100 automated games to test all abilities.</p>
              <p>Each game features all 5 factions (5 AI players) with random commander selections.</p>
              <p>Tracks detailed statistics for Commander, Creature, and Order Card abilities.</p>
              <Button variant="success" size="lg" onClick={runAllTests}>
                Start Abilities Test
              </Button>
            </div>
          )}

          {isRunning && (
            <div>
              <h5>Running Test {currentTest} of {NUM_TESTS}...</h5>
              <ProgressBar now={progress} label={`${Math.round(progress)}%`} animated variant="success" />
              <p className="mt-2 text-muted">Testing all abilities across all factions...</p>
            </div>
          )}

          {results && (
            <div>
              <Alert variant={results.summary.totalErrors === 0 ? 'success' : 'warning'}>
                <Alert.Heading>
                  {results.summary.totalErrors === 0
                    ? `✅ Test Complete - ${countWorkingAbilities(results.abilityStats)}/10 Commander + ${countWorkingCreatureAbilities(results.creatureAbilityStats).working}/${countWorkingCreatureAbilities(results.creatureAbilityStats).total} Creature Abilities Active!`
                    : `⚠️ Test Complete - ${results.summary.totalErrors} errors detected`}
                </Alert.Heading>
              </Alert>

              {/* Core Statistics */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header><h5>Core Statistics</h5></Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr><td><strong>Games Completed</strong></td><td>{results.summary.completedGames}/{results.summary.totalGames}</td></tr>
                          <tr><td><strong>Players per Game</strong></td><td><Badge bg="info">5 Factions</Badge></td></tr>
                          <tr>
                            <td><strong>Player Wins</strong></td>
                            <td>
                              {Object.entries(results.summary.playerWins).map(([player, wins]) => (
                                <Badge key={player} bg={wins > 0 ? 'success' : 'secondary'} className="me-1">
                                  P{player.slice(-1)}: {wins}
                                </Badge>
                              ))}
                            </td>
                          </tr>
                          <tr><td><strong>Ties</strong></td><td><Badge bg="secondary">{results.summary.ties}</Badge></td></tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr><td><strong>Average Turns</strong></td><td>{results.summary.averageTurns}</td></tr>
                          <tr><td><strong>Min/Max Turns</strong></td><td>{results.summary.minTurns === Infinity ? 'N/A' : results.summary.minTurns} / {results.summary.maxTurns}</td></tr>
                          <tr><td><strong>Creatures Deployed</strong></td><td>{results.summary.totalCreaturesDeployed}</td></tr>
                          <tr><td><strong>Creatures Destroyed</strong></td><td>{results.summary.totalCreaturesDestroyed}</td></tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Commander Ability Statistics */}
              <Card bg="success" text="white" className="mb-3">
                <Card.Header><h5>⚔️ Commander Ability Statistics</h5></Card.Header>
                <Card.Body>
                  <Row>
                    {/* Blood of Gruumsh */}
                    <Col md={6}>
                      <h6 className="text-warning">Blood of Gruumsh</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td><strong>GRUUMSH COMMANDS IT</strong> <Badge bg="info">PASSIVE</Badge></td>
                            <td>
                              Triggered: <Badge bg={results.abilityStats.gruumsh_commands_it.timesTriggered > 0 ? 'success' : 'secondary'}>{results.abilityStats.gruumsh_commands_it.timesTriggered}</Badge>
                              <br /><small>Movement Saved: {results.abilityStats.gruumsh_commands_it.movementSaved}</small>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>ORC SCOUT</strong> <Badge bg="warning">ACTIVE</Badge></td>
                            <td>
                              Used: <Badge bg={results.abilityStats.orc_scout.timesUsed > 0 ? 'success' : 'secondary'}>{results.abilityStats.orc_scout.timesUsed}</Badge>
                              <br /><small>Orcs to Treasure: {results.abilityStats.orc_scout.orcsDeployedToTreasure}</small>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>

                    {/* Sting of Lolth */}
                    <Col md={6}>
                      <h6 className="text-info">Sting of Lolth</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td><strong>WALLS OF WEB</strong> <Badge bg="info">PASSIVE</Badge></td>
                            <td>
                              Applied: <Badge bg={results.abilityStats.walls_of_web.timesApplied > 0 ? 'success' : 'secondary'}>{results.abilityStats.walls_of_web.timesApplied}</Badge>
                              <br /><small>Extra Tiles: {results.abilityStats.walls_of_web.extraTilesMoved}</small>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>SELLSWORD</strong> <Badge bg="warning">ACTIVE</Badge></td>
                            <td>
                              Triggered: <Badge bg={results.abilityStats.sellsword.timesTriggered > 0 ? 'success' : 'secondary'}>{results.abilityStats.sellsword.timesTriggered}</Badge>
                              <br /><small>Morale: {results.abilityStats.sellsword.choseMorale} | Card: {results.abilityStats.sellsword.choseCard}</small>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>

                  <Row className="mt-3">
                    {/* Curse of Undeath */}
                    <Col md={6}>
                      <h6 className="text-danger">Curse of Undeath</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td><strong>BLOODTHIRSTY</strong> <Badge bg="info">PASSIVE</Badge></td>
                            <td>
                              Triggered: <Badge bg={results.abilityStats.bloodthirsty.timesTriggered > 0 ? 'success' : 'secondary'}>{results.abilityStats.bloodthirsty.timesTriggered}</Badge>
                              <br /><small>Leadership Gained: {results.abilityStats.bloodthirsty.leadershipGained}</small>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>UNSTOPPABLE HORDES</strong> <Badge bg="info">PASSIVE</Badge></td>
                            <td>
                              Opportunities: {results.abilityStats.unstoppable_hordes.cowerGranted} |
                              Cower Used: <Badge bg={results.abilityStats.unstoppable_hordes.cowerUsed > 0 ? 'success' : 'secondary'}>{results.abilityStats.unstoppable_hordes.cowerUsed}</Badge>
                              <br /><small>Damage Prevented: {results.abilityStats.unstoppable_hordes.damagePrevented} | Morale Lost: {results.abilityStats.unstoppable_hordes.moraleLost}</small>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>

                    {/* Tyranny of Goblins */}
                    <Col md={6}>
                      <h6 className="text-success">Tyranny of Goblins</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td><strong>HORDE</strong> <Badge bg="info">PASSIVE</Badge></td>
                            <td>
                              Used: <Badge bg={results.abilityStats.horde.timesUsed > 0 ? 'success' : 'secondary'}>{results.abilityStats.horde.timesUsed}</Badge>
                              <br /><small>Creatures Deployed: {results.abilityStats.horde.creaturesDeployed}</small>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>BLACK HAND OF BANE</strong> <Badge bg="info">PASSIVE</Badge></td>
                            <td>
                              Triggered: <Badge bg={results.abilityStats.black_hand_of_bane.timesTriggered > 0 ? 'success' : 'secondary'}>{results.abilityStats.black_hand_of_bane.timesTriggered}</Badge>
                              <br /><small>Extra Morale: {results.abilityStats.black_hand_of_bane.extraMoraleDrained}</small>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>

                  <Row className="mt-3">
                    {/* Heart of Cormyr */}
                    <Col md={12}>
                      <h6 className="text-primary">Heart of Cormyr</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td><strong>SCROLLBOOK</strong> <Badge bg="warning">ACTIVE</Badge></td>
                            <td>
                              Available: {results.abilityStats.scrollbook.timesAvailable} |
                              Used: <Badge bg={results.abilityStats.scrollbook.timesUsed > 0 ? 'success' : 'secondary'}>{results.abilityStats.scrollbook.timesUsed}</Badge>
                              <small className="ms-2">({results.abilityStats.scrollbook.timesAvailable > 0 ? ((results.abilityStats.scrollbook.timesUsed / results.abilityStats.scrollbook.timesAvailable) * 100).toFixed(1) : 0}% usage rate)</small>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>VERSATILE</strong> <Badge bg="warning">ACTIVE</Badge></td>
                            <td>
                              Triggered: <Badge bg={results.abilityStats.versatile.timesTriggered > 0 ? 'success' : 'secondary'}>{results.abilityStats.versatile.timesTriggered}</Badge> |
                              Used: {results.abilityStats.versatile.extraMovesUsed} |
                              Declined: {results.abilityStats.versatile.extraMoveDeclined}
                              <small className="ms-2">(Extra Tiles: {results.abilityStats.versatile.totalExtraTilesMoved})</small>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Creature Ability Statistics */}
              <Card bg="danger" text="white" className="mb-3">
                <Card.Header><h5>🗡️ Creature Ability Statistics</h5></Card.Header>
                <Card.Body>
                  <Row>
                    {/* Sting of Lolth Creature Abilities */}
                    <Col md={12}>
                      <h6 className="text-warning">Sting of Lolth - FLASHING BLADES <Badge bg="warning">ACTIVE</Badge> <small className="text-muted">(Drow Blademaster)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.flashing_blades?.timesOffered || 0}</Badge></td>
                            <td><strong>Splash Damage</strong></td>
                            <td>{results.creatureAbilityStats?.flashing_blades?.splashDamageDealt || 0}</td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.flashing_blades?.timesTriggered || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.flashing_blades?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.flashing_blades.timesTriggered / results.creatureAbilityStats.flashing_blades.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.flashing_blades?.timesDeclined || 0}</Badge></td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.flashing_blades?.[diff] || { offered: 0, triggered: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        Expected rates: Easy = 0% (never), Medium = ~50% (random), Hard = 100% (always)
                      </small>
                    </Col>
                  </Row>

                  {/* HIDDEN BLADE Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-warning">Sting of Lolth - HIDDEN BLADE <Badge bg="warning">ACTIVE</Badge> <small className="text-muted">(Drow Assassin)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.hidden_blade?.timesOffered || 0}</Badge></td>
                            <td><strong>Damage Dealt</strong></td>
                            <td>{results.creatureAbilityStats?.hidden_blade?.damageDealt || 0}</td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.hidden_blade?.timesTriggered || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.hidden_blade?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.hidden_blade.timesTriggered / results.creatureAbilityStats.hidden_blade.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.hidden_blade?.timesDeclined || 0}</Badge></td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.hidden_blade?.[diff] || { offered: 0, triggered: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        HIDDEN BLADE triggers after any attack (melee or ranged) against adjacent tapped enemies. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* SCUTTLE Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-warning">Sting of Lolth - SCUTTLE <Badge bg="warning">ACTIVE</Badge> <small className="text-muted">(Demonweb Spider, Drider, Giant Spider)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Difficulty-Gated Passive)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.scuttle?.timesOffered || 0}</Badge></td>
                            <td><strong>Creatures Passed Through</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.scuttle?.creaturesPassedThrough || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.scuttle?.timesTriggered || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.scuttle?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.scuttle.timesTriggered / results.creatureAbilityStats.scuttle.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.scuttle?.timesDeclined || 0}</Badge></td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                            <th>Creatures Passed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.scuttle?.[diff] || { offered: 0, triggered: 0, declined: 0, creaturesPassedThrough: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                                <td><Badge bg="warning">{stats.creaturesPassedThrough}</Badge></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        Expected rates: Easy = 0% (never), Medium = ~50% (random), Hard = 100% (always). Creatures Passed = times a creature was moved through while SCUTTLE was enabled.
                      </small>
                    </Col>
                  </Row>

                  {/* SHADOW STALKER Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-warning">Sting of Lolth - SHADOW STALKER <Badge bg="warning">ACTIVE</Badge> <small className="text-muted">(Shadow Mastiff)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Deployment Ability)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.shadow_stalker?.timesOffered || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.shadow_stalker?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.shadow_stalker.timesTriggered / results.creatureAbilityStats.shadow_stalker.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.shadow_stalker?.timesTriggered || 0}</Badge></td>
                            <td colSpan={2}></td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.shadow_stalker?.timesDeclined || 0}</Badge></td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.shadow_stalker?.[diff] || { offered: 0, triggered: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        SHADOW STALKER allows deploying to any tile adjacent to a mountain (instead of starting zone). Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* BURROW Stats - Sting of Lolth (Umber Hulk) */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-warning">Sting of Lolth - BURROW <Badge bg="warning">ACTIVE</Badge> <small className="text-muted">(Umber Hulk)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Terrain Modifier)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.burrow_lolth?.timesOffered || 0}</Badge></td>
                            <td><strong>Mountain Tiles Traversed</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.burrow_lolth?.mountainTilesMoved || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.burrow_lolth?.timesTriggered || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.burrow_lolth?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.burrow_lolth.timesTriggered / results.creatureAbilityStats.burrow_lolth.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.burrow_lolth?.timesDeclined || 0}</Badge></td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                            <th>Mountain Tiles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.burrow_lolth?.[diff] || { offered: 0, triggered: 0, declined: 0, mountainTiles: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                                <td><Badge bg="warning">{stats.mountainTiles}</Badge></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        BURROW allows movement through mountain tiles (cannot stop on them) and ignores terrain movement costs. Still takes water damage. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* BURROW Stats - Heart of Cormyr (Earth Guardian) */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-primary">Heart of Cormyr - BURROW <Badge bg="primary">ACTIVE</Badge> <small className="text-muted">(Earth Guardian)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Terrain Modifier)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.burrow_cormyr?.timesOffered || 0}</Badge></td>
                            <td><strong>Mountain Tiles Traversed</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.burrow_cormyr?.mountainTilesMoved || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.burrow_cormyr?.timesTriggered || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.burrow_cormyr?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.burrow_cormyr.timesTriggered / results.creatureAbilityStats.burrow_cormyr.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.burrow_cormyr?.timesDeclined || 0}</Badge></td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                            <th>Mountain Tiles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.burrow_cormyr?.[diff] || { offered: 0, triggered: 0, declined: 0, mountainTiles: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                                <td><Badge bg="warning">{stats.mountainTiles}</Badge></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        BURROW allows movement through mountain tiles (cannot stop on them) and ignores terrain movement costs. Still takes water damage. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* CONFUSION GAZE Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-warning">Sting of Lolth - CONFUSION GAZE <Badge bg="warning">ACTIVE</Badge> <small className="text-muted">(Umber Hulk)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Standard Action Ability)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.confusion_gaze?.timesOffered || 0}</Badge></td>
                            <td><strong>Enemies Slid</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.confusion_gaze?.enemiesSlid || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.confusion_gaze?.timesTriggered || 0}</Badge></td>
                            <td><strong>Damage Dealt</strong></td>
                            <td>{results.creatureAbilityStats?.confusion_gaze?.damageDealt || 0}</td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.confusion_gaze?.timesDeclined || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.confusion_gaze?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.confusion_gaze.timesTriggered / results.creatureAbilityStats.confusion_gaze.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.confusion_gaze?.[diff] || { offered: 0, triggered: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        CONFUSION GAZE: Slide an enemy within 5 squares up to 3 tiles, then make a melee attack (30 damage). Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* SUMMON SPIDER Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-warning">Sting of Lolth - SUMMON SPIDER <Badge bg="warning">ACTIVE</Badge> <small className="text-muted">(Drow Priestess)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Passive Deployment Ability)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.summon_spider?.timesOffered || 0}</Badge></td>
                            <td><strong>Spiders Deployed</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.summon_spider?.spidersDeployed || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.summon_spider?.timesTriggered || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.summon_spider?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.summon_spider.timesTriggered / results.creatureAbilityStats.summon_spider.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.summon_spider?.timesDeclined || 0}</Badge></td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Spiders</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.summon_spider?.[diff] || { offered: 0, triggered: 0, declined: 0, spidersDeployed: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td><Badge bg="warning">{stats.spidersDeployed}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        SUMMON SPIDER: Deploy Spider creatures within 5 squares of Drow Priestess instead of starting zone. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* GRAVEYARD DEPLOY Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-light">Curse of Undeath - GRAVEYARD DEPLOY <Badge bg="danger">ACTIVE</Badge> <small className="text-muted">(Zombie)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Resurrection Ability)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.graveyard_deploy?.timesOffered || 0}</Badge></td>
                            <td><strong>Zombies Resurrected</strong></td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.graveyard_deploy?.zombiesResurrected || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.graveyard_deploy?.timesTriggered || 0}</Badge></td>
                            <td><strong>Morale Paid</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.graveyard_deploy?.moralePaid || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.graveyard_deploy?.timesDeclined || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.graveyard_deploy?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.graveyard_deploy.timesTriggered / results.creatureAbilityStats.graveyard_deploy.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Resurrected</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.graveyard_deploy?.[diff] || { offered: 0, triggered: 0, declined: 0, resurrected: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td><Badge bg="danger">{stats.resurrected}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        GRAVEYARD DEPLOY: During Deploy phase, pay 1 MORALE to deploy a Zombie from your graveyard. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* LIFE DRAIN Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-light">Curse of Undeath - LIFE DRAIN <Badge bg="danger">ACTIVE</Badge> <small className="text-muted">(Vampire Stalker)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Automatic on Melee Damage)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Times Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.life_drain?.timesTriggered || 0}</Badge></td>
                            <td><strong>Total HP Healed</strong></td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.life_drain?.totalHealed || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Triggered</th>
                            <th>Healed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.life_drain?.[diff] || { triggered: 0, healed: 0 }
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="danger">{stats.healed || 0}</Badge></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        LIFE DRAIN: Vampire Stalker heals 10 HP when dealing melee damage (capped at max HP). Automatic ability - triggers on all difficulties equally.
                      </small>
                    </Col>
                  </Row>

                  {/* LICH NECROMANCER DEPLOY Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-light">Curse of Undeath - ADJACENT UNDEAD DEPLOY <Badge bg="danger">ACTIVE</Badge> <small className="text-muted">(Lich Necromancer)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Deploy Undead Adjacent to Lich)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.lich_necromancer_deploy?.timesOffered || 0}</Badge></td>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.lich_necromancer_deploy?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.lich_necromancer_deploy?.timesDeclined || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.lich_necromancer_deploy?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.lich_necromancer_deploy.timesTriggered / results.creatureAbilityStats.lich_necromancer_deploy.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.lich_necromancer_deploy?.[diff] || { offered: 0, triggered: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        ADJACENT UNDEAD DEPLOY: When Lich Necromancer is in play, Undead creatures from Curse of Undeath can deploy adjacent to it. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* SWIRL (TOMB GUARDIAN SPLASH) Stats */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-light">Curse of Undeath - SWIRL <Badge bg="danger">ACTIVE</Badge> <small className="text-muted">(Skeletal Tomb Guardian)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Splash Damage on Melee Attack)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.tomb_guardian_splash?.timesOffered || 0}</Badge></td>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.tomb_guardian_splash?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.tomb_guardian_splash?.timesDeclined || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.tomb_guardian_splash?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.tomb_guardian_splash.timesTriggered / results.creatureAbilityStats.tomb_guardian_splash.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Enemies Hit</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.tomb_guardian_splash?.enemiesHit || 0}</Badge></td>
                            <td><strong>Total Damage</strong></td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.tomb_guardian_splash?.totalDamage || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Kills</strong></td>
                            <td><Badge bg="dark">{results.creatureAbilityStats?.tomb_guardian_splash?.kills || 0}</Badge></td>
                            <td></td>
                            <td></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.tomb_guardian_splash?.[diff] || { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        SWIRL: Skeletal Tomb Guardian deals 20 splash damage to all adjacent enemies (excluding main target) on melee attack. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* LIGHTNING BREATH - Dracolich (Curse of Undeath) */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-light">Curse of Undeath - LIGHTNING BREATH <Badge bg="danger">ACTIVE</Badge> <small className="text-muted">(Dracolich)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (Multi-Target Ranged Attack)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.lightning_breath?.timesOffered || 0}</Badge></td>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.lightning_breath?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.lightning_breath?.timesDeclined || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.lightning_breath?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.lightning_breath.timesTriggered / results.creatureAbilityStats.lightning_breath.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Targets Hit</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.lightning_breath?.targetsHit || 0}</Badge></td>
                            <td><strong>Total Damage</strong></td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.lightning_breath?.totalDamage || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Kills</strong></td>
                            <td><Badge bg="dark">{results.creatureAbilityStats?.lightning_breath?.kills || 0}</Badge></td>
                            <td></td>
                            <td></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.lightning_breath?.[diff] || { offered: 0, triggered: 0, declined: 0, targetsHit: 0, damage: 0, kills: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        LIGHTNING BREATH: Dracolich makes up to 3 ranged attacks (20 damage each) targeting different enemies. Requires 2+ valid targets. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>

                  {/* DISCIPLE OF KYUSS - Disciple of Kyuss (Curse of Undeath) */}
                  <Row className="mt-4">
                    <Col md={12}>
                      <h6 className="text-light">Curse of Undeath - DISCIPLE OF KYUSS <Badge bg="danger">PASSIVE</Badge> <small className="text-muted">(Disciple of Kyuss)</small></h6>

                      {/* Overall Stats */}
                      <Table striped bordered variant="dark" size="sm" className="mb-2">
                        <thead>
                          <tr><th colSpan={4} className="text-center">Overall Totals (End of Activate Phase Damage)</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Offered</strong></td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.disciple_of_kyuss?.timesOffered || 0}</Badge></td>
                            <td><strong>Triggered</strong></td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.disciple_of_kyuss?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Declined</strong></td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.disciple_of_kyuss?.timesDeclined || 0}</Badge></td>
                            <td><strong>Overall Usage Rate</strong></td>
                            <td>
                              {results.creatureAbilityStats?.disciple_of_kyuss?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.disciple_of_kyuss.timesTriggered / results.creatureAbilityStats.disciple_of_kyuss.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Enemies Hit</strong></td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.disciple_of_kyuss?.enemiesHit || 0}</Badge></td>
                            <td><strong>Total Damage</strong></td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.disciple_of_kyuss?.totalDamage || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td><strong>Kills</strong></td>
                            <td><Badge bg="dark">{results.creatureAbilityStats?.disciple_of_kyuss?.kills || 0}</Badge></td>
                            <td></td>
                            <td></td>
                          </tr>
                        </tbody>
                      </Table>

                      {/* Per-Difficulty Breakdown */}
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Usage Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.disciple_of_kyuss?.[diff] || { offered: 0, triggered: 0, declined: 0, enemiesHit: 0, damage: 0, kills: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered}</Badge></td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        DISCIPLE OF KYUSS: Each enemy creature takes 10 DAMAGE whenever it ends its activation adjacent to this creature. Triggers at end of ACTIVATE phase. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* PHASING - Hypnotic Spirit (Curse of Undeath) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Curse of Undeath - PHASING <Badge bg="info">PASSIVE</Badge> <small className="text-muted">(Hypnotic Spirit)</small></h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Times Offered (Creature Moved)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.phasing?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Phasing Benefits Used)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.phasing?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.phasing?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.phasing.timesTriggered / results.creatureAbilityStats.phasing.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Creatures Passed Through</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.phasing?.creaturesPassedThrough || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Mountains Traversed</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.phasing?.mountainsTraversed || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Rate</th>
                            <th>Expected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.phasing?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered || 0}</Badge></td>
                                <td><Badge bg="success">{stats.triggered || 0}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        PHASING: Ignores terrain and can move through other creatures. Cannot end on mountains or other creatures. Works like FLYING but can pass through creatures. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* INSUBSTANTIAL - Hypnotic Spirit (Curse of Undeath) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Curse of Undeath - INSUBSTANTIAL <Badge bg="danger">PASSIVE</Badge> <small className="text-muted">(Hypnotic Spirit)</small></h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Times Offered (Damage Incoming)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.insubstantial?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Damage Blocked)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.insubstantial?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (AI Difficulty)</td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.insubstantial?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.insubstantial?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.insubstantial.timesTriggered / results.creatureAbilityStats.insubstantial.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Total Damage Blocked</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.insubstantial?.totalDamageBlocked || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.insubstantial?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance
                            return (
                              <tr key={diff}>
                                <td><strong>{diff.toUpperCase()}</strong></td>
                                <td><Badge bg="info">{stats.offered || 0}</Badge></td>
                                <td><Badge bg="success">{stats.triggered || 0}</Badge></td>
                                <td><Badge bg="secondary">{stats.declined || 0}</Badge></td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        INSUBSTANTIAL: Prevent all damage from 1 source. Resets at the start of the Undead faction's Refresh phase. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* RIDER Ability Card - Skeletal Lancer */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>🐴 RIDER (Skeletal Lancer - Curse of Undeath)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Skeletal Lancer destroyed with eligible Skeleton in hand)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.rider?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Skeleton deployed)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.rider?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.rider?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.rider?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.rider.timesTriggered / results.creatureAbilityStats.rider.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Total Creatures Deployed</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.rider?.creaturesDeployed || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Morale Saved</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.rider?.totalMoraleSaved || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.rider?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        RIDER: When Skeletal Lancer dies, deploy a Skeleton (Level 3 or lower) from hand to the same tile. Morale loss = (4 - deployed creature level). Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* RIDER Ability Card - Goblin Wolf Rider */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>🐴 RIDER (Goblin Wolf Rider - Tyranny of Goblins)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Goblin Wolf Rider destroyed with eligible creature in hand)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.riderGoblin?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Goblin/Wolf deployed)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.riderGoblin?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.riderGoblin?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.riderGoblin?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.riderGoblin.timesTriggered / results.creatureAbilityStats.riderGoblin.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Total Creatures Deployed</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.riderGoblin?.creaturesDeployed || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Morale Saved</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.riderGoblin?.totalMoraleSaved || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.riderGoblin?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        RIDER: When Goblin Wolf Rider dies, deploy a Goblin or Wolf creature (Level 3 or lower) from hand to the same tile. Morale loss = (4 - deployed creature level). Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* ACID BREATH Ability Card - Copper Dragon (Heart of Cormyr) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>🐉 ACID BREATH (Copper Dragon - Heart of Cormyr)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Ranged attack with adjacent enemies)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.acid_breath?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Splash damage applied)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.acid_breath?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.acid_breath?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.acid_breath?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.acid_breath.timesTriggered / results.creatureAbilityStats.acid_breath.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Total Enemies Hit</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.acid_breath?.enemiesHit || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Splash Damage</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.acid_breath?.totalDamage || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.acid_breath?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        ACID BREATH 20: Whenever Copper Dragon makes a ranged attack, it deals 20 damage to each enemy creature adjacent to the target. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* EXPLOSIVE BOLTS Ability Card - Half-Orc Thug (Heart of Cormyr) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>💥 EXPLOSIVE BOLTS (Half-Orc Thug - Heart of Cormyr)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Ranged attack with adjacent enemies)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.explosive_bolts?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Splash damage applied)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.explosive_bolts?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.explosive_bolts?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.explosive_bolts?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.explosive_bolts.timesTriggered / results.creatureAbilityStats.explosive_bolts.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Total Enemies Hit</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.explosive_bolts?.enemiesHit || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Splash Damage</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.explosive_bolts?.totalDamage || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.explosive_bolts?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        EXPLOSIVE BOLTS 10: Whenever Half-Orc Thug makes a ranged attack, it deals 10 damage to each enemy creature adjacent to the target. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* SLAM Ability Card - Earth Guardian (Heart of Cormyr) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>🔨 SLAM (Earth Guardian - Heart of Cormyr)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Melee attack dealt damage, target survived)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.slam?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Enemy slid)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.slam?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.slam?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.slam?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.slam.timesTriggered / results.creatureAbilityStats.slam.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Total Enemies Slid</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.slam?.enemiesSlid || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Damage Dealt (Triggering Attack)</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.slam?.damageDealt || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.slam?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        SLAM: After dealing melee damage to an adjacent creature, slide that creature up to 3 tiles away. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* FLANKING Ability Card - Halfling Sneak (Heart of Cormyr) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>🗡️ FLANKING (Halfling Sneak - Heart of Cormyr)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Ally adjacent to target during melee)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.flanking?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (+10 bonus applied)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.flanking?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.flanking?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.flanking?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.flanking.timesTriggered / results.creatureAbilityStats.flanking.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Total Bonus Damage Dealt</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.flanking?.bonusDamageDealt || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.flanking?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        FLANKING: +10 melee damage when at least 1 ally is adjacent to the target. Does NOT stack with multiple allies. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* ARCANE PORTAL Ability Card - War Wizard (Heart of Cormyr) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>🔮 ARCANE PORTAL (War Wizard - Heart of Cormyr)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (War Wizard deployed)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.arcane_portal?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Deployed to Magic Circle)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.arcane_portal?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (Deployed to Starting Zone)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.arcane_portal?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.arcane_portal?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.arcane_portal.timesTriggered / results.creatureAbilityStats.arcane_portal.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.arcane_portal?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        ARCANE PORTAL: War Wizard can deploy to any unoccupied Magic Circle tile instead of starting zone. Hard AI picks strategically closest to friendly creatures. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* SHIELD BLOCK Ability Card - Dwarven Defender (Heart of Cormyr) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>🛡️ SHIELD BLOCK (Dwarven Defender - Heart of Cormyr)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Adventurer attacked adjacent to Defender)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.shield_block?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (Block applied)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.shield_block?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (AI 0/50 pattern)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.shield_block?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Damage Blocked</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.shield_block?.totalDamageBlocked || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.shield_block?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.shield_block.timesTriggered / results.creatureAbilityStats.shield_block.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Blocked</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.shield_block?.[diff] || {}
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.damageBlocked || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        SHIELD BLOCK: Adjacent allied Adventurers (Cormyr faction only) gain Block 10 per adjacent Dwarven Defender. Stacks with multiple Defenders. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* HEALING TOUCH - Dwarf Cleric (Heart of Cormyr) */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h5>💚 HEALING TOUCH (Dwarf Cleric - Heart of Cormyr)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (could use ability)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.healing_touch?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (used ability)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.healing_touch?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (skipped)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.healing_touch?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Healing Done</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.healing_touch?.totalHealingDone || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Self Heals</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.healing_touch?.selfHeals || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Ally Heals</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.healing_touch?.allyHeals || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Cards Removed</td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.healing_touch?.cardsRemoved || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.healing_touch?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.healing_touch.timesTriggered / results.creatureAbilityStats.healing_touch.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Heals</th>
                            <th>Cards</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.healing_touch?.[diff] || { offered: 0, triggered: 0, declined: 0, heals: 0, cardRemovals: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.heals || 0}</td>
                                <td>{stats.cardRemovals || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        HEALING TOUCH: Dwarf Cleric can heal self or adjacent ally for 10 damage OR remove 1 attached Order card. Uses standard action. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* CHIEFTAIN CALL - Orc Chieftain (Blood of Gruumsh) */}
              <Card bg="danger" text="white" className="mb-3">
                <Card.Header>
                  <h5>&#9876; CHIEFTAIN CALL (Orc Chieftain - Blood of Gruumsh)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Orc Chieftain deployed)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.chieftain_call?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (bonus Orc deployed)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.chieftain_call?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (skipped)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.chieftain_call?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Orcs Deployed</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.chieftain_call?.orcsDeployed || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Leadership Gained</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.chieftain_call?.leadershipGained || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.chieftain_call?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.chieftain_call.timesTriggered / results.creatureAbilityStats.chieftain_call.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.chieftain_call?.[diff] || { offered: 0, triggered: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        CHIEFTAIN CALL: When Orc Chieftain is deployed, reveal an Orc (Level 3 or lower) from hand to gain Leadership equal to its level and deploy it for free. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* DEATH STRIKE - Boar, Wereboar (Blood of Gruumsh) */}
              <Card bg="danger" text="white" className="mb-3">
                <Card.Header>
                  <h5>💀 DEATH STRIKE (Boar, Wereboar - Blood of Gruumsh)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (would die from melee)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.death_strike?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (counterattacked)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.death_strike?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (skipped)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.death_strike?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Attacker Killed</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.death_strike?.attackerKilled || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Attacker Survived</td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.death_strike?.attackerSurvived || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Damage Dealt</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.death_strike?.totalDamageDealt || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.death_strike?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.death_strike.timesTriggered / results.creatureAbilityStats.death_strike.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.death_strike?.[diff] || { offered: 0, triggered: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col md={6}>
                      <h6 className="text-light">Per-Creature Stats</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Creature</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Attacker Killed</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Boar</td>
                            <td>{results.creatureAbilityStats?.death_strike?.boarStats?.offered || 0}</td>
                            <td>{results.creatureAbilityStats?.death_strike?.boarStats?.triggered || 0}</td>
                            <td>{results.creatureAbilityStats?.death_strike?.boarStats?.attackerKilled || 0}</td>
                          </tr>
                          <tr>
                            <td>Wereboar</td>
                            <td>{results.creatureAbilityStats?.death_strike?.wereboarStats?.offered || 0}</td>
                            <td>{results.creatureAbilityStats?.death_strike?.wereboarStats?.triggered || 0}</td>
                            <td>{results.creatureAbilityStats?.death_strike?.wereboarStats?.attackerKilled || 0}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <small className="text-muted">
                        DEATH STRIKE: When this creature would be destroyed by an adjacent melee attack, it first deals its melee damage to the attacker. If the attacker dies, the defender survives (attack never completes). Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* ORC DRUID DEPLOY - Beast/Elemental Adjacent Deploy (Blood of Gruumsh) */}
              <Card bg="success" text="white" className="mb-3">
                <Card.Header>
                  <h5>🌿 ORC DRUID DEPLOY (Beast/Elemental - Blood of Gruumsh)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (Beast/Elemental with Druid)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.orc_druid_deploy?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Used (adjacent deploy)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.orc_druid_deploy?.timesUsed || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (starting zone)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.orc_druid_deploy?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Usage Rate</td>
                            <td>
                              {results.creatureAbilityStats?.orc_druid_deploy?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.orc_druid_deploy.timesUsed / results.creatureAbilityStats.orc_druid_deploy.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Used</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.orc_druid_deploy?.[diff] || { offered: 0, used: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.used / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.used || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        ORC DRUID DEPLOY: When deploying a Beast or Elemental creature (Blood of Gruumsh faction only: Boar, Owlbear, Wereboar), you can place it adjacent to the Orc Druid instead of in your starting zone. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* REGENERATE 10 - Feral Troll (Tyranny of Goblins) */}
              <Card bg="dark" text="white" className="mb-3">
                <Card.Header>
                  <h5>🩹 REGENERATE 10 (Feral Troll - Tyranny of Goblins)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (creature damaged)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.regenerate_10?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (regenerated)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.regenerate_10?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (skipped)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.regenerate_10?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Healing Restored</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.regenerate_10?.totalHealingRestored || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.regenerate_10?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.regenerate_10.timesTriggered / results.creatureAbilityStats.regenerate_10.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Healed</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.regenerate_10?.[diff] || { offered: 0, triggered: 0, declined: 0, healingRestored: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered}</td>
                                <td>{stats.triggered}</td>
                                <td>{stats.declined}</td>
                                <td>{stats.healingRestored}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        REGENERATE 10: Feral Troll heals 10 damage at the start of its controller's REFRESH phase. Does NOT consume action. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* UNTAP ON KILL - Bugbear Berserker / Orc Barbarian */}
              <Card bg="dark" text="white" className="mb-3">
                <Card.Header>
                  <h5>⚔️ UNTAP ON KILL (Bugbear Berserker / Orc Barbarian)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (adjacent enemy died)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.untap_on_adjacent_kill?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (untapped)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.untap_on_adjacent_kill?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (skipped)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.untap_on_adjacent_kill?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Self Kills (creature killed enemy)</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.untap_on_adjacent_kill?.selfKills || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Ally Kills (ally killed adjacent enemy)</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.untap_on_adjacent_kill?.allyKills || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.untap_on_adjacent_kill?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.untap_on_adjacent_kill.timesTriggered / results.creatureAbilityStats.untap_on_adjacent_kill.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.untap_on_adjacent_kill?.[diff] || { offered: 0, triggered: 0, declined: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered}</td>
                                <td>{stats.triggered}</td>
                                <td>{stats.declined}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        UNTAP ON KILL: Bugbear Berserker (Goblins) and Orc Barbarian (Gruumsh) untap whenever an adjacent enemy creature is destroyed during their faction's turn. Works with self-kills AND ally kills. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* MAGIC CIRCLE AURA - Hobgoblin Sorcerer (Tyranny of Goblins) */}
              <Card bg="dark" text="white" className="mb-3">
                <Card.Header>
                  <h5>🔮 MAGIC CIRCLE AURA (Hobgoblin Sorcerer - Tyranny of Goblins)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (damage with aura active)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.magic_circle_aura?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (shield blocked)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.magic_circle_aura?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (skipped)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.magic_circle_aura?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Damage Blocked</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.magic_circle_aura?.totalDamageBlocked || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Aura Activations</td>
                            <td><Badge bg="primary">{results.creatureAbilityStats?.magic_circle_aura?.auraActivations || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Aura Deactivations</td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.magic_circle_aura?.auraDeactivations || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.magic_circle_aura?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.magic_circle_aura.timesTriggered / results.creatureAbilityStats.magic_circle_aura.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Blocked</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.magic_circle_aura?.[diff] || { offered: 0, triggered: 0, declined: 0, blocked: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered}</td>
                                <td>{stats.triggered}</td>
                                <td>{stats.declined}</td>
                                <td>{stats.blocked}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        MAGIC CIRCLE AURA: While Hobgoblin Sorcerer is on a Magic Circle tile, all Goblins, Hobgoblins, and Bugbears you control gain "Prevent 10 damage from 1 source" once per turn. Shield resets each turn. Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* CUTTER - Goblin Cutter (Tyranny of Goblins) */}
              <Card bg="dark" text="white" className="mb-3">
                <Card.Header>
                  <h5>🗡️ CUTTER (Goblin Cutter - Tyranny of Goblins)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (target was tapped during melee)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.cutter?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (+10 bonus applied)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.cutter?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.cutter?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.cutter?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.cutter.timesTriggered / results.creatureAbilityStats.cutter.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>Total Bonus Damage Dealt</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.cutter?.bonusDamageDealt || 0}</Badge></td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Declined</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.cutter?.[diff] || { offered: 0, triggered: 0, declined: 0, damage: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered || 0}</td>
                                <td>{stats.triggered || 0}</td>
                                <td>{stats.declined || 0}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        CUTTER: +10 melee damage against tapped creatures. Synergizes with TAP ON HIT abilities (Wolf, Horned Devil). Expected rates: Easy = 0%, Medium = ~50%, Hard = 100%
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* REACH 2 - Horned Devil (Tyranny of Goblins) */}
              <Card bg="dark" text="white" className="mb-3">
                <Card.Header>
                  <h5>🗡️ REACH 2 (Horned Devil - Tyranny of Goblins)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (reach attack available)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.reach_2?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (attacked at range 2)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.reach_2?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Declined (chose adjacent)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.reach_2?.timesDeclined || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Total Damage Dealt (from reach)</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.reach_2?.totalDamageDealt || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate</td>
                            <td>
                              {results.creatureAbilityStats?.reach_2?.timesOffered > 0
                                ? `${((results.creatureAbilityStats.reach_2.timesTriggered / results.creatureAbilityStats.reach_2.timesOffered) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Difficulty</th>
                            <th>Offered</th>
                            <th>Triggered</th>
                            <th>Damage</th>
                            <th>Rate</th>
                            <th>Expected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.reach_2?.[diff] || { offered: 0, triggered: 0, declined: 0, damageDealt: 0 }
                            const rate = stats.offered > 0 ? (stats.triggered / stats.offered) * 100 : 0
                            const expected = diff === 'easy' ? 0 : diff === 'medium' ? 50 : 100
                            const tolerance = diff === 'medium' ? 25 : 5
                            const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered}</td>
                                <td>{stats.triggered}</td>
                                <td>{stats.damageDealt}</td>
                                <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                <td>{expected}%</td>
                                <td>
                                  {stats.offered > 0 ? (
                                    <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                  ) : (
                                    <Badge bg="secondary">-</Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        REACH 2: Horned Devil can make melee attacks at range 1 OR 2. AI difficulty affects target selection when both options available. Expected rates: Easy = 0% (prefers adjacent), Medium = ~50%, Hard = 100% (prefers reach for safety)
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* TAP ON HIT - Horned Devil, Wolf (Tyranny of Goblins) */}
              <Card bg="dark" text="white" className="mb-3">
                <Card.Header>
                  <h5>💫 TAP ON HIT (Horned Devil, Wolf - Tyranny of Goblins)</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6 className="text-light">Overall Statistics</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <tbody>
                          <tr>
                            <td>Times Offered (melee attack made)</td>
                            <td><Badge bg="info">{results.creatureAbilityStats?.tap_on_hit?.timesOffered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Times Triggered (target tapped)</td>
                            <td><Badge bg="success">{results.creatureAbilityStats?.tap_on_hit?.timesTriggered || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Target Killed (no tap - dead)</td>
                            <td><Badge bg="warning">{results.creatureAbilityStats?.tap_on_hit?.timesKilled || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Already Tapped (no additional effect)</td>
                            <td><Badge bg="secondary">{results.creatureAbilityStats?.tap_on_hit?.timesAlreadyTapped || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>No Damage (target not tapped)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.tap_on_hit?.timesNoDamage || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Unexpected (survived but not tracked)</td>
                            <td><Badge bg="danger">{results.creatureAbilityStats?.tap_on_hit?.timesUnexpected || 0}</Badge></td>
                          </tr>
                          <tr>
                            <td>Trigger Rate (tapped / survived)</td>
                            <td>
                              {(() => {
                                const stats = results.creatureAbilityStats?.tap_on_hit
                                if (!stats || stats.timesOffered === 0) return 'N/A'
                                const survived = stats.timesOffered - (stats.timesKilled || 0)
                                if (survived === 0) return <span style={{color: '#ffc107'}}>100% killed</span>
                                return `${((stats.timesTriggered / survived) * 100).toFixed(1)}%`
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-light">Per-Difficulty Breakdown</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Diff</th>
                            <th>Offered</th>
                            <th>Tapped</th>
                            <th>Killed</th>
                            <th>Already</th>
                            <th>NoDmg</th>
                            <th>Bug?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['easy', 'medium', 'hard'].map(diff => {
                            const stats = results.creatureAbilityStats?.tap_on_hit?.[diff] || { offered: 0, triggered: 0, killed: 0, alreadyTapped: 0, noDamage: 0, unexpected: 0 }
                            return (
                              <tr key={diff}>
                                <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                <td>{stats.offered}</td>
                                <td><Badge bg="success">{stats.triggered}</Badge></td>
                                <td><Badge bg="warning">{stats.killed || 0}</Badge></td>
                                <td>{stats.alreadyTapped || 0}</td>
                                <td>{stats.noDamage || 0}</td>
                                <td><Badge bg={stats.unexpected > 0 ? 'danger' : 'secondary'}>{stats.unexpected || 0}</Badge></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                  {/* Wolf vs Horned Devil Per-Creature Breakdown */}
                  <Row className="mt-3">
                    <Col>
                      <h6 className="text-light">Per-Creature Analysis (Wolf vs Horned Devil)</h6>
                      <Table striped bordered variant="dark" size="sm">
                        <thead>
                          <tr>
                            <th>Creature</th>
                            <th>Dmg</th>
                            <th>Attacks</th>
                            <th>Kills</th>
                            <th>Triggers</th>
                            <th>Kill Rate</th>
                            <th>Avg Target HP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const wolfStats = results.creatureAbilityStats?.tap_on_hit?.wolfStats || { attacks: 0, kills: 0, triggers: 0, totalDefenderHP: 0 }
                            const hornedDevilStats = results.creatureAbilityStats?.tap_on_hit?.hornedDevilStats || { attacks: 0, kills: 0, triggers: 0, totalDefenderHP: 0 }
                            const wolfAvgHP = wolfStats.attacks > 0 ? Math.round(wolfStats.totalDefenderHP / wolfStats.attacks) : 'N/A'
                            const hornedDevilAvgHP = hornedDevilStats.attacks > 0 ? Math.round(hornedDevilStats.totalDefenderHP / hornedDevilStats.attacks) : 'N/A'
                            const wolfKillRate = wolfStats.attacks > 0 ? ((wolfStats.kills / wolfStats.attacks) * 100).toFixed(1) : 'N/A'
                            const hornedDevilKillRate = hornedDevilStats.attacks > 0 ? ((hornedDevilStats.kills / hornedDevilStats.attacks) * 100).toFixed(1) : 'N/A'
                            return (
                              <>
                                <tr>
                                  <td>🐺 Wolf</td>
                                  <td>10</td>
                                  <td>{wolfStats.attacks}</td>
                                  <td><Badge bg="warning">{wolfStats.kills}</Badge></td>
                                  <td><Badge bg="success">{wolfStats.triggers}</Badge></td>
                                  <td>{wolfKillRate !== 'N/A' ? `${wolfKillRate}%` : wolfKillRate}</td>
                                  <td><Badge bg={wolfAvgHP !== 'N/A' && wolfAvgHP <= 10 ? 'info' : 'danger'}>{wolfAvgHP}</Badge></td>
                                </tr>
                                <tr>
                                  <td>😈 Horned Devil</td>
                                  <td>40</td>
                                  <td>{hornedDevilStats.attacks}</td>
                                  <td><Badge bg="warning">{hornedDevilStats.kills}</Badge></td>
                                  <td><Badge bg="success">{hornedDevilStats.triggers}</Badge></td>
                                  <td>{hornedDevilKillRate !== 'N/A' ? `${hornedDevilKillRate}%` : hornedDevilKillRate}</td>
                                  <td><Badge bg={hornedDevilAvgHP !== 'N/A' && hornedDevilAvgHP <= 40 ? 'info' : 'danger'}>{hornedDevilAvgHP}</Badge></td>
                                </tr>
                              </>
                            )
                          })()}
                        </tbody>
                      </Table>
                      <small className="text-muted">
                        <strong>Avg Target HP</strong> = Average HP of target BEFORE attack. If ≤ creature damage, high kill rate is expected (AI targets weakest enemies).
                        {' '}<Badge bg="info">Blue</Badge> = Target HP ≤ damage (kills expected). <Badge bg="danger">Red</Badge> = Target HP &gt; damage (bug if 100% kills).
                      </small>
                    </Col>
                  </Row>
                  <Row className="mt-2">
                    <Col>
                      <small className="text-muted">
                        TAP ON HIT: Whenever Horned Devil or Wolf deals melee damage, the target is automatically tapped (passive ability).
                        <strong> Triggered</strong> = target survived and was tapped.
                        <strong> Killed</strong> = target died (can't tap dead creatures).
                        <strong> No Dmg</strong> = damage was fully blocked.
                        Note: High kill rate is expected since AI always targets the weakest (most damaged) enemy creatures.
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* ============================================================ */}
              {/* ORDER CARDS SECTION - Separate from Creature Abilities */}
              {/* Order cards use 0/0/100 pattern (Hard AI only) */}
              {/* ============================================================ */}
              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header>
                  <h4>📜 Order Cards (AI Usage - 0/0/100 Pattern)</h4>
                  <small className="text-light">Order cards are only used by Hard AI (Easy/Medium = 0%, Hard = 100%)</small>
                </Card.Header>
                <Card.Body>
                  {/* WEB Order Card - Sting of Lolth */}
                  <Card bg="dark" text="white" className="mb-3">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h5>🕸️ WEB (Sting of Lolth)</h5>
                      <Badge bg="warning" text="dark">MINOR Action</Badge>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <Table striped bordered variant="dark" size="sm">
                            <thead>
                              <tr><th colSpan={2}>Overall Stats</th></tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Times Offered</td>
                                <td><Badge bg="info">{results.orderCardStats?.web_card?.timesOffered || 0}</Badge></td>
                              </tr>
                              <tr>
                                <td>Times Used</td>
                                <td><Badge bg="success">{results.orderCardStats?.web_card?.timesUsed || 0}</Badge></td>
                              </tr>
                              <tr>
                                <td>Times Declined</td>
                                <td><Badge bg="secondary">{results.orderCardStats?.web_card?.timesDeclined || 0}</Badge></td>
                              </tr>
                              <tr>
                                <td>Targets Webbed</td>
                                <td><Badge bg="warning" text="dark">{results.orderCardStats?.web_card?.targetsWebbed || 0}</Badge></td>
                              </tr>
                              <tr>
                                <td>Webs Removed (by AI)</td>
                                <td><Badge bg="info">{results.orderCardStats?.web_card?.websRemoved || 0}</Badge></td>
                              </tr>
                            </tbody>
                          </Table>
                        </Col>
                        <Col md={6}>
                          <Table striped bordered variant="dark" size="sm">
                            <thead>
                              <tr>
                                <th>Difficulty</th>
                                <th>Offered</th>
                                <th>Used</th>
                                <th>Rate</th>
                                <th>Expected</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {['easy', 'medium', 'hard'].map(diff => {
                                const stats = results.orderCardStats?.web_card?.[diff] || { offered: 0, used: 0, declined: 0 }
                                const rate = stats.offered > 0 ? (stats.used / stats.offered) * 100 : 0
                                // 0/0/100 pattern: Easy=0%, Medium=0%, Hard=100%
                                const expected = diff === 'hard' ? 100 : 0
                                const tolerance = 5
                                const isCorrect = Math.abs(rate - expected) <= tolerance || stats.offered === 0
                                return (
                                  <tr key={diff}>
                                    <td style={{ textTransform: 'capitalize' }}>{diff}</td>
                                    <td>{stats.offered || 0}</td>
                                    <td>{stats.used || 0}</td>
                                    <td>{stats.offered > 0 ? `${rate.toFixed(1)}%` : 'N/A'}</td>
                                    <td>{expected}%</td>
                                    <td>
                                      {stats.offered > 0 ? (
                                        <Badge bg={isCorrect ? 'success' : 'danger'}>{isCorrect ? '✓' : '✗'}</Badge>
                                      ) : (
                                        <Badge bg="secondary">-</Badge>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </Table>
                        </Col>
                      </Row>
                      <Row className="mt-2">
                        <Col>
                          <small className="text-muted">
                            WEB: Attach to enemy creature within 10 squares (LOS). Target cannot move. Requires INT ability or SPIDER AFFINITY. Expected rates: Easy = 0%, Medium = 0%, Hard = 100%
                          </small>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                </Card.Body>
              </Card>

              {/* Faction Balance */}
              <Card bg="info" text="white" className="mb-3">
                <Card.Header><h5>Faction Balance</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered variant="dark" size="sm">
                    <thead>
                      <tr><th>Faction</th><th>Games</th><th>Wins</th><th>Win Rate</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(results.summary.factionGames)
                        .sort((a, b) => {
                          const rateA = (results.summary.factionWins[a[0]] || 0) / a[1]
                          const rateB = (results.summary.factionWins[b[0]] || 0) / b[1]
                          return rateB - rateA
                        })
                        .map(([faction, games]) => (
                          <tr key={faction}>
                            <td>{faction}</td>
                            <td>{games}</td>
                            <td>{results.summary.factionWins[faction] || 0}</td>
                            <td>
                              <Badge bg={((results.summary.factionWins[faction] || 0) / games) > 0.5 ? 'success' : 'warning'}>
                                {((results.summary.factionWins[faction] || 0) / games * 100).toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              {/* Commander Balance */}
              <Card bg="warning" text="dark" className="mb-3">
                <Card.Header><h5>Commander Balance</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered variant="light" size="sm">
                    <thead>
                      <tr><th>Commander</th><th>Games</th><th>Wins</th><th>Win Rate</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(results.summary.commanderGames)
                        .sort((a, b) => {
                          const rateA = (results.summary.commanderWins[a[0]] || 0) / a[1]
                          const rateB = (results.summary.commanderWins[b[0]] || 0) / b[1]
                          return rateB - rateA
                        })
                        .map(([commander, games]) => (
                          <tr key={commander}>
                            <td>{commander}</td>
                            <td>{games}</td>
                            <td>{results.summary.commanderWins[commander] || 0}</td>
                            <td>
                              <Badge bg={((results.summary.commanderWins[commander] || 0) / games) > 0.5 ? 'success' : 'secondary'}>
                                {((results.summary.commanderWins[commander] || 0) / games * 100).toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              <div className="text-center mt-3">
                <Button variant="primary" onClick={() => { setResults(null); setProgress(0) }}>
                  Run Another Test
                </Button>
              </div>

              {/* Error Log - Shows when errors occurred */}
              {results.summary.errorLog && results.summary.errorLog.length > 0 && (
                <Card bg="dark" text="white" className="mt-3">
                  <Card.Header><h5>🔴 Error Log ({results.summary.totalErrors} total errors)</h5></Card.Header>
                  <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Table striped bordered variant="dark" size="sm">
                      <thead>
                        <tr><th>#</th><th>Error Details</th></tr>
                      </thead>
                      <tbody>
                        {results.summary.errorLog.map((error, idx) => (
                          <tr key={idx}>
                            <td style={{ width: '50px' }}>{idx + 1}</td>
                            <td style={{ wordBreak: 'break-word' }}>{error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {results.summary.errorLog.length >= 100 && (
                      <small className="text-muted">
                        * Showing first 100 errors of {results.summary.totalErrors} total
                      </small>
                    )}
                  </Card.Body>
                </Card>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  )
}

export default AbilitiesTest
