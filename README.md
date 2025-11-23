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

## 🎯 Currently Working

The game board is functional with:
- Turn-based gameplay
- Creature deployment system
- Phase advancement
- Morale and leadership tracking
- Visual board with creatures

## 📋 Next Steps (Priority Order)

1. **Creature Movement & Combat**
   - Click creature to select
   - Click tile to move (respecting speed and terrain)
   - Click enemy creature to attack
   - Ranged attack support
   - Line of sight calculations

2. **Order Card System**
   - Play order cards from hand
   - Ability requirement checking
   - Action type enforcement (Standard/Minor/Immediate)
   - Card effects implementation

3. **Deck/Warband Selection**
   - Pre-game faction selection screen
   - Commander choice
   - Support for 2-5 players
   - AI vs Human player selection

4. **Basic AI Opponent**
   - Simple decision-making
   - Creature deployment
   - Movement and attacks
   - Order card usage

5. **Data Entry System**
   - Forms to add/edit creatures
   - Forms to add/edit order cards
   - Image upload for cards
   - Export/import card data

6. **Advanced Features**
   - Save/load game state
   - Game history/replay
   - Special abilities implementation
   - Treasure tokens
   - Advanced AI

## 🎲 Game Rules Summary

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

## 🎮 How to Play (Current Build)

1. Click "Start New Game"
2. You'll see Player 1 (Sting of Lolth) vs Player 2 (Heart of Cormyr - AI)
3. Game starts in REFRESH phase - click "Execute Refresh" to draw cards
4. In ACTIVATE phase - click "End Activate Phase" (movement/combat coming soon)
5. In DEPLOY phase - click a creature in your hand, then click an empty tile to deploy it
6. Click "Execute Deploy" to increase leadership and draw more creatures
7. Click "End Turn" in CLEANUP phase to pass to next player

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
