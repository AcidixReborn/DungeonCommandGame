import { useState } from 'react'
import { Card, Badge } from 'react-bootstrap'
import './CreatureCard.css'

/**
 * CreatureCard - Displays a creature card with stats and abilities
 * Supports compact and full view modes, drag and drop
 * Now supports carousel view for attached order cards (e.g., Web)
 *
 * @param {Creature} creature - Creature data to display
 * @param {CreatureInstance} creatureInstance - Optional creature instance with attached cards
 * @param {Function} onClick - Click handler
 * @param {boolean} isSelected - Whether card is selected
 * @param {boolean} compact - Use compact display mode
 * @param {boolean} draggable - Enable drag and drop
 * @param {Function} onDragStart - Drag start handler
 * @param {Function} onDragEnd - Drag end handler
 * @param {number} cardIndex - Card index in hand
 */
function CreatureCard({ creature, creatureInstance, onClick, isSelected, compact = false, draggable = false, onDragStart, onDragEnd, cardIndex, handSize }) {
  // Carousel state: 0 = creature card, 1+ = attached cards
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Get attached cards from creature instance
  const attachedCards = creatureInstance?.attachedCards || []
  const totalCards = 1 + attachedCards.length // 1 for creature + attached cards
  const hasCarousel = attachedCards.length > 0

  /**
   * Navigate carousel to previous card
   */
  const handlePrevCard = (e) => {
    e.stopPropagation() // Don't trigger card click
    setCarouselIndex((prev) => (prev - 1 + totalCards) % totalCards)
  }

  /**
   * Navigate carousel to next card
   */
  const handleNextCard = (e) => {
    e.stopPropagation() // Don't trigger card click
    setCarouselIndex((prev) => (prev + 1) % totalCards)
  }

  /**
   * Render ability score badges
   * @returns {Array<JSX.Element>} Array of ability badges
   */
  const renderAbilities = () => {
    const abilityKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
    return abilityKeys
      .filter(key => creature.abilities[key])
      .map(key => (
        <Badge key={key} bg="secondary" className="me-1">
          {key}
        </Badge>
      ))
  }

  const handleDragStart = (e) => {
    if (draggable && onDragStart) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', cardIndex.toString())
      onDragStart(cardIndex)
    }
  }

  const handleDragEnd = (e) => {
    if (draggable && onDragEnd) {
      onDragEnd()
    }
  }

  if (compact) {
    // If showing an attached card (carousel index > 0), render it instead
    if (hasCarousel && carouselIndex > 0) {
      const attachedCard = attachedCards[carouselIndex - 1]
      const orderCard = attachedCard?.card

      // Purple glow for Sting of Lolth faction order cards
      const attachedCardGlowStyle = {
        boxShadow: '0 0 8px 2px rgba(139, 0, 139, 0.7), inset 0 0 2px rgba(139, 0, 139, 0.3)',
        border: '3px solid #8b008b'
      }

      return (
        <div
          className={`creature-card-compact creature-card-compact-image attached-card ${isSelected ? 'selected' : ''}`}
          onClick={onClick}
          style={{ position: 'relative', overflow: 'visible', ...attachedCardGlowStyle }}
        >
          {/* Show order card image or fallback */}
          {orderCard?.imageUrl ? (
            <img
              src={orderCard.imageUrl}
              alt={orderCard.name}
              className="creature-card-img"
              style={{ opacity: 0.9 }}
            />
          ) : (
            <div className="attached-card-fallback" style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#4a4a6a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              padding: '4px'
            }}>
              <span style={{ fontSize: '1.2rem' }}>🕸️</span>
              <span>{orderCard?.name || 'Attached'}</span>
            </div>
          )}

          {/* Carousel arrows */}
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={handlePrevCard}
            title="Previous card"
          >
            ‹
          </button>
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={handleNextCard}
            title="Next card"
          >
            ›
          </button>

          {/* Card indicator dots - positioned in the border area */}
          <div className="carousel-indicators" style={{ bottom: '-12px' }}>
            {Array.from({ length: totalCards }).map((_, idx) => (
              <span
                key={idx}
                className={`carousel-dot ${idx === carouselIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Web icon overlay */}
          <div style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            fontSize: '12px',
            textShadow: '0 0 3px black'
          }}>
            🕸️
          </div>
        </div>
      )
    }

    // If creature has an image, show image-only view
    if (creature.imageUrl) {
      // Get faction color for attached card glow (Sting of Lolth = purple)
      const attachedCardGlowStyle = hasCarousel ? {
        boxShadow: '0 0 8px 2px rgba(139, 0, 139, 0.7), inset 0 0 2px rgba(139, 0, 139, 0.3)',
        border: '3px solid #8b008b'
      } : {}

      return (
        <div
          className={`creature-card-compact creature-card-compact-image ${isSelected ? 'selected' : ''} ${draggable ? 'draggable' : ''} ${hasCarousel ? 'has-attached-cards' : ''}`}
          onClick={onClick}
          draggable={draggable}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{ position: 'relative', overflow: hasCarousel ? 'visible' : 'hidden', ...attachedCardGlowStyle }}
        >
          <img
            src={creature.imageUrl}
            alt={creature.name}
            className="creature-card-img"
          />

          {/* Carousel arrows (only if has attached cards) */}
          {hasCarousel && (
            <>
              <button
                className="carousel-arrow carousel-arrow-left"
                onClick={handlePrevCard}
                title="Previous card"
              >
                ‹
              </button>
              <button
                className="carousel-arrow carousel-arrow-right"
                onClick={handleNextCard}
                title="Next card"
              >
                ›
              </button>

              {/* Card indicator dots - positioned in the border area */}
              <div className="carousel-indicators" style={{ bottom: '-12px' }}>
                {Array.from({ length: totalCards }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`carousel-dot ${idx === carouselIndex ? 'active' : ''}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )
    }

    // Fallback: No image - show stats placeholder
    return (
      <div
        className={`creature-card-compact ${isSelected ? 'selected' : ''} ${draggable ? 'draggable' : ''}`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="creature-card-header">
          <span className="creature-level">Lv{creature.level}</span>
          <span className="creature-name">{creature.name?.replace(/ #\d+$/, '') || creature.name}</span>
        </div>
        <div className="creature-stats-compact">
          <span>HP: {creature.hitPoints}</span>
          <span>Spd: {creature.speed}</span>
        </div>
        <div className="creature-stats-compact">
          {creature.meleeAttack && <span>Melee: {creature.meleeAttack.damage}</span>}
          {creature.rangedAttack && <span>Ranged: {creature.rangedAttack.damage}</span>}
        </div>
        <div className="creature-abilities-compact">
          {renderAbilities()}
        </div>
      </div>
    )
  }

  return (
    <Card
      className={`creature-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      bg="dark"
      text="white"
    >
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">{creature.name?.replace(/ #\d+$/, '') || creature.name}</span>
          <Badge bg="warning" text="dark">
            Level {creature.level}
          </Badge>
        </div>
      </Card.Header>
      {creature.imageUrl && (
        <Card.Img variant="top" src={creature.imageUrl} alt={creature.name} />
      )}
      <Card.Body>
        <div className="mb-2">
          <small className="text-muted">
            {creature.type.join(', ')}
          </small>
        </div>

        <div className="creature-stats mb-2">
          <div className="stat-row">
            <span className="stat-label">HP:</span>
            <span className="stat-value">{creature.hitPoints}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Speed:</span>
            <span className="stat-value">{creature.speed}</span>
          </div>
          {creature.meleeAttack && (
            <div className="stat-row">
              <span className="stat-label">Melee:</span>
              <span className="stat-value">{creature.meleeAttack.damage} dmg</span>
            </div>
          )}
          {creature.rangedAttack && (
            <div className="stat-row">
              <span className="stat-label">Ranged:</span>
              <span className="stat-value">
                {creature.rangedAttack.damage} dmg (range {creature.rangedAttack.range})
              </span>
            </div>
          )}
        </div>

        <div className="mb-2">
          <div className="fw-bold mb-1" style={{ fontSize: '0.85rem' }}>
            Abilities:
          </div>
          {renderAbilities()}
        </div>

        {creature.specialAbilities && creature.specialAbilities.length > 0 && (
          <div className="special-abilities">
            <div className="fw-bold mb-1" style={{ fontSize: '0.85rem' }}>
              Special:
            </div>
            {creature.specialAbilities.map((ability, idx) => (
              <div key={idx} className="special-ability-text">
                {ability}
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}

export default CreatureCard
