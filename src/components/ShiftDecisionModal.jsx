import { Modal, Button } from 'react-bootstrap'

/**
 * ShiftDecisionModal - Asks player if they want to shift after using Cloud of Bats
 *
 * Shows after Cloud of Bats prevents all damage, giving the player the option
 * to shift up to 6 squares or decline and just tap the creature.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {string} cardName - Name of the card (e.g., "Cloud of Bats")
 * @param {number} shiftDistance - Maximum shift distance (e.g., 6)
 * @param {string} creatureName - Name of the creature that can shift
 * @param {Function} onYes - Callback when player wants to shift
 * @param {Function} onNo - Callback when player declines shift
 */
function ShiftDecisionModal({ show, cardName, shiftDistance, creatureName, onYes, onNo }) {
  if (!show) return null

  return (
    <Modal show={show} onHide={onNo} centered size="md" backdrop="static">
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #9b59b6' }}
      >
        <Modal.Title>
          <span style={{ color: '#9b59b6' }}>🦇</span> {cardName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', textAlign: 'center' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>All damage was prevented!</p>
        <p style={{ fontSize: '1rem', color: '#adb5bd' }}>
          Do you want <strong>{creatureName}</strong> to shift up to{' '}
          <strong>{shiftDistance}</strong> squares?
        </p>
        <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '1rem' }}>
          (The creature will tap regardless of your choice)
        </p>
      </Modal.Body>
      <Modal.Footer
        style={{
          backgroundColor: '#212529',
          borderTop: '1px solid #444',
          justifyContent: 'center',
        }}
      >
        <Button variant="success" onClick={onYes} style={{ minWidth: '100px' }}>
          Yes, Shift
        </Button>
        <Button variant="secondary" onClick={onNo} style={{ minWidth: '100px' }}>
          No, Stay
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ShiftDecisionModal
