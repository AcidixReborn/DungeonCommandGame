import { logger } from '../utils/logger'

/**
 * useRangedSplashDefense - RANGED SPLASH damage handlers (ACID BREATH / EXPLOSIVE BOLTS)
 * and Savage Demise attack resolution (Boar/Wereboar sacrifice + DEATH STRIKE).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Ranged-splash/savage-demise
 * pending state itself still lives in useAbilityModals; this hook only
 * owns the handler logic that reacts to it.
 */
export function useRangedSplashDefense({
  gameState,
  gameConfig,
  addToast,
  isPlayerHuman,
  handleOpponentDrawEffect,
  closeCombatPanel,
  pendingAttack,
  setPendingAttack,
  rangedSplashAttackInfo,
  setRangedSplashAttackInfo,
  pendingRangedSplashTargets,
  setPendingRangedSplashTargets,
  currentRangedSplashIndex,
  setCurrentRangedSplashIndex,
  setShowRangedSplashDefensePanel,
  setCombatPanelMode,
  savageDemisePending,
  clearSavageDemiseState,
  setRenderCounter,
}) {
  /**
   * Process splash damage targets one at a time
   * Shows defense panel for human defenders, AI uses 0/50/100 rule
   * @param {Array} targets - Array of enemy creatures adjacent to ranged target
   * @param {number} index - Current index in targets array
   * @param {Object} attackerInstance - The creature that made the ranged attack
   * @param {number} splashDamage - Damage to deal (20 for Acid Breath, 10 for Explosive Bolts)
   * @param {string} abilityName - 'ACID BREATH' or 'EXPLOSIVE BOLTS'
   * @param {Function} onComplete - Callback when all splash damage is resolved
   */
  const processNextRangedSplashTarget = (
    targets,
    index,
    attackerInstance,
    splashDamage,
    abilityName,
    onComplete
  ) => {
    if (index >= targets.length) {
      // All splash targets processed - now tap the attacker and complete
      // Find the actual creature in the CURRENT gameState (not stale closure)
      const attackerOwner = attackerInstance.owner
      const actualAttacker = gameState.players[attackerOwner]?.creaturesInPlay.find(
        (c) => c.instanceId === attackerInstance.instanceId
      )

      if (actualAttacker) {
        actualAttacker.hasAttackedThisTurn = true
        actualAttacker.tap()
      }

      // Clear splash state
      setPendingRangedSplashTargets([])
      setCurrentRangedSplashIndex(0)
      setRangedSplashAttackInfo(null)
      setShowRangedSplashDefensePanel(false)
      setCombatPanelMode(null) // Clear combat panel after splash resolution

      // Force re-render to show tapped state
      setRenderCounter((prev) => prev + 1)

      if (onComplete) onComplete()
      return
    }

    const target = targets[index]
    const isTargetHuman = isPlayerHuman(target.owner)
    const isTargetTapped = target.isTapped

    if (isTargetHuman && !isTargetTapped) {
      // Human defender - show defense panel using existing combat panel system
      setCurrentRangedSplashIndex(index)
      setRangedSplashAttackInfo({
        attackerInstance,
        attackerOwner: attackerInstance.owner,
        splashDamage,
        abilityName,
        currentTarget: target,
        targetIndex: index,
        totalTargets: targets.length,
        onComplete,
      })
      // Use existing combat panel system for defense
      setPendingAttack({
        attackerInstance: attackerInstance,
        defenderInstance: target,
        targetInfo: { attackType: 'ranged_splash', damage: splashDamage, abilityName: abilityName },
        isSplashDamage: true,
        isRangedSplash: true,
        splashSource: abilityName,
      })
      setCombatPanelMode('defense')
      setShowRangedSplashDefensePanel(true)
      setRenderCounter((prev) => prev + 1)
    } else if (!isTargetHuman && !isTargetTapped) {
      // AI defender - use 0/50/100 rule
      handleAIRangedSplashDefense(
        targets,
        index,
        attackerInstance,
        splashDamage,
        abilityName,
        target,
        onComplete
      )
    } else {
      // Tapped creature - apply damage directly
      const result = gameState.applyRangedSplashDamage(
        target,
        attackerInstance.owner,
        splashDamage,
        0
      )
      const moraleMsg =
        result.destroyed && result.moraleChange
          ? ` Morale changes: Attacker +${result.moraleChange.attacker}, Defender ${result.moraleChange.defender}`
          : ''
      addToast(
        `${abilityName}: ${target.creature.name} takes ${result.damage} splash damage!${result.destroyed ? ' DESTROYED!' : ''}${moraleMsg}`
      )

      // Process next target
      processNextRangedSplashTarget(
        targets,
        index + 1,
        attackerInstance,
        splashDamage,
        abilityName,
        onComplete
      )
    }
  }

  /**
   * Handle defense selection for RANGED SPLASH damage (ACID BREATH / EXPLOSIVE BOLTS)
   * Supports COWER, UNSTOPPABLE HORDES, IMMEDIATE cards, and skip
   * @param {Object} defense - { type, damageReduction, moraleCost, creatures, card, creature }
   */
  const handleRangedSplashDefenseSelected = (defense) => {
    if (!pendingAttack || !rangedSplashAttackInfo) {
      return
    }

    const { currentTarget, splashDamage, attackerInstance, abilityName } = rangedSplashAttackInfo
    const defenderInstance = currentTarget

    if (defense.type === 'skip') {
      // No defense - apply full splash damage
      closeCombatPanel()
      handleRangedSplashDefenseComplete({ damageReduction: 0 })
      return
    }

    if (defense.type === 'cower') {
      // COWER: Avoid ALL damage, pay morale, tap creature
      const cowerResult = gameState.applyCower(
        defenderInstance,
        splashDamage,
        attackerInstance.owner
      )
      closeCombatPanel()
      handleRangedSplashDefenseComplete({ damageReduction: cowerResult.damageAvoided })
      return
    }

    if (defense.type === 'unstoppable_hordes') {
      // UNSTOPPABLE HORDES: Each Undead prevents 20 damage
      let totalPrevented = 0
      defense.creatures?.forEach((creature) => {
        const result = gameState.applyUnstoppableHordes(creature)
        if (result.success) {
          totalPrevented += result.damagePrevented
        }
      })
      closeCombatPanel()
      handleRangedSplashDefenseComplete({ damageReduction: totalPrevented })
      return
    }

    if (defense.type === 'immediate_card') {
      // IMMEDIATE card: Prevent damage equal to card value, optionally discard card as cost
      const result = gameState.applyImmediateCardDefense(
        defense.card,
        defense.creature,
        defense.discardCard
      )

      // Handle opponent draws (Recoil) - defender chooses which opponent receives card
      if (result.success && result.opponentDrawsCards > 0) {
        const cardName = result.cardUsed?.name || defense.card.name
        handleOpponentDrawEffect(
          result.opponentDrawsCards,
          cardName,
          defenderInstance.owner,
          attackerInstance.owner
        )
      }

      closeCombatPanel()
      handleRangedSplashDefenseComplete({
        damageReduction: result.success ? result.damagePrevented : 0,
      })
      return
    }

    // Fallback - no defense
    closeCombatPanel()
    handleRangedSplashDefenseComplete({ damageReduction: 0 })
  }

  /**
   * Handle Savage Demise attack resolution
   * Called when the sacrifice target's defense phase completes
   *
   * Flow:
   * 1. Apply Savage Demise damage to target (with defense reduction)
   * 2. Check for DEATH STRIKE ability on the attacker (Boar/Wereboar)
   * 3. If DEATH STRIKE, apply additional damage to the SAME target
   * 4. Kill the creature that used Savage Demise (guaranteed death)
   * 5. Clear savageDemisePending state and combat panels
   *
   * @param {Object} defenseResult - { damageReduction: number, type: string, ... }
   */
  const handleSavageDemiseResolution = (defenseResult) => {
    logger.debug('[handleSavageDemiseResolution] === CALLED ===')
    logger.debug('[handleSavageDemiseResolution] defenseResult:', defenseResult)
    logger.debug('[handleSavageDemiseResolution] savageDemisePending:', savageDemisePending)
    logger.debug('[handleSavageDemiseResolution] pendingAttack:', pendingAttack)

    if (!savageDemisePending || !pendingAttack) {
      logger.debug(
        '[handleSavageDemiseResolution] Missing state - savageDemisePending:',
        !!savageDemisePending,
        'pendingAttack:',
        !!pendingAttack
      )
      return
    }

    const { attacker, target, damage, originalAttacker, card } = savageDemisePending
    const damageReduction = defenseResult.damageReduction || 0

    logger.debug('[handleSavageDemiseResolution] attacker:', attacker?.creature?.name)
    logger.debug('[handleSavageDemiseResolution] target:', target?.creature?.name)
    logger.debug('[handleSavageDemiseResolution] damage:', damage)
    logger.debug('[handleSavageDemiseResolution] damageReduction:', damageReduction)

    // Apply Savage Demise damage to target using the dedicated method
    logger.debug('[handleSavageDemiseResolution] Calling applySavageDemiseDamage...')
    const savageDemiseResult = gameState.applySavageDemiseDamage(
      target,
      attacker.owner,
      damage,
      damageReduction
    )
    logger.debug('[handleSavageDemiseResolution] savageDemiseResult:', savageDemiseResult)
    const finalDamage = savageDemiseResult.damage

    // Build message
    let message = ''
    if (damageReduction > 0) {
      message += `⚡ ${defenseResult.cardUsed || 'Defense'} prevented ${damageReduction} damage! `
    }
    message += `⚔️ SAVAGE DEMISE: ${attacker.creature.name} attacks ${target.creature.name} for ${finalDamage} damage!`

    if (savageDemiseResult.destroyed) {
      message += ` ${target.creature.name} was destroyed!`
      if (savageDemiseResult.moraleChange) {
        message += ` Morale: ${attacker.owner} +${savageDemiseResult.moraleChange.attacker}, ${target.owner} ${savageDemiseResult.moraleChange.defender}`
      }
    } else {
      message += ` ${target.creature.name} has ${savageDemiseResult.remainingHP || target.currentHP} HP remaining.`
    }
    addToast(message)

    // Check for DEATH STRIKE ability (Boar/Wereboar)
    const hasDeathStrike = gameState.hasDeathStrike && gameState.hasDeathStrike(attacker)
    if (hasDeathStrike) {
      // DEATH STRIKE: Additional melee attack against the SAME target
      // Only triggers if target is still alive (not destroyed by Savage Demise)
      const targetStillAlive = !savageDemiseResult.destroyed

      if (targetStillAlive) {
        const deathStrikeDamage = attacker.creature.meleeAttack?.damage || 0
        const deathStrikeResult = gameState.applySavageDemiseDamage(
          target,
          attacker.owner,
          deathStrikeDamage,
          0
        )

        let deathStrikeMsg = `💀 DEATH STRIKE: ${attacker.creature.name} strikes ${target.creature.name} for ${deathStrikeDamage} damage!`
        if (deathStrikeResult.destroyed) {
          deathStrikeMsg += ` ${target.creature.name} was destroyed!`
          if (deathStrikeResult.moraleChange) {
            deathStrikeMsg += ` Morale: ${attacker.owner} +${deathStrikeResult.moraleChange.attacker}, ${target.owner} ${deathStrikeResult.moraleChange.defender}`
          }
        } else {
          deathStrikeMsg += ` ${target.creature.name} has ${deathStrikeResult.remainingHP || target.currentHP} HP remaining.`
        }
        addToast(deathStrikeMsg)
      } else {
        // Target already dead from Savage Demise, Death Strike doesn't trigger damage
        addToast(
          `💀 DEATH STRIKE: ${attacker.creature.name}'s death strike cannot trigger - target already destroyed.`
        )
      }
    }

    // Now kill the creature that used Savage Demise (guaranteed death)
    const sacrificer = attacker
    const sacrificerOwner = sacrificer.owner

    logger.debug('[handleSavageDemiseResolution] Sacrificing creature:', sacrificer?.creature?.name)
    logger.debug('[handleSavageDemiseResolution] Calling sacrificeCreature...')

    // Apply death - creature dies, owner loses morale equal to creature level
    const sacrificeDeathResult = gameState.sacrificeCreature(sacrificer)

    logger.debug('[handleSavageDemiseResolution] sacrificeDeathResult:', sacrificeDeathResult)

    addToast(
      `☠️ SACRIFICE: ${sacrificer.creature.name} dies from Savage Demise! (Morale -${sacrificeDeathResult.moraleLost})`
    )

    // Check for game over conditions
    gameState.checkGameOver()

    // Check for immediate elimination
    const eliminationResult = gameState.checkAndEliminatePlayer(sacrificerOwner)
    if (eliminationResult.eliminated) {
      const reason =
        eliminationResult.reason === 'morale' ? 'Morale reduced to 0!' : 'All creatures destroyed!'
      addToast(
        `🏳️ ${gameState.players[sacrificerOwner].commander.name} has been eliminated! ${reason}`
      )
    }

    const targetEliminationResult = gameState.checkAndEliminatePlayer(target.owner)
    if (targetEliminationResult.eliminated) {
      const reason =
        targetEliminationResult.reason === 'morale'
          ? 'Morale reduced to 0!'
          : 'All creatures destroyed!'
      addToast(
        `🏳️ ${gameState.players[target.owner].commander.name} has been eliminated! ${reason}`
      )
    }

    // Clear Savage Demise state
    logger.debug('[handleSavageDemiseResolution] Clearing state...')
    clearSavageDemiseState()
    setPendingAttack(null)

    // Force re-render to update UI
    setRenderCounter((prev) => prev + 1)
    logger.debug('[handleSavageDemiseResolution] === COMPLETE ===')
  }

  /**
   * Handle human player completing ranged splash defense
   * @param {Object} defenseResult - { damageReduction: number }
   */
  const handleRangedSplashDefenseComplete = (defenseResult) => {
    const { damageReduction } = defenseResult
    const { currentTarget, splashDamage, attackerInstance, abilityName, onComplete } =
      rangedSplashAttackInfo

    const result = gameState.applyRangedSplashDamage(
      currentTarget,
      attackerInstance.owner,
      splashDamage,
      damageReduction
    )

    if (result.insubstantialBlocked) {
      addToast(`${abilityName}: ${currentTarget.creature.name} blocked with INSUBSTANTIAL!`)
    } else {
      const defended = damageReduction > 0 ? ` (defended ${damageReduction})` : ''
      const moraleMsg =
        result.destroyed && result.moraleChange
          ? ` Morale changes: Attacker +${result.moraleChange.attacker}, Defender ${result.moraleChange.defender}`
          : ''
      addToast(
        `${abilityName}: ${currentTarget.creature.name} takes ${result.damage} splash damage${defended}!${result.destroyed ? ' DESTROYED!' : ''}${moraleMsg}`
      )
    }

    setShowRangedSplashDefensePanel(false)

    // Process next splash target
    processNextRangedSplashTarget(
      pendingRangedSplashTargets,
      currentRangedSplashIndex + 1,
      attackerInstance,
      splashDamage,
      abilityName,
      onComplete
    )
  }

  /**
   * Handle AI defense against splash damage using 0/50/100 rule
   */
  const handleAIRangedSplashDefense = (
    targets,
    index,
    attackerInstance,
    splashDamage,
    abilityName,
    target,
    onComplete
  ) => {
    // AI 0/50/100 rule for defense - get difficulty from gameConfig like other AI handlers
    const defenderPlayerId = target.owner
    const playerNum = defenderPlayerId.replace('PLAYER', '')
    const playerKey = `player${playerNum}`
    const difficulty = gameConfig?.[playerKey]?.difficulty || 'medium'

    let willDefend = false
    if (difficulty === 'hard') willDefend = true
    else if (difficulty === 'medium') willDefend = Math.random() < 0.5
    // Easy = never defend (0%)

    let damageReduction = 0
    const player = gameState.players[target.owner]
    if (willDefend) {
      // AI attempts to find defense card
      const defenseCards =
        player?.orderHand?.filter(
          (card) => card.actionType === 'IMMEDIATE' && card.damagePrevented > 0
        ) || []

      if (defenseCards.length > 0) {
        const bestCard = defenseCards[0] // Simple: use first available
        damageReduction = bestCard.damagePrevented || 0
        // Discard the card
        const cardIndex = player.orderHand.findIndex((c) => c.id === bestCard.id)
        if (cardIndex !== -1) {
          player.orderHand.splice(cardIndex, 1)
          player.orderDiscard.push(bestCard)
        }
      }
    }

    const result = gameState.applyRangedSplashDamage(
      target,
      attackerInstance.owner,
      splashDamage,
      damageReduction
    )

    if (result.insubstantialBlocked) {
      addToast(`${abilityName}: ${target.creature.name} (AI) blocked with INSUBSTANTIAL!`)
    } else {
      const defended = damageReduction > 0 ? ` (defended ${damageReduction})` : ''
      const moraleMsg =
        result.destroyed && result.moraleChange
          ? ` Morale changes: Attacker +${result.moraleChange.attacker}, Defender ${result.moraleChange.defender}`
          : ''
      addToast(
        `${abilityName}: ${target.creature.name} (AI) takes ${result.damage} splash damage${defended}!${result.destroyed ? ' DESTROYED!' : ''}${moraleMsg}`
      )
    }

    // Process next target with brief delay for readability
    setTimeout(() => {
      processNextRangedSplashTarget(
        targets,
        index + 1,
        attackerInstance,
        splashDamage,
        abilityName,
        onComplete
      )
    }, 300)
  }

  /**
   * Check and initiate ranged splash damage after a ranged attack
   * Called after main ranged attack damage is resolved
   * Applies 0/50/100 difficulty rule for AI attackers
   * @param {Object} attackerInstance - The creature that made the ranged attack
   * @param {Object} targetPosition - {x, y} position of the ranged attack target
   * @param {Function} onComplete - Callback when splash processing completes (including tapping attacker)
   * @returns {boolean} True if splash damage is being processed, false if no splash ability
   */
  const checkAndProcessRangedSplash = (attackerInstance, targetPosition, onComplete) => {
    const splashDamage = gameState.getRangedSplashDamage(attackerInstance)
    if (splashDamage <= 0) {
      return false // No splash ability
    }

    // AI 0/50/100 rule for USING splash ability (offense)
    const attackerOwner = attackerInstance.owner
    const isAttackerHuman = isPlayerHuman(attackerOwner)

    if (!isAttackerHuman) {
      // AI attacker - apply 0/50/100 rule for using splash ability
      const playerNum = attackerOwner.replace('PLAYER', '')
      const playerKey = `player${playerNum}`
      const difficulty = gameConfig?.[playerKey]?.difficulty || 'medium'

      let useSplash = false
      if (difficulty === 'hard') {
        useSplash = true // Hard AI always uses splash (100%)
      } else if (difficulty === 'medium') {
        useSplash = Math.random() < 0.5 // Medium AI uses 50%
      }
      // Easy AI never uses splash (0%)

      if (!useSplash) {
        return false // AI chose not to use splash ability
      }
    }
    // Human attackers: splash always triggers (player decision was to make ranged attack)

    const splashTargets = gameState.getRangedSplashTargets(attackerInstance, targetPosition)
    if (splashTargets.length === 0) {
      return false // No valid targets
    }

    const abilityName = gameState.getRangedSplashAbilityName(attackerInstance)

    // Store splash data for sequential processing
    setPendingRangedSplashTargets(splashTargets)
    setCurrentRangedSplashIndex(0)

    // Start processing first splash target
    processNextRangedSplashTarget(
      splashTargets,
      0,
      attackerInstance,
      splashDamage,
      abilityName,
      onComplete
    )
    return true // Splash is being processed
  }

  return {
    handleRangedSplashDefenseSelected,
    handleSavageDemiseResolution,
    handleRangedSplashDefenseComplete,
    handleAIRangedSplashDefense,
    checkAndProcessRangedSplash,
  }
}
