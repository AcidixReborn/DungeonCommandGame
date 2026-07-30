# Architecture

This document describes how Dungeon Command Digital Edition is put together: the layers, the key design decisions behind them, and why. It's written for a technical reader who wants to understand the system quickly, not just a directory listing.

## Stack

React 18 + Vite 6 (renderer) + Electron 39 (desktop shell) + TypeScript (incremental migration, see [Migration status](#migration-status)) + Bootstrap 5/react-bootstrap. Vitest for tests, ESLint 9 (flat config) + Prettier for static checks, GitHub Actions for CI, GitHub Pages for the browser demo.

## Layers

The engine is organized bottom-up, each layer depending only on the ones below it:

```
data/factions/*.js        — pure card/creature/commander data (271 cards total)
        │
models/                   — domain state: GameState, PlayerState, Board, Creature, OrderCard
        │
abilities/                — ~30 per-ability modules (has/canUse/use/getBonus), imported by name
        │
CombatResolver, CommanderAbilityManager, PhaseManager  — rules engine, composed into GameState
        │
ai/simpleAI.ts + services/AITurnManager.ts             — AI decision-making + turn orchestration
        │
hooks/                    — React state, one hook per concern (selection, combat, deployment...)
        │
components/               — rendering only; GameBoard.jsx composes everything above into the UI
```

### Data layer: `src/data/factions/*.js`

Five faction files (Blood of Gruumsh, Curse of Undeath, Heart of Cormyr, Sting of Lolth, Tyranny of Goblins), each exporting plain-object arrays of `commanders`, `creatures`, and `orderCards`. **20 commanders, 71 creature cards, 180 order cards — 271 cards total.** Adding a new card is meant to be a data change: the card's fields (`abilityRequired`, `actionType`, `moveBeforeAttack`, `shiftBeforeAttack`, `flatMeleeDamage`, etc. — `OrderCard` in `src/models/orders.ts` has ~50 optional fields) drive engine behavior without new branching in the renderer.

### Domain models: `src/models/`

`GameState`/`PlayerState` (`gameState.ts`, ~4,660 lines — the largest file in the codebase) hold all mutable game state: players, board, hands, morale, leadership. It's a plain class, not a Redux-style reducer — methods mutate `this` directly (e.g. `player.morale -= moraleCost`), and React re-renders are forced via a `renderCounter` state bump rather than replacing the state object. This was an existing convention kept intentionally rather than rewritten mid-migration; see [Testing](#testing) for how it's safety-netted.

`Board.ts`, `creatures.ts`, `orders.ts`, `commanders.ts`, `treasure.ts` define the shared domain types (`Tile`, `Position`, `CreatureInstance`, `AttackProfile`, etc.) that everything downstream imports.

### Rules engine: composition, not inheritance

Three "manager" classes each take `gameState` in their constructor and are instantiated once, by `GameState` itself:

```ts
this.combatResolver = new CombatResolver(this)
this.abilityManager = new CommanderAbilityManager(this)
this.phaseManager = new PhaseManager(this)
```

- **`PhaseManager.js`** owns the turn/phase cycle: `REFRESH → ACTIVATE → DEPLOY → CLEANUP → endTurn()`. It applies water-damage-over-time when leaving ACTIVATE, processes Deep Wound/Mortal Wound effects, increments leadership on DEPLOY (turn > 1), and checks win conditions after eliminations.
- **`CombatResolver.ts`** (~1,220 lines) owns attack validation and execution: `validateAttack`, `executeAttack`, line-of-sight (`hasLineOfSight`), splash damage, and ability hooks like Life Drain and Death Strike that trigger mid-combat.
- **`CommanderAbilityManager.ts`** (~1,200 lines) owns the universal defensive mechanics available to every commander regardless of faction — COWER, UNSTOPPABLE HORDES, IMMEDIATE-card defense — plus faction-specific commander abilities (Chieftain Call, Orc Scout deployment, etc.).

`GameState` exposes thin delegator methods (`advancePhase()` → `this.phaseManager.advancePhase()`) so callers don't need to know these are separate objects. This composition split exists because `GameState`'s constructor creates a genuine circular dependency — the managers call back into dozens of `GameState` methods — which is also why `CombatResolver`/`CommanderAbilityManager` briefly held `gameState: any` during the TypeScript migration until `gameState.ts` itself existed to type against (see [Migration status](#migration-status)).

### Ability modules: `src/abilities/`

Each creature/commander ability (Flying, Regenerate, Insubstantial, Rider, Healing Touch, ...) is its own small module implementing whatever subset of `has(creatureInstance)` / `canUse(...)` / `use(...)` / `getBonus(...)` it needs — not every ability needs all four. `GameState` imports each one by name (`import { Flying, Regenerate, Rider } from '../abilities/shared/index.js'`) and wraps it in a same-named delegator (`hasFlying()`, `hasRegenerate()`). There's also a generic `AbilityManager` registry (`src/abilities/index.ts`) for iterating all abilities at once, but the hot path is direct, named imports rather than a runtime lookup table — a deliberate trade-off favoring compile-time traceability (grep for `hasRegenerate` and you find every call site) over the flexibility of a registry.

### AI: `src/ai/simpleAI.ts` + `src/services/AITurnManager.ts`

Split into two concerns:
- **`AITurnManager.ts`** is orchestration — decides whether the current player is AI-controlled, instantiates a fresh `SimpleAI` each turn, calls `executeTurn()`, and replays/validates any queued attack intentions.
- **`SimpleAI.ts`** (~3,800 lines) is the decision-making brain: targeting, movement, and — the pattern used consistently across dozens of decision points — a **0/50/100% difficulty rule**: easy AI never uses an optional ability or defense, medium uses it via a coin flip (`Math.random() < 0.5`), hard always uses it. The same rule is reused in `PhaseManager.shouldUseRegenerate()` for REGENERATE healing, so it's a whole-codebase convention, not just an AI-module quirk.

### Utilities: `src/utils/`

`pathfinding.ts` implements two distinct algorithms for two distinct problems, worth being precise about: `findPath()` is genuine A* (g/h/f costs, Manhattan-distance heuristic, open/closed lists) for single-target pathing, while `getValidMovementTiles()` (movement-range/reachability) uses Dijkstra via a binary-heap `PriorityQueue.ts` — deliberately not A*, since there's no single target to bias search toward. A code comment at the Dijkstra call site notes it replaced an earlier BFS implementation that produced incorrect results because BFS can't account for variable terrain movement cost. Both handle 8-directional movement and creature-specific traversal rules (SCUTTLE can pass through but not stop on certain tiles; FLYING/BURROW change which terrain is stoppable).

### React layer: `hooks/` + `components/`

State and rendering are deliberately separated:

- **16 custom hooks** (`src/hooks/`) each own one slice of state: general concerns (`useSelection`, `useCombat`, `useAbilityModals`, `useAITurn`, `useDeployment`, `useNotifications`) plus **10 ability-flow hooks**, one per card/ability that needs its own multi-step interaction sequence (`useChargeAttack`, `useShiftAttack`, `useLightningBreath`, `useConfusionGaze`, `useSlam`, `useRider`, `useRangedSplashDefense`, `useFlashingBlades`, `useHiddenBlade`, `useCloudOfBatsShift`, `useHealingTouch`). The ability-flow hooks were extracted from a single 12,492-line `GameBoard.jsx` in a dedicated decomposition pass — see [Modernization-Plan.md](docs/Modernization-Plan.md#phase-e-gameboardjsx-decomposition-interleaved-with-phase-d) for the full changelog of what moved where and why, including the real bugs that extraction caught.
- **36 presentational components** (`src/components/`) render off that state. `GameBoard.jsx` (~8,000 lines, down from 12,492) is the orchestrator — it calls every hook, then composes three purpose-built sub-components for rendering: `BoardGridArea` (the tile grid and all its per-tile highlight logic), `GameBoardModals` (all ~20 modal dialogs), and `PlayerPanelSidebar` (the collapsible right-hand panel).

## Testing

52 Vitest characterization tests across 4 files (`src/__tests__/`), built against real `GameState`/`CombatResolver`/`SimpleAI` instances rather than mocks: `CombatResolver.test.js` (attack validation/execution, line-of-sight), `CommanderAbilityManager.test.js` (COWER, adjacency), `GameState.test.js` (morale accounting, defeat/win conditions), `simpleAI.test.js` (the 0/50/100% difficulty gates, targeting). This is intentionally not exhaustive coverage of the ~271-card rules surface — it targets the highest-risk, most foundational behaviors so the TypeScript migration and the `GameBoard.jsx` decomposition both had a regression safety net for the *engine*, even though the UI layer itself has no automated test coverage (a known gap — see [Known limitations](#known-limitations)).

## Migration status

The codebase is TypeScript except `GameBoard.jsx` and its extracted-but-still-JS ability-flow hooks (the 10 hooks listed above stayed `.js` deliberately, matching `GameBoard.jsx`'s own file type at the time they were extracted from it — typing them properly is bundled with whatever eventually converts `GameBoard.jsx` itself). Migration strategy was incremental rather than a strict-mode rewrite: `allowJs: true`, `checkJs: false`, `noImplicitAny: false` in `tsconfig.json`, ratcheted up as more of the codebase converted. `.js` import specifiers were never updated to `.ts` during the migration — Vite/esbuild and `tsc` (`moduleResolution: "Bundler"`) both resolve a `.js` specifier to a sibling `.ts` file automatically.

## CI/CD & deployment

`.github/workflows/ci.yml` runs on every push/PR to `main`: `tsc --noEmit` → ESLint → Vitest → `vite build`. A second `deploy` job (gated on the first passing, and only on pushes to `main`) uploads the built `dist/` as a Pages artifact and deploys it to GitHub Pages — the [live demo](https://acidixreborn.github.io/DungeonCommandGame/) is this exact pipeline's output, not a hand-uploaded build.

## Known limitations

- **`GameBoard.jsx` is still large** (~8,000 lines) even after decomposition — what remains is core interaction/phase-orchestration logic (tile click/drag handling, order-card resolution dispatch, AI turn coordination) rather than a mix of that plus rendering and per-ability logic.
- **No UI-level test coverage.** The 52 Vitest tests characterize the engine; nothing automates the React component tree or user interactions.
- **UI is not responsive/fit-to-screen** yet — the live demo looks best in fullscreen (F11) at typical desktop resolutions.
- **Single JS bundle** (~1 MB minified) — not yet code-split; fine for a demo, would want `manualChunks`/dynamic imports before it mattered in practice.
- **~155 Order Cards remain unimplemented** (STD-8 onward through MIN-13) — see [docs/Order-Card-Implementation-Plan.md](docs/Order-Card-Implementation-Plan.md), which was deliberately left untouched throughout this modernization effort and is the map back to resuming that work.
