import SimpleAI from '../ai/simpleAI'

/**
 * useConfusionGaze - CONFUSION GAZE ability handlers (Umber Hulk, Sting of Lolth).
 * Slide an enemy up to 3 squares, then make a 30-damage melee attack.
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Confusion-gaze mode/pending
 * state itself still lives in useAbilityModals; this hook only owns the
 * handler logic that reacts to it.
 */
export function useConfusionGaze({
  gameState,
  addToast,
  isPlayerHuman,
  showInsubstantialNotification,
  handleOpponentDrawEffect,
  executeAttackAfterDefense,
  closeCombatPanel,
  confusionGazeMode,
  setConfusionGazeMode,
  confusionGazePending,
  setConfusionGazePending,
  setShowConfusionGazeModal,
  pendingAttack,
  setPendingAttack,
  pendingDamageBoostAttack,
  notAdjacentErrorModal,
  setNotAdjacentErrorModal,
  setSelectedBoardCreature,
  setValidMoveTiles,
  setValidAttackTargets,
  setPendingRightClickAttack,
  setCombatPanelMode,
  setCombatHighlightCreatures,
  setRenderCounter,
}) {
  /**
   * Check if right-click target is valid for CONFUSION GAZE
   * Called when Umber Hulk is selected and player right-clicks an enemy
   * @returns {boolean} True if CONFUSION GAZE modal was shown
   */
  const checkConfusionGazeOnRightClick = (selectedCreature, targetCreature) => {
    // Must have CONFUSION GAZE ability
    if (!gameState.hasConfusionGaze(selectedCreature)) return false
    // Must not have attacked yet
    if (selectedCreature.hasAttackedThisTurn) return false
    // Must not be tapped
    if (selectedCreature.isTapped) return false

    // Check if target is valid for CONFUSION GAZE (within 5 with LOS)
    const validTargets = gameState.getConfusionGazeTargets(selectedCreature)
    const isValidTarget = validTargets.some((t) => t.instanceId === targetCreature.instanceId)

    if (isValidTarget) {
      // Show modal asking if player wants to use CONFUSION GAZE
      setConfusionGazePending({
        attacker: selectedCreature,
        target: targetCreature,
        validSlideTiles: [],
        slideDestination: null,
        attackTargets: [],
      })
      setShowConfusionGazeModal(true)
      return true // Handled - don't show normal attack
    }
    return false // Not a valid CONFUSION GAZE target
  }

  // Handler when player confirms CONFUSION GAZE in modal
  const handleConfusionGazeConfirm = () => {
    if (!confusionGazePending) return

    setShowConfusionGazeModal(false)
    const { target } = confusionGazePending

    // Calculate valid slide destinations
    const validSlideTiles = gameState.getValidSlideTiles(target, 3)

    if (validSlideTiles.length === 0) {
      addToast('No valid slide destinations available!')
      setConfusionGazePending(null)
      return
    }

    setConfusionGazeMode('slide')
    setConfusionGazePending((prev) => ({
      ...prev,
      validSlideTiles,
    }))

    // Clear other selection states
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
  }

  // Handler when player declines CONFUSION GAZE - initiate normal attack
  const handleConfusionGazeDecline = () => {
    if (!confusionGazePending) {
      setShowConfusionGazeModal(false)
      return
    }

    const { attacker, target } = confusionGazePending

    setShowConfusionGazeModal(false)
    setConfusionGazePending(null)

    // Check if the target is in melee or ranged range for a normal attack
    const validAttackTargets = gameState.getValidAttackTargets(attacker)
    const targetInfo = validAttackTargets.find((t) => t.creature.instanceId === target.instanceId)

    if (targetInfo) {
      // Valid normal attack - show attack confirmation panel using pendingRightClickAttack (same as normal right-click attack)
      const attackInfo = {
        attackType: targetInfo.attackType,
        damage:
          targetInfo.attackType === 'melee'
            ? attacker.creature.meleeAttack?.damage || 0
            : attacker.creature.rangedAttack?.damage || 0,
      }
      setPendingRightClickAttack({
        attacker: attacker,
        target: target,
        attackInfo: attackInfo,
      })
      setCombatPanelMode('attack')
      setCombatHighlightCreatures({
        attacker: attacker.instanceId,
        defender: target.instanceId,
      })
    } else {
      // Target is not adjacent - show error modal and let player try again
      // Keep the damage boost state active so they can select another target
      setNotAdjacentErrorModal({
        show: true,
        attacker: attacker,
        target: target,
        hasDamageBoost: !!pendingDamageBoostAttack,
      })
    }
  }

  // Handler to dismiss not adjacent error and let player try again
  const handleNotAdjacentErrorDismiss = () => {
    const { attacker, hasDamageBoost } = notAdjacentErrorModal
    setNotAdjacentErrorModal({ show: false, attacker: null, target: null, hasDamageBoost: false })

    // Re-select the attacker so they can choose another target
    if (attacker && hasDamageBoost && pendingDamageBoostAttack) {
      // Re-show valid targets including Confusion Gaze targets
      setSelectedBoardCreature(attacker)

      // Rebuild target list (same logic as confirmDamageBoost)
      const allTargets = gameState.getValidAttackTargets(attacker)
      let filteredTargets = allTargets.filter((t) => t.attackType === 'melee')

      // Add Confusion Gaze targets
      if (gameState.hasConfusionGaze && gameState.hasConfusionGaze(attacker)) {
        const gazeTargets = gameState.getConfusionGazeTargets(attacker)
        for (const gazeTarget of gazeTargets) {
          const alreadyInList = filteredTargets.some(
            (t) =>
              t.creature?.instanceId === gazeTarget.instanceId ||
              t.instanceId === gazeTarget.instanceId
          )
          if (!alreadyInList) {
            filteredTargets.push({
              creature: gazeTarget,
              instanceId: gazeTarget.instanceId,
              attackType: 'confusion_gaze',
              position: gazeTarget.position,
            })
          }
        }
      }

      setValidAttackTargets(filteredTargets)
      addToast('Select another target or use Confusion Gaze on a distant enemy')
    }
  }

  // Handler when attack target is selected (during attack mode)
  const handleConfusionGazeAttackSelected = (attackTarget) => {
    if (!confusionGazePending) return

    const { attacker } = confusionGazePending
    const baseDamage = attacker.creature.meleeAttack?.damage || 30

    // Check if there's an active damage boost (e.g., Deep Wound)
    // Confusion Gaze can use melee damage boost cards
    let damageBoostCard = null
    let damageBoostBonus = 0
    let damageBoostFlat = null

    if (
      pendingDamageBoostAttack &&
      pendingDamageBoostAttack.creature?.instanceId === attacker.instanceId &&
      !pendingDamageBoostAttack.isRanged
    ) {
      // Melee damage boost applies to Confusion Gaze
      damageBoostCard = pendingDamageBoostAttack.card
      damageBoostBonus = pendingDamageBoostAttack.damageBonus || 0
      damageBoostFlat = pendingDamageBoostAttack.flatDamage
    }

    // Calculate total damage (flat damage replaces base, otherwise add bonus)
    const damage = damageBoostFlat !== null ? damageBoostFlat : baseDamage + damageBoostBonus

    // Set up pending attack for confirmation
    setPendingAttack({
      attackerInstance: attacker,
      defenderInstance: attackTarget,
      targetInfo: { attackType: 'confusion_gaze', damage },
      isConfusionGaze: true,
      damageBoostCard,
      damageBoostBonus,
      damageBoostFlat,
    })

    // Keep confusionGazePending so we can access attacker info later for tap logic
    // Clear confusion gaze MODE only (attack panel takes over for UI)
    setConfusionGazeMode(null)

    // Show attack confirmation panel
    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: attacker.instanceId,
      defender: attackTarget.instanceId,
    })
  }

  // Clean up after CONFUSION GAZE completes
  const handleConfusionGazeComplete = () => {
    if (confusionGazePending) {
      const { attacker } = confusionGazePending

      // Mark as attacked
      attacker.hasAttackedThisTurn = true

      // Tap if already moved
      if (attacker.hasMovedThisTurn) {
        attacker.tap()
      }
    }

    // Clear all confusion gaze state
    setConfusionGazeMode(null)
    setConfusionGazePending(null)
    setRenderCounter((prev) => prev + 1)
  }

  // Handler when slide destination is selected (during slide mode)
  const handleConfusionGazeSlideSelected = (tile) => {
    if (!confusionGazePending || confusionGazeMode !== 'slide') return

    const { attacker, target, validSlideTiles } = confusionGazePending

    // Check if this tile is a valid slide destination
    const isValidSlide = validSlideTiles.some((t) => t.x === tile.x && t.y === tile.y)
    if (!isValidSlide) return

    // Execute the slide
    const slideResult = gameState.executeConfusionGazeSlide(target, { x: tile.x, y: tile.y })
    addToast(
      `😵 Slid ${target.creature.name} from (${slideResult.oldPos.x}, ${slideResult.oldPos.y}) to (${slideResult.newPos.x}, ${slideResult.newPos.y})`
    )

    // IMPORTANT: Force re-render to show the slid creature in new position
    setRenderCounter((prev) => prev + 1)

    // Determine attack targets
    const attackTargets = gameState.getConfusionGazeAttackTargets(attacker, target)

    if (attackTargets.length === 0) {
      // This shouldn't happen - slid creature should always be attackable
      handleConfusionGazeComplete()
      return
    }

    // Update state with slide destination and attack targets
    setConfusionGazePending((prev) => ({
      ...prev,
      slideDestination: { x: tile.x, y: tile.y },
      attackTargets,
    }))

    // If only one target, auto-select it (with small delay to allow render)
    if (attackTargets.length === 1) {
      setConfusionGazeMode('attack') // Keep mode for state tracking
      // Use setTimeout to allow render to complete before showing attack panel
      setTimeout(() => {
        handleConfusionGazeAttackSelected(attackTargets[0].target)
      }, 100)
      return
    }

    // Multiple targets - show attack selection mode
    setConfusionGazeMode('attack')
  }

  // Handler when CONFUSION GAZE attack is confirmed from combat panel
  const handleConfusionGazeConfirmAttack = () => {
    if (!pendingAttack || !pendingAttack.isConfusionGaze) return

    const {
      attackerInstance,
      defenderInstance,
      targetInfo,
      damageBoostCard,
      damageBoostBonus,
      damageBoostFlat,
    } = pendingAttack
    // Use damage from targetInfo which already includes any damage boost
    const damage = targetInfo?.damage || attackerInstance.creature.meleeAttack?.damage || 30

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(defenderInstance, damage, attackerInstance.owner)
      if (blocked) {
        // Check if defender is human - show modal
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          // Show Insubstantial modal for human defender
          showInsubstantialNotification(defenderInstance, damage, attackerInstance)
        } else {
          // AI defender - just toast
          addToast(
            `👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${damage} CONFUSION GAZE damage! Ability used until next Undead Refresh.`
          )
        }

        // Mark attacker as attacked and tap if moved
        attackerInstance.hasAttackedThisTurn = true
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        // Clear pending attack and combat panel
        setPendingAttack(null)
        closeCombatPanel()
        setConfusionGazeMode(null)
        setConfusionGazePending(null)
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

      // AI decides whether to use defensive abilities
      const defenseDecision = defenderAI.decideDefense(
        defenderInstance,
        damage,
        attackerInstance.owner
      )
      let defenseResult = null

      if (defenseDecision.type === 'cower') {
        defenseResult = gameState.applyCower(defenderInstance, damage, attackerInstance.owner)
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

      // Execute the attack
      closeCombatPanel()
      executeAttackAfterDefense({
        type: defenseResult?.type || 'none',
        damageReduction: defenseResult?.damageReduction || 0,
        success: !!defenseResult?.success,
      })
    }
  }

  // Cancel CONFUSION GAZE during slide selection
  const handleConfusionGazeCancel = () => {
    setConfusionGazeMode(null)
    setConfusionGazePending(null)
    setShowConfusionGazeModal(false)
    setRenderCounter((prev) => prev + 1)
  }

  return {
    checkConfusionGazeOnRightClick,
    handleConfusionGazeConfirm,
    handleConfusionGazeDecline,
    handleNotAdjacentErrorDismiss,
    handleConfusionGazeSlideSelected,
    handleConfusionGazeAttackSelected,
    handleConfusionGazeConfirmAttack,
    handleConfusionGazeComplete,
    handleConfusionGazeCancel,
  }
}
