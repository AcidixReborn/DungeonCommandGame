import { Modal, Button, Badge, Alert } from 'react-bootstrap'

/**
 * WebRemovalModal - Allows human player to choose to remove Web from their webbed creature
 *
 * When a human player left-clicks on their own webbed creature, this modal appears
 * giving them the option to:
 * - Keep Web: Close modal, creature can still attack (no action consumed)
 * - Remove Web: Removes web, taps creature (consumes standard action)
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onKeepWeb - Callback when player chooses to keep web
 * @param {Function} onRemoveWeb - Callback when player chooses to remove web
 * @param {Object} creatureInstance - The webbed creature instance
 */
function WebRemovalModal({
  show,
  onKeepWeb,
  onRemoveWeb,
  creatureInstance
}) {
  if (!show || !creatureInstance) return null

  const creature = creatureInstance.creature
  // Check if creature has already used its standard action (not fully tapped, just can't attack)
  const hasUsedAction = creatureInstance.hasAttackedThisTurn

  return (
    <Modal
      show={show}
      onHide={onKeepWeb}
      centered
      size="md"
      backdrop="static"
      className="web-removal-modal"
    >
      <Modal.Header style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #6c757d' }}>
        <Modal.Title>
          <span style={{ marginRight: '8px' }}>🕸️</span>
          Webbed Creature
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
        {/* Creature card image */}
        {creature?.imageUrl && (
          <div className="text-center mb-3">
            <img
              src={creature.imageUrl}
              alt={creature.name}
              style={{
                maxHeight: '200px',
                borderRadius: '8px',
                border: '2px solid #6c757d',
                boxShadow: '0 0 15px rgba(108, 117, 125, 0.5)'
              }}
            />
            <div className="mt-2">
              <strong>{creature.name}</strong>
              <Badge bg="secondary" className="ms-2">Level {creature.level}</Badge>
            </div>
          </div>
        )}

        {/* Status info */}
        <Alert variant="secondary" className="mb-3">
          <div className="d-flex align-items-center">
            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🕸️</span>
            <div>
              <strong>This creature is webbed!</strong>
              <div className="mt-1" style={{ fontSize: '0.9rem' }}>
                Cannot move, but CAN still attack.
              </div>
            </div>
          </div>
        </Alert>

        {/* Removal warning */}
        <Alert variant="warning" className="mb-0">
          <strong>Remove Web?</strong>
          <div className="mt-1" style={{ fontSize: '0.9rem' }}>
            Removing the web costs a <strong>STANDARD action</strong> (creature can still move after).
          </div>
          {hasUsedAction && (
            <div className="mt-2 text-danger" style={{ fontSize: '0.9rem' }}>
              <strong>Warning:</strong> This creature has already used its action and cannot remove the web!
            </div>
          )}
        </Alert>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444', justifyContent: 'space-between' }}>
        <Button
          variant="secondary"
          onClick={onKeepWeb}
          size="lg"
        >
          Keep Web (Attack Only)
        </Button>
        <Button
          variant="danger"
          onClick={onRemoveWeb}
          size="lg"
          disabled={hasUsedAction}
          title={hasUsedAction ? 'Creature has already used its action' : 'Remove web (uses standard action, can still move)'}
        >
          🕸️ Remove Web
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default WebRemovalModal
