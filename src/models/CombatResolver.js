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

    // Validate melee attack: must be within melee range (including REACH ability)
    if (attackType === 'melee') {
      const distance = this.gameState.getDistance(attackerInstance.position, defenderInstance.position)
      const baseMeleeRange = attackerInstance.creature.meleeAttack?.range || COMBAT.MELEE_RANGE
      // REACH ability: Creatures with reach property can melee attack at extended range
      // e.g., reach: 2 allows melee attacks at range 1 OR 2
      const creatureReach = attackerInstance.creature.reach || 0
      const meleeRange = Math.max(baseMeleeRange, creatureReach)

      if (distance > meleeRange) {
        return { valid: false, error: 'Cannot attack: target is not in melee range' }
      }
    }

    // Validate ranged attack: check distance, forest restrictions, and line-of-sight
    if (attackType === 'ranged') {
      const distance = this.gameState.getDistance(attackerInstance.position, defenderInstance.position)
      const rangedRange = attackerInstance.creature.rangedAttack?.range || 0

      // Check distance is within range
      if (distance > rangedRange) {
        return { valid: false, error: 'Cannot attack: target is out of range' }
      }

      // Check forest restrictions - cannot shoot FROM forest
      const attackerTile = this.gameState.getTile(attackerInstance.position.x, attackerInstance.position.y)
      if (attackerTile?.terrain === TerrainTypes.FOREST) {
        return { valid: false, error: 'Cannot make ranged attack from forest' }
      }

      // Check forest restrictions - cannot shoot AT target in forest
      const targetTile = this.gameState.getTile(defenderInstance.position.x, defenderInstance.position.y)
      if (targetTile?.terrain === TerrainTypes.FOREST) {
        return { valid: false, error: 'Cannot make ranged attack at target in forest' }
      }

      // Check line of sight - O(n) where n = tiles between attacker and target
      if (!this.hasLineOfSight(attackerInstance, defenderInstance, attackerInstance.owner)) {
        return { valid: false, error: 'Cannot attack: no line of sight to target' }
      }
    }

    // Calculate damage based on attack type
    let damage = 0
    let baseDamage = 0
    let flankingBonus = 0
    let cutterBonus = 0

    if (attackType === 'melee' && attackerInstance.creature.meleeAttack) {
      baseDamage = attackerInstance.creature.meleeAttack.damage
      // Check for FLANKING bonus (only on melee primary attacks)
      if (this.gameState.hasFlanking && this.gameState.getFlankingBonus) {
        flankingBonus = this.gameState.getFlankingBonus(attackerInstance, defenderInstance)
      }
      // Check for CUTTER bonus (+10 vs tapped creatures)
      if (this.gameState.hasCutter && this.gameState.getCutterBonus) {
        cutterBonus = this.gameState.getCutterBonus(attackerInstance, defenderInstance)
      }
      damage = baseDamage + flankingBonus + cutterBonus
    } else if (attackType === 'ranged' && attackerInstance.creature.rangedAttack) {
      baseDamage = attackerInstance.creature.rangedAttack.damage
      damage = baseDamage
    } else {
      return { valid: false, error: 'Invalid attack type' }
    }

    return { valid: true, damage, baseDamage, flankingBonus, cutterBonus }
  }

  /**
   * Execute an attack from one creature to another
   * Supports optional defense (COWER, UNSTOPPABLE HORDES, etc.)
   *
   * Big O Complexity: O(c) where c = creatures in play (for removal)
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {string} aiDifficulty - AI difficulty for 0/50/100 rule
   * @param {number} damageReduction - Amount to reduce damage by (default 0)
   * @param {string} defenseType - 'cower' | 'unstoppable_hordes' | null
   * @param {boolean} skipDeathStrike - Skip DEATH STRIKE check (if already processed)
   * @returns {Object} Attack result
   */
  executeAttack(attackerInstance, defenderInstance, attackType = 'melee', aiDifficulty = 'medium', damageReduction = 0, defenseType = null, skipDeathStrike = false) {
    // Validate the attack
    const validation = this.validateAttack(attackerInstance, defenderInstance, attackType)
    if (!validation.valid) {
      return { success: false, message: validation.error }
    }

    // Calculate damage (with optional reduction from defense)
    const originalDamage = validation.damage
    const damage = Math.max(0, originalDamage - damageReduction)

    // ========== DEATH STRIKE CHECK ==========
    // DEATH STRIKE triggers BEFORE normal attack if:
    // - Defender has DEATH STRIKE ability (Boar, Wereboar)
    // - Attack would kill the defender (based on ORIGINAL damage before defense)
    // - Attack is melee and attacker is truly adjacent (distance = 1)
    // skipDeathStrike flag is used when DEATH STRIKE was already processed
    let deathStrikeResult = null
    if (!skipDeathStrike) {
      deathStrikeResult = this.checkDeathStrike(attackerInstance, defenderInstance, attackType, originalDamage, aiDifficulty)

      // If attacker was killed by DEATH STRIKE, return early - defender survives untouched
      if (deathStrikeResult?.triggered && deathStrikeResult?.attackerWasDestroyed) {
        return {
          success: true,
          deathStrikeTriggered: true,
          deathStrikeResult,
          attackerKilledByDeathStrike: true,
          defenderSurvived: true,
          attackType,
          damage: 0, // Defender takes no damage
          destroyed: false,
          originalDamage,
          damageReduced: damageReduction,
          defenseUsed: defenseType
        }
      }
    }

    // Mark as attacked
    attackerInstance.hasAttackedThisTurn = true

    // Check if creature has FLASHING BLADES (melee only) - defer tapping until ability resolves
    const hasFlashingBlades = attackType === 'melee' &&
      this.gameState.hasFlashingBlades &&
      this.gameState.hasFlashingBlades(attackerInstance)

    // Check if creature has HIDDEN BLADE (melee OR ranged) - defer tapping until ability resolves
    const hasHiddenBlade = this.gameState.hasHiddenBlade &&
      this.gameState.hasHiddenBlade(attackerInstance)

    // Check for TOMB GUARDIAN SPLASH (SWIRL) BEFORE resolving damage
    // We need to know if splash is pending to defer tapping
    const pendingSplashAttacks = this.checkTombGuardianSplash(attackerInstance, attackType, defenderInstance)
    const hasPendingSplash = pendingSplashAttacks && pendingSplashAttacks.length > 0

    // Check for RANGED SPLASH abilities (ACID BREATH / EXPLOSIVE BOLTS) - defer tapping until ability resolves
    const hasRangedSplash = attackType === 'ranged' &&
      this.gameState.hasRangedSplashAbility &&
      this.gameState.hasRangedSplashAbility(attackerInstance)

    // Check if creature has SLAM ability (melee only) - defer tapping until ability resolves
    const hasSlam = attackType === 'melee' &&
      this.gameState.hasSlam &&
      this.gameState.hasSlam(attackerInstance)

    // Tap the creature if it has both moved AND attacked
    // UNLESS it has FLASHING BLADES, HIDDEN BLADE, PENDING SPLASH, RANGED SPLASH, or SLAM (will be tapped after ability resolves)
    const shouldTapNow = attackerInstance.hasMovedThisTurn && !hasFlashingBlades && !hasHiddenBlade && !hasPendingSplash && !hasRangedSplash && !hasSlam
    if (shouldTapNow) {
      attackerInstance.tap()
    }

    // Use the combat resolution (includes +1 morale on kill)
    const result = this.resolveAttack(attackerInstance, defenderInstance, damage)

    // Check for LIFE DRAIN ability (Vampire Stalker - heals on melee damage)
    const lifeDrainResult = this.checkLifeDrain(attackerInstance, attackType, damage)

    return {
      success: true,
      ...result,
      attackType,
      damage,
      originalDamage,
      damageReduced: damageReduction,
      defenseUsed: defenseType,
      pendingFlashingBlades: hasFlashingBlades,
      pendingHiddenBlade: hasHiddenBlade,
      pendingRangedSplash: hasRangedSplash,  // Flag for ACID BREATH / EXPLOSIVE BOLTS
      pendingSlam: hasSlam,  // Flag for SLAM ability (Earth Guardian)
      lifeDrain: lifeDrainResult,
      pendingSplashAttacks,
      pendingSplash: hasPendingSplash,  // Flag to indicate splash needs to be resolved before tapping
      // DEATH STRIKE info (if triggered but attacker survived)
      deathStrikeTriggered: deathStrikeResult?.triggered || false,
      deathStrikeResult: deathStrikeResult
    }
  }

  /**
   * Execute attack with defense options (COWER or UNSTOPPABLE HORDES)
   * @deprecated Use executeAttack(attacker, defender, type, difficulty, damageReduction, defenseType, skipDeathStrike) instead
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {number} damageReduction - Amount to reduce damage by
   * @param {string} defenseType - 'cower' | 'unstoppable_hordes' | null
   * @param {string} aiDifficulty - AI difficulty for 0/50/100 rule
   * @param {boolean} skipDeathStrike - Skip DEATH STRIKE check
   * @returns {Object} Attack result
   */
  executeAttackWithDefense(attackerInstance, defenderInstance, attackType = 'melee', damageReduction = 0, defenseType = null, aiDifficulty = 'medium', skipDeathStrike = false) {
    // Delegate to consolidated executeAttack function
    return this.executeAttack(attackerInstance, defenderInstance, attackType, aiDifficulty, damageReduction, defenseType, skipDeathStrike)
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

    // ========== MAGIC CIRCLE AURA - First damage prevention step ==========
    // Hobgoblin Sorcerer on Magic Circle provides "Prevent 10 damage from 1 source"
    // to all friendly Goblins, Hobgoblins, and Bugbears (once per turn per creature)
    // This applies BEFORE Insubstantial and Shield Block
    let magicCircleReduction = 0
    let magicCircleOffered = false  // Track if ability was available (for AbilitiesTest)
    if (this.gameState.hasMagicCircleProtection && this.gameState.hasMagicCircleProtection(defenderInstance)) {
      magicCircleOffered = true  // Protection was available
      magicCircleReduction = this.gameState.getMagicCircleDamageReduction(defenderInstance)
      if (magicCircleReduction > 0) {
        this.gameState.useMagicCircleShield(defenderInstance, Math.min(magicCircleReduction, damageAmount))
      }
    }

    // Apply Magic Circle reduction first
    let workingDamage = Math.max(0, damageAmount - magicCircleReduction)

    // If damage fully absorbed by Magic Circle Aura, return early
    if (workingDamage === 0 && magicCircleReduction > 0) {
      return {
        destroyed: false,
        damage: 0,
        originalDamage: damageAmount,
        magicCircleReduction: magicCircleReduction,
        magicCircleUsed: true,
        magicCircleOffered: true,
        shieldBlockReduction: 0,
        insubstantialUsed: false,
        moraleChange: null
      }
    }

    // Check INSUBSTANTIAL before applying remaining damage
    // This ability blocks ALL damage from a single source once per refresh cycle
    if (this.gameState.canUseInsubstantial(defenderInstance)) {
      const blocked = this.gameState.useInsubstantial(defenderInstance, workingDamage, attackerOwner)
      if (blocked) {
        return {
          destroyed: false,
          damage: 0,
          originalDamage: damageAmount,
          magicCircleReduction: magicCircleReduction,
          magicCircleUsed: magicCircleReduction > 0,
          magicCircleOffered: magicCircleOffered,
          damageBlocked: workingDamage,
          insubstantialUsed: true,
          moraleChange: null
        }
      }
    }

    // Check SHIELD BLOCK passive (Dwarven Defender aura for adjacent Adventurers)
    let shieldBlockReduction = 0
    let finalDamage = workingDamage
    if (this.gameState.getShieldBlockReduction) {
      shieldBlockReduction = this.gameState.getShieldBlockReduction(defenderInstance)
      if (shieldBlockReduction > 0) {
        finalDamage = Math.max(0, workingDamage - shieldBlockReduction)
      }
    }

    // Apply damage to defender (with SHIELD BLOCK reduction applied)
    const wasDestroyed = defenderInstance.takeDamage(finalDamage)

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

      // Add creature CARD to graveyard (not instance)
      defenderPlayer.creatureGraveyard.push(defenderInstance.creature)

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

      // RIDER ability: Check if destroyed creature can deploy replacement
      // NOTE: We must capture position BEFORE the creature is removed from the tile
      // The actual deployment happens in GameBoard.jsx after this result is processed
      // Supports both Curse of Undeath (Skeleton) and Tyranny of Goblins (Goblin/Wolf)
      let riderData = null
      if (this.gameState.hasRider(defenderInstance)) {
        // Store the position where the creature died for RIDER deployment
        riderData = {
          creatureName: defenderInstance.creature.name,
          creatureLevel: defenderInstance.creature.level,
          faction: defenderInstance.creature.faction,
          position: defenderInstance.position ? { ...defenderInstance.position } : null,
          ownerPlayerId: defenderOwner
        }
      }

      // UNTAP ON KILL ability: Check if a Bugbear Berserker should untap
      // Triggers when adjacent enemy dies during Bugbear's faction's turn
      let untapOnKillData = null
      if (defenderInstance.position && this.gameState.checkUntapOnAdjacentKill) {
        const wasKilledByBugbear = this.gameState.hasUntapOnAdjacentKill &&
                                   this.gameState.hasUntapOnAdjacentKill(attackerInstance)
        untapOnKillData = this.gameState.checkUntapOnAdjacentKill(
          defenderInstance.position,
          defenderOwner,
          attackerOwner,
          wasKilledByBugbear
        )
      }

      return {
        destroyed: true,
        damage: finalDamage,
        originalDamage: damageAmount,
        magicCircleReduction: magicCircleReduction,
        magicCircleUsed: magicCircleReduction > 0,
        magicCircleOffered: magicCircleOffered,
        shieldBlockReduction: shieldBlockReduction,
        moraleChange: {
          attacker: +1,
          defender: -defenderInstance.creature.level
        },
        bloodthirsty: leadershipGained > 0 ? { leadershipGained } : null,
        riderTriggered: riderData !== null,
        riderData: riderData,
        untapOnKillTriggered: untapOnKillData?.triggered || false,
        untapOnKillData: untapOnKillData
      }
    }

    // TAP ON HIT ability: If attacker has tapOnHit and dealt damage, tap the defender
    let tapOnHitData = null
    const hasTapOnHitAbility = this.gameState.hasTapOnHit && this.gameState.hasTapOnHit(attackerInstance)

    if (finalDamage > 0 && hasTapOnHitAbility) {
      // Only tap if defender is not already tapped
      if (!defenderInstance.isTapped) {
        defenderInstance.tap()
        tapOnHitData = {
          triggered: true,
          attackerName: attackerInstance.creature.name,
          defenderName: defenderInstance.creature.name,
          damageDealt: finalDamage
        }
      } else {
        // Defender was already tapped, ability triggered but had no effect
        tapOnHitData = {
          triggered: true,
          alreadyTapped: true,
          attackerName: attackerInstance.creature.name,
          defenderName: defenderInstance.creature.name,
          damageDealt: finalDamage
        }
      }
    }

    return {
      destroyed: false,
      damage: finalDamage,
      originalDamage: damageAmount,
      magicCircleReduction: magicCircleReduction,
      magicCircleUsed: magicCircleReduction > 0,
      magicCircleOffered: magicCircleOffered,
      shieldBlockReduction: shieldBlockReduction,
      moraleChange: null,
      tapOnHitTriggered: tapOnHitData?.triggered || false,
      tapOnHitData: tapOnHitData
    }
  }

  /**
   * Apply LIFE DRAIN if attacker has the ability and attack dealt damage
   * Big O: O(1) - constant time check and heal
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {number} damageDealt - Actual damage dealt to defender
   * @returns {Object|null} Life drain result or null if not applicable
   */
  checkLifeDrain(attackerInstance, attackType, damageDealt) {
    // LIFE DRAIN only triggers on melee attacks that deal damage
    if (attackType !== 'melee' || damageDealt <= 0) return null

    // Check if attacker has LIFE DRAIN ability
    if (!this.gameState.hasLifeDrain || !this.gameState.hasLifeDrain(attackerInstance)) return null

    // Apply the healing
    const healAmount = this.gameState.applyLifeDrain(attackerInstance)

    return {
      triggered: true,
      healAmount,
      creatureName: attackerInstance.creature.name,
      currentHP: attackerInstance.currentHP,
      maxHP: attackerInstance.creature.hitPoints
    }
  }

  /**
   * Check and execute DEATH STRIKE ability
   * DEATH STRIKE triggers when:
   * - Defender has the ability (Boar, Wereboar)
   * - Attack would kill the defender
   * - Attack is melee
   * - Attacker is truly adjacent (distance = 1, not Reach 2)
   *
   * Big O: O(1) - constant time checks
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} defenderInstance - The defending creature (with DEATH STRIKE)
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {number} incomingDamage - Damage that would be dealt to defender
   * @param {string} aiDifficulty - AI difficulty for 0/50/100 rule
   * @returns {Object|null} DEATH STRIKE result or null if not triggered
   */
  checkDeathStrike(attackerInstance, defenderInstance, attackType, incomingDamage, aiDifficulty = 'medium') {
    // DEATH STRIKE only triggers on melee attacks
    if (attackType !== 'melee') return null

    // Check if defender has DEATH STRIKE ability
    if (!this.gameState.hasDeathStrike || !this.gameState.hasDeathStrike(defenderInstance)) return null

    // Check if attack would kill defender
    if (incomingDamage < defenderInstance.currentHP) return null

    // Check if attacker is truly adjacent (distance = 1, not Reach 2)
    const distance = this.gameState.getDistance(attackerInstance.position, defenderInstance.position)
    if (distance !== 1) return null

    // DEATH STRIKE conditions met - check AI difficulty
    const isHuman = this.gameState.players[defenderInstance.owner]?.isHuman
    let shouldTrigger = true
    let wasDeclined = false

    if (!isHuman) {
      if (aiDifficulty === 'easy') {
        // Easy AI: never use DEATH STRIKE (0%)
        shouldTrigger = false
        wasDeclined = true
      } else if (aiDifficulty === 'medium') {
        // Medium AI: 50% chance
        if (Math.random() >= 0.5) {
          shouldTrigger = false
          wasDeclined = true
        }
      }
      // Hard AI: always use DEATH STRIKE (100%)
    }

    if (!shouldTrigger) {
      return {
        triggered: false,
        declined: true,
        defenderName: defenderInstance.creature.name,
        difficulty: aiDifficulty
      }
    }

    // Execute DEATH STRIKE - defender attacks attacker with melee damage
    const deathStrikeDamage = defenderInstance.creature.meleeAttack?.damage || 0
    const attackerOwner = attackerInstance.owner
    const defenderOwner = defenderInstance.owner

    // Apply DEATH STRIKE damage to attacker
    // Note: DEATH STRIKE damage can be reduced by defender's defenses (Cower, order cards, etc.)
    // but for now we apply raw damage - the actual defense choice happens in the UI flow
    const attackerWasDestroyed = attackerInstance.takeDamage(deathStrikeDamage)

    let attackerDeathResult = null
    if (attackerWasDestroyed) {
      // Clear the tile occupant
      if (attackerInstance.position) {
        const tile = this.gameState.getTile(attackerInstance.position.x, attackerInstance.position.y)
        if (tile) {
          tile.occupant = null
        }
      }

      // Remove from battlefield
      const attackerPlayer = this.gameState.players[attackerOwner]
      const index = attackerPlayer.creaturesInPlay.findIndex(c => c.instanceId === attackerInstance.instanceId)
      if (index !== -1) {
        attackerPlayer.creaturesInPlay.splice(index, 1)
      }

      // Add creature CARD to graveyard
      attackerPlayer.creatureGraveyard.push(attackerInstance.creature)

      // Attacker loses morale equal to creature's level
      attackerPlayer.loseMorale(attackerInstance.creature.level)

      // Defender gains +1 morale (custom rule: killer gains morale)
      const defenderPlayer = this.gameState.players[defenderOwner]
      defenderPlayer.gainMorale(1)

      attackerDeathResult = {
        destroyed: true,
        moraleChange: {
          attacker: -attackerInstance.creature.level,
          defender: +1
        }
      }
    }

    return {
      triggered: true,
      declined: false,
      deathStrikeDamage,
      defenderName: defenderInstance.creature.name,
      attackerName: attackerInstance.creature.name,
      attackerWasDestroyed,
      attackerCurrentHP: attackerInstance.currentHP,
      attackerDeathResult,
      difficulty: isHuman ? 'human' : aiDifficulty
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
    // REACH ability: Creatures with reach property can melee attack at extended range
    // e.g., reach: 2 allows melee attacks at range 1 OR 2
    const creatureReach = creatureInstance.creature.reach || 0
    const meleeRange = hasMelee ? Math.max(creatureInstance.creature.meleeAttack.range || 1, creatureReach) : 0

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

        // Melee attack: check melee range (includes REACH ability if present)
        if (hasMelee && distance <= meleeRange) {
          // Track if this is a REACH attack (distance > 1 using reach ability)
          const isReachAttack = distance > 1 && creatureReach >= distance

          targets.push({
            creature: enemyCreature,
            attackType: 'melee',
            distance,
            isReachAttack, // True if attacking at range 2+ using REACH ability
            reachDistance: isReachAttack ? distance : null
          })
          // Track reach attacks for stats
          if (isReachAttack && trackStats) {
            trackStats.reachAttacksAvailable = (trackStats.reachAttacksAvailable || 0) + 1
          }
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
      // UNLESS the attacker has FLYING ability (can shoot over enemies)
      const attackerHasFlying = this.gameState.hasFlying && this.gameState.hasFlying(attacker)
      if (!attackerHasFlying && tile?.occupant && tile.occupant.owner !== attackerOwner) {
        return false
      }
    }

    return true
  }

  /**
   * Check for TOMB GUARDIAN SPLASH (SWIRL) ability and get pending splash attacks
   * Splash triggers on ANY melee attack by Skeletal Tomb Guardian
   * Returns array of pending splash targets that need defense resolution
   *
   * Big O: O(8) - checks at most 8 adjacent tiles
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {string} attackType - 'melee' or 'ranged'
   * @param {CreatureInstance} mainTarget - The primary attack target (excluded from splash)
   * @returns {Array|null} Array of splash target info or null if ability doesn't trigger
   */
  checkTombGuardianSplash(attackerInstance, attackType, mainTarget) {
    // SPLASH only triggers on melee attacks
    if (attackType !== 'melee') return null

    // Check if attacker has TOMB GUARDIAN SPLASH ability
    if (!this.gameState.hasTombGuardianSplash || !this.gameState.hasTombGuardianSplash(attackerInstance)) return null

    // AI difficulty check for SWIRL (same pattern as BURROW)
    // Human players ALWAYS have SWIRL enabled
    // AI: Easy = 0%, Medium = 50%, Hard = 100%
    const owner = attackerInstance.owner
    const player = this.gameState.players[owner]

    if (!player?.isHuman) {
      const aiDifficulty = player?.aiDifficulty || 'medium'
      if (aiDifficulty === 'easy') {
        return null  // Easy AI never uses SWIRL
      } else if (aiDifficulty === 'medium') {
        if (Math.random() >= 0.5) {
          return null  // Medium AI uses 50% of the time
        }
      }
      // Hard AI always uses SWIRL (no early return)
    }

    // Get all adjacent enemies (excluding main target)
    const splashTargets = this.gameState.getTombGuardianSplashTargets(attackerInstance, mainTarget)

    if (splashTargets.length === 0) return null

    // Return pending splash attacks that need defense resolution
    return splashTargets.map(target => ({
      attackerInstance,
      targetInstance: target,
      damage: 20,  // Splash damage amount
      attackType: 'splash',
      sourceAbility: 'TOMB_GUARDIAN_SPLASH'
    }))
  }

  /**
   * Execute a single splash damage attack (after defense resolution)
   * Called for each splash target after they've had a chance to defend
   *
   * Big O: O(c) where c = creatures in play (for removal)
   *
   * @param {CreatureInstance} attackerInstance - The attacking creature
   * @param {CreatureInstance} targetInstance - The splash target
   * @param {number} damageAfterDefense - Damage to apply after defense (0 if fully blocked)
   * @returns {Object} Splash attack result
   */
  executeSplashDamage(attackerInstance, targetInstance, damageAfterDefense) {
    const result = this.gameState.applyTombGuardianSplash(targetInstance, attackerInstance.owner, damageAfterDefense)
    return {
      ...result,
      attackerName: attackerInstance.creature.name,
      sourceAbility: 'TOMB_GUARDIAN_SPLASH'
    }
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

    // Check if attacker has FLYING (can shoot over enemy creatures)
    const attackerHasFlying = this.gameState.hasFlying && this.gameState.hasFlying(creatureInstance)

    // Check if attacker is on forest (can't use ranged from forest - even with FLYING)
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

            // Enemy creature blocks LOS (unless attacker has FLYING - can shoot over enemies)
            if (!attackerHasFlying && lineTile?.occupant && lineTile.occupant.owner !== attackerOwner) {
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
