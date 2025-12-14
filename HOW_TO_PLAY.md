# How to Play - Dungeon Command Digital Edition

## 🎯 Objective

Defeat your opponent by reducing their **Morale** to 0, or eliminate all their creatures and have more morale than them!

---

## 🎮 Game Setup

1. **Start a New Game** - Click "Start New Game" from the main menu
2. **Select Factions** - Choose your faction and your opponent's faction from the available options:
   - **Sting of Lolth** (Drow) - Agile and cunning
   - **Heart of Cormyr** (Humans) - Balanced and versatile
   - **Tyranny of Goblins** (Goblinoids) - Swarm tactics
   - **Curse of Undeath** (Undead) - Resilient and dark
   - **Blood of Gruumsh** (Orcs) - Brutal strength
3. **Choose Player Type** - Select Human or AI for each player
4. The game board generates with random terrain, starting zones, and treasure tokens

---

## 📊 Understanding the Interface

### Game Board
- **Dynamic grid size**: 20×20 for 2 players (+4 tiles per additional player)
- **Terrain symbols**: 🌲 Forest, ⛰️ Mountain, 🟫 Difficult Terrain, ⭐ Magic Circle, 🏠 Starting Zone, 🌊 Water
- **Treasure tokens**: 💎 Morale tokens scattered across the board
- **Creatures**: Colored tokens representing your creatures on the board

### Player Panel
- **Morale Bar**: Your life total (starts at 15-25 depending on commander)
- **Leadership**: Limits the total level of creatures you can deploy
- **Creature Hand**: Creatures you can deploy
- **Order Card Hand**: Special action cards you can play

### Turn Phases Display
Shows the current phase: REFRESH → ACTIVATE → DEPLOY → CLEANUP

---

## 🔄 Turn Structure

Each turn consists of four phases:

### 1. REFRESH Phase
**What Happens:**
- Draw 1 order card from your deck
- All your creatures untap (ready for action)

**Actions:** Click "Execute Refresh" to complete this phase

---

### 2. ACTIVATE Phase
This is where the main action happens!

#### **Movement**
1. Click on one of your creatures to select it
2. Valid movement tiles will be highlighted in green
3. Click on a green tile to move your creature
   - Creatures can move up to their **Speed** value
   - **Terrain affects movement**:
     - Normal terrain: 1 movement per tile
     - Forest: 2 movement per tile
     - Difficult terrain: 2 movement per tile
     - Mountains: Impassable (except for flying creatures)
   - Flying creatures ignore terrain costs (except mountains)

#### **Combat**
1. Select your creature
2. Valid attack targets are highlighted on the board
   - **Melee attacks** (⚔️): Adjacent tiles only
   - **Ranged attacks** (🏹): Within the creature's range, line of sight permitting
3. Click on an enemy creature to attack them
4. Damage is dealt based on the attack value vs. the defender's HP
5. If a creature's HP reaches 0, it's destroyed and you gain +1 morale!
6. Attacking **taps** your creature (turns it sideways)

