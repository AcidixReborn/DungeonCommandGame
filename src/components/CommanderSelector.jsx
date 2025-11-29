import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap'
import { commanders } from '../data/factions'
import './CommanderSelector.css'

function CommanderSelector({ factionConfig, onCommandersSelected }) {
  const numPlayers = factionConfig.numPlayers || 2
  const [currentPlayerSelecting, setCurrentPlayerSelecting] = useState('player1')

  // Initialize selected commanders for all players
  const initialSelectedCommanders = {}
  for (let i = 1; i <= numPlayers; i++) {
    initialSelectedCommanders[`player${i}`] = null
  }
  const [selectedCommanders, setSelectedCommanders] = useState(initialSelectedCommanders)

  // Get commanders for current player selecting
  const getCurrentPlayerCommanders = () => {
    const faction = factionConfig[currentPlayerSelecting].faction
    return commanders[faction]
  }

  const getCurrentPlayerConfig = () => {
    return factionConfig[currentPlayerSelecting]
  }

  const currentPlayerCommanders = getCurrentPlayerCommanders()
  const currentPlayerConfig = getCurrentPlayerConfig()

  // Auto-select for AI players
  useEffect(() => {
    if (!currentPlayerConfig.isHuman) {
      // AI automatically picks a random commander
      const randomIndex = Math.floor(Math.random() * currentPlayerCommanders.length)
      setTimeout(() => {
        handleCommanderSelect(randomIndex)
      }, 1000) // Small delay to show AI is "thinking"
    }
  }, [currentPlayerSelecting])

  const handleCommanderSelect = (commanderIndex) => {
    // Update selected commanders
    const newSelected = {
      ...selectedCommanders,
      [currentPlayerSelecting]: commanderIndex
    }
    setSelectedCommanders(newSelected)

    // Get current player number
    const currentPlayerNum = parseInt(currentPlayerSelecting.replace('player', ''))

    // Move to next player or finish
    if (currentPlayerNum < numPlayers) {
      setCurrentPlayerSelecting(`player${currentPlayerNum + 1}`)
    } else {
      // All players have selected, start the game
      const finalConfig = { numPlayers }

      for (let i = 1; i <= numPlayers; i++) {
        const playerKey = `player${i}`
        const faction = factionConfig[playerKey].faction
        const commanderIndex = newSelected[playerKey]

        finalConfig[playerKey] = {
          ...factionConfig[playerKey],
          commander: commanders[faction][commanderIndex]
        }
      }

      onCommandersSelected(finalConfig)
    }
  }

  const getPlayerNumber = () => {
    return parseInt(currentPlayerSelecting.replace('player', ''))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#1a1a2e' }}>
      <Container fluid className="commander-selector" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
        <Row className="justify-content-center" style={{ flex: 1, minHeight: 0 }}>
          <Col md={12} lg={10} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Card bg="dark" text="white" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <Card.Header style={{ flexShrink: 0, padding: '15px', textAlign: 'center' }}>
                <h3 className="mb-2">
                  Player {getPlayerNumber()} - Choose Your Commander
                </h3>
                <h5 className="mb-0">
                  <Badge bg="info">{currentPlayerConfig.faction}</Badge>
                  {!currentPlayerConfig.isHuman && <Badge bg="warning" text="dark" className="ms-2">AI Selecting...</Badge>}
                </h5>
                <p className="mt-2 mb-0 text-muted">
                  {getPlayerNumber()} of {numPlayers} players
                </p>
              </Card.Header>
              <Card.Body style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Row className="justify-content-center align-items-center" style={{ width: '100%', maxWidth: '1200px' }}>
                  {currentPlayerCommanders.map((commander, idx) => (
                    <Col key={commander.id} xs={12} md={6} className="mb-4" style={{ display: 'flex', justifyContent: 'center' }}>
                      <Card
                        className={`commander-card ${selectedCommanders[currentPlayerSelecting] === idx ? 'selected' : ''}`}
                        onClick={() => currentPlayerConfig.isHuman && handleCommanderSelect(idx)}
                        style={{
                          cursor: currentPlayerConfig.isHuman ? 'pointer' : 'default',
                          maxWidth: '500px',
                          width: '100%'
                        }}
                      >
                        <Card.Img
                          variant="top"
                          src={commander.imageUrl}
                          alt={commander.name}
                          style={{
                            width: '100%',
                            height: 'auto',
                            objectFit: 'contain',
                            backgroundColor: '#000'
                          }}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default CommanderSelector
