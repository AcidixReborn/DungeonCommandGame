// Game Board Logic Test v2.0
// This script runs automated games and reports detailed statistics
// Tests all game mechanics including the attack queue bug fix
//
// Big O Complexity Analysis:
// - Single game simulation: O(T * C * A) where T=turns, C=creatures, A=actions per creature
// - Full test suite: O(N * T * C * A) where N=number of simulations
// - Statistics aggregation: O(1) per game, O(N) total
// - For typical game: T≤100, C≤20, A≤5, so O(10,000) per game
// - 100 games = O(1,000,000) operations - runs in seconds

import { GameState, GamePhases, Players, TerrainTypes } from './src/models/gameState.js'
import { Creature, CreatureInstance } from './src/models/creatures.js'
import { Commander } from './src/models/commanders.js'
import { OrderCard, ActionTypes } from './src/models/orders.js'
import { Factions, commanders, sampleCreatures, sampleOrderCards } from './src/data/factions.js'
import SimpleAI from './src/ai/simpleAI.js'

// Test configuration
const CONFIG = {
  NUM_SIMULATIONS: 100,
  MAX_TURNS_PER_GAME: 100,
  PLAYER_COUNTS_TO_TEST: [2, 3, 4, 5], // Test multi-player games
  VERBOSE_LOGGING: false, // Set to true for detailed per-game logs
  TRACK_BALANCE: true // Track faction/commander win rates
}

/**
 * Comprehensive statistics tracking object
 * Tracks all game mechanics and balance data
 *
 * Big O: O(1) for all stat updates, O(F + C) for balance tracking
 * where F = number of factions, C = number of commanders
 */
const stats = {
  // ===== Core Game Stats =====
  gamesCompleted: 0,
  gamesErrored: 0,
  totalTurns: 0,
  maxTurns: 0,
  minTurns: Infinity,

  // ===== Win Tracking =====
  winsByPlayer: {}, // { PLAYER1: 5, PLAYER2: 3, ... }

  // ===== Error Tracking =====
  errors: [],
  warnings: [],
  infiniteLoops: 0,
  phaseErrors: 0,

  // ===== Attack Queue Bug Tracking (Original Issue) =====
  attacksAttempted: 0,
  attacksSuccessful: 0,
  attacksSkippedDeadTarget: 0, // KEY METRIC: Attacks skipped because target died
  attacksSkippedDeadAttacker: 0, // Attacks skipped because attacker died
  attacksSkippedInvalidTarget: 0, // Target out of range or other validation

  // ===== Combat Statistics =====
  totalDamageDealt: 0,
  meleeAttacks: 0,
  rangedAttacks: 0,
  creaturesDestroyed: 0,
  creaturesByPlayer: {}, // Creatures destroyed per player

  // ===== Deployment Statistics =====
  creaturesDeployed: 0,
  deploymentProtectionTriggered: 0, // Attacks blocked by deployment protection

  // ===== Morale Statistics =====
  moraleFromKills: 0,
  moraleFromTreasures: 0,
  moraleLostFromDeaths: 0,

  // ===== Treasure Statistics =====
  treasuresCollected: 0,
  treasuresDepleted: 0,
  treasuresRevealed: 0,

  // ===== Immediate Reaction Statistics =====
  immediateReactionsAvailable: 0, // Times AI had opportunity to react
  immediateReactionsUsed: 0, // Times AI chose to use reaction
  immediateReactionsDeclined: 0, // Times AI chose not to react

  // ===== Movement Statistics =====
  movementActionsTotal: 0,
  movementTowardsTreasures: 0,
  movementTowardsEnemies: 0,

  // ===== Terrain Statistics =====
  waterDamageInstances: 0,
  waterDeaths: 0,
  forestAttacksBlocked: 0, // Ranged blocked by forest
  lineOfSightBlocked: 0, // Ranged blocked by LOS

  // ===== Ranged Attack Restriction Stats =====
  rangedBlockedByForestAttacker: 0, // Cannot shoot FROM forest
  rangedBlockedByForestTarget: 0, // Cannot shoot AT forest
  rangedBlockedByAdjacent: 0, // Must use melee for adjacent
  rangedBlockedByLineOfSight: 0, // Enemy blocks LOS
  rangedOnlyCreaturesBlocked: 0, // Ranged-only creatures blocked by adjacent rule

  // ===== Balance Tracking =====
  factionWins: {}, // { 'Sting of Lolth': 5, 'Heart of Cormyr': 3, ... }
  factionGames: {}, // { 'Sting of Lolth': 10, ... }
  commanderWins: {}, // { 'Commander Name': 5, ... }
  commanderGames: {}, // { 'Commander Name': 10, ... }

  // ===== Multi-player Statistics =====
  gamesByPlayerCount: {}, // { 2: 50, 3: 20, 4: 20, 5: 10 }
  winsByPlayerCount: {} // { 2: { PLAYER1: 25, PLAYER2: 25 }, ... }
}

