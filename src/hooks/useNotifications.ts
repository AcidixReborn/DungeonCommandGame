// useNotifications.js - Toast notification system hook
// Extracted from GameBoard.jsx for single responsibility

import { useState, useCallback, useRef } from 'react'

export interface ToastMessage {
  id: number
  message: string
  timestamp: number
  round: number
}

export interface UseNotificationsOptions {
  getCurrentTurnNumber?: () => number
  isCurrentPlayerHuman?: () => boolean
}

/**
 * Custom hook for managing toast notifications and turn log
 * Provides auto-dismiss toasts and a filterable log of game events
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { getCurrentTurnNumber, isCurrentPlayerHuman } = options

  // Toast notification array - each toast has {id, message, timestamp, round}
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([])

  // Full log of messages since last turn (for expanded view)
  const [turnLog, setTurnLog] = useState<ToastMessage[]>([])

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
   */
  const addToast = useCallback(
    (message: string) => {
      // Filter out "AI turn ended" messages
      if (message === 'AI: AI turn ended') return

      // Use ref for atomic increment - avoids duplicate IDs when called rapidly
      const id = nextToastIdRef.current++

      const turnNumber = getCurrentTurnNumber ? getCurrentTurnNumber() : 1

      const newToast: ToastMessage = {
        id,
        message,
        timestamp: Date.now(),
        round: turnNumber,
      }

      // Always add to turn log
      setTurnLog((prev) => [...prev, newToast])

      // Only show popup during AI turns (not human turns)
      const isHuman = isCurrentPlayerHuman ? isCurrentPlayerHuman() : true

      if (!isHuman) {
        setToastMessages((prev) => {
          const updated = [...prev, newToast]
          // Keep only the last 10 toasts
          return updated.slice(-10)
        })
      }
    },
    [getCurrentTurnNumber, isCurrentPlayerHuman]
  )

  /**
   * Remove a toast by ID (memoized to prevent timer resets)
   */
  const removeToast = useCallback((id: number) => {
    setToastMessages((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /**
   * Clear old logs when a turn ends
   * Keeps current turn and previous turn visible
   */
  const clearOldLogs = useCallback((turnNumber: number) => {
    setTurnLog((prev) => prev.filter((t) => t.round >= turnNumber - 1))
    setToastMessages((prev) => prev.filter((t) => t.round >= turnNumber - 1))
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
    clearAll,
  }
}

export default useNotifications
