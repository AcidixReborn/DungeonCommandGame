import { GamePhases } from '../models/gameState.js'
import { CreatureInstance } from '../models/creatures.js'
// ActionTypes import removed - not used

/**
 * AI Difficulty Levels:
 * - 'easy': Basic movement/attack only. No creature abilities, no IMMEDIATE cards.
 * - 'medium': Adds creature ability usage. No IMMEDIATE cards.
 * - 'hard': Full AI with creature abilities + IMMEDIATE card usage.
 *
 * @typedef {'easy' | 'medium' | 'hard'} AIDifficulty
 */

/**
 * Simple AI for Dungeon Command
 * Makes basic tactical decisions for computer-controlled players
 *
 * Big O Complexity per turn:
 * - O(C × (T + E)) where C = creatures, T = treasures, E = enemies
 */
export class SimpleAI {
  /**
   * @param {Object} gameState - The game state object
   * @param {string} playerId - The player ID this AI controls
   * @param {Object|null} trackStats - Optional stats tracking object
   * @param {AIDifficulty} difficulty - AI difficulty level ('easy', 'medium', 'hard')
   */
  constructor(gameState, playerId, trackStats = null, difficulty = 'easy') {
    this.gameState = gameState
    this.playerId = playerId
    this.trackStats = trackStats // Optional stats tracking object
    this.difficulty = difficulty // AI difficulty level

    // Medium difficulty personality for graveyard deploy decisions
    // Randomly assigned per AI instance (conservative = less aggressive graveyard usage)
    this.isConservative = difficulty === 'medium' ? Math.random() < 0.5 : false
  }

  // ============================================================================
  // DIFFICULTY HELPER METHODS
  // O(1) - Simple boolean checks based on difficulty level
  // ============================================================================

  /**
   * Check if AI can use creature special abilities
   * @returns {boolean} True if creature abilities are enabled
   */
  canUseCreatureAbilities() {
    // Easy: No creature abilities
    // Medium/Hard: Creature abilities enabled
    return this.difficulty !== 'easy'
  }

  /**
   * Check if AI can use IMMEDIATE order cards for defense
   * @returns {boolean} True if IMMEDIATE cards are enabled
   */
  canUseImmediateCards() {
    // Easy/Medium: No IMMEDIATE cards
    // Hard: IMMEDIATE cards enabled
    return this.difficulty === 'hard'
  }

  /**
   * Check if automatic creature abilities (like SCUTTLE) should trigger
   * These are abilities that happen automatically, not by choice
   * @returns {boolean} True if automatic abilities should trigger
   */
  shouldTriggerAutomaticAbilities() {
    // Easy: Automatic abilities disabled
    // Medium/Hard: Automatic abilities enabled
    return this.difficulty !== 'easy'
  }

  /**
   * Get the current difficulty level
   * @returns {AIDifficulty} Current difficulty
   */
  getDifficulty() {
    return this.difficulty
  }

  /**
   * Check if AI should use strategic decision-making for optional abilities
   * (Used for things like graveyard deploy where timing matters)
   * @returns {boolean} True if strategic decisions enabled (hard mode)
   */
  usesStrategicDecisions() {
    return this.difficulty === 'hard'
  }

