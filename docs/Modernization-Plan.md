# Modernization Plan

Master plan for paying down technical debt before resuming Order Card content work. Written after a codebase review found development had paused after Phase STD-7 in `docs/Order-Card-Implementation-Plan.md` (STD-8 onward is still fully specified there and untouched by this plan).

**Why this exists**: this project serves two purposes — a game to play with friends/family, and a portfolio piece for job searching. The codebase has real strain (an 11k-line `GameBoard.jsx`, zero automated tests, no linting, no TypeScript, no CI) that should be addressed before adding the remaining ~155 Order Cards, so new work lands on a solid, resume-worthy foundation.

**Execution approach**: one phase at a time, each ending in a checkpoint (`npm run dev` still launches the game, `npm run build` succeeds, and — once added — lint/typecheck/tests pass clean) before moving to the next. This doc is the source of truth for what's done and what's next if work pauses partway through.

---

## Phase 0: Persist This Roadmap ✅ COMPLETE
- ✅ Created `docs/Modernization-Plan.md` (this file)
- ✅ `docs/Order-Card-Implementation-Plan.md` left completely untouched — still the map back to STD-8

---

## Phase A: Foundation & Git Hygiene

| Item | Status |
|------|--------|
| Add `dist-electron/`, `.vite/` to `.gitignore` | ⬜ |
| `git rm --cached` the currently-tracked build artifacts | ⬜ |
| Add `LICENSE` file (MIT for code; WotC IP disclaimer in README/ABOUT stays as-is) | ⬜ |
| Flesh out `package.json` metadata (`description`, `repository`, `author`, `keywords`, `license`) | ⬜ |
| Resolve/remove stale `// TODO: Apply card effects` at `GameBoard.jsx:1470` | ⬜ |
| Roll out file-based `logger` (`src/utils/logger.js`) to remaining ~95 `console.log` sites | ⬜ |

---

## Phase B: Tooling — ESLint + Prettier + TypeScript Setup

| Item | Status |
|------|--------|
| Add ESLint (flat config) + `eslint-plugin-react-hooks` + `@typescript-eslint` | ⬜ |
| Add Prettier | ⬜ |
| Add `typescript`, create `tsconfig.json` with `allowJs: true` for incremental migration | ⬜ |
| Add `npm run lint` script | ⬜ |
| Add `npm run typecheck` script | ⬜ |

---

## Phase C: Testing Infrastructure

| Item | Status |
|------|--------|
| Add Vitest + `@testing-library/react` + `jsdom` | ⬜ |
| Characterization tests: `CombatResolver.js` (combat math, damage prevention) | ⬜ |
| Characterization tests: `CommanderAbilityManager.js` | ⬜ |
| Characterization tests: `GameState`/`PlayerState` core flows (`gameState.js`) | ⬜ |
| Characterization tests: key `simpleAI.js` scoring functions | ⬜ |
| Add `npm test` script | ⬜ |

*Write these tests in JS, before converting the corresponding files to TS in Phase D — they lock in current behavior so the migration can't silently change game rules.*

---

## Phase D: TypeScript Migration (Incremental, Bottom-Up)

Convert in dependency order — each step should only depend on already-typed code:

| Step | Files | Status |
|------|-------|--------|
| 1 | `constants/gameConstants.js`, `utils/` (PriorityQueue, pathfinding, logger) | ⬜ |
| 2 | Core models: `creatures.js`, `orders.js`, `commanders.js`, `Board.js`, `treasure.js` (define shared domain types here) | ⬜ |
| 3 | `CombatResolver.js`, `CommanderAbilityManager.js` | ⬜ |
| 4 | `gameState.js` (`PlayerState`, `GameState`) | ⬜ |
| 5 | `simpleAI.js`, `services/AITurnManager.js` | ⬜ |
| 6 | `hooks/` (`useCombat`, `useSelection`, `useAbilityModals`, `useAITurn`, `useDeployment`, `useNotifications`) | ⬜ |
| 7 | Components, smallest first, working up to `GameBoard.jsx` last (after Phase E decomposition) | ⬜ |

Turn on stricter compiler flags (`noImplicitAny`, `strictNullChecks`, eventually full `strict`) incrementally as more of the codebase converts.

---

## Phase E: `GameBoard.jsx` Decomposition (Interleaved with Phase D)

| Item | Status |
|------|--------|
| Extract remaining inline attack-flow logic (shift/charge/damage-boost) into hooks, following the `useAbilityModals` pattern | ⬜ |
| Split render tree into sub-components: board/grid area | ⬜ |
| Split render tree into sub-components: side panels | ⬜ |
| Split render tree into sub-components: modal-orchestration layer (~20 modals currently wired through one file) | ⬜ |

---

## Phase F: CI/CD

| Item | Status |
|------|--------|
| Add `.github/workflows/ci.yml` running `tsc --noEmit`, ESLint, Vitest, `npm run build` on push/PR | ⬜ |
| Add CI status badge to `README.md` | ⬜ |

---

## Phase G: Live Web Demo

| Item | Status |
|------|--------|
| Confirm Electron-only code paths (logger IPC) are guarded for browser context | ⬜ |
| Deploy Vite web build (`dist/`) to GitHub Pages / Vercel / Netlify | ⬜ |
| Add live demo link near top of `README.md` | ⬜ |

---

## Phase H: Resume Polish

| Item | Status |
|------|--------|
| Add `ARCHITECTURE.md` documenting layers and key design decisions | ⬜ |
| Update `README.md` with live demo link, screenshot/GIF, "Highlights" section | ⬜ |
| Adopt conventional commit messages going forward (`feat:`, `fix:`, `refactor:`) | ⬜ |

---

## Resuming Card Content

Once Phase H is complete, resume at **Phase STD-8** in `docs/Order-Card-Implementation-Plan.md` ("Attack + Slide" — Blast of Force, Hypnotic Gaze), continuing through STD-9–18 and MIN-1–13.
