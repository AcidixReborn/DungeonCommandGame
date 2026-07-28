/**
 * HEALING TOUCH - Creature Ability
 *
 * Faction: Heart of Cormyr
 * Creatures:
 *   - Dwarf Cleric / hoc_cr_3 (Heart of Cormyr)
 *
 * Standard action: Heal 10 damage OR remove 1 attached Order card from
 * self or an adjacent ally.
 */

import { ABILITIES } from '../../../constants/gameConstants.js'

export const HealingTouch = {
  id: 'healing_touch',
  name: 'Healing Touch',
  faction: 'Heart of Cormyr',
  creature: 'Dwarf Cleric',
  healAmount: ABILITIES.HEALING_TOUCH_AMOUNT,

  /**
   * Check if creature has HEALING TOUCH ability
   * @param {CreatureInstance} creatureInstance - Creature to check
   * @returns {boolean} True if creature has HEALING TOUCH
   */
  has(creatureInstance) {
    if (!creatureInstance?.creature?.specialAbilities) return false
    return creatureInstance.creature.specialAbilities.some(
      (ability) => typeof ability === 'string' && ability.toUpperCase().includes('HEALING TOUCH')
    )
  },

  /**
   * Get valid targets (self + adjacent allies)
   * @param {Object} gameState - Game state for adjacency lookup
   * @param {CreatureInstance} healerInstance - The Dwarf Cleric
   * @returns {Array} Array of valid target CreatureInstances (includes self)
   */
  getTargets(gameState, healerInstance) {
    if (!this.has(healerInstance)) return []
    if (!healerInstance.position) return []

    const validTargets = []
    const healerOwner = healerInstance.owner

    // Self is always a valid target
    validTargets.push(healerInstance)

    // Get 8-directional adjacent tiles
    const adjacentTiles = gameState.getAdjacentTiles8Dir(
      healerInstance.position.x,
      healerInstance.position.y
    )

    for (const tile of adjacentTiles) {
      const occupant = tile.occupant
      if (
        occupant &&
        occupant.owner === healerOwner &&
        occupant.currentHP > 0 &&
        occupant.instanceId !== healerInstance.instanceId
      ) {
        validTargets.push(occupant)
      }
    }

    return validTargets
  },

  /**
   * Check if a creature is a valid target
   * @param {Object} gameState - Game state
   * @param {CreatureInstance} healerInstance - The Dwarf Cleric
   * @param {CreatureInstance} targetInstance - Potential target
   * @returns {boolean} True if target is valid
   */
  isValidTarget(gameState, healerInstance, targetInstance) {
    if (!this.has(healerInstance)) return false
    if (!healerInstance.position || !targetInstance.position) return false
    if (targetInstance.currentHP <= 0) return false
    if (targetInstance.owner !== healerInstance.owner) return false

    // Self is valid
    if (targetInstance.instanceId === healerInstance.instanceId) return true

    // Check if adjacent (8-directional)
    const dx = Math.abs(targetInstance.position.x - healerInstance.position.x)
    const dy = Math.abs(targetInstance.position.y - healerInstance.position.y)
    return dx <= 1 && dy <= 1
  },

  /**
   * Execute heal action
   * @param {Object} gameState - Game state
   * @param {CreatureInstance} healerInstance - The Dwarf Cleric
   * @param {CreatureInstance} targetInstance - Creature to heal
   * @returns {Object} Result { success, message, healedAmount }
   */
  heal(gameState, healerInstance, targetInstance) {
    if (!this.has(healerInstance)) {
      return { success: false, message: 'Creature does not have HEALING TOUCH ability' }
    }

    if (healerInstance.hasAttackedThisTurn) {
      return { success: false, message: 'Creature has already used its standard action' }
    }

    if (!this.isValidTarget(gameState, healerInstance, targetInstance)) {
      return { success: false, message: 'Invalid target for HEALING TOUCH' }
    }

    const damageBeforeHeal = targetInstance.damageTokens
    targetInstance.heal(this.healAmount)
    const actualHealed = damageBeforeHeal - targetInstance.damageTokens

    // Consume standard action
    healerInstance.hasAttackedThisTurn = true
    if (healerInstance.hasMovedThisTurn) {
      healerInstance.tap()
    }

    return {
      success: true,
      healedAmount: actualHealed,
      message:
        actualHealed > 0
          ? `${targetInstance.creature.name} healed ${actualHealed} damage`
          : `${targetInstance.creature.name} has no damage to heal`,
    }
  },

  /**
   * Execute remove attached card action
   * @param {Object} gameState - Game state for player lookup
   * @param {CreatureInstance} healerInstance - The Dwarf Cleric
   * @param {CreatureInstance} targetInstance - Creature to remove card from
   * @param {number} cardIndex - Index of attached card to remove
   * @returns {Object} Result { success, message, removedCard }
   */
  removeCard(gameState, healerInstance, targetInstance, cardIndex = 0) {
    if (!this.has(healerInstance)) {
      return { success: false, message: 'Creature does not have HEALING TOUCH ability' }
    }

    if (healerInstance.hasAttackedThisTurn) {
      return { success: false, message: 'Creature has already used its standard action' }
    }

    if (!this.isValidTarget(gameState, healerInstance, targetInstance)) {
      return { success: false, message: 'Invalid target for HEALING TOUCH' }
    }

    if (!targetInstance.attachedCards || targetInstance.attachedCards.length === 0) {
      return { success: false, message: 'Target has no attached cards to remove' }
    }

    if (cardIndex < 0 || cardIndex >= targetInstance.attachedCards.length) {
      return { success: false, message: 'Invalid card index' }
    }

    // Remove the card
    const [removedAttachment] = targetInstance.attachedCards.splice(cardIndex, 1)
    const removedCard = removedAttachment.card

    // Return card to caster's discard pile
    const casterPlayer = gameState.players[removedAttachment.casterOwner]
    if (casterPlayer) {
      casterPlayer.orderDiscard.push(removedCard)
    }

    // Consume standard action
    healerInstance.hasAttackedThisTurn = true
    if (healerInstance.hasMovedThisTurn) {
      healerInstance.tap()
    }

    return {
      success: true,
      removedCard: removedCard,
      message: `Removed ${removedCard.name} from ${targetInstance.creature.name}`,
    }
  },
}

export default HealingTouch