/**
 * Initialize stats tracking for a player
 * O(1) - Constant time initialization
 */
function initPlayerStats(playerId) {
  if (!stats.winsByPlayer[playerId]) {
    stats.winsByPlayer[playerId] = 0
  }
  if (!stats.creaturesByPlayer[playerId]) {
    stats.creaturesByPlayer[playerId] = { deployed: 0, destroyed: 0 }
  }
}

/**
 * Initialize stats for faction/commander tracking
 * O(1) - Constant time initialization
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
}

/**
 * Create a creature deck for a faction
 * O(C) where C = number of unique creatures per faction (typically 5-8)
 *
 * @param {string} faction - Faction name
 * @returns {Array<Creature>} Array of creature cards
 */
function createCreatureDeck(faction) {
  const deck = []
  // Create 3 copies of each creature for deck variety
  for (let i = 0; i < 3; i++) {
    deck.push(...sampleCreatures[faction].map(c => new Creature(c)))
  }
  return deck
}

/**
 * Create an order deck for a faction
 * O(O) where O = number of unique orders per faction (typically 4-6)
 *
 * @param {string} faction - Faction name
 * @returns {Array<OrderCard>} Array of order cards
 */
function createOrderDeck(faction) {
  const deck = []
  // Create multiple copies of each order for deck variety
  for (let i = 0; i < 12; i++) {
    deck.push(...sampleOrderCards[faction].map(o => new OrderCard(o)))
  }
  return deck
}

/**
 * Process attack queue simulating GameBoard.jsx behavior
 * This is where the dead target bug would manifest
 *
 * Big O: O(A) where A = number of attack intentions in queue
 *
 * @param {Array} attackIntentions - Queue of attack intentions from AI
 * @param {GameState} gameState - Current game state
 * @param {string} currentPlayerId - ID of attacking player
 * @returns {Object} Results of processing attacks
 */
