// Characterization tests for SimpleAI — locks in the documented 0/0/100 difficulty-gate
// pattern (docs/Order-Card-Implementation-Plan.md) and basic targeting logic before the
// TypeScript migration touches this file.
import { describe, it, expect } from 'vitest'
import SimpleAI from '../ai/simpleAI.js'
import { createTestGame, placeCreature, testCreature } from './testHelpers.js'

describe('SimpleAI difficulty gates', () => {
  it.each(['easy', 'medium', 'hard'])(
    'canUseCreatureAbilities is false only for easy (%s)',
    (difficulty) => {
      const game = createTestGame()
      const ai = new SimpleAI(game, 'PLAYER1', null, difficulty)
      expect(ai.canUseCreatureAbilities()).toBe(difficulty !== 'easy')
    }
  )

  it.each(['easy', 'medium', 'hard'])(
    'canUseImmediateCards is true only for hard (%s)',
    (difficulty) => {
      const game = createTestGame()
      const ai = new SimpleAI(game, 'PLAYER1', null, difficulty)
      expect(ai.canUseImmediateCards()).toBe(difficulty === 'hard')
    }
  )

  it.each(['easy', 'medium', 'hard'])(
    'canUseDamageBoostCards is true only for hard (%s)',
    (difficulty) => {
      const game = createTestGame()
      const ai = new SimpleAI(game, 'PLAYER1', null, difficulty)
      expect(ai.canUseDamageBoostCards()).toBe(difficulty === 'hard')
    }
  )

  it.each(['easy', 'medium', 'hard'])(
    'canUseOrderCards is true only for hard (%s)',
    (difficulty) => {
      const game = createTestGame()
      const ai = new SimpleAI(game, 'PLAYER1', null, difficulty)
      expect(ai.canUseOrderCards()).toBe(difficulty === 'hard')
    }
  )
})

describe('SimpleAI.selectWeakestTarget', () => {
  it('picks the target with the lowest current HP', () => {
    const game = createTestGame()
    const attacker = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const strong = placeCreature(game, 'PLAYER2', testCreature({ hitPoints: 100 }), 6, 5)
    const weak = placeCreature(game, 'PLAYER2', testCreature({ hitPoints: 100 }), 6, 6)
    weak.currentHP = 10

    const ai = new SimpleAI(game, 'PLAYER1', null, 'easy')
    const targets = [
      { creature: strong, attackType: 'melee', distance: 1 },
      { creature: weak, attackType: 'melee', distance: 1 },
    ]

    const selected = ai.selectWeakestTarget(targets, attacker)

    expect(selected.creature).toBe(weak)
  })
})

describe('SimpleAI.getAdjacentEnemies', () => {
  it('returns enemy creatures in the 8 adjacent tiles, excluding allies and non-adjacent enemies', () => {
    const game = createTestGame()
    const creature = placeCreature(game, 'PLAYER1', testCreature(), 5, 5)
    const adjacentEnemy = placeCreature(game, 'PLAYER2', testCreature(), 6, 6)
    placeCreature(game, 'PLAYER1', testCreature(), 5, 6) // ally, adjacent
    placeCreature(game, 'PLAYER2', testCreature(), 9, 9) // enemy, not adjacent

    const ai = new SimpleAI(game, 'PLAYER1', null, 'easy')
    const result = ai.getAdjacentEnemies(creature)

    expect(result).toHaveLength(1)
    expect(result[0].creature).toBe(adjacentEnemy)
    expect(result[0].owner).toBe('PLAYER2')
  })
})
