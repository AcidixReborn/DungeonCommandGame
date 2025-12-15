// useNotifications.js - Toast notification system hook
// Extracted from GameBoard.jsx for single responsibility

import { useState, useCallback, useRef } from 'react'

/**
 * Custom hook for managing toast notifications and turn log
 * Provides auto-dismiss toasts and a filterable log of game events
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.getCurrentTurnNumber - Function to get current turn number
 * @param {Function} options.isCurrentPlayerHuman - Function to check if current player is human
 * @returns {Object} Notification state and handlers
 */
export function useNotifications(options = {}) {
  const { getCurrentTurnNumber, isCurrentPlayerHuman } = options

  // Toast notification array - each toast has {id, message, timestamp, round}
  const [toastMessages, setToastMessages] = useState([])

  // Full log of messages since last turn (for expanded view)
  const [turnLog, setTurnLog] = useState([])

  // Track if log panel is expanded
  const [isLogExpanded, setIsLogExpanded] = useState(false)

  // Unique ID counter for toasts - using ref to avoid stale closure issues
  // when addToast is called rapidly (e.g., during AI turns)
  const nextToastIdRef = useRef(1)

  /**
   * Add a toast notification
   * - Auto-dismisses after 3 seconds (handled by ToastNotification component)
   * - Max 10 visible at a time
   * - Adds to turn log for expanded view
   * - Filters out "AI turn ended" messages
   * - Only shows popup during AI turns - human turns just add to log
   *
   * @param {string} message - Message to display
   */
  const addToast = useCallback((message) => {
    // Filter out "AI turn ended" messages
    if (message === 'AI: AI turn ended') return

    // Use ref for atomic increment - avoids duplicate IDs when called rapidly
    const id = nextToastIdRef.current++

    const turnNumber = getCurrentTurnNumber ? getCurrentTurnNumber() : 1

    const newToast = {
      id,
      message,
      timestamp: Date.now(),
      round: turnNumber
    }

    // Always add to turn log
    setTurnLog(prev => [...prev, newToast])

    // Only show popup during AI turns (not human turns)
    const isHuman = isCurrentPlayerHuman ? isCurrentPlayerHuman() : true

    if (!isHuman) {
      setToastMessages(prev => {
        const updated = [...prev, newToast]
        // Keep only the last 10 toasts
        return updated.slice(-10)
      })
    }
  }, [getCurrentTurnNumber, isCurrentPlayerHuman])

  /**
   * Remove a toast by ID (memoized to prevent timer resets)
   * @param {number} id - Toast ID to remove
   */
  const removeToast = useCallback((id) => {
    setToastMessages(prev => prev.filter(t => t.id !== id))
  }, [])

  /**
   * Clear old logs when a turn ends
   * Keeps current turn and previous turn visible
   * @param {number} turnNumber - Current turn number
   */
  const clearOldLogs = useCallback((turnNumber) => {
    setTurnLog(prev => prev.filter(t => t.round >= turnNumber - 1))
    setToastMessages(prev => prev.filter(t => t.round >= turnNumber - 1))
  }, [])

  /**
   * Clear all notifications (useful for game reset)
   */
  const clearAll = useCallback(() => {
    setToastMessages([])
    setTurnLog([])
  }, [])

  return {
    // State
    toastMessages,
    turnLog,
    isLogExpanded,

    // Setters
    setIsLogExpanded,

    // Actions
    addToast,
    removeToast,
    clearOldLogs,
    clearAll
  }
}

export default useNotifications
