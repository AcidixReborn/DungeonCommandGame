// Characterization tests for PlayerState/GameState core flows — morale accounting and
// win-condition detection — before the TypeScript migration touches these classes.
import { describe, it, expect } from 'vitest'
import { createTestGame } from './testHelpers.js'

describe('PlayerState morale accounting', () => {
  it('loseMorale clamps at 0 and reports defeat', () => {
    const game = createTestGame()
    const player = game.players.PLAYER1
    player.morale = 5

    const defeated = player.loseMorale(20)

    expect(player.morale).toBe(0)
    expect(defeated).toBe(true)
  })

  it('loseMorale does not report defeat while morale remains', () => {
    const game = createTestGame()
    const player = game.players.PLAYER1
    player.morale = 20

    const defeated = player.loseMorale(5)

    expect(player.morale).toBe(15)
    expect(defeated).toBe(false)
  })

  it('gainMorale adds without an upper cap', () => {
    const game = createTestGame()
    const player = game.players.PLAYER1
    player.morale = 20

    player.gainMorale(5)

    expect(player.morale).toBe(25)
  })

  it('treats NaN/undefined amounts as a no-op rather than corrupting morale', () => {
    const game = createTestGame()
    const player = game.players.PLAYER1
    player.morale = 20

    player.loseMorale(undefined)
    player.gainMorale(NaN)

    expect(player.morale).toBe(20)
  })
})

describe('PlayerState.isDefeated', () => {
  it('is defeated immediately once morale reaches 0, regardless of turn number', () => {
    const game = createTestGame()
    const player = game.players.PLAYER1
    player.morale = 0

    expect(player.isDefeated(1)).toBe(true)
  })

  it('is not defeated by an empty battlefield on turn 1 (grace period to deploy)', () => {
    const game = createTestGame()
    const player = game.players.PLAYER1
    player.morale = 20
    player.creaturesInPlay = []

    expect(player.isDefeated(1)).toBe(false)
  })

  it('is defeated by an empty battlefield after turn 1', () => {
    const game = createTestGame()
    const player = game.players.PLAYER1
    player.morale = 20
    player.creaturesInPlay = []

    expect(player.isDefeated(2)).toBe(true)
  })
})

describe('GameState.checkGameOver', () => {
  it('declares the surviving player the winner when the other is defeated', () => {
    const game = createTestGame()
    game.players.PLAYER1.morale = 0

    game.checkGameOver()

    expect(game.gameOver).toBe(true)
    expect(game.winner).toBe('PLAYER2')
  })

  it('does not end the game while two or more players remain undefeated', () => {
    const game = createTestGame()
    game.players.PLAYER1.morale = 10
    game.players.PLAYER2.morale = 10

    game.checkGameOver()

    expect(game.gameOver).toBe(false)
    expect(game.winner).toBeNull()
  })

  it('awards the win to the higher-morale player when all players are defeated simultaneously', () => {
    const game = createTestGame()
    // Simulate a double-defeat by creature elimination past turn 1, with differing morale
    game.turnNumber = 2
    game.players.PLAYER1.creaturesInPlay = []
    game.players.PLAYER2.creaturesInPlay = []
    game.players.PLAYER1.morale = 4
    game.players.PLAYER2.morale = 7

    game.checkGameOver()

    expect(game.gameOver).toBe(true)
    expect(game.winner).toBe('PLAYER2')
  })
})
