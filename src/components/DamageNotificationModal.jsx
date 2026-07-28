import { Modal, Button, Badge, Alert, Row, Col } from 'react-bootstrap'
import './DamageNotificationModal.css'

/**
 * DamageNotificationModal - Displays damage/death events that might otherwise be missed
 *
 * Two display modes:
 * 1. 'ability' - For passive abilities like Disciple of Kyuss (shows multiple targets)
 * 2. 'combat' - For AI combat deaths (shows attacker vs defender cards)
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onDismiss - Callback when modal is dismissed
 * @param {string} mode - 'ability' or 'combat'
 * @param {string} abilityName - Name of ability (for ability mode)
 * @param {Object} sourceCreature - Creature instance that triggered the ability (for ability mode)
 * @param {Array} damageEvents - Array of damage events (for ability mode)
 * @param {Object} attackerInstance - Attacking creature instance (for combat mode)
 * @param {Object} defenderInstance - Defending creature instance (for combat mode)
 * @param {number} damageDealt - Damage dealt in combat (for combat mode)
 * @param {string} attackType - 'melee' or 'ranged' (for combat mode)
 * @param {Array} abilitiesTriggered - Abilities that triggered during combat (for combat mode)
 * @param {Object} moraleChanges - Morale changes { attacker, defender } (for combat mode)
 */
