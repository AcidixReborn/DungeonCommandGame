import { CreatureInstance } from '../models/creatures'

/**
 * useRider - RIDER ability handlers (Skeletal Lancer / Tyranny of Goblins equivalent).
 * When a creature with RIDER is destroyed, deploy a replacement (Level 3 or
 * lower) from hand; morale loss = destroyed creature level - deployed level.
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same handlers, same dependencies, passed in as params
 * instead of being module-level closures. Rider mode/pending state itself
 * still lives in useAbilityModals; this hook only owns the handler logic
 * that reacts to it.
 */
export function useRider({
  gameState,
  addToast,
  riderData,
  setShowRiderModal,
  setRiderData,
  setSelectedRiderCreature,
  pendingRiderCallback,
  setPendingRiderCallback,
  setRenderCounter,
}) {
  /**
   * Handle RIDER creature selection - player chooses which Skeleton to deploy
   * @param {Object} selectedCreature - The creature card selected from hand
   */
  const handleRiderSelect = (selectedCreature) => {
    if (!riderData || !gameState) return

    const { position, ownerPlayerId, creatureLevel } = riderData
    const player = gameState.players[ownerPlayerId]

    // Calculate morale cost (Skeletal Lancer level - deployed creature level)
    const moraleCost = creatureLevel - selectedCreature.level

    // Remove creature from hand
    const creatureIndex = player.creatureHand.findIndex((c) => c.id === selectedCreature.id)
    if (creatureIndex !== -1) {
      player.creatureHand.splice(creatureIndex, 1)
    }

    // Create and place creature instance
    const creatureInstance = new CreatureInstance(selectedCreature, ownerPlayerId)
    creatureInstance.position = { ...position }
    creatureInstance.markAsDeployed(gameState.turnNumber)

    // Place on tile
    const tile = gameState.getTile(position.x, position.y)
    if (tile) {
      tile.occupant = creatureInstance
    }

    // Add to creatures in play
    player.creaturesInPlay.push(creatureInstance)

    // Apply morale cost (reduced by deployed creature level)
    player.morale -= moraleCost

    // Track for abilities test
    if (window.trackAbility) {
      window.trackAbility('rider', 'triggered', player.aiDifficulty || 'human', {
        deployedCreature: selectedCreature.name,
        deployedLevel: selectedCreature.level,
        moraleCost: moraleCost,
        moraleSaved: selectedCreature.level,
      })
    }

    // Close modal and clear state
    setShowRiderModal(false)
    setRiderData(null)
    setSelectedRiderCreature(null)

    if (pendingRiderCallback) {
      const callback = pendingRiderCallback
      setPendingRiderCallback(null)
      callback()
    }

    addToast(
      `RIDER: Deployed ${selectedCreature.name} (Level ${selectedCreature.level}). Lost ${moraleCost} morale.`,
      'info'
    )
    setRenderCounter((prev) => prev + 1)
  }

  /**
   * Handle RIDER decline - player chooses not to deploy a replacement
   * Full morale loss occurs (creature level)
   */
  const handleRiderDecline = () => {
    if (!riderData || !gameState) return

    const { ownerPlayerId, creatureLevel, destroyedCreature } = riderData

    // Track for abilities test
    const player = gameState.players[ownerPlayerId]
    if (window.trackAbility) {
      window.trackAbility('rider', 'declined', player?.aiDifficulty || 'human', {
        destroyedCreature: destroyedCreature,
        moraleLost: creatureLevel,
      })
    }

    // Close modal and clear state
    setShowRiderModal(false)
    setRiderData(null)
    setSelectedRiderCreature(null)

    if (pendingRiderCallback) {
      const callback = pendingRiderCallback
      setPendingRiderCallback(null)
      callback()
    }

    addToast(
      `RIDER declined: ${destroyedCreature} destroyed. Lost ${creatureLevel} morale.`,
      'warning'
    )
    setRenderCounter((prev) => prev + 1)
  }

  /**
   * Handle AI RIDER ability decision
   * Applies 0/50/100 difficulty rule
   * Supports both Curse of Undeath (Skeleton) and Tyranny of Goblins (Goblin/Wolf)
   * @param {string} playerId - AI player ID
   * @param {Array} eligibleCreatures - Eligible creatures from hand
   * @param {Object} position - Position where creature died
   * @param {number} creatureLevel - Level of destroyed creature
   * @param {string} destroyedCreature - Name of destroyed creature
   * @param {string} faction - Faction of destroyed creature (for tracking)
   * @param {Function} callback - Callback to execute after RIDER resolution
   */
  const handleAIRiderDecision = (
    playerId,
    eligibleCreatures,
    position,
    creatureLevel,
    destroyedCreature,
    faction,
    callback
  ) => {
    const player = gameState.players[playerId]
    if (!player) {
      if (callback) callback()
      return
    }

    const aiDifficulty = player.aiDifficulty || 'medium'

    // Determine which stats key to use based on faction
    const statsKey = faction === 'Tyranny of Goblins' ? 'riderGoblin' : 'rider'

    // Track that RIDER was offered
    if (window.trackAbility) {
      window.trackAbility(statsKey, 'offered', aiDifficulty, {
        destroyedCreature: destroyedCreature,
        faction: faction,
        eligibleCount: eligibleCreatures.length,
      })
    }

    // Apply 0/50/100 difficulty rule
    let shouldDeploy = false
    switch (aiDifficulty) {
      case 'easy':
        shouldDeploy = false // Easy: Never use RIDER (0%)
        break
      case 'medium':
        shouldDeploy = Math.random() < 0.5 // Medium: 50% chance
        break
      case 'hard':
        shouldDeploy = true // Hard: Always use RIDER (100%)
        break
      default:
        shouldDeploy = Math.random() < 0.5
    }

    if (!shouldDeploy) {
      if (window.trackAbility) {
        window.trackAbility(statsKey, 'declined', aiDifficulty, {
          destroyedCreature: destroyedCreature,
          faction: faction,
          moraleLost: creatureLevel,
        })
      }
      if (callback) callback()
      return
    }

    // AI selects highest level creature (minimizes morale loss)
    const sortedCreatures = [...eligibleCreatures].sort((a, b) => b.level - a.level)
    const selectedCreature = sortedCreatures[0]

    // Calculate morale cost
    const moraleCost = creatureLevel - selectedCreature.level

    // Remove from hand
    const creatureIndex = player.creatureHand.findIndex((c) => c.id === selectedCreature.id)
    if (creatureIndex !== -1) {
      player.creatureHand.splice(creatureIndex, 1)
    }

    // Create and place creature instance
    const creatureInstance = new CreatureInstance(selectedCreature, playerId)
    creatureInstance.position = { ...position }
    creatureInstance.markAsDeployed(gameState.turnNumber)

    // Place on tile
    const tile = gameState.getTile(position.x, position.y)
    if (tile) {
      tile.occupant = creatureInstance
    }

    // Add to creatures in play
    player.creaturesInPlay.push(creatureInstance)

    // Apply morale cost
    player.morale -= moraleCost

    // Track for abilities test
    if (window.trackAbility) {
      window.trackAbility(statsKey, 'triggered', aiDifficulty, {
        deployedCreature: selectedCreature.name,
        deployedLevel: selectedCreature.level,
        faction: faction,
        moraleCost: moraleCost,
        moraleSaved: selectedCreature.level,
      })
    }

    addToast(`AI RIDER: Deployed ${selectedCreature.name}. Lost ${moraleCost} morale.`, 'info')

    if (callback) callback()
    setRenderCounter((prev) => prev + 1)
  }

  return {
    handleRiderSelect,
    handleRiderDecline,
    handleAIRiderDecision,
  }
}
