import { useState, useRef, useEffect } from 'react'
import { TerrainTypes } from '../models/gameState'
import { GiSpiderWeb, GiKnightBanner, GiGoblinHead, GiSkullCrossedBones, GiOrcHead } from 'react-icons/gi'
import './BoardTile.css'

/**
 * Faction icons mapping - same icons used in PlayerPanel nav bar
 * Maps faction name to react-icons/gi component
 * Big O Complexity: O(1) - constant time lookup
 */
const factionIcons = {
  'Sting of Lolth': GiSpiderWeb,
  'Heart of Cormyr': GiKnightBanner,
  'Tyranny of Goblins': GiGoblinHead,
  'Curse of Undeath': GiSkullCrossedBones,
  'Blood of Gruumsh': GiOrcHead
}

/**
 * BoardTile - Renders a single tile on the game board
 * Displays terrain, creatures, treasures, and movement/attack indicators
 *
 * Big O Complexity:
 * - Rendering: O(1) - constant time for class/style computation
 * - Hover preview: O(1) - simple state toggle
 *
 * @param {Object} tile - Tile data with terrain and position
 * @param {Function} onClick - Handler for tile clicks
 * @param {boolean} isSelected - Whether this tile is selected
 * @param {CreatureInstance} creature - Creature on this tile (if any)
 * @param {boolean} isValidMove - Whether this tile is a valid movement destination
 * @param {Object} movementInfo - Movement cost and path info
 * @param {boolean} isAttackTarget - Whether creature on this tile can be attacked
 * @param {string} attackType - Type of attack ('melee' or 'ranged')
 * @param {boolean} isLineOfSight - Whether this tile is part of a ranged attack line-of-sight path
 * @param {Function} onDrop - Drag and drop handler
 * @param {Function} onDragOver - Drag over handler
 * @param {boolean} isDragTarget - Whether this tile is a valid drag target
 * @param {Object} playerFactionColors - Mapping of player IDs to faction colors
 * @param {Object} playerFactions - Mapping of player IDs to faction names (for icon display)
 * @param {string} currentPlayer - Current player's ID for highlighting their starting zone
 * @param {Function} onRightClick - Handler for right-click (attack shortcut)
 * @param {string} combatHighlight - Combat highlight type: 'attacker' | 'defender' | null
 * @param {string} factionHighlight - Player ID of faction to highlight, or null (for faction nav icons)
 */
