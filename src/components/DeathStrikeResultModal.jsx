import { Modal, Button, Badge, Alert, Row, Col } from 'react-bootstrap'

/**
 * DeathStrikeResultModal - Displays DEATH STRIKE ability result
 *
 * Shows when an attacker is killed by a creature's DEATH STRIKE ability
 * (Boar, Wereboar) before it dies from a melee attack.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onDismiss - Callback when modal is dismissed
 * @param {Object} attackerInstance - The creature that initiated the attack (now dead)
 * @param {Object} defenderInstance - The creature with DEATH STRIKE (survives)
 * @param {number} deathStrikeDamage - Damage dealt by DEATH STRIKE
 * @param {number} originalDamage - Damage that would have been dealt to defender
 */
function DeathStrikeResultModal({
  show,
  onDismiss,
  attackerInstance,
  defenderInstance,
  deathStrikeDamage,
  originalDamage,
}) {
  if (!show) return null

  const attackerCreature = attackerInstance?.creature
  const defenderCreature = defenderInstance?.creature

  return (
    <Modal
      show={show}
      onHide={onDismiss}
      centered
      size="lg"
      backdrop="static"
      className="death-strike-modal"
    >
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #ff5722' }}
      >
        <Modal.Title>
          <span style={{ color: '#ff5722' }}>💀</span> DEATH STRIKE!
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
        {/* DEATH STRIKE explanation */}
        <Alert
          variant="warning"
          className="text-center mb-3"
          style={{ backgroundColor: 'rgba(255, 87, 34, 0.2)', border: '1px solid #ff5722' }}
        >
          <div style={{ fontSize: '1.1rem', color: '#ff5722' }}>
            <strong>{defenderCreature?.name}</strong> triggers <strong>DEATH STRIKE</strong> before
            dying!
          </div>
        </Alert>

        {/* Attacker vs Defender cards */}
        <Row className="mb-3">
          {/* Attacker (now dead) */}
          <Col xs={5} className="text-center">
            {attackerCreature?.imageUrl && (
              <img
                src={attackerCreature.imageUrl}
                alt={attackerCreature.name}
                style={{
                  maxHeight: '180px',
                  borderRadius: '8px',
                  border: '2px solid #dc3545',
                  boxShadow: '0 0 10px rgba(220, 53, 69, 0.5)',
                  filter: 'grayscale(70%)',
                }}
              />
            )}
            <div className="mt-2">
              <strong className="text-danger">{attackerCreature?.name}</strong>
              <span className="ms-2">💀</span>
              <br />
              <Badge bg="secondary">{attackerInstance?.owner}</Badge>
              <br />
              <small className="text-muted">Attacker</small>
            </div>
          </Col>

          {/* VS arrow showing DEATH STRIKE direction */}
          <Col xs={2} className="d-flex flex-column align-items-center justify-content-center">
            <span style={{ fontSize: '2rem', color: '#ff5722' }}>⚔️</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff5722' }}>←</span>
            <small style={{ color: '#ff5722' }}>
              DEATH
              <br />
              STRIKE
            </small>
          </Col>

          {/* Defender (survives with DEATH STRIKE) */}
          <Col xs={5} className="text-center">
            {defenderCreature?.imageUrl && (
              <img
                src={defenderCreature.imageUrl}
                alt={defenderCreature.name}
                style={{
                  maxHeight: '180px',
                  borderRadius: '8px',
                  border: '2px solid #ff5722',
                  boxShadow: '0 0 15px rgba(255, 87, 34, 0.6)',
                }}
              />
            )}
            <div className="mt-2">
              <strong style={{ color: '#ff5722' }}>{defenderCreature?.name}</strong>
              <br />
              <Badge bg="secondary">{defenderInstance?.owner}</Badge>
              <br />
              <small className="text-success">SURVIVES!</small>
            </div>
          </Col>
        </Row>

        {/* Combat sequence explanation */}
        <div
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px',
          }}
        >
          <h6 style={{ color: '#ff5722', marginBottom: '10px' }}>Combat Sequence:</h6>
          <ol style={{ marginBottom: 0, paddingLeft: '20px' }}>
            <li className="mb-2">
              <span className="text-muted">
                {attackerCreature?.name} attacks {defenderCreature?.name}
              </span>
              <span className="text-warning ms-2">({originalDamage} damage would kill)</span>
            </li>
            <li className="mb-2">
              <span style={{ color: '#ff5722' }}>
                <strong>DEATH STRIKE triggers!</strong>
              </span>
              <span className="text-danger ms-2">
                {defenderCreature?.name} deals <strong>{deathStrikeDamage} damage</strong> first
              </span>
            </li>
            <li className="mb-2">
              <span className="text-danger">
                <strong>{attackerCreature?.name} is DESTROYED!</strong>
              </span>
              <span className="ms-2">💀</span>
            </li>
            <li>
              <span className="text-success">
                <strong>{defenderCreature?.name} survives!</strong>
              </span>
              <span className="ms-2">(attack never completes)</span>
            </li>
          </ol>
        </div>

        {/* Result summary */}
        <Alert variant="danger" className="text-center mb-0">
          <div style={{ fontSize: '1.2rem' }}>
            <strong>Your attacker was killed before dealing damage!</strong>
          </div>
          <div className="mt-2">
            <Badge bg="danger" style={{ fontSize: '1rem', padding: '8px 12px' }}>
              {attackerCreature?.name}: {attackerInstance?.currentHP} HP → 0 HP
            </Badge>
          </div>
          <div className="mt-2">
            <Badge bg="success" style={{ fontSize: '1rem', padding: '8px 12px' }}>
              {defenderCreature?.name}: {defenderInstance?.currentHP} HP (unchanged)
            </Badge>
          </div>
        </Alert>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button
          variant="warning"
          onClick={onDismiss}
          size="lg"
          style={{ backgroundColor: '#ff5722', borderColor: '#ff5722' }}
        >
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default DeathStrikeResultModal
