import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * ToughAsNailsModal - Confirmation modal for proactive use of Tough as Nails
 *
 * Shows during ACTIVATE phase when player right-clicks Tough as Nails on a creature.
 * Displays the card, current attachments that will be removed, Block 10 gain,
 * and confirms the action will consume the creature's action.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Object} card - The Tough as Nails order card being used
 * @param {Object} creature - The creature instance using the card
 * @param {Function} onConfirm - Callback when player confirms use
 * @param {Function} onCancel - Callback when player cancels
 */
function ToughAsNailsModal({
  show,
  card,
  creature,
  onConfirm,
  onCancel
}) {
  if (!show || !card || !creature) return null

  // Get current attachments that will be removed
  const currentAttachments = creature.attachedCards || []
  const hasMortalWound = currentAttachments.some(att => att.card?.attachOnUse?.destroyAtDeploy)
  const hasMovementBlock = currentAttachments.some(att =>
    att.card?.name === 'Web' || att.card?.attachOnUse?.preventsMovement
  )
  const blockAmount = card.attachOnUse?.blockAmount || 10

  return (
    <Modal show={show} onHide={onCancel} centered size="md" backdrop="static">
      <Modal.Header style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #17a2b8' }}>
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
                border: '2px solid #17a2b8'
              }}
            />
          ) : (
            <div
              style={{
                width: '140px',
                height: '200px',
                backgroundColor: '#444',
                borderRadius: '8px',
                border: '2px solid #17a2b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
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
            fontStyle: 'italic'
          }}
        >
          {card.effectDescription}
        </div>

        {/* Current Attachments to be Removed */}
        {currentAttachments.length > 0 && (
          <Alert
            variant={hasMortalWound ? 'success' : 'info'}
            style={{
              backgroundColor: hasMortalWound ? 'rgba(40, 167, 69, 0.2)' : 'rgba(23, 162, 184, 0.2)',
              border: hasMortalWound ? '1px solid #28a745' : '1px solid #17a2b8'
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
              {hasMortalWound ? '🎉 Will Remove Mortal Wound!' : 'Will Remove Attachments:'}
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              {currentAttachments.map((att, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  • {att.card?.name || 'Unknown Card'}
                  {att.card?.attachOnUse?.destroyAtDeploy && (
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}> (saves from death!)</span>
                  )}
                  {(att.card?.name === 'Web' || att.card?.attachOnUse?.preventsMovement) && (
                    <span style={{ color: '#17a2b8' }}> (restores movement)</span>
                  )}
                </div>
              ))}
            </div>
          </Alert>
        )}

        {/* Block 10 Gain */}
        <Alert
          variant="info"
          style={{ backgroundColor: 'rgba(23, 162, 184, 0.2)', border: '1px solid #17a2b8' }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
            {creature.creature?.name || creature.name} will gain Block {blockAmount}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#adb5bd' }}>
            Prevents {blockAmount} damage from <strong>each</strong> damage source
          </div>
        </Alert>

        {/* No attachments message */}
        {currentAttachments.length === 0 && (
          <Alert
            variant="secondary"
            style={{ backgroundColor: 'rgba(108, 117, 125, 0.2)', border: '1px solid #6c757d' }}
          >
            <div style={{ fontSize: '0.9rem' }}>
              No attachments to remove. This will only grant Block {blockAmount}.
            </div>
          </Alert>
        )}

        {/* Warning about action consumption */}
        <Alert
          variant="warning"
          className="mb-0"
          style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107' }}
        >
          <div style={{ fontSize: '0.85rem' }}>
            <strong>Note:</strong> This will consume {creature.creature?.name || creature.name}'s action for this turn.
            The creature can still move afterward if it hasn't already.
          </div>
        </Alert>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="info" onClick={onConfirm}>
          {hasMortalWound ? '💪 Save Creature!' : `🛡️ Gain Block ${blockAmount}`}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ToughAsNailsModal
