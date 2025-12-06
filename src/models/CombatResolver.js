/**
 * CombatResolver - Handles all combat-related calculations and validation
 *
 * Extracted from gameState.js to follow Single Responsibility Principle.
 * This class manages:
 * - Attack validation (range, line of sight, creature state)
 * - Attack execution and damage resolution
 * - Target acquisition
 * - Line of sight calculations
 *
 * Big O Complexity Summary:
 * - validateAttack: O(1) for melee, O(n) for ranged where n = tiles in line
 * - executeAttack: O(c) where c = creatures in play (for removal)
 * - getValidAttackTargets: O(p * c) where p = players, c = creatures per player
 * - hasLineOfSight: O(n) where n = tiles between attacker and target
 */

import { COMBAT, TERRAIN } from '../constants/gameConstants.js'
import { TerrainTypes } from './Board.js'

/**
 * CombatResolver class
 * Requires a reference to gameState for accessing game data
 */
export class CombatResolver {
  /**
   * @param {GameState} gameState - Reference to the main game state
   */
  constructor(gameState) {
    this.gameState = gameState
  }

  /**
   * Validate an attack before execution
   * Checks creature state, range, terrain restrictions, and line of sight
   *
   * Big O Complexity: O(1) for melee, O(n) for ranged where n = tiles in line
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @returns {Object} { valid: boolean, error?: string, damage?: number }
   */
  validateAttack(attackerInstance, defenderInstance, attackType = 'melee') {
    // Safety check: ensure both creatures have valid positions
    if (!attackerInstance?.position || !defenderInstance?.position) {
      return { valid: false, error: 'Cannot attack: invalid creature position' }
    }

    // Cannot attack if tapped
    if (attackerInstance.isTapped) {
      return { valid: false, error: 'Cannot attack: creature is tapped' }
    }

    // Cannot attack if already attacked this turn
    if (attackerInstance.hasAttackedThisTurn) {
      return { valid: false, error: 'Cannot attack: creature has already attacked this turn' }
    }

    // Validate melee attack: must be adjacent (distance <= meleeRange, default 1)
    if (attackType === 'melee') {
      const distance = this.gameState.getDistance(attackerInstance.position, defenderInstance.position)
      const meleeRange = attackerInstance.creature.meleeAttack?.range || COMBAT.MELEE_RANGE
      if (distance > meleeRange) {
        console.log(`[validateAttack] BLOCKED: Melee attack invalid - distance ${distance} > meleeRange ${meleeRange}`)
        return { valid: false, error: 'Cannot attack: target is not in melee range' }
      }
    }

    // Validate ranged attack: check distance, forest restrictions, and line-of-sight
    if (attackType === 'ranged') {
      const distance = this.gameState.getDistance(attackerInstance.position, defenderInstance.position)
      const rangedRange = attackerInstance.creature.rangedAttack?.range || 0

      // Check distance is within range
      if (distance > rangedRange) {
        console.log(`[validateAttack] BLOCKED: Ranged attack invalid - distance ${distance} > rangedRange ${rangedRange}`)
        return { valid: false, error: 'Cannot attack: target is out of range' }
      }

      // Check forest restrictions - cannot shoot FROM forest
      const attackerTile = this.gameState.getTile(attackerInstance.position.x, attackerInstance.position.y)
      if (attackerTile?.terrain === TerrainTypes.FOREST) {
        console.log(`[validateAttack] BLOCKED: Cannot make ranged attack from forest`)
        return { valid: false, error: 'Cannot make ranged attack from forest' }
      }

      // Check forest restrictions - cannot shoot AT target in forest
      const targetTile = this.gameState.getTile(defenderInstance.position.x, defenderInstance.position.y)
      if (targetTile?.terrain === TerrainTypes.FOREST) {
        console.log(`[validateAttack] BLOCKED: Cannot make ranged attack at target in forest`)
        return { valid: false, error: 'Cannot make ranged attack at target in forest' }
      }

      // Check line of sight - O(n) where n = tiles between attacker and target
      if (!this.hasLineOfSight(attackerInstance, defenderInstance, attackerInstance.owner)) {
        console.log(`[validateAttack] BLOCKED: No line of sight to target`)
        return { valid: false, error: 'Cannot attack: no line of sight to target' }
      }
    }

    // Calculate damage based on attack type
    let damage = 0
    if (attackType === 'melee' && attackerInstance.creature.meleeAttack) {
      damage = attackerInstance.creature.meleeAttack.damage
    } else if (attackType === 'ranged' && attackerInstance.creature.rangedAttack) {
      damage = attackerInstance.creature.rangedAttack.damage
    } else {
      return { valid: false, error: 'Invalid attack type' }
    }

    return { valid: true, damage }
  }

