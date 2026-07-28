import { Modal, Button, Badge, Card, Row, Col } from 'react-bootstrap'

/**
 * CounterAttackTargetModal - Allows player to select counter-attack target
 *
 * When using Seize the Opportunity with multiple adjacent tapped enemies,
 * this modal appears allowing the player to choose which enemy to counter-attack.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onSelectTarget - Callback when player selects a target
 * @param {Function} onSkip - Callback when player skips the counter-attack
 * @param {Object} counterAttackData - { damage, validTargets, defenderInstance }
 */
function CounterAttackTargetModal({ show, onSelectTarget, onSkip, counterAttackData }) {
  if (!show || !counterAttackData) return null

  const { damage, validTargets, defenderInstance } = counterAttackData
  const defenderName = defenderInstance?.creature?.name || 'Defender'

  return (
    <Modal
      show={show}
      onHide={onSkip}
      centered
      size="lg"
      backdrop="static"
      className="counter-attack-target-modal"
    >
      <Modal.Header
        style={{ backgroundColor: '#4a1a1a', color: 'white', borderBottom: '2px solid #8b0000' }}
      >
        <Modal.Title>
          <span style={{ marginRight: '8px' }}>&#9876;</span>
          Counter-Attack Target Selection
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
        {/* Explanation */}
        <div className="text-center mb-3">
          <strong>{defenderName}</strong> can counter-attack for{' '}
          <Badge bg="danger" style={{ fontSize: '1rem' }}>
            {damage} damage
          </Badge>
        </div>

        <div className="text-center mb-3" style={{ color: '#aaa', fontSize: '0.9rem' }}>
          Select a tapped enemy creature to attack. This damage cannot be prevented.
        </div>

        {/* Target Selection Grid */}
        <Row xs={1} md={2} className="g-3">
          {validTargets.map((target, index) => {
            const creature = target.creature
            const wouldKill = target.currentHP <= damage

            return (
              <Col key={target.instanceId || index}>
                <Card
                  style={{
                    backgroundColor: '#1a1a2e',
                    border: wouldKill ? '2px solid #dc3545' : '2px solid #6c757d',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className="h-100 target-card"
                  onClick={() => onSelectTarget(target)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(220, 53, 69, 0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <Card.Body className="d-flex align-items-center p-2">
                    {/* Creature Image */}
                    {creature?.imageUrl && (
                      <img
                        src={creature.imageUrl}
                        alt={creature.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          marginRight: '12px',
                          border: '1px solid #444',
                        }}
                      />
                    )}

                    {/* Creature Info */}
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <strong style={{ color: 'white', fontSize: '1rem' }}>
                          {creature?.name || 'Unknown'}
                        </strong>
                        <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
                          Lvl {creature?.level || '?'}
                        </Badge>
                      </div>

                      {/* HP Bar */}
                      <div className="mb-2">
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.8rem',
                            color: '#aaa',
                            marginBottom: '2px',
                          }}
                        >
                          <span>HP</span>
                          <span>
                            {target.currentHP} / {creature?.hitPoints || '?'}
                          </span>
                        </div>
                        <div
                          style={{
                            height: '8px',
                            backgroundColor: '#333',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${(target.currentHP / (creature?.hitPoints || 1)) * 100}%`,
                              height: '100%',
                              backgroundColor:
                                target.currentHP < (creature?.hitPoints || 1) * 0.3
                                  ? '#dc3545'
                                  : '#28a745',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>

                      {/* Damage Preview */}
                      <div style={{ fontSize: '0.85rem' }}>
                        {wouldKill ? (
                          <Badge bg="danger">LETHAL ({damage} damage)</Badge>
                        ) : (
                          <span style={{ color: '#ff6b6b' }}>
                            After: {target.currentHP - damage} HP (-{damage})
                          </span>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )
          })}
        </Row>
      </Modal.Body>

      <Modal.Footer
        style={{
          backgroundColor: '#4a1a1a',
          borderTop: '1px solid #8b0000',
          justifyContent: 'space-between',
        }}
      >
        <Button variant="secondary" onClick={onSkip} size="lg">
          Skip Counter-Attack
        </Button>
        <div style={{ color: '#aaa', fontSize: '0.8rem' }}>Click a creature card to attack</div>
      </Modal.Footer>
    </Modal>
  )
}

export default CounterAttackTargetModal
