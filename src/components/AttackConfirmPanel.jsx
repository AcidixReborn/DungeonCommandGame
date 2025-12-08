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
 * @param {Object} gameState - Game state for ability detection (LIFE DRAIN, LIGHTNING BREATH, etc.)
 * @param {Function} onConfirm - Callback when attack is confirmed
 * @param {Function} onCancel - Callback when attack is cancelled
 * @param {Function} onLightningBreath - Callback when Lightning Breath is selected (optional)
 */
function AttackConfirmPanel({
  attacker,
  defender,
  attackInfo,
  defenderPlayerState,
  gameState,
  onConfirm,
  onCancel,
  onLightningBreath
}) {
  if (!attacker || !defender || !attackInfo) return null

  // O(1) - Calculate damage based on attack type
  // FLASHING BLADES and HIDDEN BLADE splash damage is always 10
  // CONFUSION GAZE uses Umber Hulk's melee damage (30)
  const isFlashingBlades = attackInfo.attackType === 'flashing_blades'
  const isHiddenBlade = attackInfo.attackType === 'hidden_blade'
  const isConfusionGaze = attackInfo.attackType === 'confusion_gaze'
  const isMeleeAttack = attackInfo.attackType === 'melee'

  const damage = isFlashingBlades || isHiddenBlade
    ? 10
    : isConfusionGaze
      ? attacker.creature.meleeAttack?.damage || 30
      : isMeleeAttack
        ? attacker.creature.meleeAttack?.damage || 0
        : attacker.creature.rangedAttack?.damage || 0

  // Check for LIFE DRAIN ability (Vampire Stalker) - only triggers on melee attacks with damage > 0
  const hasLifeDrain = gameState?.hasLifeDrain && gameState.hasLifeDrain(attacker)
  const lifeDrainApplies = hasLifeDrain && isMeleeAttack && damage > 0
  // Calculate potential healing (capped at missing HP)
  const maxHP = attacker.creature.hitPoints
  const currentHP = attacker.currentHP
  const potentialHeal = lifeDrainApplies ? Math.min(10, maxHP - currentHP) : 0

  // Check for LIGHTNING BREATH ability (Dracolich) - only on ranged attacks with 2+ valid targets
  const isRangedAttack = attackInfo.attackType === 'ranged'
  const canUseLightningBreath = isRangedAttack && gameState?.canUseLightningBreath && gameState.canUseLightningBreath(attacker)
  const lightningBreathDamage = canUseLightningBreath ? (gameState?.getLightningBreathDamage?.(attacker) || 20) : 0

  // Debug log for Lightning Breath availability
  if (isRangedAttack && gameState?.hasLightningBreath?.(attacker)) {
    console.log(`[AttackConfirmPanel] LIGHTNING BREATH check:`, {
      hasAbility: true,
      canUse: canUseLightningBreath,
      damage: lightningBreathDamage,
      attacker: attacker.creature.name
    })
  }

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
        {/* LIFE DRAIN preview - shows potential healing on melee damage */}
        {lifeDrainApplies && (
          <div className="combat-info-row" style={{ borderTop: '1px solid #444', paddingTop: '6px', marginTop: '6px' }}>
            <span style={{ color: '#4caf50' }}>LIFE DRAIN:</span>
            <span style={{ color: '#4caf50' }}>
              {potentialHeal > 0 ? (
                <>+{potentialHeal} HP ({currentHP} → {currentHP + potentialHeal})</>
              ) : (
                <>Already at max HP</>
              )}
            </span>
          </div>
        )}
        {lifeDrainApplies && (
          <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
            * Heals only if damage is dealt (blocked = no heal)
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="combat-actions">
        {!isFlashingBlades && !isHiddenBlade && !isConfusionGaze && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {/* Lightning Breath button - only show when ability is available and has 2+ targets */}
        {canUseLightningBreath && onLightningBreath && (
          <Button
            variant="info"
            size="sm"
            onClick={() => {
              console.log('[AttackConfirmPanel] LIGHTNING BREATH button clicked!')
              onLightningBreath(attacker, defender)
            }}
            title="Make up to 3 ranged attacks on different targets"
          >
            ⚡ Lightning Breath (3x{lightningBreathDamage} dmg)
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={onConfirm}>
          {isConfusionGaze ? '😵 Strike!' : isFlashingBlades ? '⚔️ Deal Splash Damage!' : isHiddenBlade ? '🗡️ Strike!' : isRangedAttack ? `🏹 Ranged Attack (${damage} dmg)` : '⚔️ Attack!'}
        </Button>
      </div>
    </div>
  )
}

export default AttackConfirmPanel
