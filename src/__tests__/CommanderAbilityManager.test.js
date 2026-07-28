// Characterization tests for CommanderAbilityManager — locks in the universal COWER
// defense mechanic and adjacency helpers before the TypeScript migration touches this file.
import { describe, it, expect } from 'vitest'
import { createTestGame, placeCreature, testCreature } from './testHelpers.js'

describe('CommanderAbilityManager.canCower / applyCower', () => {
  it('costs ceil(damage/10) morale and avoids all damage', () => {
    const game = createTestGame()
    const creature = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)

    const info = game.abilityManager.canCower(creature, 25)

    expect(info.canCower).toBe(true)
    expect(info.moraleCost).toBe(3) // ceil(25/10)
    expect(info.damageAvoided).toBe(25)
  })

  it('cannot be used by a tapped creature', () => {
    const game = createTestGame()
    const creature = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    creature.isTapped = true

    const info = game.abilityManager.canCower(creature, 25)

    expect(info.canCower).toBe(false)
    expect(info.reason).toBe('tapped')
  })

  it('cannot be used if the player lacks enough morale', () => {
    const game = createTestGame()
    const creature = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    game.players.PLAYER1.morale = 1

    const info = game.abilityManager.canCower(creature, 100) // would cost 10 morale

    expect(info.canCower).toBe(false)
    expect(info.reason).toBe('insufficient_morale')
  })

  it('applyCower pays the morale cost and taps the creature', () => {
    const game = createTestGame()
    const creature = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const moraleBefore = game.players.PLAYER1.morale

    const result = game.abilityManager.applyCower(creature, 25)

    expect(result.success).toBe(true)
    expect(result.moraleCost).toBe(3)
    expect(game.players.PLAYER1.morale).toBe(moraleBefore - 3)
    expect(creature.isTapped).toBe(true)
  })

  it('applyCower fails without side effects when canCower is false', () => {
    const game = createTestGame()
    const creature = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    creature.isTapped = true
    const moraleBefore = game.players.PLAYER1.morale

    const result = game.abilityManager.applyCower(creature, 25)

    expect(result.success).toBe(false)
    expect(game.players.PLAYER1.morale).toBe(moraleBefore)
  })
})

describe('CommanderAbilityManager.getAdjacentTappedEnemies', () => {
  it('finds a tapped enemy in one of the 8 adjacent tiles', () => {
    const game = createTestGame()
    const defender = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const enemy = placeCreature(game, 'PLAYER2', testCreature(), 6, 5)
    enemy.isTapped = true

    const result = game.abilityManager.getAdjacentTappedEnemies(defender)

    expect(result).toEqual([enemy])
  })

  it('excludes adjacent enemies that are not tapped', () => {
    const game = createTestGame()
    const defender = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    placeCreature(game, 'PLAYER2', testCreature(), 6, 5) // untapped

    const result = game.abilityManager.getAdjacentTappedEnemies(defender)

    expect(result).toEqual([])
  })

  it('excludes tapped allies (same owner)', () => {
    const game = createTestGame()
    const defender = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const ally = placeCreature(game, 'PLAYER1', testCreature(), 6, 5)
    ally.isTapped = true

    const result = game.abilityManager.getAdjacentTappedEnemies(defender)

    expect(result).toEqual([])
  })

  it('excludes tapped enemies that are not adjacent', () => {
    const game = createTestGame()
    const defender = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const farEnemy = placeCreature(game, 'PLAYER2', testCreature(), 8, 8)
    farEnemy.isTapped = true

    const result = game.abilityManager.getAdjacentTappedEnemies(defender)

    expect(result).toEqual([])
  })
})

describe('CommanderAbilityManager.isAttackerAdjacent', () => {
  it('is true for orthogonally adjacent positions', () => {
    const game = createTestGame()
    const defender = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const attacker = placeCreature(game, 'PLAYER2', testCreature(), 5, 6)

    expect(game.abilityManager.isAttackerAdjacent(defender, attacker)).toBe(true)
  })

  it('is true for diagonally adjacent positions', () => {
    const game = createTestGame()
    const defender = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const attacker = placeCreature(game, 'PLAYER2', testCreature(), 6, 6)

    expect(game.abilityManager.isAttackerAdjacent(defender, attacker)).toBe(true)
  })

  it('is false for the same position', () => {
    const game = createTestGame()
    const defender = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const attacker = placeCreature(game, 'PLAYER2', testCreature(), 5, 5)

    expect(game.abilityManager.isAttackerAdjacent(defender, attacker)).toBe(false)
  })

  it('is false for non-adjacent positions', () => {
    const game = createTestGame()
    const defender = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const attacker = placeCreature(game, 'PLAYER2', testCreature(), 8, 5)

    expect(game.abilityManager.isAttackerAdjacent(defender, attacker)).toBe(false)
  })
})
