# JoinScreen — Test Scenarios

## Feature Brief

### What It Does

JoinScreen is the player-facing registration and tournament lobby. It handles the full player journey from joining through launch:

**Player capabilities:**
- Register with a name (auto-filled from Google / Telegram profile)
- Confirm or cancel participation (toggle)
- Edit registered name after joining
- Select group (Mixicano: A or B), club (club formats), rank (club-ranked)
- Link a partner — to an existing player or by creating a new (invited) partner
- Remove partner link
- Download tournament date as .ics calendar file
- See real-time player list with status badges (playing / reserve / cancelled / needs-partner)
- See reserve position number

**Captain capabilities (club-based formats):**
- Approve / reject players from their club
- Link Telegram handles for club members
- Assign ranks to members
- Add new players directly to their club
- Filter club members vs all players

**Organizer capabilities:**
- Launch tournament (with validation and start guard)
- Export tournament JSON for device-based scoring
- Auto-restore from Firebase backup after completion
- Navigate to OrganizerScreen for editing

### Who Uses It

- **Players** — register, manage participation, pair with partners
- **Club captains** — approve members, manage club roster (captain mode only)
- **Organizers / start delegates** — validate config and launch the tournament

### Critical Rules

1. **Player status is derived, not stored** — computed from capacity, registration timestamp, format rules, and captain approvals
2. **FIFO by registration timestamp** — earliest registrations fill "playing" slots first
3. **Partner links are bidirectional** — both players point to each other; unlinking clears both sides
4. **Auto-added partners** inherit source player's club + rank + opposite group; marked `addedByPartner`
5. **Partner constraint enforcement** — club formats require same club, club-ranked requires same rank, Mixicano requires opposite group
6. **Breaking constraints severs partner link** — changing club/rank/group asks confirmation, then unlinks; auto-added partners get auto-cancelled
7. **Duplicate name warning** — warns but allows override; no hard block
8. **Captain mode flow** — players join as `registered`, captain approves → `playing`; no notification sent
9. **Launch validation blocks on**: <4 players, odd count in team formats, unassigned clubs, unpaired players (when slots unfilled), too many courts
10. **Reserve position is dynamic** — recalculated on every registration change

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Partner link race condition** | Orphaned one-sided link; A→B exists but B→A doesn't | Bidirectional Firebase writes are not atomic; partial failure possible |
| **Auto-added partner never claims** | Source player thinks they're paired; at launch becomes "needs-partner" | Auto-added partner marked confirmed but never opened tournament |
| **Club-ranked bucket distribution** | Wrong players get "playing" status | 3-pass allocation with bonus pairs, rounding to even, captain approvals — hard to audit |
| **Stale status at launch time** | Validation passes but state changed between check and launch | `statuses` computed in `useMemo`, one render behind live Firebase data |
| **Orphaned partner link after removal** | Player leaves tournament; partner still shows linked name | No cleanup of partner reference when linked player is deleted |
| **Telegram username collision** | Wrong player claimed via cross-device sync | Two registrations with same `telegramUsername`; sync picks wrong record |
| **Captain approve + rank change** | Captain approves A+B pair, A changes rank → pair breaks silently | No re-approval workflow; captain not notified |
| **Multiple rapid Enter presses** | Duplicate registration attempts before `joining` flag disables button | No debounce on key handler |
| **Calendar download before save** | ICS has data that never reached Firebase | Generated from local state; network failure means stale .ics |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation | `[e2e]` = covered by e2e test | `[unit]` = covered by unit test

### Registration — Happy Path

