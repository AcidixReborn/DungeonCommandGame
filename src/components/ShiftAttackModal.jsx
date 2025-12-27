import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * ShiftAttackModal - Confirmation modal for STANDARD shift + attack order cards
 *
 * Shows during ACTIVATE phase when player right-clicks a shift+attack card
 * on a creature. Supports:
 * - Nimble Strike: Shift 3, melee/ranged +10
 * - Spring Attack: Shift 6, melee attack, Shift 6
 * - Shadowy Ambush: Shift 2, melee 50 flat damage
 *
 * Visual distinction:
 * - Purple (#9b59b6) styling to match shift tiles
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Object} card - The order card being used
 * @param {Object} creature - The creature instance using the card
 * @param {Function} onConfirm - Callback when player confirms (enters shift selection)
 * @param {Function} onCancel - Callback when player cancels (returns card to hand)
 */
function ShiftAttackModal({
  show,
  card,
  creature,
  onConfirm,
  onCancel
}) {
  if (!show || !card || !creature) return null

  // Determine attack capabilities
  const hasMeleeBoost = card.meleeDamageBonus > 0 || card.flatMeleeDamage !== null
  const hasRangedBoost = card.rangedDamageBonus > 0
  const isFlat = card.flatMeleeDamage !== null && card.flatMeleeDamage !== undefined

  // Get base damages
  const baseMeleeDamage = creature.creature?.meleeAttack?.damage || 0
  const baseRangedDamage = creature.creature?.rangedAttack?.damage || 0

  // Calculate preview damage
  let meleePreview = null
  let rangedPreview = null

  if (hasMeleeBoost) {
    if (isFlat) {
      meleePreview = {
        damage: card.flatMeleeDamage,
        explanation: `${card.flatMeleeDamage} flat damage (replaces base)`
      }
    } else {
      const total = baseMeleeDamage + (card.meleeDamageBonus || 0)
      meleePreview = {
        damage: total,
        explanation: `Base ${baseMeleeDamage} + ${card.meleeDamageBonus || 0} bonus = ${total}`
      }
    }
  } else {
    // Spring Attack - uses normal melee damage
    meleePreview = {
      damage: baseMeleeDamage,
      explanation: `Base melee damage: ${baseMeleeDamage}`
    }
  }

  if (hasRangedBoost && baseRangedDamage > 0) {
    const total = baseRangedDamage + card.rangedDamageBonus
    rangedPreview = {
      damage: total,
      explanation: `Base ${baseRangedDamage} + ${card.rangedDamageBonus} bonus = ${total}`
    }
  }

  // Style colors - purple for shift
  const accentColor = '#9b59b6'

  // Determine attack type text
  let attackTypeText = 'melee'
  if (hasRangedBoost && !hasMeleeBoost) {
    attackTypeText = 'ranged'
  } else if (hasRangedBoost && hasMeleeBoost) {
    attackTypeText = 'melee or ranged'
  }

  return (
    <Modal show={show} onHide={onCancel} centered size="md" backdrop="static">
      <Modal.Header style={{ backgroundColor: '#212529', color: 'white', borderBottom: `2px solid ${accentColor}` }}>
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
                border: `2px solid ${accentColor}`
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

        {/* Shift Info */}
        <Alert
          style={{ backgroundColor: 'rgba(155, 89, 182, 0.2)', border: `1px solid ${accentColor}` }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
            🏃 Shift Movement
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            Shift 1-{card.shiftBeforeAttack} squares before attack
          </div>
          {card.shiftAfterAttack > 0 && (
            <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>
              Shift 1-{card.shiftAfterAttack} squares after attack
            </div>
          )}
        </Alert>

        {/* Damage Preview - Melee */}
        {meleePreview && (
          <Alert
            variant="danger"
            style={{ backgroundColor: 'rgba(220, 53, 69, 0.2)', border: '1px solid #dc3545' }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
              ⚔️ Melee Attack Preview
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              {meleePreview.explanation}
            </div>
            {isFlat && (
              <div style={{ fontSize: '0.8rem', color: '#ffc107', marginTop: '5px' }}>
                (Flanking and Cutter bonuses do not apply to flat damage)
              </div>
            )}
          </Alert>
        )}

        {/* Damage Preview - Ranged */}
        {rangedPreview && (
          <Alert
            variant="primary"
            style={{ backgroundColor: 'rgba(13, 110, 253, 0.2)', border: '1px solid #0d6efd' }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>
              🏹 Ranged Attack Preview
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              {rangedPreview.explanation}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
              (Line of sight required)
            </div>
          </Alert>
        )}

        {/* Card Draw Preview */}
        {card.drawCardsOnAttack > 0 && (
          <Alert
            variant="success"
            style={{ backgroundColor: 'rgba(40, 167, 69, 0.2)', border: '1px solid #28a745', marginBottom: '10px' }}
          >
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
              📜 Draw {card.drawCardsOnAttack} Order card{card.drawCardsOnAttack > 1 ? 's' : ''} after attack
            </div>
          </Alert>
        )}

        {/* Warning about action consumption and commitment */}
        <Alert
          variant="warning"
          className="mb-0"
          style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107' }}
        >
          <div style={{ fontSize: '0.85rem', marginBottom: '5px' }}>
            <strong>Note:</strong> This will consume {creature.creature?.name || creature.name}'s STANDARD action.
          </div>
          <div style={{ fontSize: '0.85rem', color: '#ffc107' }}>
            <strong>⚠️ Once you shift, you must complete the attack.</strong>
          </div>
        </Alert>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          style={{ backgroundColor: accentColor, borderColor: accentColor }}
          onClick={onConfirm}
        >
          Begin Shift
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ShiftAttackModal
