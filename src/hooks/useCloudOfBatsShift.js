/**
 * useCloudOfBatsShift - CLOUD OF BATS shift handlers (post-defense reposition).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Shift mode/pending state itself
 * still lives in useAbilityModals; this hook only owns the handler logic
 * that reacts to it.
 */
export function useCloudOfBatsShift({
  gameState,
  addToast,
  executeAttackAfterDefense,
  pendingShiftAfterDefense,
  setPendingShiftAfterDefense,
  setShowShiftDecisionModal,
  shiftSelectionMode,
  setShiftSelectionMode,
  shiftValidTiles,
  setShiftValidTiles,
  pendingMove,
  setPendingMove,
  setShowMoveConfirm,
  setRenderCounter,
}) {
  /**
   * User chose YES to shift after Cloud of Bats - enter shift selection mode
   */
  const handleShiftDecisionYes = () => {
    if (!pendingShiftAfterDefense) return

    const { creature, maxShift } = pendingShiftAfterDefense

    // Calculate valid shift tiles for this creature
    const validTiles = gameState.getValidShiftTiles
      ? gameState.getValidShiftTiles(creature, maxShift)
      : []

    if (validTiles.length === 0) {
      // No valid tiles - skip shift, just tap and continue
      addToast('No valid tiles to shift to.')
      handleShiftDecisionNo()
      return
    }

    // Close decision modal and enter shift selection mode
    setShowShiftDecisionModal(false)
    setShiftValidTiles(validTiles)
    setShiftSelectionMode(true)
  }

  /**
   * User chose NO to shift (or no valid tiles) - tap creature and continue attack
   */
  const handleShiftDecisionNo = () => {
    if (!pendingShiftAfterDefense) return

    const { creature, pendingAttackInfo } = pendingShiftAfterDefense

    // Tap the creature (was deferred from applyImmediateCardDefense)
    creature.tap()

    // Close modal and clear state
    setShowShiftDecisionModal(false)
    setPendingShiftAfterDefense(null)
    setShiftSelectionMode(false)
    setShiftValidTiles([])

    // Continue with attack execution
    if (pendingAttackInfo) {
      executeAttackAfterDefense({
        type: 'immediate_card',
        damageReduction: pendingAttackInfo.newAccumulatedReduction,
        moraleCost: 0,
        cardUsed: pendingAttackInfo.cardUsed,
        creatureTapped: pendingAttackInfo.creatureTapped,
        moraleGain: pendingAttackInfo.moraleGain || 0,
        untapAfterUse: pendingAttackInfo.untapAfterUse || false,
        success: true,
      })
    }

    setRenderCounter((prev) => prev + 1)
  }

  /**
   * User selected a tile for Cloud of Bats shift - show confirmation
   */
  const handleShiftTileSelected = (tile) => {
    if (!pendingShiftAfterDefense || !shiftSelectionMode) return

    // Verify tile is valid
    const isValid = shiftValidTiles.some((t) => t.x === tile.x && t.y === tile.y)
    if (!isValid) return

    // Show move confirmation modal
    // Use same structure as normal movement (destination, cost) for modal compatibility
    setPendingMove({
      creature: pendingShiftAfterDefense.creature,
      destination: tile,
      cost: 0, // Shift is free
      isShiftAfterDefense: true,
    })
    setShowMoveConfirm(true)
  }

  /**
   * User confirmed shift destination - execute shift
   */
  const handleShiftConfirm = () => {
    if (!pendingShiftAfterDefense || !pendingMove) return

    const { creature, pendingAttackInfo } = pendingShiftAfterDefense
    const { destination } = pendingMove

    // Execute the shift (move creature to new position)
    const fromTile = gameState.getTile(creature.position.x, creature.position.y)
    const targetTile = gameState.getTile(destination.x, destination.y)

    if (fromTile && targetTile) {
      fromTile.occupant = null
      targetTile.occupant = creature
      creature.position = { x: destination.x, y: destination.y }
    }

    // Tap the creature (was deferred from applyImmediateCardDefense)
    creature.tap()

    // Show toast
    addToast(`🦇 ${creature.creature.name} shifted to (${destination.x}, ${destination.y})!`)

    // Clear all shift state
    setShowMoveConfirm(false)
    setPendingMove(null)
    setPendingShiftAfterDefense(null)
    setShiftSelectionMode(false)
    setShiftValidTiles([])

    // Continue with attack execution
    if (pendingAttackInfo) {
      executeAttackAfterDefense({
        type: 'immediate_card',
        damageReduction: pendingAttackInfo.newAccumulatedReduction,
        moraleCost: 0,
        cardUsed: pendingAttackInfo.cardUsed,
        creatureTapped: pendingAttackInfo.creatureTapped,
        moraleGain: pendingAttackInfo.moraleGain || 0,
        untapAfterUse: pendingAttackInfo.untapAfterUse || false,
        success: true,
      })
    }

    setRenderCounter((prev) => prev + 1)
  }

  /**
   * User cancelled shift destination selection - back to tile selection
   */
  const handleShiftCancel = () => {
    setShowMoveConfirm(false)
    setPendingMove(null)
    // Stay in shift selection mode - user can pick another tile
  }

  return {
    handleShiftDecisionYes,
    handleShiftDecisionNo,
    handleShiftTileSelected,
    handleShiftConfirm,
    handleShiftCancel,
  }
}
