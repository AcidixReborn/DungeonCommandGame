import { Card, Badge } from 'react-bootstrap'
import './CreatureCard.css'

function CreatureCard({ creature, onClick, isSelected, compact = false, draggable = false, onDragStart, onDragEnd, cardIndex }) {
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
          <span className="creature-name">{creature.name}</span>
        </div>
        <div className="creature-stats-compact">
          <span>HP: {creature.hitPoints}</span>
          <span>Spd: {creature.speed}</span>
          <span>Dmg: {creature.meleeAttack?.damage || 0}</span>
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
          <span className="fw-bold">{creature.name}</span>
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
