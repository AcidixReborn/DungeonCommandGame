import { useState, useRef, useCallback } from 'react'
import { Modal, Button, Badge, Alert, ListGroup } from 'react-bootstrap'

/**
 * ChieftainCallModal - Allows player to use Orc Chieftain's CHIEFTAIN CALL ability
 *
 * When an Orc Chieftain is deployed, this modal appears giving the player the option to:
 * - Select an Orc creature (Level 3 or lower) from their hand
 * - Gain Leadership equal to that creature's level
 * - Immediately deploy that creature
 * - Or decline the ability
 *
 * If no eligible Orcs are in hand, shows an acknowledgement message.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onDeploy - Callback when player chooses to deploy (receives selectedCreature)
 * @param {Function} onDecline - Callback when player declines or acknowledges
 * @param {Object} chieftainInstance - The Orc Chieftain that was just deployed
 * @param {Array} eligibleOrcs - Array of eligible Orc creatures from player's hand
 * @param {Object} gameState - Current game state for deployment position info
 */
function ChieftainCallModal({
  show,
  onDeploy,
  onDecline,
  chieftainInstance,
  eligibleOrcs = [],
  gameState
}) {
  const [selectedCreature, setSelectedCreature] = useState(null)
  const [hoveredCreature, setHoveredCreature] = useState(null)
  const hoverTimeoutRef = useRef(null)

  // Handle mouse enter - start delay timer for preview
  const handleMouseEnter = useCallback((creature) => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCreature(creature)
    }, 350) // 350ms delay before showing preview
  }, [])

  // Handle mouse leave - cancel timer and hide preview
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setHoveredCreature(null)
  }, [])

  if (!show || !chieftainInstance) return null

  const chieftain = chieftainInstance.creature
  const hasEligibleOrcs = eligibleOrcs.length > 0

  const handleSelect = (creature) => {
    setSelectedCreature(creature)
  }

  const handleDeploy = () => {
    if (selectedCreature) {
      onDeploy(selectedCreature)
      setSelectedCreature(null)
    }
  }

  const handleDecline = () => {
    setSelectedCreature(null)
    onDecline()
  }

  return (
    <>
    <Modal
      show={show}
      onHide={handleDecline}
      centered
      size="lg"
      backdrop="static"
      className="chieftain-call-modal"
    >
      <Modal.Header style={{ backgroundColor: '#4a2c2c', color: 'white', borderBottom: '2px solid #6b3a3a' }}>
        <Modal.Title>
          <span style={{ marginRight: '8px' }}>&#9876;</span>
          CHIEFTAIN CALL
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
        {/* Chieftain info */}
        <div className="text-center mb-3">
          {chieftain?.imageUrl && (
            <img
              src={chieftain.imageUrl}
              alt={chieftain.name}
              style={{
                maxHeight: '150px',
                borderRadius: '8px',
                border: '2px solid #6b3a3a',
                boxShadow: '0 0 15px rgba(107, 58, 58, 0.5)'
              }}
            />
          )}
          <div className="mt-2">
            <strong>{chieftain.name}</strong>
            <Badge bg="danger" className="ms-2">Level {chieftain.level}</Badge>
          </div>
        </div>

        {/* Ability Description */}
        <Alert variant="dark" className="mb-3" style={{ backgroundColor: '#1a1a2e', border: '1px solid #6b3a3a' }}>
          <div style={{ fontSize: '0.9rem' }}>
            <strong>CHIEFTAIN CALL:</strong> You may reveal an Orc Creature card of Level 3 or lower from your hand.
            If you do, gain LEADERSHIP equal to the revealed creature's Level and immediately deploy that creature.
          </div>
        </Alert>

        {hasEligibleOrcs ? (
          <>
            {/* Eligible Orcs List */}
            <div className="mb-3">
              <h6 style={{ color: '#ccc' }}>Select an Orc to Deploy:</h6>
              <ListGroup>
                {eligibleOrcs.map((creature, index) => (
                  <ListGroup.Item
                    key={creature.id || index}
                    action
                    active={selectedCreature?.id === creature.id}
                    onClick={() => handleSelect(creature)}
                    onMouseEnter={() => handleMouseEnter(creature)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      backgroundColor: selectedCreature?.id === creature.id ? '#4a2c2c' : '#3a3d41',
                      color: 'white',
                      border: selectedCreature?.id === creature.id ? '2px solid #8b4a4a' : '1px solid #555',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      position: 'relative'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        {creature.imageUrl && (
                          <img
                            src={creature.imageUrl}
                            alt={creature.name}
                            style={{
                              height: '60px',
                              marginRight: '12px',
                              borderRadius: '4px',
                              border: '1px solid #666'
                            }}
                          />
                        )}
                        <div>
                          <strong>{creature.name}</strong>
                          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                            HP: {creature.hitPoints} | Speed: {creature.speed} | Damage: {creature.meleeAttack?.damage || 0}
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <Badge bg="danger" style={{ fontSize: '1rem' }}>Level {creature.level}</Badge>
                        <div style={{ fontSize: '0.85rem', color: '#69db7c', marginTop: '4px' }}>
                          +{creature.level} Leadership
                        </div>
                      </div>
                    </div>

                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>

            {/* Selection Preview */}
            {selectedCreature && (
              <Alert variant="success" className="mb-0" style={{ backgroundColor: '#1a3a2a', border: '1px solid #2d6a4d' }}>
                <div style={{ fontSize: '0.9rem' }}>
                  <strong>Selected:</strong> {selectedCreature.name}
                  <br />
                  <strong>Leadership Gain:</strong> +{selectedCreature.level}
                  <br />
                  <span style={{ color: '#aaa' }}>
                    The selected Orc will be deployed to your starting zone.
                  </span>
                </div>
              </Alert>
            )}
          </>
        ) : (
          /* No Eligible Orcs Message */
          <Alert variant="warning" className="mb-0" style={{ backgroundColor: '#3a3a1a', border: '1px solid #6a6a2d' }}>
            <div className="text-center">
              <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                <strong>No Eligible Orcs Available</strong>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                You have no Orc creatures of Level 3 or lower in your hand.
                <br />
                The CHIEFTAIN CALL ability cannot be used.
              </div>
            </div>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: '#4a2c2c', borderTop: '1px solid #6b3a3a', justifyContent: 'space-between' }}>
        <Button
          variant="secondary"
          onClick={handleDecline}
          size="lg"
        >
          {hasEligibleOrcs ? 'Decline' : 'OK'}
        </Button>
        {hasEligibleOrcs && (
          <Button
            variant="danger"
            onClick={handleDeploy}
            size="lg"
            disabled={!selectedCreature}
            title={!selectedCreature ? 'Select an Orc to deploy' : `Deploy ${selectedCreature.name}`}
          >
            Deploy Orc
            {selectedCreature && <span className="ms-2">(+{selectedCreature.level} Leadership)</span>}
          </Button>
        )}
      </Modal.Footer>
    </Modal>

      {/* Hover preview - rendered outside modal as fixed position element */}
      {hoveredCreature?.imageUrl && (
        <div
          style={{
            position: 'fixed',
            right: 'calc(50% + 420px)', // Position to the left of the modal (modal is ~800px wide)
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10500, // Above modal backdrop
            pointerEvents: 'none',
            background: 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)',
            border: '3px solid #6b3a3a',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(107, 58, 58, 0.3)'
          }}
        >
          <img
            src={hoveredCreature.imageUrl}
            alt={hoveredCreature.name}
            style={{
              height: '364px',
              width: 'auto',
              display: 'block',
              borderRadius: '4px'
            }}
          />
        </div>
      )}
    </>
  )
}

export default ChieftainCallModal
