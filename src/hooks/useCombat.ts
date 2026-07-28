// useCombat.js - Combat state management hook
// Extracted from GameBoard.jsx for single responsibility

import { useState, useCallback } from 'react'

// These loosely-shaped ad-hoc objects are assembled at many different call sites in
// GameBoard.jsx with varying fields depending on the attack/card involved.
export interface AttackInfo {
  attackerInstance: { instanceId: string; [key: string]: unknown }
  defenderInstance: { instanceId: string; [key: string]: unknown }
  targetInfo?: unknown
  [key: string]: unknown
}

export interface PendingMove {
  creature: unknown
  destination: unknown
  path: unknown
  cost: unknown
  [key: string]: unknown
}

/**
 * Custom hook for managing combat state
 * Handles pending attacks, defense options, and combat panel mode
 */
export function useCombat() {
  // ============================================
  // PENDING ATTACK STATE
  // Stores attack info while waiting for defender reactions
  // ============================================
  const [pendingAttack, setPendingAttack] = useState<AttackInfo | null>(null)

  // ============================================
  // COMBAT PANEL STATE
  // Used for in-panel attack confirmation and defense options
  // ============================================
  const [combatPanelMode, setCombatPanelMode] = useState<'attack' | 'defense' | null>(null)
  const [combatHighlightCreatures, setCombatHighlightCreatures] = useState<{
    attacker: string | null
    defender: string | null
  }>({
    attacker: null, // instanceId of attacking creature
    defender: null, // instanceId of defending creature
  })

  // ============================================
  // MOVEMENT CONFIRMATION STATE
  // ============================================
  const [showMoveConfirm, setShowMoveConfirm] = useState(false)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)

  // ============================================
  // RIGHT-CLICK ATTACK STATE
  // ============================================
  const [pendingRightClickAttack, setPendingRightClickAttack] = useState<unknown>(null)

  // ============================================
  // AI ACTION QUEUE
  // For processing attacks with modal support
  // ============================================
  const [pendingAIActions, setPendingAIActions] = useState<unknown[]>([])
  const [processingAIAction, setProcessingAIAction] = useState(false)

  /**
   * Start combat panel in defense mode
   * Called when a human defender is attacked
   */
  const startDefensePanel = useCallback((attackInfo: AttackInfo) => {
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
   */
  const startMoveConfirmation = useCallback((moveInfo: PendingMove) => {
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
   */
  const queueAIActions = useCallback((attackIntentions: unknown[]) => {
    setPendingAIActions(attackIntentions)
  }, [])

  /**
   * Get next AI action from queue
   * @returns Next action or null if queue is empty
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
   */
  const addAccumulatedDamageReduction = useCallback((reduction: number) => {
    setPendingAttack((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        accumulatedDamageReduction: ((prev.accumulatedDamageReduction as number) || 0) + reduction,
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
