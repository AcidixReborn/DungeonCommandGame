/**
 * useHealingTouch - HEALING TOUCH modal handlers (Dwarf Cleric's healing ability).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Healing touch pending state
 * itself still lives in useAbilityModals; this hook only owns the handler
 * logic that reacts to it.
 */
export function useHealingTouch({
  gameState,
  addToast,
  healingTouchHealer,
  healingTouchTarget,
  setShowHealingTouchModal,
  setHealingTouchData,
  setSelectedBoardCreature,
  setValidMoveTiles,
  setValidAttackTargets,
  setRenderCounter,
}) {
  /**
   * Handle Healing Touch Modal - Heal
   * Heals 10 damage to the target creature
   */
  const handleHealingTouchHeal = () => {
    if (!healingTouchHealer || !healingTouchTarget || !gameState) {
      setShowHealingTouchModal(false)
      setHealingTouchData(null)
      return
    }

    const result = gameState.executeHealingTouch(healingTouchHealer, healingTouchTarget, 'heal')

    if (result.success) {
      const isSelf = healingTouchHealer.instanceId === healingTouchTarget.instanceId
      addToast(
        `💚 HEALING TOUCH: ${healingTouchHealer.creature.name} healed ${isSelf ? 'itself' : healingTouchTarget.creature.name}! ${result.message}`
      )
      // Clear selection so player can see the updated state
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter((prev) => prev + 1)
    } else {
      addToast(`Healing Touch failed: ${result.message}`)
    }

    setShowHealingTouchModal(false)
    setHealingTouchData(null)
  }

  /**
   * Handle Healing Touch Modal - Remove Card
   * Removes an attached Order card from the target creature
   * @param {number} cardIndex - Index of the attached card to remove
   */
  const handleHealingTouchRemoveCard = (cardIndex) => {
    if (!healingTouchHealer || !healingTouchTarget || !gameState) {
      setShowHealingTouchModal(false)
      setHealingTouchData(null)
      return
    }

    const result = gameState.executeHealingTouch(
      healingTouchHealer,
      healingTouchTarget,
      'removeCard',
      cardIndex
    )

    if (result.success) {
      const isSelf = healingTouchHealer.instanceId === healingTouchTarget.instanceId
      addToast(
        `💚 HEALING TOUCH: ${healingTouchHealer.creature.name} removed ${result.removedCard?.name || 'card'} from ${isSelf ? 'itself' : healingTouchTarget.creature.name}!`
      )
      // Clear selection so player can see the updated state
      setSelectedBoardCreature(null)
      setValidMoveTiles([])
      setValidAttackTargets([])
      setRenderCounter((prev) => prev + 1)
    } else {
      addToast(`Healing Touch failed: ${result.message}`)
    }

    setShowHealingTouchModal(false)
    setHealingTouchData(null)
  }

  /**
   * Handle Healing Touch Modal - Cancel
   * Closes the modal without taking action
   */
  const handleHealingTouchCancel = () => {
    setShowHealingTouchModal(false)
    setHealingTouchData(null)
  }

  return {
    handleHealingTouchHeal,
    handleHealingTouchRemoveCard,
    handleHealingTouchCancel,
  }
}
