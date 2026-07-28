import { useState, useEffect } from 'react'
import { Modal, Button, Alert } from 'react-bootstrap'
import { logger } from '../utils/logger'

/**
 * DamageBoostModal - Confirmation modal for STANDARD damage boost order cards
 *
 * Shows during ACTIVATE phase when player right-clicks a damage boost card
 * on a creature. Supports both melee (Power Attack, Hacking Frenzy, Killing Strike)
 * and ranged (Gout of Fire) damage boost cards.
 *
 * Visual distinction:
 * - Melee boost cards: Red (#dc3545) styling
 * - Ranged boost cards: Blue (#0d6efd) styling
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Object} card - The order card being used
 * @param {Object} creature - The creature instance using the card
 * @param {Function} onConfirm - Callback when player confirms (enters attack target selection)
 * @param {Function} onCancel - Callback when player cancels (returns card to hand)
 */
function DamageBoostModal({ show, card, creature, onConfirm, onCancel }) {
  // Track if modal just opened to prevent instant confirmation
  const [canConfirm, setCanConfirm] = useState(false)

  // Reset canConfirm when modal opens/closes
  useEffect(() => {
    if (show) {
      // Add small delay before allowing confirmation to prevent accidental double-clicks
      setCanConfirm(false)
      const timer = setTimeout(() => setCanConfirm(true), 200)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!show || !card || !creature) return null

  // Handle confirm with guard
  const handleConfirm = (e) => {
    e.stopPropagation()
    if (canConfirm) {
      onConfirm()
    } else {
      logger.modal('DamageBoostModal', 'Blocked early confirm - modal just opened')
    }
  }

  // Determine if this is a ranged or melee boost card
  const isRangedBoost = card.rangedDamageBonus > 0
  const isFlat = card.flatMeleeDamage !== null && card.flatMeleeDamage !== undefined

  // Get base damage based on attack type
  const baseDamage = isRangedBoost
    ? creature.creature?.rangedAttack?.damage || 0
    : creature.creature?.meleeAttack?.damage || 0

  // Get bonus damage
  const bonusDamage = isRangedBoost ? card.rangedDamageBonus : card.meleeDamageBonus || 0
  const flatDamage = card.flatMeleeDamage || 0

  // Calculate preview damage
  let previewDamage
  let damageExplanation
  if (isFlat) {
    previewDamage = flatDamage
    damageExplanation = `${flatDamage} flat damage (replaces base damage)`
  } else {
    previewDamage = baseDamage + bonusDamage
    damageExplanation = `Base ${baseDamage} + ${bonusDamage} bonus = ${previewDamage} damage`
  }

  // Style colors based on attack type
  const accentColor = isRangedBoost ? '#0d6efd' : '#dc3545' // Blue for ranged, Red for melee
  const attackTypeText = isRangedBoost ? 'ranged' : 'melee'

  return (
    <Modal show={show} onHide={onCancel} centered backdrop="static" keyboard={false}>
      <Modal.Header
        style={{
          backgroundColor: '#212529',
          color: 'white',
          borderBottom: `2px solid ${accentColor}`,
        }}
      >
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
                border: `2px solid ${accentColor}`,
              }}
            />
          ) : (
            <div
              style={{
                width: '140px',
                height: '200px',
                backgroundColor: '#444',
                borderRadius: '8px',
                border: `2px solid ${accentColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
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
            fontStyle: 'italic',
          }}
        >
          {card.effectDescription}
        </div>

        {/* Damage Preview */}
        <Alert
          variant={isRangedBoost ? 'primary' : 'danger'}
          style={{
            backgroundColor: isRangedBoost ? 'rgba(13, 110, 253, 0.2)' : 'rgba(220, 53, 69, 0.2)',
            border: `1px solid ${accentColor}`,
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
            {creature.creature?.name || creature.name}{' '}
            {attackTypeText.charAt(0).toUpperCase() + attackTypeText.slice(1)} Attack Preview
          </div>
          <div style={{ fontSize: '0.9rem' }}>{damageExplanation}</div>
          {isFlat && (
            <div style={{ fontSize: '0.8rem', color: '#ffc107', marginTop: '5px' }}>
              (Flanking and Cutter bonuses do not apply to flat damage)
            </div>
          )}
          {!isFlat && !isRangedBoost && (
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
              (Flanking and Cutter bonuses may add to this total)
            </div>
          )}
          {!isFlat && isRangedBoost && (
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
              (Line of sight required for ranged attacks)
            </div>
          )}
        </Alert>

        {/* Card Draw Preview (Phase STD-3: Slice) */}
        {card.drawCardsOnAttack > 0 && (
          <Alert
            variant="success"
            style={{
              backgroundColor: 'rgba(40, 167, 69, 0.2)',
              border: '1px solid #28a745',
              marginBottom: '10px',
            }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
              📜 Draw {card.drawCardsOnAttack} Order card{card.drawCardsOnAttack > 1 ? 's' : ''}{' '}
              after attack
            </div>
          </Alert>
        )}

        {/* Healing Preview (Phase STD-6: Attack + Heal) */}
        {card.healOnAttack > 0 && (
          <Alert
            variant="success"
            style={{
              backgroundColor: 'rgba(40, 167, 69, 0.2)',
              border: '1px solid #28a745',
              marginBottom: '10px',
            }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
              💚 Heal {card.healOnAttack} damage after attack
            </div>
            {card.healOnAttackMinDamage > 0 && (
              <div style={{ fontSize: '0.8rem', color: '#ffc107', marginTop: '5px' }}>
                (Only if you deal at least {card.healOnAttackMinDamage} damage)
              </div>
            )}
          </Alert>
        )}

        {/* Warning about action consumption */}
        <Alert
          variant="warning"
          className="mb-0"
          style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107' }}
        >
          <div style={{ fontSize: '0.85rem' }}>
            <strong>Note:</strong> This will consume {creature.creature?.name || creature.name}'s
            STANDARD action. Select a {attackTypeText} target after confirming.
          </div>
        </Alert>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation()
            onCancel()
          }}
        >
          Cancel
        </Button>
        <Button
          variant={isRangedBoost ? 'primary' : 'danger'}
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          Select Target
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default DamageBoostModal
