import { useState, useEffect, useMemo, useCallback } from 'react'
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
 * ToastNotification - Individual toast with auto-dismiss
 * Auto-dismisses after 3 seconds
 */
function ToastNotification({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, 3000)

    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div
      className="toast-notification"
      style={{
        backgroundColor: '#2a2a2a',
        border: '2px solid #4a90e2',
        borderRadius: '6px',
        padding: '10px 14px',
        color: '#fff',
        fontSize: '0.85rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        animation: 'toastSlideIn 0.3s ease-out',
        maxWidth: '100%',
        wordWrap: 'break-word'
      }}
    >
      {toast.message}
    </div>
  )
}

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

  // Toast notification system
  const [toastMessages, setToastMessages] = useState([]) // Array of {id, message, timestamp, round}
  const [isLogExpanded, setIsLogExpanded] = useState(false)
  const [turnLog, setTurnLog] = useState([]) // Full log since last turn
  const [nextToastId, setNextToastId] = useState(1)
  const [currentRound, setCurrentRound] = useState(1) // Track rounds for log clearing

  /**
   * Add a toast notification
   * Auto-dismisses after 3 seconds, max 10 visible at a time
   * Also adds to turn log for expanded view
   * Filters out "AI turn ended" messages
   */
  const addToast = (message) => {
    // Filter out "AI turn ended" messages
    if (message === 'AI: AI turn ended') return

    const id = nextToastId
    setNextToastId(prev => prev + 1)

    const newToast = {
      id,
      message,
      timestamp: Date.now(),
      round: currentRound
    }

    // Add to turn log
    setTurnLog(prev => [...prev, newToast])

    // Add to visible toasts (max 10)
    setToastMessages(prev => {
      const updated = [...prev, newToast]
      // Keep only the last 10 toasts
      return updated.slice(-10)
    })
  }

  /**
   * Remove a toast by ID (memoized to prevent timer resets)
   */
  const removeToast = useCallback((id) => {
    setToastMessages(prev => prev.filter(t => t.id !== id))
  }, [])

  /**
   * Clear old logs when human player's turn ends
   * Keeps current round and previous round visible
   */
  const clearOldLogs = (newRound) => {
    setTurnLog(prev => prev.filter(t => t.round >= newRound - 1))
    setToastMessages(prev => prev.filter(t => t.round >= newRound - 1))
  }
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

  // SELLSWORD ability modal state (Drow on treasure - choose morale or card)
  const [showSellswordModal, setShowSellswordModal] = useState(false)
  const [sellswordPending, setSellswordPending] = useState(null) // Stores {creature, treasure}

  // VERSATILE ability modal state (Adventurer extra move after attack)
  const [showVersatileModal, setShowVersatileModal] = useState(false)
  const [versatilePending, setVersatilePending] = useState(null) // Stores {creature}

  // VERSATILE "Move as Action" confirmation modal state
  const [showVersatileActionModal, setShowVersatileActionModal] = useState(false)
  const [versatileActionPending, setVersatileActionPending] = useState(null) // Stores creature instance

  // HORDE ability modal state (deploy during REFRESH phase)
  const [showHordeModal, setShowHordeModal] = useState(false)
  const [hordeRefreshExecuted, setHordeRefreshExecuted] = useState(false) // Track if refresh actions done

  /**
   * Faction color mapping from faction IDs to hex colors
   */
  const factionColors = {
    [Factions.STING_OF_LOLTH]: '#8b008b',      // Purple
    [Factions.HEART_OF_CORMYR]: '#0066cc',     // Blue
    [Factions.TYRANNY_OF_GOBLINS]: '#cc0000',  // Red
    [Factions.CURSE_OF_UNDEATH]: '#00bcd4',    // Cyan
    [Factions.BLOOD_OF_GRUUMSH]: '#8b4513'     // Brown
  }

  /**
   * Create mapping of player IDs to their faction colors
   * Used to dynamically color starting zones
   */
  const playerFactionColors = useMemo(() => {
    if (!gameConfig || !gameState) return {}

    const colorMap = {}
    gameState.activePlayers.forEach(playerId => {
      const playerNum = playerId.replace('PLAYER', '')
      const playerKey = `player${playerNum}`
      const faction = gameConfig[playerKey]?.faction
      if (faction && factionColors[faction]) {
        colorMap[playerId] = factionColors[faction]
      }
    })
    return colorMap
  }, [gameConfig, gameState])

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
   * Check if deployment is allowed in the current phase
   * Normal: only DEPLOY phase allows deployment
   * HORDE ability: REFRESH phase also allows deployment
   * @returns {boolean} True if deployment is currently allowed
   */
  const canDeployInCurrentPhase = () => {
    if (!gameState) return false

    // Always allow deployment in DEPLOY phase
    if (gameState.currentPhase === GamePhases.DEPLOY) return true

    // HORDE ability allows deployment in REFRESH phase
    if (gameState.currentPhase === GamePhases.REFRESH) {
      return gameState.canDeployDuringRefresh(gameState.currentPlayer)
    }

    return false
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

    // Create 32 order cards (one of each unique order card #1-#32)
    const createOrderDeck = (faction) => {
      const deck = sampleOrderCards[faction].map(o => new OrderCard(o))
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

    // DEPLOY PHASE (or REFRESH with HORDE): Deploy creature from hand
    if (selectedCreatureIndex !== null && canDeployInCurrentPhase()) {
      const creatureCard = currentPlayer.creatureHand[selectedCreatureIndex]

      // Check if tile is in player's starting zone
      const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                               tile.startingZoneOwner === gameState.currentPlayer

      // ORC SCOUT: Check if deploying Orc to treasure tile
      const isOrcScoutDeploy = tile.treasure && !tile.occupant &&
                               gameState.canUseOrcScout(gameState.currentPlayer) &&
                               (creatureCard.type || []).includes('Orc')

      if (!isInStartingZone && !isOrcScoutDeploy) {
        if (gameState.canUseOrcScout(gameState.currentPlayer) && tile.treasure) {
          addToast('ORC SCOUT: Only Orc creatures can be deployed to treasure tiles!')
        } else if (gameState.canUseOrcScout(gameState.currentPlayer)) {
          addToast('Deploy to your starting zone, or use ORC SCOUT to deploy an Orc to any treasure tile!')
        } else {
          addToast('You can only deploy creatures in your starting zone (highlighted area)!')
        }
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

          // Mark ORC SCOUT as used if deployed to treasure
          if (isOrcScoutDeploy) {
            gameState.markOrcScoutUsed(gameState.currentPlayer)
            setSelectedCreatureIndex(null)
            addToast(`ORC SCOUT: Deployed ${creatureCard.name} to treasure at (${tile.x}, ${tile.y})! Protected until your next turn!`)
          } else {
            setSelectedCreatureIndex(null)
            addToast(`Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`)
          }
          setRenderCounter(prev => prev + 1)
        } else {
          addToast('Tile is occupied!')
        }
      } else {
        addToast('Not enough leadership to deploy this creature!')
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
        addToast('Creature deselected')
      }
      // If clicking on a creature on the board
      else if (tile.occupant) {
        // Only select own creatures
        if (tile.occupant.owner === gameState.currentPlayer) {
          handleCreatureSelect(tile.occupant)
        } else {
          addToast('Cannot select enemy creatures!')
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
      addToast('Creature is tapped! Cannot move or attack.')
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

    addToast(
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
      addToast(
        `${creatureInstance.creature.name} moved to (${targetTile.x}, ${targetTile.y}) - Cost: ${cost}`
      )
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter(prev => prev + 1)
    } else {
      addToast('Invalid move!')
    }
  }

  // Confirm movement from modal
  const confirmMove = () => {
    if (!pendingMove) return

    const success = gameState.moveCreature(pendingMove.creature, pendingMove.destination)

    if (success) {
      // Check if this was a VERSATILE move (using action to move)
      if (pendingMove.creature.usingVersatileMove) {
        pendingMove.creature.isTapped = true // Uses action, so tap the creature
        pendingMove.creature.usingVersatileMove = false // Clear the flag
        addToast(
          `VERSATILE: ${pendingMove.creature.creature.name} moved to (${pendingMove.destination.x}, ${pendingMove.destination.y}) using their action!`
        )
      } else {
        addToast(
          `${pendingMove.creature.creature.name} moved to (${pendingMove.destination.x}, ${pendingMove.destination.y}) - Cost: ${pendingMove.cost}`
        )
      }

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
      addToast('Invalid move!')
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
      addToast('Creature is already tapped!')
      return
    }

    // Check if defender is protected (deployed this turn)
    if (defenderInstance.deployedThisTurn) {
      addToast(`${defenderInstance.creature.name} was just deployed and is protected until next turn!`)
      return
    }

    // Check if target is in range
    const targets = gameState.getValidAttackTargets(attackerInstance)
    const targetInfo = targets.find(t => t.creature.instanceId === defenderInstance.instanceId)

    if (!targetInfo) {
      addToast('Target is out of range!')
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
      // Defender is AI - use AI logic to decide on reactions and defensive abilities
      const defenderAI = new SimpleAI(gameState, defenderPlayerId)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      // Calculate incoming damage for defensive decisions
      const incomingDamage = targetInfo.attackType === 'melee'
        ? attackerInstance.creature.meleeAttack?.damage || 0
        : attackerInstance.creature.rangedAttack?.damage || 0

      // AI decides whether to use defensive abilities (COWER or UNSTOPPABLE HORDES)
      const defenseDecision = defenderAI.decideDefense(defenderInstance, incomingDamage, attackerInstance.owner)
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(defenderInstance, incomingDamage, attackerInstance.owner)
        if (defenseResult.success) {
          defenseResult.type = 'cower'
          defenseResult.damagePrevented = defenseResult.damageAvoided
        }
      } else if (defenseDecision.type === 'unstoppable_hordes') {
        // Apply UNSTOPPABLE HORDES for defender and any adjacent Undead
        let totalDamagePrevented = 0
        const creaturesUsed = []

        if (defenseDecision.defenderCanUse) {
          const result = gameState.applyUnstoppableHordes(defenderInstance)
          if (result.success) {
            totalDamagePrevented += result.damagePrevented
            creaturesUsed.push(defenderInstance)
          }
        }

        for (const creature of defenseDecision.creatures || []) {
          const result = gameState.applyUnstoppableHordes(creature)
          if (result.success) {
            totalDamagePrevented += result.damagePrevented
            creaturesUsed.push(creature)
          }
        }

        if (creaturesUsed.length > 0) {
          defenseResult = {
            success: true,
            type: 'unstoppable_hordes',
            damagePrevented: totalDamagePrevented,
            moraleCost: creaturesUsed.length,
            creaturesUsed
          }
        }
      }

      // Process AI reactions (IMMEDIATE cards)
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

      // Execute attack immediately for AI defender (with or without defense)
      let result
      if (defenseResult && defenseResult.success) {
        result = gameState.executeAttackWithDefense(attackerInstance, defenderInstance, targetInfo.attackType, defenseResult.damagePrevented, defenseResult.type)
      } else {
        result = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)
      }

      if (result.success) {
        let message = ''

        // Add defense info to message
        if (defenseResult && defenseResult.success) {
          if (defenseResult.type === 'cower') {
            message += `🛡️ AI used COWER: ${defenseResult.damagePrevented} damage avoided (cost ${defenseResult.moraleCost} morale)! `
          } else if (defenseResult.type === 'unstoppable_hordes') {
            message += `💀 AI used UNSTOPPABLE HORDES: ${defenseResult.damagePrevented} damage prevented (${defenseResult.creaturesUsed.length} Undead, cost ${defenseResult.moraleCost} morale)! `
          }
        }

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
          // BLOODTHIRSTY ability notification
          if (result.bloodthirsty) {
            message += ` 🩸 BLOODTHIRSTY: +${result.bloodthirsty.leadershipGained} Leadership!`
          }
        } else {
          message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
        }

        addToast(message)

        // Check for game over
        gameState.checkGameOver()
      } else {
        addToast(result.message || 'Attack failed!')
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

  /**
   * Handle defense selection from ImmediateReactionModal
   * Supports COWER (universal), UNSTOPPABLE HORDES (Morgana's Undead), and IMMEDIATE cards
   * After using a defense, checks if more defensive options are available and re-shows modal
   *
   * Big O Complexity: O(c) where c = creatures selected for UNSTOPPABLE HORDES (max 9)
   *
   * @param {Object} defense - { type: 'cower' | 'unstoppable_hordes' | 'immediate_card' | 'skip', damageReduction, moraleCost, creatures, card, creature }
   */
  const handleDefenseSelected = (defense) => {
    if (!pendingAttack) return

    const { attackerInstance, defenderInstance, targetInfo } = pendingAttack

    // Get current accumulated damage reduction (or initialize to 0)
    const accumulatedReduction = pendingAttack.accumulatedDamageReduction || 0

    // Calculate original incoming damage
    const originalDamage = targetInfo.attackType === 'melee'
      ? attackerInstance.creature.meleeAttack?.damage || 0
      : attackerInstance.creature.rangedAttack?.damage || 0

    if (defense.type === 'skip') {
      // No more defense - execute attack with accumulated reduction
      setShowReactionModal(false)
      if (accumulatedReduction > 0) {
        executeAttackAfterDefense({
          type: 'stacked_defense',
          damageReduction: accumulatedReduction,
          moraleCost: 0,
          success: true
        })
      } else {
        executeAttackAfterReactions([])
      }
      return
    }

    if (defense.type === 'cower') {
      // COWER: Avoid ALL damage, pay morale, tap creature
      const cowerResult = gameState.applyCower(
        defenderInstance,
        originalDamage,
        attackerInstance.owner
      )

      setShowReactionModal(false)
      executeAttackAfterDefense({
        type: 'cower',
        damageReduction: cowerResult.damageAvoided,
        moraleCost: cowerResult.moraleCost,
        extraCost: cowerResult.extraCost,
        success: cowerResult.success
      })
    } else if (defense.type === 'unstoppable_hordes') {
      // UNSTOPPABLE HORDES: Apply for each selected Undead creature
      let totalDamageReduction = 0
      let totalMoraleCost = 0
      const tappedCreatures = []

      // Apply for each selected creature - O(c) where c = creatures selected (max 9)
      defense.creatures.forEach(creature => {
        const result = gameState.applyUnstoppableHordes(creature)
        if (result.success) {
          totalDamageReduction += result.damagePrevented
          totalMoraleCost += result.moraleCost
          tappedCreatures.push(creature.creature.name)
        }
      })

      setShowReactionModal(false)
      executeAttackAfterDefense({
        type: 'unstoppable_hordes',
        damageReduction: totalDamageReduction + accumulatedReduction,
        moraleCost: totalMoraleCost,
        tappedCreatures,
        success: totalDamageReduction > 0
      })
    } else if (defense.type === 'immediate_card') {
      // IMMEDIATE CARD: Prevent 10 damage, discard card, tap creature
      const result = gameState.applyImmediateCardDefense(defense.card, defense.creature)

      if (result.success) {
        const newAccumulatedReduction = accumulatedReduction + result.damagePrevented
        const remainingDamage = originalDamage - newAccumulatedReduction

        // Check if there are more defensive options available
        if (remainingDamage > 0) {
          const moreOptions = gameState.getDefenseOptions(defenderInstance, remainingDamage, attackerInstance.owner)
          const hasMoreOptions = moreOptions.cower?.canCower ||
                                  moreOptions.unstoppableHordes?.canUse ||
                                  moreOptions.adjacentUndead?.length > 0 ||
                                  moreOptions.immediateCards?.length > 0

          if (hasMoreOptions) {
            // Update pendingAttack with accumulated reduction and re-show modal
            setPendingAttack({
              ...pendingAttack,
              accumulatedDamageReduction: newAccumulatedReduction
            })
            // Force re-render of modal by toggling it
            setShowReactionModal(false)
            setTimeout(() => setShowReactionModal(true), 0)
            return
          }
        }

        // No more options or damage fully prevented - execute attack
        setShowReactionModal(false)
        executeAttackAfterDefense({
          type: 'immediate_card',
          damageReduction: newAccumulatedReduction,
          moraleCost: 0,
          cardUsed: result.cardUsed?.name || defense.card.name,
          creatureTapped: defense.creature.creature.name,
          success: true
        })
      } else {
        // Failed to use immediate card - show error or just skip
        console.warn('Failed to use IMMEDIATE card:', result.reason)
        setShowReactionModal(false)
        if (accumulatedReduction > 0) {
          executeAttackAfterDefense({
            type: 'stacked_defense',
            damageReduction: accumulatedReduction,
            moraleCost: 0,
            success: true
          })
        } else {
          executeAttackAfterReactions([])
        }
      }
    }
  }

  // Legacy callback - kept for backwards compatibility
  const handleCowerUsed = (_selectedReactions, damageReduction = 0) => {
    if (!pendingAttack) return

    // If using legacy modal with damageReduction param, use UNSTOPPABLE HORDES
    if (damageReduction > 0) {
      handleDefenseSelected({
        type: 'unstoppable_hordes',
        damageReduction,
        creatures: [pendingAttack.defenderInstance]
      })
    } else {
      // Legacy COWER behavior
      const cowerResult = gameState.applyCower(
        pendingAttack.defenderInstance,
        pendingAttack.targetInfo?.attackType === 'melee'
          ? pendingAttack.attackerInstance.creature.meleeAttack?.damage || 0
          : pendingAttack.attackerInstance.creature.rangedAttack?.damage || 0,
        pendingAttack.attackerInstance.owner
      )

      setShowReactionModal(false)
      executeAttackAfterDefense({
        type: 'cower',
        damageReduction: cowerResult.damageAvoided,
        moraleCost: cowerResult.moraleCost,
        success: cowerResult.success
      })
    }
  }

  /**
   * Execute attack after defense has been applied
   * Both COWER and UNSTOPPABLE HORDES use this unified handler
   *
   * Big O Complexity: O(c) where c = creatures in play for defender (for removal on kill)
   *
   * @param {Object} defenseResult - { type, damageReduction, moraleCost, success, ... }
   */
  const executeAttackAfterDefense = (defenseResult) => {
    if (!pendingAttack) return

    const { attackerInstance, defenderInstance, targetInfo } = pendingAttack

    // Execute attack with defense damage reduction
    const result = gameState.executeAttackWithDefense(
      attackerInstance,
      defenderInstance,
      targetInfo.attackType,
      defenseResult.damageReduction,
      defenseResult.type
    )

    if (result.success) {
      let message = ''

      // Add defense info to message
      if (defenseResult.success && defenseResult.damageReduction > 0) {
        if (defenseResult.type === 'cower') {
          message += `🛡️ COWER: ${defenderInstance.creature.name} avoids ALL damage! `
          if (defenseResult.extraCost > 0) {
            message += `(BLACK HAND OF BANE: +${defenseResult.extraCost} extra morale cost) `
          }
        } else if (defenseResult.type === 'unstoppable_hordes') {
          message += `💀 UNSTOPPABLE HORDES: ${defenseResult.damageReduction} damage prevented! `
          if (defenseResult.tappedCreatures?.length > 0) {
            message += `(${defenseResult.tappedCreatures.join(', ')} tapped) `
          }
        }
      }

      message += `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
                 `with ${targetInfo.attackType} for ${result.damage} damage!`

      if (result.destroyed) {
        message += ` ${defenderInstance.creature.name} was destroyed! `
        message += `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
                  `Defender ${result.moraleChange.defender}`
        // BLOODTHIRSTY ability notification
        if (result.bloodthirsty) {
          message += ` 🩸 BLOODTHIRSTY: +${result.bloodthirsty.leadershipGained} Leadership!`
        }
      } else {
        message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
      }

      addToast(message)
      gameState.checkGameOver()
    } else {
      addToast(result.message || 'Attack failed!')
    }

    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setPendingAttack(null)
    setRenderCounter(prev => prev + 1)

    // Continue processing remaining AI actions
    setProcessingAIAction(false)
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
        // BLOODTHIRSTY ability notification
        if (result.bloodthirsty) {
          message += ` 🩸 BLOODTHIRSTY: +${result.bloodthirsty.leadershipGained} Leadership!`
        }
      } else {
        message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
      }

      addToast(message)

      // Check for game over
      gameState.checkGameOver()
    } else {
      addToast(result.message || 'Attack failed!')
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
      addToast('No creature selected')
      return
    }

    const tile = gameState.getTile(selectedBoardCreature.position.x, selectedBoardCreature.position.y)
    if (!tile?.treasure) {
      addToast('No treasure at this location')
      return
    }

    // Check for SELLSWORD ability - Drow on treasure gives choice
    if (gameState.shouldTriggerSellsword(selectedBoardCreature)) {
      setSellswordPending({
        creature: selectedBoardCreature,
        treasure: tile.treasure
      })
      setShowSellswordModal(true)
      return
    }

    // Show normal confirmation modal for human players
    setPendingCollection({
      creature: selectedBoardCreature,
      treasure: tile.treasure
    })
    setShowCollectConfirm(true)
  }

  // SELLSWORD ability - choose morale
  const handleSellswordMorale = () => {
    if (!sellswordPending) return

    const result = gameState.collectMorale(sellswordPending.creature)
    if (result.success) {
      addToast(`SELLSWORD: ${sellswordPending.creature.creature.name} chose +1 Morale!`)
    } else {
      addToast(result.message)
    }

    setSellswordPending(null)
    setShowSellswordModal(false)
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setRenderCounter(prev => prev + 1)
  }

  // SELLSWORD ability - choose card draw
  const handleSellswordCard = () => {
    if (!sellswordPending) return

    const player = gameState.players[sellswordPending.creature.owner]
    const drawnCards = player.drawOrderCards(1)

    // Mark treasure as collected (reduce morale count) but don't give morale
    const tile = gameState.getTile(sellswordPending.creature.position.x, sellswordPending.creature.position.y)
    if (tile?.treasure) {
      tile.treasure.remainingMorale = Math.max(0, tile.treasure.remainingMorale - 1)
    }

    // Tap the creature (uses action)
    sellswordPending.creature.isTapped = true

    if (drawnCards.length > 0) {
      addToast(`SELLSWORD: ${sellswordPending.creature.creature.name} drew an Order card instead of morale!`)
    } else {
      addToast(`SELLSWORD: No Order cards left to draw!`)
    }

    setSellswordPending(null)
    setShowSellswordModal(false)
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setRenderCounter(prev => prev + 1)
  }

  // SCROLLBOOK ability - discard selected order card to draw a new one
  const handleScrollbookUse = (cardIndex) => {
    if (!gameState || cardIndex === null) return

    const result = gameState.useScrollbook(gameState.currentPlayer, cardIndex)

    if (result.success) {
      addToast(`SCROLLBOOK: Discarded ${result.discardedCard.name}, drew ${result.drawnCard ? result.drawnCard.name : 'nothing (deck empty)'}`)
      setSelectedOrderIndex(null) // Clear selection
      setRenderCounter(prev => prev + 1)
    } else {
      addToast(result.message)
    }
  }

  // Confirm morale collection
  const confirmCollectMorale = () => {
    if (!pendingCollection) return

    const result = gameState.collectMorale(pendingCollection.creature)

    if (result.success) {
      addToast(result.message)
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter(prev => prev + 1)
    } else {
      addToast(result.message)
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

    // VALIDATION: Skip attack if target is already dead (killed by previous attack in queue)
    if (defenderInstance.isDestroyed() || !defenderInstance.position) {
      console.log(`[AI Attack] Skipping attack - target ${defenderInstance.creature.name} is already dead`)
      setProcessingAIAction(false)
      return
    }

    // VALIDATION: Skip attack if attacker is already dead (e.g., killed by reaction)
    if (attackerInstance.isDestroyed() || !attackerInstance.position) {
      console.log(`[AI Attack] Skipping attack - attacker ${attackerInstance.creature.name} is already dead`)
      setProcessingAIAction(false)
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
      // Modal handlers will call executeAttackAfterReactions which continues processing
    } else {
      // Defender is AI - use AI logic to decide on reactions and defensive abilities
      const defenderAI = new SimpleAI(gameState, defenderPlayerId)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      // Calculate incoming damage for defensive decisions
      const incomingDamage = targetInfo.attackType === 'melee'
        ? attackerInstance.creature.meleeAttack?.damage || 0
        : attackerInstance.creature.rangedAttack?.damage || 0

      // AI decides whether to use defensive abilities (COWER or UNSTOPPABLE HORDES)
      const defenseDecision = defenderAI.decideDefense(defenderInstance, incomingDamage, attackerInstance.owner)
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(defenderInstance, incomingDamage, attackerInstance.owner)
        if (defenseResult.success) {
          defenseResult.type = 'cower'
          defenseResult.damagePrevented = defenseResult.damageAvoided
        }
      } else if (defenseDecision.type === 'unstoppable_hordes') {
        // Apply UNSTOPPABLE HORDES for defender and any adjacent Undead
        let totalDamagePrevented = 0
        const creaturesUsed = []

        if (defenseDecision.defenderCanUse) {
          const result = gameState.applyUnstoppableHordes(defenderInstance)
          if (result.success) {
            totalDamagePrevented += result.damagePrevented
            creaturesUsed.push(defenderInstance)
          }
        }

        for (const creature of defenseDecision.creatures || []) {
          const result = gameState.applyUnstoppableHordes(creature)
          if (result.success) {
            totalDamagePrevented += result.damagePrevented
            creaturesUsed.push(creature)
          }
        }

        if (creaturesUsed.length > 0) {
          defenseResult = {
            success: true,
            type: 'unstoppable_hordes',
            damagePrevented: totalDamagePrevented,
            moraleCost: creaturesUsed.length,
            creaturesUsed
          }
        }
      }

      // Process AI reactions (IMMEDIATE cards)
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

      // Execute attack immediately for AI defender (with or without defense)
      let result
      if (defenseResult && defenseResult.success) {
        result = gameState.executeAttackWithDefense(attackerInstance, defenderInstance, targetInfo.attackType, defenseResult.damagePrevented, defenseResult.type)
      } else {
        result = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)
      }

      if (result.success) {
        let message = ''

        // Add defense info to message
        if (defenseResult && defenseResult.success) {
          if (defenseResult.type === 'cower') {
            message += `🛡️ AI used COWER: ${defenseResult.damagePrevented} damage avoided (cost ${defenseResult.moraleCost} morale)! `
          } else if (defenseResult.type === 'unstoppable_hordes') {
            message += `💀 AI used UNSTOPPABLE HORDES: ${defenseResult.damagePrevented} damage prevented (${defenseResult.creaturesUsed.length} Undead, cost ${defenseResult.moraleCost} morale)! `
          }
        }

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
          // BLOODTHIRSTY ability notification
          if (result.bloodthirsty) {
            message += ` 🩸 BLOODTHIRSTY: +${result.bloodthirsty.leadershipGained} Leadership!`
          }
        } else {
          message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
        }

        addToast(message)

        // Check for game over
        gameState.checkGameOver()
      } else {
        addToast(result.message || 'Attack failed!')
      }

      setRenderCounter(prev => prev + 1)

      // Continue processing remaining AI actions
      setProcessingAIAction(false)
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (creatureIndex) => {
    if (canDeployInCurrentPhase()) {
      setDraggingCreatureIndex(creatureIndex)
    }
  }

  const handleDragEnd = () => {
    setDraggingCreatureIndex(null)
    setDragOverTile(null)
  }

  const handleDragOver = (tile, e) => {
    if (draggingCreatureIndex !== null && canDeployInCurrentPhase()) {
      const currentPlayer = gameState.getCurrentPlayerState()
      const creatureCard = currentPlayer.creatureHand[draggingCreatureIndex]
      const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                               tile.startingZoneOwner === gameState.currentPlayer

      // ORC SCOUT: Allow dragging Orc to treasure tiles
      const isOrcScoutValid = tile.treasure && !tile.occupant &&
                              gameState.canUseOrcScout(gameState.currentPlayer) &&
                              (creatureCard?.type || []).includes('Orc')

      if ((isInStartingZone || isOrcScoutValid) && !tile.occupant) {
        setDragOverTile(tile)
      } else {
        setDragOverTile(null)
      }
    }
  }

  const handleDrop = (tile, e) => {
    try {
      if (draggingCreatureIndex === null || !canDeployInCurrentPhase()) {
        return
      }

      const currentPlayer = gameState.getCurrentPlayerState()
      const creatureCard = currentPlayer.creatureHand[draggingCreatureIndex]

      // Check if tile is in player's starting zone
      const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                               tile.startingZoneOwner === gameState.currentPlayer

      // ORC SCOUT: Check if deploying Orc to treasure tile
      const isOrcScoutDeploy = tile.treasure && !tile.occupant &&
                               gameState.canUseOrcScout(gameState.currentPlayer) &&
                               (creatureCard.type || []).includes('Orc')

      if (!isInStartingZone && !isOrcScoutDeploy) {
        if (gameState.canUseOrcScout(gameState.currentPlayer)) {
          addToast('Deploy to your starting zone, or use ORC SCOUT to deploy an Orc to any treasure tile!')
        } else {
          addToast('You can only deploy creatures in your starting zone!')
        }
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

          // Mark ORC SCOUT as used if deployed to treasure
          if (isOrcScoutDeploy) {
            gameState.markOrcScoutUsed(gameState.currentPlayer)
            addToast(`ORC SCOUT: Deployed ${creatureCard.name} to treasure at (${tile.x}, ${tile.y})! Protected until your next turn!`)
          } else {
            addToast(`Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`)
          }
          setRenderCounter(prev => prev + 1)
        } else {
          addToast('Tile is occupied!')
        }
      } else {
        addToast('Not enough leadership to deploy this creature!')
      }

      setDraggingCreatureIndex(null)
      setDragOverTile(null)
    } catch (error) {
      console.error('!!! ERROR IN handleDrop !!!', error)
      console.error('Error stack:', error.stack)
      addToast(`Error deploying creature: ${error.message}`)
      setDraggingCreatureIndex(null)
      setDragOverTile(null)
      setRenderCounter(prev => prev + 1)
    }
  }

  const advancePhase = () => {
    if (!gameState) return

    switch (gameState.currentPhase) {
      case GamePhases.REFRESH:
        // If HORDE refresh was already executed, just advance (don't redo refresh actions)
        if (hordeRefreshExecuted) {
          // Clear deployment protection for creatures deployed during this refresh
          const player = gameState.getCurrentPlayerState()
          player.creaturesInPlay.forEach(creature => {
            if (creature.deployedThisTurn && creature.turnDeployed === gameState.turnNumber) {
              creature.clearDeploymentProtection()
            }
          })
          setHordeRefreshExecuted(false)
          gameState.advancePhase()
        } else {
          gameState.executeRefreshPhase()
        }
        break
      case GamePhases.ACTIVATE:
        gameState.advancePhase()
        break
      case GamePhases.DEPLOY:
        gameState.executeDeployPhase()
        break
      case GamePhases.CLEANUP:
        {
          // Track the player whose turn is ending (before cleanup advances to next player)
          const endingPlayer = gameState.currentPlayer
          const wasHumanTurn = isPlayerHuman(endingPlayer)

          // Track active players before cleanup to detect eliminations
          const playersBeforeCleanup = [...gameState.activePlayers]
          gameState.executeCleanupPhase()

          // Check for player eliminations and notify BEFORE incrementing round
          const eliminatedPlayers = playersBeforeCleanup.filter(
            playerId => !gameState.activePlayers.includes(playerId)
          )
          eliminatedPlayers.forEach(playerId => {
            const player = gameState.players[playerId]
            let reason = ''
            if (player.morale <= 0) {
              reason = 'Morale reached 0!'
            } else if (player.creaturesInPlay.length === 0) {
              reason = 'All creatures destroyed!'
            }
            addToast(`💀 ${playerId} has been eliminated! ${reason}`)
          })

          // Handle round increment and log clearing when HUMAN turn ends
          // This happens AFTER elimination toasts are added so they don't get cleared
          if (wasHumanTurn) {
            // Increment round and clear old logs (keeps current + previous round)
            const newRound = currentRound + 1
            setCurrentRound(newRound)
            clearOldLogs(newRound)
          }

          if (!gameState.gameOver) {
            addToast(`${gameState.currentPlayer}'s turn begins.`)
          }
        }
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
        addToast(`AI: ${result.message}`)
        setRenderCounter(prev => prev + 1)
        setIsAIThinking(false)
        // Don't advance phase yet - will advance after all actions are processed
      } else {
        // No attack intentions, proceed normally
        addToast(`AI: ${result.message}`)
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
    // Exception: HORDE ability allows deployment during REFRESH, so show modal instead
    if (gameState.currentPhase === GamePhases.REFRESH) {
      if (gameState.canDeployDuringRefresh(gameState.currentPlayer)) {
        // HORDE ability - execute refresh actions then show deployment modal
        const executeHordeRefresh = async () => {
          await new Promise(resolve => setTimeout(resolve, 500))

          // Execute refresh actions (untap, draw card, clear old protection)
          const player = gameState.getCurrentPlayerState()
          player.resetAbilitiesForNewTurn()
          player.drawOrderCards(1)
          player.creaturesInPlay.forEach(creature => creature.untap())
          player.creaturesInPlay.forEach(creature => {
            if (creature.deployedThisTurn && creature.turnDeployed !== gameState.turnNumber) {
              creature.clearDeploymentProtection()
            }
          })

          // Mark refresh as executed and show HORDE deployment modal
          setHordeRefreshExecuted(true)
          setShowHordeModal(true)
          setRenderCounter(prev => prev + 1)
        }

        if (!hordeRefreshExecuted && !showHordeModal) {
          executeHordeRefresh()
        }
      } else {
        // Normal refresh - auto-execute
        const executePhase = async () => {
          await new Promise(resolve => setTimeout(resolve, 800))
          advancePhase()
        }
        executePhase()
      }
    } else if (gameState.currentPhase === GamePhases.CLEANUP) {
      const executePhase = async () => {
        await new Promise(resolve => setTimeout(resolve, 800))
        advancePhase()
      }
      executePhase()
    }
  }, [gameState?.currentPhase, gameState?.currentPlayer, gameState?.turnNumber, isAIThinking, hordeRefreshExecuted, showHordeModal])

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
      {/* Game Over Alert - Full Width at Top */}
      {gameState.gameOver && (
        <div style={{ flexShrink: 0, marginBottom: '10px' }}>
          <Alert variant="warning" className="py-2 mb-0">
            <h5 className="mb-1">Game Over!</h5>
            <p className="mb-0">Winner: {gameState.winner}</p>
          </Alert>
        </div>
      )}

      {/* Battlefield and Right Panel Side by Side */}
      <div style={{ flex: 1, display: 'flex', gap: '10px', minHeight: 0 }}>
        {/* Battlefield - Left Side (no Card wrapper, just the grid) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="board-grid" style={{ flex: 1 }}>
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
                      playerFactionColors={playerFactionColors}
                      currentPlayer={gameState?.currentPlayer}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Turn Bar + Player Panel */}
        <div style={{ width: '500px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Compact Turn Bar - Above Player Panel */}
          <Card bg="dark" text="white" style={{ flexShrink: 0 }}>
            <Card.Body className="py-2 px-3">
              <div className="d-flex justify-content-between align-items-center">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Turn {gameState.turnNumber}
                  </span>
                  <span style={{ color: '#aaa' }}>-</span>
                  <span style={{ fontSize: '0.95rem' }}>{currentPlayerId}</span>
                  <Badge bg="info" style={{ fontSize: '0.75rem' }}>{gameState.currentPhase}</Badge>
                  {isAIThinking && <Badge bg="warning" style={{ fontSize: '0.7rem' }}>AI Thinking...</Badge>}
                  {isCurrentPlayerAI && !isAIThinking && <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>AI</Badge>}
                </div>
                <div>
                  {/* Show button for ACTIVATE, DEPLOY phases, and REFRESH with HORDE ability */}
                  {(gameState.currentPhase === GamePhases.ACTIVATE || canDeployInCurrentPhase()) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={advancePhase}
                      disabled={isCurrentPlayerAI || isAIThinking}
                      style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                    >
                      {getPhaseButtonText()}
                    </Button>
                  )}
                  {/* Show status for auto-executing phases (REFRESH without HORDE, CLEANUP) */}
                  {((gameState.currentPhase === GamePhases.REFRESH && !gameState.canDeployDuringRefresh(gameState.currentPlayer)) ||
                    gameState.currentPhase === GamePhases.CLEANUP) && !isCurrentPlayerAI && (
                    <Badge bg="warning" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>Auto-Executing...</Badge>
                  )}
                </div>
              </div>
              {/* Action Buttons Row - shown when creature selected on treasure */}
              {gameState.currentPhase === GamePhases.ACTIVATE && !isCurrentPlayerAI && selectedBoardCreature && (() => {
                const tile = gameState.getTile(selectedBoardCreature.position.x, selectedBoardCreature.position.y)
                const canCollect = tile?.treasure &&
                                   tile.treasure.remainingMorale > 0 &&
                                   !selectedBoardCreature.isTapped &&
                                   selectedBoardCreature.owner === gameState.currentPlayer

                if (canCollect) {
                  return (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={handleCollectMorale}
                        style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                      >
                        💎 Collect Morale
                      </Button>
                    </div>
                  )
                }
                return null
              })()}
            </Card.Body>
          </Card>

          {/* Player Panel - Takes remaining space */}
          <div style={{ flex: 1, minHeight: 0 }}>
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
              canUseScrollbook={gameState.canUseScrollbook(currentPlayerId)}
              onScrollbookUse={handleScrollbookUse}
              canDeployCreatures={canDeployInCurrentPhase()}
            />
          </div>
        </div>
      </div>

      {/* Toast Notification System - Bottom Right */}
      <div
        className="toast-container-wrapper"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          maxWidth: '400px'
        }}
      >
        {/* Individual Toasts */}
        {toastMessages.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}

        {/* Expand Log Button */}
        {turnLog.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLogExpanded(true)}
            style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              opacity: 0.8
            }}
          >
            📜 View Full Log ({turnLog.length})
          </Button>
        )}
      </div>

      {/* Expanded Log Overlay */}
      {isLogExpanded && (
        <div
          className="expanded-log-overlay"
          onClick={() => setIsLogExpanded(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'stretch'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '500px',
              backgroundColor: '#1a1a1a',
              borderLeft: '3px solid #4a90e2',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '15px',
              backgroundColor: '#2a2a2a',
              borderBottom: '2px solid #3a3a3a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, color: '#fff' }}>📜 Turn Log</h5>
              <Button
                variant="outline-light"
                size="sm"
                onClick={() => setIsLogExpanded(false)}
              >
                ✕
              </Button>
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '10px'
            }}>
              {turnLog.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>
                  No events this turn
                </p>
              ) : (
                turnLog.map((entry, idx) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '8px 12px',
                      marginBottom: '6px',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '4px',
                      borderLeft: '3px solid #4a90e2',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ color: '#888', marginRight: '8px' }}>#{idx + 1}</span>
                    {entry.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Immediate Reaction Modal - Defense Options (COWER / UNSTOPPABLE HORDES / IMMEDIATE Cards) */}
      {pendingAttack && (
        <ImmediateReactionModal
          show={showReactionModal}
          attackerInstance={pendingAttack.attackerInstance}
          defenderInstance={pendingAttack.defenderInstance}
          defenderPlayerState={gameState.players[pendingAttack.defenderInstance.owner]}
          gameState={gameState}
          accumulatedDamageReduction={pendingAttack.accumulatedDamageReduction || 0}
          onDefenseSelected={handleDefenseSelected}
          onCardsPlayed={handleReactionsPlayed}
          onSkip={handleReactionsSkipped}
          onCower={handleCowerUsed}
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

      {/* SELLSWORD Ability Modal - Choose Morale or Order Card */}
      <Modal
        show={showSellswordModal}
        onHide={() => {
          setShowSellswordModal(false)
          setSellswordPending(null)
        }}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#8b008b', color: 'white' }}>
          <Modal.Title>⚔️ SELLSWORD - Choose Your Reward!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {sellswordPending && (
            <div>
              <p><strong>{sellswordPending.creature.creature.name}</strong> is collecting treasure!</p>
              <p style={{ color: '#ffc107' }}>
                The Drow work for profit above all. Choose your reward:
              </p>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px' }}>
                <div style={{
                  padding: '15px',
                  border: '2px solid #ffc107',
                  borderRadius: '8px',
                  textAlign: 'center',
                  flex: 1
                }}>
                  <div style={{ fontSize: '2rem' }}>💰</div>
                  <div style={{ fontWeight: 'bold' }}>+1 Morale</div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Standard treasure reward</div>
                </div>
                <div style={{
                  padding: '15px',
                  border: '2px solid #17a2b8',
                  borderRadius: '8px',
                  textAlign: 'center',
                  flex: 1
                }}>
                  <div style={{ fontSize: '2rem' }}>📜</div>
                  <div style={{ fontWeight: 'bold' }}>Draw 1 Order Card</div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>More tactical options</div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="warning" size="lg" onClick={handleSellswordMorale}>
            💰 Take Morale
          </Button>
          <Button variant="info" size="lg" onClick={handleSellswordCard}>
            📜 Draw Card
          </Button>
        </Modal.Footer>
      </Modal>

      {/* VERSATILE Move as Action Confirmation Modal */}
      <Modal
        show={showVersatileActionModal}
        onHide={() => {
          setShowVersatileActionModal(false)
          setVersatileActionPending(null)
        }}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#0066cc', color: 'white' }}>
          <Modal.Title>🏃 VERSATILE - Move as Action</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {versatileActionPending && (
            <div>
              <p><strong>{versatileActionPending.creature.name}</strong> has already moved this turn.</p>
              <p style={{ color: '#5bc0de' }}>
                Use your <strong>standard action</strong> to move again up to {versatileActionPending.creature.speed} tiles?
              </p>
              <p style={{ fontSize: '0.9rem', color: '#ffc107' }}>
                Warning: This will consume your action - you will NOT be able to attack after this move!
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="secondary" onClick={() => {
            setShowVersatileActionModal(false)
            setVersatileActionPending(null)
          }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => {
            // Enable movement mode for the creature
            if (versatileActionPending) {
              const moves = gameState.getValidMovementTiles(versatileActionPending)
              setValidMoveTiles(moves)
              setValidAttackTargets([]) // Clear attack targets since using action to move
              addToast(`VERSATILE: ${versatileActionPending.creature.name} can move again using their action!`)
              // Mark that we're using versatile so completing move taps the creature
              versatileActionPending.usingVersatileMove = true
            }
            setShowVersatileActionModal(false)
            setVersatileActionPending(null)
          }}>
            🏃 Move as Action
          </Button>
        </Modal.Footer>
      </Modal>

      {/* VERSATILE Ability Modal - Extra Move After Attack */}
      <Modal
        show={showVersatileModal}
        onHide={() => {
          setShowVersatileModal(false)
          setVersatilePending(null)
        }}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#0066cc', color: 'white' }}>
          <Modal.Title>🏃 VERSATILE - Tactical Reposition!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {versatilePending && (
            <div>
              <p><strong>{versatilePending.creature.creature.name}</strong> has made an attack!</p>
              <p style={{ color: '#5bc0de' }}>
                Adventurers are versatile combatants. After attacking, you may move up to 2 tiles!
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                This allows you to reposition after striking - perfect for hit-and-run tactics.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="secondary" onClick={() => {
            setShowVersatileModal(false)
            setVersatilePending(null)
          }}>
            Skip Movement
          </Button>
          <Button variant="primary" onClick={() => {
            // Enable movement mode for the creature
            if (versatilePending) {
              setSelectedBoardCreature(versatilePending.creature)
              // Calculate valid moves (limited to 2 tiles for post-attack movement)
              const moves = gameState.getValidMovementTiles(versatilePending.creature, 2)
              setValidMoveTiles(moves)
              addToast(`VERSATILE: Select a tile to move ${versatilePending.creature.creature.name} (up to 2 tiles)`)
            }
            setShowVersatileModal(false)
            setVersatilePending(null)
          }}>
            🏃 Move (up to 2 tiles)
          </Button>
        </Modal.Footer>
      </Modal>

      {/* HORDE Ability Modal - Deploy During Refresh Phase */}
      <Modal
        show={showHordeModal}
        onHide={() => {
          // Don't allow closing without making a choice
        }}
        centered
        backdrop="static"
        size="lg"
      >
        <Modal.Header style={{ backgroundColor: '#cc0000', color: 'white' }}>
          <Modal.Title>⚔️ HORDE - Deploy During Refresh!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {gameState && (() => {
            const player = gameState.getCurrentPlayerState()
            const availableCreatures = player?.creatureHand || []
            const currentLeadership = player?.leadership || 0
            const usedLeadership = player?.creaturesInPlay?.reduce((sum, c) => sum + (c.creature?.level || 0), 0) || 0
            const availableLeadership = currentLeadership - usedLeadership

            return (
              <div>
                <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                  Snig the Axe's HORDE ability lets you deploy creatures NOW!
                </p>
                <div style={{
                  backgroundColor: '#1a1d21',
                  padding: '10px',
                  borderRadius: '5px',
                  marginBottom: '15px'
                }}>
                  <p style={{ margin: 0 }}>
                    <strong>Leadership Available:</strong>{' '}
                    <span style={{ color: '#5bc0de', fontSize: '1.2rem' }}>{availableLeadership}</span>
                    <span style={{ color: '#888', marginLeft: '10px' }}>
                      ({usedLeadership} / {currentLeadership} used)
                    </span>
                  </p>
                </div>

                {availableCreatures.length > 0 ? (
                  <div>
                    <p><strong>Creatures in Hand:</strong></p>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {availableCreatures.map((creature, idx) => {
                        const canAfford = creature.level <= availableLeadership
                        return (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: canAfford ? '#2d4a3e' : '#4a2d2d',
                              border: `2px solid ${canAfford ? '#5cb85c' : '#d9534f'}`,
                              borderRadius: '5px',
                              padding: '8px',
                              minWidth: '120px',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {creature.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                              Level: {creature.level}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: canAfford ? '#5cb85c' : '#d9534f'
                            }}>
                              {canAfford ? '✓ Can Deploy' : '✗ Too Expensive'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p style={{ marginTop: '15px', color: '#ffc107', fontSize: '0.9rem' }}>
                      Close this window to deploy creatures by clicking/dragging them to your starting zone.
                    </p>
                  </div>
                ) : (
                  <p style={{ color: '#888' }}>No creatures in hand to deploy.</p>
                )}

                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#3d2b1f',
                  borderRadius: '5px',
                  borderLeft: '4px solid #ffc107'
                }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#ffc107' }}>
                    <strong>Note:</strong> Creatures deployed during REFRESH phase will NOT be protected
                    from attacks once your ACTIVATE phase begins!
                  </p>
                </div>
              </div>
            )
          })()}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button
            variant="warning"
            onClick={() => {
              setShowHordeModal(false)
            }}
          >
            📦 Deploy Creatures
          </Button>
          <Button
            variant="success"
            onClick={() => {
              // Clear any deployment protection for creatures deployed this refresh
              // (they should NOT be protected since it's their own turn)
              const player = gameState.getCurrentPlayerState()
              player.creaturesInPlay.forEach(creature => {
                if (creature.deployedThisTurn && creature.turnDeployed === gameState.turnNumber) {
                  creature.clearDeploymentProtection()
                }
              })

              // Advance to ACTIVATE phase
              setShowHordeModal(false)
              setHordeRefreshExecuted(false)
              gameState.advancePhase()
              setRenderCounter(prev => prev + 1)
            }}
          >
            ✓ Done Deploying
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default GameBoard
