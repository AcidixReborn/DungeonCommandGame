import { Button, Badge } from 'react-bootstrap'
import CreatureCard from './CreatureCard'
import './CombatPanel.css'

/**
 * AttackConfirmPanel - In-panel attack confirmation UI
 * Replaces the modal-based attack confirmation for better battlefield visibility
 *
 * Big O Complexity:
 * - Rendering: O(1) - constant time, just displaying props
 * - Damage calculation: O(1) - simple property access
 *
 * @param {CreatureInstance} attacker - The attacking creature
 * @param {CreatureInstance} defender - The target creature
 * @param {Object} attackInfo - Attack details { attackType: 'melee'|'ranged', creature, ... }
 * @param {Function} onConfirm - Callback when attack is confirmed
 * @param {Function} onCancel - Callback when attack is cancelled
 */
function AttackConfirmPanel({
  attacker,
  defender,
  attackInfo,
  defenderPlayerState,
  onConfirm,
  onCancel
}) {
  if (!attacker || !defender || !attackInfo) return null

  // O(1) - Calculate damage based on attack type
  // FLASHING BLADES and HIDDEN BLADE splash damage is always 10
  // CONFUSION GAZE uses Umber Hulk's melee damage (30)
  const isFlashingBlades = attackInfo.attackType === 'flashing_blades'
  const isHiddenBlade = attackInfo.attackType === 'hidden_blade'
  const isConfusionGaze = attackInfo.attackType === 'confusion_gaze'

  const damage = isFlashingBlades || isHiddenBlade
    ? 10
    : isConfusionGaze
      ? attacker.creature.meleeAttack?.damage || 30
      : attackInfo.attackType === 'melee'
        ? attacker.creature.meleeAttack?.damage || 0
        : attacker.creature.rangedAttack?.damage || 0

  return (
    <div className="combat-panel attack-confirm-panel">
      {/* Header */}
      <div className="combat-panel-header attack-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h5 style={{ margin: 0 }}>
          {isConfusionGaze ? '😵 CONFUSION GAZE' : isFlashingBlades ? '⚔️ FLASHING BLADES' : isHiddenBlade ? '🗡️ HIDDEN BLADE' : '⚔️ Confirm Attack'}
        </h5>
        {defenderPlayerState && <Badge bg="info">Target Morale: {defenderPlayerState.morale}</Badge>}
      </div>

      {/* Combat Creatures Display */}
      <div className="combat-creatures-display">
        {/* Attacker */}
        <div className="combat-creature-section attacker-section">
          <span className="combat-creature-label">Attacker</span>
          <div className="combat-creature-card">
            <CreatureCard creature={attacker.creature} compact={true} />
          </div>
          <span className="combat-creature-name">{attacker.creature.name}</span>
        </div>

        {/* VS Divider */}
        <div className="combat-vs-divider">
          <span>VS</span>
        </div>

        {/* Defender */}
        <div className="combat-creature-section defender-section">
          <span className="combat-creature-label">Target</span>
          <div className="combat-creature-card">
            <CreatureCard creature={defender.creature} compact={true} />
          </div>
          <span className="combat-creature-name">{defender.creature.name}</span>
        </div>
      </div>

      {/* Attack Info */}
      <div className="combat-info">
        <div className="combat-info-row">
          <span>Attack Type:</span>
          <Badge bg={isConfusionGaze ? 'warning' : isFlashingBlades || isHiddenBlade ? 'warning' : attackInfo.attackType === 'ranged' ? 'info' : 'danger'}>
            {isConfusionGaze ? '😵 Gaze Strike' : isFlashingBlades ? '⚔️ Splash' : isHiddenBlade ? '🗡️ Hidden Strike' : attackInfo.attackType === 'ranged' ? '🏹 Ranged' : '⚔️ Melee'}
          </Badge>
        </div>
        <div className="combat-info-row">
          <span>Damage:</span>
          <Badge bg="warning" text="dark">{damage}</Badge>
        </div>
        <div className="combat-info-row">
          <span>Target HP:</span>
          <span className="hp-display">
            {defender.currentHP}/{defender.creature.hitPoints}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="combat-actions">
        {!isFlashingBlades && !isHiddenBlade && !isConfusionGaze && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={onConfirm}>
          {isConfusionGaze ? '😵 Strike!' : isFlashingBlades ? '⚔️ Deal Splash Damage!' : isHiddenBlade ? '🗡️ Strike!' : '⚔️ Attack!'}
        </Button>
      </div>
    </div>
  )
}

export default AttackConfirmPanel
