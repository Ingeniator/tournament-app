# Runner Maldiciones (Curse Cards) — Test Scenarios

## Feature Brief

### What It Does

Optional chaos mechanic that adds curse cards to tournament play:

- **Card dealing** — hands dealt to teams at tournament start based on chaos level (lite/medium/hardcore)
- **Cast curse** — before a match, target a player on the opposing team with a curse card
- **Shield (Escudo)** — block an incoming curse; limited uses per team
- **Veto** — return a cast card to the caster if curse hasn't been applied yet
- **25 unique curse cards** — each with distinct effects and titles (Retaliation, Family Curse, Curse Back, etc.)
- **Maldiciones awards** — special nominations for curse-related achievements at ceremony

### Who Uses It

Players and organizers who want a fun, unpredictable twist on standard tournament play. Controlled by the organizer's chaos level setting.

### Critical Rules

1. **3 chaos levels** — lite (fewer cards), medium, hardcore (more cards per team)
2. **Cards dealt once** — at tournament start; not re-dealt on player/round changes
3. **Cast targets opposing team only** — can't curse your own partner
4. **One curse per match per team** — can't stack multiple curses on same match
5. **Shield is limited** — finite uses per team across the tournament
6. **Veto window** — curse can be vetoed only before match scoring begins
7. **Card effects are flavor** — the system tracks card play but doesn't enforce game effects (honor system)
8. **Awards track** — most curses cast, most cursed, best shield usage, etc.

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Cards lost on player replacement** | Replaced player's team loses unplayed cards | Card hands tied to team/player IDs; replacement doesn't migrate cards |
| **Toggle off mid-tournament** | Dealt cards become orphaned state; no cleanup | Maldiciones can be disabled but dealt hands persist in state |
| **Chaos level change after dealing** | No re-deal; original distribution stands | Cards dealt once at start; changing level has no effect |
| **Dynamic formats + maldiciones** | Team composition changes each round; card ownership unclear | Cards dealt to "teams" but teams rotate in non-fixed-partner formats |
| **Veto timing race** | Curse cast and score entered simultaneously | No lock between casting and scoring; veto window is UI-only |
| **Award computation with partial data** | Maldiciones awards shown even if few cards played | No minimum threshold for award eligibility |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation · `[e2e: ...]` = covered by Playwright spec · `[unit: ...]` = covered by unit test

### Card Dealing — Happy Path

```gherkin
Feature: Maldiciones (Curse Cards)

  Scenario: Cards dealt at tournament start — lite chaos [PW]
    Given maldiciones is enabled with chaos level "lite"
    When the tournament starts
    Then each team receives a small hand of curse cards
    And the total card count is less than medium level

  Scenario: Cards dealt at tournament start — medium chaos [PW]
    Given maldiciones is enabled with chaos level "medium"
    When the tournament starts
    Then each team receives a moderate hand of curse cards

  Scenario: Cards dealt at tournament start — hardcore chaos [PW]
    Given maldiciones is enabled with chaos level "hardcore"
    When the tournament starts
    Then each team receives a large hand of curse cards
    And more cards are in play than medium level

  Scenario: Card hands are unique selections from 25 cards [PW]
    Given maldiciones is enabled
    When cards are dealt
    Then each card in a hand is unique
    And cards come from the 25 available curse card types
```

### Casting Curses

```gherkin
  Scenario: Cast curse on opposing player [PW]
    Given my team has a curse card "Retaliation"
    And we are about to play against Team B
    When I cast "Retaliation" targeting a player on Team B
    Then the curse is applied to that match
    And "Retaliation" is removed from my hand

  Scenario: Cannot curse own teammate [PW]
    Given my team has a curse card
    When I try to cast it
    Then only opposing team players are selectable as targets

  Scenario: One curse per match per team [PW]
    Given I already cast a curse on this match
    When I try to cast another curse on the same match
    Then the action is blocked
    # Only one curse per match per team

  Scenario: Cast curse before scoring [PW]
    Given a match is unscored
    When I cast a curse on it
    Then the curse is recorded
    And I can then enter the score
```

### Shield (Escudo)

