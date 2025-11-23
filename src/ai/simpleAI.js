import { GamePhases } from '../models/gameState'
import { CreatureInstance } from '../models/creatures'

/**
 * Simple AI for Dungeon Command
 * Makes basic tactical decisions for computer-controlled players
 */
export class SimpleAI {
  constructor(gameState, playerId) {
    this.gameState = gameState
    this.playerId = playerId
  }

  /**
   * Execute AI turn for the current phase
   */
  executeTurn() {
    const phase = this.gameState.currentPhase

    switch (phase) {
      case GamePhases.REFRESH:
        // Refresh is automatic, no decisions needed
        return { action: 'advance', message: 'AI refreshed' }

      case GamePhases.ACTIVATE:
        return this.executeActivatePhase()

      case GamePhases.DEPLOY:
        return this.executeDeployPhase()

      case GamePhases.CLEANUP:
        // Cleanup is automatic
        return { action: 'advance', message: 'AI turn ended' }

      default:
        return { action: 'advance', message: 'AI skipped phase' }
    }
  }

  /**
   * Activate Phase: Move creatures and attack enemies
   */
  executeActivatePhase() {
    const player = this.gameState.players[this.playerId]
    const actions = []

    // Get all untapped creatures
    const availableCreatures = player.creaturesInPlay.filter(c => !c.isTapped)

    for (const creature of availableCreatures) {
      // Try to attack first
      const attackTargets = this.gameState.getValidAttackTargets(creature)

      if (attackTargets.length > 0) {
        // Attack the weakest enemy (lowest HP)
        const target = this.selectWeakestTarget(attackTargets)
        const result = this.gameState.executeAttack(creature, target.creature, target.attackType)

        actions.push({
          type: 'attack',
          attacker: creature.creature.name,
          target: target.creature.creature.name,
          damage: result.damage,
          destroyed: result.destroyed
        })
        continue
      }

      // If can't attack, try to move closer to enemies
      const moveResult = this.tryMoveTowardsEnemies(creature)
      if (moveResult) {
        actions.push({
          type: 'move',
          creature: creature.creature.name,
          from: moveResult.from,
          to: moveResult.to
        })
      }
    }

    if (actions.length === 0) {
      return { action: 'advance', message: 'AI had no valid actions' }
    }

    return {
      action: 'advance',
      message: `AI performed ${actions.length} action(s)`,
      actions
    }
  }

  /**
   * Deploy Phase: Deploy creatures from hand
   */
  executeDeployPhase() {
    const player = this.gameState.players[this.playerId]
    const actions = []

    // Get starting zone tiles
    const startingZoneTiles = []
    for (let y = 0; y < this.gameState.boardHeight; y++) {
      for (let x = 0; x < this.gameState.boardWidth; x++) {
        const tile = this.gameState.getTile(x, y)
        if (tile.terrain === 'STARTING_ZONE' &&
            tile.startingZoneOwner === this.playerId &&
            !tile.occupant) {
          startingZoneTiles.push(tile)
        }
      }
    }

    // Deploy creatures in order of level (highest first) until out of leadership
    const sortedCreatures = [...player.creatureHand].sort((a, b) => b.level - a.level)

    for (const creatureCard of sortedCreatures) {
      if (!player.canDeployCreature(creatureCard)) {
        continue // Not enough leadership
      }

      if (startingZoneTiles.length === 0) {
        break // No more empty tiles
      }

      // Pick a random tile from starting zone
      const tileIndex = Math.floor(Math.random() * startingZoneTiles.length)
      const tile = startingZoneTiles[tileIndex]
      startingZoneTiles.splice(tileIndex, 1)

      // Deploy the creature
      const creatureIndex = player.creatureHand.indexOf(creatureCard)
      const creatureInstance = new CreatureInstance(creatureCard, this.playerId)
      creatureInstance.position = { x: tile.x, y: tile.y }
      creatureInstance.markAsDeployed(this.gameState.turnNumber)

      player.creaturesInPlay.push(creatureInstance)
      player.creatureHand.splice(creatureIndex, 1)
      tile.occupant = creatureInstance

      actions.push({
        type: 'deploy',
        creature: creatureCard.name,
        position: { x: tile.x, y: tile.y }
      })
    }

    if (actions.length === 0) {
      return { action: 'advance', message: 'AI deployed no creatures' }
    }

    return {
      action: 'advance',
      message: `AI deployed ${actions.length} creature(s)`,
      actions
    }
  }

  /**
   * Select the weakest target (lowest current HP)
   */
  selectWeakestTarget(targets) {
    return targets.reduce((weakest, current) => {
      const weakestHP = weakest.creature.currentHP
      const currentHP = current.creature.currentHP
      return currentHP < weakestHP ? current : weakest
    })
  }

  /**
   * Try to move creature towards nearest enemy
   */
  tryMoveTowardsEnemies(creature) {
    const validMoves = this.gameState.getValidMovementTiles(creature)

    if (validMoves.length === 0) {
      return null
    }

    // Find nearest enemy
    const enemies = []
    for (const enemyPlayerId of this.gameState.activePlayers) {
      if (enemyPlayerId === this.playerId) continue

      const enemyPlayer = this.gameState.players[enemyPlayerId]
      enemies.push(...enemyPlayer.creaturesInPlay)
    }

    if (enemies.length === 0) {
      return null
    }

    // Calculate which move gets us closest to nearest enemy
    const currentPos = creature.position
    let bestMove = null
    let bestDistance = Infinity

    for (const moveTile of validMoves) {
      for (const enemy of enemies) {
        if (!enemy.position) continue

        const distance = this.gameState.getDistance(moveTile, enemy.position)
        if (distance < bestDistance) {
          bestDistance = distance
          bestMove = moveTile
        }
      }
    }

    if (bestMove && !bestMove.occupant) {
      const from = { ...currentPos }
      this.gameState.moveCreature(creature, bestMove)
      return { from, to: { x: bestMove.x, y: bestMove.y } }
    }

    return null
  }
}

export default SimpleAI
