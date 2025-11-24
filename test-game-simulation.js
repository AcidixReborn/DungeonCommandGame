// Comprehensive Game Simulation Test
// This script runs 100 automated games and reports any issues

import { GameState, GamePhases, Players } from './src/models/gameState.js'
import { Creature } from './src/models/creatures.js'
import { Commander } from './src/models/commanders.js'
import { OrderCard } from './src/models/orders.js'
import { Factions, commanders, sampleCreatures, sampleOrderCards } from './src/data/factions.js'
import SimpleAI from './src/ai/simpleAI.js'

// Test configuration
const NUM_SIMULATIONS = 100
const MAX_TURNS_PER_GAME = 100 // Prevent infinite games

// Statistics tracking
const stats = {
  gamesCompleted: 0,
  player1Wins: 0,
  player2Wins: 0,
  errors: [],
  warnings: [],
  averageTurns: 0,
  totalTurns: 0,
  maxTurns: 0,
  minTurns: Infinity,
  infiniteLoops: 0,
  phaseErrors: 0,
  deploymentErrors: 0,
  movementErrors: 0,
  attackErrors: 0
}

// Helper function to create a deck
function createCreatureDeck(faction) {
  const deck = []
  for (let i = 0; i < 3; i++) {
    deck.push(...sampleCreatures[faction].map(c => new Creature(c)))
  }
  return deck
}

function createOrderDeck(faction) {
  const deck = []
  for (let i = 0; i < 12; i++) {
    deck.push(...sampleOrderCards[faction].map(o => new OrderCard(o)))
  }
  return deck
}

// Run a single game simulation
function runGameSimulation(gameNum) {
  try {
    // Random faction selection
    const factionList = Object.values(Factions)
    const p1Faction = factionList[Math.floor(Math.random() * factionList.length)]
    const p2Faction = factionList[Math.floor(Math.random() * factionList.length)]

    // Random commander selection
    const p1Commander = commanders[p1Faction][Math.floor(Math.random() * commanders[p1Faction].length)]
    const p2Commander = commanders[p2Faction][Math.floor(Math.random() * commanders[p2Faction].length)]

    // Setup game
    const player1Setup = {
      playerId: Players.PLAYER1,
      commander: new Commander(p1Commander),
      creatures: createCreatureDeck(p1Faction),
      orders: createOrderDeck(p1Faction),
      faction: p1Faction
    }

    const player2Setup = {
      playerId: Players.PLAYER2,
      commander: new Commander(p2Commander),
      creatures: createCreatureDeck(p2Faction),
      orders: createOrderDeck(p2Faction),
      faction: p2Faction
    }

    const gameState = new GameState([player1Setup, player2Setup])
    const ai = new SimpleAI()

    let turnCount = 0
    let consecutivePhaseChanges = 0
    let lastPhase = gameState.currentPhase

    // Game loop
    while (!gameState.gameOver && turnCount < MAX_TURNS_PER_GAME) {
      const currentPlayer = gameState.getCurrentPlayerState()
      const currentPhase = gameState.currentPhase

      // Check for infinite phase loops
      if (currentPhase === lastPhase) {
        consecutivePhaseChanges++
        if (consecutivePhaseChanges > 50) {
          stats.warnings.push(`Game ${gameNum}: Possible infinite loop detected at turn ${turnCount}, phase ${currentPhase}`)
          stats.infiniteLoops++
          break
        }
      } else {
        consecutivePhaseChanges = 0
        lastPhase = currentPhase
      }

      try {
        // Execute current phase
        switch (currentPhase) {
          case GamePhases.REFRESH:
            gameState.executeRefreshPhase()
            break

          case GamePhases.DEPLOY:
            // AI deployment
            const deployActions = ai.chooseDeployment(gameState, gameState.currentPlayer)
            deployActions.forEach(action => {
              try {
                gameState.deployCreature(action.creatureIndex, action.x, action.y)
              } catch (e) {
                stats.deploymentErrors++
                stats.warnings.push(`Game ${gameNum}, Turn ${turnCount}: Deployment error - ${e.message}`)
              }
            })
            gameState.advancePhase()
            break

          case GamePhases.ACTIVATE:
            // AI activation
            const activateActions = ai.chooseActivation(gameState, gameState.currentPlayer)
            activateActions.forEach(action => {
              try {
                if (action.type === 'move') {
                  gameState.moveCreature(action.creature, action.targetX, action.targetY)
                } else if (action.type === 'attack') {
                  gameState.attackCreature(action.attacker, action.defender)
                }
              } catch (e) {
                if (action.type === 'move') {
                  stats.movementErrors++
                } else {
                  stats.attackErrors++
                }
                stats.warnings.push(`Game ${gameNum}, Turn ${turnCount}: ${action.type} error - ${e.message}`)
              }
            })
            gameState.advancePhase()
            break

          case GamePhases.CLEANUP:
            gameState.executeCleanupPhase()
            turnCount++
            break

          default:
            stats.phaseErrors++
            stats.errors.push(`Game ${gameNum}: Unknown phase ${currentPhase}`)
            break
        }
      } catch (e) {
        stats.errors.push(`Game ${gameNum}, Turn ${turnCount}, Phase ${currentPhase}: ${e.message}`)
        break
      }
    }

    // Check for timeout
    if (turnCount >= MAX_TURNS_PER_GAME && !gameState.gameOver) {
      stats.warnings.push(`Game ${gameNum}: Exceeded maximum turns (${MAX_TURNS_PER_GAME})`)
      stats.infiniteLoops++
      return
    }

    // Record results
    stats.gamesCompleted++
    stats.totalTurns += turnCount
    stats.maxTurns = Math.max(stats.maxTurns, turnCount)
    stats.minTurns = Math.min(stats.minTurns, turnCount)

    if (gameState.gameOver) {
      const p1Morale = gameState.players[Players.PLAYER1].morale
      const p2Morale = gameState.players[Players.PLAYER2].morale

      if (p1Morale > p2Morale) {
        stats.player1Wins++
      } else {
        stats.player2Wins++
      }
    }

  } catch (e) {
    stats.errors.push(`Game ${gameNum}: Fatal error - ${e.message}\nStack: ${e.stack}`)
  }
}

