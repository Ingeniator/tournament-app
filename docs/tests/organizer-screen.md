# OrganizerScreen — Test Scenarios

## Feature Brief

### What It Does

OrganizerScreen is the main tournament management interface in the Planner app. It covers the full tournament lifecycle:

- **Tournament setup** — name, format (9 formats), courts, capacity, scoring mode, rounds
- **Player management** — add/bulk-add players, confirm/cancel, assign groups/clubs/ranks, pair partners
- **Registration tracking** — real-time status calculation (playing / reserve / cancelled / needs-partner / registered), FIFO ordering by timestamp
- **Sharing** — generate short codes and links for player self-registration
- **Match settings** — scoring mode (points/games/sets/timed), sit-out warnings, duration estimates
- **Start delegation** — authorize another player or Telegram user to launch the tournament
- **Captain mode** — approval workflow for club-based formats
- **Maldiciones** — chaos mode with lite/medium/hardcore levels for pair formats
- **Tournament launch** — validate config, transition players to the Runner scoring app
- **Export / import** — JSON backup, copy as runner format, restore from Firebase backup
- **Post-completion** — view results, reopen (undo completion), delete

Two UI modes: **Quick Play** (simplified, add-and-go) and **Share** (full config with registration links, metadata, delegates).

### Who Uses It

**Tournament organizers** — the person who creates the tournament, manages registrations, configures rules, and launches the event. Optionally delegates launch authority to another player or a Telegram account.

### Critical Rules

1. **Minimum 4 confirmed players** to launch
2. **Team formats require even player count** among "playing" players
3. **Partner pairing enforced** — in team formats with unfilled slots, all "playing" players must be paired
4. **Club assignment required** — in club formats, all "playing" players must belong to a club
5. **Court cap** — cannot exceed `floor(playerCount / 4)` courts (pair formats: `floor(floor(count / 2) / 2)`)
6. **Player status is derived, not stored** — computed from capacity, registration order, format rules, captain approvals
7. **Club-ranked capacity** — `minCapacity = clubCount * 2 * rankCount`, slots distributed per-club then per-rank bucket (rounded to even)
8. **Mixicano splits capacity 50/50** between Group A and Group B; unassigned fill remaining from either
9. **FIFO ordering** — registration timestamp determines who plays and who is reserve
10. **`startedBy` guard** — warns if a different user already started the tournament; can be overridden

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Race condition on launch** | Two organizers start simultaneously; `startedBy` check is not atomic | Firebase write + read is non-transactional |
| **Club-ranked slot distribution** | Wrong players get "playing" status; unfair seeding | Complex bucket math with bonus pairs, rounding, captain approvals |
| **Export/import ID remapping** | Player IDs in runner don't match planner; data loss if interrupted | `buildRunnerTournament` creates new IDs; no rollback |
| **localStorage overwrite on launch** | Previous runner tournament silently lost | `launchInRunner` blindly writes `padel-tournament-v1` key |
| **Silent Firebase failures** | Organizer thinks data saved but it wasn't | Writes to `startedBy`, feedback, backups can fail without blocking UI |
| **Stale validation** | Player statuses computed in `useMemo`; mid-validation registration changes not caught | Derived state can be one render behind |
| **Duplicate player names** | Confusion in standings, wrong scores attributed | Only warns, doesn't block |
| **Anonymous auth loss** | Organizer loses access to all their tournaments | Clearing browser data wipes anonymous Firebase credentials |
| **Format switch doesn't clear assignments** | Old group/club/rank data leaks into new format | State cleanup on format change is partial |
| **Captain mode with no notification** | Approved/rejected players never find out | Approvals are silent, manual-only |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation | `[e2e]` = covered by e2e test | `[unit]` = covered by unit test

### Tournament Setup — Happy Path

