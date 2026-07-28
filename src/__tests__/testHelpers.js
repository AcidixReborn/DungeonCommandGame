// Shared fixtures/helpers for characterization tests.
// Builds a real GameState (not a mock) so tests exercise the actual combat/ability
// engine, using minimal generic creatures/commanders to avoid entangling faction-specific
// abilities (flanking, magic circle, etc.) with the behavior under test.
import { GameState } from '../models/gameState.js'
import { Creature, CreatureInstance } from '../models/creatures.js'
import { Commander } from '../models/commanders.js'
import { TerrainTypes } from '../models/Board.js'

export const testCommander = (overrides = {}) =>
  new Commander({
    id: 'test_commander',
    name: 'Test Commander',
    faction: 'Test Faction',
    startingMorale: 20,
    startingLeadership: 10,
    startingCreatureHandSize: 0,
    startingOrderHandSize: 0,
    abilities: [],
    ...overrides,
  })

export const testCreature = (overrides = {}) =>
  new Creature({
    id: 'test_creature',
    name: 'Test Creature',
    level: 2,
    type: [],
    speed: 4,
    hitPoints: 50,
    abilities: {},
    meleeAttack: { damage: 20, range: 1 },
    rangedAttack: null,
    faction: 'Test Faction',
    ...overrides,
  })

/**
 * Creates a real 2-player GameState (PLAYER1 vs PLAYER2) with empty decks —
 * tests place creatures directly via placeCreature() rather than going through deploy.
 */
export function createTestGame(overrides = {}) {
  const playerSetups = [
    {
      playerId: 'PLAYER1',
      commander: testCommander(),
      creatures: [],
      orders: [],
      faction: 'Test Faction A',
      isHuman: true,
    },
    {
      playerId: 'PLAYER2',
      commander: testCommander(),
      creatures: [],
      orders: [],
      faction: 'Test Faction B',
      isHuman: true,
    },
  ]
  const gameState = new GameState(overrides.playerSetups || playerSetups)
  // Board generation places random terrain/treasures; reset to NORMAL everywhere so
  // combat/LOS tests are deterministic and only the terrain a test sets up explicitly matters.
  for (let y = 0; y < gameState.boardHeight; y++) {
    for (let x = 0; x < gameState.boardWidth; x++) {
      const tile = gameState.getTile(x, y)
      tile.terrain = TerrainTypes.NORMAL
      tile.occupant = null
    }
  }
  return gameState
}

/**
 * Places a creature instance on the board for a player, forcing the tile to
 * NORMAL terrain so tests are deterministic regardless of random board generation.
 */
export function placeCreature(gameState, playerId, creature, x, y) {
  const instance = new CreatureInstance(creature, playerId)
  instance.position = { x, y }
  const tile = gameState.getTile(x, y)
  tile.terrain = TerrainTypes.NORMAL
  tile.occupant = instance
  gameState.players[playerId].creaturesInPlay.push(instance)
  return instance
}
