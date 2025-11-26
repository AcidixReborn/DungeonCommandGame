// Game state management for Dungeon Command
import { getValidMovementTiles as pathfindingGetValidMovement } from '../utils/pathfinding.js'

export const GamePhases = {
  REFRESH: 'REFRESH',
  ACTIVATE: 'ACTIVATE',
  DEPLOY: 'DEPLOY',
  CLEANUP: 'CLEANUP'
}

export const Players = {
  PLAYER1: 'PLAYER1',
  PLAYER2: 'PLAYER2',
  PLAYER3: 'PLAYER3',
  PLAYER4: 'PLAYER4',
  PLAYER5: 'PLAYER5'
}

export const TerrainTypes = {
  NORMAL: 'NORMAL',
  FOREST: 'FOREST',
  MOUNTAIN: 'MOUNTAIN',
  DIFFICULT: 'DIFFICULT',
  MAGIC_CIRCLE: 'MAGIC_CIRCLE',
  STARTING_ZONE: 'STARTING_ZONE'
}

export class PlayerState {
  constructor(commander, creatures, orders, faction) {
    this.commander = commander
    this.faction = faction
    this.morale = commander.startingMorale
    this.leadership = commander.startingLeadership

    // Decks
    this.creatureDeck = [...creatures]
    this.orderDeck = [...orders]

    // Hands
    this.creatureHand = []
    this.orderHand = []

    // Battlefield
    this.creaturesInPlay = []

    // Discard piles
    this.orderDiscard = []

    // Treasure tokens
    this.treasureTokens = 0

    // Magic circle position for this player
    this.magicCirclePosition = null

    // Starting zone tiles for this player
    this.startingZoneTiles = []
  }

  drawCreatureCards(count) {
    const drawn = []
    for (let i = 0; i < count && this.creatureDeck.length > 0; i++) {
      const card = this.creatureDeck.pop()
      this.creatureHand.push(card)
      drawn.push(card)
    }
    return drawn
  }

  drawOrderCards(count) {
    const drawn = []
    for (let i = 0; i < count && this.orderDeck.length > 0; i++) {
      const card = this.orderDeck.pop()
      this.orderHand.push(card)
      drawn.push(card)
    }
    return drawn
  }

  // Shuffle creature deck
  shuffleCreatureDeck() {
    for (let i = this.creatureDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.creatureDeck[i], this.creatureDeck[j]] = [this.creatureDeck[j], this.creatureDeck[i]]
    }
  }

  // Shuffle order deck
  shuffleOrderDeck() {
    for (let i = this.orderDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.orderDeck[i], this.orderDeck[j]] = [this.orderDeck[j], this.orderDeck[i]]
    }
  }

  // Calculate current leadership usage
  getCurrentLeadershipUsage() {
    return this.creaturesInPlay.reduce((sum, creature) => sum + creature.creature.level, 0)
  }

  // Check if can deploy a creature
  canDeployCreature(creature) {
    const currentUsage = this.getCurrentLeadershipUsage()
    return (currentUsage + creature.level) <= this.leadership
  }

  // Lose morale
  loseMorale(amount) {
    this.morale = Math.max(0, this.morale - amount)
    return this.morale <= 0 // Returns true if defeated
  }

  // Gain morale (from treasure tokens)
  gainMorale(amount) {
    this.morale += amount
  }

  // Increase leadership
  increaseLeadership(amount = 1) {
    this.leadership += amount
  }

  // Check if player is defeated
  // Player loses if: (1) Morale reaches 0, OR (2) All creatures in play are killed (after turn 1)
  isDefeated(currentTurn = 1) {
    // Morale defeat applies immediately
    if (this.morale <= 0) return true

    // Creature defeat only applies after turn 1 (give players a chance to deploy)
    if (currentTurn > 1 && this.creaturesInPlay.length === 0) return true

    return false
  }
}

export class GameState {
  constructor(playerSetups) {
    // playerSetups is an array of { playerId, commander, creatures, orders, faction }
    this.players = {}
    this.activePlayers = []

    playerSetups.forEach(setup => {
      this.players[setup.playerId] = new PlayerState(setup.commander, setup.creatures, setup.orders, setup.faction)
      this.activePlayers.push(setup.playerId)
    })

    this.currentPlayer = this.activePlayers[0]
    this.currentPhase = GamePhases.DEPLOY // Start in DEPLOY phase for initial setup
    this.turnNumber = 1
    this.gameOver = false
    this.winner = null

    // Board state - STEP 1: Increased to 16×16 for terrain regions
    this.boardWidth = 16  // Changed from 12 for 8×8 terrain regions
    this.boardHeight = 16 // Changed from 12 for 8×8 terrain regions
    this.tiles = [] // 2D array [y][x] for O(1) tile lookup

    // Generate random board
    this.generateBoard()

    // Initialize starting hands
    this.initializeGame()
  }