```gherkin
Feature: Tournament Setup

  Scenario: Create tournament with default settings [PW] [e2e: planner/create-tournament]
    Given I am on the OrganizerScreen for a new tournament
    When I enter "Friday Padel" as the tournament name
    And I select "Americano" format
    And I set courts to 2
    And I set capacity to 8
    Then the tournament name shows "Friday Padel"
    And the share code is a 6-character uppercase code
    And the share link contains the code

  Scenario: Switch between Quick Play and Share modes [PW]
    Given I am on the OrganizerScreen
    When a player self-registers via the share link
    Then the UI switches from Quick Play to Share mode
    And I see when/where fields, delegate settings, and registration link

  Scenario: Add players via bulk add [PW] [e2e: planner/create-tournament — "organizer can add players"]
    Given I am on the OrganizerScreen with capacity 8
    When I bulk-add "Alice, Bob, Carol, Dave"
    Then 4 players appear in the player list
    And all 4 show status "playing"

  Scenario: Change tournament format [PW] [e2e: planner/create-tournament — "organizer can configure format and courts"]
    Given I have a tournament set to "Americano"
    When I change the format to "Mexicano"
    Then the format picker shows "Mexicano"
    And format-specific options update accordingly
```

### Player Status Calculation

```gherkin
  Scenario: FIFO determines playing vs reserve [PW] [unit: playerStatus.test — "marks first N players as playing"]
    Given a tournament with capacity 4 and 1 court
    And players registered in order: Alice, Bob, Carol, Dave, Eve
    Then Alice, Bob, Carol, Dave have status "playing"
    And Eve has status "reserve" with position 1

  Scenario: Cancelling a player promotes the first reserve [PW] [unit: playerStatus.test — "marks cancelled players as cancelled"]
    Given a tournament with capacity 4 at full capacity
    And Eve is first reserve
    When the organizer cancels Dave
    Then Eve's status changes to "playing"
    And Dave's status is "cancelled"

  Scenario: Mixicano splits capacity 50/50 between groups [PW]
    Given a Mixicano tournament with capacity 8
    And 5 players in Group A and 3 in Group B
    Then 4 players from Group A have status "playing"
    And 3 players from Group B have status "playing"
    And 1 player from Group A has status "reserve"

  Scenario: Club-ranked distributes slots per club and rank bucket [unit: playerStatus.test — "limits per club per rank bucket"]
    Given a club-ranked tournament with 2 clubs, 2 ranks, capacity 8
    And Club A has 3 Rank-1 players and 3 Rank-2 players
    And Club B has 2 Rank-1 players and 2 Rank-2 players
    Then each club gets 4 slots
    And each rank bucket within a club gets 2 slots
    And excess players from Club A are "reserve"
```

### Launch Validation

```gherkin
  Scenario: Block launch with fewer than 4 players [PW] [unit: validateLaunch.test — "rejects when fewer than 4"]
    Given a tournament with 3 confirmed players
    When I tap the Start button
    Then I see a validation error "at least 4 players"
    And the tournament does not launch

  Scenario: Block launch with odd player count in team format [PW] [unit: validateLaunch.test — "rejects team format with odd"]
    Given a Team Americano tournament with 5 confirmed players
    When I tap the Start button
    Then I see a validation error about even player count

  Scenario: Block launch with unassigned clubs [PW] [unit: validateLaunch.test — "rejects club format when...no club"]
    Given a Club Americano tournament with 6 players
    And 1 player has no club assigned
    When I tap the Start button
    Then I see a validation error about club assignment

  Scenario: Block launch when courts exceed player capacity [PW] [unit: validateLaunch.test — "rejects when too many courts"]
    Given a tournament with 4 players and 2 courts
    When I tap the Start button
    Then I see a validation error about too many courts

  Scenario: Warn about unpaired players in team format [PW] [unit: validateLaunch.test — "rejects team format when players need partners"]
    Given a Team Americano tournament with capacity 8 and 6 players
    And 4 players are paired but 2 are not
    When I tap the Start button
    Then I see a validation error about unpaired players

  Scenario: Successful launch with valid config [PW] [unit: validateLaunch.test — "returns null when valid"]
    Given a tournament with 8 confirmed players and 2 courts
    And all validation passes
    When I tap the Start button
    Then the tournament exports to the Runner app
    And localStorage key "padel-tournament-v1" contains the tournament data
```

### Start Delegation

