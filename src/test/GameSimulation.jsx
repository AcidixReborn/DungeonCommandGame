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
      moveCount: 0
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
              currentAI.executeTurn()
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
      fatalErrors: 0
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
    }

    if (summary.completedGames > 0) {
      summary.averageTurns = (summary.averageTurns / summary.completedGames).toFixed(2)
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
