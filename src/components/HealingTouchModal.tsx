import { Modal, Button, Badge, Alert, ListGroup } from 'react-bootstrap'
import { logger } from '../utils/logger'

/**
 * HealingTouchModal - Allows player to choose Healing Touch action
 *
 * When a human player right-clicks on a valid Healing Touch target
 * (self or adjacent ally) while Dwarf Cleric is selected, this modal appears
 * giving them the option to:
 * - Heal 10 Damage: Heals the target creature
 * - Remove Attached Card: Removes an Order card attached to the target
 * - Cancel: Close modal without taking action
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onHeal - Callback when player chooses to heal
 * @param {Function} onRemoveCard - Callback when player chooses to remove card (receives cardIndex)
 * @param {Function} onCancel - Callback when player cancels
 * @param {Object} healerInstance - The Dwarf Cleric using the ability
 * @param {Object} targetInstance - The creature being healed/having card removed
 */
function HealingTouchModal({
  show,
  onHeal,
  onRemoveCard,
  onCancel,
  healerInstance,
  targetInstance,
}) {
  if (!show || !healerInstance || !targetInstance) return null

  const healer = healerInstance.creature
  const target = targetInstance.creature
  const isSelfTarget = healerInstance.instanceId === targetInstance.instanceId

  // Check if healer has already used its standard action
  const hasUsedAction = healerInstance.hasAttackedThisTurn

  // Calculate healing preview
  const currentHP = targetInstance.currentHP
  const maxHP = target.hitPoints
  const damageTokens = targetInstance.damageTokens
  const hpAfterHeal = Math.min(maxHP, currentHP + Math.min(10, damageTokens))
  const actualHealAmount = hpAfterHeal - currentHP

  // Get attached cards
  const attachedCards = targetInstance.attachedCards || []
  const hasAttachedCards = attachedCards.length > 0
  logger.modal('HealingTouchModal', 'target info', {
    attachedCards: targetInstance.attachedCards,
    hasAttachedCards,
    target: target.name,
  })

  return (
    <Modal show={show} onHide={onCancel} centered backdrop="static" className="healing-touch-modal">
      <Modal.Header
        style={{ backgroundColor: '#1a472a', color: 'white', borderBottom: '2px solid #2d5a3d' }}
      >
        <Modal.Title>
          <span style={{ marginRight: '8px' }}>💚</span>
          Healing Touch
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
        {/* Healer info */}
        <div className="text-center mb-3" style={{ fontSize: '0.9rem', color: '#aaa' }}>
          <strong>{healer.name}</strong> using Healing Touch on{' '}
          {isSelfTarget ? 'itself' : <strong>{target.name}</strong>}
        </div>

        {/* Target creature card image */}
        {target?.imageUrl && (
          <div className="text-center mb-3">
            <img
              src={target.imageUrl}
              alt={target.name}
              style={{
                maxHeight: '180px',
                borderRadius: '8px',
                border: '2px solid #2d5a3d',
                boxShadow: '0 0 15px rgba(45, 90, 61, 0.5)',
              }}
            />
            <div className="mt-2">
              <strong>{target.name}</strong>
              <Badge bg="secondary" className="ms-2">
                Level {target.level}
              </Badge>
            </div>
          </div>
        )}

        {/* HP Status */}
        <Alert
          variant="dark"
          className="mb-3"
          style={{ backgroundColor: '#1a1a2e', border: '1px solid #2d5a3d' }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Current HP:</strong>
              <span
                className="ms-2"
                style={{ color: currentHP < maxHP * 0.5 ? '#ff6b6b' : '#69db7c' }}
              >
                {currentHP} / {maxHP}
              </span>
            </div>
            {damageTokens > 0 && (
              <div>
                <Badge bg="danger">{damageTokens} damage</Badge>
              </div>
            )}
          </div>
          {damageTokens > 0 && (
            <div className="mt-2" style={{ fontSize: '0.9rem' }}>
              <strong>After Heal:</strong>
              <span className="ms-2" style={{ color: '#69db7c' }}>
                {hpAfterHeal} / {maxHP}
              </span>
              <span className="ms-2" style={{ color: '#aaa' }}>
                (+{actualHealAmount} HP)
              </span>
            </div>
          )}
        </Alert>

        {/* Attached Cards Section */}
        {hasAttachedCards && (
          <Alert variant="warning" className="mb-3">
            <strong>Attached Cards:</strong>
            <ListGroup variant="flush" className="mt-2">
              {attachedCards.map((attachment, index) => (
                <ListGroup.Item
                  key={index}
                  className="d-flex justify-content-between align-items-center"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'inherit',
                    border: 'none',
                    padding: '4px 0',
                  }}
                >
                  <span>
                    <Badge bg="secondary" className="me-2">
                      {index + 1}
                    </Badge>
                    {attachment.card?.name || 'Unknown Card'}
                  </span>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => onRemoveCard(index)}
                    disabled={hasUsedAction}
                  >
                    Remove
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Alert>
        )}

        {/* Action Cost Warning */}
        <Alert
          variant="info"
          className="mb-0"
          style={{ backgroundColor: '#1a3a4a', border: '1px solid #2d5a7d' }}
        >
          <div style={{ fontSize: '0.9rem' }}>
            This will consume <strong>{healer.name}'s STANDARD action</strong>.
            {!healerInstance.hasMovedThisTurn && (
              <span className="ms-1">(Creature can still move after)</span>
            )}
          </div>
          {hasUsedAction && (
            <div className="mt-2 text-danger" style={{ fontSize: '0.9rem' }}>
              <strong>Warning:</strong> {healer.name} has already used its standard action this
              turn!
            </div>
          )}
        </Alert>
      </Modal.Body>

      <Modal.Footer
        style={{
          backgroundColor: '#1a472a',
          borderTop: '1px solid #2d5a3d',
          justifyContent: 'space-between',
        }}
      >
        <Button variant="secondary" onClick={onCancel} size="lg">
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={onHeal}
          size="lg"
          disabled={hasUsedAction}
          title={
            hasUsedAction
              ? 'Creature has already used its action'
              : `Heal ${actualHealAmount} damage`
          }
        >
          💚 Heal 10 Damage
          {damageTokens > 0 && <span className="ms-2">(+{actualHealAmount})</span>}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default HealingTouchModal
