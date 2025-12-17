# Order Card Implementation Plan

Master plan for implementing all Order Cards with AI difficulty support (0/0/100 pattern).

**Testing Setup**: AI Difficulty = Hard (100% card usage for reliable testing)

---

## PART 1: IMMEDIATE CARDS (Remaining)

### Phase IMD-5: Target Other Creatures
Cards that prevent damage to creatures OTHER than the card user.

| Card | Faction | Effect | Targeting |
|------|---------|--------|-----------|
| Defend Ally (x2) | Heart of Cormyr | Prevent 30 damage | Adjacent ally |
| Shield (x2) | Heart of Cormyr | Prevent 30 damage | Self OR ally within 5 squares |
| Warning Shout (x2) | Curse of Undeath | Prevent 30 damage | Ally within line of sight |

**Implementation**:
- Add `targetType` property: 'self' | 'adjacent_ally' | 'ally_in_range' | 'ally_los'
- Add `targetRange` property for range-based targeting
- Update DefenseOptionsPanel to show valid targets
- Update AI to select optimal ally to protect

---

### Phase IMD-6: Discard Cost Cards
Cards requiring player to discard another card from hand.

| Card | Faction | Effect |
|------|---------|--------|
| Uncanny Dodge (x2) | Sting of Lolth | Discard 1 card to prevent ALL damage |

**Implementation**:
- Add `discardCost` property (number of cards to discard)
- Add discard selection UI in DefenseOptionsPanel
- Validate player has cards to discard before showing option
- AI evaluates hand value vs damage prevented

---

### Phase IMD-7: Opponent Effects
Cards that affect the opponent when used.

| Card | Faction | Effect |
|------|---------|--------|
| Recoil | Heart of Cormyr | Prevent 30 damage, opponent draws 1 card |

**Implementation**:
- Add `opponentDraws` property
- Execute opponent draw after damage prevention
- AI weighs prevention value vs giving opponent resources

---

### Phase IMD-8: OR Choice Cards
Cards offering player a choice between effects.

| Card | Faction | Effect |
|------|---------|--------|
| Patch Up (x2) | Tyranny of Goblins | Heal 20 OR Prevent 20 damage |

**Implementation**:
- Add `orChoice` property with effect options
- Create choice modal for human players
- AI evaluates which option is better situationally

---

### Phase IMD-9: Morale Attack Cards
Cards that affect opponent morale as part of defense.

| Card | Faction | Effect |
|------|---------|--------|
| Unexpected Resistance (x2) | Blood of Gruumsh | Prevent 10 damage, adjacent tapped enemy's controller loses 1 morale |

**Implementation**:
- Add `opponentMoraleLoss` property
- Add targeting for adjacent tapped enemy
- Execute morale loss after damage prevention

---

### Phase IMD-10: Self-Sacrifice Cards
Cards that destroy the user as part of their effect.

| Card | Faction | Effect |
|------|---------|--------|
| Savage Demise (x2) | Blood of Gruumsh | Attack tapped creature with base damage, then destroy self |

**Implementation**:
- Add `destroySelfAfterUse` property
- This is NOT damage prevention - it's a death trigger counter-attack
- Execute attack against tapped target, then destroy user
- AI evaluates trade value

---

### Phase IMD-11: Attach Cards (IMMEDIATE)
IMMEDIATE cards that attach to creatures with lasting effects.

