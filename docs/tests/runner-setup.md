# Runner Tournament Loading — Test Scenarios

## Feature Brief

### What It Does

Handles how tournaments arrive in the Runner and transition to the in-progress play view. There is no manual setup UI in the Runner — all tournament configuration (players, format, courts, clubs, groups) happens in the Planner.

**Loading paths:**
- **From Planner** — Planner writes tournament data to localStorage and redirects to `/play`. Runner loads the tournament and auto-generates the schedule on first load.
- **From import** — User imports a JSON file or pastes JSON from clipboard on the HomeScreen. Imported tournaments in `setup` or `team-pairing` phase are auto-advanced to `in-progress`.
- **Resume** — User refreshes or reopens the app; saved tournament is loaded from localStorage.

**Auto-schedule generation:**
- `TournamentContext` detects tournaments in `setup` or `team-pairing` phase on load and dispatches `GENERATE_SCHEDULE` synchronously.
- The schedule is generated using the strategy for the tournament's format.
- For team formats, teams must already be set (by the Planner) before generation.
- Maldiciones cards are dealt at generation time if enabled in config.

### Who Uses It

Tournament organizers who configured the event in the Planner, then open the Runner on a phone/tablet to start live scoring.

### Critical Rules

1. **No setup UI** — the Runner has no screens for adding players, configuring format, or pairing teams
2. **Auto-generation on load** — any tournament in `setup` or `team-pairing` phase is auto-advanced to `in-progress`
3. **Team formats require pre-set teams** — the Planner is responsible for creating teams; the Runner just generates the schedule from them
4. **Config resolved on generation** — `resolveConfigDefaults` fills in missing values (maxRounds, pointsPerMatch, minutesPerRound) based on player count and format
5. **Player deduplication** — `deduplicateNames` runs on load and generation to handle name collisions
6. **Maldiciones dealt once** — curse cards dealt at schedule generation if enabled; not re-dealt on subsequent loads
7. **Import validates schema** — format string must match a registered strategy; required fields checked

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Planner export ID remapping** | Player IDs don't match between apps | `buildRunnerTournament` creates new IDs; if mapping breaks, scores attributed to wrong players |
| **Import with unknown format** | Tournament fails to load | Strategy registry checked at import; unregistered formats rejected |
| **Teams missing for team format** | Schedule generation produces invalid matches | If Planner fails to set teams, generation falls back to individual pairings |
| **Config defaults wrong** | Too many/few rounds, wrong scoring | `resolveConfigDefaults` has format-specific heuristics; edge cases may produce surprising defaults |
| **Stale localStorage** | Old tournament blocks new one | Planner overwrites the key, but race conditions possible if Runner is open |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation · `[e2e: ...]` = covered by Playwright spec · `[unit: ...]` = covered by unit test

### Load from Planner

```gherkin
Feature: Runner Tournament Loading

  Scenario: Planner tournament auto-generates schedule [PW] [unit: exportToRunner.test]
    Given the Planner wrote a tournament to localStorage in setup phase
    When I open the Runner app
    Then the tournament loads in in-progress phase
    And the schedule is pre-generated
    And Round 1 matches are visible

  Scenario: Planner team tournament auto-generates schedule [PW] [unit: exportToRunner.test]
    Given the Planner wrote a team-americano tournament with teams to localStorage
    When I open the Runner app
    Then the tournament loads in in-progress phase
    And teams are preserved from the Planner
    And matches use the team pairings

  Scenario: Player names match Planner registration [PW] [unit: exportToRunner.test]
    Given the Planner exported players "Alice", "Bob", "Carol", "Dave"
    When the Runner loads the tournament
    Then the standings show "Alice", "Bob", "Carol", "Dave"

  Scenario: Config defaults resolved on generation [unit: resolveConfigDefaults]
    Given a tournament with no explicit maxRounds or minutesPerRound
    When the schedule is generated
    Then defaults are filled in based on player count and format
```

### Load from Import

```gherkin
  Scenario: Import valid JSON and auto-advance [PW] [e2e: home-screen]
    Given I have valid tournament JSON in setup phase
    When I import it on the HomeScreen
    Then the tournament auto-advances to in-progress
    And matches are generated

  Scenario: Import in-progress tournament resumes as-is [PW] [e2e: home-screen]
    Given I have valid tournament JSON in in-progress phase with scores
    When I import it
    Then the tournament loads with existing scores preserved
    And no schedule regeneration occurs

  Scenario: Import invalid JSON shows error [PW] [e2e: home-screen]
    Given I have malformed JSON in my clipboard
    When I attempt to import
    Then I see a validation error message

  Scenario: Import with unknown format rejected [unit: importExport]
    Given JSON has format "unknown-format"
    When I attempt to import
    Then I see an invalid config error

  Scenario: Import with missing fields rejected [unit: importExport]
    Given JSON is missing required player array
    When I attempt to import
    Then I see a schema validation error
```

### Resume Saved Tournament

```gherkin
  Scenario: Resume in-progress tournament after refresh [PW] [e2e: tournament-flow]
    Given a tournament is in-progress with some scores entered
    When I refresh the page
    Then I land on the Play/Log view with all scores preserved

  Scenario: Resume tournament that was in setup phase [PW]
    Given localStorage has a tournament in setup phase (e.g. from interrupted Planner export)
    When I open the Runner app
    Then the schedule is auto-generated
    And I land on the in-progress view

  Scenario: No tournament shows HomeScreen [PW] [e2e: edge-cases]
    Given localStorage has no saved tournament
    When I open the Runner app
    Then I see the HomeScreen
```

### Schedule Generation

```gherkin
  Scenario: Americano generates all rounds upfront
    Given a setup-phase tournament with 8 players, 2 courts, Americano format
    When the schedule is generated
    Then multiple rounds are created
    And each round has 2 matches (one per court)
    And all players are assigned across matches and sit-outs

  Scenario: Mexicano generates only round 1
    Given a setup-phase tournament with 8 players, 2 courts, Mexicano format
    When the schedule is generated
    Then only 1 round is created
    # Remaining rounds generated dynamically after scoring

  Scenario: Maldiciones cards dealt at generation
    Given a team tournament with maldiciones enabled
    When the schedule is generated
    Then each team receives curse cards
    And shield allocation matches chaos level config

  Scenario: Duplicate player names are suffixed [unit: deduplicateNames]
    Given a tournament with two players named "Alice"
    When the schedule is generated
    Then players are named "Alice" and "Alice [2]"
```

### Persistence

```gherkin
  Scenario: Tournament saved to localStorage on load [PW] [e2e: tournament-flow]
    Given a tournament is loaded from the Planner
    When I check localStorage key "padel-tournament-v1"
    Then it contains the tournament data in in-progress phase

  Scenario: Corrupt localStorage handled gracefully [e2e: edge-cases]
    Given localStorage contains invalid JSON for "padel-tournament-v1"
    When I open the Runner app
    Then the app loads the HomeScreen without crashing
```
