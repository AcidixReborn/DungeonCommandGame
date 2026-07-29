import SimpleAI from '../ai/simpleAI'

/**
 * useFlashingBlades - FLASHING BLADES ability handlers (splash damage on attack).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Flashing-blades mode/pending
 * state itself still lives in useAbilityModals; this hook only owns the
 * handler logic that reacts to it.
 */
export function useFlashingBlades({
  gameState,
  addToast,
  isPlayerHuman,
  showInsubstantialNotification,
  handleOpponentDrawEffect,
  executeAttackAfterDefense,
  closeCombatPanel,
  flashingBladesPending,
  setFlashingBladesPending,
  setShowFlashingBladesModal,
  setFlashingBladesTargetMode,
  setSelectedBoardCreature,
  setValidMoveTiles,
  setValidAttackTargets,
  setPendingRightClickAttack,
  pendingAttack,
  setPendingAttack,
  setCombatPanelMode,
  setCombatHighlightCreatures,
  setRenderCounter,
}) {
  // User chose to use FLASHING BLADES - enter target selection mode
  const handleFlashingBladesUse = () => {
    if (!flashingBladesPending) return

    // Close the modal and enter target selection mode
    setShowFlashingBladesModal(false)
    setFlashingBladesTargetMode(true)

    // Clear normal attack state to prevent interference with FLASHING BLADES target selection
    // These were left from the original attack and could cause issues
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setPendingRightClickAttack(null)

    // The valid targets are already in flashingBladesPending.validTargets
    // They will be highlighted on the board for right-click selection
  }

  // User chose to skip FLASHING BLADES
  const handleFlashingBladesSkip = () => {
    addToast(`${flashingBladesPending?.attacker.creature.name} chose not to use FLASHING BLADES.`)

    // Now tap the creature if it had moved (was deferred for FLASHING BLADES)
    if (flashingBladesPending?.attacker?.hasMovedThisTurn) {
      flashingBladesPending.attacker.tap()
    }

    // Clear state
    setFlashingBladesPending(null)
    setShowFlashingBladesModal(false)
    setFlashingBladesTargetMode(false)
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setRenderCounter((prev) => prev + 1)
  }

  // User right-clicked on a valid FLASHING BLADES target - initiate attack
  const handleFlashingBladesTargetSelected = (targetInstance) => {
    if (!flashingBladesPending || !targetInstance) return

    // Set up a pending attack for the splash damage
    const attackerInstance = flashingBladesPending.attacker

    // Create a special flashing blades attack target info
    const targetInfo = {
      creature: targetInstance,
      attackType: 'flashing_blades',
      damage: 10,
    }

    // Store the pending attack and show the attack panel
    setPendingAttack({
      attackerInstance,
      defenderInstance: targetInstance,
      targetInfo,
      isFlashingBlades: true,
    })

    // Exit target selection mode
    setFlashingBladesTargetMode(false)

    // Show the combat panel for attack confirmation
    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: attackerInstance.instanceId,
      defender: targetInstance.instanceId,
    })
  }

  // User confirmed FLASHING BLADES splash attack from the attack panel
  const handleFlashingBladesConfirmAttack = () => {
    if (!pendingAttack || !pendingAttack.isFlashingBlades) return

    const { attackerInstance, defenderInstance } = pendingAttack
    const flashingBladesDamage = 10

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(
        defenderInstance,
        flashingBladesDamage,
        attackerInstance.owner
      )
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, flashingBladesDamage, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(
            `👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${flashingBladesDamage} FLASHING BLADES damage! Ability used until next Undead Refresh.`
          )
        }

        // Tap attacker if they moved
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        // Clear pending attack and combat panel
        setPendingAttack(null)
        closeCombatPanel()
        setFlashingBladesPending(null)
        setFlashingBladesTargetMode(false)
        setRenderCounter((prev) => prev + 1)
        return
      }
    }

    // Check if defender is human (needs defense options) or AI
    const defenderPlayerId = defenderInstance.owner
    const isDefenderHuman = isPlayerHuman(defenderPlayerId)

    if (isDefenderHuman) {
      // Show defense panel for the human defender
      setCombatPanelMode('defense')
    } else {
      // AI defender - check if AI wants to defend
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)

      // AI decides whether to use defensive abilities against 10 splash damage
      const defenseDecision = defenderAI.decideDefense(defenderInstance, 10, attackerInstance.owner)
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(defenderInstance, 10, attackerInstance.owner)
        if (defenseResult.success) {
          defenseResult.type = 'cower'
          defenseResult.damagePrevented = defenseResult.damageAvoided
          defenseResult.damageReduction = defenseResult.damageAvoided
        }
      } else if (defenseDecision.type === 'immediate_card') {
        const result = gameState.applyImmediateCardDefense(
          defenseDecision.card,
          defenseDecision.creature
        )
        if (result.success) {
          defenseResult = {
            success: true,
            type: 'immediate_card',
            damagePrevented: result.damagePrevented,
            damageReduction: result.damagePrevented,
            cardUsed: defenseDecision.card.name,
          }

          // Handle opponent draws (Recoil) - defender chooses which opponent receives card
          if (result.opponentDrawsCards > 0) {
            const cardName = result.cardUsed?.name || defenseDecision.card.name
            handleOpponentDrawEffect(
              result.opponentDrawsCards,
              cardName,
              defenderPlayerId,
              attackerInstance.owner
            )
          }
        }
      }

      // Execute the FLASHING BLADES attack
      closeCombatPanel()
      executeAttackAfterDefense({
        type: defenseResult?.type || 'none',
        damageReduction: defenseResult?.damageReduction || 0,
        success: !!defenseResult?.success,
      })
    }
  }

  return {
    handleFlashingBladesUse,
    handleFlashingBladesSkip,
    handleFlashingBladesTargetSelected,
    handleFlashingBladesConfirmAttack,
  }
}
