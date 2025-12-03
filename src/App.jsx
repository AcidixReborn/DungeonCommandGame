import { useState, useEffect } from 'react'
import { Container, Nav, Navbar, Button, Dropdown, Modal, Badge, ProgressBar } from 'react-bootstrap'
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
              {/* Left section: Nav links when no game active */}
              {!turnInfo && (
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
              )}

              {/* When game is active: Three-section layout */}
              {currentView === 'game' && turnInfo && (
                <>
                  {/* Left spacer to push center content */}
                  <div style={{ flex: 1 }}></div>

                  {/* Center: Turn info, Leadership, Morale */}
                  <Nav>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', color: 'rgba(255,255,255,.55)' }}>
                        Turn {turnInfo.turnNumber}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,.55)' }}>-</span>
                      <span style={{ color: 'rgba(255,255,255,.55)' }}>{turnInfo.factionName}</span>

                      {/* Leadership */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,.55)' }}>Leadership:</span>
                        <div style={{ width: '70px', position: 'relative' }}>
                          <ProgressBar
                            now={turnInfo.leadership > 0 ? (turnInfo.leadershipUsage / turnInfo.leadership) * 100 : 0}
                            variant={(turnInfo.leadershipUsage / turnInfo.leadership) > 0.8 ? 'danger' : 'info'}
                            style={{ height: '18px' }}
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
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#000',
                            pointerEvents: 'none'
                          }}>
                            {turnInfo.leadershipUsage}/{turnInfo.leadership}
                          </div>
                        </div>
                      </div>

                      {/* Morale */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,.55)' }}>Morale:</span>
                        <div style={{ width: '70px', position: 'relative' }}>
                          <ProgressBar
                            now={turnInfo.startingMorale > 0 ? (turnInfo.morale / turnInfo.startingMorale) * 100 : 0}
                            variant={turnInfo.morale / turnInfo.startingMorale > 0.5 ? 'success' :
                                     turnInfo.morale / turnInfo.startingMorale > 0.25 ? 'warning' : 'danger'}
                            style={{ height: '18px' }}
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
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#000',
                            pointerEvents: 'none'
                          }}>
                            {turnInfo.morale}
                          </div>
                        </div>
                      </div>

                      {turnInfo.isAIThinking && <Badge bg="warning">AI Thinking...</Badge>}
                      {turnInfo.isCurrentPlayerAI && !turnInfo.isAIThinking && <Badge bg="secondary">AI</Badge>}
                    </div>
                  </Nav>

                  {/* Right spacer to push center content */}
                  <div style={{ flex: 1 }}></div>

                  {/* Right: Action buttons */}
                  <Nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Phase advance button - shows disabled when combat is pending */}
                    {(turnInfo.canAdvancePhase || turnInfo.combatPending) && (
                      <Dropdown>
                        <Dropdown.Toggle
                          variant={turnInfo.combatPending ? 'secondary' : 'primary'}
                          className="no-caret"
                          onClick={(e) => {
                            e.preventDefault()
                            if (!turnInfo.combatPending) {
                              turnInfo.advancePhase()
                            }
                          }}
                          disabled={turnInfo.isCurrentPlayerAI || turnInfo.isAIThinking || turnInfo.combatPending}
                          title={turnInfo.combatPending ? 'Resolve combat first' : ''}
                        >
                          {turnInfo.combatPending ? '⚔️ Resolve Combat' : `🎮 ${turnInfo.phaseButtonText}`}
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

                    {/* Settings dropdown */}
                    <Dropdown align="end">
                      <Dropdown.Toggle variant="secondary" id="settings-dropdown">
                        ⚙️ Settings
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={toggleFullscreen}>
                          {isFullscreen ? '🗗 Windowed Mode' : '⛶ Fullscreen Mode'}
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item active={currentView === 'game'} onClick={() => setCurrentView('game')}>Game Board</Dropdown.Item>
                        <Dropdown.Item active={currentView === 'data'} onClick={() => setCurrentView('data')}>Data Entry</Dropdown.Item>
                        <Dropdown.Item active={currentView === 'test'} onClick={() => setCurrentView('test')}>Game Test</Dropdown.Item>
                        <Dropdown.Item active={currentView === 'abilities'} onClick={() => setCurrentView('abilities')}>Abilities Test</Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </Nav>
                </>
              )}

              {/* Settings when no game active */}
              {!turnInfo && (
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
              )}
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
