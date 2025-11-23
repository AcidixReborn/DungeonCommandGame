import { useState } from 'react'
import { Container, Nav, Navbar } from 'react-bootstrap'
import GameBoard from './components/GameBoard'
import DataEntry from './components/DataEntry'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('game')

  return (
    <div className="App">
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container fluid>
          <Navbar.Brand>Dungeon Command - Digital Edition</Navbar.Brand>
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
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className="mt-3">
        {currentView === 'game' && <GameBoard />}
        {currentView === 'data' && <DataEntry />}
      </Container>
    </div>
  )
}

export default App
