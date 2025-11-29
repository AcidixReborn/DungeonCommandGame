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
 */
function BoardTile({ tile, onClick, isSelected, creature, isValidMove, movementInfo, isAttackTarget, attackType, isLineOfSight, onDrop, onDragOver, isDragTarget }) {
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

  return (
    <div
      className={`board-tile ${getTerrainClass()}
        ${isSelected ? 'selected' : ''}
        ${creature ? 'occupied' : ''}
        ${isValidMove ? 'valid-move' : ''}
        ${isAttackTarget ? 'attack-target' : ''}
        ${isLineOfSight ? 'line-of-sight' : ''}
        ${isDragTarget ? 'drag-target' : ''}`}
      onClick={() => onClick && onClick(tile)}
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
