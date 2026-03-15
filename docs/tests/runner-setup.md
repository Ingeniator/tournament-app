# Runner Setup & Team Pairing — Test Scenarios

## Feature Brief

### What It Does

Two phases that prepare a tournament before scoring begins:

**SetupScreen (setup phase):**
- Add players (single entry or bulk import)
- Edit / remove players
- Assign groups (A / B for cross-group formats like Mixicano)
- Assign clubs (club formats)
- Configure tournament: format, courts, scoring mode (points/games/sets/timed), rounds, points per match
- Sit-out fairness warnings (unequal sit-outs across rounds)
- Duration estimates based on scoring config
- Validate setup: minimum 4 players, courts ≤ players/4, groups/clubs coverage

**TeamPairingScreen (team-pairing phase, team formats only):**
- Auto-generate team pairs from player list
- Shuffle teams (re-randomize)
- Swap individual players between teams
- Rename teams (custom names or auto-generated from player names)
- Cross-group and club constraints enforced at team creation

### Who Uses It

Tournament organizers setting up a live event — adding players who are physically present, configuring courts and rules.

### Critical Rules

1. **Minimum 4 players** to proceed
2. **Maximum courts = floor(playerCount / 4)** — ensures every court has a full match
3. **Group assignment required** for cross-group formats (Mixicano, mixed variants)
4. **Club assignment required** for club formats — all players must belong to a club
5. **Team formats require even player count** — odd players can't form pairs
6. **Scoring mode constraints** — points ≥ 1, games ≥ 1, sets ≥ 1, or timed with minutes ≥ 1
7. **Sit-out warning** — alerts if round count creates unequal sit-outs across players
8. **Team constraints** — cross-group pairs required for Mixicano teams; same-club for club teams
9. **Duplicate names** — auto-suffixed with [1], [2] via `deduplicateNames` utility
10. **Schedule generated on phase transition** — setup → team-pairing or setup → in-progress

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Schedule quality depends on randomization** | Unfair pairings or too many repeats | Optimization uses scoring heuristic (100× partner repeat penalty); not guaranteed optimal |
| **Sit-out imbalance not blocking** | Some players sit out more than others | Warning only, not a hard validation error |
| **Group/club assignment incomplete** | Schedule generation fails or produces invalid matches | Validation exists but edge cases with mixed assigned/unassigned players |
| **Team shuffle loses custom names** | Organizer's custom team names overwritten | Shuffle regenerates all teams; custom names not preserved |
| **Bulk import name collisions** | Duplicate suffixes confuse players | Auto-dedup adds [1], [2] but players may not recognize their suffixed name |
| **Player removal after schedule gen** | Should not be possible in-progress, but edge cases with planner-sourced tournaments | Phase transition guards exist but planner loads skip setup |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation · `[e2e: ...]` = covered by Playwright spec · `[unit: ...]` = covered by unit test

### Add Players — Happy Path

```gherkin
Feature: Runner Setup

  Scenario: Add single player [PW] [e2e: tournament-flow]
    Given I am on the SetupScreen
    When I type "Alice" and tap Add
    Then "Alice" appears in the player list

  Scenario: Add multiple players individually [PW] [e2e: tournament-flow]
    Given I am on the SetupScreen
    When I add "Alice", "Bob", "Carol", "Dave"
    Then all 4 appear in the player list

  Scenario: Bulk import players [PW] [unit: PlayerInput.test]
    Given I am on the SetupScreen
    When I paste "Alice, Bob, Carol, Dave" in the bulk input
    And I confirm
    Then 4 players are added

  Scenario: Edit player name [PW] [unit: PlayerList.test]
    Given "Alice" is in the player list
    When I edit her name to "Alice S."
    Then the list shows "Alice S."

  Scenario: Remove player [PW] [e2e: setup-screen] [unit: PlayerList.test]
    Given "Alice" is in the player list
    When I remove Alice
    Then she is no longer in the list
```

### Duplicate Names

```gherkin
  Scenario: Duplicate names get auto-suffixed [PW]
    Given "Alice" is already in the list
    When I add another "Alice"
    Then two players appear: "Alice" and "Alice [2]"

  Scenario: Bulk import with duplicates
    When I bulk import "Alice, Bob, Alice"
    Then players are: "Alice", "Bob", "Alice [2]"
```

### Configuration

