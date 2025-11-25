import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap'
import { GameState, GamePhases, Players } from '../models/gameState'
import { Creature, CreatureInstance } from '../models/creatures'
import { Commander } from '../models/commanders'
import { OrderCard } from '../models/orders'
import { Factions, commanders, sampleCreatures, sampleOrderCards } from '../data/factions'
import BoardTile from './BoardTile'
import PlayerPanel from './PlayerPanel'
import FactionSelector from './FactionSelector'
import CommanderSelector from './CommanderSelector'
import SimpleAI from '../ai/simpleAI'
import ImmediateReactionModal from './ImmediateReactionModal'
import './GameBoard.css'

function GameBoard() {
  const [gameState, setGameState] = useState(null)
  const [gameConfig, setGameConfig] = useState(null)
  const [factionConfig, setFactionConfig] = useState(null) // Stores faction selection before commander selection
  const [selectedTile, setSelectedTile] = useState(null)
  const [selectedCreatureIndex, setSelectedCreatureIndex] = useState(null)
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(null)
  const [selectedBoardCreature, setSelectedBoardCreature] = useState(null) // Creature on board
  const [actionMessage, setActionMessage] = useState('')
  const [validMoveTiles, setValidMoveTiles] = useState([])
  const [validAttackTargets, setValidAttackTargets] = useState([])
  const [draggingCreatureIndex, setDraggingCreatureIndex] = useState(null)
  const [dragOverTile, setDragOverTile] = useState(null)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [renderCounter, setRenderCounter] = useState(0) // Force re-renders without destroying GameState

  // Immediate Reaction Modal state
  const [showReactionModal, setShowReactionModal] = useState(false)
  const [pendingAttack, setPendingAttack] = useState(null) // Stores attack info while waiting for reactions

  // Handler for faction selection - move to commander selection
  const handleFactionSelected = (config) => {
    setFactionConfig(config)
  }

  // Handler for commander selection - start the game
  const startNewGame = (config) => {
    // Store the final game configuration (with commanders selected)
    setGameConfig(config)

    // Create 12 creature cards (3 copies of each unique creature)
    const createCreatureDeck = (faction) => {
      const deck = []
      for (let i = 0; i < 3; i++) {
        deck.push(...sampleCreatures[faction].map(c => new Creature(c)))
      }
      return deck
    }

    // Create 36 order cards (12 copies of each unique order)
    const createOrderDeck = (faction) => {
      const deck = []
      for (let i = 0; i < 12; i++) {
        deck.push(...sampleOrderCards[faction].map(o => new OrderCard(o)))
      }
      return deck
    }

    const player1Setup = {
      playerId: Players.PLAYER1,
      commander: new Commander(config.player1.commander),
      creatures: createCreatureDeck(config.player1.faction),
      orders: createOrderDeck(config.player1.faction),
      faction: config.player1.faction
    }

    const player2Setup = {
      playerId: Players.PLAYER2,
      commander: new Commander(config.player2.commander),
      creatures: createCreatureDeck(config.player2.faction),
      orders: createOrderDeck(config.player2.faction),
      faction: config.player2.faction
    }

    const newGame = new GameState([player1Setup, player2Setup])
    setGameState(newGame)
    setActionMessage('Game started! DEPLOY Phase: Click or drag creatures from your hand to your starting zone (colored tiles).')
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
          setRenderCounter(prev => prev + 1)
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
      setRenderCounter(prev => prev + 1)
    } else {
      setActionMessage('Invalid move!')
    }
  }

  /* STEP 1 - ORIGINAL CODE (COMMENTED OUT FOR BACKUP)
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
    setRenderCounter(prev => prev + 1)
  }
  */

  // STEP 1 - NEW VERSION WITH IMMEDIATE REACTION SUPPORT
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

    // Store the pending attack and show reaction modal
    setPendingAttack({
      attackerInstance,
      defenderInstance,
      targetInfo
    })
    setShowReactionModal(true)
  }

  // Handle when defender uses Immediate reaction cards
  const handleReactionsPlayed = (selectedReactions) => {
    if (!pendingAttack) return

    const defenderPlayer = gameState.players[pendingAttack.defenderInstance.owner]

    // Sort reactions by cardIndex in descending order to prevent index shifting issues
    const sortedReactions = [...selectedReactions].sort((a, b) => b.cardIndex - a.cardIndex)

    // Process each reaction
    sortedReactions.forEach(reaction => {
      // Tap the creature that used the card
      reaction.creature.isTapped = true

      // Discard the order card from hand
      defenderPlayer.orderHand.splice(reaction.cardIndex, 1)

      // TODO: Apply card effects (will be implemented in Step 8)
      console.log(`Reaction played: ${reaction.card.name} by ${reaction.creature.creature.name}`)
    })

    // Close modal and execute the attack
    setShowReactionModal(false)
    executeAttackAfterReactions(selectedReactions)
  }

  // Handle when defender skips reactions
  const handleReactionsSkipped = () => {
    setShowReactionModal(false)
    executeAttackAfterReactions([])
  }

  // Execute the attack after reactions have been handled
  const executeAttackAfterReactions = (reactions) => {
    if (!pendingAttack) return

    const { attackerInstance, defenderInstance, targetInfo } = pendingAttack

    // Execute attack
    const result = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)

    if (result.success) {
      let message = ''

      // Add reaction info to message
      if (reactions.length > 0) {
        message += `⚡ ${reactions.length} Immediate card${reactions.length !== 1 ? 's' : ''} played! `
      }

      message += `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
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
    setPendingAttack(null)
    setRenderCounter(prev => prev + 1)
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
    try {
      console.log('=== DROP EVENT START ===')
      console.log('Dragging creature index:', draggingCreatureIndex)
      console.log('Current phase:', gameState?.currentPhase)
      console.log('Tile:', tile)

      if (draggingCreatureIndex === null || gameState.currentPhase !== GamePhases.DEPLOY) {
        console.log('Drop cancelled: not in deploy phase or no creature selected')
        return
      }

      const currentPlayer = gameState.getCurrentPlayerState()
      console.log('Current player:', currentPlayer)

      const creatureCard = currentPlayer.creatureHand[draggingCreatureIndex]
      console.log('Creature card:', creatureCard)

      // Check if tile is in player's starting zone
      const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                               tile.startingZoneOwner === gameState.currentPlayer
      console.log('Is in starting zone:', isInStartingZone)

      if (!isInStartingZone) {
        setActionMessage('You can only deploy creatures in your starting zone!')
        setDraggingCreatureIndex(null)
        setDragOverTile(null)
        console.log('Drop failed: not in starting zone')
        return
      }

      if (currentPlayer.canDeployCreature(creatureCard)) {
        if (!tile.occupant) {
          console.log('Creating creature instance...')
          const creatureInstance = new CreatureInstance(creatureCard, gameState.currentPlayer)
          creatureInstance.position = { x: tile.x, y: tile.y }

          // Mark as deployed this turn (protected from attacks)
          creatureInstance.markAsDeployed(gameState.turnNumber)
          console.log('Creature instance created:', creatureInstance)

          console.log('Adding to board...')
          currentPlayer.creaturesInPlay.push(creatureInstance)
          currentPlayer.creatureHand.splice(draggingCreatureIndex, 1)
          tile.occupant = creatureInstance

          console.log('Updating state...')
          setActionMessage(`Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`)
          setRenderCounter(prev => prev + 1)
          console.log('State updated successfully')
        } else {
          setActionMessage('Tile is occupied!')
          console.log('Drop failed: tile occupied')
        }
      } else {
        setActionMessage('Not enough leadership to deploy this creature!')
        console.log('Drop failed: not enough leadership')
      }

      setDraggingCreatureIndex(null)
      setDragOverTile(null)
      console.log('=== DROP EVENT END ===')
    } catch (error) {
      console.error('!!! ERROR IN handleDrop !!!', error)
      console.error('Error stack:', error.stack)
      setActionMessage(`Error deploying creature: ${error.message}`)
      setDraggingCreatureIndex(null)
      setDragOverTile(null)
      setRenderCounter(prev => prev + 1)
    }
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

    setRenderCounter(prev => prev + 1)
  }

  // AI Turn Logic - Execute AI moves automatically
  useEffect(() => {
    if (!gameState || !gameConfig || gameState.gameOver || isAIThinking) return

    // Check if current player is AI
    const currentPlayerId = gameState.currentPlayer
    const isCurrentPlayerAI =
      (currentPlayerId === Players.PLAYER1 && !gameConfig.player1.isHuman) ||
      (currentPlayerId === Players.PLAYER2 && !gameConfig.player2.isHuman)

    if (!isCurrentPlayerAI) return

    // AI should take its turn
    const executeAITurn = async () => {
      setIsAIThinking(true)

      // Small delay so player can see what's happening
      await new Promise(resolve => setTimeout(resolve, 800))

      const ai = new SimpleAI(gameState, currentPlayerId)
      const result = ai.executeTurn()

      setActionMessage(`AI: ${result.message}`)
      setRenderCounter(prev => prev + 1)

      // Small delay before advancing phase
      await new Promise(resolve => setTimeout(resolve, 500))

      // Auto-advance phase for AI
      advancePhase()

      setIsAIThinking(false)
    }

    executeAITurn()
  }, [gameState?.currentPhase, gameState?.currentPlayer, gameState?.turnNumber])

  // Auto-execute REFRESH and CLEANUP phases only (ACTIVATE and DEPLOY require player actions)
  useEffect(() => {
    if (!gameState || !gameConfig || gameState.gameOver || isAIThinking) return

    const currentPlayerId = gameState.currentPlayer
    const isCurrentPlayerAI =
      (currentPlayerId === Players.PLAYER1 && !gameConfig.player1.isHuman) ||
      (currentPlayerId === Players.PLAYER2 && !gameConfig.player2.isHuman)

    // Don't auto-execute if it's AI's turn (AI logic handles its own phases)
    if (isCurrentPlayerAI) return

    // Auto-execute REFRESH and CLEANUP phases for human players
    if (gameState.currentPhase === GamePhases.REFRESH ||
        gameState.currentPhase === GamePhases.CLEANUP) {
      const executePhase = async () => {
        // Show "Executing..." message
        if (gameState.currentPhase === GamePhases.REFRESH) {
          setActionMessage('Executing Refresh Phase...')
        } else {
          setActionMessage('Executing Cleanup Phase...')
        }

        // Small delay to show the message
        await new Promise(resolve => setTimeout(resolve, 800))

        // Execute the phase
        advancePhase()
      }

      executePhase()
    }
  }, [gameState?.currentPhase, gameState?.currentPlayer, gameState?.turnNumber, isAIThinking])

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

  // Show faction selector first
  if (!factionConfig) {
    return <FactionSelector onStartGame={handleFactionSelected} />
  }

  // Show commander selector after factions are chosen
  if (!gameState) {
    return <CommanderSelector factionConfig={factionConfig} onCommandersSelected={startNewGame} />
  }

  const currentPlayer = gameState.getCurrentPlayerState()
  const currentPlayerId = gameState.currentPlayer

  // Check if current player is AI
  const isCurrentPlayerAI =
    (currentPlayerId === Players.PLAYER1 && !gameConfig?.player1.isHuman) ||
    (currentPlayerId === Players.PLAYER2 && !gameConfig?.player2.isHuman)

  return (
    <div className="game-board-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Turn Info Header */}
      <div style={{ flexShrink: 0, marginBottom: '10px' }}>
        <Card bg="dark" text="white">
          <Card.Body className="d-flex justify-content-between align-items-center py-2">
            <div>
              <h5 className="mb-0">
                Turn {gameState.turnNumber} - {currentPlayerId}
                <Badge bg="info" className="ms-3">{gameState.currentPhase}</Badge>
                {isAIThinking && <Badge bg="warning" className="ms-2">AI Thinking...</Badge>}
                {isCurrentPlayerAI && !isAIThinking && <Badge bg="secondary" className="ms-2">AI Player</Badge>}
              </h5>
            </div>
            <div>
              {/* Show button for ACTIVATE and DEPLOY phases (player decision phases) */}
              {(gameState.currentPhase === GamePhases.ACTIVATE || gameState.currentPhase === GamePhases.DEPLOY) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={advancePhase}
                  disabled={isCurrentPlayerAI || isAIThinking}
                >
                  {getPhaseButtonText()}
                </Button>
              )}
              {/* Show status for auto-executing phases */}
              {(gameState.currentPhase === GamePhases.REFRESH ||
                gameState.currentPhase === GamePhases.CLEANUP) && !isCurrentPlayerAI && (
                <Badge bg="warning" className="px-3 py-2">Auto-Executing...</Badge>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div style={{ flexShrink: 0, marginBottom: '10px' }}>
          <Alert variant="success" dismissible onClose={() => setActionMessage('')} className="py-2 mb-0">
            {actionMessage}
          </Alert>
        </div>
      )}

      {/* Game Over */}
      {gameState.gameOver && (
        <div style={{ flexShrink: 0, marginBottom: '10px' }}>
          <Alert variant="warning" className="py-2 mb-0">
            <h5 className="mb-1">Game Over!</h5>
            <p className="mb-0">Winner: {gameState.winner}</p>
          </Alert>
        </div>
      )}

      {/* Battlefield and Player Panel Side by Side */}
      <div style={{ flex: 1, display: 'flex', gap: '10px', minHeight: 0 }}>
        {/* Battlefield - Left Side */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Card bg="dark" text="white" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card.Header className="py-2">
              <h6 className="mb-1">Battlefield</h6>
              {gameState.currentPhase === GamePhases.REFRESH && (
                <small className="text-info d-block" style={{ fontSize: '0.85rem' }}>
                  REFRESH Phase: Click "Execute Refresh" to draw cards and untap creatures
                </small>
              )}
              {gameState.currentPhase === GamePhases.ACTIVATE && (
                <small className="text-info d-block" style={{ fontSize: '0.85rem' }}>
                  ACTIVATE Phase: Click your creatures to move and attack
                </small>
              )}
              {gameState.currentPhase === GamePhases.DEPLOY && (
                <small className="text-success d-block" style={{ fontSize: '0.85rem' }}>
                  DEPLOY Phase: Click/Drag creatures from hand to your starting zone (colored tiles)
                </small>
              )}
              {gameState.currentPhase === GamePhases.CLEANUP && (
                <small className="text-info d-block" style={{ fontSize: '0.85rem' }}>
                  CLEANUP Phase: Click "End Turn" to finish
                </small>
              )}
              {selectedCreatureIndex !== null && gameState.currentPhase === GamePhases.DEPLOY && (
                <small className="text-warning d-block" style={{ fontSize: '0.85rem' }}>
                  → Creature selected! Click or drag to a {currentPlayerId} starting zone tile
                </small>
              )}
              {selectedBoardCreature && (
                <small className="text-info d-block" style={{ fontSize: '0.85rem' }}>
                  {selectedBoardCreature.creature.name} selected - Click to move or attack
                </small>
              )}
            </Card.Header>
            <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
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
        </div>

        {/* Current Player Panel - Right Side Vertical */}
        <div style={{ width: '500px', flexShrink: 0 }}>
          <PlayerPanel
            player={currentPlayer}
            playerId={currentPlayerId}
            isCurrentPlayer={true}
            isHuman={
              (currentPlayerId === Players.PLAYER1 && gameConfig?.player1.isHuman) ||
              (currentPlayerId === Players.PLAYER2 && gameConfig?.player2.isHuman)
            }
            selectedCreature={selectedCreatureIndex}
            selectedOrder={selectedOrderIndex}
            onCreatureSelect={(idx) => setSelectedCreatureIndex(idx)}
            onOrderSelect={(idx) => setSelectedOrderIndex(idx)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            currentPhase={gameState.currentPhase}
            vertical={true}
          />
        </div>
      </div>

      {/* Immediate Reaction Modal */}
      {pendingAttack && (
        <ImmediateReactionModal
          show={showReactionModal}
          attackerInstance={pendingAttack.attackerInstance}
          defenderInstance={pendingAttack.defenderInstance}
          defenderPlayerState={gameState.players[pendingAttack.defenderInstance.owner]}
          gameState={gameState}
          onCardsPlayed={handleReactionsPlayed}
          onSkip={handleReactionsSkipped}
        />
      )}
    </div>
  )
}

export default GameBoard
