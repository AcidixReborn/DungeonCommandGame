/**
 * useSlam - SLAM ability handlers (Earth Guardian - slide enemy after melee damage).
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Slam mode/pending state itself
 * still lives in useAbilityModals; this hook only owns the handler logic
 * that reacts to it.
 */
export function useSlam({
  gameState,
  gameConfig,
  addToast,
  slamMode,
  slamPending,
  setSlamPending,
  setShowSlamModal,
  setSlamMode,
  slamValidTiles,
  setSlamValidTiles,
  slamSelectedTile,
  setSlamSelectedTile,
  setShowSlamConfirmModal,
  setAiDeathQueue,
  setRenderCounter,
}) {
  // Skip SLAM - decline and tap attacker
  const handleSlamSkip = () => {
    if (!slamPending) return
    const { attackerInstance } = slamPending

    // Clear SLAM state
    setShowSlamModal(false)
    setSlamMode(false)
    setSlamPending(null)
    setSlamValidTiles([])

    // Tap the attacker (consume action)
    attackerInstance.tap()
    setRenderCounter((prev) => prev + 1)
    addToast(`${attackerInstance.creature.name} chose not to slam.`)
  }

  // Accept SLAM - enter tile selection mode
  const handleSlamAccept = () => {
    if (!slamPending) return

    setShowSlamModal(false)
    setSlamMode(true)
    addToast(`Right-click a highlighted tile to slam ${slamPending.targetInstance.creature.name}`)
    setRenderCounter((prev) => prev + 1) // Force re-render to show tile highlights
  }

  // Right-click on valid SLAM tile - show confirmation
  const handleSlamTileSelect = (x, y) => {
    if (!slamMode || !slamPending) return

    // Verify tile is valid
    const isValid = slamValidTiles.some((t) => t.x === x && t.y === y)
    if (!isValid) return

    setSlamSelectedTile({ x, y })
    setShowSlamConfirmModal(true)
  }

  // Cancel confirmation - allow picking different tile
  const handleSlamConfirmCancel = () => {
    setShowSlamConfirmModal(false)
    setSlamSelectedTile(null)
    // Stay in slamMode so user can pick different tile
  }

  // Confirm - execute the slam
  const handleSlamConfirmExecute = () => {
    if (!slamPending || !slamSelectedTile) return

    const { attackerInstance, targetInstance } = slamPending

    // Execute the slam
    const result = gameState.executeSlamSlide(targetInstance, slamSelectedTile)

    // Clear SLAM state
    setShowSlamConfirmModal(false)
    setSlamMode(false)
    setSlamPending(null)
    setSlamValidTiles([])
    setSlamSelectedTile(null)

    // Tap the attacker (consume action)
    attackerInstance.tap()

    addToast(
      `SLAM: ${targetInstance.creature.name} was slammed to (${slamSelectedTile.x}, ${slamSelectedTile.y})!`
    )
    setRenderCounter((prev) => prev + 1)
  }

  // AI decides whether to use SLAM (0/50/100 rule)
  const handleAISlamDecision = (attackerInstance, targetInstance, validTiles) => {
    const attackerOwner = attackerInstance.owner
    const playerNum = attackerOwner.replace('PLAYER', '')
    const playerKey = `player${playerNum}`
    const difficulty = gameConfig?.[playerKey]?.difficulty || 'medium'

    let willSlam = false
    if (difficulty === 'hard') {
      willSlam = true // Hard AI always slams (100%)
    } else if (difficulty === 'medium') {
      willSlam = Math.random() < 0.5 // Medium AI slams 50%
    }
    // Easy AI never slams (0%)

    if (!willSlam) {
      // AI declines - tap attacker
      attackerInstance.tap()
      setRenderCounter((prev) => prev + 1)
      return
    }

    // AI picks random valid tile
    const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)]

    // Execute slam
    gameState.executeSlamSlide(targetInstance, randomTile)

    // Tap attacker
    attackerInstance.tap()

    // Show notification (toast + modal like AI kill notification)
    addToast(`SLAM: ${attackerInstance.creature.name} slammed ${targetInstance.creature.name}!`)

    // Queue AI action modal
    setAiDeathQueue((prev) => [
      ...prev,
      {
        title: 'SLAM!',
        message: `${attackerInstance.creature.name} used SLAM to push ${targetInstance.creature.name} to a new position!`,
        creatureName: attackerInstance.creature.name,
        isSlam: true,
      },
    ])

    setRenderCounter((prev) => prev + 1)
  }

  return {
    handleSlamSkip,
    handleSlamAccept,
    handleSlamTileSelect,
    handleSlamConfirmCancel,
    handleSlamConfirmExecute,
    handleAISlamDecision,
  }
}
