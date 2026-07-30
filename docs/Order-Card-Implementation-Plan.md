# Order Card Implementation Plan

Master plan for implementing all Order Cards with AI difficulty support (0/0/100 pattern).

**Testing Setup**: AI Difficulty = Hard (100% card usage for reliable testing)

---

## PART 1: IMMEDIATE CARDS (Remaining)

### Phase IMD-5: Target Other Creatures ✅ COMPLETE

Cards that prevent damage to creatures OTHER than the card user.

| Card               | Faction          | Effect            | Targeting                     |
| ------------------ | ---------------- | ----------------- | ----------------------------- |
| Defend Ally (x2)   | Heart of Cormyr  | Prevent 30 damage | Adjacent ally                 |
| Shield (x2)        | Heart of Cormyr  | Prevent 30 damage | Self OR ally within 5 squares |
| Warning Shout (x2) | Curse of Undeath | Prevent 30 damage | Ally within line of sight     |

**Implementation**:

- ✅ Added `protectTargetType` property: 'self' | 'adjacent_ally' | 'ally_in_range' | 'ally_los'
- ✅ Added `protectTargetRange` property for range-based targeting
- ✅ Updated DefenseOptionsPanel to show valid targets with "PROTECTOR" badge
- ✅ Updated CommanderAbilityManager with helper functions for ally targeting

---

### Phase IMD-6: Discard Cost Cards ✅ COMPLETE

Cards requiring player to discard another card from hand.

| Card               | Faction        | Effect                               |
| ------------------ | -------------- | ------------------------------------ |
| Uncanny Dodge (x2) | Sting of Lolth | Discard 1 card to prevent ALL damage |

**Implementation**:

- ✅ Added `discardCost` property to OrderCard class
- ✅ Added discard selection UI in DefenseOptionsPanel (yellow warning box)
- ✅ Validate player has cards to discard before showing option (need card + discardCost)
- ✅ AI selects lowest-level card to discard
- ✅ Fixed NaN display for 'ALL' damage prevention in Summary

---

### Phase IMD-7: Opponent Effects ✅ COMPLETE

Cards that affect the opponent when used.

| Card   | Faction         | Effect                                   |
| ------ | --------------- | ---------------------------------------- |
| Recoil | Heart of Cormyr | Prevent 30 damage, opponent draws 1 card |

**Implementation**:

- ✅ Added `opponentDrawsCards` property to OrderCard class
- ✅ Updated Recoil card with `damagePrevented: 30` and `opponentDrawsCards: 1`
- ✅ Toast notification shown to all players
- ✅ AI weighs prevention value vs giving opponent resources (-10 score per card)

**Phase IMD-7.1: Faction Selection Update** ✅ COMPLETE

- ✅ **2-player games**: Auto-give card to attacker, show modal immediately
- ✅ **3+ player games**: Defender selects which opponent receives the card via FactionSelectModal
- ✅ Created `FactionSelectModal` component with commander image selection
- ✅ Only show factions with cards in their deck
- ✅ **Card reveal timing**:
  - If recipient is attacker: Show card immediately
  - If recipient is non-attacker: Queue for reveal at their next ACTIVATE phase
- ✅ Added `pendingCardReveals` array to PlayerState for delayed reveals
- ✅ PhaseManager merges pending reveals into ACTIVATE modal with "Received from [source]"
- ✅ AI: 75% chance to give to non-attacker opponent, 25% to attacker
- ✅ Toast: "[Defender] chose to give [Recipient] 1 card from Recoil"

---

### Phase IMD-8: OR Choice Cards ✅ COMPLETE

Cards offering player a choice between effects.

| Card          | Faction            | Effect                       |
| ------------- | ------------------ | ---------------------------- |
| Patch Up (x2) | Tyranny of Goblins | Heal 20 OR Prevent 20 damage |

**Implementation**:

- ✅ Added `healAmount` property (20 for Patch Up)
- ✅ Added `canHealProactively` property (enables proactive heal mode)
- ✅ Added `damagePrevented: 20` (enables defensive prevent mode)
- ✅ **Proactive Heal Mode**: During ACTIVATE phase, right-click Patch Up on damaged creature
  - Shows PatchUpHealModal with card, heal preview, and warning about consuming action
  - Heals damage, consumes action (like STANDARD), taps creature, discards card
  - Only available if creature has damage to heal
- ✅ **Reactive Prevent Mode**: Automatically available in DefenseOptionsPanel (existing IMMEDIATE logic)
- ✅ AI proactive heal strategy:
  - Only Hard AI uses order cards (0/0/100 pattern)
  - Prioritizes higher-level damaged creatures
  - Penalizes healing if creature can make a kill this turn
  - Scores based on: heal value + level bonus + critical HP bonus - kill penalty

---

### Phase IMD-9: Morale Attack Cards ✅ COMPLETE

Cards that affect opponent morale as part of defense.

| Card                       | Faction          | Effect                                                               |
| -------------------------- | ---------------- | -------------------------------------------------------------------- |
| Unexpected Resistance (x2) | Blood of Gruumsh | Prevent 10 damage, adjacent tapped enemy's controller loses 1 morale |

**Implementation**:

- ✅ Added `opponentMoraleLoss` property to OrderCard class
- ✅ Added `moraleLossTargetType` property ('adjacent_tapped_enemy')
- ✅ Updated DefenseOptionsPanel with morale target selection UI
- ✅ If multiple adjacent tapped enemies: Player selects target
- ✅ If single target: Auto-select
- ✅ MoraleLossNotificationModal shows loss to affected player
- ✅ AI evaluates morale loss value vs damage prevention

---

### Phase IMD-10: Self-Sacrifice Cards ✅ COMPLETE

Cards that destroy the user as part of their effect.

| Card               | Faction          | Effect                                                     |
| ------------------ | ---------------- | ---------------------------------------------------------- |
| Savage Demise (x2) | Blood of Gruumsh | Attack tapped creature with base damage, then destroy self |

**Implementation**:

