# Events — Test Scenarios

## Feature Brief

### What It Does

Events are a hierarchical layer that groups multiple tournaments into a series. Three screens cover the full event lifecycle:

**EventFormScreen (create):**
- Simple form: event name + date
- Generates unique 6-character event code
- Writes event, code lookup, and ownership index atomically

**EventScreen (organizer manage):**
- Link / unlink tournaments to the event (by owned tournament or by 6-char tournament code)
- Set per-tournament weight (multiplier for standings)
- View real-time aggregated standings across all linked tournaments
- View club standings (aggregated by club name)
- Edit event description (owner only)
- Share event via code, web link, or Telegram bot deep link
- Export event data as JSON (clipboard or file download)
- Delete event (owner only)

**EventJoinScreen (player view):**
- Read-only view of event with all linked tournaments
- Real-time standings (same computation as organizer screen)
- Tournament cards with format, registration count, special modes (captain, maldiciones)
- "Join" or "Open" button per tournament based on fill status
- Share event link/code (hidden for completed events)
- Edit button visible only to organizer

**Event status** is derived, not stored: all-draft → `draft`, any-started → `active`, all-completed → `completed`.

### Who Uses It

- **Organizers** — create events, link tournaments, set weights, share, export, delete
- **Players** — browse event tournaments, view aggregated standings, join individual tournaments

### Critical Rules

1. **Event code is immutable** — generated once at creation, stored in `eventCodes/{code}` → `eventId`
2. **Tournament weights default to 1.0** — multiplied into standings; no min/max validation enforced
3. **Standings = weighted sum of raw game scores** across all linked tournaments
4. **Tiebreaker chain** — totalPoints → pointDiff → matchesWon → name (same as runner)
5. **Sit-out compensation** — players who sat out a round get the average points of that round × tournament weight
6. **Club standings aggregate by club name** — no club ID matching; same-name clubs from different tournaments merge
7. **Status derived from tournaments** — not from event date; past-date event with draft tournaments still shows "draft"
8. **3-path atomic write on create** — `events/{id}`, `users/{uid}/events/{id}`, `eventCodes/{code}`
9. **Link by code** — looks up `codes/{code}` to get tournament ID, then appends to event's `tournaments` array
10. **Delete removes 3 paths** — event, user ownership index, and code mapping

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Tournament linking race condition** | Same tournament linked twice | Duplicate check runs on stale closure data, not on Firebase snapshot at write time |
| **Weight has no bounds** | Zero, negative, or absurdly large weights distort standings | No validation on weight input; user can type anything |
| **Club name collision across tournaments** | Unrelated clubs merged in club standings | Aggregation uses club name string, not ID |
| **Orphaned event code** | Code points to nothing if event write fails after code write | Multi-path update can partially fail |
| **Deleted tournament still linked** | Ghost entry in event's tournament array; silently disappears on load | No cleanup of event.tournaments when a tournament is deleted |
| **No past-date validation** | Events can be created for dates in the past | No frontend check on date input |
| **Export fails silently** | User thinks data copied but clipboard write failed | Catch-all with generic toast; no specific error shown |
| **Floating-point rounding in standings** | Tiny point differences from weight multiplication | No rounding during accumulation; only at display |
| **Stale join button** | "Join" shown when tournament just filled | Button state derived from `breakdown.urgencyLevel`; real-time listener may lag |
| **Listener explosion** | N linked tournaments = N Firebase listeners | No upper bound on tournaments per event; performance degrades with many |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation | `[e2e]` = covered by e2e test | `[unit]` = covered by unit test

### Event Creation — Happy Path

```gherkin
Feature: Events

  Scenario: Create event with name and date [PW]
    Given I am in Organizer mode with a display name
    When I enter "Spring Series" as event name
    And I set the date to next Saturday
    And I tap Create
    Then the event is created
    And I see a 6-character event code
    And the event appears in my events list

  Scenario: Event code is generated and immutable [PW]
    Given I created an event
    Then the event has a unique 6-character code
    And the code does not change if I edit the event name
```

### Event Creation — Validation

```gherkin
  Scenario: Cannot create event without name [PW]
    Given I am on the event creation form
    And the name field is empty
    Then the Create button is disabled

  Scenario: Event with past date is allowed
    Given I enter a date in the past
    When I tap Create
    Then the event is created
    # Risk: no past-date validation exists

  Scenario: Create button disabled without auth
    Given I am not authenticated (auth loading)
    Then the Create button is disabled
```

### Linking Tournaments

```gherkin
  Scenario: Link own tournament to event [PW]
    Given I created event "Spring Series"
    And I have a tournament "Round 1"
    When I select "Round 1" from my tournaments
    Then "Round 1" is linked to the event
    And it appears in the event's tournament list

  Scenario: Link tournament by code [PW]
    Given event "Spring Series" exists
    And a tournament exists with code "TRN456"
    When I enter "TRN456" in the link-by-code field
    And I confirm
    Then the tournament is linked to the event

  Scenario: Cannot link same tournament twice [PW]
    Given "Round 1" is already linked to my event
    When I try to link "Round 1" again
    Then the tournament is not duplicated in the list

  Scenario: Unlink tournament from event [PW]
    Given "Round 1" is linked to my event
    When I unlink "Round 1"
    Then "Round 1" is removed from the event's tournament list
    And the tournament itself still exists
```

### Tournament Weights