// Run all simulations
console.log(`Starting ${NUM_SIMULATIONS} game simulations...\n`)

for (let i = 1; i <= NUM_SIMULATIONS; i++) {
  if (i % 10 === 0) {
    console.log(`Progress: ${i}/${NUM_SIMULATIONS} games...`)
  }
  runGameSimulation(i)
}

// Calculate statistics
stats.averageTurns = stats.gamesCompleted > 0 ? (stats.totalTurns / stats.gamesCompleted).toFixed(2) : 0

// Print results
console.log('\n' + '='.repeat(60))
console.log('GAME SIMULATION RESULTS')
console.log('='.repeat(60))
console.log(`Total Simulations: ${NUM_SIMULATIONS}`)
console.log(`Games Completed: ${stats.gamesCompleted}`)
console.log(`Player 1 Wins: ${stats.player1Wins}`)
console.log(`Player 2 Wins: ${stats.player2Wins}`)
console.log(`\nTurn Statistics:`)
console.log(`  Average Turns: ${stats.averageTurns}`)
console.log(`  Min Turns: ${stats.minTurns === Infinity ? 'N/A' : stats.minTurns}`)
console.log(`  Max Turns: ${stats.maxTurns}`)
console.log(`\nError Statistics:`)
console.log(`  Fatal Errors: ${stats.errors.length}`)
console.log(`  Warnings: ${stats.warnings.length}`)
console.log(`  Infinite Loops: ${stats.infiniteLoops}`)
console.log(`  Phase Errors: ${stats.phaseErrors}`)
console.log(`  Deployment Errors: ${stats.deploymentErrors}`)
console.log(`  Movement Errors: ${stats.movementErrors}`)
console.log(`  Attack Errors: ${stats.attackErrors}`)

if (stats.errors.length > 0) {
  console.log('\n' + '='.repeat(60))
  console.log('FATAL ERRORS:')
  console.log('='.repeat(60))
  stats.errors.forEach((error, idx) => {
    console.log(`${idx + 1}. ${error}\n`)
  })
}

if (stats.warnings.length > 0 && stats.warnings.length <= 20) {
  console.log('\n' + '='.repeat(60))
  console.log('WARNINGS (First 20):')
  console.log('='.repeat(60))
  stats.warnings.slice(0, 20).forEach((warning, idx) => {
    console.log(`${idx + 1}. ${warning}`)
  })
  if (stats.warnings.length > 20) {
    console.log(`\n... and ${stats.warnings.length - 20} more warnings`)
  }
}

console.log('\n' + '='.repeat(60))
console.log('TEST SUMMARY:')
console.log('='.repeat(60))
if (stats.errors.length === 0 && stats.infiniteLoops === 0) {
  console.log('✓ All tests passed! No critical issues found.')
} else if (stats.errors.length > 0) {
  console.log(`✗ CRITICAL: ${stats.errors.length} fatal errors found!`)
} else if (stats.infiniteLoops > 0) {
  console.log(`⚠ WARNING: ${stats.infiniteLoops} potential infinite loops detected.`)
}

if (stats.deploymentErrors + stats.movementErrors + stats.attackErrors > 0) {
  console.log(`⚠ Non-critical errors: ${stats.deploymentErrors + stats.movementErrors + stats.attackErrors} gameplay errors (may be expected AI behavior)`)
}

console.log('='.repeat(60))
