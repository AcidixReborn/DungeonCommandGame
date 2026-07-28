// useDeployment.js - Deployment state management hook
// Extracted from GameBoard.jsx for single responsibility

import { useState, useCallback } from 'react'

// { creature, tile, creatureIndex, isFromGraveyard, source: 'drag'|'rightClick' }
export interface PendingDeployment {
  creature: unknown
  tile: unknown
  creatureIndex: number
  isFromGraveyard?: boolean
  source?: 'drag' | 'rightClick'
  [key: string]: unknown
}

/**
 * Custom hook for managing deployment state
 * Handles deploy confirmation, graveyard deployment, and related UI state
 */
export function useDeployment() {
  // ============================================
  // DEPLOY CONFIRMATION STATE
  // Shows leadership cost before deploying
  // ============================================
  const [showDeployConfirm, setShowDeployConfirm] = useState(false)
  const [pendingDeployment, setPendingDeployment] = useState<PendingDeployment | null>(null)

  // ============================================
  // GRAVEYARD DEPLOY STATE
  // Tracks selected creature from graveyard for resurrection
  // ============================================
  const [selectedGraveyardCreature, setSelectedGraveyardCreature] = useState<unknown>(null)
  const [selectedGraveyardIndex, setSelectedGraveyardIndex] = useState<number | null>(null)
  const [draggingFromGraveyard, setDraggingFromGraveyard] = useState(false)

  // ============================================
  // HORDE ABILITY STATE
  // Deploy during REFRESH phase (Orc ability)
  // ============================================
  const [showHordeModal, setShowHordeModal] = useState(false)
  const [hordeRefreshExecuted, setHordeRefreshExecuted] = useState(false)

  /**
   * Start a deployment confirmation
   */
  const startDeployConfirmation = useCallback((deploymentInfo: PendingDeployment) => {
    setPendingDeployment(deploymentInfo)
    setShowDeployConfirm(true)
  }, [])

  /**
   * Cancel the current deployment confirmation
   */
  const cancelDeployConfirmation = useCallback(() => {
    setPendingDeployment(null)
    setShowDeployConfirm(false)
  }, [])

  /**
   * Clear deployment confirmation after successful deploy
   */
  const clearDeployConfirmation = useCallback(() => {
    setPendingDeployment(null)
    setShowDeployConfirm(false)
  }, [])

  /**
   * Select a creature from the graveyard for resurrection
   */
  const selectGraveyardCreature = useCallback((creature: unknown, index: number) => {
    setSelectedGraveyardCreature(creature)
    setSelectedGraveyardIndex(index)
  }, [])

  /**
   * Clear graveyard selection
   */
  const clearGraveyardSelection = useCallback(() => {
    setSelectedGraveyardCreature(null)
    setSelectedGraveyardIndex(null)
    setDraggingFromGraveyard(false)
  }, [])

  /**
   * Start dragging from graveyard
   */
  const startGraveyardDrag = useCallback(() => {
    setDraggingFromGraveyard(true)
  }, [])

  /**
   * End dragging from graveyard
   */
  const endGraveyardDrag = useCallback(() => {
    setDraggingFromGraveyard(false)
  }, [])

  /**
   * Clear HORDE modal state
   */
  const clearHordeState = useCallback(() => {
    setShowHordeModal(false)
    setHordeRefreshExecuted(false)
  }, [])

  /**
   * Clear all deployment state
   * Called at end of turn or game reset
   */
  const clearAllDeploymentState = useCallback(() => {
    setShowDeployConfirm(false)
    setPendingDeployment(null)
    setSelectedGraveyardCreature(null)
    setSelectedGraveyardIndex(null)
    setDraggingFromGraveyard(false)
    setShowHordeModal(false)
    setHordeRefreshExecuted(false)
  }, [])

  return {
    // Deploy confirmation
    showDeployConfirm,
    setShowDeployConfirm,
    pendingDeployment,
    setPendingDeployment,
    startDeployConfirmation,
    cancelDeployConfirmation,
    clearDeployConfirmation,

    // Graveyard deployment
    selectedGraveyardCreature,
    setSelectedGraveyardCreature,
    selectedGraveyardIndex,
    setSelectedGraveyardIndex,
    draggingFromGraveyard,
    setDraggingFromGraveyard,
    selectGraveyardCreature,
    clearGraveyardSelection,
    startGraveyardDrag,
    endGraveyardDrag,

    // HORDE ability
    showHordeModal,
    setShowHordeModal,
    hordeRefreshExecuted,
    setHordeRefreshExecuted,
    clearHordeState,

    // Clear all
    clearAllDeploymentState,
  }
}

export default useDeployment
