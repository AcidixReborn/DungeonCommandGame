import { Modal, Button, Badge, Alert, Row, Col } from 'react-bootstrap'
import DeployConfirmPanel from './DeployConfirmPanel'
import DamageNotificationModal from './DamageNotificationModal'
import WebRemovalModal from './WebRemovalModal'
import HealingTouchModal from './HealingTouchModal'
import ChieftainCallModal from './ChieftainCallModal'
import OgreDeployMoraleModal from './OgreDeployMoraleModal'
import ClericDrawOrderModal from './ClericDrawOrderModal'
import CardsDrawnModal from './CardsDrawnModal'
import FactionSelectModal from './FactionSelectModal'
import ShiftDecisionModal from './ShiftDecisionModal'
import CounterAttackTargetModal from './CounterAttackTargetModal'
import PatchUpHealModal from './PatchUpHealModal'
import ToughAsNailsModal from './ToughAsNailsModal'
import DamageBoostModal from './DamageBoostModal'
import ShiftAttackModal from './ShiftAttackModal'
import ChargeModal from './ChargeModal'
import MoraleLossNotificationModal from './MoraleLossNotificationModal'
import HarmfulAttachmentsModal from './HarmfulAttachmentsModal'

/**
 * GameBoardModals - Modal orchestration layer for GameBoard.
 * Extracted from GameBoard.jsx (Phase E decomposition) - houses every modal
 * dialog the board can show (movement confirm, treasure, ability prompts,
 * damage/death notifications, etc.) in one place. Pure extraction, no logic
 * changes - same handlers/state passed through under the same names.
 */
