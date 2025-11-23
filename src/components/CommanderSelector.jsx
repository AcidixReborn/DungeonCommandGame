import { useState } from 'react'
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap'
import { commanders } from '../data/factions'
import './CommanderSelector.css'

function CommanderSelector({ factionConfig, onCommandersSelected }) {
  const [selectedCommanders, setSelectedCommanders] = useState({
    player1: null,
    player2: null
  })
  const [error, setError] = useState('')

  const handleCommanderSelect = (player, commanderIndex) => {
    setSelectedCommanders(prev => ({
      ...prev,
      [player]: commanderIndex
    }))
    setError('')
  }

  const handleStartGame = () => {
    if (selectedCommanders.player1 === null || selectedCommanders.player2 === null) {
      setError('Both players must select a commander!')
      return
    }

    // Get the actual commander objects
    const player1Commander = commanders[factionConfig.player1.faction][selectedCommanders.player1]
    const player2Commander = commanders[factionConfig.player2.faction][selectedCommanders.player2]

    onCommandersSelected({
      player1: {
        ...factionConfig.player1,
        commander: player1Commander
      },
      player2: {
        ...factionConfig.player2,
        commander: player2Commander
      }
    })
  }

  const player1Commanders = commanders[factionConfig.player1.faction]
  const player2Commanders = commanders[factionConfig.player2.faction]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Container fluid className="commander-selector" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', overflow: 'hidden' }}>
        <Row className="justify-content-center" style={{ flex: 1, minHeight: 0 }}>
          <Col md={10} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Card bg="dark" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <Card.Header style={{ flexShrink: 0, padding: '10px' }}>
                <h3 className="text-center mb-0">Choose Your Commander</h3>
              </Card.Header>
              <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <Row style={{ flex: 1, minHeight: 0 }}>
                  {/* Player 1 Commander Selection */}
                  <Col md={6} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Card bg="secondary" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                      <Card.Header style={{ flexShrink: 0, padding: '10px' }}>
                        <h5 className="mb-1">
                          Player 1: {factionConfig.player1.faction}
                          {!factionConfig.player1.isHuman && <span className="text-warning ms-2">(AI)</span>}
                        </h5>
                      </Card.Header>
                      <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                        <Row>
                          {player1Commanders.map((commander, idx) => (
                            <Col key={commander.id} md={12} className="mb-3">
                              <Card
                                className={`commander-card ${selectedCommanders.player1 === idx ? 'selected' : ''}`}
                                onClick={() => handleCommanderSelect('player1', idx)}
                                style={{ cursor: 'pointer' }}
                              >
                                <Card.Img
                                  variant="top"
                                  src={commander.imageUrl}
                                  alt={commander.name}
                                  style={{ height: '300px', objectFit: 'cover' }}
                                />
                                <Card.Body>
                                  <Card.Title>{commander.name}</Card.Title>
                                  <div className="commander-stats">
                                    <div><strong>Creature Hand:</strong> {commander.startingCreatureHandSize}</div>
                                    <div><strong>Order Hand:</strong> {commander.startingOrderHandSize}</div>
                                    <div><strong>Morale:</strong> {commander.startingMorale}</div>
                                    <div><strong>Leadership:</strong> {commander.startingLeadership}</div>
                                  </div>
                                  <div className="mt-2">
                                    <small className="text-muted">{commander.specialAbilityDescription}</small>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Player 2 Commander Selection */}
                  <Col md={6} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Card bg="secondary" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                      <Card.Header style={{ flexShrink: 0, padding: '10px' }}>
                        <h5 className="mb-1">
                          Player 2: {factionConfig.player2.faction}
                          {!factionConfig.player2.isHuman && <span className="text-warning ms-2">(AI)</span>}
                        </h5>
                      </Card.Header>
                      <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                        <Row>
                          {player2Commanders.map((commander, idx) => (
                            <Col key={commander.id} md={12} className="mb-3">
                              <Card
                                className={`commander-card ${selectedCommanders.player2 === idx ? 'selected' : ''}`}
                                onClick={() => handleCommanderSelect('player2', idx)}
                                style={{ cursor: 'pointer' }}
                              >
                                <Card.Img
                                  variant="top"
                                  src={commander.imageUrl}
                                  alt={commander.name}
                                  style={{ height: '300px', objectFit: 'cover' }}
                                />
                                <Card.Body>
                                  <Card.Title>{commander.name}</Card.Title>
                                  <div className="commander-stats">
                                    <div><strong>Creature Hand:</strong> {commander.startingCreatureHandSize}</div>
                                    <div><strong>Order Hand:</strong> {commander.startingOrderHandSize}</div>
                                    <div><strong>Morale:</strong> {commander.startingMorale}</div>
                                    <div><strong>Leadership:</strong> {commander.startingLeadership}</div>
                                  </div>
                                  <div className="mt-2">
                                    <small className="text-muted">{commander.specialAbilityDescription}</small>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <div className="text-center mt-3" style={{ flexShrink: 0 }}>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleStartGame}
                    disabled={selectedCommanders.player1 === null || selectedCommanders.player2 === null}
                  >
                    Start Battle
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default CommanderSelector