```gherkin
Feature: Join Tournament

  Scenario: Register with a name [PW] [e2e: planner/player-registration]
    Given I opened a tournament via share code
    And the tournament has available capacity
    When I enter my name "Alice"
    And I tap Register
    Then I appear in the player list with status "playing"
    And a success toast is shown

  Scenario: Name auto-filled from Google profile [PW]
    Given I am signed in with Google as "Alice Smith"
    When I open a tournament join screen
    Then the name field is pre-filled with "Alice Smith"

  Scenario: Name auto-filled from Telegram profile [e2e: planner/telegram]
    Given I opened the tournament from Telegram
    And my Telegram name is "Alice"
    Then the name field is pre-filled with "Alice"

  Scenario: Edit registered name [PW]
    Given I am registered as "Alice"
    When I edit my name to "Alice S."
    And I save
    Then my name updates to "Alice S." in the player list
```

### Confirm / Cancel Participation

```gherkin
  Scenario: Cancel participation [PW] [e2e: planner/player-registration]
    Given I am registered and confirmed
    When I tap Cancel
    Then my status changes to "cancelled"
    And I move out of the playing slots

  Scenario: Re-confirm after cancelling [PW] [e2e: planner/player-registration]
    Given I cancelled my participation
    When I tap Confirm
    Then my status recalculates based on current capacity
    And my timestamp resets to now (back of FIFO queue)

  Scenario: Cancelling promotes first reserve [PW] [unit: playerStatus.test]
    Given the tournament is at full capacity
    And "Eve" is first reserve
    When I cancel my participation
    Then Eve's status changes to "playing"
```

### Partner Linking

```gherkin
  Scenario: Link to existing registered player [PW] [unit: partnerLogic.test]
    Given I am registered in a Team Americano tournament
    And "Bob" is also registered
    When I select Bob as my partner
    Then I see Bob as my partner
    And Bob sees me as their partner (bidirectional)

  Scenario: Create and invite a new partner [PW] [unit: partnerLogic.test]
    Given I am registered in a Team Americano tournament
    When I enter "Charlie" as a new partner name
    And I confirm
    Then "Charlie" is auto-added to the tournament as confirmed
    And Charlie inherits my club and rank
    And Charlie is marked as "added by partner"

  Scenario: Remove partner link [PW] [unit: partnerLogic.test]
    Given I am paired with "Bob"
    When I remove my partner link
    Then I no longer show a partner
    And Bob no longer shows me as their partner

  Scenario: Auto-added partner gets cancelled when unlinked [unit: partnerLogic.test]
    Given I invited "Charlie" who never opened the tournament
    When I remove the partner link
    Then Charlie's registration is auto-cancelled
```

### Partner Constraints

```gherkin
  Scenario: Mixicano requires opposite group for partner [PW] [unit: partnerLogic.test]
    Given a Mixicano tournament
    And I am in Group A
    When I try to link a partner who is also in Group A
    Then I see a rejection message about same group

  Scenario: Club format requires same club for partner [PW] [unit: partnerLogic.test]
    Given a Club Americano tournament
    And I am in "Club A"
    When I try to link a partner in "Club B"
    Then I see a rejection message about different clubs

  Scenario: Changing club breaks partner link [PW] [unit: partnerLogic.test — wouldBreakPartnerLink]
    Given I am paired with "Bob" in Club A
    When I change my club to Club B
    Then I see a confirmation dialog warning the link will break
    When I confirm
    Then my partner link with Bob is severed

  Scenario: Changing rank breaks partner link in club-ranked [unit: partnerLogic.test]
    Given a club-ranked tournament
    And I am paired with "Bob" in Rank 1
    When I change my rank to Rank 2
    And I confirm the warning
    Then the partner link is severed
```

### Group / Club / Rank Selection

```gherkin
  Scenario: Select group in Mixicano format [PW]
    Given a Mixicano tournament
    When I select "Group B"
    Then my group shows as B
    And my status recalculates based on Group B capacity

  Scenario: Select club in club format [PW]
    Given a Club Americano tournament with clubs "Lions" and "Eagles"
    When I select "Eagles"
    Then my club shows as Eagles

  Scenario: Select rank in club-ranked format [PW]
    Given a club-ranked tournament with ranks "Beginner" and "Advanced"
    When I select "Advanced"
    Then my rank shows as Advanced
```

### Duplicate Names