```gherkin
  Scenario: Block incoming curse with shield [PW]
    Given opponent cast a curse on my player
    And my team has shield uses remaining
    When I use a shield (escudo)
    Then the curse is blocked
    And my shield count decreases by 1

  Scenario: No shields remaining [PW]
    Given my team has 0 shields left
    And opponent cast a curse on my player
    Then I cannot use a shield
    And the curse takes effect

  Scenario: Shield count is finite across tournament [PW]
    Given my team started with 2 shields
    And I used 1 shield
    Then I have 1 shield remaining for the rest of the tournament
```

### Veto

```gherkin
  Scenario: Veto a cast curse before scoring [PW]
    Given Team A cast a curse on the current match
    And the match has not been scored yet
    When Team A vetoes the curse
    Then the card returns to Team A's hand
    And the match has no active curse

  Scenario: Cannot veto after match is scored
    Given Team A cast a curse on a match
    And the match has been scored
    When Team A tries to veto
    Then the veto is not available
    # Veto window closes once scoring begins

  Scenario: Veto timing race with score entry
    Given Team A casts a curse
    And the score keeper enters the score at the same moment
    Then either the veto succeeds (curse returned) or fails (score recorded first)
    # Risk: no lock between casting and scoring
```

### Dynamic Formats + Maldiciones

```gherkin
  Scenario: Cards in non-fixed-partner format
    Given format is Mexicano (partners change each round)
    And maldiciones is enabled
    Then curse cards are dealt to individual players (not fixed teams)
    # Risk: card "ownership" unclear when teams rotate

  Scenario: Cards in fixed-partner format [PW]
    Given format is Team Americano (fixed partners)
    And maldiciones is enabled
    Then curse cards are dealt to teams
    And cards stay with the team for the entire tournament
```

### Player Replacement & Cards

```gherkin
  Scenario: Replaced player's team loses unplayed cards
    Given Team [Alice, Bob] has 3 unplayed curse cards
    When Alice is replaced by Zara
    Then Team [Zara, Bob] keeps the same cards
    # Or risk: cards are tied to player IDs and become orphaned

  Scenario: Cards dealt — then player marked unavailable
    Given "Alice" has 2 unplayed cards
    When Alice is marked unavailable
    Then Alice's cards remain in state but cannot be played
    # Risk: no cleanup; cards stuck
```

### Toggle Mid-Tournament

```gherkin
  Scenario: Disable maldiciones after cards dealt
    Given maldiciones is active with cards dealt
    When the organizer disables maldiciones in settings
    Then curse card UI disappears
    But dealt cards persist in tournament state
    # Risk: orphaned state; no cleanup

  Scenario: Re-enable maldiciones after disabling
    Given maldiciones was disabled after being active
    When the organizer re-enables it
    Then the previously dealt cards reappear
    # Cards are not re-dealt

  Scenario: Chaos level change after dealing has no effect
    Given cards were dealt at "lite" level
    When the organizer changes chaos level to "hardcore"
    Then no new cards are dealt
    And existing hands remain unchanged
```

### Maldiciones Awards

```gherkin
  Scenario: Awards computed at ceremony [PW]
    Given maldiciones was active and cards were played
    When the tournament completes
    Then maldiciones-specific awards are shown
    And they include: most curses cast, most cursed player, best shield usage

  Scenario: Awards shown with minimal card activity
    Given only 1 curse was cast in the entire tournament
    Then maldiciones awards are still computed
    # Risk: no minimum threshold; awards may feel unearned

  Scenario: No maldiciones awards when feature was off
    Given maldiciones was never enabled
    When the tournament completes
    Then no maldiciones awards appear in the ceremony
```

### Persistence

```gherkin
  Scenario: Card hands persist after refresh [PW]
    Given cards were dealt and 2 have been played
    When I refresh the page
    Then remaining cards are still in each team's hand
    And played cards are still recorded

  Scenario: Cast curse persists after refresh [PW]
    Given a curse was cast on the current match
    When I refresh
    Then the curse is still shown on that match

  Scenario: Shield count persists after refresh [PW]
    Given my team used 1 of 2 shields
    When I refresh
    Then shield count shows 1 remaining
```

### Edge Cases

```gherkin
  Scenario: All cards played — no more curses available
    Given my team has played all their curse cards
    Then the cast curse button is disabled for my team
    And shields may still be available

  Scenario: Curse cast on sit-out round
    Given a player sits out this round
    Then they cannot be targeted by a curse
    And they cannot cast curses
```
