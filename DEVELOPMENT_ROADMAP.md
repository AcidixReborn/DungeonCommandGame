# Dungeon Command Game - Development Roadmap

This document outlines the complete development plan for implementing all game features in priority order.

---

## ✅ Completed Steps

### Step 0: IMD Card Reaction System
**Status**: ✅ Complete

**What Was Implemented:**
- AI decision-making for Immediate (IMD) card usage
- Threat assessment system based on HP percentage and creature level
- Modal system for human players to use IMD cards
- Correct defender identification (not attacker)
- All player combinations supported (Human vs AI, AI vs Human, Human vs Human, AI vs AI)
- Comprehensive tracking and statistics
- Ability badges added to creature cards

**Documentation:**
- [STEP1_AI_DECISION_MAKING.md](STEP1_AI_DECISION_MAKING.md)
- [STEP1_AI_IMD_FIX.md](STEP1_AI_IMD_FIX.md)

---

## 🚀 Upcoming Steps

### Step 1: Terrain Movement Effects
**Priority**: 🔴 CRITICAL - Foundation for tactical gameplay
**Status**: ⏸️ Not Started
**See**: [STEP1_TERRAIN_REVIEW.md](STEP1_TERRAIN_REVIEW.md) for detailed analysis

**Goal**: Fix terrain generation and implement proper pathfinding for movement.

**🚨 CRITICAL ISSUES FOUND:**
1. **Terrain generation is broken**: Current system scatters random individual tiles (10-15% coverage)
   - Should generate **structured terrain regions** (clusters, not scatter)
   - Physical game uses 8×8 and 4×8 terrain tiles that form regions
   - Need 30-40% terrain coverage with clustered regions (forests, mountain ranges)

