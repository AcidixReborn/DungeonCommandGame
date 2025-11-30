import { useState } from 'react'
import { Modal, Button, Card, Badge, Row, Col, Alert } from 'react-bootstrap'
import { ActionTypes } from '../models/orders'
import './ImmediateReactionModal.css'

/**
 * Modal that appears when an attack is declared, allowing the defender to use
 * Immediate (IMD) order cards as reactions.
 *
 * Rules:
 * - Appears after attack is declared but before damage is resolved
 * - Only shows Immediate cards that can be used by untapped creatures
 * - Default range is adjacent (1 tile), unless card specifies longer range
 * - Multiple creatures can use cards if eligible
 * - Each creature that uses a card gets tapped
 * - Each used card gets discarded
 * - Defender can choose not to react
 */
function ImmediateReactionModal({
  show,
  attackerInstance,
  defenderInstance,
  defenderPlayerState,
  gameState,
  onCardsPlayed,
  onSkip,
  onCower // New callback for Cower ability
}) {
  const [selectedReactions, setSelectedReactions] = useState([])
  const [useCower, setUseCower] = useState(false)

  if (!show || !defenderPlayerState || !defenderInstance) return null

  // Helper: Calculate Manhattan distance between two positions
  const getManhattanDistance = (pos1, pos2) => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
  }

  // Helper: Check if a creature is within range to use a card to help the defender
  const isInRange = (creatureInstance, orderCard) => {
    if (!creatureInstance.position || !defenderInstance.position) return false

    const distance = getManhattanDistance(creatureInstance.position, defenderInstance.position)

    // Check if card has a custom range, otherwise default is adjacent (1 tile)
    const range = orderCard.range || 1

    return distance <= range
  }

  // Get all eligible creature + card combinations
  const getEligibleReactions = () => {
    const reactions = []

    // Get all Immediate order cards in hand
    const immediateCards = defenderPlayerState.orderHand.filter(
      card => card.actionType === ActionTypes.IMMEDIATE
    )

    // For each Immediate card, find which creatures can use it
    immediateCards.forEach((card, cardIndex) => {
      defenderPlayerState.creaturesInPlay.forEach((creature) => {
        // Check if creature can use this card
        if (
          !creature.isTapped && // Creature must not be tapped
          card.canBeUsedBy(creature.creature) && // Creature meets card requirements
          isInRange(creature, card) // Creature is in range of defender
        ) {
          reactions.push({
            creature,
            card,
            cardIndex,
            distance: getManhattanDistance(creature.position, defenderInstance.position)
          })
        }
      })
    })

    return reactions
  }

  const eligibleReactions = getEligibleReactions()

  // Check if defender can use Cower ability (UNSTOPPABLE HORDES)
  // Pass attackerInstance.owner to check for BLACK HAND OF BANE extra cost
  const cowerInfo = gameState?.canUseCower
    ? gameState.canUseCower(defenderInstance, attackerInstance?.owner)
    : { canCower: false, moraleCost: 0, damageReduction: 0, extraCost: 0 }

  // Handle selecting/deselecting a reaction
  const toggleReaction = (reaction) => {
    const reactionKey = `${reaction.creature.instanceId}-${reaction.cardIndex}`

    setSelectedReactions(prev => {
      const isSelected = prev.some(r =>
        `${r.creature.instanceId}-${r.cardIndex}` === reactionKey
      )

      if (isSelected) {
        return prev.filter(r =>
          `${r.creature.instanceId}-${r.cardIndex}` !== reactionKey
        )
      } else {
        return [...prev, reaction]
      }
    })
  }

  const isReactionSelected = (reaction) => {
    const reactionKey = `${reaction.creature.instanceId}-${reaction.cardIndex}`
    return selectedReactions.some(r =>
      `${r.creature.instanceId}-${r.cardIndex}` === reactionKey
    )
  }

  const handleConfirm = () => {
    if (useCower && onCower) {
      // Using Cower ability (with or without cards)
      onCower(selectedReactions.length > 0 ? selectedReactions : null)
    } else if (selectedReactions.length > 0) {
      onCardsPlayed(selectedReactions)
    } else {
      onSkip()
    }
    setSelectedReactions([])
    setUseCower(false)
  }

  const handleSkip = () => {
    onSkip()
    setSelectedReactions([])
    setUseCower(false)
  }

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
          ⚡ Immediate Reaction Available!
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', maxHeight: '70vh', overflowY: 'auto' }}>
        <Alert variant="info" className="mb-3">
          <strong>{attackerInstance.creature.name}</strong> is attacking{' '}
          <strong>{defenderInstance.creature.name}</strong>!
          <br />
          You may use Immediate (IMD) order cards to respond before damage is dealt.
        </Alert>

        {/* COWER Ability (UNSTOPPABLE HORDES) */}
        {cowerInfo.canCower && (
          <Card
            bg={useCower ? 'info' : 'dark'}
            text="white"
            className="mb-3"
            style={{
              cursor: 'pointer',
              border: useCower ? '3px solid #00bcd4' : '2px solid #00bcd4',
              transition: 'all 0.2s'
            }}
            onClick={() => setUseCower(!useCower)}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div style={{ flex: 1 }}>
                  <h6 className="mb-1">
                    🛡️ COWER (UNSTOPPABLE HORDES)
                    <Badge bg="cyan" style={{ backgroundColor: '#00bcd4' }} className="ms-2">Commander</Badge>
                    {cowerInfo.extraCost > 0 && (
                      <Badge bg="danger" className="ms-2">BLACK HAND OF BANE +{cowerInfo.extraCost}</Badge>
                    )}
                  </h6>
                  <small className="d-block mb-2">
                    Pay {cowerInfo.moraleCost} Morale to prevent {cowerInfo.damageReduction} damage to {defenderInstance.creature.name}
                    {cowerInfo.extraCost > 0 && (
                      <span style={{ color: '#dc3545' }}> (includes {cowerInfo.extraCost} extra from enemy's Black Hand of Bane!)</span>
                    )}
                  </small>
                  <div>
                    <Badge bg="secondary" className="me-2">
                      Cost: {cowerInfo.moraleCost} Morale
                    </Badge>
                    <Badge bg="secondary">
                      Prevents: {cowerInfo.damageReduction} Damage
                    </Badge>
                  </div>
                </div>
                {useCower && (
                  <div className="ms-3">
                    <Badge bg="success" style={{ fontSize: '1.2rem', padding: '0.5rem' }}>
                      ✓
                    </Badge>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        )}

        {eligibleReactions.length === 0 ? (
          <Alert variant="warning">
            No eligible Immediate cards available. Your creatures must be untapped,
            adjacent to the defender, and meet the card requirements.
          </Alert>
        ) : (
          <>
            <h6 className="mb-3">Select cards to play ({selectedReactions.length} selected):</h6>
            <Row>
              {eligibleReactions.map((reaction, idx) => {
                const isSelected = isReactionSelected(reaction)
                const rangeText = reaction.card.range > 1
                  ? `Range: ${reaction.card.range} tiles`
                  : 'Adjacent'

                return (
                  <Col key={idx} xs={12} className="mb-3">
                    <Card
                      bg={isSelected ? 'primary' : 'dark'}
                      text="white"
                      className="reaction-card"
                      style={{
                        cursor: 'pointer',
                        border: isSelected ? '3px solid #4dd0e1' : '2px solid #444',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => toggleReaction(reaction)}
                    >
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start">
                          <div style={{ flex: 1 }}>
                            <h6 className="mb-1">
                              {reaction.card.name}
                              <Badge bg="warning" className="ms-2">IMD</Badge>
                              <Badge bg="info" className="ms-2">Lvl {reaction.card.level}</Badge>
                            </h6>
                            <small className="text-muted d-block mb-2">
                              {reaction.card.effectDescription}
                            </small>
                            <div>
                              <Badge bg="secondary" className="me-2">
                                Using: {reaction.creature.creature.name}
                              </Badge>
                              <Badge bg="secondary" className="me-2">
                                {rangeText}
                              </Badge>
                              <Badge bg="secondary">
                                Distance: {reaction.distance} tile{reaction.distance !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="ms-3">
                              <Badge bg="success" style={{ fontSize: '1.2rem', padding: '0.5rem' }}>
                                ✓
                              </Badge>
                            </div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          </>
        )}

        {(selectedReactions.length > 0 || useCower) && (
          <Alert variant="warning" className="mt-3">
            <strong>⚠️ Warning:</strong> This reaction will:
            <ul className="mb-0 mt-2">
              {selectedReactions.length > 0 && (
                <>
                  <li>Tap {selectedReactions.length} creature{selectedReactions.length !== 1 ? 's' : ''} until your next Refresh phase</li>
                  <li>Discard {selectedReactions.length} order card{selectedReactions.length !== 1 ? 's' : ''} from your hand</li>
                </>
              )}
              {useCower && (
                <li>Cost {cowerInfo.moraleCost} Morale to prevent {cowerInfo.damageReduction} damage</li>
              )}
            </ul>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '2px solid #444' }}>
        <Button variant="secondary" onClick={handleSkip}>
          Skip / No Reaction
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={selectedReactions.length === 0 && !useCower}
        >
          {useCower && selectedReactions.length === 0
            ? '🛡️ Use Cower'
            : useCower
              ? `🛡️ Cower + ${selectedReactions.length} Card${selectedReactions.length !== 1 ? 's' : ''}`
              : `Use ${selectedReactions.length > 0 ? selectedReactions.length : ''} Card${selectedReactions.length !== 1 ? 's' : ''}`
          }
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ImmediateReactionModal
