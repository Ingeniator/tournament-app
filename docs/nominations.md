# Nominations — Award System

Source: `packages/runner/src/hooks/useNominations.ts`

## Overview

When a tournament completes (phase `completed`, 2+ scored matches), the system generates a set of award nominations shown in a swipeable carousel. Awards recognize individual and pair achievements beyond the final standings.

The final output is an ordered array:

```
[podium medals] + [tier-weighted non-podium awards] + [lucky award]
```

## Award Categories

### Podium (always shown, up to 3)

| # | Title | Emoji | Criteria |
|---|-------|-------|----------|
| 1 | Champion | 🥇 | Rank 1 |
| 2 | Runner-up | 🥈 | Rank 2 |
| 3 | Third Place | 🥉 | Rank 3 |

**King of the Court format**: The champion entry uses 👑 emoji and title "King of the Court" instead of 🥇 "Champion". Runner-up and Third Place are unchanged.

Podium slots are skipped when ranks don't match position (e.g., ties).

### Non-Podium Awards (up to 30 possible)

Awards are evaluated against tournament data. Each has qualification criteria — not all will qualify in every tournament. In a typical tournament, 8–15 may qualify; up to 7 are shown.

#### Individual / Competitive

| # | ID | Title | Emoji | Tier | Criteria |
|---|-----|-------|-------|------|----------|
| 1 | `undefeated` | Undefeated | ⭐ | Legendary | Won every match (min 2 played) |
| 2 | `giant-slayer` | Giant Slayer | ⚔️ | Legendary | Lowest-ranked competitor who beat #1 (rank > 3) |
| 3 | `underdog` | Underdog | 🐺 | Legendary | Bottom-half competitor with >50% win rate (min 2 matches) |
| 4 | `comeback-king` | Comeback King | 👑 | Legendary | Win rate improved >30% from first to second half, going from <50% to >50% (min 4 matches) |
| 5 | `point-machine` | Point Machine | 💥 | Common | Most total points scored (excluded if rank #1) |
| 6 | `iron-wall` | Iron Wall | 🛡️ | Rare | Lowest avg points conceded per game (min 2 games) |
| 7 | `quick-strike` | Quick Strike | ⚡ | Common | Largest single-game victory margin |
| 8 | `consistency-champion` | Consistency Champion | 🎯 | Rare | Smallest score variance (std dev of margins, min 3 games, non-negative avg margin) |
| 9 | `clutch-player` | Clutch Player | 🧊 | Rare | Best win rate in close games (margin ≤ threshold, min 2 close games) |
| 10 | `see-saw` | See-Saw Specialist | ⚖️ | Common | Most close games played (min 2) |
| 11 | `competitive-game` | Instant Classic | 🔥 | Common | Closest match score in the tournament (margin ≤ threshold) |
| 12 | `nearly-there` | Nearly There | 🥈 | Rare | Rank 2 within tight gap of #1 (≤10 pts or ≤5% of leader's total) |
| 13 | `battle-tested` | Battle Tested | 🫡 | Common | Most close games lost (min 2) |
| 14 | `warrior` | Warrior | 💪 | Common | Most games played (only if variation exists, max 2 recipients) |
| 15 | `dominator` | Dominator | 🔥 | Rare | Longest winning streak (min 3 consecutive wins) |
| 16 | `offensive-powerhouse` | Offensive Powerhouse | 💣 | Common | Highest scoring average per game (excluded if rank #1 or same as Iron Wall winner) |
| 17 | `peacemaker` | Peacemaker | 🕊️ | Rare | Most drawn matches (min 2 draws, >45% draw rate if 4+ games played, max 2 recipients) |

#### Format-Specific

| # | ID | Title | Emoji | Tier | Criteria |
|---|-----|-------|-------|------|----------|
| 18 | `court-climber` | Court Climber | 🧗 | Rare | KOTC only: most promotions to higher courts (min 2 promotions, min 3 rounds played) |

#### Club (only for club-americano format)

| # | ID | Title | Emoji | Tier | Criteria |
|---|-----|-------|-------|------|----------|
| 19 | `club-champion` | Club Champion | 🏆 | — (podium-style) | Club with the most aggregate points. Always shown after podium, not in the award lottery. |
| 20 | `club-rivalry` | Club Rivalry | ⚔️ | Rare | Two clubs with the closest total points difference (gap ≤ 10% of leader's points) |
| 21 | `club-mvp` | Club MVP | 🌟 | Rare | Pair that scored the highest percentage of their club's total points (club must have 2+ pairs) |
| 22 | `club-solidarity` | Club Solidarity | 🤝 | Common | Club where the points spread between pairs is smallest (most even contributions, 2+ pairs) |

#### Pair / Duo (only when partners rotate, i.e. `!strategy.hasFixedPartners`)

| # | ID | Title | Emoji | Tier | Criteria |
|---|-----|-------|-------|------|----------|
| 23 | `best-duo` | Best Duo | 🤝 | Rare | Pair with highest win % together (min 2 games) |
| 24 | `offensive-duo` | Offensive Duo | 🚀 | Common | Pair with highest avg points scored (min 2, excluded if same as Best Duo) |
| 25 | `wall-pair` | Defensive Duo | 🏰 | Common | Pair with lowest avg points conceded (min 2 games) |
| 26 | `hot-streak-duo` | Hot Streak Duo | 🔥 | Rare | Pair with longest winning streak (min 3) |
| 27 | `social-butterfly` | Social Butterfly | 🦋 | Common | Most unique partners across all matches (min 3, only if variation exists) |

#### Head-to-Head (only when partners rotate)

| # | ID | Title | Emoji | Tier | Criteria |
|---|-----|-------|-------|------|----------|
| 28 | `nemesis` | Nemesis | 😈 | Legendary | Beat same opponent 3+ times with 0 losses |
| 29 | `rubber-match` | Rubber Match | 🔄 | Common | Same team pair played multiple times with split results |
| 30 | `gatekeeper` | Gatekeeper | 🚧 | Rare | Beat all lower-ranked, lost to all higher-ranked (min 3 games, not rank 1 or last) |

### Lucky Award (always shown, 1)

| Title | Emoji | Criteria |
|-------|-------|----------|
| Lucky One / Lucky Ones | 🍀 | Randomly chosen competitor, seeded by tournament ID |

## Close-Game Threshold

Several awards reference a "close game" threshold:

```
closeThreshold = max(2, floor(pointsPerMatch × 0.15))
```

For a 21-point match this is 3 points; for a 32-point match it's 4.

## Slot Budget

The number of non-podium award slots scales with tournament size:

```
MAX_AWARDS = min(7, max(3, floor(competitorCount / 2)))
```

| Competitors | Slots |
|-------------|-------|
| 4–5 | 3 |
| 6–7 | 3 |
| 8–9 | 4 |
| 10–11 | 5 |
| 12–13 | 6 |
| 14+ | 7 |

## Rarity Tiers

Every non-podium award is assigned a tier that controls how often it appears across tournaments:

| Tier | Awards | Selection Weight | Appearance Feel |
|------|--------|-----------------|-----------------|
| **Legendary** | Undefeated, Giant Slayer, Underdog, Comeback King, Nemesis | 15% of slots | Rare sighting — collectible |
| **Rare** | Dominator, Clutch Player, Iron Wall, Consistency Champion, Gatekeeper, Best Duo, Hot Streak Duo, Nearly There, Peacemaker, Court Climber, Club Rivalry, Club MVP | 30% of slots | Moderately unusual |
| **Common** | Point Machine, Quick Strike, See-Saw, Instant Classic, Battle Tested, Warrior, Offensive Powerhouse, Offensive Duo, Defensive Duo, Rubber Match, Social Butterfly, Club Solidarity | 55% of slots | Appear most tournaments |

Tier assignment reflects both the difficulty of the statistical achievement and the specificity of the conditions required. Legendary awards require rare tournament conditions (someone winning every game, a massive comeback from a losing start, etc.).

## Selection Algorithm

### Step 1: Tier Bucketing

After all qualifying awards are generated, each is tagged with its tier from the `AWARD_TIERS` map. Awards are then separated into three buckets (legendary, rare, common) and each bucket is independently shuffled using a seeded PRNG.

### Step 2: Weighted Slot Filling (with soft player cap)

For each of the `MAX_AWARDS` slots:

1. **Roll a tier** using a seeded random number:
   - `[0, 0.15)` → legendary
   - `[0.15, 0.45)` → rare
   - `[0.45, 1.0)` → common

2. **Pick an award** from that tier's queue, scanning for the first award that satisfies the per-player soft cap (see below). If the preferred tier is empty, fall back to adjacent tiers in priority order:
   - legendary → rare → common
   - rare → common → legendary
   - common → rare → legendary

3. **Record** the selection — increment each player name's award count.

### Step 3: Per-Player Soft Cap

To prevent one dominant competitor from collecting most awards:

- **Cap**: max 2 non-podium awards per player name
- During slot filling, any award where a player already has 2 selected awards is skipped in favor of the next qualifying award in the queue
- **Soft relaxation**: if the capped pass can't fill all slots (e.g., small tournament with few players), a second uncapped pass fills remaining slots from whatever awards remain

This ensures at least 3–4 different competitors are recognized in a 7-slot tournament.

### Step 4: Final Shuffle

The selected awards are shuffled one final time (seeded) so tiers are interleaved rather than clustered.

### Determinism

All randomness uses a seeded PRNG derived from the tournament's match IDs:

```
seed = hash of all match IDs across all rounds
```

This ensures the same tournament always produces the same award selection and order, while different tournaments produce different mixes.

## Visual Treatment

### In-App (NominationCard component)

| Tier | Border | Glow | Badge |
|------|--------|------|-------|
| Common | Default (`--color-border`) | None | None |
| Rare | `--color-tier-rare` (violet) | 12px box-shadow + inset | Pill badge: "RARE" |
| Legendary | `--color-tier-legendary` (amber) | 16px box-shadow + inset | Pill badge: "LEGENDARY" |

### Share Image (Canvas renderer)

The `renderNominationImage()` function in `standingsImage.ts` mirrors the CSS treatment:
- Tier-colored border stroke (1.5px for rare/legendary vs 1px default)
- Shadow blur glow effect
- Rounded pill badge with tinted background above the emoji

### Per-Skin Color Overrides

Tier colors are defined globally as CSS variables:

```css
--color-tier-legendary: var(--amber-9);
--color-tier-legendary-tint: var(--amber-a3);
--color-tier-rare: var(--violet-9);
--color-tier-rare-tint: var(--violet-a3);
```

Two skins override the rare tier to avoid clashing with their violet/purple primary:

| Skin | Override | Reason |
|------|----------|--------|
| Bold Tech | `--color-tier-rare: var(--crimson-9)` | Primary is `#8b5cf6` (identical to `--violet-9`) |
| Latte | `--color-tier-rare: var(--crimson-9)` | Primary is `#8839ef` (very close to `--violet-9` in light mode) |

The canvas renderer reads tier colors via `getComputedStyle`, so per-skin overrides are automatically reflected in shared images.

## Share Text

The `useShareText` hook generates a text representation of awards for messenger sharing. Awards are listed as:

```
`🧊 Clutch Player`  Alice — 3/4 close games won
```

The tier is not included in the text format — it's a visual-only treatment.

## File Map

| File | Role |
|------|------|
| `hooks/useNominations.ts` | Core logic: award generation, tier assignment, weighted selection, soft cap |
| `hooks/awards/club.ts` | Club-specific awards: Club Champion, Club Rivalry, Club MVP, Club Solidarity |
| `components/nominations/NominationCard.tsx` | Card UI with tier badge and styling |
| `components/nominations/NominationCard.module.css` | Tier-specific borders, glows, badge styles |
| `utils/standingsImage.ts` | Canvas rendering for share images with tier visuals |
| `hooks/useShareText.ts` | Text-based award formatting for messenger sharing |
| `variables.css` | Tier color tokens (`--color-tier-*`) and per-skin overrides |
