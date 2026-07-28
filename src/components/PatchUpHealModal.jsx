import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * PatchUpHealModal - Confirmation modal for proactive healing with Patch Up
 *
 * Shows during ACTIVATE phase when player right-clicks Patch Up on a damaged creature.
 * Displays the card, healing preview, and confirms the action will consume the creature's action.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Object} card - The Patch Up order card being used
 * @param {Object} creature - The creature instance being healed
 * @param {number} healAmount - Amount of healing (20 for Patch Up)
 * @param {Function} onConfirm - Callback when player confirms heal
 * @param {Function} onCancel - Callback when player cancels
 */
function PatchUpHealModal({ show, card, creature, healAmount, onConfirm, onCancel }) {
  if (!show || !card || !creature) return null

  // Calculate actual healing (can't heal more than damage taken)
  const currentDamage = creature.damageTokens || 0
  const actualHeal = Math.min(healAmount, currentDamage)
  const currentHP = creature.currentHP
  const newHP = currentHP + actualHeal
  const maxHP = creature.creature?.hitPoints || creature.maxHP || 0

  return (
    <Modal show={show} onHide={onCancel} centered size="md" backdrop="static">
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #28a745' }}
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
                border: '2px solid #28a745',
              }}
            />
          ) : (
            <div
              style={{
                width: '140px',
                height: '200px',
                backgroundColor: '#444',
                borderRadius: '8px',
                border: '2px solid #28a745',
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

        {/* Heal Preview */}
        <Alert
          variant="success"
          style={{ backgroundColor: 'rgba(40, 167, 69, 0.2)', border: '1px solid #28a745' }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
            {creature.creature?.name || creature.name} will heal {actualHeal} damage
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            HP: {currentHP} → {newHP} / {maxHP}
          </div>
          {actualHeal < healAmount && (
            <div style={{ fontSize: '0.8rem', color: '#ffc107', marginTop: '5px' }}>
              (Creature only has {currentDamage} damage - healing capped)
            </div>
          )}
        </Alert>

        {/* Warning about action consumption */}
        <Alert
          variant="warning"
          className="mb-0"
          style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107' }}
        >
          <div style={{ fontSize: '0.85rem' }}>
            <strong>Note:</strong> This will consume {creature.creature?.name || creature.name}'s
            action for this turn (like a STANDARD action). The creature can still move afterward if
            it hasn't already.
          </div>
        </Alert>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="success" onClick={onConfirm}>
          Heal {actualHeal} Damage
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default PatchUpHealModal
