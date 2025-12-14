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
  onDefenseSelected,
  onSkip
}) {
  const [selectedDefense, setSelectedDefense] = useState(null)
  const [selectedUndeadCreatures, setSelectedUndeadCreatures] = useState([])
  const [selectedImmediateCard, setSelectedImmediateCard] = useState(null)
  const [selectedCardCreature, setSelectedCardCreature] = useState(null)

  // O(1) - Reset state when defender changes
  useEffect(() => {
    setSelectedDefense(null)
    setSelectedUndeadCreatures([])
    setSelectedImmediateCard(null)
    setSelectedCardCreature(null)
  }, [defenderInstance?.instanceId])

  if (!defenderPlayerState || !defenderInstance || !attackerInstance) {
    return null
  }

  // O(1) - Calculate incoming damage using attackInfo prop
  const attackType = attackInfo?.attackType || 'melee'

  // Calculate original damage based on attack type
  // For special abilities (splash, flashing_blades, hidden_blade, confusion_gaze), use attackInfo.damage
  // For normal attacks, calculate from creature stats
  let baseDamage
  if (attackInfo?.damage !== undefined && (
    attackType === 'splash' ||
    attackType === 'ranged_splash' ||
    attackType === 'flashing_blades' ||
    attackType === 'hidden_blade' ||
    attackType === 'confusion_gaze'
  )) {
    // Special ability attacks have fixed damage in attackInfo
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

  // Total damage includes base + FLANKING + CUTTER bonuses
  const originalDamage = baseDamage + flankingBonus + cutterBonus

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
  const incomingDamage = Math.max(0, damageAfterMagicCircle - shieldBlockReduction)

  // O(n) - Get defense options from gameState
  const defenseOptions = gameState?.getDefenseOptions
    ? gameState.getDefenseOptions(defenderInstance, incomingDamage, attackerInstance.owner)
    : { cower: null, unstoppableHordes: null, adjacentUndead: [], immediateCards: [] }

  const { cower: cowerInfo, unstoppableHordes: unstoppableInfo, adjacentUndead, immediateCards } = defenseOptions
  const defenderCanUseUnstoppable = unstoppableInfo?.canUse

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

  // O(1) - Handle defense selection
  const handleSelectDefense = (defenseType) => {
    if (selectedDefense === defenseType) {
      setSelectedDefense(null)
      setSelectedUndeadCreatures([])
      setSelectedImmediateCard(null)
      setSelectedCardCreature(null)
    } else {
      setSelectedDefense(defenseType)
      if (defenseType !== 'unstoppable_hordes') {
        setSelectedUndeadCreatures([])
      }
      if (defenseType !== 'immediate_card') {
        setSelectedImmediateCard(null)
        setSelectedCardCreature(null)
      }
    }
  }

  // O(1) - Handle IMMEDIATE card selection
  const handleSelectImmediateCard = (cardInfo) => {
    setSelectedDefense('immediate_card')
    setSelectedImmediateCard(cardInfo)
    if (cardInfo.eligibleCreatures.length === 1) {
      setSelectedCardCreature(cardInfo.eligibleCreatures[0])
    } else {
      setSelectedCardCreature(null)
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
        onDefenseSelected({
          type: 'immediate_card',
          card: selectedImmediateCard.card,
          creature: selectedCardCreature,
          damageReduction: selectedImmediateCard.damagePrevented,
          moraleCost: selectedImmediateCard.moraleCost
        })
      }
    } else {
      onDefenseSelected({ type: 'skip' })
    }

    // Reset state
    setSelectedDefense(null)
    setSelectedUndeadCreatures([])
    setSelectedImmediateCard(null)
    setSelectedCardCreature(null)
  }

  // O(1) - Handle skip
  const handleSkip = () => {
    onDefenseSelected({ type: 'skip' })
    setSelectedDefense(null)
    setSelectedUndeadCreatures([])
    setSelectedImmediateCard(null)
    setSelectedCardCreature(null)
  }

  const hasAnyDefense = cowerInfo?.canCower || unstoppableInfo?.canUse || adjacentUndead.length > 0 || immediateCards.length > 0

  // O(1) - Calculate final damage for display
  const finalDamage = selectedDefense === 'cower'
    ? 0
    : selectedDefense === 'unstoppable_hordes'
      ? Math.max(0, incomingDamage - calculateUnstoppableDamageReduction())
      : selectedDefense === 'immediate_card' && selectedImmediateCard
        ? Math.max(0, incomingDamage - selectedImmediateCard.damagePrevented)
        : incomingDamage

  return (
    <div className="combat-panel defense-options-panel">
      {/* Header */}
      <div className="combat-panel-header defense-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h5 style={{ margin: 0 }}>🛡️ Defend Against Attack</h5>
        <Badge bg="info">Morale: {defenderPlayerState.morale}</Badge>
      </div>

      {/* Combat Creatures Display - O(1) render */}
      <div className="combat-creatures-display">
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
        <div className="combat-info-row">
          <span>Attack Type:</span>
          <Badge bg={
            attackType === 'ranged' ? 'info'
            : attackType === 'splash' ? 'warning'
            : attackType === 'ranged_splash' ? 'success'
            : attackType === 'flashing_blades' ? 'warning'
            : attackType === 'hidden_blade' ? 'secondary'
            : attackType === 'confusion_gaze' ? 'warning'
            : 'danger'
          }>
            {attackType === 'ranged' ? '🏹 Ranged'
             : attackType === 'splash' ? '💀 SWIRL (Splash)'
             : attackType === 'ranged_splash' ? `🔥 ${attackInfo?.abilityName || 'Ranged Splash'}`
             : attackType === 'flashing_blades' ? '⚔️ FLASHING BLADES'
             : attackType === 'hidden_blade' ? '🗡️ HIDDEN BLADE'
             : attackType === 'confusion_gaze' ? '😵 CONFUSION GAZE'
             : '⚔️ Melee'}
          </Badge>
        </div>
        <div className="combat-info-row">
          <span>Damage:</span>
          {cutterBonus > 0 || flankingBonus > 0 ? (
            <span>
              <Badge bg="warning" text="dark">{baseDamage}</Badge>
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
              <span style={{ marginLeft: '4px' }}>=</span>
              <Badge bg="success" style={{ marginLeft: '4px' }}>{originalDamage}</Badge>
            </span>
          ) : (
            <Badge bg="warning" text="dark">{originalDamage}</Badge>
          )}
        </div>
        {accumulatedDamageReduction > 0 && (
          <div className="combat-info-row">
            <span>Already Prevented:</span>
            <Badge bg="success">{accumulatedDamageReduction}</Badge>
          </div>
        )}
        {/* MAGIC CIRCLE AURA - shows damage prevention from Hobgoblin Sorcerer on Magic Circle */}
        {magicCircleReduction > 0 && (
          <div className="combat-info-row">
            <span style={{ color: '#9932cc' }}>🔮 MAGIC CIRCLE AURA:</span>
            <span style={{ color: '#9932cc' }}>
              Block {magicCircleReduction} ({originalDamage - accumulatedDamageReduction} → {damageAfterMagicCircle})
            </span>
          </div>
        )}
        {shieldBlockReduction > 0 && (
          <div className="combat-info-row">
            <span style={{ color: '#2196f3' }}>SHIELD BLOCK:</span>
            <span style={{ color: '#2196f3' }}>
              Block {shieldBlockReduction} ({damageAfterMagicCircle} → {incomingDamage})
            </span>
          </div>
        )}
        <div className="combat-info-row">
          <span>Remaining Damage:</span>
          <Badge bg="danger">{incomingDamage}</Badge>
        </div>
        <div className="combat-info-row">
          <span>Target HP:</span>
          <span className="hp-display">
            {defenderInstance.currentHP}/{defenderInstance.creature.hitPoints}
          </span>
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
                  <h6 className="mb-1">
                    🛡️ COWER
                    <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: '0.7rem' }}>Universal</Badge>
                    {cowerInfo.extraCost > 0 && (
                      <Badge bg="danger" className="ms-1" style={{ fontSize: '0.65rem' }}>
                        +{cowerInfo.extraCost} BLACK HAND
                      </Badge>
                    )}
                  </h6>
                  <p className="mb-1" style={{ fontSize: '0.8rem' }}>
                    Avoid <strong className="text-success">ALL {incomingDamage} damage</strong>.
                    Creature becomes tapped.
                  </p>
                  <div className="d-flex gap-1 flex-wrap">
                    <Badge bg="danger" style={{ fontSize: '0.75rem' }}>
                      Cost: {cowerInfo.moraleCost} Morale
                    </Badge>
                  </div>
                  <small style={{ fontSize: '0.75rem', color: '#adb5bd' }}>
                    Morale: {defenderPlayerState.morale} → {defenderPlayerState.morale - cowerInfo.moraleCost}
                  </small>
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
            bg={selectedDefense === 'immediate_card' ? 'warning' : 'dark'}
            text={selectedDefense === 'immediate_card' ? 'dark' : 'white'}
            className="defense-option-card mb-2"
            style={{
              cursor: 'pointer',
              border: selectedDefense === 'immediate_card' ? '2px solid #ffc107' : '2px solid #6f42c1'
            }}
            onClick={() => {
              if (!selectedImmediateCard && immediateCards.length > 0) {
                handleSelectImmediateCard(immediateCards[0])
              } else {
                handleSelectDefense('immediate_card')
              }
            }}
          >
            <Card.Body className="py-2 px-2">
              <h6 className="mb-2">
                ⚡ IMMEDIATE Cards
                <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>Order Cards</Badge>
              </h6>

              <div className="immediate-cards-list">
                {immediateCards.map((cardInfo, index) => (
                  <Card
                    key={`${cardInfo.card.id}-${index}`}
                    bg={selectedImmediateCard?.card.id === cardInfo.card.id ? 'success' : 'secondary'}
                    text="white"
                    className="mb-1"
                    style={{
                      cursor: 'pointer',
                      border: selectedImmediateCard?.card.id === cardInfo.card.id ? '2px solid #28a745' : '1px solid #444',
                      fontSize: '0.8rem'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectImmediateCard(cardInfo)
                    }}
                  >
                    <Card.Body className="py-1 px-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{cardInfo.card.name}</strong>
                          <Badge bg="info" className="ms-1" style={{ fontSize: '0.65rem' }}>Lv{cardInfo.card.level}</Badge>
                          <br />
                          <small>
                            {cardInfo.moraleCost > 0
                              ? `Lose ${cardInfo.moraleCost} Morale to prevent ${cardInfo.damagePrevented} damage`
                              : `Prevents ${cardInfo.damagePrevented} damage`
                            }
                          </small>
                        </div>
                        {selectedImmediateCard?.card.id === cardInfo.card.id && (
                          <Badge bg="light" text="dark">✓</Badge>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>

              {/* Creature selection */}
              {selectedDefense === 'immediate_card' && selectedImmediateCard && (
                <div
                  className="mt-2 p-2"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.8rem' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <strong className="d-block mb-1">Select creature to use card:</strong>
                  {selectedImmediateCard.eligibleCreatures.map((creature) => (
                    <Form.Check
                      key={creature.instanceId}
                      type="radio"
                      id={`immediate-creature-${creature.instanceId}`}
                      name="immediateCreatureSelection"
                      label={
                        <span>
                          <strong>{creature.creature.name}</strong>
                          {creature.instanceId === defenderInstance.instanceId
                            ? <Badge bg="primary" className="ms-1" style={{ fontSize: '0.65rem' }}>Defender</Badge>
                            : <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.65rem' }}>Adjacent</Badge>
                          }
                        </span>
                      }
                      checked={selectedCardCreature?.instanceId === creature.instanceId}
                      onChange={() => setSelectedCardCreature(creature)}
                      className="mb-1"
                      style={{ color: '#fff', fontSize: '0.8rem' }}
                    />
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Summary */}
        {selectedDefense && (
          <Alert
            variant={finalDamage === 0 ? 'success' : finalDamage < incomingDamage ? 'info' : 'warning'}
            className="py-2 mt-2"
            style={{ fontSize: '0.8rem' }}
          >
            <strong>Summary:</strong>
            <br />
            Incoming: {incomingDamage} | Reduced: {incomingDamage - finalDamage} | Final: <strong>{finalDamage}</strong>
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
