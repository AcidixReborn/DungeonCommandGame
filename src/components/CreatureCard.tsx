import { useState } from 'react'
import type React from 'react'
import { Card, Badge } from 'react-bootstrap'
import './CreatureCard.css'

/**
 * Faction color mapping - maps faction names to hex colors
 * Used for attached card glow effects
 */
const FACTION_COLORS = {
  'Sting of Lolth': '#8b008b', // Purple
  'Heart of Cormyr': '#0066cc', // Blue
  'Tyranny of Goblins': '#cc0000', // Red
  'Curse of Undeath': '#4a0080', // Dark Purple
  'Blood of Gruumsh': '#8b4513', // Brown/Orange
}

interface CreatureCardProps {
  /** Creature data to display */
  creature: any
  /** Optional creature instance with attached cards */
  creatureInstance?: any
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void
  /** Whether card is selected */
  isSelected?: boolean
  /** Use compact display mode */
  compact?: boolean
  /** Enable drag and drop */
  draggable?: boolean
  /** Drag start handler */
  onDragStart?: (cardIndex: number) => void
  /** Drag end handler */
  onDragEnd?: () => void
  /** Card index in hand */
  cardIndex?: number
  handSize?: number
}

/**
 * CreatureCard - Displays a creature card with stats and abilities
 * Supports compact and full view modes, drag and drop
 * Now supports carousel view for attached order cards (e.g., Web)
 */
function CreatureCard({
  creature,
  creatureInstance,
  onClick,
  isSelected,
  compact = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  cardIndex,
  handSize: _handSize,
}: CreatureCardProps) {
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
      .filter((key) => creature.abilities[key])
      .map((key) => (
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

  /**
   * Get glow style for attached card based on the card's faction
   * @param {Object} orderCard - The attached order card
   * @returns {Object} Style object with boxShadow and border based on faction color
   */
  const getAttachedCardGlowStyle = (orderCard) => {
    // Get the faction color from the card's faction, default to purple for Web/Sting of Lolth
    const factionColor = FACTION_COLORS[orderCard?.faction] || '#8b008b'

    // Convert hex to RGB for rgba() use
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 139, g: 0, b: 139 } // Default purple
    }

    const rgb = hexToRgb(factionColor)

    return {
      boxShadow: `0 0 8px 2px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7), inset 0 0 2px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
      border: `3px solid ${factionColor}`,
    }
  }

  if (compact) {
    // If showing an attached card (carousel index > 0), render it instead
    if (hasCarousel && carouselIndex > 0) {
      const attachedCard = attachedCards[carouselIndex - 1]
      const orderCard = attachedCard?.card

      // Get glow style based on the attached card's faction
      const attachedCardGlowStyle = getAttachedCardGlowStyle(orderCard)

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
            <div
              className="attached-card-fallback"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#4a4a6a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                padding: '4px',
              }}
            >
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
              <span key={idx} className={`carousel-dot ${idx === carouselIndex ? 'active' : ''}`} />
            ))}
          </div>

          {/* Web icon overlay */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              fontSize: '12px',
              textShadow: '0 0 3px black',
            }}
          >
            🕸️
          </div>
        </div>
      )
    }

    // If creature has an image, show image-only view
    if (creature.imageUrl) {
      // Get glow style based on the first attached card's faction (when viewing creature card)
      // This shows the faction color border around the creature when it has attached cards
      const attachedCardGlowStyle = hasCarousel
        ? getAttachedCardGlowStyle(attachedCards[0]?.card)
        : {}

      return (
        <div
          className={`creature-card-compact creature-card-compact-image ${isSelected ? 'selected' : ''} ${draggable ? 'draggable' : ''} ${hasCarousel ? 'has-attached-cards' : ''}`}
          onClick={onClick}
          draggable={draggable}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{
            position: 'relative',
            overflow: hasCarousel ? 'visible' : 'hidden',
            ...attachedCardGlowStyle,
          }}
        >
          <img src={creature.imageUrl} alt={creature.name} className="creature-card-img" />

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
          <span className="creature-name">
            {creature.name?.replace(/ #\d+$/, '') || creature.name}
          </span>
        </div>
        <div className="creature-stats-compact">
          <span>HP: {creature.hitPoints}</span>
          <span>Spd: {creature.speed}</span>
        </div>
        <div className="creature-stats-compact">
          {creature.meleeAttack && <span>Melee: {creature.meleeAttack.damage}</span>}
          {creature.rangedAttack && <span>Ranged: {creature.rangedAttack.damage}</span>}
        </div>
        <div className="creature-abilities-compact">{renderAbilities()}</div>
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
      {creature.imageUrl && <Card.Img variant="top" src={creature.imageUrl} alt={creature.name} />}
      <Card.Body>
        <div className="mb-2">
          <small className="text-muted">{creature.type.join(', ')}</small>
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
