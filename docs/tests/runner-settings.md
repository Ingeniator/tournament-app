# Runner Settings & Live Management — Test Scenarios

## Feature Brief

### What It Does

In-tournament management accessible from the settings tab during in-progress phase:

- **Court management** — add/remove courts, rename, toggle availability (regenerates future rounds)
- **Player management** — add player live (regenerates remaining rounds), mark unavailable, replace player
- **Round management** — adjust round count, regenerate future rounds
- **Tournament config** — edit name, view format info
- **Export / import** — save tournament as JSON (clipboard or file), load from JSON
- **Delete tournament** — reset to home (confirmation required)
- **Maldiciones toggle** — enable/disable curse cards mid-tournament

### Who Uses It

Tournament organizers making adjustments during a live event — a court breaks, a player leaves, rounds need extending.

### Critical Rules

1. **Live court add** — validates `newCourtCount ≤ floor(playerCount / 4)`; regenerates future unscored rounds
2. **Court toggle availability** — disabled court excluded from future round generation; past rounds untouched
3. **Live player add** — player inserted into rotation; future rounds regenerated to include them
4. **Player unavailable** — excluded from future rounds; past scores preserved; can be re-enabled
5. **Replace player** — swaps player ID in all future matches + updates team references; past matches keep old scores
6. **Round count change** — can add or remove future rounds; cannot remove already-scored rounds
7. **Future round regeneration** — only unscored rounds are regenerated; scored rounds are immutable
8. **Export includes full state** — all rounds, scores, players, config; can be reimported on another device
9. **Delete is irreversible** — clears localStorage; no undo

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Live player add breaks pairing balance** | New player gets fewer games; sit-out distribution uneven | Regeneration uses same heuristic; can't retroactively fix past imbalance |
| **Replace player mid-round** | Current round has old player in some matches, new in others | Replacement only affects future matches; current round may be partially scored |
| **Court removal with active match** | Round has match on removed court; score can't be entered | Court disabled but match card still shows; no migration to another court |
| **Round count reduction loses data** | User removes rounds that had scores about to be entered | Only unscored rounds removed, but "about to score" intent is lost |
| **Export on incomplete tournament** | Imported elsewhere with partial scores; standings differ | No warning that tournament is incomplete on export |
| **Delete without export** | All tournament data permanently lost | Confirmation dialog exists but no "export first" suggestion |
| **Maldiciones toggle mid-tournament** | Cards already dealt become invalid; game balance disrupted | No cleanup of dealt cards when maldiciones disabled |
| **Regeneration changes future matchups** | Players who saw upcoming opponents now face different ones | Regeneration is random; no continuity guarantee |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation · `[e2e: ...]` = covered by Playwright spec · `[unit: ...]` = covered by unit test

### Court Management

```gherkin
Feature: Runner Live Settings

  Scenario: Add court during tournament [PW] [e2e: settings-advanced]
    Given a tournament with 8 players and 1 court in progress
    When I add a court (total = 2)
    Then future unscored rounds regenerate with 2 courts
    And scored rounds remain unchanged

  Scenario: Cannot add court beyond player limit [PW]
    Given 4 players and 1 court
    When I try to add a second court
    Then I see a validation error (max courts = 1 for 4 players)

  Scenario: Rename court [PW] [e2e: settings-advanced]
    Given court is named "Court 1"
    When I rename it to "Center Court"
    Then the court shows "Center Court" in match cards

  Scenario: Disable court [PW]
    Given a tournament with 2 active courts
    When I disable Court 2
    Then future rounds only use Court 1
    And past rounds with Court 2 scores are preserved

  Scenario: Re-enable disabled court [PW]
    Given Court 2 is disabled
    When I re-enable Court 2
    Then future rounds regenerate with 2 courts
```

### Player Management — Live

```gherkin
  Scenario: Add player mid-tournament [PW] [e2e: settings]
    Given a tournament in progress with 8 players
    When I add "Eve" as a live player
    Then future unscored rounds regenerate to include Eve
    And Eve does not appear in already-scored rounds

  Scenario: Mark player unavailable [PW] [e2e: settings]
    Given "Alice" is in the tournament
    When I mark Alice as unavailable
    Then future rounds exclude Alice
    And Alice's past scores are preserved
    And Alice still appears in standings (with fewer games)

  Scenario: Re-enable unavailable player [PW]
    Given Alice was marked unavailable
    When I re-enable Alice
    Then future rounds include Alice again

  Scenario: Replace player [PW]
    Given "Alice" is in the tournament
    When I replace Alice with "Zara"
    Then future matches show Zara instead of Alice
    And past scored matches still show Alice's scores
    And Zara inherits Alice's team assignment

  Scenario: Replace player mid-round with partial scores
    Given Round 3 has 2 matches
    And Match 1 is scored (Alice played)
    And Match 2 is unscored (Alice plays)
    When I replace Alice with Zara
    Then Match 1 keeps Alice's score
    And Match 2 shows Zara
    # Risk: current round may have mixed player identities
```

