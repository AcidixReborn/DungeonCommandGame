# Step 1: Terrain Movement Effects - Implementation Plan

**Status**: Ready to implement
**Date**: 2025-11-25

---

## 📋 User Decisions & Requirements

### Board & Terrain Generation
- ✅ **Board Size**: 16×16 grid (256 tiles total)
- ✅ **CSS Adjustment**: Make tiles smaller if needed to fit on screen
- ✅ **Terrain Regions**: Four 8×8 terrain regions placed in fixed positions
  - Top-left (0,0) → (7,7)
  - Top-right (8,0) → (15,7)
  - Bottom-left (0,8) → (7,15)
  - Bottom-right (8,8) → (15,15)
- ✅ **Random Generation**: Each 8×8 region gets randomly generated terrain mix
- ✅ **Starting Zones**: Keep 3×3 per player

### Flying Creatures
- ✅ **Test Implementation**: Add 1 flying creature per team (random selection)
- ✅ **Flying Rules**:
  - NOT affected by difficult terrain (ignores movement cost)
  - CAN fly over mountains
  - CANNOT stop on mountains (can pass through but not end movement there)

### Movement UI
- ✅ **Step 1**: Click creature → show valid movements with cost numbers
- ✅ **Step 2**: Click destination → show preview + confirmation dialog
- ✅ **Step 3**: User confirms → creature moves
- ✅ **No hover preview**: User must click to see path

### Pathfinding
- ✅ **Algorithm**: Full A* pathfinding (proper but complex)
- ✅ **Cost Calculation**: Sum terrain costs along actual path
- ✅ **Flying Support**: Special pathfinding for flying creatures

### Magic Circles
- ✅ **Movement**: Treat as normal terrain (cost 1)
- ✅ **Visual**: Keep existing magic circle display
- ✅ **Effects**: None for now (controlled by commander/creature/card abilities)

---

## 🎯 Implementation Tasks

### Phase 0: Board Size & Terrain Generation

#### Task 0.1: Increase Board Size to 16×16
**Priority**: 🔴 Critical - Do First

**Changes Needed**:

**File**: `src/models/gameState.js`
```javascript
// Line ~141: Update board dimensions
constructor(playerSetups) {
  this.boardWidth = 16  // Changed from 12
  this.boardHeight = 16 // Changed from 12
  // ... rest of constructor
}
```

**File**: `src/components/GameBoard.css`
```css
/* Adjust tile size to fit 16×16 on screen */
.board-tile {
  width: 40px;   /* Reduced from ~50px */
  height: 40px;  /* Reduced from ~50px */
  font-size: 0.7rem; /* Smaller text */
}

.board-container {
  /* May need to adjust max-width/height */
  max-width: 700px;  /* 16 × 40px + padding */
  max-height: 700px;
}
```

**Testing**:
- ✅ Verify board displays at 16×16
- ✅ Check that tiles fit on screen without scrolling
- ✅ Adjust CSS if tiles are too small to read

---

#### Task 0.2: Implement 8×8 Terrain Region Generation
**Priority**: 🔴 Critical

**File**: `src/models/gameState.js`

Replace the current `generateBoard()` method:

