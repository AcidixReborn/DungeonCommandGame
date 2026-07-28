import { useState } from 'react'
import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * FactionSelectModal - Allows player to select an opponent faction
 *
 * Used for effects like Recoil where the defender chooses which opponent
 * receives a card draw as a side effect.
 *
 * @param {boolean} show - Controls modal visibility
 * @param {string} title - Modal title (e.g., "Choose Opponent to Receive Card")
 * @param {string} description - Description of why selection is needed
 * @param {Array} eligibleFactions - Array of faction options
 *   Each: { playerId, factionName, commanderImage, commanderName }
 * @param {Function} onSelect - Callback when faction is selected (playerId) => void
 * @param {Function} onCancel - Optional cancel handler (if null, selection is required)
 */
function FactionSelectModal({
  show,
  title = 'Select Opponent Faction',
  description = '',
  eligibleFactions = [],
  onSelect,
  onCancel = null,
}) {
  const [selectedFaction, setSelectedFaction] = useState(null)
  const [hoveredFaction, setHoveredFaction] = useState(null)

  if (!show) return null

  const handleConfirm = () => {
    if (selectedFaction && onSelect) {
      onSelect(selectedFaction)
      setSelectedFaction(null)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      setSelectedFaction(null)
      onCancel()
    }
  }

  return (
    <Modal show={show} onHide={onCancel || (() => {})} centered size="md" backdrop="static">
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #ffc107' }}
      >
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', textAlign: 'center' }}>
        {description && (
          <Alert
            variant="warning"
            className="mb-3"
            style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107' }}
          >
            <div style={{ fontSize: '0.95rem' }}>{description}</div>
          </Alert>
        )}

        <div style={{ fontSize: '0.9rem', marginBottom: '12px', color: '#adb5bd' }}>
          Select which opponent will receive the card:
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              eligibleFactions.length <= 2
                ? `repeat(${eligibleFactions.length}, 1fr)`
                : 'repeat(3, 1fr)',
            gap: '16px',
            justifyItems: 'center',
            padding: '8px',
          }}
        >
          {eligibleFactions.map((faction) => {
            const isSelected = selectedFaction === faction.playerId
            const isHovered = hoveredFaction === faction.playerId

            return (
              <div
                key={faction.playerId}
                onClick={() => setSelectedFaction(faction.playerId)}
                onMouseEnter={() => setHoveredFaction(faction.playerId)}
                onMouseLeave={() => setHoveredFaction(null)}
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: '12px',
                  border: isSelected
                    ? '3px solid #ffc107'
                    : isHovered
                      ? '3px solid #6c757d'
                      : '3px solid transparent',
                  backgroundColor: isSelected
                    ? 'rgba(255, 193, 7, 0.15)'
                    : isHovered
                      ? 'rgba(108, 117, 125, 0.15)'
                      : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Commander Image as Faction Emblem */}
                {faction.commanderImage ? (
                  <img
                    src={faction.commanderImage}
                    alt={faction.factionName}
                    style={{
                      width: '100px',
                      height: '140px',
                      objectFit: 'cover',
                      objectPosition: 'top',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #ffc107' : '2px solid #444',
                      marginBottom: '8px',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100px',
                      height: '140px',
                      backgroundColor: '#444',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #ffc107' : '2px solid #555',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: '#adb5bd' }}>
                      {faction.factionName?.substring(0, 10) || 'Unknown'}
                    </span>
                  </div>
                )}

                {/* Commander Name */}
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: isSelected ? '#ffc107' : 'white',
                  }}
                >
                  {faction.commanderName || 'Unknown Commander'}
                </div>

                {/* Faction Name */}
                <div style={{ fontSize: '0.75rem', color: '#adb5bd' }}>
                  {faction.factionName || 'Unknown Faction'}
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '0.75rem',
                      color: '#ffc107',
                      fontWeight: 'bold',
                    }}
                  >
                    SELECTED
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {eligibleFactions.length === 0 && (
          <Alert
            variant="secondary"
            className="mt-3 mb-0"
            style={{ backgroundColor: 'rgba(108, 117, 125, 0.2)', border: '1px solid #6c757d' }}
          >
            <div style={{ fontSize: '0.9rem' }}>No eligible opponents available.</div>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        {onCancel && (
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        )}
        <Button variant="warning" onClick={handleConfirm} disabled={!selectedFaction}>
          Confirm Selection
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default FactionSelectModal