function DamageNotificationModal({
  show,
  onDismiss,
  mode = 'ability',
  // Ability mode props
  abilityName,
  sourceCreature,
  damageEvents = [],
  // Combat mode props
  attackerInstance,
  defenderInstance,
  damageDealt,
  attackType,
  abilitiesTriggered = [],
  moraleChanges,
}) {
  if (!show) return null

  // Calculate totals for ability mode
  const totalDamage = damageEvents.reduce((sum, e) => sum + e.damage, 0)
  const totalDeaths = damageEvents.filter((e) => e.destroyed).length
  const totalMoraleLost = damageEvents
    .filter((e) => e.destroyed)
    .reduce((sum, e) => sum + (e.creatureLevel || 0), 0)

  /**
   * Render ability mode content (Disciple of Kyuss, etc.)
   */
  const renderAbilityMode = () => (
    <>
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #6f42c1' }}
      >
        <Modal.Title>
          <span style={{ color: '#9c6ade' }}>☠️</span> {abilityName || 'Passive Ability'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
        {/* Source creature card */}
        {sourceCreature && sourceCreature.creature?.imageUrl && (
          <div className="text-center mb-3">
            <img
              src={sourceCreature.creature.imageUrl}
              alt={sourceCreature.creature.name}
              className="damage-modal-creature-img"
              style={{ maxHeight: '200px', borderRadius: '8px', border: '2px solid #6f42c1' }}
            />
            <div className="mt-2">
              <strong>{sourceCreature.creature.name}</strong>
              <Badge bg="secondary" className="ms-2">
                {sourceCreature.owner}
              </Badge>
            </div>
          </div>
        )}

        {/* Damage summary alert */}
        <Alert variant="danger" className="mb-3">
          <strong>
            Adjacent enemies take {damageEvents.length > 0 ? damageEvents[0]?.damage : 10} damage!
          </strong>
          {totalDeaths > 0 && (
            <span className="ms-2">
              <Badge bg="dark">
                {totalDeaths} creature{totalDeaths > 1 ? 's' : ''} destroyed!
              </Badge>
            </span>
          )}
        </Alert>

        {/* List of affected creatures */}
        <div className="damage-events-list">
          {damageEvents.map((event, index) => (
            <div
              key={index}
              className={`damage-event-item ${event.destroyed ? 'destroyed' : ''}`}
              style={{
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: event.destroyed
                  ? 'rgba(220, 53, 69, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                border: event.destroyed ? '1px solid #dc3545' : '1px solid #444',
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  {event.creatureImageUrl && (
                    <img
                      src={event.creatureImageUrl}
                      alt={event.creatureName}
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginRight: '10px',
                      }}
                    />
                  )}
                  <div>
                    <strong>{event.creatureName}</strong>
                    <Badge bg="secondary" size="sm" className="ms-2">
                      {event.creatureOwner}
                    </Badge>
                  </div>
                </div>
                <div className="text-end">
                  <span className="text-warning">{event.previousHP}</span>
                  <span className="mx-2">→</span>
                  <span className={event.destroyed ? 'text-danger' : 'text-success'}>
                    {event.destroyed ? '0 (DEAD!)' : event.remainingHP}
                  </span>
                  {event.destroyed && <span className="ms-2">💀</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Morale loss summary */}
        {totalMoraleLost > 0 && (
          <Alert variant="warning" className="mt-3 mb-0">
            <strong>Morale lost:</strong> {totalMoraleLost} (from destroyed creature levels)
          </Alert>
        )}
      </Modal.Body>
    </>
  )

  /**
   * Render combat mode content (AI vs AI deaths)
   */
  const renderCombatMode = () => {
    const attackerCreature = attackerInstance?.creature
    const defenderCreature = defenderInstance?.creature

    return (
      <>
        <Modal.Header
          style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #dc3545' }}
        >
          <Modal.Title>⚔️ Combat Result</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {/* Attacker vs Defender cards */}
          <Row className="mb-3">
            {/* Attacker */}
            <Col xs={5} className="text-center">
              {attackerCreature?.imageUrl && (
                <img
                  src={attackerCreature.imageUrl}
                  alt={attackerCreature.name}
                  className="damage-modal-creature-img"
                  style={{
                    maxHeight: '180px',
                    borderRadius: '8px',
                    border: '2px solid #28a745',
                    boxShadow: '0 0 10px rgba(40, 167, 69, 0.5)',
                  }}
                />
              )}
              <div className="mt-2">
                <strong className="text-success">{attackerCreature?.name}</strong>
                <br />
                <Badge bg="secondary">{attackerInstance?.owner}</Badge>
              </div>
            </Col>

            {/* VS */}
            <Col xs={2} className="d-flex align-items-center justify-content-center">
              <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>VS</span>
            </Col>

            {/* Defender */}
            <Col xs={5} className="text-center">
              {defenderCreature?.imageUrl && (
                <img
                  src={defenderCreature.imageUrl}
                  alt={defenderCreature.name}
                  className="damage-modal-creature-img"
                  style={{
                    maxHeight: '180px',
                    borderRadius: '8px',
                    border: '2px solid #dc3545',
                    boxShadow: '0 0 10px rgba(220, 53, 69, 0.5)',
                    filter: 'grayscale(50%)',
                  }}
                />
              )}
              <div className="mt-2">
                <strong className="text-danger">{defenderCreature?.name}</strong>
                <span className="ms-2">💀</span>
                <br />
                <Badge bg="secondary">{defenderInstance?.owner}</Badge>
              </div>
            </Col>
          </Row>

          {/* Attack details */}
          <Alert variant="danger" className="text-center">
            <div style={{ fontSize: '1.2rem' }}>
              <strong>{attackType === 'ranged' ? '🏹 Ranged' : '⚔️ Melee'} Attack:</strong>
              <span className="ms-2 text-warning" style={{ fontSize: '1.4rem' }}>
                {damageDealt} damage
              </span>
            </div>
            <div className="mt-2" style={{ fontSize: '1.1rem' }}>
              <strong className="text-danger">{defenderCreature?.name} DESTROYED!</strong>
            </div>
          </Alert>

          {/* Abilities triggered */}
          {abilitiesTriggered.length > 0 && (
            <Alert variant="info" className="mb-3">
              <strong>Abilities Triggered:</strong>
              <ul className="mb-0 mt-2">
                {abilitiesTriggered.map((ability, index) => (
                  <li key={index}>{ability}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Morale changes */}
          {moraleChanges && (
            <Alert variant="secondary" className="mb-0">
              <strong>Morale Changes:</strong>
              <div className="d-flex justify-content-around mt-2">
                <div>
                  <span className="text-success">{attackerInstance?.owner}:</span>
                  <strong className="ms-2 text-success">+{moraleChanges.attacker || 1}</strong>
                </div>
                <div>
                  <span className="text-danger">{defenderInstance?.owner}:</span>
                  <strong className="ms-2 text-danger">{moraleChanges.defender || 0}</strong>
                </div>
              </div>
            </Alert>
          )}
        </Modal.Body>
      </>
    )
  }

  return (
    <Modal
      show={show}
      onHide={onDismiss}
      centered
      size="lg"
      backdrop="static"
      className="damage-notification-modal"
    >
      {mode === 'ability' ? renderAbilityMode() : renderCombatMode()}

      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="primary" onClick={onDismiss} size="lg">
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default DamageNotificationModal
