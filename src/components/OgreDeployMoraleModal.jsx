import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * OgreDeployMoraleModal - Displays OGRE DEPLOY MORALE ability result
 *
 * Shows when an Ogre is deployed and the player gains 1 MORALE.
 * Small informational modal to notify the player of the morale gain.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onDismiss - Callback when modal is dismissed
 * @param {Object} result - The result object containing:
 *   - creatureInstance: The Ogre that was deployed
 *   - oldMorale: Morale before deployment
 *   - newMorale: Morale after deployment
 *   - playerId: The player who deployed the Ogre
 */
function OgreDeployMoraleModal({ show, onDismiss, result }) {
  if (!show || !result) return null

  const { creatureInstance, oldMorale, newMorale } = result

  return (
    <Modal show={show} onHide={onDismiss} centered size="sm" backdrop="static">
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #8B4513' }}
      >
        <Modal.Title>+1 MORALE!</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', textAlign: 'center' }}>
        {creatureInstance?.creature?.imageUrl && (
          <img
            src={creatureInstance.creature.imageUrl}
            alt={creatureInstance.creature.name}
            style={{
              maxHeight: '120px',
              borderRadius: '8px',
              border: '2px solid #8B4513',
              marginBottom: '15px',
            }}
          />
        )}
        <div style={{ fontSize: '1.2rem', marginBottom: '15px' }}>
          <strong>{creatureInstance?.creature?.name}</strong> deployed!
        </div>
        <Alert
          variant="success"
          className="mb-0"
          style={{ backgroundColor: 'rgba(40, 167, 69, 0.2)', border: '1px solid #28a745' }}
        >
          <div style={{ fontSize: '1.1rem' }}>
            Morale: <strong>{oldMorale}</strong> → <strong>{newMorale}</strong>
          </div>
        </Alert>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="success" onClick={onDismiss}>
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default OgreDeployMoraleModal