**Ranged Attack Restrictions:**
- Cannot shoot **from** a forest tile
- Cannot shoot **at** a creature on a forest tile
- Cannot shoot **through** forests or mountains (line of sight blocked)
- Cannot shoot at adjacent enemies (use melee instead)
- Enemy creatures block line of sight (but allied creatures don't)
- When you select a creature with ranged attacks, orange arrows (➤) show the line-of-sight path

#### **Using Order Cards**
1. Click on an order card in your hand
2. Select a target creature (yours or enemy's, depending on the card)
3. The card effect is applied
   - **Standard Actions**: Tap the creature after use
   - **Minor Actions**: Don't tap the creature
   - **Immediate (IMD) Actions**: Can be used on opponent's turn as a reaction

#### **Collecting Treasure**
1. Move your creature onto a treasure token (💎)
2. The treasure value is revealed
3. Click "Collect Morale" button
4. You gain +1 morale per collection action
5. The creature is **tapped** after collecting
6. Treasures are removed when all morale is collected

**Actions:** When done with all actions, click "End Activate Phase"

---

### 3. DEPLOY Phase
**What Happens:**
- Your leadership increases by +1
- You can deploy new creatures from your hand

#### **Deploying Creatures**
1. Click a creature card in your hand
2. Click an empty tile in your **starting zone** (🏠)
3. The creature is placed if you have enough leadership
   - Each creature has a **level** (1-3 typically)
   - Total levels of deployed creatures can't exceed your leadership

**Actions:**
- Click "Execute Deploy" to draw creatures back to hand limit
- Click "End Deploy Phase" when ready

---

### 4. CLEANUP Phase
**What Happens:**
- All your creatures untap again
- Draw order cards back to your hand limit
- Turn passes to the next player

**Actions:** Click "End Turn"

---

## 🎴 Understanding Cards

### Creature Cards
Each creature has:
- **Name**: The creature's name
- **Level**: Leadership cost to deploy
- **HP**: Health points (when reduced to 0, creature dies)
- **Speed**: How many tiles it can move
- **Melee Attack**: Damage dealt in close combat (shown as "Melee: X" on card)
- **Ranged Attack**: Damage dealt at range if applicable (shown as "Ranged: X" on card)
- **Abilities**: STR, DEX, CON, INT, WIS, CHA (determines which order cards they can use)
- **Special Abilities**: Unique powers like Flying, Regeneration, etc.

**Visual Indicators:**
- Creature cards in your hand display both Melee and Ranged attack values
- On the board, attack targets show different icons:
  - ⚔️ **Sword icon** = Melee attack available
  - 🏹 **Bow icon** = Ranged attack available

### Order Cards
Order cards provide special actions and effects:
- **Action Type**:
  - STD (Standard): Main action, taps creature
  - MNR (Minor): Doesn't tap creature
  - IMD (Immediate): Can be used on opponent's turn
- **Requirements**: Which abilities (STR, DEX, etc.) are needed to use the card
- **Effect**: What the card does (damage, movement, buffs, etc.)

---

## 🗺️ Terrain Effects

### Movement Costs
- **Normal**: 1 movement point per tile
- **Forest** 🌲: 2 movement points per tile
- **Difficult** 🟫: 2 movement points per tile
- **Water** 🌊: 2 movement points per tile (non-flying creatures take 10 damage at end of ACTIVATE phase!)
- **Mountain** ⛰️: Impassable (flying creatures can't land on them)
- **Magic Circle** ⭐: 1 movement point
- **Starting Zone** 🏠: 1 movement point

### Special Rules
- **Flying creatures** ignore terrain costs (but still can't land on mountains)
- **Treasures** 💎 reveal their value when you move onto them (treasures never spawn on water tiles)
- Creatures can move through allied creatures but not enemy creatures
- **Line of Sight**: Forests and mountains block ranged attacks when in the path between attacker and target

---

## 💎 Treasure System

Treasures are morale tokens placed by each faction:
- Each faction places **3 random tokens** worth 1, 2, or 3 morale
- Tokens are **hidden** until a creature moves onto them
- **Collecting morale** uses your creature's action (taps them)
- Collect 1 morale per action
- Treasures disappear when fully collected
- **Strategy tip**: Treasures provide a morale advantage, so don't ignore them!

---

## 🎯 Strategy Tips

1. **Balance offense and defense** - Don't over-commit to attacks
2. **Manage your leadership** - Deploy creatures wisely
3. **Use terrain to your advantage** - Forests and difficult terrain slow movement
4. **Collect treasures early** - Extra morale gives you a buffer
5. **Save Immediate cards** - They can save your creatures during enemy attacks
6. **Protect low-HP creatures** - They're easier to kill
7. **Watch your morale** - If it gets too low, play defensively
8. **Use ranged attacks** - Keep dangerous melee enemies at bay
9. **Coordinate attacks** - Sometimes you need multiple creatures to take down a strong enemy
10. **Don't forget to untap** - Creatures that are tapped can't act!

---

## 🏆 Winning the Game

You win when:
1. Your opponent's morale reaches **0**
2. Your opponent has **no creatures left** and you have more morale

---

## 🎲 Game Controls

### Mouse Controls
- **Left-click creature**: Select for movement/attack
- **Left-click tile**: Move selected creature
- **Left-click enemy**: Attack with selected creature
- **Left-click card**: Select card to play
- **Left-click button**: Execute phase actions

### Keyboard Shortcuts
- Currently no keyboard shortcuts implemented

---

## ❓ Common Questions

**Q: Why can't I move my creature?**
A: Check if the creature is tapped (has already acted), or if you're in the wrong phase (movement is in ACTIVATE phase only).

**Q: Why can't I attack?**
A: The target might be out of range, or your creature might already be tapped from moving/attacking.

**Q: Why can't I deploy a creature?**
A: You might not have enough leadership, or you might be clicking outside your starting zone.

**Q: What happens if I run out of cards?**
A: Your deck reshuffles automatically when empty.

**Q: Can I move and attack in the same turn?**
A: Yes! You can move and attack with the same creature in the ACTIVATE phase.

**Q: Do flying creatures ignore all terrain?**
A: Flying creatures ignore movement costs for terrain but still can't land on mountains.

**Q: Can I use multiple order cards per turn?**
A: Yes! You can play as many order cards as you want during your turn (as long as you have valid targets).

---

## 🐛 Known Issues

- Some order card effects are not fully implemented yet
- AI decision-making is basic and may make suboptimal moves
- Creature special abilities are partially implemented

---

## 🎮 Ready to Play?

Now that you know the rules, start a new game and test your tactical skills! Remember: victory comes from smart deployment, careful positioning, and knowing when to attack or defend.

Good luck, Commander! ⚔️