### Round Management

```gherkin
  Scenario: Add more rounds [PW] [e2e: play-screen + log-screen]
    Given tournament has 6 rounds, 4 scored
    When I increase rounds to 8
    Then 2 new rounds are generated
    And the 4 scored rounds are untouched

  Scenario: Remove future rounds [PW]
    Given tournament has 6 rounds, 4 scored
    When I reduce rounds to 5
    Then Round 6 is removed
    And Rounds 1-5 remain (4 scored, 1 unscored)

  Scenario: Cannot remove scored rounds [PW]
    Given tournament has 6 rounds, 4 scored
    When I try to reduce rounds to 3
    Then minimum allowed is 4 (can't remove scored rounds)

  Scenario: Regenerate future rounds [PW]
    Given Rounds 1-3 are scored, Rounds 4-6 are unscored
    When I tap Regenerate
    Then Rounds 4-6 get new matchups
    And Rounds 1-3 remain unchanged
```

### Export & Import

```gherkin
  Scenario: Export tournament to clipboard [PW] [e2e: settings-advanced + log-screen]
    Given a tournament in progress with scores
    When I tap Export > Clipboard
    Then valid JSON is copied
    And it contains all rounds, scores, players, and config

  Scenario: Export tournament as file [PW]
    When I tap Export > Download
    Then a .json file is downloaded

  Scenario: Import tournament from file mid-session [PW]
    Given I have a tournament export file
    When I import it from the settings tab
    Then the current tournament is replaced
    And the imported tournament loads with all data

  Scenario: Export incomplete tournament
    Given Round 3 has unscored matches
    When I export
    Then the JSON includes the unscored matches
    # Risk: no warning about incomplete state
```

### Delete Tournament

```gherkin
  Scenario: Delete tournament with confirmation [PW] [e2e: settings]
    Given a tournament is in progress
    When I tap Delete
    Then I see a confirmation dialog
    When I confirm
    Then localStorage is cleared
    And I return to the home screen

  Scenario: Cancel delete keeps tournament [PW]
    Given I tapped Delete
    When I cancel the confirmation
    Then the tournament is unchanged

  Scenario: Delete without exporting first
    Given a tournament with 4 rounds of scores
    When I delete without exporting
    Then all data is permanently lost
    # Risk: no "export first?" suggestion
```

### Maldiciones Toggle

```gherkin
  Scenario: Enable maldiciones mid-tournament
    Given maldiciones was off at tournament start
    When I enable maldiciones in settings
    Then curse cards become available
    # Risk: no cards dealt retroactively for past rounds

  Scenario: Disable maldiciones mid-tournament
    Given maldiciones was enabled and cards were dealt
    When I disable maldiciones
    Then curse card UI disappears
    But dealt cards remain in state
    # Risk: orphaned card state with no cleanup
```

### Persistence

```gherkin
  Scenario: Settings changes persist after refresh [PW]
    Given I renamed Court 1 to "Center Court"
    And I added a live player "Eve"
    When I refresh the page
    Then Court 1 is still "Center Court"
    And Eve is in the player list

  Scenario: Round count change persists [PW]
    Given I increased rounds from 6 to 8
    When I refresh
    Then 8 rounds are shown

  Scenario: Player unavailability persists [PW]
    Given I marked Alice as unavailable
    When I refresh
    Then Alice is still marked unavailable
```

### Edge Cases

```gherkin
  Scenario: Add court + player simultaneously
    Given 4 players and 1 court
    When I add a player (5 total) and then add a court (2 total)
    Then max courts check passes (floor(5/4) = 1)
    # Wait — 2 > 1, so this should fail
    # Risk: add court validation uses player count at time of click

  Scenario: Regeneration after court change doesn't preserve matchup fairness
    Given Rounds 4-6 were regenerated after adding a court
    Then the new matchups are random
    And partner/opponent balance may differ from original
    # No continuity guarantee

  Scenario: Live player add with insufficient capacity for dynamic format
    Given Mexicano with 4 players, Round 2 about to generate
    When I add a 5th player
    And Round 2 generates (5 players, 1 court = 1 match + 1 sit-out)
    Then the new player is included in the sit-out rotation
```
