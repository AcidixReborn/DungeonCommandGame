# Dungeon Command - Digital Edition

[![CI](https://github.com/AcidixReborn/DungeonCommandGame/actions/workflows/ci.yml/badge.svg)](https://github.com/AcidixReborn/DungeonCommandGame/actions/workflows/ci.yml)

A digital implementation of the Wizards of the Coast board game "Dungeon Command" for personal use.

**▶️ [Play the live demo](https://acidixreborn.github.io/DungeonCommandGame/)** - runs entirely in your browser, no install needed.
> Tip: press <kbd>F11</kbd> for fullscreen after it loads - the UI isn't fit-to-screen responsive yet, so fullscreen looks noticeably cleaner.

<!-- TODO: add a gameplay screenshot or short GIF here -->

## ✨ Highlights

- **Data-driven rules engine** - 271 cards (20 commanders, 71 creatures, 180 order cards) across 5 factions, each defined as data rather than hardcoded logic
- **AI opponent** with a consistent 0/50/100% difficulty rule (easy/medium/hard) applied across dozens of decision points - movement, combat, defenses, and ability usage
- **Real pathfinding** - A* for single-target movement, Dijkstra (via a binary-heap priority queue) for movement-range calculation, both terrain-cost-aware
- **Full TypeScript migration** across the engine (models, AI, hooks) - see [ARCHITECTURE.md](ARCHITECTURE.md#migration-status) for the incremental strategy used
- **52 Vitest characterization tests** against real `GameState`/`CombatResolver`/`SimpleAI` instances, not mocks
- **CI-gated GitHub Actions pipeline** (typecheck → lint → test → build) that also deploys the live demo above on every push to `main`
- **Electron desktop app + browser build** from the same codebase

See [ARCHITECTURE.md](ARCHITECTURE.md) for how it's all put together, and [docs/Modernization-Plan.md](docs/Modernization-Plan.md) for the full changelog of the technical-debt paydown that got it here.

## 🎮 Current Status: PLAYABLE ALPHA

The game is now in a playable state! You can start a game, see the board with terrain, deploy creatures, and advance through turn phases.

## 🚀 Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start development server:

   ```bash
   npm run dev
   ```

3. Open browser to `http://localhost:5173`

4. Click "Start New Game" to begin!

## ✨ Custom Rules Implemented

- ❌ **No Cower Mechanic** - Creatures take damage directly
- ⚔️ **Morale Gain on Kill** - Killing an enemy creature grants +1 morale to the attacker's owner
- 🗺️ **Random Board Generation** - Each game generates a unique battlefield with:
  - Forests (10-15% of tiles)
  - Mountains (8-12% of tiles)
  - Difficult terrain (5-8% of tiles)
  - Magic circles (1 per faction/player)
- 👥 **Multi-Faction Support** - Up to 5 factions can play simultaneously (no duplicate factions)

## ✅ Implemented Features

### Core Game Systems

- ✅ **Full Game State Management** - Complete turn phases, morale, leadership tracking
- ✅ **Random Terrain Generation** - Dynamic battlefield with varied terrain types
- ✅ **5 Factions** - All factions with sample creatures and commanders
  - Sting of Lolth (Drow)
  - Heart of Cormyr (Humans)
  - Tyranny of Goblins (Goblinoids)
  - Curse of Undeath (Undead)
  - Blood of Gruumsh (Orcs)

### UI Components

- ✅ **Game Board** - 12x12 grid with terrain visualization
- ✅ **Board Tiles** - Color-coded terrain with symbols (forests 🌲, mountains ⛰️, etc.)
- ✅ **Creature Cards** - Full and compact views with stats
- ✅ **Order Cards** - Full and compact views with effects
- ✅ **Player Panels** - Morale/leadership tracking, hand display
- ✅ **Turn Phase System** - Automated phase progression
- ✅ **Creature Deployment** - Click-to-deploy from hand during Deploy phase

### Visual Features

- ✅ Creature tokens on board with HP display
- ✅ Tapped/untapped indicators
- ✅ Player-colored tokens (5 different colors)
- ✅ Terrain effects and symbols
- ✅ Magic circle ownership display
- ✅ Progress bars for morale and leadership

## 🎯 Current Features

### Fully Playable Gameplay

- ✅ **Complete turn-based system** - All four phases implemented
- ✅ **Creature movement** - A* pathfinding with terrain costs
- ✅ **Melee & ranged combat** - Attack adjacent or distant enemies
- ✅ **Order card system** - Play cards with ability requirements
- ✅ **Immediate reactions** - Use IMD cards on opponent's turn
- ✅ **Creature deployment** - Strategic creature placement
- ✅ **Treasure collection** - Gather morale tokens on the battlefield
- ✅ **AI opponents** - Play against computer-controlled enemies
- ✅ **Faction selection** - Choose from 5 unique factions

### Game Mechanics

- Flying creatures ignore terrain costs
- Pathfinding respects movement speed and terrain
- Tapping/untapping system for action management
- Morale and leadership resource management
- Victory conditions (morale depletion or creature elimination)

## 📖 Documentation

- **[Architecture](ARCHITECTURE.md)** - How the engine is put together, and the key design decisions behind it
- **[How to Play](HOW_TO_PLAY.md)** - Complete gameplay guide with rules and strategies
- **[About](ABOUT.md)** - Learn about Dungeon Command, factions, and the project

## 🎲 Quick Rules Reference

Dungeon Command is a dice-less, card-driven tactical miniatures game where:

### Turn Structure

1. **Refresh Phase** - Draw 1 order card, untap all creatures
2. **Activate Phase** - Move creatures and perform actions
3. **Deploy Phase** - Leadership increases by 1, deploy new creatures, draw creatures back to hand limit
4. **Cleanup Phase** - Untap creatures, draw orders back to hand limit, end turn

### Key Mechanics

- **Leadership** - Limits total level of creatures you can have in play
- **Morale** - Your life total; reach 0 and you lose
- **Order Cards** - Grant special abilities/actions to creatures
  - **Standard Actions** - Main attack/ability (taps creature)
  - **Minor Actions** - Don't tap creature
  - **Immediate Actions** - Use during opponent's turn (taps creature)
- **Creature Abilities** - STR, DEX, CON, INT, WIS, CHA determine which order cards they can use

### Win Conditions

- Reduce opponent's morale to 0
- Eliminate all enemy creatures (player with higher morale wins)

## 🗂️ Project Structure

```
DungeonCommandGame/
├── src/
│   ├── components/          # React components (rendering only)
│   │   ├── GameBoard.jsx    # Main orchestrator - calls every hook, composes the sub-components below
│   │   ├── BoardGridArea.jsx    # The tile grid and its per-tile highlight logic
│   │   ├── GameBoardModals.jsx  # All ~20 modal dialogs
│   │   ├── PlayerPanelSidebar.jsx # Collapsible right-hand panel
│   │   ├── BoardTile.tsx, CreatureCard.tsx, OrderCard.tsx, PlayerPanel.tsx, ...
│   ├── hooks/                # React state - one hook per concern (see ARCHITECTURE.md)
│   ├── models/               # Domain state: GameState/PlayerState, Board, creatures, orders, commanders
│   ├── abilities/            # Per-ability modules (has/canUse/use/getBonus), by faction
│   ├── ai/                   # SimpleAI decision-making
│   ├── services/             # AITurnManager (AI turn orchestration)
│   ├── utils/                # Pathfinding (A* + Dijkstra), logger, PriorityQueue
│   ├── data/factions/        # 5 faction data files - commanders, creatures, order cards
│   ├── __tests__/            # Vitest characterization tests
│   ├── App.jsx               # Root component
│   └── main.jsx               # Entry point
├── electron/                 # Electron main process + preload
├── docs/                     # Modernization plan, Order Card implementation plan
├── ARCHITECTURE.md
└── vite.config.js
```

## 🛠️ Technologies

- **React 18** + **TypeScript** - UI framework, fully typed except the (already decomposed) `GameBoard.jsx`
- **Vite 6** - Build tool and dev server (fast HMR)
- **Electron 39** - Desktop packaging
- **Bootstrap 5** / **React-Bootstrap** - UI components
- **Vitest** - Characterization tests for the engine
- **ESLint 9** (flat config) + **Prettier** - Static checks
- **GitHub Actions** - CI (typecheck/lint/test/build) + automated GitHub Pages deployment

## 🎮 Quick Start Guide

1. **Start New Game** - Click "Start New Game" and select factions
2. **REFRESH Phase** - Click "Execute Refresh" to draw cards and untap creatures
3. **ACTIVATE Phase** - Select creatures to move, attack enemies, use order cards, or collect treasures
4. **DEPLOY Phase** - Deploy creatures from your hand to starting zones
5. **CLEANUP Phase** - Click "End Turn" to pass to next player

**For detailed rules and strategies, see [HOW_TO_PLAY.md](HOW_TO_PLAY.md)**

## 📝 Notes

- This is a personal project for educational purposes
- Not intended for commercial distribution
- All Dungeon Command intellectual property belongs to Wizards of the Coast
- Card data and artwork for all 271 cards (20 commanders, 71 creatures, 180 order cards) across all 5 factions is in place
- Not every order card's gameplay logic is implemented yet - see [docs/Order-Card-Implementation-Plan.md](docs/Order-Card-Implementation-Plan.md) for what's done and what's next