  initializeGame() {
    // Shuffle both decks and draw starting hands for all active players
    this.activePlayers.forEach(playerId => {
      const player = this.players[playerId]

      // Shuffle both decks
      player.shuffleCreatureDeck()
      player.shuffleOrderDeck()

      // Draw starting hands from commander stats
      player.drawCreatureCards(player.commander.startingCreatureHandSize)
      player.drawOrderCards(player.commander.startingOrderHandSize)
    })
  }

  // STEP 1: Generate board with 8×8 terrain regions (NEW)
  generateBoard() {
    // Initialize empty board as 2D array [y][x] for O(1) access
    this.tiles = []
    for (let y = 0; y < this.boardHeight; y++) {
      this.tiles[y] = []
      for (let x = 0; x < this.boardWidth; x++) {
        this.tiles[y][x] = {
          x,
          y,
          terrain: TerrainTypes.NORMAL,
          occupant: null
        }
      }
    }

    // STEP 1: Generate four 8×8 terrain regions in corners
    // Top-left region (0,0) to (7,7)
    this.generateTerrainRegion(0, 0, 8, 8)
    // Top-right region (8,0) to (15,7)
    this.generateTerrainRegion(8, 0, 8, 8)
    // Bottom-left region (0,8) to (7,15)
    this.generateTerrainRegion(0, 8, 8, 8)
    // Bottom-right region (8,8) to (15,15)
    this.generateTerrainRegion(8, 8, 8, 8)

    // Add one magic circle per active player
    this.addMagicCircles()

    // Add starting zones on the edges for each player
    this.addStartingZones()
  }

  // STEP 1: Generate a terrain region with clustered terrain
  generateTerrainRegion(startX, startY, width, height) {
    const regionTiles = []

    // Get all tiles in this region
    for (let y = startY; y < startY + height; y++) {
      for (let x = startX; x < startX + width; x++) {
        if (x < this.boardWidth && y < this.boardHeight) {
          regionTiles.push(this.getTile(x, y))
        }
      }
    }

    // Randomly decide terrain composition for this region
    // 15-25% forests, 8-15% mountains, 5-10% difficult terrain
    const totalTiles = regionTiles.length
    const forestCount = Math.floor(totalTiles * (0.15 + Math.random() * 0.10))
    const mountainCount = Math.floor(totalTiles * (0.08 + Math.random() * 0.07))
    const difficultCount = Math.floor(totalTiles * (0.05 + Math.random() * 0.05))

    // Add clustered forests (trees grow in groups)
    this.addClusteredTerrain(regionTiles, TerrainTypes.FOREST, forestCount, 3)

    // Add clustered mountains (mountain ranges)
    this.addClusteredTerrain(regionTiles, TerrainTypes.MOUNTAIN, mountainCount, 2)

    // Add scattered difficult terrain (mud, swamps)
    this.addClusteredTerrain(regionTiles, TerrainTypes.DIFFICULT, difficultCount, 2)
  }

