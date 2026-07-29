import SimpleAI from '../ai/simpleAI'

/**
 * useLightningBreath - LIGHTNING BREATH ability handlers (multi-target sequential attack).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Lightning-breath mode/pending
 * state itself still lives in useAbilityModals; this hook only owns the
 * handler logic that reacts to it.
 */
export function useLightningBreath({
  gameState,
  gameConfig,
  addToast,
  isPlayerHuman,
  showInsubstantialNotification,
  handleOpponentDrawEffect,
  clearDamageBoostState,
  lightningBreathMode,
  setLightningBreathMode,
  lightningBreathAttacker,
  setLightningBreathAttacker,
  lightningBreathTargets,
  setLightningBreathTargets,
  lightningBreathValidTargets,
  setLightningBreathValidTargets,
  lightningBreathCurrentAttackIndex,
  setLightningBreathCurrentAttackIndex,
  lightningBreathResults,
  setLightningBreathResults,
  lightningBreathDamageBoostCard,
  setLightningBreathDamageBoostCard,
  lightningBreathDamageBoostBonus,
  setLightningBreathDamageBoostBonus,
  setPendingRightClickAttack,
  setPendingAttack,
  pendingAttack,
  setCombatPanelMode,
  setCombatHighlightCreatures,
}) {
  /**
   * Start Lightning Breath - enter target selection mode
   * Called when player right-clicks first target with Lightning Breath creature
   */
  const handleLightningBreathStart = (
    attacker,
    firstTarget,
    damageBoostCard = null,
    damageBoostBonus = 0
  ) => {
    // Get all valid targets
    const validTargets = gameState.getLightningBreathTargets(attacker)

    // Clear the normal attack state
    setPendingRightClickAttack(null)
    setCombatPanelMode(null)

    // Enter Lightning Breath mode
    setLightningBreathMode(true)
    setLightningBreathAttacker(attacker)
    setLightningBreathTargets([firstTarget]) // First target pre-selected
    setLightningBreathValidTargets(validTargets)
    setLightningBreathCurrentAttackIndex(0)
    setLightningBreathResults([])

    // Store damage boost card info (e.g., Gout of Fire)
    setLightningBreathDamageBoostCard(damageBoostCard)
    setLightningBreathDamageBoostBonus(damageBoostBonus)

    const totalDamage = gameState.getLightningBreathDamage(attacker) + damageBoostBonus
    if (damageBoostCard) {
      addToast(
        `⚡ LIGHTNING BREATH + ${damageBoostCard.name}: Select up to 2 more targets (1/3 selected, ${totalDamage} dmg each)`
      )
    } else {
      addToast(`⚡ LIGHTNING BREATH: Select up to 2 more targets (1/3 selected)`)
    }
  }

  /**
   * Add a target to Lightning Breath selection
   * Called when player clicks on a valid target during Lightning Breath mode
   * @param {Object} target - The target creature instance
   */
  const handleLightningBreathTargetSelect = (target) => {
    if (!lightningBreathMode || !lightningBreathAttacker) return

    // Check if target is already selected - if so, deselect it (toggle behavior)
    if (lightningBreathTargets.some((t) => t.instanceId === target.instanceId)) {
      const newTargets = lightningBreathTargets.filter((t) => t.instanceId !== target.instanceId)
      setLightningBreathTargets(newTargets)
      addToast(`Removed ${target.creature.name} from targets (${newTargets.length}/3)`)
      return
    }

    // Check if target is valid
    if (!lightningBreathValidTargets.some((t) => t.instanceId === target.instanceId)) {
      addToast(`${target.creature.name} is not a valid target!`)
      return
    }

    // Check if we already have 3 targets
    if (lightningBreathTargets.length >= 3) {
      addToast(`Maximum 3 targets selected! Click "Confirm" to attack.`)
      return
    }

    // Add target
    const newTargets = [...lightningBreathTargets, target]
    setLightningBreathTargets(newTargets)
    addToast(`⚡ Target ${newTargets.length}/3 selected: ${target.creature.name}`)
  }

  /**
   * Confirm Lightning Breath and begin sequential attack resolution
   * Called when player clicks "Confirm" after selecting targets
   */
  const handleLightningBreathConfirm = () => {
    if (!lightningBreathMode || !lightningBreathAttacker || lightningBreathTargets.length < 2) {
      addToast(`Select at least 2 targets for Lightning Breath!`)
      return
    }

    addToast(
      `⚡ ${lightningBreathAttacker.creature.name} unleashes LIGHTNING BREATH on ${lightningBreathTargets.length} targets!`
    )

    // Exit target selection mode (but keep targets/attacker for sequential resolution)
    setLightningBreathMode(false)
    setLightningBreathValidTargets([])

    // Start resolving attacks sequentially
    setLightningBreathCurrentAttackIndex(0)

    // Set up the first attack's defense panel
    const firstTarget = lightningBreathTargets[0]
    // Apply damage boost from order cards (e.g., Gout of Fire)
    const baseDamage = gameState.getLightningBreathDamage(lightningBreathAttacker)
    const damage = baseDamage + (lightningBreathDamageBoostBonus || 0)

    // Check if first target has INSUBSTANTIAL available
    if (gameState.canUseInsubstantial(firstTarget)) {
      const blocked = gameState.useInsubstantial(firstTarget, damage, lightningBreathAttacker.owner)
      if (blocked) {
        const defenderIsHuman = isPlayerHuman(firstTarget.owner)
        if (defenderIsHuman) {
          showInsubstantialNotification(firstTarget, damage, lightningBreathAttacker)
        } else {
          addToast(
            `👻 INSUBSTANTIAL: ${firstTarget.creature.name} blocked ${damage} LIGHTNING BREATH damage!`
          )
        }

        // Create result for this blocked attack
        const blockedResult = {
          damage: 0,
          destroyed: false,
          moraleChange: { attacker: 0, defender: 0 },
          targetName: firstTarget.creature.name,
          defenseResult: { type: 'insubstantial', success: true, damageBlocked: damage },
          insubstantialUsed: true,
        }

        // Move to next target or complete
        handleLightningBreathAttackResolved(blockedResult)
        return
      }
    }

    // Check if defender is human or AI
    const defenderIsHuman = isPlayerHuman(firstTarget.owner)

    if (defenderIsHuman) {
      // Human defender - show defense panel
      setPendingAttack({
        attackerInstance: lightningBreathAttacker,
        defenderInstance: firstTarget,
        targetInfo: { attackType: 'lightning_breath', damage },
        isLightningBreath: true,
        lightningBreathIndex: 0,
        lightningBreathTotal: lightningBreathTargets.length,
        // Include damage boost card info so DefenseOptionsPanel can display it
        damageBoostCard: lightningBreathDamageBoostCard,
        damageBoostBonus: lightningBreathDamageBoostBonus,
      })

      setCombatPanelMode('defense')
      setCombatHighlightCreatures({
        attacker: lightningBreathAttacker.instanceId,
        defender: firstTarget.instanceId,
      })

      addToast(
        `⚡ Lightning Breath Attack 1/${lightningBreathTargets.length}: ${firstTarget.creature.name}`
      )
    } else {
      // AI defender - auto-select defense
      const defenderPlayer = gameState.players[firstTarget.owner]
      const difficulty = defenderPlayer?.aiDifficulty || gameConfig?.aiDifficulty || 'medium'
      const defenderAI = new SimpleAI(gameState, firstTarget.owner, null, difficulty)

      // AI decides defense (COWER, UNSTOPPABLE HORDES, IMMEDIATE cards, or take damage)
      const defenseDecision = defenderAI.decideDefense(
        firstTarget,
        damage,
        lightningBreathAttacker.owner
      )

      // Build defense object to pass to handleLightningBreathDefenseSelected
      let defense = { type: 'skip' }

      if (defenseDecision.type === 'cower') {
        defense = { type: 'cower' }
        addToast(`🛡️ AI ${firstTarget.creature.name} chooses to COWER!`)
      } else if (defenseDecision.type === 'unstoppable_hordes') {
        const creatures = []
        if (defenseDecision.defenderCanUse) creatures.push(firstTarget)
        if (defenseDecision.creatures) creatures.push(...defenseDecision.creatures)
        defense = { type: 'unstoppable_hordes', creatures }
        addToast(`💀 AI uses UNSTOPPABLE HORDES with ${creatures.length} Undead!`)
      } else if (defenseDecision.type === 'immediate_card') {
        defense = {
          type: 'immediate_card',
          card: defenseDecision.card,
          creature: defenseDecision.creature,
          discardCard: defenseDecision.discardCard || null,
        }
        addToast(
          `⚡ AI uses ${defenseDecision.card.name} with ${defenseDecision.creature.creature.name}!`
        )
      }

      // Create attack info object to pass directly (not via state - state updates are async)
      const attackInfoForAI = {
        attackerInstance: lightningBreathAttacker,
        defenderInstance: firstTarget,
        targetInfo: { attackType: 'lightning_breath', damage },
        isLightningBreath: true,
        lightningBreathIndex: 0,
        lightningBreathTotal: lightningBreathTargets.length,
      }

      addToast(
        `⚡ Lightning Breath Attack 1/${lightningBreathTargets.length}: ${firstTarget.creature.name}`
      )

      // Process AI's defense choice - pass attack info directly to avoid async state timing issue
      handleLightningBreathDefenseSelected(defense, attackInfoForAI)
    }
  }

  /**
   * Cancel Lightning Breath target selection
   * Called when player clicks "Cancel" during target selection
   */
  const handleLightningBreathCancel = () => {
    // Clear Lightning Breath state (but don't discard the damage boost card - it stays in hand)
    setLightningBreathMode(false)
    setLightningBreathAttacker(null)
    setLightningBreathTargets([])
    setLightningBreathValidTargets([])
    setLightningBreathCurrentAttackIndex(0)
    setLightningBreathResults([])
    // Clear damage boost card state (card stays in hand)
    setLightningBreathDamageBoostCard(null)
    setLightningBreathDamageBoostBonus(0)
    // Clear the pending damage boost attack state too
    clearDamageBoostState()

    addToast(`Lightning Breath cancelled`)
  }

  /**
   * Process result of a single Lightning Breath attack and move to next
   * Called after defense is resolved for each target
   * @param {Object} result - The attack result from combat resolution
   */
  const handleLightningBreathAttackResolved = (result) => {
    const currentIndex = lightningBreathCurrentAttackIndex
    const targets = lightningBreathTargets
    const attacker = lightningBreathAttacker

    // Store result
    const newResults = [...lightningBreathResults, result]
    setLightningBreathResults(newResults)

    // Show individual toast
    const targetName = targets[currentIndex]?.creature.name || 'Unknown'
    const damageDealt = result.damage || 0
    if (result.destroyed) {
      addToast(`⚡ Lightning Breath DESTROYED ${targetName}!`)
    } else if (damageDealt > 0) {
      addToast(`⚡ Lightning Breath hit ${targetName} for ${damageDealt} damage!`)
    } else {
      addToast(`⚡ Lightning Breath damage to ${targetName} was fully prevented!`)
    }

    // Check if there are more targets
    const nextIndex = currentIndex + 1
    if (nextIndex < targets.length) {
      // Move to next target
      setLightningBreathCurrentAttackIndex(nextIndex)
      const nextTarget = targets[nextIndex]
      // Apply damage boost from order cards (e.g., Gout of Fire)
      const baseDamage = gameState.getLightningBreathDamage(attacker)
      const damage = baseDamage + (lightningBreathDamageBoostBonus || 0)

      // Check if next target has INSUBSTANTIAL available
      if (gameState.canUseInsubstantial(nextTarget)) {
        const blocked = gameState.useInsubstantial(nextTarget, damage, attacker.owner)
        if (blocked) {
          const defenderIsHuman = isPlayerHuman(nextTarget.owner)
          if (defenderIsHuman) {
            showInsubstantialNotification(nextTarget, damage, attacker)
          } else {
            addToast(
              `👻 INSUBSTANTIAL: ${nextTarget.creature.name} blocked ${damage} LIGHTNING BREATH damage!`
            )
          }

          // Create result for this blocked attack and recursively continue
          const blockedResult = {
            damage: 0,
            destroyed: false,
            moraleChange: { attacker: 0, defender: 0 },
            targetName: nextTarget.creature.name,
            defenseResult: { type: 'insubstantial', success: true, damageBlocked: damage },
            insubstantialUsed: true,
          }

          // Store result and continue to next
          const updatedResults = [...newResults, blockedResult]
          setLightningBreathResults(updatedResults)

          // Check for more targets after this blocked one
          const followingIndex = nextIndex + 1
          if (followingIndex < targets.length) {
            // Recursively handle next target
            setLightningBreathCurrentAttackIndex(followingIndex)
            handleLightningBreathAttackResolved(blockedResult)
          } else {
            // All attacks resolved
            handleLightningBreathComplete(updatedResults)
          }
          return
        }
      }

      // Check if next defender is human or AI
      const nextDefenderIsHuman = isPlayerHuman(nextTarget.owner)

      if (nextDefenderIsHuman) {
        // Human defender - show defense panel
        setPendingAttack({
          attackerInstance: attacker,
          defenderInstance: nextTarget,
          targetInfo: { attackType: 'lightning_breath', damage },
          isLightningBreath: true,
          lightningBreathIndex: nextIndex,
          lightningBreathTotal: targets.length,
          // Include damage boost card info so DefenseOptionsPanel can display it
          damageBoostCard: lightningBreathDamageBoostCard,
          damageBoostBonus: lightningBreathDamageBoostBonus,
        })

        setCombatPanelMode('defense')
        setCombatHighlightCreatures({
          attacker: attacker.instanceId,
          defender: nextTarget.instanceId,
        })

        addToast(
          `⚡ Lightning Breath Attack ${nextIndex + 1}/${targets.length}: ${nextTarget.creature.name}`
        )
      } else {
        // AI defender - auto-select defense
        const defenderPlayer = gameState.players[nextTarget.owner]
        const difficulty = defenderPlayer?.aiDifficulty || gameConfig?.aiDifficulty || 'medium'
        const defenderAI = new SimpleAI(gameState, nextTarget.owner, null, difficulty)

        // AI decides defense (COWER, UNSTOPPABLE HORDES, IMMEDIATE cards, or take damage)
        const defenseDecision = defenderAI.decideDefense(nextTarget, damage, attacker.owner)

        // Build defense object to pass to handleLightningBreathDefenseSelected
        let defense = { type: 'skip' }

        if (defenseDecision.type === 'cower') {
          defense = { type: 'cower' }
          addToast(`🛡️ AI ${nextTarget.creature.name} chooses to COWER!`)
        } else if (defenseDecision.type === 'unstoppable_hordes') {
          const creatures = []
          if (defenseDecision.defenderCanUse) creatures.push(nextTarget)
          if (defenseDecision.creatures) creatures.push(...defenseDecision.creatures)
          defense = { type: 'unstoppable_hordes', creatures }
          addToast(`💀 AI uses UNSTOPPABLE HORDES with ${creatures.length} Undead!`)
        } else if (defenseDecision.type === 'immediate_card') {
          defense = {
            type: 'immediate_card',
            card: defenseDecision.card,
            creature: defenseDecision.creature,
            discardCard: defenseDecision.discardCard || null,
          }
          addToast(
            `⚡ AI uses ${defenseDecision.card.name} with ${defenseDecision.creature.creature.name}!`
          )
        }

        // Create attack info object to pass directly (not via state - state updates are async)
        const attackInfoForAI = {
          attackerInstance: attacker,
          defenderInstance: nextTarget,
          targetInfo: { attackType: 'lightning_breath', damage },
          isLightningBreath: true,
          lightningBreathIndex: nextIndex,
          lightningBreathTotal: targets.length,
        }

        addToast(
          `⚡ Lightning Breath Attack ${nextIndex + 1}/${targets.length}: ${nextTarget.creature.name}`
        )

        // Process AI's defense choice - pass attack info directly to avoid async state timing issue
        handleLightningBreathDefenseSelected(defense, attackInfoForAI)
      }
    } else {
      // All attacks resolved - finish up
      handleLightningBreathComplete(newResults)
    }
  }

  /**
   * Complete Lightning Breath ability after all attacks resolved
   * Shows summary toast and consumes the Dracolich's action
   * @param {Array} results - Array of all attack results
   */
  const handleLightningBreathComplete = (results) => {
    const attacker = lightningBreathAttacker
    const targets = lightningBreathTargets

    // Calculate totals for summary
    const totalDamage = results.reduce((sum, r) => sum + (r.damage || 0), 0)
    const kills = results.filter((r) => r.destroyed).length

    // Summary toast
    let summaryMsg = `⚡ LIGHTNING BREATH complete! Hit ${targets.length} targets for ${totalDamage} total damage`
    if (kills > 0) {
      summaryMsg += ` (${kills} destroyed!)`
    }
    addToast(summaryMsg)

    // Mark attacker as having attacked (consumes action)
    if (attacker) {
      attacker.hasAttackedThisTurn = true
      // Tap if already moved
      if (attacker.hasMovedThisTurn) {
        attacker.tap()
      }
    }

    // Discard damage boost card if one was used (e.g., Gout of Fire)
    if (lightningBreathDamageBoostCard && attacker) {
      const attackerPlayer = gameState.players[attacker.owner]
      const cardIndex = attackerPlayer.orderHand.findIndex(
        (c) => c.id === lightningBreathDamageBoostCard.id
      )
      if (cardIndex !== -1) {
        attackerPlayer.orderHand.splice(cardIndex, 1)
        addToast(`📜 ${lightningBreathDamageBoostCard.name} was discarded`)
      }
      // Also clear the pending damage boost attack state
      clearDamageBoostState()
    }

    // Clear Lightning Breath state (including damage boost card/bonus)
    setLightningBreathMode(false)
    setLightningBreathAttacker(null)
    setLightningBreathTargets([])
    setLightningBreathValidTargets([])
    setLightningBreathCurrentAttackIndex(0)
    setLightningBreathResults([])
    setLightningBreathDamageBoostCard(null)
    setLightningBreathDamageBoostBonus(0)

    // Clear combat panel
    setPendingAttack(null)
    setCombatPanelMode(null)
    setCombatHighlightCreatures({ attacker: null, defender: null })
  }

  /**
   * Handle defense selection for Lightning Breath attacks
   * Similar to splash damage defense, but with sequential attack resolution
   * @param {Object} defense - Defense selection
   */
  const handleLightningBreathDefenseSelected = (defense, attackInfoOverride = null) => {
    // Use attackInfoOverride for AI calls (synchronous) or pendingAttack for human calls (after state update)
    const attackInfo = attackInfoOverride || pendingAttack
    if (!attackInfo || !attackInfo.isLightningBreath) return

    const { attackerInstance, defenderInstance, targetInfo } = attackInfo
    const damage = targetInfo.damage || gameState.getLightningBreathDamage(attackerInstance)

    let damageAfterDefense = damage
    let defenseResult = { type: defense.type, success: false }

    if (defense.type === 'skip') {
      // Take full damage
      damageAfterDefense = damage
      defenseResult.success = true
    } else if (defense.type === 'cower') {
      // COWER: Avoid ALL damage
      const cowerResult = gameState.applyCower(defenderInstance, damage, attackerInstance.owner)
      damageAfterDefense = cowerResult.success ? 0 : damage
      defenseResult = { ...cowerResult, type: 'cower' }
    } else if (defense.type === 'unstoppable_hordes') {
      // UNSTOPPABLE HORDES: Prevent 10 damage per creature
      let totalReduction = 0
      defense.creatures.forEach((creature) => {
        const result = gameState.applyUnstoppableHordes(creature)
        if (result.success) {
          totalReduction += result.damagePrevented
        }
      })
      damageAfterDefense = Math.max(0, damage - totalReduction)
      defenseResult = { type: 'unstoppable_hordes', damagePrevented: totalReduction, success: true }
    } else if (defense.type === 'immediate_card') {
      // IMMEDIATE CARD: Prevent damage, optionally discard card as cost (Uncanny Dodge)
      const result = gameState.applyImmediateCardDefense(
        defense.card,
        defense.creature,
        defense.discardCard
      )
      damageAfterDefense = result.success ? Math.max(0, damage - result.damagePrevented) : damage
      defenseResult = { ...result, type: 'immediate_card' }

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
    }

    // Apply damage to defender
    const previousHP = defenderInstance.currentHP
    defenderInstance.currentHP -= damageAfterDefense
    const destroyed = defenderInstance.currentHP <= 0

    // Handle destruction
    let moraleChange = { attacker: 0, defender: 0 }
    if (destroyed) {
      // Clear tile
      if (defenderInstance.position) {
        const tile = gameState.getTile(defenderInstance.position.x, defenderInstance.position.y)
        if (tile) tile.occupant = null
      }

      // Remove from battlefield
      const defenderOwner = defenderInstance.owner
      const defenderPlayer = gameState.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(
        (c) => c.instanceId === defenderInstance.instanceId
      )
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add to graveyard
      defenderPlayer.creatureGraveyard.push(defenderInstance.creature)

      // Morale changes
      defenderPlayer.loseMorale(defenderInstance.creature.level)
      const attackerPlayer = gameState.players[attackerInstance.owner]
      attackerPlayer.gainMorale(1)

      moraleChange = {
        attacker: 1,
        defender: -defenderInstance.creature.level,
      }

      addToast(`⚡ ${defenderInstance.creature.name} was destroyed by Lightning Breath!`)
    }

    // Create result object
    const result = {
      damage: damageAfterDefense,
      destroyed,
      moraleChange,
      targetName: defenderInstance.creature.name,
      defenseResult,
    }

    // Move to next target or complete
    handleLightningBreathAttackResolved(result)
  }

  return {
    handleLightningBreathStart,
    handleLightningBreathTargetSelect,
    handleLightningBreathConfirm,
    handleLightningBreathCancel,
    handleLightningBreathDefenseSelected,
  }
}
