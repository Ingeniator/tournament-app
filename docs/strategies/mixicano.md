# Mixicano Strategy

Source: `packages/runner/src/strategies/mixicano.ts`

## Overview

Mixicano is a dynamic format similar to Mexicano, but with a group constraint: players are divided into two groups (A and B), and every team must have one player from each group. This is commonly used for mixed-gender tournaments where each team has one man and one woman.

Like Mexicano, matchups are standings-based after round 1, and rounds are generated one at a time.

## Strategy Flags

| Flag | Value | Meaning |
|------|-------|---------|
| `isDynamic` | `true` | Rounds generated one at a time based on standings |
| `hasFixedPartners` | `false` | Partners rotate every round; pair/duo awards are available |

## Setup Requirements

Mixicano has custom validation (`validateMixicanoSetup`):

| Constraint | Value | Reason |
|-----------|-------|--------|
| Minimum players | 4 | Standard minimum |
| Minimum courts | 1 (available) | |
| Minimum points per match | 1 | |
| Minimum per group | 2 players in each group (A and B) | Need at least 2 from each group to form 2 cross-group teams |
| All players assigned | Every player must have `group` set to `'A'` or `'B'` | Unassigned players cause an error |
| Max courts | `floor(min(groupA, groupB) / 2)` | Limited by the smaller group |

### Warnings

A non-blocking warning is shown when groups are unequal in size (e.g., "Groups are unequal (5 vs 3) — less variety in matchups").

## Round Generation Pipeline

### Sit-out Selection

Sit-outs are selected independently per group to maintain group balance:
- Group A sit-outs: `groupA.length - numCourts × 2`
- Group B sit-outs: `groupB.length - numCourts × 2`

Each group uses the standard `selectSitOuts` (most games played first, tiebreak by rest spacing).

### Round 1: Random Cross-Group Pairing

1. Shuffle Group A and Group B players independently
2. Take pairs: `A[0]+B[0]` vs `A[1]+B[1]` for court 1, `A[2]+B[2]` vs `A[3]+B[3]` for court 2, etc.
3. Between the two possible cross-pairings per court, pick the one with fewer partner repeats

### Subsequent Rounds: Standings-Based Pairing

#### Step 1: Rank Within Groups

Calculate standings using `calculateCompetitorStandings`. Sort Group A and Group B players independently by their standings rank.

#### Step 2: Cross-Group Mexicano Pairing

For each court `i`:
- Take `A[2i]` (higher-ranked A) and `A[2i+1]` (lower-ranked A)
- Take `B[2i]` (higher-ranked B) and `B[2i+1]` (lower-ranked B)
- **Team 1**: top A + top B (strongest from each group)
- **Team 2**: bottom A + bottom B (weakest from each group)

This mirrors the Mexicano 1st+4th vs 2nd+3rd pattern but across two groups.

## Standings Calculation

Same as Mexicano — standard individual standings:

```
totalPoints = Σ(matchPoints) + sitOutCompensation
```

Sorting: totalPoints (desc) → pointDiff (desc) → matchesWon (desc) → name (alpha).

## Competitors

Each individual player is a competitor (regardless of group). Unavailable players are excluded.

## File Map

| File | Role |
|------|------|
| `strategies/mixicano.ts` | Core logic: group validation, cross-group pairing, standings-based matchups |
| `strategies/shared.ts` | Shared utilities: `selectSitOuts`, `calculateCompetitorStandings` |
