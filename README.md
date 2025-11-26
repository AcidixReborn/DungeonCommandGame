# Dungeon Command - Digital Edition

A digital implementation of the Wizards of the Coast board game "Dungeon Command" for personal use.

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
│   ├── components/          # React components
│   │   ├── GameBoard.jsx    # Main game interface
│   │   ├── BoardTile.jsx    # Individual tile with terrain
│   │   ├── CreatureCard.jsx # Creature display
│   │   ├── OrderCard.jsx    # Order card display
│   │   ├── PlayerPanel.jsx  # Player info and hands
│   │   └── DataEntry.jsx    # Card data management
│   ├── models/              # Game logic
│   │   ├── gameState.js     # Core game state
│   │   ├── creatures.js     # Creature definitions
│   │   ├── orders.js        # Order card definitions
│   │   └── commanders.js    # Commander definitions
│   ├── data/
│   │   └── factions.js      # All 5 factions' data
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
├── package.json
└── vite.config.js
```

## 🛠️ Technologies

- **React 18** - UI framework
- **Vite** - Build tool and dev server (fast HMR)
- **Bootstrap 5** - UI components
- **React-Bootstrap** - Bootstrap components for React

## 📸 Features to Add Images For

To complete the visual experience, you'll want to add:
- Creature card artwork (12 cards per faction × 5 factions = 60 images)
- Order card artwork (36 cards per faction × 5 factions = 180 images)
- Commander portraits (2 per faction × 5 factions = 10 images)
- Optional: Miniature images for board display

Images can be added via:
1. The Data Entry interface (when complete)
2. Directly in the faction data files
3. Placed in a `/public/images/` folder and referenced by URL

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
- Sample card data is based on publicly available information
- Card images must be provided by the user from their physical copies

## 🤝 Contributing Your Card Data

Since you own the physical game, you can help complete the card database:
1. Use the Data Entry tab (when complete) to add cards
2. Or directly edit `src/data/factions.js`
3. Take photos of your cards and add them to `/public/images/`
4. Each card needs: name, level, abilities, effects, stats, etc.

The foundation is solid - now we just need the complete card data and combat mechanics!
