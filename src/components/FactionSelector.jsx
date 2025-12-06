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
    color: '#00bcd4',
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
  const [numPlayers, setNumPlayers] = useState(2)
  const [selectedFactions, setSelectedFactions] = useState({
    player1: null,
    player2: null,
    player3: null,
    player4: null,
    player5: null
  })
  const [playerTypes, setPlayerTypes] = useState({
    player1: 'human',
    player2: 'ai',
    player3: 'ai',
    player4: 'ai',
    player5: 'ai'
  })
  // AI difficulty levels: 'easy', 'medium', 'hard'
  const [aiDifficulties, setAiDifficulties] = useState({
    player1: 'easy',
    player2: 'easy',
    player3: 'easy',
    player4: 'easy',
    player5: 'easy'
  })
  const [error, setError] = useState('')

  const handleNumPlayersChange = (num) => {
    setNumPlayers(num)
    setError('')
    // Reset factions for players beyond the new count
    const newSelectedFactions = { ...selectedFactions }
    for (let i = num + 1; i <= 5; i++) {
      newSelectedFactions[`player${i}`] = null
    }
    setSelectedFactions(newSelectedFactions)
  }

  const handleFactionSelect = (player, faction) => {
    setError('')

    // Check if faction is already selected by another active player
    for (let i = 1; i <= numPlayers; i++) {
      const otherPlayer = `player${i}`
      if (otherPlayer !== player && selectedFactions[otherPlayer] === faction) {
        setError('Each player must choose a different faction!')
        return
      }
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

  const handleAiDifficultyChange = (player, difficulty) => {
    setAiDifficulties({
      ...aiDifficulties,
      [player]: difficulty
    })
  }

  const handleStartGame = () => {
    console.log('handleStartGame called')
    console.log('numPlayers:', numPlayers)
    console.log('selectedFactions:', selectedFactions)
    console.log('playerTypes:', playerTypes)

    // Validate all active players have factions
    for (let i = 1; i <= numPlayers; i++) {
      if (!selectedFactions[`player${i}`]) {
        setError(`Player ${i} must select a faction!`)
        console.log(`Error: Player ${i} faction not selected`)
        return
      }
    }

    // Build config for active players only
    const config = {}
    for (let i = 1; i <= numPlayers; i++) {
      const playerKey = `player${i}`
      const isHuman = playerTypes[playerKey] === 'human'
      config[playerKey] = {
        faction: selectedFactions[playerKey],
        isHuman: isHuman,
        // Only include AI difficulty for AI players
        aiDifficulty: isHuman ? null : aiDifficulties[playerKey]
      }
    }

    config.numPlayers = numPlayers

    console.log('Calling onStartGame with config:', config)
    onStartGame(config)
  }

  const getAvailableFactions = (currentPlayer) => {
    const selectedByOthers = []
    for (let i = 1; i <= numPlayers; i++) {
      const player = `player${i}`
      if (player !== currentPlayer && selectedFactions[player]) {
        selectedByOthers.push(selectedFactions[player])
      }
    }
    return Object.entries(factionInfo).filter(([key]) => !selectedByOthers.includes(key))
  }

  const renderPlayerColumn = (playerNum) => {
    const playerKey = `player${playerNum}`
    const availableFactions = getAvailableFactions(playerKey)

    // Calculate column width: 2 players = 50%, 3 players = 33%, 4 players = 25%, 5 players = 20%
    const getColumnStyle = () => {
      if (numPlayers === 5) {
        return { flex: '0 0 20%', maxWidth: '20%', display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: '10px' }
      }
      return { display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: '10px' }
    }

    const colSize = numPlayers <= 2 ? 6 : numPlayers === 3 ? 4 : numPlayers === 4 ? 3 : 12 // Use 12 for 5 players, override with flex

    return (
      <Col key={playerNum} md={colSize} style={getColumnStyle()}>
        <Card bg="secondary" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Card.Header style={{ flexShrink: 0, padding: '8px' }}>
            <h6 className="mb-1" style={{ fontSize: numPlayers === 5 ? '0.9rem' : '1rem' }}>Player {playerNum}</h6>
            <Form.Group style={{ fontSize: numPlayers === 5 ? '0.85rem' : '1rem' }}>
              <Form.Check
                inline
                type="radio"
                label="Human"
                name={`player${playerNum}Type`}
                checked={playerTypes[playerKey] === 'human'}
                onChange={() => handlePlayerTypeChange(playerKey, 'human')}
              />
              <Form.Check
                inline
                type="radio"
                label="AI"
                name={`player${playerNum}Type`}
                checked={playerTypes[playerKey] === 'ai'}
                onChange={() => handlePlayerTypeChange(playerKey, 'ai')}
              />
            </Form.Group>
            {/* AI Difficulty Selector - only shown for AI players */}
            {playerTypes[playerKey] === 'ai' && (
              <Form.Group className="mt-1" style={{ fontSize: numPlayers === 5 ? '0.8rem' : '0.9rem' }}>
                <Form.Label className="me-2" style={{ marginBottom: 0 }}>Difficulty:</Form.Label>
                <Form.Select
                  size="sm"
                  value={aiDifficulties[playerKey]}
                  onChange={(e) => handleAiDifficultyChange(playerKey, e.target.value)}
                  style={{
                    display: 'inline-block',
                    width: 'auto',
                    fontSize: numPlayers === 5 ? '0.75rem' : '0.85rem',
                    padding: '2px 8px'
                  }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Form.Select>
              </Form.Group>
            )}
          </Card.Header>
          <Card.Body style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            {availableFactions.map(([factionKey, info]) => (
              <Card
                key={factionKey}
                className={`faction-card mb-2 ${selectedFactions[playerKey] === factionKey ? 'selected' : ''}`}
                onClick={() => handleFactionSelect(playerKey, factionKey)}
                style={{ borderColor: info.color, cursor: 'pointer' }}
              >
                <Card.Body style={{ padding: numPlayers === 5 ? '6px' : '10px' }}>
                  <h6 style={{ color: info.color, marginBottom: '3px', fontSize: numPlayers === 5 ? '0.85rem' : '1rem' }}>{info.name}</h6>
                  <p className="small mb-1" style={{ fontSize: numPlayers === 5 ? '0.7rem' : '0.85rem' }}>{info.description}</p>
                  <div>
                    {info.strengths.map(strength => (
                      <Badge key={strength} bg="dark" className="me-1" style={{ fontSize: numPlayers === 5 ? '0.65rem' : '0.75rem' }}>
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
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Container fluid className="faction-selector" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', overflow: 'hidden' }}>
        <Row className="justify-content-center" style={{ flex: 1, minHeight: 0 }}>
          <Col md={12} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Card bg="dark" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <Card.Header style={{ flexShrink: 0, padding: '10px' }}>
                <h3 className="text-center mb-2">Dungeon Command - Choose Your Warband</h3>
                <div className="text-center">
                  <Form.Label className="me-2">Number of Players:</Form.Label>
                  {[2, 3, 4, 5].map(num => (
                    <Button
                      key={num}
                      variant={numPlayers === num ? 'primary' : 'outline-primary'}
                      size="sm"
                      className="me-2"
                      onClick={() => handleNumPlayersChange(num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </Card.Header>
              <Card.Body style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                <Alert variant="info" style={{ padding: '8px', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <strong>Custom Rules:</strong> No Cower • Killing grants +1 morale • Protected deployment zones
                  <br />
                  <strong>Board Size:</strong> {numPlayers === 2 ? '16×16' : numPlayers === 3 ? '20×20' : numPlayers === 4 ? '24×24' : '28×28'}
                </Alert>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Row style={{ flex: 1, minHeight: 0 }}>
                {Array.from({ length: numPlayers }, (_, i) => renderPlayerColumn(i + 1))}
              </Row>

              <div className="text-center" style={{ flexShrink: 0, padding: '10px 0' }}>
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleStartGame}
                  disabled={Object.values(selectedFactions).slice(0, numPlayers).some(f => !f)}
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
