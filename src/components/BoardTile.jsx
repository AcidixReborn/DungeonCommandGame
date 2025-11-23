import { TerrainTypes } from '../models/gameState'
import './BoardTile.css'

function BoardTile({ tile, onClick, isSelected, creature, isValidMove, isAttackTarget, onDrop, onDragOver, isDragTarget }) {
  const getTerrainClass = () => {
    switch (tile.terrain) {
      case TerrainTypes.FOREST:
        return 'terrain-forest'
      case TerrainTypes.MOUNTAIN:
        return 'terrain-mountain'
      case TerrainTypes.DIFFICULT:
        return 'terrain-difficult'
      case TerrainTypes.MAGIC_CIRCLE:
        return 'terrain-magic-circle'
      case TerrainTypes.STARTING_ZONE:
        return `terrain-starting-zone starting-zone-${tile.startingZoneOwner}`
      default:
        return 'terrain-normal'
    }
  }

  const getTerrainSymbol = () => {
    switch (tile.terrain) {
      case TerrainTypes.FOREST:
        return '🌲'
      case TerrainTypes.MOUNTAIN:
        return '⛰️'
      case TerrainTypes.DIFFICULT:
        return '〰️'
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
        ${isDragTarget ? 'drag-target' : ''}`}
      onClick={() => onClick && onClick(tile)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title={`(${tile.x}, ${tile.y}) - ${tile.terrain}`}
    >
      <div className="terrain-symbol">{getTerrainSymbol()}</div>

      {isValidMove && !creature && (
        <div className="move-indicator">➜</div>
      )}

      {creature && (
        <div className={`creature-token player-${creature.owner} ${isAttackTarget ? 'targetable' : ''} ${creature.deployedThisTurn ? 'protected' : ''}`}>
          <div className="creature-name">{creature.creature.name}</div>
          <div className="creature-hp">{creature.currentHP}/{creature.creature.hitPoints}</div>
          {creature.isTapped && <div className="tapped-indicator">⤵️</div>}
          {isAttackTarget && <div className="attack-indicator">🎯</div>}
          {creature.deployedThisTurn && <div className="protected-indicator">🛡️</div>}
        </div>
      )}

      {tile.terrain === TerrainTypes.MAGIC_CIRCLE && tile.owner && (
        <div className="magic-circle-owner">P{tile.owner.slice(-1)}</div>
      )}
    </div>
  )
}

export default BoardTile
