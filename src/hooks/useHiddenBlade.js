import SimpleAI from '../ai/simpleAI'

/**
 * useHiddenBlade - HIDDEN BLADE ability handlers (bonus attack on tapped enemies).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Hidden-blade mode/pending state
 * itself still lives in useAbilityModals; this hook only owns the handler
 * logic that reacts to it.
 */
export function useHiddenBlade({
  gameState,
  addToast,
  isPlayerHuman,
  isCurrentPlayerHumanCheck,
  showInsubstantialNotification,
  handleOpponentDrawEffect,
  executeAttackAfterDefense,
  closeCombatPanel,
  hiddenBladePending,
  setHiddenBladePending,
  setShowHiddenBladeModal,
  setHiddenBladeTargetMode,
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
  // User chose to use HIDDEN BLADE - enter target selection mode
  const handleHiddenBladeUse = () => {
    if (!hiddenBladePending) {
      return
    }

    // Close the modal and enter target selection mode
    setShowHiddenBladeModal(false)
    setHiddenBladeTargetMode(true)

    // Clear normal attack state to prevent interference
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setPendingRightClickAttack(null)
  }

  // User chose to skip HIDDEN BLADE
  const handleHiddenBladeSkip = () => {
    addToast(`${hiddenBladePending?.attacker.creature.name} chose not to use HIDDEN BLADE.`)

    // Consume action - tap if creature has moved (deferred from original attack)
    if (hiddenBladePending?.attacker?.hasMovedThisTurn) {
      hiddenBladePending.attacker.tap()
    }

    // Clear state
    setHiddenBladePending(null)
    setShowHiddenBladeModal(false)
    setHiddenBladeTargetMode(false)
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
    setRenderCounter((prev) => prev + 1)
  }

  // User right-clicked on a valid HIDDEN BLADE target - initiate attack
  const handleHiddenBladeTargetSelected = (targetInstance) => {
    if (!hiddenBladePending || !targetInstance) {
      return
    }

    // Set up a pending attack for the damage
    const attackerInstance = hiddenBladePending.attacker

    // Create a special hidden blade attack target info
    const targetInfo = {
      creature: targetInstance,
      attackType: 'hidden_blade',
      damage: 10,
    }

    // Store the pending attack and show the attack panel
    setPendingAttack({
      attackerInstance,
      defenderInstance: targetInstance,
      targetInfo,
      isHiddenBlade: true,
    })

    // Exit target selection mode
    setHiddenBladeTargetMode(false)

    // Show the combat panel for attack confirmation
    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: attackerInstance.instanceId,
      defender: targetInstance.instanceId,
    })
  }

  // User confirmed HIDDEN BLADE attack from the attack panel
  const handleHiddenBladeConfirmAttack = () => {
    if (!pendingAttack || !pendingAttack.isHiddenBlade) {
      return
    }

    const { attackerInstance, defenderInstance } = pendingAttack
    const hiddenBladeDamage = 10

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(
        defenderInstance,
        hiddenBladeDamage,
        attackerInstance.owner
      )
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, hiddenBladeDamage, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(
            `👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${hiddenBladeDamage} HIDDEN BLADE damage! Ability used until next Undead Refresh.`
          )
        }

        // Clear pending attack and combat panel
        setPendingAttack(null)
        closeCombatPanel()
        setHiddenBladePending(null)
        setHiddenBladeTargetMode(false)
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

      // AI decides whether to use defensive abilities against 10 damage
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

      // Execute the HIDDEN BLADE attack
      closeCombatPanel()
      executeAttackAfterDefense({
        type: defenseResult?.type || 'none',
        damageReduction: defenseResult?.damageReduction || 0,
        success: !!defenseResult?.success,
      })
    }
  }

  /**
   * Check and trigger HIDDEN BLADE ability after any attack
   * Called after attack resolves and defense phase completes
   * IMPORTANT: This checks for TAPPED targets, so it must be called AFTER defense
   * (using defense cards taps the defender)
   * @returns {boolean} True if HIDDEN BLADE was triggered (modal shown)
   */
  const checkHiddenBladeTrigger = (attackerInstance, attackResult) => {
    // Only trigger if attack was successful (hit the target)
    // Note: Hidden Blade triggers even if all damage was prevented by defense
    if (!attackResult.success) {
      return false
    }

    // Check if attacker has HIDDEN BLADE
    if (!gameState.hasHiddenBlade(attackerInstance)) {
      return false
    }

    // Only show modal for human player (AI is handled separately)
    if (!isCurrentPlayerHumanCheck()) {
      return false
    }

    // Get valid targets - adjacent TAPPED enemies (checked AFTER attack/defense resolves)
    const validTargets = gameState.getHiddenBladeTargets(attackerInstance)
    if (validTargets.length === 0) {
      // No valid targets - tap the creature if it had moved (was deferred for HIDDEN BLADE)
      if (attackerInstance.hasMovedThisTurn && !attackerInstance.isTapped) {
        attackerInstance.tap()
      }
      return false
    }
    // Set up the pending ability and show modal
    setHiddenBladePending({
      attacker: attackerInstance,
      validTargets,
    })
    setShowHiddenBladeModal(true)

    return true
  }

  return {
    handleHiddenBladeUse,
    handleHiddenBladeSkip,
    handleHiddenBladeTargetSelected,
    handleHiddenBladeConfirmAttack,
    checkHiddenBladeTrigger,
  }
}
