# Strategy Taxonomy

## Core Insight

All format variation reduces to **three dimensions** plus a generic **grouping rule** system. Concepts that previously seemed distinct — flights, clubs, cross-group pairing, inter-group matches — are all the same mechanism: a player attribute + a direction (`cross` or `same`) applied to either pairs or matches.

---

## Dimensions

| Dimension | Purpose | Options |
|---|---|---|
| **Pair mode** | How pairs form each round | `fixed` · `random` · `standings` |
| **Match mode** | How matches are scheduled | `fixed` · `random` · `standings` · `promotion` |
| **Grouping rules** | Constraints on pairing and matching | 0–N rules (see below) |

**Standings level** is not a separate dimension — it is derived from pair mode + grouping rules (see below).

### Pair mode

- `fixed` — pre-defined pairs, never change throughout tournament
- `random` — new random pairs each round, optimized for balance
- `standings` — pair by rankings (e.g., 1st+4th vs 2nd+3rd)

### Match mode

- `fixed` — pre-determined fixture schedule (round-robin, club fixtures)
- `random` — random matchups, optimized for opponent balance
- `standings` — rank-based matchups: top vs top after R1
- `promotion` — court-based promotion/relegation (King of the Court)

### Grouping rules

A grouping rule is a constraint that uses a **player attribute** to control pair formation or match scheduling:

```
GroupingRule {
  attribute:  string                  // any player property: 'club', 'group', 'skill', 'gender', ...
  appliesTo:  'pairs' | 'matches'    // what it constrains
  direction:  'cross' | 'same'       // must span groups or stay within group
}
```

Multiple rules can stack. The same underlying mechanism covers every concept:

| Old concept | Unified grouping rule |
|---|---|
| Mixed cross-group pairs | `{ attribute: 'group', appliesTo: 'pairs', direction: 'cross' }` |
| Club: pairs within same club | `{ attribute: 'club', appliesTo: 'pairs', direction: 'same' }` |
| Club: matches between clubs | `{ attribute: 'club', appliesTo: 'matches', direction: 'cross' }` |
| Flight (skill pools) | `{ attribute: 'skill', appliesTo: 'matches', direction: 'same' }` |

---

## Derived: Standings Level

Standings level follows from pair mode and grouping:

| Pair mode | Grouping | → Standings level |
|---|---|---|
| `random` or `standings` | any | **individual** (per player) |
| `fixed` | no same-group pair rule | **pair** (per team) |
| `fixed` | pairs × attribute: `same` | **group** (aggregate by attribute) |

---

## Format Matrix

### Base formats (no club/group constraints)

| Format | Pair mode | Match mode | Grouping | Standings | Use case |
|---|---|---|---|---|---|
| **Americano** | random | random | — | individual | Social play. Everyone meets everyone with balanced variety. Best for casual events where mixing is the goal. |
| **Mexicano** | standings | standings | — | individual | Competitive play. After R1, stronger players face stronger opponents. Self-balancing difficulty. |
| **Mixed Americano** | standings | random | pairs × group: `cross` | individual | Mixed attribute play (e.g., men+women) with random opponents. Social mixing — diverse pairs without competitive pressure. |
| **Mixed Mexicano** | standings | standings | pairs × group: `cross` | individual | Mixed attribute play (e.g., men+women) with competitive matching. Diverse pairs AND rank-based opponents. |
| **Team Americano** | fixed | random | — | pair | Friends/partners play together. Team identity matters. Random opponents for variety. |
| **Team Mexicano** | fixed | standings | — | pair | Competitive team play. Fixed pairs face rank-matched opponents after R1. |
| **King of the Court** | standings | promotion | — | individual | Court hierarchy. Win → promote to higher court. Lose → relegate. Court bonuses reward staying on top. |

### Club formats (inter-club competition)

All club formats share two grouping rules: `pairs × club: same` (pairs within club) + `matches × club: cross` (play against other clubs). They differ in pair mode and match mode:

| Format | Pair mode | Match mode | Extra grouping | Standings | Use case |
|---|---|---|---|---|---|
| **Club Americano** | fixed | fixed | — | group | Classic inter-club. Pre-set fixtures (club round-robin). Predictable schedule, club pride. Best for organized league-style events. |
| **Club Team Americano** | fixed | random | — | group | Inter-club with random matchups between clubs each round. More variety than fixed fixtures. Good for shorter events where you can't do full round-robin. |
| **Club Team Mexicano** | fixed | standings | — | group | Competitive inter-club. Strongest teams face strongest teams across clubs. Self-balancing difficulty at team level. Best for competitive club events. |
| **Club Mexicano** | standings | standings | — | group | Individual players represent clubs but pairs rotate by standings within club. Club winner = aggregate of all player points. Best when club members want to mix pairs but still compete as a club. |
| **Club Mixed Mexicano** | standings | standings | pairs × segment: `cross` | group | Club competition with cross-segment pairs (e.g., advanced+beginner from same club). Ensures balanced pair skill within each club. |

