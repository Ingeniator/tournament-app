# Runner Scoring & Match Log — Test Scenarios

## Feature Brief

### What It Does

The core gameplay loop — scoring matches and tracking progress across rounds:

**PlayScreen (play tab):**
- Live standings table (derived via strategy's `calculateStandings()`)
- Club standings (club formats)
- Current round overview with match cards
- Nomination/award cards (auto-computed: podium, custom awards, club awards, maldiciones awards)
- Ceremony mode on completion (award display, lucky draw)
- Standings image export (shareable PNG)
- Share text generation (formatted results for messaging)

**LogScreen (log tab):**
- Full match log grouped by round
- Score entry per match (ScoreInput component)
- Edit previously scored matches
- Clear match scores
- Player stats: W-L-D record, points trend, head-to-head
- Distribution stats: court utilization, partner balance, opponent balance
- Round carousel navigation
- Optimization info (schedule quality metrics)

**Dynamic round generation:**
- For dynamic formats (Mexicano, Mixicano, King of the Court, club-mexicano): next round auto-generates when current round is fully scored
- Standings from current round determine next round's pairings

### Who Uses It

Tournament organizers and score keepers entering live match results at the venue.

### Critical Rules

1. **Standings are derived, not stored** — `useStandings` calls strategy's `calculateStandings()` in `useMemo` on every state change
2. **Score validation** — strategy's `validateScore()` checks format-specific rules (e.g., points sum, set count)
3. **Dynamic generation trigger** — next round generated only when ALL matches in current round are scored
4. **Sit-out compensation** — players who sit out get average points of that round (fair ranking)
5. **Partially scored rounds on completion** — unscored matches treated as sit-outs; fully unscored rounds dropped
6. **Match scores are mutable** — can edit or clear any scored match during in-progress phase
7. **Tiebreaker chain** — totalPoints → pointDiff → matchesWon → name (alphabetical last resort)
8. **King of the Court bonus** — top court awards bonus points; losing team drops, winning team stays
9. **Club standings** — aggregate player standings by club; same tiebreaker chain
10. **Nominations auto-compute** — podium (top 3), up to 7 custom awards, lucky draw (random)

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Score edit changes standings retroactively** | Rankings shift; dynamic rounds were generated from old standings | Editing a past score doesn't regenerate future rounds already played |
| **Dynamic gen from stale standings** | Wrong pairings in next round | Standings computed in `useMemo`; if score update and generation race, stale data used |
| **Sit-out compensation skew** | Player who sat out in a high-scoring round benefits unfairly | Average includes outlier scores; no cap or median alternative |
| **Ceremony triggered prematurely** | Awards shown before all scores entered | Completion logic closes unscored rounds; organizer may not realize some matches were missed |
| **Standings image export fails** | Clipboard write denied by browser | Canvas-to-clipboard requires secure context and user gesture; silent failure |
| **Score validation per-format inconsistency** | Some formats allow scores others reject | Each strategy implements `validateScore` independently; no shared validation baseline |
| **Head-to-head stats wrong after player replacement** | Old player's matches attributed to replacement | `REPLACE_PLAYER` updates IDs in matches but stats hook may cache old data |
| **Round carousel out of sync** | User sees wrong round after dynamic generation | Carousel index may not auto-advance to newly generated round |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation · `[e2e: ...]` = covered by Playwright spec · `[unit: ...]` = covered by unit test

### Score Entry — Happy Path

```gherkin
Feature: Runner Scoring

  Scenario: Enter match score [PW] [e2e: play-screen + tournament-flow] [unit: ScoreInput.test + PlayScreen.test]
    Given Round 1 has a match: Alice+Bob vs Carol+Dave
    When I enter score 11-7
    Then the match card shows 11-7
    And standings update to reflect the score

  Scenario: Score all matches in a round [PW] [e2e: tournament-flow]
    Given Round 1 has 2 matches
    When I score both matches
    Then Round 1 shows as fully scored
    And all 8 players' standings update

  Scenario: Edit a previously scored match [PW]
    Given match Alice+Bob vs Carol+Dave was scored 11-7
    When I edit the score to 11-9
    Then the match card shows 11-9
    And standings recalculate

  Scenario: Clear a match score [PW] [e2e: play-screen] [unit: ScoreInput.test + PlayScreen.test]
    Given a match is scored 11-7
    When I clear the score
    Then the match card shows no score
    And standings recalculate without that match
```

### Score Validation

```gherkin
  Scenario: Reject invalid score in points mode [PW]
    Given scoring mode is points to 11
    When I try to enter score 0-0
    Then the score is rejected with a validation message

  Scenario: Accept valid score in games mode [PW]
    Given scoring mode is games
    When I enter a valid games score
    Then the score is accepted

  Scenario: Accept valid score in sets mode [PW]
    Given scoring mode is sets
    When I enter a valid sets score
    Then the score is accepted
```

### Standings

```gherkin
  Scenario: Standings update in real time after scoring [PW] [e2e: mexicano-flow + team-americano-flow] [unit: useStandings.test]
    Given Alice has 0 points
    When I score a match where Alice's team won 11-5
    Then Alice's standings show 11 total points

  Scenario: Tiebreaker by point differential [PW] [unit: useStandings.test]
    Given Alice and Bob both have 22 total points
    And Alice has +6 point differential, Bob has +4
    Then Alice ranks above Bob

  Scenario: Tiebreaker by matches won when points and diff equal
    Given Alice and Bob have same total points and point differential
    And Alice won 3 matches, Bob won 2
    Then Alice ranks above Bob

  Scenario: Alphabetical tiebreaker as last resort
    Given Alice and Bob have identical stats
    Then Alice ranks above Bob (alphabetical)

  Scenario: Club standings aggregate player scores [PW]
    Given a Club Americano tournament
    And "Lions" club has Alice (20pts) and Bob (15pts)
    Then Lions club standings show 35 total points
```

### Sit-Out Compensation

```gherkin
  Scenario: Sit-out player gets average points [PW]
    Given Round 1 has 3 matches with scores 11-7, 11-9, 11-5
    And "Eve" sat out Round 1
    Then Eve's sit-out compensation for Round 1 is the average of all points scored

  Scenario: Partially scored round — unscored matches become sit-outs
    Given Round 3 has 2 matches
    And only 1 is scored when tournament completes
    Then players in the unscored match get sit-out compensation
```

### Dynamic Round Generation

```gherkin
  Scenario: Next round auto-generates when current fully scored [PW] [e2e: mexicano-flow + mixicano-flow]
    Given format is Mexicano (dynamic)
    And Round 1 has 2 matches
    When I score both matches
    Then Round 2 is automatically generated
    And Round 2 pairings are based on current standings

  Scenario: Partial scoring does not trigger next round [PW]
    Given format is Mexicano
    And Round 1 has 2 matches
    When I score only 1 match
    Then Round 2 is NOT generated yet

  Scenario: King of the Court — winners stay on top court [PW]
    Given format is King of the Court
    And Round 1 top-court match won by Alice+Bob
    When Round 2 generates
    Then Alice+Bob are on the top court in Round 2
    And the losing team drops down
```

### Static Formats

```gherkin
  Scenario: All rounds pre-generated for Americano [PW] [e2e: tournament-flow]
    Given format is Americano with 8 players, 2 courts, 6 rounds
    When the tournament starts
    Then all 6 rounds with matches are visible in the log

  Scenario: Navigate rounds via carousel [PW]
    Given 6 rounds exist
    When I swipe the round carousel to Round 3
    Then I see Round 3 matches
```

### Tournament Completion

```gherkin
  Scenario: Complete fully scored tournament [PW] [e2e: tournament-flow + play-screen]
    Given all rounds and matches are scored
    When I complete the tournament
    Then the ceremony screen shows
    And podium awards display (gold, silver, bronze)

  Scenario: Complete with unscored matches [PW] [e2e: log-screen]
    Given Round 3 has 1 unscored match
    When I complete the tournament
    Then unscored matches are treated as sit-outs
    And the ceremony still shows

  Scenario: Complete with fully unscored rounds [PW]
    Given Round 5 and Round 6 have no scores at all
    When I complete the tournament
    Then Rounds 5 and 6 are dropped entirely
    And standings only reflect Rounds 1-4

  Scenario: Ceremony triggered before all scores entered
    Given Round 3 has 2 unscored matches I intended to score
    When I accidentally complete the tournament
    Then those matches become sit-outs
    # Risk: no "are you sure?" listing unscored matches
```

### Nominations & Awards

```gherkin
  Scenario: Podium awards computed at completion [PW] [unit: useNominations.test]
    Given Alice is 1st, Bob is 2nd, Carol is 3rd
    When the ceremony shows
    Then Alice gets Gold, Bob gets Silver, Carol gets Bronze

  Scenario: Custom awards displayed [PW] [unit: useNominations.test]
    Given the tournament is complete
    Then up to 7 special awards are shown (Best Offense, Most Consistent, etc.)
    And each award has a player name and description

  Scenario: Lucky draw selects a random player [PW] [unit: useNominations.test]
    Given the tournament is complete
    Then the lucky draw award shows a randomly selected player
```

### Score Edit — Edge Cases

```gherkin
  Scenario: Editing past score in dynamic format does not regenerate future rounds
    Given format is Mexicano
    And Rounds 1-3 are scored, Round 4 was generated from Round 3 standings
    When I edit a Round 1 score
    Then standings update globally
    But Round 4 pairings remain unchanged
    # Risk: Round 4 was generated from old standings; now inconsistent

  Scenario: Edit score after tournament completion
    Given the tournament is completed
    Then I cannot edit match scores
    # Scores are immutable after completion
```

### Sharing & Export

```gherkin
  Scenario: Export standings as shareable image [PW] [e2e: completed]
    Given the tournament has standings
    When I tap "Share Image"
    Then a PNG of the standings table is copied to clipboard

  Scenario: Generate share text [PW] [e2e: completed]
    Given the tournament is complete
    When I tap "Share Text"
    Then formatted results text is copied to clipboard
    And it includes rankings and scores

  Scenario: Image export fails without secure context
    Given I am on an HTTP (non-HTTPS) page
    When I tap "Share Image"
    Then the export fails silently
    # Risk: canvas-to-clipboard requires HTTPS
```

### Persistence

```gherkin
  Scenario: Scores persist after refresh [PW] [e2e: tournament-flow + edge-cases]
    Given I scored 3 matches
    When I refresh the page
    Then all 3 scores are preserved
    And standings are recalculated correctly

  Scenario: Dynamic round generation persists after refresh [PW]
    Given Mexicano Round 2 was auto-generated
    When I refresh the page
    Then Round 2 is still visible with its pairings

  Scenario: Ceremony state persists after refresh
    Given I completed the tournament and the ceremony is showing
    When I refresh the page
    Then the ceremony screen is still displayed
```

### Player Stats

```gherkin
  Scenario: View player win-loss record [PW] [unit: usePlayerStats.test]
    Given Alice won 3, lost 1, drew 0
    When I view Alice's stats
    Then I see W:3 L:1 D:0

  Scenario: View head-to-head stats [PW] [unit: usePlayerStats.test]
    Given Alice played against Bob in 2 matches
    When I view Alice's head-to-head with Bob
    Then I see the record between them

  Scenario: Distribution stats show court utilization [PW] [unit: useDistributionStats.test]
    Given the tournament has 2 courts
    When I view distribution stats
    Then I see how many times each player played on each court
```
