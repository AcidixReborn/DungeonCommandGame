// Characterization tests for CombatResolver — locks in current combat behavior
// (damage math, range/LOS validation, defense reductions, kill resolution) before
// the TypeScript migration touches this file.
import { describe, it, expect } from 'vitest'
import { createTestGame, placeCreature, testCreature } from './testHelpers.js'
import { TerrainTypes } from '../models/Board.js'

describe('CombatResolver.validateAttack', () => {
  it('allows a melee attack within range and reports base damage', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 20, range: 1 } }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature(), 6, 5)

    const result = game.combatResolver.validateAttack(attacker, defender, 'melee')

    expect(result.valid).toBe(true)
    expect(result.damage).toBe(20)
    expect(result.baseDamage).toBe(20)
  })

  it('rejects a melee attack outside range', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 20, range: 1 } }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature(), 8, 5)

    const result = game.combatResolver.validateAttack(attacker, defender, 'melee')

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not in melee range/)
  })

  it('rejects an attack from a tapped creature', () => {
    const game = createTestGame()
    const attacker = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    attacker.isTapped = true
    const defender = placeCreature(game, 'PLAYER2', testCreature(), 6, 5)

    const result = game.combatResolver.validateAttack(attacker, defender, 'melee')

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/tapped/)
  })

  it('honors REACH by allowing melee attacks beyond range 1', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 20, range: 1 }, reach: 2 }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature(), 7, 5)

    const result = game.combatResolver.validateAttack(attacker, defender, 'melee')

    expect(result.valid).toBe(true)
  })

  it('rejects a ranged attack out of range', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: null, rangedAttack: { damage: 15, range: 3 } }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature(), 10, 5)

    const result = game.combatResolver.validateAttack(attacker, defender, 'ranged')

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/out of range/)
  })

  it('rejects a ranged attack made from a forest tile', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: null, rangedAttack: { damage: 15, range: 5 } }),
      5,
      5
    )
    game.getTile(5, 5).terrain = TerrainTypes.FOREST
    const defender = placeCreature(game, 'PLAYER2', testCreature(), 8, 5)

    const result = game.combatResolver.validateAttack(attacker, defender, 'ranged')

    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/forest/)
  })

  it('flat damage boost (Killing Strike) replaces base damage and ignores bonuses', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 20, range: 1 } }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature(), 6, 5)

    const result = game.combatResolver.validateAttack(attacker, defender, 'melee', 0, 100)

    expect(result.valid).toBe(true)
    expect(result.damage).toBe(100)
    expect(result.usedFlatDamage).toBe(true)
  })
})

describe('CombatResolver.executeAttack / resolveAttack', () => {
  it('applies damage to the defender and taps the attacker if it moved this turn', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 20, range: 1 } }),
      5,
      5
    )
    attacker.hasMovedThisTurn = true
    const defender = placeCreature(game, 'PLAYER2', testCreature({ hitPoints: 50 }), 6, 5)

    const result = game.combatResolver.executeAttack(attacker, defender, 'melee')

    expect(result.success).toBe(true)
    expect(defender.currentHP).toBe(30)
    expect(attacker.isTapped).toBe(true)
  })

  it('reduces damage by the given damageReduction (defense)', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 20, range: 1 } }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature({ hitPoints: 50 }), 6, 5)

    const result = game.combatResolver.executeAttack(attacker, defender, 'melee', 'medium', 15)

    expect(result.success).toBe(true)
    expect(result.damage).toBe(5)
    expect(defender.currentHP).toBe(45)
  })

  it('never applies negative damage when reduction exceeds the attack', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 20, range: 1 } }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature({ hitPoints: 50 }), 6, 5)

    const result = game.combatResolver.executeAttack(attacker, defender, 'melee', 'medium', 999)

    expect(result.damage).toBe(0)
    expect(defender.currentHP).toBe(50)
  })

  it('destroys the defender, moves the card to the graveyard, and applies the +1 morale custom rule', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 50, range: 1 } }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature({ hitPoints: 30, level: 3 }), 6, 5)

    const attackerMoraleBefore = game.players.PLAYER1.morale
    const defenderMoraleBefore = game.players.PLAYER2.morale

    const result = game.combatResolver.executeAttack(attacker, defender, 'melee')

    expect(result.destroyed).toBe(true)
    expect(game.players.PLAYER2.creaturesInPlay).not.toContain(defender)
    expect(game.players.PLAYER2.creatureGraveyard).toContain(defender.creature)
    expect(game.players.PLAYER1.morale).toBe(attackerMoraleBefore + 1)
    expect(game.players.PLAYER2.morale).toBe(defenderMoraleBefore - 3) // loses morale = defender's level
    expect(game.getTile(6, 5).occupant).toBeNull()
  })

  it('rejects an attack that fails validation (e.g. out of range) without mutating state', () => {
    const game = createTestGame()
    const attacker = placeCreature(
      game,
      'PLAYER1',
      testCreature({ meleeAttack: { damage: 20, range: 1 } }),
      5,
      5
    )
    const defender = placeCreature(game, 'PLAYER2', testCreature({ hitPoints: 50 }), 10, 10)

    const result = game.combatResolver.executeAttack(attacker, defender, 'melee')

    expect(result.success).toBe(false)
    expect(defender.currentHP).toBe(50)
  })
})

describe('CombatResolver.hasLineOfSight', () => {
  it('is clear with no obstructions between attacker and target', () => {
    const game = createTestGame()
    const attacker = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const target = placeCreature(game, 'PLAYER2', testCreature(), 5, 8)

    expect(game.combatResolver.hasLineOfSight(attacker, target, 'PLAYER1')).toBe(true)
  })

  it('is blocked by a forest tile directly between attacker and target', () => {
    const game = createTestGame()
    const attacker = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const target = placeCreature(game, 'PLAYER2', testCreature(), 5, 8)
    game.getTile(5, 6).terrain = TerrainTypes.FOREST

    expect(game.combatResolver.hasLineOfSight(attacker, target, 'PLAYER1')).toBe(false)
  })

  it('is blocked by an enemy creature standing between attacker and target', () => {
    const game = createTestGame()
    const attacker = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const target = placeCreature(game, 'PLAYER2', testCreature(), 5, 8)
    placeCreature(game, 'PLAYER2', testCreature(), 5, 6)

    expect(game.combatResolver.hasLineOfSight(attacker, target, 'PLAYER1')).toBe(false)
  })
})
