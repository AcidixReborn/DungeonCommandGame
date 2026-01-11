import { useState, useEffect } from 'react'
import { Button, Badge, Card, Alert, Form } from 'react-bootstrap'
import CreatureCard from './CreatureCard'
import './CombatPanel.css'

/**
 * DefenseOptionsPanel - In-panel defense options UI
 * Replaces ImmediateReactionModal for better battlefield visibility
 * Mirrors all functionality from the original modal
 *
 * Defensive Options:
 * 1. COWER (Universal) - Any untapped creature can avoid ALL damage
 *    - Cost: damage/10 morale (rounded up)
 *    - Effect: Avoid ALL damage from the attack
 *    - Taps the creature
 *    - BLACK HAND OF BANE: +1 extra morale if attacker has this ability
 *
 * 2. UNSTOPPABLE HORDES (Morgana's Commander Ability)
 *    - Only for untapped Undead creatures controlled by Morgana
 *    - Cost: 1 morale per creature
 *    - Effect: Prevent 20 damage per creature
 *    - Can stack with multiple Undead (defender + adjacent allies)
 *
 * 3. IMMEDIATE Cards (Order Cards)
 *    - Use an IMMEDIATE order card from your hand
 *    - Cost: 0 morale
 *    - Effect: Prevent 10 damage
 *    - Can be used by defender OR adjacent friendly untapped creatures
 *
 * @param {Object} damageBoostCard - STANDARD order card used by attacker (null if none)
 * @param {number} damageBoostBonus - Bonus damage from attacker's card (e.g., Power Attack +20)
 * @param {number|null} damageBoostFlat - Flat damage replacing base (e.g., Killing Strike 100)
 *
 * Big O Complexity:
 * - getDefenseOptions: O(n) where n = cards in hand + adjacent creatures
 * - Rendering: O(n) where n = adjacent creatures + immediate cards
 * - toggleUndeadCreature: O(n) where n = selected creatures
 * - calculateUnstoppableDamageReduction: O(1) - simple count * 20
 */