  // STEP 1: Add terrain in clusters instead of random scatter
  addClusteredTerrain(regionTiles, terrainType, count, clusterSize) {
    const availableTiles = regionTiles.filter(t => t && t.terrain === TerrainTypes.NORMAL)
    let placed = 0

    while (placed < count && availableTiles.length > 0) {
      // Pick a random seed tile
      const seedIndex = Math.floor(Math.random() * availableTiles.length)
      const seedTile = availableTiles[seedIndex]

      if (!seedTile) break

      // Place terrain on seed tile
      seedTile.terrain = terrainType
      placed++
      availableTiles.splice(seedIndex, 1)

      // Try to expand cluster around seed tile
      const cluster = [seedTile]
      for (let i = 0; i < clusterSize - 1 && placed < count; i++) {
        // Pick a random tile from current cluster
        const baseTile = cluster[Math.floor(Math.random() * cluster.length)]

        // Get adjacent tiles
        const adjacentTiles = this.getAdjacentTiles(baseTile.x, baseTile.y)
          .filter(t => regionTiles.includes(t) && t.terrain === TerrainTypes.NORMAL)

        if (adjacentTiles.length > 0) {
          // Place terrain on random adjacent tile
          const adjTile = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)]
          adjTile.terrain = terrainType
          placed++
          cluster.push(adjTile)

          // Remove from available tiles
          const availIndex = availableTiles.indexOf(adjTile)
          if (availIndex !== -1) {
            availableTiles.splice(availIndex, 1)
          }
        } else {
          break // No more adjacent tiles, start new cluster
        }
      }
    }
  }

  // STEP 1: Helper to get adjacent tiles (4-directional)
  getAdjacentTiles(x, y) {
    const adjacent = []
    const directions = [
      { dx: 0, dy: -1 },  // North
      { dx: 1, dy: 0 },   // East
      { dx: 0, dy: 1 },   // South
      { dx: -1, dy: 0 }   // West
    ]

    directions.forEach(dir => {
      const newX = x + dir.dx
      const newY = y + dir.dy
      const tile = this.getTile(newX, newY)
      if (tile) {
        adjacent.push(tile)
      }
    })

    return adjacent
  }

  /* STEP 1: OLD TERRAIN GENERATION (COMMENTED OUT FOR REFERENCE)
  // Generate random board with terrain
  generateBoard() {
    // Initialize empty board
    this.tiles = []
    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        this.tiles.push({
          x,
          y,
          terrain: TerrainTypes.NORMAL,
          occupant: null
        })
      }
    }

    const totalTiles = this.boardWidth * this.boardHeight

    // Add forests (10-15% of board)
    const forestCount = Math.floor(totalTiles * (0.10 + Math.random() * 0.05))
    this.addRandomTerrain(TerrainTypes.FOREST, forestCount)

    // Add mountains (8-12% of board)
    const mountainCount = Math.floor(totalTiles * (0.08 + Math.random() * 0.04))
    this.addRandomTerrain(TerrainTypes.MOUNTAIN, mountainCount)

    // Add difficult terrain (5-8% of board)
    const difficultCount = Math.floor(totalTiles * (0.05 + Math.random() * 0.03))
    this.addRandomTerrain(TerrainTypes.DIFFICULT, difficultCount)

    // Add one magic circle per active player
    this.addMagicCircles()

    // Add starting zones on the edges for each player
    this.addStartingZones()
  }
  */

  // Create starting zones for each player on the board edges
  addStartingZones() {
    const numPlayers = this.activePlayers.length
    const zoneSize = 3 // 3x3 starting zone for each player

    // Define edge positions based on number of players
    // For 2 players: opposite corners
    // For 3+ players: distributed around edges
    const edgePositions = this.getEdgePositionsForPlayers(numPlayers)

    this.activePlayers.forEach((playerId, index) => {
      const edge = edgePositions[index]
      const zoneTiles = []

      // Create a 3x3 zone at the edge position
      for (let dy = 0; dy < zoneSize; dy++) {
        for (let dx = 0; dx < zoneSize; dx++) {
          const x = edge.startX + dx
          const y = edge.startY + dy

          // Make sure we're within bounds
          if (x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight) {
            const tile = this.getTile(x, y)
            if (tile) {
              // Clear any terrain except magic circles
              if (tile.terrain !== TerrainTypes.MAGIC_CIRCLE) {
                tile.terrain = TerrainTypes.STARTING_ZONE
                tile.startingZoneOwner = playerId
              }
              zoneTiles.push({ x, y })
            }
          }
        }
      }

      this.players[playerId].startingZoneTiles = zoneTiles
    })
  }

  // Get starting positions on board edges for each player
  getEdgePositionsForPlayers(numPlayers) {
    const positions = []

    if (numPlayers === 2) {
      // Two players: opposite corners
      positions.push({ startX: 0, startY: 0 }) // Top-left
      positions.push({ startX: this.boardWidth - 3, startY: this.boardHeight - 3 }) // Bottom-right
    } else if (numPlayers === 3) {
      // Three players: top-left, top-right, bottom-center
      positions.push({ startX: 0, startY: 0 }) // Top-left
      positions.push({ startX: this.boardWidth - 3, startY: 0 }) // Top-right
      positions.push({ startX: Math.floor(this.boardWidth / 2) - 1, startY: this.boardHeight - 3 }) // Bottom-center
    } else if (numPlayers === 4) {
      // Four players: four corners
      positions.push({ startX: 0, startY: 0 }) // Top-left
      positions.push({ startX: this.boardWidth - 3, startY: 0 }) // Top-right
      positions.push({ startX: 0, startY: this.boardHeight - 3 }) // Bottom-left
      positions.push({ startX: this.boardWidth - 3, startY: this.boardHeight - 3 }) // Bottom-right
    } else if (numPlayers === 5) {
      // Five players: four corners + center of one edge
      positions.push({ startX: 0, startY: 0 }) // Top-left
      positions.push({ startX: this.boardWidth - 3, startY: 0 }) // Top-right
      positions.push({ startX: 0, startY: this.boardHeight - 3 }) // Bottom-left
      positions.push({ startX: this.boardWidth - 3, startY: this.boardHeight - 3 }) // Bottom-right
      positions.push({ startX: Math.floor(this.boardWidth / 2) - 1, startY: 0 }) // Top-center
    }

    return positions
  }

  addRandomTerrain(terrainType, count) {
    const normalTiles = this.getAllTiles().filter(t => t.terrain === TerrainTypes.NORMAL)
    for (let i = 0; i < count && normalTiles.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * normalTiles.length)
      const tile = normalTiles[randomIndex]
      tile.terrain = terrainType
      normalTiles.splice(randomIndex, 1)
    }
  }

  addMagicCircles() {
    const normalTiles = this.getAllTiles().filter(t => t.terrain === TerrainTypes.NORMAL)

    this.activePlayers.forEach(playerId => {
      if (normalTiles.length > 0) {
        const randomIndex = Math.floor(Math.random() * normalTiles.length)
        const tile = normalTiles[randomIndex]
        tile.terrain = TerrainTypes.MAGIC_CIRCLE
        tile.owner = playerId
        this.players[playerId].magicCirclePosition = { x: tile.x, y: tile.y }
        normalTiles.splice(randomIndex, 1)
      }
    })
  }

  // PERFORMANCE: O(1) lookup using 2D array instead of O(n) find
  getTile(x, y) {
    // Bounds check
    if (x < 0 || x >= this.boardWidth || y < 0 || y >= this.boardHeight) {
      return null
    }
    return this.tiles[y][x]
  }

  // PERFORMANCE: Helper to iterate all tiles (needed for compatibility with 2D array)
  getAllTiles() {
    const allTiles = []
    for (let y = 0; y < this.boardHeight; y++) {
      for (let x = 0; x < this.boardWidth; x++) {
        allTiles.push(this.tiles[y][x])
      }
    }
    return allTiles
  }

  getCurrentPlayerState() {
    return this.players[this.currentPlayer]
  }

  // Calculate distance between two positions (Chebyshev distance for 8-directional grid)
  // Chebyshev distance = max(|dx|, |dy|) - correct for grids with diagonal movement
  getDistance(pos1, pos2) {
    return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y))
  }

  // STEP 1: Check if creature has flying ability
  hasFlying(creatureInstance) {
    if (!creatureInstance || !creatureInstance.creature) return false
    const abilities = creatureInstance.creature.specialAbilities || []
    return abilities.some(ability =>
      typeof ability === 'string' && ability.toLowerCase().includes('flying')
    )
  }

  // STEP 1: Check if tile is passable (with flying support)
  isTerrainPassable(tile, flying = false) {
    if (!tile) return false

    // Flying creatures can fly over mountains but cannot stop on them
    if (tile.terrain === TerrainTypes.MOUNTAIN) {
      return false // Cannot stop on mountains even if flying
    }

    return true
  }

  // STEP 1: Get movement cost for terrain (with flying support)
  getTerrainMovementCost(terrain, flying = false) {
    // Flying creatures ignore difficult terrain
    if (flying) {
      switch (terrain) {
        case TerrainTypes.MOUNTAIN:
          return 999 // Still impassable (cannot stop on mountains)
        default:
          return 1 // All other terrain costs 1 for flying creatures
      }
    }

    // Ground creatures
    switch (terrain) {
      case TerrainTypes.DIFFICULT:
        return 2 // Costs 2 movement to enter
      case TerrainTypes.FOREST:
        return 2 // Forests are also difficult terrain - costs 2 to enter
      case TerrainTypes.MOUNTAIN:
        return 999 // Impassable
      default:
        return 1
    }
  }

  // STEP 1: Get all valid movement tiles using A* pathfinding
  getValidMovementTiles(creatureInstance) {
    if (!creatureInstance.position) return []

    const speed = creatureInstance.creature.speed
    const startPos = creatureInstance.position
    const flying = this.hasFlying(creatureInstance)

    // Use pathfinding algorithm
    const validMovement = pathfindingGetValidMovement(
      startPos,
      speed,
      (terrain, isFlying) => this.getTerrainMovementCost(terrain, isFlying),
      (tile, isFlying) => this.isTerrainPassable(tile, isFlying),
      (x, y) => this.getTile(x, y),
      flying
    )

    // Return array of objects with tile, path, and cost
    return validMovement
  }

  // Move a creature to a new position
  moveCreature(creatureInstance, targetTile) {
    if (!creatureInstance.position) return false

    // Cannot move if tapped
    if (creatureInstance.isTapped) {
      console.log('Cannot move: creature is tapped')
      return false
    }

    // Cannot move if already moved this turn
    if (creatureInstance.hasMovedThisTurn) {
      console.log('Cannot move: creature has already moved this turn')
      return false
    }

    const validTiles = this.getValidMovementTiles(creatureInstance)
    // STEP 1: Fix - validTiles contains {tile, path, cost} objects
    const isValid = validTiles.some(t => t.tile.x === targetTile.x && t.tile.y === targetTile.y)

    if (!isValid) return false

    // Clear old position
    const oldTile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
    if (oldTile) {
      oldTile.occupant = null
    }

    // Set new position
    creatureInstance.position = { x: targetTile.x, y: targetTile.y }
    targetTile.occupant = creatureInstance

    // Mark as moved
    creatureInstance.hasMovedThisTurn = true

    // Tap the creature if it has both moved AND attacked
    if (creatureInstance.hasAttackedThisTurn) {
      creatureInstance.tap()
    }

    return true
  }

  // Get all valid attack targets for a creature
  getValidAttackTargets(creatureInstance) {
    if (!creatureInstance.position) return []

    const targets = []
    const attackerOwner = creatureInstance.owner
    const hasRanged = creatureInstance.creature.rangedAttack !== null
    const rangedRange = hasRanged ? creatureInstance.creature.rangedAttack.range : 0
    const meleeRange = creatureInstance.creature.meleeAttack?.range || 1

    // Find all enemy creatures
    for (const playerId of this.activePlayers) {
      if (playerId === attackerOwner) continue // Skip own creatures

      const player = this.players[playerId]
      for (const enemyCreature of player.creaturesInPlay) {
        if (!enemyCreature.position) continue

        // Skip creatures that were deployed this turn (protected from attacks)
        if (enemyCreature.deployedThisTurn) continue

        const distance = this.getDistance(creatureInstance.position, enemyCreature.position)

        // Can attack in melee range
        if (distance <= meleeRange) {
          targets.push({
            creature: enemyCreature,
            attackType: 'melee',
            distance
          })
        }
        // Can attack with ranged if has ranged attack
        else if (hasRanged && distance <= rangedRange) {
          targets.push({
            creature: enemyCreature,
            attackType: 'ranged',
            distance
          })
        }
      }
    }

    return targets
  }

  // Execute an attack from one creature to another
  executeAttack(attackerInstance, defenderInstance, attackType = 'melee') {
    // Cannot attack if tapped
    if (attackerInstance.isTapped) {
      return { success: false, message: 'Cannot attack: creature is tapped' }
    }

    // Cannot attack if already attacked this turn
    if (attackerInstance.hasAttackedThisTurn) {
      return { success: false, message: 'Cannot attack: creature has already attacked this turn' }
    }

    let damage = 0

    if (attackType === 'melee' && attackerInstance.creature.meleeAttack) {
      damage = attackerInstance.creature.meleeAttack.damage
    } else if (attackType === 'ranged' && attackerInstance.creature.rangedAttack) {
      damage = attackerInstance.creature.rangedAttack.damage
    } else {
      return { success: false, message: 'Invalid attack type' }
    }

    // Mark as attacked
    attackerInstance.hasAttackedThisTurn = true

    // Tap the creature if it has both moved AND attacked
    if (attackerInstance.hasMovedThisTurn) {
      attackerInstance.tap()
    }

    // Use the custom combat resolution (includes +1 morale on kill)
    const result = this.resolveAttack(attackerInstance, defenderInstance, damage)

    return {
      success: true,
      ...result,
      attackType,
      damage
    }
  }

  getOpponentPlayerState() {
    return this.players[this.currentPlayer === Players.PLAYER1 ? Players.PLAYER2 : Players.PLAYER1]
  }

  // Phase transitions
  advancePhase() {
    const phaseOrder = [GamePhases.REFRESH, GamePhases.ACTIVATE, GamePhases.DEPLOY, GamePhases.CLEANUP]
    const currentIndex = phaseOrder.indexOf(this.currentPhase)

    if (currentIndex === phaseOrder.length - 1) {
      // End of turn - switch players
      this.endTurn()
    } else {
      const nextPhase = phaseOrder[currentIndex + 1]
      this.currentPhase = nextPhase

      // Increase leadership by 1 when entering Deploy phase (but not on turn 1)
      if (nextPhase === GamePhases.DEPLOY && this.turnNumber > 1) {
        const player = this.getCurrentPlayerState()
        player.increaseLeadership(1)
      }
    }
  }

  endTurn() {
    // Move to next active player
    const currentIndex = this.activePlayers.indexOf(this.currentPlayer)
    const nextIndex = (currentIndex + 1) % this.activePlayers.length
    this.currentPlayer = this.activePlayers[nextIndex]

    // If we've cycled back to first player, increment turn number
    if (nextIndex === 0) {
      this.turnNumber++
    }

    // Turn 1 is deploy-only for both players
    if (this.turnNumber === 1) {
      this.currentPhase = GamePhases.DEPLOY
    } else {
      this.currentPhase = GamePhases.REFRESH
    }

    // Check for game over conditions
    this.checkGameOver()
  }

  // CUSTOM RULE: Killing a creature grants +1 morale to attacker's owner
  // NO COWER MECHANIC - creatures just take damage
  resolveAttack(attackerInstance, defenderInstance, damageAmount) {
    const attackerOwner = attackerInstance.owner
    const defenderOwner = defenderInstance.owner

    // Apply damage to defender
    const wasDestroyed = defenderInstance.takeDamage(damageAmount)

    if (wasDestroyed) {
      // Clear the tile occupant first
      if (defenderInstance.position) {
        const tile = this.getTile(defenderInstance.position.x, defenderInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(c => c.instanceId === defenderInstance.instanceId)
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(defenderInstance.creature.level)

      // CUSTOM RULE: Attacker gains +1 morale
      const attackerPlayer = this.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      return {
        destroyed: true,
        damage: damageAmount,
        moraleChange: {
          attacker: +1,
          defender: -defenderInstance.creature.level
        }
      }
    }

    return {
      destroyed: false,
      damage: damageAmount,
      moraleChange: null
    }
  }

  checkGameOver() {
    // Get all non-defeated players
    const alivePlayers = this.activePlayers.filter(playerId => !this.players[playerId].isDefeated(this.turnNumber))

    if (alivePlayers.length === 0) {
      // All defeated - highest morale wins
      this.gameOver = true
      let highestMorale = -1
      this.activePlayers.forEach(playerId => {
        const morale = this.players[playerId].morale
        if (morale > highestMorale) {
          highestMorale = morale
          this.winner = playerId
        }
      })
    } else if (alivePlayers.length === 1) {
      // Only one player left
      this.gameOver = true
      this.winner = alivePlayers[0]
    }
  }

  // Execute refresh phase
  executeRefreshPhase() {
    const player = this.getCurrentPlayerState()

    // Draw 1 order card
    player.drawOrderCards(1)

    // Untap all creatures
    player.creaturesInPlay.forEach(creature => creature.untap())

    // Clear deployment protection from creatures deployed on previous turns
    player.creaturesInPlay.forEach(creature => {
      if (creature.deployedThisTurn && creature.turnDeployed !== this.turnNumber) {
        creature.clearDeploymentProtection()
      }
    })

    // Auto-advance to activate phase
    this.advancePhase()
  }

  // Execute cleanup phase
  executeCleanupPhase() {
    const player = this.getCurrentPlayerState()

    // Untap only current player's creatures (not opponent's)
    player.creaturesInPlay.forEach(creature => creature.untap())

    // Draw creature cards back to hand limit from commander stats
    const creatureHandLimit = player.commander.startingCreatureHandSize
    const cardsToDraw = Math.max(0, creatureHandLimit - player.creatureHand.length)
    player.drawCreatureCards(cardsToDraw)

    // Auto-advance (which will end turn)
    this.advancePhase()
  }

  // Execute deploy phase
  executeDeployPhase() {
    // Note: Leadership increase now happens in advancePhase() when entering Deploy phase
    // Note: Actual deployment of creatures is handled by player actions
    // Auto-advance to cleanup phase
    this.advancePhase()
  }
}

export default GameState
