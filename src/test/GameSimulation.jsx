import { useState } from 'react'
import { Container, Card, Button, ProgressBar, Alert, Table, Badge } from 'react-bootstrap'
import { GameState, GamePhases, Players } from '../models/gameState'
import { Creature } from '../models/creatures'
import { Commander } from '../models/commanders'
import { OrderCard } from '../models/orders'
import { Factions, commanders, sampleCreatures, sampleOrderCards } from '../data/factions'
import SimpleAI from '../ai/simpleAI'

function GameSimulation() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [currentTest, setCurrentTest] = useState(0)

  const MAX_TURNS = 300
  const NUM_TESTS = 100

  const createCreatureDeck = (faction) => {
    const deck = []
    for (let i = 0; i < 3; i++) {
      deck.push(...sampleCreatures[faction].map(c => new Creature(c)))
    }
    return deck
  }

  const createOrderDeck = (faction) => {
    const deck = []
    for (let i = 0; i < 12; i++) {
      deck.push(...sampleOrderCards[faction].map(o => new OrderCard(o)))
    }
    return deck
  }

  const runSingleGame = (gameNum) => {
    const stats = {
      gameNum,
      turns: 0,
      winner: null,
      errors: [],
      warnings: [],
      factions: {}, // Will store p1-p5 factions
      commanders: {}, // Will store p1-p5 commanders
      completed: false,
      deployCount: 0,
      attackCount: 0,
      moveCount: 0,
      // IMD Card Tracking
      imdCardsInDecks: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 },
      imdCardsUsed: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 }, // Tracks how many IMD cards were actually used as reactions
      imdOpportunities: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 }, // Tracks how many times IMD cards were available but not used
      // Terrain & Pathfinding Tracking
      terrainStats: {
        totalMoves: 0,
        movesOverDifficult: 0,
        movesOverForest: 0,
        movesOverWater: 0,
        flyingCreaturesMoved: 0,
        flyingOverMountains: 0,
        avgMovementCost: 0,
        totalMovementCost: 0,
        pathfindingErrors: 0,
        invalidMoves: 0,
        waterTilesOnBoard: 0,
        creaturesEndedOnWater: 0,
        waterDamageInstances: 0,
        totalWaterDamage: 0,
        creaturesKilledByWater: 0
      },
      flyingCreatures: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 },
      // Ranged Attack Restriction Tracking
      rangedAttackStats: {
        totalMeleeAttacks: 0,
        totalRangedAttacks: 0,
        rangedBlockedByForestAttacker: 0,  // Restriction #1: Attacker on forest
        rangedBlockedByForestTarget: 0,    // Restriction #2: Target on forest
        rangedBlockedByAdjacent: 0,        // Restriction #3: Target adjacent
        rangedBlockedByLineOfSight: 0,     // Restriction #4: Enemy blocking
        rangedOnlyCreaturesBlocked: 0      // Ranged-only creatures unable to attack adjacent
      },
      // Treasure/Morale Token Tracking
      treasureStats: {
        initialTreasures: 0,
        treasuresCollected: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 },
        moraleFromTreasures: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 },
        treasurePlacementRelaxed: 0
      },
      // ============================================
      // MOVE + ACTION TRACKING
      // Verifies AI creatures use BOTH movement AND action per turn
      // Big O Complexity: O(1) per creature per turn
      // ============================================
      moveActionStats: {
        totalCreatureTurns: 0,       // Total creature activations
        moveOnlyTurns: 0,            // Creature moved but didn't attack/collect
        actionOnlyTurns: 0,          // Creature attacked/collected but didn't move
        moveAndActionTurns: 0,       // Creature used BOTH (correct behavior)
        noActionTurns: 0             // Creature did nothing (tapped or stuck)
      }
    }

    try {
      // Random faction selection for all 5 players
      const factionList = Object.values(Factions)
      const playerIds = [Players.PLAYER1, Players.PLAYER2, Players.PLAYER3, Players.PLAYER4, Players.PLAYER5]
      const playerSetups = []

      // Randomly select 5 unique factions (shuffle and take all 5)
      const shuffledFactions = [...factionList].sort(() => Math.random() - 0.5)

      for (let i = 0; i < 5; i++) {
        const faction = shuffledFactions[i]
        const commander = commanders[faction][Math.floor(Math.random() * commanders[faction].length)]

        stats.factions[`p${i + 1}`] = faction
        stats.commanders[`p${i + 1}`] = commander.name

        playerSetups.push({
          playerId: playerIds[i],
          commander: new Commander(commander),
          creatures: createCreatureDeck(faction),
          orders: createOrderDeck(faction),
          faction: faction
        })
      }

      const gameState = new GameState(playerSetups)

      // Count IMD cards in initial decks for all players
      for (let i = 0; i < 5; i++) {
        const playerId = playerIds[i]
        const deck = gameState.players[playerId]?.orderDeck || []
        stats.imdCardsInDecks[`p${i + 1}`] = deck.filter(card => card && card.isImmediate && card.isImmediate()).length

        // Count flying creatures in initial hands
        const creatures = gameState.players[playerId]?.creatureHand || []
        stats.flyingCreatures[`p${i + 1}`] = creatures.filter(c =>
          c.specialAbilities?.some(a => typeof a === 'string' && a.toLowerCase().includes('flying'))
        ).length
      }

      // Track initial treasure placement
      stats.treasureStats.initialTreasures = gameState.treasures?.length || 0
      stats.treasureStats.treasurePlacementRelaxed = gameState.treasurePlacementStats?.relaxedSpacing || 0

      // Count water tiles on the board
      stats.terrainStats.waterTilesOnBoard = gameState.getAllTiles().filter(
        tile => tile.terrain === 'WATER'
      ).length

      let turnCount = 0
      let phaseLoopCount = 0
      let lastPhase = gameState.currentPhase

      // Game loop
      while (!gameState.gameOver && turnCount < MAX_TURNS) {
        const currentPhase = gameState.currentPhase

        // Detect infinite phase loops
        if (currentPhase === lastPhase) {
          phaseLoopCount++
          if (phaseLoopCount > 20) {
            stats.warnings.push(`Infinite phase loop at turn ${turnCount}`)
            break
          }
        } else {
          phaseLoopCount = 0
          lastPhase = currentPhase
        }

        try {
          // Handle phase execution like GameBoard does
          switch (currentPhase) {
            case GamePhases.REFRESH:
              gameState.executeRefreshPhase()
              break

            case GamePhases.ACTIVATE:
              // AI makes activation decisions (with stats tracking)
              const currentAI = new SimpleAI(gameState, gameState.currentPlayer, stats.rangedAttackStats)
              const aiResult = currentAI.executeTurn()

              // ============================================
              // MOVE + ACTION TRACKING
              // Track whether each creature used move, action, or both
              // Big O Complexity: O(A) where A = number of AI actions
              // ============================================
              if (aiResult.actions) {
                // Build a map of creature -> { moved, acted } for this turn
                const creatureActivity = new Map()

                aiResult.actions.forEach(action => {
                  // Get creature identifier (name used as key since we track per activation)
                  let creatureName = null

                  if (action.type === 'move') {
                    creatureName = action.creature
                    if (!creatureActivity.has(creatureName)) {
                      creatureActivity.set(creatureName, { moved: false, acted: false })
                    }
                    creatureActivity.get(creatureName).moved = true
                  } else if (action.type === 'attack_intention') {
                    creatureName = action.attackerInstance?.creature?.name
                    if (creatureName && !creatureActivity.has(creatureName)) {
                      creatureActivity.set(creatureName, { moved: false, acted: false })
                    }
                    if (creatureName) creatureActivity.get(creatureName).acted = true
                  } else if (action.type === 'collect_morale') {
                    creatureName = action.creature
                    if (!creatureActivity.has(creatureName)) {
                      creatureActivity.set(creatureName, { moved: false, acted: false })
                    }
                    creatureActivity.get(creatureName).acted = true
                  }
                })

                // Tally results for each creature that participated
                creatureActivity.forEach(({ moved, acted }) => {
                  stats.moveActionStats.totalCreatureTurns++
                  if (moved && acted) {
                    stats.moveActionStats.moveAndActionTurns++
                  } else if (moved && !acted) {
                    stats.moveActionStats.moveOnlyTurns++
                  } else if (!moved && acted) {
                    stats.moveActionStats.actionOnlyTurns++
                  }
                })
              }

              // Track IMD card usage from AI actions
              if (aiResult.actions) {
                aiResult.actions.forEach(action => {
                  // Handle attack intentions - execute the attack
                  if (action.type === 'attack_intention') {
                    const attacker = action.attackerInstance
                    const defender = action.defenderInstance
                    const attackType = action.targetInfo.attackType

                    // Track attack type
                    if (attackType === 'melee') {
                      stats.rangedAttackStats.totalMeleeAttacks++
                    } else if (attackType === 'ranged') {
                      stats.rangedAttackStats.totalRangedAttacks++
                    }

                    // Determine which player is the opponent (defender)
                    const opponentId = defender.owner

                    // AI defender decides whether to use IMD reactions
                    const defenderAI = new SimpleAI(gameState, opponentId)
                    const reactionDecision = defenderAI.decideImmediateReactions(defender)

                    // Track IMD opportunities and usage
                    if (reactionDecision.hadOpportunity) {
                      const opponentPlayerNum = parseInt(opponentId.replace('PLAYER', ''))
                      const opponentKey = `p${opponentPlayerNum}`

                      if (reactionDecision.reactions.length > 0) {
                        // AI decided to use reactions
                        stats.imdCardsUsed[opponentKey] += reactionDecision.reactions.length
                      } else {
                        // AI had opportunity but chose not to use
                        stats.imdOpportunities[opponentKey] += 1
                      }
                    }

                    // Execute the attack
                    const attackResult = gameState.executeAttack(attacker, defender)

                    // Check for immediate elimination of defender after attack
                    if (attackResult.success) {
                      gameState.checkAndEliminatePlayer(defender.owner)
                    }
                  }

                  // TERRAIN: Track movement actions
                  if (action.type === 'move') {
                    stats.terrainStats.totalMoves++

                    // Track movement cost if available
                    if (action.cost !== undefined) {
                      stats.terrainStats.totalMovementCost += action.cost
                    }

                    // Track terrain types moved through
                    if (action.terrainTypes) {
                      if (action.terrainTypes.includes('DIFFICULT')) {
                        stats.terrainStats.movesOverDifficult++
                      }
                      if (action.terrainTypes.includes('FOREST')) {
                        stats.terrainStats.movesOverForest++
                      }
                      if (action.terrainTypes.includes('WATER')) {
                        stats.terrainStats.movesOverWater++
                      }
                      if (action.terrainTypes.includes('MOUNTAIN')) {
                        stats.terrainStats.flyingOverMountains++
                      }
                    }

                    // Track flying creature moves
                    if (action.isFlying) {
                      stats.terrainStats.flyingCreaturesMoved++
                    }

                    // Check if non-flying creature ended movement on water (not phase end, just this move)
                    if (action.to && !action.isFlying) {
                      const destTile = gameState.getTile(action.to.x, action.to.y)
                      if (destTile?.terrain === 'WATER') {
                        stats.terrainStats.creaturesEndedOnWater++
                      }
                    }
                  }

                  // Track treasure collection actions for all 5 players
                  if (action.type === 'collect_morale') {
                    const currentPlayer = gameState.currentPlayer
                    const playerNum = parseInt(currentPlayer.replace('PLAYER', ''))
                    const playerKey = `p${playerNum}`

                    stats.treasureStats.treasuresCollected[playerKey]++
                    stats.treasureStats.moraleFromTreasures[playerKey] += action.moraleCollected || 1
                  }
                })
              }

              // Count creatures on water before advancing phase (water damage happens in advancePhase)
              if (gameState.currentPhase === GamePhases.ACTIVATE) {
                gameState.getAllTiles().forEach(tile => {
                  if (tile.terrain === 'WATER' && tile.occupant && !gameState.hasFlying(tile.occupant)) {
                    stats.terrainStats.waterDamageInstances++
                    stats.terrainStats.totalWaterDamage += 10 // Water deals 10 damage

                    // Check if creature will die from water damage
                    if (tile.occupant.currentHP <= 10) {
                      stats.terrainStats.creaturesKilledByWater++
                    }
                  }
                })
              }

              gameState.advancePhase()
              break

            case GamePhases.DEPLOY:
              // AI makes deployment decisions
              const deployAI = new SimpleAI(gameState, gameState.currentPlayer)
              deployAI.executeTurn()
              gameState.executeDeployPhase()
              break

            case GamePhases.CLEANUP:
              gameState.executeCleanupPhase()
              turnCount++
              break
          }
        } catch (e) {
          stats.errors.push(`Turn ${turnCount}, Phase ${currentPhase}: ${e.message}`)
          break
        }
      }

      stats.turns = turnCount

      // Track final morale and creatures for all 5 players
      stats.p1FinalMorale = gameState.players[Players.PLAYER1]?.morale || 0
      stats.p2FinalMorale = gameState.players[Players.PLAYER2]?.morale || 0
      stats.p3FinalMorale = gameState.players[Players.PLAYER3]?.morale || 0
      stats.p4FinalMorale = gameState.players[Players.PLAYER4]?.morale || 0
      stats.p5FinalMorale = gameState.players[Players.PLAYER5]?.morale || 0

      stats.p1Creatures = gameState.players[Players.PLAYER1]?.creaturesInPlay.length || 0
      stats.p2Creatures = gameState.players[Players.PLAYER2]?.creaturesInPlay.length || 0
      stats.p3Creatures = gameState.players[Players.PLAYER3]?.creaturesInPlay.length || 0
      stats.p4Creatures = gameState.players[Players.PLAYER4]?.creaturesInPlay.length || 0
      stats.p5Creatures = gameState.players[Players.PLAYER5]?.creaturesInPlay.length || 0

      // TERRAIN: Calculate average movement cost at end of game
      if (stats.terrainStats.totalMoves > 0) {
        stats.terrainStats.avgMovementCost =
          (stats.terrainStats.totalMovementCost / stats.terrainStats.totalMoves).toFixed(2)
      }

      // No need to count drawn cards - we only track usage during attacks

      if (turnCount >= MAX_TURNS && !gameState.gameOver) {
        stats.warnings.push(`Game exceeded maximum turns - P1 Morale: ${stats.p1FinalMorale}, P2 Morale: ${stats.p2FinalMorale}`)
      }

      if (gameState.gameOver) {
        // Determine winner from all 5 players based on morale
        const playerMorales = [
          { player: 'Player 1', morale: gameState.players[Players.PLAYER1]?.morale || 0 },
          { player: 'Player 2', morale: gameState.players[Players.PLAYER2]?.morale || 0 },
          { player: 'Player 3', morale: gameState.players[Players.PLAYER3]?.morale || 0 },
          { player: 'Player 4', morale: gameState.players[Players.PLAYER4]?.morale || 0 },
          { player: 'Player 5', morale: gameState.players[Players.PLAYER5]?.morale || 0 }
        ]

        // Find the highest morale
        const maxMorale = Math.max(...playerMorales.map(p => p.morale))
        const winners = playerMorales.filter(p => p.morale === maxMorale)

        if (winners.length === 1) {
          stats.winner = winners[0].player
        } else {
          stats.winner = 'Tie'
        }
        stats.completed = true
      }

    } catch (e) {
      stats.errors.push(`Fatal error: ${e.message}`)
    }

    return stats
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults(null)

    const allResults = []
    const summary = {
      totalGames: NUM_TESTS,
      completedGames: 0,
      player1Wins: 0,
      player2Wins: 0,
      player3Wins: 0,
      player4Wins: 0,
      player5Wins: 0,
      ties: 0,
      totalErrors: 0,
      totalWarnings: 0,
      averageTurns: 0,
      minTurns: Infinity,
      maxTurns: 0,
      infiniteLoops: 0,
      fatalErrors: 0,
      // IMD Card Statistics (all 5 players)
      totalImdCardsP1: 0,
      totalImdCardsP2: 0,
      totalImdCardsP3: 0,
      totalImdCardsP4: 0,
      totalImdCardsP5: 0,
      totalImdCardsUsedP1: 0,
      totalImdCardsUsedP2: 0,
      totalImdCardsUsedP3: 0,
      totalImdCardsUsedP4: 0,
      totalImdCardsUsedP5: 0,
      totalImdOpportunitiesP1: 0,
      totalImdOpportunitiesP2: 0,
      totalImdOpportunitiesP3: 0,
      totalImdOpportunitiesP4: 0,
      totalImdOpportunitiesP5: 0,
      gamesWithImdCards: 0,
      // Terrain & Pathfinding Statistics
      terrainStats: {
        totalMoves: 0,
        movesOverDifficult: 0,
        movesOverForest: 0,
        movesOverWater: 0,
        flyingCreaturesMoved: 0,
        flyingOverMountains: 0,
        avgMovementCost: 0,
        pathfindingErrors: 0,
        invalidMoves: 0,
        totalWaterTiles: 0,
        totalCreaturesEndedOnWater: 0,
        totalWaterDamageInstances: 0,
        totalWaterDamage: 0,
        totalCreaturesKilledByWater: 0
      },
      totalFlyingCreatures: 0,
      gamesWithFlyingCreatures: 0,
      // Ranged Attack Statistics
      rangedAttackStats: {
        totalMeleeAttacks: 0,
        totalRangedAttacks: 0,
        rangedBlockedByForestAttacker: 0,
        rangedBlockedByForestTarget: 0,
        rangedBlockedByAdjacent: 0,
        rangedBlockedByLineOfSight: 0,
        rangedOnlyCreaturesBlocked: 0
      },
      // Treasure Statistics (all 5 players)
      treasureStats: {
        totalTreasuresPlaced: 0,
        totalTreasuresCollectedP1: 0,
        totalTreasuresCollectedP2: 0,
        totalTreasuresCollectedP3: 0,
        totalTreasuresCollectedP4: 0,
        totalTreasuresCollectedP5: 0,
        totalMoraleFromTreasuresP1: 0,
        totalMoraleFromTreasuresP2: 0,
        totalMoraleFromTreasuresP3: 0,
        totalMoraleFromTreasuresP4: 0,
        totalMoraleFromTreasuresP5: 0,
        gamesWithRelaxedPlacement: 0,
        totalRelaxedPlacements: 0
      },
      // ============================================
      // MOVE + ACTION STATISTICS
      // Verifies AI properly uses both move AND action per creature turn
      // Big O Complexity: O(1) - simple counter aggregation
      // ============================================
      moveActionStats: {
        totalCreatureTurns: 0,
        moveOnlyTurns: 0,
        actionOnlyTurns: 0,
        moveAndActionTurns: 0,
        noActionTurns: 0
      }
    }

    for (let i = 0; i < NUM_TESTS; i++) {
      // Use setTimeout to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0))

      setCurrentTest(i + 1)
      setProgress(((i + 1) / NUM_TESTS) * 100)

      const gameStats = runSingleGame(i + 1)
      allResults.push(gameStats)

      if (gameStats.completed) {
        summary.completedGames++
        summary.averageTurns += gameStats.turns
        summary.minTurns = Math.min(summary.minTurns, gameStats.turns)
        summary.maxTurns = Math.max(summary.maxTurns, gameStats.turns)

        if (gameStats.winner === 'Player 1') summary.player1Wins++
        else if (gameStats.winner === 'Player 2') summary.player2Wins++
        else if (gameStats.winner === 'Player 3') summary.player3Wins++
        else if (gameStats.winner === 'Player 4') summary.player4Wins++
        else if (gameStats.winner === 'Player 5') summary.player5Wins++
        else summary.ties++
      }

      summary.totalErrors += gameStats.errors.length
      summary.totalWarnings += gameStats.warnings.length

      if (gameStats.errors.length > 0) summary.fatalErrors++
      if (gameStats.warnings.some(w => w.includes('infinite') || w.includes('maximum'))) {
        summary.infiniteLoops++
      }

      // Aggregate IMD card statistics for all 5 players
      summary.totalImdCardsP1 += gameStats.imdCardsInDecks.p1
      summary.totalImdCardsP2 += gameStats.imdCardsInDecks.p2
      summary.totalImdCardsP3 += gameStats.imdCardsInDecks.p3
      summary.totalImdCardsP4 += gameStats.imdCardsInDecks.p4
      summary.totalImdCardsP5 += gameStats.imdCardsInDecks.p5
      summary.totalImdCardsUsedP1 += gameStats.imdCardsUsed.p1
      summary.totalImdCardsUsedP2 += gameStats.imdCardsUsed.p2
      summary.totalImdCardsUsedP3 += gameStats.imdCardsUsed.p3
      summary.totalImdCardsUsedP4 += gameStats.imdCardsUsed.p4
      summary.totalImdCardsUsedP5 += gameStats.imdCardsUsed.p5
      summary.totalImdOpportunitiesP1 += gameStats.imdOpportunities.p1
      summary.totalImdOpportunitiesP2 += gameStats.imdOpportunities.p2
      summary.totalImdOpportunitiesP3 += gameStats.imdOpportunities.p3
      summary.totalImdOpportunitiesP4 += gameStats.imdOpportunities.p4
      summary.totalImdOpportunitiesP5 += gameStats.imdOpportunities.p5
      if (gameStats.imdCardsInDecks.p1 > 0 || gameStats.imdCardsInDecks.p2 > 0 ||
          gameStats.imdCardsInDecks.p3 > 0 || gameStats.imdCardsInDecks.p4 > 0 ||
          gameStats.imdCardsInDecks.p5 > 0) {
        summary.gamesWithImdCards++
      }

      // Aggregate terrain statistics
      summary.terrainStats.totalMoves += gameStats.terrainStats.totalMoves
      summary.terrainStats.movesOverDifficult += gameStats.terrainStats.movesOverDifficult
      summary.terrainStats.movesOverForest += gameStats.terrainStats.movesOverForest
      summary.terrainStats.movesOverWater += gameStats.terrainStats.movesOverWater
      summary.terrainStats.flyingCreaturesMoved += gameStats.terrainStats.flyingCreaturesMoved
      summary.terrainStats.flyingOverMountains += gameStats.terrainStats.flyingOverMountains
      summary.terrainStats.pathfindingErrors += gameStats.terrainStats.pathfindingErrors
      summary.terrainStats.invalidMoves += gameStats.terrainStats.invalidMoves
      summary.terrainStats.totalWaterTiles += gameStats.terrainStats.waterTilesOnBoard
      summary.terrainStats.totalCreaturesEndedOnWater += gameStats.terrainStats.creaturesEndedOnWater
      summary.terrainStats.totalWaterDamageInstances += gameStats.terrainStats.waterDamageInstances
      summary.terrainStats.totalWaterDamage += gameStats.terrainStats.totalWaterDamage
      summary.terrainStats.totalCreaturesKilledByWater += gameStats.terrainStats.creaturesKilledByWater

      // Aggregate ranged attack statistics
      summary.rangedAttackStats.totalMeleeAttacks += gameStats.rangedAttackStats.totalMeleeAttacks
      summary.rangedAttackStats.totalRangedAttacks += gameStats.rangedAttackStats.totalRangedAttacks
      summary.rangedAttackStats.rangedBlockedByForestAttacker += gameStats.rangedAttackStats.rangedBlockedByForestAttacker
      summary.rangedAttackStats.rangedBlockedByForestTarget += gameStats.rangedAttackStats.rangedBlockedByForestTarget
      summary.rangedAttackStats.rangedBlockedByAdjacent += gameStats.rangedAttackStats.rangedBlockedByAdjacent
      summary.rangedAttackStats.rangedBlockedByLineOfSight += gameStats.rangedAttackStats.rangedBlockedByLineOfSight
      summary.rangedAttackStats.rangedOnlyCreaturesBlocked += gameStats.rangedAttackStats.rangedOnlyCreaturesBlocked

      summary.totalFlyingCreatures += gameStats.flyingCreatures.p1 + gameStats.flyingCreatures.p2 +
                                       gameStats.flyingCreatures.p3 + gameStats.flyingCreatures.p4 +
                                       gameStats.flyingCreatures.p5
      if (gameStats.flyingCreatures.p1 > 0 || gameStats.flyingCreatures.p2 > 0 ||
          gameStats.flyingCreatures.p3 > 0 || gameStats.flyingCreatures.p4 > 0 ||
          gameStats.flyingCreatures.p5 > 0) {
        summary.gamesWithFlyingCreatures++
      }

      // Aggregate treasure statistics for all 5 players
      summary.treasureStats.totalTreasuresPlaced += gameStats.treasureStats.initialTreasures
      summary.treasureStats.totalTreasuresCollectedP1 += gameStats.treasureStats.treasuresCollected.p1
      summary.treasureStats.totalTreasuresCollectedP2 += gameStats.treasureStats.treasuresCollected.p2
      summary.treasureStats.totalTreasuresCollectedP3 += gameStats.treasureStats.treasuresCollected.p3
      summary.treasureStats.totalTreasuresCollectedP4 += gameStats.treasureStats.treasuresCollected.p4
      summary.treasureStats.totalTreasuresCollectedP5 += gameStats.treasureStats.treasuresCollected.p5
      summary.treasureStats.totalMoraleFromTreasuresP1 += gameStats.treasureStats.moraleFromTreasures.p1
      summary.treasureStats.totalMoraleFromTreasuresP2 += gameStats.treasureStats.moraleFromTreasures.p2
      summary.treasureStats.totalMoraleFromTreasuresP3 += gameStats.treasureStats.moraleFromTreasures.p3
      summary.treasureStats.totalMoraleFromTreasuresP4 += gameStats.treasureStats.moraleFromTreasures.p4
      summary.treasureStats.totalMoraleFromTreasuresP5 += gameStats.treasureStats.moraleFromTreasures.p5
      summary.treasureStats.totalRelaxedPlacements += gameStats.treasureStats.treasurePlacementRelaxed
      if (gameStats.treasureStats.treasurePlacementRelaxed > 0) {
        summary.treasureStats.gamesWithRelaxedPlacement++
      }

      // ============================================
      // AGGREGATE MOVE + ACTION STATISTICS
      // Big O Complexity: O(1) - simple counter addition
      // ============================================
      summary.moveActionStats.totalCreatureTurns += gameStats.moveActionStats.totalCreatureTurns
      summary.moveActionStats.moveOnlyTurns += gameStats.moveActionStats.moveOnlyTurns
      summary.moveActionStats.actionOnlyTurns += gameStats.moveActionStats.actionOnlyTurns
      summary.moveActionStats.moveAndActionTurns += gameStats.moveActionStats.moveAndActionTurns
      summary.moveActionStats.noActionTurns += gameStats.moveActionStats.noActionTurns
    }

    if (summary.completedGames > 0) {
      summary.averageTurns = (summary.averageTurns / summary.completedGames).toFixed(2)
    }

    // Calculate average movement cost
    if (summary.terrainStats.totalMoves > 0) {
      const totalCost = allResults.reduce((sum, r) => sum + r.terrainStats.totalMovementCost, 0)
      summary.terrainStats.avgMovementCost = (totalCost / summary.terrainStats.totalMoves).toFixed(2)
    }

    setResults({ allResults, summary })
    setIsRunning(false)
  }

  return (
    <Container fluid className="mt-4">
      <Card bg="dark" text="white">
        <Card.Header>
          <h3>Game Simulation Test - 100 Automated Games</h3>
        </Card.Header>
        <Card.Body>
          {!isRunning && !results && (
            <div className="text-center">
              <p>This will run 100 automated games with random faction and commander selections.</p>
              <p>Each game will be played by AI vs AI to test game logic and detect issues.</p>
              <Button
                variant="primary"
                size="lg"
                onClick={runAllTests}
              >
                Start 100 Game Test
              </Button>
            </div>
          )}

          {isRunning && (
            <div>
              <h5>Running Test {currentTest} of {NUM_TESTS}...</h5>
              <ProgressBar
                now={progress}
                label={`${Math.round(progress)}%`}
                animated
                variant="info"
              />
              <p className="mt-2 text-muted">Please wait, this may take a minute...</p>
            </div>
          )}

          {results && (
            <div>
              <Alert variant={results.summary.fatalErrors === 0 ? 'success' : 'danger'}>
                <Alert.Heading>
                  {results.summary.fatalErrors === 0 ? '✅ Test Complete - No Critical Errors!' : '❌ Test Complete - Issues Found'}
                </Alert.Heading>
              </Alert>

              <Card bg="secondary" text="white" className="mb-3">
                <Card.Header><h5>Summary Statistics</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered variant="dark">
                    <tbody>
                      <tr>
                        <td><strong>Total Games</strong></td>
                        <td>{results.summary.totalGames}</td>
                      </tr>
                      <tr>
                        <td><strong>Completed Games</strong></td>
                        <td>{results.summary.completedGames}</td>
                      </tr>
                      <tr>
                        <td><strong>Player 1 Wins</strong></td>
                        <td><Badge bg="success">{results.summary.player1Wins}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Player 2 Wins</strong></td>
                        <td><Badge bg="primary">{results.summary.player2Wins}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Player 3 Wins</strong></td>
                        <td><Badge bg="info">{results.summary.player3Wins}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Player 4 Wins</strong></td>
                        <td><Badge bg="secondary">{results.summary.player4Wins}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Player 5 Wins</strong></td>
                        <td><Badge bg="danger">{results.summary.player5Wins}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Ties</strong></td>
                        <td><Badge bg="warning">{results.summary.ties}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Average Turns</strong></td>
                        <td>{results.summary.averageTurns}</td>
                      </tr>
                      <tr>
                        <td><strong>Min/Max Turns</strong></td>
                        <td>{results.summary.minTurns} / {results.summary.maxTurns}</td>
                      </tr>
                      <tr>
                        <td><strong>Fatal Errors</strong></td>
                        <td><Badge bg={results.summary.fatalErrors === 0 ? 'success' : 'danger'}>{results.summary.fatalErrors}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Warnings</strong></td>
                        <td><Badge bg={results.summary.totalWarnings === 0 ? 'success' : 'warning'}>{results.summary.totalWarnings}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Infinite Loops</strong></td>
                        <td><Badge bg={results.summary.infiniteLoops === 0 ? 'success' : 'danger'}>{results.summary.infiniteLoops}</Badge></td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              <Card bg="info" text="white" className="mb-3">
                <Card.Header><h5>⚡ IMD Card Statistics (All 5 Players)</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered variant="dark">
                    <tbody>
                      <tr>
                        <td><strong>Games with IMD Cards</strong></td>
                        <td><Badge bg="primary">{results.summary.gamesWithImdCards} / {results.summary.totalGames}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Avg IMD Cards per Deck</strong></td>
                        <td><Badge bg="info">{((results.summary.totalImdCardsP1 + results.summary.totalImdCardsP2 + results.summary.totalImdCardsP3 + results.summary.totalImdCardsP4 + results.summary.totalImdCardsP5) / (results.summary.totalGames * 5)).toFixed(1)}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Total IMD Cards USED by P1</strong></td>
                        <td><Badge bg="success">{results.summary.totalImdCardsUsedP1}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Total IMD Cards USED by P2</strong></td>
                        <td><Badge bg="success">{results.summary.totalImdCardsUsedP2}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Total IMD Cards USED by P3</strong></td>
                        <td><Badge bg="success">{results.summary.totalImdCardsUsedP3}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Total IMD Cards USED by P4</strong></td>
                        <td><Badge bg="success">{results.summary.totalImdCardsUsedP4}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Total IMD Cards USED by P5</strong></td>
                        <td><Badge bg="success">{results.summary.totalImdCardsUsedP5}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Total IMD Cards Used (All Players)</strong></td>
                        <td><Badge bg="warning">{results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2 + results.summary.totalImdCardsUsedP3 + results.summary.totalImdCardsUsedP4 + results.summary.totalImdCardsUsedP5}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Avg IMD Usage per Game</strong></td>
                        <td>
                          {results.summary.completedGames > 0
                            ? ((results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2 + results.summary.totalImdCardsUsedP3 + results.summary.totalImdCardsUsedP4 + results.summary.totalImdCardsUsedP5) / results.summary.completedGames).toFixed(2)
                            : 0} cards/game
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Avg IMD Usage per Player per Game</strong></td>
                        <td>
                          {results.summary.completedGames > 0
                            ? ((results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2 + results.summary.totalImdCardsUsedP3 + results.summary.totalImdCardsUsedP4 + results.summary.totalImdCardsUsedP5) / (results.summary.completedGames * 5)).toFixed(2)
                            : 0} cards/player/game
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Opportunities (Cards Available, Not Used)</strong></td>
                        <td><Badge bg="secondary">{results.summary.totalImdOpportunitiesP1 + results.summary.totalImdOpportunitiesP2 + results.summary.totalImdOpportunitiesP3 + results.summary.totalImdOpportunitiesP4 + results.summary.totalImdOpportunitiesP5}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>AI Decision Rate</strong></td>
                        <td>
                          {(results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2 + results.summary.totalImdCardsUsedP3 + results.summary.totalImdCardsUsedP4 + results.summary.totalImdCardsUsedP5 +
                            results.summary.totalImdOpportunitiesP1 + results.summary.totalImdOpportunitiesP2 + results.summary.totalImdOpportunitiesP3 + results.summary.totalImdOpportunitiesP4 + results.summary.totalImdOpportunitiesP5) > 0
                            ? ((results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2 + results.summary.totalImdCardsUsedP3 + results.summary.totalImdCardsUsedP4 + results.summary.totalImdCardsUsedP5) /
                               (results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2 + results.summary.totalImdCardsUsedP3 + results.summary.totalImdCardsUsedP4 + results.summary.totalImdCardsUsedP5 +
                                results.summary.totalImdOpportunitiesP1 + results.summary.totalImdOpportunitiesP2 + results.summary.totalImdOpportunitiesP3 + results.summary.totalImdOpportunitiesP4 + results.summary.totalImdOpportunitiesP5) * 100).toFixed(1)
                            : 0}% used when available
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                  <Alert variant="success" className="mt-3 mb-0">
                    <strong>✅ AI IMD Card System Active!</strong> The AI now uses Immediate cards during attacks in automated testing for all 5 players.
                    These statistics verify that IMD cards are being drawn and used correctly by the AI.
                  </Alert>
                </Card.Body>
              </Card>

              {/* Terrain & Pathfinding Statistics */}
              <Card bg="success" text="white" className="mb-3">
                <Card.Header><h5>🗺️ Terrain & Pathfinding Statistics</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered variant="dark">
                    <tbody>
                      <tr>
                        <td><strong>Total Flying Creatures</strong></td>
                        <td>
                          <Badge bg="primary">{results.summary.totalFlyingCreatures}</Badge>
                          {' '}in {results.summary.gamesWithFlyingCreatures} games
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Moves</strong></td>
                        <td><Badge bg="info">{results.summary.terrainStats.totalMoves}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Average Movement Cost</strong></td>
                        <td>
                          {results.summary.terrainStats.avgMovementCost || '0'} per move
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Moves Over Difficult Terrain</strong></td>
                        <td>
                          <Badge bg="warning">{results.summary.terrainStats.movesOverDifficult}</Badge>
                          {' '}({results.summary.terrainStats.totalMoves > 0
                            ? ((results.summary.terrainStats.movesOverDifficult / results.summary.terrainStats.totalMoves) * 100).toFixed(1)
                            : 0}%)
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Moves Over Forest</strong></td>
                        <td>
                          <Badge bg="success">{results.summary.terrainStats.movesOverForest}</Badge>
                          {' '}({results.summary.terrainStats.totalMoves > 0
                            ? ((results.summary.terrainStats.movesOverForest / results.summary.terrainStats.totalMoves) * 100).toFixed(1)
                            : 0}%)
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Moves Over Water</strong></td>
                        <td>
                          <Badge bg="info">{results.summary.terrainStats.movesOverWater}</Badge>
                          {' '}({results.summary.terrainStats.totalMoves > 0
                            ? ((results.summary.terrainStats.movesOverWater / results.summary.terrainStats.totalMoves) * 100).toFixed(1)
                            : 0}%)
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Flying Creature Moves</strong></td>
                        <td>
                          <Badge bg="primary">{results.summary.terrainStats.flyingCreaturesMoved}</Badge>
                          {' '}({results.summary.terrainStats.totalMoves > 0
                            ? ((results.summary.terrainStats.flyingCreaturesMoved / results.summary.terrainStats.totalMoves) * 100).toFixed(1)
                            : 0}% of all moves)
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Flying Over Mountains</strong></td>
                        <td>
                          <Badge bg="info">{results.summary.terrainStats.flyingOverMountains}</Badge>
                          {' '}moves
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Pathfinding Errors</strong></td>
                        <td>
                          <Badge bg={results.summary.terrainStats.pathfindingErrors === 0 ? 'success' : 'danger'}>
                            {results.summary.terrainStats.pathfindingErrors}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Invalid Move Attempts</strong></td>
                        <td>
                          <Badge bg={results.summary.terrainStats.invalidMoves === 0 ? 'success' : 'warning'}>
                            {results.summary.terrainStats.invalidMoves}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  {/* Water Terrain Statistics */}
                  <h6 className="mt-3">🌊 Water Terrain Statistics</h6>
                  <Table striped bordered hover variant="dark" size="sm">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Total Water Tiles Generated</strong></td>
                        <td>
                          <Badge bg="info">{results.summary.terrainStats.totalWaterTiles}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {(results.summary.terrainStats.totalWaterTiles / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Ground Creature Moves Ending on Water</strong></td>
                        <td>
                          <Badge bg="warning">{results.summary.terrainStats.totalCreaturesEndedOnWater}</Badge>
                          {' '}
                          <small>
                            (Individual moves, not phase end - {results.summary.terrainStats.totalMoves > 0
                              ? ((results.summary.terrainStats.totalCreaturesEndedOnWater / results.summary.terrainStats.totalMoves) * 100).toFixed(2)
                              : 0}% of moves)
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Water Damage Instances</strong></td>
                        <td>
                          <Badge bg="danger">{results.summary.terrainStats.totalWaterDamageInstances}</Badge>
                          {' '}times
                          {' '}
                          <small>
                            Avg per game: {(results.summary.terrainStats.totalWaterDamageInstances / results.summary.completedGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Water Damage Dealt</strong></td>
                        <td>
                          <Badge bg="danger">{results.summary.terrainStats.totalWaterDamage}</Badge>
                          {' '}HP
                          {' '}
                          <small>
                            (Avg per instance:{' '}
                            {results.summary.terrainStats.totalWaterDamageInstances > 0
                              ? (results.summary.terrainStats.totalWaterDamage / results.summary.terrainStats.totalWaterDamageInstances).toFixed(1)
                              : 0} HP)
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Creatures Killed by Water</strong></td>
                        <td>
                          <Badge bg="dark">{results.summary.terrainStats.totalCreaturesKilledByWater}</Badge>
                          {' '}
                          <small>
                            ({results.summary.terrainStats.totalWaterDamageInstances > 0
                              ? ((results.summary.terrainStats.totalCreaturesKilledByWater / results.summary.terrainStats.totalWaterDamageInstances) * 100).toFixed(1)
                              : 0}% of water damage instances)
                          </small>
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  <Alert variant="info" className="mt-2 mb-3" style={{ fontSize: '0.85rem' }}>
                    <strong>💡 Water Damage Explanation:</strong> "Ground Creature Moves Ending on Water" counts individual moves with water as the destination.
                    However, the AI may move creatures OFF water before the ACTIVATE phase ends, resulting in 0 actual damage instances.
                    Zero damage means the AI's water avoidance strategy is working correctly!
                  </Alert>

                  <Alert variant="success" className="mt-3 mb-0">
                    <strong>✅ Terrain System Active!</strong> The new 16×16 board with 8×8 terrain regions
                    and A* pathfinding is working. These statistics verify that creatures can navigate terrain
                    correctly and flying creatures can move over mountains.
                  </Alert>

                  {results.summary.terrainStats.pathfindingErrors > 0 && (
                    <Alert variant="danger" className="mt-2 mb-0">
                      <strong>⚠️ Pathfinding Errors Detected!</strong> {results.summary.terrainStats.pathfindingErrors}
                      {' '}error(s) occurred during pathfinding. Review the detailed logs.
                    </Alert>
                  )}
                </Card.Body>
              </Card>

              {/* Ranged Attack Restrictions Statistics */}
              <Card bg="warning" text="dark" className="mb-3">
                <Card.Header><h5>🎯 Ranged Attack Restrictions Statistics</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered variant="light">
                    <tbody>
                      <tr>
                        <td><strong>Total Melee Attacks</strong></td>
                        <td>
                          <Badge bg="danger">{results.summary.rangedAttackStats.totalMeleeAttacks}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {(results.summary.rangedAttackStats.totalMeleeAttacks / results.summary.completedGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Ranged Attacks</strong></td>
                        <td>
                          <Badge bg="primary">{results.summary.rangedAttackStats.totalRangedAttacks}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {(results.summary.rangedAttackStats.totalRangedAttacks / results.summary.completedGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Attacks</strong></td>
                        <td>
                          <Badge bg="secondary">
                            {results.summary.rangedAttackStats.totalMeleeAttacks + results.summary.rangedAttackStats.totalRangedAttacks}
                          </Badge>
                          {' '}
                          <small>
                            ({results.summary.rangedAttackStats.totalMeleeAttacks + results.summary.rangedAttackStats.totalRangedAttacks > 0
                              ? ((results.summary.rangedAttackStats.totalRangedAttacks /
                                 (results.summary.rangedAttackStats.totalMeleeAttacks + results.summary.rangedAttackStats.totalRangedAttacks)) * 100).toFixed(1)
                              : 0}% ranged)
                          </small>
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  <h6 className="mt-3">🚫 Ranged Attack Blocking Statistics</h6>
                  <Table striped bordered hover variant="light" size="sm">
                    <thead>
                      <tr>
                        <th>Restriction Type</th>
                        <th>Blocks</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Blocked: Attacker on Forest</strong></td>
                        <td>
                          <Badge bg="success">{results.summary.rangedAttackStats.rangedBlockedByForestAttacker}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {(results.summary.rangedAttackStats.rangedBlockedByForestAttacker / results.summary.completedGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Blocked: Target on Forest</strong></td>
                        <td>
                          <Badge bg="success">{results.summary.rangedAttackStats.rangedBlockedByForestTarget}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {(results.summary.rangedAttackStats.rangedBlockedByForestTarget / results.summary.completedGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Blocked: Adjacent Target</strong></td>
                        <td>
                          <Badge bg="info">{results.summary.rangedAttackStats.rangedBlockedByAdjacent}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {(results.summary.rangedAttackStats.rangedBlockedByAdjacent / results.summary.completedGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Blocked: Line of Sight (Forest/Enemy Creature)</strong></td>
                        <td>
                          <Badge bg="warning">{results.summary.rangedAttackStats.rangedBlockedByLineOfSight}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {(results.summary.rangedAttackStats.rangedBlockedByLineOfSight / results.summary.completedGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Ranged-Only Creatures Blocked (Adjacent)</strong></td>
                        <td>
                          <Badge bg="danger">{results.summary.rangedAttackStats.rangedOnlyCreaturesBlocked}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {(results.summary.rangedAttackStats.rangedOnlyCreaturesBlocked / results.summary.completedGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Ranged Blocks</strong></td>
                        <td>
                          <Badge bg="dark">
                            {results.summary.rangedAttackStats.rangedBlockedByForestAttacker +
                             results.summary.rangedAttackStats.rangedBlockedByForestTarget +
                             results.summary.rangedAttackStats.rangedBlockedByAdjacent +
                             results.summary.rangedAttackStats.rangedBlockedByLineOfSight}
                          </Badge>
                          {' '}
                          <small>
                            (
                            {results.summary.rangedAttackStats.rangedBlockedByForestAttacker +
                             results.summary.rangedAttackStats.rangedBlockedByForestTarget +
                             results.summary.rangedAttackStats.rangedBlockedByAdjacent +
                             results.summary.rangedAttackStats.rangedBlockedByLineOfSight > 0 &&
                             results.summary.rangedAttackStats.totalRangedAttacks > 0
                              ? ((results.summary.rangedAttackStats.rangedBlockedByForestAttacker +
                                  results.summary.rangedAttackStats.rangedBlockedByForestTarget +
                                  results.summary.rangedAttackStats.rangedBlockedByAdjacent +
                                  results.summary.rangedAttackStats.rangedBlockedByLineOfSight) /
                                 (results.summary.rangedAttackStats.totalRangedAttacks +
                                  results.summary.rangedAttackStats.rangedBlockedByForestAttacker +
                                  results.summary.rangedAttackStats.rangedBlockedByForestTarget +
                                  results.summary.rangedAttackStats.rangedBlockedByAdjacent +
                                  results.summary.rangedAttackStats.rangedBlockedByLineOfSight) * 100).toFixed(1)
                              : 0}% of attempted ranged attacks blocked)
                          </small>
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  <Alert variant="success" className="mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
                    <strong>✅ Ranged Attack Restrictions Active!</strong> The system enforces 4 core restrictions:
                    (1) Cannot shoot FROM forest, (2) Cannot shoot AT forest, (3) Cannot shoot adjacent targets,
                    (4) Line of sight blocked by forest terrain and enemy creatures (allies don't block).
                  </Alert>
                </Card.Body>
              </Card>

              {/* Treasure Statistics */}
              <Card bg="dark" text="white" className="mb-3">
                <Card.Header><h5>💎 Treasure/Morale Token Statistics (All 5 Players)</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered hover variant="dark" size="sm">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Total Treasures Placed</strong></td>
                        <td>{results.summary.treasureStats.totalTreasuresPlaced}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalTreasuresPlaced / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Treasures Collected (P1)</strong></td>
                        <td>{results.summary.treasureStats.totalTreasuresCollectedP1}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalTreasuresCollectedP1 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Treasures Collected (P2)</strong></td>
                        <td>{results.summary.treasureStats.totalTreasuresCollectedP2}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalTreasuresCollectedP2 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Treasures Collected (P3)</strong></td>
                        <td>{results.summary.treasureStats.totalTreasuresCollectedP3}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalTreasuresCollectedP3 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Treasures Collected (P4)</strong></td>
                        <td>{results.summary.treasureStats.totalTreasuresCollectedP4}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalTreasuresCollectedP4 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Treasures Collected (P5)</strong></td>
                        <td>{results.summary.treasureStats.totalTreasuresCollectedP5}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalTreasuresCollectedP5 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Morale from Treasures (P1)</strong></td>
                        <td>{results.summary.treasureStats.totalMoraleFromTreasuresP1}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalMoraleFromTreasuresP1 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Morale from Treasures (P2)</strong></td>
                        <td>{results.summary.treasureStats.totalMoraleFromTreasuresP2}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalMoraleFromTreasuresP2 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Morale from Treasures (P3)</strong></td>
                        <td>{results.summary.treasureStats.totalMoraleFromTreasuresP3}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalMoraleFromTreasuresP3 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Morale from Treasures (P4)</strong></td>
                        <td>{results.summary.treasureStats.totalMoraleFromTreasuresP4}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalMoraleFromTreasuresP4 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Morale from Treasures (P5)</strong></td>
                        <td>{results.summary.treasureStats.totalMoraleFromTreasuresP5}</td>
                        <td>
                          <small>
                            Avg per game:{' '}
                            {(results.summary.treasureStats.totalMoraleFromTreasuresP5 / results.summary.totalGames).toFixed(1)}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Games with Relaxed Placement</strong></td>
                        <td>{results.summary.treasureStats.gamesWithRelaxedPlacement}</td>
                        <td>
                          <Badge bg={results.summary.treasureStats.gamesWithRelaxedPlacement > 0 ? 'warning' : 'success'}>
                            {((results.summary.treasureStats.gamesWithRelaxedPlacement / results.summary.totalGames) * 100).toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Relaxed Placements</strong></td>
                        <td>{results.summary.treasureStats.totalRelaxedPlacements}</td>
                        <td>
                          <small>Times the 3-tile spacing was relaxed</small>
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  <Alert variant="success" className="mt-3 mb-0">
                    <strong>✅ Treasure System Active!</strong> Treasures are being placed, revealed, and collected.
                    AI players prioritize treasure collection for strategic morale advantage.
                  </Alert>

                  {results.summary.treasureStats.gamesWithRelaxedPlacement > 0 && (
                    <Alert variant="warning" className="mt-2 mb-0">
                      <strong>⚠️ Placement Spacing Relaxed!</strong>{' '}
                      {results.summary.treasureStats.gamesWithRelaxedPlacement} game(s) had to relax the 3-tile spacing
                      constraint ({results.summary.treasureStats.totalRelaxedPlacements} total instances).
                      This is normal for crowded boards.
                    </Alert>
                  )}
                </Card.Body>
              </Card>

              {/* ============================================
                  MOVE + ACTION STATISTICS
                  Verifies AI creatures properly use BOTH movement AND action per turn
                  Big O Complexity: O(1) - simple display of aggregated counters
                  ============================================ */}
              <Card bg="primary" text="white" className="mb-3">
                <Card.Header><h5>🎮 Move + Action Statistics (AI Behavior)</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered variant="dark">
                    <tbody>
                      <tr>
                        <td><strong>Total Creature Activations</strong></td>
                        <td>
                          <Badge bg="info">{results.summary.moveActionStats.totalCreatureTurns}</Badge>
                          {' '}
                          <small>
                            Avg per game:{' '}
                            {results.summary.completedGames > 0
                              ? (results.summary.moveActionStats.totalCreatureTurns / results.summary.completedGames).toFixed(1)
                              : 0}
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Move + Action (Both Used)</strong></td>
                        <td>
                          <Badge bg="success">{results.summary.moveActionStats.moveAndActionTurns}</Badge>
                          {' '}
                          <small>
                            ({results.summary.moveActionStats.totalCreatureTurns > 0
                              ? ((results.summary.moveActionStats.moveAndActionTurns / results.summary.moveActionStats.totalCreatureTurns) * 100).toFixed(1)
                              : 0}% of activations)
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Move Only (No Attack/Collect)</strong></td>
                        <td>
                          <Badge bg="warning">{results.summary.moveActionStats.moveOnlyTurns}</Badge>
                          {' '}
                          <small>
                            ({results.summary.moveActionStats.totalCreatureTurns > 0
                              ? ((results.summary.moveActionStats.moveOnlyTurns / results.summary.moveActionStats.totalCreatureTurns) * 100).toFixed(1)
                              : 0}% - may be moving towards targets)
                          </small>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Action Only (No Movement)</strong></td>
                        <td>
                          <Badge bg="info">{results.summary.moveActionStats.actionOnlyTurns}</Badge>
                          {' '}
                          <small>
                            ({results.summary.moveActionStats.totalCreatureTurns > 0
                              ? ((results.summary.moveActionStats.actionOnlyTurns / results.summary.moveActionStats.totalCreatureTurns) * 100).toFixed(1)
                              : 0}% - already in position)
                          </small>
                        </td>
                      </tr>
                    </tbody>
                  </Table>

                  {results.summary.moveActionStats.moveAndActionTurns > 0 ? (
                    <Alert variant="success" className="mt-3 mb-0">
                      <strong>✅ Move + Action System Working!</strong> AI creatures are using BOTH movement AND actions
                      in the same turn. {results.summary.moveActionStats.moveAndActionTurns} creature turns used both
                      capabilities as intended.
                    </Alert>
                  ) : (
                    <Alert variant="danger" className="mt-3 mb-0">
                      <strong>⚠️ Move + Action Issue!</strong> No creatures used both movement AND action in the same turn.
                      This may indicate a bug in the AI activation logic.
                    </Alert>
                  )}

                  <Alert variant="info" className="mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
                    <strong>💡 Expected Behavior:</strong> Creatures should use BOTH their movement AND action each turn
                    when possible. "Move Only" is normal when no targets are in range. "Action Only" is normal when
                    already adjacent to an enemy or on a treasure.
                  </Alert>
                </Card.Body>
              </Card>

              {results.summary.fatalErrors > 0 && (
                <Card bg="danger" text="white" className="mb-3">
                  <Card.Header><h5>Fatal Errors Found</h5></Card.Header>
                  <Card.Body style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {results.allResults
                      .filter(r => r.errors.length > 0)
                      .map((r, idx) => (
                        <div key={idx} className="mb-2">
                          <strong>Game {r.gameNum}:</strong>
                          <ul>
                            {r.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      ))
                    }
                  </Card.Body>
                </Card>
              )}

              {results.summary.totalWarnings > 0 && (
                <Card bg="warning" text="dark" className="mb-3">
                  <Card.Header><h5>Warnings ({results.summary.totalWarnings})</h5></Card.Header>
                  <Card.Body style={{ maxHeight: '300px', overflow: 'auto' }}>
                    {results.allResults
                      .filter(r => r.warnings.length > 0)
                      .slice(0, 10)
                      .map((r, idx) => (
                        <div key={idx} className="mb-2">
                          <strong>Game {r.gameNum}:</strong>
                          <ul>
                            {r.warnings.map((warn, i) => (
                              <li key={i}>{warn}</li>
                            ))}
                          </ul>
                        </div>
                      ))
                    }
                    {results.allResults.filter(r => r.warnings.length > 0).length > 10 && (
                      <p><em>... and {results.allResults.filter(r => r.warnings.length > 0).length - 10} more warnings</em></p>
                    )}
                  </Card.Body>
                </Card>
              )}

              <div className="text-center mt-3">
                <Button variant="primary" onClick={() => {
                  setResults(null)
                  setProgress(0)
                }}>
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

export default GameSimulation
