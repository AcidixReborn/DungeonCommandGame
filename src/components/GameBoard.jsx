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
import { useNotifications, useSelection, useCombat, useAbilityModals, useAITurn, useDeployment } from '../hooks'
import DamageNotificationModal from './DamageNotificationModal'
import WebRemovalModal from './WebRemovalModal'
import HealingTouchModal from './HealingTouchModal'
import ChieftainCallModal from './ChieftainCallModal'
import OgreDeployMoraleModal from './OgreDeployMoraleModal'
import ClericDrawOrderModal from './ClericDrawOrderModal'
import CardsDrawnModal from './CardsDrawnModal'
import FactionSelectModal from './FactionSelectModal'
import ShiftDecisionModal from './ShiftDecisionModal'
import CounterAttackTargetModal from './CounterAttackTargetModal'
import PatchUpHealModal from './PatchUpHealModal'
import MoraleLossNotificationModal from './MoraleLossNotificationModal'
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

  // Ability modal state hook - handles all ability-related modal states
  const {
    // Flashing Blades
    showFlashingBladesModal, setShowFlashingBladesModal,
    flashingBladesPending, setFlashingBladesPending,
    flashingBladesTargetMode, setFlashingBladesTargetMode,
    clearFlashingBladesState,
    // Hidden Blade
    showHiddenBladeModal, setShowHiddenBladeModal,
    hiddenBladePending, setHiddenBladePending,
    hiddenBladeTargetMode, setHiddenBladeTargetMode,
    clearHiddenBladeState,
    // Confusion Gaze
    showConfusionGazeModal, setShowConfusionGazeModal,
    confusionGazeMode, setConfusionGazeMode,
    confusionGazePending, setConfusionGazePending,
    clearConfusionGazeState,
    // Slam
    slamMode, setSlamMode,
    slamPending, setSlamPending,
    slamValidTiles, setSlamValidTiles,
    showSlamModal, setShowSlamModal,
    showSlamConfirmModal, setShowSlamConfirmModal,
    slamSelectedTile, setSlamSelectedTile,
    clearSlamState,
    // Tomb Guardian Splash
    pendingSplashAttacks, setPendingSplashAttacks,
    currentSplashIndex, setCurrentSplashIndex,
    splashResults, setSplashResults,
    clearSplashState,
    // Lightning Breath
    lightningBreathMode, setLightningBreathMode,
    lightningBreathAttacker, setLightningBreathAttacker,
    lightningBreathTargets, setLightningBreathTargets,
    lightningBreathValidTargets, setLightningBreathValidTargets,
    lightningBreathCurrentAttackIndex, setLightningBreathCurrentAttackIndex,
    lightningBreathResults, setLightningBreathResults,
    clearLightningBreathState,
    // Disciple of Kyuss
    showDamageNotification, setShowDamageNotification,
    damageNotificationData, setDamageNotificationData,
    pendingPhaseAdvance, setPendingPhaseAdvance,
    // Insubstantial
    showInsubstantialModal, setShowInsubstantialModal,
    insubstantialData, setInsubstantialData,
    // Rider
    showRiderModal, setShowRiderModal,
    riderData, setRiderData,
    pendingRiderCallback, setPendingRiderCallback,
    selectedRiderCreature, setSelectedRiderCreature,
    clearRiderState,
    // Magic Circle Aura
    showMagicCircleModal, setShowMagicCircleModal,
    magicCircleModalData, setMagicCircleModalData,
    pendingMagicCircleNotifications, setPendingMagicCircleNotifications,
    // Ranged Splash
    pendingRangedSplashTargets, setPendingRangedSplashTargets,
    currentRangedSplashIndex, setCurrentRangedSplashIndex,
    rangedSplashAttackInfo, setRangedSplashAttackInfo,
    showRangedSplashDefensePanel, setShowRangedSplashDefensePanel,
    clearRangedSplashState,
    // Healing Touch
    showHealingTouchModal, setShowHealingTouchModal,
    healingTouchData, setHealingTouchData,
    // Chieftain Call
    showChieftainCallModal, setShowChieftainCallModal,
    chieftainCallData, setChieftainCallData,
    // Ogre Deploy Morale
    showOgreDeployMoraleModal, setShowOgreDeployMoraleModal,
    ogreDeployMoraleData, setOgreDeployMoraleData,
    // Cleric Draw Order
    showClericDrawOrderModal, setShowClericDrawOrderModal,
    clericDrawOrderData, setClericDrawOrderData,
    // Web Removal
    showWebRemovalModal, setShowWebRemovalModal,
    webRemovalData, setWebRemovalData,
    // Cards Drawn
    showCardsDrawnModal, setShowCardsDrawnModal,
    cardsDrawnData, setCardsDrawnData,
    bonusDrawSources, setBonusDrawSources,
    // Recoil Draw (opponent card draw side effect)
    showRecoilDrawModal, setShowRecoilDrawModal,
    recoilDrawnCards, setRecoilDrawnCards,
    recoilSourceCardName, setRecoilSourceCardName,
    // Faction Select (Recoil target selection with 3+ factions)
    showFactionSelectModal, setShowFactionSelectModal,
    factionSelectConfig, setFactionSelectConfig,
    // Shift After Defense (Cloud of Bats)
    showShiftDecisionModal, setShowShiftDecisionModal,
    pendingShiftAfterDefense, setPendingShiftAfterDefense,
    shiftSelectionMode, setShiftSelectionMode,
    shiftValidTiles, setShiftValidTiles,
    // Counter-Attack Target Selection (Seize the Opportunity)
    showCounterAttackTargetModal, setShowCounterAttackTargetModal,
    counterAttackPending, setCounterAttackPending,
    // Patch Up Heal (proactive healing during ACTIVATE)
    showPatchUpHealModal, setShowPatchUpHealModal,
    patchUpHealConfig, setPatchUpHealConfig,
    // Morale Loss Notification (Unexpected Resistance)
    showMoraleLossModal, setShowMoraleLossModal,
    moraleLossModalData, setMoraleLossModalData,
    // Savage Demise (self-sacrifice attack)
    savageDemisePending, setSavageDemisePending,
    clearSavageDemiseState,
    // Clear all
    clearAllAbilityModalState
  } = useAbilityModals()

  // AI Turn state hook - handles AI thinking, death queue, and notifications
  const {
    isAIThinking, setIsAIThinking,
    startAiThinking, endAiThinking,
    aiDeathQueue, setAiDeathQueue,
    showAiDeathModal, setShowAiDeathModal,
    currentAiDeath, setCurrentAiDeath,
    queueAiDeath, showNextAiDeath,
    acknowledgeAiDeath, clearAiDeathQueue,
    hasQueuedDeaths,
    aiCurrentAction, setAiCurrentAction,
    clearAllAiTurnState
  } = useAITurn()

  // Deployment state hook - handles deploy confirmation and graveyard deployment
  const {
    showDeployConfirm, setShowDeployConfirm,
    pendingDeployment, setPendingDeployment,
    startDeployConfirmation, cancelDeployConfirmation, clearDeployConfirmation,
    selectedGraveyardCreature, setSelectedGraveyardCreature,
    selectedGraveyardIndex, setSelectedGraveyardIndex,
    draggingFromGraveyard, setDraggingFromGraveyard,
    selectGraveyardCreature, clearGraveyardSelection,
    startGraveyardDrag, endGraveyardDrag,
    showHordeModal, setShowHordeModal,
    hordeRefreshExecuted, setHordeRefreshExecuted,
    clearHordeState, clearAllDeploymentState
  } = useDeployment()

  // Alias healingTouchData fields to match existing variable names
  const healingTouchHealer = healingTouchData?.healer || null
  const healingTouchTarget = healingTouchData?.target || null
  // Alias chieftainCallData to match existing variable name
  const chieftainCallPending = chieftainCallData
  const setChieftainCallPending = setChieftainCallData
  // Alias ogreDeployMoraleData to match existing variable name
  const ogreDeployMoraleResult = ogreDeployMoraleData
  // Alias clericDrawOrderData to match existing variable name
  const clericDrawOrderResult = clericDrawOrderData
  // Alias webRemovalData to match existing variable name
  const webRemovalCreature = webRemovalData

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

  // ORDER CARD TARGETING state - for Web and other targeted order cards
  const [orderCardFilterCreature, setOrderCardFilterCreature] = useState(null) // Creature selected for filtering order cards
  const [selectedOrderCard, setSelectedOrderCard] = useState(null) // { card, cardIndex } - order card being used
  const [orderCardTargetingMode, setOrderCardTargetingMode] = useState(false) // True when selecting target for order card
  const [orderCardValidTargets, setOrderCardValidTargets] = useState([]) // Valid target creatures for selected order card

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
    return gameState.getAllRangedLOSTiles()
  }, [creatureViewMode, gameState, renderCounter])

  /**
   * Helper function to check if a player is human
   * @param {string} playerId - Player ID (PLAYER1, PLAYER2, etc.)
   * @returns {boolean} True if player is human
   */
  const isPlayerHuman = (playerId) => {
    if (!gameConfig) {
      return false
    }
    const playerNum = playerId.replace('PLAYER', '')
    const playerKey = `player${playerNum}`
    return gameConfig[playerKey]?.isHuman || false
  }

  /**
   * Get opponent factions that can receive cards (have cards in deck)
   * Used for Recoil faction selection
   * @param {string} defenderPlayerId - Player ID of the defender using Recoil
   * @returns {Array} Array of { playerId, factionName, commanderImage, commanderName }
   */
  const getEligibleOpponentFactions = (defenderPlayerId) => {
    if (!gameState) return []
    return Object.entries(gameState.players)
      .filter(([playerId, player]) => {
        if (playerId === defenderPlayerId) return false // Not defender
        if (!gameState.activePlayers.includes(playerId)) return false // Must be active
        if (player.orderDeck.length === 0) return false // Must have cards to draw
        return true
      })
      .map(([playerId, player]) => ({
        playerId,
        factionName: player.faction,
        commanderImage: player.commander?.imageUrl,
        commanderName: player.commander?.name
      }))
  }

  /**
   * AI target selection for Recoil: 75% chance non-attacker, 25% attacker
   * @param {Array} eligibleFactions - Array of eligible faction options
   * @param {string} attackerPlayerId - Player ID of the attacker
   * @returns {string} Selected player ID
   */
  const selectAIRecoilTarget = (eligibleFactions, attackerPlayerId) => {
    const nonAttackerFactions = eligibleFactions.filter(f => f.playerId !== attackerPlayerId)
    if (nonAttackerFactions.length > 0 && Math.random() < 0.75) {
      // Pick random non-attacker (75% chance)
      return nonAttackerFactions[Math.floor(Math.random() * nonAttackerFactions.length)].playerId
    }
    // Give to attacker (25% chance, or if no non-attackers available)
    const attackerFaction = eligibleFactions.find(f => f.playerId === attackerPlayerId)
    return attackerFaction?.playerId || eligibleFactions[0].playerId
  }

  /**
   * Handle opponent draw effects (Recoil) with faction selection
   * Shows modal for human defenders with 3+ factions, auto-selects for 2-player or AI
   * @param {number} cardCount - Number of cards opponent draws
   * @param {string} cardName - Name of the card causing the draw (e.g., "Recoil")
   * @param {string} defenderPlayerId - Player ID of the defender using the card
   * @param {string} attackerPlayerId - Player ID of the attacker
   */
  const handleOpponentDrawEffect = (cardCount, cardName, defenderPlayerId, attackerPlayerId) => {
    if (cardCount <= 0) return

    // Get list of opponent factions (excluding defender)
    const opponentFactions = getEligibleOpponentFactions(defenderPlayerId)

    if (opponentFactions.length === 0) {
      // No opponents have cards to draw - just show toast
      addToast(`No opponent decks have cards - ${cardName} draw effect skipped`)
      return
    }

    if (opponentFactions.length === 1) {
      // Only one opponent - auto-select (2-player game or only 1 has cards)
      executeRecoilDraw(opponentFactions[0].playerId, cardName, defenderPlayerId, attackerPlayerId)
      return
    }

    // Multiple opponents - show selection modal (if human) or AI chooses
    if (isPlayerHuman(defenderPlayerId)) {
      setFactionSelectConfig({
        title: 'Choose Opponent to Receive Card',
        description: `${cardName}: An opponent draws 1 Order card`,
        eligibleFactions: opponentFactions,
        onSelect: (targetPlayerId) => {
          executeRecoilDraw(targetPlayerId, cardName, defenderPlayerId, attackerPlayerId)
          setShowFactionSelectModal(false)
        },
        pendingDrawInfo: { cardCount, sourceName: cardName, defenderPlayerId, attackerPlayerId }
      })
      setShowFactionSelectModal(true)
    } else {
      // AI: 75% chance non-attacker, 25% attacker
      const targetPlayerId = selectAIRecoilTarget(opponentFactions, attackerPlayerId)
      executeRecoilDraw(targetPlayerId, cardName, defenderPlayerId, attackerPlayerId)
    }
  }

  /**
   * Execute the Recoil draw and handle reveal timing
   * @param {string} targetPlayerId - Player ID who receives the card
   * @param {string} cardName - Name of the card causing the draw
   * @param {string} defenderPlayerId - Player ID of the defender
   * @param {string} attackerPlayerId - Player ID of the attacker
   */
  const executeRecoilDraw = (targetPlayerId, cardName, defenderPlayerId, attackerPlayerId) => {
    const targetPlayer = gameState.players[targetPlayerId]
    const defenderPlayer = gameState.players[defenderPlayerId]
    const drawnCards = targetPlayer.drawOrderCards(1)

    // Toast for all players
    if (drawnCards.length > 0) {
      addToast(`${defenderPlayer.commander?.name || 'Player'} chose to give ${targetPlayer.commander?.name || 'opponent'} 1 card from ${cardName}`)
    } else {
      addToast(`${targetPlayer.commander?.name || 'Opponent'}'s deck is empty - no cards to draw from ${cardName}`)
    }

    if (drawnCards.length > 0) {
      const isAttacker = targetPlayerId === attackerPlayerId

      if (isAttacker && !targetPlayer.isAI) {
        // Attacker sees card immediately
        setRecoilDrawnCards(drawnCards)
        setRecoilSourceCardName(cardName)
        setShowRecoilDrawModal(true)
      } else if (!isAttacker && !targetPlayer.isAI) {
        // Non-attacker human: queue for their ACTIVATE phase
        targetPlayer.addPendingCardReveal(drawnCards[0], cardName, defenderPlayerId)
      }
      // AI recipients don't need modal - they already have the card
    }
  }

  /**
   * Handle morale loss from Unexpected Resistance card
   * @param {Object} moraleTarget - { creature: CreatureInstance, owner: playerId }
   * @param {string} cardName - Name of the card causing the morale loss
   * @param {string} defenderPlayerId - Player ID of the defender using the card
   * @param {string} attackerPlayerId - Player ID of the attacker
   * @param {number} moraleLoss - Amount of morale to lose (default 1)
   */
  const handleMoraleLossEffect = (moraleTarget, cardName, defenderPlayerId, attackerPlayerId, moraleLoss = 1) => {
    if (!moraleTarget || !moraleTarget.creature || !moraleTarget.owner) return

    const targetPlayerId = moraleTarget.owner
    const targetPlayer = gameState.players[targetPlayerId]
    const defenderPlayer = gameState.players[defenderPlayerId]

    // Apply morale loss
    const wasDefeated = targetPlayer.loseMorale(moraleLoss)

    // Toast for all players
    const targetCreatureName = moraleTarget.creature.creature?.name || moraleTarget.creature.name
    const defenderName = defenderPlayer.commander?.name || 'Player'
    const targetPlayerName = targetPlayer.commander?.name || 'Player'
    addToast(`${defenderName} used ${cardName} - ${targetPlayerName} loses ${moraleLoss} morale (${targetCreatureName} was adjacent)`)

    // Show notification modal
    const isAttacker = targetPlayerId === attackerPlayerId

    if (isAttacker && !targetPlayer.isAI) {
      // Attacker sees modal immediately
      setMoraleLossModalData({
        cardName,
        defenderName,
        targetCreatureName,
        moraleLost: moraleLoss,
        currentMorale: targetPlayer.morale,
        wasDefeated
      })
      setShowMoraleLossModal(true)
    } else if (!isAttacker && !targetPlayer.isAI) {
      // Non-attacker human: queue for their ACTIVATE phase
      if (!targetPlayer.pendingMoraleNotifications) {
        targetPlayer.pendingMoraleNotifications = []
      }
      targetPlayer.pendingMoraleNotifications.push({
        cardName,
        defenderName,
        targetCreatureName,
        moraleLost: moraleLoss,
        source: defenderPlayerId
      })
    }
    // AI recipients don't need modal

    // Handle defeat if morale reached 0
    if (wasDefeated) {
      // Defeat is handled by the game state's checkVictoryConditions
      addToast(`${targetPlayerName} has been defeated! (Morale reduced to 0)`)
    }
  }

  /**
   * Check for Magic Circle Aura state changes and show modal if needed
   * Called after creature movement to detect when Hobgoblin Sorcerer enters/leaves Magic Circle
   * @param {string} moverOwner - Owner of the creature that moved
   */
  const checkMagicCircleAuraChange = (moverOwner) => {
    if (!gameState?.lastMagicCircleAuraChange) return

    const { entered, left, sorcerer, owner, timestamp } = gameState.lastMagicCircleAuraChange

    if (!entered && !left) {
      gameState.lastMagicCircleAuraChange = null
      return
    }

    // Check if the mover is human or AI
    const moverIsHuman = isPlayerHuman(moverOwner)

    if (moverIsHuman) {
      // Human player moved the Sorcerer - show modal immediately to mover
      setMagicCircleModalData({
        activated: entered,
        deactivated: left,
        sorcererName: sorcerer.creature.name,
        sorcererOwner: owner,
        reason: entered ? 'entered' : 'left'
      })
      setShowMagicCircleModal(true)

      // ALSO queue notification for OTHER human players
      const newNotifications = { ...pendingMagicCircleNotifications }
      for (const playerId of gameState.activePlayers) {
        if (isPlayerHuman(playerId) && playerId !== moverOwner) {
          newNotifications[playerId] = {
            activated: entered,
            deactivated: left,
            sorcererName: sorcerer.creature.name,
            sorcererOwner: owner,
            reason: entered ? 'human_entered' : 'human_left',
            acknowledged: false,
            timestamp: timestamp
          }
        }
      }
      setPendingMagicCircleNotifications(newNotifications)
    } else {
      // AI moved the Sorcerer - queue notification for ALL human players
      const newNotifications = { ...pendingMagicCircleNotifications }
      for (const playerId of gameState.activePlayers) {
        if (isPlayerHuman(playerId)) {
          newNotifications[playerId] = {
            activated: entered,
            deactivated: left,
            sorcererName: sorcerer.creature.name,
            sorcererOwner: owner,
            reason: entered ? 'ai_entered' : 'ai_left',
            acknowledged: false,
            timestamp: timestamp
          }
        }
      }
      setPendingMagicCircleNotifications(newNotifications)
    }

    // Clear the change flag
    gameState.lastMagicCircleAuraChange = null
  }

  /**
   * Check for pending Magic Circle Aura notifications at turn start
   * Shows modal to human players about AI-triggered aura changes (enters/leaves/death)
   * Only shows ONCE per aura activation - not every turn
   */
  const checkPendingMagicCircleNotifications = () => {
    if (!gameState?.currentPlayer) return
    if (!isPlayerHuman(gameState.currentPlayer)) return

    const currentPlayer = gameState.currentPlayer

    // Check for pending change notifications (enters/leaves/death from AI moves)
    const notification = pendingMagicCircleNotifications[currentPlayer]
    if (notification && !notification.acknowledged) {
      setMagicCircleModalData({
        activated: notification.activated,
        deactivated: notification.deactivated,
        sorcererName: notification.sorcererName,
        sorcererOwner: notification.sorcererOwner,
        reason: notification.reason
      })
      setShowMagicCircleModal(true)

      // Mark as acknowledged so it only shows once
      setPendingMagicCircleNotifications(prev => ({
        ...prev,
        [currentPlayer]: { ...prev[currentPlayer], acknowledged: true }
      }))
    }
  }

  /**
   * Check if Sorcerer death ends Magic Circle Aura and show notification
   * Called when a creature is destroyed
   * @param {CreatureInstance} destroyedCreature - The creature that was destroyed
   */
  const checkMagicCircleAuraDeathNotification = (destroyedCreature) => {
    if (!gameState?.checkSorcererDeathEndsAura) return

    const auraEnded = gameState.checkSorcererDeathEndsAura(destroyedCreature)
    if (auraEnded) {
      // Show death notification to all human players
      for (const playerId of gameState.activePlayers) {
        if (isPlayerHuman(playerId)) {
          setMagicCircleModalData({
            activated: false,
            deactivated: true,
            sorcererName: destroyedCreature.creature.name,
            sorcererOwner: destroyedCreature.owner,
            reason: 'death'
          })
          setShowMagicCircleModal(true)
          break // Show once
        }
      }
    }
  }

  /**
   * Check for pending morale loss notifications (from Unexpected Resistance, etc.)
   * Shows modal to human players about morale loss from opponent card effects
   * Called at ACTIVATE phase after CardsDrawnModal closes
   */
  const checkPendingMoraleNotifications = () => {
    if (!gameState?.currentPlayer) return
    if (!isPlayerHuman(gameState.currentPlayer)) return

    const player = gameState.getCurrentPlayerState()
    if (!player?.pendingMoraleNotifications?.length) return

    // Get the first pending notification and show it
    const notification = player.pendingMoraleNotifications[0]

    setMoraleLossModalData({
      cardName: notification.cardName,
      defenderName: notification.defenderName,
      targetCreatureName: notification.targetCreatureName,
      moraleLost: notification.moraleLost,
      currentMorale: player.morale,
      wasDefeated: player.morale <= 0
    })
    setShowMoraleLossModal(true)

    // Remove from pending (shift array)
    player.pendingMoraleNotifications.shift()
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
    setFactionConfig(config)
  }

  /**
   * Handler for commander selection - start the game
   * Creates decks and initializes game state
   * @param {Object} config - Complete game configuration with commanders
   */
  const startNewGame = (config) => {
    // Store the final game configuration (with commanders selected)
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
          // Check if creature is webbed - show Web Removal Modal
          if (gameState.isWebbed && gameState.isWebbed(tile.occupant)) {
            setWebRemovalCreature(tile.occupant)
            setShowWebRemovalModal(true)
            // Still select the creature for attacking
            setOrderCardFilterCreature(tile.occupant)
            return
          }
          handleCreatureSelect(tile.occupant)
          // Also set this creature as the filter for Order Card Panel
          setOrderCardFilterCreature(tile.occupant)
          // Clear any previous order card targeting state
          if (orderCardTargetingMode) {
            setSelectedOrderCard(null)
            setOrderCardTargetingMode(false)
            setOrderCardValidTargets([])
          }
        }
      } else {
        // Clicking on empty tile - deselect current creature
        if (selectedBoardCreature) {
          setSelectedBoardCreature(null)
          setValidMoveTiles([])
          setValidAttackTargets([])
          setLineOfSightPath([])
        }
        // Also clear order card filter when clicking empty tile
        setOrderCardFilterCreature(null)
        // Clear order card targeting mode
        if (orderCardTargetingMode) {
          setSelectedOrderCard(null)
          setOrderCardTargetingMode(false)
          setOrderCardValidTargets([])
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

      // MAGIC CIRCLE AURA: Check if Sorcerer entered/left Magic Circle
      checkMagicCircleAuraChange(creatureInstance.owner)

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

    // Check if this is a shift after defense (Cloud of Bats)
    if (pendingMove.isShiftAfterDefense) {
      handleShiftConfirm()
      return
    }

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

      // MAGIC CIRCLE AURA: Check if Sorcerer entered/left Magic Circle
      checkMagicCircleAuraChange(pendingMove.creature.owner)
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
    // Check if this is a shift after defense (Cloud of Bats)
    if (pendingMove?.isShiftAfterDefense) {
      handleShiftCancel()
      return
    }

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

    // Calculate incoming damage for INSUBSTANTIAL check
    const incomingDamageForCheck = targetInfo.attackType === 'melee'
      ? attackerInstance.creature.meleeAttack?.damage || 0
      : attackerInstance.creature.rangedAttack?.damage || 0

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(defenderInstance, incomingDamageForCheck, attackerInstance.owner)
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, incomingDamageForCheck, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(`👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${incomingDamageForCheck} damage! Ability used until next Undead Refresh.`)
        }

        // Attack is blocked - tap attacker if they moved and mark as attacked
        attackerInstance.hasAttackedThisTurn = true
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        // Clear selection and re-render
        setSelectedBoardCreature(null)
        setValidMoveTiles([])
        setValidAttackTargets([])
        setRenderCounter(prev => prev + 1)
        return
      }
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

          // Handle opponent draws (Recoil) - defender chooses which opponent receives card
          if (result.opponentDrawsCards > 0) {
            const cardName = result.cardUsed?.name || defenseDecision.card.name
            handleOpponentDrawEffect(result.opponentDrawsCards, cardName, defenderInstance.owner, attackerInstance.owner)
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
            if (defenseResult.bonusDrawsQueued > 0) extraEffects += ` Drew ${defenseResult.bonusDrawsQueued} card${defenseResult.bonusDrawsQueued > 1 ? 's' : ''}.`
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
          // UNTAP ON KILL ability notification
          if (result.untapOnKillTriggered && result.untapOnKillData) {
            message += ` ⚔️ ${result.untapOnKillData.bugbearName} UNTAPS from adjacent kill!`
          }
        } else {
          message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
        }

        // UNTAP ON KILL toast notification (separate toast for visibility)
        if (result.untapOnKillTriggered && result.untapOnKillData) {
          addToast(`⚔️ UNTAP ON KILL: ${result.untapOnKillData.bugbearName} untaps and can act again!`)
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

        // Check for RANGED SPLASH DAMAGE (ACID BREATH / EXPLOSIVE BOLTS)
        // Only triggers on ranged attacks, and splash happens AFTER main attack resolves
        if (result.pendingRangedSplash && targetInfo.attackType === 'ranged') {
          const defenderPosition = defenderInstance.position
          const hasSplash = checkAndProcessRangedSplash(attackerInstance, defenderPosition, () => {
            // Callback when splash processing completes
            setSelectedBoardCreature(null)
            setValidMoveTiles([])
            setValidAttackTargets([])
            setRenderCounter(prev => prev + 1)
          })
          if (hasSplash) {
            // Splash is being processed - don't clear state yet
            setRenderCounter(prev => prev + 1)
            return
          }
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

    // Route RANGED SPLASH defense to dedicated handler (ACID BREATH / EXPLOSIVE BOLTS)
    // IMPORTANT: Check this BEFORE generic splash, since ranged splash also sets isSplashDamage
    if (pendingAttack.isRangedSplash || targetInfo.attackType === 'ranged_splash') {
      handleRangedSplashDefenseSelected(defense)
      return
    }

    // Route splash damage defense to dedicated handler (SWIRL ability)
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
      // Check for SAVAGE DEMISE (self-sacrifice attack) FIRST before normal handling
      if (defense.card.selfSacrificeAttack && defense.sacrificeTarget) {
        // Savage Demise: Creature attacks adjacent tapped enemy, then dies
        // Original attack is completely negated
        // Target is TAPPED so they cannot defend - execute immediately

        // Calculate attack damage (base melee damage of creature using the card)
        const attackDamage = defense.creature.creature.meleeAttack?.damage || 0

        // Discard the Savage Demise card from hand
        const defenderPlayer = gameState.players[defenderInstance.owner]
        const cardIndex = defenderPlayer.orderHand.findIndex(c => c.id === defense.card.id)
        if (cardIndex !== -1) {
          defenderPlayer.orderHand.splice(cardIndex, 1)
          defenderPlayer.orderDiscard.push(defense.card)
        }

        // Get the sacrifice target and user
        const sacrificeTarget = defense.sacrificeTarget.creature
        const sacrificeUser = defense.creature

        // Close the combat panel first
        closeCombatPanel()

        // Show toast about Savage Demise being used
        addToast(`⚔️ SAVAGE DEMISE: ${sacrificeUser.creature.name} sacrifices itself to attack ${sacrificeTarget.creature.name}!`)

        // === EXECUTE SAVAGE DEMISE ATTACK (no defense - target is tapped) ===
        const savageDemiseResult = gameState.applySavageDemiseDamage(sacrificeTarget, sacrificeUser.owner, attackDamage, 0)

        // Build damage message
        let damageMsg = `⚔️ ${sacrificeUser.creature.name} attacks ${sacrificeTarget.creature.name} for ${savageDemiseResult.damage} damage!`
        if (savageDemiseResult.destroyed) {
          damageMsg += ` ${sacrificeTarget.creature.name} was destroyed!`
          if (savageDemiseResult.moraleChange) {
            damageMsg += ` Morale: ${sacrificeUser.owner} +${savageDemiseResult.moraleChange.attacker}, ${sacrificeTarget.owner} ${savageDemiseResult.moraleChange.defender}`
          }
        } else {
          damageMsg += ` ${sacrificeTarget.creature.name} has ${savageDemiseResult.remainingHP} HP remaining.`
        }
        addToast(damageMsg)

        // === CHECK FOR DEATH STRIKE (Boar/Wereboar) ===
        // DEATH STRIKE hits the ORIGINAL ATTACKER, not the Savage Demise target
        const hasDeathStrike = gameState.hasDeathStrike && gameState.hasDeathStrike(sacrificeUser)

        if (hasDeathStrike) {
          // DEATH STRIKE: Additional melee attack against the ORIGINAL ATTACKER (the creature that attacked the Boar/Wereboar)
          const deathStrikeDamage = sacrificeUser.creature.meleeAttack?.damage || 0
          const deathStrikeResult = gameState.applySavageDemiseDamage(attackerInstance, sacrificeUser.owner, deathStrikeDamage, 0)

          let deathStrikeMsg = `💀 DEATH STRIKE: ${sacrificeUser.creature.name} strikes ${attackerInstance.creature.name} for ${deathStrikeDamage} damage!`
          if (deathStrikeResult.destroyed) {
            deathStrikeMsg += ` ${attackerInstance.creature.name} was destroyed!`
            if (deathStrikeResult.moraleChange) {
              deathStrikeMsg += ` Morale: ${sacrificeUser.owner} +${deathStrikeResult.moraleChange.attacker}, ${attackerInstance.owner} ${deathStrikeResult.moraleChange.defender}`
            }
          } else {
            deathStrikeMsg += ` ${attackerInstance.creature.name} has ${deathStrikeResult.remainingHP} HP remaining.`
          }
          addToast(deathStrikeMsg)
        }

        // === SACRIFICE THE CREATURE (guaranteed death) ===
        const sacrificeResult = gameState.sacrificeCreature(sacrificeUser)

        addToast(`☠️ SACRIFICE: ${sacrificeUser.creature.name} dies from Savage Demise! (Morale -${sacrificeResult.moraleLost})`)

        // Check for game over conditions
        gameState.checkGameOver()

        // Check for immediate elimination (sacrifice user's owner)
        const sacrificeOwner = sacrificeUser.owner
        const eliminationResult = gameState.checkAndEliminatePlayer(sacrificeOwner)
        if (eliminationResult.eliminated) {
          const reason = eliminationResult.reason === 'morale' ? 'Morale reduced to 0!' : 'All creatures destroyed!'
          addToast(`🏳️ ${gameState.players[sacrificeOwner].commander.name} has been eliminated! ${reason}`)
        }

        // Check for Savage Demise target owner elimination
        const targetOwner = sacrificeTarget.owner
        const targetEliminationResult = gameState.checkAndEliminatePlayer(targetOwner)
        if (targetEliminationResult.eliminated) {
          const reason = targetEliminationResult.reason === 'morale' ? 'Morale reduced to 0!' : 'All creatures destroyed!'
          addToast(`🏳️ ${gameState.players[targetOwner].commander.name} has been eliminated! ${reason}`)
        }

        // Check for original attacker owner elimination (DEATH STRIKE may have killed them)
        const attackerOwner = attackerInstance.owner
        if (attackerOwner !== targetOwner) { // Don't double-check if same player
          const attackerEliminationResult = gameState.checkAndEliminatePlayer(attackerOwner)
          if (attackerEliminationResult.eliminated) {
            const reason = attackerEliminationResult.reason === 'morale' ? 'Morale reduced to 0!' : 'All creatures destroyed!'
            addToast(`🏳️ ${gameState.players[attackerOwner].commander.name} has been eliminated! ${reason}`)
          }
        }

        // === TAP THE ORIGINAL ATTACKER (they used their action even though attack was negated) ===
        // The attacker consumed their action by attacking, so they should be tapped
        if (attackerInstance && !attackerInstance.isTapped) {
          attackerInstance.hasAttackedThisTurn = true
          if (attackerInstance.hasMovedThisTurn) {
            attackerInstance.tap()
          }
        }

        // Clear pending attack (original attack is negated)
        setPendingAttack(null)

        // Force re-render
        setRenderCounter(prev => prev + 1)

        return // Original attack is completely negated
      }

      // IMMEDIATE CARD: Prevent damage, discard card, tap creature
      // Pass discardCard if card has discard cost (e.g., Uncanny Dodge)
      const result = gameState.applyImmediateCardDefense(defense.card, defense.creature, defense.discardCard)

      if (result.success) {
        const newAccumulatedReduction = accumulatedReduction + result.damagePrevented
        const remainingDamage = originalDamage - newAccumulatedReduction

        // Handle opponent draws (Recoil) - defender chooses which opponent receives card
        if (result.opponentDrawsCards > 0) {
          const cardName = result.cardUsed?.name || defense.card.name
          handleOpponentDrawEffect(result.opponentDrawsCards, cardName, defenderInstance.owner, attackerInstance.owner)
        }

        // Handle opponent morale loss (Unexpected Resistance) - defender selected target
        if (defense.moraleTarget && defense.card.opponentMoraleLoss > 0) {
          const cardName = result.cardUsed?.name || defense.card.name
          handleMoraleLossEffect(defense.moraleTarget, cardName, defenderInstance.owner, attackerInstance.owner, defense.card.opponentMoraleLoss)
        }

        // Check if card grants a shift after use (Cloud of Bats)
        if (result.shiftAfterUse > 0 && result.creatureToShift) {
          // Store pending shift info and show decision modal
          // The attack execution will happen after shift decision
          setPendingShiftAfterDefense({
            creature: result.creatureToShift,
            maxShift: result.shiftAfterUse,
            cardName: result.cardUsed?.name || defense.card.name,
            pendingAttackInfo: {
              newAccumulatedReduction,
              remainingDamage,
              originalDamage,
              defenderInstance,
              attackerInstance,
              cardUsed: result.cardUsed?.name || defense.card.name,
              creatureTapped: defense.creature.creature.name,
              moraleGain: result.moraleGain || 0,
              untapAfterUse: result.untapAfterUse || false
            }
          })
          closeCombatPanel()
          setShowShiftDecisionModal(true)
          return // Wait for shift decision
        }

        // No shift - continue with normal flow
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

        // No more options or damage fully prevented - check for counter-attack
        closeCombatPanel()

        // Handle counter-attack if the card has one
        let counterAttackResults = null
        if (result.counterAttack) {
          const counterResult = executeCounterAttack(result.counterAttack, attackerInstance)

          if (counterResult.needsTargetSelection) {
            // Human player needs to select target (Seize the Opportunity with multiple targets)
            setCounterAttackPending({
              damage: counterResult.damage,
              validTargets: counterResult.validTargets,
              defenderInstance: result.counterAttack.defenderInstance,
              attackerInstance: attackerInstance,
              pendingDefenseResult: {
                type: 'immediate_card',
                damageReduction: newAccumulatedReduction,
                moraleCost: 0,
                cardUsed: result.cardUsed?.name || defense.card.name,
                creatureTapped: defense.creature.creature.name,
                moraleGain: result.moraleGain || 0,
                untapAfterUse: result.untapAfterUse || false,
                success: true
              }
            })
            setShowCounterAttackTargetModal(true)
            return // Wait for target selection
          }

          if (counterResult.executed) {
            counterAttackResults = counterResult.results
            // Show toast for each target hit
            for (const hit of counterResult.results) {
              if (hit.killed) {
                addToast(`⚔️ COUNTER-ATTACK: ${defense.creature.creature.name} killed ${hit.targetName} with ${hit.damage} damage!`)
              } else {
                addToast(`⚔️ COUNTER-ATTACK: ${defense.creature.creature.name} dealt ${hit.damage} damage to ${hit.targetName} (${hit.remainingHP} HP remaining)`)
              }
            }
          } else if (counterResult.message) {
            // Counter-attack couldn't execute (e.g., ranged attacker not adjacent for Riposte)
            addToast(`⚡ ${result.cardUsed?.name || defense.card.name}: ${counterResult.message}`)
          }
        }

        executeAttackAfterDefense({
          type: 'immediate_card',
          damageReduction: newAccumulatedReduction,
          moraleCost: 0,
          cardUsed: result.cardUsed?.name || defense.card.name,
          creatureTapped: defense.creature.creature.name,
          moraleGain: result.moraleGain || 0,
          untapAfterUse: result.untapAfterUse || false,
          counterAttackResults: counterAttackResults,
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
    console.log('[executeAttackAfterDefense] === CALLED ===')
    console.log('[executeAttackAfterDefense] defenseResult:', defenseResult)
    console.log('[executeAttackAfterDefense] pendingAttack:', pendingAttack)
    console.log('[executeAttackAfterDefense] savageDemisePending:', savageDemisePending)

    if (!pendingAttack) {
      console.log('[executeAttackAfterDefense] No pendingAttack - returning early')
      return
    }

    const { attackerInstance, defenderInstance, targetInfo, isFlashingBlades, isHiddenBlade, isConfusionGaze, isRangedSplash } = pendingAttack

    // Handle RANGED SPLASH damage (ACID BREATH / EXPLOSIVE BOLTS)
    if (isRangedSplash && rangedSplashAttackInfo) {
      console.log('[executeAttackAfterDefense] Handling RANGED SPLASH')
      const damageReduction = defenseResult.damageReduction || 0
      handleRangedSplashDefenseComplete({ damageReduction })
      return
    }

    // Handle SAVAGE DEMISE attack resolution
    if (pendingAttack.isSavageDemise && savageDemisePending) {
      console.log('[executeAttackAfterDefense] Routing to handleSavageDemiseResolution')
      handleSavageDemiseResolution(defenseResult)
      return
    }
    console.log('[executeAttackAfterDefense] Not Savage Demise, continuing with normal attack')

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
        // RIDER ability notification
        if (result.riderTriggered) {
          message += ` 🐴 RIDER ability may trigger!`
        }
        // UNTAP ON KILL ability notification
        if (result.untapOnKillTriggered && result.untapOnKillData) {
          message += ` ⚔️ ${result.untapOnKillData.bugbearName} UNTAPS from adjacent kill!`
        }
      } else {
        message += ` ${defenderInstance.creature.name} has ${result.remainingHP || defenderInstance.currentHP} HP remaining.`
      }

      // LIFE DRAIN toast notification
      if (result.lifeDrain?.triggered) {
        addToast(`🧛 LIFE DRAIN: ${result.lifeDrain.creatureName} healed ${result.lifeDrain.healAmount} HP! (${result.lifeDrain.currentHP}/${result.lifeDrain.maxHP})`)
      }

      // UNTAP ON KILL toast notification (separate toast for visibility)
      if (result.untapOnKillTriggered && result.untapOnKillData) {
        addToast(`⚔️ UNTAP ON KILL: ${result.untapOnKillData.bugbearName} untaps and can act again!`)
      }

      addToast(message)
      gameState.checkGameOver()

      // RIDER ability check - must be processed BEFORE other follow-up attacks
      // Supports both Curse of Undeath (Skeleton) and Tyranny of Goblins (Goblin/Wolf)
      if (result.riderTriggered && result.riderData) {
        const { position, ownerPlayerId, creatureLevel, creatureName, faction } = result.riderData
        const eligibleCreatures = gameState.getEligibleRiderCreatures(ownerPlayerId, 3, faction)

        if (eligibleCreatures.length > 0) {
          // Check if the RIDER owner is a human player (not AI)
          // Use isPlayerHuman() to properly handle hotseat games with multiple human players
          const riderOwnerIsHuman = isPlayerHuman(ownerPlayerId)

          if (riderOwnerIsHuman) {
            // Show modal for human player to select creature
            setRiderData({
              destroyedCreature: creatureName,
              creatureLevel: creatureLevel,
              faction: faction,
              position: position,
              ownerPlayerId: ownerPlayerId,
              eligibleCreatures: eligibleCreatures
            })
            setShowRiderModal(true)
            // Store callback to continue combat flow after modal
            setPendingRiderCallback(() => () => {
              setRenderCounter(prev => prev + 1)
            })
            return // Wait for modal selection
          } else {
            // AI handles RIDER
            handleAIRiderDecision(ownerPlayerId, eligibleCreatures, position, creatureLevel, creatureName, faction, null)
          }
        }
      }

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

        // Check for SLAM trigger after defense (Earth Guardian - melee attacks only)
        // SLAM triggers if: damage dealt > 0, target NOT destroyed, attacker has SLAM, melee attack
        if (targetInfo.attackType === 'melee' &&
            result.damage > 0 &&
            !result.destroyed &&
            defenderInstance.currentHP > 0 &&
            gameState.hasSlam(attackerInstance)) {
          const validSlamTiles = gameState.getValidSlamTiles(defenderInstance, 3)

          if (validSlamTiles.length > 0) {
            const isAttackerHuman = isPlayerHuman(attackerInstance.owner)

            if (isAttackerHuman) {
              // Human attacker - show SLAM decision modal
              setSlamPending({ attackerInstance, targetInstance: defenderInstance })
              setSlamValidTiles(validSlamTiles)
              setShowSlamModal(true)
              setRenderCounter(prev => prev + 1)
              return // Wait for modal decision
            } else {
              // AI attacker - use 0/50/100 rule
              handleAISlamDecision(attackerInstance, defenderInstance, validSlamTiles)
              // Clear state and continue
              setSelectedBoardCreature(null)
              setValidMoveTiles([])
              setValidAttackTargets([])
              setPendingAttack(null)
              setRenderCounter(prev => prev + 1)
              setProcessingAIAction(false)
              return
            }
          }
        }
      }

      // Check for RANGED SPLASH DAMAGE (ACID BREATH / EXPLOSIVE BOLTS)
      // Only triggers on ranged attacks, and splash happens AFTER main attack resolves
      if (result.pendingRangedSplash && targetInfo.attackType === 'ranged') {
        const defenderPosition = defenderInstance.position
        const hasSplash = checkAndProcessRangedSplash(attackerInstance, defenderPosition, () => {
          // Callback when splash processing completes
          setSelectedBoardCreature(null)
          setValidMoveTiles([])
          setValidAttackTargets([])
          setPendingAttack(null)
          setRenderCounter(prev => prev + 1)
          setProcessingAIAction(false)
        })
        if (hasSplash) {
          // Splash is being processed - don't clear state yet
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
      const result = gameState.applyImmediateCardDefense(defense.card, defense.creature, defense.discardCard)
      if (result.success) {
        damageAfterDefense = Math.max(0, 20 - result.damagePrevented)

        // Handle opponent draws (Recoil) - defender chooses which opponent receives card
        if (result.opponentDrawsCards > 0) {
          const cardName = result.cardUsed?.name || defense.card.name
          handleOpponentDrawEffect(result.opponentDrawsCards, cardName, targetInstance.owner, attackerInstance.owner)
        }

        // Handle opponent morale loss (Unexpected Resistance)
        if (defense.moraleTarget && defense.card.opponentMoraleLoss > 0) {
          const cardName = result.cardUsed?.name || defense.card.name
          handleMoraleLossEffect(defense.moraleTarget, cardName, targetInstance.owner, attackerInstance.owner, defense.card.opponentMoraleLoss)
        }
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
        // RIDER ability notification
        if (result.riderTriggered) {
          message += ` 🐴 RIDER ability may trigger!`
        }
        // UNTAP ON KILL ability notification
        if (result.untapOnKillTriggered && result.untapOnKillData) {
          message += ` ⚔️ ${result.untapOnKillData.bugbearName} UNTAPS from adjacent kill!`
        }
      } else {
        message += ` ${defenderInstance.creature.name} has ${result.remainingHP || defenderInstance.currentHP} HP remaining.`
      }

      // LIFE DRAIN toast notification
      if (result.lifeDrain?.triggered) {
        addToast(`🧛 LIFE DRAIN: ${result.lifeDrain.creatureName} healed ${result.lifeDrain.healAmount} HP! (${result.lifeDrain.currentHP}/${result.lifeDrain.maxHP})`)
      }

      // UNTAP ON KILL toast notification (separate toast for visibility)
      if (result.untapOnKillTriggered && result.untapOnKillData) {
        addToast(`⚔️ UNTAP ON KILL: ${result.untapOnKillData.bugbearName} untaps and can act again!`)
      }

      addToast(message)

      // Check for game over
      gameState.checkGameOver()

      // RIDER ability check - must be processed BEFORE other follow-up attacks
      // Supports both Curse of Undeath (Skeleton) and Tyranny of Goblins (Goblin/Wolf)
      if (result.riderTriggered && result.riderData) {
        const { position, ownerPlayerId, creatureLevel, creatureName, faction } = result.riderData
        const eligibleCreatures = gameState.getEligibleRiderCreatures(ownerPlayerId, 3, faction)

        if (eligibleCreatures.length > 0) {
          // Check if the RIDER owner is a human player (not AI)
          // Use isPlayerHuman() to properly handle hotseat games with multiple human players
          const riderOwnerIsHuman = isPlayerHuman(ownerPlayerId)

          if (riderOwnerIsHuman) {
            // Show modal for human player to select creature
            setRiderData({
              destroyedCreature: creatureName,
              creatureLevel: creatureLevel,
              faction: faction,
              position: position,
              ownerPlayerId: ownerPlayerId,
              eligibleCreatures: eligibleCreatures
            })
            setShowRiderModal(true)
            // Store callback to continue combat flow after modal
            setPendingRiderCallback(() => () => {
              setRenderCounter(prev => prev + 1)
            })
            return // Wait for modal selection
          } else {
            // AI handles RIDER
            handleAIRiderDecision(ownerPlayerId, eligibleCreatures, position, creatureLevel, creatureName, faction, null)
          }
        }
      }

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

        // Check for SLAM trigger after reactions (Earth Guardian - melee attacks only)
        // SLAM triggers if: damage dealt > 0, target NOT destroyed, attacker has SLAM, melee attack
        if (targetInfo.attackType === 'melee' &&
            result.damage > 0 &&
            !result.destroyed &&
            defenderInstance.currentHP > 0 &&
            gameState.hasSlam(attackerInstance)) {
          const validSlamTiles = gameState.getValidSlamTiles(defenderInstance, 3)

          if (validSlamTiles.length > 0) {
            const isAttackerHuman = isPlayerHuman(attackerInstance.owner)

            if (isAttackerHuman) {
              // Human attacker - show SLAM decision modal
              setSlamPending({ attackerInstance, targetInstance: defenderInstance })
              setSlamValidTiles(validSlamTiles)
              setShowSlamModal(true)
              setRenderCounter(prev => prev + 1)
              return // Wait for modal decision
            } else {
              // AI attacker - use 0/50/100 rule
              handleAISlamDecision(attackerInstance, defenderInstance, validSlamTiles)
              // Clear state and continue
              setSelectedBoardCreature(null)
              setValidMoveTiles([])
              setValidAttackTargets([])
              setPendingAttack(null)
              setRenderCounter(prev => prev + 1)
              setProcessingAIAction(false)
              return
            }
          }
        }
      }

      // Check for RANGED SPLASH DAMAGE (ACID BREATH / EXPLOSIVE BOLTS)
      // Only triggers on ranged attacks, and splash happens AFTER main attack resolves
      if (result.pendingRangedSplash && targetInfo.attackType === 'ranged') {
        const defenderPosition = defenderInstance.position
        const hasSplash = checkAndProcessRangedSplash(attackerInstance, defenderPosition, () => {
          // Callback when splash processing completes
          setSelectedBoardCreature(null)
          setValidMoveTiles([])
          setValidAttackTargets([])
          setPendingAttack(null)
          setRenderCounter(prev => prev + 1)
          setProcessingAIAction(false)
        })
        if (hasSplash) {
          // Splash is being processed - don't clear state yet
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
   * Execute counter-attack from IMMEDIATE defense cards (Riposte, Seize the Opportunity, Corrosive Blood)
   * Counter-attacks deal fixed damage that cannot be prevented
   * @param {Object} counterAttack - { damage, targetType, requiresAdjacent, defenderInstance }
   * @param {CreatureInstance} attackerInstance - The creature that attacked (for Riposte targeting)
   * @param {CreatureInstance|null} selectedTarget - Pre-selected target for Seize the Opportunity
   * @returns {Object} { executed, results: [{ target, damage, killed }], reason? }
   */
  const executeCounterAttack = (counterAttack, attackerInstance, selectedTarget = null) => {
    const { damage, targetType, requiresAdjacent, defenderInstance } = counterAttack
    const targets = []
    let reason = null

    if (targetType === 'attacker') {
      // Riposte: Target must be the attacker, must be adjacent
      if (requiresAdjacent && !gameState.isAttackerAdjacent(defenderInstance, attackerInstance)) {
        return { executed: false, reason: 'attacker_not_adjacent', message: 'Attacker is not adjacent - counter-attack skipped' }
      }
      targets.push(attackerInstance)
    }
    else if (targetType === 'adjacent_tapped') {
      // Seize the Opportunity: Can target ANY adjacent tapped enemy
      if (selectedTarget) {
        // Target already selected by human player
        targets.push(selectedTarget)
      } else {
        // Need to find valid targets
        const adjacentTapped = gameState.getAdjacentTappedEnemies(defenderInstance)

        // Also check if attacker will be tapped after this attack resolves
        // Attacker must be adjacent AND have moved this turn (attacking completes the tap)
        if (attackerInstance &&
            gameState.isAttackerAdjacent(defenderInstance, attackerInstance) &&
            attackerInstance.hasMovedThisTurn) {
          // Attacker will be tapped - add to valid targets if not already included
          const alreadyIncluded = adjacentTapped.some(c => c.instanceId === attackerInstance.instanceId)
          if (!alreadyIncluded) {
            adjacentTapped.push(attackerInstance)
          }
        }

        if (adjacentTapped.length === 0) {
          return { executed: false, reason: 'no_valid_targets', message: 'No adjacent tapped enemies - counter-attack skipped' }
        }
        if (adjacentTapped.length === 1) {
          // Only one target - auto-select
          targets.push(adjacentTapped[0])
        } else {
          // Multiple targets - return for selection (human) or AI decision
          return { needsTargetSelection: true, validTargets: adjacentTapped, damage }
        }
      }
    }
    else if (targetType === 'all_adjacent_tapped') {
      // Corrosive Blood: Hit ALL adjacent tapped enemies
      const adjacentTapped = gameState.getAdjacentTappedEnemies(defenderInstance)
      if (adjacentTapped.length === 0) {
        return { executed: false, reason: 'no_valid_targets', message: 'No adjacent tapped enemies - counter-attack skipped' }
      }
      targets.push(...adjacentTapped)
    }

    // Apply damage to all targets (no defense allowed - counter-attack damage is unpreventable)
    const results = []
    for (const target of targets) {
      const prevHP = target.currentHP
      target.currentHP -= damage

      const killed = target.currentHP <= 0

      if (killed) {
        // Handle morale changes for death
        const targetPlayer = gameState.players[target.owner]
        const counterAttackerPlayer = gameState.players[defenderInstance.owner]

        // Attacker (counter-attacker) gains morale equal to killed creature's level
        counterAttackerPlayer.morale += target.creature.level

        // Defender (killed creature's owner) loses morale equal to killed creature's level
        targetPlayer.morale -= target.creature.level

        // Remove from play
        const index = targetPlayer.creaturesInPlay.findIndex(c => c.instanceId === target.instanceId)
        if (index !== -1) {
          targetPlayer.creaturesInPlay.splice(index, 1)
        }

        // Remove from board
        const tile = gameState.getTile(target.position.x, target.position.y)
        if (tile && tile.occupant === target) {
          tile.occupant = null
        }
      }

      results.push({
        target,
        targetName: target.creature.name,
        damage,
        prevHP,
        remainingHP: Math.max(0, target.currentHP),
        killed
      })
    }

    return { executed: true, results }
  }

  /**
   * Handle counter-attack target selection from modal (Seize the Opportunity)
   * Called when human player selects a target from the CounterAttackTargetModal
   * @param {CreatureInstance} selectedTarget - The target creature selected by player
   */
  const handleCounterAttackTargetSelected = (selectedTarget) => {
    if (!counterAttackPending) return

    const { damage, defenderInstance, attackerInstance, pendingDefenseResult } = counterAttackPending

    // Execute counter-attack with selected target
    const counterResult = executeCounterAttack(
      { damage, targetType: 'adjacent_tapped', defenderInstance },
      attackerInstance,
      selectedTarget
    )

    // Close modal and clear pending state
    setShowCounterAttackTargetModal(false)
    setCounterAttackPending(null)

    if (counterResult.executed) {
      // Show toast for the hit
      for (const hit of counterResult.results) {
        if (hit.killed) {
          addToast(`⚔️ COUNTER-ATTACK: ${defenderInstance.creature.name} killed ${hit.targetName} with ${hit.damage} damage!`)
        } else {
          addToast(`⚔️ COUNTER-ATTACK: ${defenderInstance.creature.name} dealt ${hit.damage} damage to ${hit.targetName} (${hit.remainingHP} HP remaining)`)
        }
      }
    }

    // Continue with attack execution
    executeAttackAfterDefense({
      ...pendingDefenseResult,
      counterAttackResults: counterResult.executed ? counterResult.results : null
    })
  }

  /**
   * Handle counter-attack modal cancel (skip counter-attack)
   * Player chose not to counter-attack even though targets were available
   */
  const handleCounterAttackSkipped = () => {
    if (!counterAttackPending) return

    const { pendingDefenseResult } = counterAttackPending

    // Close modal and clear pending state
    setShowCounterAttackTargetModal(false)
    setCounterAttackPending(null)

    // Continue with attack execution without counter-attack
    executeAttackAfterDefense(pendingDefenseResult)
  }

  /**
   * Execute Patch Up proactive heal
   * Heals the creature, consumes action (like STANDARD), discards card
   * Does NOT tap - creature can still move after healing if it hasn't moved yet
   */
  const executePatchUpHeal = () => {
    if (!patchUpHealConfig?.card || !patchUpHealConfig?.creature) return

    const { card, cardIndex, creature, healAmount } = patchUpHealConfig
    const player = gameState.getCurrentPlayerState()

    // Calculate actual healing
    const actualHeal = Math.min(healAmount, creature.damageTokens || 0)

    // Heal the creature
    creature.heal(actualHeal)

    // Consume creature's action (mark as having attacked - like STANDARD action)
    // This uses hasAttackedThisTurn so that moveCreature() will tap after movement
    // (gameState.moveCreature checks hasAttackedThisTurn to decide if it should tap)
    creature.hasAttackedThisTurn = true

    // NOTE: Do NOT call creature.tap() here!
    // Tapping only happens after both moving AND acting
    // Proactive heal only consumes the action, not the movement

    // Discard the card from hand
    const handCardIndex = player.orderHand.findIndex(c => c.id === card.id)
    if (handCardIndex !== -1) {
      player.orderHand.splice(handCardIndex, 1)
    }

    // Toast notification
    addToast(`${creature.creature.name} used Patch Up to heal ${actualHeal} damage`)

    // Close modal and clear state
    setShowPatchUpHealModal(false)
    setPatchUpHealConfig({ card: null, creature: null, healAmount: 0 })

    // Force re-render
    setRenderCounter(prev => prev + 1)
  }

  /**
   * Cancel Patch Up proactive heal
   */
  const cancelPatchUpHeal = () => {
    setShowPatchUpHealModal(false)
    setPatchUpHealConfig({ card: null, creature: null, healAmount: 0 })
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
    const flashingBladesDamage = 10

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(defenderInstance, flashingBladesDamage, attackerInstance.owner)
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, flashingBladesDamage, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(`👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${flashingBladesDamage} FLASHING BLADES damage! Ability used until next Undead Refresh.`)
        }

        // Tap attacker if they moved
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        // Clear pending attack and combat panel
        setPendingAttack(null)
        closeCombatPanel()
        setFlashingBladesPending(null)
        setFlashingBladesTargetMode(false)
        setRenderCounter(prev => prev + 1)
        return
      }
    }

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

          // Handle opponent draws (Recoil) - defender chooses which opponent receives card
          if (result.opponentDrawsCards > 0) {
            const cardName = result.cardUsed?.name || defenseDecision.card.name
            handleOpponentDrawEffect(result.opponentDrawsCards, cardName, defenderPlayerId, attackerInstance.owner)
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

  // ============================================
  // CLOUD OF BATS SHIFT HANDLERS
  // ============================================

  /**
   * User chose YES to shift after Cloud of Bats - enter shift selection mode
   */
  const handleShiftDecisionYes = () => {
    if (!pendingShiftAfterDefense) return

    const { creature, maxShift } = pendingShiftAfterDefense

    // Calculate valid shift tiles for this creature
    const validTiles = gameState.getValidShiftTiles
      ? gameState.getValidShiftTiles(creature, maxShift)
      : []

    if (validTiles.length === 0) {
      // No valid tiles - skip shift, just tap and continue
      addToast('No valid tiles to shift to.')
      handleShiftDecisionNo()
      return
    }

    // Close decision modal and enter shift selection mode
    setShowShiftDecisionModal(false)
    setShiftValidTiles(validTiles)
    setShiftSelectionMode(true)
  }

  /**
   * User chose NO to shift (or no valid tiles) - tap creature and continue attack
   */
  const handleShiftDecisionNo = () => {
    if (!pendingShiftAfterDefense) return

    const { creature, pendingAttackInfo } = pendingShiftAfterDefense

    // Tap the creature (was deferred from applyImmediateCardDefense)
    creature.tap()

    // Close modal and clear state
    setShowShiftDecisionModal(false)
    setPendingShiftAfterDefense(null)
    setShiftSelectionMode(false)
    setShiftValidTiles([])

    // Continue with attack execution
    if (pendingAttackInfo) {
      executeAttackAfterDefense({
        type: 'immediate_card',
        damageReduction: pendingAttackInfo.newAccumulatedReduction,
        moraleCost: 0,
        cardUsed: pendingAttackInfo.cardUsed,
        creatureTapped: pendingAttackInfo.creatureTapped,
        moraleGain: pendingAttackInfo.moraleGain || 0,
        untapAfterUse: pendingAttackInfo.untapAfterUse || false,
        success: true
      })
    }

    setRenderCounter(prev => prev + 1)
  }

  /**
   * User selected a tile for Cloud of Bats shift - show confirmation
   */
  const handleShiftTileSelected = (tile) => {
    if (!pendingShiftAfterDefense || !shiftSelectionMode) return

    // Verify tile is valid
    const isValid = shiftValidTiles.some(t => t.x === tile.x && t.y === tile.y)
    if (!isValid) return

    // Show move confirmation modal
    // Use same structure as normal movement (destination, cost) for modal compatibility
    setPendingMove({
      creature: pendingShiftAfterDefense.creature,
      destination: tile,
      cost: 0, // Shift is free
      isShiftAfterDefense: true
    })
    setShowMoveConfirm(true)
  }

  /**
   * User confirmed shift destination - execute shift
   */
  const handleShiftConfirm = () => {
    if (!pendingShiftAfterDefense || !pendingMove) return

    const { creature, pendingAttackInfo } = pendingShiftAfterDefense
    const { destination } = pendingMove

    // Execute the shift (move creature to new position)
    const fromTile = gameState.getTile(creature.position.x, creature.position.y)
    const targetTile = gameState.getTile(destination.x, destination.y)

    if (fromTile && targetTile) {
      fromTile.occupant = null
      targetTile.occupant = creature
      creature.position = { x: destination.x, y: destination.y }
    }

    // Tap the creature (was deferred from applyImmediateCardDefense)
    creature.tap()

    // Show toast
    addToast(`🦇 ${creature.creature.name} shifted to (${destination.x}, ${destination.y})!`)

    // Clear all shift state
    setShowMoveConfirm(false)
    setPendingMove(null)
    setPendingShiftAfterDefense(null)
    setShiftSelectionMode(false)
    setShiftValidTiles([])

    // Continue with attack execution
    if (pendingAttackInfo) {
      executeAttackAfterDefense({
        type: 'immediate_card',
        damageReduction: pendingAttackInfo.newAccumulatedReduction,
        moraleCost: 0,
        cardUsed: pendingAttackInfo.cardUsed,
        creatureTapped: pendingAttackInfo.creatureTapped,
        moraleGain: pendingAttackInfo.moraleGain || 0,
        untapAfterUse: pendingAttackInfo.untapAfterUse || false,
        success: true
      })
    }

    setRenderCounter(prev => prev + 1)
  }

  /**
   * User cancelled shift destination selection - back to tile selection
   */
  const handleShiftCancel = () => {
    setShowMoveConfirm(false)
    setPendingMove(null)
    // Stay in shift selection mode - user can pick another tile
  }

  /**
   * Handle deployment confirmation - user confirmed deployment from modal
   * Creates the creature instance and places it on the board
   * Big O: O(1) - constant time operations
   */
  const handleDeployConfirm = () => {
    if (!pendingDeployment) return

    const { creature, tile, creatureIndex, isFromGraveyard, source,
            isOrcScoutDeploy, isShadowStalkerDeploy, isSummonSpiderDeploy, isLichNecromancerDeploy, isOrcDruidDeploy, isInStartingZone } = pendingDeployment

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
    } else if (isOrcDruidDeploy && !isInStartingZone) {
      addToast(`ORC DRUID: ${creature.name} deployed adjacent to Orc Druid at (${tile.x}, ${tile.y})! Protected until your next turn!`)
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

    // Check for CHIEFTAIN CALL ability trigger (Orc Chieftain deployed)
    if (gameState.shouldTriggerChieftainCall(creatureInstance)) {
      const eligibleOrcs = gameState.getEligibleOrcsForChieftainCall(gameState.currentPlayer)
      // Always show modal (even if no eligible orcs - shows acknowledgement)
      setChieftainCallPending({
        chieftainInstance: creatureInstance,
        eligibleOrcs,
        playerId: gameState.currentPlayer
      })
      setShowChieftainCallModal(true)
    }

    // Check for OGRE DEPLOY MORALE ability trigger (Ogre deployed - gain 1 morale)
    if (gameState.shouldTriggerOgreDeployMorale(creatureInstance)) {
      const player = gameState.players[gameState.currentPlayer]
      const oldMorale = player.morale
      player.gainMorale(1)

      // Show toast notification (logged)
      addToast(`${creatureInstance.creature.name} deployed! Gained 1 MORALE (${oldMorale} → ${player.morale})`, 'success')

      // Show informational modal for human player
      setOgreDeployMoraleResult({
        creatureInstance,
        oldMorale,
        newMorale: player.morale,
        playerId: gameState.currentPlayer
      })
      setShowOgreDeployMoraleModal(true)
    }

    // Check for ORC CLERIC DEPLOY DRAW ORDER ability trigger (draw 1 Order card)
    if (gameState.shouldTriggerClericDeployDrawOrder(creatureInstance)) {
      const player = gameState.players[gameState.currentPlayer]

      // Draw a card from the Order deck if available
      if (player.orderDeck && player.orderDeck.length > 0) {
        const drawnCard = player.orderDeck.shift() // Remove from top of deck
        player.orderHand.push(drawnCard) // Add to hand

        // Show toast notification (logged)
        addToast(`${creatureInstance.creature.name} deployed! Drew 1 Order card`, 'info')

        // Show modal for human player showing the drawn card
        setClericDrawOrderResult({
          creatureInstance,
          drawnCard,
          playerId: gameState.currentPlayer
        })
        setShowClericDrawOrderModal(true)
      }
    }

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
   * Handle CHIEFTAIN CALL ability - player selected an Orc to deploy
   * @param {Object} selectedCreature - The Orc creature card selected from hand
   */
  const handleChieftainCallDeploy = (selectedCreature) => {
    if (!chieftainCallPending) return

    const { playerId } = chieftainCallPending
    const currentPlayer = gameState.players[playerId]

    // Get valid deployment tiles (starting zone)
    // startingZoneTiles is array of {x, y} coords - need to look up actual tiles
    const startingZoneCoords = gameState.players[playerId].startingZoneTiles
    const validTiles = startingZoneCoords
      .map(coord => gameState.getTile(coord.x, coord.y))
      .filter(tile => tile && !tile.occupant)

    if (validTiles.length === 0) {
      addToast('No valid deployment squares available!')
      setShowChieftainCallModal(false)
      setChieftainCallPending(null)
      return
    }

    // Deploy to first available starting zone tile
    const deployTile = validTiles[0]
    const deployPosition = { x: deployTile.x, y: deployTile.y }

    // Execute the ability
    const result = gameState.executeChieftainCall(playerId, selectedCreature, deployPosition)

    if (result.success) {
      addToast(`CHIEFTAIN CALL: Gained ${result.leadershipGained} Leadership and deployed ${selectedCreature.name} to (${deployPosition.x}, ${deployPosition.y})!`)
    } else {
      addToast(`CHIEFTAIN CALL failed: ${result.message}`)
    }

    // Clear modal state
    setShowChieftainCallModal(false)
    setChieftainCallPending(null)

    // Force re-render
    setRenderCounter(prev => prev + 1)
  }

  /**
   * Handle CHIEFTAIN CALL ability declined - player chose not to use it
   */
  const handleChieftainCallDecline = () => {
    setShowChieftainCallModal(false)
    setChieftainCallPending(null)
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
    const hiddenBladeDamage = 10

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(defenderInstance, hiddenBladeDamage, attackerInstance.owner)
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, hiddenBladeDamage, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(`👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${hiddenBladeDamage} HIDDEN BLADE damage! Ability used until next Undead Refresh.`)
        }

        // Clear pending attack and combat panel
        setPendingAttack(null)
        closeCombatPanel()
        setHiddenBladePending(null)
        setHiddenBladeTargetMode(false)
        setRenderCounter(prev => prev + 1)
        return
      }
    }

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

          // Handle opponent draws (Recoil) - defender chooses which opponent receives card
          if (result.opponentDrawsCards > 0) {
            const cardName = result.cardUsed?.name || defenseDecision.card.name
            handleOpponentDrawEffect(result.opponentDrawsCards, cardName, defenderPlayerId, attackerInstance.owner)
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

  // Handler when player declines CONFUSION GAZE - initiate normal attack
  const handleConfusionGazeDecline = () => {
    if (!confusionGazePending) {
      setShowConfusionGazeModal(false)
      return
    }

    const { attacker, target } = confusionGazePending

    setShowConfusionGazeModal(false)
    setConfusionGazePending(null)

    // Check if the target is in melee or ranged range for a normal attack
    const validAttackTargets = gameState.getValidAttackTargets(attacker)
    const targetInfo = validAttackTargets.find(t => t.creature.instanceId === target.instanceId)

    if (targetInfo) {
      // Valid normal attack - show attack confirmation panel using pendingRightClickAttack (same as normal right-click attack)
      const attackInfo = {
        attackType: targetInfo.attackType,
        damage: targetInfo.attackType === 'melee'
          ? attacker.creature.meleeAttack?.damage || 0
          : attacker.creature.rangedAttack?.damage || 0
      }
      setPendingRightClickAttack({
        attacker: attacker,
        target: target,
        attackInfo: attackInfo
      })
      setCombatPanelMode('attack')
      setCombatHighlightCreatures({
        attacker: attacker.instanceId,
        defender: target.instanceId
      })
    } else {
      addToast('Target is not in range for a normal attack')
    }
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

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(defenderInstance, damage, attackerInstance.owner)
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, damage, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(`👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${damage} CONFUSION GAZE damage! Ability used until next Undead Refresh.`)
        }

        // Mark attacker as attacked and tap if moved
        attackerInstance.hasAttackedThisTurn = true
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        // Clear pending attack and combat panel
        setPendingAttack(null)
        closeCombatPanel()
        setConfusionGazeMode(null)
        setConfusionGazePending(null)
        setRenderCounter(prev => prev + 1)
        return
      }
    }

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

          // Handle opponent draws (Recoil) - defender chooses which opponent receives card
          if (result.opponentDrawsCards > 0) {
            const cardName = result.cardUsed?.name || defenseDecision.card.name
            handleOpponentDrawEffect(result.opponentDrawsCards, cardName, defenderPlayerId, attackerInstance.owner)
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

  // ============================================================================
  // SLAM ability handlers (Earth Guardian - slide enemy after melee damage)
  // ============================================================================

  // Skip SLAM - decline and tap attacker
  const handleSlamSkip = () => {
    if (!slamPending) return
    const { attackerInstance } = slamPending

    // Clear SLAM state
    setShowSlamModal(false)
    setSlamMode(false)
    setSlamPending(null)
    setSlamValidTiles([])

    // Tap the attacker (consume action)
    attackerInstance.tap()
    setRenderCounter(prev => prev + 1)
    addToast(`${attackerInstance.creature.name} chose not to slam.`)
  }

  // Accept SLAM - enter tile selection mode
  const handleSlamAccept = () => {
    if (!slamPending) return

    setShowSlamModal(false)
    setSlamMode(true)
    addToast(`Right-click a highlighted tile to slam ${slamPending.targetInstance.creature.name}`)
    setRenderCounter(prev => prev + 1) // Force re-render to show tile highlights
  }

  // Right-click on valid SLAM tile - show confirmation
  const handleSlamTileSelect = (x, y) => {
    if (!slamMode || !slamPending) return

    // Verify tile is valid
    const isValid = slamValidTiles.some(t => t.x === x && t.y === y)
    if (!isValid) return

    setSlamSelectedTile({ x, y })
    setShowSlamConfirmModal(true)
  }

  // Cancel confirmation - allow picking different tile
  const handleSlamConfirmCancel = () => {
    setShowSlamConfirmModal(false)
    setSlamSelectedTile(null)
    // Stay in slamMode so user can pick different tile
  }

  // Confirm - execute the slam
  const handleSlamConfirmExecute = () => {
    if (!slamPending || !slamSelectedTile) return

    const { attackerInstance, targetInstance } = slamPending

    // Execute the slam
    const result = gameState.executeSlamSlide(targetInstance, slamSelectedTile)

    // Clear SLAM state
    setShowSlamConfirmModal(false)
    setSlamMode(false)
    setSlamPending(null)
    setSlamValidTiles([])
    setSlamSelectedTile(null)

    // Tap the attacker (consume action)
    attackerInstance.tap()

    addToast(`SLAM: ${targetInstance.creature.name} was slammed to (${slamSelectedTile.x}, ${slamSelectedTile.y})!`)
    setRenderCounter(prev => prev + 1)
  }

  // AI decides whether to use SLAM (0/50/100 rule)
  const handleAISlamDecision = (attackerInstance, targetInstance, validTiles) => {
    const attackerOwner = attackerInstance.owner
    const playerNum = attackerOwner.replace('PLAYER', '')
    const playerKey = `player${playerNum}`
    const difficulty = gameConfig?.[playerKey]?.difficulty || 'medium'

    let willSlam = false
    if (difficulty === 'hard') {
      willSlam = true // Hard AI always slams (100%)
    } else if (difficulty === 'medium') {
      willSlam = Math.random() < 0.5 // Medium AI slams 50%
    }
    // Easy AI never slams (0%)

    if (!willSlam) {
      // AI declines - tap attacker
      attackerInstance.tap()
      setRenderCounter(prev => prev + 1)
      return
    }

    // AI picks random valid tile
    const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)]

    // Execute slam
    gameState.executeSlamSlide(targetInstance, randomTile)

    // Tap attacker
    attackerInstance.tap()

    // Show notification (toast + modal like AI kill notification)
    addToast(`SLAM: ${attackerInstance.creature.name} slammed ${targetInstance.creature.name}!`)

    // Queue AI action modal
    setAiDeathQueue(prev => [...prev, {
      title: 'SLAM!',
      message: `${attackerInstance.creature.name} used SLAM to push ${targetInstance.creature.name} to a new position!`,
      creatureName: attackerInstance.creature.name,
      isSlam: true
    }])

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

  /**
   * Handle right-click on order card - enters targeting mode for targeted cards like Web
   * @param {Object} card - The order card data
   * @param {number} cardIndex - Index in the order hand
   */
  const handleOrderCardRightClick = (card, cardIndex) => {
    if (!gameState) {
      return
    }

    // Must have a creature selected to use order cards
    if (!orderCardFilterCreature) {
      addToast('Select a creature first to use this order card')
      return
    }

    // Check if this is a Web card - use special Web validation
    const isWebCard = card.name.toUpperCase().includes('WEB')

    if (isWebCard) {
      // WEB CARD: Use gameState.canUseWebCard for validation (includes SPIDER AFFINITY)
      const canUse = gameState.canUseWebCard(orderCardFilterCreature, card)

      if (!canUse) {
        // Check specific failure reason for better toast message
        if (card.level > orderCardFilterCreature.creature.level) {
          addToast(`${orderCardFilterCreature.creature.name} (Level ${orderCardFilterCreature.creature.level}) cannot use Level ${card.level} cards`)
        } else {
          // Check if spider type (has SPIDER AFFINITY)
          const isSpider = (orderCardFilterCreature.creature.type || []).some(t => t.toLowerCase() === 'spider')
          if (!isSpider) {
            addToast(`${orderCardFilterCreature.creature.name} needs INT ability or be a Spider to use Web`)
          } else {
            addToast(`${orderCardFilterCreature.creature.name} cannot use Web`)
          }
        }
        return
      }

      // Get valid Web targets (enemies within range with LOS, not through forests, not already webbed)
      const validTargets = gameState.getWebValidTargets(orderCardFilterCreature, card)

      if (validTargets.length === 0) {
        addToast('No valid targets in range for Web (10 squares, LOS required, not through forests)')
        return
      }

      // Enter targeting mode
      setSelectedOrderCard({ card, cardIndex })
      setOrderCardTargetingMode(true)
      setOrderCardValidTargets(validTargets)
      addToast(`🕸️ WEB targeting: Right-click on a highlighted enemy (${validTargets.length} targets)`)
      return
    }

    // PATCH UP PROACTIVE HEAL: Check if this is a card that can heal proactively
    if (card.canHealProactively && card.healAmount > 0) {
      // Check if creature has damage to heal
      const creature = orderCardFilterCreature
      if (!creature.damageTokens || creature.damageTokens === 0) {
        addToast(`${creature.creature.name} has no damage to heal`)
        return
      }

      // Check level requirement
      if (card.level > creature.creature.level) {
        addToast(`${creature.creature.name} (Level ${creature.creature.level}) cannot use Level ${card.level} cards`)
        return
      }

      // Check ability requirement
      if (card.abilityRequired && card.abilityRequired !== 'ANY') {
        const abilities = Array.isArray(card.abilityRequired) ? card.abilityRequired : [card.abilityRequired]
        const hasRequiredAbility = abilities.some(ability =>
          creature.creature.abilities?.[ability] === true
        )
        if (!hasRequiredAbility) {
          addToast(`${creature.creature.name} doesn't have required ability: ${abilities.join(' or ')}`)
          return
        }
      }

      // Check if creature has already attacked/acted (proactive heal consumes action like STANDARD)
      if (creature.hasAttackedThisTurn) {
        addToast(`${creature.creature.name} has already acted this turn`)
        return
      }

      // Show Patch Up heal modal
      setPatchUpHealConfig({
        card,
        cardIndex,
        creature,
        healAmount: card.healAmount
      })
      setShowPatchUpHealModal(true)
      return
    }

    // GENERIC ORDER CARDS: Standard validation
    // Check level requirement: card level <= creature level
    if (card.level > orderCardFilterCreature.creature.level) {
      addToast(`${orderCardFilterCreature.creature.name} (Level ${orderCardFilterCreature.creature.level}) cannot use Level ${card.level} cards`)
      return
    }

    // Check ability requirement
    if (card.abilityRequired && card.abilityRequired !== 'ANY') {
      const abilities = Array.isArray(card.abilityRequired) ? card.abilityRequired : [card.abilityRequired]
      const hasRequiredAbility = abilities.some(ability =>
        orderCardFilterCreature.creature.abilities?.[ability] === true
      )
      if (!hasRequiredAbility) {
        addToast(`${orderCardFilterCreature.creature.name} doesn't have required ability: ${abilities.join(' or ')}`)
        return
      }
    }

    // Enter targeting mode for generic order cards
    setSelectedOrderCard({ card, cardIndex })
    setOrderCardTargetingMode(true)
    // Set all enemy creatures as valid targets (generic targeting for non-Web cards)
    const validTargets = []
    for (const playerId of gameState.activePlayers) {
      if (playerId === gameState.currentPlayer) continue
      const player = gameState.players[playerId]
      for (const enemy of player.creaturesInPlay) {
        if (enemy.position) {
          validTargets.push(enemy)
        }
      }
    }
    setOrderCardValidTargets(validTargets)
    addToast(`Targeting mode: Right-click on an enemy to apply ${card.name}`)
  }

  /**
   * Cancel order card targeting mode
   */
  const cancelOrderCardTargeting = () => {
    setSelectedOrderCard(null)
    setOrderCardTargetingMode(false)
    setOrderCardValidTargets([])
  }

  /**
   * Clear order card filter (toggle to show all cards)
   */
  const clearOrderCardFilter = () => {
    setOrderCardFilterCreature(null)
  }

  /**
   * Handle Web Removal Modal - Keep Web
   * Closes the modal and allows creature to attack (but not move)
   */
  const handleKeepWeb = () => {
    if (webRemovalCreature) {
      // Select the creature so player can attack with it
      handleCreatureSelect(webRemovalCreature)
    }
    setShowWebRemovalModal(false)
    setWebRemovalCreature(null)
  }

  /**
   * Handle Web Removal Modal - Remove Web
   * Removes the web from creature, consumes standard action (but can still move)
   */
  const handleRemoveWeb = () => {
    if (!webRemovalCreature || !gameState) {
      setShowWebRemovalModal(false)
      setWebRemovalCreature(null)
      return
    }

    // Check if creature has already used its standard action (attacked)
    if (webRemovalCreature.hasAttackedThisTurn) {
      addToast(`${webRemovalCreature.creature.name} has already used its action and cannot remove the web!`)
      setShowWebRemovalModal(false)
      setWebRemovalCreature(null)
      return
    }

    // Remove the web
    const result = gameState.removeWeb(webRemovalCreature)

    if (result.success) {
      // Consume standard action (but creature can still move!)
      webRemovalCreature.hasAttackedThisTurn = true
      addToast(`🕸️ Web removed from ${webRemovalCreature.creature.name} (action used, can still move)`)
      // Clear selection so player can re-select to move
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
    } else {
      addToast(`Failed to remove web: ${result.reason}`)
    }

    setShowWebRemovalModal(false)
    setWebRemovalCreature(null)
  }

  // ============================================
  // HEALING TOUCH MODAL HANDLERS
  // Handle Dwarf Cleric's healing ability
  // ============================================

  /**
   * Handle Healing Touch Modal - Heal
   * Heals 10 damage to the target creature
   */
  const handleHealingTouchHeal = () => {
    if (!healingTouchHealer || !healingTouchTarget || !gameState) {
      setShowHealingTouchModal(false)
      setHealingTouchHealer(null)
      setHealingTouchTarget(null)
      return
    }

    const result = gameState.executeHealingTouch(healingTouchHealer, healingTouchTarget, 'heal')

    if (result.success) {
      const isSelf = healingTouchHealer.instanceId === healingTouchTarget.instanceId
      addToast(`💚 HEALING TOUCH: ${healingTouchHealer.creature.name} healed ${isSelf ? 'itself' : healingTouchTarget.creature.name}! ${result.message}`)
      // Clear selection so player can see the updated state
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter(prev => prev + 1)
    } else {
      addToast(`Healing Touch failed: ${result.message}`)
    }

    setShowHealingTouchModal(false)
    setHealingTouchHealer(null)
    setHealingTouchTarget(null)
  }

  /**
   * Handle Healing Touch Modal - Remove Card
   * Removes an attached Order card from the target creature
   * @param {number} cardIndex - Index of the attached card to remove
   */
  const handleHealingTouchRemoveCard = (cardIndex) => {
    if (!healingTouchHealer || !healingTouchTarget || !gameState) {
      setShowHealingTouchModal(false)
      setHealingTouchHealer(null)
      setHealingTouchTarget(null)
      return
    }

    const result = gameState.executeHealingTouch(healingTouchHealer, healingTouchTarget, 'removeCard', cardIndex)

    if (result.success) {
      const isSelf = healingTouchHealer.instanceId === healingTouchTarget.instanceId
      addToast(`💚 HEALING TOUCH: ${healingTouchHealer.creature.name} removed ${result.removedCard?.name || 'card'} from ${isSelf ? 'itself' : healingTouchTarget.creature.name}!`)
      // Clear selection so player can see the updated state
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter(prev => prev + 1)
    } else {
      addToast(`Healing Touch failed: ${result.message}`)
    }

    setShowHealingTouchModal(false)
    setHealingTouchHealer(null)
    setHealingTouchTarget(null)
  }

  /**
   * Handle Healing Touch Modal - Cancel
   * Closes the modal without taking action
   */
  const handleHealingTouchCancel = () => {
    setShowHealingTouchModal(false)
    setHealingTouchHealer(null)
    setHealingTouchTarget(null)
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
      setProcessingAIAction(false)
      return
    }

    // VALIDATION: Skip attack if target is already dead (killed by previous attack in queue)
    if (defenderInstance.isDestroyed() || !defenderInstance.position) {
      setProcessingAIAction(false)
      return
    }

    // VALIDATION: Skip attack if attacker is already dead (e.g., killed by reaction)
    if (attackerInstance.isDestroyed() || !attackerInstance.position) {
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
      setProcessingAIAction(false)
      return
    }
    // ============================================================================
    // END ATTACK RE-VALIDATION
    // ============================================================================

    // Calculate incoming damage for INSUBSTANTIAL check
    const incomingDamageForCheck = targetInfo.attackType === 'melee'
      ? attackerInstance.creature.meleeAttack?.damage || 0
      : attackerInstance.creature.rangedAttack?.damage || 0

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(defenderInstance, incomingDamageForCheck, attackerInstance.owner)
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, incomingDamageForCheck, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(`👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${incomingDamageForCheck} damage! Ability used until next Undead Refresh.`)
        }

        // Attack is blocked - tap attacker if they moved and mark as attacked
        attackerInstance.hasAttackedThisTurn = true
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        // Clear AI processing state
        setProcessingAIAction(false)
        setRenderCounter(prev => prev + 1)
        return
      }
    }

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

          // Handle opponent draws (Recoil) - defender chooses which opponent receives card
          if (result.opponentDrawsCards > 0) {
            const cardName = result.cardUsed?.name || defenseDecision.card.name
            handleOpponentDrawEffect(result.opponentDrawsCards, cardName, defenderInstance.owner, attackerInstance.owner)
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
            if (defenseResult.bonusDrawsQueued > 0) extraEffects += ` Drew ${defenseResult.bonusDrawsQueued} card${defenseResult.bonusDrawsQueued > 1 ? 's' : ''}.`
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
          // UNTAP ON KILL ability notification
          if (result.untapOnKillTriggered && result.untapOnKillData) {
            message += ` ⚔️ ${result.untapOnKillData.bugbearName} UNTAPS from adjacent kill!`
          }

          // Queue AI death modal for visibility
          const abilitiesTriggered = []
          if (result.lifeDrain) {
            abilitiesTriggered.push(`Life Drain: ${attackerInstance.creature.name} heals ${result.lifeDrain.healAmount} HP`)
          }
          if (result.bloodthirsty) {
            abilitiesTriggered.push(`Bloodthirsty: +${result.bloodthirsty.leadershipGained} Leadership`)
          }
          if (result.untapOnKillTriggered && result.untapOnKillData) {
            abilitiesTriggered.push(`Untap on Kill: ${result.untapOnKillData.bugbearName} untaps`)
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

        // UNTAP ON KILL toast notification (separate toast for visibility)
        if (result.untapOnKillTriggered && result.untapOnKillData) {
          addToast(`⚔️ UNTAP ON KILL: ${result.untapOnKillData.bugbearName} untaps and can act again!`)
        }

        addToast(message)

        // Check for game over
        gameState.checkGameOver()

        // RIDER ability check - when AI-defended RIDER creature is destroyed
        // This handles: Human attacks AI's Skeletal Lancer/Goblin Wolf Rider, or AI attacks AI's RIDER creature
        // Supports both Curse of Undeath (Skeleton) and Tyranny of Goblins (Goblin/Wolf)
        if (result.destroyed && result.riderTriggered && result.riderData) {
          const { position, ownerPlayerId, creatureLevel, creatureName, faction } = result.riderData
          const eligibleCreatures = gameState.getEligibleRiderCreatures(ownerPlayerId, 3, faction)

          if (eligibleCreatures.length > 0) {
            // Check if RIDER owner is human or AI
            const isRiderOwnerHuman = isPlayerHuman(ownerPlayerId)

            if (isRiderOwnerHuman) {
              // Human's RIDER creature killed by AI - show modal for human
              setRiderData({
                destroyedCreature: creatureName,
                creatureLevel: creatureLevel,
                faction: faction,
                position: position,
                ownerPlayerId: ownerPlayerId,
                eligibleCreatures: eligibleCreatures
              })
              setShowRiderModal(true)
              setProcessingAIAction(false)
              return // Wait for modal selection before continuing
            } else {
              // AI's RIDER creature killed - AI decides on RIDER
              handleAIRiderDecision(ownerPlayerId, eligibleCreatures, position, creatureLevel, creatureName, faction, () => {
                setProcessingAIAction(false)
              })
              return
            }
          }
        }

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

      // ARCANE PORTAL: Allow dragging War Wizard to any unoccupied Magic Circle tile
      const isArcanePortalValid = gameState.hasArcanePortal &&
                                  gameState.hasArcanePortal(creatureCard) &&
                                  !tile.occupant &&
                                  tile.terrain === 'MAGIC_CIRCLE'

      // LICH NECROMANCER: Allow dragging Undead creatures to tiles adjacent to Lich Necromancer
      let isLichNecromancerValid = false
      if (gameState.isUndeadCreature && gameState.isUndeadCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const lich = gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
        if (lich?.position) {
          const dx = Math.abs(tile.x - lich.position.x)
          const dy = Math.abs(tile.y - lich.position.y)
          isLichNecromancerValid = Math.max(dx, dy) === 1
        }
      }

      // ORC DRUID: Allow dragging Beast/Elemental creatures to tiles adjacent to Orc Druid
      let isOrcDruidValid = false
      if (gameState.isBeastOrElementalCreature && gameState.isBeastOrElementalCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const druid = gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)
        if (druid?.position) {
          const dx = Math.abs(tile.x - druid.position.x)
          const dy = Math.abs(tile.y - druid.position.y)
          isOrcDruidValid = Math.max(dx, dy) === 1
        }
      }

      if ((isInStartingZone || isOrcScoutValid || isShadowStalkerValid || isSummonSpiderValid || isLichNecromancerValid || isOrcDruidValid || isArcanePortalValid) && !tile.occupant) {
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

      // ORC DRUID: Check if deploying Beast/Elemental creature adjacent to Orc Druid
      let isOrcDruidDeploy = false
      if (gameState.isBeastOrElementalCreature && gameState.isBeastOrElementalCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const druid = gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)
        if (druid?.position) {
          const dx = Math.abs(tile.x - druid.position.x)
          const dy = Math.abs(tile.y - druid.position.y)
          isOrcDruidDeploy = Math.max(dx, dy) === 1 // Adjacent only (range 1)
        }
      }

      // ARCANE PORTAL: Check if deploying War Wizard to any unoccupied Magic Circle tile
      const isArcanePortalDeploy = gameState.hasArcanePortal &&
                                   gameState.hasArcanePortal(creatureCard) &&
                                   !tile.occupant &&
                                   tile.terrain === 'MAGIC_CIRCLE'

      if (!isInStartingZone && !isOrcScoutDeploy && !isShadowStalkerDeploy && !isSummonSpiderDeploy && !isLichNecromancerDeploy && !isOrcDruidDeploy && !isArcanePortalDeploy) {
        if (gameState.hasShadowStalker(creatureCard)) {
          addToast('SHADOW STALKER: Deploy to starting zone or any tile adjacent to a mountain!')
        } else if (gameState.isSpiderCreature(creatureCard) && gameState.hasSummonSpider(gameState.currentPlayer)) {
          addToast('SUMMON SPIDER: Deploy to starting zone or within 5 squares of Drow Priestess!')
        } else if (gameState.isUndeadCreature && gameState.isUndeadCreature(creatureCard) && gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(gameState.currentPlayer)) {
          addToast('LICH NECROMANCER: Deploy Undead to starting zone or adjacent to Lich Necromancer!')
        } else if (gameState.isBeastOrElementalCreature && gameState.isBeastOrElementalCreature(creatureCard) && gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)) {
          addToast('ORC DRUID: Deploy Beast/Elemental to starting zone or adjacent to Orc Druid!')
        } else if (gameState.hasArcanePortal && gameState.hasArcanePortal(creatureCard)) {
          addToast('ARCANE PORTAL: Deploy to starting zone or any unoccupied Magic Circle tile!')
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
          isOrcDruidDeploy,
          isArcanePortalDeploy,
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
        } else if (isOrcDruidDeploy && !isInStartingZone) {
          addToast(`ORC DRUID: ${creatureCard.name} deployed adjacent to Orc Druid at (${tile.x}, ${tile.y})! Protected until your next turn!`)
        } else if (isArcanePortalDeploy && !isInStartingZone) {
          addToast(`ARCANE PORTAL: ${creatureCard.name} deployed to Magic Circle at (${tile.x}, ${tile.y})! Protected until your next turn!`)
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
    // CLOUD OF BATS SHIFT SELECTION MODE
    // Handle clicking on tiles to select shift destination
    // ============================================
    if (shiftSelectionMode && pendingShiftAfterDefense) {
      handleShiftTileSelected(tile)
      return // Don't process other right-click actions during shift selection
    }

    // ============================================
    // ORDER CARD TARGETING MODE
    // Handle clicking on creatures to apply order cards (Web, etc.)
    // ============================================
    if (orderCardTargetingMode && selectedOrderCard && orderCardFilterCreature) {
      const target = tile.occupant
      if (target && orderCardValidTargets.some(t => t.instanceId === target.instanceId)) {
        // Valid target - apply the order card
        const card = selectedOrderCard.card
        const caster = orderCardFilterCreature

        // Check if this is a Web card
        if (card.name.toUpperCase().includes('WEB')) {
          // Apply Web using gameState method
          const result = gameState.applyWeb(caster, target, card)
          if (result.success) {
            addToast(`🕸️ WEB: ${caster.creature.name} webbed ${target.creature.name}! Target cannot move.`)
            // Web is a MINOR action - caster doesn't get tapped
            // (MINOR actions don't consume the standard action)
          } else {
            addToast(`Web failed: ${result.reason}`)
          }
        } else {
          // Generic order card application (placeholder for other cards)
          addToast(`Card applied: ${card.name} → ${target.creature.name}!`)
        }

        // Clear targeting mode
        setSelectedOrderCard(null)
        setOrderCardTargetingMode(false)
        setOrderCardValidTargets([])
        setRenderCounter(prev => prev + 1) // Force re-render to show web icon
      } else if (target) {
        addToast('Invalid target for this order card')
      } else {
        addToast('Click on an enemy creature to target')
      }
      return // Don't process normal right-click actions during order card targeting
    }

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

      // ORC DRUID: Check if deploying Beast/Elemental creature adjacent to Orc Druid
      let isOrcDruidDeploy = false
      if (gameState.isBeastOrElementalCreature && gameState.isBeastOrElementalCreature(creatureCard) &&
          !tile.occupant &&
          tile.terrain !== 'MOUNTAIN') {
        const druid = gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)
        if (druid?.position) {
          const dx = Math.abs(tile.x - druid.position.x)
          const dy = Math.abs(tile.y - druid.position.y)
          isOrcDruidDeploy = Math.max(dx, dy) === 1 // Adjacent only (range 1)
        }
      }

      // ARCANE PORTAL: Check if deploying War Wizard to any unoccupied Magic Circle tile
      const isArcanePortalDeploy = gameState.hasArcanePortal &&
                                   gameState.hasArcanePortal(creatureCard) &&
                                   !tile.occupant &&
                                   tile.terrain === 'MAGIC_CIRCLE'

      if (!isInStartingZone && !isOrcScoutDeploy && !isShadowStalkerDeploy && !isSummonSpiderDeploy && !isLichNecromancerDeploy && !isOrcDruidDeploy && !isArcanePortalDeploy) {
        if (gameState.hasShadowStalker(creatureCard)) {
          addToast('SHADOW STALKER: Deploy to starting zone or any tile adjacent to a mountain!')
        } else if (gameState.isSpiderCreature(creatureCard) && gameState.hasSummonSpider(gameState.currentPlayer)) {
          addToast('SUMMON SPIDER: Deploy to starting zone or within 5 squares of Drow Priestess!')
        } else if (gameState.isUndeadCreature && gameState.isUndeadCreature(creatureCard) && gameState.hasLichNecromancerDeploy && gameState.hasLichNecromancerDeploy(gameState.currentPlayer)) {
          addToast('LICH NECROMANCER: Deploy Undead to starting zone or adjacent to Lich Necromancer!')
        } else if (gameState.isBeastOrElementalCreature && gameState.isBeastOrElementalCreature(creatureCard) && gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)) {
          addToast('ORC DRUID: Deploy Beast/Elemental to starting zone or adjacent to Orc Druid!')
        } else if (gameState.hasArcanePortal && gameState.hasArcanePortal(creatureCard)) {
          addToast('ARCANE PORTAL: Deploy to starting zone or any unoccupied Magic Circle tile!')
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
          isOrcDruidDeploy,
          isArcanePortalDeploy,
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
        } else if (isOrcDruidDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(`ORC DRUID: ${creatureCard.name} deployed adjacent to Orc Druid at (${tile.x}, ${tile.y})! Protected until your next turn!`)
        } else if (isArcanePortalDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(`ARCANE PORTAL: ${creatureCard.name} deployed to Magic Circle at (${tile.x}, ${tile.y})! Protected until your next turn!`)
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

    // Handle SLAM tile selection (right-click on valid slam destination)
    if (slamMode && slamValidTiles.length > 0) {
      const isValidSlamTile = slamValidTiles.some(t => t.x === tile.x && t.y === tile.y)
      if (isValidSlamTile) {
        handleSlamTileSelect(tile.x, tile.y)
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

    // ============================================
    // HEALING TOUCH CHECK: Before attack, check if Dwarf Cleric can use HEALING TOUCH
    // This triggers when right-clicking self or an adjacent ally
    // ============================================
    if (tile.occupant &&
        tile.occupant.owner === selectedBoardCreature.owner && // Same owner (self or ally)
        gameState.hasHealingTouch(selectedBoardCreature) &&
        !selectedBoardCreature.hasAttackedThisTurn) {
      // Check if target is valid for HEALING TOUCH
      if (gameState.isValidHealingTouchTarget(selectedBoardCreature, tile.occupant)) {
        // Show Healing Touch modal
        setHealingTouchHealer(selectedBoardCreature)
        setHealingTouchTarget(tile.occupant)
        setShowHealingTouchModal(true)
        return
      }
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
    // Get all valid targets
    const validTargets = gameState.getLightningBreathTargets(attacker)

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
      const newTargets = lightningBreathTargets.filter(t => t.instanceId !== target.instanceId)
      setLightningBreathTargets(newTargets)
      addToast(`Removed ${target.creature.name} from targets (${newTargets.length}/3)`)
      return
    }

    // Check if target is valid
    if (!lightningBreathValidTargets.some(t => t.instanceId === target.instanceId)) {
      addToast(`${target.creature.name} is not a valid target!`)
      return
    }

    // Check if we already have 3 targets
    if (lightningBreathTargets.length >= 3) {
      addToast(`Maximum 3 targets selected! Click "Confirm" to attack.`)
      return
    }

    // Add target
    const newTargets = [...lightningBreathTargets, target]
    setLightningBreathTargets(newTargets)
    addToast(`⚡ Target ${newTargets.length}/3 selected: ${target.creature.name}`)
  }

  /**
   * Confirm Lightning Breath and begin sequential attack resolution
   * Called when player clicks "Confirm" after selecting targets
   */
  const handleLightningBreathConfirm = () => {
    if (!lightningBreathMode || !lightningBreathAttacker || lightningBreathTargets.length < 2) {
      addToast(`Select at least 2 targets for Lightning Breath!`)
      return
    }

    addToast(`⚡ ${lightningBreathAttacker.creature.name} unleashes LIGHTNING BREATH on ${lightningBreathTargets.length} targets!`)

    // Exit target selection mode (but keep targets/attacker for sequential resolution)
    setLightningBreathMode(false)
    setLightningBreathValidTargets([])

    // Start resolving attacks sequentially
    setLightningBreathCurrentAttackIndex(0)

    // Set up the first attack's defense panel
    const firstTarget = lightningBreathTargets[0]
    const damage = gameState.getLightningBreathDamage(lightningBreathAttacker)

    // Check if first target has INSUBSTANTIAL available
    if (gameState.canUseInsubstantial(firstTarget)) {
      const blocked = gameState.useInsubstantial(firstTarget, damage, lightningBreathAttacker.owner)
      if (blocked) {
        const defenderIsHuman = isPlayerHuman(firstTarget.owner)
        if (defenderIsHuman) {
          showInsubstantialNotification(firstTarget, damage, lightningBreathAttacker)
        } else {
          addToast(`👻 INSUBSTANTIAL: ${firstTarget.creature.name} blocked ${damage} LIGHTNING BREATH damage!`)
        }

        // Create result for this blocked attack
        const blockedResult = {
          damage: 0,
          destroyed: false,
          moraleChange: { attacker: 0, defender: 0 },
          targetName: firstTarget.creature.name,
          defenseResult: { type: 'insubstantial', success: true, damageBlocked: damage },
          insubstantialUsed: true
        }

        // Move to next target or complete
        handleLightningBreathAttackResolved(blockedResult)
        return
      }
    }

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

      // Check if next target has INSUBSTANTIAL available
      if (gameState.canUseInsubstantial(nextTarget)) {
        const blocked = gameState.useInsubstantial(nextTarget, damage, attacker.owner)
        if (blocked) {
          const defenderIsHuman = isPlayerHuman(nextTarget.owner)
          if (defenderIsHuman) {
            showInsubstantialNotification(nextTarget, damage, attacker)
          } else {
            addToast(`👻 INSUBSTANTIAL: ${nextTarget.creature.name} blocked ${damage} LIGHTNING BREATH damage!`)
          }

          // Create result for this blocked attack and recursively continue
          const blockedResult = {
            damage: 0,
            destroyed: false,
            moraleChange: { attacker: 0, defender: 0 },
            targetName: nextTarget.creature.name,
            defenseResult: { type: 'insubstantial', success: true, damageBlocked: damage },
            insubstantialUsed: true
          }

          // Store result and continue to next
          const updatedResults = [...newResults, blockedResult]
          setLightningBreathResults(updatedResults)

          // Check for more targets after this blocked one
          const followingIndex = nextIndex + 1
          if (followingIndex < targets.length) {
            // Recursively handle next target
            setLightningBreathCurrentAttackIndex(followingIndex)
            handleLightningBreathAttackResolved(blockedResult)
          } else {
            // All attacks resolved
            handleLightningBreathComplete(updatedResults)
          }
          return
        }
      }

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
      // IMMEDIATE CARD: Prevent damage, optionally discard card as cost (Uncanny Dodge)
      const result = gameState.applyImmediateCardDefense(defense.card, defense.creature, defense.discardCard)
      damageAfterDefense = result.success ? Math.max(0, damage - result.damagePrevented) : damage
      defenseResult = { ...result, type: 'immediate_card' }

      // Handle opponent draws (Recoil) - defender chooses which opponent receives card
      if (result.success && result.opponentDrawsCards > 0) {
        const cardName = result.cardUsed?.name || defense.card.name
        handleOpponentDrawEffect(result.opponentDrawsCards, cardName, defenderInstance.owner, attackerInstance.owner)
      }
    }

    // Apply damage to defender
    const previousHP = defenderInstance.currentHP
    defenderInstance.currentHP -= damageAfterDefense
    const destroyed = defenderInstance.currentHP <= 0

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

      const advanceResult = gameState.advancePhase()

      // Display water damage toasts if any creatures took water damage
      if (advanceResult?.waterDamageResults?.length > 0) {
        for (const waterResult of advanceResult.waterDamageResults) {
          if (waterResult.destroyed) {
            addToast(`🌊 WATER DAMAGE: ${waterResult.creature} was destroyed by drowning! (10 damage)`)
          } else {
            addToast(`🌊 WATER DAMAGE: ${waterResult.creature} takes 10 damage from water!`)
          }
        }

        // Check for game over after water deaths
        const hasDeaths = advanceResult.waterDamageResults.some(r => r.destroyed)
        if (hasDeaths) {
          gameState.checkGameOver()
        }
      }
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

  /**
   * Show INSUBSTANTIAL modal when ability blocks damage (human players only)
   * @param {CreatureInstance} defenderInstance - The creature that used INSUBSTANTIAL
   * @param {number} damageBlocked - Amount of damage blocked
   * @param {CreatureInstance} attackerInstance - The creature that tried to deal damage
   */
  const showInsubstantialNotification = (defenderInstance, damageBlocked, attackerInstance) => {
    setInsubstantialData({
      defenderInstance,
      damageBlocked,
      attackerInstance
    })
    setShowInsubstantialModal(true)
  }

  /**
   * Handle INSUBSTANTIAL modal dismissal
   * Clears all combat-related state since the attack was blocked
   */
  const handleInsubstantialDismiss = () => {
    setShowInsubstantialModal(false)
    setInsubstantialData(null)

    // Clear combat panel state - attack was blocked, no further action needed
    setPendingAttack(null)
    setCombatPanelMode(null)
    setCombatHighlightCreatures({ attacker: null, defender: null })

    // Clear selection state
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])

    setRenderCounter(prev => prev + 1)
  }

  // ============================================================================
  // RIDER Ability Handlers - Skeletal Lancer
  // When creature is destroyed, deploy a Skeleton (Level 3 or lower) from hand
  // Morale loss = (destroyed creature level - deployed creature level)
  // ============================================================================

  /**
   * Handle RIDER creature selection - player chooses which Skeleton to deploy
   * @param {Object} selectedCreature - The creature card selected from hand
   */
  const handleRiderSelect = (selectedCreature) => {
    if (!riderData || !gameState) return

    const { position, ownerPlayerId, creatureLevel } = riderData
    const player = gameState.players[ownerPlayerId]

    // Calculate morale cost (Skeletal Lancer level - deployed creature level)
    const moraleCost = creatureLevel - selectedCreature.level

    // Remove creature from hand
    const creatureIndex = player.creatureHand.findIndex(c => c.id === selectedCreature.id)
    if (creatureIndex !== -1) {
      player.creatureHand.splice(creatureIndex, 1)
    }

    // Create and place creature instance
    const creatureInstance = new CreatureInstance(selectedCreature, ownerPlayerId)
    creatureInstance.position = { ...position }
    creatureInstance.markAsDeployed(gameState.turnNumber)

    // Place on tile
    const tile = gameState.getTile(position.x, position.y)
    if (tile) {
      tile.occupant = creatureInstance
    }

    // Add to creatures in play
    player.creaturesInPlay.push(creatureInstance)

    // Apply morale cost (reduced by deployed creature level)
    player.morale -= moraleCost

    // Track for abilities test
    if (window.trackAbility) {
      window.trackAbility('rider', 'triggered', player.aiDifficulty || 'human', {
        deployedCreature: selectedCreature.name,
        deployedLevel: selectedCreature.level,
        moraleCost: moraleCost,
        moraleSaved: selectedCreature.level
      })
    }

    // Close modal and clear state
    setShowRiderModal(false)
    setRiderData(null)
    setSelectedRiderCreature(null)

    if (pendingRiderCallback) {
      const callback = pendingRiderCallback
      setPendingRiderCallback(null)
      callback()
    }

    addToast(`RIDER: Deployed ${selectedCreature.name} (Level ${selectedCreature.level}). Lost ${moraleCost} morale.`, 'info')
    setRenderCounter(prev => prev + 1)
  }

  /**
   * Handle RIDER decline - player chooses not to deploy a replacement
   * Full morale loss occurs (creature level)
   */
  const handleRiderDecline = () => {
    if (!riderData || !gameState) return

    const { ownerPlayerId, creatureLevel, destroyedCreature } = riderData

    // Track for abilities test
    const player = gameState.players[ownerPlayerId]
    if (window.trackAbility) {
      window.trackAbility('rider', 'declined', player?.aiDifficulty || 'human', {
        destroyedCreature: destroyedCreature,
        moraleLost: creatureLevel
      })
    }

    // Close modal and clear state
    setShowRiderModal(false)
    setRiderData(null)
    setSelectedRiderCreature(null)

    if (pendingRiderCallback) {
      const callback = pendingRiderCallback
      setPendingRiderCallback(null)
      callback()
    }

    addToast(`RIDER declined: ${destroyedCreature} destroyed. Lost ${creatureLevel} morale.`, 'warning')
    setRenderCounter(prev => prev + 1)
  }

  /**
   * Handle AI RIDER ability decision
   * Applies 0/50/100 difficulty rule
   * Supports both Curse of Undeath (Skeleton) and Tyranny of Goblins (Goblin/Wolf)
   * @param {string} playerId - AI player ID
   * @param {Array} eligibleCreatures - Eligible creatures from hand
   * @param {Object} position - Position where creature died
   * @param {number} creatureLevel - Level of destroyed creature
   * @param {string} destroyedCreature - Name of destroyed creature
   * @param {string} faction - Faction of destroyed creature (for tracking)
   * @param {Function} callback - Callback to execute after RIDER resolution
   */
  const handleAIRiderDecision = (playerId, eligibleCreatures, position, creatureLevel, destroyedCreature, faction, callback) => {
    const player = gameState.players[playerId]
    if (!player) {
      if (callback) callback()
      return
    }

    const aiDifficulty = player.aiDifficulty || 'medium'

    // Determine which stats key to use based on faction
    const statsKey = faction === 'Tyranny of Goblins' ? 'riderGoblin' : 'rider'

    // Track that RIDER was offered
    if (window.trackAbility) {
      window.trackAbility(statsKey, 'offered', aiDifficulty, {
        destroyedCreature: destroyedCreature,
        faction: faction,
        eligibleCount: eligibleCreatures.length
      })
    }

    // Apply 0/50/100 difficulty rule
    let shouldDeploy = false
    switch (aiDifficulty) {
      case 'easy':
        shouldDeploy = false  // Easy: Never use RIDER (0%)
        break
      case 'medium':
        shouldDeploy = Math.random() < 0.5  // Medium: 50% chance
        break
      case 'hard':
        shouldDeploy = true  // Hard: Always use RIDER (100%)
        break
      default:
        shouldDeploy = Math.random() < 0.5
    }

    if (!shouldDeploy) {
      if (window.trackAbility) {
        window.trackAbility(statsKey, 'declined', aiDifficulty, {
          destroyedCreature: destroyedCreature,
          faction: faction,
          moraleLost: creatureLevel
        })
      }
      if (callback) callback()
      return
    }

    // AI selects highest level creature (minimizes morale loss)
    const sortedCreatures = [...eligibleCreatures].sort((a, b) => b.level - a.level)
    const selectedCreature = sortedCreatures[0]

    // Calculate morale cost
    const moraleCost = creatureLevel - selectedCreature.level

    // Remove from hand
    const creatureIndex = player.creatureHand.findIndex(c => c.id === selectedCreature.id)
    if (creatureIndex !== -1) {
      player.creatureHand.splice(creatureIndex, 1)
    }

    // Create and place creature instance
    const creatureInstance = new CreatureInstance(selectedCreature, playerId)
    creatureInstance.position = { ...position }
    creatureInstance.markAsDeployed(gameState.turnNumber)

    // Place on tile
    const tile = gameState.getTile(position.x, position.y)
    if (tile) {
      tile.occupant = creatureInstance
    }

    // Add to creatures in play
    player.creaturesInPlay.push(creatureInstance)

    // Apply morale cost
    player.morale -= moraleCost

    // Track for abilities test
    if (window.trackAbility) {
      window.trackAbility(statsKey, 'triggered', aiDifficulty, {
        deployedCreature: selectedCreature.name,
        deployedLevel: selectedCreature.level,
        faction: faction,
        moraleCost: moraleCost,
        moraleSaved: selectedCreature.level
      })
    }

    addToast(`AI RIDER: Deployed ${selectedCreature.name}. Lost ${moraleCost} morale.`, 'info')

    if (callback) callback()
    setRenderCounter(prev => prev + 1)
  }

  // ============================================================================
  // RANGED SPLASH DAMAGE HANDLERS (ACID BREATH / EXPLOSIVE BOLTS)
  // ============================================================================

  /**
   * Process splash damage targets one at a time
   * Shows defense panel for human defenders, AI uses 0/50/100 rule
   * @param {Array} targets - Array of enemy creatures adjacent to ranged target
   * @param {number} index - Current index in targets array
   * @param {Object} attackerInstance - The creature that made the ranged attack
   * @param {number} splashDamage - Damage to deal (20 for Acid Breath, 10 for Explosive Bolts)
   * @param {string} abilityName - 'ACID BREATH' or 'EXPLOSIVE BOLTS'
   * @param {Function} onComplete - Callback when all splash damage is resolved
   */
  const processNextRangedSplashTarget = (targets, index, attackerInstance, splashDamage, abilityName, onComplete) => {
    if (index >= targets.length) {
      // All splash targets processed - now tap the attacker and complete
      // Find the actual creature in the CURRENT gameState (not stale closure)
      const attackerOwner = attackerInstance.owner
      const actualAttacker = gameState.players[attackerOwner]?.creaturesInPlay.find(
        c => c.instanceId === attackerInstance.instanceId
      )

      if (actualAttacker) {
        actualAttacker.hasAttackedThisTurn = true
        actualAttacker.tap()
      }

      // Clear splash state
      setPendingRangedSplashTargets([])
      setCurrentRangedSplashIndex(0)
      setRangedSplashAttackInfo(null)
      setShowRangedSplashDefensePanel(false)
      setCombatPanelMode(null)  // Clear combat panel after splash resolution

      // Force re-render to show tapped state
      setRenderCounter(prev => prev + 1)

      if (onComplete) onComplete()
      return
    }

    const target = targets[index]
    const isTargetHuman = isPlayerHuman(target.owner)
    const isTargetTapped = target.isTapped

    if (isTargetHuman && !isTargetTapped) {
      // Human defender - show defense panel using existing combat panel system
      setCurrentRangedSplashIndex(index)
      setRangedSplashAttackInfo({
        attackerInstance,
        attackerOwner: attackerInstance.owner,
        splashDamage,
        abilityName,
        currentTarget: target,
        targetIndex: index,
        totalTargets: targets.length,
        onComplete
      })
      // Use existing combat panel system for defense
      setPendingAttack({
        attackerInstance: attackerInstance,
        defenderInstance: target,
        targetInfo: { attackType: 'ranged_splash', damage: splashDamage, abilityName: abilityName },
        isSplashDamage: true,
        isRangedSplash: true,
        splashSource: abilityName
      })
      setCombatPanelMode('defense')
      setShowRangedSplashDefensePanel(true)
      setRenderCounter(prev => prev + 1)
    } else if (!isTargetHuman && !isTargetTapped) {
      // AI defender - use 0/50/100 rule
      handleAIRangedSplashDefense(targets, index, attackerInstance, splashDamage, abilityName, target, onComplete)
    } else {
      // Tapped creature - apply damage directly
      const result = gameState.applyRangedSplashDamage(target, attackerInstance.owner, splashDamage, 0)
      const moraleMsg = result.destroyed && result.moraleChange ? ` Morale changes: Attacker +${result.moraleChange.attacker}, Defender ${result.moraleChange.defender}` : ''
      addToast(`${abilityName}: ${target.creature.name} takes ${result.damage} splash damage!${result.destroyed ? ' DESTROYED!' : ''}${moraleMsg}`)

      // Process next target
      processNextRangedSplashTarget(targets, index + 1, attackerInstance, splashDamage, abilityName, onComplete)
    }
  }

  /**
   * Handle defense selection for RANGED SPLASH damage (ACID BREATH / EXPLOSIVE BOLTS)
   * Supports COWER, UNSTOPPABLE HORDES, IMMEDIATE cards, and skip
   * @param {Object} defense - { type, damageReduction, moraleCost, creatures, card, creature }
   */
  const handleRangedSplashDefenseSelected = (defense) => {
    if (!pendingAttack || !rangedSplashAttackInfo) {
      return
    }

    const { currentTarget, splashDamage, attackerInstance, abilityName } = rangedSplashAttackInfo
    const defenderInstance = currentTarget

    if (defense.type === 'skip') {
      // No defense - apply full splash damage
      closeCombatPanel()
      handleRangedSplashDefenseComplete({ damageReduction: 0 })
      return
    }

    if (defense.type === 'cower') {
      // COWER: Avoid ALL damage, pay morale, tap creature
      const cowerResult = gameState.applyCower(
        defenderInstance,
        splashDamage,
        attackerInstance.owner
      )
      closeCombatPanel()
      handleRangedSplashDefenseComplete({ damageReduction: cowerResult.damageAvoided })
      return
    }

    if (defense.type === 'unstoppable_hordes') {
      // UNSTOPPABLE HORDES: Each Undead prevents 20 damage
      let totalPrevented = 0
      defense.creatures?.forEach(creature => {
        const result = gameState.applyUnstoppableHordes(creature)
        if (result.success) {
          totalPrevented += result.damagePrevented
        }
      })
      closeCombatPanel()
      handleRangedSplashDefenseComplete({ damageReduction: totalPrevented })
      return
    }

    if (defense.type === 'immediate_card') {
      // IMMEDIATE card: Prevent damage equal to card value, optionally discard card as cost
      const result = gameState.applyImmediateCardDefense(defense.card, defense.creature, defense.discardCard)

      // Handle opponent draws (Recoil) - defender chooses which opponent receives card
      if (result.success && result.opponentDrawsCards > 0) {
        const cardName = result.cardUsed?.name || defense.card.name
        handleOpponentDrawEffect(result.opponentDrawsCards, cardName, defenderInstance.owner, attackerInstance.owner)
      }

      closeCombatPanel()
      handleRangedSplashDefenseComplete({ damageReduction: result.success ? result.damagePrevented : 0 })
      return
    }

    // Fallback - no defense
    closeCombatPanel()
    handleRangedSplashDefenseComplete({ damageReduction: 0 })
  }

  /**
   * Handle Savage Demise attack resolution
   * Called when the sacrifice target's defense phase completes
   *
   * Flow:
   * 1. Apply Savage Demise damage to target (with defense reduction)
   * 2. Check for DEATH STRIKE ability on the attacker (Boar/Wereboar)
   * 3. If DEATH STRIKE, apply additional damage to the SAME target
   * 4. Kill the creature that used Savage Demise (guaranteed death)
   * 5. Clear savageDemisePending state and combat panels
   *
   * @param {Object} defenseResult - { damageReduction: number, type: string, ... }
   */
  const handleSavageDemiseResolution = (defenseResult) => {
    console.log('[handleSavageDemiseResolution] === CALLED ===')
    console.log('[handleSavageDemiseResolution] defenseResult:', defenseResult)
    console.log('[handleSavageDemiseResolution] savageDemisePending:', savageDemisePending)
    console.log('[handleSavageDemiseResolution] pendingAttack:', pendingAttack)

    if (!savageDemisePending || !pendingAttack) {
      console.log('[handleSavageDemiseResolution] Missing state - savageDemisePending:', !!savageDemisePending, 'pendingAttack:', !!pendingAttack)
      return
    }

    const { attacker, target, damage, originalAttacker, card } = savageDemisePending
    const damageReduction = defenseResult.damageReduction || 0

    console.log('[handleSavageDemiseResolution] attacker:', attacker?.creature?.name)
    console.log('[handleSavageDemiseResolution] target:', target?.creature?.name)
    console.log('[handleSavageDemiseResolution] damage:', damage)
    console.log('[handleSavageDemiseResolution] damageReduction:', damageReduction)

    // Apply Savage Demise damage to target using the dedicated method
    console.log('[handleSavageDemiseResolution] Calling applySavageDemiseDamage...')
    const savageDemiseResult = gameState.applySavageDemiseDamage(target, attacker.owner, damage, damageReduction)
    console.log('[handleSavageDemiseResolution] savageDemiseResult:', savageDemiseResult)
    const finalDamage = savageDemiseResult.damage

    // Build message
    let message = ''
    if (damageReduction > 0) {
      message += `⚡ ${defenseResult.cardUsed || 'Defense'} prevented ${damageReduction} damage! `
    }
    message += `⚔️ SAVAGE DEMISE: ${attacker.creature.name} attacks ${target.creature.name} for ${finalDamage} damage!`

    if (savageDemiseResult.destroyed) {
      message += ` ${target.creature.name} was destroyed!`
      if (savageDemiseResult.moraleChange) {
        message += ` Morale: ${attacker.owner} +${savageDemiseResult.moraleChange.attacker}, ${target.owner} ${savageDemiseResult.moraleChange.defender}`
      }
    } else {
      message += ` ${target.creature.name} has ${savageDemiseResult.remainingHP || target.currentHP} HP remaining.`
    }
    addToast(message)

    // Check for DEATH STRIKE ability (Boar/Wereboar)
    const hasDeathStrike = gameState.hasDeathStrike && gameState.hasDeathStrike(attacker)
    if (hasDeathStrike) {
      // DEATH STRIKE: Additional melee attack against the SAME target
      // Only triggers if target is still alive (not destroyed by Savage Demise)
      const targetStillAlive = !savageDemiseResult.destroyed

      if (targetStillAlive) {
        const deathStrikeDamage = attacker.creature.meleeAttack?.damage || 0
        const deathStrikeResult = gameState.applySavageDemiseDamage(target, attacker.owner, deathStrikeDamage, 0)

        let deathStrikeMsg = `💀 DEATH STRIKE: ${attacker.creature.name} strikes ${target.creature.name} for ${deathStrikeDamage} damage!`
        if (deathStrikeResult.destroyed) {
          deathStrikeMsg += ` ${target.creature.name} was destroyed!`
          if (deathStrikeResult.moraleChange) {
            deathStrikeMsg += ` Morale: ${attacker.owner} +${deathStrikeResult.moraleChange.attacker}, ${target.owner} ${deathStrikeResult.moraleChange.defender}`
          }
        } else {
          deathStrikeMsg += ` ${target.creature.name} has ${deathStrikeResult.remainingHP || target.currentHP} HP remaining.`
        }
        addToast(deathStrikeMsg)
      } else {
        // Target already dead from Savage Demise, Death Strike doesn't trigger damage
        addToast(`💀 DEATH STRIKE: ${attacker.creature.name}'s death strike cannot trigger - target already destroyed.`)
      }
    }

    // Now kill the creature that used Savage Demise (guaranteed death)
    const sacrificer = attacker
    const sacrificerOwner = sacrificer.owner

    console.log('[handleSavageDemiseResolution] Sacrificing creature:', sacrificer?.creature?.name)
    console.log('[handleSavageDemiseResolution] Calling sacrificeCreature...')

    // Apply death - creature dies, owner loses morale equal to creature level
    const sacrificeDeathResult = gameState.sacrificeCreature(sacrificer)

    console.log('[handleSavageDemiseResolution] sacrificeDeathResult:', sacrificeDeathResult)

    addToast(`☠️ SACRIFICE: ${sacrificer.creature.name} dies from Savage Demise! (Morale -${sacrificeDeathResult.moraleLost})`)

    // Check for game over conditions
    gameState.checkGameOver()

    // Check for immediate elimination
    const eliminationResult = gameState.checkAndEliminatePlayer(sacrificerOwner)
    if (eliminationResult.eliminated) {
      const reason = eliminationResult.reason === 'morale'
        ? 'Morale reduced to 0!'
        : 'All creatures destroyed!'
      addToast(`🏳️ ${gameState.players[sacrificerOwner].commander.name} has been eliminated! ${reason}`)
    }

    const targetEliminationResult = gameState.checkAndEliminatePlayer(target.owner)
    if (targetEliminationResult.eliminated) {
      const reason = targetEliminationResult.reason === 'morale'
        ? 'Morale reduced to 0!'
        : 'All creatures destroyed!'
      addToast(`🏳️ ${gameState.players[target.owner].commander.name} has been eliminated! ${reason}`)
    }

    // Clear Savage Demise state
    console.log('[handleSavageDemiseResolution] Clearing state...')
    clearSavageDemiseState()
    setPendingAttack(null)

    // Force re-render to update UI
    setRenderCounter(prev => prev + 1)
    console.log('[handleSavageDemiseResolution] === COMPLETE ===')
  }

  /**
   * Handle human player completing ranged splash defense
   * @param {Object} defenseResult - { damageReduction: number }
   */
  const handleRangedSplashDefenseComplete = (defenseResult) => {
    const { damageReduction } = defenseResult
    const { currentTarget, splashDamage, attackerInstance, abilityName, onComplete } = rangedSplashAttackInfo

    const result = gameState.applyRangedSplashDamage(
      currentTarget,
      attackerInstance.owner,
      splashDamage,
      damageReduction
    )

    if (result.insubstantialBlocked) {
      addToast(`${abilityName}: ${currentTarget.creature.name} blocked with INSUBSTANTIAL!`)
    } else {
      const defended = damageReduction > 0 ? ` (defended ${damageReduction})` : ''
      const moraleMsg = result.destroyed && result.moraleChange ? ` Morale changes: Attacker +${result.moraleChange.attacker}, Defender ${result.moraleChange.defender}` : ''
      addToast(`${abilityName}: ${currentTarget.creature.name} takes ${result.damage} splash damage${defended}!${result.destroyed ? ' DESTROYED!' : ''}${moraleMsg}`)
    }

    setShowRangedSplashDefensePanel(false)

    // Process next splash target
    processNextRangedSplashTarget(
      pendingRangedSplashTargets,
      currentRangedSplashIndex + 1,
      attackerInstance,
      splashDamage,
      abilityName,
      onComplete
    )
  }

  /**
   * Handle AI defense against splash damage using 0/50/100 rule
   */
  const handleAIRangedSplashDefense = (targets, index, attackerInstance, splashDamage, abilityName, target, onComplete) => {
    // AI 0/50/100 rule for defense - get difficulty from gameConfig like other AI handlers
    const defenderPlayerId = target.owner
    const playerNum = defenderPlayerId.replace('PLAYER', '')
    const playerKey = `player${playerNum}`
    const difficulty = gameConfig?.[playerKey]?.difficulty || 'medium'

    let willDefend = false
    if (difficulty === 'hard') willDefend = true
    else if (difficulty === 'medium') willDefend = Math.random() < 0.5
    // Easy = never defend (0%)

    let damageReduction = 0
    const player = gameState.players[target.owner]
    if (willDefend) {
      // AI attempts to find defense card
      const defenseCards = player?.orderHand?.filter(card =>
        card.actionType === 'IMMEDIATE' && card.damagePrevented > 0
      ) || []

      if (defenseCards.length > 0) {
        const bestCard = defenseCards[0] // Simple: use first available
        damageReduction = bestCard.damagePrevented || 0
        // Discard the card
        const cardIndex = player.orderHand.findIndex(c => c.id === bestCard.id)
        if (cardIndex !== -1) {
          player.orderHand.splice(cardIndex, 1)
          player.orderDiscard.push(bestCard)
        }
      }
    }

    const result = gameState.applyRangedSplashDamage(target, attackerInstance.owner, splashDamage, damageReduction)

    if (result.insubstantialBlocked) {
      addToast(`${abilityName}: ${target.creature.name} (AI) blocked with INSUBSTANTIAL!`)
    } else {
      const defended = damageReduction > 0 ? ` (defended ${damageReduction})` : ''
      const moraleMsg = result.destroyed && result.moraleChange ? ` Morale changes: Attacker +${result.moraleChange.attacker}, Defender ${result.moraleChange.defender}` : ''
      addToast(`${abilityName}: ${target.creature.name} (AI) takes ${result.damage} splash damage${defended}!${result.destroyed ? ' DESTROYED!' : ''}${moraleMsg}`)
    }

    // Process next target with brief delay for readability
    setTimeout(() => {
      processNextRangedSplashTarget(targets, index + 1, attackerInstance, splashDamage, abilityName, onComplete)
    }, 300)
  }

  /**
   * Check and initiate ranged splash damage after a ranged attack
   * Called after main ranged attack damage is resolved
   * Applies 0/50/100 difficulty rule for AI attackers
   * @param {Object} attackerInstance - The creature that made the ranged attack
   * @param {Object} targetPosition - {x, y} position of the ranged attack target
   * @param {Function} onComplete - Callback when splash processing completes (including tapping attacker)
   * @returns {boolean} True if splash damage is being processed, false if no splash ability
   */
  const checkAndProcessRangedSplash = (attackerInstance, targetPosition, onComplete) => {
    const splashDamage = gameState.getRangedSplashDamage(attackerInstance)
    if (splashDamage <= 0) {
      return false // No splash ability
    }

    // AI 0/50/100 rule for USING splash ability (offense)
    const attackerOwner = attackerInstance.owner
    const isAttackerHuman = isPlayerHuman(attackerOwner)

    if (!isAttackerHuman) {
      // AI attacker - apply 0/50/100 rule for using splash ability
      const playerNum = attackerOwner.replace('PLAYER', '')
      const playerKey = `player${playerNum}`
      const difficulty = gameConfig?.[playerKey]?.difficulty || 'medium'

      let useSplash = false
      if (difficulty === 'hard') {
        useSplash = true  // Hard AI always uses splash (100%)
      } else if (difficulty === 'medium') {
        useSplash = Math.random() < 0.5  // Medium AI uses 50%
      }
      // Easy AI never uses splash (0%)

      if (!useSplash) {
        return false // AI chose not to use splash ability
      }
    }
    // Human attackers: splash always triggers (player decision was to make ranged attack)

    const splashTargets = gameState.getRangedSplashTargets(attackerInstance, targetPosition)
    if (splashTargets.length === 0) {
      return false // No valid targets
    }

    const abilityName = gameState.getRangedSplashAbilityName(attackerInstance)

    // Store splash data for sequential processing
    setPendingRangedSplashTargets(splashTargets)
    setCurrentRangedSplashIndex(0)

    // Start processing first splash target
    processNextRangedSplashTarget(splashTargets, 0, attackerInstance, splashDamage, abilityName, onComplete)
    return true // Splash is being processed
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

    // ============================================
    // SLAM LOCK: Block phase advancement during ability - O(1)
    // User must complete slam or skip before advancing
    // ============================================
    if (showSlamModal || slamMode) {
      addToast('⚠️ You must complete the SLAM ability or skip before advancing the phase.')
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

          // Check for REGENERATE results and show toast
          if (gameState.lastRegenerateResult?.length > 0) {
            for (const { creature, healAmount } of gameState.lastRegenerateResult) {
              addToast(`🩹 REGENERATE: ${creature.creature.name} regenerated ${healAmount} HP!`)
            }
            gameState.lastRegenerateResult = null // Clear after showing
          }
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
            const advanceResult = gameState.advancePhase()

            // Display water damage toasts if any creatures took water damage
            if (advanceResult?.waterDamageResults?.length > 0) {
              for (const waterResult of advanceResult.waterDamageResults) {
                if (waterResult.destroyed) {
                  addToast(`🌊 WATER DAMAGE: ${waterResult.creature} was destroyed by drowning! (10 damage)`)
                } else {
                  addToast(`🌊 WATER DAMAGE: ${waterResult.creature} takes 10 damage from water!`)
                }
              }

              // Check for game over after water deaths
              const hasDeaths = advanceResult.waterDamageResults.some(r => r.destroyed)
              if (hasDeaths) {
                gameState.checkGameOver()
              }
            }
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
      // Order card targeting mode state
      orderCardTargetingMode: orderCardTargetingMode,
      selectedOrderCard: selectedOrderCard,
      cancelOrderCardTargeting: cancelOrderCardTargeting,
      // Turn log for navbar display
      turnLog: turnLog,
      isLogExpanded: isLogExpanded,
      setIsLogExpanded: setIsLogExpanded,
      // TEST ONLY: Fill current player's hand with all cards
      fillAllCardsForCurrentPlayer: () => {
        const currentPlayer = gameState.getCurrentPlayerState()
        if (currentPlayer) {
          currentPlayer.fillAllCards()
          setRenderCounter(prev => prev + 1) // Force re-render
        }
      }
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
    const isCurrentPlayerAI = !isPlayerHuman(currentPlayerId)

    if (!isCurrentPlayerAI) {
      return
    }
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
      // WEB CARD AI EXECUTION
      // Process web actions - show notification to human player
      // ============================================
      const webActions = actions.filter(action => action.type === 'web')
      for (const webAction of webActions) {
        const { casterInstance, targetInstance, webCard } = webAction

        // Web was already applied in simpleAI.js, just show notification
        addToast(`🕸️ AI: ${casterInstance.creature.name} cast WEB on ${targetInstance.creature.name}! (Cannot move)`)
      }

      // ============================================
      // WEB REMOVAL AI EXECUTION
      // Process web removal actions
      // ============================================
      const webRemovalActions = actions.filter(action => action.type === 'web_removal')
      for (const removalAction of webRemovalActions) {
        const { creatureInstance, reason } = removalAction

        // Web was already removed in simpleAI.js, just show notification
        addToast(`🕸️ AI: ${creatureInstance.creature.name} removed Web ${reason}`)
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

    // Don't auto-execute if it's AI's turn (AI logic handles its own phases)
    if (isCurrentPlayerAI) {
      return
    }

    // Auto-execute REFRESH and CLEANUP phases for human players
    // Exception: HORDE ability allows deployment during REFRESH, so show modal instead
    if (gameState.currentPhase === GamePhases.REFRESH) {
      if (gameState.canDeployDuringRefresh(gameState.currentPlayer)) {
        // HORDE ability - execute refresh actions then show deployment modal
        const executeHordeRefresh = async () => {
          await new Promise(resolve => setTimeout(resolve, 500))

          // Execute refresh actions (matching PhaseManager.executeRefreshPhase logic)
          const player = gameState.getCurrentPlayerState()
          player.resetAbilitiesForNewTurn()

          // Calculate total cards to draw (1 normal + any bonus from Parry/Defensive Advantage)
          const bonusDraws = player.bonusOrderCardsToDraw || 0
          const totalCardsToDraw = 1 + bonusDraws

          // Store bonus draw sources before resetting (for modal display)
          player.bonusDrawSourcesThisTurn = [...(player.bonusDrawSources || [])]

          // Draw order cards and store them for the modal display
          const drawnCards = player.drawOrderCards(totalCardsToDraw)
          player.cardsDrawnThisTurn = drawnCards

          // Reset bonus draws counter and sources
          player.bonusOrderCardsToDraw = 0
          player.bonusDrawSources = []

          // Merge pending card reveals (from opponent effects like Recoil) into the drawn cards display
          if (player.pendingCardReveals && player.pendingCardReveals.length > 0) {
            player.pendingCardReveals.forEach(reveal => {
              player.cardsDrawnThisTurn.push(reveal.card)
              if (!player.bonusDrawSourcesThisTurn) player.bonusDrawSourcesThisTurn = []
              player.bonusDrawSourcesThisTurn.push(`Received from ${reveal.source}`)
            })
            player.pendingCardReveals = []
          }

          // Untap all creatures
          player.creaturesInPlay.forEach(creature => creature.untap())

          // Clear deployment protection from previous turns
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

  // MAGIC CIRCLE AURA: Show pending notifications at start of each human player's ACTIVATE phase
  // This ensures other human players see the modal when the aura was activated by a different player
  useEffect(() => {
    if (!gameState?.currentPlayer) return
    if (!gameState?.currentPhase) return

    // Only trigger at the start of ACTIVATE phase for human players
    if (gameState.currentPhase === GamePhases.ACTIVATE && isPlayerHuman(gameState.currentPlayer)) {
      checkPendingMagicCircleNotifications()
    }
  }, [gameState?.currentPhase, gameState?.currentPlayer])

  // CARDS DRAWN: Show modal at start of ACTIVATE phase displaying cards drawn during REFRESH
  // This shows the player what Order cards they drew before they make any moves
  useEffect(() => {
    if (!gameState?.currentPlayer) return
    if (!gameState?.currentPhase) return

    // Only trigger at the start of ACTIVATE phase for human players
    if (gameState.currentPhase === GamePhases.ACTIVATE && isPlayerHuman(gameState.currentPlayer)) {
      const player = gameState.getCurrentPlayerState()
      // Only show modal if cards were drawn (even if empty array, show "no cards to draw")
      if (player.cardsDrawnThisTurn !== undefined) {
        setCardsDrawnData(player.cardsDrawnThisTurn || [])
        // Also set bonus draw sources (e.g., ["Parry", "Defensive Advantage"])
        setBonusDrawSources(player.bonusDrawSourcesThisTurn || [])
        setShowCardsDrawnModal(true)
      }
    }
  }, [gameState?.currentPhase, gameState?.currentPlayer, gameState?.turnNumber])

  // MORALE NOTIFICATIONS: Show pending morale loss notifications at ACTIVATE phase
  // Only triggers if CardsDrawnModal isn't shown (fallback for edge cases)
  useEffect(() => {
    if (!gameState?.currentPlayer) return
    if (!gameState?.currentPhase) return
    if (!isPlayerHuman(gameState.currentPlayer)) return

    // Only trigger at ACTIVATE phase
    if (gameState.currentPhase === GamePhases.ACTIVATE) {
      const player = gameState.getCurrentPlayerState()
      // Only check if CardsDrawnModal won't be shown (cardsDrawnThisTurn is undefined)
      // Otherwise the check happens in CardsDrawnModal's onContinue callback
      if (player.cardsDrawnThisTurn === undefined && player.pendingMoraleNotifications?.length > 0) {
        checkPendingMoraleNotifications()
      }
    }
  }, [gameState?.currentPhase, gameState?.currentPlayer, gameState?.turnNumber])

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
                  // SLAM HIGHLIGHTS: Show valid slam destinations (uses movement color)
                  // ============================================
                  const isSlamTile = slamMode &&
                    slamValidTiles.some(t => t.x === x && t.y === y)

                  // ============================================
                  // CLOUD OF BATS SHIFT HIGHLIGHTS: Show valid shift destinations
                  // ============================================
                  const isShiftTile = shiftSelectionMode &&
                    shiftValidTiles.some(t => t.x === x && t.y === y)

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

                  // ============================================
                  // HEALING TOUCH HIGHLIGHTS: Show valid targets (self + adjacent allies)
                  // when Dwarf Cleric is selected and hasn't used action
                  // ============================================
                  const isHealingTouchTarget = selectedBoardCreature &&
                    gameState.hasHealingTouch(selectedBoardCreature) &&
                    !selectedBoardCreature.hasAttackedThisTurn &&
                    creature &&
                    creature.owner === selectedBoardCreature.owner &&
                    gameState.isValidHealingTouchTarget(selectedBoardCreature, creature)

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
                  // ORC DRUID HIGHLIGHT: Show valid deployment tiles for Beast/Elemental creatures
                  // during deploy phase when Orc Druid is in play
                  // Tiles adjacent to Orc Druid (range 1) get Gruumsh faction color
                  // Always show during deploy phase so players know where they can deploy Beasts
                  // ============================================
                  let isOrcDruidHighlight = false
                  let orcDruidFactionColor = null

                  if (canDeployInCurrentPhase() &&
                      !tile.occupant &&
                      tile.terrain !== 'MOUNTAIN') {
                    const druid = gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)
                    if (druid?.position) {
                      // Check if tile is adjacent to Orc Druid (range 1, 8-directional)
                      const dx = Math.abs(x - druid.position.x)
                      const dy = Math.abs(y - druid.position.y)
                      if (Math.max(dx, dy) === 1) {
                        // Don't highlight if already in starting zone (it already has the highlight)
                        const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                                                 tile.startingZoneOwner === gameState.currentPlayer
                        if (!isInStartingZone) {
                          isOrcDruidHighlight = true
                          orcDruidFactionColor = playerFactionColors?.[gameState.currentPlayer]
                        }
                      }
                    }
                  }

                  // ============================================
                  // ARCANE PORTAL HIGHLIGHT: Show Magic Circle tiles for War Wizard deployment
                  // When War Wizard is selected from hand during deploy phase,
                  // highlight Magic Circle tiles with faction color
                  // ============================================
                  let isArcanePortalHighlight = false
                  let arcanePortalFactionColor = null

                  if (canDeployInCurrentPhase() &&
                      selectedCreatureCard &&
                      gameState.hasArcanePortal &&
                      gameState.hasArcanePortal(selectedCreatureCard) &&
                      !tile.occupant &&
                      tile.terrain === 'MAGIC_CIRCLE') {
                    // Don't highlight if already in starting zone (it already has the highlight)
                    const isInStartingZone = tile.terrain === 'STARTING_ZONE' &&
                                             tile.startingZoneOwner === gameState.currentPlayer
                    if (!isInStartingZone) {
                      isArcanePortalHighlight = true
                      arcanePortalFactionColor = playerFactionColors?.[gameState.currentPlayer]
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

                  // ============================================
                  // ORDER CARD TARGET HIGHLIGHT: Show valid targets for order card targeting mode
                  // ============================================
                  const isOrderCardTarget = orderCardTargetingMode &&
                    creature &&
                    orderCardValidTargets.some(t => t.instanceId === creature.instanceId)

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
                      isSlamTile={isSlamTile}
                      isSummonSpiderHighlight={isSummonSpiderHighlight}
                      summonSpiderFactionColor={summonSpiderFactionColor}
                      isLichNecromancerHighlight={isLichNecromancerHighlight}
                      lichNecromancerFactionColor={lichNecromancerFactionColor}
                      isOrcDruidHighlight={isOrcDruidHighlight}
                      orcDruidFactionColor={orcDruidFactionColor}
                      isArcanePortalHighlight={isArcanePortalHighlight}
                      arcanePortalFactionColor={arcanePortalFactionColor}
                      isLightningBreathValidTarget={isLightningBreathValidTarget}
                      isLightningBreathSelected={isLightningBreathSelected}
                      lightningBreathTargetIndex={lightningBreathTargetIndex}
                      isOrderCardTarget={isOrderCardTarget}
                      isWebbed={creature && gameState?.isWebbed?.(creature)}
                      isHealingTouchTarget={isHealingTouchTarget}
                      isShiftTile={isShiftTile}
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
                  setCreatureViewMode(mode => mode === 'movement' ? 'ranged' : 'movement')
                }}
                selectedBoardCreature={selectedBoardCreature}
                // GRAVEYARD PROPS - For resurrection
                selectedGraveyardCreature={selectedGraveyardCreature}
                onGraveyardCreatureSelect={handleGraveyardCreatureSelect}
                onGraveyardDragStart={handleGraveyardDragStart}
                onGraveyardDragEnd={handleGraveyardDragEnd}
                // ORDER CARD TARGETING PROPS - For Web and other targeted order cards
                orderCardFilterCreature={orderCardFilterCreature}
                selectedOrderCard={selectedOrderCard}
                onOrderCardRightClick={handleOrderCardRightClick}
                onClearOrderCardFilter={clearOrderCardFilter}
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

              {/* Water terrain warning - only show for creatures without flying/phasing immunity */}
              {pendingMove.destination.terrain === 'WATER' && !gameState.hasFlying(pendingMove.creature) && !gameState.hasPhasing(pendingMove.creature) && (
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

              {/* Flying/Phasing creature on water - no damage */}
              {pendingMove.destination.terrain === 'WATER' && (gameState.hasFlying(pendingMove.creature) || gameState.hasPhasing(pendingMove.creature)) && (
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
                    {gameState.hasFlying(pendingMove.creature) ? '✈️ Flying' : '👻 Phasing'} creature - immune to water damage
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

      {/* SLAM Decision Modal - Choose to slide the damaged creature */}
      <Modal
        show={showSlamModal}
        onHide={handleSlamSkip}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#8B4513', color: 'white' }}>
          <Modal.Title>SLAM!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {slamPending && (
            <div>
              <p>
                <strong>{slamPending.attackerInstance.creature.name}</strong> can slam{' '}
                <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{slamPending.targetInstance.creature.name}</span>{' '}
                up to <strong>3 tiles</strong>!
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Click <strong>Slide</strong> to choose where to slam the creature, or <strong>Skip</strong> to end your attack.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="warning" size="lg" onClick={handleSlamAccept}>
            Slide
          </Button>
          <Button variant="secondary" size="lg" onClick={handleSlamSkip}>
            Skip
          </Button>
        </Modal.Footer>
      </Modal>

      {/* SLAM Confirmation Modal - Confirm the selected destination */}
      <Modal
        show={showSlamConfirmModal}
        onHide={handleSlamConfirmCancel}
        centered
      >
        <Modal.Header style={{ backgroundColor: '#8B4513', color: 'white' }}>
          <Modal.Title>Confirm Slam Location</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {slamPending && slamSelectedTile && (
            <div>
              <p>
                Slam <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{slamPending.targetInstance.creature.name}</span>{' '}
                to position <strong>({slamSelectedTile.x}, {slamSelectedTile.y})</strong>?
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="success" size="lg" onClick={handleSlamConfirmExecute}>
            Confirm
          </Button>
          <Button variant="secondary" size="lg" onClick={handleSlamConfirmCancel}>
            Cancel
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

      {/* WEB REMOVAL MODAL - Human player can remove web from their own creature */}
      <WebRemovalModal
        show={showWebRemovalModal}
        onKeepWeb={handleKeepWeb}
        onRemoveWeb={handleRemoveWeb}
        creatureInstance={webRemovalCreature}
      />

      {/* HEALING TOUCH MODAL - Dwarf Cleric can heal self/ally or remove attached cards */}
      <HealingTouchModal
        show={showHealingTouchModal}
        onHeal={handleHealingTouchHeal}
        onRemoveCard={handleHealingTouchRemoveCard}
        onCancel={handleHealingTouchCancel}
        healerInstance={healingTouchHealer}
        targetInstance={healingTouchTarget}
      />

      {/* CHIEFTAIN CALL MODAL - Orc Chieftain's on-deploy ability */}
      <ChieftainCallModal
        show={showChieftainCallModal}
        onDeploy={handleChieftainCallDeploy}
        onDecline={handleChieftainCallDecline}
        chieftainInstance={chieftainCallPending?.chieftainInstance}
        eligibleOrcs={chieftainCallPending?.eligibleOrcs || []}
        gameState={gameState}
      />

      {/* OGRE DEPLOY MORALE MODAL - Ogre's on-deploy ability (+1 morale) */}
      <OgreDeployMoraleModal
        show={showOgreDeployMoraleModal}
        onDismiss={() => setShowOgreDeployMoraleModal(false)}
        result={ogreDeployMoraleResult}
      />

      {/* ORC CLERIC DRAW ORDER MODAL - Orc Cleric of Gruumsh's on-deploy ability (draw 1 Order card) */}
      <ClericDrawOrderModal
        show={showClericDrawOrderModal}
        onDismiss={() => setShowClericDrawOrderModal(false)}
        result={clericDrawOrderResult}
      />

      {/* CARDS DRAWN MODAL - Shows cards drawn at start of ACTIVATE phase */}
      <CardsDrawnModal
        show={showCardsDrawnModal}
        cards={cardsDrawnData}
        bonusSources={bonusDrawSources}
        onContinue={() => {
          setShowCardsDrawnModal(false)
          // Clear the drawn cards tracking after showing the modal
          const player = gameState?.getCurrentPlayerState()
          if (player) {
            player.cardsDrawnThisTurn = []
            player.bonusDrawSourcesThisTurn = []
          }
          setBonusDrawSources([])
          // Check for any pending morale loss notifications (from Unexpected Resistance, etc.)
          checkPendingMoraleNotifications()
        }}
      />

      {/* RECOIL DRAW MODAL - Shows when attacker draws a card from Recoil side effect */}
      <CardsDrawnModal
        show={showRecoilDrawModal}
        cards={recoilDrawnCards}
        title="You Drew a Card!"
        reason={`Opponent used ${recoilSourceCardName} - you draw 1 card as a side effect`}
        onContinue={() => {
          setShowRecoilDrawModal(false)
          setRecoilDrawnCards([])
          setRecoilSourceCardName('')
        }}
      />

      {/* FACTION SELECT MODAL - Shows when defender uses Recoil with 3+ factions */}
      <FactionSelectModal
        show={showFactionSelectModal}
        title={factionSelectConfig.title}
        description={factionSelectConfig.description}
        eligibleFactions={factionSelectConfig.eligibleFactions}
        onSelect={factionSelectConfig.onSelect}
        onCancel={null}
      />

      {/* CLOUD OF BATS SHIFT DECISION MODAL */}
      <ShiftDecisionModal
        show={showShiftDecisionModal}
        cardName={pendingShiftAfterDefense?.cardName || 'Cloud of Bats'}
        shiftDistance={pendingShiftAfterDefense?.maxShift || 6}
        creatureName={pendingShiftAfterDefense?.creature?.creature?.name || 'creature'}
        onYes={handleShiftDecisionYes}
        onNo={handleShiftDecisionNo}
      />

      {/* COUNTER-ATTACK TARGET SELECTION MODAL (Seize the Opportunity) */}
      <CounterAttackTargetModal
        show={showCounterAttackTargetModal}
        onSelectTarget={handleCounterAttackTargetSelected}
        onSkip={handleCounterAttackSkipped}
        counterAttackData={counterAttackPending}
      />

      {/* PATCH UP HEAL MODAL (proactive healing during ACTIVATE phase) */}
      <PatchUpHealModal
        show={showPatchUpHealModal}
        card={patchUpHealConfig?.card}
        creature={patchUpHealConfig?.creature}
        healAmount={patchUpHealConfig?.healAmount || 0}
        onConfirm={executePatchUpHeal}
        onCancel={cancelPatchUpHeal}
      />

      {/* MORALE LOSS NOTIFICATION MODAL (Unexpected Resistance) */}
      <MoraleLossNotificationModal
        show={showMoraleLossModal}
        data={moraleLossModalData}
        onClose={() => {
          setShowMoraleLossModal(false)
          // Check for more pending morale notifications
          checkPendingMoraleNotifications()
        }}
      />

      {/* INSUBSTANTIAL ABILITY NOTIFICATION MODAL */}
      <Modal
        show={showInsubstantialModal}
        onHide={handleInsubstantialDismiss}
        centered
        size="lg"
        backdrop="static"
        className="damage-notification-modal"
      >
        <Modal.Header style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #17a2b8' }}>
          <Modal.Title>
            <span style={{ color: '#17a2b8' }}>👻</span> INSUBSTANTIAL
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {insubstantialData && (
            <>
              {/* Defender creature card */}
              <div className="text-center mb-3">
                {insubstantialData.defenderInstance?.creature?.imageUrl && (
                  <img
                    src={insubstantialData.defenderInstance.creature.imageUrl}
                    alt={insubstantialData.defenderInstance.creature.name}
                    className="damage-modal-creature-img"
                    style={{ maxHeight: '200px', borderRadius: '8px', border: '2px solid #17a2b8' }}
                  />
                )}
                <div className="mt-2">
                  <strong>{insubstantialData.defenderInstance?.creature?.name}</strong>
                  <Badge bg="info" className="ms-2">INSUBSTANTIAL</Badge>
                </div>
              </div>

              {/* Damage blocked alert */}
              <Alert variant="info" className="mb-3 text-center">
                <div style={{ fontSize: '1.2rem' }}>
                  <strong>💨 {insubstantialData.damageBlocked} damage blocked!</strong>
                </div>
                <div className="mt-2">
                  {insubstantialData.defenderInstance?.creature?.name} became insubstantial,
                  phasing through the attack from {insubstantialData.attackerInstance?.creature?.name || 'the enemy'}!
                </div>
              </Alert>

              {/* Warning about ability reset */}
              <Alert variant="warning" className="mb-0">
                <strong>⚠️ Note:</strong> INSUBSTANTIAL will not be available again until the
                next <strong>Curse of Undeath Refresh Phase</strong>.
              </Alert>
            </>
          )}
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
          <Button variant="primary" onClick={handleInsubstantialDismiss} size="lg">
            Continue
          </Button>
        </Modal.Footer>
      </Modal>

      {/* RIDER ABILITY MODAL - Deploy Skeleton creature from hand */}
      <Modal
        show={showRiderModal}
        onHide={() => {}} // Prevent closing without choice
        centered
        size="lg"
        backdrop="static"
        className="damage-notification-modal"
      >
        <Modal.Header style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #6c757d' }}>
          <Modal.Title>
            <span style={{ color: '#adb5bd' }}>🐴</span> RIDER - Deploy Replacement Creature
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {riderData && (() => {
            const riderOwner = gameState?.players[riderData.ownerPlayerId]
            const currentLeadership = riderOwner?.leadership || 0
            const currentMorale = riderOwner?.morale || 0
            // Faction-specific creature type text
            const creatureTypeText = riderData.faction === 'Tyranny of Goblins'
              ? 'Goblin or Wolf'
              : 'Skeleton'
            return (
            <>
              {/* Explanation Alert */}
              <Alert variant="info" style={{ backgroundColor: '#1a4a6e', border: 'none', color: 'white' }}>
                <strong>{riderData.destroyedCreature}</strong> was destroyed!
                <br />
                You may deploy a {creatureTypeText} creature (Level 3 or lower) from your hand to tile ({riderData.position?.x}, {riderData.position?.y}).
              </Alert>

              {/* Current Player Stats */}
              <div style={{
                backgroundColor: '#1a1d21',
                padding: '12px 15px',
                borderRadius: '8px',
                marginBottom: '15px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#ffc107', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {currentLeadership}
                  </div>
                  <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Current Leadership</div>
                </div>
                <div style={{ borderLeft: '1px solid #444', height: '40px' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#dc3545', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {currentMorale}
                  </div>
                  <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Current Morale</div>
                </div>
              </div>

              {/* Creature Selection Cards */}
              <p className="mb-3"><strong>Select a {creatureTypeText} to deploy:</strong></p>
              <Row className="g-3 justify-content-center">
                {riderData.eligibleCreatures.map((creature, index) => {
                  const moraleCost = riderData.creatureLevel - creature.level
                  const isSelected = selectedRiderCreature?.id === creature.id
                  return (
                    <Col key={index} xs={12} sm={6} md={4}>
                      <div
                        onClick={() => setSelectedRiderCreature(creature)}
                        style={{
                          cursor: 'pointer',
                          padding: '15px',
                          border: isSelected ? '3px solid #28a745' : '2px solid #6c757d',
                          borderRadius: '10px',
                          backgroundColor: isSelected ? 'rgba(40, 167, 69, 0.2)' : 'rgba(255,255,255,0.05)',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 0 15px rgba(40, 167, 69, 0.5)' : 'none'
                        }}
                      >
                        {/* Creature Image */}
                        {creature.imageUrl && (
                          <img
                            src={creature.imageUrl}
                            alt={creature.name}
                            style={{
                              maxHeight: '150px',
                              maxWidth: '100%',
                              borderRadius: '6px',
                              marginBottom: '10px',
                              border: '1px solid #555'
                            }}
                          />
                        )}

                        {/* Creature Name & Level */}
                        <div><strong>{creature.name}</strong></div>
                        <Badge bg="secondary" className="mt-1">Level {creature.level}</Badge>

                        {/* Stats Display */}
                        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '5px' }}>
                          <div><small>HP: {creature.hitPoints} | Speed: {creature.speed}</small></div>
                          <div><small>Melee: {creature.meleeAttack?.damage || 'N/A'}</small></div>
                          <div style={{ color: '#ffc107', marginTop: '5px', fontWeight: 'bold' }}>
                            Leadership: {creature.level}
                          </div>
                          <div style={{ color: '#dc3545', fontWeight: 'bold' }}>
                            Morale cost: {moraleCost}
                          </div>
                          <div style={{ color: '#28a745', fontSize: '0.85rem' }}>
                            (Save {riderData.creatureLevel - moraleCost} morale vs full loss)
                          </div>
                        </div>
                      </div>
                    </Col>
                  )
                })}
              </Row>
            </>
            )
          })()}
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444', justifyContent: 'space-between' }}>
          <div>
            <span style={{ color: '#dc3545', fontSize: '0.9rem' }}>
              Declining = full {riderData?.creatureLevel || 4} morale loss
            </span>
          </div>
          <div>
            <Button variant="secondary" onClick={handleRiderDecline} className="me-2">
              Decline RIDER
            </Button>
            <Button
              variant="success"
              onClick={() => selectedRiderCreature && handleRiderSelect(selectedRiderCreature)}
              disabled={!selectedRiderCreature}
            >
              Deploy {selectedRiderCreature?.name || 'Creature'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* MAGIC CIRCLE AURA MODAL - Notification when Hobgoblin Sorcerer enters/leaves Magic Circle */}
      <Modal
        show={showMagicCircleModal}
        onHide={() => setShowMagicCircleModal(false)}
        centered
        size="md"
        className="damage-notification-modal"
      >
        <Modal.Header closeButton style={{
          backgroundColor: '#212529',
          color: 'white',
          borderBottom: '2px solid #9932cc'
        }}>
          <Modal.Title>
            <span style={{ color: '#9932cc' }}>🔮</span> Magic Circle Aura
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {magicCircleModalData && (
            <>
              {magicCircleModalData.activated && (
                <Alert variant="success" style={{ backgroundColor: '#1a4a3a', border: 'none', color: 'white' }}>
                  <strong>{magicCircleModalData.sorcererName}</strong> has entered a Magic Circle!
                  <br /><br />
                  <strong>All Goblins, Hobgoblins, and Bugbears</strong> controlled by{' '}
                  {magicCircleModalData.sorcererOwner === gameState?.currentPlayer ? 'you' : 'the opponent'} now gain:
                  <br />
                  <span style={{ color: '#9932cc', fontWeight: 'bold', fontSize: '1.1em' }}>
                    "Prevent 10 damage from 1 source" (once per turn)
                  </span>
                </Alert>
              )}

              {magicCircleModalData.deactivated && magicCircleModalData.reason === 'left' && (
                <Alert variant="warning" style={{ backgroundColor: '#4a3a1a', border: 'none', color: 'white' }}>
                  <strong>{magicCircleModalData.sorcererName}</strong> has left the Magic Circle!
                  <br /><br />
                  The <strong>Magic Circle Aura</strong> protection has ended for{' '}
                  {magicCircleModalData.sorcererOwner === gameState?.currentPlayer ? 'your' : "the opponent's"}{' '}
                  Goblin faction creatures.
                </Alert>
              )}

              {magicCircleModalData.deactivated && magicCircleModalData.reason === 'death' && (
                <Alert variant="danger" style={{ backgroundColor: '#4a1a1a', border: 'none', color: 'white' }}>
                  <strong>{magicCircleModalData.sorcererName}</strong> was destroyed while on the Magic Circle!
                  <br /><br />
                  The <strong>Magic Circle Aura</strong> protection has ended immediately for{' '}
                  {magicCircleModalData.sorcererOwner === gameState?.currentPlayer ? 'your' : "the opponent's"}{' '}
                  Goblin faction creatures.
                </Alert>
              )}

              {magicCircleModalData.reason?.startsWith('ai_') && (
                <Alert variant="info" style={{ backgroundColor: '#1a4a6e', border: 'none', color: 'white' }}>
                  <strong>Opponent's {magicCircleModalData.sorcererName}</strong>{' '}
                  {magicCircleModalData.activated ? 'entered' : 'left'} a Magic Circle!
                  <br /><br />
                  {magicCircleModalData.activated ? (
                    <>
                      All enemy <strong>Goblins, Hobgoblins, and Bugbears</strong> now have:
                      <br />
                      <span style={{ color: '#9932cc', fontWeight: 'bold' }}>
                        "Prevent 10 damage from 1 source" (once per turn)
                      </span>
                    </>
                  ) : (
                    <>
                      The enemy's <strong>Magic Circle Aura</strong> protection has ended.
                    </>
                  )}
                </Alert>
              )}

              {/* Human player moved Sorcerer - notification for OTHER human players */}
              {magicCircleModalData.reason?.startsWith('human_') && (
                <Alert variant="info" style={{ backgroundColor: '#1a4a6e', border: 'none', color: 'white' }}>
                  <strong>{magicCircleModalData.sorcererOwner === gameState?.currentPlayer ? 'Your' : "Opponent's"} {magicCircleModalData.sorcererName}</strong>{' '}
                  {magicCircleModalData.activated ? 'entered' : 'left'} a Magic Circle!
                  <br /><br />
                  {magicCircleModalData.activated ? (
                    <>
                      All {magicCircleModalData.sorcererOwner === gameState?.currentPlayer ? '' : 'enemy '}<strong>Goblins, Hobgoblins, and Bugbears</strong> now have:
                      <br />
                      <span style={{ color: '#9932cc', fontWeight: 'bold' }}>
                        "Prevent 10 damage from 1 source" (once per turn)
                      </span>
                    </>
                  ) : (
                    <>
                      The {magicCircleModalData.sorcererOwner === gameState?.currentPlayer ? '' : "enemy's "}<strong>Magic Circle Aura</strong> protection has ended.
                    </>
                  )}
                </Alert>
              )}

              {/* Ability Description */}
              <div style={{
                backgroundColor: '#1a1d21',
                padding: '12px 15px',
                borderRadius: '8px',
                marginTop: '15px',
                fontSize: '0.9em',
                color: '#aaa'
              }}>
                <strong style={{ color: '#9932cc' }}>Magic Circle Aura:</strong> While the Hobgoblin Sorcerer is on a Magic Circle,
                all Goblins, Hobgoblins, and Bugbears controlled by the same player can prevent 10 damage from a single attack once per turn.
                This shield refreshes at the start of each turn.
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
          <Button variant="primary" onClick={() => setShowMagicCircleModal(false)} size="lg">
            Understood
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default GameBoard