```gherkin
  Scenario: Set courts count [PW] [e2e: setup-screen]
    Given I have 8 players
    When I set courts to 2
    Then courts shows 2
    And no validation error appears

  Scenario: Set scoring mode to points [PW]
    Given I am configuring the tournament
    When I select "Points" scoring mode
    And I set points per match to 21
    Then the config shows points mode with 21 points

  Scenario: Set scoring mode to timed [PW]
    When I select "Timed" scoring mode
    And I set duration to 20 minutes per round
    Then the config shows timed mode

  Scenario: Set round count [PW] [e2e: setup-screen]
    When I set rounds to 6
    Then the config shows 6 rounds
```

### Setup Validation

```gherkin
  Scenario: Cannot proceed with fewer than 4 players [PW] [e2e: tournament-flow + edge-cases]
    Given I have 3 players
    When I tap Start
    Then I see a validation error about minimum 4 players

  Scenario: Courts cannot exceed player count / 4 [PW]
    Given I have 4 players
    When I set courts to 2
    Then I see a validation error about too many courts

  Scenario: Team format requires even player count [PW]
    Given format is Team Americano
    And I have 5 players
    When I tap Start
    Then I see a validation error about even player count

  Scenario: Club format requires all players in a club [PW]
    Given format is Club Americano
    And 1 player has no club assigned
    When I tap Start
    Then I see a validation error about club assignment

  Scenario: Mixicano requires group assignments [PW] [e2e: mixicano-flow]
    Given format is Mixicano
    And 2 players have no group assigned
    When I tap Start
    Then I see a validation error about group assignment

  Scenario: Scoring values must be positive [PW]
    When I set points per match to 0
    Then I see a validation error about minimum value
```

### Warnings (non-blocking)

```gherkin
  Scenario: Sit-out fairness warning [PW]
    Given 5 players and 1 court with 3 rounds
    Then I see a warning that not all players sit out equally
    But I can still proceed

  Scenario: Duration estimate shown [PW]
    Given I configured 21 points, 6 rounds, 2 courts
    Then I see an estimated tournament duration
```

### Group & Club Assignment

```gherkin
  Scenario: Assign player to group [PW] [e2e: mixicano-flow]
    Given format is Mixicano
    And "Alice" is in the player list
    When I assign Alice to Group A
    Then Alice shows Group A label

  Scenario: Assign player to club [PW]
    Given format is Club Americano with clubs "Lions" and "Eagles"
    When I assign Alice to "Lions"
    Then Alice shows "Lions" club label
```

### Team Pairing Phase

```gherkin
  Scenario: Auto-generate teams [PW] [e2e: team-pairing]
    Given format is Team Americano with 8 players
    When I proceed to team pairing
    Then 4 teams of 2 are generated

  Scenario: Shuffle teams [PW] [e2e: team-pairing]
    Given teams are generated
    When I tap Shuffle
    Then teams are re-randomized
    And all players are still in a team

  Scenario: Swap players between teams [PW] [e2e: team-pairing]
    Given Team 1 has [Alice, Bob] and Team 2 has [Carol, Dave]
    When I swap Bob and Carol
    Then Team 1 has [Alice, Carol] and Team 2 has [Bob, Dave]

  Scenario: Rename team [PW]
    Given Team 1 is auto-named "Alice & Bob"
    When I rename it to "The Champions"
    Then Team 1 shows "The Champions"

  Scenario: Shuffle resets custom team names
    Given I renamed Team 1 to "The Champions"
    When I tap Shuffle
    Then Team 1 has a new auto-generated name
    # Risk: custom names not preserved on shuffle

  Scenario: Mixicano teams require cross-group pairs
    Given format is Mixicano
    And Alice is Group A, Bob is Group A
    Then Alice and Bob cannot be on the same team
```

### Phase Transition

```gherkin
  Scenario: Start generates schedule and moves to in-progress [PW] [e2e: tournament-flow]
    Given a valid setup with 8 players, 2 courts, Americano
    When I tap Start
    Then the schedule is generated
    And I land on the in-progress Play/Log view
    And Round 1 matches are visible

  Scenario: Team format goes through team-pairing first [PW] [e2e: team-pairing]
    Given format is Team Americano with 8 players
    When I tap Start
    Then I land on the TeamPairingScreen (not in-progress)
    When I confirm teams
    Then I land on the in-progress view
```

### Persistence

```gherkin
  Scenario: Setup state persists after refresh [PW] [e2e: tournament-flow]
    Given I added 6 players and set 2 courts
    When I refresh the page
    Then I am on the SetupScreen with 6 players and 2 courts

  Scenario: Team pairing persists after refresh [PW]
    Given I am on the TeamPairingScreen with custom team names
    When I refresh the page
    Then I am on the TeamPairingScreen with teams preserved
```
