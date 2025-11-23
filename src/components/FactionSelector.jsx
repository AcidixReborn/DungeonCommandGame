import { useState } from 'react'
import { Container, Row, Col, Card, Button, Form, Badge, Alert } from 'react-bootstrap'
import { Factions } from '../data/factions'
import './FactionSelector.css'

const factionInfo = {
  [Factions.STING_OF_LOLTH]: {
    name: 'Sting of Lolth',
    description: 'Drow and spiders from the Underdark. Masters of poison and stealth.',
    color: '#8b008b',
    strengths: ['Poison', 'Stealth', 'Mobility']
  },
  [Factions.HEART_OF_CORMYR]: {
    name: 'Heart of Cormyr',
    description: 'Human knights and soldiers. Disciplined and versatile fighters.',
    color: '#0066cc',
    strengths: ['Defense', 'Leadership', 'Versatility']
  },
  [Factions.TYRANNY_OF_GOBLINS]: {
    name: 'Tyranny of Goblins',
    description: 'Goblins and their allies. Swarm tactics and overwhelming numbers.',
    color: '#cc0000',
    strengths: ['Numbers', 'Aggression', 'Cheap Units']
  },
  [Factions.CURSE_OF_UNDEATH]: {
    name: 'Curse of Undeath',
    description: 'Undead horrors and necromancy. Resilient and terrifying.',
    color: '#2d5016',
    strengths: ['Resilience', 'Fear', 'Regeneration']
  },
  [Factions.BLOOD_OF_GRUUMSH]: {
    name: 'Blood of Gruumsh',
    description: 'Orcs and their brutal warriors. Raw power and fury.',
    color: '#8b4513',
    strengths: ['Power', 'Ferocity', 'Melee Combat']
  }
}

function FactionSelector({ onStartGame }) {
  const [selectedFactions, setSelectedFactions] = useState({
    player1: null,
    player2: null
  })
  const [playerTypes, setPlayerTypes] = useState({
    player1: 'human',
    player2: 'ai'
  })
  const [error, setError] = useState('')

  const handleFactionSelect = (player, faction) => {
    setError('')

    // Check if faction is already selected by other player
    const otherPlayer = player === 'player1' ? 'player2' : 'player1'
    if (selectedFactions[otherPlayer] === faction) {
      setError('Each player must choose a different faction!')
      return
    }

    setSelectedFactions({
      ...selectedFactions,
      [player]: faction
    })
  }

  const handlePlayerTypeChange = (player, type) => {
    setPlayerTypes({
      ...playerTypes,
      [player]: type
    })
  }

  const handleStartGame = () => {
    if (!selectedFactions.player1 || !selectedFactions.player2) {
      setError('Both players must select a faction!')
      return
    }

    onStartGame({
      player1: {
        faction: selectedFactions.player1,
        isHuman: playerTypes.player1 === 'human'
      },
      player2: {
        faction: selectedFactions.player2,
        isHuman: playerTypes.player2 === 'human'
      }
    })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Container fluid className="faction-selector" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', overflow: 'hidden' }}>
        <Row className="justify-content-center" style={{ flex: 1, minHeight: 0 }}>
          <Col md={10} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Card bg="dark" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <Card.Header style={{ flexShrink: 0, padding: '10px' }}>
                <h3 className="text-center mb-0">Dungeon Command - Choose Your Warband</h3>
              </Card.Header>
              <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                <Alert variant="info" style={{ padding: '8px', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <strong>Custom Rules:</strong> No Cower • Killing grants +1 morale • Protected deployment zones
                </Alert>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Row style={{ flex: 1, minHeight: 0 }}>
                {/* Player 1 Selection */}
                <Col md={6} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <Card bg="secondary" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <Card.Header style={{ flexShrink: 0, padding: '10px' }}>
                      <h5 className="mb-1">Player 1</h5>
                      <Form.Group>
                        <Form.Check
                          inline
                          type="radio"
                          label="Human"
                          name="player1Type"
                          checked={playerTypes.player1 === 'human'}
                          onChange={() => handlePlayerTypeChange('player1', 'human')}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label="AI"
                          name="player1Type"
                          checked={playerTypes.player1 === 'ai'}
                          onChange={() => handlePlayerTypeChange('player1', 'ai')}
                        />
                      </Form.Group>
                    </Card.Header>
                    <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                      {Object.entries(factionInfo).map(([factionKey, info]) => (
                        <Card
                          key={factionKey}
                          className={`faction-card mb-2 ${selectedFactions.player1 === factionKey ? 'selected' : ''}`}
                          onClick={() => handleFactionSelect('player1', factionKey)}
                          style={{ borderColor: info.color }}
                        >
                          <Card.Body style={{ padding: '10px' }}>
                            <h6 style={{ color: info.color, marginBottom: '5px' }}>{info.name}</h6>
                            <p className="small mb-2" style={{ fontSize: '0.85rem' }}>{info.description}</p>
                            <div>
                              {info.strengths.map(strength => (
                                <Badge key={strength} bg="dark" className="me-1" style={{ fontSize: '0.75rem' }}>
                                  {strength}
                                </Badge>
                              ))}
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>

                {/* Player 2 Selection */}
                <Col md={6} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <Card bg="secondary" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <Card.Header style={{ flexShrink: 0, padding: '10px' }}>
                      <h5 className="mb-1">Player 2</h5>
                      <Form.Group>
                        <Form.Check
                          inline
                          type="radio"
                          label="Human"
                          name="player2Type"
                          checked={playerTypes.player2 === 'human'}
                          onChange={() => handlePlayerTypeChange('player2', 'human')}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          label="AI"
                          name="player2Type"
                          checked={playerTypes.player2 === 'ai'}
                          onChange={() => handlePlayerTypeChange('player2', 'ai')}
                        />
                      </Form.Group>
                    </Card.Header>
                    <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                      {Object.entries(factionInfo).map(([factionKey, info]) => (
                        <Card
                          key={factionKey}
                          className={`faction-card mb-2 ${selectedFactions.player2 === factionKey ? 'selected' : ''}`}
                          onClick={() => handleFactionSelect('player2', factionKey)}
                          style={{ borderColor: info.color }}
                        >
                          <Card.Body style={{ padding: '10px' }}>
                            <h6 style={{ color: info.color, marginBottom: '5px' }}>{info.name}</h6>
                            <p className="small mb-2" style={{ fontSize: '0.85rem' }}>{info.description}</p>
                            <div>
                              {info.strengths.map(strength => (
                                <Badge key={strength} bg="dark" className="me-1" style={{ fontSize: '0.75rem' }}>
                                  {strength}
                                </Badge>
                              ))}
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <div className="text-center" style={{ flexShrink: 0, padding: '10px 0' }}>
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleStartGame}
                  disabled={!selectedFactions.player1 || !selectedFactions.player2}
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

export default FactionSelector
