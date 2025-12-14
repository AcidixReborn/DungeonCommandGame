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
  if (!attacker || !defender || !attackInfo) {
    return null
  }

  // O(1) - Calculate damage based on attack type
  // FLASHING BLADES and HIDDEN BLADE splash damage is always 10
  // CONFUSION GAZE uses Umber Hulk's melee damage (30)
  const isFlashingBlades = attackInfo.attackType === 'flashing_blades'
  const isHiddenBlade = attackInfo.attackType === 'hidden_blade'
  const isConfusionGaze = attackInfo.attackType === 'confusion_gaze'
  const isMeleeAttack = attackInfo.attackType === 'melee'

  // Check for FLANKING bonus (only on melee primary attacks)
  const flankingBonus = isMeleeAttack && gameState?.getFlankingBonus
    ? gameState.getFlankingBonus(attacker, defender)
    : 0

  // Check for CUTTER bonus (+10 vs tapped creatures)
  const cutterBonus = isMeleeAttack && gameState?.getCutterBonus
    ? gameState.getCutterBonus(attacker, defender)
    : 0

  const baseDamage = isFlashingBlades || isHiddenBlade
    ? 10
    : isConfusionGaze
      ? attacker.creature.meleeAttack?.damage || 30
      : isMeleeAttack
        ? attacker.creature.meleeAttack?.damage || 0
        : attacker.creature.rangedAttack?.damage || 0

  const damage = baseDamage + flankingBonus + cutterBonus

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

  // Check for MAGIC CIRCLE AURA passive (Hobgoblin Sorcerer on Magic Circle)
  // Prevents 10 damage from 1 source for Goblins/Hobgoblins/Bugbears (once per turn)
  // This is the FIRST damage reduction (before Shield Block)
  const magicCircleReduction = gameState?.hasMagicCircleProtection && gameState.hasMagicCircleProtection(defender)
    ? (gameState?.getMagicCircleDamageReduction ? 10 : 0) // Preview shows 10 if protected
    : 0
  const damageAfterMagicCircle = Math.max(0, damage - magicCircleReduction)

  // Check for SHIELD BLOCK passive (Dwarven Defender aura for adjacent Adventurers)
  // Note: This is a preview - actual reduction happens in CombatResolver
  const shieldBlockReduction = gameState?.getShieldBlockReduction
    ? gameState.getShieldBlockReduction(defender)
    : 0
  const damageAfterShieldBlock = Math.max(0, damageAfterMagicCircle - shieldBlockReduction)

  // Check for TAP ON HIT ability (Horned Devil, Wolf) - only on melee attacks
  const hasTapOnHit = gameState?.hasTapOnHit && gameState.hasTapOnHit(attacker)
  const tapOnHitApplies = hasTapOnHit && isMeleeAttack
  const defenderAlreadyTapped = defender?.isTapped

  // Check for REACH 2 attack (Horned Devil attacking from range 2)
  const isReachAttack = attackInfo?.isReachAttack || false
  const reachDistance = attackInfo?.reachDistance || attackInfo?.distance || 1

  // Check for DEATH STRIKE ability (Boar, Wereboar) - only on adjacent melee attacks that would kill
  // DEATH STRIKE triggers when defender would die, attack is melee, and attacker is truly adjacent (1 tile)
  const hasDeathStrike = gameState?.hasDeathStrike && gameState.hasDeathStrike(defender)
  const attackWouldKill = damageAfterShieldBlock >= defender.currentHP
  const isTrulyAdjacent = attackInfo?.distance === 1 || (!isReachAttack && isMeleeAttack)
  const deathStrikeApplies = hasDeathStrike && isMeleeAttack && isTrulyAdjacent && attackWouldKill
  const deathStrikeDamage = deathStrikeApplies ? (defender.creature.meleeAttack?.damage || 0) : 0

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
            <CreatureCard creature={attacker.creature} creatureInstance={attacker} compact={true} />
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
            <CreatureCard creature={defender.creature} creatureInstance={defender} compact={true} />
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
          {cutterBonus > 0 || flankingBonus > 0 ? (
            <span>
              <Badge bg="warning" text="dark">{baseDamage}</Badge>
              {flankingBonus > 0 && (
                <>
                  <span style={{ color: '#4caf50', marginLeft: '4px' }}>+{flankingBonus}</span>
                  <span style={{ color: '#888', marginLeft: '4px' }}>(FLANKING)</span>
                </>
              )}
              {cutterBonus > 0 && (
                <>
                  <span style={{ color: '#ff5722', marginLeft: '4px' }}>+{cutterBonus}</span>
                  <span style={{ color: '#888', marginLeft: '4px' }}>(CUTTER)</span>
                </>
              )}
              <span style={{ marginLeft: '4px' }}>=</span>
              <Badge bg="success" style={{ marginLeft: '4px' }}>{damage}</Badge>
            </span>
          ) : (
            <Badge bg="warning" text="dark">{damage}</Badge>
          )}
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
        {/* MAGIC CIRCLE AURA preview - shows damage reduction from Hobgoblin Sorcerer on Magic Circle */}
        {magicCircleReduction > 0 && (
          <div className="combat-info-row" style={{ borderTop: '1px solid #444', paddingTop: '6px', marginTop: '6px' }}>
            <span style={{ color: '#9932cc' }}>🔮 MAGIC CIRCLE AURA:</span>
            <span style={{ color: '#9932cc' }}>
              Block {magicCircleReduction} ({damage} → {damageAfterMagicCircle})
            </span>
          </div>
        )}
        {/* SHIELD BLOCK preview - shows damage reduction from adjacent Dwarven Defender */}
        {shieldBlockReduction > 0 && (
          <div className="combat-info-row" style={{ borderTop: '1px solid #444', paddingTop: '6px', marginTop: '6px' }}>
            <span style={{ color: '#2196f3' }}>SHIELD BLOCK:</span>
            <span style={{ color: '#2196f3' }}>
              Block {shieldBlockReduction} ({damageAfterMagicCircle} → {damageAfterShieldBlock})
            </span>
          </div>
        )}
        {/* REACH 2 indicator - shows when attacking from extended range */}
        {isReachAttack && (
          <div className="combat-info-row" style={{ borderTop: '1px solid #444', paddingTop: '6px', marginTop: '6px' }}>
            <span style={{ color: '#ff9800' }}>🗡️ REACH 2:</span>
            <span style={{ color: '#ff9800' }}>
              Attacking from range {reachDistance} (extended melee)
            </span>
          </div>
        )}
        {/* TAP ON HIT preview - shows that target will be tapped if damage is dealt */}
        {tapOnHitApplies && (
          <div className="combat-info-row" style={{ borderTop: '1px solid #444', paddingTop: '6px', marginTop: '6px' }}>
            <span style={{ color: '#e91e63' }}>💫 TAP ON HIT:</span>
            <span style={{ color: '#e91e63' }}>
              {defenderAlreadyTapped
                ? 'Target already tapped (no additional effect)'
                : 'Target will be TAPPED if damage is dealt'
              }
            </span>
          </div>
        )}
        {tapOnHitApplies && !defenderAlreadyTapped && (
          <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
            * Tap only occurs if target takes any damage (fully blocked = no tap)
          </div>
        )}
        {/* DEATH STRIKE warning - shows when attacking a creature that would die and has DEATH STRIKE */}
        {deathStrikeApplies && (
          <div className="combat-info-row" style={{
            borderTop: '2px solid #ff5722',
            paddingTop: '8px',
            marginTop: '8px',
            backgroundColor: 'rgba(255, 87, 34, 0.15)',
            padding: '8px',
            borderRadius: '4px'
          }}>
            <span style={{ color: '#ff5722', fontWeight: 'bold' }}>⚠️ DEATH STRIKE WARNING:</span>
          </div>
        )}
        {deathStrikeApplies && (
          <div style={{
            color: '#ff5722',
            fontSize: '0.9rem',
            marginTop: '4px',
            backgroundColor: 'rgba(255, 87, 34, 0.15)',
            padding: '8px',
            borderRadius: '4px'
          }}>
            This creature will deal <strong>{deathStrikeDamage} damage</strong> to your attacker before dying!
            {deathStrikeDamage >= attacker.currentHP && (
              <div style={{ color: '#ff1744', fontWeight: 'bold', marginTop: '4px' }}>
                ☠️ YOUR ATTACKER WILL DIE! ({attacker.creature.name}: {attacker.currentHP} HP)
              </div>
            )}
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
