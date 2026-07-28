import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * ChargeModal - Confirmation modal for STANDARD charge order cards
 *
 * Shows during ACTIVATE phase when player right-clicks a Charge card
 * on a creature. The Charge card allows:
 * - Move creature's full speed
 * - Make a melee attack with +10 damage
 *
 * Requirements:
 * - Must move at least 1 tile
 * - Must end adjacent to an enemy (can only move to valid attack positions)
 *
 * Visual distinction:
 * - Green (#28a745) styling to match movement tiles
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Object} card - The order card being used
 * @param {Object} creature - The creature instance using the card
 * @param {Function} onConfirm - Callback when player confirms (enters movement selection)
 * @param {Function} onCancel - Callback when player cancels (returns card to hand)
 */
function ChargeModal({ show, card, creature, onConfirm, onCancel }) {
  if (!show || !card || !creature) return null

  // Get creature info
  const creatureSpeed = creature.creature?.speed || 0
  const baseMeleeDamage = creature.creature?.meleeAttack?.damage || 0
  const damageBonus = card.meleeDamageBonus || 0
  const totalDamage = baseMeleeDamage + damageBonus

  // Style colors - green for movement
  const accentColor = '#28a745'

  return (
    <Modal show={show} onHide={onCancel} centered size="md" backdrop="static">
      <Modal.Header
        style={{
          backgroundColor: '#212529',
          color: 'white',
          borderBottom: `2px solid ${accentColor}`,
        }}
      >
        <Modal.Title>Use {card.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', textAlign: 'center' }}>
        {/* Card Image */}
        <div style={{ marginBottom: '15px' }}>
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              style={{
                maxHeight: '200px',
                borderRadius: '8px',
                border: `2px solid ${accentColor}`,
              }}
            />
          ) : (
            <div
              style={{
                width: '140px',
                height: '200px',
                backgroundColor: '#444',
                borderRadius: '8px',
                border: `2px solid ${accentColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>{card.name}</span>
            </div>
          )}
        </div>

        {/* Card Effect Description */}
        <div
          style={{
            fontSize: '0.9rem',
            color: '#adb5bd',
            marginBottom: '15px',
            fontStyle: 'italic',
          }}
        >
          {card.effectDescription}
        </div>

        {/* Movement Info */}
        <Alert
          style={{ backgroundColor: 'rgba(40, 167, 69, 0.2)', border: `1px solid ${accentColor}` }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
            🏃 Charge Movement
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            Move up to {creatureSpeed} squares (creature speed)
          </div>
          <div style={{ fontSize: '0.85rem', color: '#ffc107', marginTop: '5px' }}>
            Must move at least 1 tile and end adjacent to an enemy
          </div>
        </Alert>

        {/* Damage Preview */}
        <Alert
          variant="danger"
          style={{ backgroundColor: 'rgba(220, 53, 69, 0.2)', border: '1px solid #dc3545' }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
            ⚔️ Melee Attack Preview
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            Base {baseMeleeDamage} + {damageBonus} bonus = {totalDamage}
          </div>
        </Alert>

        {/* Card Draw Preview */}
        {card.drawCardsOnAttack > 0 && (
          <Alert
            variant="success"
            style={{
              backgroundColor: 'rgba(40, 167, 69, 0.2)',
              border: '1px solid #28a745',
              marginBottom: '10px',
            }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
              Draw {card.drawCardsOnAttack} Order card{card.drawCardsOnAttack > 1 ? 's' : ''} after
              attack
            </div>
          </Alert>
        )}

        {/* Warning about action consumption and commitment */}
        <Alert
          variant="warning"
          className="mb-0"
          style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107' }}
        >
          <div style={{ fontSize: '0.85rem', marginBottom: '5px' }}>
            <strong>Note:</strong> This will consume {creature.creature?.name || creature.name}'s
            STANDARD action.
          </div>
          <div style={{ fontSize: '0.85rem', color: '#ffc107' }}>
            <strong>Once you move, you must complete the attack.</strong>
          </div>
        </Alert>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="success"
          style={{ backgroundColor: accentColor, borderColor: accentColor }}
          onClick={onConfirm}
        >
          Begin Charge
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ChargeModal