### Flight modifier (applies to any format)

Flights add `matches × skill: same` — splitting players into separate competition pools.

| Format | Effect |
|---|---|
| **Americano + Flights** | Separate Americano pools by skill. Each flight has own standings and awards. |
| **Club Americano + Flights** | Club competition where each skill level plays separately. Could have a flight per court tier. |
| **Any format + Flights** | Same format rules, but players only compete within their flight. |

### Court bonus modifier (Super Mexicano)

Court bonuses add bonus points based on court tier — higher-ranked courts award more bonus points on top of the match score. This creates extra incentive to climb to the top court.

- **Super Mexicano** = Mexicano + court bonus. Configurable: bonus amount, starting round.
- Conceptually similar to KotC's court-tier scoring but applied to a standings-based format rather than promotion/relegation.
- Can combine with any `matchMode: 'standings'` format (Mexicano, Team Mexicano, Mixed Mexicano, club variants).
- Modeled as a `courtBonus?: { pointsPerTier: number, startRound: number }` config flag, not a separate format dimension.

### Invalid Combinations

| Pair mode | Match mode | Why invalid |
|---|---|---|
| `random` | `fixed` | Fixed schedule needs stable identities — random pairs change every round |
| `standings` | `fixed` | Same — fixtures can't be predetermined when pairs change |
| `fixed` + cross pair rule | any | Contradictory — cross-group forms pairs, but `fixed` means pre-formed |

---

## Groups Can Nest

Players can have multiple attributes simultaneously. Grouping rules on different attributes compose naturally:

```
Club Madrid
  ├─ Segment A (advanced): Player1, Player2, Player3, Player4
  └─ Segment B (beginner): Player5, Player6, Player7, Player8

Club Barcelona
  ├─ Segment A (advanced): Player9, Player10, Player11, Player12
  └─ Segment B (beginner): Player13, Player14, Player15, Player16
```

| Desired behavior | Grouping rules |
|---|---|
| Same-club, cross-segment pairs | `pairs × club: same` + `pairs × segment: cross` |
| Same-club, same-segment pairs | `pairs × club: same` + `pairs × segment: same` |
| Cross-club pairs | `pairs × club: cross` (this is just Mixed Mexicano with club as group) |
| Skill flights within club tournament | `pairs × club: same` + `matches × club: cross` + `matches × skill: same` |

---

## Proposed Engine Architecture

```
FormatConfig {
  pairMode:   'fixed' | 'random' | 'standings'
  matchMode:  'fixed' | 'random' | 'standings' | 'promotion'
  grouping:   GroupingRule[]
}

GroupingRule {
  attribute:  string               // player property name
  appliesTo:  'pairs' | 'matches'
  direction:  'cross' | 'same'
}
```

### Engine structure