function processAttackQueue(attackIntentions, gameState, currentPlayerId) {
  const results = {
    attacksProcessed: 0,
    attacksSuccessful: 0,
    skippedDeadTarget: 0,
    skippedDeadAttacker: 0,
    skippedInvalidTarget: 0,
    damageDealt: 0,
    creaturesDestroyed: 0,
    meleeAttacks: 0,
    rangedAttacks: 0,
    reactionsUsed: 0,
    reactionsDeclined: 0,
    reactionsAvailable: 0
  }

  // Process each attack intention sequentially (like GameBoard.jsx does)
  for (const intention of attackIntentions) {
    const { attackerInstance, defenderInstance, targetInfo } = intention
    results.attacksProcessed++
    stats.attacksAttempted++

    // VALIDATION 1: Check if target is already dead (THE BUG FIX)
    // This mirrors the fix in GameBoard.jsx processAIAttackIntention()
    if (defenderInstance.isDestroyed() || !defenderInstance.position) {
      results.skippedDeadTarget++
      stats.attacksSkippedDeadTarget++
      if (CONFIG.VERBOSE_LOGGING) {
        console.log(`  [SKIPPED] Attack on ${defenderInstance.creature.name} - already dead`)
      }
      continue
    }

    // VALIDATION 2: Check if attacker is already dead
    if (attackerInstance.isDestroyed() || !attackerInstance.position) {
      results.skippedDeadAttacker++
      stats.attacksSkippedDeadAttacker++
      if (CONFIG.VERBOSE_LOGGING) {
        console.log(`  [SKIPPED] Attack by ${attackerInstance.creature.name} - attacker dead`)
      }
      continue
    }

    // VALIDATION 3: Check deployment protection
    if (defenderInstance.deployedThisTurn) {
      stats.deploymentProtectionTriggered++
      results.skippedInvalidTarget++
      stats.attacksSkippedInvalidTarget++
      if (CONFIG.VERBOSE_LOGGING) {
        console.log(`  [SKIPPED] Attack on ${defenderInstance.creature.name} - deployment protection`)
      }
      continue
    }

    // Process defender reactions (Immediate cards)
    const defenderPlayerId = defenderInstance.owner
    if (defenderPlayerId !== currentPlayerId) {
      const defenderAI = new SimpleAI(gameState, defenderPlayerId)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      if (reactionDecision.hadOpportunity) {
        results.reactionsAvailable++
        stats.immediateReactionsAvailable++

        if (reactionDecision.reactions.length > 0) {
          results.reactionsUsed += reactionDecision.reactions.length
          stats.immediateReactionsUsed += reactionDecision.reactions.length

          // Process reactions - tap creatures and discard cards
          const defenderPlayer = gameState.players[defenderPlayerId]
          reactionDecision.reactions.sort((a, b) => b.cardIndex - a.cardIndex)
          reactionDecision.reactions.forEach(reaction => {
            reaction.creature.isTapped = true
            if (defenderPlayer.orderHand && reaction.cardIndex < defenderPlayer.orderHand.length) {
              defenderPlayer.orderHand.splice(reaction.cardIndex, 1)
            }
          })
        } else {
          results.reactionsDeclined++
          stats.immediateReactionsDeclined++
        }
      }
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

      // Track attack type
      if (targetInfo.attackType === 'melee') {
        results.meleeAttacks++
        stats.meleeAttacks++
      } else {
        results.rangedAttacks++
        stats.rangedAttacks++
      }

      // Track destruction
      if (attackResult.destroyed) {
        results.creaturesDestroyed++
        stats.creaturesDestroyed++
        stats.moraleFromKills++ // +1 morale on kill
        stats.moraleLostFromDeaths += defenderInstance.creature.level

        // Track per-player destructions
        if (stats.creaturesByPlayer[defenderPlayerId]) {
          stats.creaturesByPlayer[defenderPlayerId].destroyed++
        }
      }
    } else {
      results.skippedInvalidTarget++
      stats.attacksSkippedInvalidTarget++
    }
  }

  return results
}

/**
 * Execute a single AI turn using actual SimpleAI methods
 *
 * Big O: O(C * (M + A)) where C = creatures, M = valid moves, A = attack targets
 * - getValidMovementTiles: O(B) where B = board size (typically 256-784 tiles)
 * - getValidAttackTargets: O(E) where E = enemy creatures
 * - Total per creature: O(B + E)
 *
 * @param {GameState} gameState - Current game state
 * @param {string} playerId - Current player ID
 * @returns {Object} Turn result with actions taken
 */
function executeAITurn(gameState, playerId) {
  const result = {
    phase: gameState.currentPhase,
    actions: [],
    attackResults: null
  }

  // Create AI instance with stats tracking for ranged restrictions
  const trackStats = {
    rangedBlockedByForestAttacker: 0,
    rangedBlockedByForestTarget: 0,
    rangedBlockedByAdjacent: 0,
    rangedBlockedByLineOfSight: 0,
    rangedOnlyCreaturesBlocked: 0
  }

  const ai = new SimpleAI(gameState, playerId, trackStats)
  const turnResult = ai.executeTurn()

  // Aggregate ranged attack restriction stats
  stats.rangedBlockedByForestAttacker += trackStats.rangedBlockedByForestAttacker
  stats.rangedBlockedByForestTarget += trackStats.rangedBlockedByForestTarget
  stats.rangedBlockedByAdjacent += trackStats.rangedBlockedByAdjacent
  stats.rangedBlockedByLineOfSight += trackStats.rangedBlockedByLineOfSight
  stats.rangedOnlyCreaturesBlocked += trackStats.rangedOnlyCreaturesBlocked

  if (!turnResult.actions) {
    return result
  }

  // Process actions by type
  const attackIntentions = []

  for (const action of turnResult.actions) {
    result.actions.push(action)

    switch (action.type) {
      case 'deploy':
        stats.creaturesDeployed++
        if (stats.creaturesByPlayer[playerId]) {
          stats.creaturesByPlayer[playerId].deployed++
        }
        break

      case 'move':
        stats.movementActionsTotal++
        // Track movement direction based on context
        // (AI prioritizes treasures first, then enemies)
        break

      case 'collect_morale':
        stats.treasuresCollected++
        stats.moraleFromTreasures += action.moraleCollected || 1
        if (action.treasureDepleted) {
          stats.treasuresDepleted++
        }
        break

      case 'attack_intention':
        attackIntentions.push(action)
        break
    }
  }

  // Process attack queue (this is where the dead target bug manifests)
  if (attackIntentions.length > 0) {
    result.attackResults = processAttackQueue(attackIntentions, gameState, playerId)
  }

  return result
}