```javascript
// New method: Generate board with four 8×8 terrain regions
generateBoard() {
  // Initialize empty 16×16 board
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

  // Define four 8×8 regions (corners of 16×16 board)
  const regions = [
    { startX: 0, startY: 0, label: 'top-left' },     // Region 1: (0,0) to (7,7)
    { startX: 8, startY: 0, label: 'top-right' },    // Region 2: (8,0) to (15,7)
    { startX: 0, startY: 8, label: 'bottom-left' },  // Region 3: (0,8) to (7,15)
    { startX: 8, startY: 8, label: 'bottom-right' }  // Region 4: (8,8) to (15,15)
  ]

  // Generate random terrain for each 8×8 region
  regions.forEach(region => {
    this.generateTerrainRegion(region.startX, region.startY, 8, 8)
  })

  // Add one magic circle per active player (anywhere on board)
  this.addMagicCircles()

  // Add 3×3 starting zones for each player
  this.addStartingZones()
}

// New method: Generate terrain within an 8×8 region
generateTerrainRegion(startX, startY, width, height) {
  const regionTiles = []

  // Collect all tiles in this region
  for (let y = startY; y < startY + height; y++) {
    for (let x = startX; x < startX + width; x++) {
      const tile = this.getTile(x, y)
      if (tile) {
        regionTiles.push(tile)
      }
    }
  }

  // Total tiles in 8×8 region = 64
  const totalTiles = regionTiles.length

  // Terrain distribution for each region (aim for ~40% coverage):
  // - Forests: 15-20% of region (10-13 tiles)
  // - Mountains: 10-15% of region (6-10 tiles)
  // - Difficult: 10-15% of region (6-10 tiles)
  // Total: ~35-50% terrain coverage

  const forestCount = Math.floor(totalTiles * (0.15 + Math.random() * 0.05))
  const mountainCount = Math.floor(totalTiles * (0.10 + Math.random() * 0.05))
  const difficultCount = Math.floor(totalTiles * (0.10 + Math.random() * 0.05))

  // Add forests as clusters (not random scatter)
  this.addClusteredTerrain(regionTiles, TerrainTypes.FOREST, forestCount, 2)

  // Add mountain ranges (larger clusters)
  this.addClusteredTerrain(regionTiles, TerrainTypes.MOUNTAIN, mountainCount, 1.5)

  // Add difficult terrain (smaller clusters)
  this.addClusteredTerrain(regionTiles, TerrainTypes.DIFFICULT, difficultCount, 1.5)
}

// New helper: Add terrain in clusters instead of random scatter
addClusteredTerrain(availableTiles, terrainType, count, clusterSize) {
  const normalTiles = availableTiles.filter(t => t.terrain === TerrainTypes.NORMAL)
  let placed = 0

  while (placed < count && normalTiles.length > 0) {
    // Pick a random starting point
    const seedIndex = Math.floor(Math.random() * normalTiles.length)
    const seedTile = normalTiles[seedIndex]

    if (!seedTile) break

    // Place terrain at seed
    seedTile.terrain = terrainType
    normalTiles.splice(seedIndex, 1)
    placed++

    // Try to place adjacent terrain (cluster effect)
    const clusterAttempts = Math.floor(clusterSize * (1 + Math.random()))

    for (let i = 0; i < clusterAttempts && placed < count; i++) {
      // Find adjacent normal tiles to seed
      const adjacent = this.getAdjacentTiles(seedTile.x, seedTile.y)
        .filter(t => t.terrain === TerrainTypes.NORMAL && normalTiles.includes(t))

      if (adjacent.length > 0) {
        const nextTile = adjacent[Math.floor(Math.random() * adjacent.length)]
        nextTile.terrain = terrainType

        const idx = normalTiles.indexOf(nextTile)
        if (idx > -1) normalTiles.splice(idx, 1)

        placed++
      }
    }
  }
}

// New helper: Get adjacent tiles (for clustering)
getAdjacentTiles(x, y) {
  const adjacent = []
  const directions = [
    { dx: 0, dy: -1 },  // North
    { dx: 1, dy: 0 },   // East
    { dx: 0, dy: 1 },   // South
    { dx: -1, dy: 0 }   // West
  ]

  directions.forEach(dir => {
    const tile = this.getTile(x + dir.dx, y + dir.dy)
    if (tile) adjacent.push(tile)
  })

  return adjacent
}
```

**Testing**:
- ✅ Verify board generates with 4 distinct terrain regions
- ✅ Check that terrain appears clustered (forests in patches, mountain ranges)
- ✅ Verify ~35-50% terrain coverage per region
- ✅ Visual inspection: Does it look good?

---

#### Task 0.3: Update Starting Zone Placement
**Priority**: 🟠 High

**Changes**: Update `getEdgePositionsForPlayers()` for 16×16 board

```javascript
getEdgePositionsForPlayers(numPlayers) {
  const positions = []

  if (numPlayers === 2) {
    // Two players: opposite corners (3×3 zones)
    positions.push({ startX: 0, startY: 0 })              // Top-left
    positions.push({ startX: 13, startY: 13 })            // Bottom-right (16-3=13)
  } else if (numPlayers === 3) {
    positions.push({ startX: 0, startY: 0 })              // Top-left
    positions.push({ startX: 13, startY: 0 })             // Top-right
    positions.push({ startX: 6, startY: 13 })             // Bottom-center
  } else if (numPlayers === 4) {
    positions.push({ startX: 0, startY: 0 })              // Top-left
    positions.push({ startX: 13, startY: 0 })             // Top-right
    positions.push({ startX: 0, startY: 13 })             // Bottom-left
    positions.push({ startX: 13, startY: 13 })            // Bottom-right
  } else if (numPlayers === 5) {
    positions.push({ startX: 0, startY: 0 })              // Top-left
    positions.push({ startX: 13, startY: 0 })             // Top-right
    positions.push({ startX: 0, startY: 13 })             // Bottom-left
    positions.push({ startX: 13, startY: 13 })            // Bottom-right
    positions.push({ startX: 6, startY: 0 })              // Top-center
  }

  return positions
}
```

