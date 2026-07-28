import { Modal, Button, Badge, Alert } from 'react-bootstrap'

/**
 * HarmfulAttachmentsModal - Shows all harmful order card attachments on the current player's creatures
 *
 * Displays at the start of the Activate phase to warn the player about:
 * - Deep Wound: 10 damage at start of activation
 * - Web / Leap Away: Prevents movement
 * - Mortal Wound: Creature will be destroyed at Deploy phase
 * - Shattered Weapon: -10 melee damage penalty
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onContinue - Callback when player clicks Continue
 * @param {Object} attachmentEffects - Object containing categorized effects:
 *   - damageEffects: Array of { creature, creatureName, damage, destroyed, source, currentHP, maxHP }
 *   - movementBlocked: Array of { creature, creatureName, source }
 *   - pendingDeath: Array of { creature, creatureName, source }
 *   - damagePenalty: Array of { creature, creatureName, source, penalty }
 */
function HarmfulAttachmentsModal({ show, onContinue, attachmentEffects }) {
  if (!show || !attachmentEffects) return null

  const {
    damageEffects = [],
    movementBlocked = [],
    pendingDeath = [],
    damagePenalty = [],
  } = attachmentEffects

  const hasAnyEffects =
    damageEffects.length > 0 ||
    movementBlocked.length > 0 ||
    pendingDeath.length > 0 ||
    damagePenalty.length > 0

  if (!hasAnyEffects) return null

  // Count total affected creatures (unique)
  const allCreatureNames = new Set([
    ...damageEffects.map((e) => e.creatureName),
    ...movementBlocked.map((e) => e.creatureName),
    ...pendingDeath.map((e) => e.creatureName),
    ...damagePenalty.map((e) => e.creatureName),
  ])
  const totalAffectedCreatures = allCreatureNames.size

  return (
    <Modal
      show={show}
      onHide={onContinue}
      centered
      size="lg"
      backdrop="static"
      className="harmful-attachments-modal"
    >
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #dc3545' }}
      >
        <Modal.Title>
          <span style={{ marginRight: '8px' }}>⚠️</span>
          Harmful Effects Active!
          <Badge bg="danger" className="ms-2">
            {totalAffectedCreatures} creature{totalAffectedCreatures > 1 ? 's' : ''}
          </Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
        {/* DAMAGE EFFECTS - Deep Wound (Red) */}
        {damageEffects.length > 0 && (
          <Alert
            variant="danger"
            style={{ backgroundColor: 'rgba(220, 53, 69, 0.2)', border: '1px solid #dc3545' }}
            className="mb-3"
          >
            <div className="d-flex align-items-center mb-2">
              <span style={{ fontSize: '1.3rem', marginRight: '8px' }}>🩸</span>
              <strong>Damage Over Time</strong>
            </div>
            {damageEffects.map((effect, index) => (
              <div
                key={`damage-${index}`}
                className="d-flex justify-content-between align-items-center"
                style={{
                  padding: '8px',
                  marginBottom: index < damageEffects.length - 1 ? '6px' : 0,
                  backgroundColor: effect.destroyed
                    ? 'rgba(220, 53, 69, 0.3)'
                    : 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                }}
              >
                <div className="d-flex align-items-center">
                  {effect.creature?.creature?.imageUrl && (
                    <img
                      src={effect.creature.creature.imageUrl}
                      alt={effect.creatureName}
                      style={{
                        width: '36px',
                        height: '36px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginRight: '10px',
                      }}
                    />
                  )}
                  <div>
                    <strong>{effect.creatureName}</strong>
                    <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                      ({effect.source})
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  <span className="text-danger">-{effect.damage} damage</span>
                  <span className="mx-2">→</span>
                  {effect.destroyed ? (
                    <span className="text-danger">
                      <strong>DESTROYED</strong> 💀
                    </span>
                  ) : (
                    <span className="text-warning">
                      {effect.currentHP}/{effect.maxHP} HP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </Alert>
        )}

        {/* MOVEMENT BLOCKED - Web, Leap Away (Gray) */}
        {movementBlocked.length > 0 && (
          <Alert
            variant="secondary"
            style={{ backgroundColor: 'rgba(108, 117, 125, 0.2)', border: '1px solid #6c757d' }}
            className="mb-3"
          >
            <div className="d-flex align-items-center mb-2">
              <span style={{ fontSize: '1.3rem', marginRight: '8px' }}>🕸️</span>
              <strong>Movement Blocked</strong>
            </div>
            {movementBlocked.map((effect, index) => (
              <div
                key={`movement-${index}`}
                className="d-flex justify-content-between align-items-center"
                style={{
                  padding: '8px',
                  marginBottom: index < movementBlocked.length - 1 ? '6px' : 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                }}
              >
                <div className="d-flex align-items-center">
                  {effect.creature?.creature?.imageUrl && (
                    <img
                      src={effect.creature.creature.imageUrl}
                      alt={effect.creatureName}
                      style={{
                        width: '36px',
                        height: '36px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginRight: '10px',
                      }}
                    />
                  )}
                  <div>
                    <strong>{effect.creatureName}</strong>
                    <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                      ({effect.source})
                    </span>
                  </div>
                </div>
                <div className="text-secondary">Cannot move this turn</div>
              </div>
            ))}
          </Alert>
        )}

        {/* PENDING DEATH - Mortal Wound (Purple) */}
        {pendingDeath.length > 0 && (
          <Alert
            variant="dark"
            style={{ backgroundColor: 'rgba(111, 66, 193, 0.2)', border: '1px solid #6f42c1' }}
            className="mb-3"
          >
            <div className="d-flex align-items-center mb-2">
              <span style={{ fontSize: '1.3rem', marginRight: '8px' }}>💀</span>
              <strong style={{ color: '#9c6ade' }}>Pending Death</strong>
            </div>
            {pendingDeath.map((effect, index) => (
              <div
                key={`death-${index}`}
                className="d-flex justify-content-between align-items-center"
                style={{
                  padding: '8px',
                  marginBottom: index < pendingDeath.length - 1 ? '6px' : 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                }}
              >
                <div className="d-flex align-items-center">
                  {effect.creature?.creature?.imageUrl && (
                    <img
                      src={effect.creature.creature.imageUrl}
                      alt={effect.creatureName}
                      style={{
                        width: '36px',
                        height: '36px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginRight: '10px',
                      }}
                    />
                  )}
                  <div>
                    <strong>{effect.creatureName}</strong>
                    <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                      ({effect.source})
                    </span>
                  </div>
                </div>
                <div style={{ color: '#9c6ade' }}>
                  <strong>Will die at Deploy phase!</strong>
                </div>
              </div>
            ))}
          </Alert>
        )}

        {/* DAMAGE PENALTY - Shattered Weapon (Orange) */}
        {damagePenalty.length > 0 && (
          <Alert
            variant="warning"
            style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107' }}
            className="mb-3"
          >
            <div className="d-flex align-items-center mb-2">
              <span style={{ fontSize: '1.3rem', marginRight: '8px' }}>⚔️</span>
              <strong>Damage Penalty</strong>
            </div>
            {damagePenalty.map((effect, index) => (
              <div
                key={`penalty-${index}`}
                className="d-flex justify-content-between align-items-center"
                style={{
                  padding: '8px',
                  marginBottom: index < damagePenalty.length - 1 ? '6px' : 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                }}
              >
                <div className="d-flex align-items-center">
                  {effect.creature?.creature?.imageUrl && (
                    <img
                      src={effect.creature.creature.imageUrl}
                      alt={effect.creatureName}
                      style={{
                        width: '36px',
                        height: '36px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginRight: '10px',
                      }}
                    />
                  )}
                  <div>
                    <strong>{effect.creatureName}</strong>
                    <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                      ({effect.source})
                    </span>
                  </div>
                </div>
                <div className="text-warning">-{effect.penalty} melee damage</div>
              </div>
            ))}
          </Alert>
        )}

        {/* Help text */}
        <Alert
          variant="info"
          className="mb-0"
          style={{ backgroundColor: 'rgba(23, 162, 184, 0.2)', border: '1px solid #17a2b8' }}
        >
          <div style={{ fontSize: '0.9rem' }}>
            <strong>Tip:</strong> Use <span style={{ color: '#28a745' }}>Healing Touch</span> or
            order cards that remove attachments to cure these effects!
          </div>
        </Alert>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="primary" onClick={onContinue} size="lg">
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default HarmfulAttachmentsModal
