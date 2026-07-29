/**
 * useShiftAttack - SHIFT + ATTACK card handlers (Nimble Strike, Spring Attack, Shadowy Ambush).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Shift-attack mode/pending state
 * itself still lives in useAbilityModals; this hook only owns the handler
 * logic that reacts to it.
 */
export function useShiftAttack({
  gameState,
  addToast,
  isPlayerHuman,
  shiftAttackConfig,
  setShowShiftAttackModal,
  setShiftAttackConfig,
  pendingShiftAttack,
  setPendingShiftAttack,
  shiftAttackValidTiles,
  setShiftAttackValidTiles,
  setShiftAttackMode,
  clearShiftAttackState,
  setSelectedBoardCreature,
  setValidMoveTiles,
  setValidAttackTargets,
  validAttackTargets,
  setPendingRightClickAttack,
  setCombatPanelMode,
  setCombatHighlightCreatures,
  setHiddenBladePending,
  setShowHiddenBladeModal,
  setRenderCounter,
}) {
  /**
   * Confirm Shift Attack modal - enters shift tile selection mode
   * Called when player confirms they want to use Nimble Strike, Spring Attack, or Shadowy Ambush
   */
  const confirmShiftAttack = () => {
    if (!shiftAttackConfig?.card || !shiftAttackConfig?.creature || !gameState) {
      cancelShiftAttack()
      return
    }

    const { card, cardIndex, creature } = shiftAttackConfig

    // Close the modal
    setShowShiftAttackModal(false)
    setShiftAttackConfig({ card: null, cardIndex: null, creature: null })

    // Store original position before shift
    const originalPosition = { ...creature.position }

    // Set pending shift attack info (phase: 'pre-shift')
    setPendingShiftAttack({
      card,
      cardIndex,
      creature,
      phase: 'pre-shift',
      originalPosition,
    })

    // Calculate valid shift tiles (1 to maxShift distance, excluding current tile)
    const validTiles = gameState.getValidShiftTiles
      ? gameState.getValidShiftTiles(creature, card.shiftBeforeAttack)
      : []

    if (validTiles.length === 0) {
      addToast(`No valid tiles to shift to - ${card.name} cancelled`)
      clearShiftAttackState()
      return
    }

    // Enter shift tile selection mode
    setShiftAttackValidTiles(validTiles)
    setShiftAttackMode(true)

    // Select the creature so tiles highlight properly
    setSelectedBoardCreature(creature)

    // Toast instruction
    addToast(
      `🏃 ${card.name}: Right-click a purple tile to shift 1-${card.shiftBeforeAttack} squares`
    )
  }

  /**
   * Cancel Shift Attack (from modal or during shift/attack selection)
   * Returns card to hand and clears all shift attack state
   */
  const cancelShiftAttack = () => {
    clearShiftAttackState()
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
  }

  /**
   * Handle pre-attack shift destination selection
   * Called when player right-clicks a tile during 'pre-shift' phase
   */
  const handleShiftAttackPreShift = (tile) => {
    if (!pendingShiftAttack || !gameState) return

    const { card, cardIndex, creature } = pendingShiftAttack

    // Check if this is a valid shift tile
    const isValidShiftTile = shiftAttackValidTiles.some((t) => t.x === tile.x && t.y === tile.y)

    if (!isValidShiftTile) {
      addToast('Invalid shift destination - select a highlighted purple tile')
      return
    }

    // Cannot shift to current position (min 1 square)
    if (tile.x === creature.position.x && tile.y === creature.position.y) {
      addToast('You must shift at least 1 square')
      return
    }

    // COMMITTED: Move the creature to the new position
    const oldPos = { ...creature.position }
    creature.position = { x: tile.x, y: tile.y }

    // Update board occupancy
    const oldTile = gameState.board.getTile(oldPos.x, oldPos.y)
    const newTile = gameState.board.getTile(tile.x, tile.y)
    if (oldTile) oldTile.occupant = null
    if (newTile) newTile.occupant = creature

    // Discard the card from player's hand (point of no return)
    const currentPlayer = gameState.players[creature.owner]
    currentPlayer.orderHand.splice(cardIndex, 1)

    // Clear shift tiles
    setShiftAttackValidTiles([])

    // Update to attacking phase
    setPendingShiftAttack({
      ...pendingShiftAttack,
      phase: 'attacking',
    })

    // Calculate valid attack targets from new position
    const allTargets = gameState.getValidAttackTargets(creature)

    // Filter based on card type:
    // - Nimble Strike: melee OR ranged (has rangedDamageBonus)
    // - Spring Attack: melee OR ranged (has shiftAfterAttack - allows any attack type)
    // - Shadowy Ambush: melee only (has flatMeleeDamage, no ranged bonus, no post-shift)
    const hasRangedBonus = card.rangedDamageBonus > 0
    const allowsAnyAttack = card.shiftAfterAttack > 0 // Spring Attack allows any attack type
    let validTargets

    if (hasRangedBonus || allowsAnyAttack) {
      // Nimble Strike or Spring Attack - can use melee or ranged
      validTargets = allTargets
    } else {
      // Shadowy Ambush - melee only (flat melee damage)
      validTargets = allTargets.filter((t) => t.attackType === 'melee')
    }

    if (validTargets.length === 0) {
      // No valid targets after shift - creature still commits, just loses the attack
      addToast(`No valid attack targets from this position. ${card.name} consumed but no attack.`)
      // Tap the creature and clear state
      creature.tap()
      creature.hasAttackedThisTurn = true
      clearShiftAttackState()
      setSelectedBoardCreature(null)
      setRenderCounter((prev) => prev + 1)
      return
    }

    // Store valid targets and highlight them
    setValidAttackTargets(validTargets)

    // Toast instruction
    const attackTypeText = hasRangedBonus || allowsAnyAttack ? 'melee or ranged' : 'melee'
    addToast(`⚔️ ${card.name}: Right-click an enemy to ${attackTypeText} attack`)

    setRenderCounter((prev) => prev + 1)
  }

  /**
   * Handle attack target selection during 'attacking' phase
   * Called when player right-clicks a creature during attack selection
   */
  const handleShiftAttackTarget = (tile) => {
    if (!pendingShiftAttack || !gameState) return

    const { card, creature } = pendingShiftAttack

    // Check if tile has a valid target
    const target = tile.occupant
    if (!target) {
      addToast('Click on an enemy creature to attack')
      return
    }

    // Check if target is in validAttackTargets
    // Note: validAttackTargets uses 'creature' property, not 'target'
    const targetInfo = validAttackTargets.find((t) => t.creature.instanceId === target.instanceId)
    if (!targetInfo) {
      addToast('Invalid target - select a highlighted enemy')
      return
    }

    // Determine attack type and damage
    const attackType = targetInfo.attackType
    let baseDamage,
      bonusDamage,
      damageBoostFlat = null

    if (attackType === 'melee') {
      baseDamage = creature.creature.meleeAttack?.damage || 0
      if (card.flatMeleeDamage !== null && card.flatMeleeDamage !== undefined) {
        // Flat damage replaces base
        damageBoostFlat = card.flatMeleeDamage
        bonusDamage = 0
      } else {
        bonusDamage = card.meleeDamageBonus || 0
      }
    } else {
      // Ranged
      baseDamage = creature.creature.rangedAttack?.damage || 0
      bonusDamage = card.rangedDamageBonus || 0
    }

    // Clear attack targets highlight (we're about to show attack panel)
    setValidAttackTargets([])

    // Exit shift attack mode for now (will check pendingShiftAttack for post-shift)
    setShiftAttackMode(false)
    setShiftAttackValidTiles([])

    // Set up attack info using pendingRightClickAttack pattern
    const attackInfo = {
      attackType: attackType,
      damage: baseDamage,
    }

    setPendingRightClickAttack({
      attacker: creature,
      target: target,
      attackInfo: attackInfo,
      damageBoostCard: card,
      damageBoostBonus: bonusDamage,
      damageBoostFlat: damageBoostFlat,
      // Shift attack specific properties
      isShiftAttack: true,
      hasPostAttackShift: card.shiftAfterAttack > 0,
      postAttackShiftDistance: card.shiftAfterAttack,
    })

    // Show attack confirmation panel
    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: creature.instanceId,
      defender: target.instanceId,
    })
  }

  /**
   * Handle post-attack shift destination selection (Spring Attack)
   * Called when player right-clicks a tile during 'post-shift' phase
   */
  const handleShiftAttackPostShift = (tile) => {
    if (!pendingShiftAttack || !gameState) return

    const { creature } = pendingShiftAttack

    // Check if this is a valid shift tile
    const isValidShiftTile = shiftAttackValidTiles.some((t) => t.x === tile.x && t.y === tile.y)

    if (!isValidShiftTile) {
      addToast('Invalid shift destination - select a highlighted purple tile')
      return
    }

    // Cannot shift to current position (min 1 square for post-shift too)
    if (tile.x === creature.position.x && tile.y === creature.position.y) {
      addToast('You must shift at least 1 square')
      return
    }

    // Move the creature to the new position
    const oldPos = { ...creature.position }
    creature.position = { x: tile.x, y: tile.y }

    // Update board occupancy
    const oldTile = gameState.board.getTile(oldPos.x, oldPos.y)
    const newTile = gameState.board.getTile(tile.x, tile.y)
    if (oldTile) oldTile.occupant = null
    if (newTile) newTile.occupant = creature

    addToast(`🏃 ${creature.creature.name} shifted after attack!`)

    // Check for HIDDEN BLADE trigger AFTER post-shift completes
    // Hidden Blade checks for adjacent TAPPED enemies at the creature's NEW position
    if (gameState.hasHiddenBlade(creature)) {
      const validTargets = gameState.getHiddenBladeTargets(creature)
      if (validTargets.length > 0 && isPlayerHuman(creature.owner)) {
        // Set up Hidden Blade modal - defer tapping until after Hidden Blade resolves
        setHiddenBladePending({ attacker: creature, validTargets })
        setShowHiddenBladeModal(true)
        // Clear shift state but DON'T tap yet - Hidden Blade handlers will tap
        clearShiftAttackState()
        setSelectedBoardCreature(null)
        setRenderCounter((prev) => prev + 1)
        return // Wait for Hidden Blade decision
      }
    }

    // Tap the creature - STANDARD action is now complete
    creature.hasAttackedThisTurn = true
    if (creature.hasMovedThisTurn) {
      creature.tap()
    }

    // Clear all state - action complete
    clearShiftAttackState()
    setSelectedBoardCreature(null)
    setRenderCounter((prev) => prev + 1)
  }

  /**
   * Handle tile/creature click during Shift + Attack mode
   * Routes to appropriate handler based on current phase:
   * - pre-shift: Select shift destination tile
   * - attacking: Select attack target (enemy creature)
   * - post-shift: Select post-attack shift destination (Spring Attack)
   */
  const handleShiftAttackTileClick = (tile) => {
    if (!pendingShiftAttack || !gameState) return

    const { phase } = pendingShiftAttack

    switch (phase) {
      case 'pre-shift':
        handleShiftAttackPreShift(tile)
        break
      case 'attacking':
        handleShiftAttackTarget(tile)
        break
      case 'post-shift':
        handleShiftAttackPostShift(tile)
        break
      default:
        console.warn('[SHIFT ATTACK] Unknown phase:', phase)
    }
  }

  return {
    confirmShiftAttack,
    cancelShiftAttack,
    handleShiftAttackTileClick,
  }
}
