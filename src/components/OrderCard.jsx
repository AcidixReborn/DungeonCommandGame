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

  const getAbilityBadgeColor = () => {
    const colors = {
      STR: 'danger',
      DEX: 'success',
      CON: 'warning',
      INT: 'primary',
      WIS: 'info',
      CHA: 'secondary',
      ANY: 'light'
    }
    return colors[order.abilityRequired] || 'secondary'
  }

  if (compact) {
    return (
      <div
        className={`order-card-compact ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
      >
        <div className="order-card-header">
          <span className="order-level">Lv{order.level}</span>
          <span className="order-name">{order.name}</span>
        </div>
        <div className="order-badges-compact">
          <Badge bg={getAbilityBadgeColor()} className="badge-small">
            {order.abilityRequired}
          </Badge>
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
          <span className="fw-bold">{order.name}</span>
          <Badge bg="warning" text="dark">
            Level {order.level}
          </Badge>
        </div>
      </Card.Header>
      {order.imageUrl && (
        <Card.Img variant="top" src={order.imageUrl} alt={order.name} />
      )}
      <Card.Body>
        <div className="mb-2 d-flex gap-2">
          <Badge bg={getAbilityBadgeColor()}>
            Requires: {order.abilityRequired}
          </Badge>
          <Badge bg={getActionBadgeColor()}>
            {order.actionType}
          </Badge>
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
