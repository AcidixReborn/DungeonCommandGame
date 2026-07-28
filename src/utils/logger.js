/**
 * Logger utility for DungeonCommandGame
 *
 * Provides centralized logging with:
 * - Console output for development
 * - File-based persistent logging via Electron IPC
 *
 * The debug.log file is cleared when a new game starts and accumulates
 * all events during the session for post-mortem debugging.
 *
 * Usage:
 *   import { logger, clearDebugLog } from '../utils/logger.js'
 *   clearDebugLog()                    // Call on game start
 *   logger.info('Info message')        // Logs to console and file
 *   logger.phase('ACTIVATE', 'player1') // Game phase changes
 *   logger.combat('Attack', details)   // Combat events
 */

// Format timestamp for log entries
const timestamp = () => new Date().toISOString().replace('T', ' ').substring(0, 19)

const CONSOLE_FN = { ERROR: console.error, WARN: console.warn }

// Log to console always (works in both browser dev and Electron), and additionally
// persist to the debug.log file via Electron IPC when running inside Electron.
const emit = (level, category, message, data) => {
  const consoleFn = CONSOLE_FN[level] || console.log
  const tag = `[${category}] ${message}`
  if (data !== undefined && data !== null) {
    consoleFn(tag, data)
  } else {
    consoleFn(tag)
  }

  if (window.electronAPI?.writeLog) {
    const dataStr = data !== undefined && data !== null ? ' ' + JSON.stringify(data) : ''
    const entry = `[${timestamp()}] [${level}] [${category}] ${message}${dataStr}`
    window.electronAPI.writeLog(entry)
  }
}

/**
 * Clear the debug log file - call this when starting a new game
 * The log file persists until this is called again
 */
export const clearDebugLog = () => {
  if (window.electronAPI?.clearLog) {
    window.electronAPI.clearLog()
    console.log('[LOGGER] Debug log cleared')
  }
}

/**
 * Get the path to the debug log file
 * @returns {Promise<string>} Path to the log file
 */
export const getLogPath = async () => {
  if (window.electronAPI?.getLogPath) {
    return await window.electronAPI.getLogPath()
  }
  return null
}

export const logger = {
  /**
   * Debug logging - variadic, mirrors console.log's flexible signature.
   * Use for ad-hoc trace logging where a fixed (msg, data) shape doesn't fit.
   */
  debug: (...args) => {
    console.log(...args)
    if (window.electronAPI?.writeLog) {
      const entry = `[${timestamp()}] [DEBUG] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}`
      window.electronAPI.writeLog(entry)
    }
  },

  /**
   * Info logging
   */
  info: (msg, data) => {
    emit('INFO', 'GENERAL', msg, data)
  },

  /**
   * Warning logging
   */
  warn: (msg, data) => {
    emit('WARN', 'GENERAL', msg, data)
  },

  /**
   * Error logging
   */
  error: (msg, data) => {
    emit('ERROR', 'GENERAL', msg, data)
  },

  /**
   * Game event logging - key game state changes
   */
  gameEvent: (event, data) => {
    emit('INFO', 'GAME', event, data)
  },

  /**
   * Phase logging - phase transitions
   */
  phase: (phase, player) => {
    emit('INFO', 'PHASE', `${phase} - Player ${player}`)
  },

  /**
   * Combat logging - attacks, damage, defense
   */
  combat: (action, details) => {
    emit('INFO', 'COMBAT', action, details)
  },

  /**
   * Card logging - order card usage and draws
   */
  card: (cardName, action, details) => {
    emit('INFO', 'CARD', `${cardName}: ${action}`, details)
  },

  /**
   * Ability logging - creature abilities
   */
  ability: (ability, details) => {
    emit('INFO', 'ABILITY', ability, details)
  },

  /**
   * AI logging - AI decisions
   */
  ai: (decision, context) => {
    emit('INFO', 'AI', decision, context)
  },

  /**
   * Modal logging - modal opens/closes
   */
  modal: (modalName, action, details) => {
    emit('INFO', 'MODAL', `${modalName}: ${action}`, details)
  },

  /**
   * Damage logging - damage dealt/prevented
   */
  damage: (action, details) => {
    emit('INFO', 'DAMAGE', action, details)
  },

  /**
   * Movement logging - creature movement
   */
  movement: (creatureName, details) => {
    emit('INFO', 'MOVEMENT', `${creatureName} moved`, details)
  },

  /**
   * Tap logging - creature tap/untap
   */
  tap: (creatureName, action, details) => {
    emit('INFO', 'TAP', `${creatureName}: ${action}`, details)
  },

  /**
   * Deploy logging - creature deployment
   */
  deploy: (creatureName, details) => {
    emit('INFO', 'DEPLOY', `${creatureName} deployed`, details)
  },

  /**
   * Defense logging - defense actions
   */
  defense: (action, details) => {
    emit('INFO', 'DEFENSE', action, details)
  }
}

export default logger
