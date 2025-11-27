import { GamePhases } from '../models/gameState'
import { CreatureInstance } from '../models/creatures'
// ActionTypes import removed - not used

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

    // Check if there are any treasures with morale remaining on the board
    const hasTreasuresAvailable = this.gameState.treasures?.some(t => !t.isDepleted()) || false

    for (const creature of availableCreatures) {
      // Priority 1 - Collect morale if standing on treasure - O(1)
      const tile = this.gameState.getTile(creature.position.x, creature.position.y)
      if (tile?.treasure && !tile.treasure.isDepleted()) {
        const result = this.gameState.collectMorale(creature)
        if (result.success) {
          actions.push({
            type: 'collect_morale',
            creature: creature.creature.name,
            position: { x: creature.position.x, y: creature.position.y },
            moraleCollected: result.moraleCollected,
            treasureDepleted: result.treasureDepleted
          })
          continue
        }
      }

      // Priority 2 - Try to attack
      const attackTargets = this.gameState.getValidAttackTargets(creature)

      if (attackTargets.length > 0) {
        // Attack the weakest enemy (lowest HP)
        const target = this.selectWeakestTarget(attackTargets)

        // Return attack intention instead of executing it
        // GameBoard will handle execution and show modals for human defenders
        actions.push({
          type: 'attack_intention',
          attackerInstance: creature,
          defenderInstance: target.creature,
          targetInfo: target
        })
        continue
      }

      // Priority 3 - Movement strategy depends on treasure availability
      // If treasures available: move towards treasures for morale advantage
      // If no treasures: move towards enemies for combat
      if (hasTreasuresAvailable) {
        const treasureMoveResult = this.tryMoveTowardsTreasures(creature)
        if (treasureMoveResult) {
          actions.push({
            type: 'move',
            creature: creature.creature.name,
            from: treasureMoveResult.from,
            to: treasureMoveResult.to,
            isFlying: treasureMoveResult.isFlying,
            terrainTypes: treasureMoveResult.terrainTypes,
            cost: treasureMoveResult.cost
          })
          continue
        }
      }

      // Priority 4 - Move towards enemies (always try if can't do anything else, or if no treasures)
      const moveResult = this.tryMoveTowardsEnemies(creature)
      if (moveResult) {
        actions.push({
          type: 'move',
          creature: creature.creature.name,
          from: moveResult.from,
          to: moveResult.to,
          isFlying: moveResult.isFlying,
          terrainTypes: moveResult.terrainTypes,
          cost: moveResult.cost
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

    // PERFORMANCE: Use cached starting zone tiles instead of scanning entire board (256 tiles)
    // Filter to only unoccupied tiles
    const startingZoneTiles = player.startingZoneTiles.filter(tile => !tile.occupant)

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
   * Select the weakest target from available attack targets
   * Prioritizes low HP targets for efficient kills
   * @param {Array} targets - Array of attack target objects
   * @returns {Object} Weakest target
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
   * Used when no treasures available or after collecting treasure
   * @param {CreatureInstance} creature - Creature to move
   * @returns {Object|null} Movement info or null if no valid move
   */
  tryMoveTowardsEnemies(creature) {
    const validMoves = this.gameState.getValidMovementTiles(creature)

    if (validMoves.length === 0) {
      return null
    }

    // Filter out water tiles unless creature is flying or small random chance (4-6%)
    const isFlying = this.gameState.hasFlying(creature)
    const waterChance = 0.04 + Math.random() * 0.02 // 4-6% chance (5% ± 1%)
    const allowWaterThisTurn = Math.random() < waterChance

    const safeMoves = validMoves.filter(moveInfo => {
      // Flying creatures can land on water without taking damage
      if (isFlying) return true
      // Ground creatures: ~5% chance to allow water, ~95% avoid it
      if (moveInfo.tile.terrain === 'WATER') {
        return allowWaterThisTurn
      }
      return true
    })

    if (safeMoves.length === 0) {
      return null // No safe moves available
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

    // Use safeMoves instead of validMoves to avoid water
    for (const moveInfo of safeMoves) {
      const moveTile = moveInfo.tile
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

      // STEP 1 TERRAIN: Get movement details for testing
      const isFlying = this.gameState.hasFlying(creature)
      const terrainTypes = [] // Track terrain types in path

      // Collect terrain types (simplified - just check destination)
      if (bestMove.terrain) {
        terrainTypes.push(bestMove.terrain)
      }

      // Try to get actual movement cost (default to 1 if not available)
      const moveCost = this.gameState.getTerrainMovementCost(bestMove.terrain, isFlying)

      return {
        from,
        to: { x: bestMove.x, y: bestMove.y },
        isFlying,
        terrainTypes,
        cost: moveCost
      }
    }

    return null
  }

  /**
   * Try to move creature towards nearest treasure
   * AI highly prioritizes treasures for strategic morale advantage
   *
   * Big O Complexity: O(M*T) where M=validMoves, T=treasures
   * - For typical game: M≈15 moves, T≤6 treasures = O(90) effectively constant
   *
   * @param {CreatureInstance} creature - The creature to move
   * @returns {Object|null} Movement info or null if no valid move toward treasure
   */
  tryMoveTowardsTreasures(creature) {
    const validMoves = this.gameState.getValidMovementTiles(creature)

    if (validMoves.length === 0) {
      return null
    }

    // Filter out water tiles unless creature is flying or small random chance (4-6%)
    const isFlying = this.gameState.hasFlying(creature)
    const waterChance = 0.04 + Math.random() * 0.02 // 4-6% chance (5% ± 1%)
    const allowWaterThisTurn = Math.random() < waterChance

    const safeMoves = validMoves.filter(moveInfo => {
      // Flying creatures can land on water without taking damage
      if (isFlying) return true
      // Ground creatures: ~5% chance to allow water, ~95% avoid it
      if (moveInfo.tile.terrain === 'WATER') {
        return allowWaterThisTurn
      }
      return true
    })

    if (safeMoves.length === 0) {
      return null // No safe moves available
    }

    // Get all treasures on the board - O(1) since treasures array is pre-filtered
    const treasures = this.gameState.treasures

    if (treasures.length === 0) {
      return null // No treasures on board
    }

    // Calculate which move gets us closest to nearest treasure - O(M*T)
    const currentPos = creature.position
    let bestMove = null
    let bestDistance = Infinity

    // Use safeMoves instead of validMoves to avoid water
    for (const moveInfo of safeMoves) {
      const moveTile = moveInfo.tile
      for (const treasure of treasures) {
        const distance = this.gameState.getDistance(moveTile, treasure.position)
        if (distance < bestDistance) {
          bestDistance = distance
          bestMove = moveTile
        }
      }
    }

    if (bestMove && !bestMove.occupant) {
      const from = { ...currentPos }
      this.gameState.moveCreature(creature, bestMove)

      // Get movement details for testing
      const isFlying = this.gameState.hasFlying(creature)
      const terrainTypes = []

      // Collect terrain types (simplified - just check destination)
      if (bestMove.terrain) {
        terrainTypes.push(bestMove.terrain)
      }

      // Get actual movement cost
      const moveCost = this.gameState.getTerrainMovementCost(bestMove.terrain, isFlying)

      return {
        from,
        to: { x: bestMove.x, y: bestMove.y },
        isFlying,
        terrainTypes,
        cost: moveCost
      }
    }

    return null
  }

  /**
   * Decide whether to use Immediate (IMD) cards when being attacked
   * Returns object with reactions and opportunity info
   *
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @returns {Object} { reactions: Array, hadOpportunity: boolean }
   */
  decideImmediateReactions(defenderInstance) {
    const player = this.gameState.players[this.playerId]
    const reactions = []

    // Safety check: ensure player and orderHand exist
    if (!player || !player.orderHand || !Array.isArray(player.orderHand)) {
      return { reactions: [], hadOpportunity: false }
    }

    // Safety check: ensure defenderInstance exists
    if (!defenderInstance) {
      return { reactions: [], hadOpportunity: false }
    }

    // Get Manhattan distance helper
    const getManhattanDistance = (pos1, pos2) => {
      return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
    }

    // Get all Immediate cards in hand (with null check)
    const immediateCards = player.orderHand.filter(card => card && card.isImmediate && card.isImmediate())

    // Safety check: ensure creaturesInPlay exists
    if (!player.creaturesInPlay || !Array.isArray(player.creaturesInPlay)) {
      return { reactions: [], hadOpportunity: false }
    }

    // For each Immediate card, find which creatures can use it
    immediateCards.forEach((card, cardIndex) => {
      player.creaturesInPlay.forEach((creature) => {
        // Check if creature can use this card
        if (
          !creature.isTapped && // Creature must not be tapped
          card.canBeUsedBy(creature.creature) && // Creature meets card requirements
          defenderInstance.position && creature.position // Both have positions
        ) {
          const distance = getManhattanDistance(creature.position, defenderInstance.position)
          const range = card.range || 1

          if (distance <= range) {
            reactions.push({
              creature,
              card,
              cardIndex,
              distance
            })
          }
        }
      })
    })

    // AI Strategy: Decide whether to use IMD cards based on threat assessment
    if (reactions.length === 0) {
      return { reactions: [], hadOpportunity: false } // No reactions available
    }

    // We have at least one reaction available - this is an opportunity!
    const hadOpportunity = true

    // Calculate threat level: How dangerous is this attack?
    const defenderHP = defenderInstance.currentHP || defenderInstance.creature.hp
    const defenderMaxHP = defenderInstance.creature.hp
    const hpPercentage = (defenderHP / defenderMaxHP) * 100

    // Get creature level for value assessment
    const creatureLevel = defenderInstance.creature.level || 1

    // Decision logic (prioritizes high-level creatures):
    // Base chance on HP percentage, then boost based on creature level
    let baseChance = 0
    if (hpPercentage < 40) {
      baseChance = 100 // Always consider using when critical
    } else if (hpPercentage < 70) {
      baseChance = 60 // Base chance when moderately wounded
    } else {
      baseChance = 30 // Base chance when healthy
    }

    // Level-based multiplier: higher level = more valuable
    // Level 1: 0.5x (half as likely to protect)
    // Level 2-3: 1.0x (normal)
    // Level 4-5: 1.5x (50% more likely to protect)
    // Level 6+: 2.0x (twice as likely to protect)
    let levelMultiplier = 1.0
    if (creatureLevel === 1) {
      levelMultiplier = 0.5 // Low priority for level 1
    } else if (creatureLevel >= 6) {
      levelMultiplier = 2.0 // High priority for level 6+
    } else if (creatureLevel >= 4) {
      levelMultiplier = 1.5 // Medium-high priority for level 4-5
    }

    // Calculate final chance (capped at 100%)
    let useChance = Math.min(100, baseChance * levelMultiplier)

    // Make decision based on chance
    const shouldUse = Math.random() * 100 < useChance

    if (shouldUse) {
      return { reactions: [reactions[0]], hadOpportunity } // Use only one card for now
    }

    return { reactions: [], hadOpportunity } // Decided not to use reactions (but could have!)
  }
}

export default SimpleAI