function DefenseOptionsPanel({
  attackerInstance,
  defenderInstance,
  attackInfo,
  defenderPlayerState,
  gameState,
  accumulatedDamageReduction = 0,
  damageBoostCard = null,
  damageBoostBonus = 0,
  damageBoostFlat = null,
  onDefenseSelected,
  onSkip
}) {
  const [selectedDefense, setSelectedDefense] = useState(null)
  const [selectedUndeadCreatures, setSelectedUndeadCreatures] = useState([])
  const [selectedImmediateCard, setSelectedImmediateCard] = useState(null)
  const [selectedCardCreature, setSelectedCardCreature] = useState(null)
  const [selectedDiscardCard, setSelectedDiscardCard] = useState(null) // Card to discard for Uncanny Dodge etc.
  const [selectedMoraleTarget, setSelectedMoraleTarget] = useState(null) // Enemy creature for morale loss (Unexpected Resistance)
  const [selectedSacrificeTarget, setSelectedSacrificeTarget] = useState(null) // Enemy creature for Savage Demise attack
  const [hoverPreview, setHoverPreview] = useState(null) // { type: 'order' | 'creature', data: cardInfo | creatureInstance }

  // O(1) - Reset state when defender changes
  useEffect(() => {
    setSelectedDefense(null)
    setSelectedUndeadCreatures([])
    setSelectedImmediateCard(null)
    setSelectedCardCreature(null)
    setSelectedDiscardCard(null)
    setSelectedMoraleTarget(null)
    setSelectedSacrificeTarget(null)
  }, [defenderInstance?.instanceId])

  if (!defenderPlayerState || !defenderInstance || !attackerInstance) {
    return null
  }

  // O(1) - Calculate incoming damage using attackInfo prop
  const attackType = attackInfo?.attackType || 'melee'

  // Calculate original damage based on attack type
  // For special abilities (splash, flashing_blades, hidden_blade, confusion_gaze, lightning_breath), use attackInfo.damage
  // For normal attacks, calculate from creature stats
  let baseDamage
  // Track if this is an ability attack with pre-calculated damage (bonus already included)
  const isAbilityAttackWithPreCalcDamage = attackInfo?.damage !== undefined && (
    attackType === 'splash' ||
    attackType === 'ranged_splash' ||
    attackType === 'flashing_blades' ||
    attackType === 'hidden_blade' ||
    attackType === 'confusion_gaze' ||
    attackType === 'lightning_breath'
  )
  if (isAbilityAttackWithPreCalcDamage) {
    // Special ability attacks have fixed damage in attackInfo (bonus already included for lightning_breath)
    baseDamage = attackInfo.damage
  } else if (attackType === 'melee') {
    baseDamage = attackerInstance.creature.meleeAttack?.damage || 0
  } else {
    baseDamage = attackerInstance.creature.rangedAttack?.damage || 0
  }

  // Check for FLANKING bonus (only on melee primary attacks)
  const flankingBonus = attackType === 'melee' && gameState?.getFlankingBonus
    ? gameState.getFlankingBonus(attackerInstance, defenderInstance)
    : 0

  // Check for CUTTER bonus (+10 vs tapped creatures)
  const cutterBonus = attackType === 'melee' && gameState?.getCutterBonus
    ? gameState.getCutterBonus(attackerInstance, defenderInstance)
    : 0

  // Check for ORDER CARD damage boost
  const usedFlatDamage = damageBoostFlat !== null
  // For ability attacks with pre-calculated damage (like Lightning Breath), bonus is already in baseDamage
  // Only add orderCardBonus for normal melee/ranged attacks
  const orderCardBonus = (!usedFlatDamage && damageBoostBonus > 0 && !isAbilityAttackWithPreCalcDamage) ? damageBoostBonus : 0
  // For display purposes - track if ability attack has a bonus included
  const abilityIncludesBonus = isAbilityAttackWithPreCalcDamage && damageBoostBonus > 0

  // DEBUG: Log calculated values
  console.log('[DefenseOptionsPanel] Calculated - isAbilityAttackWithPreCalcDamage:', isAbilityAttackWithPreCalcDamage, 'baseDamage:', baseDamage, 'orderCardBonus:', orderCardBonus, 'abilityIncludesBonus:', abilityIncludesBonus)

  // Total damage calculation
  // Flat damage (Killing Strike) replaces base damage and ignores flanking/cutter
  let originalDamage
  if (usedFlatDamage) {
    originalDamage = damageBoostFlat
  } else {
    originalDamage = baseDamage + flankingBonus + cutterBonus + orderCardBonus
  }

  // Check for MAGIC CIRCLE AURA passive (Hobgoblin Sorcerer on Magic Circle)
  // This is the FIRST damage reduction - prevents 10 damage for Goblin/Hobgoblin/Bugbear
  const magicCircleReduction = gameState?.hasMagicCircleProtection && gameState.hasMagicCircleProtection(defenderInstance)
    ? 10 // Preview shows 10 if protected (actual check happens in CombatResolver)
    : 0
  const damageAfterMagicCircle = Math.max(0, originalDamage - accumulatedDamageReduction - magicCircleReduction)

  // Check for SHIELD BLOCK passive (Dwarven Defender aura for adjacent Adventurers)
  const shieldBlockReduction = gameState?.getShieldBlockReduction
    ? gameState.getShieldBlockReduction(defenderInstance)
    : 0
  const damageAfterShieldBlock = Math.max(0, damageAfterMagicCircle - shieldBlockReduction)

  // Check for BLOCK from attached cards (Tough as Nails = Block 10)
  // This reduces damage from each source by the block amount
  const attachmentBlockAmount = gameState?.getBlockAmount
    ? gameState.getBlockAmount(defenderInstance)
    : 0
  const incomingDamage = Math.max(0, damageAfterShieldBlock - attachmentBlockAmount)

  // O(n) - Get defense options from gameState
  const defenseOptions = gameState?.getDefenseOptions
    ? gameState.getDefenseOptions(defenderInstance, incomingDamage, attackerInstance.owner)
    : { cower: null, unstoppableHordes: null, adjacentUndead: [], immediateCards: [] }

  const { cower: cowerInfo, unstoppableHordes: unstoppableInfo, adjacentUndead, immediateCards: rawImmediateCards } = defenseOptions
  const defenderCanUseUnstoppable = unstoppableInfo?.canUse

  // Filter out Savage Demise cards if no valid targets exist
  // For selfSacrificeAttack cards, we need at least one adjacent tapped enemy
  const immediateCards = rawImmediateCards.filter(cardInfo => {
    // If not a self-sacrifice attack card, keep it
    if (!cardInfo.card.selfSacrificeAttack) return true

    // For self-sacrifice cards, check if any eligible creature has adjacent tapped enemies
    for (const creature of cardInfo.eligibleCreatures) {
      // Get adjacent tiles for this creature
      const adjacentTiles = gameState?.getAdjacentTiles8Dir
        ? gameState.getAdjacentTiles8Dir(creature.position.x, creature.position.y)
        : []

      // Check if any adjacent tile has a tapped enemy
      for (const [playerId, player] of Object.entries(gameState?.players || {})) {
        if (playerId === defenderInstance.owner) continue // Skip own creatures
        for (const enemy of player.creaturesInPlay) {
          if (enemy.isTapped) {
            const isAdjacent = adjacentTiles.some(
              tile => tile.x === enemy.position.x && tile.y === enemy.position.y
            )
            if (isAdjacent) return true // Found valid target, include card
          }
        }
      }
    }
    return false // No valid targets found for any eligible creature
  })

  // Check for TAP ON HIT ability (Horned Devil, Wolf) - attacker will tap defender if damage dealt
  const attackerHasTapOnHit = gameState?.hasTapOnHit && gameState.hasTapOnHit(attackerInstance)
  const tapOnHitApplies = attackerHasTapOnHit && attackType === 'melee'
  const defenderAlreadyTapped = defenderInstance?.isTapped

  // Check for REACH 2 attack
  const isReachAttack = attackInfo?.isReachAttack || false
  const reachDistance = attackInfo?.reachDistance || attackInfo?.distance || 1

  // O(n) - Toggle Undead creature selection
  const toggleUndeadCreature = (creature) => {
    setSelectedUndeadCreatures(prev => {
      const isSelected = prev.some(c => c.instanceId === creature.instanceId)
      if (isSelected) {
        return prev.filter(c => c.instanceId !== creature.instanceId)
      } else {
        return [...prev, creature]
      }
    })
  }

  // O(1) - Calculate unstoppable damage reduction
  const calculateUnstoppableDamageReduction = () => {
    let count = selectedUndeadCreatures.length
    if (selectedDefense === 'unstoppable_hordes' && defenderCanUseUnstoppable) {
      count++
    }
    return count * 20
  }

  // O(1) - Calculate unstoppable morale cost
  const calculateUnstoppableMoraleCost = () => {
    let count = selectedUndeadCreatures.length
    if (selectedDefense === 'unstoppable_hordes' && defenderCanUseUnstoppable) {
      count++
    }
    return count
  }

  // O(n) - Get adjacent tapped enemy creatures for morale loss targeting (Unexpected Resistance)
  // Returns array of { creature: CreatureInstance, owner: playerId }
  const getAdjacentTappedEnemies = (cardUserPosition) => {
    if (!gameState || !cardUserPosition) return []

    const adjacentTappedEnemies = []
    const defenderOwner = defenderInstance.owner

    // Get all adjacent tiles (8-directional)
    const adjacentTiles = gameState.getAdjacentTiles8Dir(cardUserPosition.x, cardUserPosition.y)

    // Check each player's creatures
    for (const [playerId, player] of Object.entries(gameState.players)) {
      // Skip our own creatures (can't target friendly creatures for morale loss)
      if (playerId === defenderOwner) continue

      for (const creature of player.creaturesInPlay) {
        // Check if creature is tapped AND adjacent to card user
        if (creature.isTapped) {
          const isAdjacent = adjacentTiles.some(
            tile => tile.x === creature.position.x && tile.y === creature.position.y
          )
          if (isAdjacent) {
            adjacentTappedEnemies.push({
              creature,
              owner: playerId
            })
          }
        }
      }
    }

    return adjacentTappedEnemies
  }

  // O(1) - Handle defense selection
  const handleSelectDefense = (defenseType) => {
    if (selectedDefense === defenseType) {
      setSelectedDefense(null)
      setSelectedUndeadCreatures([])
      setSelectedImmediateCard(null)
      setSelectedCardCreature(null)
      setSelectedDiscardCard(null)
      setSelectedMoraleTarget(null)
      setSelectedSacrificeTarget(null)
    } else {
      setSelectedDefense(defenseType)
      if (defenseType !== 'unstoppable_hordes') {
        setSelectedUndeadCreatures([])
      }
      if (defenseType !== 'immediate_card') {
        setSelectedImmediateCard(null)
        setSelectedCardCreature(null)
        setSelectedDiscardCard(null)
        setSelectedMoraleTarget(null)
        setSelectedSacrificeTarget(null)
      }
    }
  }

  // O(1) - Handle IMMEDIATE card selection
  const handleSelectImmediateCard = (cardInfo) => {
    setSelectedDefense('immediate_card')
    setSelectedImmediateCard(cardInfo)
    setSelectedDiscardCard(null) // Reset discard selection when card changes
    setSelectedMoraleTarget(null) // Reset morale target when card changes
    setSelectedSacrificeTarget(null) // Reset sacrifice target when card changes

    if (cardInfo.eligibleCreatures.length === 1) {
      setSelectedCardCreature(cardInfo.eligibleCreatures[0])

      // Auto-select morale target if card has moraleLossTargetType and only one valid target
      if (cardInfo.card.moraleLossTargetType === 'adjacent_tapped_enemy') {
        const cardUser = cardInfo.eligibleCreatures[0]
        const adjacentEnemies = getAdjacentTappedEnemies(cardUser.position)
        if (adjacentEnemies.length === 1) {
          setSelectedMoraleTarget(adjacentEnemies[0])
        }
      }

      // Auto-select sacrifice target if card has selfSacrificeAttack and only one valid target
      if (cardInfo.card.selfSacrificeAttack) {
        const cardUser = cardInfo.eligibleCreatures[0]
        const adjacentEnemies = getAdjacentTappedEnemies(cardUser.position)
        if (adjacentEnemies.length === 1) {
          setSelectedSacrificeTarget(adjacentEnemies[0])
        }
      }
    } else {
      setSelectedCardCreature(null)
    }
  }

  // O(1) - Handle card creature selection (when multiple creatures can use the card)
  const handleSelectCardCreature = (creature) => {
    setSelectedCardCreature(creature)
    setSelectedMoraleTarget(null) // Reset morale target when creature changes
    setSelectedSacrificeTarget(null) // Reset sacrifice target when creature changes

    // Auto-select morale target if card has moraleLossTargetType and only one valid target
    if (selectedImmediateCard?.card?.moraleLossTargetType === 'adjacent_tapped_enemy') {
      const adjacentEnemies = getAdjacentTappedEnemies(creature.position)
      if (adjacentEnemies.length === 1) {
        setSelectedMoraleTarget(adjacentEnemies[0])
      }
    }

    // Auto-select sacrifice target if card has selfSacrificeAttack and only one valid target
    if (selectedImmediateCard?.card?.selfSacrificeAttack) {
      const adjacentEnemies = getAdjacentTappedEnemies(creature.position)
      if (adjacentEnemies.length === 1) {
        setSelectedSacrificeTarget(adjacentEnemies[0])
      }
    }
  }

  // O(1) - Handle confirm
  const handleConfirm = () => {
    if (selectedDefense === 'cower') {
      onDefenseSelected({
        type: 'cower',
        damageReduction: incomingDamage,
        moraleCost: cowerInfo.moraleCost,
        extraCost: cowerInfo.extraCost,
        creatures: [defenderInstance]
      })
    } else if (selectedDefense === 'unstoppable_hordes') {
      const creatures = [...selectedUndeadCreatures]
      if (defenderCanUseUnstoppable) {
        creatures.unshift(defenderInstance)
      }
      onDefenseSelected({
        type: 'unstoppable_hordes',
        damageReduction: calculateUnstoppableDamageReduction(),
        moraleCost: calculateUnstoppableMoraleCost(),
        creatures: creatures
      })
    } else if (selectedDefense === 'immediate_card') {
      if (selectedImmediateCard && selectedCardCreature) {
        const defensePayload = {
          type: 'immediate_card',
          card: selectedImmediateCard.card,
          creature: selectedCardCreature,
          damageReduction: selectedImmediateCard.damagePrevented,
          moraleCost: selectedImmediateCard.moraleCost,
          discardCard: selectedDiscardCard, // Card player chose to discard (for Uncanny Dodge etc.)
          moraleTarget: selectedMoraleTarget, // Enemy creature for morale loss (Unexpected Resistance)
          sacrificeTarget: selectedSacrificeTarget // Enemy creature for Savage Demise attack
        }
        onDefenseSelected(defensePayload)
      }
    } else {
      onDefenseSelected({ type: 'skip' })
    }

    // Reset state
    setSelectedDefense(null)
    setSelectedUndeadCreatures([])
    setSelectedImmediateCard(null)
    setSelectedCardCreature(null)
    setSelectedDiscardCard(null)
    setSelectedMoraleTarget(null)
    setSelectedSacrificeTarget(null)
  }

  // O(1) - Handle skip
  const handleSkip = () => {
    onDefenseSelected({ type: 'skip' })
    setSelectedDefense(null)
    setSelectedUndeadCreatures([])
    setSelectedImmediateCard(null)
    setSelectedCardCreature(null)
    setSelectedDiscardCard(null)
    setSelectedMoraleTarget(null)
    setSelectedSacrificeTarget(null)
  }

  const hasAnyDefense = cowerInfo?.canCower || unstoppableInfo?.canUse || adjacentUndead.length > 0 || immediateCards.length > 0

  // O(1) - Calculate final damage for display
  // Handle 'ALL' for cards that prevent all damage (Uncanny Dodge, Cloud of Bats)
  const finalDamage = selectedDefense === 'cower'
    ? 0
    : selectedDefense === 'unstoppable_hordes'
      ? Math.max(0, incomingDamage - calculateUnstoppableDamageReduction())
      : selectedDefense === 'immediate_card' && selectedImmediateCard
        ? (selectedImmediateCard.damagePrevented === 'ALL' ? 0 : Math.max(0, incomingDamage - selectedImmediateCard.damagePrevented))
        : incomingDamage

  return (
    <div className="combat-panel defense-options-panel">
      {/* Hover Preview - positioned to the left of the panel */}
      {hoverPreview && (
        <div
          style={{
            position: 'fixed',
            right: '340px', // Position to the left of the ~320px defense panel
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
            maxWidth: '280px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          {hoverPreview.type === 'order' ? (
            <img
              src={hoverPreview.data.card.imageUrl}
              alt={hoverPreview.data.card.name}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          ) : (
            <img
              src={hoverPreview.data.creature.imageUrl}
              alt={hoverPreview.data.creature.name}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          )}
        </div>
      )}

      {/* Header */}
      <div className="combat-panel-header defense-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', marginBottom: '2px' }}>
        <h5 style={{ margin: 0 }}>🛡️ Defend Against Attack</h5>
        <Badge bg="info" style={{ padding: '2px 6px' }}>Morale: {defenderPlayerState.morale}</Badge>
      </div>

      {/* Combat Creatures Display - O(1) render */}
      <div className="combat-creatures-display" style={{ padding: '2px 0' }}>
        {/* Attacker */}
        <div className="combat-creature-section attacker-section">
          <span className="combat-creature-label">Attacker</span>
          <div className="combat-creature-card">
            <CreatureCard creature={attackerInstance.creature} creatureInstance={attackerInstance} compact={true} />
          </div>
          <span className="combat-creature-name">{attackerInstance.creature.name}</span>
        </div>

        {/* VS Divider */}
        <div className="combat-vs-divider">
          <span>VS</span>
        </div>

        {/* Defender */}
        <div className="combat-creature-section defender-section">
          <span className="combat-creature-label">Your Creature</span>
          <div className="combat-creature-card">
            <CreatureCard creature={defenderInstance.creature} creatureInstance={defenderInstance} compact={true} />
          </div>
          <span className="combat-creature-name">{defenderInstance.creature.name}</span>
        </div>
      </div>

      {/* Attack Info */}
      <div className="combat-info">
        {/* Row 1: Attack Type + Damage */}
        <div className="combat-info-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Attack Type:</span>
            <Badge bg={
              attackType === 'ranged' ? 'info'
              : attackType === 'splash' ? 'warning'
              : attackType === 'ranged_splash' ? 'success'
              : attackType === 'flashing_blades' ? 'warning'
              : attackType === 'hidden_blade' ? 'secondary'
              : attackType === 'confusion_gaze' ? 'warning'
              : attackType === 'lightning_breath' ? 'info'
              : 'danger'
            } style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
              {attackType === 'ranged' ? '🏹 Ranged'
               : attackType === 'splash' ? '💀 SWIRL (Splash)'
               : attackType === 'ranged_splash' ? `🔥 ${attackInfo?.abilityName || 'Ranged Splash'}`
               : attackType === 'flashing_blades' ? '⚔️ FLASHING BLADES'
               : attackType === 'hidden_blade' ? '🗡️ HIDDEN BLADE'
               : attackType === 'confusion_gaze' ? '😵 CONFUSION GAZE'
               : attackType === 'lightning_breath' ? '⚡ LIGHTNING BREATH'
               : '⚔️ Melee'}
            </Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Damage:</span>
            {usedFlatDamage ? (
              // Flat damage from order card (Killing Strike) - replaces base damage entirely
              <span>
                <Badge bg="danger" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{originalDamage}</Badge>
                <span style={{ color: '#888', marginLeft: '4px', fontStyle: 'italic', fontSize: '0.7rem' }}>
                  (flat from {damageBoostCard?.name || 'Order Card'})
                </span>
              </span>
            ) : abilityIncludesBonus ? (
              // Ability attack (like Lightning Breath) with damage boost already included
              <span>
                <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{baseDamage - damageBoostBonus}</Badge>
                <span style={{ color: '#ff9800', marginLeft: '4px' }}>+{damageBoostBonus}</span>
                <span style={{ color: '#888', marginLeft: '4px' }}>({damageBoostCard?.name || 'Order Card'})</span>
                <span style={{ marginLeft: '4px' }}>=</span>
                <Badge bg="success" style={{ marginLeft: '4px', fontSize: '0.7rem', padding: '2px 6px' }}>{originalDamage}</Badge>
              </span>
            ) : (cutterBonus > 0 || flankingBonus > 0 || orderCardBonus > 0) ? (
              <span>
                <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{baseDamage}</Badge>
                {flankingBonus > 0 && (
                  <>
                    <span style={{ color: '#4caf50', marginLeft: '4px' }}>+{flankingBonus}</span>
                    <span style={{ color: '#888', marginLeft: '4px' }}>(FLANKING)</span>
                  </>
                )}
                {cutterBonus > 0 && (
                  <>
                    <span style={{ color: '#ff5722', marginLeft: '4px' }}>+{cutterBonus}</span>
                    <span style={{ color: '#888', marginLeft: '4px' }}>(CUTTER)</span>
                  </>
                )}
                {orderCardBonus > 0 && (
                  <>
                    <span style={{ color: '#ff9800', marginLeft: '4px' }}>+{orderCardBonus}</span>
                    <span style={{ color: '#888', marginLeft: '4px' }}>({damageBoostCard?.name || 'Order Card'})</span>
                  </>
                )}
                <span style={{ marginLeft: '4px' }}>=</span>
                <Badge bg="success" style={{ marginLeft: '4px', fontSize: '0.7rem', padding: '2px 6px' }}>{originalDamage}</Badge>
              </span>
            ) : (
              <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{originalDamage}</Badge>
            )}
          </div>
        </div>
        {accumulatedDamageReduction > 0 && (
          <div className="combat-info-row" style={{ fontSize: '0.85rem' }}>
            <span>Already Prevented:</span>
            <Badge bg="success" style={{ fontSize: '0.75rem' }}>{accumulatedDamageReduction}</Badge>
          </div>
        )}
        {/* MAGIC CIRCLE AURA - shows damage prevention from Hobgoblin Sorcerer on Magic Circle */}
        {magicCircleReduction > 0 && (
          <div className="combat-info-row" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: '#9932cc' }}>🔮 MAGIC CIRCLE AURA:</span>
            <span style={{ color: '#9932cc' }}>
              Block {magicCircleReduction} ({originalDamage - accumulatedDamageReduction} → {damageAfterMagicCircle})
            </span>
          </div>
        )}
        {shieldBlockReduction > 0 && (
          <div className="combat-info-row" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: '#2196f3' }}>SHIELD BLOCK:</span>
            <span style={{ color: '#2196f3' }}>
              Block {shieldBlockReduction} ({damageAfterMagicCircle} → {damageAfterShieldBlock})
            </span>
          </div>
        )}
        {/* BLOCK from attachments (Tough as Nails) - shows damage reduction from attached cards */}
        {attachmentBlockAmount > 0 && (
          <div className="combat-info-row" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: '#17a2b8' }}>🛡️ BLOCK (Tough as Nails):</span>
            <span style={{ color: '#17a2b8' }}>
              -{attachmentBlockAmount} dmg ({damageAfterShieldBlock} → {incomingDamage})
            </span>
          </div>
        )}
        {/* Row 2: Remaining Damage + Target HP */}
        <div className="combat-info-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Remaining Damage:</span>
            <Badge bg="danger" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{incomingDamage}</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Target HP:</span>
            <Badge bg="info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{defenderInstance.currentHP}/{defenderInstance.creature.hitPoints}</Badge>
          </div>
        </div>
        {/* REACH 2 indicator - shows when being attacked from extended range */}
        {isReachAttack && (
          <div className="combat-info-row" style={{ borderTop: '1px solid #444', paddingTop: '6px', marginTop: '6px' }}>
            <span style={{ color: '#ff9800' }}>🗡️ REACH 2:</span>
            <span style={{ color: '#ff9800' }}>
              Being attacked from range {reachDistance}
            </span>
          </div>
        )}
        {/* TAP ON HIT warning - shows that your creature will be tapped if damage is taken */}
        {tapOnHitApplies && (
          <div className="combat-info-row" style={{ borderTop: '1px solid #444', paddingTop: '6px', marginTop: '6px' }}>
            <span style={{ color: '#e91e63' }}>⚠️ TAP ON HIT:</span>
            <span style={{ color: '#e91e63' }}>
              {defenderAlreadyTapped
                ? 'Your creature is already tapped'
                : 'Your creature will be TAPPED if it takes damage!'
              }
            </span>
          </div>
        )}
        {tapOnHitApplies && !defenderAlreadyTapped && (
          <div style={{ fontSize: '0.75rem', color: '#e91e63', fontStyle: 'italic', marginTop: '4px', backgroundColor: 'rgba(233,30,99,0.1)', padding: '4px', borderRadius: '4px' }}>
            💡 Tip: Block ALL damage (Cower/Immediate) to prevent being tapped!
          </div>
        )}
      </div>

      {/* Attacker's Order Card Display - shows which card is boosting this attack */}
      {damageBoostCard && (
        <div style={{
          backgroundColor: 'rgba(255, 152, 0, 0.15)',
          border: '1px solid #ff9800',
          borderRadius: '8px',
          padding: '8px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Card Image */}
          <div
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoverPreview({ type: 'order', data: { card: damageBoostCard } })}
            onMouseLeave={() => setHoverPreview(null)}
          >
            <img
              src={damageBoostCard.imageUrl}
              alt={damageBoostCard.name}
              style={{
                height: '80px',
                borderRadius: '4px',
                border: '2px solid #ff9800',
                boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)'
              }}
            />
          </div>
          {/* Card Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 'bold',
              color: '#ff9800',
              fontSize: '0.9rem',
              marginBottom: '4px'
            }}>
              Attack Boosted By: {damageBoostCard.name}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#adb5bd',
              fontStyle: 'italic',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
            }}>
              {damageBoostCard.effectDescription}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Defense Options */}
      <div className="defense-options-scroll">
        {!hasAnyDefense && (
          <Alert variant="warning" className="py-2">
            <strong>No defensive options available!</strong>
            <br />
            <small>
              {defenderInstance.isTapped
                ? 'Your creature is tapped.'
                : 'Not enough morale or eligible creatures.'}
            </small>
          </Alert>
        )}

        {/* COWER Option */}
        {cowerInfo?.canCower && (
          <Card
            bg={selectedDefense === 'cower' ? 'success' : 'dark'}
            text="white"
            className="defense-option-card mb-2"
            style={{
              cursor: 'pointer',
              border: selectedDefense === 'cower' ? '2px solid #28a745' : '2px solid #ffc107'
            }}
            onClick={() => handleSelectDefense('cower')}
          >
            <Card.Body className="py-2 px-2">
              <div className="d-flex justify-content-between align-items-start">
                <div style={{ flex: 1 }}>
                  {/* Row 1: COWER | Cost | Morale change */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>🛡️ COWER</span>
                    {cowerInfo.extraCost > 0 && (
                      <Badge bg="danger" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        +{cowerInfo.extraCost} BLACK HAND
                      </Badge>
                    )}
                    <Badge bg="danger" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                      Cost: {cowerInfo.moraleCost} Morale
                    </Badge>
                    <span style={{ fontSize: '0.75rem', color: selectedDefense === 'cower' ? '#fff' : '#adb5bd' }}>
                      Morale: {defenderPlayerState.morale} → {defenderPlayerState.morale - cowerInfo.moraleCost}
                    </span>
                  </div>
                  {/* Row 2: Description */}
                  <p className="mb-0" style={{ fontSize: '0.8rem' }}>
                    Avoid <strong style={{ color: selectedDefense === 'cower' ? '#fff' : '#28a745' }}>ALL {incomingDamage} damage</strong>. Creature becomes tapped.
                  </p>
                </div>
                {selectedDefense === 'cower' && (
                  <Badge bg="light" text="dark" style={{ fontSize: '1rem' }}>✓</Badge>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* UNSTOPPABLE HORDES Option */}
        {(unstoppableInfo?.canUse || adjacentUndead.length > 0) && (
          <Card
            bg={selectedDefense === 'unstoppable_hordes' ? 'info' : 'dark'}
            text="white"
            className="defense-option-card mb-2"
            style={{
              cursor: 'pointer',
              border: selectedDefense === 'unstoppable_hordes' ? '2px solid #17a2b8' : '2px solid #17a2b8'
            }}
            onClick={() => handleSelectDefense('unstoppable_hordes')}
          >
            <Card.Body className="py-2 px-2">
              <div className="d-flex justify-content-between align-items-start">
                <div style={{ flex: 1 }}>
                  <h6 className="mb-1">
                    💀 UNSTOPPABLE HORDES
                    <Badge bg="info" className="ms-2" style={{ fontSize: '0.7rem' }}>Commander</Badge>
                  </h6>
                  <p className="mb-1" style={{ fontSize: '0.8rem' }}>
                    Tap Undead to prevent <strong>20 damage each</strong>. Can stack!
                  </p>

                  {selectedDefense === 'unstoppable_hordes' && (
                    <div className="mt-2 p-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <strong className="d-block mb-1">Select Undead:</strong>
                      {defenderCanUseUnstoppable && (
                        <Form.Check
                          type="checkbox"
                          id="defender-unstoppable"
                          label={<span><strong>{defenderInstance.creature.name}</strong> (Defender)</span>}
                          checked={true}
                          disabled={true}
                          className="mb-1"
                          style={{ color: '#fff', fontSize: '0.8rem' }}
                        />
                      )}
                      {adjacentUndead.map((creature) => (
                        <Form.Check
                          key={creature.instanceId}
                          type="checkbox"
                          id={`undead-${creature.instanceId}`}
                          label={<span><strong>{creature.creature.name}</strong> (Adjacent)</span>}
                          checked={selectedUndeadCreatures.some(c => c.instanceId === creature.instanceId)}
                          onChange={() => toggleUndeadCreature(creature)}
                          className="mb-1"
                          style={{ color: '#fff', fontSize: '0.8rem' }}
                        />
                      ))}
                      {(selectedUndeadCreatures.length > 0 || defenderCanUseUnstoppable) && (
                        <div className="mt-2 p-1" style={{ backgroundColor: 'rgba(23,162,184,0.3)', borderRadius: '4px' }}>
                          <small>
                            Prevention: {calculateUnstoppableDamageReduction()} |
                            Cost: {calculateUnstoppableMoraleCost()} morale |
                            After: {Math.max(0, incomingDamage - calculateUnstoppableDamageReduction())} damage
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedDefense === 'unstoppable_hordes' && (
                  <Badge bg="light" text="dark" style={{ fontSize: '1rem' }}>✓</Badge>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* IMMEDIATE Cards Option */}
        {immediateCards.length > 0 && (
          <Card
            bg="dark"
            text="white"
            className="defense-option-card mb-2"
            style={{
              border: selectedDefense === 'immediate_card' ? '2px solid #ffc107' : '2px solid #6f42c1'
            }}
          >
            <Card.Body className="py-2 px-2">
              <h6 className="mb-2">
                ⚡ IMMEDIATE Cards
              </h6>

              {/* Card images grid - 3 columns */}
              <div
                className="immediate-cards-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {immediateCards.map((cardInfo, index) => (
                  <div
                    key={`${cardInfo.card.id}-${index}`}
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      border: selectedImmediateCard?.card.id === cardInfo.card.id
                        ? '3px solid #28a745'
                        : '2px solid transparent',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectImmediateCard(cardInfo)
                    }}
                    onMouseEnter={() => setHoverPreview({ type: 'order', data: cardInfo })}
                    onMouseLeave={() => setHoverPreview(null)}
                  >
                    {/* Card Image */}
                    <img
                      src={cardInfo.card.imageUrl}
                      alt={cardInfo.card.name}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                    {/* Damage Prevention Overlay / Sacrifice Attack indicator */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: cardInfo.card.selfSacrificeAttack ? '#dc3545' : '#28a745',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {cardInfo.card.selfSacrificeAttack
                        ? '⚔️ SACRIFICE'
                        : cardInfo.moraleCost > 0
                          ? `-${cardInfo.moraleCost}M / -${cardInfo.damagePrevented}dmg`
                          : `-${cardInfo.damagePrevented}dmg`
                      }
                    </div>
                    {/* Selected checkmark */}
                    {selectedImmediateCard?.card.id === cardInfo.card.id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Creature selection with card images */}
              {selectedDefense === 'immediate_card' && selectedImmediateCard && (
                <div
                  className="mt-2 p-2"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <strong className="d-block mb-2" style={{ fontSize: '0.85rem' }}>Select creature to use card:</strong>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '4px'
                    }}
                  >
                    {selectedImmediateCard.eligibleCreatures.map((creature) => (
                      <div
                        key={creature.instanceId}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '6px',
                          border: selectedCardCreature?.instanceId === creature.instanceId
                            ? '3px solid #007bff'
                            : '2px solid #444',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                        onClick={() => handleSelectCardCreature(creature)}
                        onMouseEnter={() => setHoverPreview({ type: 'creature', data: creature })}
                        onMouseLeave={() => setHoverPreview(null)}
                      >
                        {/* Creature Image */}
                        <img
                          src={creature.creature.imageUrl}
                          alt={creature.creature.name}
                          style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block'
                          }}
                        />
                        {/* Badge showing creature's role */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '2px',
                            backgroundColor: selectedImmediateCard.protectTargetType && selectedImmediateCard.protectTargetType !== 'self'
                              ? '#17a2b8' // Teal for ally-protecting cards
                              : creature.instanceId === defenderInstance.instanceId ? '#007bff' : '#6c757d',
                            color: 'white',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontSize: '0.5rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {selectedImmediateCard.protectTargetType && selectedImmediateCard.protectTargetType !== 'self'
                            ? 'PROTECTOR' // This creature will protect the defender
                            : creature.instanceId === defenderInstance.instanceId ? 'DEFENDER' : 'ADJACENT'}
                        </div>
                        {/* Selected checkmark */}
                        {selectedCardCreature?.instanceId === creature.instanceId && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              borderRadius: '50%',
                              width: '14px',
                              height: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.6rem',
                              fontWeight: 'bold'
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discard card selection - for cards like Uncanny Dodge that require discarding */}
              {selectedDefense === 'immediate_card' && selectedImmediateCard && selectedCardCreature && selectedImmediateCard.discardCost > 0 && (
                <div
                  className="mt-2 p-2"
                  style={{ backgroundColor: 'rgba(255,193,7,0.2)', borderRadius: '6px', border: '1px solid #ffc107' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <strong className="d-block mb-2" style={{ fontSize: '0.85rem', color: '#ffc107' }}>
                    ⚠️ Select {selectedImmediateCard.discardCost} card to discard:
                  </strong>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '4px',
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}
                  >
                    {/* Show all other cards in hand (excluding the selected immediate card) */}
                    {defenderPlayerState.orderHand
                      .filter(card => card.id !== selectedImmediateCard.card.id)
                      .map((card, index) => (
                        <div
                          key={`discard-${card.id}-${index}`}
                          style={{
                            cursor: 'pointer',
                            borderRadius: '6px',
                            border: selectedDiscardCard?.id === card.id
                              ? '3px solid #dc3545'
                              : '2px solid #444',
                            overflow: 'hidden',
                            position: 'relative',
                            opacity: selectedDiscardCard?.id === card.id ? 1 : 0.8
                          }}
                          onClick={() => setSelectedDiscardCard(card)}
                          onMouseEnter={() => setHoverPreview({ type: 'order', data: { card } })}
                          onMouseLeave={() => setHoverPreview(null)}
                        >
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            style={{
                              width: '100%',
                              height: 'auto',
                              display: 'block'
                            }}
                          />
                          {/* Discard indicator */}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '2px',
                              left: '2px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              fontSize: '0.5rem',
                              fontWeight: 'bold'
                            }}
                          >
                            DISCARD
                          </div>
                          {/* Selected checkmark */}
                          {selectedDiscardCard?.id === card.id && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                borderRadius: '50%',
                                width: '14px',
                                height: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.6rem',
                                fontWeight: 'bold'
                              }}
                            >
                              ✓
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Morale target selection - for cards like Unexpected Resistance */}
              {selectedDefense === 'immediate_card' && selectedImmediateCard && selectedCardCreature &&
                selectedImmediateCard.card.moraleLossTargetType === 'adjacent_tapped_enemy' && (() => {
                  const adjacentEnemies = getAdjacentTappedEnemies(selectedCardCreature.position)
                  // Only show selection if there are multiple targets
                  if (adjacentEnemies.length <= 1) return null

                  return (
                    <div
                      className="mt-2 p-2"
                      style={{ backgroundColor: 'rgba(220,53,69,0.2)', borderRadius: '6px', border: '1px solid #dc3545' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <strong className="d-block mb-2" style={{ fontSize: '0.85rem', color: '#dc3545' }}>
                        Select enemy creature for morale loss:
                      </strong>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '4px',
                          maxHeight: '150px',
                          overflowY: 'auto'
                        }}
                      >
                        {adjacentEnemies.map((enemyInfo, index) => {
                          const enemy = enemyInfo.creature
                          const owner = gameState.players[enemyInfo.owner]
                          return (
                            <div
                              key={`morale-target-${enemy.instanceId}-${index}`}
                              style={{
                                cursor: 'pointer',
                                borderRadius: '6px',
                                border: selectedMoraleTarget?.creature?.instanceId === enemy.instanceId
                                  ? '3px solid #dc3545'
                                  : '2px solid #444',
                                overflow: 'hidden',
                                position: 'relative',
                                opacity: selectedMoraleTarget?.creature?.instanceId === enemy.instanceId ? 1 : 0.8,
                                backgroundColor: '#2c2f33'
                              }}
                              onClick={() => setSelectedMoraleTarget(enemyInfo)}
                              onMouseEnter={() => setHoverPreview({ type: 'creature', data: enemy })}
                              onMouseLeave={() => setHoverPreview(null)}
                            >
                              <img
                                src={enemy.creature?.imageUrl || enemy.imageUrl}
                                alt={enemy.creature?.name || enemy.name}
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  display: 'block'
                                }}
                              />
                              {/* Owner badge */}
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  left: '2px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  fontSize: '0.5rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                {owner?.commander?.name?.split(' ')[0] || 'Enemy'}
                              </div>
                              {/* Selected checkmark */}
                              {selectedMoraleTarget?.creature?.instanceId === enemy.instanceId && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '14px',
                                    height: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  ✓
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

              {/* Sacrifice target selection - for cards like Savage Demise */}
              {selectedDefense === 'immediate_card' && selectedImmediateCard && selectedCardCreature &&
                selectedImmediateCard.card.selfSacrificeAttack && (() => {
                  const adjacentEnemies = getAdjacentTappedEnemies(selectedCardCreature.position)
                  // If no targets, card shouldn't be selectable (filtered earlier)
                  if (adjacentEnemies.length === 0) return null

                  // Calculate attack damage for display
                  const attackDamage = selectedCardCreature.creature?.meleeAttack?.damage || 0

                  return (
                    <div
                      className="mt-2 p-2"
                      style={{ backgroundColor: 'rgba(220,53,69,0.3)', borderRadius: '6px', border: '2px solid #dc3545' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Warning about self-destruction */}
                      <Alert
                        variant="danger"
                        className="py-1 px-2 mb-2"
                        style={{ fontSize: '0.75rem', backgroundColor: 'rgba(220,53,69,0.4)' }}
                      >
                        <strong>⚠️ WARNING:</strong> Your creature will DIE after this attack!
                      </Alert>

                      <strong className="d-block mb-2" style={{ fontSize: '0.85rem', color: '#dc3545' }}>
                        Select enemy to attack ({attackDamage} damage):
                      </strong>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '4px',
                          maxHeight: '150px',
                          overflowY: 'auto'
                        }}
                      >
                        {adjacentEnemies.map((enemyInfo, index) => {
                          const enemy = enemyInfo.creature
                          const owner = gameState.players[enemyInfo.owner]
                          return (
                            <div
                              key={`sacrifice-target-${enemy.instanceId}-${index}`}
                              style={{
                                cursor: 'pointer',
                                borderRadius: '6px',
                                border: selectedSacrificeTarget?.creature?.instanceId === enemy.instanceId
                                  ? '3px solid #dc3545'
                                  : '2px solid #444',
                                overflow: 'hidden',
                                position: 'relative',
                                opacity: selectedSacrificeTarget?.creature?.instanceId === enemy.instanceId ? 1 : 0.8,
                                backgroundColor: '#2c2f33'
                              }}
                              onClick={() => setSelectedSacrificeTarget(enemyInfo)}
                              onMouseEnter={() => setHoverPreview({ type: 'creature', data: enemy })}
                              onMouseLeave={() => setHoverPreview(null)}
                            >
                              <img
                                src={enemy.creature?.imageUrl || enemy.imageUrl}
                                alt={enemy.creature?.name || enemy.name}
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  display: 'block'
                                }}
                              />
                              {/* Owner badge */}
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  left: '2px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  fontSize: '0.5rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                {owner?.commander?.name?.split(' ')[0] || 'Enemy'}
                              </div>
                              {/* HP display */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '2px',
                                  left: '2px',
                                  backgroundColor: 'rgba(0,0,0,0.8)',
                                  color: enemy.currentHP <= attackDamage ? '#dc3545' : '#28a745',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  fontSize: '0.5rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                {enemy.currentHP} HP
                              </div>
                              {/* Selected checkmark */}
                              {selectedSacrificeTarget?.creature?.instanceId === enemy.instanceId && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '14px',
                                    height: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  ✓
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
            </Card.Body>
          </Card>
        )}

        {/* Summary */}
        {selectedDefense && (
          <Alert
            variant={
              selectedImmediateCard?.card?.selfSacrificeAttack ? 'danger'
              : finalDamage === 0 ? 'success'
              : finalDamage < incomingDamage ? 'info'
              : 'warning'
            }
            className="py-2 mt-2"
            style={{ fontSize: '0.8rem' }}
          >
            <strong>Summary:</strong>
            <br />
            {selectedImmediateCard?.card?.selfSacrificeAttack ? (
              <>
                Your creature will attack for {selectedCardCreature?.creature?.meleeAttack?.damage || 0} damage, then <strong style={{ color: '#dc3545' }}>DIE</strong>.
                <br />
                <span style={{ fontSize: '0.75rem', color: '#adb5bd' }}>Original attack will be negated.</span>
              </>
            ) : (
              <>Incoming: {incomingDamage} | Reduced: {incomingDamage - finalDamage} | Final: <strong>{finalDamage}</strong></>
            )}
            {/* Attachment warnings for cards like Leap Away, Mortal Wound */}
            {selectedImmediateCard?.card?.attachOnUse && (
              <div style={{ color: '#ffc107', fontSize: '0.75rem', marginTop: '4px' }}>
                ⚠️ This card will attach to your creature
                {selectedImmediateCard.card.attachOnUse.preventsMovement && ' (cannot move/shift)'}
                {selectedImmediateCard.card.attachOnUse.destroyAtDeploy && <span style={{ color: '#dc3545' }}> (dies at Deploy phase!)</span>}
                {selectedImmediateCard.card.attachOnUse.blockAmount > 0 &&
                  ` (gains Block ${selectedImmediateCard.card.attachOnUse.blockAmount})`}
              </div>
            )}
          </Alert>
        )}
      </div>

      {/* Action Buttons */}
      <div className="combat-actions">
        <Button variant="outline-secondary" size="sm" onClick={handleSkip}>
          Take {incomingDamage} Damage
        </Button>
        <Button
          variant={
            selectedDefense === 'cower' ? 'success'
            : selectedDefense === 'unstoppable_hordes' ? 'info'
            : selectedDefense === 'immediate_card' ? 'warning'
            : 'primary'
          }
          size="sm"
          onClick={handleConfirm}
          disabled={
            !selectedDefense
            || (selectedDefense === 'unstoppable_hordes' && calculateUnstoppableMoraleCost() === 0)
            || (selectedDefense === 'immediate_card' && (!selectedImmediateCard || !selectedCardCreature))
            || (selectedDefense === 'immediate_card' && selectedImmediateCard?.discardCost > 0 && !selectedDiscardCard)
            || (selectedDefense === 'immediate_card' && selectedImmediateCard?.card?.moraleLossTargetType === 'adjacent_tapped_enemy' && selectedCardCreature && getAdjacentTappedEnemies(selectedCardCreature.position).length > 1 && !selectedMoraleTarget)
            || (selectedDefense === 'immediate_card' && selectedImmediateCard?.card?.selfSacrificeAttack && !selectedSacrificeTarget)
          }
        >
          {selectedDefense === 'cower'
            ? '🛡️ COWER'
            : selectedDefense === 'unstoppable_hordes'
              ? `💀 Use (${calculateUnstoppableDamageReduction()} prevented)`
              : selectedDefense === 'immediate_card' && selectedImmediateCard
                ? `⚡ Use ${selectedImmediateCard.card.name}`
                : 'Select Defense'}
        </Button>
      </div>
    </div>
  )
}

export default DefenseOptionsPanel
