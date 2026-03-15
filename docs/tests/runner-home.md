# Runner HomeScreen — Test Scenarios

## Feature Brief

### What It Does

Entry point of the Runner PWA. Lets users start or resume a tournament:

- **Create tournament** — pick a format from the 14 available, enter a name (or get a random one)
- **Resume tournament** — load saved tournament from localStorage (`padel-tournament-v1`)
- **Import tournament** — from clipboard (JSON paste) or file upload; validates JSON schema
- **Load from Planner** — when launched via Planner export, tournament auto-loads with schedule pre-generated (skips setup phase)

### Who Uses It

Tournament organizers at the venue, ready to run a live scoring session on a phone or tablet.

### Critical Rules

1. **Single tournament at a time** — localStorage holds one tournament; creating or importing overwrites the previous one
2. **Import validation** — checks JSON schema, format compatibility, player count, court count
3. **Planner-sourced tournaments skip setup** — schedule generated on load, phase jumps to in-progress
4. **Resume shows tournament name + format** — so user knows what they're continuing
5. **PWA install banner** — shown on iOS Safari when app is not installed

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Overwrite without confirmation** | Previous tournament silently lost | Creating or importing always overwrites `padel-tournament-v1` key |
| **Corrupt localStorage** | App stuck, can't load or create | Invalid JSON in localStorage crashes `loadTournament()` |
| **Import schema mismatch** | Tournament loads but behaves wrong | Partial validation; missing fields may cause runtime errors later |
| **Planner export ID remapping** | Player IDs don't match between apps | `buildRunnerTournament` creates new IDs; if mapping breaks, scores attributed to wrong players |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation · `[e2e: ...]` = covered by Playwright spec · `[unit: ...]` = covered by unit test

### Create Tournament — Happy Path

```gherkin
Feature: Runner Home

  Scenario: Create tournament with selected format [PW] [e2e: home-screen]
    Given I am on the Runner home screen
    When I enter "Weekend Padel" as name
    And I select "Americano" format
    And I tap Create
    Then I land on the SetupScreen
    And the tournament name is "Weekend Padel"
    And the format is Americano

  Scenario: Create tournament with random name [PW]
    Given I am on the Runner home screen
    When I tap the random name button
    Then a name is auto-filled
    When I select a format and tap Create
    Then the tournament is created with that random name

  Scenario: All 14 formats are selectable [PW]
    Given I am on the format selection
    Then I see all available formats
    And each format has a name and description
```

### Resume Tournament

```gherkin
  Scenario: Resume saved tournament [PW] [e2e: home-screen + tournament-flow]
    Given localStorage has a saved tournament "Friday Padel" in setup phase
    When I open the Runner app
    Then I see a "Resume" option showing "Friday Padel"
    When I tap Resume
    Then I land on the SetupScreen with all saved data intact

  Scenario: Resume in-progress tournament [PW] [e2e: home-screen]
    Given localStorage has a tournament in in-progress phase
    When I tap Resume
    Then I land on the Play/Log tab with scores preserved

  Scenario: No resume option when no saved tournament [PW] [e2e: edge-cases]
    Given localStorage has no saved tournament
    When I open the Runner app
    Then the Resume option is not shown
```

### Import

```gherkin
  Scenario: Import valid JSON from clipboard [PW] [e2e: home-screen]
    Given valid tournament JSON is in my clipboard
    When I tap Import > From Clipboard
    Then the tournament is loaded
    And I land on the appropriate phase screen

  Scenario: Import valid JSON from file [PW]
    Given I have a valid .json tournament file
    When I tap Import > Upload File and select the file
    Then the tournament is loaded

  Scenario: Import invalid JSON shows error [PW] [e2e: home-screen]
    Given invalid JSON is in my clipboard
    When I attempt to import from clipboard
    Then I see a validation error message

  Scenario: Import with missing required fields
    Given JSON is valid but missing player data
    When I attempt to import
    Then I see a schema validation error
    # Risk: partial validation may miss some fields
```

### Planner-Sourced Tournament

```gherkin
  Scenario: Planner export auto-loads with schedule [PW] [unit: exportToRunner.test]
    Given the Planner wrote tournament data to localStorage
    When I open the Runner app
    Then the tournament loads in in-progress phase (setup skipped)
    And the schedule is pre-generated
    And all player names match the Planner registration
```

### Overwrite Warning

```gherkin
  Scenario: Creating new tournament overwrites existing [PW]
    Given localStorage has a saved in-progress tournament
    When I create a new tournament
    Then the old tournament is silently overwritten
    # Risk: no confirmation dialog; old data lost

  Scenario: Importing overwrites existing tournament
    Given localStorage has a saved tournament
    When I import a different tournament from clipboard
    Then the old tournament is replaced
    # Risk: no "are you sure?" prompt
```

### Persistence

```gherkin
  Scenario: Tournament saved to localStorage on creation [PW] [e2e: tournament-flow]
    Given I create a tournament
    When I check localStorage key "padel-tournament-v1"
    Then it contains the tournament data

  Scenario: Corrupt localStorage handled gracefully [e2e: edge-cases]
    Given localStorage contains invalid JSON for "padel-tournament-v1"
    When I open the Runner app
    Then the app loads the home screen without crashing
    And no Resume option is shown
    # Risk: current behavior may crash loadTournament()
```

### PWA

```gherkin
  Scenario: iOS install banner shown in Safari [PW]
    Given I am on iOS Safari
    And the app is not installed as a PWA
    Then I see a banner prompting to add to home screen
```
