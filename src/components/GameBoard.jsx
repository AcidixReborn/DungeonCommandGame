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
import DeployConfirmPanel from './DeployConfirmPanel'
import SimpleAI from '../ai/simpleAI'
// Import custom hooks for state management
import { useNotifications, useSelection, useCombat } from '../hooks'
import DamageNotificationModal from './DamageNotificationModal'
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
function GameBoard({ onTurnInfoChange }) {
  const [gameState, setGameState] = useState(null)
  const [gameConfig, setGameConfig] = useState(null)
  const [factionConfig, setFactionConfig] = useState(null) // Stores faction selection before commander selection

  // Player panel collapse state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [renderCounter, setRenderCounter] = useState(0) // Force re-renders without destroying GameState

  // ============================================
  // CUSTOM HOOKS - Extracted state management
  // ============================================

  // Selection state hook - handles tile/creature selection and valid moves
  const {
    selectedTile, setSelectedTile,
    selectedCreatureIndex, setSelectedCreatureIndex,
    selectedOrderIndex, setSelectedOrderIndex,
    selectedBoardCreature, setSelectedBoardCreature,
    validMoveTiles, setValidMoveTiles,
    validAttackTargets, setValidAttackTargets,
    lineOfSightPath, setLineOfSightPath,
    rangedRangeTiles, setRangedRangeTiles,
    creatureViewMode, setCreatureViewMode,
    draggingCreatureIndex, setDraggingCreatureIndex,
    dragOverTile, setDragOverTile,
    factionHighlight, setFactionHighlight,
    clearBoardSelection,
    clearDragState
  } = useSelection()

  // Combat state hook - handles pending attacks, defense, move confirmation
  const {
    pendingAttack, setPendingAttack,
    combatPanelMode, setCombatPanelMode,
    combatHighlightCreatures, setCombatHighlightCreatures,
    showMoveConfirm, setShowMoveConfirm,
    pendingMove, setPendingMove,
    pendingRightClickAttack, setPendingRightClickAttack,
    pendingAIActions, setPendingAIActions,
    processingAIAction, setProcessingAIAction,
    closeCombatPanel
  } = useCombat()

  // Helper to check if current player is human (needed by notifications hook)
  const isCurrentPlayerHumanCheck = useCallback(() => {
    if (!gameConfig || !gameState) return true
    const currentPlayer = gameState.currentPlayer
    const playerNum = currentPlayer.replace('PLAYER', '')
    const playerKey = `player${playerNum}`
    return gameConfig[playerKey]?.isHuman || false
  }, [gameConfig, gameState])

  // Notification state hook - handles toasts and turn log
  const {
    toastMessages,
    turnLog,
    isLogExpanded, setIsLogExpanded,
    addToast,
    removeToast,
    clearOldLogs
  } = useNotifications({
    getCurrentTurnNumber: () => gameState?.turnNumber || 1,
    isCurrentPlayerHuman: isCurrentPlayerHumanCheck
  })

  // Treasure Discovery Modal state
  const [showTreasureDiscovery, setShowTreasureDiscovery] = useState(false)
  const [discoveredTreasure, setDiscoveredTreasure] = useState(null) // Stores {creature, treasure, tile}

  // Morale Collection Confirmation Modal state
  const [showCollectConfirm, setShowCollectConfirm] = useState(false)
  const [pendingCollection, setPendingCollection] = useState(null) // Stores {creature, treasure}

  // SELLSWORD ability modal state (Drow on treasure - choose morale or card)
  const [showSellswordModal, setShowSellswordModal] = useState(false)
  const [sellswordPending, setSellswordPending] = useState(null) // Stores {creature, treasure}

  // VERSATILE "Move as Action" confirmation modal state
  const [showVersatileActionModal, setShowVersatileActionModal] = useState(false)
  const [showScrollbookModal, setShowScrollbookModal] = useState(false)
  const [scrollbookCardIndex, setScrollbookCardIndex] = useState(null)
  const [versatileActionPending, setVersatileActionPending] = useState(null) // Stores creature instance
  // ============================================
  // VERSATILE DECLINED TRACKING - O(1) lookup via Set
  // Tracks creatures where user chose "Don't Use Ability" this turn
  // ============================================
  const [versatileDeclinedCreatures, setVersatileDeclinedCreatures] = useState(new Set())

  // HORDE ability modal state (deploy during REFRESH phase)
  const [showHordeModal, setShowHordeModal] = useState(false)
  const [hordeRefreshExecuted, setHordeRefreshExecuted] = useState(false) // Track if refresh actions done

  // FLASHING BLADES ability state (splash damage after melee attack)
  const [showFlashingBladesModal, setShowFlashingBladesModal] = useState(false)
  const [flashingBladesPending, setFlashingBladesPending] = useState(null) // { attacker, originalTarget, validTargets }
  const [flashingBladesTargetMode, setFlashingBladesTargetMode] = useState(false) // True when highlighting targets for selection

  // HIDDEN BLADE ability state (10 damage to adjacent tapped enemy after any attack)
  const [showHiddenBladeModal, setShowHiddenBladeModal] = useState(false)
  const [hiddenBladePending, setHiddenBladePending] = useState(null) // { attacker, validTargets }
  const [hiddenBladeTargetMode, setHiddenBladeTargetMode] = useState(false) // True when highlighting targets for selection

  // CONFUSION GAZE ability state (slide enemy then attack)
  const [showConfusionGazeModal, setShowConfusionGazeModal] = useState(false)
  const [confusionGazeMode, setConfusionGazeMode] = useState(null) // null | 'slide' | 'attack'
  const [confusionGazePending, setConfusionGazePending] = useState(null)
  // { attacker, target, validSlideTiles, slideDestination, attackTargets }

  // TOMB GUARDIAN SWIRL ability state - queue of splash attacks after melee
  const [pendingSplashAttacks, setPendingSplashAttacks] = useState([]) // Array of { attackerInstance, targetInstance, damage }
  const [currentSplashIndex, setCurrentSplashIndex] = useState(0) // Index into pendingSplashAttacks
  const [splashResults, setSplashResults] = useState([]) // Accumulated results for toast message

  // LIGHTNING BREATH ability state - multi-target ranged attack
  const [lightningBreathMode, setLightningBreathMode] = useState(false) // True when selecting targets
  const [lightningBreathAttacker, setLightningBreathAttacker] = useState(null) // The Dracolich
  const [lightningBreathTargets, setLightningBreathTargets] = useState([]) // Selected targets (max 3)
  const [lightningBreathValidTargets, setLightningBreathValidTargets] = useState([]) // All valid targets
  const [lightningBreathCurrentAttackIndex, setLightningBreathCurrentAttackIndex] = useState(0) // Current attack being resolved
  const [lightningBreathResults, setLightningBreathResults] = useState([]) // Results for summary toast

  // DISCIPLE OF KYUSS ability state - damage notification modal
  const [showDamageNotification, setShowDamageNotification] = useState(false)
  const [damageNotificationData, setDamageNotificationData] = useState(null)
  const [pendingPhaseAdvance, setPendingPhaseAdvance] = useState(false)

  // AI COMBAT DEATH modal queue - shows deaths during AI turns
  const [aiDeathQueue, setAiDeathQueue] = useState([])
  const [showAiDeathModal, setShowAiDeathModal] = useState(false)
  const [currentAiDeath, setCurrentAiDeath] = useState(null)

  // DEPLOY CONFIRMATION state (shows leadership cost before deploying)
  const [showDeployConfirm, setShowDeployConfirm] = useState(false)
  const [pendingDeployment, setPendingDeployment] = useState(null)
  // { creature, tile, creatureIndex, isFromGraveyard, source: 'drag'|'rightClick' }

  // GRAVEYARD DEPLOY state - tracks selected creature from graveyard for resurrection
  const [selectedGraveyardCreature, setSelectedGraveyardCreature] = useState(null)
  const [selectedGraveyardIndex, setSelectedGraveyardIndex] = useState(null)
  const [draggingFromGraveyard, setDraggingFromGraveyard] = useState(false)

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
   * Mapping of player IDs to faction names
   * Used for displaying faction icons on creature tokens
   * Big O Complexity: O(n) where n = number of active players (max 5)
   */
  const playerFactions = useMemo(() => {
    if (!gameConfig || !gameState) return {}

    const factionMap = {}
    gameState.activePlayers.forEach(playerId => {
      const playerNum = playerId.replace('PLAYER', '')
      const playerKey = `player${playerNum}`
      const faction = gameConfig[playerKey]?.faction
      if (faction) {
        factionMap[playerId] = faction
      }
    })
    return factionMap
  }, [gameConfig, gameState])

  /**
   * Compute all ranged LOS tiles for ALL ranged creatures on board when in ranged view mode
   * Big O Complexity: O(C * (2R+1)^2) where C = ranged creatures, R = max range
   */
  const allRangedLOSTiles = useMemo(() => {
    if (creatureViewMode !== 'ranged' || !gameState) return []
    // Debug: Check what creaturesInPlay contains from GameBoard
    console.log('[GameBoard] useMemo DEBUG - gameState.creaturesInPlay:', gameState.creaturesInPlay)
    console.log('[GameBoard] useMemo DEBUG - gameState type:', typeof gameState, gameState.constructor?.name)
    console.log('[GameBoard] useMemo DEBUG - renderCounter:', renderCounter)
    const tiles = gameState.getAllRangedLOSTiles()
    console.log('[GameBoard] allRangedLOSTiles computed:', {
      mode: creatureViewMode,
      tilesCount: tiles.length,
      creaturesInPlay: gameState.creaturesInPlay?.length
    })
    return tiles
  }, [creatureViewMode, gameState, renderCounter])

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

    // Create 12 unique creature cards (one of each)
    const createCreatureDeck = (faction) => {
      return sampleCreatures[faction].map(c => new Creature(c))
    }

    // Create 36 order cards (one of each unique order card #1-#36)
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
        faction: config[playerKey].faction,
        isHuman: config[playerKey].isHuman,
        aiDifficulty: config[playerKey].aiDifficulty
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

    // DEPLOY PHASE: Left-click on tile deselects creature (use right-click to deploy)
    if (selectedCreatureIndex !== null && canDeployInCurrentPhase()) {
      // Left-click on board deselects creature from hand
      setSelectedCreatureIndex(null)
      return
    }

    // ACTIVATE PHASE: Left-click to select creatures, right-click to move/attack
    if (gameState.currentPhase === GamePhases.ACTIVATE) {
      // If clicking on a creature on the board
      if (tile.occupant) {
        // Select own creatures
        if (tile.occupant.owner === gameState.currentPlayer) {
          handleCreatureSelect(tile.occupant)
        }
      } else {
        // Clicking on empty tile - deselect current creature
        if (selectedBoardCreature) {
          setSelectedBoardCreature(null)
          setValidMoveTiles([])
          setValidAttackTargets([])
          setLineOfSightPath([])
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

    // ============================================
    // VERSATILE ability check - O(1) Set lookup
    // Adventurer who has already moved can use action to move again
    // Skip modal if user already declined for this creature this turn
    // MUST check: Commander has VERSATILE ability AND creature is Heart of Cormyr AND Adventurer type
    // ============================================
    if (gameState.canUseVersatile && gameState.canUseVersatile(creatureInstance)) {
      // O(1) lookup - check if user already declined Versatile for this creature
      if (!versatileDeclinedCreatures.has(creatureInstance.id)) {
        // Show VERSATILE modal - offer to use action for extra move
        setVersatileActionPending(creatureInstance)
        setShowVersatileActionModal(true)
        return
      }
      // User declined - fall through to normal selection
    }

    setSelectedBoardCreature(creatureInstance)

    // Calculate valid moves
    const moves = gameState.getValidMovementTiles(creatureInstance)
    setValidMoveTiles(moves)

    // Calculate valid attack targets (filter out eliminated players)
    const targets = gameState.getValidAttackTargets(creatureInstance)
      .filter(target => gameState.activePlayers.includes(target.creature.owner))
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

    // Calculate ranged attack range tiles (for ranged view mode toggle)
    if (creatureInstance.creature.rangedAttack) {
      const rangeTiles = gameState.getRangedAttackRangeTiles(creatureInstance)
      setRangedRangeTiles(rangeTiles)
    } else {
      setRangedRangeTiles([])
    }

    // Reset to movement view when selecting a new creature
    setCreatureViewMode('movement')

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
   * Shows panel for human defenders, uses AI logic for AI defenders
   *
   * Big O Complexity: O(t) where t = valid attack targets for validation
   *
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
      // ============================================
      // COMBAT PANEL: Defender is human - show defense panel
      // O(1) state updates for panel mode and creature highlights
      // ============================================
      setPendingAttack({
        attackerInstance,
        defenderInstance,
        targetInfo
      })
      // Set combat panel to defense mode with creature highlights
      setCombatPanelMode('defense')
      setCombatHighlightCreatures({
        attacker: attackerInstance.instanceId,
        defender: defenderInstance.instanceId
      })
    } else {
      // Defender is AI - use AI logic to decide on reactions and defensive abilities
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      // Calculate incoming damage for defensive decisions
      const incomingDamage = targetInfo.attackType === 'melee'
        ? attackerInstance.creature.meleeAttack?.damage || 0
        : attackerInstance.creature.rangedAttack?.damage || 0

      // AI decides whether to use defensive abilities (COWER, UNSTOPPABLE HORDES, or IMMEDIATE cards)
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
      } else if (defenseDecision.type === 'immediate_card') {
        // Apply IMMEDIATE card defense
        const result = gameState.applyImmediateCardDefense(defenseDecision.card, defenseDecision.creature)
        if (result.success) {
          defenseResult = {
            success: true,
            type: 'immediate_card',
            damagePrevented: result.damagePrevented,
            moraleCost: result.moraleCost || 0,
            cardUsed: defenseDecision.card.name,
            creatureTapped: defenseDecision.creature.creature.name,
            moraleGain: result.moraleGain || 0,
            untapAfterUse: result.untapAfterUse || false
          }
        }
      }

      // Process AI reactions (IMMEDIATE cards) - legacy handling
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
          } else if (defenseResult.type === 'immediate_card') {
            let extraEffects = ''
            if (defenseResult.moraleGain > 0) extraEffects += ` +${defenseResult.moraleGain} morale!`
            if (defenseResult.untapAfterUse) extraEffects += ` ${defenseResult.creatureTapped} untapped!`
            message += `⚡ AI used ${defenseResult.cardUsed}: ${defenseResult.damagePrevented} damage prevented${defenseResult.untapAfterUse ? '' : ` (${defenseResult.creatureTapped} tapped)`}!${extraEffects} `
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

        // Check for FLASHING BLADES trigger (human attacker vs AI defender)
        if (checkFlashingBladesTrigger(attackerInstance, defenderInstance, result, targetInfo.attackType)) {
          // Modal shown - don't clear state yet, wait for modal response
          // BUT we DO need to trigger a re-render to show destroyed creature being removed
          setRenderCounter(prev => prev + 1)
          return
        }
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

    // Close modal/panel and execute the attack
    closeCombatPanel()
    executeAttackAfterReactions(selectedReactions)
  }

  // Handle when defender skips reactions
  const handleReactionsSkipped = () => {
    closeCombatPanel()
    executeAttackAfterReactions([])
  }

  // closeCombatPanel is now provided by useCombat hook

  /**
   * Handle defense selection from DefenseOptionsPanel
   * Supports COWER (universal), UNSTOPPABLE HORDES (Morgana's Undead), and IMMEDIATE cards
   * After using a defense, checks if more defensive options are available
   *
   * Big O Complexity: O(c) where c = creatures selected for UNSTOPPABLE HORDES (max 9)
   *
   * @param {Object} defense - { type: 'cower' | 'unstoppable_hordes' | 'immediate_card' | 'skip', damageReduction, moraleCost, creatures, card, creature }
   */
  const handleDefenseSelected = (defense) => {
    if (!pendingAttack) return

    const { attackerInstance, defenderInstance, targetInfo, isSplashDamage, isLightningBreath } = pendingAttack

    // Route splash damage defense to dedicated handler
    if (isSplashDamage || targetInfo.attackType === 'splash') {
      handleSplashDefenseSelected(defense)
      return
    }

    // Route Lightning Breath defense to dedicated handler
    if (isLightningBreath || targetInfo.attackType === 'lightning_breath') {
      handleLightningBreathDefenseSelected(defense)
      return
    }

    // Get current accumulated damage reduction (or initialize to 0)
    const accumulatedReduction = pendingAttack.accumulatedDamageReduction || 0

    // Calculate original incoming damage
    // For FLASHING BLADES, damage is always 10
    const originalDamage = targetInfo.attackType === 'flashing_blades'
      ? 10
      : targetInfo.attackType === 'melee'
        ? attackerInstance.creature.meleeAttack?.damage || 0
        : attackerInstance.creature.rangedAttack?.damage || 0

    if (defense.type === 'skip') {
      // No more defense - execute attack with accumulated reduction
      closeCombatPanel()
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

      closeCombatPanel()
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

      closeCombatPanel()
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
            // Update pendingAttack with accumulated reduction and re-show panel
            setPendingAttack({
              ...pendingAttack,
              accumulatedDamageReduction: newAccumulatedReduction
            })
            // Panel will automatically show updated damage reduction
            // (no need to toggle like with modal)
            return
          }
        }

        // No more options or damage fully prevented - execute attack
        closeCombatPanel()
        executeAttackAfterDefense({
          type: 'immediate_card',
          damageReduction: newAccumulatedReduction,
          moraleCost: 0,
          cardUsed: result.cardUsed?.name || defense.card.name,
          creatureTapped: defense.creature.creature.name,
          moraleGain: result.moraleGain || 0,
          untapAfterUse: result.untapAfterUse || false,
          success: true
        })
      } else {
        // Failed to use immediate card - show error or just skip
        console.warn('Failed to use IMMEDIATE card:', result.reason)
        closeCombatPanel()
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

      closeCombatPanel()
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

    const { attackerInstance, defenderInstance, targetInfo, isFlashingBlades, isHiddenBlade, isConfusionGaze } = pendingAttack

    let result
    if (isFlashingBlades || targetInfo.attackType === 'flashing_blades') {
      // FLASHING BLADES splash attack - use special handling
      // Apply defense reduction to the 10 splash damage
      const damageReduction = defenseResult.damageReduction || 0
      result = gameState.applyFlashingBladesWithDefense(defenderInstance, attackerInstance.owner, damageReduction)

      // Now tap the attacker (deferred from original attack)
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else if (isHiddenBlade || targetInfo.attackType === 'hidden_blade') {
      // HIDDEN BLADE attack - use special handling
      // Apply defense reduction to the 10 damage
      const damageReduction = defenseResult.damageReduction || 0
      result = gameState.applyHiddenBladeWithDefense(defenderInstance, attackerInstance.owner, damageReduction)

      // Now tap the attacker (deferred from original attack)
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else if (isConfusionGaze || targetInfo.attackType === 'confusion_gaze') {
      // CONFUSION GAZE attack - use the dedicated method with defense reduction
      const damageReduction = defenseResult.damageReduction || 0
      result = gameState.applyConfusionGazeWithDefense(attackerInstance, defenderInstance, damageReduction)
      // Mark attacker as attacked and tap if moved
      attackerInstance.hasAttackedThisTurn = true
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else {
      // Normal attack - execute with defense damage reduction
      result = gameState.executeAttackWithDefense(
        attackerInstance,
        defenderInstance,
        targetInfo.attackType,
        defenseResult.damageReduction,
        defenseResult.type
      )
    }

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
        } else if (defenseResult.type === 'immediate_card') {
          message += `⚡ IMMEDIATE: ${defenseResult.cardUsed} prevented ${defenseResult.damageReduction} damage! `
          if (defenseResult.creatureTapped && !defenseResult.untapAfterUse) {
            message += `(${defenseResult.creatureTapped} tapped) `
          }
          if (defenseResult.moraleGain > 0) {
            message += `(+${defenseResult.moraleGain} morale!) `
          }
          if (defenseResult.untapAfterUse) {
            message += `(${defenseResult.creatureTapped} untapped!) `
          }
        } else if (defenseResult.type === 'stacked_defense') {
          message += `⚡ STACKED DEFENSE: ${defenseResult.damageReduction} total damage prevented! `
        }
      }

      if (isFlashingBlades || targetInfo.attackType === 'flashing_blades') {
        message += `⚔️ FLASHING BLADES: ${attackerInstance.creature.name} deals ${result.damage} splash damage to ${defenderInstance.creature.name}!`
      } else if (isHiddenBlade || targetInfo.attackType === 'hidden_blade') {
        message += `🗡️ HIDDEN BLADE: ${attackerInstance.creature.name} strikes ${defenderInstance.creature.name} for ${result.damage} damage!`
      } else if (isConfusionGaze || targetInfo.attackType === 'confusion_gaze') {
        message += `😵 CONFUSION GAZE: ${attackerInstance.creature.name} strikes ${defenderInstance.creature.name} for ${result.damage} damage!`
      } else {
        message += `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
                   `with ${targetInfo.attackType} for ${result.damage} damage!`
      }

      if (result.destroyed) {
        message += ` ${defenderInstance.creature.name} was destroyed! `
        if (result.moraleChange) {
          message += `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
                    `Defender ${result.moraleChange.defender}`
        }
        // BLOODTHIRSTY ability notification
        if (result.bloodthirsty) {
          message += ` 🩸 BLOODTHIRSTY: +${result.bloodthirsty.leadershipGained} Leadership!`
        }
      } else {
        message += ` ${defenderInstance.creature.name} has ${result.remainingHP || defenderInstance.currentHP} HP remaining.`
      }

      // LIFE DRAIN toast notification
      if (result.lifeDrain?.triggered) {
        addToast(`🧛 LIFE DRAIN: ${result.lifeDrain.creatureName} healed ${result.lifeDrain.healAmount} HP! (${result.lifeDrain.currentHP}/${result.lifeDrain.maxHP})`)
      }

      addToast(message)
      gameState.checkGameOver()

      // Check for immediate elimination of defender
      const eliminationResult = gameState.checkAndEliminatePlayer(defenderInstance.owner)
      if (eliminationResult.eliminated) {
        const reason = eliminationResult.reason === 'morale'
          ? 'Morale reduced to 0!'
          : 'All creatures destroyed!'
        addToast(`🏳️ ${gameState.players[defenderInstance.owner].commander.name} has been eliminated! ${reason}`)
      }

      // Check for TOMB GUARDIAN SPLASH (SWIRL) - triggers on melee attacks regardless of result
      if (result.pendingSplashAttacks && result.pendingSplashAttacks.length > 0) {
        // Queue splash attacks for resolution
        setPendingSplashAttacks(result.pendingSplashAttacks)
        setCurrentSplashIndex(0)
        setSplashResults([])

        // Start processing first splash target
        const firstSplash = result.pendingSplashAttacks[0]
        const defenderPlayerId = firstSplash.targetInstance.owner

        // Check if defender is AI - auto-resolve, or human - show defense panel
        if (gameConfig) {
          const playerNum = defenderPlayerId.replace('PLAYER', '')
          const playerKey = `player${playerNum}`
          const isHuman = gameConfig[playerKey]?.isHuman

          if (!isHuman) {
            // AI defender - auto-resolve all splash attacks
            processSplashAttacksForAI(result.pendingSplashAttacks, attackerInstance)
          } else {
            // Human defender - show defense panel for first splash target
            setPendingAttack({
              attackerInstance: firstSplash.attackerInstance,
              defenderInstance: firstSplash.targetInstance,
              targetInfo: { attackType: 'splash', damage: 20 },
              isSplashDamage: true,
              splashSource: 'Skeletal Tomb Guardian'
            })
            setCombatPanelMode('defense')  // Show defense panel for splash damage
            setRenderCounter(prev => prev + 1)
            return  // Wait for defense resolution
          }
        }
        return
      }

      // Check for FLASHING BLADES trigger after defense (only for normal melee attacks, not splash/ability attacks)
      if (!isFlashingBlades && targetInfo.attackType !== 'flashing_blades' &&
          !isHiddenBlade && targetInfo.attackType !== 'hidden_blade' &&
          !isConfusionGaze && targetInfo.attackType !== 'confusion_gaze') {
        if (checkFlashingBladesTrigger(attackerInstance, defenderInstance, result, targetInfo.attackType)) {
          // Modal shown - don't clear state yet, wait for modal response
          // BUT we DO need to trigger a re-render to show destroyed creature being removed
          setRenderCounter(prev => prev + 1)
          return
        }

        // Check for HIDDEN BLADE trigger after defense (for any attack type - melee OR ranged)
        // HIDDEN BLADE checks for adjacent TAPPED enemies, so it must be checked AFTER defense
        // (using defense cards taps the defender)
        if (checkHiddenBladeTrigger(attackerInstance, result)) {
          // Modal shown - don't clear state yet, wait for modal response
          setRenderCounter(prev => prev + 1)
          return
        }
      }
    } else {
      addToast(result.message || 'Attack failed!')
    }

    // Clear FLASHING BLADES pending state if this was a splash attack
    if (isFlashingBlades || targetInfo.attackType === 'flashing_blades') {
      setFlashingBladesPending(null)
    }

    // Clear HIDDEN BLADE pending state if this was a hidden blade attack
    if (isHiddenBlade || targetInfo.attackType === 'hidden_blade') {
      setHiddenBladePending(null)
    }

    // Clear CONFUSION GAZE pending state if this was a confusion gaze attack
    if (isConfusionGaze || targetInfo.attackType === 'confusion_gaze') {
      setConfusionGazePending(null)
      setConfusionGazeMode(null)
    }

    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setPendingAttack(null)
    setRenderCounter(prev => prev + 1)

    // Continue processing remaining AI actions
    setProcessingAIAction(false)
  }

  /**
   * Process all splash attacks for AI defenders (auto-resolve defense)
   * AI uses decideDefense for each splash target
   *
   * @param {Array} splashAttacks - Array of splash attack objects
   * @param {CreatureInstance} attackerInstance - The attacking creature (Skeletal Tomb Guardian)
   */
  const processSplashAttacksForAI = (splashAttacks, attackerInstance) => {
    const results = []

    for (const splash of splashAttacks) {
      const targetInstance = splash.targetInstance
      const defenderPlayerId = targetInstance.owner

      // Get AI instance for defender
      const playerNum = defenderPlayerId.replace('PLAYER', '')
      const playerKey = `player${playerNum}`
      const difficulty = gameConfig[playerKey]?.difficulty || 'easy'
      const ai = new SimpleAI(gameState, defenderPlayerId, null, difficulty)

      // AI decides defense for this splash attack
      const defenseDecision = ai.decideDefense(targetInstance, 20, attackerInstance.owner)

      let damageAfterDefense = 20
      let defenseUsed = null

      // Apply defense if chosen
      if (defenseDecision.type === 'cower') {
        const cowerResult = gameState.applyCower(targetInstance, 20, attackerInstance.owner)
        damageAfterDefense = Math.max(0, 20 - cowerResult.damageAvoided)
        defenseUsed = 'cower'
      } else if (defenseDecision.type === 'unstoppable_hordes') {
        const creatures = defenseDecision.creatures || []
        let totalPrevented = 0
        creatures.forEach(c => {
          const result = gameState.applyUnstoppableHordes(c)
          if (result.success) totalPrevented += result.damagePrevented
        })
        // Add defender if they can use it
        if (defenseDecision.defenderCanUse) {
          const result = gameState.applyUnstoppableHordes(targetInstance)
          if (result.success) totalPrevented += result.damagePrevented
        }
        damageAfterDefense = Math.max(0, 20 - totalPrevented)
        defenseUsed = 'unstoppable_hordes'
      }

      // Apply splash damage
      const splashResult = gameState.combatResolver.executeSplashDamage(attackerInstance, targetInstance, damageAfterDefense)
      results.push({
        ...splashResult,
        defenseUsed,
        damageAfterDefense
      })
    }

    // Show combined toast for all splash results
    if (results.length > 0) {
      const hitNames = results.map(r => r.targetName).join(', ')
      const destroyedCount = results.filter(r => r.destroyed).length
      let msg = `💀 SWIRL: Skeletal Tomb Guardian dealt splash damage to ${hitNames}!`
      if (destroyedCount > 0) {
        msg += ` (${destroyedCount} destroyed!)`
      }
      addToast(msg)
    }

    // NOW tap the attacker (deferred from original attack until splash resolves)
    if (attackerInstance.hasMovedThisTurn && !attackerInstance.isTapped) {
      attackerInstance.tap()
    }

    // Clear splash state and combat panel
    setPendingSplashAttacks([])
    setCurrentSplashIndex(0)
    setSplashResults([])
    setPendingAttack(null)
    setCombatPanelMode(null)  // Clear combat panel after AI splash resolution
    setRenderCounter(prev => prev + 1)
  }

  /**
   * Handle splash damage defense selection (for human defenders)
   * Called when human chooses defense for a splash attack
   *
   * @param {Object} defense - Defense selection (same format as handleDefenseSelected)
   */
  const handleSplashDefenseSelected = (defense) => {
    if (pendingSplashAttacks.length === 0 || currentSplashIndex >= pendingSplashAttacks.length) {
      return
    }

    const currentSplash = pendingSplashAttacks[currentSplashIndex]
    const { attackerInstance, targetInstance } = currentSplash

    let damageAfterDefense = 20

    // Apply defense if not skipped
    if (defense.type === 'cower') {
      const cowerResult = gameState.applyCower(targetInstance, 20, attackerInstance.owner)
      damageAfterDefense = Math.max(0, 20 - cowerResult.damageAvoided)
    } else if (defense.type === 'unstoppable_hordes') {
      let totalPrevented = 0
      defense.creatures?.forEach(c => {
        const result = gameState.applyUnstoppableHordes(c)
        if (result.success) totalPrevented += result.damagePrevented
      })
      damageAfterDefense = Math.max(0, 20 - totalPrevented)
    } else if (defense.type === 'immediate_card') {
      const result = gameState.applyImmediateCardDefense(defense.card, defense.creature)
      if (result.success) {
        damageAfterDefense = Math.max(0, 20 - result.damagePrevented)
      }
    }

    // Apply splash damage
    const splashResult = gameState.combatResolver.executeSplashDamage(attackerInstance, targetInstance, damageAfterDefense)

    // Add to accumulated results
    const newResults = [...splashResults, {
      ...splashResult,
      defenseUsed: defense.type !== 'skip' ? defense.type : null,
      damageAfterDefense
    }]
    setSplashResults(newResults)

    // Check if more splash targets remain
    const nextIndex = currentSplashIndex + 1
    if (nextIndex < pendingSplashAttacks.length) {
      setCurrentSplashIndex(nextIndex)
      const nextSplash = pendingSplashAttacks[nextIndex]
      const nextDefenderPlayerId = nextSplash.targetInstance.owner

      // Check if next defender is AI or human
      const playerNum = nextDefenderPlayerId.replace('PLAYER', '')
      const playerKey = `player${playerNum}`
      const isHuman = gameConfig[playerKey]?.isHuman

      if (!isHuman) {
        // AI defender - auto-resolve remaining splash attacks
        const remainingSplashes = pendingSplashAttacks.slice(nextIndex)
        processSplashAttacksForAI(remainingSplashes, attackerInstance)
      } else {
        // Human defender - show defense panel for next target
        setPendingAttack({
          attackerInstance: nextSplash.attackerInstance,
          defenderInstance: nextSplash.targetInstance,
          targetInfo: { attackType: 'splash', damage: 20 },
          isSplashDamage: true,
          splashSource: 'Skeletal Tomb Guardian'
        })
        setCombatPanelMode('defense')  // Keep defense panel showing for next target
        setRenderCounter(prev => prev + 1)
      }
    } else {
      // All splash attacks resolved - show combined toast
      if (newResults.length > 0) {
        const hitNames = newResults.map(r => r.targetName).join(', ')
        const destroyedCount = newResults.filter(r => r.destroyed).length
        let msg = `💀 SWIRL: Skeletal Tomb Guardian dealt splash damage to ${hitNames}!`
        if (destroyedCount > 0) {
          msg += ` (${destroyedCount} destroyed!)`
        }
        addToast(msg)
      }

      // NOW tap the attacker (deferred from original attack until splash resolves)
      if (attackerInstance.hasMovedThisTurn && !attackerInstance.isTapped) {
        attackerInstance.tap()
      }

      // Clear splash state and combat panel
      setPendingSplashAttacks([])
      setCurrentSplashIndex(0)
      setSplashResults([])
      setPendingAttack(null)
      setCombatPanelMode(null)  // Clear combat panel after splash resolution
      setRenderCounter(prev => prev + 1)
    }
  }

  // Execute the attack after reactions have been handled
  const executeAttackAfterReactions = (reactions) => {
    if (!pendingAttack) return

    const { attackerInstance, defenderInstance, targetInfo, isFlashingBlades, isHiddenBlade, isConfusionGaze } = pendingAttack

    let result
    if (isFlashingBlades || targetInfo.attackType === 'flashing_blades') {
      // FLASHING BLADES splash attack - use special handling
      result = gameState.applyFlashingBlades(defenderInstance, attackerInstance.owner)
      // Now tap the attacker (deferred from original attack)
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else if (isHiddenBlade || targetInfo.attackType === 'hidden_blade') {
      // HIDDEN BLADE attack - use special handling
      result = gameState.applyHiddenBlade(defenderInstance, attackerInstance.owner)
      // Now tap the attacker (deferred from original attack)
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else if (isConfusionGaze || targetInfo.attackType === 'confusion_gaze') {
      // CONFUSION GAZE attack - use the dedicated method (no defense reduction since reactions don't prevent damage)
      result = gameState.applyConfusionGaze(attackerInstance, defenderInstance)
      // Mark attacker as attacked and tap if moved
      attackerInstance.hasAttackedThisTurn = true
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else {
      // Execute normal attack
      result = gameState.executeAttack(attackerInstance, defenderInstance, targetInfo.attackType)
    }

    if (result.success) {
      let message = ''

      // Add reaction info to message
      if (reactions.length > 0) {
        message += `⚡ ${reactions.length} Immediate card${reactions.length !== 1 ? 's' : ''} played! `
      }

      if (isFlashingBlades || targetInfo.attackType === 'flashing_blades') {
        message += `⚔️ FLASHING BLADES: ${attackerInstance.creature.name} deals ${result.damage} splash damage to ${defenderInstance.creature.name}!`
      } else if (isHiddenBlade || targetInfo.attackType === 'hidden_blade') {
        message += `🗡️ HIDDEN BLADE: ${attackerInstance.creature.name} strikes ${defenderInstance.creature.name} for ${result.damage} damage!`
      } else if (isConfusionGaze || targetInfo.attackType === 'confusion_gaze') {
        message += `😵 CONFUSION GAZE: ${attackerInstance.creature.name} strikes ${defenderInstance.creature.name} for ${result.damage} damage!`
      } else {
        message += `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
                   `with ${targetInfo.attackType} for ${result.damage} damage!`
      }

      if (result.destroyed) {
        message += ` ${defenderInstance.creature.name} was destroyed! `
        if (result.moraleChange) {
          message += `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
                    `Defender ${result.moraleChange.defender}`
        }
        // BLOODTHIRSTY ability notification
        if (result.bloodthirsty) {
          message += ` 🩸 BLOODTHIRSTY: +${result.bloodthirsty.leadershipGained} Leadership!`
        }
      } else {
        message += ` ${defenderInstance.creature.name} has ${result.remainingHP || defenderInstance.currentHP} HP remaining.`
      }

      // LIFE DRAIN toast notification
      if (result.lifeDrain?.triggered) {
        addToast(`🧛 LIFE DRAIN: ${result.lifeDrain.creatureName} healed ${result.lifeDrain.healAmount} HP! (${result.lifeDrain.currentHP}/${result.lifeDrain.maxHP})`)
      }

      addToast(message)

      // Check for game over
      gameState.checkGameOver()

      // Check for immediate elimination of defender
      const eliminationResult = gameState.checkAndEliminatePlayer(defenderInstance.owner)
      if (eliminationResult.eliminated) {
        const reason = eliminationResult.reason === 'morale'
          ? 'Morale reduced to 0!'
          : 'All creatures destroyed!'
        addToast(`🏳️ ${gameState.players[defenderInstance.owner].commander.name} has been eliminated! ${reason}`)
      }

      // Check for TOMB GUARDIAN SPLASH (SWIRL) - triggers on melee attacks regardless of result
      if (result.pendingSplashAttacks && result.pendingSplashAttacks.length > 0) {
        // Queue splash attacks for resolution
        setPendingSplashAttacks(result.pendingSplashAttacks)
        setCurrentSplashIndex(0)
        setSplashResults([])

        // Start processing first splash target
        const firstSplash = result.pendingSplashAttacks[0]
        const defenderPlayerId = firstSplash.targetInstance.owner

        // Check if defender is AI - auto-resolve, or human - show defense panel
        if (gameConfig) {
          const playerNum = defenderPlayerId.replace('PLAYER', '')
          const playerKey = `player${playerNum}`
          const isHuman = gameConfig[playerKey]?.isHuman

          if (!isHuman) {
            // AI defender - auto-resolve all splash attacks
            processSplashAttacksForAI(result.pendingSplashAttacks, attackerInstance)
          } else {
            // Human defender - show defense panel for first splash target
            setPendingAttack({
              attackerInstance: firstSplash.attackerInstance,
              defenderInstance: firstSplash.targetInstance,
              targetInfo: { attackType: 'splash', damage: 20 },
              isSplashDamage: true,
              splashSource: 'Skeletal Tomb Guardian'
            })
            setCombatPanelMode('defense')  // Show defense panel for splash damage
            setRenderCounter(prev => prev + 1)
            return  // Wait for defense resolution
          }
        }
        return
      }

      // Check for FLASHING BLADES trigger after reactions (only for normal attacks, not splash/ability attacks)
      if (!isFlashingBlades && targetInfo.attackType !== 'flashing_blades' &&
          !isHiddenBlade && targetInfo.attackType !== 'hidden_blade' &&
          !isConfusionGaze && targetInfo.attackType !== 'confusion_gaze') {
        if (checkFlashingBladesTrigger(attackerInstance, defenderInstance, result, targetInfo.attackType)) {
          // Modal shown - don't clear state yet, wait for modal response
          // BUT we DO need to trigger a re-render to show destroyed creature being removed
          setRenderCounter(prev => prev + 1)
          return
        }

        // Check for HIDDEN BLADE trigger after reactions (for any attack type - melee OR ranged)
        if (checkHiddenBladeTrigger(attackerInstance, result)) {
          // Modal shown - don't clear state yet, wait for modal response
          setRenderCounter(prev => prev + 1)
          return
        }
      }
    } else {
      addToast(result.message || 'Attack failed!')
    }

    // Clear FLASHING BLADES pending state if this was a splash attack
    if (isFlashingBlades || targetInfo.attackType === 'flashing_blades') {
      setFlashingBladesPending(null)
    }

    // Clear HIDDEN BLADE pending state if this was a hidden blade attack
    if (isHiddenBlade || targetInfo.attackType === 'hidden_blade') {
      setHiddenBladePending(null)
    }

    // Clear CONFUSION GAZE pending state if this was a confusion gaze attack
    if (isConfusionGaze || targetInfo.attackType === 'confusion_gaze') {
      setConfusionGazePending(null)
      setConfusionGazeMode(null)
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

  // ============================================
  // FLASHING BLADES ability handlers
  // ============================================

  // User chose to use FLASHING BLADES - enter target selection mode
  const handleFlashingBladesUse = () => {
    if (!flashingBladesPending) return

    // Close the modal and enter target selection mode
    setShowFlashingBladesModal(false)
    setFlashingBladesTargetMode(true)

    // Clear normal attack state to prevent interference with FLASHING BLADES target selection
    // These were left from the original attack and could cause issues
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setPendingRightClickAttack(null)

    // The valid targets are already in flashingBladesPending.validTargets
    // They will be highlighted on the board for right-click selection
  }

  // User chose to skip FLASHING BLADES
  const handleFlashingBladesSkip = () => {
    addToast(`${flashingBladesPending?.attacker.creature.name} chose not to use FLASHING BLADES.`)

    // Now tap the creature if it had moved (was deferred for FLASHING BLADES)
    if (flashingBladesPending?.attacker?.hasMovedThisTurn) {
      flashingBladesPending.attacker.tap()
    }

    // Clear state
    setFlashingBladesPending(null)
    setShowFlashingBladesModal(false)
    setFlashingBladesTargetMode(false)
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setRenderCounter(prev => prev + 1)
  }

  // User right-clicked on a valid FLASHING BLADES target - initiate attack
  const handleFlashingBladesTargetSelected = (targetInstance) => {
    if (!flashingBladesPending || !targetInstance) return

    // Set up a pending attack for the splash damage
    const attackerInstance = flashingBladesPending.attacker

    // Create a special flashing blades attack target info
    const targetInfo = {
      creature: targetInstance,
      attackType: 'flashing_blades',
      damage: 10
    }

    // Store the pending attack and show the attack panel
    setPendingAttack({
      attackerInstance,
      defenderInstance: targetInstance,
      targetInfo,
      isFlashingBlades: true
    })

    // Exit target selection mode
    setFlashingBladesTargetMode(false)

    // Show the combat panel for attack confirmation
    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: attackerInstance.instanceId,
      defender: targetInstance.instanceId
    })
  }

  // User confirmed FLASHING BLADES splash attack from the attack panel
  const handleFlashingBladesConfirmAttack = () => {
    if (!pendingAttack || !pendingAttack.isFlashingBlades) return

    const { attackerInstance, defenderInstance } = pendingAttack

    // Check if defender is human (needs defense options) or AI
    const defenderPlayerId = defenderInstance.owner
    const isDefenderHuman = isPlayerHuman(defenderPlayerId)

    if (isDefenderHuman) {
      // Show defense panel for the human defender
      setCombatPanelMode('defense')
    } else {
      // AI defender - check if AI wants to defend
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)

      // AI decides whether to use defensive abilities against 10 splash damage
      const defenseDecision = defenderAI.decideDefense(defenderInstance, 10, attackerInstance.owner)
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(defenderInstance, 10, attackerInstance.owner)
        if (defenseResult.success) {
          defenseResult.type = 'cower'
          defenseResult.damagePrevented = defenseResult.damageAvoided
          defenseResult.damageReduction = defenseResult.damageAvoided
        }
      } else if (defenseDecision.type === 'immediate_card') {
        const result = gameState.applyImmediateCardDefense(defenseDecision.card, defenseDecision.creature)
        if (result.success) {
          defenseResult = {
            success: true,
            type: 'immediate_card',
            damagePrevented: result.damagePrevented,
            damageReduction: result.damagePrevented,
            cardUsed: defenseDecision.card.name
          }
        }
      }

      // Execute the FLASHING BLADES attack
      closeCombatPanel()
      executeAttackAfterDefense({
        type: defenseResult?.type || 'none',
        damageReduction: defenseResult?.damageReduction || 0,
        success: !!defenseResult?.success
      })
    }
  }

  /**
   * Handle deployment confirmation - user confirmed deployment from modal
   * Creates the creature instance and places it on the board
   * Big O: O(1) - constant time operations
   */
  const handleDeployConfirm = () => {
    if (!pendingDeployment) return

    const { creature, tile, creatureIndex, isFromGraveyard, source,
            isOrcScoutDeploy, isShadowStalkerDeploy, isSummonSpiderDeploy, isLichNecromancerDeploy, isInStartingZone } = pendingDeployment

    const currentPlayer = gameState.getCurrentPlayerState()

    // Check leadership (double-check in case state changed)
    if (!currentPlayer.canDeployCreature(creature)) {
      addToast('Not enough leadership to deploy this creature!')
      setShowDeployConfirm(false)
      setPendingDeployment(null)
      return
    }

    // Additional check for graveyard resurrection: requires 1 morale
    if (isFromGraveyard && currentPlayer.morale < 1) {
      addToast('Not enough morale to resurrect this creature! (Requires 1 Morale)')
      setShowDeployConfirm(false)
      setPendingDeployment(null)
      return
    }

    // Create creature instance
    const creatureInstance = new CreatureInstance(creature, gameState.currentPlayer)
    creatureInstance.position = { x: tile.x, y: tile.y }

    // Mark as deployed this turn (protected from attacks)
    creatureInstance.markAsDeployed(gameState.turnNumber)

    // Add to play
    currentPlayer.creaturesInPlay.push(creatureInstance)
    tile.occupant = creatureInstance

    // Remove from source (hand or graveyard)
    if (isFromGraveyard) {
      // Remove from graveyard and deduct morale cost (1 morale for resurrection)
      gameState.removeFromGraveyard(gameState.currentPlayer, creature)
    } else {
      currentPlayer.creatureHand.splice(creatureIndex, 1)
    }

    // Mark ORC SCOUT as used if deployed to treasure
    if (isOrcScoutDeploy) {
      gameState.markOrcScoutUsed(gameState.currentPlayer)
      addToast(`ORC SCOUT: Deployed ${creature.name} to treasure at (${tile.x}, ${tile.y})! Protected until your next turn!`)
    } else if (isShadowStalkerDeploy && !isInStartingZone) {
      addToast(`SHADOW STALKER: ${creature.name} deployed near mountain at (${tile.x}, ${tile.y})! Protected until your next turn!`)
    } else if (isSummonSpiderDeploy && !isInStartingZone) {
      addToast(`SUMMON SPIDER: ${creature.name} summoned near Drow Priestess at (${tile.x}, ${tile.y})! Protected until your next turn!`)
    } else if (isLichNecromancerDeploy && !isInStartingZone) {
      addToast(`LICH NECROMANCER: ${creature.name} deployed adjacent to Lich at (${tile.x}, ${tile.y})! Protected until your next turn!`)
    } else if (isFromGraveyard) {
      addToast(`GRAVEYARD DEPLOY: ${creature.name} resurrected at (${tile.x}, ${tile.y})! Protected until your next turn!`)
    } else {
      addToast(`Deployed ${creature.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`)
    }

    // Clear selection based on source
    if (source === 'rightClick') {
      setSelectedCreatureIndex(null)
    }

    // Clear graveyard selection state if it was a graveyard deploy
    if (isFromGraveyard) {
      setSelectedGraveyardCreature(null)
      setSelectedGraveyardIndex(null)
      setDraggingFromGraveyard(false)
    }

    // Clear modal state and trigger re-render
    setShowDeployConfirm(false)
    setPendingDeployment(null)

    // Force re-render to show newly deployed creature on board
    // Use setTimeout to ensure state updates are processed before forcing render
    setTimeout(() => {
      setRenderCounter(prev => prev + 1)
    }, 0)
  }

  /**
   * Handle deployment cancellation - user cancelled from modal
   * Big O: O(1) - constant time
   */
  const handleDeployCancel = () => {
    setShowDeployConfirm(false)
    setPendingDeployment(null)
    // Also clear graveyard selection if cancelling a graveyard deploy
    setSelectedGraveyardCreature(null)
    setSelectedGraveyardIndex(null)
  }

  /**
   * Handle graveyard creature selection - player clicked a Zombie to resurrect
   * Big O: O(1) - constant time
   */
  const handleGraveyardCreatureSelect = (creature, index) => {
    if (selectedGraveyardCreature?.id === creature.id) {
      // Clicking same creature deselects it
      setSelectedGraveyardCreature(null)
      setSelectedGraveyardIndex(null)
    } else {
      setSelectedGraveyardCreature(creature)
      setSelectedGraveyardIndex(index)
    }
  }

  /**
   * Handle drag start from graveyard
   * Big O: O(1) - constant time
   */
  const handleGraveyardDragStart = (e, index, creature, fromGraveyard) => {
    if (fromGraveyard) {
      setSelectedGraveyardCreature(creature)
      setSelectedGraveyardIndex(index)
      setDraggingFromGraveyard(true)
      // Clear regular dragging state
      setDraggingCreatureIndex(null)
    }
  }

  /**
   * Handle drag end from graveyard
   * Big O: O(1) - constant time
   */
  const handleGraveyardDragEnd = () => {
    setDraggingFromGraveyard(false)
    setDragOverTile(null)
  }

  /**
   * Check and trigger FLASHING BLADES ability after a melee attack
   * Called after attack resolves and damage is dealt
   * @returns {boolean} True if FLASHING BLADES was triggered (modal shown)
   */
  const checkFlashingBladesTrigger = (attackerInstance, defenderInstance, attackResult, attackType) => {
    // Only trigger on melee attacks that dealt damage
    if (attackType !== 'melee') return false
    if (!attackResult.success || attackResult.damage <= 0) return false

    // Check if attacker has FLASHING BLADES
    if (!gameState.hasFlashingBlades(attackerInstance)) return false

    // Only show modal for human player (AI is handled separately)
    if (!isCurrentPlayerHumanCheck()) return false

    // Get valid splash targets - use ATTACKER's position for adjacency
    const validTargets = gameState.getFlashingBladesTargets(attackerInstance, defenderInstance)
    if (validTargets.length === 0) return false

    // Set up the pending ability and show modal
    setFlashingBladesPending({
      attacker: attackerInstance,
      originalTarget: defenderInstance,
      validTargets
    })
    setShowFlashingBladesModal(true)

    return true
  }

  // ============================================
  // HIDDEN BLADE ability handlers
  // ============================================

  // User chose to use HIDDEN BLADE - enter target selection mode
  const handleHiddenBladeUse = () => {
    if (!hiddenBladePending) return

    // Close the modal and enter target selection mode
    setShowHiddenBladeModal(false)
    setHiddenBladeTargetMode(true)

    // Clear normal attack state to prevent interference
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setPendingRightClickAttack(null)
  }

  // User chose to skip HIDDEN BLADE
  const handleHiddenBladeSkip = () => {
    addToast(`${hiddenBladePending?.attacker.creature.name} chose not to use HIDDEN BLADE.`)

    // Consume action - tap if creature has moved (deferred from original attack)
    if (hiddenBladePending?.attacker?.hasMovedThisTurn) {
      hiddenBladePending.attacker.tap()
    }

    // Clear state
    setHiddenBladePending(null)
    setShowHiddenBladeModal(false)
    setHiddenBladeTargetMode(false)
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setRenderCounter(prev => prev + 1)
  }

  // User right-clicked on a valid HIDDEN BLADE target - initiate attack
  const handleHiddenBladeTargetSelected = (targetInstance) => {
    if (!hiddenBladePending || !targetInstance) return

    // Set up a pending attack for the damage
    const attackerInstance = hiddenBladePending.attacker

    // Create a special hidden blade attack target info
    const targetInfo = {
      creature: targetInstance,
      attackType: 'hidden_blade',
      damage: 10
    }

    // Store the pending attack and show the attack panel
    setPendingAttack({
      attackerInstance,
      defenderInstance: targetInstance,
      targetInfo,
      isHiddenBlade: true
    })

    // Exit target selection mode
    setHiddenBladeTargetMode(false)

    // Show the combat panel for attack confirmation
    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: attackerInstance.instanceId,
      defender: targetInstance.instanceId
    })
  }

  // User confirmed HIDDEN BLADE attack from the attack panel
  const handleHiddenBladeConfirmAttack = () => {
    if (!pendingAttack || !pendingAttack.isHiddenBlade) return

    const { attackerInstance, defenderInstance } = pendingAttack

    // Check if defender is human (needs defense options) or AI
    const defenderPlayerId = defenderInstance.owner
    const isDefenderHuman = isPlayerHuman(defenderPlayerId)

    if (isDefenderHuman) {
      // Show defense panel for the human defender
      setCombatPanelMode('defense')
    } else {
      // AI defender - check if AI wants to defend
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)

      // AI decides whether to use defensive abilities against 10 damage
      const defenseDecision = defenderAI.decideDefense(defenderInstance, 10, attackerInstance.owner)
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(defenderInstance, 10, attackerInstance.owner)
        if (defenseResult.success) {
          defenseResult.type = 'cower'
          defenseResult.damagePrevented = defenseResult.damageAvoided
          defenseResult.damageReduction = defenseResult.damageAvoided
        }
      } else if (defenseDecision.type === 'immediate_card') {
        const result = gameState.applyImmediateCardDefense(defenseDecision.card, defenseDecision.creature)
        if (result.success) {
          defenseResult = {
            success: true,
            type: 'immediate_card',
            damagePrevented: result.damagePrevented,
            damageReduction: result.damagePrevented,
            cardUsed: defenseDecision.card.name
          }
        }
      }

      // Execute the HIDDEN BLADE attack
      closeCombatPanel()
      executeAttackAfterDefense({
        type: defenseResult?.type || 'none',
        damageReduction: defenseResult?.damageReduction || 0,
        success: !!defenseResult?.success
      })
    }
  }

  /**
   * Check and trigger HIDDEN BLADE ability after any attack
   * Called after attack resolves and defense phase completes
   * IMPORTANT: This checks for TAPPED targets, so it must be called AFTER defense
   * (using defense cards taps the defender)
   * @returns {boolean} True if HIDDEN BLADE was triggered (modal shown)
   */
  const checkHiddenBladeTrigger = (attackerInstance, attackResult) => {
    // Only trigger if attack dealt damage
    if (!attackResult.success || attackResult.damage <= 0) return false

    // Check if attacker has HIDDEN BLADE
    if (!gameState.hasHiddenBlade(attackerInstance)) return false

    // Only show modal for human player (AI is handled separately)
    if (!isCurrentPlayerHumanCheck()) return false

    // Get valid targets - adjacent TAPPED enemies (checked AFTER attack/defense resolves)
    const validTargets = gameState.getHiddenBladeTargets(attackerInstance)
    if (validTargets.length === 0) {
      // No valid targets - tap the creature if it had moved (was deferred for HIDDEN BLADE)
      if (attackerInstance.hasMovedThisTurn && !attackerInstance.isTapped) {
        attackerInstance.tap()
      }
      return false
    }

    // Set up the pending ability and show modal
    setHiddenBladePending({
      attacker: attackerInstance,
      validTargets
    })
    setShowHiddenBladeModal(true)

    return true
  }

  // ============================================================================
  // CONFUSION GAZE - Umber Hulk Ability (Sting of Lolth)
  // As a standard action, choose 1 enemy creature within 5 squares (with LOS)
  // and slide that creature up to 3 squares, then make a melee attack (30 damage)
  // ============================================================================

  /**
   * Check if right-click target is valid for CONFUSION GAZE
   * Called when Umber Hulk is selected and player right-clicks an enemy
   * @returns {boolean} True if CONFUSION GAZE modal was shown
   */
  const checkConfusionGazeOnRightClick = (selectedCreature, targetCreature) => {
    // Must have CONFUSION GAZE ability
    if (!gameState.hasConfusionGaze(selectedCreature)) return false
    // Must not have attacked yet
    if (selectedCreature.hasAttackedThisTurn) return false
    // Must not be tapped
    if (selectedCreature.isTapped) return false

    // Check if target is valid for CONFUSION GAZE (within 5 with LOS)
    const validTargets = gameState.getConfusionGazeTargets(selectedCreature)
    const isValidTarget = validTargets.some(t => t.instanceId === targetCreature.instanceId)

    if (isValidTarget) {
      // Show modal asking if player wants to use CONFUSION GAZE
      setConfusionGazePending({
        attacker: selectedCreature,
        target: targetCreature,
        validSlideTiles: [],
        slideDestination: null,
        attackTargets: []
      })
      setShowConfusionGazeModal(true)
      return true // Handled - don't show normal attack
    }
    return false // Not a valid CONFUSION GAZE target
  }

  // Handler when player confirms CONFUSION GAZE in modal
  const handleConfusionGazeConfirm = () => {
    if (!confusionGazePending) return

    setShowConfusionGazeModal(false)
    const { target } = confusionGazePending

    // Calculate valid slide destinations
    const validSlideTiles = gameState.getValidSlideTiles(target, 3)

    if (validSlideTiles.length === 0) {
      addToast('No valid slide destinations available!')
      setConfusionGazePending(null)
      return
    }

    setConfusionGazeMode('slide')
    setConfusionGazePending(prev => ({
      ...prev,
      validSlideTiles
    }))

    // Clear other selection states
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
  }

  // Handler when player declines CONFUSION GAZE
  const handleConfusionGazeDecline = () => {
    setShowConfusionGazeModal(false)
    setConfusionGazePending(null)
    // Player can still do normal attack if target is in melee/ranged range
  }

  // Handler when slide destination is selected (during slide mode)
  const handleConfusionGazeSlideSelected = (tile) => {
    if (!confusionGazePending || confusionGazeMode !== 'slide') return

    const { attacker, target, validSlideTiles } = confusionGazePending

    // Check if this tile is a valid slide destination
    const isValidSlide = validSlideTiles.some(t => t.x === tile.x && t.y === tile.y)
    if (!isValidSlide) return

    // Execute the slide
    const slideResult = gameState.executeConfusionGazeSlide(target, { x: tile.x, y: tile.y })
    addToast(`😵 Slid ${target.creature.name} from (${slideResult.oldPos.x}, ${slideResult.oldPos.y}) to (${slideResult.newPos.x}, ${slideResult.newPos.y})`)

    // IMPORTANT: Force re-render to show the slid creature in new position
    setRenderCounter(prev => prev + 1)

    // Determine attack targets
    const attackTargets = gameState.getConfusionGazeAttackTargets(attacker, target)

    if (attackTargets.length === 0) {
      // This shouldn't happen - slid creature should always be attackable
      handleConfusionGazeComplete()
      return
    }

    // Update state with slide destination and attack targets
    setConfusionGazePending(prev => ({
      ...prev,
      slideDestination: { x: tile.x, y: tile.y },
      attackTargets
    }))

    // If only one target, auto-select it (with small delay to allow render)
    if (attackTargets.length === 1) {
      setConfusionGazeMode('attack') // Keep mode for state tracking
      // Use setTimeout to allow render to complete before showing attack panel
      setTimeout(() => {
        handleConfusionGazeAttackSelected(attackTargets[0].target)
      }, 100)
      return
    }

    // Multiple targets - show attack selection mode
    setConfusionGazeMode('attack')
  }

  // Handler when attack target is selected (during attack mode)
  const handleConfusionGazeAttackSelected = (attackTarget) => {
    if (!confusionGazePending) return

    const { attacker } = confusionGazePending
    const damage = attacker.creature.meleeAttack?.damage || 30

    // Set up pending attack for confirmation
    setPendingAttack({
      attackerInstance: attacker,
      defenderInstance: attackTarget,
      targetInfo: { attackType: 'confusion_gaze', damage },
      isConfusionGaze: true
    })

    // Keep confusionGazePending so we can access attacker info later for tap logic
    // Clear confusion gaze MODE only (attack panel takes over for UI)
    setConfusionGazeMode(null)

    // Show attack confirmation panel
    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: attacker.instanceId,
      defender: attackTarget.instanceId
    })
  }

  // Handler when CONFUSION GAZE attack is confirmed from combat panel
  const handleConfusionGazeConfirmAttack = () => {
    if (!pendingAttack || !pendingAttack.isConfusionGaze) return

    const { attackerInstance, defenderInstance } = pendingAttack
    const damage = attackerInstance.creature.meleeAttack?.damage || 30

    // Check if defender is human (needs defense options) or AI
    const defenderPlayerId = defenderInstance.owner
    const isDefenderHuman = isPlayerHuman(defenderPlayerId)

    if (isDefenderHuman) {
      // Show defense panel for the human defender
      setCombatPanelMode('defense')
    } else {
      // AI defender - check if AI wants to defend
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)

      // AI decides whether to use defensive abilities
      const defenseDecision = defenderAI.decideDefense(defenderInstance, damage, attackerInstance.owner)
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(defenderInstance, damage, attackerInstance.owner)
        if (defenseResult.success) {
          defenseResult.type = 'cower'
          defenseResult.damagePrevented = defenseResult.damageAvoided
          defenseResult.damageReduction = defenseResult.damageAvoided
        }
      } else if (defenseDecision.type === 'immediate_card') {
        const result = gameState.applyImmediateCardDefense(defenseDecision.card, defenseDecision.creature)
        if (result.success) {
          defenseResult = {
            success: true,
            type: 'immediate_card',
            damagePrevented: result.damagePrevented,
            damageReduction: result.damagePrevented,
            cardUsed: defenseDecision.card.name
          }
        }
      }

      // Execute the attack
      closeCombatPanel()
      executeAttackAfterDefense({
        type: defenseResult?.type || 'none',
        damageReduction: defenseResult?.damageReduction || 0,
        success: !!defenseResult?.success
      })
    }
  }

  // Clean up after CONFUSION GAZE completes
  const handleConfusionGazeComplete = () => {
    if (confusionGazePending) {
      const { attacker } = confusionGazePending

      // Mark as attacked
      attacker.hasAttackedThisTurn = true

      // Tap if already moved
      if (attacker.hasMovedThisTurn) {
        attacker.tap()
      }
    }

    // Clear all confusion gaze state
    setConfusionGazeMode(null)
    setConfusionGazePending(null)
    setRenderCounter(prev => prev + 1)
  }

  // Cancel CONFUSION GAZE during slide selection
  const handleConfusionGazeCancel = () => {
    setConfusionGazeMode(null)
    setConfusionGazePending(null)
    setShowConfusionGazeModal(false)
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

  // Handle order card click - shows SCROLLBOOK modal if ability available
  const handleOrderCardClick = (cardIndex) => {
    if (!gameState) return

    const currentPlayerId = gameState.currentPlayer
    const canUseScrollbook = gameState.canUseScrollbook(currentPlayerId)

    if (canUseScrollbook) {
      // Show modal with option to use SCROLLBOOK
      setScrollbookCardIndex(cardIndex)
      setShowScrollbookModal(true)
    } else {
      // Just toggle selection as before
      setSelectedOrderIndex(selectedOrderIndex === cardIndex ? null : cardIndex)
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

    // VALIDATION: Skip attack if defender's owner is already eliminated
    if (!gameState.activePlayers.includes(defenderInstance.owner)) {
      console.log(`[AI Attack] Skipping attack - defender's owner ${defenderInstance.owner} is already eliminated`)
      setProcessingAIAction(false)
      return
    }

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

    // ============================================================================
    // VALIDATION: Re-validate attack is still valid - O(E) where E = enemy creatures
    // Positions may have changed since the attack intention was created
    // This prevents melee attacks from non-adjacent positions and ranged attacks
    // through forests/mountains after movement
    // ============================================================================
    const currentValidTargets = gameState.getValidAttackTargets(attackerInstance)
    const isStillValidTarget = currentValidTargets.some(
      t => t.creature.instanceId === defenderInstance.instanceId &&
           t.attackType === targetInfo.attackType
    )

    if (!isStillValidTarget) {
      console.log(`[AI Attack] Skipping attack - ${targetInfo.attackType} attack on ${defenderInstance.creature.name} is no longer valid from current position`)
      setProcessingAIAction(false)
      return
    }
    // ============================================================================
    // END ATTACK RE-VALIDATION
    // ============================================================================

    // Check if defender is a human player
    const defenderPlayerId = defenderInstance.owner
    const isDefenderHuman = isPlayerHuman(defenderPlayerId)

    if (isDefenderHuman) {
      // ============================================
      // COMBAT PANEL: Defender is human (AI attacking) - show defense panel
      // O(1) state updates for panel mode and creature highlights
      // Panel handlers will call executeAttackAfterReactions which continues processing
      // ============================================
      setPendingAttack({
        attackerInstance,
        defenderInstance,
        targetInfo
      })
      // Set combat panel to defense mode with creature highlights
      setCombatPanelMode('defense')
      setCombatHighlightCreatures({
        attacker: attackerInstance.instanceId,
        defender: defenderInstance.instanceId
      })
      // Panel handlers will call executeAttackAfterReactions which continues processing
    } else {
      // Defender is AI - use AI logic to decide on reactions and defensive abilities
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      // Calculate incoming damage for defensive decisions
      const incomingDamage = targetInfo.attackType === 'melee'
        ? attackerInstance.creature.meleeAttack?.damage || 0
        : attackerInstance.creature.rangedAttack?.damage || 0

      // AI decides whether to use defensive abilities (COWER, UNSTOPPABLE HORDES, or IMMEDIATE cards)
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
      } else if (defenseDecision.type === 'immediate_card') {
        // Apply IMMEDIATE card defense
        const result = gameState.applyImmediateCardDefense(defenseDecision.card, defenseDecision.creature)
        if (result.success) {
          defenseResult = {
            success: true,
            type: 'immediate_card',
            damagePrevented: result.damagePrevented,
            moraleCost: result.moraleCost || 0,
            cardUsed: defenseDecision.card.name,
            creatureTapped: defenseDecision.creature.creature.name,
            moraleGain: result.moraleGain || 0,
            untapAfterUse: result.untapAfterUse || false
          }
        }
      }

      // Process AI reactions (IMMEDIATE cards) - legacy handling
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
          } else if (defenseResult.type === 'immediate_card') {
            let extraEffects = ''
            if (defenseResult.moraleGain > 0) extraEffects += ` +${defenseResult.moraleGain} morale!`
            if (defenseResult.untapAfterUse) extraEffects += ` ${defenseResult.creatureTapped} untapped!`
            message += `⚡ AI used ${defenseResult.cardUsed}: ${defenseResult.damagePrevented} damage prevented${defenseResult.untapAfterUse ? '' : ` (${defenseResult.creatureTapped} tapped)`}!${extraEffects} `
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

          // Queue AI death modal for visibility
          const abilitiesTriggered = []
          if (result.lifeDrain) {
            abilitiesTriggered.push(`Life Drain: ${attackerInstance.creature.name} heals ${result.lifeDrain.healAmount} HP`)
          }
          if (result.bloodthirsty) {
            abilitiesTriggered.push(`Bloodthirsty: +${result.bloodthirsty.leadershipGained} Leadership`)
          }

          queueAiDeathModal({
            attackerInstance,
            defenderInstance,
            damageDealt: result.damage,
            attackType: targetInfo.attackType,
            abilitiesTriggered,
            moraleChanges: result.moraleChange
          })
        } else {
          message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
        }

        addToast(message)

        // Check for game over
        gameState.checkGameOver()


        // AI FLASHING BLADES check - after melee attack deals damage
        // Note: The creature's tapping is deferred if it has FLASHING BLADES
        if (targetInfo.attackType === 'melee' && result.damage > 0 && gameState.hasFlashingBlades(attackerInstance)) {
          const flashingTargets = gameState.getFlashingBladesTargets(attackerInstance, defenderInstance)
          if (flashingTargets.length > 0) {
            // Get AI difficulty to determine if ability should be used
            const playerNum = attackerInstance.owner.replace('PLAYER', '')
            const playerKey = `player${playerNum}`
            const difficulty = gameConfig[playerKey]?.difficulty || 'medium'

            // Easy: never use, Medium: 50%, Hard: always use
            let shouldUseAbility = false
            if (difficulty === 'hard') {
              shouldUseAbility = true
            } else if (difficulty === 'medium') {
              shouldUseAbility = Math.random() < 0.5
            }
            // Easy difficulty: shouldUseAbility stays false

            if (shouldUseAbility) {
              // Select best target (highest level/value)
              const bestTarget = flashingTargets.reduce((best, current) => {
                const bestValue = best.creature.level || 1
                const currentValue = current.creature.level || 1
                return currentValue > bestValue ? current : best
              }, flashingTargets[0])

              // Apply FLASHING BLADES damage
              const flashResult = gameState.applyFlashingBlades(bestTarget, attackerInstance.owner)

              let flashMessage = `⚔️ FLASHING BLADES: ${attackerInstance.creature.name} deals 10 splash damage to ${bestTarget.creature.name}!`
              if (flashResult.destroyed) {
                flashMessage += ` ${bestTarget.creature.name} was destroyed!`
                flashMessage += ` Morale changes: Attacker +${flashResult.moraleChange.attacker}, Defender ${flashResult.moraleChange.defender}`

                // Queue AI death modal for FLASHING BLADES kill
                queueAiDeathModal({
                  attackerInstance,
                  defenderInstance: bestTarget,
                  damageDealt: 10,
                  attackType: 'melee',
                  abilitiesTriggered: ['Flashing Blades: 10 splash damage to adjacent enemy'],
                  moraleChanges: flashResult.moraleChange
                })
              } else {
                flashMessage += ` ${bestTarget.creature.name} has ${flashResult.remainingHP} HP remaining.`
              }
              addToast(flashMessage)
            }
          }
          // Now tap the creature (deferred from attack due to FLASHING BLADES)
          if (attackerInstance.hasMovedThisTurn && !attackerInstance.isTapped) {
            attackerInstance.tap()
          }
        }

        // AI HIDDEN BLADE check - after ANY attack (melee or ranged) deals damage
        // Note: The creature's tapping is deferred if it has HIDDEN BLADE
        // HIDDEN BLADE targets must be TAPPED adjacent enemies
        if (result.damage > 0 && gameState.hasHiddenBlade(attackerInstance)) {
          const hiddenBladeTargets = gameState.getHiddenBladeTargets(attackerInstance)
          if (hiddenBladeTargets.length > 0) {
            // Get AI difficulty to determine if ability should be used
            const playerNum = attackerInstance.owner.replace('PLAYER', '')
            const playerKey = `player${playerNum}`
            const difficulty = gameConfig[playerKey]?.difficulty || 'medium'

            // Easy: never use, Medium: 50%, Hard: always use
            let shouldUseAbility = false
            if (difficulty === 'hard') {
              shouldUseAbility = true
            } else if (difficulty === 'medium') {
              shouldUseAbility = Math.random() < 0.5
            }
            // Easy difficulty: shouldUseAbility stays false

            if (shouldUseAbility) {
              // Select best target (lowest HP or highest level)
              const bestTarget = hiddenBladeTargets.reduce((best, current) => {
                // Prioritize low HP targets that can be killed
                if (current.currentHP <= 10 && best.currentHP > 10) return current
                if (best.currentHP <= 10 && current.currentHP > 10) return best
                // Otherwise, prioritize higher level targets
                const bestValue = best.creature.level || 1
                const currentValue = current.creature.level || 1
                return currentValue > bestValue ? current : best
              }, hiddenBladeTargets[0])

              // Apply HIDDEN BLADE damage
              const hiddenResult = gameState.applyHiddenBlade(bestTarget, attackerInstance.owner)

              let hiddenMessage = `🗡️ HIDDEN BLADE: ${attackerInstance.creature.name} strikes ${bestTarget.creature.name} for 10 damage!`
              if (hiddenResult.destroyed) {
                hiddenMessage += ` ${bestTarget.creature.name} was destroyed!`
                hiddenMessage += ` Morale changes: Attacker +${hiddenResult.moraleChange.attacker}, Defender ${hiddenResult.moraleChange.defender}`

                // Queue AI death modal for HIDDEN BLADE kill
                queueAiDeathModal({
                  attackerInstance,
                  defenderInstance: bestTarget,
                  damageDealt: 10,
                  attackType: 'melee',
                  abilitiesTriggered: ['Hidden Blade: 10 damage to adjacent tapped enemy'],
                  moraleChanges: hiddenResult.moraleChange
                })
              } else {
                hiddenMessage += ` ${bestTarget.creature.name} has ${hiddenResult.remainingHP} HP remaining.`
              }
              addToast(hiddenMessage)
            }
          }
          // Now tap the creature (deferred from attack due to HIDDEN BLADE)
          if (attackerInstance.hasMovedThisTurn && !attackerInstance.isTapped) {
            attackerInstance.tap()
          }
        }
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

      // SHADOW STALKER: Allow dragging Shadow Mastiff to mountain-adjacent tiles
      const isShadowStalkerValid = gameState.hasShadowStalker(creatureCard) &&
                                   !tile.occupant &&
                                   tile.terrain !== 'MOUNTAIN' &&
                                   gameState.board.isAdjacentToMountain(tile.x, tile.y)

      // SUMMON SPIDER: Allow dragging Spider creatures within 5 squares of Drow Priestess
      let isSummonSpiderValid = false
      if (gameState.isSpiderCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const priestess = gameState.hasSummonSpider(gameState.currentPlayer)
        if (priestess?.position) {
          const dx = Math.abs(tile.x - priestess.position.x)
          const dy = Math.abs(tile.y - priestess.position.y)
          isSummonSpiderValid = Math.max(dx, dy) <= 5
        }
      }

      if ((isInStartingZone || isOrcScoutValid || isShadowStalkerValid || isSummonSpiderValid) && !tile.occupant) {
        setDragOverTile(tile)
      } else {
        setDragOverTile(null)
      }
    }
  }

  const handleDrop = (tile, e) => {
    try {
      // Guard: Don't process drop if deploy confirmation modal is already showing
      if (showDeployConfirm) {
        return
      }

      // Handle graveyard creature deployment
      if (draggingFromGraveyard && selectedGraveyardCreature && canDeployInCurrentPhase()) {
        // Graveyard deploy only allowed in starting zone
        const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                                 tile.startingZoneOwner === gameState.currentPlayer

        if (!isInStartingZone) {
          addToast('Graveyard creatures can only be deployed in your starting zone!')
          setDraggingFromGraveyard(false)
          setDragOverTile(null)
          return
        }

        if (tile.occupant) {
          addToast('Tile is occupied!')
          setDraggingFromGraveyard(false)
          setDragOverTile(null)
          return
        }

        // Check if can resurrect (morale + leadership)
        if (!gameState.canResurrectCreature(gameState.currentPlayer, selectedGraveyardCreature)) {
          addToast('Cannot resurrect: not enough morale or leadership!')
          setDraggingFromGraveyard(false)
          setDragOverTile(null)
          return
        }

        // Show deployment confirmation modal
        setPendingDeployment({
          creature: selectedGraveyardCreature,
          tile: tile,
          creatureIndex: selectedGraveyardIndex,
          isFromGraveyard: true,
          source: 'drag',
          isOrcScoutDeploy: false,
          isShadowStalkerDeploy: false,
          isSummonSpiderDeploy: false,
          isInStartingZone: true
        })
        setShowDeployConfirm(true)
        setDraggingFromGraveyard(false)
        setSelectedGraveyardCreature(null)
        setSelectedGraveyardIndex(null)
        setDragOverTile(null)
        return
      }

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

      // SHADOW STALKER: Check if deploying Shadow Mastiff to mountain-adjacent tile
      const isShadowStalkerDeploy = gameState.hasShadowStalker(creatureCard) &&
                                    !tile.occupant &&
                                    tile.terrain !== 'MOUNTAIN' &&
                                    gameState.board.isAdjacentToMountain(tile.x, tile.y)

      // SUMMON SPIDER: Check if deploying Spider creature within 5 squares of Drow Priestess
      let isSummonSpiderDeploy = false
      if (gameState.isSpiderCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const priestess = gameState.hasSummonSpider(gameState.currentPlayer)
        if (priestess?.position) {
          const dx = Math.abs(tile.x - priestess.position.x)
          const dy = Math.abs(tile.y - priestess.position.y)
          isSummonSpiderDeploy = Math.max(dx, dy) <= 5
        }
      }

      // LICH NECROMANCER: Check if deploying Undead creature adjacent to Lich Necromancer
      let isLichNecromancerDeploy = false
      if (gameState.isUndeadCreature && gameState.isUndeadCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const lich = gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
        if (lich?.position) {
          const dx = Math.abs(tile.x - lich.position.x)
          const dy = Math.abs(tile.y - lich.position.y)
          isLichNecromancerDeploy = Math.max(dx, dy) === 1 // Adjacent only (range 1)
        }
      }

      if (!isInStartingZone && !isOrcScoutDeploy && !isShadowStalkerDeploy && !isSummonSpiderDeploy && !isLichNecromancerDeploy) {
        if (gameState.hasShadowStalker(creatureCard)) {
          addToast('SHADOW STALKER: Deploy to starting zone or any tile adjacent to a mountain!')
        } else if (gameState.isSpiderCreature(creatureCard) && gameState.hasSummonSpider(gameState.currentPlayer)) {
          addToast('SUMMON SPIDER: Deploy to starting zone or within 5 squares of Drow Priestess!')
        } else if (gameState.isUndeadCreature && gameState.isUndeadCreature(creatureCard) && gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(gameState.currentPlayer)) {
          addToast('LICH NECROMANCER: Deploy Undead to starting zone or adjacent to Lich Necromancer!')
        } else if (gameState.canUseOrcScout(gameState.currentPlayer)) {
          addToast('Deploy to your starting zone, or use ORC SCOUT to deploy an Orc to any treasure tile!')
        } else {
          addToast('You can only deploy creatures in your starting zone!')
        }
        setDraggingCreatureIndex(null)
        setDragOverTile(null)
        return
      }

      if (tile.occupant) {
        addToast('Tile is occupied!')
        setDraggingCreatureIndex(null)
        setDragOverTile(null)
        return
      }

      // Check if current player is human - show confirmation modal
      const isHuman = isPlayerHuman(gameState.currentPlayer)

      if (isHuman) {
        // Show deployment confirmation modal for human players
        setPendingDeployment({
          creature: creatureCard,
          tile: tile,
          creatureIndex: draggingCreatureIndex,
          isFromGraveyard: false,
          source: 'drag',
          isOrcScoutDeploy,
          isShadowStalkerDeploy,
          isSummonSpiderDeploy,
          isLichNecromancerDeploy,
          isInStartingZone
        })
        setShowDeployConfirm(true)
        setDraggingCreatureIndex(null)
        setDragOverTile(null)
        return
      }

      // AI players deploy directly (no confirmation needed)
      if (currentPlayer.canDeployCreature(creatureCard)) {
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
        } else if (isShadowStalkerDeploy && !isInStartingZone) {
          addToast(`SHADOW STALKER: ${creatureCard.name} deployed near mountain at (${tile.x}, ${tile.y})! Protected until your next turn!`)
        } else if (isSummonSpiderDeploy && !isInStartingZone) {
          addToast(`SUMMON SPIDER: ${creatureCard.name} summoned near Drow Priestess at (${tile.x}, ${tile.y})! Protected until your next turn!`)
        } else if (isLichNecromancerDeploy && !isInStartingZone) {
          addToast(`LICH NECROMANCER: ${creatureCard.name} deployed adjacent to Lich at (${tile.x}, ${tile.y})! Protected until your next turn!`)
        } else {
          addToast(`Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`)
        }
        setRenderCounter(prev => prev + 1)
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

  /**
   * Handle right-click on tile for movement and attack
   * - Deploy creatures during DEPLOY phase
   * - Move to valid tiles with confirmation modal
   * - Attack enemies with confirmation modal
   * @param {Object} tile - Right-clicked tile
   */
  const handleTileRightClick = (tile) => {
    if (!gameState || gameState.gameOver) return

    // ============================================
    // LIGHTNING BREATH TARGET SELECTION MODE
    // Handle clicking on creatures to add them as targets
    // ============================================
    if (lightningBreathMode && lightningBreathAttacker) {
      // Check if tile has an enemy creature that can be targeted
      if (tile.occupant && tile.occupant.owner !== lightningBreathAttacker.owner) {
        handleLightningBreathTargetSelect(tile.occupant)
      } else if (!tile.occupant) {
        addToast('Click on an enemy creature to target it with Lightning Breath')
      }
      return // Don't process other right-click actions during target selection
    }

    // DEPLOY PHASE: Right-click deploys creatures from hand
    if (canDeployInCurrentPhase() && selectedCreatureIndex !== null) {
      const currentPlayer = gameState.getCurrentPlayerState()
      const creatureCard = currentPlayer.creatureHand[selectedCreatureIndex]

      // Check if tile is in player's starting zone
      const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                               tile.startingZoneOwner === gameState.currentPlayer

      // ORC SCOUT: Check if deploying Orc to treasure tile
      const isOrcScoutDeploy = tile.treasure && !tile.occupant &&
                               gameState.canUseOrcScout(gameState.currentPlayer) &&
                               (creatureCard.type || []).includes('Orc')

      // SHADOW STALKER: Check if deploying Shadow Mastiff to mountain-adjacent tile
      const isShadowStalkerDeploy = gameState.hasShadowStalker(creatureCard) &&
                                    !tile.occupant &&
                                    tile.terrain !== 'MOUNTAIN' &&
                                    gameState.board.isAdjacentToMountain(tile.x, tile.y)

      // SUMMON SPIDER: Check if deploying Spider creature within 5 squares of Drow Priestess
      let isSummonSpiderDeploy = false
      if (gameState.isSpiderCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const priestess = gameState.hasSummonSpider(gameState.currentPlayer)
        if (priestess?.position) {
          const dx = Math.abs(tile.x - priestess.position.x)
          const dy = Math.abs(tile.y - priestess.position.y)
          isSummonSpiderDeploy = Math.max(dx, dy) <= 5
        }
      }

      // LICH NECROMANCER: Check if deploying Undead creature adjacent to Lich Necromancer
      let isLichNecromancerDeploy = false
      if (gameState.isUndeadCreature && gameState.isUndeadCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const lich = gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
        if (lich?.position) {
          const dx = Math.abs(tile.x - lich.position.x)
          const dy = Math.abs(tile.y - lich.position.y)
          isLichNecromancerDeploy = Math.max(dx, dy) === 1 // Adjacent only (range 1)
        }
      }

      if (!isInStartingZone && !isOrcScoutDeploy && !isShadowStalkerDeploy && !isSummonSpiderDeploy && !isLichNecromancerDeploy) {
        if (gameState.hasShadowStalker(creatureCard)) {
          addToast('SHADOW STALKER: Deploy to starting zone or any tile adjacent to a mountain!')
        } else if (gameState.isSpiderCreature(creatureCard) && gameState.hasSummonSpider(gameState.currentPlayer)) {
          addToast('SUMMON SPIDER: Deploy to starting zone or within 5 squares of Drow Priestess!')
        } else if (gameState.isUndeadCreature && gameState.isUndeadCreature(creatureCard) && gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(gameState.currentPlayer)) {
          addToast('LICH NECROMANCER: Deploy Undead to starting zone or adjacent to Lich Necromancer!')
        } else if (gameState.canUseOrcScout(gameState.currentPlayer) && tile.treasure) {
          addToast('ORC SCOUT: Only Orc creatures can be deployed to treasure tiles!')
        } else if (gameState.canUseOrcScout(gameState.currentPlayer)) {
          addToast('Deploy to your starting zone, or use ORC SCOUT to deploy an Orc to any treasure tile!')
        } else {
          addToast('You can only deploy creatures in your starting zone (highlighted area)!')
        }
        return
      }

      if (tile.occupant) {
        addToast('Tile is occupied!')
        return
      }

      // Check if current player is human - show confirmation modal
      const isHuman = isPlayerHuman(gameState.currentPlayer)

      if (isHuman) {
        // Show deployment confirmation modal for human players
        setPendingDeployment({
          creature: creatureCard,
          tile: tile,
          creatureIndex: selectedCreatureIndex,
          isFromGraveyard: false,
          source: 'rightClick',
          isOrcScoutDeploy,
          isShadowStalkerDeploy,
          isSummonSpiderDeploy,
          isLichNecromancerDeploy,
          isInStartingZone
        })
        setShowDeployConfirm(true)
        return
      }

      // AI players deploy directly (no confirmation needed)
      if (currentPlayer.canDeployCreature(creatureCard)) {
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
        } else if (isShadowStalkerDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(`SHADOW STALKER: ${creatureCard.name} deployed near mountain at (${tile.x}, ${tile.y})! Protected until your next turn!`)
        } else if (isSummonSpiderDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(`SUMMON SPIDER: ${creatureCard.name} summoned near Drow Priestess at (${tile.x}, ${tile.y})! Protected until your next turn!`)
        } else if (isLichNecromancerDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(`LICH NECROMANCER: ${creatureCard.name} deployed adjacent to Lich at (${tile.x}, ${tile.y})! Protected until your next turn!`)
        } else {
          setSelectedCreatureIndex(null)
          addToast(`Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`)
        }
        setRenderCounter(prev => prev + 1)
      } else {
        addToast('Not enough leadership to deploy this creature!')
      }
      return
    }

    if (gameState.currentPhase !== GamePhases.ACTIVATE) return

    // Handle FLASHING BLADES target selection
    if (flashingBladesTargetMode && flashingBladesPending) {
      const targetCreature = flashingBladesPending.validTargets.find(
        t => t.position?.x === tile.x && t.position?.y === tile.y
      )
      if (targetCreature) {
        handleFlashingBladesTargetSelected(targetCreature)
        return
      }
    }

    // Handle HIDDEN BLADE target selection
    if (hiddenBladeTargetMode && hiddenBladePending) {
      const targetCreature = hiddenBladePending.validTargets.find(
        t => t.position?.x === tile.x && t.position?.y === tile.y
      )
      if (targetCreature) {
        handleHiddenBladeTargetSelected(targetCreature)
        return
      }
    }

    // Handle CONFUSION GAZE slide selection (right-click on valid slide tile)
    if (confusionGazeMode === 'slide' && confusionGazePending) {
      handleConfusionGazeSlideSelected(tile)
      return
    }

    // Handle CONFUSION GAZE attack selection (right-click on valid attack target)
    if (confusionGazeMode === 'attack' && confusionGazePending) {
      const attackOption = confusionGazePending.attackTargets.find(
        t => t.target.position?.x === tile.x && t.target.position?.y === tile.y
      )
      if (attackOption) {
        handleConfusionGazeAttackSelected(attackOption.target)
        return
      }
    }

    // Must have a creature selected (via left-click) to use right-click actions
    if (!selectedBoardCreature) return

    // CASE 1: Creature selected - check for movement
    const validMove = validMoveTiles.find(vm => vm.tile.x === tile.x && vm.tile.y === tile.y)
    if (validMove && !tile.occupant) {
      // Show movement confirmation modal
      setPendingMove({
        creature: selectedBoardCreature,
        destination: tile,
        path: validMove.path,
        cost: validMove.cost
      })
      setShowMoveConfirm(true)
      return
    }

    // CASE 2: Creature selected - check for attack
    if (tile.occupant && tile.occupant.owner !== selectedBoardCreature.owner) {
      // ============================================
      // CONFUSION GAZE CHECK: Before normal attack, check if Umber Hulk can use CONFUSION GAZE
      // This triggers when right-clicking an enemy within 5 tiles with LOS
      // ============================================
      if (gameState.hasConfusionGaze(selectedBoardCreature) &&
          !selectedBoardCreature.hasAttackedThisTurn &&
          !selectedBoardCreature.isTapped) {
        // Check if target is valid for CONFUSION GAZE (within 5 tiles with LOS)
        const validGazeTargets = gameState.getConfusionGazeTargets(selectedBoardCreature)
        const isValidGazeTarget = validGazeTargets.some(
          t => t.instanceId === tile.occupant.instanceId
        )

        if (isValidGazeTarget) {
          // Show modal asking if player wants to use CONFUSION GAZE
          setConfusionGazePending({
            attacker: selectedBoardCreature,
            target: tile.occupant,
            validSlideTiles: [],
            slideDestination: null,
            attackTargets: []
          })
          setShowConfusionGazeModal(true)
          return // Don't proceed to normal attack - let modal handle it
        }
      }

      // Normal attack flow
      const attackInfo = validAttackTargets.find(
        target => target.creature.instanceId === tile.occupant.instanceId
      )
      if (attackInfo) {
        setPendingRightClickAttack({
          attacker: selectedBoardCreature,
          target: tile.occupant,
          attackInfo: attackInfo
        })
        // ============================================
        // COMBAT PANEL: Use panel instead of modal - O(1) state updates
        // Set combat mode and highlight creatures on battlefield
        // ============================================
        setCombatPanelMode('attack')
        setCombatHighlightCreatures({
          attacker: selectedBoardCreature.instanceId,
          defender: tile.occupant.instanceId
        })
      }
    }
    // Right-click on invalid tile does nothing - use left-click to deselect
  }

  // ============================================
  // COMBAT PANEL CALLBACKS - O(1) operations
  // Handle attack confirmation and cancellation from in-panel UI
  // ============================================

  /**
   * Confirm attack from combat panel - O(1) state updates
   * Triggers handleAttack which handles defender reactions
   *
   * Flow:
   * - If defender is human: handleAttack sets up defense panel, we don't clear combat state
   * - If defender is AI: attack executes immediately, we need to clear combat state after
   */
  const confirmRightClickAttack = () => {
    if (!pendingRightClickAttack) return

    // Store references before clearing
    const attacker = pendingRightClickAttack.attacker
    const target = pendingRightClickAttack.target
    const isDefenderHumanPlayer = isPlayerHuman(target.owner)

    // Clear the pending right-click attack state
    setPendingRightClickAttack(null)

    // Trigger the actual attack (uses existing handleAttack which handles defender reactions)
    handleAttack(attacker, target)

    // If defender is AI, the attack completed immediately - clear combat panel state
    // If defender is human, handleAttack set up the defense panel - don't clear
    if (!isDefenderHumanPlayer) {
      setCombatPanelMode(null)
      setCombatHighlightCreatures({ attacker: null, defender: null })
    }
  }

  /**
   * Cancel attack from combat panel - O(1) state updates
   * Clears pending attack and combat panel state
   */
  const cancelRightClickAttack = () => {
    setPendingRightClickAttack(null)
    setCombatPanelMode(null)
    setCombatHighlightCreatures({ attacker: null, defender: null })
  }

  // ============================================
  // LIGHTNING BREATH ABILITY HANDLERS
  // Multi-target ranged attack (up to 3 targets)
  // ============================================

  /**
   * Start Lightning Breath target selection mode
   * Called when player clicks "Lightning Breath" button in attack panel
   * @param {Object} attacker - The Dracolich creature instance
   * @param {Object} firstTarget - The initially right-clicked target (pre-selected)
   */
  const handleLightningBreathStart = (attacker, firstTarget) => {
    console.log('[handleLightningBreathStart] Starting Lightning Breath mode', {
      attacker: attacker.creature.name,
      firstTarget: firstTarget.creature.name
    })

    // Get all valid targets
    const validTargets = gameState.getLightningBreathTargets(attacker)
    console.log('[handleLightningBreathStart] Valid targets:', validTargets.map(t => t.creature.name))

    // Clear the normal attack state
    setPendingRightClickAttack(null)
    setCombatPanelMode(null)

    // Enter Lightning Breath mode
    setLightningBreathMode(true)
    setLightningBreathAttacker(attacker)
    setLightningBreathTargets([firstTarget]) // First target pre-selected
    setLightningBreathValidTargets(validTargets)
    setLightningBreathCurrentAttackIndex(0)
    setLightningBreathResults([])

    addToast(`⚡ LIGHTNING BREATH: Select up to 2 more targets (1/3 selected)`)
  }

  /**
   * Add a target to Lightning Breath selection
   * Called when player clicks on a valid target during Lightning Breath mode
   * @param {Object} target - The target creature instance
   */
  const handleLightningBreathTargetSelect = (target) => {
    if (!lightningBreathMode || !lightningBreathAttacker) return

    // Check if target is already selected - if so, deselect it (toggle behavior)
    if (lightningBreathTargets.some(t => t.instanceId === target.instanceId)) {
      console.log('[handleLightningBreathTargetSelect] Deselecting target:', target.creature.name)
      const newTargets = lightningBreathTargets.filter(t => t.instanceId !== target.instanceId)
      setLightningBreathTargets(newTargets)
      addToast(`Removed ${target.creature.name} from targets (${newTargets.length}/3)`)
      return
    }

    // Check if target is valid
    if (!lightningBreathValidTargets.some(t => t.instanceId === target.instanceId)) {
      console.log('[handleLightningBreathTargetSelect] Target not valid:', target.creature.name)
      addToast(`${target.creature.name} is not a valid target!`)
      return
    }

    // Check if we already have 3 targets
    if (lightningBreathTargets.length >= 3) {
      console.log('[handleLightningBreathTargetSelect] Already have 3 targets')
      addToast(`Maximum 3 targets selected! Click "Confirm" to attack.`)
      return
    }

    // Add target
    const newTargets = [...lightningBreathTargets, target]
    setLightningBreathTargets(newTargets)
    console.log('[handleLightningBreathTargetSelect] Added target:', target.creature.name, 'Total:', newTargets.length)
    addToast(`⚡ Target ${newTargets.length}/3 selected: ${target.creature.name}`)
  }

  /**
   * Confirm Lightning Breath and begin sequential attack resolution
   * Called when player clicks "Confirm" after selecting targets
   */
  const handleLightningBreathConfirm = () => {
    if (!lightningBreathMode || !lightningBreathAttacker || lightningBreathTargets.length < 2) {
      console.log('[handleLightningBreathConfirm] Invalid state - need at least 2 targets')
      addToast(`Select at least 2 targets for Lightning Breath!`)
      return
    }

    console.log('[handleLightningBreathConfirm] Confirming Lightning Breath with targets:',
      lightningBreathTargets.map(t => t.creature.name))

    addToast(`⚡ ${lightningBreathAttacker.creature.name} unleashes LIGHTNING BREATH on ${lightningBreathTargets.length} targets!`)

    // Exit target selection mode (but keep targets/attacker for sequential resolution)
    setLightningBreathMode(false)
    setLightningBreathValidTargets([])

    // Start resolving attacks sequentially
    setLightningBreathCurrentAttackIndex(0)

    // Set up the first attack's defense panel
    const firstTarget = lightningBreathTargets[0]
    const damage = gameState.getLightningBreathDamage(lightningBreathAttacker)

    setPendingAttack({
      attackerInstance: lightningBreathAttacker,
      defenderInstance: firstTarget,
      targetInfo: { attackType: 'lightning_breath', damage },
      isLightningBreath: true,
      lightningBreathIndex: 0,
      lightningBreathTotal: lightningBreathTargets.length
    })

    setCombatPanelMode('defense')
    setCombatHighlightCreatures({
      attacker: lightningBreathAttacker.instanceId,
      defender: firstTarget.instanceId
    })

    addToast(`⚡ Lightning Breath Attack 1/${lightningBreathTargets.length}: ${firstTarget.creature.name}`)
  }

  /**
   * Cancel Lightning Breath target selection
   * Called when player clicks "Cancel" during target selection
   */
  const handleLightningBreathCancel = () => {
    console.log('[handleLightningBreathCancel] Cancelling Lightning Breath')

    setLightningBreathMode(false)
    setLightningBreathAttacker(null)
    setLightningBreathTargets([])
    setLightningBreathValidTargets([])
    setLightningBreathCurrentAttackIndex(0)
    setLightningBreathResults([])

    addToast(`Lightning Breath cancelled`)
  }

  /**
   * Process result of a single Lightning Breath attack and move to next
   * Called after defense is resolved for each target
   * @param {Object} result - The attack result from combat resolution
   */
  const handleLightningBreathAttackResolved = (result) => {
    const currentIndex = lightningBreathCurrentAttackIndex
    const targets = lightningBreathTargets
    const attacker = lightningBreathAttacker

    console.log('[handleLightningBreathAttackResolved] Attack resolved:', {
      index: currentIndex,
      target: targets[currentIndex]?.creature.name,
      result
    })

    // Store result
    const newResults = [...lightningBreathResults, result]
    setLightningBreathResults(newResults)

    // Show individual toast
    const targetName = targets[currentIndex]?.creature.name || 'Unknown'
    const damageDealt = result.damage || 0
    if (result.destroyed) {
      addToast(`⚡ Lightning Breath DESTROYED ${targetName}!`)
    } else if (damageDealt > 0) {
      addToast(`⚡ Lightning Breath hit ${targetName} for ${damageDealt} damage!`)
    } else {
      addToast(`⚡ Lightning Breath damage to ${targetName} was fully prevented!`)
    }

    // Check if there are more targets
    const nextIndex = currentIndex + 1
    if (nextIndex < targets.length) {
      // Move to next target
      setLightningBreathCurrentAttackIndex(nextIndex)
      const nextTarget = targets[nextIndex]
      const damage = gameState.getLightningBreathDamage(attacker)

      setPendingAttack({
        attackerInstance: attacker,
        defenderInstance: nextTarget,
        targetInfo: { attackType: 'lightning_breath', damage },
        isLightningBreath: true,
        lightningBreathIndex: nextIndex,
        lightningBreathTotal: targets.length
      })

      setCombatHighlightCreatures({
        attacker: attacker.instanceId,
        defender: nextTarget.instanceId
      })

      addToast(`⚡ Lightning Breath Attack ${nextIndex + 1}/${targets.length}: ${nextTarget.creature.name}`)
    } else {
      // All attacks resolved - finish up
      handleLightningBreathComplete(newResults)
    }
  }

  /**
   * Complete Lightning Breath ability after all attacks resolved
   * Shows summary toast and consumes the Dracolich's action
   * @param {Array} results - Array of all attack results
   */
  const handleLightningBreathComplete = (results) => {
    const attacker = lightningBreathAttacker
    const targets = lightningBreathTargets

    console.log('[handleLightningBreathComplete] All attacks resolved:', {
      attacker: attacker?.creature.name,
      targetCount: targets.length,
      results
    })

    // Calculate totals for summary
    const totalDamage = results.reduce((sum, r) => sum + (r.damage || 0), 0)
    const kills = results.filter(r => r.destroyed).length

    // Summary toast
    let summaryMsg = `⚡ LIGHTNING BREATH complete! Hit ${targets.length} targets for ${totalDamage} total damage`
    if (kills > 0) {
      summaryMsg += ` (${kills} destroyed!)`
    }
    addToast(summaryMsg)

    // Mark attacker as having attacked (consumes action)
    if (attacker) {
      attacker.hasAttackedThisTurn = true
      // Tap if already moved
      if (attacker.hasMovedThisTurn) {
        attacker.tap()
      }
    }

    // Clear Lightning Breath state
    setLightningBreathMode(false)
    setLightningBreathAttacker(null)
    setLightningBreathTargets([])
    setLightningBreathValidTargets([])
    setLightningBreathCurrentAttackIndex(0)
    setLightningBreathResults([])

    // Clear combat panel
    setPendingAttack(null)
    setCombatPanelMode(null)
    setCombatHighlightCreatures({ attacker: null, defender: null })
  }

  /**
   * Handle defense selection for Lightning Breath attacks
   * Similar to splash damage defense, but with sequential attack resolution
   * @param {Object} defense - Defense selection
   */
  const handleLightningBreathDefenseSelected = (defense) => {
    if (!pendingAttack || !pendingAttack.isLightningBreath) return

    const { attackerInstance, defenderInstance, targetInfo } = pendingAttack
    const damage = targetInfo.damage || gameState.getLightningBreathDamage(attackerInstance)

    console.log('[handleLightningBreathDefenseSelected] Defense selected:', {
      defense: defense.type,
      target: defenderInstance.creature.name,
      damage
    })

    let damageAfterDefense = damage
    let defenseResult = { type: defense.type, success: false }

    if (defense.type === 'skip') {
      // Take full damage
      damageAfterDefense = damage
      defenseResult.success = true
    } else if (defense.type === 'cower') {
      // COWER: Avoid ALL damage
      const cowerResult = gameState.applyCower(defenderInstance, damage, attackerInstance.owner)
      damageAfterDefense = cowerResult.success ? 0 : damage
      defenseResult = { ...cowerResult, type: 'cower' }
    } else if (defense.type === 'unstoppable_hordes') {
      // UNSTOPPABLE HORDES: Prevent 10 damage per creature
      let totalReduction = 0
      defense.creatures.forEach(creature => {
        const result = gameState.applyUnstoppableHordes(creature)
        if (result.success) {
          totalReduction += result.damagePrevented
        }
      })
      damageAfterDefense = Math.max(0, damage - totalReduction)
      defenseResult = { type: 'unstoppable_hordes', damagePrevented: totalReduction, success: true }
    } else if (defense.type === 'immediate_card') {
      // IMMEDIATE CARD: Prevent 10 damage
      const result = gameState.applyImmediateCardDefense(defense.card, defense.creature)
      damageAfterDefense = result.success ? Math.max(0, damage - result.damagePrevented) : damage
      defenseResult = { ...result, type: 'immediate_card' }
    }

    // Apply damage to defender
    const previousHP = defenderInstance.currentHP
    defenderInstance.currentHP -= damageAfterDefense
    const destroyed = defenderInstance.currentHP <= 0

    console.log('[handleLightningBreathDefenseSelected] Damage applied:', {
      damage: damageAfterDefense,
      previousHP,
      newHP: defenderInstance.currentHP,
      destroyed
    })

    // Handle destruction
    let moraleChange = { attacker: 0, defender: 0 }
    if (destroyed) {
      // Clear tile
      if (defenderInstance.position) {
        const tile = gameState.getTile(defenderInstance.position.x, defenderInstance.position.y)
        if (tile) tile.occupant = null
      }

      // Remove from battlefield
      const defenderOwner = defenderInstance.owner
      const defenderPlayer = gameState.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(c => c.instanceId === defenderInstance.instanceId)
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add to graveyard
      defenderPlayer.creatureGraveyard.push(defenderInstance.creature)

      // Morale changes
      defenderPlayer.loseMorale(defenderInstance.creature.level)
      const attackerPlayer = gameState.players[attackerInstance.owner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: 1,
        defender: -defenderInstance.creature.level
      }

      addToast(`⚡ ${defenderInstance.creature.name} was destroyed by Lightning Breath!`)
    }

    // Create result object
    const result = {
      damage: damageAfterDefense,
      destroyed,
      moraleChange,
      targetName: defenderInstance.creature.name,
      defenseResult
    }

    // Move to next target or complete
    handleLightningBreathAttackResolved(result)
  }

  // ============================================================================
  // DISCIPLE OF KYUSS / AI DEATH MODAL HANDLERS
  // ============================================================================

  /**
   * Handle damage notification modal dismissal (Disciple of Kyuss ability)
   * Continues phase advancement after player acknowledges damage
   */
  const handleDamageNotificationDismiss = () => {
    setShowDamageNotification(false)
    setDamageNotificationData(null)

    if (pendingPhaseAdvance) {
      setPendingPhaseAdvance(false)
      gameState.advancePhase()
    }

    setRenderCounter(prev => prev + 1)
  }

  /**
   * Handle AI death modal dismissal
   * Shows next death in queue or continues AI turn
   */
  const handleAiDeathModalDismiss = () => {
    setShowAiDeathModal(false)
    setCurrentAiDeath(null)

    // Check if there are more deaths in the queue
    if (aiDeathQueue.length > 0) {
      const nextDeath = aiDeathQueue[0]
      setAiDeathQueue(prev => prev.slice(1))
      setCurrentAiDeath(nextDeath)
      setShowAiDeathModal(true)
    }

    setRenderCounter(prev => prev + 1)
  }

  /**
   * Queue an AI combat death for modal display
   * @param {Object} deathData - { attackerInstance, defenderInstance, damageDealt, attackType, abilitiesTriggered, moraleChanges }
   */
  const queueAiDeathModal = (deathData) => {
    if (!showAiDeathModal && aiDeathQueue.length === 0) {
      // Show immediately if no modal is showing
      setCurrentAiDeath(deathData)
      setShowAiDeathModal(true)
    } else {
      // Queue for later
      setAiDeathQueue(prev => [...prev, deathData])
    }
  }

  const advancePhase = () => {
    if (!gameState) return

    // ============================================
    // COMBAT LOCK: Block phase advancement during combat - O(1)
    // User must resolve attack confirmation or defense selection first
    // ============================================
    if (combatPanelMode) {
      const message = combatPanelMode === 'attack'
        ? 'You must confirm or cancel your attack before advancing the phase.'
        : 'You must select a defense option or take damage before advancing the phase.'
      addToast(`⚠️ ${message}`)
      return
    }

    // ============================================
    // FLASHING BLADES LOCK: Block phase advancement during ability - O(1)
    // User must complete or skip the FLASHING BLADES ability
    // ============================================
    if (showFlashingBladesModal) {
      addToast('⚠️ You must choose whether to use FLASHING BLADES before advancing the phase.')
      return
    }
    if (flashingBladesTargetMode) {
      addToast('⚠️ You must select a target for FLASHING BLADES before advancing the phase.')
      return
    }

    // ============================================
    // HIDDEN BLADE LOCK: Block phase advancement during ability - O(1)
    // User must complete or skip the HIDDEN BLADE ability
    // ============================================
    if (showHiddenBladeModal) {
      addToast('⚠️ You must choose whether to use HIDDEN BLADE before advancing the phase.')
      return
    }
    if (hiddenBladeTargetMode) {
      addToast('⚠️ You must select a target for HIDDEN BLADE before advancing the phase.')
      return
    }

    // ============================================
    // CONFUSION GAZE LOCK: Block phase advancement during ability - O(1)
    // User must complete the CONFUSION GAZE ability (mandatory attack)
    // ============================================
    if (showConfusionGazeModal) {
      addToast('⚠️ You must choose whether to use CONFUSION GAZE before advancing the phase.')
      return
    }
    if (confusionGazeMode) {
      const modeMsg = confusionGazeMode === 'slide'
        ? 'You must select a slide destination for CONFUSION GAZE before advancing the phase.'
        : 'You must select an attack target to complete CONFUSION GAZE before advancing the phase.'
      addToast(`⚠️ ${modeMsg}`)
      return
    }

    // ============================================
    // LIGHTNING BREATH LOCK: Block phase advancement during ability - O(1)
    // User must complete target selection or cancel
    // ============================================
    if (lightningBreathMode) {
      addToast('⚠️ You must complete LIGHTNING BREATH target selection or cancel before advancing the phase.')
      return
    }

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
        {
          // Check for Disciple of Kyuss damage before advancing phase
          const kyussResult = gameState.executeDiscipleOfKyussDamage(gameState.currentPlayer)

          if (kyussResult.damageEvents.length > 0) {
            // Show damage notification modal
            setDamageNotificationData({
              mode: 'ability',
              abilityName: 'Disciple of Kyuss',
              sourceCreature: kyussResult.sourceCreature,
              damageEvents: kyussResult.damageEvents
            })
            setShowDamageNotification(true)
            setPendingPhaseAdvance(true)

            // Check for game over after deaths
            if (kyussResult.deaths.length > 0) {
              gameState.checkGameOver()
            }
          } else {
            // No Disciples or no adjacent creatures - advance normally
            gameState.advancePhase()
          }
        }
        break
      case GamePhases.DEPLOY:
        gameState.executeDeployPhase()
        break
      case GamePhases.CLEANUP:
        {
          gameState.executeCleanupPhase()

          // Player eliminations are now handled immediately when morale hits 0
          // (in executeAttackAfterReactions/executeAttackAfterDefense)

          // Clear old logs after every turn (keeps current + previous turn visible)
          clearOldLogs(gameState.turnNumber)

          // ============================================
          // RESET VERSATILE DECLINED SET - O(1) operation
          // Clear the set so Versatile modal shows again next turn
          // ============================================
          setVersatileDeclinedCreatures(new Set())

          if (!gameState.gameOver) {
            addToast(`${gameState.currentPlayer}'s turn begins.`)
          }
        }
        break
    }

    setRenderCounter(prev => prev + 1)
  }

  // Report turn info to parent (App.jsx) for navbar display
  useEffect(() => {
    if (!onTurnInfoChange) return

    if (!gameState || !gameConfig) {
      onTurnInfoChange(null)
      return
    }

    const currentPlayerId = gameState.currentPlayer
    const currentPlayerState = gameState.players[currentPlayerId]
    const isCurrentPlayerAI = !isPlayerHuman(currentPlayerId)

    // Determine if collect morale is available
    let canCollectMorale = false
    if (gameState.currentPhase === GamePhases.ACTIVATE && !isCurrentPlayerAI && selectedBoardCreature) {
      const tile = gameState.getTile(selectedBoardCreature.position.x, selectedBoardCreature.position.y)
      canCollectMorale = tile?.treasure &&
                         tile.treasure.remainingMorale > 0 &&
                         !selectedBoardCreature.isTapped &&
                         selectedBoardCreature.owner === gameState.currentPlayer
    }

    // Determine auto-executing state
    const isAutoExecuting = ((gameState.currentPhase === GamePhases.REFRESH && !gameState.canDeployDuringRefresh(gameState.currentPlayer)) ||
                             gameState.currentPhase === GamePhases.CLEANUP) && !isCurrentPlayerAI

    // ============================================
    // COMBAT LOCK: Disable phase button when combat is pending - O(1)
    // Also blocks during FLASHING BLADES or HIDDEN BLADE modal or target selection
    // ============================================
    const isFlashingBladesActive = showFlashingBladesModal || flashingBladesTargetMode
    const isHiddenBladeActive = showHiddenBladeModal || hiddenBladeTargetMode
    const canAdvancePhaseValue = !combatPanelMode && !isFlashingBladesActive && !isHiddenBladeActive && (gameState.currentPhase === GamePhases.ACTIVATE || canDeployInCurrentPhase())

    onTurnInfoChange({
      turnNumber: gameState.turnNumber,
      factionName: currentPlayerState?.faction || currentPlayerId,
      phase: gameState.currentPhase,
      isAIThinking: isAIThinking,
      isCurrentPlayerAI: isCurrentPlayerAI,
      canAdvancePhase: canAdvancePhaseValue,
      isAutoExecuting: isAutoExecuting,
      phaseButtonText: getPhaseButtonText(),
      advancePhase: advancePhase,
      canCollectMorale: canCollectMorale,
      handleCollectMorale: handleCollectMorale,
      leadership: currentPlayerState?.leadership || 0,
      leadershipUsage: currentPlayerState?.getCurrentLeadershipUsage?.() || 0,
      morale: (typeof currentPlayerState?.morale === 'number' && !isNaN(currentPlayerState?.morale)) ? currentPlayerState.morale : 0,
      startingMorale: currentPlayerState?.commander?.startingMorale || 1,
      combatPending: !!combatPanelMode,  // Let UI know combat is pending
      // Turn log for navbar display
      turnLog: turnLog,
      isLogExpanded: isLogExpanded,
      setIsLogExpanded: setIsLogExpanded
    })
  }, [gameState, gameConfig, isAIThinking, selectedBoardCreature, renderCounter, onTurnInfoChange, combatPanelMode, turnLog, isLogExpanded])

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

      // Check if there are attack intentions or confusion gaze actions in the result
      const actions = result.actions || []
      const attackIntentions = actions.filter(action => action.type === 'attack_intention')
      const confusionGazeActions = actions.filter(action => action.type === 'confusion_gaze')

      // ============================================
      // CONFUSION GAZE AI EXECUTION
      // Process confusion gaze actions immediately (slide + attack)
      // ============================================
      for (const gazeAction of confusionGazeActions) {
        const { attackerInstance, target, slideDestination } = gazeAction

        // Execute the slide
        const slideResult = gameState.executeConfusionGazeSlide(target, slideDestination)
        addToast(`😵 AI: ${attackerInstance.creature.name} uses CONFUSION GAZE! Slides ${target.creature.name} to (${slideResult.newPos.x}, ${slideResult.newPos.y})`)

        // Execute the attack using the dedicated method
        const attackResult = gameState.applyConfusionGaze(attackerInstance, target)

        // Mark attacker as attacked and tap if moved
        attackerInstance.hasAttackedThisTurn = true
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        let attackMessage = `😵 CONFUSION GAZE: ${attackerInstance.creature.name} strikes ${target.creature.name} for ${attackResult.damage} damage!`
        if (attackResult.destroyed) {
          attackMessage += ` ${target.creature.name} was destroyed!`
          if (attackResult.moraleChange) {
            attackMessage += ` Morale changes: Attacker +${attackResult.moraleChange.attacker}, Defender ${attackResult.moraleChange.defender}`
          }
        } else {
          attackMessage += ` ${target.creature.name} has ${attackResult.remainingHP} HP remaining.`
        }
        addToast(attackMessage)

        // Check for elimination
        gameState.checkGameOver()
        const eliminationResult = gameState.checkAndEliminatePlayer(target.owner)
        if (eliminationResult.eliminated) {
          const reason = eliminationResult.reason === 'morale'
            ? 'Morale reduced to 0!'
            : 'All creatures destroyed!'
          addToast(`🏳️ ${gameState.players[target.owner].commander.name} has been eliminated! ${reason}`)
        }
      }

      // ============================================
      // LIGHTNING BREATH AI EXECUTION
      // Process lightning breath actions immediately (multi-target ranged attack)
      // ============================================
      const lightningBreathActions = actions.filter(action => action.type === 'lightning_breath')
      for (const lbAction of lightningBreathActions) {
        const { attackerInstance, targets, damage } = lbAction

        console.log(`[AI] Executing LIGHTNING BREATH: ${attackerInstance.creature.name} attacking ${targets.length} targets`)

        let totalDamage = 0
        let kills = 0

        // Process each target sequentially
        for (let i = 0; i < targets.length; i++) {
          const target = targets[i]

          // Apply damage directly (AI doesn't use defense options for its own attacks)
          const previousHP = target.currentHP
          target.currentHP -= damage
          const destroyed = target.currentHP <= 0
          totalDamage += damage

          console.log(`[AI] Lightning Breath hit ${target.creature.name}: ${damage} damage, ${previousHP} -> ${target.currentHP} HP`)

          if (destroyed) {
            kills++

            // Clear tile
            if (target.position) {
              const tile = gameState.getTile(target.position.x, target.position.y)
              if (tile) tile.occupant = null
            }

            // Remove from battlefield
            const defenderOwner = target.owner
            const defenderPlayer = gameState.players[defenderOwner]
            const index = defenderPlayer.creaturesInPlay.findIndex(c => c.instanceId === target.instanceId)
            if (index !== -1) {
              defenderPlayer.creaturesInPlay.splice(index, 1)
            }

            // Add to graveyard
            defenderPlayer.creatureGraveyard.push(target.creature)

            // Morale changes
            defenderPlayer.loseMorale(target.creature.level)
            const attackerPlayer = gameState.players[attackerInstance.owner]
            attackerPlayer.gainMorale(1)

            addToast(`⚡ AI Lightning Breath DESTROYED ${target.creature.name}!`)
          } else {
            addToast(`⚡ AI Lightning Breath hit ${target.creature.name} for ${damage} damage!`)
          }
        }

        // Mark attacker as attacked and tap if moved
        attackerInstance.hasAttackedThisTurn = true
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        // Summary toast
        let summaryMsg = `⚡ AI LIGHTNING BREATH: ${attackerInstance.creature.name} hit ${targets.length} targets for ${totalDamage} total damage!`
        if (kills > 0) {
          summaryMsg += ` (${kills} destroyed!)`
        }
        addToast(summaryMsg)

        // Check for elimination
        for (const target of targets) {
          gameState.checkGameOver()
          const eliminationResult = gameState.checkAndEliminatePlayer(target.owner)
          if (eliminationResult.eliminated) {
            const reason = eliminationResult.reason === 'morale'
              ? 'Morale reduced to 0!'
              : 'All creatures destroyed!'
            addToast(`🏳️ ${gameState.players[target.owner].commander.name} has been eliminated! ${reason}`)
          }
        }
      }

      // ============================================
      // HORDE PROTECTION FIX FOR AI
      // If AI used HORDE deployment during REFRESH, clear protection for creatures
      // deployed this turn. This mirrors the human HORDE logic at lines 1612-1615.
      // Without this, AI HORDE creatures would keep protection indefinitely.
      // ============================================
      const usedHorde = gameState.currentPhase === GamePhases.REFRESH &&
                        gameState.canDeployDuringRefresh(currentPlayerId) &&
                        actions.some(a => a.isHordeDeploy)

      if (usedHorde) {
        const player = gameState.getCurrentPlayerState()
        player.creaturesInPlay.forEach(creature => {
          if (creature.deployedThisTurn && creature.turnDeployed === gameState.turnNumber) {
            creature.clearDeploymentProtection()
          }
        })
      }

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
            {/* Debug log for ranged LOS at render time */}
            {console.log('[GameBoard RENDER] creatureViewMode:', creatureViewMode, '| allRangedLOSTiles count:', allRangedLOSTiles.length)}
            {Array.from({ length: gameState.boardHeight }).map((_, y) => (
              <div key={y} className="board-row">
                {Array.from({ length: gameState.boardWidth }).map((_, x) => {
                  const tile = gameState.getTile(x, y)
                  const creature = getTileCreature(x, y)

                  // Check if this tile is a valid move (handle new pathfinding format)
                  const validMove = validMoveTiles.find(vm => vm.tile.x === x && vm.tile.y === y)
                  // Only show movement overlay when in movement mode
                  const isValidMove = creatureViewMode === 'movement' && validMove !== undefined

                  // Check if this creature is a valid attack target and get attack type
                  const attackTargetInfo = validAttackTargets.find(
                    t => t.creature.position?.x === x && t.creature.position?.y === y
                  )
                  const isAttackTarget = attackTargetInfo !== undefined
                  const attackType = attackTargetInfo?.attackType

                  // Check if this creature is a FLASHING BLADES target
                  const isFlashingBladesTarget = flashingBladesTargetMode &&
                    flashingBladesPending?.validTargets.some(
                      t => t.position?.x === x && t.position?.y === y
                    )

                  // Check if this creature is a HIDDEN BLADE target
                  const isHiddenBladeTarget = hiddenBladeTargetMode &&
                    hiddenBladePending?.validTargets.some(
                      t => t.position?.x === x && t.position?.y === y
                    )

                  // ============================================
                  // CONFUSION GAZE HIGHLIGHTS: Show valid slide destinations or attack targets
                  // ============================================
                  const isConfusionGazeSlide = confusionGazeMode === 'slide' &&
                    confusionGazePending?.validSlideTiles?.some(
                      t => t.x === x && t.y === y
                    )

                  const isConfusionGazeAttack = confusionGazeMode === 'attack' &&
                    confusionGazePending?.attackTargets?.some(
                      t => t.target.position?.x === x && t.target.position?.y === y
                    )

                  // ============================================
                  // LIGHTNING BREATH HIGHLIGHTS: Show valid targets and selected targets
                  // ============================================
                  const isLightningBreathValidTarget = lightningBreathMode &&
                    lightningBreathValidTargets.some(
                      t => t.position?.x === x && t.position?.y === y
                    )
                  const isLightningBreathSelected = lightningBreathMode &&
                    lightningBreathTargets.some(
                      t => t.position?.x === x && t.position?.y === y
                    )
                  const lightningBreathTargetIndex = lightningBreathMode
                    ? lightningBreathTargets.findIndex(t => t.position?.x === x && t.position?.y === y)
                    : -1

                  // Check if this is the selected creature
                  const isSelectedCreature = selectedBoardCreature?.position?.x === x &&
                                              selectedBoardCreature?.position?.y === y

                  // Check if this tile is in the line-of-sight path (original behavior)
                  // OR if we're in ranged view mode, show ranged range tiles with LOS
                  const rangedRangeInfo = rangedRangeTiles.find(r => r.x === x && r.y === y)
                  const isLineOfSight = creatureViewMode === 'movement'
                    ? lineOfSightPath.some(pos => pos.x === x && pos.y === y)
                    : (rangedRangeInfo?.hasLOS === true)

                  // ============================================
                  // COMBAT HIGHLIGHT: Determine if creature should be highlighted
                  // O(1) - simple instanceId comparison
                  // ============================================
                  let combatHighlight = null
                  if (creature && combatHighlightCreatures.attacker === creature.instanceId) {
                    combatHighlight = 'attacker'
                  } else if (creature && combatHighlightCreatures.defender === creature.instanceId) {
                    combatHighlight = 'defender'
                  }

                  // ============================================
                  // SHADOW STALKER HIGHLIGHT: Show valid deployment tiles
                  // when creature with SHADOW STALKER is selected from hand
                  // ============================================
                  const currentPlayerState = gameState.getCurrentPlayerState()
                  const selectedCreatureCard = selectedCreatureIndex !== null
                    ? currentPlayerState?.creatureHand?.[selectedCreatureIndex]
                    : null
                  const isShadowStalkerHighlight = canDeployInCurrentPhase() &&
                    selectedCreatureCard &&
                    gameState.hasShadowStalker(selectedCreatureCard) &&
                    !tile.occupant &&
                    tile.terrain !== 'MOUNTAIN' &&
                    gameState.board.isAdjacentToMountain(x, y)

                  // ============================================
                  // SUMMON SPIDER HIGHLIGHT: Show valid deployment tiles
                  // during deploy phase when Drow Priestess is in play
                  // Tiles within 5 squares of Priestess get same color as starting zone
                  // Always show during deploy phase so players know where they can deploy Spiders
                  // ============================================
                  let isSummonSpiderHighlight = false
                  let summonSpiderFactionColor = null

                  if (canDeployInCurrentPhase() &&
                      !tile.occupant &&
                      tile.terrain !== 'MOUNTAIN') {
                    const priestess = gameState.hasSummonSpider(gameState.currentPlayer)
                    if (priestess?.position) {
                      // Check if tile is within 5 squares of Priestess (Chebyshev distance)
                      const dx = Math.abs(x - priestess.position.x)
                      const dy = Math.abs(y - priestess.position.y)
                      if (Math.max(dx, dy) <= 5) {
                        // Don't highlight if already in starting zone (it already has the highlight)
                        const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                                                 tile.startingZoneOwner === gameState.currentPlayer
                        if (!isInStartingZone) {
                          isSummonSpiderHighlight = true
                          summonSpiderFactionColor = playerFactionColors?.[gameState.currentPlayer]
                        }
                      }
                    }
                  }

                  // ============================================
                  // LICH NECROMANCER HIGHLIGHT: Show valid deployment tiles
                  // during deploy phase when Lich Necromancer is in play
                  // Tiles adjacent to Lich (range 1) get same color as starting zone
                  // Always show during deploy phase so players know where they can deploy Undead
                  // ============================================
                  let isLichNecromancerHighlight = false
                  let lichNecromancerFactionColor = null

                  if (canDeployInCurrentPhase() &&
                      !tile.occupant &&
                      tile.terrain !== 'MOUNTAIN') {
                    const lich = gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
                    if (lich?.position) {
                      // Check if tile is adjacent to Lich (range 1, 8-directional)
                      const dx = Math.abs(x - lich.position.x)
                      const dy = Math.abs(y - lich.position.y)
                      if (Math.max(dx, dy) === 1) {
                        // Don't highlight if already in starting zone (it already has the highlight)
                        const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                                                 tile.startingZoneOwner === gameState.currentPlayer
                        if (!isInStartingZone) {
                          isLichNecromancerHighlight = true
                          lichNecromancerFactionColor = playerFactionColors?.[gameState.currentPlayer]
                        }
                      }
                    }
                  }

                  // ============================================
                  // RANGED LOS HIGHLIGHT: Faction-colored tiles showing ranged attack coverage
                  // When creature SELECTED: Show ONLY that creature's LOS (cyan highlight)
                  // When NO creature selected: Show ALL ranged LOS with faction colors
                  // ============================================
                  let isAllRangedLOS = false
                  let allRangedLOSCount = 0
                  let rangedLOSFactions = []
                  let isSelectedCreatureRangedLOS = false

                  if (creatureViewMode === 'ranged') {
                    // Check if a ranged creature is selected
                    if (selectedBoardCreature?.creature?.rangedAttack) {
                      // SELECTED CREATURE: Show ONLY its LOS (cyan highlight)
                      // rangedRangeInfo is already computed above
                      isSelectedCreatureRangedLOS = rangedRangeInfo?.hasLOS === true
                    } else {
                      // NO CREATURE SELECTED: Show ALL ranged LOS with faction colors
                      const allRangedLOSInfo = allRangedLOSTiles.find(t => t.x === x && t.y === y)
                      if (allRangedLOSInfo?.hasLOS) {
                        isAllRangedLOS = true
                        allRangedLOSCount = allRangedLOSInfo.creatureCount || 0
                        rangedLOSFactions = allRangedLOSInfo.owners || []
                      }
                    }
                  }

                  // Debug log for first few tiles with ranged LOS
                  if ((isAllRangedLOS || isSelectedCreatureRangedLOS) && x < 3 && y < 3) {
                    console.log(`[BoardTile ${x},${y}] ranged mode: isAllRangedLOS=${isAllRangedLOS}, isSelectedCreatureRangedLOS=${isSelectedCreatureRangedLOS}, factions=${rangedLOSFactions.join(',')}`)
                  }

                  return (
                    <BoardTile
                      key={`${x}-${y}`}
                      tile={tile}
                      creature={creature}
                      isSelected={isSelectedCreature}
                      isValidMove={isValidMove}
                      movementInfo={validMove} // Pass movement info for cost display
                      isAttackTarget={isAttackTarget || isFlashingBladesTarget || isHiddenBladeTarget}
                      attackType={attackType}
                      isLineOfSight={isLineOfSight}
                      isAllRangedLOS={isAllRangedLOS}
                      allRangedLOSCount={allRangedLOSCount}
                      rangedLOSFactions={rangedLOSFactions}
                      isSelectedCreatureRangedLOS={isSelectedCreatureRangedLOS}
                      onClick={handleTileClick}
                      onRightClick={handleTileRightClick}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      isDragTarget={dragOverTile?.x === x && dragOverTile?.y === y}
                      playerFactionColors={playerFactionColors}
                      playerFactions={playerFactions}
                      currentPlayer={gameState?.currentPlayer}
                      boardWidth={gameState.boardWidth}
                      boardHeight={gameState.boardHeight}
                      combatHighlight={combatHighlight}
                      factionHighlight={factionHighlight}
                      isShadowStalkerHighlight={isShadowStalkerHighlight}
                      isConfusionGazeSlide={isConfusionGazeSlide}
                      isConfusionGazeAttack={isConfusionGazeAttack}
                      isSummonSpiderHighlight={isSummonSpiderHighlight}
                      summonSpiderFactionColor={summonSpiderFactionColor}
                      isLichNecromancerHighlight={isLichNecromancerHighlight}
                      lichNecromancerFactionColor={lichNecromancerFactionColor}
                      isLightningBreathValidTarget={isLightningBreathValidTarget}
                      isLightningBreathSelected={isLightningBreathSelected}
                      lightningBreathTargetIndex={lightningBreathTargetIndex}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Player Panel with collapse toggle */}
        <div style={{
          width: isPanelCollapsed ? '5px' : '500px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative'
        }}>
          {/* Toggle button - always visible on left edge */}
          <button
            className={`panel-toggle-btn ${isPanelCollapsed ? 'collapsed' : ''}`}
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            title={isPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isPanelCollapsed ? '◀' : '▶'}
          </button>

          {/* Player Panel - Only show when expanded */}
          {!isPanelCollapsed && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <PlayerPanel
                player={currentPlayer}
                playerId={currentPlayerId}
                isCurrentPlayer={true}
                isHuman={isPlayerHuman(currentPlayerId)}
                selectedCreature={selectedCreatureIndex}
                selectedOrder={selectedOrderIndex}
                onCreatureSelect={(idx) => setSelectedCreatureIndex(idx)}
                onOrderSelect={handleOrderCardClick}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                currentPhase={gameState.currentPhase}
                vertical={true}
                canDeployCreatures={canDeployInCurrentPhase()}
                // COMBAT PANEL PROPS - O(1) prop passing
                // For attack mode: use pendingRightClickAttack for normal attacks, or pendingAttack for FLASHING BLADES
                combatMode={combatPanelMode}
                attackerCreature={
                  combatPanelMode === 'attack'
                    ? (pendingRightClickAttack?.attacker || pendingAttack?.attackerInstance)
                    : pendingAttack?.attackerInstance
                }
                defenderCreature={
                  combatPanelMode === 'attack'
                    ? (pendingRightClickAttack?.target || pendingAttack?.defenderInstance)
                    : pendingAttack?.defenderInstance
                }
                attackInfo={
                  combatPanelMode === 'attack'
                    ? (pendingRightClickAttack?.attackInfo || pendingAttack?.targetInfo)
                    : pendingAttack?.targetInfo
                }
                accumulatedDamageReduction={pendingAttack?.accumulatedDamageReduction || 0}
                defenderPlayerState={
                  combatPanelMode === 'attack'
                    ? (pendingRightClickAttack
                        ? gameState.players[pendingRightClickAttack.target?.owner]
                        : (pendingAttack ? gameState.players[pendingAttack.defenderInstance?.owner] : null))
                    : (pendingAttack ? gameState.players[pendingAttack.defenderInstance?.owner] : null)
                }
                gameState={gameState}
                isFlashingBlades={pendingAttack?.isFlashingBlades || false}
                isHiddenBlade={pendingAttack?.isHiddenBlade || false}
                onConfirmAttack={
                  pendingAttack?.isFlashingBlades ? handleFlashingBladesConfirmAttack :
                  pendingAttack?.isHiddenBlade ? handleHiddenBladeConfirmAttack :
                  pendingAttack?.isConfusionGaze ? handleConfusionGazeConfirmAttack :
                  confirmRightClickAttack
                }
                onCancelAttack={pendingAttack?.isFlashingBlades || pendingAttack?.isHiddenBlade || pendingAttack?.isConfusionGaze ? null : cancelRightClickAttack}
                onLightningBreath={handleLightningBreathStart}
                onDefenseSelected={handleDefenseSelected}
                onSkipDefense={handleReactionsSkipped}
                // FACTION ICONS PROPS - O(1) prop passing
                allPlayers={gameState?.players}
                onFactionHighlight={setFactionHighlight}
                // AI TURN HANDLING - Pass current player ID for auto-switch
                currentPlayerId={currentPlayerId}
                // VIEW MODE TOGGLE - For switching between movement and ranged preview
                creatureViewMode={creatureViewMode}
                onCreatureViewModeToggle={() => {
                  setCreatureViewMode(mode => {
                    const newMode = mode === 'movement' ? 'ranged' : 'movement'
                    console.log(`[GameBoard] creatureViewMode toggled: ${mode} -> ${newMode}`)
                    return newMode
                  })
                }}
                selectedBoardCreature={selectedBoardCreature}
                // GRAVEYARD PROPS - For resurrection
                selectedGraveyardCreature={selectedGraveyardCreature}
                onGraveyardCreatureSelect={handleGraveyardCreatureSelect}
                onGraveyardDragStart={handleGraveyardDragStart}
                onGraveyardDragEnd={handleGraveyardDragEnd}
              />
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification System - Bottom Right (toasts only, log moved to navbar) */}
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
      </div>

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

      {/* DEPLOY CONFIRMATION Panel - Shows leadership cost before deploying creature */}
      {showDeployConfirm && pendingDeployment && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1050,
          minWidth: '300px'
        }}>
          <DeployConfirmPanel
            creature={pendingDeployment.creature}
            currentLeadershipUsage={gameState?.getCurrentPlayerState()?.getCurrentLeadershipUsage() || 0}
            maxLeadership={gameState?.getCurrentPlayerState()?.leadership || 0}
            isFromGraveyard={pendingDeployment.isFromGraveyard}
            currentMorale={gameState?.getCurrentPlayerState()?.morale || 0}
            onConfirm={handleDeployConfirm}
            onCancel={handleDeployCancel}
          />
        </div>
      )}

      {/* Backdrop for deploy confirmation */}
      {showDeployConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1049
          }}
          onClick={handleDeployCancel}
        />
      )}

      {/* LIGHTNING BREATH Target Selection Panel */}
      {lightningBreathMode && lightningBreathAttacker && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1050,
          backgroundColor: '#1a1a2e',
          border: '2px solid #00bcd4',
          borderRadius: '8px',
          padding: '15px 25px',
          boxShadow: '0 0 20px rgba(0, 188, 212, 0.5)',
          minWidth: '350px',
          textAlign: 'center'
        }}>
          <h5 style={{ color: '#00bcd4', marginBottom: '10px' }}>
            ⚡ LIGHTNING BREATH - Target Selection
          </h5>
          <p style={{ color: 'white', marginBottom: '8px' }}>
            <strong>{lightningBreathAttacker.creature.name}</strong> is targeting:
          </p>
          <div style={{ marginBottom: '10px' }}>
            {lightningBreathTargets.map((target, idx) => (
              <Badge
                key={target.instanceId}
                bg="info"
                style={{ margin: '2px 4px', fontSize: '0.9rem', cursor: 'pointer' }}
                onClick={() => {
                  // Remove this target from selection
                  console.log('[LightningBreath] Deselecting target:', target.creature.name)
                  setLightningBreathTargets(prev => prev.filter(t => t.instanceId !== target.instanceId))
                  addToast(`Removed ${target.creature.name} from Lightning Breath targets`)
                }}
                title="Click to remove this target"
              >
                {idx + 1}. {target.creature.name} ✕
              </Badge>
            ))}
            {lightningBreathTargets.length < 3 && (
              <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '8px' }}>
                (Click targets to add/remove)
              </span>
            )}
          </div>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '12px' }}>
            {lightningBreathTargets.length}/3 targets selected
            {lightningBreathTargets.length < 2 && ' (minimum 2 required)'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <Button
              variant="success"
              size="sm"
              onClick={handleLightningBreathConfirm}
              disabled={lightningBreathTargets.length < 2}
            >
              ⚡ Confirm Attack ({lightningBreathTargets.length} targets)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLightningBreathCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* FLASHING BLADES Ability Modal - Choose to use splash damage */}
      <Modal
        show={showFlashingBladesModal}
        onHide={handleFlashingBladesSkip}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#8b008b', color: 'white' }}>
          <Modal.Title>⚔️ FLASHING BLADES - Splash Damage!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {flashingBladesPending && (
            <div>
              <p>
                <strong>{flashingBladesPending.attacker.creature.name}</strong> can deal{' '}
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>10 damage</span> to an adjacent enemy!
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Valid targets: {flashingBladesPending.validTargets.map(t => t.creature.name).join(', ')}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '10px' }}>
                Click "Use Ability" then right-click on a highlighted target to attack.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="danger" size="lg" onClick={handleFlashingBladesUse}>
            ⚔️ Use Ability
          </Button>
          <Button variant="secondary" size="lg" onClick={handleFlashingBladesSkip}>
            Skip
          </Button>
        </Modal.Footer>
      </Modal>

      {/* HIDDEN BLADE Ability Modal - Choose to strike adjacent tapped enemy */}
      <Modal
        show={showHiddenBladeModal}
        onHide={handleHiddenBladeSkip}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#2d1f3d', color: 'white' }}>
          <Modal.Title>🗡️ HIDDEN BLADE - Strike from the Shadows!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {hiddenBladePending && (
            <div>
              <p>
                <strong>{hiddenBladePending.attacker.creature.name}</strong> can strike a{' '}
                <span style={{ color: '#ffc107', fontWeight: 'bold' }}>tapped</span> adjacent enemy for{' '}
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>10 damage</span>!
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Valid targets: {hiddenBladePending.validTargets.map(t => t.creature.name).join(', ')}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '10px' }}>
                Click "Use Ability" then right-click on a highlighted target to attack.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="danger" size="lg" onClick={handleHiddenBladeUse}>
            🗡️ Use Ability
          </Button>
          <Button variant="secondary" size="lg" onClick={handleHiddenBladeSkip}>
            Skip
          </Button>
        </Modal.Footer>
      </Modal>

      {/* CONFUSION GAZE Ability Modal - Choose to use gaze attack */}
      <Modal
        show={showConfusionGazeModal}
        onHide={handleConfusionGazeDecline}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#4a0080', color: 'white' }}>
          <Modal.Title>😵 CONFUSION GAZE</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {confusionGazePending && (
            <div>
              <p>
                Use <strong>CONFUSION GAZE</strong> on{' '}
                <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{confusionGazePending.target.creature.name}</span>?
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Slide the target up to <strong>3 squares</strong>, then make a{' '}
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>30 damage</span> attack.
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '10px' }}>
                Note: You MUST complete an attack after the slide.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="warning" size="lg" onClick={handleConfusionGazeConfirm}>
            😵 Use CONFUSION GAZE
          </Button>
          <Button variant="secondary" size="lg" onClick={handleConfusionGazeDecline}>
            Normal Attack
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
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* ============================================
              NEW BUTTONS: Don't Use Ability, Decide Later, Move as Action
              O(1) Set operations for tracking declined creatures
              ============================================ */}

          {/* DON'T USE ABILITY - O(1) Set add, selects creature, won't show modal again this turn */}
          <Button variant="danger" onClick={() => {
            if (versatileActionPending) {
              // O(1) - Add to declined set so modal won't show again for this creature this turn
              setVersatileDeclinedCreatures(prev => new Set(prev).add(versatileActionPending.id))
              // Select the creature normally (allows Collect Morale, etc.)
              setSelectedBoardCreature(versatileActionPending)
              // Calculate valid moves (even though they've moved, show where they could go)
              const moves = gameState.getValidMovementTiles(versatileActionPending)
              setValidMoveTiles(moves)
              // Calculate valid attack targets
              const targets = gameState.getValidAttackTargets(versatileActionPending)
                .filter(target => gameState.activePlayers.includes(target.creature.owner))
              setValidAttackTargets(targets)
              addToast(`${versatileActionPending.creature.name} selected - Versatile ability declined for this turn.`)
            }
            setShowVersatileActionModal(false)
            setVersatileActionPending(null)
          }}>
            ❌ Don't Use Ability
          </Button>

          {/* DECIDE LATER - Selects creature, clicking again will re-show modal */}
          <Button variant="secondary" onClick={() => {
            if (versatileActionPending) {
              // Select the creature normally (allows seeing movement path)
              setSelectedBoardCreature(versatileActionPending)
              // Calculate valid moves
              const moves = gameState.getValidMovementTiles(versatileActionPending)
              setValidMoveTiles(moves)
              // Calculate valid attack targets
              const targets = gameState.getValidAttackTargets(versatileActionPending)
                .filter(target => gameState.activePlayers.includes(target.creature.owner))
              setValidAttackTargets(targets)
              addToast(`${versatileActionPending.creature.name} selected - Click again to use Versatile ability.`)
            }
            setShowVersatileActionModal(false)
            setVersatileActionPending(null)
          }}>
            🕐 Decide Later
          </Button>

          {/* MOVE AS ACTION - Original functionality */}
          <Button variant="primary" onClick={() => {
            // Enable movement mode for the creature
            if (versatileActionPending) {
              // Reset hasMovedThisTurn so they can move again
              versatileActionPending.hasMovedThisTurn = false
              // Mark that we're using versatile so completing move taps the creature
              versatileActionPending.usingVersatileMove = true
              // Set this creature as selected for movement
              setSelectedBoardCreature(versatileActionPending)
              const moves = gameState.getValidMovementTiles(versatileActionPending)
              setValidMoveTiles(moves)
              setValidAttackTargets([]) // Clear attack targets since using action to move
              addToast(`VERSATILE: ${versatileActionPending.creature.name} can move again using their action!`)
            }
            setShowVersatileActionModal(false)
            setVersatileActionPending(null)
          }}>
            🏃 Move as Action
          </Button>
        </Modal.Footer>
      </Modal>

      {/* SCROLLBOOK Ability Modal - Discard order card to draw new one */}
      <Modal
        show={showScrollbookModal}
        onHide={() => {
          setShowScrollbookModal(false)
          setScrollbookCardIndex(null)
        }}
        centered
      >
        <Modal.Header closeButton style={{ backgroundColor: '#17a2b8', color: 'white', borderBottom: '1px solid #138496' }}>
          <Modal.Title>📜 SCROLLBOOK</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {scrollbookCardIndex !== null && currentPlayer && (
            <div>
              <p>Discard <strong style={{ color: '#17a2b8' }}>{currentPlayer.orderHand[scrollbookCardIndex]?.name}</strong> to draw a new Order card?</p>
              <p style={{ fontSize: '0.9rem', color: '#adb5bd' }}>This ability can only be used once per turn.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444', justifyContent: 'center', gap: '20px' }}>
          <Button variant="secondary" onClick={() => {
            setShowScrollbookModal(false)
            setScrollbookCardIndex(null)
          }}>
            Cancel
          </Button>
          <Button variant="info" onClick={() => {
            handleScrollbookUse(scrollbookCardIndex)
            setShowScrollbookModal(false)
            setScrollbookCardIndex(null)
          }}>
            📜 Use SCROLLBOOK
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

      {/* DISCIPLE OF KYUSS DAMAGE NOTIFICATION MODAL */}
      <DamageNotificationModal
        show={showDamageNotification}
        onDismiss={handleDamageNotificationDismiss}
        mode={damageNotificationData?.mode || 'ability'}
        abilityName={damageNotificationData?.abilityName}
        sourceCreature={damageNotificationData?.sourceCreature}
        damageEvents={damageNotificationData?.damageEvents || []}
      />

      {/* AI COMBAT DEATH NOTIFICATION MODAL */}
      <DamageNotificationModal
        show={showAiDeathModal}
        onDismiss={handleAiDeathModalDismiss}
        mode="combat"
        attackerInstance={currentAiDeath?.attackerInstance}
        defenderInstance={currentAiDeath?.defenderInstance}
        damageDealt={currentAiDeath?.damageDealt}
        attackType={currentAiDeath?.attackType}
        abilitiesTriggered={currentAiDeath?.abilitiesTriggered || []}
        moraleChanges={currentAiDeath?.moraleChanges}
      />
    </div>
  )
}

export default GameBoard