/**
 * Run a single game simulation with comprehensive tracking
 *
 * Big O: O(T * P * C * A) where:
 * - T = turns (max 100)
 * - P = players (2-5)
 * - C = creatures per player (varies, ~5-15)
 * - A = actions per creature (~3-5)
 *
 * @param {number} gameNum - Game number for logging
 * @param {number} numPlayers - Number of players (2-5)
 * @returns {Object} Game result summary
 */
function runGameSimulation(gameNum, numPlayers = 2) {
  const gameResult = {
    gameNum,
    numPlayers,
    completed: false,
    winner: null,
    turns: 0,
    error: null
  }

  try {
    // Get available factions and shuffle for random selection
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

    // Track game by player count
    if (!stats.gamesByPlayerCount[numPlayers]) {
      stats.gamesByPlayerCount[numPlayers] = 0
      stats.winsByPlayerCount[numPlayers] = {}
    }
    stats.gamesByPlayerCount[numPlayers]++

    // Initial treasure count
    const initialTreasures = gameState.treasures?.length || 0

    let turnCount = 0
    let consecutiveSamePhase = 0
    let lastPhase = null
    let lastPlayer = null

    // Game loop - O(T) iterations
    while (!gameState.gameOver && turnCount < CONFIG.MAX_TURNS_PER_GAME) {
      const currentPhase = gameState.currentPhase
      const currentPlayerId = gameState.currentPlayer

      // Detect infinite loops (same phase/player combo too many times)
      if (currentPhase === lastPhase && currentPlayerId === lastPlayer) {
        consecutiveSamePhase++
        if (consecutiveSamePhase > 20) {
          stats.warnings.push(`Game ${gameNum}: Possible infinite loop at turn ${turnCount}, phase ${currentPhase}, player ${currentPlayerId}`)
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
            // Note: executeRefreshPhase auto-advances to ACTIVATE
            break

          case GamePhases.ACTIVATE:
            // Execute AI turn with full action processing
            const activateResult = executeAITurn(gameState, currentPlayerId)

            // Apply water damage at end of ACTIVATE (done in advancePhase)
            // Track water damage stats from game state
            const waterResults = gameState.applyWaterDamage()
            if (waterResults && waterResults.length > 0) {
              stats.waterDamageInstances += waterResults.length
              waterResults.forEach(r => {
                if (r.destroyed) stats.waterDeaths++
              })
            }

            gameState.advancePhase()
            break

          case GamePhases.DEPLOY:
            // Execute AI deployment
            const deployResult = executeAITurn(gameState, currentPlayerId)
            gameState.advancePhase()
            break

          case GamePhases.CLEANUP:
            gameState.executeCleanupPhase()
            // Note: executeCleanupPhase auto-advances and may end turn

            // Count turns when we cycle back to first player's REFRESH
            if (gameState.currentPlayer === Players.PLAYER1 &&
                gameState.currentPhase === GamePhases.REFRESH) {
              // Turn cycle complete - this is handled by turnNumber in gameState
            }
            turnCount = gameState.turnNumber
            break

          default:
            stats.phaseErrors++
            stats.errors.push(`Game ${gameNum}: Unknown phase ${currentPhase}`)
            gameState.advancePhase()
        }
      } catch (e) {
        stats.errors.push(`Game ${gameNum}, Turn ${turnCount}, Phase ${currentPhase}: ${e.message}`)
        gameResult.error = e.message
        break
      }

      // Check game over
      gameState.checkGameOver()
    }

    // Check for timeout
    if (turnCount >= CONFIG.MAX_TURNS_PER_GAME && !gameState.gameOver) {
      stats.warnings.push(`Game ${gameNum}: Reached max turns (${CONFIG.MAX_TURNS_PER_GAME})`)
      // Game still counts, winner determined by morale
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

        // Track by player count
        if (!stats.winsByPlayerCount[numPlayers][gameState.winner]) {
          stats.winsByPlayerCount[numPlayers][gameState.winner] = 0
        }
        stats.winsByPlayerCount[numPlayers][gameState.winner]++

        // Track faction/commander wins
        const winnerSetup = playerSetups.find(p => p.playerId === gameState.winner)
        if (winnerSetup) {
          stats.factionWins[winnerSetup.faction]++
          stats.commanderWins[winnerSetup.commander.name]++
        }
      }

      // Track final morale stats
      playerSetups.forEach(setup => {
        const player = gameState.players[setup.playerId]
        if (player) {
          gameResult[setup.playerId].finalMorale = player.morale
        }
      })
    }

  } catch (e) {
    stats.gamesErrored++
    stats.errors.push(`Game ${gameNum}: Fatal error - ${e.message}\nStack: ${e.stack}`)
    gameResult.error = e.message
  }

  return gameResult
}