```gherkin
  Scenario: Duplicate name shows warning [PW]
    Given "Alice" is already registered
    When I enter "Alice" as my name
    Then I see a warning about duplicate name
    And I can confirm to register anyway

  Scenario: Register with duplicate name after confirmation [PW]
    Given the duplicate warning is shown
    When I confirm override
    Then I am registered as "Alice"
    And two players named "Alice" appear in the list
```

### Captain Mode

```gherkin
  Scenario: Player joins captain-mode tournament as "registered" [PW] [unit: playerStatus.test]
    Given a captain-mode Club Americano tournament
    When I register for "Club A"
    Then my status is "registered" (not playing)

  Scenario: Captain approves a player [PW] [e2e: planner/club-ranked-captain]
    Given I am captain of Club A
    And "Bob" is registered for Club A with status "registered"
    When I approve Bob
    Then Bob's status changes to "playing"

  Scenario: Captain rejects a player
    Given I am captain of Club A
    And "Bob" is registered for Club A
    When I reject Bob
    Then Bob's confirmed is set to false

  Scenario: Captain sees only their club members [PW]
    Given I am captain of Club A
    And there are players in Club A and Club B
    When I toggle the club filter
    Then I only see Club A members

  Scenario: Captain assigns rank to club member [PW]
    Given a captain-mode club-ranked tournament
    And I am captain of Club A
    When I assign "Bob" to Rank 2
    Then Bob's rank shows as Rank 2
```

### Reserve Position

```gherkin
  Scenario: Reserve position updates in real time [PW]
    Given I am reserve position #3
    When 2 reserves ahead of me cancel
    Then my reserve position changes to #1

  Scenario: Reserve promoted to playing when capacity opens
    Given I am reserve position #1
    When a "playing" player cancels
    Then my status changes to "playing"
    And reserve position is no longer shown
```

### Launch from JoinScreen

```gherkin
  Scenario: Organizer launches from join screen [PW]
    Given I am the organizer viewing the join screen
    And the tournament has 8 confirmed players and 2 courts
    When I tap Start
    And validation passes
    Then the tournament exports to the Runner app

  Scenario: Start delegate launches tournament [PW]
    Given I am set as the start delegate
    When I open the join screen
    Then I see the Start button
    When I tap Start and validation passes
    Then the tournament launches

  Scenario: Non-organizer non-delegate cannot see Start
    Given I am a regular player
    When I open the join screen
    Then I do not see a Start button
```

### Calendar Export

```gherkin
  Scenario: Download calendar .ics file [PW]
    Given the tournament has a date and location set
    When I tap "Add to Calendar"
    Then an .ics file is downloaded
    And it contains the tournament name, date, and location
```

### Persistence & Interrupted Flows

```gherkin
  Scenario: Registration persists after refresh [PW]
    Given I registered as "Alice"
    When I refresh the page
    Then I am still registered as "Alice"
    And my status is preserved

  Scenario: Partner link persists after refresh
    Given I linked "Bob" as my partner
    When I refresh the page
    Then Bob is still shown as my partner

  Scenario: Rapid Enter presses do not create duplicate registrations
    Given I entered "Alice" in the name field
    When I press Enter 3 times quickly
    Then only 1 registration is created
```

### Edge Cases

```gherkin
  Scenario: Player status when all slots are cancelled
    Given a tournament with capacity 4
    And all 4 playing players cancel
    And 2 reserves exist
    Then the 2 reserves are promoted to "playing"
    And the cancelled players show status "cancelled"

  Scenario: Auto-added partner who never claims stays paired until launch
    Given I added "Charlie" as a new partner
    And Charlie never opened the tournament
    Then Charlie appears as my partner
    # At launch, if Charlie never confirmed, validation may flag "needs-partner"

  Scenario: Captain approves pair, then one changes rank
    Given captain approved Alice+Bob pair in Rank 1
    When Alice changes her rank to Rank 2
    Then the partner link between Alice and Bob breaks
    And the captain is not notified
```
