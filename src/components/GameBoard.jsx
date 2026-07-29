import { useState, useEffect, useMemo, useCallback } from 'react'
import { Alert } from 'react-bootstrap'
import { GameState, GamePhases, Players } from '../models/gameState'
import { Creature, CreatureInstance } from '../models/creatures'
import { Commander } from '../models/commanders'
import { OrderCard } from '../models/orders'
import { Factions, commanders, sampleCreatures, sampleOrderCards } from '../data/factions'
import BoardGridArea from './BoardGridArea'
import PlayerPanelSidebar from './PlayerPanelSidebar'
import FactionSelector from './FactionSelector'
import CommanderSelector from './CommanderSelector'
import SimpleAI from '../ai/simpleAI'
// Import custom hooks for state management
import {
  useNotifications,
  useSelection,
  useCombat,
  useAbilityModals,
  useAITurn,
  useDeployment,
} from '../hooks'
import { useChargeAttack } from '../hooks/useChargeAttack'
import { useShiftAttack } from '../hooks/useShiftAttack'
import { useLightningBreath } from '../hooks/useLightningBreath'
import { useConfusionGaze } from '../hooks/useConfusionGaze'
import { useSlam } from '../hooks/useSlam'
import { useRider } from '../hooks/useRider'
import { useRangedSplashDefense } from '../hooks/useRangedSplashDefense'
import { useFlashingBlades } from '../hooks/useFlashingBlades'
import { useHiddenBlade } from '../hooks/useHiddenBlade'
import GameBoardModals from './GameBoardModals'
import { clearDebugLog, logger } from '../utils/logger'
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
        wordWrap: 'break-word',
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
    selectedTile,
    setSelectedTile,
    selectedCreatureIndex,
    setSelectedCreatureIndex,
    selectedOrderIndex,
    setSelectedOrderIndex,
    selectedBoardCreature,
    setSelectedBoardCreature,
    validMoveTiles,
    setValidMoveTiles,
    validAttackTargets,
    setValidAttackTargets,
    lineOfSightPath,
    setLineOfSightPath,
    rangedRangeTiles,
    setRangedRangeTiles,
    creatureViewMode,
    setCreatureViewMode,
    draggingCreatureIndex,
    setDraggingCreatureIndex,
    dragOverTile,
    setDragOverTile,
    factionHighlight,
    setFactionHighlight,
    clearBoardSelection,
    clearDragState,
  } = useSelection()

  // Combat state hook - handles pending attacks, defense, move confirmation
  const {
    pendingAttack,
    setPendingAttack,
    combatPanelMode,
    setCombatPanelMode,
    combatHighlightCreatures,
    setCombatHighlightCreatures,
    showMoveConfirm,
    setShowMoveConfirm,
    pendingMove,
    setPendingMove,
    pendingRightClickAttack,
    setPendingRightClickAttack,
    pendingAIActions,
    setPendingAIActions,
    processingAIAction,
    setProcessingAIAction,
    closeCombatPanel,
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
    isLogExpanded,
    setIsLogExpanded,
    addToast,
    removeToast,
    clearOldLogs,
  } = useNotifications({
    getCurrentTurnNumber: () => gameState?.turnNumber || 1,
    isCurrentPlayerHuman: isCurrentPlayerHumanCheck,
  })

  // Ability modal state hook - handles all ability-related modal states
  const {
    // Flashing Blades
    showFlashingBladesModal,
    setShowFlashingBladesModal,
    flashingBladesPending,
    setFlashingBladesPending,
    flashingBladesTargetMode,
    setFlashingBladesTargetMode,
    clearFlashingBladesState,
    // Hidden Blade
    showHiddenBladeModal,
    setShowHiddenBladeModal,
    hiddenBladePending,
    setHiddenBladePending,
    hiddenBladeTargetMode,
    setHiddenBladeTargetMode,
    clearHiddenBladeState,
    // Confusion Gaze
    showConfusionGazeModal,
    setShowConfusionGazeModal,
    confusionGazeMode,
    setConfusionGazeMode,
    confusionGazePending,
    setConfusionGazePending,
    clearConfusionGazeState,
    // Slam
    slamMode,
    setSlamMode,
    slamPending,
    setSlamPending,
    slamValidTiles,
    setSlamValidTiles,
    showSlamModal,
    setShowSlamModal,
    showSlamConfirmModal,
    setShowSlamConfirmModal,
    slamSelectedTile,
    setSlamSelectedTile,
    clearSlamState,
    // Tomb Guardian Splash
    pendingSplashAttacks,
    setPendingSplashAttacks,
    currentSplashIndex,
    setCurrentSplashIndex,
    splashResults,
    setSplashResults,
    clearSplashState,
    // Lightning Breath
    lightningBreathMode,
    setLightningBreathMode,
    lightningBreathAttacker,
    setLightningBreathAttacker,
    lightningBreathTargets,
    setLightningBreathTargets,
    lightningBreathValidTargets,
    setLightningBreathValidTargets,
    lightningBreathCurrentAttackIndex,
    setLightningBreathCurrentAttackIndex,
    lightningBreathResults,
    setLightningBreathResults,
    lightningBreathDamageBoostCard,
    setLightningBreathDamageBoostCard,
    lightningBreathDamageBoostBonus,
    setLightningBreathDamageBoostBonus,
    clearLightningBreathState,
    // Disciple of Kyuss
    showDamageNotification,
    setShowDamageNotification,
    damageNotificationData,
    setDamageNotificationData,
    pendingPhaseAdvance,
    setPendingPhaseAdvance,
    // Insubstantial
    showInsubstantialModal,
    setShowInsubstantialModal,
    insubstantialData,
    setInsubstantialData,
    // Rider
    showRiderModal,
    setShowRiderModal,
    riderData,
    setRiderData,
    pendingRiderCallback,
    setPendingRiderCallback,
    selectedRiderCreature,
    setSelectedRiderCreature,
    clearRiderState,
    // Magic Circle Aura
    showMagicCircleModal,
    setShowMagicCircleModal,
    magicCircleModalData,
    setMagicCircleModalData,
    pendingMagicCircleNotifications,
    setPendingMagicCircleNotifications,
    // Ranged Splash
    pendingRangedSplashTargets,
    setPendingRangedSplashTargets,
    currentRangedSplashIndex,
    setCurrentRangedSplashIndex,
    rangedSplashAttackInfo,
    setRangedSplashAttackInfo,
    showRangedSplashDefensePanel,
    setShowRangedSplashDefensePanel,
    clearRangedSplashState,
    // Healing Touch
    showHealingTouchModal,
    setShowHealingTouchModal,
    healingTouchData,
    setHealingTouchData,
    // Chieftain Call
    showChieftainCallModal,
    setShowChieftainCallModal,
    chieftainCallData,
    setChieftainCallData,
    // Ogre Deploy Morale
    showOgreDeployMoraleModal,
    setShowOgreDeployMoraleModal,
    ogreDeployMoraleData,
    setOgreDeployMoraleData,
    // Cleric Draw Order
    showClericDrawOrderModal,
    setShowClericDrawOrderModal,
    clericDrawOrderData,
    setClericDrawOrderData,
    // Web Removal
    showWebRemovalModal,
    setShowWebRemovalModal,
    webRemovalData,
    setWebRemovalData,
    // Cards Drawn
    showCardsDrawnModal,
    setShowCardsDrawnModal,
    cardsDrawnData,
    setCardsDrawnData,
    bonusDrawSources,
    setBonusDrawSources,
    // Recoil Draw (opponent card draw side effect)
    showRecoilDrawModal,
    setShowRecoilDrawModal,
    recoilDrawnCards,
    setRecoilDrawnCards,
    recoilSourceCardName,
    setRecoilSourceCardName,
    // Faction Select (Recoil target selection with 3+ factions)
    showFactionSelectModal,
    setShowFactionSelectModal,
    factionSelectConfig,
    setFactionSelectConfig,
    // Shift After Defense (Cloud of Bats)
    showShiftDecisionModal,
    setShowShiftDecisionModal,
    pendingShiftAfterDefense,
    setPendingShiftAfterDefense,
    shiftSelectionMode,
    setShiftSelectionMode,
    shiftValidTiles,
    setShiftValidTiles,
    // Counter-Attack Target Selection (Seize the Opportunity)
    showCounterAttackTargetModal,
    setShowCounterAttackTargetModal,
    counterAttackPending,
    setCounterAttackPending,
    // Patch Up Heal (proactive healing during ACTIVATE)
    showPatchUpHealModal,
    setShowPatchUpHealModal,
    patchUpHealConfig,
    setPatchUpHealConfig,
    // Morale Loss Notification (Unexpected Resistance)
    showMoraleLossModal,
    setShowMoraleLossModal,
    moraleLossModalData,
    setMoraleLossModalData,
    // Savage Demise (self-sacrifice attack)
    savageDemisePending,
    setSavageDemisePending,
    clearSavageDemiseState,
    // Tough as Nails (proactive use during ACTIVATE)
    showToughAsNailsModal,
    setShowToughAsNailsModal,
    toughAsNailsConfig,
    setToughAsNailsConfig,
    // Damage Boost Cards (Power Attack, Hacking Frenzy, Killing Strike)
    showDamageBoostModal,
    setShowDamageBoostModal,
    damageBoostConfig,
    setDamageBoostConfig,
    pendingDamageBoostAttack,
    setPendingDamageBoostAttack,
    clearDamageBoostState,
    // Shift + Attack Cards (Nimble Strike, Spring Attack, Shadowy Ambush)
    showShiftAttackModal,
    setShowShiftAttackModal,
    shiftAttackConfig,
    setShiftAttackConfig,
    pendingShiftAttack,
    setPendingShiftAttack,
    shiftAttackMode,
    setShiftAttackMode,
    shiftAttackValidTiles,
    setShiftAttackValidTiles,
    clearShiftAttackState,
    // Charge Cards (move + melee attack with bonus damage)
    showChargeModal,
    setShowChargeModal,
    chargeConfig,
    setChargeConfig,
    pendingChargeAttack,
    setPendingChargeAttack,
    chargeMode,
    setChargeMode,
    chargeValidTiles,
    setChargeValidTiles,
    clearChargeState,
    // Harmful Attachments Notification (Deep Wound, Web, Mortal Wound, Shattered Weapon)
    showHarmfulAttachmentsModal,
    setShowHarmfulAttachmentsModal,
    harmfulAttachmentsData,
    setHarmfulAttachmentsData,
    // Clear all
    clearAllAbilityModalState,
  } = useAbilityModals()

  // AI Turn state hook - handles AI thinking, death queue, and notifications
  const {
    isAIThinking,
    setIsAIThinking,
    startAiThinking,
    endAiThinking,
    aiDeathQueue,
    setAiDeathQueue,
    showAiDeathModal,
    setShowAiDeathModal,
    currentAiDeath,
    setCurrentAiDeath,
    queueAiDeath,
    showNextAiDeath,
    acknowledgeAiDeath,
    clearAiDeathQueue,
    hasQueuedDeaths,
    aiCurrentAction,
    setAiCurrentAction,
    clearAllAiTurnState,
  } = useAITurn()

  // Deployment state hook - handles deploy confirmation and graveyard deployment
  const {
    showDeployConfirm,
    setShowDeployConfirm,
    pendingDeployment,
    setPendingDeployment,
    startDeployConfirmation,
    cancelDeployConfirmation,
    clearDeployConfirmation,
    selectedGraveyardCreature,
    setSelectedGraveyardCreature,
    selectedGraveyardIndex,
    setSelectedGraveyardIndex,
    draggingFromGraveyard,
    setDraggingFromGraveyard,
    selectGraveyardCreature,
    clearGraveyardSelection,
    startGraveyardDrag,
    endGraveyardDrag,
    showHordeModal,
    setShowHordeModal,
    hordeRefreshExecuted,
    setHordeRefreshExecuted,
    clearHordeState,
    clearAllDeploymentState,
  } = useDeployment()

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

  // CHARGE card handlers (Phase STD-5) - extracted hook, mode/pending state above stays in useAbilityModals
  const { confirmCharge, cancelCharge, handleChargeTileClick } = useChargeAttack({
    gameState,
    addToast,
    chargeConfig,
    setShowChargeModal,
    setChargeConfig,
    pendingChargeAttack,
    setPendingChargeAttack,
    chargeValidTiles,
    setChargeValidTiles,
    setChargeMode,
    clearChargeState,
    setSelectedBoardCreature,
    setValidMoveTiles,
    setValidAttackTargets,
    validAttackTargets,
    setPendingRightClickAttack,
    setPendingAttack,
    setCombatPanelMode,
    setCombatHighlightCreatures,
    setRenderCounter,
  })

  // SHIFT + ATTACK card handlers (Nimble Strike, Spring Attack, Shadowy Ambush) - extracted hook
  const { confirmShiftAttack, cancelShiftAttack, handleShiftAttackTileClick } = useShiftAttack({
    gameState,
    addToast,
    isPlayerHuman,
    shiftAttackConfig,
    setShowShiftAttackModal,
    setShiftAttackConfig,
    pendingShiftAttack,
    setPendingShiftAttack,
    shiftAttackValidTiles,
    setShiftAttackValidTiles,
    setShiftAttackMode,
    clearShiftAttackState,
    setSelectedBoardCreature,
    setValidMoveTiles,
    setValidAttackTargets,
    validAttackTargets,
    setPendingRightClickAttack,
    setCombatPanelMode,
    setCombatHighlightCreatures,
    setHiddenBladePending,
    setShowHiddenBladeModal,
    setRenderCounter,
  })

  // SLAM ability handlers (Earth Guardian) - extracted hook
  const {
    handleSlamSkip,
    handleSlamAccept,
    handleSlamTileSelect,
    handleSlamConfirmCancel,
    handleSlamConfirmExecute,
    handleAISlamDecision,
  } = useSlam({
    gameState,
    gameConfig,
    addToast,
    slamMode,
    slamPending,
    setSlamPending,
    setShowSlamModal,
    setSlamMode,
    slamValidTiles,
    setSlamValidTiles,
    slamSelectedTile,
    setSlamSelectedTile,
    setShowSlamConfirmModal,
    setAiDeathQueue,
    setRenderCounter,
  })

  // RIDER ability handlers (Skeletal Lancer / Tyranny of Goblins equivalent) - extracted hook
  const { handleRiderSelect, handleRiderDecline, handleAIRiderDecision } = useRider({
    gameState,
    addToast,
    riderData,
    setShowRiderModal,
    setRiderData,
    setSelectedRiderCreature,
    pendingRiderCallback,
    setPendingRiderCallback,
    setRenderCounter,
  })

  // RANGED SPLASH damage handlers (ACID BREATH / EXPLOSIVE BOLTS) + Savage Demise resolution - extracted hook
  const {
    handleRangedSplashDefenseSelected,
    handleSavageDemiseResolution,
    handleRangedSplashDefenseComplete,
    handleAIRangedSplashDefense,
    checkAndProcessRangedSplash,
  } = useRangedSplashDefense({
    gameState,
    gameConfig,
    addToast,
    isPlayerHuman,
    handleOpponentDrawEffect,
    closeCombatPanel,
    pendingAttack,
    setPendingAttack,
    rangedSplashAttackInfo,
    setRangedSplashAttackInfo,
    pendingRangedSplashTargets,
    setPendingRangedSplashTargets,
    currentRangedSplashIndex,
    setCurrentRangedSplashIndex,
    setShowRangedSplashDefensePanel,
    setCombatPanelMode,
    savageDemisePending,
    clearSavageDemiseState,
    setRenderCounter,
  })

  // Alias healingTouchData fields to match existing variable names
  const healingTouchHealer = healingTouchData?.healer || null
  const healingTouchTarget = healingTouchData?.target || null
  // Alias chieftainCallData to match existing variable name
  const chieftainCallPending = chieftainCallData
  const setChieftainCallPending = setChieftainCallData
  // Alias ogreDeployMoraleData to match existing variable name
  const ogreDeployMoraleResult = ogreDeployMoraleData
  const setOgreDeployMoraleResult = setOgreDeployMoraleData
  // Alias clericDrawOrderData to match existing variable name
  const clericDrawOrderResult = clericDrawOrderData
  const setClericDrawOrderResult = setClericDrawOrderData
  // Alias webRemovalData to match existing variable name
  const webRemovalCreature = webRemovalData
  const setWebRemovalCreature = setWebRemovalData

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
    [Factions.STING_OF_LOLTH]: '#8b008b', // Purple
    [Factions.HEART_OF_CORMYR]: '#0066cc', // Blue
    [Factions.TYRANNY_OF_GOBLINS]: '#cc0000', // Red
    [Factions.CURSE_OF_UNDEATH]: '#00bcd4', // Cyan
    [Factions.BLOOD_OF_GRUUMSH]: '#8b4513', // Brown
  }

  /**
   * Create mapping of player IDs to their faction colors
   * Used to dynamically color starting zones
   */
  const playerFactionColors = useMemo(() => {
    if (!gameConfig || !gameState) return {}

    const colorMap = {}
    gameState.activePlayers.forEach((playerId) => {
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
    gameState.activePlayers.forEach((playerId) => {
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
        commanderName: player.commander?.name,
      }))
  }

  /**
   * AI target selection for Recoil: 75% chance non-attacker, 25% attacker
   * @param {Array} eligibleFactions - Array of eligible faction options
   * @param {string} attackerPlayerId - Player ID of the attacker
   * @returns {string} Selected player ID
   */
  const selectAIRecoilTarget = (eligibleFactions, attackerPlayerId) => {
    const nonAttackerFactions = eligibleFactions.filter((f) => f.playerId !== attackerPlayerId)
    if (nonAttackerFactions.length > 0 && Math.random() < 0.75) {
      // Pick random non-attacker (75% chance)
      return nonAttackerFactions[Math.floor(Math.random() * nonAttackerFactions.length)].playerId
    }
    // Give to attacker (25% chance, or if no non-attackers available)
    const attackerFaction = eligibleFactions.find((f) => f.playerId === attackerPlayerId)
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
        pendingDrawInfo: { cardCount, sourceName: cardName, defenderPlayerId, attackerPlayerId },
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
      addToast(
        `${defenderPlayer.commander?.name || 'Player'} chose to give ${targetPlayer.commander?.name || 'opponent'} 1 card from ${cardName}`
      )
    } else {
      addToast(
        `${targetPlayer.commander?.name || 'Opponent'}'s deck is empty - no cards to draw from ${cardName}`
      )
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
  const handleMoraleLossEffect = (
    moraleTarget,
    cardName,
    defenderPlayerId,
    attackerPlayerId,
    moraleLoss = 1
  ) => {
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
    addToast(
      `${defenderName} used ${cardName} - ${targetPlayerName} loses ${moraleLoss} morale (${targetCreatureName} was adjacent)`
    )

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
        wasDefeated,
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
        source: defenderPlayerId,
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
        reason: entered ? 'entered' : 'left',
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
            timestamp: timestamp,
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
            timestamp: timestamp,
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
        reason: notification.reason,
      })
      setShowMagicCircleModal(true)

      // Mark as acknowledged so it only shows once
      setPendingMagicCircleNotifications((prev) => ({
        ...prev,
        [currentPlayer]: { ...prev[currentPlayer], acknowledged: true },
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
            reason: 'death',
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
      wasDefeated: player.morale <= 0,
    })
    setShowMoraleLossModal(true)

    // Remove from pending (shift array)
    player.pendingMoraleNotifications.shift()
  }

  /**
   * Check for harmful attachments on the current player's creatures
   * Shows modal to inform player about Deep Wound damage, Web movement blocks, etc.
   * Called at ACTIVATE phase start after CardsDrawnModal closes
   */
  const checkHarmfulAttachments = () => {
    if (!gameState?.currentPlayer) return false
    if (!isPlayerHuman(gameState.currentPlayer)) return false

    const harmfulEffects = gameState.getHarmfulAttachments(gameState.currentPlayer)
    const hasHarmfulEffects =
      harmfulEffects.damageEffects.length > 0 ||
      harmfulEffects.movementBlocked.length > 0 ||
      harmfulEffects.pendingDeath.length > 0 ||
      harmfulEffects.damagePenalty.length > 0

    if (hasHarmfulEffects) {
      setHarmfulAttachmentsData(harmfulEffects)
      setShowHarmfulAttachmentsModal(true)
      return true
    }
    return false
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
    // Clear debug log for new game session
    clearDebugLog()

    // Log game start with configuration
    logger.gameEvent('Game started', {
      numPlayers: config.numPlayers || 2,
      player1: { faction: config.player1?.faction, commander: config.player1?.commander?.name },
      player2: { faction: config.player2?.faction, commander: config.player2?.commander?.name },
    })

    // Store the final game configuration (with commanders selected)
    setGameConfig(config)

    // Create 12 unique creature cards (one of each)
    const createCreatureDeck = (faction) => {
      return sampleCreatures[faction].map((c) => new Creature(c))
    }

    // Create 36 order cards (one of each unique order card #1-#36)
    const createOrderDeck = (faction) => {
      const deck = sampleOrderCards[faction].map((o) => new OrderCard(o))
      return deck
    }

    // Build player setups dynamically based on number of players
    const playerSetups = []
    const playerIds = [
      Players.PLAYER1,
      Players.PLAYER2,
      Players.PLAYER3,
      Players.PLAYER4,
      Players.PLAYER5,
    ]

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
        aiDifficulty: config[playerKey].aiDifficulty,
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
          // Check if creature has any removable attachment (Web, Leap Away, etc.) - show Removal Modal
          const removableAttachments = gameState.getRemovableAttachments
            ? gameState.getRemovableAttachments(tile.occupant)
            : []

          if (removableAttachments.length > 0) {
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
    const targets = gameState
      .getValidAttackTargets(creatureInstance)
      .filter((target) => gameState.activePlayers.includes(target.creature.owner))
    setValidAttackTargets(targets)

    // Calculate line-of-sight paths for ranged attacks
    const losPath = []
    targets.forEach((targetInfo) => {
      if (targetInfo.attackType === 'ranged') {
        // Get line tiles for this ranged attack
        const lineTiles = gameState.getLineTiles(
          creatureInstance.position,
          targetInfo.creature.position
        )
        // Add all tiles in the line to the path (for visualization)
        lineTiles.forEach((pos) => {
          // Skip attacker and target positions
          if (
            (pos.x === creatureInstance.position.x && pos.y === creatureInstance.position.y) ||
            (pos.x === targetInfo.creature.position.x && pos.y === targetInfo.creature.position.y)
          ) {
            return
          }
          // Add to path if not already there
          if (!losPath.some((p) => p.x === pos.x && p.y === pos.y)) {
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
      setRenderCounter((prev) => prev + 1)
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
            tile: tile,
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
    setRenderCounter((prev) => prev + 1)
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
      addToast(
        `${defenderInstance.creature.name} was just deployed and is protected until next turn!`
      )
      return
    }

    // Check if target is in range
    const targets = gameState.getValidAttackTargets(attackerInstance)
    const targetInfo = targets.find((t) => t.creature.instanceId === defenderInstance.instanceId)

    // Check if this attack has a pending damage boost card
    let damageBoostCard = null
    let damageBoostBonus = 0
    let damageBoostFlat = null
    let isShiftAttack = false
    let hasPostAttackShift = false
    let postAttackShiftDistance = 0

    if (
      pendingDamageBoostAttack &&
      pendingDamageBoostAttack.creature?.instanceId === attackerInstance.instanceId
    ) {
      // Verify the attack type matches the damage boost card type
      const isRangedBoost = pendingDamageBoostAttack.isRanged
      const expectedAttackType = isRangedBoost ? 'ranged' : 'melee'
      if (targetInfo && targetInfo.attackType !== expectedAttackType) {
        addToast(`This damage boost card only works with ${expectedAttackType} attacks!`)
        return
      }

      damageBoostCard = pendingDamageBoostAttack.card
      damageBoostBonus = pendingDamageBoostAttack.damageBonus || 0
      damageBoostFlat = pendingDamageBoostAttack.flatDamage
    }

    // Check if this is a shift+attack (Nimble Strike, Spring Attack, Shadowy Ambush)
    if (
      pendingShiftAttack &&
      pendingShiftAttack.creature?.instanceId === attackerInstance.instanceId &&
      pendingShiftAttack.phase === 'attacking'
    ) {
      const card = pendingShiftAttack.card
      damageBoostCard = card
      isShiftAttack = true
      hasPostAttackShift = card.shiftAfterAttack > 0
      postAttackShiftDistance = card.shiftAfterAttack

      // Calculate damage bonus based on attack type
      if (targetInfo.attackType === 'melee') {
        if (card.flatMeleeDamage !== null && card.flatMeleeDamage !== undefined) {
          damageBoostFlat = card.flatMeleeDamage
        } else {
          damageBoostBonus = card.meleeDamageBonus || 0
        }
      } else {
        damageBoostBonus = card.rangedDamageBonus || 0
      }
    }

    if (!targetInfo) {
      addToast('Target is out of range!')
      return
    }

    // Calculate incoming damage for INSUBSTANTIAL check
    const incomingDamageForCheck =
      targetInfo.attackType === 'melee'
        ? attackerInstance.creature.meleeAttack?.damage || 0
        : attackerInstance.creature.rangedAttack?.damage || 0

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(
        defenderInstance,
        incomingDamageForCheck,
        attackerInstance.owner
      )
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, incomingDamageForCheck, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(
            `👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${incomingDamageForCheck} damage! Ability used until next Undead Refresh.`
          )
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
        setRenderCounter((prev) => prev + 1)
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
        targetInfo,
        // Damage boost card info (if active)
        damageBoostCard,
        damageBoostBonus,
        damageBoostFlat,
        // Shift+attack info (for post-attack shift)
        isShiftAttack,
        hasPostAttackShift,
        postAttackShiftDistance,
      })
      // Set combat panel to defense mode with creature highlights
      setCombatPanelMode('defense')
      setCombatHighlightCreatures({
        attacker: attackerInstance.instanceId,
        defender: defenderInstance.instanceId,
      })
    } else {
      // Defender is AI - use AI logic to decide on reactions and defensive abilities
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      // Calculate incoming damage for defensive decisions (accounting for damage boost cards)
      let incomingDamage
      if (damageBoostFlat !== null) {
        // Flat damage replaces base damage
        incomingDamage = damageBoostFlat
      } else if (damageBoostBonus > 0) {
        // Bonus damage adds to base
        incomingDamage = (attackerInstance.creature.meleeAttack?.damage || 0) + damageBoostBonus
      } else {
        // No damage boost - normal calculation
        incomingDamage =
          targetInfo.attackType === 'melee'
            ? attackerInstance.creature.meleeAttack?.damage || 0
            : attackerInstance.creature.rangedAttack?.damage || 0
      }

      // AI decides whether to use defensive abilities (COWER, UNSTOPPABLE HORDES, or IMMEDIATE cards)
      const defenseDecision = defenderAI.decideDefense(
        defenderInstance,
        incomingDamage,
        attackerInstance.owner
      )
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(
          defenderInstance,
          incomingDamage,
          attackerInstance.owner
        )
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
            creaturesUsed,
          }
        }
      } else if (defenseDecision.type === 'immediate_card') {
        // Apply IMMEDIATE card defense
        const result = gameState.applyImmediateCardDefense(
          defenseDecision.card,
          defenseDecision.creature
        )
        if (result.success) {
          defenseResult = {
            success: true,
            type: 'immediate_card',
            damagePrevented: result.damagePrevented,
            moraleCost: result.moraleCost || 0,
            cardUsed: defenseDecision.card.name,
            creatureTapped: defenseDecision.creature.creature.name,
            moraleGain: result.moraleGain || 0,
            untapAfterUse: result.untapAfterUse || false,
          }

          // Handle opponent draws (Recoil) - defender chooses which opponent receives card
          if (result.opponentDrawsCards > 0) {
            const cardName = result.cardUsed?.name || defenseDecision.card.name
            handleOpponentDrawEffect(
              result.opponentDrawsCards,
              cardName,
              defenderInstance.owner,
              attackerInstance.owner
            )
          }
        }
      }

      // Process AI reactions (IMMEDIATE cards) - legacy handling
      if (reactionDecision.reactions.length > 0) {
        const defenderPlayer = gameState.players[defenderPlayerId]

        // Sort by cardIndex descending to prevent array shift issues
        reactionDecision.reactions.sort((a, b) => b.cardIndex - a.cardIndex)

        reactionDecision.reactions.forEach((reaction) => {
          // Tap creature
          reaction.creature.isTapped = true
          // Discard card
          defenderPlayer.orderHand.splice(reaction.cardIndex, 1)
        })
      }

      // Discard damage boost card from hand before executing attack (card is committed at this point)
      if (damageBoostCard && pendingDamageBoostAttack) {
        const attackerPlayer = gameState.players[attackerInstance.owner]
        const cardIndex = attackerPlayer.orderHand.findIndex((c) => c.id === damageBoostCard.id)
        if (cardIndex !== -1) {
          attackerPlayer.orderHand.splice(cardIndex, 1)
        }
        // Clear pending damage boost state
        clearDamageBoostState()
      }

      // Execute attack immediately for AI defender (with or without defense)
      // Pass damage boost info to executeAttack - CombatResolver will handle the bonus
      let result
      if (defenseResult && defenseResult.success) {
        result = gameState.executeAttackWithDefense(
          attackerInstance,
          defenderInstance,
          targetInfo.attackType,
          defenseResult.damagePrevented,
          defenseResult.type,
          damageBoostBonus,
          damageBoostFlat
        )
      } else {
        result = gameState.executeAttack(
          attackerInstance,
          defenderInstance,
          targetInfo.attackType,
          damageBoostBonus,
          damageBoostFlat
        )
      }

      if (result.success) {
        let message = ''

        // Add damage boost info to message
        if (damageBoostCard) {
          const damageText =
            damageBoostFlat !== null ? `${damageBoostFlat} damage` : `+${damageBoostBonus} bonus`
          message += `⚔️ ${damageBoostCard.name} (${damageText})! `
        }

        // Add defense info to message
        if (defenseResult && defenseResult.success) {
          if (defenseResult.type === 'cower') {
            message += `🛡️ AI used COWER: ${defenseResult.damagePrevented} damage avoided (cost ${defenseResult.moraleCost} morale)! `
          } else if (defenseResult.type === 'unstoppable_hordes') {
            message += `💀 AI used UNSTOPPABLE HORDES: ${defenseResult.damagePrevented} damage prevented (${defenseResult.creaturesUsed.length} Undead, cost ${defenseResult.moraleCost} morale)! `
          } else if (defenseResult.type === 'immediate_card') {
            let extraEffects = ''
            if (defenseResult.moraleGain > 0)
              extraEffects += ` +${defenseResult.moraleGain} morale!`
            if (defenseResult.untapAfterUse)
              extraEffects += ` ${defenseResult.creatureTapped} untapped!`
            if (defenseResult.bonusDrawsQueued > 0)
              extraEffects += ` Drew ${defenseResult.bonusDrawsQueued} card${defenseResult.bonusDrawsQueued > 1 ? 's' : ''}.`
            message += `⚡ AI used ${defenseResult.cardUsed}: ${defenseResult.damagePrevented} damage prevented${defenseResult.untapAfterUse ? '' : ` (${defenseResult.creatureTapped} tapped)`}!${extraEffects} `
          }
        }

        // Add reaction info to message
        if (reactionDecision.reactions.length > 0) {
          message += `⚡ AI used ${reactionDecision.reactions.length} Immediate card${reactionDecision.reactions.length !== 1 ? 's' : ''}! `
        }

        message +=
          `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
          `with ${targetInfo.attackType} for ${result.damage} damage!`

        if (result.destroyed) {
          message += ` ${defenderInstance.creature.name} was destroyed! `
          message +=
            `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
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
          addToast(
            `⚔️ UNTAP ON KILL: ${result.untapOnKillData.bugbearName} untaps and can act again!`
          )
        }

        addToast(message)

        // Check for game over
        gameState.checkGameOver()

        // Check for FLASHING BLADES trigger (human attacker vs AI defender)
        if (
          checkFlashingBladesTrigger(
            attackerInstance,
            defenderInstance,
            result,
            targetInfo.attackType
          )
        ) {
          // Modal shown - don't clear state yet, wait for modal response
          // BUT we DO need to trigger a re-render to show destroyed creature being removed
          setRenderCounter((prev) => prev + 1)
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
            setRenderCounter((prev) => prev + 1)
          })
          if (hasSplash) {
            // Splash is being processed - don't clear state yet
            setRenderCounter((prev) => prev + 1)
            return
          }
        }
      } else {
        addToast(result.message || 'Attack failed!')
      }

      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter((prev) => prev + 1)
    }
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

    const { attackerInstance, defenderInstance, targetInfo, isSplashDamage, isLightningBreath } =
      pendingAttack

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

    // Get damage boost info from pendingAttack
    const { damageBoostBonus, damageBoostFlat } = pendingAttack

    // Calculate original incoming damage
    // For FLASHING BLADES, damage is always 10
    // For damage boost cards: flat damage (Killing Strike) replaces base, bonus adds to base
    let originalDamage
    if (targetInfo.attackType === 'flashing_blades') {
      originalDamage = 10
    } else if (damageBoostFlat !== null && damageBoostFlat !== undefined) {
      // Flat damage from Killing Strike - replaces base damage entirely
      originalDamage = damageBoostFlat
    } else {
      // Normal damage calculation + any bonus from damage boost cards
      const baseDamage =
        targetInfo.attackType === 'melee'
          ? attackerInstance.creature.meleeAttack?.damage || 0
          : attackerInstance.creature.rangedAttack?.damage || 0
      const bonus = damageBoostBonus || 0
      originalDamage = baseDamage + bonus
    }

    if (defense.type === 'skip') {
      // No more defense - execute attack with accumulated reduction
      logger.defense('Defense skipped', {
        defender: defenderInstance.creature.name,
        accumulatedReduction,
        isHiddenBlade: pendingAttack?.isHiddenBlade,
        attackType: targetInfo?.attackType,
      })
      closeCombatPanel()
      if (accumulatedReduction > 0) {
        executeAttackAfterDefense({
          type: 'stacked_defense',
          damageReduction: accumulatedReduction,
          moraleCost: 0,
          success: true,
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

      logger.defense('COWER used', {
        defender: defenderInstance.creature.name,
        damageAvoided: cowerResult.damageAvoided,
        moraleCost: cowerResult.moraleCost,
        extraCost: cowerResult.extraCost,
      })

      closeCombatPanel()
      executeAttackAfterDefense({
        type: 'cower',
        damageReduction: cowerResult.damageAvoided,
        moraleCost: cowerResult.moraleCost,
        extraCost: cowerResult.extraCost,
        success: cowerResult.success,
      })
    } else if (defense.type === 'unstoppable_hordes') {
      // UNSTOPPABLE HORDES: Apply for each selected Undead creature
      let totalDamageReduction = 0
      let totalMoraleCost = 0
      const tappedCreatures = []

      // Apply for each selected creature - O(c) where c = creatures selected (max 9)
      defense.creatures.forEach((creature) => {
        const result = gameState.applyUnstoppableHordes(creature)
        if (result.success) {
          totalDamageReduction += result.damagePrevented
          totalMoraleCost += result.moraleCost
          tappedCreatures.push(creature.creature.name)
        }
      })

      logger.defense('UNSTOPPABLE HORDES used', {
        defender: defenderInstance.creature.name,
        totalDamageReduction,
        totalMoraleCost,
        tappedCreatures,
      })

      closeCombatPanel()
      executeAttackAfterDefense({
        type: 'unstoppable_hordes',
        damageReduction: totalDamageReduction + accumulatedReduction,
        moraleCost: totalMoraleCost,
        tappedCreatures,
        success: totalDamageReduction > 0,
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
        const cardIndex = defenderPlayer.orderHand.findIndex((c) => c.id === defense.card.id)
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
        addToast(
          `⚔️ SAVAGE DEMISE: ${sacrificeUser.creature.name} sacrifices itself to attack ${sacrificeTarget.creature.name}!`
        )

        // === EXECUTE SAVAGE DEMISE ATTACK (no defense - target is tapped) ===
        const savageDemiseResult = gameState.applySavageDemiseDamage(
          sacrificeTarget,
          sacrificeUser.owner,
          attackDamage,
          0
        )

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
          const deathStrikeResult = gameState.applySavageDemiseDamage(
            attackerInstance,
            sacrificeUser.owner,
            deathStrikeDamage,
            0
          )

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

        addToast(
          `☠️ SACRIFICE: ${sacrificeUser.creature.name} dies from Savage Demise! (Morale -${sacrificeResult.moraleLost})`
        )

        // Check for game over conditions
        gameState.checkGameOver()

        // Check for immediate elimination (sacrifice user's owner)
        const sacrificeOwner = sacrificeUser.owner
        const eliminationResult = gameState.checkAndEliminatePlayer(sacrificeOwner)
        if (eliminationResult.eliminated) {
          const reason =
            eliminationResult.reason === 'morale'
              ? 'Morale reduced to 0!'
              : 'All creatures destroyed!'
          addToast(
            `🏳️ ${gameState.players[sacrificeOwner].commander.name} has been eliminated! ${reason}`
          )
        }

        // Check for Savage Demise target owner elimination
        const targetOwner = sacrificeTarget.owner
        const targetEliminationResult = gameState.checkAndEliminatePlayer(targetOwner)
        if (targetEliminationResult.eliminated) {
          const reason =
            targetEliminationResult.reason === 'morale'
              ? 'Morale reduced to 0!'
              : 'All creatures destroyed!'
          addToast(
            `🏳️ ${gameState.players[targetOwner].commander.name} has been eliminated! ${reason}`
          )
        }

        // Check for original attacker owner elimination (DEATH STRIKE may have killed them)
        const attackerOwner = attackerInstance.owner
        if (attackerOwner !== targetOwner) {
          // Don't double-check if same player
          const attackerEliminationResult = gameState.checkAndEliminatePlayer(attackerOwner)
          if (attackerEliminationResult.eliminated) {
            const reason =
              attackerEliminationResult.reason === 'morale'
                ? 'Morale reduced to 0!'
                : 'All creatures destroyed!'
            addToast(
              `🏳️ ${gameState.players[attackerOwner].commander.name} has been eliminated! ${reason}`
            )
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
        setRenderCounter((prev) => prev + 1)

        return // Original attack is completely negated
      }

      // IMMEDIATE CARD: Prevent damage, discard card, tap creature
      // Pass discardCard if card has discard cost (e.g., Uncanny Dodge)
      const result = gameState.applyImmediateCardDefense(
        defense.card,
        defense.creature,
        defense.discardCard
      )

      if (result.success) {
        logger.card(defense.card.name, 'played as IMMEDIATE defense', {
          user: defense.creature.creature.name,
          defender: defenderInstance.creature.name,
          damagePrevented: result.damagePrevented,
          creatureTapped: defense.creature.creature.name,
        })

        const newAccumulatedReduction = accumulatedReduction + result.damagePrevented
        const remainingDamage = originalDamage - newAccumulatedReduction

        // Handle opponent draws (Recoil) - defender chooses which opponent receives card
        if (result.opponentDrawsCards > 0) {
          const cardName = result.cardUsed?.name || defense.card.name
          handleOpponentDrawEffect(
            result.opponentDrawsCards,
            cardName,
            defenderInstance.owner,
            attackerInstance.owner
          )
        }

        // Handle opponent morale loss (Unexpected Resistance) - defender selected target
        if (defense.moraleTarget && defense.card.opponentMoraleLoss > 0) {
          const cardName = result.cardUsed?.name || defense.card.name
          handleMoraleLossEffect(
            defense.moraleTarget,
            cardName,
            defenderInstance.owner,
            attackerInstance.owner,
            defense.card.opponentMoraleLoss
          )
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
              untapAfterUse: result.untapAfterUse || false,
            },
          })
          closeCombatPanel()
          setShowShiftDecisionModal(true)
          return // Wait for shift decision
        }

        // No shift - continue with normal flow
        // Check if there are more defensive options available
        if (remainingDamage > 0) {
          const moreOptions = gameState.getDefenseOptions(
            defenderInstance,
            remainingDamage,
            attackerInstance.owner
          )
          const hasMoreOptions =
            moreOptions.cower?.canCower ||
            moreOptions.unstoppableHordes?.canUse ||
            moreOptions.adjacentUndead?.length > 0 ||
            moreOptions.immediateCards?.length > 0

          if (hasMoreOptions) {
            // Update pendingAttack with accumulated reduction and re-show panel
            setPendingAttack({
              ...pendingAttack,
              accumulatedDamageReduction: newAccumulatedReduction,
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
                success: true,
              },
            })
            setShowCounterAttackTargetModal(true)
            return // Wait for target selection
          }

          if (counterResult.executed) {
            counterAttackResults = counterResult.results
            // Show toast for each target hit
            for (const hit of counterResult.results) {
              if (hit.killed) {
                addToast(
                  `⚔️ COUNTER-ATTACK: ${defense.creature.creature.name} killed ${hit.targetName} with ${hit.damage} damage!`
                )
              } else {
                addToast(
                  `⚔️ COUNTER-ATTACK: ${defense.creature.creature.name} dealt ${hit.damage} damage to ${hit.targetName} (${hit.remainingHP} HP remaining)`
                )
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
          success: true,
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
            success: true,
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
        creatures: [pendingAttack.defenderInstance],
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
        success: cowerResult.success,
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
    logger.debug('[executeAttackAfterDefense] === CALLED ===')
    logger.debug('[executeAttackAfterDefense] defenseResult:', defenseResult)
    logger.debug('[executeAttackAfterDefense] pendingAttack:', pendingAttack)
    logger.debug('[executeAttackAfterDefense] savageDemisePending:', savageDemisePending)

    if (!pendingAttack) {
      logger.debug('[executeAttackAfterDefense] No pendingAttack - returning early')
      return
    }

    const {
      attackerInstance,
      defenderInstance,
      targetInfo,
      isFlashingBlades,
      isHiddenBlade,
      isConfusionGaze,
      isRangedSplash,
      damageBoostCard,
      damageBoostBonus,
      damageBoostFlat,
    } = pendingAttack

    // Handle RANGED SPLASH damage (ACID BREATH / EXPLOSIVE BOLTS)
    if (isRangedSplash && rangedSplashAttackInfo) {
      logger.debug('[executeAttackAfterDefense] Handling RANGED SPLASH')
      const damageReduction = defenseResult.damageReduction || 0
      handleRangedSplashDefenseComplete({ damageReduction })
      return
    }

    // Handle SAVAGE DEMISE attack resolution
    if (pendingAttack.isSavageDemise && savageDemisePending) {
      handleSavageDemiseResolution(defenseResult)
      return
    }

    // Discard damage boost card from hand before executing attack (card is committed at this point)
    if (damageBoostCard && pendingDamageBoostAttack) {
      const attackerPlayer = gameState.players[attackerInstance.owner]
      const cardIndex = attackerPlayer.orderHand.findIndex((c) => c.id === damageBoostCard.id)
      if (cardIndex !== -1) {
        attackerPlayer.orderHand.splice(cardIndex, 1)
        logger.card(damageBoostCard.name, 'played as STANDARD attack boost', {
          user: attackerInstance.creature.name,
          attackType: targetInfo.attackType,
          damageBonus: damageBoostBonus,
          flatDamage: damageBoostFlat,
        })
      }
      // Clear pending damage boost state
      clearDamageBoostState()
    }

    let result
    if (isFlashingBlades || targetInfo.attackType === 'flashing_blades') {
      // FLASHING BLADES splash attack - use special handling
      // Apply defense reduction to the 10 splash damage
      const damageReduction = defenseResult.damageReduction || 0
      result = gameState.applyFlashingBladesWithDefense(
        defenderInstance,
        attackerInstance.owner,
        damageReduction
      )

      // Now tap the attacker (deferred from original attack)
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else if (isHiddenBlade || targetInfo.attackType === 'hidden_blade') {
      // HIDDEN BLADE attack - use special handling
      // Apply defense reduction to the 10 damage
      const damageReduction = defenseResult.damageReduction || 0
      result = gameState.applyHiddenBladeWithDefense(
        defenderInstance,
        attackerInstance.owner,
        damageReduction
      )

      // Now tap the attacker (deferred from original attack)
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else if (isConfusionGaze || targetInfo.attackType === 'confusion_gaze') {
      // CONFUSION GAZE attack - use the dedicated method with defense reduction
      // Now supports damage boost from order cards (e.g., Deep Wound)
      const damageReduction = defenseResult.damageReduction || 0
      result = gameState.applyConfusionGazeWithDefense(
        attackerInstance,
        defenderInstance,
        damageReduction,
        damageBoostBonus || 0,
        damageBoostFlat !== undefined ? damageBoostFlat : null
      )
      // Mark attacker as attacked and tap if moved
      attackerInstance.hasAttackedThisTurn = true
      if (attackerInstance.hasMovedThisTurn) {
        attackerInstance.tap()
      }
    } else {
      // Normal attack - execute with defense damage reduction AND damage boost info
      result = gameState.executeAttackWithDefense(
        attackerInstance,
        defenderInstance,
        targetInfo.attackType,
        defenseResult.damageReduction,
        defenseResult.type,
        damageBoostBonus || 0,
        damageBoostFlat !== undefined ? damageBoostFlat : null
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
        message +=
          `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
          `with ${targetInfo.attackType} for ${result.damage} damage!`
      }

      if (result.destroyed) {
        message += ` ${defenderInstance.creature.name} was destroyed! `
        if (result.moraleChange) {
          message +=
            `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
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
        addToast(
          `🧛 LIFE DRAIN: ${result.lifeDrain.creatureName} healed ${result.lifeDrain.healAmount} HP! (${result.lifeDrain.currentHP}/${result.lifeDrain.maxHP})`
        )
      }

      // UNTAP ON KILL toast notification (separate toast for visibility)
      if (result.untapOnKillTriggered && result.untapOnKillData) {
        addToast(
          `⚔️ UNTAP ON KILL: ${result.untapOnKillData.bugbearName} untaps and can act again!`
        )
      }

      addToast(message)
      gameState.checkGameOver()

      // STANDARD DAMAGE BOOST CARD DRAW (Phase STD-3: Slice)
      // Draw cards if the damage boost card has drawCardsOnAttack property
      if (damageBoostCard?.drawCardsOnAttack > 0) {
        const attackerPlayer = gameState.players[attackerInstance.owner]
        const drawnCards = attackerPlayer.drawOrderCards(damageBoostCard.drawCardsOnAttack)

        const isAttackerHuman = isPlayerHuman(attackerInstance.owner)

        if (isAttackerHuman) {
          // Human attacker - show modal with drawn cards (or empty deck message)
          setCardsDrawnData(drawnCards)
          setBonusDrawSources([`${damageBoostCard.name}`])
          setShowCardsDrawnModal(true)
        } else {
          // AI attacker - show toast
          if (drawnCards.length > 0) {
            addToast(
              `📜 AI drew ${drawnCards.length} card${drawnCards.length > 1 ? 's' : ''} from ${damageBoostCard.name}`
            )
          } else {
            addToast(`📜 AI ${damageBoostCard.name}: No cards to draw - deck is empty!`)
          }
        }
      }

      // STANDARD ATTACK + HEAL (Phase STD-6: Feral Vitality, Victorious Surge, Vampiric Touch)
      // Heal attacker if the damage boost card has healOnAttack property
      if (damageBoostCard?.healOnAttack > 0) {
        const actualDamageDealt = result.damage // Damage after defense
        const minDamageRequired = damageBoostCard.healOnAttackMinDamage || 0

        if (actualDamageDealt >= minDamageRequired) {
          const healAmount = damageBoostCard.healOnAttack
          // Heal the attacker using the CreatureInstance heal method
          attackerInstance.heal(healAmount)
          addToast(`💚 ${attackerInstance.creature.name} heals ${healAmount} damage!`)
        } else if (minDamageRequired > 0) {
          // Only show "not enough damage" message if there was a minimum requirement
          addToast(
            `${attackerInstance.creature.name} dealt only ${actualDamageDealt} damage - healing requires ${minDamageRequired}`
          )
        }
      }

      // STANDARD ATTACK + ATTACH (Phase STD-7: Deep Wound)
      // Attach card to target if damageBoostCard has attachOnUse property and damage was dealt
      if (damageBoostCard?.attachOnUse && result.damage > 0 && !result.destroyed) {
        // Only attach if target wasn't destroyed (makes sense - can't attach to dead creature)
        defenderInstance.attachedCards = defenderInstance.attachedCards || []
        defenderInstance.attachedCards.push({
          card: damageBoostCard,
          casterOwner: attackerInstance.owner,
          attachedTurn: gameState.turnNumber,
          attachOnUse: damageBoostCard.attachOnUse, // Contains damageOnActivation: 10
        })
        logger.debug(
          '[DEEP WOUND DEBUG] Attached to',
          defenderInstance.creature.name,
          'attachedCards:',
          defenderInstance.attachedCards,
          'card:',
          damageBoostCard.name
        )
        addToast(`🩸 ${damageBoostCard.name} attached to ${defenderInstance.creature.name}!`)
      }

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
              eligibleCreatures: eligibleCreatures,
            })
            setShowRiderModal(true)
            // Store callback to continue combat flow after modal
            setPendingRiderCallback(() => () => {
              setRenderCounter((prev) => prev + 1)
            })
            return // Wait for modal selection
          } else {
            // AI handles RIDER
            handleAIRiderDecision(
              ownerPlayerId,
              eligibleCreatures,
              position,
              creatureLevel,
              creatureName,
              faction,
              null
            )
          }
        }
      }

      // Check for immediate elimination of defender
      const eliminationResult = gameState.checkAndEliminatePlayer(defenderInstance.owner)
      if (eliminationResult.eliminated) {
        const reason =
          eliminationResult.reason === 'morale'
            ? 'Morale reduced to 0!'
            : 'All creatures destroyed!'
        addToast(
          `🏳️ ${gameState.players[defenderInstance.owner].commander.name} has been eliminated! ${reason}`
        )
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
              splashSource: 'Skeletal Tomb Guardian',
            })
            setCombatPanelMode('defense') // Show defense panel for splash damage
            setRenderCounter((prev) => prev + 1)
            return // Wait for defense resolution
          }
        }
        return
      }

      // TAP CREATURE FOR SHIFT+ATTACK CARDS (must happen BEFORE ability triggers which may return early)
      // Shift+Attack cards (Nimble Strike, Spring Attack, Shadowy Ambush) complete the STANDARD action
      // after the attack resolves. We must tap now because ability triggers (SLAM, Flashing Blades, etc.)
      // may return early and skip the normal end-of-function tapping code.
      // EXCEPTION: If creature has HIDDEN BLADE, defer tapping until after Hidden Blade resolves
      // (Hidden Blade might trigger, and we want the creature untapped until that flow completes)
      if (pendingShiftAttack && !pendingAttack?.hasPostAttackShift) {
        // No post-shift: tap now (Shadowy Ambush, Nimble Strike)
        attackerInstance.hasAttackedThisTurn = true
        const creatureHasHiddenBlade = gameState.hasHiddenBlade(attackerInstance)
        if (attackerInstance.hasMovedThisTurn && !creatureHasHiddenBlade) {
          // Tap now for creatures without Hidden Blade
          attackerInstance.tap()
        }
        // Creatures with Hidden Blade will be tapped after Hidden Blade resolves (used or skipped)
      }

      // Check for FLASHING BLADES trigger after defense (only for normal melee attacks, not splash/ability attacks)
      logger.debug(
        '[executeAttackAfterDefense] Checking ability triggers - isFlashingBlades:',
        isFlashingBlades,
        'isHiddenBlade:',
        isHiddenBlade,
        'isConfusionGaze:',
        isConfusionGaze
      )
      logger.debug('[executeAttackAfterDefense] targetInfo.attackType:', targetInfo.attackType)
      if (
        !isFlashingBlades &&
        targetInfo.attackType !== 'flashing_blades' &&
        !isHiddenBlade &&
        targetInfo.attackType !== 'hidden_blade' &&
        !isConfusionGaze &&
        targetInfo.attackType !== 'confusion_gaze'
      ) {
        logger.debug(
          '[executeAttackAfterDefense] Passed ability trigger condition check - checking FLASHING BLADES and HIDDEN BLADE'
        )
        if (
          checkFlashingBladesTrigger(
            attackerInstance,
            defenderInstance,
            result,
            targetInfo.attackType
          )
        ) {
          // Modal shown - don't clear state yet, wait for modal response
          // BUT we DO need to trigger a re-render to show destroyed creature being removed
          setRenderCounter((prev) => prev + 1)
          return
        }

        // Check for HIDDEN BLADE trigger after defense (for any attack type - melee OR ranged)
        // HIDDEN BLADE checks for adjacent TAPPED enemies, so it must be checked AFTER defense
        // (using defense cards taps the defender)
        // EXCEPTION: If there's a pending post-shift (Spring Attack), defer Hidden Blade check
        // until AFTER the post-shift completes (checked in handleShiftAttackPostShift)
        const hasPostShift = pendingAttack?.hasPostAttackShift && pendingShiftAttack
        if (!hasPostShift && checkHiddenBladeTrigger(attackerInstance, result)) {
          // Modal shown - don't clear state yet, wait for modal response
          setRenderCounter((prev) => prev + 1)
          return
        }

        // Check for SLAM trigger after defense (Earth Guardian - melee attacks only)
        // SLAM triggers if: damage dealt > 0, target NOT destroyed, attacker has SLAM, melee attack
        if (
          targetInfo.attackType === 'melee' &&
          result.damage > 0 &&
          !result.destroyed &&
          defenderInstance.currentHP > 0 &&
          gameState.hasSlam(attackerInstance)
        ) {
          const validSlamTiles = gameState.getValidSlamTiles(defenderInstance, 3)

          if (validSlamTiles.length > 0) {
            const isAttackerHuman = isPlayerHuman(attackerInstance.owner)

            if (isAttackerHuman) {
              // Human attacker - show SLAM decision modal
              setSlamPending({ attackerInstance, targetInstance: defenderInstance })
              setSlamValidTiles(validSlamTiles)
              setShowSlamModal(true)
              setRenderCounter((prev) => prev + 1)
              return // Wait for modal decision
            } else {
              // AI attacker - use 0/50/100 rule
              handleAISlamDecision(attackerInstance, defenderInstance, validSlamTiles)
              // Clear state and continue
              setSelectedBoardCreature(null)
              setValidMoveTiles([])
              setValidAttackTargets([])
              setPendingAttack(null)
              setRenderCounter((prev) => prev + 1)
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
          setRenderCounter((prev) => prev + 1)
          setProcessingAIAction(false)
        })
        if (hasSplash) {
          // Splash is being processed - don't clear state yet
          setRenderCounter((prev) => prev + 1)
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

    // Check for POST-ATTACK SHIFT (Spring Attack)
    // If this was a shift+attack with post-shift, trigger the post-shift phase
    if (pendingAttack?.isShiftAttack && pendingAttack?.hasPostAttackShift && pendingShiftAttack) {
      const postShiftDistance = pendingAttack.postAttackShiftDistance || 0
      const creature = attackerInstance

      if (postShiftDistance > 0 && creature.position) {
        // Calculate valid shift tiles for post-attack shift
        const validTiles = gameState.getValidShiftTiles
          ? gameState.getValidShiftTiles(creature, postShiftDistance)
          : []

        if (validTiles.length > 0) {
          // Check if attacker is human
          const isAttackerHuman = isPlayerHuman(creature.owner)

          if (isAttackerHuman) {
            // Enter post-shift mode
            setPendingShiftAttack({
              ...pendingShiftAttack,
              phase: 'post-shift',
            })
            setShiftAttackValidTiles(validTiles)
            setShiftAttackMode(true)
            setSelectedBoardCreature(creature)

            // Clear combat panel state but keep shift attack state
            setPendingAttack(null)
            setCombatPanelMode(null)
            setCombatHighlightCreatures({ attacker: null, defender: null })

            addToast(`🏃 Spring Attack: Shift 1-${postShiftDistance} squares after attack!`)
            setRenderCounter((prev) => prev + 1)
            return // Wait for post-shift selection
          } else {
            // AI handles post-shift - simple strategy: shift away from enemies
            // For now, just skip (AI will handle in Step 10)
            addToast(`🏃 AI could shift after attack (Spring Attack)`)
          }
        }
      }
      // Clear shift attack state if no valid tiles or AI
      clearShiftAttackState()
    } else if (pendingShiftAttack) {
      // Shift+Attack WITHOUT post-shift (Shadowy Ambush, Nimble Strike)
      // Tapping already happened earlier (before ability triggers) - just clear state
      clearShiftAttackState()
    }

    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setPendingAttack(null)
    setRenderCounter((prev) => prev + 1)

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
        creatures.forEach((c) => {
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
      const splashResult = gameState.combatResolver.executeSplashDamage(
        attackerInstance,
        targetInstance,
        damageAfterDefense
      )
      results.push({
        ...splashResult,
        defenseUsed,
        damageAfterDefense,
      })
    }

    // Show combined toast for all splash results
    if (results.length > 0) {
      const hitNames = results.map((r) => r.targetName).join(', ')
      const destroyedCount = results.filter((r) => r.destroyed).length
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
    setCombatPanelMode(null) // Clear combat panel after AI splash resolution
    setRenderCounter((prev) => prev + 1)
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
      defense.creatures?.forEach((c) => {
        const result = gameState.applyUnstoppableHordes(c)
        if (result.success) totalPrevented += result.damagePrevented
      })
      damageAfterDefense = Math.max(0, 20 - totalPrevented)
    } else if (defense.type === 'immediate_card') {
      const result = gameState.applyImmediateCardDefense(
        defense.card,
        defense.creature,
        defense.discardCard
      )
      if (result.success) {
        damageAfterDefense = Math.max(0, 20 - result.damagePrevented)

        // Handle opponent draws (Recoil) - defender chooses which opponent receives card
        if (result.opponentDrawsCards > 0) {
          const cardName = result.cardUsed?.name || defense.card.name
          handleOpponentDrawEffect(
            result.opponentDrawsCards,
            cardName,
            targetInstance.owner,
            attackerInstance.owner
          )
        }

        // Handle opponent morale loss (Unexpected Resistance)
        if (defense.moraleTarget && defense.card.opponentMoraleLoss > 0) {
          const cardName = result.cardUsed?.name || defense.card.name
          handleMoraleLossEffect(
            defense.moraleTarget,
            cardName,
            targetInstance.owner,
            attackerInstance.owner,
            defense.card.opponentMoraleLoss
          )
        }
      }
    }

    // Apply splash damage
    const splashResult = gameState.combatResolver.executeSplashDamage(
      attackerInstance,
      targetInstance,
      damageAfterDefense
    )

    // Add to accumulated results
    const newResults = [
      ...splashResults,
      {
        ...splashResult,
        defenseUsed: defense.type !== 'skip' ? defense.type : null,
        damageAfterDefense,
      },
    ]
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
          splashSource: 'Skeletal Tomb Guardian',
        })
        setCombatPanelMode('defense') // Keep defense panel showing for next target
        setRenderCounter((prev) => prev + 1)
      }
    } else {
      // All splash attacks resolved - show combined toast
      if (newResults.length > 0) {
        const hitNames = newResults.map((r) => r.targetName).join(', ')
        const destroyedCount = newResults.filter((r) => r.destroyed).length
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
      setCombatPanelMode(null) // Clear combat panel after splash resolution
      setRenderCounter((prev) => prev + 1)
    }
  }

  // Execute the attack after reactions have been handled
  const executeAttackAfterReactions = (reactions) => {
    logger.debug('[executeAttackAfterReactions] === CALLED ===')
    logger.debug('[executeAttackAfterReactions] pendingAttack:', pendingAttack)
    if (!pendingAttack) {
      logger.debug('[executeAttackAfterReactions] EARLY RETURN - no pendingAttack')
      return
    }

    const {
      attackerInstance,
      defenderInstance,
      targetInfo,
      isFlashingBlades,
      isHiddenBlade,
      isConfusionGaze,
      damageBoostCard,
      damageBoostBonus,
      damageBoostFlat,
    } = pendingAttack
    logger.debug(
      '[executeAttackAfterReactions] isHiddenBlade:',
      isHiddenBlade,
      'targetInfo.attackType:',
      targetInfo?.attackType
    )

    // Discard damage boost card from hand before executing attack (card is committed at this point)
    if (damageBoostCard && pendingDamageBoostAttack) {
      const attackerPlayer = gameState.players[attackerInstance.owner]
      const cardIndex = attackerPlayer.orderHand.findIndex((c) => c.id === damageBoostCard.id)
      if (cardIndex !== -1) {
        attackerPlayer.orderHand.splice(cardIndex, 1)
      }
      // Clear pending damage boost state
      clearDamageBoostState()
    }

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
      logger.debug('[executeAttackAfterReactions] Executing HIDDEN BLADE attack')
      logger.debug(
        '[executeAttackAfterReactions] defenderInstance:',
        defenderInstance?.creature?.name,
        'HP before:',
        defenderInstance?.currentHP
      )
      result = gameState.applyHiddenBlade(defenderInstance, attackerInstance.owner)
      logger.debug('[executeAttackAfterReactions] HIDDEN BLADE result:', result)
      logger.debug(
        '[executeAttackAfterReactions] defenderInstance HP after:',
        defenderInstance?.currentHP
      )
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
      // Execute normal attack with damage boost info (Power Attack, Hacking Frenzy, Killing Strike)
      result = gameState.executeAttack(
        attackerInstance,
        defenderInstance,
        targetInfo.attackType,
        damageBoostBonus || 0,
        damageBoostFlat !== undefined ? damageBoostFlat : null
      )
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
        message +=
          `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
          `with ${targetInfo.attackType} for ${result.damage} damage!`
      }

      if (result.destroyed) {
        message += ` ${defenderInstance.creature.name} was destroyed! `
        if (result.moraleChange) {
          message +=
            `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
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
        addToast(
          `🧛 LIFE DRAIN: ${result.lifeDrain.creatureName} healed ${result.lifeDrain.healAmount} HP! (${result.lifeDrain.currentHP}/${result.lifeDrain.maxHP})`
        )
      }

      // UNTAP ON KILL toast notification (separate toast for visibility)
      if (result.untapOnKillTriggered && result.untapOnKillData) {
        addToast(
          `⚔️ UNTAP ON KILL: ${result.untapOnKillData.bugbearName} untaps and can act again!`
        )
      }

      addToast(message)

      // Check for game over
      gameState.checkGameOver()

      // STANDARD DAMAGE BOOST CARD DRAW (Phase STD-3: Slice)
      // Draw cards if the damage boost card has drawCardsOnAttack property
      if (damageBoostCard?.drawCardsOnAttack > 0) {
        const attackerPlayer = gameState.players[attackerInstance.owner]
        const drawnCards = attackerPlayer.drawOrderCards(damageBoostCard.drawCardsOnAttack)

        const isAttackerHuman = isPlayerHuman(attackerInstance.owner)

        if (isAttackerHuman) {
          // Human attacker - show modal with drawn cards (or empty deck message)
          setCardsDrawnData(drawnCards)
          setBonusDrawSources([`${damageBoostCard.name}`])
          setShowCardsDrawnModal(true)
        } else {
          // AI attacker - show toast
          if (drawnCards.length > 0) {
            addToast(
              `📜 AI drew ${drawnCards.length} card${drawnCards.length > 1 ? 's' : ''} from ${damageBoostCard.name}`
            )
          } else {
            addToast(`📜 AI ${damageBoostCard.name}: No cards to draw - deck is empty!`)
          }
        }
      }

      // STANDARD ATTACK + HEAL (Phase STD-6: Feral Vitality, Victorious Surge, Vampiric Touch)
      // Heal attacker if the damage boost card has healOnAttack property
      if (damageBoostCard?.healOnAttack > 0) {
        const actualDamageDealt = result.damage // Damage after defense
        const minDamageRequired = damageBoostCard.healOnAttackMinDamage || 0

        if (actualDamageDealt >= minDamageRequired) {
          const healAmount = damageBoostCard.healOnAttack
          // Heal the attacker using the CreatureInstance heal method
          attackerInstance.heal(healAmount)
          addToast(`💚 ${attackerInstance.creature.name} heals ${healAmount} damage!`)
        } else if (minDamageRequired > 0) {
          // Only show "not enough damage" message if there was a minimum requirement
          addToast(
            `${attackerInstance.creature.name} dealt only ${actualDamageDealt} damage - healing requires ${minDamageRequired}`
          )
        }
      }

      // STANDARD ATTACK + ATTACH (Phase STD-7: Deep Wound)
      // Attach card to target if damageBoostCard has attachOnUse property and damage was dealt
      if (damageBoostCard?.attachOnUse && result.damage > 0 && !result.destroyed) {
        // Only attach if target wasn't destroyed (makes sense - can't attach to dead creature)
        defenderInstance.attachedCards = defenderInstance.attachedCards || []
        defenderInstance.attachedCards.push({
          card: damageBoostCard,
          casterOwner: attackerInstance.owner,
          attachedTurn: gameState.turnNumber,
          attachOnUse: damageBoostCard.attachOnUse, // Contains damageOnActivation: 10
        })
        logger.debug(
          '[DEEP WOUND DEBUG] Attached to',
          defenderInstance.creature.name,
          'attachedCards:',
          defenderInstance.attachedCards,
          'card:',
          damageBoostCard.name
        )
        addToast(`🩸 ${damageBoostCard.name} attached to ${defenderInstance.creature.name}!`)
      }

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
              eligibleCreatures: eligibleCreatures,
            })
            setShowRiderModal(true)
            // Store callback to continue combat flow after modal
            setPendingRiderCallback(() => () => {
              setRenderCounter((prev) => prev + 1)
            })
            return // Wait for modal selection
          } else {
            // AI handles RIDER
            handleAIRiderDecision(
              ownerPlayerId,
              eligibleCreatures,
              position,
              creatureLevel,
              creatureName,
              faction,
              null
            )
          }
        }
      }

      // Check for immediate elimination of defender
      const eliminationResult = gameState.checkAndEliminatePlayer(defenderInstance.owner)
      if (eliminationResult.eliminated) {
        const reason =
          eliminationResult.reason === 'morale'
            ? 'Morale reduced to 0!'
            : 'All creatures destroyed!'
        addToast(
          `🏳️ ${gameState.players[defenderInstance.owner].commander.name} has been eliminated! ${reason}`
        )
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
              splashSource: 'Skeletal Tomb Guardian',
            })
            setCombatPanelMode('defense') // Show defense panel for splash damage
            setRenderCounter((prev) => prev + 1)
            return // Wait for defense resolution
          }
        }
        return
      }

      // Check for FLASHING BLADES trigger after reactions (only for normal attacks, not splash/ability attacks)
      if (
        !isFlashingBlades &&
        targetInfo.attackType !== 'flashing_blades' &&
        !isHiddenBlade &&
        targetInfo.attackType !== 'hidden_blade' &&
        !isConfusionGaze &&
        targetInfo.attackType !== 'confusion_gaze'
      ) {
        if (
          checkFlashingBladesTrigger(
            attackerInstance,
            defenderInstance,
            result,
            targetInfo.attackType
          )
        ) {
          // Modal shown - don't clear state yet, wait for modal response
          // BUT we DO need to trigger a re-render to show destroyed creature being removed
          setRenderCounter((prev) => prev + 1)
          return
        }

        // Check for HIDDEN BLADE trigger after reactions (for any attack type - melee OR ranged)
        if (checkHiddenBladeTrigger(attackerInstance, result)) {
          // Modal shown - don't clear state yet, wait for modal response
          setRenderCounter((prev) => prev + 1)
          return
        }

        // Check for SLAM trigger after reactions (Earth Guardian - melee attacks only)
        // SLAM triggers if: damage dealt > 0, target NOT destroyed, attacker has SLAM, melee attack
        if (
          targetInfo.attackType === 'melee' &&
          result.damage > 0 &&
          !result.destroyed &&
          defenderInstance.currentHP > 0 &&
          gameState.hasSlam(attackerInstance)
        ) {
          const validSlamTiles = gameState.getValidSlamTiles(defenderInstance, 3)

          if (validSlamTiles.length > 0) {
            const isAttackerHuman = isPlayerHuman(attackerInstance.owner)

            if (isAttackerHuman) {
              // Human attacker - show SLAM decision modal
              setSlamPending({ attackerInstance, targetInstance: defenderInstance })
              setSlamValidTiles(validSlamTiles)
              setShowSlamModal(true)
              setRenderCounter((prev) => prev + 1)
              return // Wait for modal decision
            } else {
              // AI attacker - use 0/50/100 rule
              handleAISlamDecision(attackerInstance, defenderInstance, validSlamTiles)
              // Clear state and continue
              setSelectedBoardCreature(null)
              setValidMoveTiles([])
              setValidAttackTargets([])
              setPendingAttack(null)
              setRenderCounter((prev) => prev + 1)
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
          setRenderCounter((prev) => prev + 1)
          setProcessingAIAction(false)
        })
        if (hasSplash) {
          // Splash is being processed - don't clear state yet
          setRenderCounter((prev) => prev + 1)
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

    // Check for POST-ATTACK SHIFT (Spring Attack)
    // If this was a shift+attack with post-shift, trigger the post-shift phase
    if (pendingAttack?.isShiftAttack && pendingAttack?.hasPostAttackShift && pendingShiftAttack) {
      const postShiftDistance = pendingAttack.postAttackShiftDistance || 0
      const creature = attackerInstance

      if (postShiftDistance > 0 && creature.position) {
        // Calculate valid shift tiles for post-attack shift
        const validTiles = gameState.getValidShiftTiles
          ? gameState.getValidShiftTiles(creature, postShiftDistance)
          : []

        if (validTiles.length > 0) {
          // Check if attacker is human
          const isAttackerHuman = isPlayerHuman(creature.owner)

          if (isAttackerHuman) {
            // Enter post-shift mode
            setPendingShiftAttack({
              ...pendingShiftAttack,
              phase: 'post-shift',
            })
            setShiftAttackValidTiles(validTiles)
            setShiftAttackMode(true)
            setSelectedBoardCreature(creature)

            // Clear combat panel state but keep shift attack state
            setPendingAttack(null)
            setCombatPanelMode(null)
            setCombatHighlightCreatures({ attacker: null, defender: null })

            addToast(`🏃 Spring Attack: Shift 1-${postShiftDistance} squares after attack!`)
            setRenderCounter((prev) => prev + 1)
            return // Wait for post-shift selection
          } else {
            // AI handles post-shift - select best escape tile (farthest from enemies)
            let bestTile = null
            let bestScore = -Infinity

            for (const tile of validTiles) {
              // Score based on distance from enemies (higher = better escape)
              let minEnemyDist = Infinity
              for (const [playerId, player] of Object.entries(gameState.players)) {
                if (playerId === creature.owner) continue
                for (const enemyCreature of player.creaturesInPlay) {
                  if (!enemyCreature.position) continue
                  const dist =
                    Math.abs(tile.x - enemyCreature.position.x) +
                    Math.abs(tile.y - enemyCreature.position.y)
                  minEnemyDist = Math.min(minEnemyDist, dist)
                }
              }
              if (minEnemyDist > bestScore) {
                bestScore = minEnemyDist
                bestTile = tile
              }
            }

            if (bestTile) {
              // Execute the shift
              const oldTile = gameState.getTile(creature.position.x, creature.position.y)
              const newTile = gameState.getTile(bestTile.x, bestTile.y)
              if (oldTile) oldTile.occupant = null
              creature.position = { x: bestTile.x, y: bestTile.y }
              if (newTile) newTile.occupant = creature

              addToast(
                `🏃 AI Spring Attack: ${creature.creature.name} shifts to (${bestTile.x},${bestTile.y})`
              )
            }
          }
        }
      }
      // Clear shift attack state if no valid tiles or AI
      clearShiftAttackState()
    } else if (pendingShiftAttack) {
      // Clear shift attack state for non-post-shift attacks
      clearShiftAttackState()
    }

    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setPendingAttack(null)
    setRenderCounter((prev) => prev + 1)

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
        return {
          executed: false,
          reason: 'attacker_not_adjacent',
          message: 'Attacker is not adjacent - counter-attack skipped',
        }
      }
      targets.push(attackerInstance)
    } else if (targetType === 'adjacent_tapped') {
      // Seize the Opportunity: Can target ANY adjacent tapped enemy
      if (selectedTarget) {
        // Target already selected by human player
        targets.push(selectedTarget)
      } else {
        // Need to find valid targets
        const adjacentTapped = gameState.getAdjacentTappedEnemies(defenderInstance)

        // Also check if attacker will be tapped after this attack resolves
        // Attacker must be adjacent AND have moved this turn (attacking completes the tap)
        if (
          attackerInstance &&
          gameState.isAttackerAdjacent(defenderInstance, attackerInstance) &&
          attackerInstance.hasMovedThisTurn
        ) {
          // Attacker will be tapped - add to valid targets if not already included
          const alreadyIncluded = adjacentTapped.some(
            (c) => c.instanceId === attackerInstance.instanceId
          )
          if (!alreadyIncluded) {
            adjacentTapped.push(attackerInstance)
          }
        }

        if (adjacentTapped.length === 0) {
          return {
            executed: false,
            reason: 'no_valid_targets',
            message: 'No adjacent tapped enemies - counter-attack skipped',
          }
        }
        if (adjacentTapped.length === 1) {
          // Only one target - auto-select
          targets.push(adjacentTapped[0])
        } else {
          // Multiple targets - return for selection (human) or AI decision
          return { needsTargetSelection: true, validTargets: adjacentTapped, damage }
        }
      }
    } else if (targetType === 'all_adjacent_tapped') {
      // Corrosive Blood: Hit ALL adjacent tapped enemies
      const adjacentTapped = gameState.getAdjacentTappedEnemies(defenderInstance)
      if (adjacentTapped.length === 0) {
        return {
          executed: false,
          reason: 'no_valid_targets',
          message: 'No adjacent tapped enemies - counter-attack skipped',
        }
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
        const index = targetPlayer.creaturesInPlay.findIndex(
          (c) => c.instanceId === target.instanceId
        )
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
        killed,
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

    const { damage, defenderInstance, attackerInstance, pendingDefenseResult } =
      counterAttackPending

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
          addToast(
            `⚔️ COUNTER-ATTACK: ${defenderInstance.creature.name} killed ${hit.targetName} with ${hit.damage} damage!`
          )
        } else {
          addToast(
            `⚔️ COUNTER-ATTACK: ${defenderInstance.creature.name} dealt ${hit.damage} damage to ${hit.targetName} (${hit.remainingHP} HP remaining)`
          )
        }
      }
    }

    // Continue with attack execution
    executeAttackAfterDefense({
      ...pendingDefenseResult,
      counterAttackResults: counterResult.executed ? counterResult.results : null,
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
    const handCardIndex = player.orderHand.findIndex((c) => c.id === card.id)
    if (handCardIndex !== -1) {
      player.orderHand.splice(handCardIndex, 1)
    }

    // Toast notification
    addToast(`${creature.creature.name} used Patch Up to heal ${actualHeal} damage`)

    // Close modal and clear state
    setShowPatchUpHealModal(false)
    setPatchUpHealConfig({ card: null, creature: null, healAmount: 0 })

    // Force re-render
    setRenderCounter((prev) => prev + 1)
  }

  /**
   * Cancel Patch Up proactive heal
   */
  const cancelPatchUpHeal = () => {
    setShowPatchUpHealModal(false)
    setPatchUpHealConfig({ card: null, creature: null, healAmount: 0 })
  }

  /**
   * Execute Tough as Nails proactive use
   * Removes all attachments, attaches Tough as Nails, grants Block 10
   * Consumes action (like STANDARD), does NOT tap unless already moved
   */
  const executeToughAsNails = () => {
    logger.debug('[TOUGH AS NAILS] executeToughAsNails called', toughAsNailsConfig)
    if (!toughAsNailsConfig?.card || !toughAsNailsConfig?.creature) {
      logger.debug('[TOUGH AS NAILS] Missing config, aborting')
      return
    }

    const { card, creature } = toughAsNailsConfig
    const player = gameState.players[creature.owner]
    logger.debug('[TOUGH AS NAILS] Player:', player?.id, 'Hand size:', player?.orderHand?.length)

    // Find and remove card from hand
    const handCardIndex = player.orderHand.findIndex((c) => c.id === card.id)
    logger.debug('[TOUGH AS NAILS] Card index in hand:', handCardIndex)
    if (handCardIndex === -1) {
      addToast(`Card not found in hand`)
      setShowToughAsNailsModal(false)
      setToughAsNailsConfig({ card: null, cardIndex: null, creature: null })
      return
    }

    // Remove from hand
    player.orderHand.splice(handCardIndex, 1)
    logger.debug('[TOUGH AS NAILS] Card removed, new hand size:', player.orderHand.length)

    // Apply attachment (cleanse + attach)
    logger.debug(
      '[TOUGH AS NAILS] Before attachment, creature.attachedCards:',
      creature.attachedCards
    )
    const removedCards = gameState.applyImmediateCardAttachment(creature, card, creature.owner)
    logger.debug(
      '[TOUGH AS NAILS] After attachment, creature.attachedCards:',
      creature.attachedCards
    )
    logger.debug('[TOUGH AS NAILS] Removed cards:', removedCards)

    // Mark creature as having acted
    creature.hasAttackedThisTurn = true
    if (creature.hasMovedThisTurn) {
      creature.tap()
    }

    // Show toast
    let message = `🛡️ TOUGH AS NAILS: ${creature.creature.name} gains Block 10!`
    if (removedCards.length > 0) {
      const cardNames = removedCards.map((att) => att.card?.name || 'Unknown').join(', ')
      message = `🛡️ TOUGH AS NAILS: ${creature.creature.name} removes ${cardNames} and gains Block 10!`
    }
    logger.debug('[TOUGH AS NAILS] Toast message:', message)
    addToast(message)

    // Close modal and clear state
    setShowToughAsNailsModal(false)
    setToughAsNailsConfig({ card: null, cardIndex: null, creature: null })

    // Force re-render
    setRenderCounter((prev) => prev + 1)
  }

  /**
   * Cancel Tough as Nails proactive use
   */
  const cancelToughAsNails = () => {
    logger.debug('[TOUGH AS NAILS] Cancelled by user')
    setShowToughAsNailsModal(false)
    setToughAsNailsConfig({ card: null, cardIndex: null, creature: null })
  }

  // Handle collect morale from treasure (show confirmation modal)
  const handleCollectMorale = () => {
    if (!selectedBoardCreature) {
      addToast('No creature selected')
      return
    }

    const tile = gameState.getTile(
      selectedBoardCreature.position.x,
      selectedBoardCreature.position.y
    )
    if (!tile?.treasure) {
      addToast('No treasure at this location')
      return
    }

    // Check for SELLSWORD ability - Drow on treasure gives choice
    if (gameState.shouldTriggerSellsword(selectedBoardCreature)) {
      setSellswordPending({
        creature: selectedBoardCreature,
        treasure: tile.treasure,
      })
      setShowSellswordModal(true)
      return
    }

    // Show normal confirmation modal for human players
    setPendingCollection({
      creature: selectedBoardCreature,
      treasure: tile.treasure,
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
    setRenderCounter((prev) => prev + 1)
  }

  // SELLSWORD ability - choose card draw
  const handleSellswordCard = () => {
    if (!sellswordPending) return

    const player = gameState.players[sellswordPending.creature.owner]
    const drawnCards = player.drawOrderCards(1)

    // Mark treasure as collected (reduce morale count) but don't give morale
    const tile = gameState.getTile(
      sellswordPending.creature.position.x,
      sellswordPending.creature.position.y
    )
    if (tile?.treasure) {
      tile.treasure.remainingMorale = Math.max(0, tile.treasure.remainingMorale - 1)
    }

    // Tap the creature (uses action)
    sellswordPending.creature.isTapped = true

    if (drawnCards.length > 0) {
      addToast(
        `SELLSWORD: ${sellswordPending.creature.creature.name} drew an Order card instead of morale!`
      )
    } else {
      addToast(`SELLSWORD: No Order cards left to draw!`)
    }

    setSellswordPending(null)
    setShowSellswordModal(false)
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setRenderCounter((prev) => prev + 1)
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
        success: true,
      })
    }

    setRenderCounter((prev) => prev + 1)
  }

  /**
   * User selected a tile for Cloud of Bats shift - show confirmation
   */
  const handleShiftTileSelected = (tile) => {
    if (!pendingShiftAfterDefense || !shiftSelectionMode) return

    // Verify tile is valid
    const isValid = shiftValidTiles.some((t) => t.x === tile.x && t.y === tile.y)
    if (!isValid) return

    // Show move confirmation modal
    // Use same structure as normal movement (destination, cost) for modal compatibility
    setPendingMove({
      creature: pendingShiftAfterDefense.creature,
      destination: tile,
      cost: 0, // Shift is free
      isShiftAfterDefense: true,
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
        success: true,
      })
    }

    setRenderCounter((prev) => prev + 1)
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

    const {
      creature,
      tile,
      creatureIndex,
      isFromGraveyard,
      source,
      isOrcScoutDeploy,
      isShadowStalkerDeploy,
      isSummonSpiderDeploy,
      isLichNecromancerDeploy,
      isOrcDruidDeploy,
      isInStartingZone,
    } = pendingDeployment

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

    // Log the deployment
    logger.deploy(creature.name, {
      owner: gameState.currentPlayer,
      position: { x: tile.x, y: tile.y },
      level: creature.level,
      fromGraveyard: isFromGraveyard,
      source: isOrcScoutDeploy
        ? 'ORC SCOUT'
        : isShadowStalkerDeploy
          ? 'SHADOW STALKER'
          : isSummonSpiderDeploy
            ? 'SUMMON SPIDER'
            : isLichNecromancerDeploy
              ? 'LICH NECROMANCER'
              : isOrcDruidDeploy
                ? 'ORC DRUID'
                : 'standard',
    })

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
      addToast(
        `ORC SCOUT: Deployed ${creature.name} to treasure at (${tile.x}, ${tile.y})! Protected until your next turn!`
      )
    } else if (isShadowStalkerDeploy && !isInStartingZone) {
      addToast(
        `SHADOW STALKER: ${creature.name} deployed near mountain at (${tile.x}, ${tile.y})! Protected until your next turn!`
      )
    } else if (isSummonSpiderDeploy && !isInStartingZone) {
      addToast(
        `SUMMON SPIDER: ${creature.name} summoned near Drow Priestess at (${tile.x}, ${tile.y})! Protected until your next turn!`
      )
    } else if (isLichNecromancerDeploy && !isInStartingZone) {
      addToast(
        `LICH NECROMANCER: ${creature.name} deployed adjacent to Lich at (${tile.x}, ${tile.y})! Protected until your next turn!`
      )
    } else if (isOrcDruidDeploy && !isInStartingZone) {
      addToast(
        `ORC DRUID: ${creature.name} deployed adjacent to Orc Druid at (${tile.x}, ${tile.y})! Protected until your next turn!`
      )
    } else if (isFromGraveyard) {
      addToast(
        `GRAVEYARD DEPLOY: ${creature.name} resurrected at (${tile.x}, ${tile.y})! Protected until your next turn!`
      )
    } else {
      addToast(
        `Deployed ${creature.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`
      )
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
        playerId: gameState.currentPlayer,
      })
      setShowChieftainCallModal(true)
    }

    // Check for OGRE DEPLOY MORALE ability trigger (Ogre deployed - gain 1 morale)
    if (gameState.shouldTriggerOgreDeployMorale(creatureInstance)) {
      const player = gameState.players[gameState.currentPlayer]
      const oldMorale = player.morale
      player.gainMorale(1)

      // Show toast notification (logged)
      addToast(
        `${creatureInstance.creature.name} deployed! Gained 1 MORALE (${oldMorale} → ${player.morale})`,
        'success'
      )

      // Show informational modal for human player
      setOgreDeployMoraleResult({
        creatureInstance,
        oldMorale,
        newMorale: player.morale,
        playerId: gameState.currentPlayer,
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
          playerId: gameState.currentPlayer,
        })
        setShowClericDrawOrderModal(true)
      }
    }

    // Force re-render to show newly deployed creature on board
    // Use setTimeout to ensure state updates are processed before forcing render
    setTimeout(() => {
      setRenderCounter((prev) => prev + 1)
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
      .map((coord) => gameState.getTile(coord.x, coord.y))
      .filter((tile) => tile && !tile.occupant)

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
      addToast(
        `CHIEFTAIN CALL: Gained ${result.leadershipGained} Leadership and deployed ${selectedCreature.name} to (${deployPosition.x}, ${deployPosition.y})!`
      )
    } else {
      addToast(`CHIEFTAIN CALL failed: ${result.message}`)
    }

    // Clear modal state
    setShowChieftainCallModal(false)
    setChieftainCallPending(null)

    // Force re-render
    setRenderCounter((prev) => prev + 1)
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
  const checkFlashingBladesTrigger = (
    attackerInstance,
    defenderInstance,
    attackResult,
    attackType
  ) => {
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
      validTargets,
    })
    setShowFlashingBladesModal(true)

    return true
  }

  // State for "not adjacent" error modal
  const [notAdjacentErrorModal, setNotAdjacentErrorModal] = useState({
    show: false,
    attacker: null,
    target: null,
    hasDamageBoost: false,
  })

  // SCROLLBOOK ability - discard selected order card to draw a new one
  const handleScrollbookUse = (cardIndex) => {
    if (!gameState || cardIndex === null) return

    const result = gameState.useScrollbook(gameState.currentPlayer, cardIndex)

    if (result.success) {
      addToast(
        `SCROLLBOOK: Discarded ${result.discardedCard.name}, drew ${result.drawnCard ? result.drawnCard.name : 'nothing (deck empty)'}`
      )
      setSelectedOrderIndex(null) // Clear selection
      setRenderCounter((prev) => prev + 1)
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
    // [STD-ORDER DEBUG] Log entry point
    logger.debug('[STD-ORDER DEBUG] handleOrderCardRightClick START', {
      cardName: card?.name,
      cardId: card?.id,
      actionType: card?.actionType,
      creatureName: orderCardFilterCreature?.creature?.name,
      phase: gameState?.currentPhase,
      allCardProps: card,
    })

    if (!gameState) {
      return
    }

    // Guard: Prevent re-triggering if damage boost modal is showing or attack targeting is active
    if (showDamageBoostModal) {
      logger.debug('[STD-ORDER DEBUG] BLOCKED - damage boost modal is showing')
      return
    }
    if (pendingDamageBoostAttack) {
      logger.debug('[STD-ORDER DEBUG] BLOCKED - pending damage boost attack is active')
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
          addToast(
            `${orderCardFilterCreature.creature.name} (Level ${orderCardFilterCreature.creature.level}) cannot use Level ${card.level} cards`
          )
        } else {
          // Check if spider type (has SPIDER AFFINITY)
          const isSpider = (orderCardFilterCreature.creature.type || []).some(
            (t) => t.toLowerCase() === 'spider'
          )
          if (!isSpider) {
            addToast(
              `${orderCardFilterCreature.creature.name} needs INT ability or be a Spider to use Web`
            )
          } else {
            addToast(`${orderCardFilterCreature.creature.name} cannot use Web`)
          }
        }
        return
      }

      // Get valid Web targets (enemies within range with LOS, not through forests, not already webbed)
      const validTargets = gameState.getWebValidTargets(orderCardFilterCreature, card)

      if (validTargets.length === 0) {
        addToast(
          'No valid targets in range for Web (10 squares, LOS required, not through forests)'
        )
        return
      }

      // Enter targeting mode
      setSelectedOrderCard({ card, cardIndex })
      setOrderCardTargetingMode(true)
      setOrderCardValidTargets(validTargets)
      addToast(
        `🕸️ WEB targeting: Right-click on a highlighted enemy (${validTargets.length} targets)`
      )
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
        addToast(
          `${creature.creature.name} (Level ${creature.creature.level}) cannot use Level ${card.level} cards`
        )
        return
      }

      // Check ability requirement
      if (card.abilityRequired && card.abilityRequired !== 'ANY') {
        const abilities = Array.isArray(card.abilityRequired)
          ? card.abilityRequired
          : [card.abilityRequired]
        const hasRequiredAbility = abilities.some(
          (ability) => creature.creature.abilities?.[ability] === true
        )
        if (!hasRequiredAbility) {
          addToast(
            `${creature.creature.name} doesn't have required ability: ${abilities.join(' or ')}`
          )
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
        healAmount: card.healAmount,
      })
      setShowPatchUpHealModal(true)
      return
    }

    // TOUGH AS NAILS PROACTIVE USE: Cleanse attachments and gain Block 10
    // Show confirmation modal before applying
    if (card.canUseProactively && card.attachOnUse) {
      const creature = orderCardFilterCreature
      logger.debug('[TOUGH AS NAILS] Checking eligibility', {
        card: card.name,
        creature: creature.creature.name,
      })

      // Check level requirement
      if (card.level > creature.creature.level) {
        addToast(
          `${creature.creature.name} (Level ${creature.creature.level}) cannot use Level ${card.level} cards`
        )
        return
      }

      // Check ability requirement
      if (card.abilityRequired && card.abilityRequired !== 'ANY') {
        const abilities = Array.isArray(card.abilityRequired)
          ? card.abilityRequired
          : [card.abilityRequired]
        const hasRequiredAbility = abilities.some(
          (ability) => creature.creature.abilities?.[ability] === true
        )
        if (!hasRequiredAbility) {
          addToast(
            `${creature.creature.name} doesn't have required ability: ${abilities.join(' or ')}`
          )
          return
        }
      }

      // Check if creature has already acted (consumes action like STANDARD)
      if (creature.hasAttackedThisTurn) {
        addToast(`${creature.creature.name} has already acted this turn`)
        return
      }

      // Show confirmation modal
      logger.debug('[TOUGH AS NAILS] Showing confirmation modal')
      setToughAsNailsConfig({
        card,
        cardIndex,
        creature,
      })
      setShowToughAsNailsModal(true)
      return
    }

    // SHIFT + ATTACK STANDARD CARDS: Nimble Strike, Spring Attack, Shadowy Ambush
    // These cards shift first, then attack with damage bonus
    // Must check BEFORE damage boost cards since shift+attack also have damage bonus properties
    const isShiftAttackCard =
      card.shiftBeforeAttack > 0 &&
      (card.meleeDamageBonus > 0 ||
        card.rangedDamageBonus > 0 ||
        card.flatMeleeDamage !== null ||
        card.shiftAfterAttack > 0)
    if (card.actionType === 'STANDARD' && isShiftAttackCard) {
      const creature = orderCardFilterCreature

      // AFFINITY CHECK: Cards with affinityRequired + affinityOverridesRequirements
      // Creature MUST have matching type, level/ability requirements are bypassed
      if (card.affinityRequired && card.affinityOverridesRequirements) {
        const creatureTypes = creature.creature.type || []
        const hasAffinity = creatureTypes.some(
          (t) => t.toUpperCase() === card.affinityRequired.toUpperCase()
        )
        if (!hasAffinity) {
          addToast(
            `${creature.creature.name} requires ${card.affinityRequired} affinity to use ${card.name}`
          )
          return
        }
        // Has affinity - skip level/ability checks below, proceed to other validations
      } else {
        // Normal requirement checks (no affinity override)
        // Check level requirement
        if (card.level > creature.creature.level) {
          addToast(
            `${creature.creature.name} (Level ${creature.creature.level}) cannot use Level ${card.level} cards`
          )
          return
        }

        // Check ability requirement
        if (card.abilityRequired && card.abilityRequired !== 'ANY') {
          const abilities = Array.isArray(card.abilityRequired)
            ? card.abilityRequired
            : [card.abilityRequired]
          const hasRequiredAbility = abilities.some(
            (ability) => creature.creature.abilities?.[ability] === true
          )
          if (!hasRequiredAbility) {
            addToast(
              `${creature.creature.name} doesn't have required ability: ${abilities.join(' or ')}`
            )
            return
          }
        }
      }

      // Check if creature has already acted
      if (creature.hasAttackedThisTurn) {
        addToast(`${creature.creature.name} has already acted this turn`)
        return
      }

      // Check if creature is tapped
      if (creature.isTapped) {
        addToast(`${creature.creature.name} is tapped`)
        return
      }

      // Check if creature has melee attack (required for all shift+attack cards)
      if (!creature.creature.meleeAttack) {
        addToast(`${creature.creature.name} has no melee attack`)
        return
      }

      // Show confirmation modal
      setShiftAttackConfig({
        card,
        cardIndex,
        creature,
      })
      setShowShiftAttackModal(true)
      return
    }

    // CHARGE STANDARD CARDS: Move full speed, then melee attack with damage bonus
    // Must be checked BEFORE regular damage boost cards since Charge also has meleeDamageBonus
    if (card.actionType === 'STANDARD' && card.moveBeforeAttack === 'speed') {
      const creature = orderCardFilterCreature

      // Check level requirement
      if (card.level > creature.creature.level) {
        addToast(
          `${creature.creature.name} (Level ${creature.creature.level}) cannot use Level ${card.level} cards`
        )
        return
      }

      // Check ability requirement
      if (card.abilityRequired && card.abilityRequired !== 'ANY') {
        const abilities = Array.isArray(card.abilityRequired)
          ? card.abilityRequired
          : [card.abilityRequired]
        const hasRequiredAbility = abilities.some(
          (ability) => creature.creature.abilities?.[ability] === true
        )
        if (!hasRequiredAbility) {
          addToast(
            `${creature.creature.name} doesn't have required ability: ${abilities.join(' or ')}`
          )
          return
        }
      }

      // Check if creature has already acted
      if (creature.hasAttackedThisTurn) {
        addToast(`${creature.creature.name} has already acted this turn`)
        return
      }

      // Check if creature is tapped
      if (creature.isTapped) {
        addToast(`${creature.creature.name} is tapped`)
        return
      }

      // Check if creature has already moved this turn (Charge uses movement)
      if (creature.hasMovedThisTurn) {
        addToast(`${creature.creature.name} has already moved this turn`)
        return
      }

      // Check if creature has melee attack (required for Charge)
      if (!creature.creature.meleeAttack) {
        addToast(`${creature.creature.name} has no melee attack`)
        return
      }

      // Show confirmation modal
      setChargeConfig({
        card,
        cardIndex,
        creature,
      })
      setShowChargeModal(true)
      return
    }

    // DAMAGE BOOST STANDARD CARDS: Power Attack, Hacking Frenzy, Killing Strike (melee), Gout of Fire (ranged)
    // These cards add bonus damage to melee/ranged attacks or deal flat damage
    // IMPORTANT: Exclude Charge cards (moveBeforeAttack === 'speed') and Shift+Attack cards (shiftBeforeAttack > 0)
    // Those cards have their own handlers above
    const isMeleeDamageBoost = card.meleeDamageBonus > 0 || card.flatMeleeDamage !== null
    const isRangedDamageBoost = card.rangedDamageBonus > 0
    const isChargeType = card.moveBeforeAttack === 'speed'
    const isShiftAttackType = card.shiftBeforeAttack > 0

    // [STD-ORDER DEBUG] Log STANDARD card property checks
    logger.debug('[STD-ORDER DEBUG] STANDARD card property check', {
      cardName: card.name,
      actionType: card.actionType,
      meleeDamageBonus: card.meleeDamageBonus,
      rangedDamageBonus: card.rangedDamageBonus,
      flatMeleeDamage: card.flatMeleeDamage,
      isMeleeDamageBoost,
      isRangedDamageBoost,
      isChargeType,
      isShiftAttackType,
      willEnterDamageBoostBlock:
        card.actionType === 'STANDARD' &&
        (isMeleeDamageBoost || isRangedDamageBoost) &&
        !isChargeType &&
        !isShiftAttackType,
    })

    if (
      card.actionType === 'STANDARD' &&
      (isMeleeDamageBoost || isRangedDamageBoost) &&
      !isChargeType &&
      !isShiftAttackType
    ) {
      const creature = orderCardFilterCreature

      // AFFINITY CHECK: Cards with affinityRequired + affinityOverridesRequirements
      // Creature MUST have matching type, level/ability requirements are bypassed
      if (card.affinityRequired && card.affinityOverridesRequirements) {
        const creatureTypes = creature.creature.type || []
        const hasAffinity = creatureTypes.some(
          (t) => t.toUpperCase() === card.affinityRequired.toUpperCase()
        )
        if (!hasAffinity) {
          addToast(
            `${creature.creature.name} requires ${card.affinityRequired} affinity to use ${card.name}`
          )
          return
        }
        // Has affinity - skip level/ability checks below, proceed to other validations
      } else {
        // Normal requirement checks (no affinity override)
        // Check level requirement
        if (card.level > creature.creature.level) {
          addToast(
            `${creature.creature.name} (Level ${creature.creature.level}) cannot use Level ${card.level} cards`
          )
          return
        }

        // Check ability requirement
        if (card.abilityRequired && card.abilityRequired !== 'ANY') {
          const abilities = Array.isArray(card.abilityRequired)
            ? card.abilityRequired
            : [card.abilityRequired]
          const hasRequiredAbility = abilities.some(
            (ability) => creature.creature.abilities?.[ability] === true
          )
          if (!hasRequiredAbility) {
            addToast(
              `${creature.creature.name} doesn't have required ability: ${abilities.join(' or ')}`
            )
            return
          }
        }
      }

      // Check if creature has already acted
      if (creature.hasAttackedThisTurn) {
        addToast(`${creature.creature.name} has already acted this turn`)
        return
      }

      // Check if creature is tapped
      if (creature.isTapped) {
        addToast(`${creature.creature.name} is tapped`)
        return
      }

      // Check if creature has the required attack type
      // EXCEPTION: Spell damage cards (isSpellDamage: true) don't require creature to have ranged attack
      if (isRangedDamageBoost && !creature.creature.rangedAttack && !card.isSpellDamage) {
        addToast(`${creature.creature.name} has no ranged attack`)
        return
      }
      if (isMeleeDamageBoost && !creature.creature.meleeAttack) {
        addToast(`${creature.creature.name} has no melee attack`)
        return
      }

      // Show confirmation modal
      // [STD-ORDER DEBUG] Log DamageBoostModal being shown
      logger.debug('[STD-ORDER DEBUG] SHOWING DamageBoostModal', {
        cardName: card.name,
        creatureName: creature.creature.name,
        config: { card, cardIndex, creature: creature.creature.name },
      })
      setDamageBoostConfig({
        card,
        cardIndex,
        creature,
      })
      setShowDamageBoostModal(true)
      return
    }

    // [STD-ORDER DEBUG] Log fallthrough to generic handler
    logger.debug('[STD-ORDER DEBUG] FALLTHROUGH to generic targeting mode', {
      cardName: card.name,
      actionType: card.actionType,
      reason: 'Did not match any specialized handler (DamageBoost, Charge, ShiftAttack, etc.)',
    })

    // GENERIC ORDER CARDS: Standard validation
    // Check level requirement: card level <= creature level
    if (card.level > orderCardFilterCreature.creature.level) {
      addToast(
        `${orderCardFilterCreature.creature.name} (Level ${orderCardFilterCreature.creature.level}) cannot use Level ${card.level} cards`
      )
      return
    }

    // Check ability requirement
    if (card.abilityRequired && card.abilityRequired !== 'ANY') {
      const abilities = Array.isArray(card.abilityRequired)
        ? card.abilityRequired
        : [card.abilityRequired]
      const hasRequiredAbility = abilities.some(
        (ability) => orderCardFilterCreature.creature.abilities?.[ability] === true
      )
      if (!hasRequiredAbility) {
        addToast(
          `${orderCardFilterCreature.creature.name} doesn't have required ability: ${abilities.join(' or ')}`
        )
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
   * Confirm Damage Boost modal - enters attack target selection mode
   * Called when player confirms they want to use Power Attack, Hacking Frenzy, or Killing Strike
   */
  const confirmDamageBoost = () => {
    // [STD-ORDER DEBUG] Log confirmDamageBoost entry
    logger.debug('[STD-ORDER DEBUG] confirmDamageBoost called', {
      hasConfig: !!damageBoostConfig,
      cardName: damageBoostConfig?.card?.name,
      creatureName: damageBoostConfig?.creature?.creature?.name,
    })

    if (!damageBoostConfig?.card || !damageBoostConfig?.creature || !gameState) {
      logger.debug('[STD-ORDER DEBUG] confirmDamageBoost EARLY EXIT - missing config')
      cancelDamageBoostAttack()
      return
    }

    const { card, cardIndex, creature } = damageBoostConfig

    // Determine if this is a ranged or melee damage boost
    const isRangedBoost = card.rangedDamageBonus > 0

    // Store pending damage boost attack info (includes bonus/flat damage values and attack type)
    setPendingDamageBoostAttack({
      card,
      cardIndex,
      creature,
      damageBonus: isRangedBoost ? card.rangedDamageBonus : card.meleeDamageBonus || 0,
      flatDamage: card.flatMeleeDamage,
      isRanged: isRangedBoost,
    })

    // Close modal
    setShowDamageBoostModal(false)
    setDamageBoostConfig({ card: null, cardIndex: null, creature: null })

    // Select the creature and show valid attack targets
    setSelectedBoardCreature(creature)

    // Get valid targets based on attack type (melee or ranged)
    const allTargets = gameState.getValidAttackTargets(creature)
    let filteredTargets = isRangedBoost
      ? allTargets.filter((t) => t.attackType === 'ranged')
      : allTargets.filter((t) => t.attackType === 'melee')

    // CONFUSION GAZE SUPPORT: For melee damage boosts, also include Confusion Gaze targets
    // Umbra Hulk (and creatures with Confusion Gaze) can attack enemies within 5 tiles using the gaze
    // The damage boost applies to the melee attack after the slide
    if (!isRangedBoost && gameState.hasConfusionGaze && gameState.hasConfusionGaze(creature)) {
      const gazeTargets = gameState.getConfusionGazeTargets(creature)
      // Add gaze targets that aren't already in the list (as melee targets)
      for (const gazeTarget of gazeTargets) {
        const alreadyInList = filteredTargets.some(
          (t) =>
            t.creature?.instanceId === gazeTarget.instanceId ||
            t.instanceId === gazeTarget.instanceId
        )
        if (!alreadyInList) {
          // Add as a special "confusion_gaze" attack type target
          filteredTargets.push({
            creature: gazeTarget,
            instanceId: gazeTarget.instanceId,
            attackType: 'confusion_gaze',
            position: gazeTarget.position,
          })
        }
      }
    }

    const attackTypeText = isRangedBoost ? 'ranged' : 'melee'

    if (filteredTargets.length === 0) {
      addToast(`No valid ${attackTypeText} targets in range`)
      cancelDamageBoostAttack()
      return
    }

    // Set valid attack targets - reuse validAttackTargets state
    setValidAttackTargets(filteredTargets)

    // Toast instruction
    const damageText =
      card.flatMeleeDamage !== null
        ? `${card.flatMeleeDamage} damage`
        : `+${isRangedBoost ? card.rangedDamageBonus : card.meleeDamageBonus} bonus damage`

    // Mention Confusion Gaze if available
    const hasConfusionGaze =
      !isRangedBoost && gameState.hasConfusionGaze && gameState.hasConfusionGaze(creature)
    const gazeNote = hasConfusionGaze ? ' (includes Confusion Gaze targets)' : ''
    addToast(
      `${card.name} active (${damageText}): Right-click an enemy to ${attackTypeText} attack${gazeNote}`
    )
  }

  /**
   * Cancel Damage Boost attack (from modal or during target selection)
   * Returns card to hand and clears all damage boost state
   */
  const cancelDamageBoostAttack = () => {
    clearDamageBoostState()
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
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
   * Handle Attachment Removal Modal - Remove Attachment
   * Removes a removable attachment (Web, Leap Away, etc.) from creature
   * Consumes standard action (but creature can still move after)
   */
  const handleRemoveWeb = () => {
    if (!webRemovalCreature || !gameState) {
      setShowWebRemovalModal(false)
      setWebRemovalCreature(null)
      return
    }

    // Check if creature has already used its standard action (attacked)
    if (webRemovalCreature.hasAttackedThisTurn) {
      addToast(
        `${webRemovalCreature.creature.name} has already used its action and cannot remove the attachment!`
      )
      setShowWebRemovalModal(false)
      setWebRemovalCreature(null)
      return
    }

    // Get the first removable attachment
    const removableAttachments = gameState.getRemovableAttachments
      ? gameState.getRemovableAttachments(webRemovalCreature)
      : []

    if (removableAttachments.length === 0) {
      addToast(`No removable attachments found!`)
      setShowWebRemovalModal(false)
      setWebRemovalCreature(null)
      return
    }

    const attachmentToRemove = removableAttachments[0]
    const attachmentName = attachmentToRemove.name || 'attachment'
    const isWeb = attachmentName.toUpperCase().includes('WEB')

    // Remove the attachment using the generic method
    const result = gameState.removeAttachmentAsStandard(webRemovalCreature, attachmentToRemove)

    if (result.success) {
      // Consume standard action (but creature can still move!)
      webRemovalCreature.hasAttackedThisTurn = true
      const icon = isWeb ? '🕸️' : '🦘'
      addToast(
        `${icon} ${attachmentName} removed from ${webRemovalCreature.creature.name} (action used, can still move)`
      )
      // Clear selection so player can re-select to move
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
    } else {
      addToast(`Failed to remove ${attachmentName}: ${result.reason}`)
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
      setHealingTouchData(null)
      return
    }

    const result = gameState.executeHealingTouch(healingTouchHealer, healingTouchTarget, 'heal')

    if (result.success) {
      const isSelf = healingTouchHealer.instanceId === healingTouchTarget.instanceId
      addToast(
        `💚 HEALING TOUCH: ${healingTouchHealer.creature.name} healed ${isSelf ? 'itself' : healingTouchTarget.creature.name}! ${result.message}`
      )
      // Clear selection so player can see the updated state
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter((prev) => prev + 1)
    } else {
      addToast(`Healing Touch failed: ${result.message}`)
    }

    setShowHealingTouchModal(false)
    setHealingTouchData(null)
  }

  /**
   * Handle Healing Touch Modal - Remove Card
   * Removes an attached Order card from the target creature
   * @param {number} cardIndex - Index of the attached card to remove
   */
  const handleHealingTouchRemoveCard = (cardIndex) => {
    if (!healingTouchHealer || !healingTouchTarget || !gameState) {
      setShowHealingTouchModal(false)
      setHealingTouchData(null)
      return
    }

    const result = gameState.executeHealingTouch(
      healingTouchHealer,
      healingTouchTarget,
      'removeCard',
      cardIndex
    )

    if (result.success) {
      const isSelf = healingTouchHealer.instanceId === healingTouchTarget.instanceId
      addToast(
        `💚 HEALING TOUCH: ${healingTouchHealer.creature.name} removed ${result.removedCard?.name || 'card'} from ${isSelf ? 'itself' : healingTouchTarget.creature.name}!`
      )
      // Clear selection so player can see the updated state
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter((prev) => prev + 1)
    } else {
      addToast(`Healing Touch failed: ${result.message}`)
    }

    setShowHealingTouchModal(false)
    setHealingTouchData(null)
  }

  /**
   * Handle Healing Touch Modal - Cancel
   * Closes the modal without taking action
   */
  const handleHealingTouchCancel = () => {
    setShowHealingTouchModal(false)
    setHealingTouchData(null)
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
      setRenderCounter((prev) => prev + 1)
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
    const {
      attackerInstance,
      defenderInstance,
      targetInfo,
      damageBoostCard,
      damageBoostBonus,
      damageBoostFlat,
      isShiftAttack,
      shiftAfterAttack,
    } = action

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
      (t) =>
        t.creature.instanceId === defenderInstance.instanceId &&
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
    const incomingDamageForCheck =
      targetInfo.attackType === 'melee'
        ? attackerInstance.creature.meleeAttack?.damage || 0
        : attackerInstance.creature.rangedAttack?.damage || 0

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(
        defenderInstance,
        incomingDamageForCheck,
        attackerInstance.owner
      )
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, incomingDamageForCheck, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(
            `👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${incomingDamageForCheck} damage! Ability used until next Undead Refresh.`
          )
        }

        // Attack is blocked - tap attacker if they moved and mark as attacked
        attackerInstance.hasAttackedThisTurn = true
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        // Clear AI processing state
        setProcessingAIAction(false)
        setRenderCounter((prev) => prev + 1)
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

      // If AI used a damage boost card, discard it now and toast
      if (damageBoostCard) {
        const attackerPlayer = gameState.players[attackerInstance.owner]
        const cardIndex = attackerPlayer.orderHand.findIndex((c) => c.id === damageBoostCard.id)
        if (cardIndex !== -1) {
          attackerPlayer.orderHand.splice(cardIndex, 1)
          attackerPlayer.orderDiscard.push(damageBoostCard)
          addToast(`🗡️ AI: ${attackerInstance.creature.name} uses ${damageBoostCard.name}!`)
        }
      }

      setPendingAttack({
        attackerInstance,
        defenderInstance,
        targetInfo,
        damageBoostCard,
        damageBoostBonus: damageBoostBonus || 0,
        damageBoostFlat: damageBoostFlat !== undefined ? damageBoostFlat : null,
        // Shift+Attack fields (Phase STD-4)
        isShiftAttack: isShiftAttack || false,
        hasPostAttackShift: (shiftAfterAttack || 0) > 0,
        postAttackShiftDistance: shiftAfterAttack || 0,
      })
      // Set combat panel to defense mode with creature highlights
      setCombatPanelMode('defense')
      setCombatHighlightCreatures({
        attacker: attackerInstance.instanceId,
        defender: defenderInstance.instanceId,
      })
      // Panel handlers will call executeAttackAfterReactions which continues processing
    } else {
      // Defender is AI - use AI logic to decide on reactions and defensive abilities
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)
      const reactionDecision = defenderAI.decideImmediateReactions(defenderInstance)

      // If AI attacker used a damage boost card, discard it now and toast
      if (damageBoostCard) {
        const attackerPlayer = gameState.players[attackerInstance.owner]
        const cardIndex = attackerPlayer.orderHand.findIndex((c) => c.id === damageBoostCard.id)
        if (cardIndex !== -1) {
          attackerPlayer.orderHand.splice(cardIndex, 1)
          attackerPlayer.orderDiscard.push(damageBoostCard)
          addToast(`🗡️ AI: ${attackerInstance.creature.name} uses ${damageBoostCard.name}!`)
        }
      }

      // Calculate incoming damage for defensive decisions (accounting for damage boost cards)
      let incomingDamage
      if (damageBoostFlat !== null && damageBoostFlat !== undefined) {
        // Flat damage replaces base damage
        incomingDamage = damageBoostFlat
      } else {
        const baseDamage =
          targetInfo.attackType === 'melee'
            ? attackerInstance.creature.meleeAttack?.damage || 0
            : attackerInstance.creature.rangedAttack?.damage || 0
        incomingDamage = baseDamage + (damageBoostBonus || 0)
      }

      // AI decides whether to use defensive abilities (COWER, UNSTOPPABLE HORDES, or IMMEDIATE cards)
      const defenseDecision = defenderAI.decideDefense(
        defenderInstance,
        incomingDamage,
        attackerInstance.owner
      )
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(
          defenderInstance,
          incomingDamage,
          attackerInstance.owner
        )
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
            creaturesUsed,
          }
        }
      } else if (defenseDecision.type === 'immediate_card') {
        // Apply IMMEDIATE card defense
        const result = gameState.applyImmediateCardDefense(
          defenseDecision.card,
          defenseDecision.creature
        )
        if (result.success) {
          defenseResult = {
            success: true,
            type: 'immediate_card',
            damagePrevented: result.damagePrevented,
            moraleCost: result.moraleCost || 0,
            cardUsed: defenseDecision.card.name,
            creatureTapped: defenseDecision.creature.creature.name,
            moraleGain: result.moraleGain || 0,
            untapAfterUse: result.untapAfterUse || false,
          }

          // Handle opponent draws (Recoil) - defender chooses which opponent receives card
          if (result.opponentDrawsCards > 0) {
            const cardName = result.cardUsed?.name || defenseDecision.card.name
            handleOpponentDrawEffect(
              result.opponentDrawsCards,
              cardName,
              defenderInstance.owner,
              attackerInstance.owner
            )
          }
        }
      }

      // Process AI reactions (IMMEDIATE cards) - legacy handling
      if (reactionDecision.reactions.length > 0) {
        const defenderPlayer = gameState.players[defenderPlayerId]

        // Sort by cardIndex descending to prevent array shift issues
        reactionDecision.reactions.sort((a, b) => b.cardIndex - a.cardIndex)

        reactionDecision.reactions.forEach((reaction) => {
          // Tap creature
          reaction.creature.isTapped = true
          // Discard card
          defenderPlayer.orderHand.splice(reaction.cardIndex, 1)
        })
      }

      // Execute attack immediately for AI defender (with or without defense)
      // Include damage boost card info if present
      let result
      if (defenseResult && defenseResult.success) {
        result = gameState.executeAttackWithDefense(
          attackerInstance,
          defenderInstance,
          targetInfo.attackType,
          defenseResult.damagePrevented,
          defenseResult.type,
          damageBoostBonus || 0,
          damageBoostFlat !== undefined ? damageBoostFlat : null
        )
      } else {
        result = gameState.executeAttack(
          attackerInstance,
          defenderInstance,
          targetInfo.attackType,
          damageBoostBonus || 0,
          damageBoostFlat !== undefined ? damageBoostFlat : null
        )
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
            if (defenseResult.moraleGain > 0)
              extraEffects += ` +${defenseResult.moraleGain} morale!`
            if (defenseResult.untapAfterUse)
              extraEffects += ` ${defenseResult.creatureTapped} untapped!`
            if (defenseResult.bonusDrawsQueued > 0)
              extraEffects += ` Drew ${defenseResult.bonusDrawsQueued} card${defenseResult.bonusDrawsQueued > 1 ? 's' : ''}.`
            message += `⚡ AI used ${defenseResult.cardUsed}: ${defenseResult.damagePrevented} damage prevented${defenseResult.untapAfterUse ? '' : ` (${defenseResult.creatureTapped} tapped)`}!${extraEffects} `
          }
        }

        // Add reaction info to message
        if (reactionDecision.reactions.length > 0) {
          message += `⚡ AI used ${reactionDecision.reactions.length} Immediate card${reactionDecision.reactions.length !== 1 ? 's' : ''}! `
        }

        message +=
          `${attackerInstance.creature.name} attacked ${defenderInstance.creature.name} ` +
          `with ${targetInfo.attackType} for ${result.damage} damage!`

        if (result.destroyed) {
          message += ` ${defenderInstance.creature.name} was destroyed! `
          message +=
            `Morale changes: Attacker +${result.moraleChange.attacker}, ` +
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
            abilitiesTriggered.push(
              `Life Drain: ${attackerInstance.creature.name} heals ${result.lifeDrain.healAmount} HP`
            )
          }
          if (result.bloodthirsty) {
            abilitiesTriggered.push(
              `Bloodthirsty: +${result.bloodthirsty.leadershipGained} Leadership`
            )
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
            moraleChanges: result.moraleChange,
          })
        } else {
          message += ` ${defenderInstance.creature.name} has ${defenderInstance.currentHP} HP remaining.`
        }

        // UNTAP ON KILL toast notification (separate toast for visibility)
        if (result.untapOnKillTriggered && result.untapOnKillData) {
          addToast(
            `⚔️ UNTAP ON KILL: ${result.untapOnKillData.bugbearName} untaps and can act again!`
          )
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
                eligibleCreatures: eligibleCreatures,
              })
              setShowRiderModal(true)
              setProcessingAIAction(false)
              return // Wait for modal selection before continuing
            } else {
              // AI's RIDER creature killed - AI decides on RIDER
              handleAIRiderDecision(
                ownerPlayerId,
                eligibleCreatures,
                position,
                creatureLevel,
                creatureName,
                faction,
                () => {
                  setProcessingAIAction(false)
                }
              )
              return
            }
          }
        }

        // AI FLASHING BLADES check - after melee attack deals damage
        // Note: The creature's tapping is deferred if it has FLASHING BLADES
        if (
          targetInfo.attackType === 'melee' &&
          result.damage > 0 &&
          gameState.hasFlashingBlades(attackerInstance)
        ) {
          const flashingTargets = gameState.getFlashingBladesTargets(
            attackerInstance,
            defenderInstance
          )
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
                  moraleChanges: flashResult.moraleChange,
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
                  moraleChanges: hiddenResult.moraleChange,
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

      setRenderCounter((prev) => prev + 1)

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
      const isInStartingZone =
        tile.terrain === 'STARTING_ZONE' && tile.startingZoneOwner === gameState.currentPlayer

      // ORC SCOUT: Allow dragging Orc to treasure tiles
      const isOrcScoutValid =
        tile.treasure &&
        !tile.occupant &&
        gameState.canUseOrcScout(gameState.currentPlayer) &&
        (creatureCard?.type || []).includes('Orc')

      // SHADOW STALKER: Allow dragging Shadow Mastiff to mountain-adjacent tiles
      const isShadowStalkerValid =
        gameState.hasShadowStalker(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN' &&
        gameState.board.isAdjacentToMountain(tile.x, tile.y)

      // SUMMON SPIDER: Allow dragging Spider creatures within 5 squares of Drow Priestess
      let isSummonSpiderValid = false
      if (
        gameState.isSpiderCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const priestess = gameState.hasSummonSpider(gameState.currentPlayer)
        if (priestess?.position) {
          const dx = Math.abs(tile.x - priestess.position.x)
          const dy = Math.abs(tile.y - priestess.position.y)
          isSummonSpiderValid = Math.max(dx, dy) <= 5
        }
      }

      // ARCANE PORTAL: Allow dragging War Wizard to any unoccupied Magic Circle tile
      const isArcanePortalValid =
        gameState.hasArcanePortal &&
        gameState.hasArcanePortal(creatureCard) &&
        !tile.occupant &&
        tile.terrain === 'MAGIC_CIRCLE'

      // LICH NECROMANCER: Allow dragging Undead creatures to tiles adjacent to Lich Necromancer
      let isLichNecromancerValid = false
      if (
        gameState.isUndeadCreature &&
        gameState.isUndeadCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const lich =
          gameState.hasLichNecromancerDeploy &&
          gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
        if (lich?.position) {
          const dx = Math.abs(tile.x - lich.position.x)
          const dy = Math.abs(tile.y - lich.position.y)
          isLichNecromancerValid = Math.max(dx, dy) === 1
        }
      }

      // ORC DRUID: Allow dragging Beast/Elemental creatures to tiles adjacent to Orc Druid
      let isOrcDruidValid = false
      if (
        gameState.isBeastOrElementalCreature &&
        gameState.isBeastOrElementalCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const druid =
          gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)
        if (druid?.position) {
          const dx = Math.abs(tile.x - druid.position.x)
          const dy = Math.abs(tile.y - druid.position.y)
          isOrcDruidValid = Math.max(dx, dy) === 1
        }
      }

      if (
        (isInStartingZone ||
          isOrcScoutValid ||
          isShadowStalkerValid ||
          isSummonSpiderValid ||
          isLichNecromancerValid ||
          isOrcDruidValid ||
          isArcanePortalValid) &&
        !tile.occupant
      ) {
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
        const isInStartingZone =
          tile.terrain === 'STARTING_ZONE' && tile.startingZoneOwner === gameState.currentPlayer

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
          isInStartingZone: true,
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
      const isInStartingZone =
        tile.terrain === 'STARTING_ZONE' && tile.startingZoneOwner === gameState.currentPlayer

      // ORC SCOUT: Check if deploying Orc to treasure tile
      const isOrcScoutDeploy =
        tile.treasure &&
        !tile.occupant &&
        gameState.canUseOrcScout(gameState.currentPlayer) &&
        (creatureCard.type || []).includes('Orc')

      // SHADOW STALKER: Check if deploying Shadow Mastiff to mountain-adjacent tile
      const isShadowStalkerDeploy =
        gameState.hasShadowStalker(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN' &&
        gameState.board.isAdjacentToMountain(tile.x, tile.y)

      // SUMMON SPIDER: Check if deploying Spider creature within 5 squares of Drow Priestess
      let isSummonSpiderDeploy = false
      if (
        gameState.isSpiderCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const priestess = gameState.hasSummonSpider(gameState.currentPlayer)
        if (priestess?.position) {
          const dx = Math.abs(tile.x - priestess.position.x)
          const dy = Math.abs(tile.y - priestess.position.y)
          isSummonSpiderDeploy = Math.max(dx, dy) <= 5
        }
      }

      // LICH NECROMANCER: Check if deploying Undead creature adjacent to Lich Necromancer
      let isLichNecromancerDeploy = false
      if (
        gameState.isUndeadCreature &&
        gameState.isUndeadCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const lich =
          gameState.hasLichNecromancerDeploy &&
          gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
        if (lich?.position) {
          const dx = Math.abs(tile.x - lich.position.x)
          const dy = Math.abs(tile.y - lich.position.y)
          isLichNecromancerDeploy = Math.max(dx, dy) === 1 // Adjacent only (range 1)
        }
      }

      // ORC DRUID: Check if deploying Beast/Elemental creature adjacent to Orc Druid
      let isOrcDruidDeploy = false
      if (
        gameState.isBeastOrElementalCreature &&
        gameState.isBeastOrElementalCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const druid =
          gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)
        if (druid?.position) {
          const dx = Math.abs(tile.x - druid.position.x)
          const dy = Math.abs(tile.y - druid.position.y)
          isOrcDruidDeploy = Math.max(dx, dy) === 1 // Adjacent only (range 1)
        }
      }

      // ARCANE PORTAL: Check if deploying War Wizard to any unoccupied Magic Circle tile
      const isArcanePortalDeploy =
        gameState.hasArcanePortal &&
        gameState.hasArcanePortal(creatureCard) &&
        !tile.occupant &&
        tile.terrain === 'MAGIC_CIRCLE'

      if (
        !isInStartingZone &&
        !isOrcScoutDeploy &&
        !isShadowStalkerDeploy &&
        !isSummonSpiderDeploy &&
        !isLichNecromancerDeploy &&
        !isOrcDruidDeploy &&
        !isArcanePortalDeploy
      ) {
        if (gameState.hasShadowStalker(creatureCard)) {
          addToast('SHADOW STALKER: Deploy to starting zone or any tile adjacent to a mountain!')
        } else if (
          gameState.isSpiderCreature(creatureCard) &&
          gameState.hasSummonSpider(gameState.currentPlayer)
        ) {
          addToast('SUMMON SPIDER: Deploy to starting zone or within 5 squares of Drow Priestess!')
        } else if (
          gameState.isUndeadCreature &&
          gameState.isUndeadCreature(creatureCard) &&
          gameState.hasLichNecromancerDeploy &&
          gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
        ) {
          addToast(
            'LICH NECROMANCER: Deploy Undead to starting zone or adjacent to Lich Necromancer!'
          )
        } else if (
          gameState.isBeastOrElementalCreature &&
          gameState.isBeastOrElementalCreature(creatureCard) &&
          gameState.hasOrcDruidDeploy &&
          gameState.hasOrcDruidDeploy(gameState.currentPlayer)
        ) {
          addToast('ORC DRUID: Deploy Beast/Elemental to starting zone or adjacent to Orc Druid!')
        } else if (gameState.hasArcanePortal && gameState.hasArcanePortal(creatureCard)) {
          addToast('ARCANE PORTAL: Deploy to starting zone or any unoccupied Magic Circle tile!')
        } else if (gameState.canUseOrcScout(gameState.currentPlayer)) {
          addToast(
            'Deploy to your starting zone, or use ORC SCOUT to deploy an Orc to any treasure tile!'
          )
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
          isInStartingZone,
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
          addToast(
            `ORC SCOUT: Deployed ${creatureCard.name} to treasure at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isShadowStalkerDeploy && !isInStartingZone) {
          addToast(
            `SHADOW STALKER: ${creatureCard.name} deployed near mountain at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isSummonSpiderDeploy && !isInStartingZone) {
          addToast(
            `SUMMON SPIDER: ${creatureCard.name} summoned near Drow Priestess at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isLichNecromancerDeploy && !isInStartingZone) {
          addToast(
            `LICH NECROMANCER: ${creatureCard.name} deployed adjacent to Lich at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isOrcDruidDeploy && !isInStartingZone) {
          addToast(
            `ORC DRUID: ${creatureCard.name} deployed adjacent to Orc Druid at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isArcanePortalDeploy && !isInStartingZone) {
          addToast(
            `ARCANE PORTAL: ${creatureCard.name} deployed to Magic Circle at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else {
          addToast(
            `Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`
          )
        }
        setRenderCounter((prev) => prev + 1)
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
      setRenderCounter((prev) => prev + 1)
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
    // SHIFT + ATTACK MODE (Nimble Strike, Spring Attack, Shadowy Ambush)
    // Handle clicking on tiles or creatures based on current phase
    // ============================================
    if (shiftAttackMode && pendingShiftAttack) {
      handleShiftAttackTileClick(tile)
      return // Don't process other right-click actions during shift+attack mode
    }

    // ============================================
    // CHARGE MODE (Phase STD-5)
    // Handle clicking on tiles or creatures based on current phase
    // ============================================
    if ((chargeMode || pendingChargeAttack) && pendingChargeAttack) {
      handleChargeTileClick(tile)
      return // Don't process other right-click actions during charge mode
    }

    // ============================================
    // ORDER CARD TARGETING MODE
    // Handle clicking on creatures to apply order cards (Web, etc.)
    // ============================================
    if (orderCardTargetingMode && selectedOrderCard && orderCardFilterCreature) {
      const target = tile.occupant
      if (target && orderCardValidTargets.some((t) => t.instanceId === target.instanceId)) {
        // Valid target - apply the order card
        const card = selectedOrderCard.card
        const caster = orderCardFilterCreature

        // Check if this is a Web card
        if (card.name.toUpperCase().includes('WEB')) {
          // Apply Web using gameState method
          const result = gameState.applyWeb(caster, target, card)
          if (result.success) {
            addToast(
              `🕸️ WEB: ${caster.creature.name} webbed ${target.creature.name}! Target cannot move.`
            )
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
        setRenderCounter((prev) => prev + 1) // Force re-render to show web icon
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
      const isInStartingZone =
        tile.terrain === 'STARTING_ZONE' && tile.startingZoneOwner === gameState.currentPlayer

      // ORC SCOUT: Check if deploying Orc to treasure tile
      const isOrcScoutDeploy =
        tile.treasure &&
        !tile.occupant &&
        gameState.canUseOrcScout(gameState.currentPlayer) &&
        (creatureCard.type || []).includes('Orc')

      // SHADOW STALKER: Check if deploying Shadow Mastiff to mountain-adjacent tile
      const isShadowStalkerDeploy =
        gameState.hasShadowStalker(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN' &&
        gameState.board.isAdjacentToMountain(tile.x, tile.y)

      // SUMMON SPIDER: Check if deploying Spider creature within 5 squares of Drow Priestess
      let isSummonSpiderDeploy = false
      if (
        gameState.isSpiderCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const priestess = gameState.hasSummonSpider(gameState.currentPlayer)
        if (priestess?.position) {
          const dx = Math.abs(tile.x - priestess.position.x)
          const dy = Math.abs(tile.y - priestess.position.y)
          isSummonSpiderDeploy = Math.max(dx, dy) <= 5
        }
      }

      // LICH NECROMANCER: Check if deploying Undead creature adjacent to Lich Necromancer
      let isLichNecromancerDeploy = false
      if (
        gameState.isUndeadCreature &&
        gameState.isUndeadCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const lich =
          gameState.hasLichNecromancerDeploy &&
          gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
        if (lich?.position) {
          const dx = Math.abs(tile.x - lich.position.x)
          const dy = Math.abs(tile.y - lich.position.y)
          isLichNecromancerDeploy = Math.max(dx, dy) === 1 // Adjacent only (range 1)
        }
      }

      // ORC DRUID: Check if deploying Beast/Elemental creature adjacent to Orc Druid
      let isOrcDruidDeploy = false
      if (
        gameState.isBeastOrElementalCreature &&
        gameState.isBeastOrElementalCreature(creatureCard) &&
        !tile.occupant &&
        tile.terrain !== 'MOUNTAIN'
      ) {
        const druid =
          gameState.hasOrcDruidDeploy && gameState.hasOrcDruidDeploy(gameState.currentPlayer)
        if (druid?.position) {
          const dx = Math.abs(tile.x - druid.position.x)
          const dy = Math.abs(tile.y - druid.position.y)
          isOrcDruidDeploy = Math.max(dx, dy) === 1 // Adjacent only (range 1)
        }
      }

      // ARCANE PORTAL: Check if deploying War Wizard to any unoccupied Magic Circle tile
      const isArcanePortalDeploy =
        gameState.hasArcanePortal &&
        gameState.hasArcanePortal(creatureCard) &&
        !tile.occupant &&
        tile.terrain === 'MAGIC_CIRCLE'

      if (
        !isInStartingZone &&
        !isOrcScoutDeploy &&
        !isShadowStalkerDeploy &&
        !isSummonSpiderDeploy &&
        !isLichNecromancerDeploy &&
        !isOrcDruidDeploy &&
        !isArcanePortalDeploy
      ) {
        if (gameState.hasShadowStalker(creatureCard)) {
          addToast('SHADOW STALKER: Deploy to starting zone or any tile adjacent to a mountain!')
        } else if (
          gameState.isSpiderCreature(creatureCard) &&
          gameState.hasSummonSpider(gameState.currentPlayer)
        ) {
          addToast('SUMMON SPIDER: Deploy to starting zone or within 5 squares of Drow Priestess!')
        } else if (
          gameState.isUndeadCreature &&
          gameState.isUndeadCreature(creatureCard) &&
          gameState.hasLichNecromancerDeploy &&
          gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
        ) {
          addToast(
            'LICH NECROMANCER: Deploy Undead to starting zone or adjacent to Lich Necromancer!'
          )
        } else if (
          gameState.isBeastOrElementalCreature &&
          gameState.isBeastOrElementalCreature(creatureCard) &&
          gameState.hasOrcDruidDeploy &&
          gameState.hasOrcDruidDeploy(gameState.currentPlayer)
        ) {
          addToast('ORC DRUID: Deploy Beast/Elemental to starting zone or adjacent to Orc Druid!')
        } else if (gameState.hasArcanePortal && gameState.hasArcanePortal(creatureCard)) {
          addToast('ARCANE PORTAL: Deploy to starting zone or any unoccupied Magic Circle tile!')
        } else if (gameState.canUseOrcScout(gameState.currentPlayer) && tile.treasure) {
          addToast('ORC SCOUT: Only Orc creatures can be deployed to treasure tiles!')
        } else if (gameState.canUseOrcScout(gameState.currentPlayer)) {
          addToast(
            'Deploy to your starting zone, or use ORC SCOUT to deploy an Orc to any treasure tile!'
          )
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
          isInStartingZone,
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
          addToast(
            `ORC SCOUT: Deployed ${creatureCard.name} to treasure at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isShadowStalkerDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(
            `SHADOW STALKER: ${creatureCard.name} deployed near mountain at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isSummonSpiderDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(
            `SUMMON SPIDER: ${creatureCard.name} summoned near Drow Priestess at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isLichNecromancerDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(
            `LICH NECROMANCER: ${creatureCard.name} deployed adjacent to Lich at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isOrcDruidDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(
            `ORC DRUID: ${creatureCard.name} deployed adjacent to Orc Druid at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else if (isArcanePortalDeploy && !isInStartingZone) {
          setSelectedCreatureIndex(null)
          addToast(
            `ARCANE PORTAL: ${creatureCard.name} deployed to Magic Circle at (${tile.x}, ${tile.y})! Protected until your next turn!`
          )
        } else {
          setSelectedCreatureIndex(null)
          addToast(
            `Deployed ${creatureCard.name} to (${tile.x}, ${tile.y}). Protected until your next turn!`
          )
        }
        setRenderCounter((prev) => prev + 1)
      } else {
        addToast('Not enough leadership to deploy this creature!')
      }
      return
    }

    if (gameState.currentPhase !== GamePhases.ACTIVATE) return

    // Handle FLASHING BLADES target selection
    if (flashingBladesTargetMode && flashingBladesPending) {
      const targetCreature = flashingBladesPending.validTargets.find(
        (t) => t.position?.x === tile.x && t.position?.y === tile.y
      )
      if (targetCreature) {
        handleFlashingBladesTargetSelected(targetCreature)
        return
      }
    }

    // Handle HIDDEN BLADE target selection
    if (hiddenBladeTargetMode && hiddenBladePending) {
      const targetCreature = hiddenBladePending.validTargets.find(
        (t) => t.position?.x === tile.x && t.position?.y === tile.y
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
        (t) => t.target.position?.x === tile.x && t.target.position?.y === tile.y
      )
      if (attackOption) {
        handleConfusionGazeAttackSelected(attackOption.target)
        return
      }
    }

    // Handle SLAM tile selection (right-click on valid slam destination)
    if (slamMode && slamValidTiles.length > 0) {
      const isValidSlamTile = slamValidTiles.some((t) => t.x === tile.x && t.y === tile.y)
      if (isValidSlamTile) {
        handleSlamTileSelect(tile.x, tile.y)
        return
      }
    }

    // Must have a creature selected (via left-click) to use right-click actions
    if (!selectedBoardCreature) return

    // CASE 1: Creature selected - check for movement
    const validMove = validMoveTiles.find((vm) => vm.tile.x === tile.x && vm.tile.y === tile.y)
    if (validMove && !tile.occupant) {
      // Show movement confirmation modal
      setPendingMove({
        creature: selectedBoardCreature,
        destination: tile,
        path: validMove.path,
        cost: validMove.cost,
      })
      setShowMoveConfirm(true)
      return
    }

    // ============================================
    // HEALING TOUCH CHECK: Before attack, check if Dwarf Cleric can use HEALING TOUCH
    // This triggers when right-clicking self or an adjacent ally
    // ============================================
    if (
      tile.occupant &&
      tile.occupant.owner === selectedBoardCreature.owner && // Same owner (self or ally)
      gameState.hasHealingTouch(selectedBoardCreature) &&
      !selectedBoardCreature.hasAttackedThisTurn
    ) {
      // Check if target is valid for HEALING TOUCH
      if (gameState.isValidHealingTouchTarget(selectedBoardCreature, tile.occupant)) {
        // Show Healing Touch modal
        setHealingTouchData({
          healer: selectedBoardCreature,
          target: tile.occupant,
        })
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
      if (
        gameState.hasConfusionGaze(selectedBoardCreature) &&
        !selectedBoardCreature.hasAttackedThisTurn &&
        !selectedBoardCreature.isTapped
      ) {
        // Check if target is valid for CONFUSION GAZE (within 5 tiles with LOS)
        const validGazeTargets = gameState.getConfusionGazeTargets(selectedBoardCreature)
        const isValidGazeTarget = validGazeTargets.some(
          (t) => t.instanceId === tile.occupant.instanceId
        )

        if (isValidGazeTarget) {
          // Show modal asking if player wants to use CONFUSION GAZE
          setConfusionGazePending({
            attacker: selectedBoardCreature,
            target: tile.occupant,
            validSlideTiles: [],
            slideDestination: null,
            attackTargets: [],
          })
          setShowConfusionGazeModal(true)
          return // Don't proceed to normal attack - let modal handle it
        }
      }

      // Normal attack flow
      const attackInfo = validAttackTargets.find(
        (target) => target.creature.instanceId === tile.occupant.instanceId
      )
      if (attackInfo) {
        // ============================================
        // DAMAGE BOOST CARD FLOW: Check if pendingDamageBoostAttack is active
        // Include the damage boost info in pendingRightClickAttack
        // ============================================
        let damageBoostCard = null
        let damageBoostBonus = 0
        let damageBoostFlat = null

        if (
          pendingDamageBoostAttack &&
          pendingDamageBoostAttack.creature?.instanceId === selectedBoardCreature.instanceId
        ) {
          // Verify the attack type matches the damage boost card type
          const isRangedBoost = pendingDamageBoostAttack.isRanged
          const expectedAttackType = isRangedBoost ? 'ranged' : 'melee'
          if (attackInfo.attackType !== expectedAttackType) {
            addToast(`This damage boost card only works with ${expectedAttackType} attacks!`)
            // Clear the pending damage boost state
            clearDamageBoostState()
            return
          }
          damageBoostCard = pendingDamageBoostAttack.card
          damageBoostBonus = pendingDamageBoostAttack.damageBonus || 0
          damageBoostFlat = pendingDamageBoostAttack.flatDamage
        }

        setPendingRightClickAttack({
          attacker: selectedBoardCreature,
          target: tile.occupant,
          attackInfo: attackInfo,
          damageBoostCard,
          damageBoostBonus,
          damageBoostFlat,
        })
        // ============================================
        // COMBAT PANEL: Use panel instead of modal - O(1) state updates
        // Set combat mode and highlight creatures on battlefield
        // ============================================
        setCombatPanelMode('attack')
        setCombatHighlightCreatures({
          attacker: selectedBoardCreature.instanceId,
          defender: tile.occupant.instanceId,
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
    // Clear damage boost state if active (returns card to hand by not discarding)
    if (pendingDamageBoostAttack) {
      clearDamageBoostState()
      addToast('Attack cancelled - damage boost card returned to hand')
    }
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
            addToast(
              `🌊 WATER DAMAGE: ${waterResult.creature} was destroyed by drowning! (10 damage)`
            )
          } else {
            addToast(`🌊 WATER DAMAGE: ${waterResult.creature} takes 10 damage from water!`)
          }
        }

        // Check for game over after water deaths
        const hasDeaths = advanceResult.waterDamageResults.some((r) => r.destroyed)
        if (hasDeaths) {
          gameState.checkGameOver()
        }
      }
    }

    setRenderCounter((prev) => prev + 1)
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
      setAiDeathQueue((prev) => prev.slice(1))
      setCurrentAiDeath(nextDeath)
      setShowAiDeathModal(true)
    }

    setRenderCounter((prev) => prev + 1)
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
      setAiDeathQueue((prev) => [...prev, deathData])
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
      attackerInstance,
    })
    setShowInsubstantialModal(true)
  }

  // LIGHTNING BREATH ability handlers (multi-target ranged attack, up to 3 targets) - extracted hook.
  // Placed here (not with the other extracted hooks near the top) because it depends on
  // showInsubstantialNotification and handleOpponentDrawEffect, both plain functions defined
  // in this render body - the call site needs them already assigned, unlike a deferred closure.
  const {
    handleLightningBreathStart,
    handleLightningBreathTargetSelect,
    handleLightningBreathConfirm,
    handleLightningBreathCancel,
    handleLightningBreathDefenseSelected,
  } = useLightningBreath({
    gameState,
    gameConfig,
    addToast,
    isPlayerHuman,
    showInsubstantialNotification,
    handleOpponentDrawEffect,
    clearDamageBoostState,
    lightningBreathMode,
    setLightningBreathMode,
    lightningBreathAttacker,
    setLightningBreathAttacker,
    lightningBreathTargets,
    setLightningBreathTargets,
    lightningBreathValidTargets,
    setLightningBreathValidTargets,
    lightningBreathCurrentAttackIndex,
    setLightningBreathCurrentAttackIndex,
    lightningBreathResults,
    setLightningBreathResults,
    lightningBreathDamageBoostCard,
    setLightningBreathDamageBoostCard,
    lightningBreathDamageBoostBonus,
    setLightningBreathDamageBoostBonus,
    setPendingRightClickAttack,
    setPendingAttack,
    pendingAttack,
    setCombatPanelMode,
    setCombatHighlightCreatures,
  })

  // CONFUSION GAZE ability handlers (Umber Hulk, Sting of Lolth) - extracted hook.
  // Same late-placement reasoning as useLightningBreath above: depends on
  // showInsubstantialNotification, which must already be assigned at call time.
  const {
    checkConfusionGazeOnRightClick,
    handleConfusionGazeConfirm,
    handleConfusionGazeDecline,
    handleNotAdjacentErrorDismiss,
    handleConfusionGazeSlideSelected,
    handleConfusionGazeAttackSelected,
    handleConfusionGazeConfirmAttack,
    handleConfusionGazeComplete,
    handleConfusionGazeCancel,
  } = useConfusionGaze({
    gameState,
    addToast,
    isPlayerHuman,
    showInsubstantialNotification,
    handleOpponentDrawEffect,
    executeAttackAfterDefense,
    closeCombatPanel,
    confusionGazeMode,
    setConfusionGazeMode,
    confusionGazePending,
    setConfusionGazePending,
    setShowConfusionGazeModal,
    pendingAttack,
    setPendingAttack,
    pendingDamageBoostAttack,
    notAdjacentErrorModal,
    setNotAdjacentErrorModal,
    setSelectedBoardCreature,
    setValidMoveTiles,
    setValidAttackTargets,
    setPendingRightClickAttack,
    setCombatPanelMode,
    setCombatHighlightCreatures,
    setRenderCounter,
  })

  // FLASHING BLADES ability handlers (splash damage on attack) - extracted hook.
  // Same late-placement reasoning as useLightningBreath/useConfusionGaze above.
  const {
    handleFlashingBladesUse,
    handleFlashingBladesSkip,
    handleFlashingBladesTargetSelected,
    handleFlashingBladesConfirmAttack,
  } = useFlashingBlades({
    gameState,
    addToast,
    isPlayerHuman,
    showInsubstantialNotification,
    handleOpponentDrawEffect,
    executeAttackAfterDefense,
    closeCombatPanel,
    flashingBladesPending,
    setFlashingBladesPending,
    setShowFlashingBladesModal,
    setFlashingBladesTargetMode,
    setSelectedBoardCreature,
    setValidMoveTiles,
    setValidAttackTargets,
    setPendingRightClickAttack,
    pendingAttack,
    setPendingAttack,
    setCombatPanelMode,
    setCombatHighlightCreatures,
    setRenderCounter,
  })

  // HIDDEN BLADE ability handlers (bonus attack on tapped enemies) - extracted hook.
  // Same late-placement reasoning as useLightningBreath/useConfusionGaze above.
  const {
    handleHiddenBladeUse,
    handleHiddenBladeSkip,
    handleHiddenBladeTargetSelected,
    handleHiddenBladeConfirmAttack,
    checkHiddenBladeTrigger,
  } = useHiddenBlade({
    gameState,
    addToast,
    isPlayerHuman,
    isCurrentPlayerHumanCheck,
    showInsubstantialNotification,
    handleOpponentDrawEffect,
    executeAttackAfterDefense,
    closeCombatPanel,
    hiddenBladePending,
    setHiddenBladePending,
    setShowHiddenBladeModal,
    setHiddenBladeTargetMode,
    setSelectedBoardCreature,
    setValidMoveTiles,
    setValidAttackTargets,
    setPendingRightClickAttack,
    pendingAttack,
    setPendingAttack,
    setCombatPanelMode,
    setCombatHighlightCreatures,
    setRenderCounter,
  })

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

    setRenderCounter((prev) => prev + 1)
  }

  const advancePhase = () => {
    if (!gameState) return

    // ============================================
    // COMBAT LOCK: Block phase advancement during combat - O(1)
    // User must resolve attack confirmation or defense selection first
    // ============================================
    if (combatPanelMode) {
      const message =
        combatPanelMode === 'attack'
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
      const modeMsg =
        confusionGazeMode === 'slide'
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
      addToast(
        '⚠️ You must complete LIGHTNING BREATH target selection or cancel before advancing the phase.'
      )
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
          player.creaturesInPlay.forEach((creature) => {
            if (creature.deployedThisTurn && creature.turnDeployed === gameState.turnNumber) {
              creature.clearDeploymentProtection()
            }
          })
          setHordeRefreshExecuted(false)
          const hordeAdvanceResult = gameState.advancePhase()

          // Handle Deep Wound damage at start of ACTIVATE phase
          if (hordeAdvanceResult?.activatePhaseDamageResults?.length > 0) {
            for (const damageResult of hordeAdvanceResult.activatePhaseDamageResults) {
              if (damageResult.destroyed) {
                addToast(
                  `🩸 DEEP WOUND: ${damageResult.creatureName} took ${damageResult.damage} damage from ${damageResult.source} and was destroyed!`
                )
              } else {
                addToast(
                  `🩸 DEEP WOUND: ${damageResult.creatureName} took ${damageResult.damage} damage from ${damageResult.source}!`
                )
              }
            }
            // Clear pending damage
            gameState.pendingActivatePhaseDamage = []
            // Check for game over after deaths
            const hasDeaths = hordeAdvanceResult.activatePhaseDamageResults.some((r) => r.destroyed)
            if (hasDeaths) {
              gameState.checkGameOver()
            }
          }
        } else {
          const refreshResult = gameState.executeRefreshPhase()

          // Check for REGENERATE results and show toast
          if (gameState.lastRegenerateResult?.length > 0) {
            for (const { creature, healAmount } of gameState.lastRegenerateResult) {
              addToast(`🩹 REGENERATE: ${creature.creature.name} regenerated ${healAmount} HP!`)
            }
            gameState.lastRegenerateResult = null // Clear after showing
          }

          // Handle Deep Wound damage at start of ACTIVATE phase
          if (refreshResult?.activatePhaseDamageResults?.length > 0) {
            for (const damageResult of refreshResult.activatePhaseDamageResults) {
              if (damageResult.destroyed) {
                addToast(
                  `🩸 DEEP WOUND: ${damageResult.creatureName} took ${damageResult.damage} damage from ${damageResult.source} and was destroyed!`
                )
              } else {
                addToast(
                  `🩸 DEEP WOUND: ${damageResult.creatureName} took ${damageResult.damage} damage from ${damageResult.source}!`
                )
              }
            }
            // Clear pending damage
            gameState.pendingActivatePhaseDamage = []
            // Check for game over after deaths
            const hasDeaths = refreshResult.activatePhaseDamageResults.some((r) => r.destroyed)
            if (hasDeaths) {
              gameState.checkGameOver()
            }
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
              damageEvents: kyussResult.damageEvents,
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
                  addToast(
                    `🌊 WATER DAMAGE: ${waterResult.creature} was destroyed by drowning! (10 damage)`
                  )
                } else {
                  addToast(`🌊 WATER DAMAGE: ${waterResult.creature} takes 10 damage from water!`)
                }
              }

              // Check for game over after water deaths
              const hasDeaths = advanceResult.waterDamageResults.some((r) => r.destroyed)
              if (hasDeaths) {
                gameState.checkGameOver()
              }
            }

            // Handle Mortal Wound destructions at start of Deploy phase
            if (advanceResult?.mortalWoundDestructions?.length > 0) {
              for (const { creature, reason } of advanceResult.mortalWoundDestructions) {
                // Discard the Mortal Wound card before death
                gameState.discardAttachedCards(creature)
                // Process creature death (similar to sacrifice - no attacker morale gain)
                const deathResult = gameState.sacrificeCreature(creature)
                addToast(
                  `☠️ MORTAL WOUND: ${creature.creature.name} succumbs to their mortal wound! (-${deathResult.moraleLost} morale)`
                )
              }
              // Clear the pending destructions
              gameState.pendingMortalWoundDestructions = []
              // Check for game over after Mortal Wound deaths
              gameState.checkGameOver()
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

    setRenderCounter((prev) => prev + 1)
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
    if (
      gameState.currentPhase === GamePhases.ACTIVATE &&
      !isCurrentPlayerAI &&
      selectedBoardCreature
    ) {
      const tile = gameState.getTile(
        selectedBoardCreature.position.x,
        selectedBoardCreature.position.y
      )
      canCollectMorale =
        tile?.treasure &&
        tile.treasure.remainingMorale > 0 &&
        !selectedBoardCreature.isTapped &&
        selectedBoardCreature.owner === gameState.currentPlayer
    }

    // Determine auto-executing state
    const isAutoExecuting =
      ((gameState.currentPhase === GamePhases.REFRESH &&
        !gameState.canDeployDuringRefresh(gameState.currentPlayer)) ||
        gameState.currentPhase === GamePhases.CLEANUP) &&
      !isCurrentPlayerAI

    // ============================================
    // COMBAT LOCK: Disable phase button when combat is pending - O(1)
    // Also blocks during FLASHING BLADES or HIDDEN BLADE modal or target selection
    // ============================================
    const isFlashingBladesActive = showFlashingBladesModal || flashingBladesTargetMode
    const isHiddenBladeActive = showHiddenBladeModal || hiddenBladeTargetMode
    const canAdvancePhaseValue =
      !combatPanelMode &&
      !isFlashingBladesActive &&
      !isHiddenBladeActive &&
      (gameState.currentPhase === GamePhases.ACTIVATE || canDeployInCurrentPhase())

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
      morale:
        typeof currentPlayerState?.morale === 'number' && !isNaN(currentPlayerState?.morale)
          ? currentPlayerState.morale
          : 0,
      startingMorale: currentPlayerState?.commander?.startingMorale || 1,
      combatPending: !!combatPanelMode, // Let UI know combat is pending
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
          setRenderCounter((prev) => prev + 1) // Force re-render
        }
      },
    })
  }, [
    gameState,
    gameConfig,
    isAIThinking,
    selectedBoardCreature,
    renderCounter,
    onTurnInfoChange,
    combatPanelMode,
    turnLog,
    isLogExpanded,
  ])

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
    setPendingAIActions((prev) => prev.slice(1))

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
      await new Promise((resolve) => setTimeout(resolve, 800))

      const ai = new SimpleAI(gameState, currentPlayerId)
      const result = ai.executeTurn()

      // Check if there are attack intentions or confusion gaze actions in the result
      const actions = result.actions || []
      const attackIntentions = actions.filter((action) => action.type === 'attack_intention')
      const confusionGazeActions = actions.filter((action) => action.type === 'confusion_gaze')

      // ============================================
      // CONFUSION GAZE AI EXECUTION
      // Process confusion gaze actions immediately (slide + attack)
      // ============================================
      for (const gazeAction of confusionGazeActions) {
        const { attackerInstance, target, slideDestination } = gazeAction

        // Execute the slide
        const slideResult = gameState.executeConfusionGazeSlide(target, slideDestination)
        addToast(
          `😵 AI: ${attackerInstance.creature.name} uses CONFUSION GAZE! Slides ${target.creature.name} to (${slideResult.newPos.x}, ${slideResult.newPos.y})`
        )

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
          const reason =
            eliminationResult.reason === 'morale'
              ? 'Morale reduced to 0!'
              : 'All creatures destroyed!'
          addToast(
            `🏳️ ${gameState.players[target.owner].commander.name} has been eliminated! ${reason}`
          )
        }
      }

      // ============================================
      // LIGHTNING BREATH AI EXECUTION
      // Process lightning breath actions immediately (multi-target ranged attack)
      // ============================================
      const lightningBreathActions = actions.filter((action) => action.type === 'lightning_breath')
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
            const index = defenderPlayer.creaturesInPlay.findIndex(
              (c) => c.instanceId === target.instanceId
            )
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
            const reason =
              eliminationResult.reason === 'morale'
                ? 'Morale reduced to 0!'
                : 'All creatures destroyed!'
            addToast(
              `🏳️ ${gameState.players[target.owner].commander.name} has been eliminated! ${reason}`
            )
          }
        }
      }

      // ============================================
      // WEB CARD AI EXECUTION
      // Process web actions - show notification to human player
      // ============================================
      const webActions = actions.filter((action) => action.type === 'web')
      for (const webAction of webActions) {
        const { casterInstance, targetInstance, webCard } = webAction

        // Web was already applied in simpleAI.js, just show notification
        addToast(
          `🕸️ AI: ${casterInstance.creature.name} cast WEB on ${targetInstance.creature.name}! (Cannot move)`
        )
      }

      // ============================================
      // WEB REMOVAL AI EXECUTION
      // Process web removal actions
      // ============================================
      const webRemovalActions = actions.filter((action) => action.type === 'web_removal')
      for (const removalAction of webRemovalActions) {
        const { creatureInstance, reason } = removalAction

        // Web was already removed in simpleAI.js, just show notification
        addToast(`🕸️ AI: ${creatureInstance.creature.name} removed Web ${reason}`)
      }

      // ============================================
      // SHIFT+ATTACK AI EXECUTION
      // Phase STD-4: Nimble Strike, Spring Attack, Shadowy Ambush
      // Process shift+attack actions - shift creature, discard card, then queue attack
      // ============================================
      const shiftAttackActions = actions.filter((action) => action.type === 'shift_attack')
      for (const shiftAction of shiftAttackActions) {
        const {
          attackerInstance,
          defenderInstance,
          shiftTo,
          attackType,
          card,
          cardIndex,
          damage,
          shiftAfterAttack,
        } = shiftAction

        // 1. Move creature to shift destination
        const originalPos = { ...attackerInstance.position }
        const oldTile = gameState.getTile(originalPos.x, originalPos.y)
        const newTile = gameState.getTile(shiftTo.x, shiftTo.y)

        if (oldTile) oldTile.occupant = null
        attackerInstance.position = { x: shiftTo.x, y: shiftTo.y }
        if (newTile) newTile.occupant = attackerInstance

        // 2. Discard the card from AI player's hand
        const aiPlayer = gameState.players[currentPlayerId]
        if (cardIndex >= 0 && cardIndex < aiPlayer.orderHand.length) {
          aiPlayer.orderHand.splice(cardIndex, 1)
        }

        addToast(
          `🏃 AI: ${attackerInstance.creature.name} uses ${card.name} - shifts to (${shiftTo.x},${shiftTo.y})`
        )

        // 3. Queue this as an attack intention for the pending actions system
        // This allows defense options to be offered to human defenders
        const shiftAttackIntention = {
          type: 'attack_intention',
          attackerInstance,
          defenderInstance,
          targetInfo: {
            creature: defenderInstance,
            attackType: attackType,
            position: defenderInstance.position,
          },
          damageBoostCard: card,
          damageBoostBonus:
            attackType === 'melee' ? card.meleeDamageBonus || 0 : card.rangedDamageBonus || 0,
          damageBoostFlat: card.flatMeleeDamage !== undefined ? card.flatMeleeDamage : null,
          // Store shift+attack specific info for post-attack shift
          isShiftAttack: true,
          shiftAfterAttack: shiftAfterAttack,
        }

        // Add to attack intentions to be processed
        attackIntentions.push(shiftAttackIntention)
      }

      // ============================================
      // CHARGE AI EXECUTION
      // Phase STD-5: Charge (Blood of Gruumsh)
      // Process charge actions - move creature full speed, discard card, then queue attack
      // ============================================
      const chargeActions = actions.filter((action) => action.type === 'charge_attack')
      for (const chargeAction of chargeActions) {
        const { attackerInstance, defenderInstance, moveTo, card, cardIndex, damage } = chargeAction

        // 1. Move creature to charge destination
        const originalPos = { ...attackerInstance.position }
        const oldTile = gameState.getTile(originalPos.x, originalPos.y)
        const newTile = gameState.getTile(moveTo.x, moveTo.y)

        if (oldTile) oldTile.occupant = null
        attackerInstance.position = { x: moveTo.x, y: moveTo.y }
        if (newTile) newTile.occupant = attackerInstance

        // Mark creature as having moved
        attackerInstance.hasMovedThisTurn = true

        // 2. Discard the card from AI player's hand
        const aiPlayer = gameState.players[currentPlayerId]
        if (cardIndex >= 0 && cardIndex < aiPlayer.orderHand.length) {
          aiPlayer.orderHand.splice(cardIndex, 1)
        }

        addToast(
          `🏃 AI: ${attackerInstance.creature.name} uses ${card.name} - charges to (${moveTo.x},${moveTo.y})`
        )

        // 3. Queue this as an attack intention for the pending actions system
        const chargeAttackIntention = {
          type: 'attack_intention',
          attackerInstance,
          defenderInstance,
          targetInfo: {
            creature: defenderInstance,
            attackType: 'melee',
            position: defenderInstance.position,
          },
          damageBoostCard: card,
          damageBoostBonus: card.meleeDamageBonus || 0,
          damageBoostFlat: null,
          isChargeAttack: true,
        }

        // Add to attack intentions to be processed
        attackIntentions.push(chargeAttackIntention)
      }

      // ============================================
      // HORDE PROTECTION FIX FOR AI
      // If AI used HORDE deployment during REFRESH, clear protection for creatures
      // deployed this turn. This mirrors the human HORDE logic at lines 1612-1615.
      // Without this, AI HORDE creatures would keep protection indefinitely.
      // ============================================
      const usedHorde =
        gameState.currentPhase === GamePhases.REFRESH &&
        gameState.canDeployDuringRefresh(currentPlayerId) &&
        actions.some((a) => a.isHordeDeploy)

      if (usedHorde) {
        const player = gameState.getCurrentPlayerState()
        player.creaturesInPlay.forEach((creature) => {
          if (creature.deployedThisTurn && creature.turnDeployed === gameState.turnNumber) {
            creature.clearDeploymentProtection()
          }
        })
      }

      if (attackIntentions.length > 0) {
        // Queue the attack intentions for processing
        setPendingAIActions(attackIntentions)
        addToast(`AI: ${result.message}`)
        setRenderCounter((prev) => prev + 1)
        setIsAIThinking(false)
        // Don't advance phase yet - will advance after all actions are processed
      } else {
        // No attack intentions, proceed normally
        addToast(`AI: ${result.message}`)
        setRenderCounter((prev) => prev + 1)

        // Small delay before advancing phase
        await new Promise((resolve) => setTimeout(resolve, 500))

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
          await new Promise((resolve) => setTimeout(resolve, 500))

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
            player.pendingCardReveals.forEach((reveal) => {
              player.cardsDrawnThisTurn.push(reveal.card)
              if (!player.bonusDrawSourcesThisTurn) player.bonusDrawSourcesThisTurn = []
              player.bonusDrawSourcesThisTurn.push(`Received from ${reveal.source}`)
            })
            player.pendingCardReveals = []
          }

          // Untap all creatures
          player.creaturesInPlay.forEach((creature) => creature.untap())

          // Clear deployment protection from previous turns
          player.creaturesInPlay.forEach((creature) => {
            if (creature.deployedThisTurn && creature.turnDeployed !== gameState.turnNumber) {
              creature.clearDeploymentProtection()
            }
          })

          // Mark refresh as executed and show HORDE deployment modal
          setHordeRefreshExecuted(true)
          setShowHordeModal(true)
          setRenderCounter((prev) => prev + 1)
        }

        if (!hordeRefreshExecuted && !showHordeModal) {
          executeHordeRefresh()
        }
      } else {
        // Normal refresh - auto-execute
        const executePhase = async () => {
          await new Promise((resolve) => setTimeout(resolve, 800))
          advancePhase()
        }
        executePhase()
      }
    } else if (gameState.currentPhase === GamePhases.CLEANUP) {
      const executePhase = async () => {
        await new Promise((resolve) => setTimeout(resolve, 800))
        advancePhase()
      }
      executePhase()
    }
  }, [
    gameState?.currentPhase,
    gameState?.currentPlayer,
    gameState?.turnNumber,
    isAIThinking,
    hordeRefreshExecuted,
    showHordeModal,
  ])

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

  // FALLBACK NOTIFICATIONS: Show harmful attachments and morale notifications at ACTIVATE phase
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
      if (player.cardsDrawnThisTurn === undefined) {
        // Check harmful attachments first, then morale notifications
        if (!checkHarmfulAttachments()) {
          if (player.pendingMoraleNotifications?.length > 0) {
            checkPendingMoraleNotifications()
          }
        }
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
      player.creaturesInPlay.forEach((creature) => {
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
    <div
      className="game-board-container"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
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
        <BoardGridArea
          gameState={gameState}
          getTileCreature={getTileCreature}
          validMoveTiles={validMoveTiles}
          creatureViewMode={creatureViewMode}
          validAttackTargets={validAttackTargets}
          flashingBladesTargetMode={flashingBladesTargetMode}
          flashingBladesPending={flashingBladesPending}
          hiddenBladeTargetMode={hiddenBladeTargetMode}
          hiddenBladePending={hiddenBladePending}
          confusionGazeMode={confusionGazeMode}
          confusionGazePending={confusionGazePending}
          slamMode={slamMode}
          slamValidTiles={slamValidTiles}
          shiftSelectionMode={shiftSelectionMode}
          shiftValidTiles={shiftValidTiles}
          shiftAttackMode={shiftAttackMode}
          pendingShiftAttack={pendingShiftAttack}
          shiftAttackValidTiles={shiftAttackValidTiles}
          chargeMode={chargeMode}
          pendingChargeAttack={pendingChargeAttack}
          chargeValidTiles={chargeValidTiles}
          lightningBreathMode={lightningBreathMode}
          lightningBreathValidTargets={lightningBreathValidTargets}
          lightningBreathTargets={lightningBreathTargets}
          selectedBoardCreature={selectedBoardCreature}
          rangedRangeTiles={rangedRangeTiles}
          lineOfSightPath={lineOfSightPath}
          combatHighlightCreatures={combatHighlightCreatures}
          selectedCreatureIndex={selectedCreatureIndex}
          canDeployInCurrentPhase={canDeployInCurrentPhase}
          playerFactionColors={playerFactionColors}
          allRangedLOSTiles={allRangedLOSTiles}
          orderCardTargetingMode={orderCardTargetingMode}
          orderCardValidTargets={orderCardValidTargets}
          handleTileClick={handleTileClick}
          handleTileRightClick={handleTileRightClick}
          handleDrop={handleDrop}
          handleDragOver={handleDragOver}
          dragOverTile={dragOverTile}
          playerFactions={playerFactions}
          factionHighlight={factionHighlight}
        />

        <PlayerPanelSidebar
          canDeployInCurrentPhase={canDeployInCurrentPhase}
          cancelRightClickAttack={cancelRightClickAttack}
          clearOrderCardFilter={clearOrderCardFilter}
          combatPanelMode={combatPanelMode}
          confirmRightClickAttack={confirmRightClickAttack}
          creatureViewMode={creatureViewMode}
          currentPlayer={currentPlayer}
          currentPlayerId={currentPlayerId}
          gameState={gameState}
          handleConfusionGazeConfirmAttack={handleConfusionGazeConfirmAttack}
          handleDefenseSelected={handleDefenseSelected}
          handleDragEnd={handleDragEnd}
          handleDragStart={handleDragStart}
          handleFlashingBladesConfirmAttack={handleFlashingBladesConfirmAttack}
          handleGraveyardCreatureSelect={handleGraveyardCreatureSelect}
          handleGraveyardDragEnd={handleGraveyardDragEnd}
          handleGraveyardDragStart={handleGraveyardDragStart}
          handleHiddenBladeConfirmAttack={handleHiddenBladeConfirmAttack}
          handleLightningBreathStart={handleLightningBreathStart}
          handleOrderCardClick={handleOrderCardClick}
          handleOrderCardRightClick={handleOrderCardRightClick}
          handleReactionsSkipped={handleReactionsSkipped}
          isPanelCollapsed={isPanelCollapsed}
          isPlayerHuman={isPlayerHuman}
          orderCardFilterCreature={orderCardFilterCreature}
          pendingAttack={pendingAttack}
          pendingRightClickAttack={pendingRightClickAttack}
          selectedBoardCreature={selectedBoardCreature}
          selectedCreatureIndex={selectedCreatureIndex}
          selectedGraveyardCreature={selectedGraveyardCreature}
          selectedOrderCard={selectedOrderCard}
          selectedOrderIndex={selectedOrderIndex}
          setCreatureViewMode={setCreatureViewMode}
          setFactionHighlight={setFactionHighlight}
          setIsPanelCollapsed={setIsPanelCollapsed}
          setSelectedCreatureIndex={setSelectedCreatureIndex}
        />
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
          maxWidth: '400px',
        }}
      >
        {/* Individual Toasts */}
        {toastMessages.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>

      <GameBoardModals
        addToast={addToast}
        bonusDrawSources={bonusDrawSources}
        cancelCharge={cancelCharge}
        cancelCollectMorale={cancelCollectMorale}
        cancelDamageBoostAttack={cancelDamageBoostAttack}
        cancelMove={cancelMove}
        cancelPatchUpHeal={cancelPatchUpHeal}
        cancelShiftAttack={cancelShiftAttack}
        cancelToughAsNails={cancelToughAsNails}
        cardsDrawnData={cardsDrawnData}
        chargeConfig={chargeConfig}
        checkHarmfulAttachments={checkHarmfulAttachments}
        checkPendingMoraleNotifications={checkPendingMoraleNotifications}
        chieftainCallPending={chieftainCallPending}
        clericDrawOrderResult={clericDrawOrderResult}
        confirmCharge={confirmCharge}
        confirmCollectMorale={confirmCollectMorale}
        confirmDamageBoost={confirmDamageBoost}
        confirmMove={confirmMove}
        confirmShiftAttack={confirmShiftAttack}
        confusionGazePending={confusionGazePending}
        counterAttackPending={counterAttackPending}
        currentAiDeath={currentAiDeath}
        currentPlayer={currentPlayer}
        damageBoostConfig={damageBoostConfig}
        damageNotificationData={damageNotificationData}
        discoveredTreasure={discoveredTreasure}
        executePatchUpHeal={executePatchUpHeal}
        executeToughAsNails={executeToughAsNails}
        factionSelectConfig={factionSelectConfig}
        flashingBladesPending={flashingBladesPending}
        gameState={gameState}
        handleAiDeathModalDismiss={handleAiDeathModalDismiss}
        handleChieftainCallDecline={handleChieftainCallDecline}
        handleChieftainCallDeploy={handleChieftainCallDeploy}
        handleConfusionGazeConfirm={handleConfusionGazeConfirm}
        handleConfusionGazeDecline={handleConfusionGazeDecline}
        handleCounterAttackSkipped={handleCounterAttackSkipped}
        handleCounterAttackTargetSelected={handleCounterAttackTargetSelected}
        handleDamageNotificationDismiss={handleDamageNotificationDismiss}
        handleDeployCancel={handleDeployCancel}
        handleDeployConfirm={handleDeployConfirm}
        handleFlashingBladesSkip={handleFlashingBladesSkip}
        handleFlashingBladesUse={handleFlashingBladesUse}
        handleHealingTouchCancel={handleHealingTouchCancel}
        handleHealingTouchHeal={handleHealingTouchHeal}
        handleHealingTouchRemoveCard={handleHealingTouchRemoveCard}
        handleHiddenBladeSkip={handleHiddenBladeSkip}
        handleHiddenBladeUse={handleHiddenBladeUse}
        handleInsubstantialDismiss={handleInsubstantialDismiss}
        handleKeepWeb={handleKeepWeb}
        handleLightningBreathCancel={handleLightningBreathCancel}
        handleLightningBreathConfirm={handleLightningBreathConfirm}
        handleNotAdjacentErrorDismiss={handleNotAdjacentErrorDismiss}
        handleRemoveWeb={handleRemoveWeb}
        handleRiderDecline={handleRiderDecline}
        handleRiderSelect={handleRiderSelect}
        handleScrollbookUse={handleScrollbookUse}
        handleSellswordCard={handleSellswordCard}
        handleSellswordMorale={handleSellswordMorale}
        handleShiftDecisionNo={handleShiftDecisionNo}
        handleShiftDecisionYes={handleShiftDecisionYes}
        handleSlamAccept={handleSlamAccept}
        handleSlamConfirmCancel={handleSlamConfirmCancel}
        handleSlamConfirmExecute={handleSlamConfirmExecute}
        handleSlamSkip={handleSlamSkip}
        harmfulAttachmentsData={harmfulAttachmentsData}
        healingTouchHealer={healingTouchHealer}
        healingTouchTarget={healingTouchTarget}
        hiddenBladePending={hiddenBladePending}
        insubstantialData={insubstantialData}
        lightningBreathAttacker={lightningBreathAttacker}
        lightningBreathMode={lightningBreathMode}
        lightningBreathTargets={lightningBreathTargets}
        magicCircleModalData={magicCircleModalData}
        moraleLossModalData={moraleLossModalData}
        notAdjacentErrorModal={notAdjacentErrorModal}
        ogreDeployMoraleResult={ogreDeployMoraleResult}
        patchUpHealConfig={patchUpHealConfig}
        pendingCollection={pendingCollection}
        pendingDeployment={pendingDeployment}
        pendingMove={pendingMove}
        pendingShiftAfterDefense={pendingShiftAfterDefense}
        recoilDrawnCards={recoilDrawnCards}
        recoilSourceCardName={recoilSourceCardName}
        riderData={riderData}
        scrollbookCardIndex={scrollbookCardIndex}
        selectedRiderCreature={selectedRiderCreature}
        sellswordPending={sellswordPending}
        setBonusDrawSources={setBonusDrawSources}
        setHarmfulAttachmentsData={setHarmfulAttachmentsData}
        setHordeRefreshExecuted={setHordeRefreshExecuted}
        setLightningBreathTargets={setLightningBreathTargets}
        setRecoilDrawnCards={setRecoilDrawnCards}
        setRecoilSourceCardName={setRecoilSourceCardName}
        setRenderCounter={setRenderCounter}
        setScrollbookCardIndex={setScrollbookCardIndex}
        setSelectedBoardCreature={setSelectedBoardCreature}
        setSelectedRiderCreature={setSelectedRiderCreature}
        setSellswordPending={setSellswordPending}
        setShowCardsDrawnModal={setShowCardsDrawnModal}
        setShowClericDrawOrderModal={setShowClericDrawOrderModal}
        setShowHarmfulAttachmentsModal={setShowHarmfulAttachmentsModal}
        setShowHordeModal={setShowHordeModal}
        setShowMagicCircleModal={setShowMagicCircleModal}
        setShowMoraleLossModal={setShowMoraleLossModal}
        setShowOgreDeployMoraleModal={setShowOgreDeployMoraleModal}
        setShowRecoilDrawModal={setShowRecoilDrawModal}
        setShowScrollbookModal={setShowScrollbookModal}
        setShowSellswordModal={setShowSellswordModal}
        setShowTreasureDiscovery={setShowTreasureDiscovery}
        setShowVersatileActionModal={setShowVersatileActionModal}
        setValidAttackTargets={setValidAttackTargets}
        setValidMoveTiles={setValidMoveTiles}
        setVersatileActionPending={setVersatileActionPending}
        setVersatileDeclinedCreatures={setVersatileDeclinedCreatures}
        shiftAttackConfig={shiftAttackConfig}
        showAiDeathModal={showAiDeathModal}
        showCardsDrawnModal={showCardsDrawnModal}
        showChargeModal={showChargeModal}
        showChieftainCallModal={showChieftainCallModal}
        showClericDrawOrderModal={showClericDrawOrderModal}
        showCollectConfirm={showCollectConfirm}
        showConfusionGazeModal={showConfusionGazeModal}
        showCounterAttackTargetModal={showCounterAttackTargetModal}
        showDamageBoostModal={showDamageBoostModal}
        showDamageNotification={showDamageNotification}
        showDeployConfirm={showDeployConfirm}
        showFactionSelectModal={showFactionSelectModal}
        showFlashingBladesModal={showFlashingBladesModal}
        showHarmfulAttachmentsModal={showHarmfulAttachmentsModal}
        showHealingTouchModal={showHealingTouchModal}
        showHiddenBladeModal={showHiddenBladeModal}
        showHordeModal={showHordeModal}
        showInsubstantialModal={showInsubstantialModal}
        showMagicCircleModal={showMagicCircleModal}
        showMoraleLossModal={showMoraleLossModal}
        showMoveConfirm={showMoveConfirm}
        showOgreDeployMoraleModal={showOgreDeployMoraleModal}
        showPatchUpHealModal={showPatchUpHealModal}
        showRecoilDrawModal={showRecoilDrawModal}
        showRiderModal={showRiderModal}
        showScrollbookModal={showScrollbookModal}
        showSellswordModal={showSellswordModal}
        showShiftAttackModal={showShiftAttackModal}
        showShiftDecisionModal={showShiftDecisionModal}
        showSlamConfirmModal={showSlamConfirmModal}
        showSlamModal={showSlamModal}
        showToughAsNailsModal={showToughAsNailsModal}
        showTreasureDiscovery={showTreasureDiscovery}
        showVersatileActionModal={showVersatileActionModal}
        showWebRemovalModal={showWebRemovalModal}
        slamPending={slamPending}
        slamSelectedTile={slamSelectedTile}
        toughAsNailsConfig={toughAsNailsConfig}
        versatileActionPending={versatileActionPending}
        webRemovalCreature={webRemovalCreature}
      />
    </div>
  )
}

export default GameBoard
