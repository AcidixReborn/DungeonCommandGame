# About Dungeon Command - Digital Edition

## 🎲 What is Dungeon Command?

**Dungeon Command** was a tactical miniatures board game published by **Wizards of the Coast** from 2012 to 2013. Set in the **Dungeons & Dragons** universe, it combined strategic creature deployment, card-driven combat, and tactical positioning on a gridded battlefield.

This digital edition is a personal project that recreates the core gameplay mechanics of Dungeon Command as a browser-based game, allowing players to experience tactical dungeon battles without needing physical components.

---

## 🎮 Game Concept

### The Original Game

Dungeon Command was designed as a fast-paced, competitive skirmish game where players:

- Commanded a faction of D&D creatures
- Managed resources (Morale and Leadership)
- Used order cards to enhance their creatures' abilities
- Battled on a modular, terrain-filled battlefield

Each faction came in a standalone box with:

- 12 creature cards
- 36 order cards
- Plastic miniatures
- Dungeon tiles for terrain
- Commander card and tokens

### This Digital Version

This recreation captures the essence of Dungeon Command with:

- **5 playable factions** from the original game
- **Turn-based tactical gameplay** with movement and combat
- **Card-driven abilities** using order cards
- **Resource management** (Morale and Leadership)
- **Procedurally generated battlefields** with varied terrain
- **Treasure token system** for additional morale gains
- **AI opponents** for solo play
- **Clean, modern interface** built with React

---

## 🎭 The Five Factions

### 1. Sting of Lolth (Drow)

_Cunning servants of the Spider Queen_

The drow are agile, deceptive, and deadly. This faction excels at:

- Stealth and surprise attacks
- Poison and debilitating effects
- Speed and evasion
- Dark magic and spider-themed abilities

**Playstyle:** Hit-and-run tactics, controlling the battlefield

---

### 2. Heart of Cormyr (Humans)

_Noble defenders of the realm_

Humans of Cormyr are well-trained, disciplined, and versatile. This faction excels at:

- Balanced offense and defense
- Team coordination
- Healing and protection
- Tactical flexibility

**Playstyle:** Adaptive strategy, strong fundamentals

---

### 3. Tyranny of Goblins (Goblinoids)

_Chaotic swarm of goblin raiders_

Goblins rely on numbers, tricks, and overwhelming force. This faction excels at:

- Swarming tactics with cheap creatures
- Traps and dirty tricks
- Sacrifice mechanics
- Overwhelming the enemy with numbers

**Playstyle:** Aggressive swarm, sacrifice for advantage

---

### 4. Curse of Undeath (Undead)

_Relentless army of the damned_

The undead are resilient, fearless, and endlessly persistent. This faction excels at:

- Regeneration and revival mechanics
- Fear effects and debuffs
- Wearing down opponents
- Sacrificial strategies

**Playstyle:** Attrition warfare, outlasting opponents

---

### 5. Blood of Gruumsh (Orcs)

_Brutal warriors of the savage horde_

Orcs are savage, powerful, and relentlessly aggressive. This faction excels at:

- Raw physical power
- High-damage attacks
- Berserker abilities
- Intimidation and fear

**Playstyle:** Aggressive melee combat, overwhelming force

---

## 🎯 Core Mechanics

### 1. Morale System

Your **morale** is your life total. When it reaches 0, you lose!

- Starts at 15-25 depending on your commander
- Lost when your creatures die (each creature costs morale)
- Gained by killing enemy creatures (+1 morale per kill)
- Gained by collecting treasure tokens

### 2. Leadership System

Your **leadership** limits how many creatures you can deploy:

- Each creature has a level (1-3)
- Total creature levels can't exceed your leadership
- Leadership increases by +1 each turn
- Forces strategic choices about which creatures to deploy

### 3. Turn Phase Structure

Games flow through four phases each turn:

1. **REFRESH** - Draw cards, untap creatures
2. **ACTIVATE** - Move, attack, use abilities
3. **DEPLOY** - Deploy new creatures to the battlefield
4. **CLEANUP** - Reset for next turn

### 4. Card-Driven Abilities

**Order cards** enhance your creatures' capabilities:

- Each creature has six abilities (STR, DEX, CON, INT, WIS, CHA)
- Order cards require specific abilities to use
- Cards provide damage boosts, special moves, or tactical advantages
- Three card types: Standard, Minor, and Immediate

### 5. Tactical Terrain

The battlefield features multiple terrain types:

- **Forests** - Slow movement, provide cover
- **Mountains** - Block movement and line of sight
- **Difficult terrain** - Slow movement
- **Magic circles** - Special zones for spellcasters
- **Starting zones** - Where you deploy creatures

### 6. Treasure Tokens

Collect morale tokens scattered across the battlefield:

- Each faction places 3 random tokens (values: 1, 2, or 3)
- Tokens are hidden until revealed
- Collecting uses a creature's action
- Provides crucial morale advantage

---

## 🎨 Design Philosophy

This digital edition aims to:

### Stay Faithful to the Original

- Preserve core mechanics and gameplay flow
- Maintain faction identities and playstyles
- Keep the fast-paced, tactical feel

### Enhance the Experience

- **Procedural terrain** - Every game has a unique battlefield
- **AI opponents** - Practice against computer players with tactical decision-making
- **Instant setup** - No shuffling, sorting, or table space needed
- **Automatic rule enforcement** - The game handles complex interactions like line-of-sight
- **Visual clarity** - See all information at a glance with intuitive icons and indicators
- **Line-of-sight visualization** - Orange arrows show ranged attack paths in real-time
- **Attack type indicators** - Sword (⚔️) for melee, bow (🏹) for ranged attacks

