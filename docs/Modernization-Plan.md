# Modernization Plan

Master plan for paying down technical debt before resuming Order Card content work. Written after a codebase review found development had paused after Phase STD-7 in `docs/Order-Card-Implementation-Plan.md` (STD-8 onward is still fully specified there and untouched by this plan).

**Why this exists**: this project serves two purposes — a game to play with friends/family, and a portfolio piece for job searching. The codebase has real strain (an 11k-line `GameBoard.jsx`, zero automated tests, no linting, no TypeScript, no CI) that should be addressed before adding the remaining ~155 Order Cards, so new work lands on a solid, resume-worthy foundation.

**Execution approach**: one phase at a time, each ending in a checkpoint (`npm run dev` still launches the game, `npm run build` succeeds, and — once added — lint/typecheck/tests pass clean) before moving to the next. This doc is the source of truth for what's done and what's next if work pauses partway through.

---

## Phase 0: Persist This Roadmap ✅ COMPLETE

- ✅ Created `docs/Modernization-Plan.md` (this file)
- ✅ `docs/Order-Card-Implementation-Plan.md` left completely untouched — still the map back to STD-8

---

## Phase A: Foundation & Git Hygiene ✅ COMPLETE

| Item                                                                                             | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add `dist-electron/`, `.vite/` to `.gitignore`                                                   | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `git rm --cached` the currently-tracked build artifacts                                          | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Add `LICENSE` file (MIT for code; WotC IP disclaimer in README/ABOUT stays as-is)                | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Flesh out `package.json` metadata (`description`, `repository`, `author`, `keywords`, `license`) | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Resolve/remove stale `// TODO: Apply card effects` at `GameBoard.jsx:1470`                       | ✅ — the whole surrounding code path (`handleReactionsPlayed`) was dead, never wired up; removed it along with the orphaned 667-line `ImmediateReactionModal.jsx`/`.css` it belonged to (fully superseded by `DefenseOptionsPanel`, no longer imported anywhere)                                                                                                                                                                                                                             |
| Roll out file-based `logger` (`src/utils/logger.js`) to remaining ~95 `console.log` sites        | ✅ — also fixed `logger.js` itself, which had drifted to file-only output (Electron IPC only) despite its docstring promising console+file; that would've silently killed all logging under the documented browser `npm run dev` workflow. Added a `logger.debug(...)` variadic passthrough for GameBoard.jsx's dense multi-arg trace logs. Left `src/test/AbilitiesTest.jsx`'s `console.log` calls alone — those are an interactive test-runner's progress output, not gameplay debug noise |

**Checkpoint**: `npm install` + `npm run build` succeed cleanly.

---

## Phase B: Tooling — ESLint + Prettier + TypeScript Setup ✅ COMPLETE

