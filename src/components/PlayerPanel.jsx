import { useState, useEffect, useRef } from 'react'
import { Card, Badge, ProgressBar, Row, Col } from 'react-bootstrap'
import { GiDragonHead, GiCardPlay, GiCrossedSwords, GiSpiderWeb, GiKnightBanner, GiGoblinHead, GiSkullCrossedBones, GiOrcHead, GiTombstone } from 'react-icons/gi'
import CreatureCard from './CreatureCard'
import OrderCard from './OrderCard'
import AttackConfirmPanel from './AttackConfirmPanel'
import DefenseOptionsPanel from './DefenseOptionsPanel'
import GraveyardPanel from './GraveyardPanel'
import './PlayerPanel.css'

/**
 * ============================================
 * FACTION ICON MAPPING
 * Maps faction names to their corresponding React Icons
 * Big O Complexity: O(1) - constant time object lookup
 * ============================================
 */
const factionIcons = {
  'Sting of Lolth': GiSpiderWeb,
  'Heart of Cormyr': GiKnightBanner,
  'Tyranny of Goblins': GiGoblinHead,
  'Curse of Undeath': GiSkullCrossedBones,
  'Blood of Gruumsh': GiOrcHead
}

/**
 * PlayerPanel - Displays player information, resources, and cards
 * Supports horizontal and vertical layouts with combat view integration
 *
 * Big O Complexity:
 * - View switching: O(1) - state update and conditional render
 * - Combat mode detection: O(1) - simple prop checks
 * - Auto-view switching: O(1) - effect runs on phase/combat change
 * - Faction icons render: O(n) where n = number of active players (max 5)
 * - Faction creatures view: O(m) where m = creatures in selected faction
 *
 * @param {PlayerState} player - Player state data
 * @param {string} playerId - Player ID
 * @param {boolean} isCurrentPlayer - Whether this is the active player
 * @param {boolean} isHuman - Whether player is human (vs AI)
 * @param {Function} onCreatureSelect - Handler for creature card selection
 * @param {Function} onOrderSelect - Handler for order card selection
 * @param {number} selectedCreature - Index of selected creature card
 * @param {number} selectedOrder - Index of selected order card
 * @param {Function} onDragStart - Drag start handler
 * @param {Function} onDragEnd - Drag end handler
 * @param {string} currentPhase - Current game phase
 * @param {boolean} horizontal - Use horizontal layout
 * @param {boolean} vertical - Use vertical layout
 * @param {boolean} canDeployCreatures - Whether creatures can be deployed (DEPLOY phase or HORDE during REFRESH)
 * @param {string} combatMode - Combat mode: 'attack' | 'defense' | null
 * @param {CreatureInstance} attackerCreature - The attacking creature instance
 * @param {CreatureInstance} defenderCreature - The defending creature instance
 * @param {Object} attackInfo - Attack details { attackType: 'melee'|'ranged', ... }
 * @param {number} accumulatedDamageReduction - Damage prevented so far (for stacking defenses)
 * @param {PlayerState} defenderPlayerState - Defender's player state (for defense options)
 * @param {Object} gameState - Current game state (for defense options)
 * @param {Function} onConfirmAttack - Callback when attack is confirmed
 * @param {Function} onCancelAttack - Callback when attack is cancelled
 * @param {Function} onDefenseSelected - Callback when defense option is selected
 * @param {Function} onSkipDefense - Callback when skipping defense (take damage)
 * @param {Object} allPlayers - Object containing all player states (for faction icons)
 * @param {Function} onFactionHighlight - Callback to highlight faction creatures on board
 * @param {string} currentPlayerId - Current player's ID (for AI turn auto-switch to show AI faction)
 */