2. **Movement calculation is broken**: `movementCost = distance * terrainCost` is mathematically wrong
   - Should use **proper pathfinding** (A* or Dijkstra's) that sums path costs
   - Current math makes difficult terrain impassable in most cases

**Tasks:**

#### Phase 0: Fix Terrain Generation (MUST DO FIRST)
0. Replace random terrain scatter with structured regions
   - Option A: Programmatic region generation (recommended for Step 1)
   - Option B: Tile-based templates (authentic but complex)
   - Generate 4-6 terrain clusters per board
   - Increase terrain density to 30-40%
   - Mountains form ranges, forests form groves

#### Phase 1: Fix Movement System
1. Implement proper pathfinding algorithm (A* or Dijkstra's)
   - Calculate actual path from start to destination
   - Sum terrain costs along path (not distance × cost!)
   - Only allow movement if total path cost ≤ creature speed

2. Add movement cost display
   - Show cost number on each reachable tile
   - Show path preview on hover
   - Gray out expensive but reachable tiles

3. Update AI to use pathfinding
   - AI should find efficient paths
   - Avoid difficult terrain when possible
   - Use terrain for defense

4. Add basic special movement support
   - Check for "Flying" in creature.specialAbilities
   - Flying ignores terrain costs (except mountains?)
   - Full implementation in Step 7

5. Add tests
   - Test movement through terrain regions
   - Verify pathfinding finds correct paths
   - Verify AI navigates around obstacles

**Files to Modify:**
- `src/models/gameState.js` - Terrain generation + pathfinding
- `src/ai/simpleAI.js` - AI movement decisions
- `src/components/GameBoard.jsx` - Visual feedback
- `src/components/BoardTile.jsx` - Cost display
- `src/components/GameBoard.css` - Terrain styling

**Files to Create:**
- `src/utils/pathfinding.js` - A* or Dijkstra's algorithm

---

### Step 2: Implement Treasures
**Priority**: HIGH - Core game mechanic
**Status**: ⏸️ Not Started

**Goal**: Add treasure tokens that provide bonuses when picked up by creatures.

**Tasks:**

#### 2.1: Create Treasure Data Model
- Define treasure types (Gold, Magic Items, Potions, etc.)
- Create Treasure class with properties:
  - `id`: Unique identifier
  - `type`: Treasure category
  - `name`: Display name
  - `effect`: What it does (e.g., "+2 ATK", "Heal 5 HP")
  - `value`: Morale value if applicable
  - `position`: Current board position

#### 2.2: Spawn Treasures on Board
- Add treasure spawn logic to board initialization
- Random placement in strategic locations
- Avoid spawning in starting zones
- Visual representation (treasure chest icon/token)

#### 2.3: Treasure Pickup Mechanics
- Detect when creature moves onto treasure tile
- Apply treasure effect to creature
- Remove treasure from board
- Add treasure to player's inventory (if applicable)
- Trigger morale gain if applicable

#### 2.4: Treasure Effects System
- **Immediate Effects**: Apply instantly (heal, damage boost)
- **Persistent Effects**: Last for duration (stat buffs)
- **Morale Rewards**: Increase player morale
- **Item Effects**: Special abilities or one-time use

#### 2.5: UI Display
- Show treasures on board tiles
- Display pickup notifications
- Show active treasure effects on creatures
- Add treasure inventory panel (if keeping treasures)

**Files to Create:**
- `src/models/treasure.js` - Treasure class and types

**Files to Modify:**
- `src/models/gameState.js` - Board initialization, treasure spawning
- `src/models/creatures.js` - Creature effects from treasures
- `src/components/GameBoard.jsx` - Treasure rendering and pickup
- `src/components/GameBoard.css` - Treasure styling
- `src/ai/simpleAI.js` - AI should prioritize valuable treasures

---

### Step 3: Implement Terrain Effects
**Priority**: MEDIUM - Enhances tactical depth
**Status**: ⏸️ Not Started

**Goal**: Add terrain-based combat and strategic effects beyond movement.

**Note**: This step complements Step 1 (Terrain Movement). Step 1 handles movement costs, while Step 3 handles combat/strategic effects.

**Tasks:**

#### 3.1: Terrain Combat Modifiers
- **Forest**: +1 Defense for creatures in forest tiles
- **Mountain**: +2 Defense, ranged attacks have advantage
- **Difficult**: -1 to all attack rolls
- **Magic Circle**: Spellcasting bonuses, mana regeneration
- **Starting Zone**: Home field advantage (morale bonus)

#### 3.2: Line-of-Sight System
- Mountains block line of sight for ranged attacks
- Forest provides partial cover (reduces ranged damage)
- Implement vision cone/range system

#### 3.3: Terrain Special Rules
- **Water/Lava**: Damage over time if creature enters
- **Bridges**: Choke points, tactical advantages
- **Elevated Terrain**: Height advantage for attacks
- **Destructible Terrain**: Some terrain can be destroyed

#### 3.4: Visual Indicators
- Highlight terrain bonuses when hovering over tiles
- Show attack modifiers based on attacker/defender terrain
- Display line-of-sight blockers

#### 3.5: AI Terrain Awareness
- AI should use terrain tactically
- Prefer defensive terrain when low HP
- Use terrain to block enemy movement

**Files to Modify:**
- `src/models/gameState.js` - Combat modifiers, line-of-sight
- `src/components/GameBoard.jsx` - Terrain effect indicators
- `src/ai/simpleAI.js` - Tactical terrain usage
- `src/models/combat.js` - Terrain-based attack calculations

---

### Step 4: Organize Order Cards by Action Type
**Priority**: HIGH - Improves usability and game flow
**Status**: ⏸️ Not Started

**Goal**: Categorize and organize order cards by when/how they can be used.

**Tasks:**

#### 4.1: Define Action Type Categories
- **Immediate (IMD)**: Already implemented - used during opponent's turn
- **Instant**: Used any time during your turn (before/after actions)
- **Combat**: Used during combat phase only
- **Deploy**: Used during deployment phase only
- **Buff**: Applied to creatures for ongoing effects
- **Debuff**: Applied to enemy creatures
- **Tactical**: Board manipulation, special maneuvers

#### 4.2: Add Action Type Property to Cards
- Update OrderCard class to include `actionType` property
- Update all existing card data files
- Add validation logic for when cards can be played

#### 4.3: UI Organization
- **Hand Display**: Group cards by action type
- **Visual Indicators**: Color-coding or icons for each type
- **Filters**: Allow filtering hand by action type
- **Tooltips**: Show when card can be played

#### 4.4: Gameplay Restrictions
- Enforce action type rules (e.g., Deploy cards only in Deploy phase)
- Show only valid cards during each phase
- Gray out unusable cards
- Add error messages for invalid card plays

#### 4.5: AI Card Selection
- Update AI to understand action types
- AI should prioritize cards based on current phase
- Better timing for Instant vs Combat cards

**Files to Modify:**
- `src/models/orderCard.js` - Add actionType property
- `src/data/orders/*.js` - Update all card definitions
- `src/components/OrderCardHand.jsx` - Grouped display
- `src/components/OrderCard.jsx` - Visual indicators
- `src/ai/simpleAI.js` - Action-type-aware decisions

---

### Step 5: Enhanced Attack Visualization
**Priority**: MEDIUM - Improves user experience
**Status**: ⏸️ Not Started

**Goal**: Add visual effects and animations to make combat more engaging.

**Tasks:**

#### 5.1: Attack Animations
- **Melee Attack**: Attacker sprite moves toward target
- **Ranged Attack**: Projectile animation (arrow, fireball, etc.)
- **Special Abilities**: Unique visual effects per ability
- **Impact Effects**: Screen shake, hit particles

#### 5.2: Damage Numbers
- Floating damage numbers above creatures
- Different colors for different damage types
- Critical hits show larger/special numbers
- Healing shows green numbers

#### 5.3: Health Bar Animations
- Smooth HP bar transitions
- Flash red when taking damage
- Flash green when healing
- Warning state when HP is low (< 40%)

#### 5.4: Combat Log
- Real-time combat feed showing:
  - "[Creature] attacked [Target] for X damage"
  - "[Creature] used [Ability]"
  - "[Creature] was destroyed!"
  - Morale changes
- Scrollable history
- Color-coded messages by importance

#### 5.5: Status Effects Visual
- Icons above creatures showing active effects
- Buffs (green outline/glow)
- Debuffs (red outline/glow)
- Tapped state (grayed out)

**Files to Create:**
- `src/components/AttackAnimation.jsx` - Animation components
- `src/components/CombatLog.jsx` - Combat feed component

**Files to Modify:**
- `src/components/GameBoard.jsx` - Trigger animations
- `src/components/GameBoard.css` - Animation keyframes
- `src/components/CreatureCard.jsx` - Status effect displays
- `src/models/gameState.js` - Combat event hooks

---

### Step 6: Add Card Images to UI
**Priority**: MEDIUM - Visual polish
**Status**: ⏸️ Not Started

**Goal**: Add artwork and visual identity to order cards and creatures.

**Tasks:**

#### 6.1: Image Asset Organization
- Create `/public/images/` directory structure:
  - `/creatures/` - Creature artwork
  - `/cards/` - Order card artwork
  - `/icons/` - Ability icons, status icons
  - `/terrain/` - Terrain tile graphics
  - `/treasures/` - Treasure token graphics
- Define image naming convention
- Supported formats: PNG, WebP, SVG

#### 6.2: Card Image Display
- Add `imageUrl` property to OrderCard class
- Display card art in hand
- Hover to enlarge card
- Full card preview modal
- Fallback placeholder for missing images

#### 6.3: Creature Art Integration
- CreatureCard already supports `imageUrl`
- Add creature portraits to all creature definitions
- Display in both compact and full card views
- Faction-themed art styles

#### 6.4: Icon System
- Create icon component library
- Ability icons (STR, DEX, CON, INT, WIS, CHA)
- Action type icons (IMD, Instant, Combat, Deploy)
- Status effect icons (buffs, debuffs, conditions)
- Consistent icon style/size

#### 6.5: Asset Loading & Performance
- Lazy load images
- Image preloading for critical assets
- Optimize image sizes (compression, responsive sizes)
- Loading states/spinners

**Files to Create:**
- `src/components/CardImage.jsx` - Image display component
- `src/components/Icon.jsx` - Icon system component

**Files to Modify:**
- `src/models/orderCard.js` - Add imageUrl property
- `src/data/creatures/*.js` - Add imageUrl to creatures
- `src/data/orders/*.js` - Add imageUrl to cards
- `src/components/OrderCard.jsx` - Display card images
- `src/components/CreatureCard.jsx` - Enhanced creature art display

---

### Step 7: Implement Creature Abilities
**Priority**: HIGH - Core gameplay feature
**Status**: ⏸️ Not Started

**Goal**: Implement special abilities that creatures can use during gameplay.

**Current State:**
- Creatures have `abilities` property (STR, DEX, CON, INT, WIS, CHA)
- Creatures have `specialAbilities` array with text descriptions
- No actual ability mechanics implemented yet

**Tasks:**

#### 7.1: Define Ability System Architecture
- **Passive Abilities**: Always active (e.g., "Regeneration", "Armor")
- **Activated Abilities**: Must be triggered (e.g., "Charge", "Fireball")
- **Triggered Abilities**: Activate on specific events (e.g., "When attacked", "When deployed")
- **Aura Abilities**: Affect nearby creatures (e.g., "Leadership", "Fear")

#### 7.2: Create Ability Framework
- Create `Ability` class with:
  - `id`: Unique identifier
  - `name`: Display name
  - `type`: passive/activated/triggered/aura
  - `description`: What it does
  - `execute()`: Function that performs the ability
  - `canUse()`: Validation function
  - `cooldown`: Turns before can use again
  - `range`: Effective range (for targeted abilities)

#### 7.3: Implement Common Abilities
- **Regeneration**: Heal X HP at start of turn
- **Flying**: Ignore terrain movement costs
- **Fear**: Enemies within range have -1 attack
- **Leadership**: Allies within range have +1 to all stats
- **Charge**: Extra damage on first attack after moving
- **Stealth**: Can't be targeted by ranged attacks
- **Poison**: Deal damage over time
- **Shield**: Reduce incoming damage
- **Spellcaster**: Can use magical order cards

#### 7.4: UI for Abilities
- Display active abilities on creature cards
- Show cooldowns and usability
- Ability activation buttons
- Visual effects when abilities trigger
- Ability range indicators on board

#### 7.5: AI Ability Usage
- AI should recognize and use creature abilities
- Prioritize abilities based on situation
- Coordinate abilities with tactics (e.g., use buff before attacking)

**Files to Create:**
- `src/models/ability.js` - Ability class and common abilities
- `src/models/abilityEffects.js` - Ability effect handlers

**Files to Modify:**
- `src/models/creatures.js` - Integrate ability system
- `src/models/gameState.js` - Ability triggers and execution
- `src/components/CreatureCard.jsx` - Ability UI display
- `src/components/GameBoard.jsx` - Ability activation interface
- `src/ai/simpleAI.js` - AI ability decision-making

---

### Step 8: Implement Order Card Effects
**Priority**: HIGH - Core gameplay feature
**Status**: ⏸️ Not Started

**Goal**: Implement the actual effects that order cards have when played.

**Current State:**
- Order cards exist with basic properties
- Cards have requirements (abilities needed to use)
- No actual card effects implemented yet
- IMD (Immediate) cards have basic blocking mechanic

**Tasks:**

#### 8.1: Card Effect Framework
- Create `CardEffect` class with:
  - `type`: damage/heal/buff/debuff/move/control
  - `target`: self/ally/enemy/area
  - `duration`: instant/turns/permanent
  - `value`: numerical effect value
  - `execute()`: Function to apply effect
  - `resolve()`: Function to clean up after duration

#### 8.2: Implement Effect Categories

**Damage Effects:**
- Direct damage to target
- Area of effect damage
- Damage over time
- Conditional damage (e.g., extra vs certain types)

**Healing Effects:**
- Direct healing
- Regeneration over time
- Full restore

**Buff Effects:**
- Stat increases (+X attack, +X defense)
- Temporary abilities
- Movement bonuses
- Attack range increases

**Debuff Effects:**
- Stat decreases
- Movement restrictions (slow, root)
- Prevent actions (stun, silence)
- Vulnerability (take extra damage)

**Control Effects:**
- Force movement (push, pull)
- Change facing/position
- Swap positions
- Teleport

**Tactical Effects:**
- Draw extra cards
- Gain extra actions
- Manipulate order deck
- Morale manipulation

#### 8.3: Card Targeting System
- Visual targeting interface
- Show valid targets based on card requirements
- Range indicators
- Area of effect visualization
- Confirm target before executing

#### 8.4: Effect Resolution
- Handle multiple effects on one card
- Resolve effects in correct order
- Handle effect conflicts
- Track effect durations
- Remove expired effects

#### 8.5: Specific Card Implementations
Update all cards in `/src/data/orders/` with proper effects:
- Combat cards (attack boosts, damage)
- Defense cards (IMD blocks, armor)
- Utility cards (movement, card draw)
- Spell cards (area effects, conditions)

**Files to Create:**
- `src/models/cardEffect.js` - Card effect system
- `src/models/effectResolver.js` - Effect execution logic
- `src/components/CardTargeting.jsx` - Targeting UI

**Files to Modify:**
- `src/models/orderCard.js` - Add effect properties
- `src/data/orders/*.js` - Add effects to all cards
- `src/models/gameState.js` - Effect resolution hooks
- `src/components/GameBoard.jsx` - Card play interface
- `src/ai/simpleAI.js` - AI card effect evaluation

---

### Step 9: Ranged Attacks
**Priority**: MEDIUM - Adds tactical variety
**Status**: ⏸️ Not Started

**Goal**: Fully implement ranged attack mechanics with line-of-sight and range limitations.

**Current State:**
- Creatures have `rangedAttack` property with damage and range
- Basic ranged attack logic exists
- No line-of-sight restrictions
- No range visualization

**Tasks:**
1. Implement range checking visualization
   - Show range indicators on board
   - Highlight valid ranged targets

2. Add line-of-sight system (may overlap with Step 3)
   - Raycasting to check for obstructions
   - Terrain blocks line of sight

3. Ranged attack UI
   - Different visual feedback from melee
   - Show attack path/trajectory

4. AI ranged attack decisions
   - Prefer ranged when safe
   - Position to maximize range advantage

**Files to Modify:**
- `src/models/gameState.js` - Line-of-sight calculations
- `src/components/GameBoard.jsx` - Range visualization
- `src/ai/simpleAI.js` - Ranged attack strategy

---

### Step 10: Special Abilities (Advanced)
**Priority**: LOW - Polish and depth
**Status**: ⏸️ Not Started

**Goal**: Implement advanced special abilities for unique creatures.

**Note**: This is distinct from Step 7. Step 7 implements the core ability *system* and common abilities. Step 10 implements advanced, unique, faction-specific abilities.

**Tasks:**
1. Faction-specific abilities
   - Unique mechanics for each faction

2. Commander abilities
   - Powerful abilities for commanders

3. Combo abilities
   - Abilities that synergize with other cards/creatures

4. Ultimate abilities
   - High-cost, game-changing abilities

**Files to Modify:**
- `src/models/ability.js` - Advanced ability types
- `src/data/creatures/*.js` - Unique creature abilities
- `src/models/commander.js` - Commander special abilities

---

## 📋 Dependencies Between Steps

```
Step 0 (IMD System) ✅ Complete
    ↓
Step 1 (Terrain Movement) ← Foundation for Step 3
    ↓
Step 2 (Treasures) ← Independent, can be done early
    ↓
Step 3 (Terrain Effects) ← Depends on Step 1
    ↓
Step 4 (Organize Cards) ← Needed before Step 8
    ↓
Step 5 (Attack Visualization) ← Independent, improves UX
    ↓
Step 6 (Card Images) ← Independent, visual polish
    ↓
Step 7 (Creature Abilities) ← Core system needed for Step 10
    ↓
Step 8 (Order Card Effects) ← Depends on Step 4
    ↓
Step 9 (Ranged Attacks) ← May use Step 3 (line-of-sight)
    ↓
Step 10 (Special Abilities) ← Depends on Step 7
```

---

## 🎯 Recommended Implementation Order

1. **Step 1**: Terrain Movement (foundation)
2. **Step 2**: Treasures (independent, adds gameplay variety)
3. **Step 3**: Terrain Effects (builds on Step 1)
4. **Step 4**: Organize Order Cards (needed before implementing effects)
5. **Step 7**: Creature Abilities (core system)
6. **Step 8**: Order Card Effects (depends on Step 4)
7. **Step 5**: Attack Visualization (polish, can be done alongside others)
8. **Step 6**: Card Images (polish, can be done alongside others)
9. **Step 9**: Ranged Attacks (tactical depth)
10. **Step 10**: Special Abilities (advanced content)

---

## 📝 Testing Strategy

For each step:
1. Add manual testing in main game UI
2. Add automated tests in GameSimulation.jsx
3. Verify AI behaves correctly with new feature
4. Document the implementation
5. Create a `STEPX_[NAME].md` file summarizing changes

---

## 🚦 Current Status

**Last Completed**: Step 0 - IMD Card Reaction System ✅
**Next Up**: Step 1 - Terrain Movement Effects
**Dev Server**: Running on http://localhost:5179

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Ready to Proceed**: Awaiting user confirmation to begin Step 1
