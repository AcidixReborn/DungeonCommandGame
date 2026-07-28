// useCombat.js - Combat state management hook
// Extracted from GameBoard.jsx for single responsibility

import { useState, useCallback } from 'react'

/**
 * Custom hook for managing combat state
 * Handles pending attacks, defense options, and combat panel mode
 *
 * @returns {Object} Combat state and handlers
 */
export function useCombat() {
  // ============================================
  // PENDING ATTACK STATE
  // Stores attack info while waiting for defender reactions
  // ============================================
  const [pendingAttack, setPendingAttack] = useState(null)

  // ============================================
  // COMBAT PANEL STATE
  // Used for in-panel attack confirmation and defense options
  // ============================================
  const [combatPanelMode, setCombatPanelMode] = useState(null) // 'attack' | 'defense' | null
  const [combatHighlightCreatures, setCombatHighlightCreatures] = useState({
    attacker: null, // instanceId of attacking creature
    defender: null, // instanceId of defending creature
  })

  // ============================================
  // MOVEMENT CONFIRMATION STATE
  // ============================================
  const [showMoveConfirm, setShowMoveConfirm] = useState(false)
  const [pendingMove, setPendingMove] = useState(null) // {creature, destination, path, cost}

  // ============================================
  // RIGHT-CLICK ATTACK STATE
  // ============================================
  const [pendingRightClickAttack, setPendingRightClickAttack] = useState(null) // {attacker, target, attackInfo}

  // ============================================
  // AI ACTION QUEUE
  // For processing attacks with modal support
  // ============================================
  const [pendingAIActions, setPendingAIActions] = useState([])
  const [processingAIAction, setProcessingAIAction] = useState(false)

  /**
   * Start combat panel in defense mode
   * Called when a human defender is attacked
   * @param {Object} attackInfo - {attackerInstance, defenderInstance, targetInfo}
   */
  const startDefensePanel = useCallback((attackInfo) => {
    setPendingAttack(attackInfo)
    setCombatPanelMode('defense')
    setCombatHighlightCreatures({
      attacker: attackInfo.attackerInstance.instanceId,
      defender: attackInfo.defenderInstance.instanceId,
    })
  }, [])

  /**
   * Close combat panel and clear all combat state
   * Called when defense is complete or attack is cancelled
   */
  const closeCombatPanel = useCallback(() => {
    setCombatPanelMode(null)
    setCombatHighlightCreatures({ attacker: null, defender: null })
  }, [])

  /**
   * Clear pending attack state
   * Called after attack is resolved
   */
  const clearPendingAttack = useCallback(() => {
    setPendingAttack(null)
  }, [])

  /**
   * Start movement confirmation
   * @param {Object} moveInfo - {creature, destination, path, cost}
   */
  const startMoveConfirmation = useCallback((moveInfo) => {
    setPendingMove(moveInfo)
    setShowMoveConfirm(true)
  }, [])

  /**
   * Cancel movement confirmation
   */
  const cancelMoveConfirmation = useCallback(() => {
    setPendingMove(null)
    setShowMoveConfirm(false)
  }, [])

  /**
   * Clear movement confirmation state after move
   */
  const clearMoveConfirmation = useCallback(() => {
    setPendingMove(null)
    setShowMoveConfirm(false)
  }, [])

  /**
   * Queue AI attack intentions for processing
   * @param {Array} attackIntentions - Array of attack intention objects
   */
  const queueAIActions = useCallback((attackIntentions) => {
    setPendingAIActions(attackIntentions)
  }, [])

  /**
   * Get next AI action from queue
   * @returns {Object|null} Next action or null if queue is empty
   */
  const getNextAIAction = useCallback(() => {
    if (pendingAIActions.length === 0) return null

    const nextAction = pendingAIActions[0]
    setPendingAIActions((prev) => prev.slice(1))
    return nextAction
  }, [pendingAIActions])

  /**
   * Clear all AI action state
   */
  const clearAIActions = useCallback(() => {
    setPendingAIActions([])
    setProcessingAIAction(false)
  }, [])

  /**
   * Clear all combat state
   * Called at end of turn or game reset
   */
  const clearAllCombatState = useCallback(() => {
    setPendingAttack(null)
    setCombatPanelMode(null)
    setCombatHighlightCreatures({ attacker: null, defender: null })
    setPendingMove(null)
    setShowMoveConfirm(false)
    setPendingRightClickAttack(null)
    setPendingAIActions([])
    setProcessingAIAction(false)
  }, [])

  /**
   * Add accumulated damage reduction to pending attack
   * Used when stacking multiple defensive abilities
   * @param {number} reduction - Damage reduction to add
   */
  const addAccumulatedDamageReduction = useCallback((reduction) => {
    setPendingAttack((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        accumulatedDamageReduction: (prev.accumulatedDamageReduction || 0) + reduction,
      }
    })
  }, [])

  return {
    // Pending attack
    pendingAttack,
    setPendingAttack,

    // Combat panel
    combatPanelMode,
    setCombatPanelMode,
    combatHighlightCreatures,
    setCombatHighlightCreatures,

    // Movement confirmation
    showMoveConfirm,
    setShowMoveConfirm,
    pendingMove,
    setPendingMove,

    // Right-click attack
    pendingRightClickAttack,
    setPendingRightClickAttack,

    // AI actions
    pendingAIActions,
    setPendingAIActions,
    processingAIAction,
    setProcessingAIAction,

    // Actions
    startDefensePanel,
    closeCombatPanel,
    clearPendingAttack,
    startMoveConfirmation,
    cancelMoveConfirmation,
    clearMoveConfirmation,
    queueAIActions,
    getNextAIAction,
    clearAIActions,
    clearAllCombatState,
    addAccumulatedDamageReduction,
  }
}

export default useCombat