function BoardTile({ tile, onClick, isSelected, creature, isValidMove, movementInfo, isAttackTarget, attackType, isLineOfSight, onDrop, onDragOver, isDragTarget, playerFactionColors, playerFactions, currentPlayer, onRightClick, boardWidth = 8, boardHeight = 8, combatHighlight = null, factionHighlight = null }) {
  // Hover preview state
  const [showPreview, setShowPreview] = useState(false)
  const hoverTimeoutRef = useRef(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Handle mouse enter - start delay timer for preview
   */
  const handleMouseEnter = () => {
    if (creature) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowPreview(true)
      }, 350) // 350ms delay before showing preview
    }
  }

  /**
   * Handle mouse leave - cancel timer and hide preview
   */
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setShowPreview(false)
  }

  /**
   * Get preview position classes based on tile location
   * Shows preview in direction with more space to keep it visible
   * @returns {string} CSS classes for positioning
   */
  const getPreviewPosition = () => {
    const positions = []

    // Vertical: if tile is in top half, show below; otherwise show above
    if (tile.y < boardHeight / 2) {
      positions.push('preview-below')
    } else {
      positions.push('preview-above')
    }

    // Horizontal: if tile is in left third, show to right; otherwise show to left
    // Using 33% threshold since right side has player panel taking space
    if (tile.x < boardWidth / 3) {
      positions.push('preview-right')
    } else {
      positions.push('preview-left')
    }

    return positions.join(' ')
  }

  /**
   * Get CSS class for terrain type
   * @returns {string} Terrain CSS class
   */
  const getTerrainClass = () => {
    switch (tile.terrain) {
      case TerrainTypes.FOREST:
        return 'terrain-forest'
      case TerrainTypes.MOUNTAIN:
        return 'terrain-mountain'
      case TerrainTypes.DIFFICULT:
        return 'terrain-difficult'
      case TerrainTypes.WATER:
        return 'terrain-water'
      case TerrainTypes.MAGIC_CIRCLE:
        return 'terrain-magic-circle'
      case TerrainTypes.STARTING_ZONE:
        return `terrain-starting-zone starting-zone-${tile.startingZoneOwner}`
      default:
        return 'terrain-normal'
    }
  }

  /**
   * Get emoji symbol for terrain type
   * @returns {string|null} Terrain emoji or null
   */
  const getTerrainSymbol = () => {
    switch (tile.terrain) {
      case TerrainTypes.FOREST:
        return '🌲'
      case TerrainTypes.MOUNTAIN:
        return '⛰️'
      case TerrainTypes.DIFFICULT:
        return '〰️'
      case TerrainTypes.WATER:
        return '🌊'
      case TerrainTypes.MAGIC_CIRCLE:
        return '✨'
      default:
        return null
    }
  }

  const handleDragOver = (e) => {
    if (onDragOver) {
      e.preventDefault() // Necessary to allow drop
      onDragOver(tile, e)
    }
  }

  const handleDrop = (e) => {
    if (onDrop) {
      e.preventDefault()
      onDrop(tile, e)
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault() // Prevent browser context menu
    if (onRightClick) {
      onRightClick(tile, e)
    }
  }

  /**
   * Convert hex color to RGB object
   * Big O Complexity: O(1) - regex match on fixed-length hex string
   *
   * @param {string} hex - Hex color string (e.g., '#8b008b')
   * @returns {Object|null} RGB object { r, g, b } or null if invalid
   */
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  /**
   * Get dynamic inline styles for creature token based on faction color
   * Uses the same faction colors as starting zones for visual consistency
   *
   * Big O Complexity:
   * - O(1) - constant time property lookups and simple math operations
   * - hexToRgb: O(1) - regex match on fixed-length hex string
   * - darken helper: O(1) - simple arithmetic operations
   *
   * @returns {Object} Style object with background, borderColor, boxShadow
   */
  const getCreatureTokenStyle = () => {
    if (!creature || !playerFactionColors) return {}

    // O(1) - hash map lookup
    const factionColor = playerFactionColors[creature.owner]
    if (!factionColor) return {}

    // O(1) - reuse hexToRgb function
    const rgb = hexToRgb(factionColor)
    if (!rgb) return {}

    // O(1) - simple arithmetic operations to darken color
    const darken = (r, g, b, factor = 0.6) => ({
      r: Math.floor(r * factor),
      g: Math.floor(g * factor),
      b: Math.floor(b * factor)
    })

    const darkRgb = darken(rgb.r, rgb.g, rgb.b)

    // O(1) - object construction with template literals
    return {
      background: `linear-gradient(135deg, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) 0%, rgb(${darkRgb.r}, ${darkRgb.g}, ${darkRgb.b}) 100%)`,
      borderColor: `rgb(${Math.floor(rgb.r * 0.8)}, ${Math.floor(rgb.g * 0.8)}, ${Math.floor(rgb.b * 0.8)})`,
      boxShadow: `
        0 0 0 1px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6),
        2px 3px 0px rgba(${darkRgb.r}, ${darkRgb.g}, ${darkRgb.b}, 0.5),
        inset 2px 2px 0px rgba(255, 255, 255, 0.3),
        inset -2px -2px 0px rgba(${darkRgb.r}, ${darkRgb.g}, ${darkRgb.b}, 0.3)
      `
    }
  }

  /**
   * Get faction icon component for a creature based on owner's faction
   * Big O Complexity: O(1) - two hash map lookups
   *
   * @param {Object} creatureInstance - The creature instance with owner property
   * @returns {Component|null} React icon component or null if not found
   */
  const getCreatureFactionIcon = (creatureInstance) => {
    if (!creatureInstance || !playerFactions) return null
    const factionName = playerFactions[creatureInstance.owner]
    if (!factionName) return null
    return factionIcons[factionName] || null
  }

  /**
   * Get dynamic inline styles for starting zones based on faction color
   * @returns {Object} Style object for starting zone
   */
  const getStartingZoneStyle = () => {
    if (tile.terrain !== TerrainTypes.STARTING_ZONE || !tile.startingZoneOwner || !playerFactionColors) {
      return {}
    }

    const factionColor = playerFactionColors[tile.startingZoneOwner]
    if (!factionColor) return {}

    const rgb = hexToRgb(factionColor)
    if (!rgb) return {}

    // Check if this is the current player's starting zone
    const isCurrentPlayerZone = tile.startingZoneOwner === currentPlayer

    // Brighten the color for current player highlight
    const brightenColor = (r, g, b, factor = 1.4) => ({
      r: Math.min(255, Math.floor(r * factor)),
      g: Math.min(255, Math.floor(g * factor)),
      b: Math.min(255, Math.floor(b * factor))
    })

    const brightRgb = brightenColor(rgb.r, rgb.g, rgb.b)

    if (isCurrentPlayerZone) {
      // Current player's zone - brighter inner border highlight
      return {
        background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25) 100%)`,
        boxShadow: `
          inset 0 0 0 3px rgba(${brightRgb.r}, ${brightRgb.g}, ${brightRgb.b}, 0.9),
          inset 0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5),
          inset 3px 3px 0px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)
        `,
        borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`
      }
    }

    // Other players' zones - dimmed appearance
    return {
      background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) 100%)`,
      boxShadow: `
        inset 0 0 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2),
        inset 2px 2px 0px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)
      `,
      borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
    }
  }

  return (
    <div
      className={`board-tile ${getTerrainClass()}
        ${isSelected ? 'selected' : ''}
        ${creature ? 'occupied' : ''}
        ${isValidMove ? 'valid-move' : ''}
        ${isAttackTarget ? 'attack-target' : ''}
        ${isLineOfSight ? 'line-of-sight' : ''}
        ${isDragTarget ? 'drag-target' : ''}
        ${combatHighlight === 'attacker' ? 'combat-highlight-attacker' : ''}
        ${combatHighlight === 'defender' ? 'combat-highlight-defender' : ''}
        ${creature && showPreview ? 'showing-preview' : ''}`}
      style={getStartingZoneStyle()}
      onClick={() => onClick && onClick(tile)}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`(${tile.x}, ${tile.y}) - ${tile.terrain}`}
    >
      <div className="terrain-symbol">{getTerrainSymbol()}</div>

      {/* Show movement cost on valid tiles */}
      {isValidMove && movementInfo && (
        <div className="movement-cost">
          {movementInfo.cost}
        </div>
      )}

      {/* Show line-of-sight indicator */}
      {isLineOfSight && (
        <div className="line-of-sight-indicator">
          ➤
        </div>
      )}

      {/* Display treasure tokens */}
      {tile.treasure && !creature && (
        <div className="treasure-token">
          <div className="treasure-icon">
            {tile.treasure.isRevealed ? Array(tile.treasure.remainingMorale).fill('💎').join('') : '💎'}
          </div>
        </div>
      )}

      {/* ============================================
          CREATURE TOKEN
          Big O Complexity: O(1) - constant time class computation
          Layout: Level badge (top-left) + Faction Icon (center) + HP (bottom)
          factionHighlight adds inner glow when creature belongs to highlighted faction
          ============================================ */}
      {creature && (
        <div
          className={`creature-token ${isAttackTarget ? 'targetable' : ''} ${creature.deployedThisTurn ? 'protected' : ''} ${factionHighlight && factionHighlight === creature.owner ? 'faction-highlighted' : ''}`}
          style={getCreatureTokenStyle()}
          title={creature.creature.name.replace(/ #\d+$/, '')}
        >
          {/* Level display - top left corner */}
          <div className="token-level">L{creature.creature.level}</div>
          {/* Faction icon - centered */}
          <div className="creature-icon">
            {(() => {
              const FactionIcon = getCreatureFactionIcon(creature)
              return FactionIcon ? <FactionIcon size={18} /> : null
            })()}
          </div>
          {/* HP display - bottom */}
          <div className="creature-hp">{creature.currentHP}/{creature.creature.hitPoints}</div>
          {creature.isTapped && <div className="tapped-indicator">⤵️</div>}
          {isAttackTarget && (
            <div className="attack-indicator">
              {attackType === 'ranged' ? '🏹' : '⚔️'}
            </div>
          )}
        </div>
      )}

      {/* Show treasure indicator under creature if standing on treasure */}
      {tile.treasure && creature && (
        <div className="treasure-indicator">
          {Array(tile.treasure.remainingMorale).fill('💎').join('')}
        </div>
      )}

      {/* Creature card hover preview */}
      {creature && showPreview && (
        <div className={`creature-hover-preview ${getPreviewPosition()}`}>
          {creature.creature.imageUrl ? (
            <img
              src={creature.creature.imageUrl}
              alt={creature.creature.name}
              className="creature-preview-img"
            />
          ) : (
            <div className="creature-preview-placeholder">
              <div className="preview-name">{creature.creature.name.replace(/ #\d+$/, '')}</div>
              <div className="preview-stats">
                <span>HP: {creature.creature.hitPoints}</span>
                <span>Spd: {creature.creature.speed}</span>
              </div>
              <div className="preview-stats">
                {creature.creature.meleeAttack && <span>Melee: {creature.creature.meleeAttack.damage}</span>}
                {creature.creature.rangedAttack && <span>Ranged: {creature.creature.rangedAttack.damage}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Magic circles are neutral terrain - no player ownership displayed */}
    </div>
  )
}

export default BoardTile