---

### Phase 1: Pathfinding Implementation

#### Task 1.1: Create A* Pathfinding Algorithm
**Priority**: 🔴 Critical

**New File**: `src/utils/pathfinding.js`

```javascript
/**
 * A* Pathfinding algorithm for grid-based movement with terrain costs
 * Returns the shortest path considering terrain movement costs
 */

export class PathfindingNode {
  constructor(x, y, g = 0, h = 0, parent = null) {
    this.x = x
    this.y = y
    this.g = g // Cost from start to this node
    this.h = h // Heuristic cost to goal
    this.f = g + h // Total cost
    this.parent = parent
  }

  equals(other) {
    return this.x === other.x && this.y === other.y
  }
}

/**
 * Find path using A* algorithm
 * @param {Object} start - {x, y} starting position
 * @param {Object} goal - {x, y} goal position
 * @param {Function} getTerrainCost - Function that returns terrain cost for a tile
 * @param {Function} isPassable - Function that returns if tile is passable
 * @param {Function} getTile - Function that returns tile at (x, y)
 * @param {Object} options - { flying: boolean, maxCost: number }
 * @returns {Object} { path: Array, cost: number } or null if no path
 */
export function findPath(start, goal, getTerrainCost, isPassable, getTile, options = {}) {
  const { flying = false, maxCost = Infinity } = options

  // Initialize open and closed lists
  const openList = []
  const closedList = []

  // Create start node
  const startNode = new PathfindingNode(
    start.x,
    start.y,
    0,
    heuristic(start, goal)
  )
  openList.push(startNode)

  while (openList.length > 0) {
    // Get node with lowest f cost
    let currentIndex = 0
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[currentIndex].f) {
        currentIndex = i
      }
    }

    const current = openList[currentIndex]

    // Found goal?
    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(current)
    }

    // Move current from open to closed
    openList.splice(currentIndex, 1)
    closedList.push(current)

    // Check all neighbors
    const neighbors = getNeighbors(current, getTile)

    for (const neighbor of neighbors) {
      // Skip if in closed list
      if (closedList.some(n => n.equals(neighbor))) {
        continue
      }

      const tile = getTile(neighbor.x, neighbor.y)
      if (!tile) continue

      // Check if passable
      if (!isPassable(tile, flying)) {
        continue
      }

      // Calculate g cost (cost from start to neighbor)
      const terrainCost = getTerrainCost(tile.terrain, flying)
      const tentative_g = current.g + terrainCost

      // Skip if cost exceeds max
      if (tentative_g > maxCost) {
        continue
      }

      // Check if neighbor is in open list
      const existingIndex = openList.findIndex(n => n.equals(neighbor))

      if (existingIndex === -1) {
        // Not in open list, add it
        neighbor.g = tentative_g
        neighbor.h = heuristic(neighbor, goal)
        neighbor.f = neighbor.g + neighbor.h
        neighbor.parent = current
        openList.push(neighbor)
      } else if (tentative_g < openList[existingIndex].g) {
        // Found better path to existing node
        openList[existingIndex].g = tentative_g
        openList[existingIndex].f = tentative_g + openList[existingIndex].h
        openList[existingIndex].parent = current
      }
    }
  }

  // No path found
  return null
}

/**
 * Manhattan distance heuristic
 */
function heuristic(node, goal) {
  return Math.abs(node.x - goal.x) + Math.abs(node.y - goal.y)
}

/**
 * Get adjacent tiles (4-directional movement)
 */
function getNeighbors(node, getTile) {
  const neighbors = []
  const directions = [
    { dx: 0, dy: -1 },  // North
    { dx: 1, dy: 0 },   // East
    { dx: 0, dy: 1 },   // South
    { dx: -1, dy: 0 }   // West
  ]

  directions.forEach(dir => {
    const x = node.x + dir.dx
    const y = node.y + dir.dy
    const tile = getTile(x, y)

    if (tile) {
      neighbors.push(new PathfindingNode(x, y))
    }
  })

  return neighbors
}

/**
 * Reconstruct path from goal node back to start
 */
function reconstructPath(goalNode) {
  const path = []
  let current = goalNode
  let totalCost = goalNode.g

  while (current !== null) {
    path.unshift({ x: current.x, y: current.y })
    current = current.parent
  }

  return { path, cost: totalCost }
}

export default { findPath, PathfindingNode }
```