  /**
   * Execute AI turn for the current phase
   */
  executeTurn() {
    const phase = this.gameState.currentPhase

    switch (phase) {
      case GamePhases.REFRESH:
        // Check for HORDE ability - allows deployment during REFRESH phase
        if (this.gameState.canDeployDuringRefresh && this.gameState.canDeployDuringRefresh(this.playerId)) {
          return this.executeDeployPhase(true) // Pass true to indicate HORDE deployment
        }
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
   *
   * Big O Complexity:
   * - O(C * (T + E)) where C = creatures, T = treasures check, E = enemy targets
   * - Each creature can perform BOTH a movement AND an action per turn
   * - Creature gets tapped only after doing BOTH move AND attack
   *
   * Turn Structure per creature:
   * 1. Try ACTION first (collect morale or attack if in range)
   * 2. Try MOVEMENT (towards treasures or enemies)
   * 3. Try ACTION again (attack after moving into range)
   */
  executeActivatePhase() {
    const player = this.gameState.players[this.playerId]
    const actions = []

    // O(C) - Get all untapped creatures
    const availableCreatures = player.creaturesInPlay.filter(c => !c.isTapped)

    // O(T) - Check if there are any treasures with morale remaining on the board
    const hasTreasuresAvailable = this.gameState.treasures?.some(t => !t.isDepleted()) || false

    // O(C) iterations - each creature can do BOTH move AND action
    for (const creature of availableCreatures) {
      // ============================================================================
      // FIX: Skip creatures with null position (may have been destroyed)
      // This prevents "Cannot read properties of null (reading 'x')" errors
      // ============================================================================
      if (!creature.position) {
        continue
      }

      // Track if this creature performed actions for stats
      let didAction = false
      let didMove = false
      // ============================================================================
      // FIX: Track if we already created an attack intention for this creature
      // This prevents the double-attack bug where Step 1 and Step 3 both add
      // attack intentions because hasAttackedThisTurn isn't set until execution
      // ============================================================================
      let hasAttackIntention = false

      // ============================================
      // STEP 1: Try to perform an ACTION first (collect morale or attack)
      // O(1) for morale check, O(E) for attack targets
      // ============================================

      // Priority 1a - Collect morale if standing on treasure - O(1)
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
          didAction = true
          // DON'T continue - creature can still move after collecting morale!
        }
      }

      // Priority 1b - Try to attack if in range (and hasn't attacked yet) - O(E)
      // FIX: Also check hasAttackIntention to prevent duplicate attack intentions
      if (!creature.hasAttackedThisTurn && !hasAttackIntention) {
        // ============================================
        // CONFUSION GAZE CHECK: Try to use ability before normal attack
        // Easy: Never use (0%), Medium: 50% chance, Hard: Always use (100%)
        // ============================================
        if (this.canUseCreatureAbilities() && this.gameState.hasConfusionGaze(creature)) {
          const useChance = this.difficulty === 'hard' ? 1.0 : 0.5
          if (Math.random() < useChance) {
            const gazeTargets = this.gameState.getConfusionGazeTargets(creature)
            if (gazeTargets.length > 0) {
              // Select weakest target for CONFUSION GAZE
              const target = gazeTargets.reduce((weakest, current) =>
                current.currentHP < weakest.currentHP ? current : weakest
              , gazeTargets[0])

              // Get valid slide destinations
              const slideTiles = this.gameState.getValidSlideTiles(target, 3)
              if (slideTiles.length > 0) {
                // Random slide destination for AI
                const slideDestination = slideTiles[Math.floor(Math.random() * slideTiles.length)]

                actions.push({
                  type: 'confusion_gaze',
                  attackerInstance: creature,
                  target: target,
                  slideDestination: slideDestination
                })
                didAction = true
                hasAttackIntention = true  // Counts as attack action
                continue  // Don't fall through to normal attack
              }
            }
          }
        }

        const attackTargets = this.gameState.getValidAttackTargets(creature, this.trackStats)
        if (attackTargets.length > 0) {
          const target = this.selectWeakestTarget(attackTargets)
          actions.push({
            type: 'attack_intention',
            attackerInstance: creature,
            defenderInstance: target.creature,
            targetInfo: target
          })
          didAction = true
          hasAttackIntention = true  // FIX: Mark that we created an attack intention
          // DON'T continue - creature can still move after attacking!
        }
      }

      // ============================================
      // STEP 2: Try to MOVE (if hasn't moved yet)
      // O(V + E log V) for pathfinding where V = tiles, E = edges
      // ============================================
      if (!creature.hasMovedThisTurn) {
        let moveResult = null

        // Movement strategy depends on treasure availability
        if (hasTreasuresAvailable) {
          moveResult = this.tryMoveTowardsTreasures(creature)
        }

        // If no treasure move found (or no treasures), move towards enemies
        if (!moveResult) {
          moveResult = this.tryMoveTowardsEnemies(creature)
        }

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
          didMove = true
        }
      }

      // ============================================
      // STEP 3: Try to attack AFTER moving (if didn't attack before)
      // This allows move-then-attack pattern - O(E)
      // FIX: Also check hasAttackIntention to prevent duplicate attack intentions
      // ============================================
      if (!creature.hasAttackedThisTurn && didMove && !hasAttackIntention) {
        const attackTargets = this.gameState.getValidAttackTargets(creature, this.trackStats)
        if (attackTargets.length > 0) {
          const target = this.selectWeakestTarget(attackTargets)
          actions.push({
            type: 'attack_intention',
            attackerInstance: creature,
            defenderInstance: target.creature,
            targetInfo: target
          })
          didAction = true
          hasAttackIntention = true  // FIX: Mark that we created an attack intention
        }
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
   *
   * Big O: O(Z * C) where Z = starting zone tiles (6), C = creatures in hand
   * - Filter tiles: O(Z)
   * - Sort creatures: O(C log C)
   * - Deploy loop: O(C) iterations, each O(1)
   *
   * @param {boolean} isHordeDeploy - True if this is HORDE ability deployment during REFRESH
   */
  executeDeployPhase(isHordeDeploy = false) {
    const player = this.gameState.players[this.playerId]
    const actions = []

    // PERFORMANCE: Use cached starting zone coordinates, but look up actual tiles
    // to check occupancy. startingZoneTiles contains {x, y} objects, not tile refs.
    // Filter to only unoccupied tiles by checking the actual board tile
    const startingZoneTiles = player.startingZoneTiles
      .map(coord => this.gameState.getTile(coord.x, coord.y))
      .filter(tile => tile && !tile.occupant)

    // Check for ORC SCOUT ability - can deploy one Orc to treasure tile on turn 1
    if (this.gameState.turnNumber === 1 &&
        this.gameState.canUseOrcScout &&
        this.gameState.canUseOrcScout(this.playerId)) {
      const treasureTiles = this.gameState.getOrcScoutValidTiles ? this.gameState.getOrcScoutValidTiles() : []
      const orcsInHand = player.creatureHand.filter(c => c.type && c.type.includes('Orc'))

      if (treasureTiles.length > 0 && orcsInHand.length > 0 && Math.random() < 0.7) {
        // 70% chance to use ORC SCOUT
        const orcCard = orcsInHand[Math.floor(Math.random() * orcsInHand.length)]
        const treasureTile = treasureTiles[Math.floor(Math.random() * treasureTiles.length)]

        if (player.canDeployCreature(orcCard)) {
          const creatureIndex = player.creatureHand.indexOf(orcCard)
          const creatureInstance = new CreatureInstance(orcCard, this.playerId)
          creatureInstance.position = { x: treasureTile.x, y: treasureTile.y }
          creatureInstance.markAsDeployed(this.gameState.turnNumber)

          player.creaturesInPlay.push(creatureInstance)
          player.creatureHand.splice(creatureIndex, 1)
          treasureTile.occupant = creatureInstance

          // Mark ORC SCOUT as used
          if (this.gameState.markOrcScoutUsed) {
            this.gameState.markOrcScoutUsed(this.playerId)
          }

          actions.push({
            type: 'deploy',
            creature: orcCard.name,
            creatureTypes: orcCard.type || [],
            position: { x: treasureTile.x, y: treasureTile.y },
            isOrcScout: true
          })
        }
      }
    }

    // Deploy creatures in order of level (highest first) until out of leadership
    const sortedCreatures = [...player.creatureHand].sort((a, b) => b.level - a.level)

    for (const creatureCard of sortedCreatures) {
      if (!player.canDeployCreature(creatureCard)) {
        continue // Not enough leadership
      }

      let deployTile = null
      let isShadowStalkerDeploy = false

      // SHADOW STALKER: Check if creature can deploy to mountain-adjacent tile
      if (this.gameState.hasShadowStalker && this.gameState.hasShadowStalker(creatureCard)) {
        // Difficulty-based decision to use SHADOW STALKER
        let useShadowStalker = false
        switch (this.difficulty) {
          case 'easy':
            useShadowStalker = false  // Easy AI never uses SHADOW STALKER
            break
          case 'medium':
            useShadowStalker = Math.random() < 0.5  // Medium AI uses 50% of the time
            break
          case 'hard':
            useShadowStalker = true  // Hard AI always uses SHADOW STALKER
            break
        }

        if (useShadowStalker && this.gameState.getShadowStalkerValidTiles) {
          const shadowStalkerTiles = this.gameState.getShadowStalkerValidTiles()
          if (shadowStalkerTiles.length > 0) {
            // Pick a random mountain-adjacent tile
            deployTile = shadowStalkerTiles[Math.floor(Math.random() * shadowStalkerTiles.length)]
            isShadowStalkerDeploy = true
          }
        }
      }

      // SUMMON SPIDER: Check if Spider creature can deploy near Drow Priestess
      let isSummonSpiderDeploy = false
      if (!deployTile && this.gameState.isSpiderCreature && this.gameState.isSpiderCreature(creatureCard)) {
        const priestess = this.gameState.hasSummonSpider && this.gameState.hasSummonSpider(this.playerId)
        if (priestess) {
          // Difficulty-based decision to use SUMMON SPIDER
          let useSummonSpider = false
          switch (this.difficulty) {
            case 'easy':
              useSummonSpider = false  // Easy AI never uses SUMMON SPIDER
              break
            case 'medium':
              useSummonSpider = Math.random() < 0.5  // Medium AI uses 50% of the time
              break
            case 'hard':
              useSummonSpider = true  // Hard AI always uses SUMMON SPIDER
              break
          }

          if (useSummonSpider && this.gameState.getSummonSpiderTiles) {
            let summonSpiderTiles = this.gameState.getSummonSpiderTiles(priestess)

            // Hard AI: Avoid water and difficult terrain
            if (this.difficulty === 'hard' && summonSpiderTiles.length > 0) {
              const safeTiles = summonSpiderTiles.filter(t =>
                t.tile.terrain !== 'WATER' && t.tile.terrain !== 'DIFFICULT'
              )
              if (safeTiles.length > 0) {
                summonSpiderTiles = safeTiles
              }
              // If no safe tiles, still use ability but with available tiles
            }

            if (summonSpiderTiles.length > 0) {
              // Pick a random tile near Priestess
              const randomTile = summonSpiderTiles[Math.floor(Math.random() * summonSpiderTiles.length)]
              deployTile = randomTile.tile
              isSummonSpiderDeploy = true
            }
          }
        }
      }

      // Fall back to starting zone if not using SHADOW STALKER/SUMMON SPIDER or no valid tiles
      if (!deployTile) {
        if (startingZoneTiles.length === 0) {
          break // No more empty tiles
        }
        const tileIndex = Math.floor(Math.random() * startingZoneTiles.length)
        deployTile = startingZoneTiles[tileIndex]
        startingZoneTiles.splice(tileIndex, 1)
      }

      // Deploy the creature
      const creatureIndex = player.creatureHand.indexOf(creatureCard)
      const creatureInstance = new CreatureInstance(creatureCard, this.playerId)
      creatureInstance.position = { x: deployTile.x, y: deployTile.y }
      creatureInstance.markAsDeployed(this.gameState.turnNumber)

      player.creaturesInPlay.push(creatureInstance)
      player.creatureHand.splice(creatureIndex, 1)
      deployTile.occupant = creatureInstance

      actions.push({
        type: 'deploy',
        creature: creatureCard.name,
        creatureTypes: creatureCard.type || [],
        position: { x: deployTile.x, y: deployTile.y },
        isHordeDeploy: isHordeDeploy,
        isShadowStalker: isShadowStalkerDeploy,
        isSummonSpider: isSummonSpiderDeploy
      })
    }

    if (actions.length === 0) {
      return { action: 'advance', message: 'AI deployed no creatures' }
    }

    return {
      action: 'advance',
      message: `AI deployed ${actions.length} creature(s)${isHordeDeploy ? ' (HORDE)' : ''}`,
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
    // Safety check: ensure creature has a valid position
    if (!creature.position) {
      return null
    }

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
      const isBurrowing = this.gameState.hasBurrow ? this.gameState.hasBurrow(creature) : false
      const terrainTypes = [] // Track terrain types in path

      // Collect terrain types (simplified - just check destination)
      if (bestMove.terrain) {
        terrainTypes.push(bestMove.terrain)
      }

      // Try to get actual movement cost (default to 1 if not available)
      const moveCost = this.gameState.getTerrainMovementCost(bestMove.terrain, isFlying, creature, isBurrowing)

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
    // Safety check: ensure creature has a valid position
    if (!creature.position) {
      return null
    }

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
      const isBurrowing = this.gameState.hasBurrow ? this.gameState.hasBurrow(creature) : false
      const terrainTypes = []

      // Collect terrain types (simplified - just check destination)
      if (bestMove.terrain) {
        terrainTypes.push(bestMove.terrain)
      }

      // Get actual movement cost
      const moveCost = this.gameState.getTerrainMovementCost(bestMove.terrain, isFlying, creature, isBurrowing)

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
   * DIFFICULTY GATE: Only Hard difficulty can use IMMEDIATE cards
   *
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @returns {Object} { reactions: Array, hadOpportunity: boolean }
   */
  decideImmediateReactions(defenderInstance) {
    // DIFFICULTY CHECK: Only Hard difficulty uses IMMEDIATE cards
    if (!this.canUseImmediateCards()) {
      return { reactions: [], hadOpportunity: false }
    }

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

  /**
   * Decide whether to use defensive abilities when being attacked
   * Handles both COWER (universal) and UNSTOPPABLE HORDES (Morgana's Undead)
   *
   * COWER is a LAST RESORT - only used when:
   * - This creature would die AND it's one of our last few creatures
   * - OR this is a very high-value creature (level 5+) that would die
   * - AND we have enough morale to spare
   *
   * UNSTOPPABLE HORDES is more freely used since it's more efficient
   *
   * Big O Complexity: O(a + 8) where a = commander abilities (1-2), 8 = adjacent tiles
   * Effectively O(1) since all factors are small constants
   *
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @param {number} incomingDamage - The amount of damage being dealt
   * @param {string} attackerOwner - Owner of the attacking creature
   * @returns {Object} { type: 'cower' | 'unstoppable_hordes' | 'immediate_card' | 'none', creatures: [...], hadOpportunity: boolean }
   */
  decideDefense(defenderInstance, incomingDamage, attackerOwner) {
    // Check if getDefenseOptions exists
    if (!this.gameState.getDefenseOptions) {
      return { type: 'none', creatures: [], hadOpportunity: false }
    }

    const defenseOptions = this.gameState.getDefenseOptions(defenderInstance, incomingDamage, attackerOwner)
    const player = this.gameState.players[this.playerId]

    const hasCowerOption = defenseOptions.cower?.canCower
    const hasUnstoppableOption = defenseOptions.unstoppableHordes?.canUse || defenseOptions.adjacentUndead?.length > 0
    const hasImmediateOption = defenseOptions.immediateCards?.length > 0

    if (!hasCowerOption && !hasUnstoppableOption && !hasImmediateOption) {
      return { type: 'none', creatures: [], hadOpportunity: false }
    }

    // We have the opportunity to defend!
    const hadOpportunity = true

    // Decision factors
    const defenderHP = defenderInstance.currentHP || defenderInstance.creature.hp
    const creatureLevel = defenderInstance.creature.level || 1
    const currentMorale = player.morale
    const creaturesInPlay = player.creaturesInPlay?.length || 0

    // Will this attack kill the creature?
    const wouldDie = incomingDamage >= defenderHP

    // ========================================
    // UNSTOPPABLE HORDES DECISION
    // Prioritize high-level creatures - losing a high-level creature
    // means losing more morale AND losing a powerful unit
    // Low-level creatures (1-2) are expendable - don't waste morale protecting them
    // ========================================
    if (hasUnstoppableOption) {
      let useUnstoppableChance = 0

      if (wouldDie) {
        // Creature would die - decision based on creature value
        if (creatureLevel >= 5) {
          // High-value creature - almost always protect
          useUnstoppableChance = 90
        } else if (creatureLevel >= 4) {
          // Good creature - usually protect
          useUnstoppableChance = 75
        } else if (creatureLevel === 3) {
          // Medium creature - sometimes protect
          useUnstoppableChance = 50
        } else if (creatureLevel === 2) {
          // Low creature - rarely protect unless desperate
          useUnstoppableChance = creaturesInPlay <= 3 ? 40 : 20
        } else {
          // Level 1 creature - almost never protect (expendable)
          useUnstoppableChance = creaturesInPlay <= 2 ? 25 : 10
        }
      } else {
        // Creature won't die - only protect high-value creatures to keep them healthy
        if (creatureLevel >= 5) {
          useUnstoppableChance = 40 // Keep high-level creatures at full health
        } else if (creatureLevel >= 4) {
          useUnstoppableChance = 25
        } else {
          // Don't waste morale preventing non-lethal damage on low-level creatures
          useUnstoppableChance = 0
        }
      }

      // Boost chance if we're running low on creatures (desperate)
      if (creaturesInPlay <= 2 && wouldDie) {
        useUnstoppableChance += 20
      }

      // Lower chance if morale is critically low
      if (currentMorale <= 3) {
        useUnstoppableChance -= 50
      } else if (currentMorale <= 5) {
        useUnstoppableChance -= 25
      }

      // Ensure chance stays in valid range
      useUnstoppableChance = Math.max(0, Math.min(100, useUnstoppableChance))

      // Make decision
      if (Math.random() * 100 < useUnstoppableChance) {
        return this.selectUnstoppableHordesCreatures(defenseOptions, incomingDamage)
      }
    }

    // ========================================
    // IMMEDIATE CARD DECISION
    // Free defense (no morale cost) - prioritize over COWER
    // Use cards strategically to prevent lethal damage or protect valuable creatures
    // DIFFICULTY GATE: Only Hard difficulty uses IMMEDIATE cards
    // ========================================
    if (hasImmediateOption && this.canUseImmediateCards()) {
      const immediateDecision = this.selectImmediateCardForDefense(defenseOptions, defenderInstance, incomingDamage)
      if (immediateDecision) {
        return immediateDecision
      }
    }

    // ========================================
    // COWER DECISION (LAST RESORT ONLY)
    // ========================================
    if (hasCowerOption) {
      // COWER is expensive and should only be used in desperate situations
      const cowerMoraleCost = defenseOptions.cower.moraleCost
      const hasBlackHandPenalty = defenseOptions.cower.extraCost > 0

      // Never cower if BLACK HAND OF BANE makes it even more expensive and morale is low
      if (hasBlackHandPenalty && currentMorale <= 8) {
        return { type: 'none', creatures: [], hadOpportunity }
      }

      // Never cower if morale is too low (would put us close to losing)
      if (currentMorale - cowerMoraleCost <= 2) {
        return { type: 'none', creatures: [], hadOpportunity }
      }

      // COWER criteria - must meet ALL of these:
      // 1. Creature would die from this attack
      // 2. One of the following desperate situations:
      //    a) This is one of our last 1-2 creatures
      //    b) This is a high-value creature (level 5+) and we have morale to spare
      //    c) This creature is essential (level 6+)

      if (!wouldDie) {
        // Don't cower if creature won't die
        return { type: 'none', creatures: [], hadOpportunity }
      }

      let shouldCower = false

      // Situation A: One of our last creatures (desperate)
      if (creaturesInPlay <= 2) {
        // Only cower if we have decent morale remaining after
        if (currentMorale - cowerMoraleCost >= 4) {
          shouldCower = true
        }
      }

      // Situation B: High-value creature (level 5+) with morale to spare
      if (creatureLevel >= 5 && currentMorale >= 10) {
        // More likely to cower for valuable creatures when we have morale
        shouldCower = Math.random() < 0.6 // 60% chance
      }

      // Situation C: Essential creature (level 6+) - almost always try to save
      if (creatureLevel >= 6 && currentMorale - cowerMoraleCost >= 3) {
        shouldCower = Math.random() < 0.8 // 80% chance
      }

      // Last creature on the field - definitely cower if possible
      if (creaturesInPlay === 1 && currentMorale - cowerMoraleCost >= 2) {
        shouldCower = true
      }

      if (shouldCower) {
        return { type: 'cower', creatures: [defenderInstance], hadOpportunity }
      }
    }

    return { type: 'none', creatures: [], hadOpportunity }
  }

  /**
   * Select which Undead creatures to use for UNSTOPPABLE HORDES
   * Prioritizes using minimal creatures to prevent damage efficiently
   *
   * Big O Complexity: O(u) where u = available Undead creatures (max 9)
   *
   * @param {Object} defenseOptions - Defense options from gameState
   * @param {number} incomingDamage - Amount of damage to prevent
   * @returns {Object} { type: 'unstoppable_hordes', creatures: [...], hadOpportunity: true }
   */
  selectUnstoppableHordesCreatures(defenseOptions, incomingDamage) {
    const creatures = []

    // Start with defender if available
    if (defenseOptions.unstoppableHordes?.canUse) {
      // Defender is included automatically in UI, but we track it here
      // The actual defender will be added by the modal's confirm handler
    }

    // Add adjacent Undead as needed
    const adjacentUndead = defenseOptions.adjacentUndead || []
    let totalPrevention = defenseOptions.unstoppableHordes?.canUse ? 20 : 0

    for (const creature of adjacentUndead) {
      if (totalPrevention >= incomingDamage) break // Already have enough
      creatures.push(creature)
      totalPrevention += 20
    }

    return {
      type: 'unstoppable_hordes',
      creatures,
      defenderCanUse: defenseOptions.unstoppableHordes?.canUse || false,
      totalDamageReduction: totalPrevention,
      hadOpportunity: true
    }
  }

  /**
   * Select an IMMEDIATE card to use for defense
   * Prioritizes cards that prevent enough damage to matter
   * Only uses cards on valuable creatures or to prevent death
   *
   * Big O Complexity: O(c * e) where c = immediate cards, e = eligible creatures per card
   *
   * @param {Object} defenseOptions - Defense options from gameState
   * @param {CreatureInstance} defenderInstance - The creature being attacked
   * @param {number} incomingDamage - Amount of damage to prevent
   * @returns {Object|null} { type: 'immediate_card', card, creature, ... } or null if shouldn't use
   */
  selectImmediateCardForDefense(defenseOptions, defenderInstance, incomingDamage) {
    const immediateCards = defenseOptions.immediateCards || []
    if (immediateCards.length === 0) return null

    const player = this.gameState.players[this.playerId]
    const defenderHP = defenderInstance.currentHP || defenderInstance.creature.hitPoints
    const creatureLevel = defenderInstance.creature.level || 1
    const creaturesInPlay = player.creaturesInPlay?.length || 0

    // Will this attack kill the creature?
    const wouldDie = incomingDamage >= defenderHP

    // Decision factors for using IMMEDIATE cards
    let useImmediateChance = 0

    if (wouldDie) {
      // Creature would die - higher chance to use card based on creature value
      if (creatureLevel >= 5) {
        useImmediateChance = 95 // Almost always use card to save high-value creature
      } else if (creatureLevel >= 4) {
        useImmediateChance = 85
      } else if (creatureLevel >= 3) {
        useImmediateChance = 70
      } else if (creatureLevel >= 2) {
        useImmediateChance = creaturesInPlay <= 3 ? 60 : 40
      } else {
        // Level 1 creature - still might save if desperate
        useImmediateChance = creaturesInPlay <= 2 ? 50 : 25
      }
    } else {
      // Creature won't die - only use cards on valuable creatures
      if (creatureLevel >= 5) {
        useImmediateChance = 50 // Keep high-level creatures healthy
      } else if (creatureLevel >= 4) {
        useImmediateChance = 35
      } else if (creatureLevel >= 3) {
        useImmediateChance = 20
      } else {
        // Don't waste cards preventing non-lethal damage on low-level creatures
        useImmediateChance = 5
      }
    }

    // Boost chance if running low on creatures
    if (creaturesInPlay <= 2 && wouldDie) {
      useImmediateChance += 15
    }

    // Ensure chance stays in valid range
    useImmediateChance = Math.max(0, Math.min(100, useImmediateChance))

    // Make decision
    if (Math.random() * 100 >= useImmediateChance) {
      return null // Decided not to use immediate card
    }

    // Find the best card to use - prefer cards that prevent the most damage
    // but not overkill (don't use a 50-damage prevent card for 10 damage)
    let bestCard = null
    let bestCreature = null
    let bestScore = -1

    for (const cardInfo of immediateCards) {
      const damagePrevented = cardInfo.damagePrevented || 0

      // Skip cards with no damage prevention implemented
      if (damagePrevented === 0) continue

      // Score: prefer cards that prevent close to the incoming damage
      // Penalize overkill but don't completely avoid it
      let score = damagePrevented
      if (damagePrevented > incomingDamage) {
        // Overkill penalty - still useful but not as efficient
        score = incomingDamage - (damagePrevented - incomingDamage) * 0.3
      }

      // Prefer cards that would fully prevent death
      if (wouldDie && damagePrevented >= incomingDamage - defenderHP + 1) {
        score += 20 // Bonus for preventing death
      }

      if (score > bestScore && cardInfo.eligibleCreatures?.length > 0) {
        bestScore = score
        bestCard = cardInfo
        // Prefer defender to use the card if possible (keeps adjacent creatures untapped)
        bestCreature = cardInfo.eligibleCreatures.find(c => c.instanceId === defenderInstance.instanceId)
          || cardInfo.eligibleCreatures[0]
      }
    }

    if (!bestCard || !bestCreature) {
      return null
    }

    return {
      type: 'immediate_card',
      card: bestCard.card,
      creature: bestCreature,
      damagePrevented: bestCard.damagePrevented || 0,
      cardName: bestCard.card.name,
      hadOpportunity: true
    }
  }

  /**
   * Legacy method - kept for backwards compatibility
   * @deprecated Use decideDefense instead
   */
  decideCower(defenderInstance, attackerOwner) {
    // Get incoming damage (estimate - this is a simplified fallback)
    const incomingDamage = 50 // Default estimate

    const decision = this.decideDefense(defenderInstance, incomingDamage, attackerOwner)

    // Convert to legacy format
    if (decision.type === 'cower') {
      return {
        useCower: true,
        cowerInfo: { canCower: true, damageReduction: incomingDamage },
        hadOpportunity: decision.hadOpportunity
      }
    } else if (decision.type === 'unstoppable_hordes') {
      return {
        useCower: true,
        cowerInfo: { canCower: true, damageReduction: decision.totalDamageReduction || 20 },
        hadOpportunity: decision.hadOpportunity
      }
    }

    return {
      useCower: false,
      cowerInfo: null,
      hadOpportunity: decision.hadOpportunity
    }
  }
}

export default SimpleAI