### Remain Accessible

- **Free to play** - No microtransactions or paywalls
- **Browser-based** - Works on any modern device
- **Solo-friendly** - Play against AI anytime
- **Quick matches** - Games typically last 20-30 minutes

---

## 🛠️ Technical Details

### Built With

- **React 18** - Modern, component-based UI framework
- **Vite** - Lightning-fast development and build tool
- **Bootstrap 5** - Responsive, professional styling
- **JavaScript** - Core game logic and state management

### Architecture

The game is structured into clear layers:

- **Models** - Game state, creatures, cards, commanders
- **Components** - UI elements (board, tiles, cards, panels)
- **AI** - Computer opponent decision-making
- **Utils** - Pathfinding, calculations, helpers

### Performance

- Optimized for smooth gameplay
- Efficient pathfinding with A* algorithm
- Minimal re-renders with React optimization
- Lightweight bundle size

---

## 📜 Legal & Attribution

### Disclaimer

This is a **personal, non-commercial project** created for:

- Educational purposes
- Personal enjoyment
- Portfolio demonstration
- Fan appreciation of the original game

### Intellectual Property

- **Dungeon Command** is a trademark of **Wizards of the Coast LLC**
- All **Dungeons & Dragons** content is owned by **Wizards of the Coast**
- Character names, faction names, and game concepts belong to their respective owners
- This project is **not affiliated with, endorsed by, or sponsored by Wizards of the Coast**

### Open Source

This project is provided as-is for personal use:

- Source code is available for learning purposes
- Feel free to fork, modify, or learn from the code
- Not intended for commercial distribution
- Card data and images must be provided by users from their own collections

---

## 🎯 Project Goals

### Current Status: Playable Alpha

The game currently includes:

- ✅ Full turn-based gameplay
- ✅ Movement with pathfinding and terrain costs
- ✅ Melee and ranged combat with line-of-sight system
  - Visual indicators: ⚔️ for melee attacks, 🏹 for ranged attacks
  - Ranged attack restrictions (forests, mountains, adjacent targets)
  - Line-of-sight visualization with orange arrows (➤)
- ✅ Order card system with Immediate reactions
- ✅ Creature deployment and management
- ✅ Treasure token collection (treasures avoid water tiles)
- ✅ AI opponents with tactical decision-making
- ✅ All 5 factions with sample creatures
- ✅ Enhanced UI with clear attack type indicators and creature stats

### Future Enhancements

Potential future additions:

- More creature and order card variety
- Advanced creature abilities (beyond what's implemented)
- Multiplayer support (local or online)
- Save/load game functionality
- Replay system
- Tournament mode
- Expanded faction rosters
- Custom deck building

---

## 🤝 For Fans of...

If you enjoy these games, you'll likely enjoy Dungeon Command:

- **D&D Attack Wing / X-Wing** - Tactical miniatures combat
- **Summoner Wars** - Card-driven tactical battles
- **BattleCON** - Fighting game strategy on a grid
- **Mage Wars** - Tactical spellcaster duels
- **Heroscape** - Modular battlefield tactics
- **Warhammer Underworlds** - Competitive skirmish with cards

---

## 💬 Philosophy

> "A good game is easy to learn but difficult to master."

Dungeon Command Digital Edition strives to:

- **Respect your time** - Quick setup, clear rules, fast gameplay
- **Reward strategy** - Deep tactical decisions without overwhelming complexity
- **Encourage creativity** - Multiple paths to victory
- **Provide clarity** - All information visible, no hidden mechanics
- **Preserve the magic** - Capture the excitement of the original tabletop experience

---

## 🎮 Why Dungeon Command?

### What Made It Special

Dungeon Command stood out in 2012 for several reasons:

1. **No dice** - Pure strategy without luck-based combat
2. **Fast setup** - Games started in minutes
3. **Modular factions** - Mix and match for variety
4. **Tactical depth** - Simple rules, complex decisions
5. **D&D flavor** - Iconic monsters and heroes

### Why It Deserves Preservation

Despite being discontinued in 2013, Dungeon Command:

- Had a passionate fanbase
- Offered unique gameplay distinct from other tactical games
- Featured beautiful miniatures and art
- Provided quick, satisfying tactical battles
- Deserved a longer life than its short print run

This digital edition ensures that the game lives on and remains accessible to new players.

---

## 🌟 Acknowledgments

### Inspired By

- **Wizards of the Coast** - For creating the original Dungeon Command
- **Kevin Wilson** - Game designer of Dungeon Command
- **The D&D Community** - For keeping classic games alive
- **The Dungeon Command Fan Community** - For their continued love of the game

### Built With Love

This project represents:

- Hundreds of hours of development
- Deep appreciation for tactical board games
- Commitment to preserving gaming history
- Passion for the D&D universe

---

## 📧 Contact & Feedback

This is a personal project, but feedback is welcome:

- Found a bug? Please report it!
- Have suggestions? Share your ideas!
- Want to contribute card data? That would be amazing!

---

## 🎲 Final Thoughts

Dungeon Command was a brilliant game that deserved more recognition. This digital edition is a tribute to its design, a preservation of its gameplay, and an invitation to new players to discover what made it special.

Whether you're a veteran player revisiting fond memories or a newcomer experiencing tactical dungeon battles for the first time, welcome to **Dungeon Command: Digital Edition**.

_May your dice—err, cards—favor you, Commander!_ ⚔️

---

**Version:** Alpha 1.0
**Last Updated:** December 2024
**Status:** Playable, under active development