| Item                                                                                     | Status                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add ESLint (flat config) + `eslint-plugin-react-hooks` + react/react-refresh plugins        | ✅ — pinned to ESLint 9.x (eslint-plugin-react doesn't support ESLint 10 yet). Deliberately only enabled the two classic, well-understood hook rules (`rules-of-hooks`, `exhaustive-deps`) rather than eslint-plugin-react-hooks v7's full "recommended" bundle, which also pulls in the newer React Compiler rule set (`set-state-in-effect`, `purity`, etc.) — better evaluated once Phase C's characterization tests exist |
| Add Prettier                                                                                | ✅ — config matches the codebase's existing style (no semicolons, single quotes) to minimize diff noise                                                                                                                                                                                                                     |
| Add `typescript`, create `tsconfig.json` with `allowJs: true` for incremental migration     | ✅                                                                                                                                                                                                                                                                                                                             |
| Add `npm run lint` / `lint:fix` / `format` / `format:check` scripts                         | ✅                                                                                                                                                                                                                                                                                                                             |
| Add `npm run typecheck` script                                                              | ✅ — trivially passes for now (`checkJs: false`, zero `.ts` files yet); becomes meaningful during Phase D                                                                                                                                                                                                                     |
| Run `npm run lint` once, triage and fix real findings                                       | ✅ — found and fixed **two real bugs**: (1) `GameBoard.jsx` called `setClericDrawOrderResult(...)`, a setter that was never declared (only a read-alias existed) — this would throw a `ReferenceError` and crash the game whenever an Orc Cleric's deploy-draw ability triggered for a human player; (2) `gameState.js`'s `Insubstantial.use(...)` false-flagged as an invalid React Hook call due to its `use*` name colliding with hook-naming convention (added a scoped disable comment, not a rename — it's not a hook). Remaining 142 problems are all warnings (mostly pre-existing unused vars) — left as non-blocking backlog rather than hand-fixed |
| Run Prettier once across the whole codebase (had never been formatted)                     | ✅ — done as its own isolated commit (`8bac647`) with no logic changes, and added `.git-blame-ignore-revs` listing it so `git blame` skips straight to the real authorship underneath                                                                                                                                       |

**Checkpoint**: `npm run build`, `npm run lint` (0 errors), and `npm run typecheck` all pass clean.

---

## Phase C: Testing Infrastructure ✅ COMPLETE

| Item                                                                          | Status                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add Vitest + `@testing-library/react` + `jsdom`                               | ✅ — `vitest.config.js` merges `vite.config.js` so the real Vite/React setup is exercised; `vitest.setup.js` silences the logger's console noise in test output                                          |
| Characterization tests: `CombatResolver.js` (combat math, damage prevention)  | ✅ — 15 tests: range/LOS validation, REACH, flat-damage cards, damage reduction, kill resolution (morale, graveyard, tile cleanup), line-of-sight blocking by terrain/creatures                          |
| Characterization tests: `CommanderAbilityManager.js`                         | ✅ — 13 tests: the universal COWER mechanic (cost, tap, insufficient-morale/tapped rejection) and adjacency helpers                                                                                      |
| Characterization tests: `GameState`/`PlayerState` core flows (`gameState.js`) | ✅ — 10 tests: morale accounting/clamping, `isDefeated` (including the turn-1 grace period), `checkGameOver` win conditions                                                                              |
| Characterization tests: key `simpleAI.js` scoring functions                   | ✅ — 14 tests: the documented 0/0/100 AI difficulty gate pattern (`canUseCreatureAbilities`/`canUseImmediateCards`/`canUseDamageBoostCards`/`canUseOrderCards`), target selection, adjacency              |
| Add `npm test` / `npm run test:watch` scripts                                | ✅                                                                                                                                                                                                          |

All tests build real `GameState`/`CombatResolver`/`SimpleAI` instances via a shared `src/__tests__/testHelpers.js` fixture (not mocks) — they exercise the actual engine. **52 tests, all passing.** This is intentionally not exhaustive coverage of the ~1000+ lines of ability/card interactions — it targets the highest-risk, most foundational behaviors so Phase D's TypeScript conversion has a safety net for the core rules, not a full regression suite.

**Checkpoint**: `npm test` (52/52 passing), `npm run lint` (0 errors), `npm run build` all pass clean.

---

## Phase D: TypeScript Migration (Incremental, Bottom-Up)

Convert in dependency order — each step should only depend on already-typed code. Confirmed pattern: files keep their `.js` import specifiers (e.g. `from './logger.js'`) even after the source becomes `logger.ts` — Vite/esbuild and `tsc` (with `moduleResolution: "Bundler"`) both resolve `.js` specifiers to a sibling `.ts` file automatically, so **no import statements need to change anywhere in the codebase** as files convert.

| Step | Files                                                                                                                  | Status |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | `constants/gameConstants.js`, `utils/` (PriorityQueue, pathfinding, logger)                                            | ✅ Also wired `typescript-eslint` into `eslint.config.js` (scoped to `.ts`/`.tsx` only), and pinned `typescript` to 5.9.3 — `typescript-eslint` doesn't support TS 7 yet (very new native rewrite, ecosystem hasn't caught up). Added `src/types/electron.d.ts` for the `window.electronAPI` ambient type. |
| 2    | Core models: `creatures.js`, `orders.js`, `commanders.js`, `Board.js`, `treasure.js` (define shared domain types here) | ✅ Defined the shared domain shapes (`Tile`, `Position`, `AttackProfile`, `AbilityScores`, `AttachOnUseConfig`, etc.) other files will import going forward. `OrderCard`'s ~50 optional properties (the whole card-flag system the Order Card plan is built on) are now fully typed — the compiler will catch typos across all 5 faction data files once those convert. |
| 3    | `CombatResolver.js`, `CommanderAbilityManager.js`                                                                      | ✅ Both fully typed except the `gameState` property itself, which stays `any` for now — GameState's constructor instantiates both of these classes while they call back into dozens of its methods, a genuine runtime circular dependency. Will tighten `gameState: any` to a real type once `gameState.ts` exists (Step 4). |
| 3.5  | `src/abilities/**` — all 31 creature/order-card ability modules (not itemized in the original plan; discovered while scoping `gameState.js`, which imports ~24 of them directly) | ✅ Same `has()`/`canUse()`/`use()`/`getBonus()` pattern typed consistently across all 5 factions + shared. Caught a real (if currently unreachable) bug: `regenerate.ts`'s `apply()` read `creature.hp`, which doesn't exist on the `Creature` model (the field is `hitPoints`) — `maxHP` was always `undefined`, making healing always `NaN`. Fixed to match the correct pattern already used in `lifeDrain.ts`. The live REGENERATE heal path (`PhaseManager.js` calling `creature.heal()` directly) was unaffected. |
| 4    | `gameState.js` (`PlayerState`, `GameState`)                                                                            | ✅ The biggest single file in the codebase (4,581 lines) — copied byte-for-byte to `.ts` first (zero transcription risk), then added explicit class property declarations (TypeScript classes require declared members even in non-strict mode) rather than re-typing all ~150 methods individually. Went back and tightened `CombatResolver`/`CommanderAbilityManager`'s `gameState: any` to the real `GameState` type via type-only imports (no runtime circularity). **Found and fixed two real, currently-live bugs**: (1) `PlayerState` never had an `id` field, so `player.id === attackerOwner` in CONFUSION GAZE's targeting check was always `false` — the "skip my own creatures" guard never fired, meaning CONFUSION GAZE could target the attacker's own creatures; (2) a creature-death cleanup path called `this.returnAttachedCardsToGraveyard(creature)`, a method that was never defined anywhere — this would throw and crash the ACTIVATE phase whenever a creature died from Deep Wound's activation damage (STD-7, the last feature phase completed before development paused). Fixed by calling the correct existing method, `discardAttachedCards`. |
| 5    | `simpleAI.js`, `services/AITurnManager.js`                                                                             | ✅ Copied byte-for-byte first (same strategy as `gameState.ts`), then typed. Gave `decideDefense()` and its two delegate methods a proper discriminated union return type (`DefenseDecision`) instead of letting them infer loosely - `AITurnManager.ts` genuinely needs the narrowing to compile, not just for cleanliness. **Found and fixed 6 more instances of the exact same `.creature.hp` vs `.creature.hitPoints` typo** (the `Creature` model field is `hitPoints`; `hp` has never existed) across `shouldRemoveWeb`, `scoreWebTarget`, `decideDefense` (x2), and `decideImmediateReactions` - all silently produced `NaN` comparisons that always evaluate false, and in `scoreWebTarget`'s case, silently corrupted a targeting score instead of just going inert. Also fixed 2 more instances of `treasure.x`/`treasure.y` (should be `treasure.position.x`/`.position.y`) and one `tile.deployZone` (should be `tile.startingZoneOwner`) - together these three bugs meant the AI's `shouldRemoveWeb` decision function always returned null, i.e. it never chose to remove a Web attachment from its own creature. Swept the whole codebase afterward to confirm no remaining `.creature.hp` references exist anywhere. |
| 6    | `hooks/` (`useCombat`, `useSelection`, `useAbilityModals`, `useAITurn`, `useDeployment`, `useNotifications`)           | ✅ All 6 hooks + barrel converted. `useAbilityModals.ts` (726 lines, ~30 modal state groups) copied over essentially unchanged and typechecked cleanly with zero errors - it's pure `useState`/`useCallback` boilerplate with inferrable initial values and no class properties, so there was nothing to add. The other 5 got real types (`CreatureInstance`, `AttackTarget`, `GameState`, etc.) since they're smaller and the precision was cheap. |
| 7    | Components, smallest first, working up to `GameBoard.jsx` last (after Phase E decomposition)                           | ✅ All 39 components (excluding `GameBoard.jsx`, which needs Phase E decomposition first) bulk-renamed `.jsx` → `.tsx` via `git mv`, then `npm run typecheck` run once to see the real aggregate error count instead of retyping every file upfront — only ~20 errors surfaced, in a handful of repeating patterns: react-bootstrap's `Modal` doesn't accept `size="md"` in its types (it's just the default, removed as a no-op from 12 call sites), a `Badge` `size` prop that react-bootstrap has never supported, `CreatureCard`/`OrderCard` needing explicit prop interfaces (many callers only pass a subset of props, which is fine at runtime but TS treats undefaulted destructured props as required), a class-component `ErrorBoundary` needing `Props`/`State` generics, and a couple of `Object.entries()` results needing a type assertion. Also found one more dead prop (`showHoverPopOut`, passed by `GraveyardPanel` but never read by `CreatureCard`) and removed it. Along the way, disabled `@typescript-eslint/no-unused-expressions`' stricter default (it flags the codebase's pervasive and intentional `condition && doThing()` statement idiom) via `allowShortCircuit`/`allowTernary`. |

Turn on stricter compiler flags (`noImplicitAny`, `strictNullChecks`, eventually full `strict`) incrementally as more of the codebase converts.

---

## Phase E: `GameBoard.jsx` Decomposition (Interleaved with Phase D)

| Item                                                                                                                        | Status |
| --------------------------------------------------------------------------------------------------------------------------- | ------ |
| Extract remaining inline attack-flow logic (shift/charge/damage-boost) into hooks, following the `useAbilityModals` pattern | ⬜     |
| Split render tree into sub-components: board/grid area                                                                      | ⬜     |
| Split render tree into sub-components: side panels                                                                          | ⬜     |
| Split render tree into sub-components: modal-orchestration layer (~20 modals currently wired through one file)              | ⬜     |

---

## Phase F: CI/CD

| Item                                                                                              | Status |
| ------------------------------------------------------------------------------------------------- | ------ |
| Add `.github/workflows/ci.yml` running `tsc --noEmit`, ESLint, Vitest, `npm run build` on push/PR | ⬜     |
| Add CI status badge to `README.md`                                                                | ⬜     |

---

## Phase G: Live Web Demo

| Item                                                                          | Status |
| ----------------------------------------------------------------------------- | ------ |
| Confirm Electron-only code paths (logger IPC) are guarded for browser context | ⬜     |
| Deploy Vite web build (`dist/`) to GitHub Pages / Vercel / Netlify            | ⬜     |
| Add live demo link near top of `README.md`                                    | ⬜     |

---

## Phase H: Resume Polish

| Item                                                                            | Status |
| ------------------------------------------------------------------------------- | ------ |
| Add `ARCHITECTURE.md` documenting layers and key design decisions               | ⬜     |
| Update `README.md` with live demo link, screenshot/GIF, "Highlights" section    | ⬜     |
| Adopt conventional commit messages going forward (`feat:`, `fix:`, `refactor:`) | ⬜     |

---

## Resuming Card Content

Once Phase H is complete, resume at **Phase STD-8** in `docs/Order-Card-Implementation-Plan.md` ("Attack + Slide" — Blast of Force, Hypnotic Gaze), continuing through STD-9–18 and MIN-1–13.
