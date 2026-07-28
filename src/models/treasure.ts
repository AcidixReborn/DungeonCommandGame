// Treasure/Morale Token System
// Based on Dungeon Command board game mechanics

export interface Position {
  x: number
  y: number
}

export interface TreasureOptions {
  id: string
  owner: string
  moraleValue: number
  position: Position
}

/**
 * Treasure class representing morale tokens on the board
 *
 * Token System:
 * - Each faction has 6 tokens: 2x"1", 2x"2", 2x"3"
 * - Each faction draws 3 random tokens at game setup
 * - Tokens are placed on board (hidden value until discovered)
 * - Any faction can collect morale from any treasure
 *
 * Collection Mechanics:
 * - Moving onto treasure reveals the morale value
 * - Collecting morale uses creature's ACTION (not movement)
 * - Collect 1 morale per action
 * - Creature is tapped after collecting
 * - Treasure removed immediately when depleted (0 morale remaining)
 *
 * Big O Complexity:
 * - Construction: O(1)
 * - Reveal: O(1)
 * - Collect: O(1)
 */
export class Treasure {
  id: string
  owner: string
  moraleValue: number
  remainingMorale: number
  position: Position
  isRevealed: boolean

  constructor({ id, owner, moraleValue, position }: TreasureOptions) {
    this.id = id // Unique identifier
    this.owner = owner // Which faction placed it (for tracking only)
    this.moraleValue = moraleValue // Total morale (1, 2, or 3)
    this.remainingMorale = moraleValue // Current morale left
    this.position = position // { x, y } on board
    this.isRevealed = false // False until first creature lands on it
  }

  /**
   * Reveal the treasure value
   * O(1) - Constant time operation
   */
  reveal(): void {
    this.isRevealed = true
  }

  /**
   * Collect 1 morale from treasure
   * Returns true if treasure is now depleted (should be removed)
   * O(1) - Constant time operation
   */
  collectMorale(): boolean {
    if (this.remainingMorale <= 0) {
      return true // Already depleted
    }

    this.remainingMorale -= 1
    return this.remainingMorale === 0 // Return true if now depleted
  }

  /**
   * Check if treasure is depleted
   * O(1) - Constant time operation
   */
  isDepleted(): boolean {
    return this.remainingMorale <= 0
  }

  /**
   * Get display string for treasure
   * Before reveal: Shows only icon
   * After reveal: Shows remaining/total (e.g., "2/3")
   * O(1) - Constant time operation
   */
  getDisplayString(): string {
    if (!this.isRevealed) {
      return '?' // Hidden value
    }
    return `${this.remainingMorale}/${this.moraleValue}`
  }
}

/**
 * Generate token pool for a faction
 * Returns array of 6 tokens: [1, 1, 2, 2, 3, 3]
 * O(1) - Fixed size array
 */
export function createTokenPool(): number[] {
  return [1, 1, 2, 2, 3, 3]
}

/**
 * Draw 3 random tokens from pool
 * Uses Fisher-Yates shuffle for O(n) random selection
 * Since n=6 (constant), this is effectively O(1)
 *
 * @param pool - Token pool [1,1,2,2,3,3]
 * @returns 3 randomly drawn token values
 */
export function drawTokens(pool: number[]): number[] {
  // Create copy to avoid mutating original
  const shuffled = [...pool]

  // Fisher-Yates shuffle - O(n) where n=6
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Return first 3 tokens - O(1)
  return shuffled.slice(0, 3)
}

export default Treasure