```
┌──────────────────────────────────────────────────────┐
│                    Format Engine                      │
│                                                      │
│   ┌──────────────┐        ┌──────────────────────┐   │
│   │  Pair Module  │        │    Match Module      │   │
│   │               │        │                      │   │
│   │  · fixed      │        │  · fixed             │   │
│   │  · random     │        │  · random            │   │
│   │  · standings  │        │  · standings         │   │
│   │               │        │  · promotion (KotC)  │   │
│   └───────┬───────┘        └──────────┬───────────┘   │
│           │                           │               │
│   ┌───────┴───────────────────────────┴───────────┐   │
│   │            Grouping Rule Engine               │   │
│   │                                                │   │
│   │  For each rule:                                │   │
│   │    filter candidates by attribute + direction  │   │
│   │    apply to pairs or matches as configured     │   │
│   │                                                │   │
│   │  Rules compose: multiple rules stack as AND    │   │
│   └────────────────────────────────────────────────┘   │
│                                                      │
│   ┌────────────────────────────────────────────────┐   │
│   │            Standings Module                    │   │
│   │                                                │   │
│   │  Derived from pairMode + grouping rules        │   │
│   │  · individual (rotating pairs)                 │   │
│   │  · pair (fixed, no group)                      │   │
│   │  · group (fixed + same-group pair rule)        │   │
│   └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Implementation notes

- **Americano's** `random` pair module uses complex exhaustive optimization internally — the interface is the same (`pairMode: 'random'`), but the implementation is specialized for quality
- **KotC's** `promotion` match module is a unique paradigm (court hierarchy with bonuses) — it implements the match module interface but with fundamentally different internals
- Both can still conform to the composable interface while keeping their optimized implementations
- Grouping rules are processed by a shared engine: filter candidates, enforce direction, pass filtered sets to pair/match modules

### Migration path from current codebase

The `club` grouping shorthand below means: `[{ attribute: 'club', appliesTo: 'pairs', direction: 'same' }, { attribute: 'club', appliesTo: 'matches', direction: 'cross' }]`

| Current strategy file | Maps to FormatConfig |
|---|---|
| `americano.ts` | `{ pairMode: 'random', matchMode: 'random', grouping: [] }` |
| `mexicano.ts` | `{ pairMode: 'standings', matchMode: 'standings', grouping: [] }` |
| `mixicano.ts` (Mixed Mexicano) | `{ pairMode: 'standings', matchMode: 'standings', grouping: [pairs × group: cross] }` |
| `teamAmericano.ts` | `{ pairMode: 'fixed', matchMode: 'random', grouping: [] }` |
| `teamMexicano.ts` | `{ pairMode: 'fixed', matchMode: 'standings', grouping: [] }` |
| `clubAmericano.ts` (matchMode: slots) | `{ pairMode: 'fixed', matchMode: 'fixed', grouping: [club] }` |
| `clubAmericano.ts` (matchMode: random) | `{ pairMode: 'fixed', matchMode: 'random', grouping: [club] }` |
| `clubAmericano.ts` (matchMode: standings) | `{ pairMode: 'fixed', matchMode: 'standings', grouping: [club] }` |
| `kingOfTheCourt.ts` | `{ pairMode: 'standings', matchMode: 'promotion', grouping: [] }` |

### New formats (not yet implemented)

| Format | FormatConfig |
|---|---|
| Club Mexicano | `{ pairMode: 'standings', matchMode: 'standings', grouping: [club] }` |
| Club Mixed Mexicano | `{ pairMode: 'standings', matchMode: 'standings', grouping: [club, pairs × segment: cross] }` |

---

## Format Picker UI

Shared component in `@padel/common` used by both runner and planner. Two entry points: a curated list for users who know what they want, and a guided wizard for users who don't.

### Component: `<FormatPicker>`

```
FormatPicker {
  value:     FormatConfig
  onChange:  (config: FormatConfig) => void
  mode:      'list' | 'wizard'      // toggle between views
}
```

Both modes produce the same `FormatConfig` output. The toggle is a tab/link in the picker header: **"Browse formats"** | **"Help me choose"**.

### Mode 1 — Browse formats (curated list)

Grouped list of named presets. Each entry shows name, one-line description, and key traits as pills/tags. Selecting a preset populates the `FormatConfig`.

```
┌──────────────────────────────────────────────────┐
│  [Browse formats]  ·  Help me choose             │
├──────────────────────────────────────────────────┤
│                                                  │
│  Social                                          │
│  ┌────────────────────────────────────────────┐  │
│  │ ○ Americano                                │  │
│  │   Random partners, random opponents        │  │
│  │   [individual] [rotating pairs]            │  │
│  ├────────────────────────────────────────────┤  │
│  │ ○ Mixed Americano                          │  │
│  │   Cross-group partners, random opponents   │  │
│  │   [individual] [cross-group]               │  │
│  ├────────────────────────────────────────────┤  │
│  │ ○ King of the Court                        │  │
│  │   Court hierarchy, promotion/relegation    │  │
│  │   [individual] [court bonus]               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Competitive                                     │
│  ┌────────────────────────────────────────────┐  │
│  │ ○ Mexicano                                 │  │
│  │   Partners & opponents by standings        │  │
│  │   [individual] [by standings]              │  │
│  ├────────────────────────────────────────────┤  │
│  │ ○ Mixed Mexicano                           │  │
│  │   Cross-group partners, ranked opponents   │  │
│  │   [individual] [cross-group] [by standings]│  │
│  ├────────────────────────────────────────────┤  │
│  │ ○ Super Mexicano                           │  │
│  │   Mexicano + court tier bonuses            │  │
│  │   [individual] [by standings] [court bonus]│  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Team                                            │
│  ┌────────────────────────────────────────────┐  │
│  │ ○ Team Americano                           │  │
│  │   Fixed teams, random opponents            │  │
│  │   [team] [fixed pairs]                     │  │
│  ├────────────────────────────────────────────┤  │
│  │ ○ Team Mexicano                            │  │
│  │   Fixed teams, opponents by standings      │  │
│  │   [team] [fixed pairs] [by standings]      │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Club                                            │
│  ┌────────────────────────────────────────────┐  │
│  │ ○ Club Americano                           │  │
│  │   Fixed schedule, club round-robin         │  │
│  │   [club] [fixed pairs] [fixed schedule]    │  │
│  ├────────────────────────────────────────────┤  │
│  │ ○ Club Team Americano                      │  │
│  │   Fixed teams, random inter-club matchups  │  │
│  │   [club] [fixed pairs]                     │  │
│  ├────────────────────────────────────────────┤  │
│  │ ○ Club Team Mexicano                       │  │
│  │   Fixed teams, standings inter-club        │  │
│  │   [club] [fixed pairs] [by standings]      │  │
│  ├────────────────────────────────────────────┤  │
│  │ ○ Club Mexicano                            │  │
│  │   Rotating partners, club aggregate        │  │
│  │   [club] [individual] [by standings]       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Mode 2 — Help me choose (wizard)

