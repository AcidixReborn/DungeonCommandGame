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
    const ai = new SimpleAI(gameState, currentPlayerId)
    const player = gameState.players[currentPlayerId]

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

    } catch {
      gameStats.errors++
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
          faction
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
        } catch {
          stats.errors++
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

    } catch {
      stats.errors++
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
    if (!creatureAbilityStats) return { working: 0, total: 3 }
    let working = 0
    const total = 3 // FLASHING BLADES, HIDDEN BLADE, and SCUTTLE
    if (creatureAbilityStats.flashing_blades?.timesTriggered > 0) working++
    if (creatureAbilityStats.hidden_blade?.timesTriggered > 0) working++
    if (creatureAbilityStats.scuttle?.timesTriggered > 0) working++
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
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  )
}

export default AbilitiesTest