  /**
   * Execute an attack from one creature to another
   *
   * Big O Complexity: O(c) where c = creatures in play (for removal)
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @returns {Object} Attack result
   */
  executeAttack(attackerInstance, defenderInstance, attackType = 'melee') {
    // Validate the attack
    const validation = this.validateAttack(attackerInstance, defenderInstance, attackType)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    const damage = validation.damage

    // Mark as attacked
    attackerInstance.hasAttackedThisTurn = true

    // Check if creature has FLASHING BLADES (melee only) - defer tapping until ability resolves
    const hasFlashingBlades = attackType === 'melee' &&
      this.gameState.hasFlashingBlades &&
      this.gameState.hasFlashingBlades(attackerInstance)

    // Tap the creature if it has both moved AND attacked
    // UNLESS it has FLASHING BLADES (will be tapped after ability resolves)
    if (attackerInstance.hasMovedThisTurn && !hasFlashingBlades) {
      attackerInstance.tap()
    }

    // Use the combat resolution (includes +1 morale on kill)
    const result = this.resolveAttack(attackerInstance, defenderInstance, damage)

    return {
      success: true,
      ...result,
      attackType,
      damage,
      pendingFlashingBlades: hasFlashingBlades
    }
  }

  /**
   * Execute attack with defense options (COWER or UNSTOPPABLE HORDES)
   * Supports both:
   * - COWER: Avoid ALL damage (damageReduction equals original damage)
   * - UNSTOPPABLE HORDES: Reduce damage by specific amount (can stack)
   *
   * Big O Complexity: O(c) where c = creatures in play for defender (for removal)
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {number} damageReduction - Amount to reduce damage by
   * @param {string} defenseType - 'cower' | 'unstoppable_hordes' | null
   * @returns {Object} Attack result
   */
  executeAttackWithDefense(attackerInstance, defenderInstance, attackType = 'melee', damageReduction = 0, defenseType = null) {
    // Validate the attack using shared validation logic
    const validation = this.validateAttack(attackerInstance, defenderInstance, attackType)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    // Apply damage reduction from defense
    const originalDamage = validation.damage
    const damage = Math.max(0, originalDamage - damageReduction)

    // Mark as attacked
    attackerInstance.hasAttackedThisTurn = true

    // Check if creature has FLASHING BLADES (melee only) - defer tapping until ability resolves
    const hasFlashingBlades = attackType === 'melee' &&
      this.gameState.hasFlashingBlades &&
      this.gameState.hasFlashingBlades(attackerInstance)

    // Tap the creature if it has both moved AND attacked
    // UNLESS it has FLASHING BLADES (will be tapped after ability resolves)
    if (attackerInstance.hasMovedThisTurn && !hasFlashingBlades) {
      attackerInstance.tap()
    }

    // Use the combat resolution (includes +1 morale on kill)
    const result = this.resolveAttack(attackerInstance, defenderInstance, damage)

    return {
      success: true,
      ...result,
      attackType,
      damage,
      originalDamage,
      damageReduced: damageReduction,
      defenseUsed: defenseType,
      pendingFlashingBlades: hasFlashingBlades
    }
  }

