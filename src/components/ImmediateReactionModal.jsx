import { useState, useEffect } from 'react'
import { Modal, Button, Card, Badge, Row, Col, Alert, Form } from 'react-bootstrap'
import { ActionTypes } from '../models/orders'
import './ImmediateReactionModal.css'

/**
 * Modal that appears when an attack is declared, allowing the defender to use
 * defensive options before damage is resolved.
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
 *    - Each creature that uses it becomes tapped
 *    - NOT affected by BLACK HAND OF BANE
 *
 * 3. IMMEDIATE Cards (Order Cards)
 *    - Use an IMMEDIATE order card from your hand
 *    - Cost: 0 morale
 *    - Effect: Prevent 10 damage
 *    - Can be used by defender OR adjacent friendly untapped creatures
 *    - The creature using the card becomes tapped
 *    - Card is discarded after use
 *
 * Note: COWER, UNSTOPPABLE HORDES, and IMMEDIATE cards are MUTUALLY EXCLUSIVE
 *
 * Big O Complexity:
 * - getDefenseOptions: O(n) where n = cards in hand + adjacent creatures
 * - Rendering: O(n) where n = adjacent creatures + immediate cards
 */
function ImmediateReactionModal({
  show,
  attackerInstance,
  defenderInstance,
  defenderPlayerState,
  gameState,
  accumulatedDamageReduction = 0, // Damage already prevented by previous defenses
  onDefenseSelected, // New unified callback: { type: 'cower' | 'unstoppable_hordes' | 'immediate_card' | 'skip', creatures: [...] }
  onCardsPlayed,
  onSkip,
  onCower // Legacy callback - kept for backwards compatibility
}) {
  const [selectedDefense, setSelectedDefense] = useState(null) // 'cower', 'unstoppable_hordes', or 'immediate_card'
  const [selectedUndeadCreatures, setSelectedUndeadCreatures] = useState([]) // For UNSTOPPABLE HORDES stacking
  const [selectedImmediateCard, setSelectedImmediateCard] = useState(null) // For IMMEDIATE cards
  const [selectedCardCreature, setSelectedCardCreature] = useState(null) // Creature using the IMMEDIATE card

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setSelectedDefense(null)
      setSelectedUndeadCreatures([])
      setSelectedImmediateCard(null)
      setSelectedCardCreature(null)
    }
  }, [show])

  if (!show || !defenderPlayerState || !defenderInstance || !attackerInstance) return null

  // Calculate incoming damage (original attack damage)
  const attackType = attackerInstance.attackType || 'melee'
  const originalDamage = attackType === 'melee'
    ? attackerInstance.creature.meleeAttack?.damage || 0
    : attackerInstance.creature.rangedAttack?.damage || 0

  // Calculate remaining damage after accumulated reduction from previous defenses
  const incomingDamage = Math.max(0, originalDamage - accumulatedDamageReduction)

  // Get defense options from gameState (based on REMAINING damage, not original)
  const defenseOptions = gameState?.getDefenseOptions
    ? gameState.getDefenseOptions(defenderInstance, incomingDamage, attackerInstance.owner)
    : { cower: null, unstoppableHordes: null, adjacentUndead: [], immediateCards: [] }

  const { cower: cowerInfo, unstoppableHordes: unstoppableInfo, adjacentUndead, immediateCards } = defenseOptions

  // Check if defender itself can use UNSTOPPABLE HORDES
  const defenderCanUseUnstoppable = unstoppableInfo?.canUse

  // Toggle selection of an Undead creature for UNSTOPPABLE HORDES
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

  // Calculate total damage prevented by selected Undead creatures
  const calculateUnstoppableDamageReduction = () => {
    let count = selectedUndeadCreatures.length
    // Add defender if using UNSTOPPABLE HORDES and defender itself can use it
    if (selectedDefense === 'unstoppable_hordes' && defenderCanUseUnstoppable) {
      count++
    }
    return count * 20
  }

  // Calculate total morale cost for UNSTOPPABLE HORDES
  const calculateUnstoppableMoraleCost = () => {
    let count = selectedUndeadCreatures.length
    if (selectedDefense === 'unstoppable_hordes' && defenderCanUseUnstoppable) {
      count++
    }
    return count
  }

  // Handle defense selection
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

  // Handle IMMEDIATE card selection
  const handleSelectImmediateCard = (cardInfo) => {
    setSelectedDefense('immediate_card')
    setSelectedImmediateCard(cardInfo)
    // Auto-select first eligible creature if only one
    if (cardInfo.eligibleCreatures.length === 1) {
      setSelectedCardCreature(cardInfo.eligibleCreatures[0])
    } else {
      setSelectedCardCreature(null)
    }
  }

  // Handle confirm
  const handleConfirm = () => {
    if (selectedDefense === 'cower') {
      // Using COWER
      if (onDefenseSelected) {
        onDefenseSelected({
          type: 'cower',
          damageReduction: incomingDamage, // COWER avoids ALL damage
          moraleCost: cowerInfo.moraleCost,
          extraCost: cowerInfo.extraCost,
          creatures: [defenderInstance]
        })
      } else if (onCower) {
        // Legacy callback
        onCower(null)
      }
    } else if (selectedDefense === 'unstoppable_hordes') {
      // Using UNSTOPPABLE HORDES
      const creatures = [...selectedUndeadCreatures]
      if (defenderCanUseUnstoppable) {
        creatures.unshift(defenderInstance) // Add defender first
      }

      if (onDefenseSelected) {
        onDefenseSelected({
          type: 'unstoppable_hordes',
          damageReduction: calculateUnstoppableDamageReduction(),
          moraleCost: calculateUnstoppableMoraleCost(),
          creatures: creatures
        })
      } else if (onCower) {
        // Legacy callback - pass damage reduction
        onCower(null, calculateUnstoppableDamageReduction())
      }
    } else if (selectedDefense === 'immediate_card') {
      // Using IMMEDIATE card
      if (onDefenseSelected && selectedImmediateCard && selectedCardCreature) {
        onDefenseSelected({
          type: 'immediate_card',
          card: selectedImmediateCard.card,
          creature: selectedCardCreature,
          damageReduction: selectedImmediateCard.damagePrevented, // 10 damage
          moraleCost: selectedImmediateCard.moraleCost // 0
        })
      }
    } else {
      // No defense selected - skip
      if (onDefenseSelected) {
        onDefenseSelected({ type: 'skip' })
      } else if (onSkip) {
        onSkip()
      }
    }

    // Reset state
    setSelectedDefense(null)
    setSelectedUndeadCreatures([])
    setSelectedImmediateCard(null)
    setSelectedCardCreature(null)
  }

  // Handle skip
  const handleSkip = () => {
    if (onDefenseSelected) {
      onDefenseSelected({ type: 'skip' })
    } else if (onSkip) {
      onSkip()
    }
    setSelectedDefense(null)
    setSelectedUndeadCreatures([])
    setSelectedImmediateCard(null)
    setSelectedCardCreature(null)
  }

  // Check if any defense is available
  const hasAnyDefense = cowerInfo?.canCower || unstoppableInfo?.canUse || adjacentUndead.length > 0 || immediateCards.length > 0

  // Calculate final damage for display
  const finalDamage = selectedDefense === 'cower'
    ? 0 // COWER avoids ALL damage
    : selectedDefense === 'unstoppable_hordes'
      ? Math.max(0, incomingDamage - calculateUnstoppableDamageReduction())
      : selectedDefense === 'immediate_card' && selectedImmediateCard
        ? Math.max(0, incomingDamage - selectedImmediateCard.damagePrevented)
        : incomingDamage

  return (
    <Modal
      show={show}
      onHide={handleSkip}
      centered
      size="lg"
      backdrop="static"
      className="immediate-reaction-modal"
    >
      <Modal.Header style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #444' }}>
        <Modal.Title>
          ⚔️ Defensive Options
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Attack Info */}
        <Alert variant="danger" className="mb-3">
          <strong>{attackerInstance.creature.name}</strong> is attacking{' '}
          <strong>{defenderInstance.creature.name}</strong>
          {accumulatedDamageReduction > 0 ? (
            <>
              {' - '}
              <span className="text-success">{accumulatedDamageReduction} damage already prevented!</span>
              <br />
              <strong className="text-warning">{incomingDamage} damage remaining</strong>
              {` (original: ${originalDamage})`}
            </>
          ) : (
            <>
              {' for '}
              <strong className="text-warning">{incomingDamage} damage</strong>!
            </>
          )}
        </Alert>

        {!hasAnyDefense && (
          <Alert variant="warning">
            <strong>No defensive options available!</strong>
            <br />
            {defenderInstance.isTapped
              ? 'Your creature is tapped and cannot use defensive abilities.'
              : 'You do not have enough morale or eligible creatures to defend.'}
          </Alert>
        )}

        {/* COWER Section - Universal */}
        {cowerInfo?.canCower && (
          <Card
            bg={selectedDefense === 'cower' ? 'success' : 'dark'}
            text="white"
            className="mb-3"
            style={{
              cursor: 'pointer',
              border: selectedDefense === 'cower' ? '3px solid #28a745' : '2px solid #ffc107',
              transition: 'all 0.2s'
            }}
            onClick={() => handleSelectDefense('cower')}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div style={{ flex: 1 }}>
                  <h5 className="mb-2">
                    🛡️ COWER
                    <Badge bg="warning" text="dark" className="ms-2">Universal</Badge>
                    {cowerInfo.extraCost > 0 && (
                      <Badge bg="danger" className="ms-2">
                        ⚠️ BLACK HAND OF BANE +{cowerInfo.extraCost}
                      </Badge>
                    )}
                  </h5>
                  <p className="mb-2" style={{ fontSize: '0.95rem' }}>
                    <strong>{defenderInstance.creature.name}</strong> cowers, avoiding{' '}
                    <strong className="text-success">ALL {incomingDamage} damage</strong>.
                    <br />
                    Creature becomes <Badge bg="secondary">TAPPED</Badge>.
                  </p>
                  <div className="d-flex gap-2 flex-wrap">
                    <Badge bg="danger" style={{ fontSize: '0.9rem' }}>
                      Cost: {cowerInfo.moraleCost} Morale
                      {cowerInfo.extraCost > 0 && ` (${cowerInfo.baseMoraleCost} + ${cowerInfo.extraCost} extra)`}
                    </Badge>
                    <Badge bg="success" style={{ fontSize: '0.9rem' }}>
                      Avoids: ALL Damage
                    </Badge>
                  </div>
                  <Alert variant="secondary" className="mt-2 mb-0 py-2 px-2" style={{ fontSize: '0.9rem' }}>
                    <strong>Current Morale:</strong> {defenderPlayerState.morale}
                    {' → '}
                    <strong className={defenderPlayerState.morale - cowerInfo.moraleCost <= 3 ? 'text-danger' : 'text-warning'}>
                      {defenderPlayerState.morale - cowerInfo.moraleCost}
                    </strong>
                    {' after cowering'}
                  </Alert>
                  {cowerInfo.extraCost > 0 && (
                    <Alert variant="danger" className="mt-2 mb-0 py-1 px-2" style={{ fontSize: '0.85rem' }}>
                      <strong>Warning:</strong> Enemy commander has BLACK HAND OF BANE!
                      Cowering costs {cowerInfo.extraCost} extra morale.
                    </Alert>
                  )}
                </div>
                {selectedDefense === 'cower' && (
                  <div className="ms-3">
                    <Badge bg="light" text="dark" style={{ fontSize: '1.5rem', padding: '0.5rem' }}>
                      ✓
                    </Badge>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* UNSTOPPABLE HORDES Section - Morgana's Undead */}
        {(unstoppableInfo?.canUse || adjacentUndead.length > 0) && (
          <Card
            bg={selectedDefense === 'unstoppable_hordes' ? 'info' : 'dark'}
            text="white"
            className="mb-3"
            style={{
              cursor: 'pointer',
              border: selectedDefense === 'unstoppable_hordes' ? '3px solid #17a2b8' : '2px solid #17a2b8',
              transition: 'all 0.2s'
            }}
            onClick={() => handleSelectDefense('unstoppable_hordes')}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div style={{ flex: 1 }}>
                  <h5 className="mb-2">
                    💀 UNSTOPPABLE HORDES
                    <Badge bg="info" className="ms-2">Commander Ability</Badge>
                  </h5>
                  <p className="mb-2" style={{ fontSize: '0.95rem' }}>
                    Tap untapped Undead creatures to prevent <strong>20 damage each</strong>.
                    <br />
                    Multiple creatures can stack their damage prevention!
                  </p>

                  {selectedDefense === 'unstoppable_hordes' && (
                    <div className="mt-3 p-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                      <h6 className="mb-2">Select Undead to use:</h6>

                      {/* Defender itself */}
                      {defenderCanUseUnstoppable && (
                        <Form.Check
                          type="checkbox"
                          id="defender-unstoppable"
                          label={
                            <span>
                              <strong>{defenderInstance.creature.name}</strong> (Defender)
                              <Badge bg="secondary" className="ms-2">-1 Morale, -20 Damage</Badge>
                            </span>
                          }
                          checked={true}
                          disabled={true}
                          className="mb-2"
                          style={{ color: '#fff' }}
                        />
                      )}

                      {/* Adjacent Undead */}
                      {adjacentUndead.map((creature) => (
                        <Form.Check
                          key={creature.instanceId}
                          type="checkbox"
                          id={`undead-${creature.instanceId}`}
                          label={
                            <span>
                              <strong>{creature.creature.name}</strong> (Adjacent)
                              <Badge bg="secondary" className="ms-2">-1 Morale, -20 Damage</Badge>
                            </span>
                          }
                          checked={selectedUndeadCreatures.some(c => c.instanceId === creature.instanceId)}
                          onChange={() => toggleUndeadCreature(creature)}
                          className="mb-2"
                          style={{ color: '#fff' }}
                        />
                      ))}

                      {adjacentUndead.length === 0 && !defenderCanUseUnstoppable && (
                        <Alert variant="warning" className="mb-0 py-1">
                          No untapped Undead available to use this ability.
                        </Alert>
                      )}

                      {(selectedUndeadCreatures.length > 0 || defenderCanUseUnstoppable) && (
                        <Alert variant="info" className="mt-2 mb-0 py-2">
                          <strong>Total Prevention:</strong> {calculateUnstoppableDamageReduction()} damage
                          <br />
                          <strong>Total Cost:</strong> {calculateUnstoppableMoraleCost()} morale
                          <br />
                          <strong>Damage After:</strong>{' '}
                          <span className={finalDamage === 0 ? 'text-success' : 'text-warning'}>
                            {Math.max(0, incomingDamage - calculateUnstoppableDamageReduction())} damage
                          </span>
                          <br />
                          <strong>Current Morale:</strong> {defenderPlayerState.morale}
                          {' → '}
                          <strong className={defenderPlayerState.morale - calculateUnstoppableMoraleCost() <= 3 ? 'text-danger' : 'text-warning'}>
                            {defenderPlayerState.morale - calculateUnstoppableMoraleCost()}
                          </strong>
                          {' after use'}
                        </Alert>
                      )}
                    </div>
                  )}

                  <div className="d-flex gap-2 flex-wrap mt-2">
                    <Badge bg="secondary" style={{ fontSize: '0.85rem' }}>
                      Per Creature: 1 Morale, 20 Damage Prevented
                    </Badge>
                    <Badge bg="success" style={{ fontSize: '0.85rem' }}>
                      Can Stack!
                    </Badge>
                  </div>
                  {selectedDefense !== 'unstoppable_hordes' && (
                    <div className="mt-2" style={{ fontSize: '0.9rem', color: '#adb5bd' }}>
                      <strong>Your Morale:</strong> {defenderPlayerState.morale}
                    </div>
                  )}
                </div>
                {selectedDefense === 'unstoppable_hordes' && (
                  <div className="ms-3">
                    <Badge bg="light" text="dark" style={{ fontSize: '1.5rem', padding: '0.5rem' }}>
                      ✓
                    </Badge>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* IMMEDIATE Cards Section */}
        {immediateCards.length > 0 && (
          <Card
            bg={selectedDefense === 'immediate_card' ? 'warning' : 'dark'}
            text={selectedDefense === 'immediate_card' ? 'dark' : 'white'}
            className="mb-3"
            style={{
              cursor: 'pointer',
              border: selectedDefense === 'immediate_card' ? '3px solid #ffc107' : '2px solid #6f42c1',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              // If no card selected yet, select the first one
              if (!selectedImmediateCard && immediateCards.length > 0) {
                handleSelectImmediateCard(immediateCards[0])
              } else {
                handleSelectDefense('immediate_card')
              }
            }}
          >
            <Card.Body>
              <h5 className="mb-3">
                ⚡ IMMEDIATE Cards
                <Badge bg="secondary" className="ms-2">Order Cards</Badge>
              </h5>
              <p className="mb-3" style={{ fontSize: '0.95rem' }}>
                Use an IMMEDIATE order card from your hand. The selected creature will become <Badge bg="secondary">TAPPED</Badge>.
              </p>

              <div className="mt-2">
                {immediateCards.map((cardInfo, index) => (
                  <Card
                    key={`${cardInfo.card.id}-${index}`}
                    bg={selectedImmediateCard?.card.id === cardInfo.card.id ? 'success' : 'secondary'}
                    text="white"
                    className="mb-2"
                    style={{
                      cursor: 'pointer',
                      border: selectedImmediateCard?.card.id === cardInfo.card.id ? '2px solid #28a745' : '1px solid #444'
                    }}
                    onClick={(e) => {
                      e.stopPropagation() // Prevent outer card click
                      handleSelectImmediateCard(cardInfo)
                    }}
                  >
                    <Card.Body className="py-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{cardInfo.card.name}</strong>
                          <Badge bg="info" className="ms-2">Level {cardInfo.card.level}</Badge>
                          <br />
                          <small>Prevents {cardInfo.damagePrevented} damage</small>
                        </div>
                        {selectedImmediateCard?.card.id === cardInfo.card.id && (
                          <Badge bg="light" text="dark" style={{ fontSize: '1rem' }}>✓</Badge>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>

              {/* Creature selection for the selected card */}
              {selectedDefense === 'immediate_card' && selectedImmediateCard && (
                <div
                  className="mt-3 p-2"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}
                  onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to outer card
                >
                  <h6 className="mb-2">Select creature to use this card:</h6>
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
                            ? <Badge bg="primary" className="ms-2">Defender</Badge>
                            : <Badge bg="secondary" className="ms-2">Adjacent</Badge>
                          }
                        </span>
                      }
                      checked={selectedCardCreature?.instanceId === creature.instanceId}
                      onChange={() => setSelectedCardCreature(creature)}
                      className="mb-2"
                      style={{ color: '#fff' }}
                    />
                  ))}

                  {selectedCardCreature && (
                    <Alert variant="info" className="mt-2 mb-0 py-2">
                      <strong>Card:</strong> {selectedImmediateCard.card.name}
                      <br />
                      <strong>Used by:</strong> {selectedCardCreature.creature.name}
                      <br />
                      <strong>Damage Prevented:</strong> {selectedImmediateCard.damagePrevented}
                      <br />
                      <strong>Morale Cost:</strong> {selectedImmediateCard.moraleCost}
                    </Alert>
                  )}
                </div>
              )}

              <div className="d-flex gap-2 flex-wrap mt-2">
                <Badge bg="secondary" style={{ fontSize: '0.85rem' }}>
                  Per Card: 10 Damage Prevented
                </Badge>
                <Badge bg="warning" text="dark" style={{ fontSize: '0.85rem' }}>
                  Taps Creature
                </Badge>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Summary */}
        {selectedDefense && (
          <Alert
            variant={finalDamage === 0 ? 'success' : finalDamage < incomingDamage ? 'info' : 'warning'}
            className="mt-3"
          >
            <h6 className="mb-2">📊 Summary</h6>
            <div style={{ fontSize: '0.95rem' }}>
              <strong>Incoming Damage:</strong> {incomingDamage}
              <br />
              <strong>Damage Reduced:</strong>{' '}
              {selectedDefense === 'cower'
                ? `${incomingDamage} (ALL)`
                : selectedDefense === 'unstoppable_hordes'
                  ? calculateUnstoppableDamageReduction()
                  : selectedDefense === 'immediate_card' && selectedImmediateCard
                    ? selectedImmediateCard.damagePrevented
                    : 0}
              <br />
              <strong>Final Damage:</strong>{' '}
              <span className={finalDamage === 0 ? 'text-success fw-bold' : 'text-warning fw-bold'}>
                {finalDamage}
              </span>
              <br />
              <strong>Morale Cost:</strong>{' '}
              {selectedDefense === 'cower'
                ? cowerInfo.moraleCost
                : selectedDefense === 'unstoppable_hordes'
                  ? calculateUnstoppableMoraleCost()
                  : selectedDefense === 'immediate_card' && selectedImmediateCard
                    ? selectedImmediateCard.moraleCost
                    : 0}
              <br />
              <strong>Creatures Tapped:</strong>{' '}
              {selectedDefense === 'cower'
                ? defenderInstance.creature.name
                : selectedDefense === 'unstoppable_hordes'
                  ? [
                      ...(defenderCanUseUnstoppable ? [defenderInstance.creature.name] : []),
                      ...selectedUndeadCreatures.map(c => c.creature.name)
                    ].join(', ') || 'None'
                  : selectedDefense === 'immediate_card' && selectedCardCreature
                    ? selectedCardCreature.creature.name
                    : 'None'}
            </div>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '2px solid #444' }}>
        <Button variant="outline-secondary" onClick={handleSkip}>
          Take Full Damage ({incomingDamage})
        </Button>
        <Button
          variant={
            selectedDefense === 'cower' ? 'success'
            : selectedDefense === 'unstoppable_hordes' ? 'info'
            : selectedDefense === 'immediate_card' ? 'warning'
            : 'primary'
          }
          onClick={handleConfirm}
          disabled={
            !selectedDefense
            || (selectedDefense === 'unstoppable_hordes' && calculateUnstoppableMoraleCost() === 0)
            || (selectedDefense === 'immediate_card' && (!selectedImmediateCard || !selectedCardCreature))
          }
        >
          {selectedDefense === 'cower'
            ? `🛡️ COWER (Avoid All Damage)`
            : selectedDefense === 'unstoppable_hordes'
              ? `💀 Use UNSTOPPABLE HORDES (Prevent ${calculateUnstoppableDamageReduction()})`
              : selectedDefense === 'immediate_card' && selectedImmediateCard
                ? `⚡ Use ${selectedImmediateCard.card.name} (Prevent ${selectedImmediateCard.damagePrevented})`
                : 'Select a Defense Option'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ImmediateReactionModal
