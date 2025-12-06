/**
 * Game Constants - Centralized configuration for Dungeon Command
 *
 * This file contains all magic numbers and configuration values used throughout
 * the game. Centralizing these values makes them:
 * 1. Self-documenting (names explain purpose)
 * 2. Easy to find and modify
 * 3. Consistent across the codebase
 */

// ============================================================================
// BOARD CONFIGURATION
// ============================================================================

export const BOARD = {
  /** Base board size for 2 players - scales with player count */
  BASE_SIZE: 16,
  /** Minimum tiles between starting zone edges */
  MIN_STARTING_ZONE_DISTANCE: 10,
  /** Starting zone dimensions (horizontal: 3x2, vertical: 2x3) */
  STARTING_ZONE_WIDTH: 3,
  STARTING_ZONE_HEIGHT: 2,
  /** Region size for terrain generation clustering */
  TERRAIN_REGION_SIZE: 4
}

// ============================================================================
// TERRAIN CONFIGURATION
// ============================================================================

export const TERRAIN = {
  /** Movement cost for normal terrain */
  NORMAL_COST: 1,
  /** Movement cost for forest terrain */
  FOREST_COST: 2,
  /** Movement cost for difficult terrain */
  DIFFICULT_COST: 2,
  /** Movement cost for water terrain (non-flying) */
  WATER_COST: 2,
  /** Damage dealt to non-flying creatures on water at end of ACTIVATE phase */
  WATER_DAMAGE: 10
}

// ============================================================================
// COMBAT CONFIGURATION
// ============================================================================

export const COMBAT = {
  /** Melee attack range (adjacent tiles only) */
  MELEE_RANGE: 1,
  /** Leadership cost to cower from an attack */
  COWER_LEADERSHIP_COST: 1,
  /** Damage prevented per order card when cowering */
  COWER_DAMAGE_PREVENTION: 10
}

// ============================================================================
// COMMANDER ABILITY CONFIGURATION
// ============================================================================

export const COMMANDER_ABILITIES = {
  /** UNSTOPPABLE HORDES: Damage prevented per Undead creature */
  UNSTOPPABLE_HORDES_DAMAGE_PREVENTION: 20,
  /** UNSTOPPABLE HORDES: Morale cost per creature used */
  UNSTOPPABLE_HORDES_MORALE_COST: 1,
  /** WALLS OF WEB: Extra speed for Drow/Spider creatures */
  WALLS_OF_WEB_SPEED_BONUS: 2,
  /** BLOODTHIRSTY: Leadership gained on kill */
  BLOODTHIRSTY_LEADERSHIP_GAIN: 1,
  /** BLACK HAND OF BANE: Extra leadership cost when enemy cowers */
  BLACK_HAND_OF_BANE_EXTRA_COST: 1
}

// ============================================================================
// TREASURE CONFIGURATION
// ============================================================================

export const TREASURE = {
  /** Tokens placed per player on the board */
  TOKENS_PER_PLAYER: 3,
  /** Minimum distance from starting zones (Manhattan distance) */
  MIN_DISTANCE_FROM_START: 2,
  /** Morale gained when collecting a treasure */
  MORALE_GAIN: 1
}

// ============================================================================
// GAME RULES
// ============================================================================

export const GAME_RULES = {
  /** Turn limit before declaring a draw */
  MAX_TURNS: 100,
  /** Maximum players supported */
  MAX_PLAYERS: 4,
  /** Minimum players required */
  MIN_PLAYERS: 2
}

// ============================================================================
// VISION / LINE OF SIGHT
// ============================================================================

export const VISION = {
  /** Default vision range for creatures */
  DEFAULT_RANGE: 5,
  /** Maximum range to check for line of sight calculations */
  MAX_LOS_RANGE: 20
}

// ============================================================================
// MAGIC CIRCLE CONFIGURATION
// ============================================================================

export const MAGIC_CIRCLE = {
  /** Percentage of players that receive magic circles */
  PLAYER_PERCENTAGE: 0.4,
  /** Minimum number of magic circles to place */
  MIN_CIRCLES: 1
}

// Default export for convenient importing
export default {
  BOARD,
  TERRAIN,
  COMBAT,
  COMMANDER_ABILITIES,
  TREASURE,
  GAME_RULES,
  VISION,
  MAGIC_CIRCLE
}
