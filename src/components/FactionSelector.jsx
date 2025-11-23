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
    <Container fluid className="faction-selector">
      <Row className="justify-content-center mt-4">
        <Col md={10}>
          <Card bg="dark" text="white" className="mb-4">
            <Card.Header>
              <h2 className="text-center mb-0">Dungeon Command - Choose Your Warband</h2>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <strong>Custom Rules Active:</strong>
                <ul className="mb-0">
                  <li>No Cower mechanic</li>
                  <li>Killing an enemy creature grants +1 morale</li>
                  <li>Protected deployment zones with turn-based immunity</li>
                </ul>
              </Alert>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Row>
                {/* Player 1 Selection */}
                <Col md={6}>
                  <Card bg="secondary" text="white" className="mb-3">
                    <Card.Header>
                      <h4>Player 1</h4>
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
                    <Card.Body>
                      {Object.entries(factionInfo).map(([factionKey, info]) => (
                        <Card
                          key={factionKey}
                          className={`faction-card mb-2 ${selectedFactions.player1 === factionKey ? 'selected' : ''}`}
                          onClick={() => handleFactionSelect('player1', factionKey)}
                          style={{ borderColor: info.color }}
                        >
                          <Card.Body>
                            <h5 style={{ color: info.color }}>{info.name}</h5>
                            <p className="small mb-2">{info.description}</p>
                            <div>
                              {info.strengths.map(strength => (
                                <Badge key={strength} bg="dark" className="me-1">
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
                <Col md={6}>
                  <Card bg="secondary" text="white" className="mb-3">
                    <Card.Header>
                      <h4>Player 2</h4>
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
                    <Card.Body>
                      {Object.entries(factionInfo).map(([factionKey, info]) => (
                        <Card
                          key={factionKey}
                          className={`faction-card mb-2 ${selectedFactions.player2 === factionKey ? 'selected' : ''}`}
                          onClick={() => handleFactionSelect('player2', factionKey)}
                          style={{ borderColor: info.color }}
                        >
                          <Card.Body>
                            <h5 style={{ color: info.color }}>{info.name}</h5>
                            <p className="small mb-2">{info.description}</p>
                            <div>
                              {info.strengths.map(strength => (
                                <Badge key={strength} bg="dark" className="me-1">
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

              <div className="text-center mt-4">
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
  )
}

export default FactionSelector
