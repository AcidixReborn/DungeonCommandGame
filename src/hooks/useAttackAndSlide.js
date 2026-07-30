import SimpleAI from '../ai/simpleAI'

/**
 * useAttackAndSlide - ATTACK + SLIDE order card handlers (Phase STD-8:
 * Blast of Force, Hypnotic Gaze). Both cards pair a melee attack with a
 * mandatory slide (distance chosen by the player/AI, up to the card's max) -
 * Blast of Force slides the target AFTER the hit, Hypnotic Gaze slides it
 * BEFORE the attack. Mirrors the useSlam/useConfusionGaze extraction pattern:
 * mode/pending state lives in useAbilityModals, this hook owns the handler logic.
 * Called late in GameBoard.jsx (same as useConfusionGaze) since it depends on
 * executeAttackAfterDefense being defined first.
 */
export function useAttackAndSlide({
  gameState,
  addToast,
  isPlayerHuman,
  showInsubstantialNotification,
  handleOpponentDrawEffect,
  executeAttackAfterDefense,
  attackSlideMode,
  attackSlidePending,
  setAttackSlidePending,
  setAttackSlideMode,
  attackSlideValidTiles,
  setAttackSlideValidTiles,
  pendingAttack,
  setPendingAttack,
  setCombatPanelMode,
  setCombatHighlightCreatures,
  closeCombatPanel,
  setAiDeathQueue,
  setRenderCounter,
}) {
  // Set up the pendingAttack/combat panel for Hypnotic Gaze's melee attack (after the slide resolves)
  const executeHypnoticGazeAttack = (attackerInstance, targetInstance, card, cardIndex) => {
    const baseDamage = attackerInstance.creature.meleeAttack?.damage || 0
    const damageBonus = card.meleeDamageBonus || 0

    setPendingAttack({
      attackerInstance,
      defenderInstance: targetInstance,
      targetInfo: { attackType: 'hypnotic_gaze', damage: baseDamage + damageBonus },
      isHypnoticGaze: true,
      damageBoostCard: card,
      damageBoostBonus: damageBonus,
      damageBoostFlat: null,
      cardIndex,
    })
    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: attackerInstance.instanceId,
      defender: targetInstance.instanceId,
    })
  }

  // HYPNOTIC GAZE: initial target chosen (within slideTargetSelectRange) - compute slide tiles
  // and enter the slide-picker mode. Called after the player/AI right-clicks a valid enemy.
  const handleHypnoticGazeTargetSelected = (casterInstance, targetInstance, card, cardIndex) => {
    const validSlideTiles = gameState.getValidSlideTiles(
      targetInstance,
      card.slideTargetBeforeAttack
    )

    if (validSlideTiles.length === 0) {
      // Target is fully boxed in (mountains/board edge) - skip the slide, attack still happens
      executeHypnoticGazeAttack(casterInstance, targetInstance, card, cardIndex)
      return
    }

    setAttackSlidePending({
      phase: 'pre-attack',
      card,
      cardIndex,
      attackerInstance: casterInstance,
      targetInstance,
      maxDistance: card.slideTargetBeforeAttack,
    })
    setAttackSlideValidTiles(validSlideTiles)
    setAttackSlideMode(true)
    setRenderCounter((prev) => prev + 1)
    addToast(
      `👁️ ${card.name}: Right-click a highlighted tile to slide ${targetInstance.creature.name}`
    )
  }

  // Handle tile selection during ATTACK + SLIDE mode (right-click on a valid slide destination)
  const handleAttackSlideTileSelect = (x, y) => {
    if (!attackSlideMode || !attackSlidePending) return

    const isValid = attackSlideValidTiles.some((t) => t.x === x && t.y === y)
    if (!isValid) return

    const { phase, attackerInstance, targetInstance, card, cardIndex } = attackSlidePending

    const slideResult = gameState.executeSlide(targetInstance, { x, y })
    addToast(
      `Slid ${targetInstance.creature.name} from (${slideResult.oldPos.x}, ${slideResult.oldPos.y}) to (${slideResult.newPos.x}, ${slideResult.newPos.y})`
    )

    // Clear attack-slide state
    setAttackSlideMode(false)
    setAttackSlidePending(null)
    setAttackSlideValidTiles([])
    setRenderCounter((prev) => prev + 1)

    if (phase === 'pre-attack') {
      // HYPNOTIC GAZE: proceed to the melee attack (always happens, no adjacency re-check)
      executeHypnoticGazeAttack(attackerInstance, targetInstance, card, cardIndex)
    }
    // phase === 'post-hit' (Blast of Force): the attack already resolved before the slide - nothing more to do
  }

  // Handle Hypnotic Gaze attack confirmation from the combat panel (mirrors handleConfusionGazeConfirmAttack)
  const handleHypnoticGazeConfirmAttack = () => {
    if (!pendingAttack || !pendingAttack.isHypnoticGaze) return

    const { attackerInstance, defenderInstance, targetInfo, damageBoostBonus } = pendingAttack
    const damage = targetInfo?.damage || attackerInstance.creature.meleeAttack?.damage || 0

    // Check if defender has INSUBSTANTIAL available - triggers before defense panel
    if (gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = gameState.useInsubstantial(defenderInstance, damage, attackerInstance.owner)
      if (blocked) {
        const defenderOwner = defenderInstance.owner
        const defenderIsHuman = isPlayerHuman(defenderOwner)

        if (defenderIsHuman) {
          showInsubstantialNotification(defenderInstance, damage, attackerInstance)
        } else {
          addToast(
            `👻 INSUBSTANTIAL: ${defenderInstance.creature.name} blocked ${damage} HYPNOTIC GAZE damage! Ability used until next Undead Refresh.`
          )
        }

        attackerInstance.hasAttackedThisTurn = true
        if (attackerInstance.hasMovedThisTurn) {
          attackerInstance.tap()
        }

        setPendingAttack(null)
        closeCombatPanel()
        setRenderCounter((prev) => prev + 1)
        return
      }
    }

    const defenderPlayerId = defenderInstance.owner
    const isDefenderHuman = isPlayerHuman(defenderPlayerId)

    if (isDefenderHuman) {
      setCombatPanelMode('defense')
    } else {
      const defenderPlayer = gameState.players[defenderPlayerId]
      const difficulty = defenderPlayer?.aiDifficulty || 'easy'
      const defenderAI = new SimpleAI(gameState, defenderPlayerId, null, difficulty)

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

      closeCombatPanel()
      executeAttackAfterDefense({
        type: defenseResult?.type || 'none',
        damageReduction: defenseResult?.damageReduction || 0,
        success: !!defenseResult?.success,
      })
    }
  }

  // AI picks a slide destination (mandatory - only the tile is chosen, not whether to slide)
  const handleAIAttackSlideDecision = (attackerInstance, targetInstance, validTiles, cardName) => {
    const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)]
    gameState.executeSlide(targetInstance, randomTile)

    addToast(
      `${cardName}: AI slid ${targetInstance.creature.name} to (${randomTile.x}, ${randomTile.y})`
    )

    setAiDeathQueue((prev) => [
      ...prev,
      {
        title: cardName,
        message: `${attackerInstance.creature.name} used ${cardName} to slide ${targetInstance.creature.name} to a new position!`,
        creatureName: attackerInstance.creature.name,
        isAttackSlide: true,
      },
    ])
  }

  return {
    handleHypnoticGazeTargetSelected,
    handleAttackSlideTileSelect,
    handleHypnoticGazeConfirmAttack,
    handleAIAttackSlideDecision,
  }
}