function PlayerPanel({
  player,
  playerId,
  isCurrentPlayer,
  isHuman = true,
  onCreatureSelect,
  onOrderSelect,
  selectedCreature,
  selectedOrder,
  onDragStart,
  onDragEnd,
  currentPhase,
  horizontal = false,
  vertical = false,
  canDeployCreatures = false,
  // Combat mode props - O(1) prop access
  combatMode = null,
  attackerCreature = null,
  defenderCreature = null,
  attackInfo = null,
  accumulatedDamageReduction = 0,
  defenderPlayerState = null,
  gameState = null,
  onConfirmAttack,
  onCancelAttack,
  onDefenseSelected,
  onSkipDefense,
  onLightningBreath,
  // Faction icons props - O(1) prop access
  allPlayers = null,
  onFactionHighlight = null,
  // AI turn handling props - O(1) prop access
  currentPlayerId = null,
  // View mode toggle props - O(1) prop access
  creatureViewMode = 'movement',
  onCreatureViewModeToggle = null,
  selectedBoardCreature = null,
  // Graveyard props - O(1) prop access
  selectedGraveyardCreature = null,
  onGraveyardCreatureSelect = null,
  onGraveyardDragStart = null,
  onGraveyardDragEnd = null
}) {
  // ============================================
  // STATE: Active view for vertical nav bar - O(1) state access
  // 'creatures', 'orders', 'combat', or 'faction' - switches which view is displayed
  // ============================================
  const [activeView, setActiveView] = useState('creatures')

  // ============================================
  // REF: Track if we've auto-switched to combat view for current combat session
  // Allows initial auto-switch but lets user freely navigate to other views afterward
  // ============================================
  const hasAutoSwitchedToCombat = useRef(false)

  // ============================================
  // STATE: Selected faction for faction view - O(1) state access
  // Stores playerId of selected faction, or null if none selected
  // ============================================
  const [selectedFactionView, setSelectedFactionView] = useState(null)

  // ============================================
  // STATE: Selected faction for graveyard view - O(1) state access
  // Stores playerId of selected graveyard faction
  // ============================================
  const [selectedGraveyardFaction, setSelectedGraveyardFaction] = useState(null)

  // ============================================
  // EFFECT: Auto-switch view based on game phase - O(1) operation
  // DEPLOY phase -> show creatures, ACTIVATE phase -> show orders
  // Only applies during human turns - AI turns stay on faction view
  // ============================================
  useEffect(() => {
    if (isHuman) {
      if (currentPhase === 'DEPLOY') {
        setActiveView('creatures')
      } else if (currentPhase === 'ACTIVATE') {
        setActiveView('orders')
      }
    }
  }, [currentPhase, isHuman])

  // ============================================
  // EFFECT: Auto-switch to combat view when combat mode is active - O(1)
  // Only auto-switches ONCE when combat starts, allowing user to freely navigate
  // to other views (creatures, orders, faction) during combat for verification
  // When combat ends, switch back to orders view (combat happens in ACTIVATE phase)
  // ============================================
  useEffect(() => {
    if (combatMode) {
      // Only auto-switch to combat view ONCE when combat starts
      // User can then manually switch to other views and back
      if (!hasAutoSwitchedToCombat.current) {
        setActiveView('combat')
        hasAutoSwitchedToCombat.current = true
      }
    } else {
      // Combat ended - reset the flag and switch back to orders view
      hasAutoSwitchedToCombat.current = false
      if (activeView === 'combat') {
        setActiveView('orders')
      }
    }
  }, [combatMode, activeView])

  // ============================================
  // EFFECT: Clear faction highlight when switching away from faction view - O(1)
  // Ensures board highlighting is removed when user navigates to different tab
  // Only runs when human manually switches views (not during AI auto-switch)
  // ============================================
  useEffect(() => {
    // Only clear if human is controlling and switches away from faction view
    if (isHuman && activeView !== 'faction') {
      setSelectedFactionView(null)
      onFactionHighlight && onFactionHighlight(null)
    }
  }, [activeView, onFactionHighlight, isHuman])

  // ============================================
  // EFFECT: Auto-switch to AI faction view during AI turn - O(1)
  // When it's an AI's turn, show their faction creatures and highlight on board
  // Real-time updates: allPlayers prop changes when creatures are killed,
  // which triggers re-render and updates the creature list automatically
  // IMPORTANT: Don't override combat mode - human needs to see defense panel
  // ============================================
  useEffect(() => {
    if (!isHuman && currentPlayerId && allPlayers && !combatMode) {
      // AI turn started - switch to faction view showing AI's creatures
      // Only if not in combat mode (human might need to defend)
      setSelectedFactionView(currentPlayerId)
      setActiveView('faction')
      onFactionHighlight && onFactionHighlight(currentPlayerId)
    }
  }, [isHuman, currentPlayerId, allPlayers, onFactionHighlight, combatMode])

  // ============================================
  // EFFECT: Return to orders view when human turn starts - O(1)
  // When it becomes human's turn, switch back to orders tab and clear highlights
  // ============================================
  useEffect(() => {
    if (isHuman && activeView === 'faction' && !combatMode) {
      // Human turn started - switch back to orders view
      setActiveView('orders')
      setSelectedFactionView(null)
      onFactionHighlight && onFactionHighlight(null)
    }
  }, [isHuman, onFactionHighlight, combatMode])

  // ============================================
  // HANDLER: Faction icon click - O(1)
  // Sets selected faction, switches to faction view, and triggers board highlighting
  // @param {string} factionPlayerId - The player ID of the faction to view
  // ============================================
  const handleFactionClick = (factionPlayerId) => {
    setSelectedFactionView(factionPlayerId)
    setActiveView('faction')
    onFactionHighlight && onFactionHighlight(factionPlayerId)
  }

  // ============================================
  // HANDLER: Graveyard button click - O(1)
  // Switches to graveyard view and sets initial faction to current player
  // ============================================
  const handleGraveyardClick = () => {
    // Set initial graveyard faction to current player if not set
    if (!selectedGraveyardFaction && currentPlayerId) {
      setSelectedGraveyardFaction(currentPlayerId)
    } else if (!selectedGraveyardFaction && allPlayers) {
      setSelectedGraveyardFaction(Object.keys(allPlayers)[0])
    }
    setActiveView('graveyard')
  }

  // ============================================
  // COMPUTED: Get player order for graveyard faction cycling
  // Current player first, then others in order
  // ============================================
  const getGraveyardPlayerOrder = () => {
    if (!allPlayers) return []
    const playerIds = Object.keys(allPlayers)
    if (currentPlayerId && playerIds.includes(currentPlayerId)) {
      // Current player first, then others
      const others = playerIds.filter(id => id !== currentPlayerId)
      return [currentPlayerId, ...others]
    }
    return playerIds
  }

  // Guard against NaN/undefined morale values for display
  const safeMorale = (typeof player.morale === 'number' && !isNaN(player.morale)) ? player.morale : 0
  const safeStartingMorale = player.commander?.startingMorale || 1 // Prevent division by 0
  const moralePercentage = (safeMorale / safeStartingMorale) * 100
  const leadershipUsage = player.getCurrentLeadershipUsage()
  const leadershipPercentage = (leadershipUsage / player.leadership) * 100

  // Vertical layout for current player to the right of battlefield
  if (vertical) {
    return (
      <Card
        bg="dark"
        text="white"
        className="player-panel-vertical"
        border={isCurrentPlayer ? 'success' : 'secondary'}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Card.Body style={{ padding: '3px 5px 5px 5px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* ============================================
              NEW LAYOUT: Single Card Display + Vertical Nav Bar
              O(1) view switching via activeView state
              ============================================ */}
          <div style={{ display: 'flex', gap: '5px', flex: 1, minHeight: 0 }}>
            {/* Main Card Display Area - Shows Creatures, Orders, Combat, or Faction */}
            <div className="card-display-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
              {/* ============================================
                  FACTION CREATURES VIEW - Shown for both human and AI turns
                  Shows selected faction's deployed creatures on board
                  Big O Complexity: O(m) where m = creatures in selected faction
                  Real-time updates when creatures are killed (allPlayers prop updates)
                  ============================================ */}
              {activeView === 'faction' && selectedFactionView && allPlayers && allPlayers[selectedFactionView] && (
                <div className="faction-creatures-view">
                  {/* Header with faction name and creature count */}
                  <div className="faction-view-header">
                    <span>{allPlayers[selectedFactionView].faction}</span>
                    <span className="creature-count">
                      ({allPlayers[selectedFactionView].creaturesInPlay.length})
                    </span>
                  </div>
                  {/* Scrollable creature list - O(m) render */}
                  <div className="faction-creatures-scroll">
                    {allPlayers[selectedFactionView].creaturesInPlay.length === 0 ? (
                      <small className="text-muted">No creatures on board</small>
                    ) : (
                      allPlayers[selectedFactionView].creaturesInPlay.map((creatureInstance) => (
                        <CreatureCard
                          key={creatureInstance.instanceId}
                          creature={creatureInstance.creature}
                          compact={true}
                          creatureInstance={creatureInstance}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ============================================
                  COMBAT VIEW - Renders during combat regardless of whose turn
                  Must be outside isHuman check so human can defend during AI turn
                  ============================================ */}
              {activeView === 'combat' && combatMode && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
                  {/* Attack Confirmation Panel - O(1) render */}
                  {combatMode === 'attack' && (
                    <AttackConfirmPanel
                      attacker={attackerCreature}
                      defender={defenderCreature}
                      attackInfo={attackInfo}
                      defenderPlayerState={defenderPlayerState}
                      gameState={gameState}
                      onConfirm={onConfirmAttack}
                      onCancel={onCancelAttack}
                      onLightningBreath={onLightningBreath}
                    />
                  )}
                  {/* Defense Options Panel - O(1) render for options, O(n) for creature lists */}
                  {combatMode === 'defense' && (
                    <DefenseOptionsPanel
                      attackerInstance={attackerCreature}
                      defenderInstance={defenderCreature}
                      attackInfo={attackInfo}
                      defenderPlayerState={defenderPlayerState}
                      gameState={gameState}
                      accumulatedDamageReduction={accumulatedDamageReduction}
                      onDefenseSelected={onDefenseSelected}
                      onSkip={onSkipDefense}
                    />
                  )}
                </div>
              )}

              {/* ============================================
                  GRAVEYARD VIEW - Shows all graveyards with faction cycling
                  Zombies can be resurrected from here during DEPLOY phase
                  ============================================ */}
              {activeView === 'graveyard' && gameState && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
                  <GraveyardPanel
                    gameState={gameState}
                    playerOrder={getGraveyardPlayerOrder()}
                    selectedFactionId={selectedGraveyardFaction || currentPlayerId || Object.keys(allPlayers || {})[0]}
                    onFactionChange={setSelectedGraveyardFaction}
                    onCreatureSelect={onGraveyardCreatureSelect}
                    selectedGraveyardCreature={selectedGraveyardCreature}
                    isDeployPhase={currentPhase === 'DEPLOY'}
                    currentPlayerId={currentPlayerId}
                    isHumanTurn={isHuman}
                    onDragStart={onGraveyardDragStart}
                    onDragEnd={onGraveyardDragEnd}
                  />
                </div>
              )}

              {/* Human-only views: Creatures hand, Orders hand */}
              {isHuman && activeView !== 'faction' && activeView !== 'combat' && activeView !== 'graveyard' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="card-hand-vertical" style={{ flex: 1, maxHeight: 'none' }}>
                      {/* Creature Cards View - O(n) render where n = creatures in hand */}
                      {activeView === 'creatures' && (
                        player.creatureHand.length === 0 ? (
                          <small className="text-muted">No creatures in hand</small>
                        ) : (
                          player.creatureHand.map((creature, idx) => (
                            <CreatureCard
                              key={idx}
                              creature={creature}
                              compact={true}
                              isSelected={selectedCreature === idx}
                              onClick={() => onCreatureSelect && onCreatureSelect(idx)}
                              draggable={canDeployCreatures && isCurrentPlayer}
                              onDragStart={onDragStart}
                              onDragEnd={onDragEnd}
                              cardIndex={idx}
                              handSize={player.creatureHand.length}
                            />
                          ))
                        )
                      )}
                      {/* Order Cards View - O(n) render where n = orders in hand */}
                      {activeView === 'orders' && (
                        player.orderHand.length === 0 ? (
                          <small className="text-muted">No order cards in hand</small>
                        ) : (
                          player.orderHand.map((order, idx) => (
                            <OrderCard
                              key={idx}
                              order={order}
                              compact={true}
                              isSelected={selectedOrder === idx}
                              onClick={() => onOrderSelect && onOrderSelect(idx)}
                            />
                          ))
                        )
                      )}
                    </div>
                </div>
              )}
            </div>

            {/* Vertical Nav Bar - O(1) click handlers
                Buttons disabled during AI turn to prevent human interaction */}
            <div className="player-panel-nav">
              <button
                className={`player-panel-nav-btn ${activeView === 'creatures' ? 'active' : ''}`}
                onClick={() => setActiveView('creatures')}
                disabled={!isHuman}
                title="Creature Cards"
              >
                <GiDragonHead size={20} />
              </button>
              <button
                className={`player-panel-nav-btn ${activeView === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveView('orders')}
                disabled={!isHuman}
                title="Order Cards"
              >
                <GiCardPlay size={20} />
              </button>
              {/* View Mode Toggle - Switches between movement and ranged LOS view */}
              {onCreatureViewModeToggle && (
                <button
                  className={`player-panel-nav-btn view-mode-toggle ${creatureViewMode === 'ranged' ? 'active' : ''}`}
                  onClick={onCreatureViewModeToggle}
                  disabled={!isHuman}
                  title={creatureViewMode === 'movement' ? 'Show All Ranged Attack Coverage' : 'Show Movement Range'}
                >
                  {creatureViewMode === 'movement' ? '🏹' : '👟'}
                </button>
              )}
              {/* Combat Nav Button - Only visible when combat is active - O(1) conditional render */}
              {combatMode && (
                <button
                  className={`player-panel-nav-btn combat-btn ${activeView === 'combat' ? 'active' : ''} ${combatMode === 'defense' ? 'defense-mode' : ''}`}
                  onClick={() => setActiveView('combat')}
                  title={combatMode === 'attack' ? 'Confirm Attack' : 'Defend'}
                >
                  <GiCrossedSwords size={20} />
                </button>
              )}

              {/* Graveyard Button - View destroyed creatures, resurrect Zombies */}
              <button
                className={`player-panel-nav-btn graveyard-btn ${activeView === 'graveyard' ? 'active' : ''}`}
                onClick={handleGraveyardClick}
                disabled={!isHuman}
                title="View Graveyards"
              >
                <GiTombstone size={20} />
              </button>

              {/* ============================================
                  FACTION ICONS SECTION
                  Separator and faction icon buttons for viewing any faction's creatures
                  Big O Complexity: O(n) where n = number of active players (max 5)
                  ============================================ */}
              {allPlayers && Object.keys(allPlayers).length > 0 && (
                <>
                  {/* Separator between nav sections */}
                  <div className="nav-separator" />

                  {/* Faction Icons - O(n) where n = active players */}
                  {Object.entries(allPlayers)
                    .filter(([factionPlayerId, playerState]) => {
                      // O(1) - Check if faction is still active (not defeated)
                      // isDefeated returns true if morale <= 0 after turn 1
                      return !playerState.isDefeated(gameState?.turnNumber || 1)
                    })
                    .map(([factionPlayerId, playerState]) => {
                      // O(1) - Get faction icon component
                      const FactionIcon = factionIcons[playerState.faction]
                      if (!FactionIcon) return null

                      return (
                        <button
                          key={factionPlayerId}
                          className={`player-panel-nav-btn faction-nav-btn ${selectedFactionView === factionPlayerId ? 'active' : ''}`}
                          onClick={() => handleFactionClick(factionPlayerId)}
                          disabled={!isHuman}
                          title={`${playerState.faction} (${playerState.creaturesInPlay.length} creatures)`}
                        >
                          <FactionIcon size={20} />
                        </button>
                      )
                    })
                  }
                </>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  // Horizontal layout for current player below battlefield
  if (horizontal) {
    return (
      <Card
        bg="dark"
        text="white"
        className="player-panel-horizontal"
        border={isCurrentPlayer ? 'success' : 'secondary'}
      >
        <Card.Body>
          <Row className="align-items-start">
            {/* Player Info & Stats Column */}
            <Col md={2} className="text-center border-end border-secondary">
              <h5 className="mb-2">
                {playerId} - {player.faction}
                {isCurrentPlayer && <Badge bg="success" className="ms-2 d-block mt-2">ACTIVE</Badge>}
                {!isHuman && <Badge bg="warning" text="dark" className="ms-2 d-block mt-2">AI</Badge>}
              </h5>
              <small className="text-muted d-block mb-3">Commander: {player.commander.name}</small>

              {/* Morale */}
              <div className="stat-display mb-3">
                <strong className="d-block mb-1">Morale</strong>
                <ProgressBar
                  now={moralePercentage}
                  variant={moralePercentage > 50 ? 'success' : moralePercentage > 25 ? 'warning' : 'danger'}
                  style={{ height: '25px' }}
                  label={`${safeMorale}`}
                />
              </div>

              {/* Leadership */}
              <div className="stat-display mb-3">
                <strong className="d-block mb-1">Leadership</strong>
                <div style={{ position: 'relative' }}>
                  <ProgressBar
                    now={leadershipPercentage}
                    variant={leadershipPercentage > 80 ? 'danger' : 'info'}
                    style={{ height: '25px' }}
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
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    color: '#000',
                    pointerEvents: 'none'
                  }}>
                    {leadershipUsage}/{player.leadership}
                  </div>
                </div>
              </div>

              {/* Card Counts */}
              <div className="card-counts">
                <Badge bg="secondary" className="d-block mb-1">In Play: {player.creaturesInPlay.length}</Badge>
              </div>
            </Col>

            {/* Creature Hand Column */}
            {isHuman && (
              <Col md={5} className="border-end border-secondary">
                <h6 className="mb-2">Creature Hand ({player.creatureHand.length}):</h6>
                <div className="card-hand-horizontal">
                  {player.creatureHand.length === 0 ? (
                    <small className="text-muted">No creatures in hand</small>
                  ) : (
                    player.creatureHand.map((creature, idx) => (
                      <CreatureCard
                        key={idx}
                        creature={creature}
                        compact={true}
                        isSelected={selectedCreature === idx}
                        onClick={() => onCreatureSelect && onCreatureSelect(idx)}
                        draggable={canDeployCreatures && isCurrentPlayer}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        cardIndex={idx}
                        handSize={player.creatureHand.length}
                      />
                    ))
                  )}
                </div>
              </Col>
            )}

            {/* Order Hand Column */}
            {isHuman && (
              <Col md={5}>
                <h6 className="mb-2">Order Hand ({player.orderHand.length}):</h6>
                <div className="card-hand-horizontal">
                  {player.orderHand.length === 0 ? (
                    <small className="text-muted">No order cards in hand</small>
                  ) : (
                    player.orderHand.map((order, idx) => (
                      <OrderCard
                        key={idx}
                        order={order}
                        compact={true}
                        isSelected={selectedOrder === idx}
                        onClick={() => onOrderSelect && onOrderSelect(idx)}
                      />
                    ))
                  )}
                </div>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
    )
  }
}

export default PlayerPanel
