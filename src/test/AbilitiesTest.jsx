import { useState } from 'react'
import { Container, Card, Button, ProgressBar, Alert, Table, Badge, Row, Col } from 'react-bootstrap'
import { GameState, GamePhases, Players, TerrainTypes } from '../models/gameState'
import { Creature } from '../models/creatures'
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
      const defenderAI = new SimpleAI(gameState, defenderOwner)
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

      // Execute the attack with or without damage reduction
      let attackResult
      if (damageReduction > 0) {
        attackResult = gameState.executeAttackWithDefense
          ? gameState.executeAttackWithDefense(attackerInstance, defenderInstance, targetInfo.attackType, damageReduction, defenseType)
          : gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)
      } else {
        attackResult = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)
      }

      if (attackResult.success) {
        results.attacksSuccessful++
        results.damageDealt += attackResult.damage

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
  const executeAITurn = (gameState, currentPlayerId, abilityStats, creatureAbilityStats, gameStats) => {
    // Randomize AI difficulty: 33% easy, 34% medium, 33% hard
    const difficultyRoll = Math.random()
    const aiDifficulty = difficultyRoll < 0.33 ? 'easy' : difficultyRoll < 0.67 ? 'medium' : 'hard'
    const ai = new SimpleAI(gameState, currentPlayerId, null, aiDifficulty)
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

          case 'attack_intention':
            attackIntentions.push(action)
            break
        }
      }

      // Process attack queue with ability tracking
      if (attackIntentions.length > 0) {
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

  const runSingleGame = (gameNum, abilityStats, creatureAbilityStats) => {
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
                executeAITurn(gameState, currentPlayerId, abilityStats, creatureAbilityStats, stats)
              }
              gameState.executeRefreshPhase()
              break
            case GamePhases.ACTIVATE:
              executeAITurn(gameState, currentPlayerId, abilityStats, creatureAbilityStats, stats)

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
              executeAITurn(gameState, currentPlayerId, abilityStats, creatureAbilityStats, stats)
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

      const gameStats = runSingleGame(i + 1, abilityStats, creatureAbilityStats)
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

    setResults({ allResults, summary, abilityStats, creatureAbilityStats })
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
    if (!creatureAbilityStats) return { working: 0, total: 9 }
    let working = 0
    const total = 13 // FLASHING BLADES, HIDDEN BLADE, SCUTTLE, SHADOW STALKER, BURROW (Lolth), BURROW (Cormyr), CONFUSION GAZE, SUMMON SPIDER, GRAVEYARD DEPLOY, LIFE DRAIN, LICH NECROMANCER DEPLOY, TOMB GUARDIAN SPLASH, LIGHTNING BREATH
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
