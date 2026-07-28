/**
 * WEB - Order Card Ability
 *
 * Faction: Sting of Lolth
 *
 * Attaches to target enemy creature within 10 squares with LOS.
 * Webbed creatures have reduced speed and cannot fly.
 * Spider-type creatures can use Web without INT requirement (SPIDER AFFINITY).
 */
import type { CreatureInstance } from '../../../models/creatures.js'
import type { OrderCard } from '../../../models/orders.js'

export const WebCard = {
  id: 'web_card',
  name: 'Web',
  faction: 'Sting of Lolth',
  range: 10,

  /**
   * Check if a creature is webbed (has Web card attached)
   */
  isWebbed(creatureInstance: CreatureInstance): boolean {
    if (!creatureInstance?.attachedCards) return false
    return creatureInstance.attachedCards.some((attached) =>
      (attached.card as OrderCard | undefined)?.name?.toUpperCase().includes('WEB')
    )
  },

  /**
   * Get the Web card attached to a creature (if any)
   */
  getAttachedWeb(creatureInstance: CreatureInstance) {
    if (!creatureInstance?.attachedCards) return null
    return (
      creatureInstance.attachedCards.find((attached) =>
        (attached.card as OrderCard | undefined)?.name?.toUpperCase().includes('WEB')
      ) || null
    )
  },

  /**
   * Check if a creature can use a Web order card
   * Requires INT ability OR SPIDER AFFINITY (Spider-type creatures bypass INT requirement)
   */
  canUse(casterInstance: CreatureInstance, webCard: OrderCard): boolean {
    if (!casterInstance?.creature || !webCard) return false

    // Check level requirement
    if (casterInstance.creature.level < webCard.level) return false

    // Check if creature has INT ability
    if (casterInstance.creature.abilities?.INT) return true

    // SPIDER AFFINITY: Spider-type creatures can use Web without INT
    const creatureTypes = casterInstance.creature.type || []
    return creatureTypes.some((t) => t.toLowerCase() === 'spider')
  },

  /**
   * Get valid targets for Web card
   * @param gameState - Game state for LOS and player lookup
   */
  getValidTargets(gameState: any, casterInstance: CreatureInstance): CreatureInstance[] {
    if (!casterInstance?.position) return []

    const casterPos = casterInstance.position
    const validTargets: CreatureInstance[] = []

    for (const [playerId, player] of Object.entries(gameState.players) as [string, any][]) {
      if (playerId === casterInstance.owner) continue

      for (const enemy of player.creaturesInPlay as CreatureInstance[]) {
        if (!enemy.position) continue

        // Check if already webbed (only 1 Web per creature)
        if (this.isWebbed(enemy)) continue

        // Check distance (Chebyshev)
        const dx = Math.abs(enemy.position.x - casterPos.x)
        const dy = Math.abs(enemy.position.y - casterPos.y)
        const distance = Math.max(dx, dy)

        if (distance > this.range) continue

        // Check LOS (not through forests)
        const hasLOS = gameState.hasLineOfSight(casterInstance, enemy, casterInstance.owner)
        if (!hasLOS) continue

        validTargets.push(enemy)
      }
    }

    return validTargets
  },

  /**
   * Apply Web card to target creature
   * @param gameState - Game state for player lookup
   * @returns { success, reason, card }
   */
  apply(
    gameState: any,
    casterInstance: CreatureInstance,
    targetInstance: CreatureInstance,
    webCard: OrderCard
  ): Record<string, unknown> {
    if (!casterInstance || !targetInstance || !webCard) {
      return { success: false, reason: 'Invalid parameters' }
    }

    if (this.isWebbed(targetInstance)) {
      return { success: false, reason: 'Target is already webbed' }
    }

    const casterPlayer = gameState.players[casterInstance.owner]
    if (!casterPlayer) {
      return { success: false, reason: 'Caster player not found' }
    }

    const cardIndex = casterPlayer.orderHand.findIndex((c: OrderCard) => c.id === webCard.id)
    if (cardIndex === -1) {
      return { success: false, reason: 'Web card not in hand' }
    }

    // Remove from hand
    const [removedCard] = casterPlayer.orderHand.splice(cardIndex, 1)

    // Attach to target creature
    targetInstance.attachedCards.push({
      card: removedCard,
      casterOwner: casterInstance.owner,
      attachedTurn: gameState.turnNumber,
    })

    return {
      success: true,
      card: removedCard,
      caster: casterInstance,
      target: targetInstance,
    }
  },

  /**
   * Remove Web from a creature (costs standard action)
   * @param gameState - Game state for player lookup
   * @returns { success, reason, card, casterOwner }
   */
  remove(gameState: any, creatureInstance: CreatureInstance): Record<string, unknown> {
    if (!creatureInstance?.attachedCards) {
      return { success: false, reason: 'Invalid creature' }
    }

    const webIndex = creatureInstance.attachedCards.findIndex((attached) =>
      (attached.card as OrderCard | undefined)?.name?.toUpperCase().includes('WEB')
    )

    if (webIndex === -1) {
      return { success: false, reason: 'Creature is not webbed' }
    }

    const [webAttachment] = creatureInstance.attachedCards.splice(webIndex, 1)
    const { card, casterOwner } = webAttachment

    // Add to caster's discard pile
    const casterPlayer = gameState.players[casterOwner]
    if (casterPlayer) {
      casterPlayer.orderDiscard.push(card)
    }

    return {
      success: true,
      card: card,
      casterOwner: casterOwner,
    }
  },
}

export default WebCard
