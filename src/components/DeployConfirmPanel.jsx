import { Button, Badge } from 'react-bootstrap'
import CreatureCard from './CreatureCard'
import './CombatPanel.css'

/**
 * DeployConfirmPanel - In-panel deployment confirmation UI
 * Shows leadership cost and confirms creature deployment
 *
 * Big O Complexity:
 * - Rendering: O(1) - constant time, just displaying props
 * - Leadership calculation: O(1) - simple arithmetic
 *
 * @param {Object} creature - The creature card to deploy
 * @param {number} currentLeadershipUsage - Current leadership being used
 * @param {number} maxLeadership - Maximum leadership available
 * @param {boolean} isFromGraveyard - Whether deploying from graveyard (costs morale)
 * @param {number} currentMorale - Current morale (for graveyard deploys)
 * @param {Function} onConfirm - Callback when deployment is confirmed
 * @param {Function} onCancel - Callback when deployment is cancelled
 */
function DeployConfirmPanel({
  creature,
  currentLeadershipUsage,
  maxLeadership,
  isFromGraveyard = false,
  currentMorale = 0,
  onConfirm,
  onCancel
}) {
  if (!creature) return null

  // O(1) - Calculate leadership cost (creature level = leadership cost)
  const leadershipCost = creature.level
  const leadershipAfter = currentLeadershipUsage + leadershipCost
  const canAffordLeadership = leadershipAfter <= maxLeadership

  // For graveyard deploys (Zombie), also check morale cost
  const moraleCost = isFromGraveyard ? 1 : 0
  const canAffordMorale = !isFromGraveyard || currentMorale >= moraleCost
  const canDeploy = canAffordLeadership && canAffordMorale

  return (
    <div className="combat-panel deploy-confirm-panel">
      {/* Header */}
      <div className="combat-panel-header deploy-header" style={{ backgroundColor: '#2d5a27' }}>
        <h5 style={{ margin: 0 }}>
          {isFromGraveyard ? '💀 Deploy from Graveyard' : '📦 Deploy Creature'}
        </h5>
      </div>

      {/* Creature Display */}
      <div className="combat-creatures-display" style={{ justifyContent: 'center' }}>
        <div className="combat-creature-section">
          <span className="combat-creature-label">Deploying</span>
          <div className="combat-creature-card">
            <CreatureCard creature={creature} compact={true} />
          </div>
          <span className="combat-creature-name">{creature.name}</span>
        </div>
      </div>

      {/* Leadership Info */}
      <div className="combat-info">
        <div className="combat-info-row">
          <span>Leadership Cost:</span>
          <Badge bg="primary">{leadershipCost}</Badge>
        </div>
        <div className="combat-info-row">
          <span>Current Usage:</span>
          <span>{currentLeadershipUsage} / {maxLeadership}</span>
        </div>
        <div className="combat-info-row">
          <span>After Deploy:</span>
          <Badge bg={canAffordLeadership ? 'success' : 'danger'}>
            {leadershipAfter} / {maxLeadership}
          </Badge>
        </div>
        {isFromGraveyard && (
          <>
            <hr style={{ margin: '8px 0', borderColor: '#555' }} />
            <div className="combat-info-row">
              <span>Morale Cost:</span>
              <Badge bg="warning" text="dark">{moraleCost}</Badge>
            </div>
            <div className="combat-info-row">
              <span>Current Morale:</span>
              <Badge bg={canAffordMorale ? 'info' : 'danger'}>
                {currentMorale}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="combat-actions">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="success"
          size="sm"
          onClick={onConfirm}
          disabled={!canDeploy}
        >
          {isFromGraveyard ? '💀 Resurrect!' : '📦 Deploy!'}
        </Button>
      </div>
    </div>
  )
}

export default DeployConfirmPanel
