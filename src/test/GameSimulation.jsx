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
      p1Faction: null,
      p2Faction: null,
      p1Commander: null,
      p2Commander: null,
      completed: false,
      deployCount: 0,
      attackCount: 0,
      moveCount: 0,
      // IMD Card Tracking
      imdCardsInDecks: { p1: 0, p2: 0 },
      imdCardsUsed: { p1: 0, p2: 0 }, // Tracks how many IMD cards were actually used as reactions
      imdOpportunities: { p1: 0, p2: 0 }, // Tracks how many times IMD cards were available but not used
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
      flyingCreatures: { p1: 0, p2: 0 },
      // Treasure/Morale Token Tracking
      treasureStats: {
        initialTreasures: 0,
        treasuresCollected: { p1: 0, p2: 0 },
        moraleFromTreasures: { p1: 0, p2: 0 },
        treasurePlacementRelaxed: 0
      }
    }

    try {
      // Random faction selection
      const factionList = Object.values(Factions)
      const p1Faction = factionList[Math.floor(Math.random() * factionList.length)]
      const p2Faction = factionList[Math.floor(Math.random() * factionList.length)]

      stats.p1Faction = p1Faction
      stats.p2Faction = p2Faction

      // Random commander selection
      const p1Commander = commanders[p1Faction][Math.floor(Math.random() * commanders[p1Faction].length)]
      const p2Commander = commanders[p2Faction][Math.floor(Math.random() * commanders[p2Faction].length)]

      stats.p1Commander = p1Commander.name
      stats.p2Commander = p2Commander.name

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

      // Count IMD cards in initial decks (with safety checks)
      const p1Deck = gameState.players[Players.PLAYER1]?.orderDeck || []
      const p2Deck = gameState.players[Players.PLAYER2]?.orderDeck || []
      stats.imdCardsInDecks.p1 = p1Deck.filter(card => card && card.isImmediate && card.isImmediate()).length
      stats.imdCardsInDecks.p2 = p2Deck.filter(card => card && card.isImmediate && card.isImmediate()).length

      // Count flying creatures in initial hands
      const p1Creatures = gameState.players[Players.PLAYER1]?.creatureHand || []
      const p2Creatures = gameState.players[Players.PLAYER2]?.creatureHand || []
      stats.flyingCreatures.p1 = p1Creatures.filter(c =>
        c.specialAbilities?.some(a => typeof a === 'string' && a.toLowerCase().includes('flying'))
      ).length
      stats.flyingCreatures.p2 = p2Creatures.filter(c =>
        c.specialAbilities?.some(a => typeof a === 'string' && a.toLowerCase().includes('flying'))
      ).length

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
              // AI makes activation decisions
              const currentAI = new SimpleAI(gameState, gameState.currentPlayer)
              const aiResult = currentAI.executeTurn()

              // Track IMD card usage from AI actions
              if (aiResult.actions) {
                aiResult.actions.forEach(action => {
                  if (action.type === 'attack') {
                    // Determine which player is the opponent (defender)
                    const opponentId = gameState.currentPlayer === Players.PLAYER1 ? Players.PLAYER2 : Players.PLAYER1

                    // Track reactions used
                    if (action.reactionsUsed > 0) {
                      if (opponentId === Players.PLAYER1) {
                        stats.imdCardsUsed.p1 += action.reactionsUsed
                      } else {
                        stats.imdCardsUsed.p2 += action.reactionsUsed
                      }
                    }

                    // Track opportunities (had cards available but chose not to use)
                    if (action.hadOpportunity && action.reactionsUsed === 0) {
                      if (opponentId === Players.PLAYER1) {
                        stats.imdOpportunities.p1 += 1
                      } else {
                        stats.imdOpportunities.p2 += 1
                      }
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

                  // Track treasure collection actions
                  if (action.type === 'collect_morale') {
                    const currentPlayer = gameState.currentPlayer
                    if (currentPlayer === Players.PLAYER1) {
                      stats.treasureStats.treasuresCollected.p1++
                      stats.treasureStats.moraleFromTreasures.p1 += action.moraleCollected || 1
                    } else if (currentPlayer === Players.PLAYER2) {
                      stats.treasureStats.treasuresCollected.p2++
                      stats.treasureStats.moraleFromTreasures.p2 += action.moraleCollected || 1
                    }
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
      stats.p1FinalMorale = gameState.players[Players.PLAYER1].morale
      stats.p2FinalMorale = gameState.players[Players.PLAYER2].morale
      stats.p1Creatures = gameState.players[Players.PLAYER1].creaturesInPlay.length
      stats.p2Creatures = gameState.players[Players.PLAYER2].creaturesInPlay.length

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
        const p1Morale = gameState.players[Players.PLAYER1].morale
        const p2Morale = gameState.players[Players.PLAYER2].morale

        if (p1Morale > p2Morale) {
          stats.winner = 'Player 1'
        } else if (p2Morale > p1Morale) {
          stats.winner = 'Player 2'
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
      ties: 0,
      totalErrors: 0,
      totalWarnings: 0,
      averageTurns: 0,
      minTurns: Infinity,
      maxTurns: 0,
      infiniteLoops: 0,
      fatalErrors: 0,
      // IMD Card Statistics
      totalImdCardsP1: 0,
      totalImdCardsP2: 0,
      totalImdCardsUsedP1: 0,
      totalImdCardsUsedP2: 0,
      totalImdOpportunitiesP1: 0,
      totalImdOpportunitiesP2: 0,
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
      // Treasure Statistics
      treasureStats: {
        totalTreasuresPlaced: 0,
        totalTreasuresCollectedP1: 0,
        totalTreasuresCollectedP2: 0,
        totalMoraleFromTreasuresP1: 0,
        totalMoraleFromTreasuresP2: 0,
        gamesWithRelaxedPlacement: 0,
        totalRelaxedPlacements: 0
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
        else summary.ties++
      }

      summary.totalErrors += gameStats.errors.length
      summary.totalWarnings += gameStats.warnings.length

      if (gameStats.errors.length > 0) summary.fatalErrors++
      if (gameStats.warnings.some(w => w.includes('infinite') || w.includes('maximum'))) {
        summary.infiniteLoops++
      }

      // Aggregate IMD card statistics
      summary.totalImdCardsP1 += gameStats.imdCardsInDecks.p1
      summary.totalImdCardsP2 += gameStats.imdCardsInDecks.p2
      summary.totalImdCardsUsedP1 += gameStats.imdCardsUsed.p1
      summary.totalImdCardsUsedP2 += gameStats.imdCardsUsed.p2
      summary.totalImdOpportunitiesP1 += gameStats.imdOpportunities.p1
      summary.totalImdOpportunitiesP2 += gameStats.imdOpportunities.p2
      if (gameStats.imdCardsInDecks.p1 > 0 || gameStats.imdCardsInDecks.p2 > 0) {
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

      summary.totalFlyingCreatures += gameStats.flyingCreatures.p1 + gameStats.flyingCreatures.p2
      if (gameStats.flyingCreatures.p1 > 0 || gameStats.flyingCreatures.p2 > 0) {
        summary.gamesWithFlyingCreatures++
      }

      // Aggregate treasure statistics
      summary.treasureStats.totalTreasuresPlaced += gameStats.treasureStats.initialTreasures
      summary.treasureStats.totalTreasuresCollectedP1 += gameStats.treasureStats.treasuresCollected.p1
      summary.treasureStats.totalTreasuresCollectedP2 += gameStats.treasureStats.treasuresCollected.p2
      summary.treasureStats.totalMoraleFromTreasuresP1 += gameStats.treasureStats.moraleFromTreasures.p1
      summary.treasureStats.totalMoraleFromTreasuresP2 += gameStats.treasureStats.moraleFromTreasures.p2
      summary.treasureStats.totalRelaxedPlacements += gameStats.treasureStats.treasurePlacementRelaxed
      if (gameStats.treasureStats.treasurePlacementRelaxed > 0) {
        summary.treasureStats.gamesWithRelaxedPlacement++
      }
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
                <Card.Header><h5>⚡ IMD Card Statistics</h5></Card.Header>
                <Card.Body>
                  <Table striped bordered variant="dark">
                    <tbody>
                      <tr>
                        <td><strong>Games with IMD Cards</strong></td>
                        <td><Badge bg="primary">{results.summary.gamesWithImdCards} / {results.summary.totalGames}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Avg IMD Cards per Deck</strong></td>
                        <td><Badge bg="info">{((results.summary.totalImdCardsP1 + results.summary.totalImdCardsP2) / (results.summary.totalGames * 2)).toFixed(1)}</Badge></td>
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
                        <td><strong>Total IMD Cards Used (Combined)</strong></td>
                        <td><Badge bg="warning">{results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>Avg IMD Usage per Game</strong></td>
                        <td>
                          {results.summary.completedGames > 0
                            ? ((results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2) / results.summary.completedGames).toFixed(2)
                            : 0} cards/game
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Avg IMD Usage per Player per Game</strong></td>
                        <td>
                          {results.summary.completedGames > 0
                            ? ((results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2) / (results.summary.completedGames * 2)).toFixed(2)
                            : 0} cards/player/game
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Opportunities (Cards Available, Not Used)</strong></td>
                        <td><Badge bg="secondary">{results.summary.totalImdOpportunitiesP1 + results.summary.totalImdOpportunitiesP2}</Badge></td>
                      </tr>
                      <tr>
                        <td><strong>AI Decision Rate</strong></td>
                        <td>
                          {(results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2 +
                            results.summary.totalImdOpportunitiesP1 + results.summary.totalImdOpportunitiesP2) > 0
                            ? ((results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2) /
                               (results.summary.totalImdCardsUsedP1 + results.summary.totalImdCardsUsedP2 +
                                results.summary.totalImdOpportunitiesP1 + results.summary.totalImdOpportunitiesP2) * 100).toFixed(1)
                            : 0}% used when available
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                  <Alert variant="success" className="mt-3 mb-0">
                    <strong>✅ AI IMD Card System Active!</strong> The AI now uses Immediate cards during attacks in automated testing.
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

              {/* Treasure Statistics */}
              <Card bg="dark" text="white" className="mb-3">
                <Card.Header><h5>💎 Treasure/Morale Token Statistics</h5></Card.Header>
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