| Card | Faction | Effect |
|------|---------|--------|
| Leap Away | Tyranny of Goblins | Prevent 40 damage, attach (can't move/shift), (S) to remove |
| Mortal Wound | Tyranny of Goblins | Prevent ALL damage, attach, destroy at start of Deploy phase |

**Implementation**:
- Add attachment system to CreatureInstance
- Add `attachOnUse` property with attachment effects
- Track attached cards with removal conditions
- Implement Deploy phase destruction check for Mortal Wound

---

## PART 2: STANDARD CARDS

### Phase STD-1: Basic Damage Boost
Simple melee attacks with bonus damage.

| Card | Faction | Effect |
|------|---------|--------|
| Power Attack (x2) | Heart of Cormyr | Melee attack +20 damage |
| Hacking Frenzy (x2) | Blood of Gruumsh | Melee attack +40 damage |
| Killing Strike | Heart of Cormyr | Melee attack +100 damage |

**Implementation**:
- Add `meleeDamageBonus` property
- Integrate with attack flow
- AI prioritizes high-value targets

---

### Phase STD-2: Ranged Damage Boost
Ranged attacks with bonus damage.

| Card | Faction | Effect |
|------|---------|--------|
| Gout of Fire (x2) | Curse of Undeath | Ranged attack +20 damage |

**Implementation**:
- Add `rangedDamageBonus` property
- Validate creature has ranged attack
- Integrate with ranged attack flow

---

### Phase STD-3: Any Attack Boost
Cards that boost either melee or ranged.

| Card | Faction | Effect |
|------|---------|--------|
| Slice (x2) | Blood of Gruumsh | Attack +10 damage, draw 1 card |

**Implementation**:
- Add `anyAttackDamageBonus` property
- Add `drawCardsOnUse` for STANDARD cards
- Works with melee or ranged

---

### Phase STD-4: Shift + Attack
Movement before or after attack.

| Card | Faction | Effect |
|------|---------|--------|
| Nimble Strike | Tyranny of Goblins | Shift 3, melee/ranged +10 |
| Spring Attack (x2) | Sting of Lolth | Shift 3, melee +10, shift 3 |
| Shadowy Ambush (x2) | Sting of Lolth | Shift 3, melee +30 |

**Implementation**:
- Add `shiftBeforeAttack` and `shiftAfterAttack` properties
- Create shift selection UI
- AI calculates optimal positioning

---

### Phase STD-5: Charge (Move + Attack)
Full movement then attack.

| Card | Faction | Effect |
|------|---------|--------|
| Charge (x2) | Blood of Gruumsh | Move speed, melee +20 |

**Implementation**:
- Add `moveBeforeAttack` property (uses full movement)
- Must end adjacent to target
- Integrate with pathfinding

---

### Phase STD-6: Attack + Heal
Attacks that heal the attacker.

| Card | Faction | Effect |
|------|---------|--------|
| Feral Vitality | Tyranny of Goblins | Melee +20, heal 10 |
| Victorious Surge (x2) | Blood of Gruumsh | Melee +10, heal 20 |
| Vampiric Touch (x2) | Curse of Undeath | Melee +10, heal damage dealt |

**Implementation**:
- Add `healOnAttack` property (fixed amount)
- Add `healDamageDealt` property (for Vampiric Touch)
- Execute heal after damage resolved

---

### Phase STD-7: Attack + Status Effect
Attacks that apply conditions to target.

| Card | Faction | Effect |
|------|---------|--------|
| Ray of Frost | Tyranny of Goblins | 30 damage within 5, tap target |
| Deep Wound (x2) | Sting of Lolth | Melee +10, attach to target (-10 damage dealt) |

**Implementation**:
- Add `tapTargetOnHit` property
- Add `attachToTarget` property for debuffs
- Create debuff attachment system

---

### Phase STD-8: Attack + Slide
Attacks that reposition target.

| Card | Faction | Effect |
|------|---------|--------|
| Blast of Force (x2) | Heart of Cormyr | Melee +10, slide target 3 |
| Hypnotic Gaze (x2) | Curse of Undeath | Slide 3, then melee +10 |

**Implementation**:
- Add `slideTargetOnHit` property
- Add `slideTargetBeforeAttack` property
- Create slide direction selection UI

---

### Phase STD-9: Self-Damage Attacks
Attacks that cost HP to use.

| Card | Faction | Effect |
|------|---------|--------|
| Reckless Attack (x2) | Tyranny of Goblins | Take 10 damage, melee +30 |

**Implementation**:
- Add `selfDamageOnUse` property
- Apply self-damage before attack
- AI evaluates HP trade-off

---

### Phase STD-10: Conditional Attacks
Attacks with conditional effects.

| Card | Faction | Effect |
|------|---------|--------|
| Daring Attack (x2) | Heart of Cormyr | Melee +10, if kill then untap |
| Sneak Attack (x2) | Sting of Lolth | +100 damage if ally adjacent to target |

**Implementation**:
- Add `untapIfKill` property
- Add `requiresAllyAdjacentToTarget` with bonus damage
- Track kill condition, execute untap

---

### Phase STD-11: Piercing/Unprevented Damage
Damage that cannot be prevented.

| Card | Faction | Effect |
|------|---------|--------|
| Piercing Strike (x2) | Sting of Lolth | Melee +10, damage cannot be prevented |

**Implementation**:
- Add `damageUnpreventable` property
- Skip defense options when this flag is set
- Critical balance consideration

---

### Phase STD-12: AOE Attacks
Attacks hitting multiple targets.

| Card | Faction | Effect |
|------|---------|--------|
| Fireball (x2) | Heart of Cormyr | 20 damage to all creatures within 2 of target point |
| Stomp (x2) | Blood of Gruumsh | Shift 2, 20 damage to all adjacent |
| Turn Undead (x2) | Blood of Gruumsh | 30 damage to each Undead within 3 |

**Implementation**:
- Add `aoeDamage` and `aoeRadius` properties
- Add `aoeTargetType` for creature type filtering
- Create AOE targeting UI
- Resolve damage to each target individually

---

### Phase STD-13: Ranged Spell Attacks
Direct damage spells (not attack modifications).

| Card | Faction | Effect |
|------|---------|--------|
| Ray of Frost | Tyranny of Goblins | 30 damage within 5, tap if damaged |
| Death Grip (x2) | Curse of Undeath | 10 × (caster level) damage within 5 |
| Hurl Rock (x2) | Blood of Gruumsh | Base damage ranged within 5 |

**Implementation**:
- Add `spellDamage` property (fixed or formula)
- Add `spellRange` property
- These don't modify attacks - they ARE the attack

---

### Phase STD-14: Resource Cards
Cards that generate resources.

| Card | Faction | Effect |
|------|---------|--------|
| Strength in Numbers (x2) | Tyranny of Goblins | Gain 1 Leadership |
| Hulking Attack (x2) | Curse of Undeath | Melee +20, gain 1 Morale |

**Implementation**:
- Add `gainLeadership` and `gainMorale` properties
- Execute resource gain after card resolves

---

### Phase STD-15: Draw Cards
STANDARD cards that draw Order cards.

| Card | Faction | Effect |
|------|---------|--------|
| Scheme (x2) | Sting of Lolth | Draw 2 Order cards |

**Implementation**:
- Already have `drawCards` property
- Just needs STANDARD card integration

---

### Phase STD-16: Disruption Attacks
Attacks that affect opponent resources.

| Card | Faction | Effect |
|------|---------|--------|
| Disrupting Attack (x2) | Heart of Cormyr | Melee +10, tap target, opponent discards 1 |
| Terrifying Revelation (x2) | Curse of Undeath | Target opponent loses 3 Morale |

**Implementation**:
- Add `opponentDiscardsOnHit` property
- Add `opponentMoraleLossOnUse` property
- Implement discard selection for opponent (random for AI opponent)

---

### Phase STD-17: Attach Buff Cards
STANDARD cards that attach buffs to user.

| Card | Faction | Effect |
|------|---------|--------|
| Shattered Weapon (x2) | Tyranny of Goblins | Melee +30, attach -10 melee damage |
| Mirror Image | Tyranny of Goblins | Attach, remove to prevent all damage |
| Battle Ready (x2) | Heart of Cormyr | Attach, remove to prevent 30 damage |
| Careful Attack (x2) | Curse of Undeath | Melee +10, attach for later prevention |
| Vorpal Sword (x2) | Blood of Gruumsh | Attach, melee +10, destroy on hit if 3+ damage |

**Implementation**:
- Reuse attachment system from IMD-11
- Add attack-triggered attachment effects

---

### Phase STD-18: Stealth/Special Movement
Unique movement mechanics.

| Card | Faction | Effect |
|------|---------|--------|
| Stealth (x2) | Sting of Lolth | Remove from battlefield, return adjacent to enemy |

**Implementation**:
- Add `removeFromBattlefield` state
- Track creature for return
- Implement return targeting

---

## PART 3: MINOR CARDS

### Phase MIN-1: Basic Shift
Simple shift movement.

| Card | Faction | Effect |
|------|---------|--------|
| Stalk (x2) | Sting of Lolth | Shift 6 |
| Into the Fray (x2) | Heart of Cormyr | Move speed |

**Implementation**:
- Add `shiftDistance` for MINOR cards
- Add `moveSpeed` for full movement MINOR cards
- Integrate with movement system

---

### Phase MIN-2: Untap
Cards that untap creatures.

| Card | Faction | Effect |
|------|---------|--------|
| Heroic Surge (x2) | Heart of Cormyr | Untap this creature |

**Implementation**:
- Add `untapSelf` property
- Simple untap execution

---

### Phase MIN-3: Heal Cards
MINOR action healing.

| Card | Faction | Effect |
|------|---------|--------|
| Cure Serious Wounds (x2) | Blood of Gruumsh | Heal 30 to self or adjacent |
| Healing Potion (x2) | Heart of Cormyr | Heal 20 OR remove attachment |

**Implementation**:
- Add `healAmount` and `healTarget` properties
- Integrate with existing healing system
- OR choice for Healing Potion

---

### Phase MIN-4: Draw/Hand Management
Cards affecting the Order deck/hand.

| Card | Faction | Effect |
|------|---------|--------|
| Change of Plans (x2) | Blood of Gruumsh | Draw 2, discard 1 |
| Reinforcements | Tyranny of Goblins | Discard any, reshuffle, draw that many +1 |

**Implementation**:
- Add draw/discard combination mechanics
- Create discard selection UI

---

### Phase MIN-5: Slide/Push Effects
Cards that move other creatures.

| Card | Faction | Effect |
|------|---------|--------|
| Shove Aside (x2) | Heart of Cormyr | Slide adjacent creature 1 |
| Tide of Iron (x2) | Blood of Gruumsh | Slide adjacent 1, shift into vacated |
| Fear (x2) | Curse of Undeath | Slide all adjacent enemies 3 |
| Furious Bellow (x2) | Blood of Gruumsh | Tap + slide all adjacent enemies 2 |

**Implementation**:
- Add `slideAdjacent` properties
- Add multi-target slide mechanics
- Direction selection UI

---

### Phase MIN-6: Tap Effects
Cards that tap enemy creatures.

| Card | Faction | Effect |
|------|---------|--------|
| Feint (x2) | Sting of Lolth | Tap adjacent creature |
| Mage Hand | Tyranny of Goblins | Collect treasure OR tap creature within 5 |

**Implementation**:
- Add `tapTarget` property with range
- OR choice for Mage Hand

---

### Phase MIN-7: Minor Attacks
Attacks as MINOR actions.

| Card | Faction | Effect |
|------|---------|--------|
| Quick Jab (x2) | Sting of Lolth | Melee attack (base damage) |
| Quick Shot (x2) | Heart of Cormyr | Ranged attack (base damage) |
| Necrotic Howl (x2) | Curse of Undeath | 10 damage to all adjacent |

**Implementation**:
- Add MINOR attack capability
- Integrate with attack system but doesn't tap

---

### Phase MIN-8: Attachment Removal
Cards that remove attachments.

| Card | Faction | Effect |
|------|---------|--------|
| Saving Throw (x2) | Heart of Cormyr | Remove attachment from self |
| Rally | Tyranny of Goblins | Remove all attachments from adjacent ally |
| Dispel Magic (x2) | Curse of Undeath | Remove attachment from creature within 5 |

**Implementation**:
- Add attachment removal targeting
- Different ranges: self, adjacent, within X

---

### Phase MIN-9: Attach Buff Cards (MINOR)
MINOR cards that attach lasting effects.

| Card | Faction | Effect |
|------|---------|--------|
| Acrobatics (x2) | Tyranny of Goblins | Attach (scuttle, ignore difficult terrain) |
| Arcane Scroll (x2) | Tyranny of Goblins | Attach, discard for INT ability |
| Beastmaster (x2) | Blood of Gruumsh | Attach (+10 damage for Beast allies) |
| Faerie Fire (x2) | Sting of Lolth | Attach to enemy (+10 damage taken) |
| Web (x2) | Sting of Lolth | Attach to enemy (can't move/shift, STD to remove) |
| Loping Stride (x2) | Tyranny of Goblins | Attach (+2 speed) |
| Mage Armor (x2) | Curse of Undeath | Attach (remove to prevent 20) |
| Magic Short Sword (x2) | Curse of Undeath | Attach (+10 melee, unprevented) |
| Regenerate (x2) | Curse of Undeath | Attach (heal 10 at Cleanup, not undead) |
| Spawn of Kyuss | Curse of Undeath | Attach (10 damage to adjacent at Cleanup) |
| Call to Battle (x2) | Curse of Undeath | Attach (can deploy adjacent) |
| Undaunted Surge (x2) | Tyranny of Goblins | Remove attachments, attach (+10 damage) |
| Tough as Nails | Tyranny of Goblins | Remove attachments, attach (Block 10) |

**Implementation**:
- Comprehensive attachment system
- Phase-triggered effects (Cleanup, Deploy)
- Passive stat modifications

---

### Phase MIN-10: Teleport/Special Movement
Unique movement types.

| Card | Faction | Effect |
|------|---------|--------|
| Dimension Door (x2) | Curse of Undeath | Teleport up to 9 squares |
| Secret Passage (x2) | Sting of Lolth | Shift 3 through walls/creatures |
| Portal Stone (x2) | Tyranny of Goblins | Teleport to magic circle (costs treasure) |
| Relentless Advance (x2) | Curse of Undeath | Take 10 damage, shift 4 |

**Implementation**:
- Add teleport mechanics (ignore pathing)
- Add phase-through movement
- Resource cost integration

---

### Phase MIN-11: Multi-Creature Effects
Cards affecting multiple creatures.

| Card | Faction | Effect |
|------|---------|--------|
| Forward the Horde (x2) | Tyranny of Goblins | Self + ally shift 2 |
| Goblin War Cry (x2) | Tyranny of Goblins | Faction creatures +10 damage this turn |
| Unending Horde (x2) | Curse of Undeath | All other friendly creatures shift 2 |
| Scent of Blood (x2) | Blood of Gruumsh | Heal 10 per adjacent enemy |

**Implementation**:
- Add multi-target selection
- Faction-wide buff tracking
- Adjacent enemy counting

---

### Phase MIN-12: Creature Control
Cards that control other creatures' actions.

| Card | Faction | Effect |
|------|---------|--------|
| Death Sentence (x2) | Tyranny of Goblins | Creature within 5 makes melee attack |
| Arcane Ritual (x2) | Heart of Cormyr | Attach, draw 1 if in magic circle at Cleanup |

**Implementation**:
- Force creature to attack
- Location-based triggers

---

### Phase MIN-13: Terrain Interactions
Cards interacting with terrain.

| Card | Faction | Effect |
|------|---------|--------|
| Fire Trap (x2) | Sting of Lolth | 20 damage to all within 2 of hazardous terrain |

**Implementation**:
- Terrain type detection
- AOE from terrain location

---

## IMPLEMENTATION ORDER SUMMARY

**IMMEDIATE** (10 remaining cards across 7 phases):
- IMD-5: Target Other Creatures (6 cards)
- IMD-6: Discard Cost (2 cards)
- IMD-7: Opponent Effects (1 card)
- IMD-8: OR Choice (2 cards)
- IMD-9: Morale Attack (2 cards)
- IMD-10: Self-Sacrifice (2 cards)
- IMD-11: Attach Cards (2 cards)

**STANDARD** (67 cards across 18 phases):
- STD-1 through STD-18

**MINOR** (88 cards across 13 phases):
- MIN-1 through MIN-13

---

## AI DIFFICULTY PATTERN

All order cards follow the 0/0/100 pattern:
- **Easy**: 0% - AI never uses order cards
- **Medium**: 0% - AI never uses order cards
- **Hard**: 100% - AI always uses order cards when beneficial

Gate function in `simpleAI.js`:
```javascript
canUseOrderCards() {
  return this.difficulty === 'hard'
}
```

---

## FILES TO MODIFY

**Core Files**:
- `src/models/orders.js` - Add new properties to OrderCard class
- `src/models/gameState.js` - Card execution logic
- `src/models/CommanderAbilityManager.js` - Defense/targeting options
- `src/ai/simpleAI.js` - AI card usage decisions
- `src/services/AITurnManager.js` - AI turn execution

**UI Files**:
- `src/components/DefenseOptionsPanel.jsx` - Target selection UI
- `src/components/GameBoard.jsx` - Card execution handling
- New modals as needed for complex choices

**Faction Data**:
- `src/data/factions/*.js` - Update card definitions with new properties
