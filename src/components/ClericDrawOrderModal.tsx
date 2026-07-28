import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * ClericDrawOrderModal - Displays ORC CLERIC DEPLOY DRAW ORDER ability result
 *
 * Shows when an Orc Cleric of Gruumsh is deployed and the player draws 1 Order card.
 * Displays the Order card that was drawn to inform the player.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onDismiss - Callback when modal is dismissed
 * @param {Object} result - The result object containing:
 *   - creatureInstance: The Orc Cleric that was deployed
 *   - drawnCard: The Order card that was drawn
 *   - playerId: The player who deployed the Cleric
 */
function ClericDrawOrderModal({ show, onDismiss, result }) {
  if (!show || !result) return null

  const { creatureInstance, drawnCard } = result

  return (
    <Modal show={show} onHide={onDismiss} centered backdrop="static">
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #8B4513' }}
      >
        <Modal.Title>+1 Order Card!</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', textAlign: 'center' }}>
        {creatureInstance?.creature?.imageUrl && (
          <img
            src={creatureInstance.creature.imageUrl}
            alt={creatureInstance.creature.name}
            style={{
              maxHeight: '100px',
              borderRadius: '8px',
              border: '2px solid #8B4513',
              marginBottom: '15px',
            }}
          />
        )}
        <div style={{ fontSize: '1.2rem', marginBottom: '15px' }}>
          <strong>{creatureInstance?.creature?.name}</strong> deployed!
        </div>
        {drawnCard?.imageUrl && (
          <img
            src={drawnCard.imageUrl}
            alt={drawnCard.name}
            style={{
              maxHeight: '300px',
              borderRadius: '8px',
              border: '2px solid #17a2b8',
              marginBottom: '15px',
            }}
          />
        )}
        <Alert
          variant="info"
          className="mb-0"
          style={{ backgroundColor: 'rgba(23, 162, 184, 0.2)', border: '1px solid #17a2b8' }}
        >
          <div style={{ fontSize: '1.1rem' }}>
            Drew: <strong>{drawnCard?.name || 'Order Card'}</strong>
          </div>
        </Alert>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="info" onClick={onDismiss}>
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ClericDrawOrderModal
