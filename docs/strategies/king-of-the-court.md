# King of the Court Strategy

Source: `packages/runner/src/strategies/kingOfTheCourt.ts`

## Overview

King of the Court (KOTC) is a dynamic format where courts are ranked: Court 1 is the "King Court" (highest), and the last court is the lowest. After each round, winners promote to a higher court and losers relegate to a lower court. Players on higher courts earn bonus points added to their standings.

Unlike Americano (which generates the full schedule up front), KOTC generates one round at a time — each round depends on the previous round's results.

## Setup Requirements

KOTC has stricter setup constraints than other formats:

| Constraint | Value | Reason |
|-----------|-------|--------|
| Minimum players | 8 | Need enough for meaningful promotion/relegation across 2+ courts |
| Minimum courts | 2 | Court hierarchy requires at least 2 levels |
| Minimum points per match | 24 | Higher point totals reduce randomness in results |
| Sit-out warning | >25% | Warns when more than 25% of players sit out each round |

These are enforced by `validateKOTCSetup`, which replaces the common validation used by other formats.

## Court Bonus (Auto-Derived)

Court bonuses are automatically derived from court position — there is no manual bonus configuration.

```
bonus = numAvailableCourts - 1 - courtIndex
```

| Court Position | 3-Court Example | 2-Court Example |
|---------------|-----------------|-----------------|
| Court 1 (King) | +2 bonus pts | +1 bonus pts |
| Court 2 | +1 bonus pts | +0 bonus pts |
| Court 3 | +0 bonus pts | — |

The bonus is added to each player's total points per scored match. This rewards players who reach and maintain the King Court.

**Backward compatibility**: The `Court` type no longer has a `bonus` field. Older tournaments that stored `bonus` in localStorage/Firebase are unaffected — the field is simply ignored and bonus is derived from position.

## Round Generation Pipeline

### Round 1: Random Grouping

Players are shuffled randomly and split into groups of 4 per court. Within each group, the pairing with the fewest partner repeats (from existing rounds, if any) is selected from the 3 possible 2v2 combinations.

### Subsequent Rounds: Promotion/Relegation

#### Step 1: Sit-out Selection

Same as Americano — players with the most games played sit out first, with ties broken by longest time since last sit-out.

#### Step 2: Determine Winners/Losers

For each match in the previous round:
- **Higher score** → winners
- **Lower score** → losers
- **Tie** → broken by overall standings rank (better-ranked players become "winners")

#### Step 3: Promote/Relegate

- **Winners** on court N promote to court N-1 (King Court winners stay on King Court)
- **Losers** on court N relegate to court N+1 (lowest court losers stay)

#### Step 4: Place Returning Sit-Out Players

Players returning from sit-out are placed based on their **last known court position**:

1. Look up the player's most recent match across all prior rounds
2. Try to place them at the same court index
3. If that court is full (4 players), try adjacent courts (lower index first, then higher)
4. Fall back to the lowest court with room

This prevents returning players from being dumped at the bottom after sitting out — they resume at their earned position.

#### Step 5: Rebalance

If any court has more or fewer than 4 players after placement, all assigned players are sorted by standings rank and redistributed evenly (best players to Court 1, etc.).

#### Step 6: Pair Within Courts

Within each court group of 4, players are ranked by standings. The pairing is 1st+4th vs 2nd+3rd (strongest paired with weakest).

## Standings Calculation

KOTC standings use the same base calculation as other individual formats (points scored, point differential, wins) plus court bonus:

```
totalPoints = Σ(matchPoints + courtBonus) + sitOutCompensation
```

Where:
- `matchPoints` = points the player's team scored in the match
- `courtBonus` = auto-derived from court position (see above)
- `sitOutCompensation` = average points per player in that round (for rounds the player sat out)

Sorting: totalPoints (desc) → pointDiff (desc) → matchesWon (desc) → name (alpha).

## UI Features

### Crown on King Court

In KOTC format, the King Court (index 0) displays a 👑 crown emoji before the court name in `MatchCard`. Other courts show their bonus as a muted label:

```
👑 Court 1 (+2 bonus pts)
Court 2 (+1 bonus pts)
Court 3
```

### Champion Nomination

When a KOTC tournament completes, the champion nomination shows:
- Emoji: 👑 (instead of 🥇)
- Title: "King of the Court" (instead of "Champion")

Runner-up and Third Place remain unchanged.

### Config Form

The runner and planner config forms show:
- **Readonly bonus labels** — auto-derived, not editable (e.g., "+2 bonus pts")
- **Minimum 2 courts** — remove button hidden when at 2 courts
- **Minimum 24 points** — `min` attribute on points input
- **Info hint** — explains that higher courts earn bonus points

## File Map

| File | Role |
|------|------|
| `strategies/kingOfTheCourt.ts` | Core logic: validation, round generation, promotion/relegation, standings |
| `components/rounds/MatchCard.tsx` | Crown emoji + bonus label display |
| `components/rounds/RoundCard.tsx` | Passes `format` prop to MatchCard |
| `components/setup/TournamentConfigForm.tsx` | Readonly bonus labels, KOTC constraints |
| `hooks/useNominations.ts` | KOTC-specific champion emoji/title |
| `utils/resolveConfigDefaults.ts` | Format-dependent minimum points (24 for KOTC) |
| `screens/PlayScreen.tsx` | Passes format to RoundCard |
| `screens/LogScreen.tsx` | Passes format to RoundCard |