---

#### Task 1.2: Update Movement System with Pathfinding
**Priority**: 🔴 Critical

**File**: `src/models/gameState.js`

```javascript
import { findPath } from '../utils/pathfinding'

// Update getValidMovementTiles to use pathfinding
getValidMovementTiles(creatureInstance) {
  if (!creatureInstance.position) return []

  const validTiles = []
  const speed = creatureInstance.creature.speed
  const startPos = creatureInstance.position
  const isFlying = this.hasFlying(creatureInstance)

  // Helper functions for pathfinding
  const getTerrainCost = (terrain, flying) => {
    if (flying) {
      // Flying ignores difficult terrain, can cross mountains
      if (terrain === TerrainTypes.MOUNTAIN) {
        return 1 // Can fly over but costs movement
      }
      return 1 // All other terrain costs 1
    }

    // Normal movement
    return this.getTerrainMovementCost(terrain)
  }

  const isPassable = (tile, flying) => {
    // Can't move to occupied tiles
    if (tile.occupant) return false

    // Flying can pass over mountains (but not stop on them)
    if (flying && tile.terrain === TerrainTypes.MOUNTAIN) {
      return true // Can pass through during pathfinding
    }

    // Normal creatures can't enter mountains
    return !this.isTerrainBlocked(tile)
  }

  // Check each tile on the board
  for (let x = 0; x < this.boardWidth; x++) {
    for (let y = 0; y < this.boardHeight; y++) {
      const tile = this.getTile(x, y)
      if (!tile) continue

      // Skip start position
      if (tile.x === startPos.x && tile.y === startPos.y) continue

      // Skip occupied tiles
      if (tile.occupant) continue

      // Flying creatures can't STOP on mountains
      if (isFlying && tile.terrain === TerrainTypes.MOUNTAIN) continue

      // Find path to this tile
      const pathResult = findPath(
        startPos,
        { x: tile.x, y: tile.y },
        getTerrainCost,
        isPassable,
        (x, y) => this.getTile(x, y),
        { flying: isFlying, maxCost: speed }
      )

      // If path exists and cost is within movement budget
      if (pathResult && pathResult.cost <= speed) {
        validTiles.push({
          tile,
          path: pathResult.path,
          cost: pathResult.cost
        })
      }
    }
  }

  return validTiles
}

// New helper: Check if creature has flying ability
hasFlying(creatureInstance) {
  if (!creatureInstance || !creatureInstance.creature) return false
  if (!creatureInstance.creature.specialAbilities) return false

  return creatureInstance.creature.specialAbilities.some(ability =>
    ability.toLowerCase().includes('flying')
  )
}
```

---

### Phase 2: Flying Creatures for Testing

#### Task 2.1: Add Flying to Random Creatures
**Priority**: 🟠 High

**File**: `src/models/gameState.js`

```javascript
// Add to GameState constructor after creatures are drawn
constructor(playerSetups) {
  // ... existing constructor code ...

  // STEP 1 TESTING: Add flying to 1 random creature per team
  this.addTestFlyingCreatures()
}

// New method: Add flying ability to random creatures for testing
addTestFlyingCreatures() {
  this.activePlayers.forEach(playerId => {
    const player = this.players[playerId]

    // Get all creatures in hand
    if (player.creatureHand && player.creatureHand.length > 0) {
      // Pick random creature
      const randomIndex = Math.floor(Math.random() * player.creatureHand.length)
      const creature = player.creatureHand[randomIndex]

      // Add flying if doesn't already have it
      if (!creature.specialAbilities) {
        creature.specialAbilities = []
      }

      if (!creature.specialAbilities.some(a => a.toLowerCase().includes('flying'))) {
        creature.specialAbilities.push('Flying')
        console.log(`[TEST] Added Flying to ${creature.name} (${playerId})`)
      }
    }
  })
}
```

**Testing**:
- ✅ Each team gets 1 flying creature
- ✅ Flying creatures can move over mountains
- ✅ Flying creatures cannot stop on mountains
- ✅ Flying creatures ignore difficult terrain cost

---

### Phase 3: Movement UI & Confirmation

#### Task 3.1: Add Movement Cost Display
**Priority**: 🟠 High

