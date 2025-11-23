# 🎮 GAMEPLAY GUIDE - Dungeon Command Digital Edition

## ✅ FULLY PLAYABLE!

**Movement and Combat are now COMPLETE!** The game is fully playable with all core mechanics implemented.

---

## 🚀 Quick Start

The dev server is running at: **http://localhost:5173**

1. Open your browser to that URL
2. Click **"Start New Game"**
3. Start playing!

---

## 🎯 What's New - MOVEMENT & COMBAT!

### ✅ Complete Movement System
- Click any of your creatures on the board to select them
- **Valid movement tiles turn GREEN** with ➜ arrows
- Click a green tile to move there
- Movement respects:
  - Creature speed (shown on creature card)
  - Terrain costs (forests = 1, difficult terrain = 2, mountains = impassable)
  - Obstacles (can't move through other creatures)

### ✅ Complete Combat System
- Select your creature
- **Valid attack targets get RED pulsing borders** with 🎯 icons
- Click an enemy to attack
- Supports both **melee** and **ranged** attacks automatically
- Damage is calculated and applied
- Creatures are destroyed when HP reaches 0
- **CUSTOM RULE**: Killing an enemy grants +1 morale to the attacker!

### ✅ Visual Feedback
- **Green tiles** = Can move here ➜
- **Red pulsing enemies** = Can attack 🎯
- **Gold highlight** = Selected creature
- **⤵️ indicator** = Tapped creature (can still move, but can't attack)
- Real-time combat messages show damage, HP, and morale changes

---

## 📋 How to Play - Complete Guide

### Starting a Game

1. Click "Start New Game"
2. A random battlefield is generated with:
   - Forests 🌲 (provide cover, normal movement cost)
   - Mountains ⛰️ (impassable)
   - Difficult terrain 〰️ (costs 2 movement)
   - Magic circles ✨ (1 per player)
3. Both players start with creatures and orders in hand

### The Four Turn Phases

---

#### **1️⃣ REFRESH Phase**

What happens:
- Draw 1 order card
- Untap all your creatures

What to do:
- Click "Execute Refresh"

---

#### **2️⃣ ACTIVATE Phase** ⚔️ **[THIS IS WHERE THE ACTION HAPPENS!]**

This is the main phase where you move and attack!

**To Move a Creature:**
1. Click on one of your creatures on the board
2. Valid movement tiles turn **GREEN** with ➜ symbols
3. Click a green tile to move there
4. Creature walks to that position

**To Attack an Enemy:**
1. Click on one of your creatures on the board
2. Enemies in range get **RED pulsing borders** with 🎯 icons
3. Click an enemy to attack
4. Attack resolves:
   - Melee attack if adjacent (distance ≤ 1)
   - Ranged attack if creature has ranged ability and target is within range
   - Damage is dealt
   - If enemy dies:
     - Enemy is removed from board
     - Defender loses morale equal to creature's level
     - **YOU GAIN +1 MORALE** (custom rule!)
5. Your creature becomes tapped (⤵️)

**Important:**
- Tapped creatures can still move but cannot attack again this turn
- All creatures untap at the start of your next turn

When done:
- Click "End Activate Phase"

---

#### **3️⃣ DEPLOY Phase**

What happens:
- Your leadership increases by 1

What to do:
1. Click a creature card in your hand (left panel)
2. Click an empty tile on the board
3. Creature deploys if you have enough leadership
   - Total level of all your creatures on board ≤ your current leadership
4. Click "Execute Deploy" when done
   - Draws creature cards back to hand limit

---

#### **4️⃣ CLEANUP Phase**

What happens:
- All creatures untap
- Draw order cards back to hand limit

What to do:
- Click "End Turn"
- Turn passes to the opponent

---

## 🎲 Game Rules

### Win Conditions
- **Reduce opponent's morale to 0** - Primary win condition
- **Eliminate all enemy creatures** - If both players lose all creatures, highest morale wins

### Key Stats

**Morale** (Green bar)
- Your "life points"
- Lose morale when your creatures die (lose = creature's level)
- **Gain +1 morale when you kill an enemy** (custom rule!)
- Reach 0 morale = you lose

**Leadership** (Blue bar)
- Limits how many creatures you can have on the board
- Increases by 1 each Deploy phase
- Total level of creatures in play ≤ leadership
- Example: Leadership 6 → Can have creatures totaling level 6 (like: one level 4 + one level 2)

### Creature Stats

**Level** - Power level (1-6)
**HP** - Hit points (shown as current/max on board)
**Speed** - How far it can move (typically 6-8)
**Melee Attack** - Damage dealt when adjacent
**Ranged Attack** - Damage dealt at range (if creature has ranged ability)
**Abilities** - STR, DEX, CON, INT, WIS, CHA (determines which order cards they can use)

### Terrain Effects

| Terrain | Symbol | Effect |
|---------|--------|--------|
| Normal  | -      | Movement cost: 1 |
| Forest  | 🌲     | Movement cost: 1 |
| Difficult | 〰️   | Movement cost: 2 |
| Mountain | ⛰️    | **Impassable** |
| Magic Circle | ✨ | Movement cost: 1, owned by a player |

### Combat Rules

1. **Attacking taps the creature** (Standard action)
2. **Melee range** = Distance 1 (adjacent)
3. **Ranged attacks** = If creature has ranged ability and target is within range
4. **Damage** = Attacker's attack damage value
5. **HP tracking** = Defender's current HP shown on token
6. **Destruction** = When HP ≤ 0, creature is removed
7. **Morale loss** = Defender loses morale equal to creature's level
8. **Morale gain** = Attacker gains +1 morale (custom rule!)

---

## 💡 Strategy Tips

1. **Deploy early** - Use your leadership to get creatures on the board quickly
2. **Control terrain** - Use mountains and forests strategically
3. **Focus fire** - Destroy high-level creatures to make opponent lose more morale
4. **Morale management** - Each kill gives you +1 morale, so aggressive play is rewarded!
5. **Speed matters** - Fast creatures (speed 7-8) can reach enemies quicker
6. **Ranged advantage** - Creatures with ranged attacks can hit from safety
7. **Don't overextend** - Tapped creatures can't fight back immediately

---

## 🎨 Current Factions & Sample Creatures

### Sting of Lolth (Drow) - Player 1 (Blue)
- Drow Assassin (Lv 5) - High damage, DEX-based
- Drow Priestess (Lv 4) - Healing support, WIS/CHA
- Drow Wizard (Lv 4) - Ranged spellcaster, INT
- Giant Spider (Lv 3) - Fast, web abilities, STR/DEX

### Heart of Cormyr (Humans) - Player 2 (Red)
- Knight (Lv 5) - Tank, high HP, STR/CON
- Cleric (Lv 4) - Healer, WIS/CHA
- Ranger (Lv 4) - Ranged archer, STR/DEX
- Defender (Lv 3) - Guard, protection, STR/CON

---

## ⚡ Quick Reference

### During ACTIVATE Phase:
- **Select creature** → Click your creature on board
- **Move** → Click green tile ➜
- **Attack** → Click red enemy 🎯
- **Deselect** → Click anywhere else

### Indicators:
- 🟢 **Green border** = Valid move
- 🔴 **Red pulsing** = Can attack
- 🟡 **Gold border** = Selected
- ⤵️ **Arrow** = Tapped
- 🎯 **Target** = Attackable

### Combat Math:
- **Melee damage** = Attacker's melee damage stat
- **Ranged damage** = Attacker's ranged damage stat
- **Defender HP** = Current HP - Damage
- **If HP ≤ 0**:
  - Creature destroyed
  - Defender: -Level morale
  - Attacker: +1 morale ✨

---

## 🚧 What's NOT Implemented Yet

- ❌ Order cards (can't play them yet)
- ❌ AI opponent actions (Player 2 doesn't act automatically)
- ❌ Faction selection (hardcoded to 2 factions for now)
- ❌ Complete card database (only 4 sample creatures per faction)
- ❌ Special abilities (not all creature abilities work yet)

For now, you control both players - perfect for learning and testing!

---

## 🎉 Enjoy the Game!

The core game is now **fully playable**! Move your creatures, attack enemies, manage your morale, and fight for victory!

**Remember:** Killing enemies grants you +1 morale - so go on the offensive! ⚔️