Three steps. Each step is a single question with visual options (cards, not dropdowns). Invalid combinations are disabled with a short explanation. After completing steps, the resolved format name is shown as confirmation.

```
┌──────────────────────────────────────────────────┐
│  Browse formats  ·  [Help me choose]             │
├──────────────────────────────────────────────────┤
│                                                  │
│  Step 1 of 3 — How should partners be formed?    │
│                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │  🔀 Mix     │ │  🤝 Fixed   │ │  📊 By     │ │
│  │  every      │ │  teams      │ │  rankings  │ │
│  │  round      │ │             │ │            │ │
│  │             │ │ Same partner│ │ Top+bottom │ │
│  │ New partner │ │ throughout  │ │ pair up    │ │
│  │ each round  │ │             │ │            │ │
│  └─────────────┘ └─────────────┘ └────────────┘ │
│                                                  │
│                                      [Next →]    │
└──────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────┐
│  Step 2 of 3 — How should opponents be matched?  │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐┌───────┐ │
│  │ 🎲       │ │ 📊       │ │ 📋      ││ 👑    │ │
│  │ Random   │ │ By       │ │ Fixed   ││ Court │ │
│  │          │ │ standings│ │ schedule││ promo │ │
│  │          │ │          │ │         ││       │ │
│  │ Balanced │ │ Top vs   │ │ Round-  ││ Win→  │ │
│  │ variety  │ │ top      │ │ robin   ││ up    │ │
│  └──────────┘ └──────────┘ └─────────┘└───────┘ │
│                                                  │
│                              [← Back] [Next →]   │
└──────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────┐
│  Step 3 of 3 — Any special rules?                │
│                                                  │
│  ☐ Cross-group pairs (e.g. men + women)          │
│    Each pair must have one player from each group │
│                                                  │
│  ☐ Club competition                              │
│    Partners from same club, matches between clubs │
│                                                  │
│  ☐ Court bonuses (Super)                         │
│    Higher courts award bonus points               │
│                                                  │
│                              [← Back] [Done →]   │
├──────────────────────────────────────────────────┤
│                                                  │
│  ✓ That's a Mexicano tournament!                 │
│    Partners by standings · Opponents by standings │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Wizard validation rules

Disable invalid options with inline explanation:

| State | Disabled option | Reason shown |
|---|---|---|
| Pair mode = `random` or `standings` | Match mode: Fixed schedule | "Fixed schedule requires fixed teams" |
| Pair mode = `fixed` | Modifier: Cross-group pairs | "Cross-group pairs rotate each round — incompatible with fixed teams" |
| Match mode = `promotion` | Modifier: Club competition | "Court promotion doesn't apply to club fixtures" |
| Modifier: Club | Pair mode selection locked to `fixed` or `standings` | Auto-selects; shows "Club format requires same-club partners" |

### Format name resolution

The wizard resolves the config to a known format name. This mapping is defined once and shared:

```ts
const FORMAT_PRESETS: { name: string; config: FormatConfig; category: string; description: string }[] = [
  { name: 'Americano',           config: { pairMode: 'random',    matchMode: 'random',    grouping: [] },                           category: 'social',      description: '...' },
  { name: 'Mexicano',            config: { pairMode: 'standings', matchMode: 'standings', grouping: [] },                           category: 'competitive', description: '...' },
  { name: 'Mixed Americano',     config: { pairMode: 'standings', matchMode: 'random',    grouping: [pairsCrossGroup] },            category: 'social',      description: '...' },
  { name: 'Mixed Mexicano',      config: { pairMode: 'standings', matchMode: 'standings', grouping: [pairsCrossGroup] },            category: 'competitive', description: '...' },
  { name: 'Team Americano',      config: { pairMode: 'fixed',     matchMode: 'random',    grouping: [] },                           category: 'team',        description: '...' },
  { name: 'Team Mexicano',       config: { pairMode: 'fixed',     matchMode: 'standings', grouping: [] },                           category: 'team',        description: '...' },
  { name: 'King of the Court',   config: { pairMode: 'standings', matchMode: 'promotion', grouping: [] },                           category: 'social',      description: '...' },
  { name: 'Club Americano',      config: { pairMode: 'fixed',     matchMode: 'fixed',     grouping: [club] },                       category: 'club',        description: '...' },
  { name: 'Club Team Americano', config: { pairMode: 'fixed',     matchMode: 'random',    grouping: [club] },                       category: 'club',        description: '...' },
  { name: 'Club Team Mexicano',  config: { pairMode: 'fixed',     matchMode: 'standings', grouping: [club] },                       category: 'club',        description: '...' },
  { name: 'Club Mexicano',       config: { pairMode: 'standings', matchMode: 'standings', grouping: [club] },                       category: 'club',        description: '...' },
  // ...
];