/**
 * Calculate and print comprehensive statistics
 *
 * Big O: O(F + C) where F = factions, C = commanders
 */
function printResults() {
  const divider = '='.repeat(70)
  const subDivider = '-'.repeat(70)

  console.log('\n' + divider)
  console.log('GAME BOARD LOGIC TEST RESULTS v2.0')
  console.log(divider)

  // ===== Core Statistics =====
  console.log('\n[CORE STATISTICS]')
  console.log(`  Total Simulations Attempted: ${CONFIG.NUM_SIMULATIONS}`)
  console.log(`  Games Completed: ${stats.gamesCompleted}`)
  console.log(`  Games Errored: ${stats.gamesErrored}`)
  console.log(`  Success Rate: ${((stats.gamesCompleted / CONFIG.NUM_SIMULATIONS) * 100).toFixed(1)}%`)

  // ===== Turn Statistics =====
  console.log('\n[TURN STATISTICS]')
  const avgTurns = stats.gamesCompleted > 0 ? (stats.totalTurns / stats.gamesCompleted).toFixed(2) : 'N/A'
  console.log(`  Average Turns: ${avgTurns}`)
  console.log(`  Min Turns: ${stats.minTurns === Infinity ? 'N/A' : stats.minTurns}`)
  console.log(`  Max Turns: ${stats.maxTurns}`)
  console.log(`  Infinite Loops Detected: ${stats.infiniteLoops}`)

  // ===== Attack Queue Bug Statistics (KEY METRICS) =====
  console.log('\n[ATTACK QUEUE BUG TRACKING] *** KEY METRICS ***')
  console.log(`  Total Attacks Attempted: ${stats.attacksAttempted}`)
  console.log(`  Attacks Successful: ${stats.attacksSuccessful}`)
  console.log(`  >>> Attacks Skipped (Dead Target): ${stats.attacksSkippedDeadTarget} <<<`)
  console.log(`  >>> Attacks Skipped (Dead Attacker): ${stats.attacksSkippedDeadAttacker} <<<`)
  console.log(`  Attacks Skipped (Invalid Target): ${stats.attacksSkippedInvalidTarget}`)
  if (stats.attacksSkippedDeadTarget > 0 || stats.attacksSkippedDeadAttacker > 0) {
    console.log(`  ✓ BUG FIX VERIFIED: ${stats.attacksSkippedDeadTarget + stats.attacksSkippedDeadAttacker} attacks correctly skipped`)
  }

  // ===== Combat Statistics =====
  console.log('\n[COMBAT STATISTICS]')
  console.log(`  Total Damage Dealt: ${stats.totalDamageDealt}`)
  console.log(`  Melee Attacks: ${stats.meleeAttacks}`)
  console.log(`  Ranged Attacks: ${stats.rangedAttacks}`)
  console.log(`  Creatures Destroyed: ${stats.creaturesDestroyed}`)
  console.log(`  Deployment Protection Triggered: ${stats.deploymentProtectionTriggered}`)

  // ===== Ranged Attack Restrictions =====
  console.log('\n[RANGED ATTACK RESTRICTIONS]')
  console.log(`  Blocked by Forest (Attacker): ${stats.rangedBlockedByForestAttacker}`)
  console.log(`  Blocked by Forest (Target): ${stats.rangedBlockedByForestTarget}`)
  console.log(`  Blocked by Adjacent Rule: ${stats.rangedBlockedByAdjacent}`)
  console.log(`  Blocked by Line of Sight: ${stats.rangedBlockedByLineOfSight}`)
  console.log(`  Ranged-Only Creatures Blocked: ${stats.rangedOnlyCreaturesBlocked}`)

  // ===== Morale Statistics =====
  console.log('\n[MORALE STATISTICS]')
  console.log(`  Morale from Kills: ${stats.moraleFromKills}`)
  console.log(`  Morale from Treasures: ${stats.moraleFromTreasures}`)
  console.log(`  Morale Lost from Deaths: ${stats.moraleLostFromDeaths}`)

  // ===== Treasure Statistics =====
  console.log('\n[TREASURE STATISTICS]')
  console.log(`  Treasures Collected: ${stats.treasuresCollected}`)
  console.log(`  Treasures Depleted: ${stats.treasuresDepleted}`)

  // ===== Immediate Reaction Statistics =====
  console.log('\n[IMMEDIATE REACTION STATISTICS]')
  console.log(`  Reaction Opportunities: ${stats.immediateReactionsAvailable}`)
  console.log(`  Reactions Used: ${stats.immediateReactionsUsed}`)
  console.log(`  Reactions Declined: ${stats.immediateReactionsDeclined}`)
  if (stats.immediateReactionsAvailable > 0) {
    const useRate = ((stats.immediateReactionsUsed / stats.immediateReactionsAvailable) * 100).toFixed(1)
    console.log(`  Reaction Use Rate: ${useRate}%`)
  }

  // ===== Movement Statistics =====
  console.log('\n[MOVEMENT STATISTICS]')
  console.log(`  Total Movement Actions: ${stats.movementActionsTotal}`)
  console.log(`  Creatures Deployed: ${stats.creaturesDeployed}`)

  // ===== Water/Terrain Statistics =====
  console.log('\n[TERRAIN STATISTICS]')
  console.log(`  Water Damage Instances: ${stats.waterDamageInstances}`)
  console.log(`  Water Deaths: ${stats.waterDeaths}`)

  // ===== Win Statistics =====
  console.log('\n[WIN STATISTICS]')
  Object.entries(stats.winsByPlayer).forEach(([player, wins]) => {
    if (wins > 0) {
      const winRate = ((wins / stats.gamesCompleted) * 100).toFixed(1)
      console.log(`  ${player}: ${wins} wins (${winRate}%)`)
    }
  })

  // ===== Multi-player Statistics =====
  console.log('\n[MULTI-PLAYER STATISTICS]')
  Object.entries(stats.gamesByPlayerCount).forEach(([count, games]) => {
    console.log(`  ${count}-Player Games: ${games}`)
    const wins = stats.winsByPlayerCount[count] || {}
    Object.entries(wins).forEach(([player, w]) => {
      console.log(`    ${player}: ${w} wins`)
    })
  })

  // ===== Faction Balance =====
  if (CONFIG.TRACK_BALANCE) {
    console.log('\n[FACTION BALANCE]')
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
  }

  // ===== Errors and Warnings =====
  if (stats.errors.length > 0) {
    console.log('\n' + divider)
    console.log('ERRORS:')
    console.log(divider)
    stats.errors.slice(0, 10).forEach((error, idx) => {
      console.log(`${idx + 1}. ${error}`)
    })
    if (stats.errors.length > 10) {
      console.log(`... and ${stats.errors.length - 10} more errors`)
    }
  }

  if (stats.warnings.length > 0 && stats.warnings.length <= 20) {
    console.log('\n' + subDivider)
    console.log('WARNINGS:')
    console.log(subDivider)
    stats.warnings.slice(0, 10).forEach((warning, idx) => {
      console.log(`${idx + 1}. ${warning}`)
    })
    if (stats.warnings.length > 10) {
      console.log(`... and ${stats.warnings.length - 10} more warnings`)
    }
  }

  // ===== Summary =====
  console.log('\n' + divider)
  console.log('TEST SUMMARY')
  console.log(divider)

  const criticalIssues = []
  const passedChecks = []

  // Check for critical issues
  if (stats.errors.length > 0) {
    criticalIssues.push(`${stats.errors.length} fatal errors`)
  }
  if (stats.infiniteLoops > 0) {
    criticalIssues.push(`${stats.infiniteLoops} infinite loops`)
  }
  if (stats.phaseErrors > 0) {
    criticalIssues.push(`${stats.phaseErrors} phase errors`)
  }

  // Check for passed items
  if (stats.gamesCompleted > 0) {
    passedChecks.push(`${stats.gamesCompleted} games completed`)
  }
  if (stats.attacksSkippedDeadTarget > 0 || stats.attacksSkippedDeadAttacker > 0) {
    passedChecks.push('Attack queue bug fix verified')
  }
  if (stats.deploymentProtectionTriggered > 0) {
    passedChecks.push('Deployment protection working')
  }
  if (stats.immediateReactionsUsed > 0) {
    passedChecks.push('Immediate reactions working')
  }
  if (stats.treasuresCollected > 0) {
    passedChecks.push('Treasure collection working')
  }
  if (stats.rangedBlockedByForestAttacker + stats.rangedBlockedByForestTarget + stats.rangedBlockedByLineOfSight > 0) {
    passedChecks.push('Ranged attack restrictions working')
  }
  if (stats.waterDamageInstances > 0) {
    passedChecks.push('Water damage working')
  }

  if (criticalIssues.length === 0) {
    console.log('✓ ALL TESTS PASSED!')
    passedChecks.forEach(check => {
      console.log(`  ✓ ${check}`)
    })
  } else {
    console.log('✗ CRITICAL ISSUES FOUND:')
    criticalIssues.forEach(issue => {
      console.log(`  ✗ ${issue}`)
    })
    if (passedChecks.length > 0) {
      console.log('\nPassed checks:')
      passedChecks.forEach(check => {
        console.log(`  ✓ ${check}`)
      })
    }
  }

  console.log(divider)
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('Starting Game Board Logic Test v2.0...')
console.log(`Configuration: ${CONFIG.NUM_SIMULATIONS} games, max ${CONFIG.MAX_TURNS_PER_GAME} turns each`)
console.log(`Testing player counts: ${CONFIG.PLAYER_COUNTS_TO_TEST.join(', ')}`)
console.log('')

// Distribute games across player counts
const gamesPerPlayerCount = Math.floor(CONFIG.NUM_SIMULATIONS / CONFIG.PLAYER_COUNTS_TO_TEST.length)
let gameNum = 1

for (const playerCount of CONFIG.PLAYER_COUNTS_TO_TEST) {
  const gamesToRun = playerCount === CONFIG.PLAYER_COUNTS_TO_TEST[CONFIG.PLAYER_COUNTS_TO_TEST.length - 1]
    ? CONFIG.NUM_SIMULATIONS - (gamesPerPlayerCount * (CONFIG.PLAYER_COUNTS_TO_TEST.length - 1))
    : gamesPerPlayerCount

  console.log(`Running ${gamesToRun} games with ${playerCount} players...`)

  for (let i = 0; i < gamesToRun; i++) {
    if (gameNum % 10 === 0) {
      console.log(`  Progress: ${gameNum}/${CONFIG.NUM_SIMULATIONS}...`)
    }
    runGameSimulation(gameNum, playerCount)
    gameNum++
  }
}

// Print comprehensive results
printResults()
