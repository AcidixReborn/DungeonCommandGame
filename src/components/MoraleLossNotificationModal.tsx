import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * MoraleLossNotificationModal - Notification modal for morale loss from card effects
 *
 * Shows when a player loses morale due to an opponent's IMMEDIATE card effect
 * (e.g., Unexpected Resistance - adjacent tapped enemy's controller loses 1 Morale).
 *
 * Two display modes:
 * 1. Immediate: Shown to attacker right after defense resolves
 * 2. Delayed: Shown at ACTIVATE phase to non-attacker opponents (queued notification)
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Object} data - Modal data containing:
 *   @param {string} cardName - Name of the card that caused morale loss
 *   @param {string} defenderName - Name of the defender who used the card
 *   @param {string} targetCreatureName - Name of the creature that was adjacent
 *   @param {number} moraleLost - Amount of morale lost
 *   @param {number} currentMorale - Current morale after loss
 *   @param {boolean} wasDefeated - Whether this morale loss caused defeat
 * @param {Function} onClose - Callback when player closes the modal
 */
function MoraleLossNotificationModal({ show, data, onClose }) {
  if (!show || !data) return null

  const { cardName, defenderName, targetCreatureName, moraleLost, currentMorale, wasDefeated } =
    data

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static">
      <Modal.Header
        style={{
          backgroundColor: '#212529',
          color: 'white',
          borderBottom: wasDefeated ? '2px solid #dc3545' : '2px solid #dc3545',
        }}
      >
        <Modal.Title>{wasDefeated ? 'Defeated!' : 'Morale Lost!'}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', textAlign: 'center' }}>
        {/* Card Info */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#dc3545' }}>{cardName}</div>
          <div style={{ fontSize: '0.9rem', color: '#adb5bd', marginTop: '5px' }}>
            Used by {defenderName}
          </div>
        </div>

        {/* Explanation */}
        <Alert
          variant="danger"
          style={{ backgroundColor: 'rgba(220, 53, 69, 0.2)', border: '1px solid #dc3545' }}
        >
          <div style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
            Your creature <strong>{targetCreatureName}</strong> was adjacent and tapped when{' '}
            {defenderName} used {cardName}.
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>You lost {moraleLost} Morale</div>
        </Alert>

        {/* Current Morale Display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '15px',
          }}
        >
          <span style={{ fontSize: '0.9rem', color: '#adb5bd' }}>Current Morale:</span>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: wasDefeated ? '#dc3545' : currentMorale <= 5 ? '#ffc107' : '#28a745',
            }}
          >
            {currentMorale}
          </span>
        </div>

        {/* Defeat Warning */}
        {wasDefeated && (
          <Alert
            variant="danger"
            className="mt-3 mb-0"
            style={{ backgroundColor: 'rgba(220, 53, 69, 0.3)', border: '2px solid #dc3545' }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
              Your morale has reached 0. You have been defeated!
            </div>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant={wasDefeated ? 'danger' : 'primary'} onClick={onClose}>
          {wasDefeated ? 'Accept Defeat' : 'Continue'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default MoraleLossNotificationModal
