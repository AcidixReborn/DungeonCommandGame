import { useState } from 'react'
import GameBoard from './GameBoard'

/**
 * GameContainer - Top-level game coordinator
 *
 * Purpose: Manages shared state and coordinates between isolated sections.
 * This component will eventually house BoardSection, PlayerPanelSection, and ModalPortal
 * when we complete the full architectural refactor.
 *
 * For now, it simply wraps GameBoard to establish the new architecture incrementally.
 *
 * Architecture Goals:
 * - Board, Panel, and Modals should have independent render trees
 * - Changing panel tabs shouldn't re-render the board
 * - Opening modals shouldn't re-render the board or panel
 * - Moving creatures should only re-render the board, not the panel
 */
function GameContainer({ onTurnInfoChange }) {
  // For now, just pass everything through to GameBoard
  // We'll gradually move state management here as we refactor

  return <GameBoard onTurnInfoChange={onTurnInfoChange} />
}

export default GameContainer
