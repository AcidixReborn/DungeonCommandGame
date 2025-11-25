# Step 1: Immediate Order Card Reaction System - Test Plan

## Overview
This document provides a comprehensive test plan to verify that the Immediate (IMD) order card reaction system is working correctly before proceeding to Step 2.

---

## Pre-Test Setup Requirements

### Game Configuration
1. Start a new game with **Heart of Cormyr vs Heart of Cormyr** (both factions have IMD cards)
2. **Player 1**: Human
3. **Player 2**: Human (disable AI for controlled testing)

### Test Card Information
- **Shield Block** (Heart of Cormyr):
  - Action Type: IMMEDIATE
  - Level: 1
  - Ability Required: CON
  - Effect: Prevent 30 damage
  - **Range: 5 tiles** (modified for testing)

---

## Test Cases

### Test 1: Verify IMD Cards Are Visible in Hand
**Objective**: Confirm that IMD cards are displayed in the player's order hand during all phases.

**Steps**:
1. Start a new game
2. Look at Player 1's Order Hand (right side of screen)
3. Identify any IMD cards (look for "Shield Block" or other IMMEDIATE cards)

**Expected Results**:
- ✅ IMD cards are visible in the order hand
- ✅ IMD cards display normally alongside STD and MIN cards
- ✅ Cards show action type badge (IMD badge should be visible)

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 2: Attack Declaration Triggers Reaction Modal
**Objective**: Verify that the reaction modal appears when an attack is declared.

**Setup**:
1. Deploy at least one creature for Player 1
2. Deploy at least one creature for Player 2
3. Move creatures adjacent to each other
4. Make sure Player 2 has at least one IMD card in hand

**Steps**:
1. During Player 1's ACTIVATE phase, select a creature
2. Click on an enemy creature to attack

**Expected Results**:
- ✅ Modal appears with title "⚡ Immediate Reaction Available!"
- ✅ Modal shows attacker and defender information
- ✅ Modal displays before damage is dealt
- ✅ Game pauses waiting for defender's response

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 3: Adjacent Range Filtering (Default Range = 1)
**Objective**: Verify that only creatures within 1 tile of the defender can use IMD cards.

**Setup**:
1. Player 2 has "Shield Block" in hand (or any IMD card with default range)
2. Player 2 has multiple creatures on board:
   - Creature A: Adjacent to defender (1 tile away)
   - Creature B: 2+ tiles away from defender
3. Creature A has CON ability and is untapped

**Steps**:
1. Player 1 attacks Player 2's creature
2. Observe the reaction modal

**Expected Results**:
- ✅ Creature A appears as eligible (adjacent, has CON, untapped)
- ✅ Creature B does NOT appear (too far away)
- ✅ Modal shows distance information for each option

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 4: Extended Range (Shield Block Range = 5)
**Objective**: Verify that the custom range property works correctly.

**Setup**:
1. Player 2 has "Shield Block" in hand (range: 5)
2. Player 2 has a creature with CON ability that is 3-5 tiles away from defender
3. Creature is untapped

**Steps**:
1. Player 1 attacks Player 2's creature
2. Observe the reaction modal

**Expected Results**:
- ✅ Creature appears as eligible even though it's 3-5 tiles away
- ✅ Modal shows "Range: 5 tiles" for Shield Block
- ✅ Distance is calculated correctly (Manhattan distance)

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 5: Creature Eligibility Filtering
**Objective**: Verify that only eligible creatures can use IMD cards.

**Setup**:
1. Player 2 has "Shield Block" (requires CON, Level 1) in hand
2. Player 2 has creatures adjacent to defender:
   - Creature A: Has CON, Level 1+, **Untapped** ✅
   - Creature B: Has CON, Level 1+, **Tapped** ❌
   - Creature C: **No CON**, Level 1+, Untapped ❌
   - Creature D: Has CON, **Level 0**, Untapped ❌

**Steps**:
1. Player 1 attacks Player 2's creature
2. Observe the reaction modal

**Expected Results**:
- ✅ Only Creature A appears as eligible
- ✅ Tapped creatures are filtered out
- ✅ Creatures without required ability are filtered out
- ✅ Creatures below required level are filtered out

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 6: No Eligible Cards Available
**Objective**: Verify behavior when defender has no eligible IMD cards.

**Setup**:
1. Player 2 has NO IMD cards in hand, OR
2. All IMD cards require abilities/levels that no creatures have, OR
3. All eligible creatures are tapped or out of range

**Steps**:
1. Player 1 attacks Player 2's creature
2. Observe the reaction modal

**Expected Results**:
- ✅ Modal still appears
- ✅ Warning message: "No eligible Immediate cards available..."
- ✅ Only option is "Skip / No Reaction"
- ✅ Attack proceeds normally when skipped

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 7: Using Single IMD Card
**Objective**: Verify that using one IMD card works correctly.

**Setup**:
1. Player 2 has "Shield Block" in hand
2. Player 2 has eligible creature adjacent to defender

**Steps**:
1. Player 1 attacks Player 2's creature
2. Reaction modal appears
3. Click on the Shield Block option to select it
4. Click "Use 1 Card" button

**Expected Results**:
- ✅ Card is highlighted when selected (✓ checkmark appears)
- ✅ Warning appears showing resource costs
- ✅ Creature that used the card becomes **tapped**
- ✅ Shield Block is **removed from order hand**
- ✅ Console shows: "Reaction played: Shield Block by [Creature Name]"
- ✅ Attack message shows: "⚡ 1 Immediate card played!"
- ✅ Attack proceeds after reaction is processed

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 8: Using Multiple IMD Cards
**Objective**: Verify that multiple creatures can use IMD cards in one reaction.