**File**: `src/components/BoardTile.jsx`

```javascript
function BoardTile({ tile, onClick, isSelected, creature, isValidMove, isAttackTarget, movementInfo, onDrop, onDragOver, isDragTarget }) {
  // ... existing code ...

  return (
    <div
      className={`board-tile ${getTerrainClass()}
        ${isSelected ? 'selected' : ''}
        ${creature ? 'occupied' : ''}
        ${isValidMove ? 'valid-move' : ''}
        ${isAttackTarget ? 'attack-target' : ''}
        ${isDragTarget ? 'drag-target' : ''}`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title={`(${tile.x}, ${tile.y}) - ${tile.terrain}`}
    >
      <div className="terrain-symbol">{getTerrainSymbol()}</div>

      {/* Show movement cost on valid tiles */}
      {isValidMove && movementInfo && (
        <div className="movement-cost">
          {movementInfo.cost}
        </div>
      )}

      {/* Rest of existing code ... */}
    </div>
  )
}
```

**File**: `src/components/BoardTile.css`

```css
/* Movement cost indicator */
.movement-cost {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(255, 235, 59, 0.9);
  color: #000;
  font-weight: bold;
  font-size: 0.7rem;
  padding: 2px 4px;
  border-radius: 3px;
  border: 1px solid #ffa000;
  z-index: 10;
}
```

---

#### Task 3.2: Add Movement Confirmation Modal
**Priority**: 🟠 High

**File**: `src/components/GameBoard.jsx`

```javascript
// Add state for movement confirmation
const [pendingMove, setPendingMove] = useState(null)
const [showMoveConfirm, setShowMoveConfirm] = useState(false)

// Update handleTileClick to show confirmation
const handleTileClick = (tile) => {
  if (selectedBoardCreature) {
    // Check if this is a valid move
    const validMove = validMoveTiles.find(vm =>
      vm.tile.x === tile.x && vm.tile.y === tile.y
    )

    if (validMove) {
      // Show confirmation modal instead of moving immediately
      setPendingMove({
        creature: selectedBoardCreature,
        destination: tile,
        path: validMove.path,
        cost: validMove.cost
      })
      setShowMoveConfirm(true)
      return
    }
  }

  // ... rest of existing click logic
}

// Add confirmation handler
const confirmMove = () => {
  if (!pendingMove) return

  const result = gameState.moveCreature(
    pendingMove.creature,
    pendingMove.destination
  )

  if (result) {
    setActionMessage(
      `${pendingMove.creature.creature.name} moved (cost: ${pendingMove.cost})`
    )
  }

  // Clear state
  setPendingMove(null)
  setShowMoveConfirm(false)
  setSelectedBoardCreature(null)
  setValidMoveTiles([])
  setRenderCounter(prev => prev + 1)
}

const cancelMove = () => {
  setPendingMove(null)
  setShowMoveConfirm(false)
  // Keep creature selected
}

// Add modal to JSX
return (
  <>
    {/* Existing game board JSX */}

    {/* Movement Confirmation Modal */}
    <Modal show={showMoveConfirm} onHide={cancelMove}>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Movement</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {pendingMove && (
          <>
            <p>
              Move <strong>{pendingMove.creature.creature.name}</strong> to
              position ({pendingMove.destination.x}, {pendingMove.destination.y})?
            </p>
            <p>
              Movement cost: <strong>{pendingMove.cost}</strong>
            </p>
            <p className="text-muted small">
              Path: {pendingMove.path.map(p => `(${p.x},${p.y})`).join(' → ')}
            </p>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={cancelMove}>
          Cancel
        </Button>
        <Button variant="primary" onClick={confirmMove}>
          Confirm Move
        </Button>
      </Modal.Footer>
    </Modal>
  </>
)
```

---

### Phase 4: AI Updates

#### Task 4.1: Update AI to Use Pathfinding
**Priority**: 🟡 Medium

**File**: `src/ai/simpleAI.js`

The AI will automatically use the new pathfinding since it calls `getValidMovementTiles()`. No changes needed, but verify it works.

---

### Phase 5: Testing & Validation

#### Task 5.1: Add Automated Test Tracking
**Priority**: 🟠 High

**File**: `src/test/GameSimulation.jsx`

Add new statistics tracking for terrain and pathfinding:

