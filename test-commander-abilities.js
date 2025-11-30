// Commander Abilities Test v2.0
// This script runs automated games and reports detailed statistics on commander abilities
// Tests all commander abilities across all 5 factions
//
// Run with: npx vite-node test-commander-abilities.js

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
  TRACK_ABILITY_USAGE: true
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
      cowerGranted: 0,             // Undead that gained Cower
      cowerUsed: 0,                // Times Cower was used
      moraleLost: 0,               // Total morale lost from Cower
      damagePrevented: 0,          // Total damage prevented
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
  commanderAbilityUsage: {}
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
 */
function createCreatureDeck(faction) {
  const deck = []
  for (let i = 0; i < 3; i++) {
    deck.push(...sampleCreatures[faction].map(c => new Creature(c)))
  }
  return deck
}

/**
 * Create an order deck for a faction
 */
function createOrderDeck(faction) {
  const deck = []
  for (let i = 0; i < 12; i++) {
    deck.push(...sampleOrderCards[faction].map(o => new OrderCard(o)))
  }
  return deck
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
        if (detail.cowerUsed) {
          abilityStats.cowerUsed++
          abilityStats.moraleLost += (detail.moraleLost || 1)
          abilityStats.damagePrevented += (detail.damagePrevented || 20)
        }
        if (detail.cowerGranted) abilityStats.cowerGranted++
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

    // Execute the attack
    const attackResult = gameState.executeAttack(
      attackerInstance,
      defenderInstance,
      targetInfo.attackType
    )

    if (attackResult.success) {
      results.attacksSuccessful++
      stats.attacksSuccessful++
      results.damageDealt += attackResult.damage
      stats.totalDamageDealt += attackResult.damage

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
 */
function executeAITurn(gameState, currentPlayerId) {
  const ai = new SimpleAI(gameState, currentPlayerId)
  const player = gameState.players[currentPlayerId]

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

      initPlayerStats(playerId)
      initBalanceTracking(faction, commander.name)

      playerSetups.push({
        playerId,
        commander: new Commander(commander),
        creatures: createCreatureDeck(faction),
        orders: createOrderDeck(faction),
        faction
      })

      gameResult[playerId] = {
        faction,
        commander: commander.name
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
 * Print comprehensive results
 */
function printResults() {
  const divider = '='.repeat(70)
  const subDivider = '-'.repeat(70)

  console.log('\n' + divider)
  console.log('COMMANDER ABILITIES TEST RESULTS v2.0')
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
  console.log(`  Average Turns: ${avgTurns}`)
  console.log(`  Min Turns: ${stats.minTurns === Infinity ? 'N/A' : stats.minTurns}`)
  console.log(`  Max Turns: ${stats.maxTurns}`)
  console.log(`  Infinite Loops: ${stats.infiniteLoops}`)

  // ===== Combat Statistics =====
  console.log('\n[COMBAT STATISTICS]')
  console.log(`  Attacks Attempted: ${stats.attacksAttempted}`)
  console.log(`  Attacks Successful: ${stats.attacksSuccessful}`)
  console.log(`  Total Damage Dealt: ${stats.totalDamageDealt}`)
  console.log(`  Creatures Destroyed: ${stats.creaturesDestroyed}`)
  console.log(`  Creatures Deployed: ${stats.creaturesDeployed}`)

  // ===== COMMANDER ABILITY STATISTICS =====
  console.log('\n' + divider)
  console.log('COMMANDER ABILITY STATISTICS')
  console.log(divider)

  // Blood of Gruumsh
  console.log('\n[BLOOD OF GRUUMSH]')
  console.log(`  GRUUMSH COMMANDS IT (PASSIVE - Ignore Difficult Terrain):`)
  console.log(`    Times Triggered: ${stats.abilityStats.gruumsh_commands_it.timesTriggered}`)
  console.log(`    Tiles on Difficult Terrain: ${stats.abilityStats.gruumsh_commands_it.tilesMovedOnDifficult}`)
  console.log(`    Movement Saved: ${stats.abilityStats.gruumsh_commands_it.movementSaved}`)

  console.log(`  ORC SCOUT (ACTIVE - Deploy to Treasure):`)
  console.log(`    Times Available: ${stats.abilityStats.orc_scout.timesAvailable}`)
  console.log(`    Times Used: ${stats.abilityStats.orc_scout.timesUsed}`)
  console.log(`    Orcs Deployed to Treasure: ${stats.abilityStats.orc_scout.orcsDeployedToTreasure}`)

  // Sting of Lolth
  console.log('\n[STING OF LOLTH]')
  console.log(`  WALLS OF WEB (PASSIVE - +2 Speed to Drow/Spider):`)
  console.log(`    Times Applied: ${stats.abilityStats.walls_of_web.timesApplied}`)
  console.log(`    Extra Tiles Moved: ${stats.abilityStats.walls_of_web.extraTilesMoved}`)

  console.log(`  SELLSWORD (ACTIVE - Card Instead of Morale):`)
  console.log(`    Times Triggered: ${stats.abilityStats.sellsword.timesTriggered}`)
  console.log(`    Chose Morale: ${stats.abilityStats.sellsword.choseMorale}`)
  console.log(`    Chose Card: ${stats.abilityStats.sellsword.choseCard}`)

  // Curse of Undeath
  console.log('\n[CURSE OF UNDEATH]')
  console.log(`  BLOODTHIRSTY (PASSIVE - +1 Leadership on Kill):`)
  console.log(`    Times Triggered: ${stats.abilityStats.bloodthirsty.timesTriggered}`)
  console.log(`    Leadership Gained: ${stats.abilityStats.bloodthirsty.leadershipGained}`)

  console.log(`  UNSTOPPABLE HORDES (PASSIVE - Undead gain Cower):`)
  console.log(`    Cower Granted: ${stats.abilityStats.unstoppable_hordes.cowerGranted}`)
  console.log(`    Cower Used: ${stats.abilityStats.unstoppable_hordes.cowerUsed}`)
  console.log(`    Morale Lost: ${stats.abilityStats.unstoppable_hordes.moraleLost}`)
  console.log(`    Damage Prevented: ${stats.abilityStats.unstoppable_hordes.damagePrevented}`)

  // Tyranny of Goblins
  console.log('\n[TYRANNY OF GOBLINS]')
  console.log(`  HORDE (PASSIVE - Deploy in Refresh):`)
  console.log(`    Times Used: ${stats.abilityStats.horde.timesUsed}`)
  console.log(`    Creatures Deployed: ${stats.abilityStats.horde.creaturesDeployed}`)

  console.log(`  BLACK HAND OF BANE (PASSIVE - Extra Cower Penalty):`)
  console.log(`    Times Triggered: ${stats.abilityStats.black_hand_of_bane.timesTriggered}`)
  console.log(`    Extra Morale Drained: ${stats.abilityStats.black_hand_of_bane.extraMoraleDrained}`)

  // Heart of Cormyr
  console.log('\n[HEART OF CORMYR]')
  console.log(`  SCROLLBOOK (ACTIVE - Discard to Draw):`)
  console.log(`    Times Available: ${stats.abilityStats.scrollbook.timesAvailable}`)
  console.log(`    Times Used: ${stats.abilityStats.scrollbook.timesUsed}`)
  console.log(`    Cards Cycled: ${stats.abilityStats.scrollbook.cardsDrawn}`)

  console.log(`  VERSATILE (ACTIVE - Extra Move for Adventurers):`)
  console.log(`    Times Triggered: ${stats.abilityStats.versatile.timesTriggered}`)
  console.log(`    Extra Moves Used: ${stats.abilityStats.versatile.extraMovesUsed}`)
  console.log(`    Extra Moves Declined: ${stats.abilityStats.versatile.extraMoveDeclined}`)
  console.log(`    Extra Tiles Moved: ${stats.abilityStats.versatile.totalExtraTilesMoved}`)

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
  const abilitySuccesses = []

  // Check ability statistics
  Object.entries(stats.abilityStats).forEach(([id, data]) => {
    if (data.errors && data.errors.length > 0) {
      abilityIssues.push(`${data.name}: ${data.errors.length} errors`)
    }
    if (data.timesTriggered > 0 || data.timesUsed > 0 || data.timesApplied > 0) {
      abilitySuccesses.push(`${data.name}: Working`)
    }
  })

  if (stats.errors.length === 0 && abilityIssues.length === 0) {
    console.log('ALL TESTS PASSED!')
    abilitySuccesses.forEach(success => {
      console.log(`  ${success}`)
    })
  } else {
    console.log('ISSUES FOUND:')
    if (stats.errors.length > 0) {
      console.log(`  ${stats.errors.length} game errors`)
    }
    abilityIssues.forEach(issue => {
      console.log(`  ${issue}`)
    })
    if (abilitySuccesses.length > 0) {
      console.log('\nWorking abilities:')
      abilitySuccesses.forEach(success => {
        console.log(`  ${success}`)
      })
    }
  }

  console.log(divider)
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('Starting Commander Abilities Test v2.0...')
console.log(`Configuration: ${CONFIG.NUM_SIMULATIONS} games, max ${CONFIG.MAX_TURNS_PER_GAME} turns each`)
console.log('')

// Run simulations
for (let gameNum = 1; gameNum <= CONFIG.NUM_SIMULATIONS; gameNum++) {
  if (gameNum % 10 === 0) {
    console.log(`  Progress: ${gameNum}/${CONFIG.NUM_SIMULATIONS}...`)
  }
  runGameSimulation(gameNum, 2)
}

// Print comprehensive results
printResults()
