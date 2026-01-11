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

// Write to file via Electron IPC (async, fire-and-forget)
// FILE-ONLY OUTPUT - no console logging
const writeToFile = (level, category, message, data) => {
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
   * Info logging - file only
   */
  info: (msg, data) => {
    writeToFile('INFO', 'GENERAL', msg, data)
  },

  /**
   * Warning logging - file only
   */
  warn: (msg, data) => {
    writeToFile('WARN', 'GENERAL', msg, data)
  },

  /**
   * Error logging - file only
   */
  error: (msg, data) => {
    writeToFile('ERROR', 'GENERAL', msg, data)
  },

  /**
   * Game event logging - key game state changes
   */
  gameEvent: (event, data) => {
    writeToFile('INFO', 'GAME', event, data)
  },

  /**
   * Phase logging - phase transitions
   */
  phase: (phase, player) => {
    writeToFile('INFO', 'PHASE', `${phase} - Player ${player}`)
  },

  /**
   * Combat logging - attacks, damage, defense
   */
  combat: (action, details) => {
    writeToFile('INFO', 'COMBAT', action, details)
  },

  /**
   * Card logging - order card usage and draws
   */
  card: (cardName, action, details) => {
    writeToFile('INFO', 'CARD', `${cardName}: ${action}`, details)
  },

  /**
   * Ability logging - creature abilities
   */
  ability: (ability, details) => {
    writeToFile('INFO', 'ABILITY', ability, details)
  },

  /**
   * AI logging - AI decisions
   */
  ai: (decision, context) => {
    writeToFile('INFO', 'AI', decision, context)
  },

  /**
   * Modal logging - modal opens/closes
   */
  modal: (modalName, action, details) => {
    writeToFile('INFO', 'MODAL', `${modalName}: ${action}`, details)
  },

  /**
   * Damage logging - damage dealt/prevented
   */
  damage: (action, details) => {
    writeToFile('INFO', 'DAMAGE', action, details)
  },

  /**
   * Movement logging - creature movement
   */
  movement: (creatureName, details) => {
    writeToFile('INFO', 'MOVEMENT', `${creatureName} moved`, details)
  },

  /**
   * Tap logging - creature tap/untap
   */
  tap: (creatureName, action, details) => {
    writeToFile('INFO', 'TAP', `${creatureName}: ${action}`, details)
  },

  /**
   * Deploy logging - creature deployment
   */
  deploy: (creatureName, details) => {
    writeToFile('INFO', 'DEPLOY', `${creatureName} deployed`, details)
  },

  /**
   * Defense logging - defense actions
   */
  defense: (action, details) => {
    writeToFile('INFO', 'DEFENSE', action, details)
  }
}

export default logger