**Setup**:
1. Player 2 has 2-3 different IMD cards in hand
2. Player 2 has 2-3 eligible creatures adjacent to defender
3. Each creature can use one of the IMD cards

**Steps**:
1. Player 1 attacks Player 2's creature
2. Reaction modal appears showing multiple options
3. Select 2-3 different card options
4. Click "Use X Cards" button

**Expected Results**:
- ✅ All selected cards are highlighted
- ✅ Warning shows: "Playing X cards will tap X creatures"
- ✅ All creatures that used cards become **tapped**
- ✅ All used cards are **removed from order hand**
- ✅ Console shows each reaction played
- ✅ Attack message shows: "⚡ X Immediate cards played!"
- ✅ Card indices handled correctly (no array index bugs)

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 9: Skip / No Reaction Option
**Objective**: Verify that the defender can choose not to use any reactions.

**Setup**:
1. Player 2 has eligible IMD cards available

**Steps**:
1. Player 1 attacks Player 2's creature
2. Reaction modal appears
3. Click "Skip / No Reaction" button (without selecting any cards)

**Expected Results**:
- ✅ Modal closes immediately
- ✅ No creatures are tapped
- ✅ No cards are discarded
- ✅ Attack proceeds normally
- ✅ No "⚡ Immediate card" message appears

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 10: Creature Remains Tapped Until Refresh
**Objective**: Verify that creatures that used IMD cards stay tapped until next Refresh phase.

**Setup**:
1. Use an IMD card with a creature during an attack

**Steps**:
1. Complete the attack
2. Try to use the creature that played the IMD card
3. Advance through phases until next Refresh phase
4. After Refresh, check the creature's status

**Expected Results**:
- ✅ Creature shows as tapped immediately after using IMD card
- ✅ Creature cannot move or attack while tapped
- ✅ Creature remains tapped through DEPLOY and CLEANUP phases
- ✅ Creature becomes **untapped** during next Refresh phase

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 11: Modal Interaction and UI
**Objective**: Verify that the modal UI works correctly.

**Steps**:
1. Trigger a reaction modal
2. Click on different card options
3. Try clicking the backdrop (outside modal)

**Expected Results**:
- ✅ Cards highlight/unhighlight when clicked
- ✅ Button text updates: "Use X Card(s)"
- ✅ Button is disabled when no cards selected
- ✅ Modal cannot be closed by clicking backdrop (backdrop="static")
- ✅ Modal styling matches game theme (cyan border, dark background)

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 12: AI Player Defense (Future Consideration)
**Objective**: Document AI behavior with IMD cards.

**Setup**:
1. Player 1: Human
2. Player 2: AI

**Steps**:
1. Attack AI's creature when AI has IMD cards

**Expected Results**:
- ⚠️ **KNOWN LIMITATION**: AI does not currently use IMD cards
- ✅ Modal may appear but AI logic not implemented
- 📝 **Note**: AI IMD card usage is not part of Step 1
- 📝 This will be addressed in future AI improvements

**Status**: ⬜ Pass / ⬜ Fail / ⬜ N/A

---

## Known Limitations (As Expected)

1. **Card Effects Not Applied**: The IMD cards are played and discarded, but their mechanical effects (like "Prevent 30 damage") are not yet implemented. This will be completed in **Step 8: Implement Order Card Effects**.

2. **AI Does Not Use IMD Cards**: The AI does not currently decide whether to use IMD cards. This is expected and will be addressed in future AI enhancements.

3. **Visual Feedback**: Some visual effects (like animations or damage modifications) are not yet present.

---

## Success Criteria

For Step 1 to be considered complete and ready for Step 2, the following must pass:

✅ **ALL** Tests 1-11 must pass
✅ Modal appears and functions correctly
✅ Range-based filtering works (both default and custom ranges)
✅ Creature eligibility is properly checked
✅ Cards are tapped and discarded correctly
✅ Multiple card usage works without bugs
✅ No console errors during any test

---

## How to Run Tests

1. **Open the Game**: Navigate to http://localhost:5173 (if dev server is running)
2. **Select Factions**: Choose Heart of Cormyr for both players
3. **Disable AI**: Make both players human for manual testing
4. **Follow Test Cases**: Execute each test case sequentially
5. **Mark Results**: Check ✅ Pass or ⬜ Fail for each test
6. **Report Issues**: Document any failures with screenshots/details

---

## Post-Test Actions

### If All Tests Pass:
- ✅ Mark Step 1 as complete
- ✅ Proceed to Step 2: Implement Treasures
- ✅ Archive this test plan for reference

### If Any Tests Fail:
- ⚠️ Document the failure in detail
- ⚠️ Fix the issue before proceeding
- ⚠️ Re-run affected tests
- ⚠️ Do NOT proceed to Step 2 until all tests pass

---

## Additional Notes

- **Console Logs**: Check browser console for the message: `Reaction played: [Card Name] by [Creature Name]`
- **Card Count**: Verify order hand count decreases after using IMD cards
- **Creature Tap Visual**: Tapped creatures should have a visual indicator on the board
- **Performance**: Modal should appear instantly without lag

---

## Test Results Summary

**Date Tested**: _______________
**Tester**: _______________
**Browser**: _______________
**Total Tests**: 12
**Passed**: _____ / 12
**Failed**: _____ / 12
**Ready for Step 2**: ⬜ Yes / ⬜ No

---

## Conclusion

This test plan ensures that the Immediate Order Card Reaction System is fully functional and ready for production use. All tests must pass before implementing Step 2 to maintain code quality and prevent technical debt.
