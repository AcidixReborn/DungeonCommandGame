import type React from 'react'
import { Card, Badge } from 'react-bootstrap'
import { ActionTypes } from '../models/orders'
import './OrderCard.css'

interface OrderCardProps {
  /** Order card data */
  order: any
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void
  /** Right-click handler for targeting mode */
  onRightClick?: (e: React.MouseEvent) => void
  /** Whether card is selected */
  isSelected?: boolean
  /** Whether this card is in targeting mode (glowing border) */
  isTargeting?: boolean
  /** Use compact display mode */
  compact?: boolean
}

/**
 * OrderCard - Displays an order (spell/ability) card
 * Shows level, ability requirements, action type, and effects
 */
function OrderCard({
  order,
  onClick,
  onRightClick,
  isSelected,
  isTargeting = false,
  compact = false,
}: OrderCardProps) {
  /**
   * Get badge color for action type
   * @returns {string} Bootstrap variant color
   */
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

  /**
   * Get abbreviated action type text
   * @returns {string} Action type abbreviation (STD, MIN, IMD)
   */
  const getActionTypeAbbreviation = () => {
    switch (order.actionType) {
      case ActionTypes.STANDARD:
        return 'STD'
      case ActionTypes.MINOR:
        return 'MIN'
      case ActionTypes.IMMEDIATE:
        return 'IMD'
      default:
        return order.actionType
    }
  }

  /**
   * Get badge color for ability type
   * @param {string} ability - Ability type (STR, DEX, etc.)
   * @returns {string} Bootstrap variant color
   */
  const getAbilityBadgeColor = (ability) => {
    const colors = {
      STR: 'danger',
      DEX: 'success',
      CON: 'warning',
      INT: 'primary',
      WIS: 'info',
      CHA: 'secondary',
      ANY: 'light',
    }
    return colors[ability] || 'secondary'
  }

  /**
   * Render ability requirement badges
   * Handles both single ability and array of abilities
   * @returns {JSX.Element|Array<JSX.Element>} Badge(s) for required abilities
   */
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

  /**
   * Handle right-click on card
   * @param {Event} e - Context menu event
   */
  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onRightClick) {
      onRightClick(order)
    }
  }

  // Style for targeting mode (glowing cyan border)
  const targetingStyle = isTargeting
    ? {
        boxShadow: '0 0 10px 3px #00ffff',
        border: '2px solid #00ffff',
      }
    : {}

  if (compact) {
    // If order has an image, show image-only view
    if (order.imageUrl) {
      return (
        <div
          className={`order-card-compact order-card-compact-image ${isSelected ? 'selected' : ''} ${isTargeting ? 'targeting' : ''}`}
          onClick={onClick}
          onContextMenu={handleContextMenu}
          style={targetingStyle}
        >
          <img src={order.imageUrl} alt={order.name} className="order-card-img" />
        </div>
      )
    }

    // Fallback: No image - show text-based compact view
    return (
      <div
        className={`order-card-compact ${isSelected ? 'selected' : ''} ${isTargeting ? 'targeting' : ''}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        style={targetingStyle}
      >
        <div className="order-card-name-row">
          <span className="order-name">{order.name?.replace(/ #\d+$/, '') || order.name}</span>
        </div>
        <div className="order-badges-compact">
          <span className="order-level">Lv{order.level}</span>
          {renderAbilityBadges()}
          <Badge bg={getActionBadgeColor()} className="badge-small">
            {getActionTypeAbbreviation()}
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={`order-card ${isSelected ? 'selected' : ''} ${isTargeting ? 'targeting' : ''}`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      bg="dark"
      text="white"
      style={targetingStyle}
    >
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">{order.name?.replace(/ #\d+$/, '') || order.name}</span>
          <Badge bg="warning" text="dark">
            Level {order.level}
          </Badge>
        </div>
      </Card.Header>
      {order.imageUrl && <Card.Img variant="top" src={order.imageUrl} alt={order.name} />}
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
          <Badge bg={getActionBadgeColor()}>{getActionTypeAbbreviation()}</Badge>
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
