import { Card, Badge } from 'react-bootstrap'
import { ActionTypes } from '../models/orders'
import './OrderCard.css'

function OrderCard({ order, onClick, isSelected, compact = false }) {
  const getActionBadgeColor = () => {
    switch (order.actionType) {
      case ActionTypes.STANDARD:
        return 'danger'
      case ActionTypes.MINOR:
        return 'success'
      case ActionTypes.IMMEDIATE:
        return 'info'
      default:
        return 'secondary'
    }
  }

  const getAbilityBadgeColor = (ability) => {
    const colors = {
      STR: 'danger',
      DEX: 'success',
      CON: 'warning',
      INT: 'primary',
      WIS: 'info',
      CHA: 'secondary',
      ANY: 'light'
    }
    return colors[ability] || 'secondary'
  }

  const renderAbilityBadges = () => {
    if (Array.isArray(order.abilityRequired)) {
      return order.abilityRequired.map((ability, idx) => (
        <Badge
          key={idx}
          bg={getAbilityBadgeColor(ability)}
          text={ability === 'ANY' ? 'dark' : undefined}
          className="badge-small"
        >
          {ability}
        </Badge>
      ))
    }
    return (
      <Badge
        bg={getAbilityBadgeColor(order.abilityRequired)}
        text={order.abilityRequired === 'ANY' ? 'dark' : undefined}
        className="badge-small"
      >
        {order.abilityRequired}
      </Badge>
    )
  }

  if (compact) {
    return (
      <div
        className={`order-card-compact ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
      >
        <div className="order-card-header">
          <span className="order-level">Lv{order.level}</span>
          <span className="order-name">{order.name?.replace(/ #\d+$/, '') || order.name}</span>
        </div>
        <div className="order-badges-compact">
          {renderAbilityBadges()}
          <Badge bg={getActionBadgeColor()} className="badge-small">
            {order.actionType}
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={`order-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      bg="dark"
      text="white"
    >
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">{order.name?.replace(/ #\d+$/, '') || order.name}</span>
          <Badge bg="warning" text="dark">
            Level {order.level}
          </Badge>
        </div>
      </Card.Header>
      {order.imageUrl && (
        <Card.Img variant="top" src={order.imageUrl} alt={order.name} />
      )}
      <Card.Body>
        <div className="mb-2 d-flex gap-2 flex-wrap">
          <div className="d-flex gap-1">
            {Array.isArray(order.abilityRequired) ? (
              order.abilityRequired.map((ability, idx) => (
                <Badge
                  key={idx}
                  bg={getAbilityBadgeColor(ability)}
                  text={ability === 'ANY' ? 'dark' : undefined}
                >
                  {ability}
                </Badge>
              ))
            ) : (
              <Badge
                bg={getAbilityBadgeColor(order.abilityRequired)}
                text={order.abilityRequired === 'ANY' ? 'dark' : undefined}
              >
                {order.abilityRequired}
              </Badge>
            )}
          </div>
          <Badge bg={getActionBadgeColor()}>
            {order.actionType}
          </Badge>
          {order.requiresCreatureType && (
            <Badge bg="warning" text="dark">
              Requires: {order.requiresCreatureType}
            </Badge>
          )}
        </div>

        <div className="order-effect">
          <div className="fw-bold mb-1" style={{ fontSize: '0.85rem' }}>
            Effect:
          </div>
          <p className="effect-text">{order.effectDescription}</p>
        </div>
      </Card.Body>
    </Card>
  )
}

export default OrderCard
