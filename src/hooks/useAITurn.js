// useAITurn.js - AI turn state management hook
// Extracted from GameBoard.jsx for single responsibility

import { useState, useCallback } from 'react'

/**
 * Custom hook for managing AI turn state
 * Handles AI thinking state, death queue, and AI combat notifications
 *
 * @returns {Object} AI turn state and handlers
 */
export function useAITurn() {
  // ============================================
  // AI THINKING STATE
  // Tracks when AI is processing its turn
  // ============================================
  const [isAIThinking, setIsAIThinking] = useState(false)

  // ============================================
  // AI COMBAT DEATH QUEUE
  // Queue of deaths that occurred during AI turns
  // Shows each death to the human player via modal
  // ============================================
  const [aiDeathQueue, setAiDeathQueue] = useState([])
  // Array of { attackerInstance, defenderInstance, damageDealt, attackType, abilitiesTriggered, moraleChanges }
  const [showAiDeathModal, setShowAiDeathModal] = useState(false)
  const [currentAiDeath, setCurrentAiDeath] = useState(null)

  // ============================================
  // AI ACTION TRACKING
  // For coordinating AI multi-step actions
  // ============================================
  const [aiCurrentAction, setAiCurrentAction] = useState(null)
  // Tracks current AI action being executed (for animations, etc.)

  /**
   * Queue a death event to show to the player
   * @param {Object} deathInfo - { attackerInstance, defenderInstance, damageDealt, attackType, abilitiesTriggered, moraleChanges }
   */
  const queueAiDeath = useCallback((deathInfo) => {
    setAiDeathQueue((prev) => [...prev, deathInfo])
  }, [])

  /**
   * Show the next death in the queue
   * Returns true if there was a death to show, false if queue is empty
   */
  const showNextAiDeath = useCallback(() => {
    if (aiDeathQueue.length === 0) {
      setShowAiDeathModal(false)
      setCurrentAiDeath(null)
      return false
    }

    const nextDeath = aiDeathQueue[0]
    setCurrentAiDeath(nextDeath)
    setShowAiDeathModal(true)
    return true
  }, [aiDeathQueue])

  /**
   * Acknowledge current death and move to next
   * @returns {boolean} True if there are more deaths, false if done
   */
  const acknowledgeAiDeath = useCallback(() => {
    // Remove the current death from queue
    setAiDeathQueue((prev) => prev.slice(1))
    setShowAiDeathModal(false)
    setCurrentAiDeath(null)

    // Return whether there are more deaths
    return aiDeathQueue.length > 1
  }, [aiDeathQueue])

  /**
   * Clear all AI death queue state
   */
  const clearAiDeathQueue = useCallback(() => {
    setAiDeathQueue([])
    setShowAiDeathModal(false)
    setCurrentAiDeath(null)
  }, [])

  /**
   * Start AI thinking state
   */
  const startAiThinking = useCallback(() => {
    setIsAIThinking(true)
  }, [])

  /**
   * End AI thinking state
   */
  const endAiThinking = useCallback(() => {
    setIsAIThinking(false)
  }, [])

  /**
   * Check if AI death queue has items
   */
  const hasQueuedDeaths = useCallback(() => {
    return aiDeathQueue.length > 0
  }, [aiDeathQueue])

  /**
   * Clear all AI turn state
   * Called at end of game or reset
   */
  const clearAllAiTurnState = useCallback(() => {
    setIsAIThinking(false)
    setAiDeathQueue([])
    setShowAiDeathModal(false)
    setCurrentAiDeath(null)
    setAiCurrentAction(null)
  }, [])

  return {
    // AI thinking state
    isAIThinking,
    setIsAIThinking,
    startAiThinking,
    endAiThinking,

    // AI death queue
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

    // AI action tracking
    aiCurrentAction,
    setAiCurrentAction,

    // Clear all
    clearAllAiTurnState,
  }
}

export default useAITurn
