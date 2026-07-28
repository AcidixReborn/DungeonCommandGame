import { Modal, Button, Alert } from 'react-bootstrap'

/**
 * CardsDrawnModal - Displays cards drawn at the start of the player's turn
 *
 * Shows at the beginning of the ACTIVATE phase to inform the player what
 * Order cards they drew during the REFRESH phase. This includes:
 * - The normal 1 card drawn during REFRESH
 * - Any bonus cards from abilities like Parry or Defensive Advantage
 *
 * Also used for Recoil effect (opponent draws card as side effect).
 *
 * @param {boolean} show - Controls modal visibility
 * @param {Function} onContinue - Callback when player clicks Continue
 * @param {Array} cards - Array of Order card objects that were drawn
 * @param {Array} bonusSources - Array of card names that triggered bonus draws (e.g., ["Parry"])
 * @param {string} title - Optional custom title (e.g., "You Drew a Card!")
 * @param {string} reason - Optional reason text explaining why the card was drawn (e.g., "Opponent used Recoil")
 */
function CardsDrawnModal({
  show,
  onContinue,
  cards = [],
  bonusSources = [],
  title = null,
  reason = null,
}) {
  if (!show) return null

  const hasCards = cards && cards.length > 0
  const hasBonusSources = bonusSources && bonusSources.length > 0

  return (
    <Modal show={show} onHide={onContinue} centered backdrop="static">
      <Modal.Header
        style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #17a2b8' }}
      >
        <Modal.Title>
          {title
            ? title
            : hasCards
              ? `You Drew ${cards.length} Card${cards.length > 1 ? 's' : ''}!`
              : 'No Cards to Draw'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white', textAlign: 'center' }}>
        {hasCards ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: cards.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                gap: '12px',
                justifyItems: 'center',
                marginBottom: '15px',
              }}
            >
              {cards.map((card, index) => (
                <div key={`${card.id}-${index}`} style={{ textAlign: 'center' }}>
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      style={{
                        maxHeight: cards.length === 1 ? '300px' : '200px',
                        borderRadius: '8px',
                        border: '2px solid #17a2b8',
                        marginBottom: '8px',
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
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>{card.name}</span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.85rem', color: '#adb5bd' }}>{card.name}</div>
                </div>
              ))}
            </div>
            <Alert
              variant="info"
              className="mb-0"
              style={{ backgroundColor: 'rgba(23, 162, 184, 0.2)', border: '1px solid #17a2b8' }}
            >
              <div style={{ fontSize: '1rem' }}>
                {cards.length === 1
                  ? `Added to your hand: ${cards[0].name}`
                  : `Added ${cards.length} cards to your hand`}
              </div>
              {hasBonusSources && (
                <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#ffc107' }}>
                  Bonus draw from: {bonusSources.join(', ')}
                </div>
              )}
              {reason && (
                <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#ffc107' }}>
                  {reason}
                </div>
              )}
            </Alert>
          </>
        ) : (
          <Alert
            variant="warning"
            className="mb-0"
            style={{ backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107' }}
          >
            <div style={{ fontSize: '1rem' }}>
              Your Order deck is empty. No cards available to draw.
            </div>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
        <Button variant="info" onClick={onContinue}>
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default CardsDrawnModal
