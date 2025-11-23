import { useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap'
import { GameState, GamePhases, Players } from '../models/gameState'
import { Creature, CreatureInstance } from '../models/creatures'
import { Commander } from '../models/commanders'
import { OrderCard } from '../models/orders'
import { Factions, commanders, sampleCreatures, sampleOrderCards } from '../data/factions'
import BoardTile from './BoardTile'
import PlayerPanel from './PlayerPanel'
import './GameBoard.css'

function GameBoard() {
  const [gameState, setGameState] = useState(null)
  const [selectedTile, setSelectedTile] = useState(null)
  const [selectedCreatureIndex, setSelectedCreatureIndex] = useState(null)
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(null)
  const [selectedBoardCreature, setSelectedBoardCreature] = useState(null) // Creature on board
  const [actionMessage, setActionMessage] = useState('')
  const [validMoveTiles, setValidMoveTiles] = useState([])
  const [validAttackTargets, setValidAttackTargets] = useState([])
  const [draggingCreatureIndex, setDraggingCreatureIndex] = useState(null)
  const [dragOverTile, setDragOverTile] = useState(null)

  const startNewGame = () => {
    // For now, create a 2-player game with Sting of Lolth vs Heart of Cormyr
    // Later we'll add faction selection UI

    const player1Setup = {
      playerId: Players.PLAYER1,
      commander: new Commander(commanders[Factions.STING_OF_LOLTH][0]),
      creatures: sampleCreatures[Factions.STING_OF_LOLTH].map(c => new Creature(c)),
      orders: [
        ...sampleOrderCards[Factions.STING_OF_LOLTH].map(o => new OrderCard(o)),
        ...sampleOrderCards[Factions.STING_OF_LOLTH].map(o => new OrderCard(o)), // Duplicate for full deck
        ...sampleOrderCards[Factions.STING_OF_LOLTH].map(o => new OrderCard(o))
      ],
      faction: Factions.STING_OF_LOLTH
    }

    const player2Setup = {
      playerId: Players.PLAYER2,
      commander: new Commander(commanders[Factions.HEART_OF_CORMYR][0]),
      creatures: sampleCreatures[Factions.HEART_OF_CORMYR].map(c => new Creature(c)),
      orders: [
        ...sampleOrderCards[Factions.HEART_OF_CORMYR].map(o => new OrderCard(o)),
        ...sampleOrderCards[Factions.HEART_OF_CORMYR].map(o => new OrderCard(o)),
        ...sampleOrderCards[Factions.HEART_OF_CORMYR].map(o => new OrderCard(o))
      ],
      faction: Factions.HEART_OF_CORMYR
    }

    const newGame = new GameState([player1Setup, player2Setup])
    setGameState(newGame)
    setActionMessage('Game started! Deploy your creatures.')
  }

  const handleTileClick = (tile) => {
    if (!gameState) return
    if (gameState.gameOver) return

    setSelectedTile(tile)
    const currentPlayer = gameState.getCurrentPlayerState()

    // DEPLOY PHASE: Deploy creature from hand
    if (selectedCreatureIndex !== null && gameState.currentPhase === GamePhases.DEPLOY) {
      const creatureCard = currentPlayer.creatureHand[selectedCreatureIndex]

      // Check if tile is in player's starting zone
      const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                               tile.startingZoneOwner === gameState.currentPlayer

      if (!isInStartingZone) {
        setActionMessage('You can only deploy creatures in your starting zone (highlighted area)!')
        return
      }

      if (currentPlayer.canDeployCreature(creatureCard)) {
        if (!tile.occupant) {
          const creatureInstance = new CreatureInstance(creatureCard, gameState.currentPlayer)
          creatureInstance.position = { x: tile.x, y: tile.y }

          // Mark as deployed this turn (protected from attacks)
          creatureInstance.markAsDeployed(gameState.turnNumber)

          currentPlayer.creaturesInPlay.push(creatureInstance)
          currentPlayer.creatureHand.splice(selectedCreatureIndex, 1)

          tile.occupant = creatureInstance

          setSelectedCreatureIndex(null)
          setActionMessage(`Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`)
          setGameState({ ...gameState })
        } else {
          setActionMessage('Tile is occupied!')
        }
      } else {
        setActionMessage('Not enough leadership to deploy this creature!')
      }
      return
    }

    // ACTIVATE PHASE: Handle movement and combat
    if (gameState.currentPhase === GamePhases.ACTIVATE) {
      // If we have a creature selected on the board
      if (selectedBoardCreature) {
        // Check if clicking on an enemy creature (attack)
        if (tile.occupant && tile.occupant.owner !== gameState.currentPlayer) {
          handleAttack(selectedBoardCreature, tile.occupant)
          return
        }

        // Check if clicking on a valid movement tile
        const isValidMove = validMoveTiles.some(t => t.x === tile.x && t.y === tile.y)
        if (isValidMove && !tile.occupant) {
          handleMove(selectedBoardCreature, tile)
          return
        }

        // Deselect if clicking somewhere invalid
        setSelectedBoardCreature(null)
        setValidMoveTiles([])
        setValidAttackTargets([])
        setActionMessage('Creature deselected')
      }
      // If clicking on a creature on the board
      else if (tile.occupant) {
        // Only select own creatures
        if (tile.occupant.owner === gameState.currentPlayer) {
          handleCreatureSelect(tile.occupant)
        } else {
          setActionMessage('Cannot select enemy creatures!')
        }
      }
    }
  }

  const handleCreatureSelect = (creatureInstance) => {
    if (creatureInstance.isTapped) {
      setActionMessage('Creature is tapped! Cannot move or attack.')
      return
    }

    setSelectedBoardCreature(creatureInstance)

    // Calculate valid moves
    const moves = gameState.getValidMovementTiles(creatureInstance)
    setValidMoveTiles(moves)

    // Calculate valid attack targets
    const targets = gameState.getValidAttackTargets(creatureInstance)
    setValidAttackTargets(targets)

    setActionMessage(
      `Selected ${creatureInstance.creature.name}. ` +
      `Can move to ${moves.length} tiles or attack ${targets.length} enemies.`
    )
  }

  const handleMove = (creatureInstance, targetTile) => {
    const success = gameState.moveCreature(creatureInstance, targetTile)

    if (success) {
      setActionMessage(
        `${creatureInstance.creature.name} moved to (${targetTile.x}, ${targetTile.y})`
      )
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setGameState({ ...gameState })
    } else {
      setActionMessage('Invalid move!')
    }
  }

  const handleAttack = (attackerInstance, defenderInstance) => {
    if (attackerInstance.isTapped) {
      setActionMessage('Creature is already tapped!')
      return
    }

    // Check if defender is protected (deployed this turn)
    if (defenderInstance.deployedThisTurn) {
      setActionMessage(`${defenderInstance.creature.name} was just deployed and is protected until next turn!`)
      return
    }

    // Check if target is in range
    const targets = gameState.getValidAttackTargets(attackerInstance)
    const targetInfo = targets.find(t => t.creature.instanceId === defenderInstance.instanceId)

    if (!targetInfo) {
      setActionMessage('Target is out of range!')
      return
    }

    // Execute attack
    const result = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)

    if (result.success) {
      let message = `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
                   `with ${targetInfo.attackType} for ${result.damage} damage!`

      if (result.destroyed) {
        message += ` ${defenderInstance.creature.name} was destroyed! `
        message += `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
                  `Defender ${result.moraleChange.defender}`
      } else {
        message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
      }

      setActionMessage(message)

      // Check for game over
      gameState.checkGameOver()
    } else {
      setActionMessage(result.message || 'Attack failed!')
    }

    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setGameState({ ...gameState })
  }

  // Drag and Drop handlers
  const handleDragStart = (creatureIndex) => {
    if (gameState.currentPhase === GamePhases.DEPLOY) {
      setDraggingCreatureIndex(creatureIndex)
    }
  }

  const handleDragEnd = () => {
    setDraggingCreatureIndex(null)
    setDragOverTile(null)
  }

  const handleDragOver = (tile, e) => {
    if (draggingCreatureIndex !== null && gameState.currentPhase === GamePhases.DEPLOY) {
      const currentPlayer = gameState.getCurrentPlayerState()
      const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                               tile.startingZoneOwner === gameState.currentPlayer

      if (isInStartingZone && !tile.occupant) {
        setDragOverTile(tile)
      } else {
        setDragOverTile(null)
      }
    }
  }

  const handleDrop = (tile, e) => {
    if (draggingCreatureIndex === null || gameState.currentPhase !== GamePhases.DEPLOY) {
      return
    }

    const currentPlayer = gameState.getCurrentPlayerState()
    const creatureCard = currentPlayer.creatureHand[draggingCreatureIndex]

    // Check if tile is in player's starting zone
    const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                             tile.startingZoneOwner === gameState.currentPlayer

    if (!isInStartingZone) {
      setActionMessage('You can only deploy creatures in your starting zone!')
      setDraggingCreatureIndex(null)
      setDragOverTile(null)
      return
    }

    if (currentPlayer.canDeployCreature(creatureCard)) {
      if (!tile.occupant) {
        const creatureInstance = new CreatureInstance(creatureCard, gameState.currentPlayer)
        creatureInstance.position = { x: tile.x, y: tile.y }

        // Mark as deployed this turn (protected from attacks)
        creatureInstance.markAsDeployed(gameState.turnNumber)

        currentPlayer.creaturesInPlay.push(creatureInstance)
        currentPlayer.creatureHand.splice(draggingCreatureIndex, 1)

        tile.occupant = creatureInstance

        setActionMessage(`Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`)
        setGameState({ ...gameState })
      } else {
        setActionMessage('Tile is occupied!')
      }
    } else {
      setActionMessage('Not enough leadership to deploy this creature!')
    }

    setDraggingCreatureIndex(null)
    setDragOverTile(null)
  }

  const advancePhase = () => {
    if (!gameState) return

    switch (gameState.currentPhase) {
      case GamePhases.REFRESH:
        gameState.executeRefreshPhase()
        setActionMessage('Refresh phase complete. Draw 1 order card, untapped all creatures.')
        break
      case GamePhases.ACTIVATE:
        gameState.advancePhase()
        setActionMessage('Moving to Deploy phase.')
        break
      case GamePhases.DEPLOY:
        gameState.executeDeployPhase()
        setActionMessage('Deploy phase complete. Leadership increased, drew creature cards.')
        break
      case GamePhases.CLEANUP:
        gameState.executeCleanupPhase()
        setActionMessage(`Turn ended. ${gameState.currentPlayer}'s turn begins.`)
        break
    }

    setGameState({ ...gameState })
  }

  const getPhaseButtonText = () => {
    if (!gameState) return 'Start Phase'

    switch (gameState.currentPhase) {
      case GamePhases.REFRESH:
        return 'Execute Refresh'
      case GamePhases.ACTIVATE:
        return 'End Activate Phase'
      case GamePhases.DEPLOY:
        return 'Execute Deploy'
      case GamePhases.CLEANUP:
        return 'End Turn'
      default:
        return 'Next Phase'
    }
  }

  const getTileCreature = (x, y) => {
    if (!gameState) return null

    for (const playerId of gameState.activePlayers) {
      const player = gameState.players[playerId]
      const creature = player.creaturesInPlay.find(
        c => c.position && c.position.x === x && c.position.y === y
      )
      if (creature) return creature
    }
    return null
  }

  if (!gameState) {
    return (
      <Container fluid>
        <Row className="justify-content-center mt-5">
          <Col md={6} className="text-center">
            <Card bg="dark" text="white">
              <Card.Header>
                <h3>Dungeon Command - Digital Edition</h3>
              </Card.Header>
              <Card.Body>
                <p className="mb-4">
                  Welcome to Dungeon Command! This is a digital implementation of the
                  tactical miniatures board game.
                </p>
                <Alert variant="info">
                  <strong>Custom Rules:</strong>
                  <ul className="text-start mt-2 mb-0">
                    <li>No Cower mechanic (creatures take direct damage)</li>
                    <li>Killing an enemy creature grants +1 morale</li>
                    <li>Random board generation with terrain</li>
                    <li>Up to 5 factions can play simultaneously</li>
                  </ul>
                </Alert>
                <Button variant="success" size="lg" onClick={startNewGame}>
                  Start New Game
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }

  const currentPlayer = gameState.getCurrentPlayerState()
  const currentPlayerId = gameState.currentPlayer

  return (
    <Container fluid className="game-board-container">
      {/* Turn Info Header */}
      <Row className="mb-3">
        <Col>
          <Card bg="dark" text="white">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  Turn {gameState.turnNumber} - {currentPlayerId}
                  <Badge bg="info" className="ms-3">{gameState.currentPhase}</Badge>
                </h4>
              </div>
              <div>
                <Button variant="primary" onClick={advancePhase}>
                  {getPhaseButtonText()}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Action Message */}
      {actionMessage && (
        <Row className="mb-2">
          <Col>
            <Alert variant="success" dismissible onClose={() => setActionMessage('')}>
              {actionMessage}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Game Over */}
      {gameState.gameOver && (
        <Row className="mb-3">
          <Col>
            <Alert variant="warning">
              <h4>Game Over!</h4>
              <p>Winner: {gameState.winner}</p>
            </Alert>
          </Col>
        </Row>
      )}

      <Row>
        {/* Left Panel - Player 1 */}
        <Col md={3}>
          <PlayerPanel
            player={gameState.players[Players.PLAYER1]}
            playerId={Players.PLAYER1}
            isCurrentPlayer={currentPlayerId === Players.PLAYER1}
            isHuman={true}
            selectedCreature={currentPlayerId === Players.PLAYER1 ? selectedCreatureIndex : null}
            selectedOrder={currentPlayerId === Players.PLAYER1 ? selectedOrderIndex : null}
            onCreatureSelect={
              currentPlayerId === Players.PLAYER1
                ? (idx) => setSelectedCreatureIndex(idx)
                : null
            }
            onOrderSelect={
              currentPlayerId === Players.PLAYER1
                ? (idx) => setSelectedOrderIndex(idx)
                : null
            }
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            currentPhase={gameState.currentPhase}
          />
        </Col>

        {/* Center Panel - Game Board */}
        <Col md={6}>
          <Card bg="dark" text="white">
            <Card.Header>
              <h5>Battlefield</h5>
              {selectedCreatureIndex !== null && (
                <small className="text-warning">
                  Click a tile to deploy selected creature
                </small>
              )}
              {selectedBoardCreature && (
                <small className="text-info d-block mt-1">
                  {selectedBoardCreature.creature.name} selected - Click to move or attack
                </small>
              )}
            </Card.Header>
            <Card.Body>
              <div className="board-grid">
                {Array.from({ length: gameState.boardHeight }).map((_, y) => (
                  <div key={y} className="board-row">
                    {Array.from({ length: gameState.boardWidth }).map((_, x) => {
                      const tile = gameState.getTile(x, y)
                      const creature = getTileCreature(x, y)

                      // Check if this tile is a valid move
                      const isValidMove = validMoveTiles.some(t => t.x === x && t.y === y)

                      // Check if this creature is a valid attack target
                      const isAttackTarget = validAttackTargets.some(
                        t => t.creature.position?.x === x && t.creature.position?.y === y
                      )

                      // Check if this is the selected creature
                      const isSelectedCreature = selectedBoardCreature?.position?.x === x &&
                                                  selectedBoardCreature?.position?.y === y

                      return (
                        <BoardTile
                          key={`${x}-${y}`}
                          tile={tile}
                          creature={creature}
                          isSelected={isSelectedCreature}
                          isValidMove={isValidMove}
                          isAttackTarget={isAttackTarget}
                          onClick={handleTileClick}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          isDragTarget={dragOverTile?.x === x && dragOverTile?.y === y}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Panel - Player 2 */}
        <Col md={3}>
          <PlayerPanel
            player={gameState.players[Players.PLAYER2]}
            playerId={Players.PLAYER2}
            isCurrentPlayer={currentPlayerId === Players.PLAYER2}
            isHuman={false}
            selectedCreature={currentPlayerId === Players.PLAYER2 ? selectedCreatureIndex : null}
            selectedOrder={currentPlayerId === Players.PLAYER2 ? selectedOrderIndex : null}
            onCreatureSelect={
              currentPlayerId === Players.PLAYER2
                ? (idx) => setSelectedCreatureIndex(idx)
                : null
            }
            onOrderSelect={
              currentPlayerId === Players.PLAYER2
                ? (idx) => setSelectedOrderIndex(idx)
                : null
            }
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            currentPhase={gameState.currentPhase}
          />
        </Col>
      </Row>
    </Container>
  )
}

export default GameBoard