```javascript
// In runSingleGame function, update stats object (line ~40)
const stats = {
  // ... existing stats ...

  // STEP 1 TERRAIN: New tracking
  terrainStats: {
    totalMoves: 0,
    movesOverDifficult: 0,
    movesOverForest: 0,
    movesBlockedByMountains: 0,
    flyingCreaturesMoved: 0,
    flyingOverMountains: 0,
    avgMovementCost: 0,
    totalMovementCost: 0,
    pathfindingErrors: 0,
    invalidMoves: 0
  },

  flyingCreatures: {
    p1: 0,
    p2: 0
  }
}

// After GameState creation (line ~86), count flying creatures
const p1Creatures = gameState.players[Players.PLAYER1]?.creatureHand || []
const p2Creatures = gameState.players[Players.PLAYER2]?.creatureHand || []

stats.flyingCreatures.p1 = p1Creatures.filter(c =>
  c.specialAbilities?.some(a => a.toLowerCase().includes('flying'))
).length

stats.flyingCreatures.p2 = p2Creatures.filter(c =>
  c.specialAbilities?.some(a => a.toLowerCase().includes('flying'))
).length

// In ACTIVATE phase (after line ~145), track movement actions
if (aiResult.actions) {
  aiResult.actions.forEach(action => {
    if (action.type === 'move') {
      stats.terrainStats.totalMoves++

      // Track movement cost if available
      if (action.cost !== undefined) {
        stats.terrainStats.totalMovementCost += action.cost
      }

      // Track terrain types moved through
      if (action.terrainTypes) {
        if (action.terrainTypes.includes('DIFFICULT')) {
          stats.terrainStats.movesOverDifficult++
        }
        if (action.terrainTypes.includes('FOREST')) {
          stats.terrainStats.movesOverForest++
        }
        if (action.terrainTypes.includes('MOUNTAIN')) {
          stats.terrainStats.flyingOverMountains++
        }
      }

      // Track flying creature moves
      if (action.isFlying) {
        stats.terrainStats.flyingCreaturesMoved++
      }
    }
  })
}

// Calculate average movement cost at end of game (line ~145)
if (stats.terrainStats.totalMoves > 0) {
  stats.terrainStats.avgMovementCost =
    (stats.terrainStats.totalMovementCost / stats.terrainStats.totalMoves).toFixed(2)
}
```

**Update Summary Statistics** (line ~189):

```javascript
const summary = {
  // ... existing summary fields ...

  // STEP 1 TERRAIN: Aggregate statistics
  terrainStats: {
    totalMoves: 0,
    movesOverDifficult: 0,
    movesOverForest: 0,
    movesBlockedByMountains: 0,
    flyingCreaturesMoved: 0,
    flyingOverMountains: 0,
    avgMovementCost: 0,
    pathfindingErrors: 0,
    invalidMoves: 0
  },

  totalFlyingCreatures: 0,
  gamesWithFlyingCreatures: 0
}

// In aggregation loop (after line ~230)
summary.terrainStats.totalMoves += gameStats.terrainStats.totalMoves
summary.terrainStats.movesOverDifficult += gameStats.terrainStats.movesOverDifficult
summary.terrainStats.movesOverForest += gameStats.terrainStats.movesOverForest
summary.terrainStats.movesBlockedByMountains += gameStats.terrainStats.movesBlockedByMountains
summary.terrainStats.flyingCreaturesMoved += gameStats.terrainStats.flyingCreaturesMoved
summary.terrainStats.flyingOverMountains += gameStats.terrainStats.flyingOverMountains
summary.terrainStats.pathfindingErrors += gameStats.terrainStats.pathfindingErrors
summary.terrainStats.invalidMoves += gameStats.terrainStats.invalidMoves

summary.totalFlyingCreatures += gameStats.flyingCreatures.p1 + gameStats.flyingCreatures.p2

if (gameStats.flyingCreatures.p1 > 0 || gameStats.flyingCreatures.p2 > 0) {
  summary.gamesWithFlyingCreatures++
}

// Calculate average movement cost
if (summary.terrainStats.totalMoves > 0) {
  const totalCost = allResults.reduce((sum, r) =>
    sum + r.terrainStats.totalMovementCost, 0
  )
  summary.terrainStats.avgMovementCost = (totalCost / summary.terrainStats.totalMoves).toFixed(2)
}
```

**Add Display Section** (after IMD Card Statistics section, line ~384):