```gherkin
  Scenario: Delegate start to another player [PW]
    Given I set player "Bob" as start delegate
    When Bob opens the tournament join screen
    Then Bob sees the Start button

  Scenario: Warn when different user already started [PW]
    Given the tournament was started by "Alice"
    When "Bob" tries to launch the tournament
    Then Bob sees a warning that Alice already started
    And Bob can choose to proceed anyway or cancel
```

### Format Switch — Edge Cases

```gherkin
  Scenario: Switching format clears group assignments
    Given a Mixicano tournament where players have Group A/B assigned
    When I switch the format to Americano
    Then group assignments are no longer visible
    And no stale group data affects standings

  Scenario: Switching from club format to non-club format
    Given a Club Americano tournament where players have clubs assigned
    When I switch the format to Americano
    Then club assignments are no longer visible
```

### Sharing & Codes

```gherkin
  Scenario: Copy share link to clipboard [PW]
    Given I am on the OrganizerScreen
    When I tap the copy link button
    Then the share link is copied to clipboard
    And a success toast appears

  Scenario: Share code resolves to the correct tournament [e2e: planner/join-by-code — "join tournament by 6-character code"]
    Given my tournament has code "ABC123"
    When a player enters "abc123" on the home screen
    Then they are directed to this tournament's join screen
```

### Match Settings

```gherkin
  Scenario: Duration warning when match time exceeds tournament duration [PW]
    Given a tournament with duration 60 minutes
    When I set scoring to 21 points per match with 6 rounds
    And the estimated duration exceeds 60 minutes
    Then I see a warning about duration

  Scenario: Sit-out fairness warning [PW]
    Given a tournament with 5 players and 1 court
    When I set rounds to 3
    And not all players can sit out equally
    Then I see a warning about uneven sit-outs
```

### Export & Import

```gherkin
  Scenario: Export tournament as JSON [PW] [unit: plannerExport.test — "exports minimal tournament"]
    Given a configured tournament with 8 players
    When I tap "Export"
    Then a valid JSON is copied to clipboard
    And the JSON contains tournament config, players, and registrations

  Scenario: Restore from Firebase backup after completion
    Given a completed tournament with results
    When I tap "Reopen"
    Then the tournament returns to its pre-completion state
    And the completedAt timestamp is cleared
```

### Interrupted Flows

```gherkin
  Scenario: Launch overwrites existing Runner tournament
    Given localStorage has an active Runner tournament
    When I launch a new tournament from the Planner
    Then the old Runner tournament is overwritten
    And the new tournament loads in Runner

  Scenario: Refresh preserves tournament state [PW]
    Given I am on the OrganizerScreen with 6 players added
    When I refresh the page
    Then all 6 players are still visible
    And the tournament config is unchanged
    # Firebase real-time listener restores state

  Scenario: Firebase write failure does not block UI
    Given the network is unreliable
    When I add a player and Firebase write fails
    Then the UI does not freeze
    # Note: player may not persist — silent failure risk
```

### Captain Mode

```gherkin
  Scenario: Captain approves player to playing status [PW] [e2e: planner/club-ranked-captain — "captain mode...shows Registered section"] [unit: playerStatus.test — "captain mode: approved pair...gets playing"]
    Given a captain-mode Club Americano tournament
    And player "Alice" registered for "Club A"
    And I am the captain of Club A
    When I approve Alice
    Then Alice's status changes from "registered" to "playing"

  Scenario: Captain rejects player
    Given a captain-mode tournament
    And player "Bob" is registered for my club
    When I reject Bob
    Then Bob's status becomes "cancelled"
```

### Duplicate Names

```gherkin
  Scenario: Duplicate name shows warning but allows add [PW]
    Given a tournament with player "Alice"
    When the organizer adds another player named "Alice"
    Then a duplicate name warning appears
    And the organizer can confirm to add anyway

  Scenario: Two players with same name appear in list
    Given a tournament with two players named "Alice"
    Then both appear in the player list
    # Risk: confusion in standings
```

### Permissions

```gherkin
  Scenario: Only the organizer sees management controls
    Given I created the tournament
    Then I see edit, delete, and launch controls
    When a non-organizer player views the tournament
    Then they do not see organizer-only controls

  Scenario: Non-delegate cannot launch
    Given the tournament has no start delegate set
    When a non-organizer player opens the join screen
    Then the Start button is not visible to them
```
