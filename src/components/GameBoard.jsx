import { useState, useEffect, useMemo } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert, Modal } from 'react-bootstrap' // Added Modal
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

/**
 * GameBoard - Main game component
 * Manages the entire game state, player interactions, and UI
 * Handles human and AI players, game phases, and all game actions
 */
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
  const [lineOfSightPath, setLineOfSightPath] = useState([]) // Visual path for ranged attacks
  const [draggingCreatureIndex, setDraggingCreatureIndex] = useState(null)
  const [dragOverTile, setDragOverTile] = useState(null)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [renderCounter, setRenderCounter] = useState(0) // Force re-renders without destroying GameState

  // Immediate Reaction Modal state
  const [showReactionModal, setShowReactionModal] = useState(false)
  const [pendingAttack, setPendingAttack] = useState(null) // Stores attack info while waiting for reactions

  // Movement Confirmation Modal state
  const [showMoveConfirm, setShowMoveConfirm] = useState(false)
  const [pendingMove, setPendingMove] = useState(null) // Stores {creature, destination, path, cost}

  // AI action queue for processing attacks with modal support
  const [pendingAIActions, setPendingAIActions] = useState([])
  const [processingAIAction, setProcessingAIAction] = useState(false)

  // Treasure Discovery Modal state
  const [showTreasureDiscovery, setShowTreasureDiscovery] = useState(false)
  const [discoveredTreasure, setDiscoveredTreasure] = useState(null) // Stores {creature, treasure, tile}

  // Morale Collection Confirmation Modal state
  const [showCollectConfirm, setShowCollectConfirm] = useState(false)
  const [pendingCollection, setPendingCollection] = useState(null) // Stores {creature, treasure}

  /**
   * Helper function to check if a player is human
   * @param {string} playerId - Player ID (PLAYER1, PLAYER2, etc.)
   * @returns {boolean} True if player is human
   */
  const isPlayerHuman = (playerId) => {
    if (!gameConfig) {
      console.log('[isPlayerHuman] No gameConfig available')
      return false
    }
    const playerNum = playerId.replace('PLAYER', '')
    const playerKey = `player${playerNum}`
    const isHuman = gameConfig[playerKey]?.isHuman || false
    console.log(`[isPlayerHuman] playerId: ${playerId}, playerNum: ${playerNum}, playerKey: ${playerKey}, isHuman: ${isHuman}`)
    console.log(`[isPlayerHuman] gameConfig[${playerKey}]:`, gameConfig[playerKey])
    return isHuman
  }

  /**
   * Handler for faction selection - move to commander selection
   * @param {Object} config - Faction configuration for both players
   */
  const handleFactionSelected = (config) => {
    console.log('handleFactionSelected called with config:', config)
    setFactionConfig(config)
    console.log('factionConfig updated')
  }

  /**
   * Handler for commander selection - start the game
   * Creates decks and initializes game state
   * @param {Object} config - Complete game configuration with commanders
   */
  const startNewGame = (config) => {
    // Store the final game configuration (with commanders selected)
    console.log('[startNewGame] Received config:', config)
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

    // Build player setups dynamically based on number of players
    const playerSetups = []
    const playerIds = [Players.PLAYER1, Players.PLAYER2, Players.PLAYER3, Players.PLAYER4, Players.PLAYER5]

    const numPlayers = config.numPlayers || 2
    for (let i = 1; i <= numPlayers; i++) {
      const playerKey = `player${i}`
      playerSetups.push({
        playerId: playerIds[i - 1],
        commander: new Commander(config[playerKey].commander),
        creatures: createCreatureDeck(config[playerKey].faction),
        orders: createOrderDeck(config[playerKey].faction),
        faction: config[playerKey].faction
      })
    }

    const newGame = new GameState(playerSetups)
    setGameState(newGame)
    setActionMessage('Game started! DEPLOY Phase: Click or drag creatures from your hand to your starting zone (colored tiles).')
  }

  /**
   * Handle tile click for deployment, movement, and attacks
   * @param {Object} tile - Clicked tile
   */
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

        // Check if clicking on a valid movement tile (handle new pathfinding format)
        const validMove = validMoveTiles.find(vm => vm.tile.x === tile.x && vm.tile.y === tile.y)
        if (validMove && !tile.occupant) {
          // Show confirmation modal instead of moving immediately
          setPendingMove({
            creature: selectedBoardCreature,
            destination: tile,
            path: validMove.path,
            cost: validMove.cost
          })
          setShowMoveConfirm(true)
          return
        }

        // Deselect if clicking somewhere invalid
        setSelectedBoardCreature(null)
        setValidMoveTiles([])
        setValidAttackTargets([])
        setLineOfSightPath([])
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

  /**
   * Handle creature selection on board
   * Calculates valid moves and attack targets
   * @param {CreatureInstance} creatureInstance - Selected creature
   */
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

    // Calculate line-of-sight paths for ranged attacks
    const losPath = []
    targets.forEach(targetInfo => {
      if (targetInfo.attackType === 'ranged') {
        // Get line tiles for this ranged attack
        const lineTiles = gameState.getLineTiles(
          creatureInstance.position,
          targetInfo.creature.position
        )
        // Add all tiles in the line to the path (for visualization)
        lineTiles.forEach(pos => {
          // Skip attacker and target positions
          if ((pos.x === creatureInstance.position.x && pos.y === creatureInstance.position.y) ||
              (pos.x === targetInfo.creature.position.x && pos.y === targetInfo.creature.position.y)) {
            return
          }
          // Add to path if not already there
          if (!losPath.some(p => p.x === pos.x && p.y === pos.y)) {
            losPath.push(pos)
          }
        })
      }
    })
    setLineOfSightPath(losPath)

    setActionMessage(
      `Selected ${creatureInstance.creature.name}. ` +
      `Can move to ${moves.length} tiles or attack ${targets.length} enemies.`
    )
  }

  // Handle movement (with pathfinding info)
  const handleMove = (creatureInstance, targetTile, validMove) => {
    const success = gameState.moveCreature(creatureInstance, targetTile)

    if (success) {
      // Show movement cost in message
      const cost = validMove ? validMove.cost : '?'
      setActionMessage(
        `${creatureInstance.creature.name} moved to (${targetTile.x}, ${targetTile.y}) - Cost: ${cost}`
      )
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter(prev => prev + 1)
    } else {
      setActionMessage('Invalid move!')
    }
  }

  // Confirm movement from modal
  const confirmMove = () => {
    if (!pendingMove) return

    const success = gameState.moveCreature(pendingMove.creature, pendingMove.destination)

    if (success) {
      setActionMessage(
        `${pendingMove.creature.creature.name} moved to (${pendingMove.destination.x}, ${pendingMove.destination.y}) - Cost: ${pendingMove.cost}`
      )

      // Check if creature landed on treasure and is a human player
      const tile = gameState.getTile(pendingMove.destination.x, pendingMove.destination.y)
      if (tile?.treasure) {
        const creatureOwner = pendingMove.creature.owner
        const isHumanPlayer = isPlayerHuman(creatureOwner)

        if (isHumanPlayer) {
          // Show treasure discovery modal for human players
          setDiscoveredTreasure({
            creature: pendingMove.creature,
            treasure: tile.treasure,
            tile: tile
          })
          setShowTreasureDiscovery(true)
        }
      }
    } else {
      setActionMessage('Invalid move!')
    }

    setPendingMove(null)
    setShowMoveConfirm(false)
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setRenderCounter(prev => prev + 1)
  }

  // Cancel movement from modal
  const cancelMove = () => {
    setPendingMove(null)
    setShowMoveConfirm(false)
  }

  /**
   * Handle attack with Immediate reaction support
   * Shows modal for human defenders, uses AI logic for AI defenders
   * @param {CreatureInstance} attackerInstance - Attacking creature
   * @param {CreatureInstance} defenderInstance - Defending creature
   */
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

    // Check if defender is a human player
    const defenderPlayerId = defenderInstance.owner
    const isDefenderHuman = isPlayerHuman(defenderPlayerId)

    if (isDefenderHuman) {
      // Defender is human - show reaction modal
      setPendingAttack({
        attackerInstance,
        defenderInstance,
        targetInfo
      })
      setShowReactionModal(true)
    } else {
      // Defender is AI - use AI logic to decide on reactions
      const defenderAI = new SimpleAI(gameState, defenderPlayerId)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      // Process AI reactions
      if (reactionDecision.reactions.length > 0) {
        const defenderPlayer = gameState.players[defenderPlayerId]

        // Sort by cardIndex descending to prevent array shift issues
        reactionDecision.reactions.sort((a, b) => b.cardIndex - a.cardIndex)

        reactionDecision.reactions.forEach(reaction => {
          // Tap creature
          reaction.creature.isTapped = true
          // Discard card
          defenderPlayer.orderHand.splice(reaction.cardIndex, 1)
        })
      }

      // Execute attack immediately for AI defender
      const result = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)

      if (result.success) {
        let message = ''

        // Add reaction info to message
        if (reactionDecision.reactions.length > 0) {
          message += `⚡ AI used ${reactionDecision.reactions.length} Immediate card${reactionDecision.reactions.length !== 1 ? 's' : ''}! `
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
      setRenderCounter(prev => prev + 1)
    }
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

    // Continue processing remaining AI actions
    setProcessingAIAction(false)
  }

  // Handle collect morale from treasure (show confirmation modal)
  const handleCollectMorale = () => {
    if (!selectedBoardCreature) {
      setActionMessage('No creature selected')
      return
    }

    const tile = gameState.getTile(selectedBoardCreature.position.x, selectedBoardCreature.position.y)
    if (!tile?.treasure) {
      setActionMessage('No treasure at this location')
      return
    }

    // Show confirmation modal for human players
    setPendingCollection({
      creature: selectedBoardCreature,
      treasure: tile.treasure
    })
    setShowCollectConfirm(true)
  }

  // Confirm morale collection
  const confirmCollectMorale = () => {
    if (!pendingCollection) return

    const result = gameState.collectMorale(pendingCollection.creature)

    if (result.success) {
      setActionMessage(result.message)
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter(prev => prev + 1)
    } else {
      setActionMessage(result.message)
    }

    setPendingCollection(null)
    setShowCollectConfirm(false)
  }

  // Cancel morale collection
  const cancelCollectMorale = () => {
    setPendingCollection(null)
    setShowCollectConfirm(false)
  }

  // Process AI attack intention - check if defender is human and show modal if needed
  const processAIAttackIntention = (action) => {
    const { attackerInstance, defenderInstance, targetInfo } = action

    // Check if defender is a human player
    const defenderPlayerId = defenderInstance.owner
    const isDefenderHuman = isPlayerHuman(defenderPlayerId)

    if (isDefenderHuman) {
      // Defender is human - show reaction modal
      setPendingAttack({
        attackerInstance,
        defenderInstance,
        targetInfo
      })
      setShowReactionModal(true)
      // Modal handlers will call executeAttackAfterReactions which continues processing
    } else {
      // Defender is AI - use AI logic to decide on reactions
      const defenderAI = new SimpleAI(gameState, defenderPlayerId)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      // Process AI reactions
      if (reactionDecision.reactions.length > 0) {
        const defenderPlayer = gameState.players[defenderPlayerId]

        // Sort by cardIndex descending to prevent array shift issues
        reactionDecision.reactions.sort((a, b) => b.cardIndex - a.cardIndex)

        reactionDecision.reactions.forEach(reaction => {
          // Tap creature
          reaction.creature.isTapped = true
          // Discard card
          defenderPlayer.orderHand.splice(reaction.cardIndex, 1)
        })
      }

      // Execute attack immediately for AI defender
      const result = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)

      if (result.success) {
        let message = ''

        // Add reaction info to message
        if (reactionDecision.reactions.length > 0) {
          message += `⚡ AI used ${reactionDecision.reactions.length} Immediate card${reactionDecision.reactions.length !== 1 ? 's' : ''}! `
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

      setRenderCounter(prev => prev + 1)

      // Continue processing remaining AI actions
      setProcessingAIAction(false)
    }
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
          setRenderCounter(prev => prev + 1)
        } else {
          setActionMessage('Tile is occupied!')
        }
      } else {
        setActionMessage('Not enough leadership to deploy this creature!')
      }

      setDraggingCreatureIndex(null)
      setDragOverTile(null)
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

  // Process pending AI actions queue (for attacks that need defender modals)
  useEffect(() => {
    if (processingAIAction) return

    if (pendingAIActions.length === 0) {
      // Queue is empty - check if we need to advance phase after AI actions
      if (!isAIThinking && gameState && !gameState.gameOver) {
        const currentPlayerId = gameState.currentPlayer
        const isCurrentPlayerAI = !isPlayerHuman(currentPlayerId)

        // If current player is still AI and we just finished processing actions, advance phase
        if (isCurrentPlayerAI && gameState.currentPhase === GamePhases.ACTIVATE) {
          // Small delay before advancing
          setTimeout(() => {
            advancePhase()
          }, 500)
        }
      }
      return
    }

    // Process next action in queue
    setProcessingAIAction(true)
    const nextAction = pendingAIActions[0]

    // Remove the action from queue
    setPendingAIActions(prev => prev.slice(1))

    // Process the attack intention
    processAIAttackIntention(nextAction)
  }, [pendingAIActions, processingAIAction])

  // AI Turn Logic - Execute AI moves automatically
  useEffect(() => {
    if (!gameState || !gameConfig || gameState.gameOver || isAIThinking) return

    // Check if current player is AI
    const currentPlayerId = gameState.currentPlayer
    console.log(`[AI Turn Logic] Current Player: ${currentPlayerId}, Phase: ${gameState.currentPhase}`)
    const isCurrentPlayerAI = !isPlayerHuman(currentPlayerId)
    console.log(`[AI Turn Logic] Is current player AI? ${isCurrentPlayerAI}`)

    if (!isCurrentPlayerAI) {
      console.log(`[AI Turn Logic] Player ${currentPlayerId} is human, skipping AI execution`)
      return
    }

    console.log(`[AI Turn Logic] Executing AI turn for ${currentPlayerId}`)
    // AI should take its turn
    const executeAITurn = async () => {
      setIsAIThinking(true)

      // Small delay so player can see what's happening
      await new Promise(resolve => setTimeout(resolve, 800))

      const ai = new SimpleAI(gameState, currentPlayerId)
      const result = ai.executeTurn()

      // Check if there are attack intentions in the result
      const actions = result.actions || []
      const attackIntentions = actions.filter(action => action.type === 'attack_intention')

      if (attackIntentions.length > 0) {
        // Queue the attack intentions for processing
        setPendingAIActions(attackIntentions)
        setActionMessage(`AI: ${result.message}`)
        setRenderCounter(prev => prev + 1)
        setIsAIThinking(false)
        // Don't advance phase yet - will advance after all actions are processed
      } else {
        // No attack intentions, proceed normally
        setActionMessage(`AI: ${result.message}`)
        setRenderCounter(prev => prev + 1)

        // Small delay before advancing phase
        await new Promise(resolve => setTimeout(resolve, 500))

        // Auto-advance phase for AI
        advancePhase()

        setIsAIThinking(false)
      }
    }

    executeAITurn()
  }, [gameState?.currentPhase, gameState?.currentPlayer, gameState?.turnNumber])

  // Auto-execute REFRESH and CLEANUP phases only (ACTIVATE and DEPLOY require player actions)
  useEffect(() => {
    if (!gameState || !gameConfig || gameState.gameOver || isAIThinking) return

    const currentPlayerId = gameState.currentPlayer
    const isCurrentPlayerAI = !isPlayerHuman(currentPlayerId)
    console.log(`[Auto-execute phases] Player: ${currentPlayerId}, Is AI: ${isCurrentPlayerAI}, Phase: ${gameState.currentPhase}`)

    // Don't auto-execute if it's AI's turn (AI logic handles its own phases)
    if (isCurrentPlayerAI) {
      console.log(`[Auto-execute phases] Skipping auto-execution for AI player ${currentPlayerId}`)
      return
    }

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

  // PERFORMANCE: Cache position→creature map to avoid O(players × creatures) on every tile render
  // This converts 5,120 operations per render to just 1 Map creation + O(1) lookups
  const creaturePositionMap = useMemo(() => {
    if (!gameState) return new Map()

    const map = new Map()
    for (const playerId of gameState.activePlayers) {
      const player = gameState.players[playerId]
      player.creaturesInPlay.forEach(creature => {
        if (creature.position) {
          const key = `${creature.position.x},${creature.position.y}`
          map.set(key, creature)
        }
      })
    }
    return map
  }, [gameState, renderCounter]) // Rebuild when game state changes or render is forced

  const getTileCreature = (x, y) => {
    const key = `${x},${y}`
    return creaturePositionMap.get(key) || null
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
  const isCurrentPlayerAI = !isPlayerHuman(currentPlayerId)

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
                <div className="d-flex align-items-center gap-2">
                  <small className="text-info" style={{ fontSize: '0.85rem' }}>
                    {selectedBoardCreature.creature.name} selected - Click to move or attack
                  </small>
                  {/* Show Collect Morale button if creature is on treasure */}
                  {(() => {
                    const tile = gameState.getTile(selectedBoardCreature.position.x, selectedBoardCreature.position.y)
                    return tile?.treasure && (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={handleCollectMorale}
                        disabled={selectedBoardCreature.isTapped}
                        style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                      >
                        💎 Collect Morale ({tile.treasure.getDisplayString()})
                      </Button>
                    )
                  })()}
                </div>
              )}
            </Card.Header>
            <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
              <div className="board-grid">
                {Array.from({ length: gameState.boardHeight }).map((_, y) => (
                  <div key={y} className="board-row">
                    {Array.from({ length: gameState.boardWidth }).map((_, x) => {
                      const tile = gameState.getTile(x, y)
                      const creature = getTileCreature(x, y)

                      // Check if this tile is a valid move (handle new pathfinding format)
                      const validMove = validMoveTiles.find(vm => vm.tile.x === x && vm.tile.y === y)
                      const isValidMove = validMove !== undefined

                      // Check if this creature is a valid attack target and get attack type
                      const attackTargetInfo = validAttackTargets.find(
                        t => t.creature.position?.x === x && t.creature.position?.y === y
                      )
                      const isAttackTarget = attackTargetInfo !== undefined
                      const attackType = attackTargetInfo?.attackType

                      // Check if this is the selected creature
                      const isSelectedCreature = selectedBoardCreature?.position?.x === x &&
                                                  selectedBoardCreature?.position?.y === y

                      // Check if this tile is in the line-of-sight path
                      const isLineOfSight = lineOfSightPath.some(pos => pos.x === x && pos.y === y)

                      return (
                        <BoardTile
                          key={`${x}-${y}`}
                          tile={tile}
                          creature={creature}
                          isSelected={isSelectedCreature}
                          isValidMove={isValidMove}
                          movementInfo={validMove} // Pass movement info for cost display
                          isAttackTarget={isAttackTarget}
                          attackType={attackType}
                          isLineOfSight={isLineOfSight}
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
            isHuman={isPlayerHuman(currentPlayerId)}
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

      {/* Movement Confirmation Modal - positioned dynamically */}
      <Modal
        show={showMoveConfirm}
        onHide={cancelMove}
        dialogClassName="move-confirm-modal"
        centered
      >
        <Modal.Header closeButton className="py-2">
          <Modal.Title style={{ fontSize: '1rem', color: '#000' }}>Confirm Movement</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-2" style={{ color: '#000', fontSize: '0.9rem' }}>
          {pendingMove && (
            <div>
              <strong>{pendingMove.creature.creature.name}</strong> moves to{' '}
              <strong>({pendingMove.destination.x}, {pendingMove.destination.y})</strong>
              <div style={{ marginTop: '0.5rem' }}>
                Cost: <Badge bg="warning" text="dark">{pendingMove.cost}</Badge> / {pendingMove.creature.creature.speed}
              </div>

              {/* Water terrain warning */}
              {pendingMove.destination.terrain === 'WATER' && !gameState.hasFlying(pendingMove.creature) && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: '#fff3cd',
                    border: '2px solid #ff6b6b',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    ⚠️ Water Hazard Warning!
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#856404' }}>
                    This creature will take <strong>10 damage</strong> at the end of the ACTIVATE phase if it remains on water.
                  </div>
                </div>
              )}

              {/* Flying creature on water - no damage */}
              {pendingMove.destination.terrain === 'WATER' && gameState.hasFlying(pendingMove.creature) && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{ color: '#0c5460', fontSize: '0.85rem' }}>
                    ✈️ Flying creature - immune to water damage
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button variant="secondary" size="sm" onClick={cancelMove}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={confirmMove}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Treasure Discovery Modal */}
      <Modal
        show={showTreasureDiscovery}
        onHide={() => setShowTreasureDiscovery(false)}
        centered
      >
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)', color: '#000' }}>
          <Modal.Title style={{ fontSize: '1.2rem' }}>💎 Treasure Discovered!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ color: '#000', fontSize: '0.95rem' }}>
          {discoveredTreasure && (
            <div>
              <p>
                <strong>{discoveredTreasure.creature.creature.name}</strong> has discovered a treasure!
              </p>
              <div style={{
                background: 'linear-gradient(135deg, #fff9e6 0%, #ffe6b3 100%)',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid #ffd700',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💎</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  Morale Available: {discoveredTreasure.treasure.getDisplayString()}
                </div>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
                <strong>Note:</strong> You can collect 1 morale per action.
                {discoveredTreasure.creature.isTapped
                  ? ' This creature is tapped and cannot collect morale until next turn.'
                  : ' Use the "Collect Morale" button to gather morale on your next action.'}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => setShowTreasureDiscovery(false)}
          >
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Morale Collection Confirmation Modal */}
      <Modal
        show={showCollectConfirm}
        onHide={cancelCollectMorale}
        centered
      >
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)', color: '#000' }}>
          <Modal.Title style={{ fontSize: '1.2rem' }}>💎 Collect Morale?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ color: '#000', fontSize: '0.95rem' }}>
          {pendingCollection && (
            <div>
              <p>
                <strong>{pendingCollection.creature.creature.name}</strong> will collect 1 morale from this treasure.
              </p>
              <div style={{
                background: 'linear-gradient(135deg, #fff9e6 0%, #ffe6b3 100%)',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid #ffd700',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💎</div>
                <div style={{ fontSize: '1rem' }}>
                  Current: {pendingCollection.treasure.getDisplayString()}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                  After collection: {pendingCollection.treasure.remainingMorale - 1}/{pendingCollection.treasure.moraleValue}
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                {pendingCollection.creature.hasMovedThisTurn ? (
                  <span style={{ color: '#d9534f' }}>
                    ⚠️ This creature will be TAPPED after collecting (moved + action).
                  </span>
                ) : (
                  <span style={{ color: '#5bc0de' }}>
                    ℹ️ This creature's ACTION will be used. Movement still available.
                  </span>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelCollectMorale}>
            No
          </Button>
          <Button variant="warning" onClick={confirmCollectMorale}>
            Yes, Collect Morale
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default GameBoard