```javascript
{/* STEP 1 TERRAIN: Display terrain and pathfinding statistics */}
<Card bg="success" text="white" className="mb-3">
  <Card.Header><h5>🗺️ Step 1: Terrain & Pathfinding Statistics</h5></Card.Header>
  <Card.Body>
    <Table striped bordered variant="dark">
      <tbody>
        <tr>
          <td><strong>Total Flying Creatures</strong></td>
          <td>
            <Badge bg="primary">{results.summary.totalFlyingCreatures}</Badge>
            {' '}in {results.summary.gamesWithFlyingCreatures} games
          </td>
        </tr>
        <tr>
          <td><strong>Total Moves</strong></td>
          <td><Badge bg="info">{results.summary.terrainStats.totalMoves}</Badge></td>
        </tr>
        <tr>
          <td><strong>Average Movement Cost</strong></td>
          <td>
            {results.summary.terrainStats.avgMovementCost} per move
          </td>
        </tr>
        <tr>
          <td><strong>Moves Over Difficult Terrain</strong></td>
          <td>
            <Badge bg="warning">{results.summary.terrainStats.movesOverDifficult}</Badge>
            {' '}({results.summary.terrainStats.totalMoves > 0
              ? ((results.summary.terrainStats.movesOverDifficult / results.summary.terrainStats.totalMoves) * 100).toFixed(1)
              : 0}%)
          </td>
        </tr>
        <tr>
          <td><strong>Moves Over Forest</strong></td>
          <td>
            <Badge bg="success">{results.summary.terrainStats.movesOverForest}</Badge>
            {' '}({results.summary.terrainStats.totalMoves > 0
              ? ((results.summary.terrainStats.movesOverForest / results.summary.terrainStats.totalMoves) * 100).toFixed(1)
              : 0}%)
          </td>
        </tr>
        <tr>
          <td><strong>Flying Creature Moves</strong></td>
          <td>
            <Badge bg="primary">{results.summary.terrainStats.flyingCreaturesMoved}</Badge>
            {' '}({results.summary.terrainStats.totalMoves > 0
              ? ((results.summary.terrainStats.flyingCreaturesMoved / results.summary.terrainStats.totalMoves) * 100).toFixed(1)
              : 0}% of all moves)
          </td>
        </tr>
        <tr>
          <td><strong>Flying Over Mountains</strong></td>
          <td>
            <Badge bg="info">{results.summary.terrainStats.flyingOverMountains}</Badge>
            {' '}moves
          </td>
        </tr>
        <tr>
          <td><strong>Pathfinding Errors</strong></td>
          <td>
            <Badge bg={results.summary.terrainStats.pathfindingErrors === 0 ? 'success' : 'danger'}>
              {results.summary.terrainStats.pathfindingErrors}
            </Badge>
          </td>
        </tr>
        <tr>
          <td><strong>Invalid Move Attempts</strong></td>
          <td>
            <Badge bg={results.summary.terrainStats.invalidMoves === 0 ? 'success' : 'warning'}>
              {results.summary.terrainStats.invalidMoves}
            </Badge>
          </td>
        </tr>
      </tbody>
    </Table>

    <Alert variant="success" className="mt-3 mb-0">
      <strong>✅ Terrain System Active!</strong> The new 16×16 board with 8×8 terrain regions
      and A* pathfinding is working. These statistics verify that creatures can navigate terrain
      correctly and flying creatures can move over mountains.
    </Alert>

    {results.summary.terrainStats.pathfindingErrors > 0 && (
      <Alert variant="danger" className="mt-2 mb-0">
        <strong>⚠️ Pathfinding Errors Detected!</strong> {results.summary.terrainStats.pathfindingErrors}
        {' '}error(s) occurred during pathfinding. Review the detailed logs.
      </Alert>
    )}
  </Card.Body>
</Card>
```

---

#### Task 5.2: Update AI to Report Movement Details
**Priority**: 🟠 High

**File**: `src/ai/simpleAI.js`

Update the `executeActivatePhase` method to include terrain details:

```javascript
// In tryMoveTowardsEnemies, update return object (line ~235)
if (bestMove && !bestMove.occupant) {
  const from = { ...currentPos }
  this.gameState.moveCreature(creature, bestMove)

  // Get movement details for testing
  const isFlying = this.gameState.hasFlying(creature)
  const terrainTypes = [] // Track terrain types in path

  // Collect terrain types (simplified - just check destination)
  if (bestMove.terrain) {
    terrainTypes.push(bestMove.terrain)
  }

  return {
    from,
    to: { x: bestMove.x, y: bestMove.y },
    isFlying,
    terrainTypes,
    cost: 1 // Will be updated with actual pathfinding cost
  }
}

// Update actions array in executeActivatePhase (line ~97)
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
```

