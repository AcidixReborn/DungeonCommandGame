import { Button, Badge } from 'react-bootstrap'
import { GiSpiderWeb, GiKnightBanner, GiGoblinHead, GiSkullCrossedBones, GiOrcHead } from 'react-icons/gi'
import CreatureCard from './CreatureCard'
import './CombatPanel.css'

/**
 * FACTION ICON MAPPING
 * Maps faction names to their corresponding React Icons
 */
const factionIcons = {
  'Sting of Lolth': GiSpiderWeb,
  'Heart of Cormyr': GiKnightBanner,
  'Tyranny of Goblins': GiGoblinHead,
  'Curse of Undeath': GiSkullCrossedBones,
  'Blood of Gruumsh': GiOrcHead
}

/**
 * GraveyardPanel - Shows creatures in graveyards with faction cycling
 * Zombies are highlighted and can be selected for resurrection
 *
 * Big O Complexity:
 * - Rendering: O(n) where n = creatures in selected graveyard
 * - Faction cycling: O(p) where p = number of players
 *
 * @param {Object} gameState - Current game state
 * @param {Array} playerOrder - Array of player IDs in order (current player first)
 * @param {string} selectedFactionId - Which faction's graveyard to show
 * @param {Function} onFactionChange - Callback to change faction
 * @param {Function} onCreatureSelect - Callback when Zombie selected for deploy
 * @param {Object} selectedGraveyardCreature - Currently selected creature
 * @param {boolean} isDeployPhase - Whether deployment is allowed
 * @param {string} currentPlayerId - Current player's ID
 * @param {boolean} isHumanTurn - Whether it's a human's turn
 */
function GraveyardPanel({
  gameState,
  playerOrder,
  selectedFactionId,
  onFactionChange,
  onCreatureSelect,
  selectedGraveyardCreature,
  isDeployPhase = false,
  currentPlayerId,
  isHumanTurn = true,
  onDragStart,
  onDragEnd
}) {
  if (!gameState || !playerOrder || playerOrder.length === 0) return null

  // Get selected player's graveyard creatures (sorted with Zombies first)
  const selectedPlayer = gameState.players[selectedFactionId]
  const graveyardCreatures = selectedPlayer ? gameState.getGraveyardCreatures(selectedFactionId) : []

  // Check if current player can deploy from this graveyard
  const isOwnGraveyard = selectedFactionId === currentPlayerId

  // Check if there are any resurrectable creatures (Zombies with GRAVEYARD DEPLOY)
  const hasResurrectableCreatures = graveyardCreatures.some(c => gameState.hasGraveyardDeploy(c))

  // Only show resurrection UI if it's own graveyard, deploy phase, human turn, AND has resurrectable creatures
  const canResurrectFromHere = isOwnGraveyard && isDeployPhase && isHumanTurn && hasResurrectableCreatures

  return (
    <div className="combat-panel graveyard-panel">
      {/* Header with faction cycling buttons */}
      <div className="combat-panel-header graveyard-header" style={{ backgroundColor: '#1a1a2e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>&#9904;</span> Graveyard
          </h5>

          {/* Faction cycling buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {playerOrder.map((playerId) => {
              const player = gameState.players[playerId]
              if (!player) return null

              const FactionIcon = factionIcons[player.faction]
              if (!FactionIcon) return null

              const isSelected = playerId === selectedFactionId
              const graveyardCount = player.creatureGraveyard?.length || 0

              return (
                <button
                  key={playerId}
                  onClick={() => onFactionChange(playerId)}
                  style={{
                    padding: '4px 6px',
                    border: `2px solid ${isSelected ? '#ffd700' : '#555'}`,
                    borderRadius: '4px',
                    background: isSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    color: isSelected ? '#ffd700' : '#aaa',
                    transition: 'all 0.2s ease'
                  }}
                  title={`${player.faction} (${graveyardCount} dead)`}
                >
                  <FactionIcon size={16} />
                  {graveyardCount > 0 && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{graveyardCount}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Current faction name */}
        <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>
          {selectedPlayer?.faction || 'Unknown'}
        </div>
      </div>

      {/* Graveyard creatures grid */}
      <div className="graveyard-creatures-grid" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '8px',
        minHeight: '100px',
        alignContent: 'flex-start',
        flex: 1,
        overflowY: 'auto'
      }}>
        {graveyardCreatures.length === 0 ? (
          <div style={{
            width: '100%',
            textAlign: 'center',
            color: '#666',
            fontStyle: 'italic',
            padding: '20px'
          }}>
            No creatures in graveyard
          </div>
        ) : (
          graveyardCreatures.map((creature, idx) => {
            const canResurrect = gameState.hasGraveyardDeploy(creature)
            const isSelected = selectedGraveyardCreature?.id === creature.id
            const canAffordResurrection = canResurrectFromHere &&
              gameState.canResurrectCreature(currentPlayerId, creature)

            return (
              <div
                key={`${creature.id}-${idx}`}
                onClick={() => {
                  if (canResurrect && canResurrectFromHere && canAffordResurrection) {
                    onCreatureSelect && onCreatureSelect(creature, idx)
                  }
                }}
                draggable={canResurrect && canResurrectFromHere && canAffordResurrection && isSelected}
                onDragStart={(e) => {
                  if (canResurrect && canResurrectFromHere && canAffordResurrection && onDragStart) {
                    onDragStart(e, idx, creature, true) // true = from graveyard
                  }
                }}
                onDragEnd={onDragEnd}
                style={{
                  position: 'relative',
                  cursor: canResurrect && canResurrectFromHere ? 'pointer' : 'default',
                  opacity: canResurrect ? 1 : 0.5,
                  border: isSelected ? '3px solid #66bb6a' :
                          canResurrect ? '2px solid #4caf50' : '2px solid #444',
                  borderRadius: '8px',
                  boxShadow: isSelected ? '0 0 15px rgba(102, 187, 106, 0.6)' :
                            canResurrect ? '0 0 10px rgba(76, 175, 80, 0.3)' : 'none',
                  padding: '2px',
                  transition: 'all 0.2s ease'
                }}
              >
                <CreatureCard
                  creature={creature}
                  compact={true}
                  isSelected={false}
                  showHoverPopOut={false}
                />

                {/* Resurrection indicator for Zombies */}
                {canResurrect && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: canAffordResurrection ? '#4caf50' : '#ff9800',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>
                    &#128128;
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Info footer */}
      <div className="combat-info" style={{ marginTop: 'auto' }}>
        {canResurrectFromHere && (
          <>
            <div className="combat-info-row">
              <span>Resurrection Cost:</span>
              <Badge bg="warning" text="dark">1 Morale + Leadership</Badge>
            </div>
            <div className="combat-info-row">
              <span>Your Morale:</span>
              <Badge bg={selectedPlayer?.morale >= 1 ? 'success' : 'danger'}>
                {selectedPlayer?.morale || 0}
              </Badge>
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#888',
              textAlign: 'center',
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              Click a Zombie to select, then place on your starting zone
            </div>
          </>
        )}

        {!canResurrectFromHere && (
          <div style={{
            fontSize: '0.8rem',
            color: '#888',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            {!isOwnGraveyard
              ? `Viewing ${selectedPlayer?.faction}'s graveyard (read-only)`
              : !hasResurrectableCreatures
                ? 'Your graveyard (no resurrectable creatures)'
                : !isDeployPhase
                  ? 'Resurrection only available during Deploy phase'
                  : !isHumanTurn
                    ? 'Waiting for your turn...'
                    : 'Your graveyard'}
          </div>
        )}
      </div>
    </div>
  )
}

export default GraveyardPanel