function GameBoardModals({
  addToast,
  bonusDrawSources,
  cancelCharge,
  cancelCollectMorale,
  cancelDamageBoostAttack,
  cancelMove,
  cancelPatchUpHeal,
  cancelShiftAttack,
  cancelToughAsNails,
  cardsDrawnData,
  chargeConfig,
  checkHarmfulAttachments,
  checkPendingMoraleNotifications,
  chieftainCallPending,
  clericDrawOrderResult,
  confirmCharge,
  confirmCollectMorale,
  confirmDamageBoost,
  confirmMove,
  confirmShiftAttack,
  confusionGazePending,
  counterAttackPending,
  currentAiDeath,
  currentPlayer,
  damageBoostConfig,
  damageNotificationData,
  discoveredTreasure,
  executePatchUpHeal,
  executeToughAsNails,
  factionSelectConfig,
  flashingBladesPending,
  gameState,
  handleAiDeathModalDismiss,
  handleChieftainCallDecline,
  handleChieftainCallDeploy,
  handleConfusionGazeConfirm,
  handleConfusionGazeDecline,
  handleCounterAttackSkipped,
  handleCounterAttackTargetSelected,
  handleDamageNotificationDismiss,
  handleDeployCancel,
  handleDeployConfirm,
  handleFlashingBladesSkip,
  handleFlashingBladesUse,
  handleHealingTouchCancel,
  handleHealingTouchHeal,
  handleHealingTouchRemoveCard,
  handleHiddenBladeSkip,
  handleHiddenBladeUse,
  handleInsubstantialDismiss,
  handleKeepWeb,
  handleLightningBreathCancel,
  handleLightningBreathConfirm,
  handleNotAdjacentErrorDismiss,
  handleRemoveWeb,
  handleRiderDecline,
  handleRiderSelect,
  handleScrollbookUse,
  handleSellswordCard,
  handleSellswordMorale,
  handleShiftDecisionNo,
  handleShiftDecisionYes,
  handleSlamAccept,
  handleSlamConfirmCancel,
  handleSlamConfirmExecute,
  handleSlamSkip,
  harmfulAttachmentsData,
  healingTouchHealer,
  healingTouchTarget,
  hiddenBladePending,
  insubstantialData,
  lightningBreathAttacker,
  lightningBreathMode,
  lightningBreathTargets,
  magicCircleModalData,
  moraleLossModalData,
  notAdjacentErrorModal,
  ogreDeployMoraleResult,
  patchUpHealConfig,
  pendingCollection,
  pendingDeployment,
  pendingMove,
  pendingShiftAfterDefense,
  recoilDrawnCards,
  recoilSourceCardName,
  riderData,
  scrollbookCardIndex,
  selectedRiderCreature,
  sellswordPending,
  setBonusDrawSources,
  setHarmfulAttachmentsData,
  setHordeRefreshExecuted,
  setLightningBreathTargets,
  setRecoilDrawnCards,
  setRecoilSourceCardName,
  setRenderCounter,
  setScrollbookCardIndex,
  setSelectedBoardCreature,
  setSelectedRiderCreature,
  setSellswordPending,
  setShowCardsDrawnModal,
  setShowClericDrawOrderModal,
  setShowHarmfulAttachmentsModal,
  setShowHordeModal,
  setShowMagicCircleModal,
  setShowMoraleLossModal,
  setShowOgreDeployMoraleModal,
  setShowRecoilDrawModal,
  setShowScrollbookModal,
  setShowSellswordModal,
  setShowTreasureDiscovery,
  setShowVersatileActionModal,
  setValidAttackTargets,
  setValidMoveTiles,
  setVersatileActionPending,
  setVersatileDeclinedCreatures,
  shiftAttackConfig,
  showAiDeathModal,
  showCardsDrawnModal,
  showChargeModal,
  showChieftainCallModal,
  showClericDrawOrderModal,
  showCollectConfirm,
  showConfusionGazeModal,
  showCounterAttackTargetModal,
  showDamageBoostModal,
  showDamageNotification,
  showDeployConfirm,
  showFactionSelectModal,
  showFlashingBladesModal,
  showHarmfulAttachmentsModal,
  showHealingTouchModal,
  showHiddenBladeModal,
  showHordeModal,
  showInsubstantialModal,
  showMagicCircleModal,
  showMoraleLossModal,
  showMoveConfirm,
  showOgreDeployMoraleModal,
  showPatchUpHealModal,
  showRecoilDrawModal,
  showRiderModal,
  showScrollbookModal,
  showSellswordModal,
  showShiftAttackModal,
  showShiftDecisionModal,
  showSlamConfirmModal,
  showSlamModal,
  showToughAsNailsModal,
  showTreasureDiscovery,
  showVersatileActionModal,
  showWebRemovalModal,
  slamPending,
  slamSelectedTile,
  toughAsNailsConfig,
  versatileActionPending,
  webRemovalCreature,
}) {
  return (
    <>
      {/* Movement Confirmation Modal - positioned dynamically */}
      <Modal
        show={showMoveConfirm}
        onHide={cancelMove}
        dialogClassName="move-confirm-modal"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="py-2">
          <Modal.Title style={{ fontSize: '1rem', color: '#000' }}>Confirm Movement</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-2" style={{ color: '#000', fontSize: '0.9rem' }}>
          {pendingMove && (
            <div>
              <strong>{pendingMove.creature.creature.name}</strong> moves to{' '}
              <strong>
                ({pendingMove.destination.x}, {pendingMove.destination.y})
              </strong>
              <div style={{ marginTop: '0.5rem' }}>
                Cost:{' '}
                <Badge bg="warning" text="dark">
                  {pendingMove.cost}
                </Badge>{' '}
                / {pendingMove.creature.creature.speed}
              </div>
              {/* Water terrain warning - only show for creatures without flying/phasing immunity */}
              {pendingMove.destination.terrain === 'WATER' &&
                !gameState.hasFlying(pendingMove.creature) &&
                !gameState.hasPhasing(pendingMove.creature) && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      backgroundColor: '#fff3cd',
                      border: '2px solid #ff6b6b',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      ⚠️ Water Hazard Warning!
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#856404' }}>
                      This creature will take <strong>10 damage</strong> at the end of the ACTIVATE
                      phase if it remains on water.
                    </div>
                  </div>
                )}
              {/* Flying/Phasing creature on water - no damage */}
              {pendingMove.destination.terrain === 'WATER' &&
                (gameState.hasFlying(pendingMove.creature) ||
                  gameState.hasPhasing(pendingMove.creature)) && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      backgroundColor: '#d1ecf1',
                      border: '1px solid #bee5eb',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ color: '#0c5460', fontSize: '0.85rem' }}>
                      {gameState.hasFlying(pendingMove.creature) ? '✈️ Flying' : '👻 Phasing'}{' '}
                      creature - immune to water damage
                    </div>
                  </div>
                )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <Button variant="secondary" size="sm" onClick={cancelMove}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={confirmMove}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Treasure Discovery Modal */}
      <Modal
        show={showTreasureDiscovery}
        onHide={() => setShowTreasureDiscovery(false)}
        centered
        backdrop="static"
      >
        <Modal.Header
          closeButton
          style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)', color: '#000' }}
        >
          <Modal.Title style={{ fontSize: '1.2rem' }}>💎 Treasure Discovered!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ color: '#000', fontSize: '0.95rem' }}>
          {discoveredTreasure && (
            <div>
              <p>
                <strong>{discoveredTreasure.creature.creature.name}</strong> has discovered a
                treasure!
              </p>
              <div
                style={{
                  background: 'linear-gradient(135deg, #fff9e6 0%, #ffe6b3 100%)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #ffd700',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💎</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  Morale Available: {discoveredTreasure.treasure.getDisplayString()}
                </div>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
                <strong>Note:</strong> You can collect 1 morale per action.
                {discoveredTreasure.creature.isTapped
                  ? ' This creature is tapped and cannot collect morale until next turn.'
                  : ' Use the "Collect Morale" button to gather morale on your next action.'}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowTreasureDiscovery(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Morale Collection Confirmation Modal */}
      <Modal show={showCollectConfirm} onHide={cancelCollectMorale} centered backdrop="static">
        <Modal.Header
          closeButton
          style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)', color: '#000' }}
        >
          <Modal.Title style={{ fontSize: '1.2rem' }}>💎 Collect Morale?</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ color: '#000', fontSize: '0.95rem' }}>
          {pendingCollection && (
            <div>
              <p>
                <strong>{pendingCollection.creature.creature.name}</strong> will collect 1 morale
                from this treasure.
              </p>
              <div
                style={{
                  background: 'linear-gradient(135deg, #fff9e6 0%, #ffe6b3 100%)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #ffd700',
                  textAlign: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💎</div>
                <div style={{ fontSize: '1rem' }}>
                  Current: {pendingCollection.treasure.getDisplayString()}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                  After collection: {pendingCollection.treasure.remainingMorale - 1}/
                  {pendingCollection.treasure.moraleValue}
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                {pendingCollection.creature.hasMovedThisTurn ? (
                  <span style={{ color: '#d9534f' }}>
                    ⚠️ This creature will be TAPPED after collecting (moved + action).
                  </span>
                ) : (
                  <span style={{ color: '#5bc0de' }}>
                    ℹ️ This creature's ACTION will be used. Movement still available.
                  </span>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelCollectMorale}>
            No
          </Button>
          <Button variant="warning" onClick={confirmCollectMorale}>
            Yes, Collect Morale
          </Button>
        </Modal.Footer>
      </Modal>

      {/* SELLSWORD Ability Modal - Choose Morale or Order Card */}
      <Modal
        show={showSellswordModal}
        onHide={() => {
          setShowSellswordModal(false)
          setSellswordPending(null)
        }}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#8b008b', color: 'white' }}>
          <Modal.Title>⚔️ SELLSWORD - Choose Your Reward!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {sellswordPending && (
            <div>
              <p>
                <strong>{sellswordPending.creature.creature.name}</strong> is collecting treasure!
              </p>
              <p style={{ color: '#ffc107' }}>
                The Drow work for profit above all. Choose your reward:
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                  justifyContent: 'center',
                  marginTop: '15px',
                }}
              >
                <div
                  style={{
                    padding: '15px',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>💰</div>
                  <div style={{ fontWeight: 'bold' }}>+1 Morale</div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Standard treasure reward</div>
                </div>
                <div
                  style={{
                    padding: '15px',
                    border: '2px solid #17a2b8',
                    borderRadius: '8px',
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>📜</div>
                  <div style={{ fontWeight: 'bold' }}>Draw 1 Order Card</div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>More tactical options</div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="warning" size="lg" onClick={handleSellswordMorale}>
            💰 Take Morale
          </Button>
          <Button variant="info" size="lg" onClick={handleSellswordCard}>
            📜 Draw Card
          </Button>
        </Modal.Footer>
      </Modal>

      {/* DEPLOY CONFIRMATION Panel - Shows leadership cost before deploying creature */}
      {showDeployConfirm && pendingDeployment && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1050,
            minWidth: '300px',
          }}
        >
          <DeployConfirmPanel
            creature={pendingDeployment.creature}
            currentLeadershipUsage={
              gameState?.getCurrentPlayerState()?.getCurrentLeadershipUsage() || 0
            }
            maxLeadership={gameState?.getCurrentPlayerState()?.leadership || 0}
            isFromGraveyard={pendingDeployment.isFromGraveyard}
            currentMorale={gameState?.getCurrentPlayerState()?.morale || 0}
            onConfirm={handleDeployConfirm}
            onCancel={handleDeployCancel}
          />
        </div>
      )}

      {/* Click-away backdrop for deploy confirmation (transparent to prevent flash) */}
      {showDeployConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1049,
          }}
          onClick={handleDeployCancel}
        />
      )}

      {/* LIGHTNING BREATH Target Selection Panel */}
      {lightningBreathMode && lightningBreathAttacker && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1050,
            backgroundColor: '#1a1a2e',
            border: '2px solid #00bcd4',
            borderRadius: '8px',
            padding: '15px 25px',
            boxShadow: '0 0 20px rgba(0, 188, 212, 0.5)',
            minWidth: '350px',
            textAlign: 'center',
          }}
        >
          <h5 style={{ color: '#00bcd4', marginBottom: '10px' }}>
            ⚡ LIGHTNING BREATH - Target Selection
          </h5>
          <p style={{ color: 'white', marginBottom: '8px' }}>
            <strong>{lightningBreathAttacker.creature.name}</strong> is targeting:
          </p>
          <div style={{ marginBottom: '10px' }}>
            {lightningBreathTargets.map((target, idx) => (
              <Badge
                key={target.instanceId}
                bg="info"
                style={{ margin: '2px 4px', fontSize: '0.9rem', cursor: 'pointer' }}
                onClick={() => {
                  // Remove this target from selection
                  setLightningBreathTargets((prev) =>
                    prev.filter((t) => t.instanceId !== target.instanceId)
                  )
                  addToast(`Removed ${target.creature.name} from Lightning Breath targets`)
                }}
                title="Click to remove this target"
              >
                {idx + 1}. {target.creature.name} ✕
              </Badge>
            ))}
            {lightningBreathTargets.length < 3 && (
              <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '8px' }}>
                (Click targets to add/remove)
              </span>
            )}
          </div>
          <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '12px' }}>
            {lightningBreathTargets.length}/3 targets selected
            {lightningBreathTargets.length < 2 && ' (minimum 2 required)'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <Button
              variant="success"
              size="sm"
              onClick={handleLightningBreathConfirm}
              disabled={lightningBreathTargets.length < 2}
            >
              ⚡ Confirm Attack ({lightningBreathTargets.length} targets)
            </Button>
            <Button variant="secondary" size="sm" onClick={handleLightningBreathCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* FLASHING BLADES Ability Modal - Choose to use splash damage */}
      <Modal
        show={showFlashingBladesModal}
        onHide={handleFlashingBladesSkip}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#8b008b', color: 'white' }}>
          <Modal.Title>⚔️ FLASHING BLADES - Splash Damage!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {flashingBladesPending && (
            <div>
              <p>
                <strong>{flashingBladesPending.attacker.creature.name}</strong> can deal{' '}
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>10 damage</span> to an
                adjacent enemy!
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Valid targets:{' '}
                {flashingBladesPending.validTargets.map((t) => t.creature.name).join(', ')}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '10px' }}>
                Click "Use Ability" then right-click on a highlighted target to attack.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="danger" size="lg" onClick={handleFlashingBladesUse}>
            ⚔️ Use Ability
          </Button>
          <Button variant="secondary" size="lg" onClick={handleFlashingBladesSkip}>
            Skip
          </Button>
        </Modal.Footer>
      </Modal>

      {/* HIDDEN BLADE Ability Modal - Choose to strike adjacent tapped enemy */}
      <Modal show={showHiddenBladeModal} onHide={handleHiddenBladeSkip} centered backdrop="static">
        <Modal.Header style={{ backgroundColor: '#2d1f3d', color: 'white' }}>
          <Modal.Title>🗡️ HIDDEN BLADE - Strike from the Shadows!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {hiddenBladePending && (
            <div>
              <p>
                <strong>{hiddenBladePending.attacker.creature.name}</strong> can strike a{' '}
                <span style={{ color: '#ffc107', fontWeight: 'bold' }}>tapped</span> adjacent enemy
                for <span style={{ color: '#dc3545', fontWeight: 'bold' }}>10 damage</span>!
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Valid targets:{' '}
                {hiddenBladePending.validTargets.map((t) => t.creature.name).join(', ')}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '10px' }}>
                Click "Use Ability" then right-click on a highlighted target to attack.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="danger" size="lg" onClick={handleHiddenBladeUse}>
            🗡️ Use Ability
          </Button>
          <Button variant="secondary" size="lg" onClick={handleHiddenBladeSkip}>
            Skip
          </Button>
        </Modal.Footer>
      </Modal>

      {/* CONFUSION GAZE Ability Modal - Choose to use gaze attack */}
      <Modal
        show={showConfusionGazeModal}
        onHide={handleConfusionGazeDecline}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#4a0080', color: 'white' }}>
          <Modal.Title>😵 CONFUSION GAZE</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {confusionGazePending && (
            <div>
              <p>
                Use <strong>CONFUSION GAZE</strong> on{' '}
                <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                  {confusionGazePending.target.creature.name}
                </span>
                ?
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Slide the target up to <strong>3 squares</strong>, then make a{' '}
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>30 damage</span> attack.
              </p>
              <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '10px' }}>
                Note: You MUST complete an attack after the slide.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="warning" size="lg" onClick={handleConfusionGazeConfirm}>
            😵 Use CONFUSION GAZE
          </Button>
          <Button variant="secondary" size="lg" onClick={handleConfusionGazeDecline}>
            Normal Attack
          </Button>
        </Modal.Footer>
      </Modal>

      {/* NOT ADJACENT ERROR Modal - Target not in melee range for normal attack */}
      <Modal
        show={notAdjacentErrorModal.show}
        onHide={handleNotAdjacentErrorDismiss}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#dc3545', color: 'white' }}>
          <Modal.Title>⚠️ Target Not Adjacent</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          <div>
            <p>
              <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                {notAdjacentErrorModal.target?.creature?.name || 'Target'}
              </span>{' '}
              is not adjacent to{' '}
              <strong>{notAdjacentErrorModal.attacker?.creature?.name || 'your creature'}</strong>.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
              Normal melee attacks require the target to be in an adjacent tile.
            </p>
            {notAdjacentErrorModal.hasDamageBoost && (
              <p style={{ fontSize: '0.9rem', color: '#ffc107', marginTop: '10px' }}>
                💡 <strong>Tip:</strong> Use <strong>Confusion Gaze</strong> to attack distant
                enemies (up to 5 tiles away). The damage boost will still apply!
              </p>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center' }}>
          <Button variant="primary" onClick={handleNotAdjacentErrorDismiss}>
            Try Again
          </Button>
        </Modal.Footer>
      </Modal>

      {/* SLAM Decision Modal - Choose to slide the damaged creature */}
      <Modal show={showSlamModal} onHide={handleSlamSkip} centered backdrop="static">
        <Modal.Header style={{ backgroundColor: '#8B4513', color: 'white' }}>
          <Modal.Title>SLAM!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {slamPending && (
            <div>
              <p>
                <strong>{slamPending.attackerInstance.creature.name}</strong> can slam{' '}
                <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                  {slamPending.targetInstance.creature.name}
                </span>{' '}
                up to <strong>3 tiles</strong>!
              </p>
              <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
                Click <strong>Slide</strong> to choose where to slam the creature, or{' '}
                <strong>Skip</strong> to end your attack.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="warning" size="lg" onClick={handleSlamAccept}>
            Slide
          </Button>
          <Button variant="secondary" size="lg" onClick={handleSlamSkip}>
            Skip
          </Button>
        </Modal.Footer>
      </Modal>

      {/* SLAM Confirmation Modal - Confirm the selected destination */}
      <Modal
        show={showSlamConfirmModal}
        onHide={handleSlamConfirmCancel}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#8B4513', color: 'white' }}>
          <Modal.Title>Confirm Slam Location</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {slamPending && slamSelectedTile && (
            <div>
              <p>
                Slam{' '}
                <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                  {slamPending.targetInstance.creature.name}
                </span>{' '}
                to position{' '}
                <strong>
                  ({slamSelectedTile.x}, {slamSelectedTile.y})
                </strong>
                ?
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button variant="success" size="lg" onClick={handleSlamConfirmExecute}>
            Confirm
          </Button>
          <Button variant="secondary" size="lg" onClick={handleSlamConfirmCancel}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* VERSATILE Move as Action Confirmation Modal */}
      <Modal
        show={showVersatileActionModal}
        onHide={() => {
          setShowVersatileActionModal(false)
          setVersatileActionPending(null)
        }}
        centered
        backdrop="static"
      >
        <Modal.Header style={{ backgroundColor: '#0066cc', color: 'white' }}>
          <Modal.Title>🏃 VERSATILE - Move as Action</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {versatileActionPending && (
            <div>
              <p>
                <strong>{versatileActionPending.creature.name}</strong> has already moved this turn.
              </p>
              <p style={{ color: '#5bc0de' }}>
                Use your <strong>standard action</strong> to move again up to{' '}
                {versatileActionPending.creature.speed} tiles?
              </p>
              <p style={{ fontSize: '0.9rem', color: '#ffc107' }}>
                Warning: This will consume your action - you will NOT be able to attack after this
                move!
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer
          style={{
            backgroundColor: '#212529',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {/* ============================================
              NEW BUTTONS: Don't Use Ability, Decide Later, Move as Action
              O(1) Set operations for tracking declined creatures
              ============================================ */}

          {/* DON'T USE ABILITY - O(1) Set add, selects creature, won't show modal again this turn */}
          <Button
            variant="danger"
            onClick={() => {
              if (versatileActionPending) {
                // O(1) - Add to declined set so modal won't show again for this creature this turn
                setVersatileDeclinedCreatures((prev) =>
                  new Set(prev).add(versatileActionPending.id)
                )
                // Select the creature normally (allows Collect Morale, etc.)
                setSelectedBoardCreature(versatileActionPending)
                // Calculate valid moves (even though they've moved, show where they could go)
                const moves = gameState.getValidMovementTiles(versatileActionPending)
                setValidMoveTiles(moves)
                // Calculate valid attack targets
                const targets = gameState
                  .getValidAttackTargets(versatileActionPending)
                  .filter((target) => gameState.activePlayers.includes(target.creature.owner))
                setValidAttackTargets(targets)
                addToast(
                  `${versatileActionPending.creature.name} selected - Versatile ability declined for this turn.`
                )
              }
              setShowVersatileActionModal(false)
              setVersatileActionPending(null)
            }}
          >
            ❌ Don't Use Ability
          </Button>

          {/* DECIDE LATER - Selects creature, clicking again will re-show modal */}
          <Button
            variant="secondary"
            onClick={() => {
              if (versatileActionPending) {
                // Select the creature normally (allows seeing movement path)
                setSelectedBoardCreature(versatileActionPending)
                // Calculate valid moves
                const moves = gameState.getValidMovementTiles(versatileActionPending)
                setValidMoveTiles(moves)
                // Calculate valid attack targets
                const targets = gameState
                  .getValidAttackTargets(versatileActionPending)
                  .filter((target) => gameState.activePlayers.includes(target.creature.owner))
                setValidAttackTargets(targets)
                addToast(
                  `${versatileActionPending.creature.name} selected - Click again to use Versatile ability.`
                )
              }
              setShowVersatileActionModal(false)
              setVersatileActionPending(null)
            }}
          >
            🕐 Decide Later
          </Button>

          {/* MOVE AS ACTION - Original functionality */}
          <Button
            variant="primary"
            onClick={() => {
              // Enable movement mode for the creature
              if (versatileActionPending) {
                // Reset hasMovedThisTurn so they can move again
                versatileActionPending.hasMovedThisTurn = false
                // Mark that we're using versatile so completing move taps the creature
                versatileActionPending.usingVersatileMove = true
                // Set this creature as selected for movement
                setSelectedBoardCreature(versatileActionPending)
                const moves = gameState.getValidMovementTiles(versatileActionPending)
                setValidMoveTiles(moves)
                setValidAttackTargets([]) // Clear attack targets since using action to move
                addToast(
                  `VERSATILE: ${versatileActionPending.creature.name} can move again using their action!`
                )
              }
              setShowVersatileActionModal(false)
              setVersatileActionPending(null)
            }}
          >
            🏃 Move as Action
          </Button>
        </Modal.Footer>
      </Modal>

      {/* SCROLLBOOK Ability Modal - Discard order card to draw new one */}
      <Modal
        show={showScrollbookModal}
        onHide={() => {
          setShowScrollbookModal(false)
          setScrollbookCardIndex(null)
        }}
        centered
        backdrop="static"
      >
        <Modal.Header
          closeButton
          style={{ backgroundColor: '#17a2b8', color: 'white', borderBottom: '1px solid #138496' }}
        >
          <Modal.Title>📜 SCROLLBOOK</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {scrollbookCardIndex !== null && currentPlayer && (
            <div>
              <p>
                Discard{' '}
                <strong style={{ color: '#17a2b8' }}>
                  {currentPlayer.orderHand[scrollbookCardIndex]?.name}
                </strong>{' '}
                to draw a new Order card?
              </p>
              <p style={{ fontSize: '0.9rem', color: '#adb5bd' }}>
                This ability can only be used once per turn.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer
          style={{
            backgroundColor: '#212529',
            borderTop: '1px solid #444',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          <Button
            variant="secondary"
            onClick={() => {
              setShowScrollbookModal(false)
              setScrollbookCardIndex(null)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="info"
            onClick={() => {
              handleScrollbookUse(scrollbookCardIndex)
              setShowScrollbookModal(false)
              setScrollbookCardIndex(null)
            }}
          >
            📜 Use SCROLLBOOK
          </Button>
        </Modal.Footer>
      </Modal>

      {/* HORDE Ability Modal - Deploy During Refresh Phase */}
      <Modal
        show={showHordeModal}
        onHide={() => {
          // Don't allow closing without making a choice
        }}
        centered
        backdrop="static"
        size="lg"
      >
        <Modal.Header style={{ backgroundColor: '#cc0000', color: 'white' }}>
          <Modal.Title>⚔️ HORDE - Deploy During Refresh!</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {gameState &&
            (() => {
              const player = gameState.getCurrentPlayerState()
              const availableCreatures = player?.creatureHand || []
              const currentLeadership = player?.leadership || 0
              const usedLeadership =
                player?.creaturesInPlay?.reduce((sum, c) => sum + (c.creature?.level || 0), 0) || 0
              const availableLeadership = currentLeadership - usedLeadership

              return (
                <div>
                  <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                    Snig the Axe's HORDE ability lets you deploy creatures NOW!
                  </p>
                  <div
                    style={{
                      backgroundColor: '#1a1d21',
                      padding: '10px',
                      borderRadius: '5px',
                      marginBottom: '15px',
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>Leadership Available:</strong>{' '}
                      <span style={{ color: '#5bc0de', fontSize: '1.2rem' }}>
                        {availableLeadership}
                      </span>
                      <span style={{ color: '#888', marginLeft: '10px' }}>
                        ({usedLeadership} / {currentLeadership} used)
                      </span>
                    </p>
                  </div>

                  {availableCreatures.length > 0 ? (
                    <div>
                      <p>
                        <strong>Creatures in Hand:</strong>
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '10px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                        }}
                      >
                        {availableCreatures.map((creature, idx) => {
                          const canAfford = creature.level <= availableLeadership
                          return (
                            <div
                              key={idx}
                              style={{
                                backgroundColor: canAfford ? '#2d4a3e' : '#4a2d2d',
                                border: `2px solid ${canAfford ? '#5cb85c' : '#d9534f'}`,
                                borderRadius: '5px',
                                padding: '8px',
                                minWidth: '120px',
                                textAlign: 'center',
                              }}
                            >
                              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                {creature.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                Level: {creature.level}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: canAfford ? '#5cb85c' : '#d9534f',
                                }}
                              >
                                {canAfford ? '✓ Can Deploy' : '✗ Too Expensive'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p style={{ marginTop: '15px', color: '#ffc107', fontSize: '0.9rem' }}>
                        Close this window to deploy creatures by clicking/dragging them to your
                        starting zone.
                      </p>
                    </div>
                  ) : (
                    <p style={{ color: '#888' }}>No creatures in hand to deploy.</p>
                  )}

                  <div
                    style={{
                      marginTop: '15px',
                      padding: '10px',
                      backgroundColor: '#3d2b1f',
                      borderRadius: '5px',
                      borderLeft: '4px solid #ffc107',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#ffc107' }}>
                      <strong>Note:</strong> Creatures deployed during REFRESH phase will NOT be
                      protected from attacks once your ACTIVATE phase begins!
                    </p>
                  </div>
                </div>
              )
            })()}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#212529', justifyContent: 'center', gap: '20px' }}>
          <Button
            variant="warning"
            onClick={() => {
              setShowHordeModal(false)
            }}
          >
            📦 Deploy Creatures
          </Button>
          <Button
            variant="success"
            onClick={() => {
              // Clear any deployment protection for creatures deployed this refresh
              // (they should NOT be protected since it's their own turn)
              const player = gameState.getCurrentPlayerState()
              player.creaturesInPlay.forEach((creature) => {
                if (creature.deployedThisTurn && creature.turnDeployed === gameState.turnNumber) {
                  creature.clearDeploymentProtection()
                }
              })

              // Advance to ACTIVATE phase
              setShowHordeModal(false)
              setHordeRefreshExecuted(false)
              gameState.advancePhase()
              setRenderCounter((prev) => prev + 1)
            }}
          >
            ✓ Done Deploying
          </Button>
        </Modal.Footer>
      </Modal>

      {/* DISCIPLE OF KYUSS DAMAGE NOTIFICATION MODAL */}
      <DamageNotificationModal
        show={showDamageNotification}
        onDismiss={handleDamageNotificationDismiss}
        mode={damageNotificationData?.mode || 'ability'}
        abilityName={damageNotificationData?.abilityName}
        sourceCreature={damageNotificationData?.sourceCreature}
        damageEvents={damageNotificationData?.damageEvents || []}
      />

      {/* AI COMBAT DEATH NOTIFICATION MODAL */}
      <DamageNotificationModal
        show={showAiDeathModal}
        onDismiss={handleAiDeathModalDismiss}
        mode="combat"
        attackerInstance={currentAiDeath?.attackerInstance}
        defenderInstance={currentAiDeath?.defenderInstance}
        damageDealt={currentAiDeath?.damageDealt}
        attackType={currentAiDeath?.attackType}
        abilitiesTriggered={currentAiDeath?.abilitiesTriggered || []}
        moraleChanges={currentAiDeath?.moraleChanges}
      />

      {/* WEB REMOVAL MODAL - Human player can remove web from their own creature */}
      <WebRemovalModal
        show={showWebRemovalModal}
        onKeepWeb={handleKeepWeb}
        onRemoveWeb={handleRemoveWeb}
        creatureInstance={webRemovalCreature}
      />

      {/* HEALING TOUCH MODAL - Dwarf Cleric can heal self/ally or remove attached cards */}
      <HealingTouchModal
        show={showHealingTouchModal}
        onHeal={handleHealingTouchHeal}
        onRemoveCard={handleHealingTouchRemoveCard}
        onCancel={handleHealingTouchCancel}
        healerInstance={healingTouchHealer}
        targetInstance={healingTouchTarget}
      />

      {/* CHIEFTAIN CALL MODAL - Orc Chieftain's on-deploy ability */}
      <ChieftainCallModal
        show={showChieftainCallModal}
        onDeploy={handleChieftainCallDeploy}
        onDecline={handleChieftainCallDecline}
        chieftainInstance={chieftainCallPending?.chieftainInstance}
        eligibleOrcs={chieftainCallPending?.eligibleOrcs || []}
        gameState={gameState}
      />

      {/* OGRE DEPLOY MORALE MODAL - Ogre's on-deploy ability (+1 morale) */}
      <OgreDeployMoraleModal
        show={showOgreDeployMoraleModal}
        onDismiss={() => setShowOgreDeployMoraleModal(false)}
        result={ogreDeployMoraleResult}
      />

      {/* ORC CLERIC DRAW ORDER MODAL - Orc Cleric of Gruumsh's on-deploy ability (draw 1 Order card) */}
      <ClericDrawOrderModal
        show={showClericDrawOrderModal}
        onDismiss={() => setShowClericDrawOrderModal(false)}
        result={clericDrawOrderResult}
      />

      {/* CARDS DRAWN MODAL - Shows cards drawn at start of ACTIVATE phase */}
      <CardsDrawnModal
        show={showCardsDrawnModal}
        cards={cardsDrawnData}
        bonusSources={bonusDrawSources}
        onContinue={() => {
          setShowCardsDrawnModal(false)
          // Clear the drawn cards tracking after showing the modal
          const player = gameState?.getCurrentPlayerState()
          if (player) {
            player.cardsDrawnThisTurn = []
            player.bonusDrawSourcesThisTurn = []
          }
          setBonusDrawSources([])
          // Check for harmful attachments first (Deep Wound, Web, etc.)
          // If no harmful attachments, then check morale notifications
          if (!checkHarmfulAttachments()) {
            checkPendingMoraleNotifications()
          }
        }}
      />

      {/* RECOIL DRAW MODAL - Shows when attacker draws a card from Recoil side effect */}
      <CardsDrawnModal
        show={showRecoilDrawModal}
        cards={recoilDrawnCards}
        title="You Drew a Card!"
        reason={`Opponent used ${recoilSourceCardName} - you draw 1 card as a side effect`}
        onContinue={() => {
          setShowRecoilDrawModal(false)
          setRecoilDrawnCards([])
          setRecoilSourceCardName('')
        }}
      />

      {/* FACTION SELECT MODAL - Shows when defender uses Recoil with 3+ factions */}
      <FactionSelectModal
        show={showFactionSelectModal}
        title={factionSelectConfig.title}
        description={factionSelectConfig.description}
        eligibleFactions={factionSelectConfig.eligibleFactions}
        onSelect={factionSelectConfig.onSelect}
        onCancel={null}
      />

      {/* CLOUD OF BATS SHIFT DECISION MODAL */}
      <ShiftDecisionModal
        show={showShiftDecisionModal}
        cardName={pendingShiftAfterDefense?.cardName || 'Cloud of Bats'}
        shiftDistance={pendingShiftAfterDefense?.maxShift || 6}
        creatureName={pendingShiftAfterDefense?.creature?.creature?.name || 'creature'}
        onYes={handleShiftDecisionYes}
        onNo={handleShiftDecisionNo}
      />

      {/* COUNTER-ATTACK TARGET SELECTION MODAL (Seize the Opportunity) */}
      <CounterAttackTargetModal
        show={showCounterAttackTargetModal}
        onSelectTarget={handleCounterAttackTargetSelected}
        onSkip={handleCounterAttackSkipped}
        counterAttackData={counterAttackPending}
      />

      {/* PATCH UP HEAL MODAL (proactive healing during ACTIVATE phase) */}
      <PatchUpHealModal
        show={showPatchUpHealModal}
        card={patchUpHealConfig?.card}
        creature={patchUpHealConfig?.creature}
        healAmount={patchUpHealConfig?.healAmount || 0}
        onConfirm={executePatchUpHeal}
        onCancel={cancelPatchUpHeal}
      />

      {/* TOUGH AS NAILS MODAL (proactive use during ACTIVATE phase) */}
      <ToughAsNailsModal
        show={showToughAsNailsModal}
        card={toughAsNailsConfig?.card}
        creature={toughAsNailsConfig?.creature}
        onConfirm={executeToughAsNails}
        onCancel={cancelToughAsNails}
      />

      {/* DAMAGE BOOST MODAL (Power Attack, Hacking Frenzy, Killing Strike) */}
      <DamageBoostModal
        show={showDamageBoostModal}
        card={damageBoostConfig?.card}
        creature={damageBoostConfig?.creature}
        onConfirm={confirmDamageBoost}
        onCancel={cancelDamageBoostAttack}
      />

      {/* SHIFT + ATTACK MODAL (Nimble Strike, Spring Attack, Shadowy Ambush) */}
      <ShiftAttackModal
        show={showShiftAttackModal}
        card={shiftAttackConfig?.card}
        creature={shiftAttackConfig?.creature}
        onConfirm={confirmShiftAttack}
        onCancel={cancelShiftAttack}
      />

      {/* CHARGE MODAL (Phase STD-5 - Move + Attack) */}
      <ChargeModal
        show={showChargeModal}
        card={chargeConfig?.card}
        creature={chargeConfig?.creature}
        onConfirm={confirmCharge}
        onCancel={cancelCharge}
      />

      {/* MORALE LOSS NOTIFICATION MODAL (Unexpected Resistance) */}
      <MoraleLossNotificationModal
        show={showMoraleLossModal}
        data={moraleLossModalData}
        onClose={() => {
          setShowMoraleLossModal(false)
          // Check for more pending morale notifications
          checkPendingMoraleNotifications()
        }}
      />

      {/* HARMFUL ATTACHMENTS NOTIFICATION MODAL (Deep Wound, Web, Mortal Wound, Shattered Weapon) */}
      <HarmfulAttachmentsModal
        show={showHarmfulAttachmentsModal}
        attachmentEffects={harmfulAttachmentsData}
        onContinue={() => {
          setShowHarmfulAttachmentsModal(false)
          setHarmfulAttachmentsData(null)
          // After harmful attachments modal, check for morale notifications
          checkPendingMoraleNotifications()
        }}
      />

      {/* INSUBSTANTIAL ABILITY NOTIFICATION MODAL */}
      <Modal
        show={showInsubstantialModal}
        onHide={handleInsubstantialDismiss}
        centered
        size="lg"
        backdrop="static"
        className="damage-notification-modal"
      >
        <Modal.Header
          style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #17a2b8' }}
        >
          <Modal.Title>
            <span style={{ color: '#17a2b8' }}>👻</span> INSUBSTANTIAL
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {insubstantialData && (
            <>
              {/* Defender creature card */}
              <div className="text-center mb-3">
                {insubstantialData.defenderInstance?.creature?.imageUrl && (
                  <img
                    src={insubstantialData.defenderInstance.creature.imageUrl}
                    alt={insubstantialData.defenderInstance.creature.name}
                    className="damage-modal-creature-img"
                    style={{ maxHeight: '200px', borderRadius: '8px', border: '2px solid #17a2b8' }}
                  />
                )}
                <div className="mt-2">
                  <strong>{insubstantialData.defenderInstance?.creature?.name}</strong>
                  <Badge bg="info" className="ms-2">
                    INSUBSTANTIAL
                  </Badge>
                </div>
              </div>

              {/* Damage blocked alert */}
              <Alert variant="info" className="mb-3 text-center">
                <div style={{ fontSize: '1.2rem' }}>
                  <strong>💨 {insubstantialData.damageBlocked} damage blocked!</strong>
                </div>
                <div className="mt-2">
                  {insubstantialData.defenderInstance?.creature?.name} became insubstantial, phasing
                  through the attack from{' '}
                  {insubstantialData.attackerInstance?.creature?.name || 'the enemy'}!
                </div>
              </Alert>

              {/* Warning about ability reset */}
              <Alert variant="warning" className="mb-0">
                <strong>⚠️ Note:</strong> INSUBSTANTIAL will not be available again until the next{' '}
                <strong>Curse of Undeath Refresh Phase</strong>.
              </Alert>
            </>
          )}
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
          <Button variant="primary" onClick={handleInsubstantialDismiss} size="lg">
            Continue
          </Button>
        </Modal.Footer>
      </Modal>

      {/* RIDER ABILITY MODAL - Deploy Skeleton creature from hand */}
      <Modal
        show={showRiderModal}
        onHide={() => {}} // Prevent closing without choice
        centered
        size="lg"
        backdrop="static"
        className="damage-notification-modal"
      >
        <Modal.Header
          style={{ backgroundColor: '#212529', color: 'white', borderBottom: '2px solid #6c757d' }}
        >
          <Modal.Title>
            <span style={{ color: '#adb5bd' }}>🐴</span> RIDER - Deploy Replacement Creature
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {riderData &&
            (() => {
              const riderOwner = gameState?.players[riderData.ownerPlayerId]
              const currentLeadership = riderOwner?.leadership || 0
              const currentMorale = riderOwner?.morale || 0
              // Faction-specific creature type text
              const creatureTypeText =
                riderData.faction === 'Tyranny of Goblins' ? 'Goblin or Wolf' : 'Skeleton'
              return (
                <>
                  {/* Explanation Alert */}
                  <Alert
                    variant="info"
                    style={{ backgroundColor: '#1a4a6e', border: 'none', color: 'white' }}
                  >
                    <strong>{riderData.destroyedCreature}</strong> was destroyed!
                    <br />
                    You may deploy a {creatureTypeText} creature (Level 3 or lower) from your hand
                    to tile ({riderData.position?.x}, {riderData.position?.y}).
                  </Alert>

                  {/* Current Player Stats */}
                  <div
                    style={{
                      backgroundColor: '#1a1d21',
                      padding: '12px 15px',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      display: 'flex',
                      justifyContent: 'space-around',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#ffc107', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {currentLeadership}
                      </div>
                      <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Current Leadership</div>
                    </div>
                    <div style={{ borderLeft: '1px solid #444', height: '40px' }}></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#dc3545', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {currentMorale}
                      </div>
                      <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Current Morale</div>
                    </div>
                  </div>

                  {/* Creature Selection Cards */}
                  <p className="mb-3">
                    <strong>Select a {creatureTypeText} to deploy:</strong>
                  </p>
                  <Row className="g-3 justify-content-center">
                    {riderData.eligibleCreatures.map((creature, index) => {
                      const moraleCost = riderData.creatureLevel - creature.level
                      const isSelected = selectedRiderCreature?.id === creature.id
                      return (
                        <Col key={index} xs={12} sm={6} md={4}>
                          <div
                            onClick={() => setSelectedRiderCreature(creature)}
                            style={{
                              cursor: 'pointer',
                              padding: '15px',
                              border: isSelected ? '3px solid #28a745' : '2px solid #6c757d',
                              borderRadius: '10px',
                              backgroundColor: isSelected
                                ? 'rgba(40, 167, 69, 0.2)'
                                : 'rgba(255,255,255,0.05)',
                              textAlign: 'center',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 0 15px rgba(40, 167, 69, 0.5)' : 'none',
                            }}
                          >
                            {/* Creature Image */}
                            {creature.imageUrl && (
                              <img
                                src={creature.imageUrl}
                                alt={creature.name}
                                style={{
                                  maxHeight: '150px',
                                  maxWidth: '100%',
                                  borderRadius: '6px',
                                  marginBottom: '10px',
                                  border: '1px solid #555',
                                }}
                              />
                            )}

                            {/* Creature Name & Level */}
                            <div>
                              <strong>{creature.name}</strong>
                            </div>
                            <Badge bg="secondary" className="mt-1">
                              Level {creature.level}
                            </Badge>

                            {/* Stats Display */}
                            <div
                              style={{
                                marginTop: '10px',
                                padding: '8px',
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                borderRadius: '5px',
                              }}
                            >
                              <div>
                                <small>
                                  HP: {creature.hitPoints} | Speed: {creature.speed}
                                </small>
                              </div>
                              <div>
                                <small>Melee: {creature.meleeAttack?.damage || 'N/A'}</small>
                              </div>
                              <div
                                style={{ color: '#ffc107', marginTop: '5px', fontWeight: 'bold' }}
                              >
                                Leadership: {creature.level}
                              </div>
                              <div style={{ color: '#dc3545', fontWeight: 'bold' }}>
                                Morale cost: {moraleCost}
                              </div>
                              <div style={{ color: '#28a745', fontSize: '0.85rem' }}>
                                (Save {riderData.creatureLevel - moraleCost} morale vs full loss)
                              </div>
                            </div>
                          </div>
                        </Col>
                      )
                    })}
                  </Row>
                </>
              )
            })()}
        </Modal.Body>

        <Modal.Footer
          style={{
            backgroundColor: '#212529',
            borderTop: '1px solid #444',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ color: '#dc3545', fontSize: '0.9rem' }}>
              Declining = full {riderData?.creatureLevel || 4} morale loss
            </span>
          </div>
          <div>
            <Button variant="secondary" onClick={handleRiderDecline} className="me-2">
              Decline RIDER
            </Button>
            <Button
              variant="success"
              onClick={() => selectedRiderCreature && handleRiderSelect(selectedRiderCreature)}
              disabled={!selectedRiderCreature}
            >
              Deploy {selectedRiderCreature?.name || 'Creature'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* MAGIC CIRCLE AURA MODAL - Notification when Hobgoblin Sorcerer enters/leaves Magic Circle */}
      <Modal
        show={showMagicCircleModal}
        onHide={() => setShowMagicCircleModal(false)}
        centered
        size="md"
        backdrop="static"
        className="damage-notification-modal"
      >
        <Modal.Header
          closeButton
          style={{
            backgroundColor: '#212529',
            color: 'white',
            borderBottom: '2px solid #9932cc',
          }}
        >
          <Modal.Title>
            <span style={{ color: '#9932cc' }}>🔮</span> Magic Circle Aura
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#2c2f33', color: 'white' }}>
          {magicCircleModalData && (
            <>
              {magicCircleModalData.activated && (
                <Alert
                  variant="success"
                  style={{ backgroundColor: '#1a4a3a', border: 'none', color: 'white' }}
                >
                  <strong>{magicCircleModalData.sorcererName}</strong> has entered a Magic Circle!
                  <br />
                  <br />
                  <strong>All Goblins, Hobgoblins, and Bugbears</strong> controlled by{' '}
                  {magicCircleModalData.sorcererOwner === gameState?.currentPlayer
                    ? 'you'
                    : 'the opponent'}{' '}
                  now gain:
                  <br />
                  <span style={{ color: '#9932cc', fontWeight: 'bold', fontSize: '1.1em' }}>
                    "Prevent 10 damage from 1 source" (once per turn)
                  </span>
                </Alert>
              )}

              {magicCircleModalData.deactivated && magicCircleModalData.reason === 'left' && (
                <Alert
                  variant="warning"
                  style={{ backgroundColor: '#4a3a1a', border: 'none', color: 'white' }}
                >
                  <strong>{magicCircleModalData.sorcererName}</strong> has left the Magic Circle!
                  <br />
                  <br />
                  The <strong>Magic Circle Aura</strong> protection has ended for{' '}
                  {magicCircleModalData.sorcererOwner === gameState?.currentPlayer
                    ? 'your'
                    : "the opponent's"}{' '}
                  Goblin faction creatures.
                </Alert>
              )}

              {magicCircleModalData.deactivated && magicCircleModalData.reason === 'death' && (
                <Alert
                  variant="danger"
                  style={{ backgroundColor: '#4a1a1a', border: 'none', color: 'white' }}
                >
                  <strong>{magicCircleModalData.sorcererName}</strong> was destroyed while on the
                  Magic Circle!
                  <br />
                  <br />
                  The <strong>Magic Circle Aura</strong> protection has ended immediately for{' '}
                  {magicCircleModalData.sorcererOwner === gameState?.currentPlayer
                    ? 'your'
                    : "the opponent's"}{' '}
                  Goblin faction creatures.
                </Alert>
              )}

              {magicCircleModalData.reason?.startsWith('ai_') && (
                <Alert
                  variant="info"
                  style={{ backgroundColor: '#1a4a6e', border: 'none', color: 'white' }}
                >
                  <strong>Opponent's {magicCircleModalData.sorcererName}</strong>{' '}
                  {magicCircleModalData.activated ? 'entered' : 'left'} a Magic Circle!
                  <br />
                  <br />
                  {magicCircleModalData.activated ? (
                    <>
                      All enemy <strong>Goblins, Hobgoblins, and Bugbears</strong> now have:
                      <br />
                      <span style={{ color: '#9932cc', fontWeight: 'bold' }}>
                        "Prevent 10 damage from 1 source" (once per turn)
                      </span>
                    </>
                  ) : (
                    <>
                      The enemy's <strong>Magic Circle Aura</strong> protection has ended.
                    </>
                  )}
                </Alert>
              )}

              {/* Human player moved Sorcerer - notification for OTHER human players */}
              {magicCircleModalData.reason?.startsWith('human_') && (
                <Alert
                  variant="info"
                  style={{ backgroundColor: '#1a4a6e', border: 'none', color: 'white' }}
                >
                  <strong>
                    {magicCircleModalData.sorcererOwner === gameState?.currentPlayer
                      ? 'Your'
                      : "Opponent's"}{' '}
                    {magicCircleModalData.sorcererName}
                  </strong>{' '}
                  {magicCircleModalData.activated ? 'entered' : 'left'} a Magic Circle!
                  <br />
                  <br />
                  {magicCircleModalData.activated ? (
                    <>
                      All{' '}
                      {magicCircleModalData.sorcererOwner === gameState?.currentPlayer
                        ? ''
                        : 'enemy '}
                      <strong>Goblins, Hobgoblins, and Bugbears</strong> now have:
                      <br />
                      <span style={{ color: '#9932cc', fontWeight: 'bold' }}>
                        "Prevent 10 damage from 1 source" (once per turn)
                      </span>
                    </>
                  ) : (
                    <>
                      The{' '}
                      {magicCircleModalData.sorcererOwner === gameState?.currentPlayer
                        ? ''
                        : "enemy's "}
                      <strong>Magic Circle Aura</strong> protection has ended.
                    </>
                  )}
                </Alert>
              )}

              {/* Ability Description */}
              <div
                style={{
                  backgroundColor: '#1a1d21',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  marginTop: '15px',
                  fontSize: '0.9em',
                  color: '#aaa',
                }}
              >
                <strong style={{ color: '#9932cc' }}>Magic Circle Aura:</strong> While the Hobgoblin
                Sorcerer is on a Magic Circle, all Goblins, Hobgoblins, and Bugbears controlled by
                the same player can prevent 10 damage from a single attack once per turn. This
                shield refreshes at the start of each turn.
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: '#212529', borderTop: '1px solid #444' }}>
          <Button variant="primary" onClick={() => setShowMagicCircleModal(false)} size="lg">
            Understood
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default GameBoardModals
