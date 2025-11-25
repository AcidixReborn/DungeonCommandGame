# Step 1: AI Decision-Making for IMD Cards

## Enhancement Overview

Added intelligent decision-making logic to the AI so it doesn't blindly use IMD cards every time they're available. The AI now makes strategic decisions based on threat assessment.

## Why This Was Needed

**User Request**: "I want to make sure that when one faction attacks another that the AI is choosing to either use an IMD or not so that part gets tested as well"

**Previous Behavior**: AI always used the first available IMD card whenever possible (100% usage rate)

**New Behavior**: AI evaluates the situation and decides whether using an IMD card is worth it

## Decision Logic

The AI now uses a **two-factor decision system** based on:
1. **HP Percentage** (threat level)
2. **Creature Level** (value/importance)

### Base Chance (HP-Based):
1. **Critical (HP < 40%)** → 100% base chance
   - Creature is in danger of being destroyed
   - Always consider protecting

2. **Moderate (HP 40-70%)** → 60% base chance
   - Creature is wounded but not critical
   - Often worth protecting

3. **Healthy (HP > 70%)** → 30% base chance
   - Creature is relatively healthy
   - Sometimes worth blocking damage

### Level Multiplier (Value-Based):
The base chance is then multiplied by the creature's level importance:

- **Level 1**: 0.5x multiplier (low priority - not worth wasting cards)
- **Level 2-3**: 1.0x multiplier (normal priority)
- **Level 4-5**: 1.5x multiplier (high priority - valuable creatures)
- **Level 6+**: 2.0x multiplier (very high priority - losing these costs lots of morale!)

### Examples:
- **Level 1 at 80% HP**: 30% × 0.5 = **15% chance** (rarely protect)
- **Level 5 at 80% HP**: 30% × 1.5 = **45% chance** (often protect)
- **Level 1 at 50% HP**: 60% × 0.5 = **30% chance** (sometimes protect)
- **Level 5 at 50% HP**: 60% × 1.5 = **90% chance** (almost always protect)
- **Level 5 at 30% HP**: 100% × 1.5 = **100% chance** (always protect)

### Code Implementation:
```javascript
// Calculate threat level
const defenderHP = defenderInstance.currentHP || defenderInstance.creature.hp
const defenderMaxHP = defenderInstance.creature.hp
const hpPercentage = (defenderHP / defenderMaxHP) * 100
const creatureLevel = defenderInstance.creature.level || 1

// Base chance on HP
let baseChance = 0
if (hpPercentage < 40) {
  baseChance = 100
} else if (hpPercentage < 70) {
  baseChance = 60
} else {
  baseChance = 30
}

// Level multiplier
let levelMultiplier = 1.0
if (creatureLevel === 1) {
  levelMultiplier = 0.5
} else if (creatureLevel >= 6) {
  levelMultiplier = 2.0
} else if (creatureLevel >= 4) {
  levelMultiplier = 1.5
}

// Final chance (capped at 100%)
let useChance = Math.min(100, baseChance * levelMultiplier)

// Make probabilistic decision
const shouldUse = Math.random() * 100 < useChance
```

## New Tracking Metrics

Added tracking for AI decision-making opportunities:

### New Statistics:
1. **Total Opportunities** - Times AI had IMD cards available but chose not to use them
2. **AI Decision Rate** - Percentage of times AI used cards when available

### Example Output:
```
Total IMD Cards USED by P1: 445
Total IMD Cards USED by P2: 511
Total Opportunities (Cards Available, Not Used): 1,234
AI Decision Rate: 43.7% used when available
```

This shows the AI is making strategic decisions rather than blindly using every card!

## Files Modified

### 1. [src/ai/simpleAI.js](src/ai/simpleAI.js)

**Changes:**
- Modified `decideImmediateReactions()` return type from `Array` to `Object`
- Returns `{ reactions: Array, hadOpportunity: boolean }`
- Added threat assessment logic (lines 304-332)
- Updated executeActivatePhase to track opportunities (line 89)

### 2. [src/test/GameSimulation.jsx](src/test/GameSimulation.jsx)

**Changes:**
- Added `imdOpportunities` tracking to stats (line 53)
- Updated tracking logic to count opportunities (lines 145-152)
- Added summary statistics for opportunities (lines 235-236, 274-275)
- Added display for decision rate (lines 422-436)

## Benefits

### For Testing:
✅ **Realistic AI behavior** - AI makes strategic decisions like a player would
✅ **Decision-making validation** - Tests that AI can choose NOT to use cards
✅ **Better test coverage** - Tests both "use" and "don't use" paths
✅ **Statistical insight** - Can see how often AI makes each decision

### For Gameplay:
✅ **More challenging AI** - Doesn't waste cards on low-threat situations
✅ **Resource management** - AI conserves cards for important moments
✅ **Unpredictable behavior** - Probabilistic decisions make AI less predictable

## Test Results

Run the 100-game test to see:
- How many times AI used IMD cards (actual usage)
- How many times AI had cards but chose not to use (opportunities)
- Decision rate percentage (should be 30-50% based on threat distribution)

### Expected Results:
- Decision rate should be **30-50%** (varies based on HP distribution during attacks)
- Higher usage when creatures are wounded
- Lower usage when creatures are healthy
- Proves AI is making intelligent decisions!

## Future Enhancements

Possible improvements to the decision logic:

1. **Attacker Strength Assessment** - Factor in how strong the attacker is
2. **Card Value Assessment** - Consider the card's effect strength
3. **Game State Assessment** - Consider morale, turn number, remaining cards
4. **Multiple Card Strategy** - Use 2+ cards for critical threats

---

**Status**: ✅ Complete
**Ready for Testing**: Yes
**Dev Server**: http://localhost:5179