```gherkin
  Scenario: Default weight is 1.0 [PW]
    Given I link a tournament to my event
    Then its weight is 1.0

  Scenario: Change tournament weight [PW] [unit: eventStandings.test]
    Given "Round 1" is linked with weight 1.0
    When I change the weight to 2.0
    Then standings recalculate with "Round 1" scores doubled

  Scenario: Weight of zero eliminates tournament from standings
    Given "Round 1" is linked with weight 0
    Then "Round 1" contributes zero to event standings
    # Risk: no validation prevents weight = 0

  Scenario: Negative weight distorts standings
    Given I set weight to -1
    Then standings show inverted scores for that tournament
    # Risk: no min/max bounds enforced
```

### Event Status

```gherkin
  Scenario: All-draft tournaments = event status "draft" [PW]
    Given my event has 2 linked tournaments
    And both are in draft state
    Then the event status shows "draft"

  Scenario: One started tournament = event status "active" [PW]
    Given my event has 2 tournaments
    And one has scored matches
    Then the event status shows "active"

  Scenario: All completed tournaments = event status "completed" [PW]
    Given my event has 2 tournaments
    And both have completedAt timestamps
    Then the event status shows "completed"

  Scenario: Past-date event with draft tournaments still shows "draft"
    Given my event date is yesterday
    And all linked tournaments are draft
    Then the event status is "draft" (not expired)
    # Risk: status derived from tournaments, not event date
```

### Aggregated Standings

```gherkin
  Scenario: Standings aggregate scores across tournaments [PW] [unit: eventStandings.test]
    Given event has "Round 1" (weight 1.0) and "Round 2" (weight 1.0)
    And Alice scored 20 points in Round 1 and 15 in Round 2
    Then Alice's event total is 35 points

  Scenario: Weighted standings multiply scores [PW] [unit: eventStandings.test]
    Given "Finals" has weight 2.0
    And Alice scored 10 points in Finals
    Then Alice's weighted contribution from Finals is 20 points

  Scenario: Tiebreaker resolves equal totals [PW] [unit: eventStandings.test]
    Given Alice and Bob both have 30 total points
    And Alice has better point differential
    Then Alice ranks above Bob

  Scenario: Sit-out compensation in event standings
    Given Alice sat out Round 2 of Tournament 1
    Then Alice gets the average points of that round as compensation

  Scenario: Club standings aggregate by club name [PW] [unit: eventStandings.test]
    Given Round 1 has "Lions" club and Round 2 also has "Lions" club
    Then their scores are merged into one "Lions" entry in club standings
    # Risk: same name = same club assumption; no ID matching
```

### Event Sharing

```gherkin
  Scenario: Copy event share link [PW]
    Given my event has code "EVT789"
    When I tap "Copy Link"
    Then the share URL containing "event=EVT789" is copied to clipboard
    And a success toast appears

  Scenario: Copy event code [PW]
    Given my event has code "EVT789"
    When I tap the code copy button
    Then "EVT789" is copied to clipboard

  Scenario: Share block hidden for completed events [PW]
    Given the event status is "completed"
    Then the share section is not visible
```

### Export

```gherkin
  Scenario: Export event as JSON to clipboard [PW]
    Given my event has 2 linked tournaments
    When I tap Export > Copy to Clipboard
    Then valid JSON is copied
    And it contains the event, tournament configs, and player data

  Scenario: Export event as JSON file download [PW]
    When I tap Export > Download as File
    Then a .json file is downloaded
    And the filename is based on the event name

  Scenario: Export fails silently on clipboard error
    Given the browser denies clipboard access
    When I tap Export > Copy to Clipboard
    Then a generic error toast appears
    # Risk: user doesn't know what failed
```

### Event Deletion

```gherkin
  Scenario: Delete event removes event and code mapping [PW]
    Given I own event "Spring Series" with code "EVT789"
    When I delete the event
    Then the event is removed from my list
    And code "EVT789" no longer resolves
    And linked tournaments are NOT deleted (only unlinked)

  Scenario: Only owner can delete [PW]
    Given I am viewing an event I do not own
    Then the delete option is not visible
```

### EventJoinScreen — Player View

```gherkin
  Scenario: Player sees event tournaments and standings [PW]
    Given I opened event "Spring Series" via code
    Then I see all linked tournaments with name, format, and player count
    And I see aggregated standings

  Scenario: Join button on unfilled tournament [PW]
    Given a linked tournament has available spots
    Then I see a "Join" button on that tournament card
    When I tap Join
    Then I am navigated to the JoinScreen for that tournament

  Scenario: Open button on filled tournament [PW]
    Given a linked tournament is at capacity
    Then I see an "Open" button (not "Join")
    When I tap Open
    Then I can view the tournament (read-only)

  Scenario: Edit button visible only to organizer [PW]
    Given I am the event organizer
    Then I see an Edit button
    When a non-organizer views the event
    Then the Edit button is hidden

  Scenario: Layout changes by event status [PW]
    Given the event is "active"
    Then standings are shown above the tournament list
    When the event is "draft"
    Then tournaments are shown above standings
```

### Edge Cases & Interrupted Flows

```gherkin
  Scenario: Linked tournament deleted externally
    Given "Round 1" is linked to my event
    When the organizer of "Round 1" deletes it
    Then "Round 1" silently disappears from the event view
    But the event.tournaments array still references it
    # Risk: ghost entry until next load

  Scenario: Event with many tournaments degrades performance
    Given an event with 20 linked tournaments
    Then 20 Firebase listeners are active simultaneously
    And the standings computation runs on every update
    # Risk: no upper bound on tournaments per event

  Scenario: Refresh preserves event view [PW]
    Given I am viewing an event
    When I refresh the page with ?event=EVT789
    Then I land back on the EventJoinScreen
    And standings are recalculated from live data
```
