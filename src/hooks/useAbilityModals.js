// useAbilityModals.js - Ability modal state management hook
// Extracted from GameBoard.jsx for single responsibility

import { useState, useCallback } from 'react'

/**
 * Custom hook for managing ability modal state
 * Handles state for Flashing Blades, Hidden Blade, Confusion Gaze, Slam,
 * Lightning Breath, Tomb Guardian Splash, and other ability-related UI states
 *
 * @returns {Object} Ability modal state and handlers
 */
export function useAbilityModals() {
  // ============================================
  // FLASHING BLADES ability state
  // Splash damage after melee attack (Drow Blademaster, Human Ranger)
  // ============================================
  const [showFlashingBladesModal, setShowFlashingBladesModal] = useState(false)
  const [flashingBladesPending, setFlashingBladesPending] = useState(null)
  // { attacker, originalTarget, validTargets }
  const [flashingBladesTargetMode, setFlashingBladesTargetMode] = useState(false)

  // ============================================
  // HIDDEN BLADE ability state
  // 10 damage to adjacent tapped enemy after any attack (Drow Assassin)
  // ============================================
  const [showHiddenBladeModal, setShowHiddenBladeModal] = useState(false)
  const [hiddenBladePending, setHiddenBladePending] = useState(null)
  // { attacker, validTargets }
  const [hiddenBladeTargetMode, setHiddenBladeTargetMode] = useState(false)

  // ============================================
  // CONFUSION GAZE ability state
  // Slide enemy then attack (Umber Hulk)
  // ============================================
  const [showConfusionGazeModal, setShowConfusionGazeModal] = useState(false)
  const [confusionGazeMode, setConfusionGazeMode] = useState(null) // null | 'slide' | 'attack'
  const [confusionGazePending, setConfusionGazePending] = useState(null)
  // { attacker, target, validSlideTiles, slideDestination, attackTargets }

  // ============================================
  // SLAM ability state
  // Slide enemy after melee damage (Earth Guardian)
  // ============================================
  const [slamMode, setSlamMode] = useState(false)
  const [slamPending, setSlamPending] = useState(null)
  // { attackerInstance, targetInstance }
  const [slamValidTiles, setSlamValidTiles] = useState([])
  const [showSlamModal, setShowSlamModal] = useState(false) // Decision modal
  const [showSlamConfirmModal, setShowSlamConfirmModal] = useState(false)
  const [slamSelectedTile, setSlamSelectedTile] = useState(null) // { x, y }

  // ============================================
  // TOMB GUARDIAN SWIRL ability state
  // Queue of splash attacks after melee (Skeletal Tomb Guardian)
  // ============================================
  const [pendingSplashAttacks, setPendingSplashAttacks] = useState([])
  // Array of { attackerInstance, targetInstance, damage }
  const [currentSplashIndex, setCurrentSplashIndex] = useState(0)
  const [splashResults, setSplashResults] = useState([])

  // ============================================
  // LIGHTNING BREATH ability state
  // Multi-target ranged attack (Dracolich)
  // ============================================
  const [lightningBreathMode, setLightningBreathMode] = useState(false)
  const [lightningBreathAttacker, setLightningBreathAttacker] = useState(null)
  const [lightningBreathTargets, setLightningBreathTargets] = useState([])
  const [lightningBreathValidTargets, setLightningBreathValidTargets] = useState([])
  const [lightningBreathCurrentAttackIndex, setLightningBreathCurrentAttackIndex] = useState(0)
  const [lightningBreathResults, setLightningBreathResults] = useState([])

  // ============================================
  // DISCIPLE OF KYUSS ability state
  // Damage notification modal
  // ============================================
  const [showDamageNotification, setShowDamageNotification] = useState(false)
  const [damageNotificationData, setDamageNotificationData] = useState(null)
  const [pendingPhaseAdvance, setPendingPhaseAdvance] = useState(false)

  // ============================================
  // INSUBSTANTIAL ability modal
  // Shows when damage is blocked
  // ============================================
  const [showInsubstantialModal, setShowInsubstantialModal] = useState(false)
  const [insubstantialData, setInsubstantialData] = useState(null)

  // ============================================
  // RIDER ability modal
  // Shows when Skeletal Lancer dies (deploy Skeleton from hand)
  // ============================================
  const [showRiderModal, setShowRiderModal] = useState(false)
  const [riderData, setRiderData] = useState(null)
  // { destroyedCreature, creatureLevel, position, ownerPlayerId, eligibleCreatures }
  const [pendingRiderCallback, setPendingRiderCallback] = useState(null)
  const [selectedRiderCreature, setSelectedRiderCreature] = useState(null)

  // ============================================
  // MAGIC CIRCLE AURA modal
  // Shows when Hobgoblin Sorcerer enters/leaves Magic Circle
  // ============================================
  const [showMagicCircleModal, setShowMagicCircleModal] = useState(false)
  const [magicCircleModalData, setMagicCircleModalData] = useState(null)
  // { activated: boolean, deactivated: boolean, sorcererName, sorcererOwner, reason }
  const [pendingMagicCircleNotifications, setPendingMagicCircleNotifications] = useState({})

  // ============================================
  // RANGED SPLASH DAMAGE state (ACID BREATH / EXPLOSIVE BOLTS)
  // ============================================
  const [pendingRangedSplashTargets, setPendingRangedSplashTargets] = useState([])
  const [currentRangedSplashIndex, setCurrentRangedSplashIndex] = useState(0)
  const [rangedSplashAttackInfo, setRangedSplashAttackInfo] = useState(null)
  const [showRangedSplashDefensePanel, setShowRangedSplashDefensePanel] = useState(false)

  // ============================================
  // HEALING TOUCH modal
  // ============================================
  const [showHealingTouchModal, setShowHealingTouchModal] = useState(false)
  const [healingTouchData, setHealingTouchData] = useState(null)

  // ============================================
  // CHIEFTAIN CALL modal
  // ============================================
  const [showChieftainCallModal, setShowChieftainCallModal] = useState(false)
  const [chieftainCallData, setChieftainCallData] = useState(null)

  // ============================================
  // OGRE DEPLOY MORALE modal
  // ============================================
  const [showOgreDeployMoraleModal, setShowOgreDeployMoraleModal] = useState(false)
  const [ogreDeployMoraleData, setOgreDeployMoraleData] = useState(null)

  // ============================================
  // CLERIC DRAW ORDER modal
  // ============================================
  const [showClericDrawOrderModal, setShowClericDrawOrderModal] = useState(false)
  const [clericDrawOrderData, setClericDrawOrderData] = useState(null)

  // ============================================
  // WEB REMOVAL modal
  // ============================================
  const [showWebRemovalModal, setShowWebRemovalModal] = useState(false)
  const [webRemovalData, setWebRemovalData] = useState(null)

  // ============================================
  // CARDS DRAWN modal
  // Shows at ACTIVATE phase start to display cards drawn during REFRESH
  // ============================================
  const [showCardsDrawnModal, setShowCardsDrawnModal] = useState(false)
  const [cardsDrawnData, setCardsDrawnData] = useState([])
  const [bonusDrawSources, setBonusDrawSources] = useState([]) // Card names that triggered bonus draws (e.g., ["Parry"])

  // ============================================
  // RECOIL DRAW modal
  // Shows when opponent uses Recoil - attacker draws a card as side effect
  // Only shown to the attacking player (human only)
  // ============================================
  const [showRecoilDrawModal, setShowRecoilDrawModal] = useState(false)
  const [recoilDrawnCards, setRecoilDrawnCards] = useState([])
  const [recoilSourceCardName, setRecoilSourceCardName] = useState('') // Name of card that caused the draw (e.g., "Recoil")

  // ============================================
  // FACTION SELECT modal (Recoil target selection)
  // Shows when defender uses Recoil with 3+ factions to choose recipient
  // ============================================
  const [showFactionSelectModal, setShowFactionSelectModal] = useState(false)
  const [factionSelectConfig, setFactionSelectConfig] = useState({
    title: '',
    description: '',
    eligibleFactions: [],
    onSelect: null,
    pendingDrawInfo: null // { cardCount, sourceName, defenderPlayerId }
  })

  // ============================================
  // SHIFT AFTER DEFENSE modal (Cloud of Bats)
  // Shows after Cloud of Bats prevents damage, asking if player wants to shift
  // ============================================
  const [showShiftDecisionModal, setShowShiftDecisionModal] = useState(false)
  const [pendingShiftAfterDefense, setPendingShiftAfterDefense] = useState(null)
  // { creature, maxShift, cardName, onComplete }
  const [shiftSelectionMode, setShiftSelectionMode] = useState(false)
  const [shiftValidTiles, setShiftValidTiles] = useState([])

  // ============================================
  // COUNTER-ATTACK TARGET SELECTION modal
  // Shows when Seize the Opportunity has multiple valid targets
  // ============================================
  const [showCounterAttackTargetModal, setShowCounterAttackTargetModal] = useState(false)
  const [counterAttackPending, setCounterAttackPending] = useState(null)
  // { damage, validTargets, defenderInstance, attackerInstance, pendingDefenseResult }

  // ============================================
  // PATCH UP HEAL modal (proactive healing during ACTIVATE)
  // Dual-mode card: Can heal during ACTIVATE phase OR prevent during defense
  // ============================================
  const [showPatchUpHealModal, setShowPatchUpHealModal] = useState(false)
  const [patchUpHealConfig, setPatchUpHealConfig] = useState({
    card: null,
    creature: null,
    healAmount: 0
  })

  // ============================================
  // CLEAR STATE FUNCTIONS
  // ============================================

  /**
   * Clear all Flashing Blades state
   */
  const clearFlashingBladesState = useCallback(() => {
    setShowFlashingBladesModal(false)
    setFlashingBladesPending(null)
    setFlashingBladesTargetMode(false)
  }, [])

  /**
   * Clear all Hidden Blade state
   */
  const clearHiddenBladeState = useCallback(() => {
    setShowHiddenBladeModal(false)
    setHiddenBladePending(null)
    setHiddenBladeTargetMode(false)
  }, [])

  /**
   * Clear all Confusion Gaze state
   */
  const clearConfusionGazeState = useCallback(() => {
    setShowConfusionGazeModal(false)
    setConfusionGazeMode(null)
    setConfusionGazePending(null)
  }, [])

  /**
   * Clear all Slam state
   */
  const clearSlamState = useCallback(() => {
    setSlamMode(false)
    setSlamPending(null)
    setSlamValidTiles([])
    setShowSlamModal(false)
    setShowSlamConfirmModal(false)
    setSlamSelectedTile(null)
  }, [])

  /**
   * Clear all Lightning Breath state
   */
  const clearLightningBreathState = useCallback(() => {
    setLightningBreathMode(false)
    setLightningBreathAttacker(null)
    setLightningBreathTargets([])
    setLightningBreathValidTargets([])
    setLightningBreathCurrentAttackIndex(0)
    setLightningBreathResults([])
  }, [])

  /**
   * Clear all Tomb Guardian Splash state
   */
  const clearSplashState = useCallback(() => {
    setPendingSplashAttacks([])
    setCurrentSplashIndex(0)
    setSplashResults([])
  }, [])

  /**
   * Clear all Ranged Splash state
   */
  const clearRangedSplashState = useCallback(() => {
    setPendingRangedSplashTargets([])
    setCurrentRangedSplashIndex(0)
    setRangedSplashAttackInfo(null)
    setShowRangedSplashDefensePanel(false)
  }, [])

  /**
   * Clear all Rider state
   */
  const clearRiderState = useCallback(() => {
    setShowRiderModal(false)
    setRiderData(null)
    setPendingRiderCallback(null)
    setSelectedRiderCreature(null)
  }, [])

  /**
   * Clear all ability modal state
   * Called at end of turn or game reset
   */
  const clearAllAbilityModalState = useCallback(() => {
    clearFlashingBladesState()
    clearHiddenBladeState()
    clearConfusionGazeState()
    clearSlamState()
    clearLightningBreathState()
    clearSplashState()
    clearRangedSplashState()
    clearRiderState()
    setShowDamageNotification(false)
    setDamageNotificationData(null)
    setPendingPhaseAdvance(false)
    setShowInsubstantialModal(false)
    setInsubstantialData(null)
    setShowMagicCircleModal(false)
    setMagicCircleModalData(null)
    setPendingMagicCircleNotifications({})
    setShowHealingTouchModal(false)
    setHealingTouchData(null)
    setShowChieftainCallModal(false)
    setChieftainCallData(null)
    setShowOgreDeployMoraleModal(false)
    setOgreDeployMoraleData(null)
    setShowClericDrawOrderModal(false)
    setClericDrawOrderData(null)
    setShowWebRemovalModal(false)
    setWebRemovalData(null)
    setShowCardsDrawnModal(false)
    setCardsDrawnData([])
    setShowCounterAttackTargetModal(false)
    setCounterAttackPending(null)
  }, [
    clearFlashingBladesState,
    clearHiddenBladeState,
    clearConfusionGazeState,
    clearSlamState,
    clearLightningBreathState,
    clearSplashState,
    clearRangedSplashState,
    clearRiderState
  ])

  return {
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

    // Clear all
    clearAllAbilityModalState
  }
}

export default useAbilityModals
