import BoardTile from './BoardTile'

/**
 * BoardGridArea - Renders the battlefield grid (left side of the board).
 * Extracted from GameBoard.jsx (Phase E decomposition) - computes all the
 * per-tile highlight flags (movement, attack targets, ability targeting modes,
 * deployment highlights, ranged LOS) and renders one BoardTile per cell.
 */
function BoardGridArea({
  gameState,
  getTileCreature,
  validMoveTiles,
  creatureViewMode,
  validAttackTargets,
  flashingBladesTargetMode,
  flashingBladesPending,
  hiddenBladeTargetMode,
  hiddenBladePending,
  confusionGazeMode,
  confusionGazePending,
  slamMode,
  slamValidTiles,
  attackSlideMode,
  attackSlideValidTiles,
  shiftSelectionMode,
  shiftValidTiles,
  shiftAttackMode,
  pendingShiftAttack,
  shiftAttackValidTiles,
  chargeMode,
  pendingChargeAttack,
  chargeValidTiles,
  lightningBreathMode,
  lightningBreathValidTargets,
  lightningBreathTargets,
  selectedBoardCreature,
  rangedRangeTiles,
  lineOfSightPath,
  combatHighlightCreatures,
  selectedCreatureIndex,
  canDeployInCurrentPhase,
  playerFactionColors,
  allRangedLOSTiles,
  orderCardTargetingMode,
  orderCardValidTargets,
  handleTileClick,
  handleTileRightClick,
  handleDrop,
  handleDragOver,
  dragOverTile,
  playerFactions,
  factionHighlight,
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div className="board-grid" style={{ flex: 1 }}>
        {Array.from({ length: gameState.boardHeight }).map((_, y) => (
          <div key={y} className="board-row">
            {Array.from({ length: gameState.boardWidth }).map((_, x) => {
              const tile = gameState.getTile(x, y)
              const creature = getTileCreature(x, y)

              // Check if this tile is a valid move (handle new pathfinding format)
              const validMove = validMoveTiles.find((vm) => vm.tile.x === x && vm.tile.y === y)
              // Only show movement overlay when in movement mode
              const isValidMove = creatureViewMode === 'movement' && validMove !== undefined

              // Check if this creature is a valid attack target and get attack type
              const attackTargetInfo = validAttackTargets.find(
                (t) => t.creature.position?.x === x && t.creature.position?.y === y
              )
              const isAttackTarget = attackTargetInfo !== undefined
              const attackType = attackTargetInfo?.attackType

              // Check if this creature is a FLASHING BLADES target
              const isFlashingBladesTarget =
                flashingBladesTargetMode &&
                flashingBladesPending?.validTargets.some(
                  (t) => t.position?.x === x && t.position?.y === y
                )

              // Check if this creature is a HIDDEN BLADE target
              const isHiddenBladeTarget =
                hiddenBladeTargetMode &&
                hiddenBladePending?.validTargets.some(
                  (t) => t.position?.x === x && t.position?.y === y
                )

              // ============================================
              // CONFUSION GAZE HIGHLIGHTS: Show valid slide destinations or attack targets
              // ============================================
              const isConfusionGazeSlide =
                confusionGazeMode === 'slide' &&
                confusionGazePending?.validSlideTiles?.some((t) => t.x === x && t.y === y)

              const isConfusionGazeAttack =
                confusionGazeMode === 'attack' &&
                confusionGazePending?.attackTargets?.some(
                  (t) => t.target.position?.x === x && t.target.position?.y === y
                )

              // ============================================
              // SLAM HIGHLIGHTS: Show valid slam destinations (uses movement color)
              // ============================================
              const isSlamTile = slamMode && slamValidTiles.some((t) => t.x === x && t.y === y)

              // ============================================
              // ATTACK + SLIDE HIGHLIGHTS: Show valid slide destinations (Blast of Force, Hypnotic Gaze)
              // ============================================
              const isAttackSlideTile =
                attackSlideMode && attackSlideValidTiles.some((t) => t.x === x && t.y === y)

              // ============================================
              // CLOUD OF BATS SHIFT HIGHLIGHTS: Show valid shift destinations
              // ============================================
              const isShiftTile =
                shiftSelectionMode && shiftValidTiles.some((t) => t.x === x && t.y === y)

              // ============================================
              // SHIFT+ATTACK HIGHLIGHTS: Show valid shift destinations (pre-shift or post-shift phase)
              // ============================================
              const isShiftAttackTile =
                shiftAttackMode &&
                (pendingShiftAttack?.phase === 'pre-shift' ||
                  pendingShiftAttack?.phase === 'post-shift') &&
                shiftAttackValidTiles.some((t) => t.x === x && t.y === y)

              // ============================================
              // CHARGE HIGHLIGHTS: Show valid movement destinations (green)
              // ============================================
              const isChargeTile =
                chargeMode &&
                pendingChargeAttack?.phase === 'moving' &&
                chargeValidTiles.some((t) => t.x === x && t.y === y)

              // ============================================
              // LIGHTNING BREATH HIGHLIGHTS: Show valid targets and selected targets
              // ============================================
              const isLightningBreathValidTarget =
                lightningBreathMode &&
                lightningBreathValidTargets.some(
                  (t) => t.position?.x === x && t.position?.y === y
                )
              const isLightningBreathSelected =
                lightningBreathMode &&
                lightningBreathTargets.some((t) => t.position?.x === x && t.position?.y === y)
              const lightningBreathTargetIndex = lightningBreathMode
                ? lightningBreathTargets.findIndex(
                    (t) => t.position?.x === x && t.position?.y === y
                  )
                : -1

              // ============================================
              // HEALING TOUCH HIGHLIGHTS: Show valid targets (self + adjacent allies)
              // when Dwarf Cleric is selected and hasn't used action
              // ============================================
              const isHealingTouchTarget =
                selectedBoardCreature &&
                gameState.hasHealingTouch(selectedBoardCreature) &&
                !selectedBoardCreature.hasAttackedThisTurn &&
                creature &&
                creature.owner === selectedBoardCreature.owner &&
                gameState.isValidHealingTouchTarget(selectedBoardCreature, creature)

              // Check if this is the selected creature
              const isSelectedCreature =
                selectedBoardCreature?.position?.x === x &&
                selectedBoardCreature?.position?.y === y

              // Check if this tile is in the line-of-sight path (original behavior)
              // OR if we're in ranged view mode, show ranged range tiles with LOS
              const rangedRangeInfo = rangedRangeTiles.find((r) => r.x === x && r.y === y)
              const isLineOfSight =
                creatureViewMode === 'movement'
                  ? lineOfSightPath.some((pos) => pos.x === x && pos.y === y)
                  : rangedRangeInfo?.hasLOS === true

              // ============================================
              // COMBAT HIGHLIGHT: Determine if creature should be highlighted
              // O(1) - simple instanceId comparison
              // ============================================
              let combatHighlight = null
              if (creature && combatHighlightCreatures.attacker === creature.instanceId) {
                combatHighlight = 'attacker'
              } else if (
                creature &&
                combatHighlightCreatures.defender === creature.instanceId
              ) {
                combatHighlight = 'defender'
              }

              // ============================================
              // SHADOW STALKER HIGHLIGHT: Show valid deployment tiles
              // when creature with SHADOW STALKER is selected from hand
              // ============================================
              const currentPlayerState = gameState.getCurrentPlayerState()
              const selectedCreatureCard =
                selectedCreatureIndex !== null
                  ? currentPlayerState?.creatureHand?.[selectedCreatureIndex]
                  : null
              const isShadowStalkerHighlight =
                canDeployInCurrentPhase() &&
                selectedCreatureCard &&
                gameState.hasShadowStalker(selectedCreatureCard) &&
                !tile.occupant &&
                tile.terrain !== 'MOUNTAIN' &&
                gameState.board.isAdjacentToMountain(x, y)

              // ============================================
              // SUMMON SPIDER HIGHLIGHT: Show valid deployment tiles
              // during deploy phase when Drow Priestess is in play
              // Tiles within 5 squares of Priestess get same color as starting zone
              // Always show during deploy phase so players know where they can deploy Spiders
              // ============================================
              let isSummonSpiderHighlight = false
              let summonSpiderFactionColor = null

              if (canDeployInCurrentPhase() && !tile.occupant && tile.terrain !== 'MOUNTAIN') {
                const priestess = gameState.hasSummonSpider(gameState.currentPlayer)
                if (priestess?.position) {
                  // Check if tile is within 5 squares of Priestess (Chebyshev distance)
                  const dx = Math.abs(x - priestess.position.x)
                  const dy = Math.abs(y - priestess.position.y)
                  if (Math.max(dx, dy) <= 5) {
                    // Don't highlight if already in starting zone (it already has the highlight)
                    const isInStartingZone =
                      tile.terrain === 'STARTING_ZONE' &&
                      tile.startingZoneOwner === gameState.currentPlayer
                    if (!isInStartingZone) {
                      isSummonSpiderHighlight = true
                      summonSpiderFactionColor = playerFactionColors?.[gameState.currentPlayer]
                    }
                  }
                }
              }

              // ============================================
              // LICH NECROMANCER HIGHLIGHT: Show valid deployment tiles
              // during deploy phase when Lich Necromancer is in play
              // Tiles adjacent to Lich (range 1) get same color as starting zone
              // Always show during deploy phase so players know where they can deploy Undead
              // ============================================
              let isLichNecromancerHighlight = false
              let lichNecromancerFactionColor = null

              if (canDeployInCurrentPhase() && !tile.occupant && tile.terrain !== 'MOUNTAIN') {
                const lich =
                  gameState.hasLichNecromancerDeploy &&
                  gameState.hasLichNecromancerDeploy(gameState.currentPlayer)
                if (lich?.position) {
                  // Check if tile is adjacent to Lich (range 1, 8-directional)
                  const dx = Math.abs(x - lich.position.x)
                  const dy = Math.abs(y - lich.position.y)
                  if (Math.max(dx, dy) === 1) {
                    // Don't highlight if already in starting zone (it already has the highlight)
                    const isInStartingZone =
                      tile.terrain === 'STARTING_ZONE' &&
                      tile.startingZoneOwner === gameState.currentPlayer
                    if (!isInStartingZone) {
                      isLichNecromancerHighlight = true
                      lichNecromancerFactionColor =
                        playerFactionColors?.[gameState.currentPlayer]
                    }
                  }
                }
              }

              // ============================================
              // ORC DRUID HIGHLIGHT: Show valid deployment tiles for Beast/Elemental creatures
              // during deploy phase when Orc Druid is in play
              // Tiles adjacent to Orc Druid (range 1) get Gruumsh faction color
              // Always show during deploy phase so players know where they can deploy Beasts
              // ============================================
              let isOrcDruidHighlight = false
              let orcDruidFactionColor = null

              if (canDeployInCurrentPhase() && !tile.occupant && tile.terrain !== 'MOUNTAIN') {
                const druid =
                  gameState.hasOrcDruidDeploy &&
                  gameState.hasOrcDruidDeploy(gameState.currentPlayer)
                if (druid?.position) {
                  // Check if tile is adjacent to Orc Druid (range 1, 8-directional)
                  const dx = Math.abs(x - druid.position.x)
                  const dy = Math.abs(y - druid.position.y)
                  if (Math.max(dx, dy) === 1) {
                    // Don't highlight if already in starting zone (it already has the highlight)
                    const isInStartingZone =
                      tile.terrain === 'STARTING_ZONE' &&
                      tile.startingZoneOwner === gameState.currentPlayer
                    if (!isInStartingZone) {
                      isOrcDruidHighlight = true
                      orcDruidFactionColor = playerFactionColors?.[gameState.currentPlayer]
                    }
                  }
                }
              }

              // ============================================
              // ARCANE PORTAL HIGHLIGHT: Show Magic Circle tiles for War Wizard deployment
              // When War Wizard is selected from hand during deploy phase,
              // highlight Magic Circle tiles with faction color
              // ============================================
              let isArcanePortalHighlight = false
              let arcanePortalFactionColor = null

              if (
                canDeployInCurrentPhase() &&
                selectedCreatureCard &&
                gameState.hasArcanePortal &&
                gameState.hasArcanePortal(selectedCreatureCard) &&
                !tile.occupant &&
                tile.terrain === 'MAGIC_CIRCLE'
              ) {
                // Don't highlight if already in starting zone (it already has the highlight)
                const isInStartingZone =
                  tile.terrain === 'STARTING_ZONE' &&
                  tile.startingZoneOwner === gameState.currentPlayer
                if (!isInStartingZone) {
                  isArcanePortalHighlight = true
                  arcanePortalFactionColor = playerFactionColors?.[gameState.currentPlayer]
                }
              }

              // ============================================
              // RANGED LOS HIGHLIGHT: Faction-colored tiles showing ranged attack coverage
              // When creature SELECTED: Show ONLY that creature's LOS (cyan highlight)
              // When NO creature selected: Show ALL ranged LOS with faction colors
              // ============================================
              let isAllRangedLOS = false
              let allRangedLOSCount = 0
              let rangedLOSFactions = []
              let isSelectedCreatureRangedLOS = false

              if (creatureViewMode === 'ranged') {
                // Check if a ranged creature is selected
                if (selectedBoardCreature?.creature?.rangedAttack) {
                  // SELECTED CREATURE: Show ONLY its LOS (cyan highlight)
                  // rangedRangeInfo is already computed above
                  isSelectedCreatureRangedLOS = rangedRangeInfo?.hasLOS === true
                } else {
                  // NO CREATURE SELECTED: Show ALL ranged LOS with faction colors
                  const allRangedLOSInfo = allRangedLOSTiles.find((t) => t.x === x && t.y === y)
                  if (allRangedLOSInfo?.hasLOS) {
                    isAllRangedLOS = true
                    allRangedLOSCount = allRangedLOSInfo.creatureCount || 0
                    rangedLOSFactions = allRangedLOSInfo.owners || []
                  }
                }
              }

              // ============================================
              // ORDER CARD TARGET HIGHLIGHT: Show valid targets for order card targeting mode
              // ============================================
              const isOrderCardTarget =
                orderCardTargetingMode &&
                creature &&
                orderCardValidTargets.some((t) => t.instanceId === creature.instanceId)

              return (
                <BoardTile
                  key={`${x}-${y}`}
                  tile={tile}
                  creature={creature}
                  isSelected={isSelectedCreature}
                  isValidMove={isValidMove}
                  movementInfo={validMove} // Pass movement info for cost display
                  isAttackTarget={
                    isAttackTarget || isFlashingBladesTarget || isHiddenBladeTarget
                  }
                  attackType={attackType}
                  isLineOfSight={isLineOfSight}
                  isAllRangedLOS={isAllRangedLOS}
                  allRangedLOSCount={allRangedLOSCount}
                  rangedLOSFactions={rangedLOSFactions}
                  isSelectedCreatureRangedLOS={isSelectedCreatureRangedLOS}
                  onClick={handleTileClick}
                  onRightClick={handleTileRightClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  isDragTarget={dragOverTile?.x === x && dragOverTile?.y === y}
                  playerFactionColors={playerFactionColors}
                  playerFactions={playerFactions}
                  currentPlayer={gameState?.currentPlayer}
                  boardWidth={gameState.boardWidth}
                  boardHeight={gameState.boardHeight}
                  combatHighlight={combatHighlight}
                  factionHighlight={factionHighlight}
                  isShadowStalkerHighlight={isShadowStalkerHighlight}
                  isConfusionGazeSlide={isConfusionGazeSlide}
                  isConfusionGazeAttack={isConfusionGazeAttack}
                  isSlamTile={isSlamTile}
                  isAttackSlideTile={isAttackSlideTile}
                  isSummonSpiderHighlight={isSummonSpiderHighlight}
                  summonSpiderFactionColor={summonSpiderFactionColor}
                  isLichNecromancerHighlight={isLichNecromancerHighlight}
                  lichNecromancerFactionColor={lichNecromancerFactionColor}
                  isOrcDruidHighlight={isOrcDruidHighlight}
                  orcDruidFactionColor={orcDruidFactionColor}
                  isArcanePortalHighlight={isArcanePortalHighlight}
                  arcanePortalFactionColor={arcanePortalFactionColor}
                  isLightningBreathValidTarget={isLightningBreathValidTarget}
                  isLightningBreathSelected={isLightningBreathSelected}
                  lightningBreathTargetIndex={lightningBreathTargetIndex}
                  isOrderCardTarget={isOrderCardTarget}
                  isWebbed={creature && gameState?.hasMovementBlockingAttachment?.(creature)}
                  hasDeepWound={
                    creature && gameState?.hasDamageOnActivationAttachment?.(creature)
                  }
                  isHealingTouchTarget={isHealingTouchTarget}
                  isShiftTile={isShiftTile || isShiftAttackTile}
                  isChargeTile={isChargeTile}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default BoardGridArea
