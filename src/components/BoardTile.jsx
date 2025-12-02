import { TerrainTypes } from '../models/gameState'
import './BoardTile.css'

/**
 * BoardTile - Renders a single tile on the game board
 * Displays terrain, creatures, treasures, and movement/attack indicators
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
 * @param {string} currentPlayer - Current player's ID for highlighting their starting zone
 * @param {Function} onRightClick - Handler for right-click (attack shortcut)
 */
function BoardTile({ tile, onClick, isSelected, creature, isValidMove, movementInfo, isAttackTarget, attackType, isLineOfSight, onDrop, onDragOver, isDragTarget, playerFactionColors, currentPlayer, onRightClick }) {
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
   * Get dynamic inline styles for starting zones based on faction color
   * @returns {Object} Style object for starting zone
   */
  const getStartingZoneStyle = () => {
    if (tile.terrain !== TerrainTypes.STARTING_ZONE || !tile.startingZoneOwner || !playerFactionColors) {
      return {}
    }

    const factionColor = playerFactionColors[tile.startingZoneOwner]
    if (!factionColor) return {}

    // Convert hex to RGB for transparency effects
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null
    }

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
        ${isDragTarget ? 'drag-target' : ''}`}
      style={getStartingZoneStyle()}
      onClick={() => onClick && onClick(tile)}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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

      {creature && (
        <div className={`creature-token player-${creature.owner} ${isAttackTarget ? 'targetable' : ''} ${creature.deployedThisTurn ? 'protected' : ''}`}>
          <div className="creature-name">{creature.creature.name.replace(/ #\d+$/, '')}</div>
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

      {/* Magic circles are neutral terrain - no player ownership displayed */}
    </div>
  )
}

export default BoardTile