  /**
   * Resolve attack damage and handle creature death
   * CUSTOM RULE: Killing a creature grants +1 morale to attacker's owner
   *
   * Big O Complexity: O(c) where c = creatures in play (for removal via findIndex)
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {number} damageAmount - Damage to apply
   * @returns {Object} Resolution result
   */
  resolveAttack(attackerInstance, defenderInstance, damageAmount) {
    const attackerOwner = attackerInstance.owner
    const defenderOwner = defenderInstance.owner

    // Apply damage to defender
    const wasDestroyed = defenderInstance.takeDamage(damageAmount)

    if (wasDestroyed) {
      // Clear the tile occupant first
      if (defenderInstance.position) {
        const tile = this.gameState.getTile(defenderInstance.position.x, defenderInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const defenderPlayer = this.gameState.players[defenderOwner]
      const index = defenderPlayer.creaturesInPlay.findIndex(c => c.instanceId === defenderInstance.instanceId)
      if (index !== -1) {
        defenderPlayer.creaturesInPlay.splice(index, 1)
      }

      // Defender loses morale equal to creature's level
      defenderPlayer.loseMorale(defenderInstance.creature.level)

      // CUSTOM RULE: Attacker gains +1 morale
      const attackerPlayer = this.gameState.players[attackerOwner]
      attackerPlayer.gainMorale(1)

      // BLOODTHIRSTY ability: Gain +1 Leadership on kill (Curse of Undeath)
      let leadershipGained = 0
      if (this.gameState.hasCommanderAbility(attackerOwner, 'bloodthirsty')) {
        if (attackerPlayer.commander && attackerPlayer.commander.faction === 'Curse of Undeath') {
          attackerPlayer.leadership = (attackerPlayer.leadership || 0) + 1
          leadershipGained = 1
        }
      }

      return {
        destroyed: true,
        damage: damageAmount,
        moraleChange: {
          attacker: +1,
          defender: -defenderInstance.creature.level
        },
        bloodthirsty: leadershipGained > 0 ? { leadershipGained } : null
      }
    }

    return {
      destroyed: false,
      damage: damageAmount,
      moraleChange: null
    }
  }

  /**
   * Get all valid attack targets for a creature
   * Also tracks ranged attack restriction statistics for testing
   *
   * Ranged Attack Restrictions:
   * 1. Cannot shoot FROM forest - creature on forest can only melee
   * 2. Cannot shoot AT forest - creature on forest cannot be ranged attacked
   * 3. Cannot shoot adjacent targets - must use melee for adjacent enemies
   * 4. Line of sight - cannot shoot through enemy creatures (allies don't block)
   *
   * Big O Complexity: O(p * c) where p = active players, c = creatures per player
   *
   * @param {CreatureInstance} creatureInstance - The attacking creature
   * @param {Object} trackStats - Optional stats tracking object
   * @returns {Array} Array of valid targets
   */
  getValidAttackTargets(creatureInstance, trackStats = null) {
    if (!creatureInstance.position) return []

    const targets = []
    const attackerOwner = creatureInstance.owner
    const hasMelee = creatureInstance.creature.meleeAttack !== null
    const hasRanged = creatureInstance.creature.rangedAttack !== null
    const rangedRange = hasRanged ? creatureInstance.creature.rangedAttack.range : 0
    const meleeRange = hasMelee ? (creatureInstance.creature.meleeAttack.range || 1) : 0

    // Ranged restriction #1: Check if attacker is on forest
    const attackerTile = this.gameState.getTile(creatureInstance.position.x, creatureInstance.position.y)
    const attackerOnForest = attackerTile?.terrain === TerrainTypes.FOREST

    // Find all enemy creatures
    for (const playerId of this.gameState.activePlayers) {
      if (playerId === attackerOwner) continue // Skip own creatures

      const player = this.gameState.players[playerId]
      for (const enemyCreature of player.creaturesInPlay) {
        if (!enemyCreature.position) continue

        // Skip creatures that were deployed this turn (protected from attacks)
        if (enemyCreature.deployedThisTurn) continue

        const distance = this.gameState.getDistance(creatureInstance.position, enemyCreature.position)
        const isAdjacent = distance === 1

        // Ranged restriction #2: Check if target is on forest
        const targetTile = this.gameState.getTile(enemyCreature.position.x, enemyCreature.position.y)
        const targetOnForest = targetTile?.terrain === TerrainTypes.FOREST

        // Melee attack: adjacent range only
        if (hasMelee && distance <= meleeRange) {
          targets.push({
            creature: enemyCreature,
            attackType: 'melee',
            distance
          })
        }

        // Ranged attack: check all restrictions
        if (hasRanged && distance > 0 && distance <= rangedRange) {
          // Restriction #1: Cannot shoot FROM forest
          if (attackerOnForest) {
            if (trackStats) trackStats.rangedBlockedByForestAttacker++
            continue
          }

          // Restriction #3: Cannot shoot adjacent targets with ranged
          if (isAdjacent) {
            if (trackStats) {
              trackStats.rangedBlockedByAdjacent++
              if (!hasMelee) {
                trackStats.rangedOnlyCreaturesBlocked++
              }
            }
            continue
          }

          // Restriction #2: Cannot shoot at creatures on forest
          if (targetOnForest) {
            if (trackStats) trackStats.rangedBlockedByForestTarget++
            continue
          }

          // Restriction #4: Check line of sight
          if (this.hasLineOfSight(creatureInstance, enemyCreature, attackerOwner)) {
            targets.push({
              creature: enemyCreature,
              attackType: 'ranged',
              distance
            })
          } else {
            if (trackStats) trackStats.rangedBlockedByLineOfSight++
          }
        }
      }
    }

    return targets
  }

  /**
   * Check if there's a clear line of sight between attacker and target
   * Forest terrain and enemy creatures block line of sight, but allied creatures do not
   *
   * Big O Complexity: O(n) where n = tiles between attacker and target
   *
   * @param {CreatureInstance} attacker - The attacking creature
   * @param {CreatureInstance} target - The target creature
   * @param {string} attackerOwner - Owner ID of the attacker
   * @returns {boolean} True if line of sight is clear
   */
  hasLineOfSight(attacker, target, attackerOwner) {
    const from = attacker.position
    const to = target.position

    // Get all tiles along the line between attacker and target
    const lineTiles = this.gameState.getLineTiles(from, to)

    // Check each tile for blocking forest terrain or enemy creatures
    for (const pos of lineTiles) {
      const tile = this.gameState.getTile(pos.x, pos.y)

      // Skip start and end positions
      if ((pos.x === from.x && pos.y === from.y) || (pos.x === to.x && pos.y === to.y)) {
        continue
      }

      // Forest terrain blocks line of sight
      if (tile?.terrain === TerrainTypes.FOREST) {
        return false
      }

      // Mountain terrain blocks line of sight
      if (tile?.terrain === TerrainTypes.MOUNTAIN) {
        return false
      }

      // If there's an enemy creature on this tile, line of sight is blocked
      if (tile?.occupant && tile.occupant.owner !== attackerOwner) {
        return false
      }
    }

    return true
  }

  /**
   * Get all tiles within ranged attack range for a creature, with line-of-sight info
   * Used for the ranged attack preview overlay
   *
   * Big O Complexity: O((2R+1)^2 * n) where R = range, n = tiles in line
   * For range 5: O(121 * 5) = O(605)
   *
   * @param {CreatureInstance} creatureInstance - The creature to check range for
   * @returns {Array} Array of {x, y, hasLOS, blockReason} for tiles in range
   */
  getRangedAttackRangeTiles(creatureInstance) {
    if (!creatureInstance?.position) return []
    if (!creatureInstance.creature.rangedAttack) return []

    const rangeTiles = []
    const pos = creatureInstance.position
    const range = creatureInstance.creature.rangedAttack.range
    const attackerOwner = creatureInstance.owner

    // Check if attacker is on forest (can't use ranged from forest)
    const attackerTile = this.gameState.getTile(pos.x, pos.y)
    const attackerOnForest = attackerTile?.terrain === TerrainTypes.FOREST

    // Calculate bounding box for range (avoids iterating entire board)
    const minX = Math.max(0, pos.x - range)
    const maxX = Math.min(this.gameState.boardWidth - 1, pos.x + range)
    const minY = Math.max(0, pos.y - range)
    const maxY = Math.min(this.gameState.boardHeight - 1, pos.y + range)

    // Only iterate tiles within range bounds
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Skip own position
        if (x === pos.x && y === pos.y) continue

        const distance = this.gameState.getDistance(pos, { x, y })

        // Skip if out of range
        if (distance > range) continue

        // Skip adjacent tiles (melee zone, can't use ranged)
        if (distance <= 1) continue

        const tile = this.gameState.getTile(x, y)
        let hasLOS = true
        let blockReason = null

        // Check blocking reasons
        if (attackerOnForest) {
          hasLOS = false
          blockReason = 'attacker_in_forest'
        } else if (tile?.terrain === TerrainTypes.FOREST) {
          hasLOS = false
          blockReason = 'target_forest'
        } else if (tile?.terrain === TerrainTypes.MOUNTAIN) {
          hasLOS = false
          blockReason = 'target_mountain'
        } else {
          // Check line of sight using Bresenham's line
          const lineTiles = this.gameState.getLineTiles(pos, { x, y })
          for (const linePos of lineTiles) {
            // Skip start and end positions
            if ((linePos.x === pos.x && linePos.y === pos.y) || (linePos.x === x && linePos.y === y)) {
              continue
            }

            const lineTile = this.gameState.getTile(linePos.x, linePos.y)

            // Forest blocks LOS
            if (lineTile?.terrain === TerrainTypes.FOREST) {
              hasLOS = false
              blockReason = 'forest_blocking'
              break
            }

            // Mountain blocks LOS
            if (lineTile?.terrain === TerrainTypes.MOUNTAIN) {
              hasLOS = false
              blockReason = 'mountain_blocking'
              break
            }

            // Enemy creature blocks LOS
            if (lineTile?.occupant && lineTile.occupant.owner !== attackerOwner) {
              hasLOS = false
              blockReason = 'enemy_blocking'
              break
            }
          }
        }

        rangeTiles.push({ x, y, hasLOS, blockReason })
      }
    }

    return rangeTiles
  }
}

export default CombatResolver