- ✅ Added `destroySelfAfterUse` property to OrderCard class
- ✅ Added `selfSacrificeAttack` property (targets adjacent tapped enemy)
- ✅ Added `useBaseMeleeDamage` property (uses creature's base melee damage)
- ✅ DefenseOptionsPanel shows sacrifice target selection UI
- ✅ Card only available when adjacent tapped enemies exist
- ✅ Attack sequence: Savage Demise → DEATH STRIKE (if applicable) → Sacrifice
- ✅ DEATH STRIKE hits the ORIGINAL ATTACKER (not sacrifice target)
- ✅ Original attack is completely negated
- ✅ Original attacker's action is consumed (tapped)
- ✅ AI evaluates trade value (creature level vs target value)

---

### Phase IMD-11: Attach Cards (IMMEDIATE) ✅ COMPLETE

IMMEDIATE cards that attach to creatures with lasting effects.

| Card              | Faction            | Effect                                                       |
| ----------------- | ------------------ | ------------------------------------------------------------ |
| ✅ Leap Away      | Tyranny of Goblins | Prevent 40 damage, attach (can't move/shift), (S) to remove  |
| ✅ Mortal Wound   | Tyranny of Goblins | Prevent ALL damage, attach, destroy at start of Deploy phase |
| ✅ Tough as Nails | Tyranny of Goblins | Remove all attachments, attach, gain Block 10                |

**Implementation**:

- ✅ Add attachment system to CreatureInstance (`attachedCards[]`)
- ✅ Add `attachOnUse` property with attachment effects (`preventsMovement`, `removableAsStandard`, `destroyAtDeploy`, `blockAmount`)
- ✅ Track attached cards with removal conditions
- ✅ Implement Deploy phase destruction check for Mortal Wound
- ✅ Generic WebRemovalModal supports any removable attachment (Web, Leap Away)
- ✅ Block damage reduction displayed in AttackConfirmPanel and DefenseOptionsPanel
- ✅ Faction-colored borders on creatures with attached cards

---

## PART 2: STANDARD CARDS

### Phase STD-1: Basic Damage Boost ✅ COMPLETE

Simple melee attacks with bonus damage.

| Card                | Faction          | Effect                       |
| ------------------- | ---------------- | ---------------------------- |
| Power Attack (x2)   | Heart of Cormyr  | Melee attack +20 damage      |
| Hacking Frenzy (x2) | Blood of Gruumsh | Melee attack +40 damage      |
| Killing Strike      | Heart of Cormyr  | Melee attack 100 flat damage |

**Implementation**:

- ✅ Added `meleeDamageBonus` property to OrderCard class (bonus damage added to base)
- ✅ Added `flatMeleeDamage` property to OrderCard class (replaces base damage entirely)
- ✅ Created DamageBoostModal component for confirmation before target selection
- ✅ Added damage boost state to useAbilityModals hook (showDamageBoostModal, damageBoostConfig, pendingDamageBoostAttack)
- ✅ Updated GameBoard.jsx with card selection flow, target highlighting, and handlers
- ✅ Updated CombatResolver.js to calculate damage with boost parameters
- ✅ Updated AttackConfirmPanel.jsx to display damage boost card and bonus damage breakdown
- ✅ Updated DefenseOptionsPanel.jsx to show incoming damage with card bonus/flat damage
- ✅ Added Power Attack and Killing Strike to Heart of Cormyr faction
- ✅ Added Hacking Frenzy to Blood of Gruumsh faction
- ✅ AI (Hard difficulty) uses damage boost cards when beneficial
- ✅ Flat damage (Killing Strike) ignores flanking/cutter bonuses
- ✅ Card discarded only after attack confirms
- ✅ Two-point cancel system (modal + AttackConfirmPanel)

---

### Phase STD-2: Ranged Damage Boost ✅ COMPLETE

Ranged attacks with bonus damage.

| Card              | Faction          | Effect                   |
| ----------------- | ---------------- | ------------------------ |
| Gout of Fire (x2) | Curse of Undeath | Ranged attack +20 damage |

**Implementation**:

- ✅ Added `rangedDamageBonus` property to OrderCard class (orders.js)
- ✅ Updated DamageBoostModal.jsx for dual melee/ranged support:
  - Blue (#0d6efd) styling for ranged cards, red (#dc3545) for melee
  - Dynamic text: "ranged attack" vs "melee attack"
  - Correct base damage preview based on attack type
- ✅ Updated GameBoard.jsx handleOrderCardRightClick to detect ranged boost cards
- ✅ Updated confirmDamageBoost to filter ranged targets only for ranged cards
- ✅ Updated CombatResolver.js validateAttack to apply rangedDamageBonus
- ✅ Updated AttackConfirmPanel.jsx:
  - Blue styling for ranged boost cards (border, shadows)
  - Fire icon for ranged, sword for melee
  - Text displays "ranged damage" vs "melee damage"
- ✅ Added `rangedDamageBonus: 20` to Gout of Fire cards in curseOfUndeath.js
- ✅ Updated AI (simpleAI.js):
  - getDamageBoostCards() now accepts attackType parameter
  - selectBestDamageBoostCard() filters by attack type
  - Both melee and ranged boost cards supported on Hard difficulty

---

### Phase STD-3: Melee Boost + Card Draw ✅ COMPLETE

Cards that boost melee damage and draw cards on use.

| Card       | Faction          | Effect                                     |
| ---------- | ---------------- | ------------------------------------------ |
| Slice (x2) | Blood of Gruumsh | Melee attack +10 damage, draw 1 Order card |

**Implementation**:

- ✅ Added `drawCardsOnAttack` property to OrderCard class (orders.js)
- ✅ Updated Slice cards in bloodOfGruumsh.js with `meleeDamageBonus: 10` and `drawCardsOnAttack: 1`
- ✅ Added card draw logic to `executeAttackAfterDefense()` in GameBoard.jsx
- ✅ Reuses existing `CardsDrawnModal` for human players
- ✅ AI draws cards and shows toast notification
- ✅ Updated `DamageBoostModal.jsx` to show "Draw X Order card(s)" preview
- ✅ AI prioritizes cards with `drawCardsOnAttack` in `selectBestDamageBoostCard()`
- ✅ Card draw happens after attack resolves, regardless of damage prevention

---

### Phase STD-4: Shift + Attack ✅ COMPLETE

Movement before or after attack.

| Card                | Faction            | Effect                      |
| ------------------- | ------------------ | --------------------------- |
| Nimble Strike       | Tyranny of Goblins | Shift 3, melee/ranged +10   |
| Spring Attack (x2)  | Sting of Lolth     | Shift 3, melee +10, shift 3 |
| Shadowy Ambush (x2) | Sting of Lolth     | Shift 3, melee +30          |

**Implementation**:

- ✅ Added `shiftBeforeAttack` and `shiftAfterAttack` properties to OrderCard class
- ✅ Created ShiftAttackModal component for shift+attack card confirmation
- ✅ Implemented shift tile selection UI with blue highlighting for valid tiles
- ✅ Pre-shift → Attack → Post-shift flow with proper state management
- ✅ Added `pendingShiftAttack` state to track shift+attack phases
- ✅ Integration with HIDDEN BLADE ability - triggers AFTER all shifting completes
- ✅ Creatures with HIDDEN BLADE defer tapping until after ability resolves
- ✅ AI calculates optimal positioning for shift+attack cards

---

### Phase STD-5: Charge (Move + Attack) ✅ COMPLETE

Full movement then attack.

| Card        | Faction          | Effect                |
| ----------- | ---------------- | --------------------- |
| Charge (x2) | Blood of Gruumsh | Move speed, melee +10 |

**Implementation**:

- ✅ Added `moveBeforeAttack: 'speed'` property to OrderCard class
- ✅ Created ChargeModal component for card confirmation
- ✅ Implemented charge tile selection UI with green highlighting for valid tiles
- ✅ Move → Attack flow with proper state management (phase: 'moving' | 'attacking')
- ✅ Only valid destinations are tiles adjacent to enemies (must have attack target)
- ✅ Must move at least 1 tile (no zero-movement charges)
- ✅ Respects terrain costs via getValidMovementTiles pathfinding
- ✅ AI support: getChargeCards() and evaluateChargeAttack() functions
- ✅ AI executes charge_attack actions in GameBoard
- ✅ Charge movement is part of STANDARD action (doesn't consume creature's normal movement)
- ✅ Creature can still move after using Charge (if movement wasn't already used)

---

### Phase STD-6: Attack + Heal ✅ COMPLETE

Attacks that heal the attacker.

| Card                  | Faction            | Effect                                        |
| --------------------- | ------------------ | --------------------------------------------- |
| Feral Vitality        | Tyranny of Goblins | Melee +20, heal 10                            |
| Victorious Surge (x2) | Blood of Gruumsh   | Melee +20, heal 20                            |
| Vampiric Touch (x2)   | Curse of Undeath   | 30 flat damage, heal 30 (if deals ≥10 damage) |

**Implementation**:

- ✅ Added `healOnAttack` property to OrderCard class (fixed healing amount after attack)
- ✅ Added `healOnAttackMinDamage` property (minimum damage required to trigger healing)
- ✅ Updated Feral Vitality with `meleeDamageBonus: 20, healOnAttack: 10`
- ✅ Updated Victorious Surge (x2) with `meleeDamageBonus: 20, healOnAttack: 20`
- ✅ Updated Vampiric Touch (x2) with VAMPIRE AFFINITY:
  - `flatMeleeDamage: 30` (replaces base damage)
  - `healOnAttack: 30, healOnAttackMinDamage: 10`
  - `affinityRequired: 'VAMPIRE', affinityOverridesRequirements: true`
  - Only Vampire creatures can use (level and INT ability bypassed)
- ✅ Added healing preview to DamageBoostModal.jsx with minimum damage warning
- ✅ Implemented healing execution in GameBoard.jsx attack resolution flow
- ✅ AI prioritizes healing cards when attacker is damaged (Hard mode only)
- ✅ Fixed healing heals even if damage fully prevented (Feral Vitality, Victorious Surge)
- ✅ Conditional healing only triggers if minimum damage dealt (Vampiric Touch)

---

### Phase STD-7: Attack + Status Effect ✅ COMPLETE

Attacks that apply conditions to target.

| Card            | Faction            | Effect                                                    |
| --------------- | ------------------ | --------------------------------------------------------- |
| Ray of Frost    | Tyranny of Goblins | 30 damage within 5, tap target                            |
| Deep Wound (x2) | Sting of Lolth     | Melee +10, attach to target (10 damage at Activate start) |

**Implementation**:

- ✅ Added `attachToTarget` property for debuffs that attach to the defender
- ✅ Added `damageOnActivation` property (10 for Deep Wound - deals damage at start of Activate phase)
- ✅ Created HarmfulAttachmentsModal component to notify players at Activate phase start
- ✅ Added `getHarmfulAttachments()` helper to gameState.js for detecting harmful effects
- ✅ Modal shows categorized effects: Damage (Deep Wound), Movement Blocked (Web), Pending Death (Mortal Wound), Damage Penalty (Shattered Weapon)
- ✅ Added `attachOnUse.preventsMovement` to Web cards for proper detection
- ✅ Integrated modal into phase flow (after CardsDrawnModal, before MoraleLossNotificationModal)
- ✅ AI players get toast notifications instead of modal

---

### Phase STD-8: Attack + Slide ✅ COMPLETE

Attacks that reposition target.

| Card               | Faction          | Level | Ability | Effect                                                          |
| ------------------ | ---------------- | ----- | -------- | ---------------------------------------------------------------- |
| Blast of Force     | Heart of Cormyr  | 2     | INT      | Melee attack deals 30 DAMAGE (flat), slide target up to 8 squares |
| Hypnotic Gaze (x2) | Curse of Undeath | 3     | CHA      | Choose enemy within 5, slide it up to 3 squares, melee +20 damage |

**Corrections from prior summary** (verified against `src/assets/orders/` scans): Blast of Force is **30 flat damage** (not "+10 bonus"), slide is **8 squares** (not 3). Hypnotic Gaze is **+20 damage** (not "+10"), slide is **3 squares**, and the target is chosen from **within 5 squares** before the slide, not just an already-adjacent target. Also: **Blast of Force is not actually an x2 card** — `src/assets/orders/cormyr/` and the physical 36-card Heart of Cormyr order deck only have one "Blast of Force" scan/slot (`Cormyr_BlastOfForce_Order_4.png`, 4/36); the "(x2)" in the original summary table was itself an error, consistent with the other doc corrections found during the STD-9–MIN-13 audit. Hypnotic Gaze genuinely is x2 (18/36 and 19/36).

**Design precedent**: mechanically these are the same two sequences as the existing SLAM (Earth Guardian: melee attack → optional slide) and CONFUSION GAZE (Umber Hulk: slide → melee attack) creature abilities, just triggered by a hand card instead of an innate ability, with the slide made mandatory (attacker/AI must choose a destination, 1 up to the card's max) rather than optional. The slide distance rules (mountains block completely, difficult terrain doesn't, BFS naturally returns every distance from 1 to max) were already fully implemented by the generic slide infrastructure — no new pathing logic was needed.

**Implementation**:

- ✅ Added `slideTargetOnHit`, `slideTargetBeforeAttack`, `slideTargetSelectRange` properties to `OrderCard` (`src/models/orders.ts`)
- ✅ Updated Blast of Force with `flatMeleeDamage: 30, slideTargetOnHit: 8` (`src/data/factions/heartOfCormyr.js`) — qualifies for the existing STD-1 damage-boost attack flow unchanged; only the post-hit slide is new
- ✅ Updated both Hypnotic Gaze entries with `meleeDamageBonus: 20, slideTargetBeforeAttack: 3, slideTargetSelectRange: 5` (`src/data/factions/curseOfUndeath.js`)
- ✅ Renamed `gameState.executeConfusionGazeSlide` → `executeSlide` (generic name; now shared by Confusion Gaze, Blast of Force, and Hypnotic Gaze) and updated its call sites
- ✅ Added `gameState.getHypnoticGazeValidTargets(caster, card)` for the initial "choose enemy within range" step (mirrors `getWebValidTargets`: Chebyshev distance + line-of-sight)
- ✅ Added `gameState.applyHypnoticGazeWithDefense(attacker, target, damageReduction, damageBoostBonus)` — a dedicated damage-application method (mirrors `applyConfusionGazeWithDefense`) since Hypnotic Gaze's melee attack always lands regardless of post-slide adjacency, which the generic `CombatResolver.validateAttack` melee-range check would otherwise reject
- ✅ New `isHypnoticGazeType` branch in `handleOrderCardRightClick` (GameBoard.jsx), checked before the generic damage-boost branch (same exclusion pattern as Charge/Shift+Attack), entering a target-selection mode for enemies within `slideTargetSelectRange`
- ✅ New `useAttackAndSlide.js` hook (bundles both cards, following the `useSlam`/`useConfusionGaze` extraction pattern): `handleHypnoticGazeTargetSelected`, `handleAttackSlideTileSelect` (shared tile-picker for both cards' slides), `handleHypnoticGazeConfirmAttack` (mirrors `handleConfusionGazeConfirmAttack` for the combat-panel defense flow), `handleAIAttackSlideDecision` (AI picks a random valid tile — the slide itself is mandatory, only the destination is chosen)
- ✅ Blast of Force's post-hit slide is triggered from the same guarded block as SLAM inside `executeAttackAfterDefense`/`executeAttackAfterReactions` (`damageBoostCard?.slideTargetOnHit > 0 && result.damage > 0 && !result.destroyed`), so it works for both cards' attacks without a new attack-type flag
- ✅ Added generic `isAttackSlideTile` highlight (reuses the `slam-tile` CSS glow) wired through `BoardGridArea.jsx`/`BoardTile.tsx`
- ✅ Added `slideTargetOnHit` preview line to `DamageBoostModal.tsx` (same pattern as the STD-6 `healOnAttack` preview)
- ✅ AI: Blast of Force needs no new card-selection logic — it already qualifies for the existing generic `getDamageBoostCards`/damage-boost AI evaluation (Hard only), with the post-hit slide decided by `handleAIAttackSlideDecision`. Added `getHypnoticGazeCards`/`evaluateHypnoticGazeAttack` (`src/ai/simpleAI.ts`, mirrors `getChargeCards`/`evaluateChargeAttack`) plus a new `hypnotic_gaze` AI action type, checked/executed the same way as `confusion_gaze` (immediate slide + `applyHypnoticGazeWithDefense`, no defense-panel chance for the AI-targeted defender — matches existing Confusion Gaze AI behavior, not a new limitation)
- ✅ `getDamageBoostCards`/`getShiftAttackCards` (AI) exclude cards with `slideTargetBeforeAttack > 0` so Hypnotic Gaze isn't mistakenly evaluated as a normal adjacent-target damage-boost card
- ✅ Verified: `npm run typecheck`, `npm run lint` (0 errors), `npm test` (52/52 passing), `npm run build` all pass
- ⚠️ Not manually playtested in-browser this session (Electron postinstall scripts are blocked in this environment) — recommend the user manually verify both cards via `npm run dev`: Blast of Force's 30 flat damage + post-hit slide picker (1–8 squares, blocked by mountains, allowed through difficult terrain), and Hypnotic Gaze's within-5 targeting → slide (1–3 squares) → +20 melee attack that lands regardless of final position, for both human and Hard-AI use

---

### Phase STD-9: Self-Damage Attacks

Attacks that cost HP to use.

| Card                 | Faction            | Level | Ability | Effect                    |
| -------------------- | ------------------ | ----- | -------- | ------------------------- |
| Reckless Attack (x2) | Tyranny of Goblins | 1     | CON      | Take 10 damage, melee +30 |

**Implementation** (verified against `src/assets/orders/` scans — matches prior summary, level/ability added):

- Add `selfDamageOnUse` property
- Apply self-damage before attack
- AI evaluates HP trade-off

---

### Phase STD-10: Conditional Attacks

Attacks with conditional effects.

| Card               | Faction         | Level | Ability | Effect                                                                                     |
| ------------------ | --------------- | ----- | -------- | ------------------------------------------------------------------------------------------- |
| Daring Attack (x2) | Heart of Cormyr | 3     | STR      | Melee attack deals 30 flat damage. If target takes damage, untap this creature.             |
| Sneak Attack (x2)  | Sting of Lolth  | 6     | DEX      | Melee attack deals 100 flat damage (unconditional). Creatures you control adjacent to the target can assist with the attack. |

**Implementation** (verified against `src/assets/orders/` scans — corrects prior summary, which wrongly said "+10"/"if kill" and "+100 if ally adjacent"):

- Daring Attack: `flatMeleeDamage: 30` (replaces base, same pattern as Killing Strike), `untapOnDamage: true` (triggers on ANY damage dealt, not specifically a kill)
- Sneak Attack: `flatMeleeDamage: 100` (unconditional, not contingent on ally adjacency) — the "assist" clause is a separate mechanic (check whether the engine's existing flanking/cutter-bonus system already covers "adjacent ally assists an attack," or if this needs new support)
- Add `untapIfKill` property — **note**: doc previously said "if kill" but the card actually says "if the target takes damage from this attack" (any damage, not specifically destroying it) — property should be named/behave accordingly (e.g. `untapOnDamage`, not `untapIfKill`)

---

### Phase STD-11: Piercing/Unprevented Damage

Damage that cannot be prevented.

| Card                 | Faction        | Level | Ability | Effect                                |
| -------------------- | -------------- | ----- | -------- | -------------------------------------- |
| Piercing Strike (x2) | Sting of Lolth | 1     | DEX      | Melee +10, damage cannot be prevented |

**Implementation** (verified against `src/assets/orders/` scans — matches prior summary, level/ability added):

- Add `damageUnpreventable` property
- Skip defense options when this flag is set
- Critical balance consideration

---

### Phase STD-12: AOE Attacks

Attacks hitting multiple targets.

| Card             | Faction          | Level | Ability | Effect                                                                                    |
| ---------------- | ---------------- | ----- | -------- | -------------------------------------------------------------------------------------------- |
| Fireball (x2)    | Heart of Cormyr  | 3     | INT      | Choose 1 square within 5 squares. Deal 30 damage to each creature within 2 squares of it. |
| Stomp (x2)       | Blood of Gruumsh | 4     | CON      | Shift 3 squares. Deal 30 damage to each enemy creature adjacent to this creature.         |
| Turn Undead (x2) | Blood of Gruumsh | 3     | WIS      | Deal 20 damage to each Undead creature within 5 squares.                                  |

**Implementation** (verified against `src/assets/orders/` scans — corrects prior summary, which had wrong damage numbers and wrong distances for all three cards):

- Add `aoeDamage`, `aoeRadius`, and `aoeOriginRange` properties (Fireball: choose the AOE center within 5 squares, distinct from the 2-square blast radius)
- Fireball: `aoeDamage: 30, aoeRadius: 2, aoeOriginRange: 5` (doc previously said 20 damage — wrong)
- Stomp: `shiftBeforeAttack: 3` (self-shift, not target-slide), `aoeDamage: 30` to adjacent enemies (doc previously said shift 2 / 20 damage — both wrong)
- Turn Undead: `aoeDamage: 20, aoeRadius: 5, aoeTargetType: 'Undead'` (doc previously said 30 damage within 3 — both wrong)
- Create AOE targeting UI
- Resolve damage to each target individually

---

### Phase STD-13: Ranged Spell Attacks

Direct damage spells (not attack modifications).

| Card            | Faction            | Level | Ability | Effect                                                                                          |
| --------------- | ------------------ | ----- | -------- | ---------------------------------------------------------------------------------------------- |
| ~~Ray of Frost~~ | Tyranny of Goblins | 2     | INT      | **⚠️ DUPLICATE — already implemented under STD-7.** Only one "Ray of Frost" card exists (verified against its scan); this row is a doc copy-paste error, not a distinct card. **Before implementing this phase**: confirm with the user whether to delete this row, or whether a different card was actually intended for this slot. |
| Death Grip (x2) | Curse of Undeath   | 1     | ANY, Requires Undead | Make a melee attack that deals base weapon damage, +10 damage for each other Undead you control adjacent to the target. |
| Hurl Rock (x2)  | Blood of Gruumsh   | 1     | STR      | Choose 1 creature within 5 squares. Deal base weapon damage.                                    |

**Implementation** (verified against `src/assets/orders/` scans):

- Death Grip: **doc previously wrong** — it's a MELEE attack (not "10 x caster level ranged within 5"), base weapon damage plus a flat +10 stacking bonus per other adjacent allied Undead. Needs `meleeDamageBonus`-style stacking logic keyed to adjacent-Undead count, not a spell-damage formula.
- Hurl Rock matches prior summary as written.
- Add `spellDamage` property (fixed or formula) — only relevant for Hurl Rock/future ranged-spell cards, not Death Grip (which is melee)
- Add `spellRange` property
- These don't modify attacks - they ARE the attack

---

### Phase STD-14: Resource Cards

Cards that generate resources.

| Card                     | Faction            | Level | Ability | Effect                                        |
| ------------------------ | ------------------ | ----- | -------- | ----------------------------------------------- |
| Strength in Numbers (x2) | Tyranny of Goblins | 3     | CHA      | Gain 1 Leadership                              |
| Hulking Attack (x2)      | Curse of Undeath   | 2     | CON      | Melee +10, if damaged gain 1 morale            |

**Implementation** (verified against `src/assets/orders/` scans):

- Strength in Numbers matches prior summary; level/ability added.
- Hulking Attack: doc previously said "+20" — actual bonus is **+10**, and the morale gain triggers "if the target takes damage from this attack" (any damage), not unconditionally.
- Add `gainLeadership` and `gainMorale` properties
- Execute resource gain after card resolves

---

### Phase STD-15: Draw Cards

STANDARD cards that draw Order cards.

| Card        | Faction        | Level | Ability | Effect             |
| ----------- | -------------- | ----- | -------- | ------------------- |
| Scheme (x2) | Sting of Lolth | 2     | WIS      | Draw 2 Order cards |

**Implementation** (verified against `src/assets/orders/` scans — matches prior summary, level/ability added):

- Already have `drawCards` property
- Just needs STANDARD card integration

---

### Phase STD-16: Disruption Attacks

Attacks that affect opponent resources.

| Card                       | Faction          | Level | Ability | Effect                                                |
| -------------------------- | ---------------- | ----- | -------- | -------------------------------------------------------- |
| Disrupting Attack (x2)     | Heart of Cormyr  | 2     | STR      | Melee +10, if damaged tap target and controller discards 1 |
| Terrifying Revelation (x2) | Curse of Undeath | 6     | CHA      | Target opponent loses 3 Morale                        |

**Implementation** (verified against `src/assets/orders/` scans — matches prior summary, level/ability added):

- Add `opponentDiscardsOnHit` property
- Add `opponentMoraleLossOnUse` property
- Implement discard selection for opponent (random for AI opponent)

---

### Phase STD-17: Attach Buff Cards

STANDARD cards that attach buffs to user.

| Card                  | Faction            | Level | Ability | Effect                                                                                     |
| --------------------- | ------------------ | ----- | -------- | --------------------------------------------------------------------------------------------- |
| Shattered Weapon (x2) | Tyranny of Goblins | 1     | ANY, Requires Humanoid | Melee +30 damage. Attach to this creature. [Attached]: this creature's melee attacks deal +10 damage. |
| Mirror Image          | Tyranny of Goblins | 1     | INT      | Attach to this creature. [Attached]: remove to prevent ALL damage to this creature from 1 source. |
| Battle Ready (x2)     | Heart of Cormyr    | 4     | STR      | Attach to this creature. [Attached]: remove to prevent 40 damage from 1 source.                |
| Careful Attack (x2)   | Curse of Undeath   | 1     | CON      | Melee +10 damage. Attach to this creature. [Attached]: remove to prevent 10 damage from 1 source. |
| Vorpal Sword (x2)     | Blood of Gruumsh   | 4     | ANY, Requires Humanoid | Attach to this creature. [Attached]: if this creature's melee attack deals ≥50 damage, destroy target. |

**Implementation** (verified against `src/assets/orders/` scans — several corrections):

- Shattered Weapon: attach effect is a **+10 buff to this creature's OWN future melee attacks**, not a "-10 debuff" as previously written — re-read the card, it buffs the user, doesn't nerf anyone.
- Mirror Image: prevents damage "from 1 source" (one attack), not indefinite/all-damage-forever as the vague prior wording implied.
- Battle Ready: prevents **40** damage, not 30.
- Careful Attack: now has exact numbers (10 melee bonus, prevent 10 from 1 source) instead of "melee +10, attach for later prevention."
- Vorpal Sword: **no melee damage bonus at all** (prior doc wrongly said "+10") — the attach effect's destroy threshold is **50 damage**, not "3+".
- Reuse attachment system from IMD-11
- Add attack-triggered attachment effects
- Several of these (Shattered Weapon, Vorpal Sword) require the creature to be type **Humanoid** — see the "CROSS-CUTTING: CREATURE-TYPE RESTRICTIONS" section near the end of this doc; use the existing `requiresCreatureType` property (already on `OrderCard`, already checked in `canBeUsedBy()`) rather than adding a new one.

---

### Phase STD-18: Stealth/Special Movement

Unique movement mechanics.

| Card         | Faction        | Level | Ability | Effect                                                                                               |
| ------------ | -------------- | ----- | -------- | ------------------------------------------------------------------------------------------------------- |
| Stealth (x2) | Sting of Lolth | 2     | DEX      | If no enemy has LOS to this creature, remove it from the battlefield (still deployed). At the start of controller's next turn, place it on any unoccupied square. |

**Implementation** (verified against `src/assets/orders/` scans — doc previously wrong on several points):

- Requires a precondition: **no enemy creature currently has line of sight** to this creature (can't just play it anytime).
- Returns to **any unoccupied square** on the battlefield, not specifically "adjacent to enemy" as previously written.
- Takes effect at the **start of the controller's next turn**, not immediately.
- Add `removeFromBattlefield` state
- Track creature for return
- Implement return targeting

---

## PART 3: MINOR CARDS

### Phase MIN-1: Basic Shift

Simple shift movement.

| Card               | Faction         | Level | Ability | Effect     |
| ------------------ | --------------- | ----- | -------- | ---------- |
| Stalk (x2)         | Sting of Lolth  | 1     | DEX      | Shift 6    |
| Into the Fray (x2) | Heart of Cormyr | 1     | ANY      | Move speed |

**Implementation** (verified against `src/assets/orders/` scans — matches prior summary, level/ability added):

- Add `shiftDistance` for MINOR cards
- Add `moveSpeed` for full movement MINOR cards
- Integrate with movement system

---

### Phase MIN-2: Untap

Cards that untap creatures.

| Card              | Faction         | Level | Ability | Effect              |
| ----------------- | --------------- | ----- | -------- | -------------------- |
| Heroic Surge (x2) | Heart of Cormyr | 1     | ANY, Requires Adventurer | Untap this creature |

**Implementation** (verified against `src/assets/orders/` scans — effect matches; doc previously missing the "Requires Adventurer" creature-type restriction, see cross-cutting note):

- Add `untapSelf` property
- Simple untap execution

---

### Phase MIN-3: Heal Cards

MINOR action healing.

| Card                     | Faction          | Level | Ability | Effect                        |
| ------------------------ | ---------------- | ----- | -------- | ------------------------------ |
| Cure Serious Wounds (x2) | Blood of Gruumsh | 3     | WIS      | Heal 40 to self or adjacent ally |
| Healing Potion (x2)      | Heart of Cormyr  | 1     | ANY, Requires Humanoid | Heal 20 OR remove 1 attached Order card |

**Implementation** (verified against `src/assets/orders/` scans):

- Cure Serious Wounds: doc previously said "Heal 30" — actual is **Heal 40**.
- Healing Potion: numbers match; doc previously missing the "Requires Humanoid" creature-type restriction (see cross-cutting note).
- Add `healAmount` and `healTarget` properties
- Integrate with existing healing system
- OR choice for Healing Potion

---

### Phase MIN-4: Draw/Hand Management

Cards affecting the Order deck/hand.

| Card                 | Faction            | Level | Ability | Effect                                                                                     |
| -------------------- | ------------------ | ----- | -------- | ---------------------------------------------------------------------------------------------- |
| Change of Plans (x2) | Blood of Gruumsh   | 1     | WIS      | Draw 2 Order cards, then discard 1                                                       |
| Reinforcements       | Tyranny of Goblins | 3     | ANY      | Discard any number of Creature cards, reshuffle discarded/graveyard Creature cards into Creature deck, draw Creature cards up to your Creature hand size |

**Implementation** (verified against `src/assets/orders/` scans):

- Change of Plans matches prior summary; level/ability added.
- Reinforcements: **doc previously wrong** — this card is about **Creature** cards, not Order cards. It's not "discard any, reshuffle, draw that many + 1" — it discards Creature cards, reshuffles the Creature graveyard into the Creature deck, and draws back up to your Creature hand size (not a fixed "+1").
- Add draw/discard combination mechanics
- Create discard selection UI

---

### Phase MIN-5: Slide/Push Effects

Cards that move other creatures.

| Card                | Faction          | Level | Ability | Effect                                              |
| ------------------- | ---------------- | ----- | -------- | ---------------------------------------------------- |
| Shove Aside (x2)    | Heart of Cormyr  | 1     | STR      | Slide 1 adjacent creature 3 squares                 |
| Tide of Iron (x2)   | Blood of Gruumsh | 1     | STR      | Slide 1 adjacent creature 2 squares. Shift 2 squares (independent effect, not linked to the slide). |
| Fear (x2)           | Curse of Undeath | 3     | CHA, Dragon Affinity | Slide each adjacent enemy 5 squares |
| Furious Bellow (x2) | Blood of Gruumsh | 3     | CON      | Tap each adjacent enemy, slide each 2 squares       |

**Implementation** (verified against `src/assets/orders/` scans — several corrections):

- Shove Aside: doc previously implied distance 1 — actual slide distance is **3** (the "1" refers to how many creatures are affected, not how far).
- Tide of Iron: doc previously said "slide 1... shift into vacated" (implying the shift moves into the slid creature's old square) — the card actually has **two independent effects**: slide 1 adjacent creature 2 squares, AND separately shift this creature 2 squares. No stated link between them.
- Fear: doc previously said "slide 3" — actual is **5** squares, and it's usable by any Dragon-type creature regardless of CHA (Dragon Affinity).
- Furious Bellow matches prior summary; level/ability added.
- Add `slideAdjacent` properties
- Add multi-target slide mechanics
- Direction selection UI

---

### Phase MIN-6: Tap Effects

Cards that tap enemy creatures.

| Card       | Faction            | Level | Ability | Effect                                    |
| ---------- | ------------------ | ----- | -------- | ------------------------------------------ |
| Feint (x2) | Sting of Lolth     | 1     | DEX      | Tap 1 adjacent creature                   |
| Mage Hand  | Tyranny of Goblins | 1     | INT      | Choose a Treasure square within 5, reveal/take 1 Treasure token, OR tap 1 creature within 5 |

**Implementation** (verified against `src/assets/orders/` scans — matches prior summary, level/ability + Mage Hand's Treasure Chest reveal detail added):

- Add `tapTarget` property with range
- OR choice for Mage Hand

---

### Phase MIN-7: Minor Attacks

Attacks as MINOR actions.

| Card               | Faction          | Level | Ability | Effect                      |
| ------------------ | ---------------- | ----- | -------- | ---------------------------- |
| Quick Jab (x2)     | Sting of Lolth   | 1     | DEX      | Melee attack (base damage, no bonus)  |
| Quick Shot (x2)    | Heart of Cormyr  | 1     | DEX, Requires Ranged | Ranged attack (base damage, no bonus) |
| Necrotic Howl (x2) | Curse of Undeath | 3     | CHA, Requires Undead | 10 damage to each enemy adjacent to this creature |

**Implementation** (verified against `src/assets/orders/` scans — numbers match prior summary; doc previously missing creature-type restrictions on Quick Shot/Necrotic Howl, see cross-cutting note):

- Add MINOR attack capability
- Integrate with attack system but doesn't tap

---

### Phase MIN-8: Attachment Removal

Cards that remove attachments.

| Card              | Faction            | Level | Ability | Effect                                                          |
| ----------------- | ------------------ | ----- | -------- | ------------------------------------------------------------------ |
| Saving Throw (x2) | Heart of Cormyr    | 1     | ANY      | Remove 1 attached card from this creature                      |
| Rally             | Tyranny of Goblins | 1     | CHA      | Choose 1 ally within 5 squares, remove all attached Order cards from it |
| Dispel Magic (x2) | Curse of Undeath   | 3     | INT      | Choose this creature or any creature within 5, remove 1 attached Order card of your choice |

**Implementation** (verified against `src/assets/orders/` scans):

- Saving Throw matches prior summary; level/ability added.
- Rally: doc previously said "adjacent ally" — actual range is **5 squares**, not adjacent-only.
- Dispel Magic: numbers match (range 5), but doc didn't note self-targeting is allowed, or that the removed card is chosen (not random).
- Add attachment removal targeting
- Different ranges: self, adjacent, within X

---

### Phase MIN-9: Attach Buff Cards (MINOR)

MINOR cards that attach lasting effects.

| Card                   | Faction            | Level | Ability | Effect                                            |
| ---------------------- | ------------------ | ----- | -------- | -------------------------------------------------- |
| Acrobatics (x2)        | Tyranny of Goblins | 1     | DEX      | Attach: gain Scuttle (shifts when it moves) and ignore difficult terrain |
| Arcane Scroll (x2)     | Tyranny of Goblins | 1     | ANY, Requires Humanoid | Attach — ability-use clause **not fully legible on the scan** (see note below) |
| Beastmaster (x2)       | Blood of Gruumsh   | 3     | WIS      | Attach: Beast creatures you control deal +10 damage with melee attacks |
| Faerie Fire (x2)       | Sting of Lolth     | 2     | INT, Drow Affinity | Attach to 1 creature within 10 squares: attacks targeting it deal +10 damage to it |
| Web (x2)               | Sting of Lolth     | 1     | INT, Spider Affinity | Attach to 1 creature within 10 squares: can't move/shift, remove as a standard action |
| Loping Stride (x2)     | Tyranny of Goblins | 1     | DEX      | Attach: +2 base Speed                             |
| Mage Armor (x2)        | Curse of Undeath   | 1     | INT      | Attach: remove to prevent 10 damage from 1 source |
| Magic Short Sword (x2) | Curse of Undeath   | 1     | ANY, Requires Humanoid | Attach: this creature's melee damage cannot be prevented (no damage bonus) |
| Regenerate (x2)        | Curse of Undeath   | 4     | CON      | Attach: heals 10 damage at the start of controller's turn |
| Spawn of Kyuss         | Curse of Undeath   | 1     | CON, Requires Undead | Attach: each enemy takes 10 damage whenever it ends its activation adjacent to this creature |
| Call to Battle (x2)    | Curse of Undeath   | 3     | CHA      | Attach: as a standard action, deploy 1 creature now; gain 1 Morale first if in a Magic Circle square |
| Undaunted Surge (x2)   | Tyranny of Goblins | 3     | CON      | Remove attachments, attach: this creature's melee attacks deal +10 damage |
| ~~Tough as Nails~~     | —                   | —     | —        | **⚠️ DUPLICATE/MISPLACED — already implemented under IMD-11.** Verified against the scan: this card is actually Level 2, CON, order type **IMMEDIATE** (not Minor). It's the same card already complete in Phase IMD-11 above. This row should be deleted — no new work needed. |

**Implementation** (verified against `src/assets/orders/` scans — extensive corrections, see per-card notes above; summary of the most consequential ones):

- Mage Armor: doc previously said "prevent 20" — actual is **prevent 10**.
- Magic Short Sword: doc previously said "+10 melee, unprevented" — actual has **no melee damage bonus at all**, only the unpreventable-damage effect.
- Regenerate: doc previously said "heal 10 at Cleanup, not undead" — actual triggers at the **start of controller's turn** (not Cleanup), and the card prints **no "not undead" restriction** at all.
- Spawn of Kyuss: doc previously said "10 damage to adjacent at Cleanup" — actual triggers **per-activation** (whenever an enemy ends its activation adjacent), not a single Cleanup-phase pulse, and hits every qualifying enemy.
- Call to Battle: doc previously said "can deploy adjacent" — actual card has no "adjacent" deployment restriction; it's an immediate deploy action plus a conditional Morale bonus.
- Faerie Fire/Web: doc previously omitted the Drow/Spider Affinity requirement and the 10-square attach range.
- **Arcane Scroll note**: the scan at `src/assets/orders/goblins/Goblin_ArcaneScroll_Order_3.png` is significantly lower-resolution than its sibling cards (164×233px vs ~350-490px) and its ability-use clause could not be reliably transcribed. Get a better scan or confirm the exact wording before implementing this specific card — not blocking any other MIN-9 card.
- Comprehensive attachment system
- Phase-triggered effects (Cleanup, Deploy, start-of-turn, per-activation — note the actual trigger timings above differ from what this doc originally assumed)
- Passive stat modifications

---

### Phase MIN-10: Teleport/Special Movement

Unique movement types.

| Card                    | Faction            | Effect                                    |
| ----------------------- | ------------------ | ----------------------------------------- |
| Dimension Door (x2)     | Curse of Undeath   | Teleport up to 9 squares                  |
| Secret Passage (x2)     | Sting of Lolth     | Shift 3 through walls/creatures           |
| Portal Stone (x2)       | Tyranny of Goblins | Teleport to magic circle (costs treasure) |
| Relentless Advance (x2) | Curse of Undeath   | Take 10 damage, shift 4                   |

**Implementation**:

- Add teleport mechanics (ignore pathing)
- Add phase-through movement
- Resource cost integration

---

### Phase MIN-11: Multi-Creature Effects

Cards affecting multiple creatures.

| Card                   | Faction            | Effect                                 |
| ---------------------- | ------------------ | -------------------------------------- |
| Forward the Horde (x2) | Tyranny of Goblins | Self + ally shift 2                    |
| Goblin War Cry (x2)    | Tyranny of Goblins | Faction creatures +10 damage this turn |
| Unending Horde (x2)    | Curse of Undeath   | All other friendly creatures shift 2   |
| Scent of Blood (x2)    | Blood of Gruumsh   | Heal 10 per adjacent enemy             |

**Implementation**:

- Add multi-target selection
- Faction-wide buff tracking
- Adjacent enemy counting

---

### Phase MIN-12: Creature Control

Cards that control other creatures' actions.

| Card                | Faction            | Effect                                       |
| ------------------- | ------------------ | -------------------------------------------- |
| Death Sentence (x2) | Tyranny of Goblins | Creature within 5 makes melee attack         |
| Arcane Ritual (x2)  | Heart of Cormyr    | Attach, draw 1 if in magic circle at Cleanup |

**Implementation**:

- Force creature to attack
- Location-based triggers

---

### Phase MIN-13: Terrain Interactions

Cards interacting with terrain.

| Card           | Faction        | Effect                                         |
| -------------- | -------------- | ---------------------------------------------- |
| Fire Trap (x2) | Sting of Lolth | 20 damage to all within 2 of hazardous terrain |

**Implementation**:

- Terrain type detection
- AOE from terrain location

---

## IMPLEMENTATION ORDER SUMMARY

**IMMEDIATE** (10 remaining cards across 7 phases):

- IMD-5: Target Other Creatures (6 cards)
- IMD-6: Discard Cost (2 cards)
- IMD-7: Opponent Effects (1 card)
- IMD-8: OR Choice (2 cards)
- IMD-9: Morale Attack (2 cards)
- IMD-10: Self-Sacrifice (2 cards)
- IMD-11: Attach Cards (2 cards)

**STANDARD** (67 cards across 18 phases):

- STD-1 through STD-18

**MINOR** (88 cards across 13 phases):

- MIN-1 through MIN-13

---

## AI DIFFICULTY PATTERN

All order cards follow the 0/0/100 pattern:

- **Easy**: 0% - AI never uses order cards
- **Medium**: 0% - AI never uses order cards
- **Hard**: 100% - AI always uses order cards when beneficial

Gate function in `simpleAI.js`:

```javascript
canUseOrderCards() {
  return this.difficulty === 'hard'
}
```

---

## CROSS-CUTTING: CREATURE-TYPE RESTRICTIONS

Found while auditing card scans against the doc's (previously inaccurate) summaries: many cards print a "REQUIRES [Humanoid/Undead/Adventurer/Ranged]" clause, or an "[Dragon/Drow/Spider] Affinity" clause, that this doc never tracked before. Examples found so far: Death Grip (Requires Undead, STD-13), Shattered Weapon & Vorpal Sword (Requires Humanoid, STD-17), Heroic Surge (Requires Adventurer, MIN-2), Healing Potion (Requires Humanoid, MIN-3), Quick Shot (Requires Ranged, MIN-7), Necrotic Howl (Requires Undead, MIN-7), Fear (Dragon Affinity, MIN-5), Faerie Fire (Drow Affinity, MIN-9), Web (Spider Affinity, MIN-9), Magic Short Sword & Spawn of Kyuss (Requires Humanoid/Undead, MIN-9), Fire Trap (Requires Humanoid, MIN-13), Arcane Scroll (Requires Humanoid, MIN-9).

Two distinct mechanisms are needed:

- **Affinity cards** (Fear/Dragon, Faerie Fire/Drow, Web/Spider) — the engine already has this via `affinityRequired` + `affinityOverridesRequirements` (added in STD-6 for Vampiric Touch/VAMPIRE): the creature type check REPLACES the normal level/ability gate rather than adding to it.
- **Plain "REQUIRES X" cards** — a mandatory type gate that's checked IN ADDITION to the normal level/ability requirements (not a replacement). **Correction (found during STD-8 implementation): this mechanism already exists** — `OrderCard.requiresCreatureType` (`src/models/orders.ts`) is already a class property, already threaded through the constructor, and already checked in `OrderCard.canBeUsedBy()` (`if (this.requiresCreatureType && !creature.type.includes(this.requiresCreatureType)) return false`). No new property is needed; these cards just need `requiresCreatureType: 'Humanoid'` (etc.) set on their data entries, and — for any card whose dispatch branch in `handleOrderCardRightClick` does its own manual level/ability checks rather than calling `canBeUsedBy()` — an explicit `requiresCreatureType` check added alongside those, matching the existing level/ability check pattern.

Not needed for STD-8 (neither Blast of Force nor Hypnotic Gaze has this clause). First phase that will actually need `requiresCreatureType` wired into a dispatch branch is STD-13 (Death Grip, Requires Undead).

---

## FILES TO MODIFY

**Core Files**:

- `src/models/orders.js` - Add new properties to OrderCard class
- `src/models/gameState.js` - Card execution logic
- `src/models/CommanderAbilityManager.js` - Defense/targeting options
- `src/ai/simpleAI.js` - AI card usage decisions
- `src/services/AITurnManager.js` - AI turn execution

**UI Files**:

- `src/components/DefenseOptionsPanel.jsx` - Target selection UI
- `src/components/GameBoard.jsx` - Card execution handling
- New modals as needed for complex choices

**Faction Data**:

- `src/data/factions/*.js` - Update card definitions with new properties
