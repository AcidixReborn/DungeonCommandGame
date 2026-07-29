/**
 * useChargeAttack - CHARGE card handlers (Phase STD-5).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. CHARGE mode/pending state itself
 * still lives in useAbilityModals; this hook only owns the handler logic
 * that reacts to it.
 */
export function useChargeAttack({
  gameState,
  addToast,
  chargeConfig,
  setShowChargeModal,
  setChargeConfig,
  pendingChargeAttack,
  setPendingChargeAttack,
  chargeValidTiles,
  setChargeValidTiles,
  setChargeMode,
  clearChargeState,
  setSelectedBoardCreature,
  setValidMoveTiles,
  setValidAttackTargets,
  validAttackTargets,
  setPendingRightClickAttack,
  setPendingAttack,
  setCombatPanelMode,
  setCombatHighlightCreatures,
  setRenderCounter,
}) {
  /**
   * Confirm Charge modal - enters movement tile selection mode
   * Called when player confirms they want to use Charge
   */
  const confirmCharge = () => {
    if (!chargeConfig?.card || !chargeConfig?.creature || !gameState) {
      cancelCharge()
      return
    }

    const { card, cardIndex, creature } = chargeConfig

    // Close the modal
    setShowChargeModal(false)
    setChargeConfig({ card: null, cardIndex: null, creature: null })

    // Store original position before movement
    const originalPosition = { ...creature.position }

    // Get all valid movement tiles (using creature's full speed)
    const allMoveTiles = gameState.getValidMovementTiles
      ? gameState.getValidMovementTiles(creature)
      : []

    // Filter to only tiles that:
    // 1. Have at least one adjacent enemy (can attack after moving there)
    // 2. Are not the current position (must move at least 1 tile)
    const validChargeDestinations = allMoveTiles.filter((moveInfo) => {
      const { tile } = moveInfo
      // Exclude current position
      if (tile.x === creature.position.x && tile.y === creature.position.y) {
        return false
      }
      // Check if there's at least one adjacent enemy at this destination
      const adjacentEnemies = gameState.getAdjacentCreatures
        ? gameState.getAdjacentCreatures(tile.x, tile.y).filter((c) => c.owner !== creature.owner)
        : []
      return adjacentEnemies.length > 0
    })

    if (validChargeDestinations.length === 0) {
      addToast(
        `No valid charge destinations - ${card.name} cancelled. Must move to a tile adjacent to an enemy.`
      )
      clearChargeState()
      return
    }

    // Set pending charge attack info (phase: 'moving')
    const pendingInfo = {
      card,
      cardIndex,
      creature,
      phase: 'moving',
      originalPosition,
    }
    setPendingChargeAttack(pendingInfo)

    // Enter movement tile selection mode
    // Convert to simple {x, y} format for highlighting
    const chargePositions = validChargeDestinations.map((m) => ({ x: m.tile.x, y: m.tile.y }))
    setChargeValidTiles(chargePositions)
    setChargeMode(true)

    // Select the creature so tiles highlight properly
    setSelectedBoardCreature(creature)

    // Toast instruction
    addToast(`🏃 ${card.name}: Right-click a green tile to charge (must end adjacent to enemy)`)
  }

  /**
   * Cancel Charge (from modal or during movement/attack selection)
   * Returns card to hand and clears all charge state
   */
  const cancelCharge = () => {
    clearChargeState()
    setSelectedBoardCreature(null)
    setValidMoveTiles([])
    setValidAttackTargets([])
  }

  /**
   * Handle movement destination selection during 'moving' phase
   * Called when player right-clicks a tile during movement selection
   */
  const handleChargeMoveSelected = (tile) => {
    if (!pendingChargeAttack || !gameState) return

    const { card, cardIndex, creature } = pendingChargeAttack

    // Check if this is a valid charge tile
    const isValidChargeTile = chargeValidTiles.some((t) => t.x === tile.x && t.y === tile.y)

    if (!isValidChargeTile) {
      addToast('Invalid charge destination - select a highlighted green tile')
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

    // NOTE: Do NOT set hasMovedThisTurn = true here!
    // Charge movement is part of the STANDARD action, not the creature's normal movement.
    // The creature can still use its normal movement after using Charge.

    // Discard the card from player's hand (point of no return)
    const currentPlayer = gameState.players[creature.owner]
    currentPlayer.orderHand.splice(cardIndex, 1)

    // Clear charge tiles
    setChargeValidTiles([])

    // Update to attacking phase
    setPendingChargeAttack({
      ...pendingChargeAttack,
      phase: 'attacking',
    })

    // Calculate valid melee attack targets from new position
    const allTargets = gameState.getValidAttackTargets(creature)
    const validTargets = allTargets.filter((t) => t.attackType === 'melee')

    if (validTargets.length === 0) {
      // This shouldn't happen since we filtered destinations, but handle it
      addToast(`No valid melee targets from this position. ${card.name} consumed but no attack.`)
      creature.tap()
      creature.hasAttackedThisTurn = true
      clearChargeState()
      setSelectedBoardCreature(null)
      setRenderCounter((prev) => prev + 1)
      return
    }

    // Store valid targets and highlight them
    setValidAttackTargets(validTargets)

    // Exit charge mode, enter attack selection
    setChargeMode(false)

    // Toast instruction
    addToast(
      `⚔️ ${card.name}: Right-click an enemy to melee attack with +${card.meleeDamageBonus} damage`
    )

    setRenderCounter((prev) => prev + 1)
  }

  /**
   * Handle attack target selection during 'attacking' phase
   * Called when player right-clicks a creature during attack selection
   */
  const handleChargeAttackTarget = (tile) => {
    if (!pendingChargeAttack || !gameState) return

    const { card, creature } = pendingChargeAttack

    // Check if tile has a valid target
    const target = tile.occupant
    if (!target) {
      addToast('Click on an enemy creature to attack')
      return
    }

    // Check if target is in validAttackTargets
    const targetInfo = validAttackTargets.find((t) => t.creature.instanceId === target.instanceId)
    if (!targetInfo) {
      addToast('Invalid target - select a highlighted enemy')
      return
    }

    // Charge is melee only
    const baseDamage = creature.creature.meleeAttack?.damage || 0
    const bonusDamage = card.meleeDamageBonus || 0

    // Clear attack targets highlight
    setValidAttackTargets([])

    // Clear charge mode state
    setChargeMode(false)
    setChargeValidTiles([])

    // Set up attack info using pendingRightClickAttack pattern
    const attackInfo = {
      attackType: 'melee',
      damage: baseDamage,
    }

    setPendingRightClickAttack({
      attacker: creature,
      target: target,
      attackInfo: attackInfo,
      damageBoostCard: card,
      damageBoostBonus: bonusDamage,
      damageBoostFlat: null,
      // Charge-specific properties
      isChargeAttack: true,
    })

    // Show attack confirmation panel
    setPendingAttack({
      attackerInstance: creature,
      defenderInstance: target,
      targetInfo: targetInfo,
      damageBoostCard: card,
      damageBoostBonus: bonusDamage,
      damageBoostFlat: null,
      isChargeAttack: true,
    })

    setCombatPanelMode('attack')
    setCombatHighlightCreatures({
      attacker: creature.instanceId,
      defender: target.instanceId,
    })

    // Clear charge state - attack will complete through normal flow
    clearChargeState()
  }

  /**
   * Handle tile/creature click during Charge mode
   * Routes to appropriate handler based on current phase:
   * - moving: Select movement destination tile
   * - attacking: Select attack target (enemy creature)
   */
  const handleChargeTileClick = (tile) => {
    if (!pendingChargeAttack || !gameState) return

    const { phase } = pendingChargeAttack

    switch (phase) {
      case 'moving':
        handleChargeMoveSelected(tile)
        break
      case 'attacking':
        handleChargeAttackTarget(tile)
        break
      default:
        console.warn('[CHARGE] Unknown phase:', phase)
    }
  }

  return {
    confirmCharge,
    cancelCharge,
    handleChargeTileClick,
  }
}
