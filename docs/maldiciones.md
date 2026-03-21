# Maldiciones del Padel

Source: `packages/runner/src/components/maldiciones/`, `packages/runner/src/utils/maldiciones.ts`, `packages/runner/src/data/curseCards.ts`

## Overview

Maldiciones del Padel is an optional game mode that adds curse cards to tournament matches. Teams receive a hand of cards at tournament start and can cast one curse per match to disrupt their opponents before scoring. The mode adds a strategic layer on top of the standard tournament format.

When enabled, the mode is branded as "🎭 Maldiciones del Padel" across shared images, nomination cards, and exported text.

## Configuration

Enabled via checkbox in tournament setup. Requires selecting a **chaos level** that determines which card tiers are available.

| Setting | Type | Options |
|---------|------|---------|
| Enabled | `boolean` | Toggle on/off |
| Chaos Level | `ChaosLevel` | `lite`, `medium`, `hardcore` |

```typescript
// packages/common/src/types/tournament.ts
maldiciones?: { enabled: boolean; chaosLevel: ChaosLevel }
```

### Chaos Levels

| Level | Cards Available |
|-------|----------------|
| Lite | Green only (6 cards) |
| Medium | Green + Yellow (12 cards) |
| Hardcore | All cards (18 cards) |

## Card Dealing

Triggered once at tournament start (`GENERATE_SCHEDULE` action) via `dealMaldicionesHands()`.

- **Cards per team**: `Math.max(1, Math.floor(plannedRounds / 3))`
  - 3 rounds → 1 card, 6 rounds → 2 cards, 9 rounds → 3 cards
- Cards are randomly drawn from the chaos-level-eligible pool
- Each team also receives **one shield** (`hasShield: true`)
- Cards are not replenished — once dealt, that's the full hand

Storage: `tournament.maldicionesHands: { [teamId]: { cardIds: string[]; hasShield: boolean } }`

## Gameplay Flow

```
Before match scoring:
  1. Team with cards clicks ☠️ button → CurseCardPicker opens
  2. Select a card from hand
  3. Pick one opponent player as target
  4. Curse recorded on match, card removed from hand

Opponent response:
  - 🛡️ Block: USE_ESCUDO → curse marked shielded, shield consumed
  - 👎 Veto: VETO_MALDICION → curse removed, card returned to caster
  - Accept: play the match with curse active

After scoring:
  - Curse recorded permanently on match for history + awards
```

**Constraints:**
- Max 1 curse per match
- Can only cast before match is scored
- Cannot cast if hand is empty

## Curse Cards

Card names are kept in Spanish as brand names. Descriptions and details are translated via i18n.

### Green Tier — Basic Disruptions

| Emoji | Name | Effect |
|-------|------|--------|
| 🤐 | Los Mudos | Target team cannot communicate verbally. Hand signals only! |
| 🪞 | El Espejo | Target player must swap positions with their partner for the whole match |
| 🐢 | Camara Lenta | Target player cannot hit smashes or overheads |
| 🦠 | El Pegajoso | Target player must stay on their half — no crossing to partner's side |
| 🐟 | Memoria de Pez | Target team must say the score before every serve. Forgetting = point penalty! |
| 🤝 | Choca Esos Cinco | Target team must high-five after every single point, won or lost |

### Yellow Tier — Intermediate Challenges

| Emoji | Name | Effect |
|-------|------|--------|
| ✋ | Mano Muerta | Target player can only hit backhands. No forehands! |
| 👨‍🤝‍👨 | Gigante y Enano | Target team locked: one at net, one at back. No switching! |
| 👻 | El Fantasma | Target player cannot volley at the net. Must let ball bounce first |
| 🚫 | Sin Bandeja | Target player cannot hit bandeja or vibora. Only flat shots or lobs! |
| ↩️ | Solo de Ida | Target player must serve underhand for the entire match |
| 🎯 | La Diana | Target team must alternate shots — same player cannot hit two consecutive balls |

### Red Tier — Extreme Challenges

| Emoji | Name | Effect |
|-------|------|--------|
| 🧑 | El Solo | Target player's partner sits out the first 3 points. 1v2 to start! |
| 🔄 | Al Reves | Target player must play with their non-dominant hand |
| 🎡 | La Ruleta | Target team must rotate positions (clockwise) every 3 points |
| 🎾 | Mini Pala | Target player must grip the racket by the head (short grip) |
| ⚡ | Relampago | Casting team gives opponents a 2-point head start. High risk intimidation! |
| 🎲 | Doble o Nada | Every point scored against the cursed team counts as 2 points |

## Shield Mechanic

- Each team starts with exactly **one** shield
- Blocks a curse when used (curse is marked as `shielded: true`)
- Both the shield and the curse card are consumed
- One-time use per team for the entire tournament
- Shielded curses still appear in history with 🛡️ prefix and strikethrough

## Awards

Computed at tournament end by `computeMaldicionesAwards()`. Stats are tracked per ad-hoc pair (sorted player IDs) for rotating-partner formats, or per team ID for fixed-partner formats.

| ID | Emoji | Title | Tier | Criteria |
|----|-------|-------|------|----------|
| `el-brujo` | 🧙 | El Brujo | rare | Most effective curses (cast and opponent lost). Min 2 |
| `el-superviviente` | 💪 | El Superviviente | rare | Most wins while cursed. Min 2 |
| `escudo-de-oro` | 🛡️ | Escudo de Oro | common | Most successful shield blocks. Min 1 |
| `el-maldito` | ☠️ | El Maldito | common | Most curses received. Min 2 |
| `el-inmune` | 🦠 | El Inmune | legendary | Won 3+ cursed games in a row |
| `el-resistente` | 🦾 | El Resistente | rare | Best win rate while cursed. Min 2 non-shielded cursed games |
| `karma` | 🔄 | Karma | common | Most backfired curses (cast but lost). Min 2 |
| `el-intocable` | 👼 | El Intocable | rare | Never cursed in entire tournament. Min 3 games, exactly 1 team qualifies |

All maldiciones awards are tagged with `modeTitle: '🎭 Maldiciones del Padel'` and appear on nomination cards and shared images.

## Visibility

Curse data appears in:

| Location | What's shown |
|----------|-------------|
| Active match (MatchCard) | ☠️ on cursed player names, curse label with card details |
| Scored match (MatchCard) | `{emoji} {cardName}` below score, or `🛡️ {emoji}` if shielded |
| Completed round results (PlayScreen) | Curse card name below each match score |
| Log screen | Curse history on scored matches + 🎭 info button with rules modal |
| Shared text export | Curse appended to match lines |
| Shared images | "🎭 Maldiciones del Padel" label on standings + nomination images |

## Key Files

| Purpose | Path |
|---------|------|
| Types | `packages/common/src/types/maldiciones.ts` |
| Card data | `packages/runner/src/data/curseCards.ts` |
| Hand dealing | `packages/runner/src/utils/maldiciones.ts` |
| Awards | `packages/runner/src/hooks/awards/maldiciones.ts` |
| Card picker UI | `packages/runner/src/components/maldiciones/CurseCardPicker.tsx` |
| Rules modal | `packages/runner/src/components/maldiciones/MaldicionesRulesModal.tsx` |
| Curse label | `packages/runner/src/components/maldiciones/CurseLabel.tsx` |
| State reducer | `packages/runner/src/state/tournamentReducer.ts` (CAST_MALDICION, USE_ESCUDO, VETO_MALDICION) |
| Config UI | `packages/runner/src/components/setup/TournamentConfigForm.tsx` |
