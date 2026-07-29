import PlayerPanel from './PlayerPanel'

/**
 * PlayerPanelSidebar - Right-side collapsible panel wrapping PlayerPanel.
 * Extracted from GameBoard.jsx (Phase E decomposition). Pure extraction,
 * no logic changes - same props passed through under the same names.
 */
function PlayerPanelSidebar({
  canDeployInCurrentPhase,
  cancelRightClickAttack,
  clearOrderCardFilter,
  combatPanelMode,
  confirmRightClickAttack,
  creatureViewMode,
  currentPlayer,
  currentPlayerId,
  gameState,
  handleConfusionGazeConfirmAttack,
  handleDefenseSelected,
  handleDragEnd,
  handleDragStart,
  handleFlashingBladesConfirmAttack,
  handleGraveyardCreatureSelect,
  handleGraveyardDragEnd,
  handleGraveyardDragStart,
  handleHiddenBladeConfirmAttack,
  handleLightningBreathStart,
  handleOrderCardClick,
  handleOrderCardRightClick,
  handleReactionsSkipped,
  isPanelCollapsed,
  isPlayerHuman,
  orderCardFilterCreature,
  pendingAttack,
  pendingRightClickAttack,
  selectedBoardCreature,
  selectedCreatureIndex,
  selectedGraveyardCreature,
  selectedOrderCard,
  selectedOrderIndex,
  setCreatureViewMode,
  setFactionHighlight,
  setIsPanelCollapsed,
  setSelectedCreatureIndex,
}) {
  return (
    <div
      style={{
        width: isPanelCollapsed ? '5px' : '500px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
      }}
    >
      {/* Toggle button - always visible on left edge */}
      <button
        className={`panel-toggle-btn ${isPanelCollapsed ? 'collapsed' : ''}`}
        onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
        title={isPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {isPanelCollapsed ? '◀' : '▶'}
      </button>

      {/* Player Panel - Only show when expanded */}
      {!isPanelCollapsed && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <PlayerPanel
            player={currentPlayer}
            playerId={currentPlayerId}
            isCurrentPlayer={true}
            isHuman={isPlayerHuman(currentPlayerId)}
            selectedCreature={selectedCreatureIndex}
            selectedOrder={selectedOrderIndex}
            onCreatureSelect={(idx) => setSelectedCreatureIndex(idx)}
            onOrderSelect={handleOrderCardClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            currentPhase={gameState.currentPhase}
            vertical={true}
            canDeployCreatures={canDeployInCurrentPhase()}
            // COMBAT PANEL PROPS - O(1) prop passing
            // For attack mode: use pendingRightClickAttack for normal attacks, or pendingAttack for FLASHING BLADES
            combatMode={combatPanelMode}
            attackerCreature={
              combatPanelMode === 'attack'
                ? pendingRightClickAttack?.attacker || pendingAttack?.attackerInstance
                : pendingAttack?.attackerInstance
            }
            defenderCreature={
              combatPanelMode === 'attack'
                ? pendingRightClickAttack?.target || pendingAttack?.defenderInstance
                : pendingAttack?.defenderInstance
            }
            attackInfo={
              combatPanelMode === 'attack'
                ? pendingRightClickAttack?.attackInfo || pendingAttack?.targetInfo
                : pendingAttack?.targetInfo
            }
            accumulatedDamageReduction={pendingAttack?.accumulatedDamageReduction || 0}
            defenderPlayerState={
              combatPanelMode === 'attack'
                ? pendingRightClickAttack
                  ? gameState.players[pendingRightClickAttack.target?.owner]
                  : pendingAttack
                    ? gameState.players[pendingAttack.defenderInstance?.owner]
                    : null
                : pendingAttack
                  ? gameState.players[pendingAttack.defenderInstance?.owner]
                  : null
            }
            gameState={gameState}
            damageBoostCard={
              pendingAttack?.damageBoostCard || pendingRightClickAttack?.damageBoostCard || null
            }
            damageBoostBonus={
              pendingAttack?.damageBoostBonus || pendingRightClickAttack?.damageBoostBonus || 0
            }
            damageBoostFlat={
              pendingAttack?.damageBoostFlat !== undefined
                ? pendingAttack.damageBoostFlat
                : pendingRightClickAttack?.damageBoostFlat !== undefined
                  ? pendingRightClickAttack.damageBoostFlat
                  : null
            }
            isFlashingBlades={pendingAttack?.isFlashingBlades || false}
            isHiddenBlade={pendingAttack?.isHiddenBlade || false}
            onConfirmAttack={
              pendingAttack?.isFlashingBlades
                ? handleFlashingBladesConfirmAttack
                : pendingAttack?.isHiddenBlade
                  ? handleHiddenBladeConfirmAttack
                  : pendingAttack?.isConfusionGaze
                    ? handleConfusionGazeConfirmAttack
                    : confirmRightClickAttack
            }
            onCancelAttack={
              pendingAttack?.isFlashingBlades ||
              pendingAttack?.isHiddenBlade ||
              pendingAttack?.isConfusionGaze
                ? null
                : cancelRightClickAttack
            }
            onLightningBreath={handleLightningBreathStart}
            onDefenseSelected={handleDefenseSelected}
            onSkipDefense={handleReactionsSkipped}
            // FACTION ICONS PROPS - O(1) prop passing
            allPlayers={gameState?.players}
            onFactionHighlight={setFactionHighlight}
            // AI TURN HANDLING - Pass current player ID for auto-switch
            currentPlayerId={currentPlayerId}
            // VIEW MODE TOGGLE - For switching between movement and ranged preview
            creatureViewMode={creatureViewMode}
            onCreatureViewModeToggle={() => {
              setCreatureViewMode((mode) => (mode === 'movement' ? 'ranged' : 'movement'))
            }}
            selectedBoardCreature={selectedBoardCreature}
            // GRAVEYARD PROPS - For resurrection
            selectedGraveyardCreature={selectedGraveyardCreature}
            onGraveyardCreatureSelect={handleGraveyardCreatureSelect}
            onGraveyardDragStart={handleGraveyardDragStart}
            onGraveyardDragEnd={handleGraveyardDragEnd}
            // ORDER CARD TARGETING PROPS - For Web and other targeted order cards
            orderCardFilterCreature={orderCardFilterCreature}
            selectedOrderCard={selectedOrderCard}
            onOrderCardRightClick={handleOrderCardRightClick}
            onClearOrderCardFilter={clearOrderCardFilter}
          />
        </div>
      )}
    </div>
  )
}

export default PlayerPanelSidebar