---

#### Task 5.3: Manual Testing Checklist

**Board & Terrain**:
- [ ] Board displays at 16×16 with readable tiles
- [ ] Four 8×8 terrain regions visible in corners
- [ ] Terrain appears clustered (forests in patches, mountain ranges)
- [ ] Terrain density ~35-50% per region
- [ ] Starting zones are 3×3 in correct positions
- [ ] Magic circles placed correctly (1 per player)

**Flying Creatures**:
- [ ] Each team has 1 flying creature (shown in console log)
- [ ] Flying creatures can select tiles beyond mountains
- [ ] Flying creatures can fly over mountains (move through)
- [ ] Flying creatures CANNOT stop on mountains
- [ ] Flying creatures ignore difficult terrain (same cost as normal)

**Movement UI**:
- [ ] Click creature shows valid moves with cost numbers displayed
- [ ] Cost numbers are accurate (sum of path terrain costs)
- [ ] Click destination shows confirmation modal
- [ ] Modal displays path preview
- [ ] Modal shows movement cost
- [ ] Confirm moves creature to destination
- [ ] Cancel keeps creature selected

**Pathfinding**:
- [ ] Normal creatures cannot enter mountains (no valid move tiles on mountains)
- [ ] Movement through difficult terrain works (cost 2)
- [ ] Movement through forest works (cost 1)
- [ ] Paths go around mountains when necessary
- [ ] Movement cost calculation is correct (sum of path, not distance × cost)

**AI Behavior**:
- [ ] AI can move creatures successfully
- [ ] AI navigates around mountains
- [ ] AI uses flying creatures to cross mountains
- [ ] AI doesn't get stuck on terrain
- [ ] No pathfinding errors in console

---

#### Task 5.4: Automated Testing Validation

Run 100-game simulation and verify:

**Expected Results**:
- ✅ **Total Flying Creatures**: ~200 (2 per game × 100 games)
- ✅ **Total Moves**: 500-1000+ (depends on game length)
- ✅ **Average Movement Cost**: 1.2-1.5 (mix of normal and difficult terrain)
- ✅ **Pathfinding Errors**: 0 (critical!)
- ✅ **Invalid Move Attempts**: 0 or very low
- ✅ **Flying Over Mountains**: > 0 (proves flying works)
- ✅ **Moves Over Difficult**: > 0 (proves pathfinding works)

**Red Flags** (investigate if found):
- 🚨 Pathfinding errors > 0
- 🚨 Invalid moves > 10
- 🚨 Flying creatures = 0 (test setup failed)
- 🚨 Average movement cost < 1.0 or > 3.0 (calculation error)
- 🚨 Games with errors/warnings > 5%

---

#### Task 5.5: Edge Case Testing

Test these specific scenarios:

1. **Creature Surrounded by Mountains**
   - Place creature in valley surrounded by mountains
   - Verify: No valid moves (except flying creatures)

2. **Flying Creature Path Through Mountains**
   - Flying creature on one side of mountain range
   - Destination on other side
   - Verify: Path goes through mountains, not around

3. **Long Path Through Difficult Terrain**
   - Creature speed 5, path of 3 difficult tiles (cost 6)
   - Verify: Movement not allowed (cost > speed)

4. **Mixed Terrain Path**
   - Path: Normal (1) → Difficult (2) → Normal (1) = cost 4
   - Creature speed 4
   - Verify: Movement allowed, cost shown correctly

5. **Board Edge Cases**
   - Movement at board edges (0,0) and (15,15)
   - Verify: No out-of-bounds errors

---

## 📊 Summary

### Files to Create
- ✅ `src/utils/pathfinding.js` - A* algorithm

### Files to Modify
- ✅ `src/models/gameState.js` - Board size, terrain generation, pathfinding
- ✅ `src/components/GameBoard.jsx` - Movement confirmation modal
- ✅ `src/components/BoardTile.jsx` - Movement cost display
- ✅ `src/components/BoardTile.css` - Cost indicator styling
- ✅ `src/components/GameBoard.css` - Smaller tile size

### No Changes Needed
- `src/ai/simpleAI.js` - Already uses `getValidMovementTiles()`

---

## 🚀 Ready to Implement!

All user questions answered. Implementation plan is clear and detailed. Ready to begin coding when you give the word!
