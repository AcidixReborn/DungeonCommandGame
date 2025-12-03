import { Card, Badge, ProgressBar, Row, Col } from 'react-bootstrap'
import CreatureCard from './CreatureCard'
import OrderCard from './OrderCard'
import './PlayerPanel.css'

/**
 * PlayerPanel - Displays player information, resources, and cards
 * Supports horizontal and vertical layouts
 *
 * @param {PlayerState} player - Player state data
 * @param {string} playerId - Player ID
 * @param {boolean} isCurrentPlayer - Whether this is the active player
 * @param {boolean} isHuman - Whether player is human (vs AI)
 * @param {Function} onCreatureSelect - Handler for creature card selection
 * @param {Function} onOrderSelect - Handler for order card selection
 * @param {number} selectedCreature - Index of selected creature card
 * @param {number} selectedOrder - Index of selected order card
 * @param {Function} onDragStart - Drag start handler
 * @param {Function} onDragEnd - Drag end handler
 * @param {string} currentPhase - Current game phase
 * @param {boolean} horizontal - Use horizontal layout
 * @param {boolean} vertical - Use vertical layout
 * @param {boolean} canDeployCreatures - Whether creatures can be deployed (DEPLOY phase or HORDE during REFRESH)
 */
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
  currentPhase,
  horizontal = false,
  vertical = false,
  canDeployCreatures = false
}) {
  // Guard against NaN/undefined morale values for display
  const safeMorale = (typeof player.morale === 'number' && !isNaN(player.morale)) ? player.morale : 0
  const safeStartingMorale = player.commander?.startingMorale || 1 // Prevent division by 0
  const moralePercentage = (safeMorale / safeStartingMorale) * 100
  const leadershipUsage = player.getCurrentLeadershipUsage()
  const leadershipPercentage = (leadershipUsage / player.leadership) * 100

  // Vertical layout for current player to the right of battlefield
  if (vertical) {
    return (
      <Card
        bg="dark"
        text="white"
        className="player-panel-vertical"
        border={isCurrentPlayer ? 'success' : 'secondary'}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Card.Body style={{ padding: '3px 5px 5px 5px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Two Column Layout for Cards */}
          <div style={{ display: 'flex', gap: '5px', flex: 1, minHeight: 0 }}>
            {/* Left Panel: Creature Cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* Creature Hand */}
              {isHuman && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="card-hand-vertical" style={{ flex: 1, maxHeight: 'none' }}>
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
                          draggable={canDeployCreatures && isCurrentPlayer}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                          cardIndex={idx}
                          handSize={player.creatureHand.length}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Order Cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
              {/* Order Hand */}
              {isHuman && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="card-hand-vertical" style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignContent: 'flex-start',
                    gap: '4px'
                  }}>
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
              )}
            </div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  // Horizontal layout for current player below battlefield
  if (horizontal) {
    return (
      <Card
        bg="dark"
        text="white"
        className="player-panel-horizontal"
        border={isCurrentPlayer ? 'success' : 'secondary'}
      >
        <Card.Body>
          <Row className="align-items-start">
            {/* Player Info & Stats Column */}
            <Col md={2} className="text-center border-end border-secondary">
              <h5 className="mb-2">
                {playerId} - {player.faction}
                {isCurrentPlayer && <Badge bg="success" className="ms-2 d-block mt-2">ACTIVE</Badge>}
                {!isHuman && <Badge bg="warning" text="dark" className="ms-2 d-block mt-2">AI</Badge>}
              </h5>
              <small className="text-muted d-block mb-3">Commander: {player.commander.name}</small>

              {/* Morale */}
              <div className="stat-display mb-3">
                <strong className="d-block mb-1">Morale</strong>
                <ProgressBar
                  now={moralePercentage}
                  variant={moralePercentage > 50 ? 'success' : moralePercentage > 25 ? 'warning' : 'danger'}
                  style={{ height: '25px' }}
                  label={`${safeMorale}`}
                />
              </div>

              {/* Leadership */}
              <div className="stat-display mb-3">
                <strong className="d-block mb-1">Leadership</strong>
                <div style={{ position: 'relative' }}>
                  <ProgressBar
                    now={leadershipPercentage}
                    variant={leadershipPercentage > 80 ? 'danger' : 'info'}
                    style={{ height: '25px' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    color: '#000',
                    pointerEvents: 'none'
                  }}>
                    {leadershipUsage}/{player.leadership}
                  </div>
                </div>
              </div>

              {/* Card Counts */}
              <div className="card-counts">
                <Badge bg="secondary" className="d-block mb-1">In Play: {player.creaturesInPlay.length}</Badge>
              </div>
            </Col>

            {/* Creature Hand Column */}
            {isHuman && (
              <Col md={5} className="border-end border-secondary">
                <h6 className="mb-2">Creature Hand ({player.creatureHand.length}):</h6>
                <div className="card-hand-horizontal">
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
                        draggable={canDeployCreatures && isCurrentPlayer}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        cardIndex={idx}
                        handSize={player.creatureHand.length}
                      />
                    ))
                  )}
                </div>
              </Col>
            )}

            {/* Order Hand Column */}
            {isHuman && (
              <Col md={5}>
                <h6 className="mb-2">Order Hand ({player.orderHand.length}):</h6>
                <div className="card-hand-horizontal">
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
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
    )
  }
}

export default PlayerPanel
