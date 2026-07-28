// useSelection.js - Selection state management hook
// Extracted from GameBoard.jsx for single responsibility

import { useState, useCallback } from 'react'

/**
 * Custom hook for managing selection state in the game
 * Handles tile, creature, and card selection
 *
 * @returns {Object} Selection state and handlers
 */
export function useSelection() {
  // Selected tile on the board
  const [selectedTile, setSelectedTile] = useState(null)

  // Selected creature card index in hand (for deployment)
  const [selectedCreatureIndex, setSelectedCreatureIndex] = useState(null)

  // Selected order card index in hand
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(null)

  // Selected creature on the board (for movement/attack)
  const [selectedBoardCreature, setSelectedBoardCreature] = useState(null)

  // Valid movement tiles for selected creature (array of {tile, path, cost})
  const [validMoveTiles, setValidMoveTiles] = useState([])

  // Valid attack targets for selected creature (array of {creature, attackType, ...})
  const [validAttackTargets, setValidAttackTargets] = useState([])

  // Line of sight path for ranged attacks visualization
  const [lineOfSightPath, setLineOfSightPath] = useState([])

  // All tiles within ranged attack range (for ranged view mode)
  const [rangedRangeTiles, setRangedRangeTiles] = useState([])

  // View mode toggle: 'movement' shows move tiles, 'ranged' shows attack range
  const [creatureViewMode, setCreatureViewMode] = useState('movement')

  // Drag and drop state for creature deployment
  const [draggingCreatureIndex, setDraggingCreatureIndex] = useState(null)
  const [dragOverTile, setDragOverTile] = useState(null)

  // Faction highlight for board creatures (playerId to highlight, or null)
  const [factionHighlight, setFactionHighlight] = useState(null)

  /**
   * Clear all board creature selection state
   * Called after movement, attack, or deselection
   */
  const clearBoardSelection = useCallback(() => {
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setLineOfSightPath([])
    setRangedRangeTiles([])
    setCreatureViewMode('movement')
  }, [])

  /**
   * Clear all hand selection state
   * Called after deployment or deselection
   */
  const clearHandSelection = useCallback(() => {
    setSelectedCreatureIndex(null)
    setSelectedOrderIndex(null)
  }, [])

  /**
   * Clear all selection state
   * Called at end of turn or phase change
   */
  const clearAllSelection = useCallback(() => {
    clearBoardSelection()
    clearHandSelection()
    setSelectedTile(null)
    setFactionHighlight(null)
  }, [clearBoardSelection, clearHandSelection])

  /**
   * Clear drag and drop state
   * Called after drop or drag cancel
   */
  const clearDragState = useCallback(() => {
    setDraggingCreatureIndex(null)
    setDragOverTile(null)
  }, [])

  /**
   * Select a creature on the board and calculate valid actions
   * @param {CreatureInstance} creature - Creature to select
   * @param {Object} gameState - Current game state for calculations
   * @returns {Object} { moves, targets } for toast messages
   */
  const selectBoardCreature = useCallback((creature, gameState) => {
    if (!creature || !gameState) return { moves: [], targets: [] }

    setSelectedBoardCreature(creature)

    // Calculate valid moves
    const moves = gameState.getValidMovementTiles(creature)
    setValidMoveTiles(moves)

    // Calculate valid attack targets (filter out eliminated players)
    const targets = gameState
      .getValidAttackTargets(creature)
      .filter((target) => gameState.activePlayers.includes(target.creature.owner))
    setValidAttackTargets(targets)

    // Calculate line-of-sight paths for ranged attacks
    const losPath = []
    targets.forEach((targetInfo) => {
      if (targetInfo.attackType === 'ranged') {
        const lineTiles = gameState.getLineTiles(creature.position, targetInfo.creature.position)
        lineTiles.forEach((pos) => {
          // Skip attacker and target positions
          if (
            (pos.x === creature.position.x && pos.y === creature.position.y) ||
            (pos.x === targetInfo.creature.position.x && pos.y === targetInfo.creature.position.y)
          ) {
            return
          }
          // Add to path if not already there
          if (!losPath.some((p) => p.x === pos.x && p.y === pos.y)) {
            losPath.push(pos)
          }
        })
      }
    })
    setLineOfSightPath(losPath)

    // Calculate ranged attack range tiles (for ranged view mode toggle)
    if (creature.creature.rangedAttack) {
      const rangeTiles = gameState.getRangedAttackRangeTiles(creature)
      setRangedRangeTiles(rangeTiles)
    } else {
      setRangedRangeTiles([])
    }

    // Reset to movement view when selecting a new creature
    setCreatureViewMode('movement')

    return { moves, targets }
  }, [])

  /**
   * Toggle view mode between movement and ranged
   */
  const toggleViewMode = useCallback(() => {
    setCreatureViewMode((prev) => (prev === 'movement' ? 'ranged' : 'movement'))
  }, [])

  return {
    // Tile selection
    selectedTile,
    setSelectedTile,

    // Hand selection
    selectedCreatureIndex,
    setSelectedCreatureIndex,
    selectedOrderIndex,
    setSelectedOrderIndex,

    // Board creature selection
    selectedBoardCreature,
    setSelectedBoardCreature,
    validMoveTiles,
    setValidMoveTiles,
    validAttackTargets,
    setValidAttackTargets,
    lineOfSightPath,
    setLineOfSightPath,
    rangedRangeTiles,
    setRangedRangeTiles,
    creatureViewMode,
    setCreatureViewMode,

    // Drag and drop
    draggingCreatureIndex,
    setDraggingCreatureIndex,
    dragOverTile,
    setDragOverTile,

    // Faction highlight
    factionHighlight,
    setFactionHighlight,

    // Actions
    clearBoardSelection,
    clearHandSelection,
    clearAllSelection,
    clearDragState,
    selectBoardCreature,
    toggleViewMode,
  }
}

export default useSelection
