import { useState, useEffect } from 'react'
import { Container, Nav, Navbar, Button, Dropdown, Modal, Badge } from 'react-bootstrap'
import GameBoard from './components/GameBoard'
import DataEntry from './components/DataEntry'
import GameSimulation from './test/GameSimulation'
import CommanderAbilitiesTest from './test/CommanderAbilitiesTest'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('game')
  const [isFullscreen, setIsFullscreen] = useState(true)
  const [showExitModal, setShowExitModal] = useState(false)
  const [turnInfo, setTurnInfo] = useState(null)

  const toggleFullscreen = async () => {
    if (window.electronAPI) {
      const newFullscreenState = await window.electronAPI.toggleFullscreen()
      setIsFullscreen(newFullscreenState)
    }
  }

  const handleQuitApp = async () => {
    if (window.electronAPI) {
      await window.electronAPI.quitApp()
    }
  }

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowExitModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ErrorBoundary>
      <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar bg="dark" variant="dark" expand="lg" style={{ flexShrink: 0 }}>
          <Container fluid>
            <Navbar.Brand>Dungeon Command</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link
                  active={currentView === 'game'}
                  onClick={() => setCurrentView('game')}
                >
                  Game Board
                </Nav.Link>
                <Nav.Link
                  active={currentView === 'data'}
                  onClick={() => setCurrentView('data')}
                >
                  Data Entry
                </Nav.Link>
                <Nav.Link
                  active={currentView === 'test'}
                  onClick={() => setCurrentView('test')}
                >
                  Game Test
                </Nav.Link>
                <Nav.Link
                  active={currentView === 'abilities'}
                  onClick={() => setCurrentView('abilities')}
                >
                  Abilities Test
                </Nav.Link>
              </Nav>

              {/* Turn Bar - Only show when on game view and game is active */}
              {currentView === 'game' && turnInfo && (
                <Nav className="me-3">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 'bold', color: 'rgba(255,255,255,.55)' }}>
                      Turn {turnInfo.turnNumber}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,.55)' }}>-</span>
                    <span style={{ color: 'rgba(255,255,255,.55)' }}>{turnInfo.factionName}</span>
                    <Badge bg="info">{turnInfo.phase}</Badge>
                    {turnInfo.isAIThinking && <Badge bg="warning">AI Thinking...</Badge>}
                    {turnInfo.isCurrentPlayerAI && !turnInfo.isAIThinking && <Badge bg="secondary">AI</Badge>}

                    {/* Phase advance button */}
                    {turnInfo.canAdvancePhase && (
                      <Dropdown>
                        <Dropdown.Toggle
                          variant="primary"
                          className="no-caret"
                          onClick={(e) => {
                            e.preventDefault()
                            turnInfo.advancePhase()
                          }}
                          disabled={turnInfo.isCurrentPlayerAI || turnInfo.isAIThinking}
                        >
                          🎮 {turnInfo.phaseButtonText}
                        </Dropdown.Toggle>
                      </Dropdown>
                    )}

                    {/* Auto-executing badge */}
                    {turnInfo.isAutoExecuting && !turnInfo.isCurrentPlayerAI && (
                      <Badge bg="warning">Auto-Executing...</Badge>
                    )}

                    {/* Collect Morale button */}
                    {turnInfo.canCollectMorale && (
                      <Dropdown>
                        <Dropdown.Toggle
                          variant="warning"
                          className="no-caret"
                          onClick={(e) => {
                            e.preventDefault()
                            turnInfo.handleCollectMorale()
                          }}
                        >
                          💎 Collect Morale
                        </Dropdown.Toggle>
                      </Dropdown>
                    )}
                  </div>
                </Nav>
              )}

              <Nav>
                <Dropdown align="end">
                  <Dropdown.Toggle variant="secondary" id="settings-dropdown">
                    ⚙️ Settings
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={toggleFullscreen}>
                      {isFullscreen ? '🗗 Windowed Mode' : '⛶ Fullscreen Mode'}
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container fluid style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
          {currentView === 'game' && <GameBoard onTurnInfoChange={setTurnInfo} />}
          {currentView === 'data' && <DataEntry />}
          {currentView === 'test' && <GameSimulation />}
          {currentView === 'abilities' && <CommanderAbilitiesTest />}
        </Container>

        {/* Exit Confirmation Modal */}
        <Modal
          show={showExitModal}
          onHide={() => setShowExitModal(false)}
          centered
          backdrop="static"
        >
          <Modal.Header closeButton style={{ backgroundColor: '#212529', color: 'white', borderBottom: '1px solid #444' }}>
            <Modal.Title>Exit Application?</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
            Are you sure you want to exit Dungeon Command?
          </Modal.Body>
          <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
            <Button variant="secondary" onClick={() => setShowExitModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleQuitApp}>
              Exit Application
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </ErrorBoundary>
  )
}

export default App
