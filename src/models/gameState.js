// Game state management for Dungeon Command
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
  isDefeated() {
    return this.morale <= 0 || (this.creaturesInPlay.length === 0 && this.creatureHand.length === 0 && this.creatureDeck.length === 0)
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

    // Board state - larger to accommodate up to 5 players
    this.boardWidth = 12
    this.boardHeight = 12
    this.tiles = [] // Array of tile objects with terrain

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
    const normalTiles = this.tiles.filter(t => t.terrain === TerrainTypes.NORMAL)
    for (let i = 0; i < count && normalTiles.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * normalTiles.length)
      const tile = normalTiles[randomIndex]
      tile.terrain = terrainType
      normalTiles.splice(randomIndex, 1)
    }
  }

  addMagicCircles() {
    const normalTiles = this.tiles.filter(t => t.terrain === TerrainTypes.NORMAL)

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

  getTile(x, y) {
    return this.tiles.find(t => t.x === x && t.y === y)
  }

  getCurrentPlayerState() {
    return this.players[this.currentPlayer]
  }

  // Calculate distance between two positions (Manhattan distance for grid movement)
  getDistance(pos1, pos2) {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
  }

  // Check if a tile is blocked by terrain (mountains block movement)
  isTerrainBlocked(tile) {
    return tile.terrain === TerrainTypes.MOUNTAIN
  }

  // Get movement cost for a terrain type
  getTerrainMovementCost(terrain) {
    switch (terrain) {
      case TerrainTypes.DIFFICULT:
        return 2 // Costs 2 movement to enter
      case TerrainTypes.FOREST:
        return 1
      case TerrainTypes.MOUNTAIN:
        return 999 // Impassable
      default:
        return 1
    }
  }

  // Get all valid movement tiles for a creature
  getValidMovementTiles(creatureInstance) {
    if (!creatureInstance.position) return []

    const validTiles = []
    const speed = creatureInstance.creature.speed
    const startPos = creatureInstance.position

    // Simple radius check - in a real implementation you'd want pathfinding
    for (let x = 0; x < this.boardWidth; x++) {
      for (let y = 0; y < this.boardHeight; y++) {
        const tile = this.getTile(x, y)
        if (!tile) continue

        // Can't move to occupied tiles
        if (tile.occupant) continue

        // Can't move to mountains
        if (this.isTerrainBlocked(tile)) continue

        // Check if within movement range (Manhattan distance)
        const distance = this.getDistance(startPos, { x, y })
        const movementCost = distance * this.getTerrainMovementCost(tile.terrain)

        if (movementCost <= speed) {
          validTiles.push(tile)
        }
      }
    }

    return validTiles
  }

  // Move a creature to a new position
  moveCreature(creatureInstance, targetTile) {
    if (!creatureInstance.position) return false

    const validTiles = this.getValidMovementTiles(creatureInstance)
    const isValid = validTiles.some(t => t.x === targetTile.x && t.y === targetTile.y)

    if (!isValid) return false

    // Clear old position
    const oldTile = this.getTile(creatureInstance.position.x, creatureInstance.position.y)
    if (oldTile) {
      oldTile.occupant = null
    }

    // Set new position
    creatureInstance.position = { x: targetTile.x, y: targetTile.y }
    targetTile.occupant = creatureInstance

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
    let damage = 0

    if (attackType === 'melee' && attackerInstance.creature.meleeAttack) {
      damage = attackerInstance.creature.meleeAttack.damage
    } else if (attackType === 'ranged' && attackerInstance.creature.rangedAttack) {
      damage = attackerInstance.creature.rangedAttack.damage
    } else {
      return { success: false, message: 'Invalid attack type' }
    }

    // Tap the attacker (attacking is a standard action)
    attackerInstance.tap()

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
      this.currentPhase = phaseOrder[currentIndex + 1]
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

    this.currentPhase = GamePhases.REFRESH

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
    const alivePlayers = this.activePlayers.filter(playerId => !this.players[playerId].isDefeated())

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

    // Untap all creatures again (for immediate actions during opponent's turn)
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
    const player = this.getCurrentPlayerState()

    // Increase leadership by 1 (but not on turn 1 - the initial deployment)
    if (this.turnNumber > 1) {
      player.increaseLeadership(1)
    }

    // Note: Actual deployment of creatures is handled by player actions
    // Auto-advance to cleanup phase
    this.advancePhase()
  }
}

export default GameState
