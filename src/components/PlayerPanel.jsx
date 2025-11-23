import { Card, Badge, ProgressBar, Row, Col } from 'react-bootstrap'
import CreatureCard from './CreatureCard'
import OrderCard from './OrderCard'
import './PlayerPanel.css'

function PlayerPanel({
  player,
  playerId,
  isCurrentPlayer,
  isHuman = true,
  onCreatureSelect,
  onOrderSelect,
  selectedCreature,
  selectedOrder,
  onDragStart,
  onDragEnd,
  currentPhase
}) {
  const moralePercentage = (player.morale / player.commander.startingMorale) * 100
  const leadershipUsage = player.getCurrentLeadershipUsage()
  const leadershipPercentage = (leadershipUsage / player.leadership) * 100

  return (
    <Card
      bg="dark"
      text="white"
      className={`player-panel ${isCurrentPlayer ? 'current-player' : ''}`}
      border={isCurrentPlayer ? 'success' : 'secondary'}
    >
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              {playerId} - {player.faction}
              {isCurrentPlayer && <Badge bg="success" className="ms-2">ACTIVE</Badge>}
              {!isHuman && <Badge bg="warning" text="dark" className="ms-2">AI</Badge>}
            </h5>
            <small className="text-muted">Commander: {player.commander.name}</small>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col md={6}>
            <div className="stat-display">
              <strong>Morale:</strong>
              <div className="d-flex align-items-center gap-2">
                <span className="stat-value">{player.morale}</span>
                <ProgressBar
                  now={moralePercentage}
                  variant={moralePercentage > 50 ? 'success' : moralePercentage > 25 ? 'warning' : 'danger'}
                  style={{ flex: 1, height: '20px' }}
                  label={`${player.morale}/${player.commander.startingMorale}`}
                />
              </div>
            </div>
          </Col>
          <Col md={6}>
            <div className="stat-display">
              <strong>Leadership:</strong>
              <div className="d-flex align-items-center gap-2">
                <span className="stat-value">{leadershipUsage}/{player.leadership}</span>
                <ProgressBar
                  now={leadershipPercentage}
                  variant={leadershipPercentage > 80 ? 'danger' : 'info'}
                  style={{ flex: 1, height: '20px' }}
                  label={`${leadershipUsage}/${player.leadership}`}
                />
              </div>
            </div>
          </Col>
        </Row>

        <Row className="mb-2">
          <Col>
            <div className="card-counts">
              <Badge bg="primary">Creatures in Hand: {player.creatureHand.length}</Badge>
              <Badge bg="info" className="ms-2">Orders in Hand: {player.orderHand.length}</Badge>
              <Badge bg="secondary" className="ms-2">In Play: {player.creaturesInPlay.length}</Badge>
            </div>
          </Col>
        </Row>

        {isHuman && (
          <>
            <div className="hand-section mb-3">
              <h6>Creature Hand:</h6>
              <div className="card-hand">
                {player.creatureHand.length === 0 ? (
                  <small className="text-muted">No creatures in hand</small>
                ) : (
                  player.creatureHand.map((creature, idx) => (
                    <CreatureCard
                      key={idx}
                      creature={creature}
                      compact={true}
                      isSelected={selectedCreature === idx}
                      onClick={() => onCreatureSelect && onCreatureSelect(idx)}
                      draggable={currentPhase === 'DEPLOY' && isCurrentPlayer}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      cardIndex={idx}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="hand-section">
              <h6>Order Hand:</h6>
              <div className="card-hand">
                {player.orderHand.length === 0 ? (
                  <small className="text-muted">No order cards in hand</small>
                ) : (
                  player.orderHand.map((order, idx) => (
                    <OrderCard
                      key={idx}
                      order={order}
                      compact={true}
                      isSelected={selectedOrder === idx}
                      onClick={() => onOrderSelect && onOrderSelect(idx)}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  )
}

export default PlayerPanel
