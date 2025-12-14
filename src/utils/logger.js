/**
 * Logger utility for DungeonCommandGame
 *
 * Provides centralized logging with development-only debug logging.
 * In production, debug logs are suppressed for performance.
 *
 * Usage:
 *   import { logger } from '../utils/logger.js'
 *   logger.debug('Debug message', data)  // Only shows in development
 *   logger.info('Info message')          // Always shows
 *   logger.warn('Warning')               // Always shows
 *   logger.error('Error', errorObj)      // Always shows
 */

const isDev = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'development'
  : true // Default to true for browser environments without process

export const logger = {
  /**
   * Debug logging - only shows in development mode
   * Use for detailed debugging info that shouldn't appear in production
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (isDev) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Info logging - always shows
   * Use for important information that should be visible in production
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    console.log('[INFO]', ...args)
  },

  /**
   * Warning logging - always shows
   * Use for potential issues that don't break functionality
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args)
  },

  /**
   * Error logging - always shows
   * Use for actual errors that need attention
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    console.error('[ERROR]', ...args)
  },

  /**
   * Game event logging - only shows in development
   * Use for game state changes and events
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  gameEvent: (event, data = {}) => {
    if (isDev) {
      console.log(`[GAME] ${event}`, data)
    }
  },

  /**
   * AI decision logging - only shows in development
   * Use for AI decision making and reasoning
   * @param {string} decision - Decision description
   * @param {Object} context - Decision context
   */
  ai: (decision, context = {}) => {
    if (isDev) {
      console.log(`[AI] ${decision}`, context)
    }
  },

  /**
   * Combat logging - only shows in development
   * Use for combat calculations and results
   * @param {string} action - Combat action
   * @param {Object} details - Combat details
   */
  combat: (action, details = {}) => {
    if (isDev) {
      console.log(`[COMBAT] ${action}`, details)
    }
  },

  /**
   * Ability logging - only shows in development
   * Use for ability triggers and effects
   * @param {string} ability - Ability name
   * @param {Object} details - Ability details
   */
  ability: (ability, details = {}) => {
    if (isDev) {
      console.log(`[ABILITY] ${ability}`, details)
    }
  }
}

export default logger