function resolveFormatName(config: FormatConfig): string | null {
  return FORMAT_PRESETS.find(p => configsMatch(p.config, config))?.name ?? null;
}
```

### Shared component location

```
packages/common/src/components/
  FormatPicker/
    FormatPicker.tsx        — main component, mode toggle
    FormatList.tsx          — curated list view
    FormatWizard.tsx        — step-by-step wizard
    formatPresets.ts        — FORMAT_PRESETS array + resolveFormatName()
    FormatPicker.module.css — styles
    index.ts                — barrel export
```

Both runner (`TournamentConfigForm`) and planner (`OrganizerScreen`) replace their current `<select>` with `<FormatPicker>`. Format-specific sub-fields (group labels, club management, maldiciones, court config) remain in the parent form — `FormatPicker` only handles format selection.

### Interaction between apps

| App | Where used | Notes |
|---|---|---|
| **Runner** | `TournamentConfigForm` | Replaces format `<select>`. Emits `FormatConfig`, parent maps to strategy. |
| **Planner** | `OrganizerScreen` | Replaces format `<select>`. Stores `FormatConfig` in Firebase. |
| **Planner → Runner** | Export flow | Planner stores `FormatConfig` which runner reads directly — no format string translation needed. |

### Migration from current format strings

During migration, existing `TournamentFormat` string values map to `FormatConfig` via the same preset table. A `formatStringToConfig()` helper handles backward compatibility:

```ts
function formatStringToConfig(format: TournamentFormat, config: TournamentConfig): FormatConfig {
  // Maps legacy format strings + sub-options to FormatConfig
  switch (format) {
    case 'americano':       return { pairMode: 'random',    matchMode: 'random',    grouping: [] };
    case 'mexicano':        return { pairMode: 'standings', matchMode: 'standings', grouping: [] };
    case 'mixicano':        return { pairMode: 'standings', matchMode: 'standings', grouping: [pairsCrossGroup] };
    case 'team-americano':  return { pairMode: 'fixed',     matchMode: 'random',    grouping: [] };
    case 'team-mexicano':   return { pairMode: 'fixed',     matchMode: 'standings', grouping: [] };
    case 'king-of-the-court': return { pairMode: 'standings', matchMode: 'promotion', grouping: [] };
    case 'club-americano':
      const mm = config.matchMode === 'slots' ? 'fixed' : config.matchMode ?? 'random';
      return { pairMode: 'fixed', matchMode: mm, grouping: [club] };
  }
}
```

---

## Refactor Assessment

The taxonomy is valuable as a **mental model and UI structure**. It does not need to be mirrored 1:1 in the engine architecture.

### Current codebase stats

| Metric | Value |
|---|---|
| Total strategy code | ~2,200 lines across 8 files |
| Shared utilities (`shared.ts`) | ~440 lines |
| Duplicated code | ~200 lines (9%) |
| Unique-per-strategy code | ~710 lines (32%) |

### Where the complexity lives

Each strategy's bulk is genuinely unique logic that doesn't compose:

| Strategy | Lines | Unique core logic | Composable? |
|---|---|---|---|
| **Americano** | 431 | Exhaustive enumeration of all pairings with time-budget retry (~150 lines of combinatorial optimization) | No — this IS the random pair module |
| **KotC** | 501 | Promotion/relegation state machine + court bonus standings (~180 lines) | No — this IS the promotion match module |
| **Club Americano** | 367 | Round-robin fixture generation + club team allocation (~140 lines) | No — fixture scheduling is specific to club + fixed match mode |
| **Team Americano** | 230 | Random team pairing with opponent imbalance scoring (~80 lines) | Could share with Team Mexicano, but different matching |
| **Team Mexicano** | 283 | Standings-based team ranking + two round-gen modes (~60 lines) | Same — team-specific standings logic |
| **Mexicano** | 168 | Rank grouping: 1st+4th vs 2nd+3rd (~40 lines) | Already simple. Module wrapper adds overhead. |
| **Mixicano** | 229 | Cross-group constraint on pairing (~60 lines on top of Mexicano) | Only place grouping rules genuinely help — but it's just 60 lines |

### What's actually duplicated

~200 lines of shallow boilerplate, extractable as helpers without architectural change:

| Pattern | Where duplicated | Lines saved |
|---|---|---|
| `matchFourPlayers()` — best of 3 pairings for 4 players | Americano, Mexicano, Mixicano, KotC | ~50 |
| `updateMatchStats()` — partner counts + games played | Americano, Mexicano, Mixicano, KotC | ~30 |
| `seedTeamsFromRounds()` — opponent/game tracking for teams | Team Americano, Team Mexicano, Club Americano | ~50 |
| `validateBaseRequirements()` — courts, points, player count | Mixicano, Team Americano, Team Mexicano | ~30 |
| Round/match creation boilerplate | All strategies | ~40 |

### Full engine refactor: cost vs. benefit

| | Composable engine refactor | Extract shared helpers only |
|---|---|---|
| **Lines saved** | ~150 (7%) | ~150 (7%) |
| **New abstraction layers** | Pair module interface, match module interface, grouping rule engine | 4-5 utility functions in `shared.ts` |
| **Risk** | High — rewriting working scheduling logic, escape hatches needed for Americano/KotC | Low — additive, no existing code changes |
| **New format effort** | Compose from modules | Thin wrapper reusing existing strategy logic |
| **Testing surface** | Grows (module interactions, grouping composition) | Unchanged |

### Recommendation

**Refactor the surface, not the engine.**

Do (low risk, real benefit):
- `FormatPicker` shared component + `FORMAT_PRESETS` table (see UI section above)
- Extract 4-5 shared helpers into `shared.ts`
- Split `club-americano` into named presets in the UI (the strategy code already handles all 3 match modes)
- Add Mixed Americano as a thin wrapper (Mixicano pairing + random match mode)

Don't do (high risk, low benefit):
- Composable pair/match module interfaces
- Grouping rule engine
- Rewriting strategies as module combinations

The `FormatPicker` gives users the composable mental model. The strategies stay as battle-tested ~200-500 line files with clear ownership. New formats are added as thin wrappers that reuse existing logic without a formal module system.

---

## Out of Scope

These padel tournament formats exist in the wild but use a fundamentally different paradigm (elimination brackets or long-running leagues) rather than iterative rounds with cumulative points. They do not fit the pair mode × match mode × grouping rules model.

| Format | Description | Why out of scope |
|---|---|---|
| **Single Elimination (Knockout)** | Bracket tree — lose once, you're out | No cumulative points, no round rotation. Binary win/lose progression. |
| **Double Elimination** | Same bracket tree but with losers bracket — need 2 losses to be eliminated | Same — bracket-based, not round-based. |
| **Pool Play + Knockout** | Round-robin groups → top teams advance to elimination bracket | Two-phase hybrid. The pool phase could use our model, but the knockout phase cannot. |
| **Box League / Ladder** | Ongoing league over weeks/months with challenge-based matchups | Long-running, not a single-session tournament. Different scheduling paradigm entirely. |
| **Beat the Box** | Players in skill "boxes" (4-16 per box), move up/down based on results | Close to KotC promotion but with variable group sizes per box. Could potentially extend `matchMode: 'promotion'` in the future. |
