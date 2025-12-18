import { Modal, Button, Badge, Alert } from 'react-bootstrap'

/**
 * WebRemovalModal - Allows human player to choose to remove movement-blocking attachments
 *
 * When a human player left-clicks on their own creature with a removable attachment,
 * this modal appears giving them the option to:
 * - Keep Attachment: Close modal, creature can still attack (no action consumed)
 * - Remove Attachment: Removes attachment, uses standard action (creature can still move after)
 *
 * Supports: Web, Leap Away, and any card with attachOnUse.removableAsStandard
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onKeepWeb - Callback when player chooses to keep attachment
 * @param {Function} onRemoveWeb - Callback when player chooses to remove attachment
 * @param {Object} creatureInstance - The creature instance with attachment
 * @param {Object} attachmentCard - The specific attachment to remove (optional, defaults to first removable)
 */
function WebRemovalModal({
  show,
  onKeepWeb,
  onRemoveWeb,
  creatureInstance,
  attachmentCard
}) {
  if (!show || !creatureInstance) return null

  const creature = creatureInstance.creature
  // Check if creature has already used its standard action (not fully tapped, just can't attack)
  const hasUsedAction = creatureInstance.hasAttackedThisTurn

  // Get the attachment info - use provided card or find first removable attachment
  const attachment = attachmentCard || creatureInstance.attachedCards?.find(att =>
    att.card?.name?.toUpperCase().includes('WEB') ||
    att.card?.attachOnUse?.removableAsStandard
  )?.card

  const attachmentName = attachment?.name || 'Web'
  const isWeb = attachmentName.toUpperCase().includes('WEB')
  const isLeapAway = attachmentName.toUpperCase().includes('LEAP AWAY')

  // Get icon and color based on attachment type
  const getAttachmentIcon = () => isWeb ? '🕸️' : isLeapAway ? '🦘' : '📎'
  const getAttachmentColor = () => isWeb ? '#6c757d' : isLeapAway ? '#cc0000' : '#17a2b8'

  return (
    <Modal
      show={show}
      onHide={onKeepWeb}
      centered
      size="md"
      backdrop="static"
      className="web-removal-modal"
    >
      <Modal.Header style={{ backgroundColor: '#212529', color: 'white', borderBottom: `2px solid ${getAttachmentColor()}` }}>
        <Modal.Title>
          <span style={{ marginRight: '8px' }}>{getAttachmentIcon()}</span>
          {isWeb ? 'Webbed Creature' : `${attachmentName} Attached`}
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
                border: `2px solid ${getAttachmentColor()}`,
                boxShadow: `0 0 15px ${getAttachmentColor()}50`
              }}
            />
            <div className="mt-2">
              <strong>{creature.name}</strong>
              <Badge bg="secondary" className="ms-2">Level {creature.level}</Badge>
            </div>
          </div>
        )}

        {/* Status info */}
        <Alert variant={isLeapAway ? 'danger' : 'secondary'} className="mb-3">
          <div className="d-flex align-items-center">
            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{getAttachmentIcon()}</span>
            <div>
              <strong>This creature has {attachmentName} attached!</strong>
              <div className="mt-1" style={{ fontSize: '0.9rem' }}>
                Cannot move or shift, but CAN still attack.
              </div>
            </div>
          </div>
        </Alert>

        {/* Removal warning */}
        <Alert variant="warning" className="mb-0">
          <strong>Remove {attachmentName}?</strong>
          <div className="mt-1" style={{ fontSize: '0.9rem' }}>
            Removing {attachmentName.toLowerCase()} costs a <strong>STANDARD action</strong> (creature can still move after).
          </div>
          {hasUsedAction && (
            <div className="mt-2 text-danger" style={{ fontSize: '0.9rem' }}>
              <strong>Warning:</strong> This creature has already used its action and cannot remove {attachmentName.toLowerCase()}!
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
          Keep {attachmentName} (Attack Only)
        </Button>
        <Button
          variant={isLeapAway ? 'danger' : 'secondary'}
          onClick={onRemoveWeb}
          size="lg"
          disabled={hasUsedAction}
          title={hasUsedAction ? 'Creature has already used its action' : `Remove ${attachmentName.toLowerCase()} (uses standard action, can still move)`}
        >
          {getAttachmentIcon()} Remove {attachmentName}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default WebRemovalModal
