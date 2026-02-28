# Landing Page Improvements

Inspiration: [padelmix.app](https://padelmix.app) structure — hero, features, testimonials, CTA.

## Strategy: Landing + SEO Pages

Keep the landing page **clean and focused** — hero, key value props, CTAs.
Move detailed content (format guides, awards list, maldiciones rules) to **separate static SEO pages** that rank for search terms and link back to the app.

```
/               ← Landing (clean marketing page)
/play           ← Runner app
/plan           ← Planner app
/formats        ← SEO: all formats overview
/americano      ← SEO: Americano guide
/mexicano       ← SEO: Mexicano guide
/awards         ← SEO: full awards list + ceremony explanation
/maldiciones    ← SEO: curse mode guide + card catalog
```

---

## Current Landing

```
[skin picker]
[padel ball logo]
[title: "Tournament Manager"]
[subtitle: "Organize and run tournaments at the court"]
[card: Planner →]
[card: Runner →]
[footer: free & open source · support · feedback · personalize]
```

---

## Proposed Landing

### Section 1 — Hero

Bigger headline, value-driven subtitle, two CTA buttons, phone mockups.

```
"Run Fair Tournaments in Minutes"
"Free, no signup, works in your browser.
 Score matches, track standings, celebrate winners."

[Start Tournament →]  [Plan a Tournament →]

    [phone: scoring]  [phone: standings]  [phone: awards]
```

**Copy alternatives:**
- "Your Tournament, Sorted in Seconds"
- "Fair Schedules. Live Scores. Epic Awards."

**Assets available:** `packages/runner/public/screenshots/mobile-scoring.png`, `mobile-standings.png`. Need: ceremony screenshot, setup screenshot.

---

### Section 2 — Differentiators (the "why us" section)

Three standout features that **no competitor has**. Each gets a visual card with screenshot or illustration.

#### 2a. Awards Ceremony

> **41 Awards. One Unforgettable Ceremony.**
> Every tournament ends with a tap-to-reveal awards show. Giant Slayer, Comeback King, Clutch Player, Iron Wall — the app picks the best stories from your match data and turns them into legendary, rare, and common awards. It's the part everyone talks about after.

- Visual: screenshot of ceremony card reveal
- Link to → `/awards` (SEO page with full list)

#### 2b. Maldiciones del Padel

> **Curse Cards That Change the Game.**
> An optional party mode that adds strategy and chaos. Each team gets curse cards to play before matches — force opponents to play backhand-only, ban communication, or make them high-five after every point. Three chaos levels from mild to mayhem. Shields included.

- Visual: screenshot of curse card picker or a few card illustrations
- Link to → `/maldiciones` (SEO page with all 17 cards + rules)

#### 2c. Fair Schedule Algorithm

> **Mathematically Fair, Not Random.**
> The scheduling engine optimizes 5 dimensions simultaneously — partner variety, opponent balance, rest distribution, court allocation, and player coverage. No more "why do I always play with the same person?"

- Visual: before/after comparison or a simple fairness diagram
- No dedicated SEO page needed (technical detail)

```
"What makes us different"

[awards screenshot]       [curse cards visual]      [fairness diagram]
 41 Awards                 Curse Cards               Fair Schedules
 Tap-to-reveal ceremony    Optional party mode       Algorithm-optimized
 with legendary moments    with 17 unique curses     across 5 dimensions
 [See all awards →]        [Explore curses →]
```

---

### Section 3 — Features Grid (compact)

Quick-scan of practical features. 6 items, 2x3 on desktop, stacked on mobile.

| Icon | Feature | One-liner |
|------|---------|-----------|
| 🎾 | 8 Formats | Americano, Mexicano, King of the Court, and 5 more |
| ⚡ | Real-Time Scoring | Tap to score. Standings update live |
| 📶 | Works Offline | PWA — score at the court, no WiFi needed |
| 🚀 | Zero Friction | No signup, no install. Open a link and play |
| 🌍 | 7 Languages | EN, ES, FR, IT, PT, SR, SV |
| 🎨 | 16 Themes | Customize the look — light, dark, and creative skins |

Each format name links to its SEO page (e.g., "Americano" → `/americano`).

---

### Section 4 — How It Works

Three steps. Clean, visual.

```
[1] Set Up               [2] Play & Score          [3] Celebrate
Add players, pick a       Tap scores as matches     Live leaderboard +
format, choose courts.    happen. Rounds advance    awards ceremony at
30 seconds.               automatically.            the end.
```

Step 3 emphasizes the awards ceremony as the payoff — this is the differentiator.

---

### Section 5 — Social Proof (future-ready)

Start with usage stats (if we track them in Firebase), expand to testimonials.

**Phase 1 (now):**
- "Used by organizers in X countries"
- "Y tournaments run" (if trackable)

**Phase 2 (later):**
- Real testimonials collected via feedback form
- Quote cards with name + context

```
"Trusted by tournament organizers"

[stat: tournaments run]  [stat: countries]  [stat: formats supported]
```

---

### Section 6 — Bottom CTA

Repeat the call to action before footer.

```
"Ready for your next tournament?"
"No signup. No install. Just play."

[Start Tournament →]  [Plan a Tournament →]
```

---

### Section 7 — Footer

Keep: support, feedback, personalize, version.

Add:
- Links to SEO pages: Formats, Awards, Maldiciones
- Language selector (more prominent)

Do NOT add: GitHub link (maybe future).

---

## SEO Static Pages

Each page is a standalone content page optimized for search. Server-rendered or pre-built HTML for crawlability. Can live in the landing package as separate routes or be built as static HTML pages in the dist.

### `/formats` — Tournament Formats Overview

**Target keywords:** padel tournament formats, americano vs mexicano, padel tournament types

**Content:**
- Overview of all 8 formats with descriptions
- Comparison table (partner selection, competitiveness, best for)
- Links to individual format pages
- CTA: "Try any format free →"

### `/americano` — Americano Padel Guide

**Target keywords:** americano padel, americano tournament, how to run americano padel

**Content:**
- What is Americano format?
- How many players/courts needed
- Step-by-step guide
- Scoring explained
- Tips for organizers
- CTA: "Run an Americano tournament now →"

### `/mexicano` — Mexicano Padel Guide

**Target keywords:** mexicano padel, mexicano tournament format, padel mexicano rules

**Content:**
- What is Mexicano format?
- How dynamic matchups work
- Americano vs Mexicano comparison
- When to use which
- CTA

### `/awards` — Awards & Ceremony

**Target keywords:** padel tournament awards, tournament awards ideas, americano padel prizes

**Content:**
- The ceremony concept (tap-to-reveal, 3 rarity tiers)
- Full list of all 41 awards with emoji, name, description, tier
  - 21 individual awards (Undefeated, Giant Slayer, Comeback King, Clutch Player, Iron Wall...)
  - 7 duo awards (Best Duo, Hot Streak Duo, Social Butterfly...)
  - 3 club awards (Club Champion, Club MVP, Club Solidarity...)
  - 8 maldiciones awards (El Brujo, El Superviviente, Karma...)
  - 2 special (Lucky One random draw, Competitive Game closest match)
- How awards are selected (fair distribution, per-player caps)
- CTA: "See who wins what — start a tournament →"

### `/maldiciones` — Maldiciones del Padel

**Target keywords:** padel party game, padel curse cards, maldiciones padel, fun padel games

**Content:**
- What is Maldiciones del Padel?
- 3 chaos levels (Lite / Medium / Hardcore)
- Full card catalog with tiers:
  - 6 Green cards (Los Mudos, El Espejo, Cámara Lenta, El Pegajoso, Memoria de Pez, Choca Esos Cinco)
  - 6 Yellow cards (Mano Muerta, Gigante y Enano, El Fantasma, Sin Bandeja, Solo de Ida, La Diana)
  - 5 Red cards (El Solo, Al Revés, La Ruleta, Mini Pala, Relámpago)
- Shield mechanic
- How to enable it in the app
- Maldiciones-specific awards
- CTA: "Add curse cards to your next tournament →"

---

## Implementation Notes

### Assets needed
- 3-4 app screenshots: scoring, standings, ceremony, curse picker
- Phone frame CSS wrapper (or lightweight SVG frame)
- Simple icons for features grid (emoji is fine for v1)

### i18n
- New translation keys for all landing sections
- SEO pages: start English-only, add translations later
- All 7 language files need landing section updates

### SEO technical
- Each SEO page needs: unique `<title>`, `<meta description>`, `<h1>`, OG tags
- Schema.org markup: `SoftwareApplication` on landing, `Article` on guide pages
- Canonical URLs on each page
- Internal linking between pages (format pages link to each other, all link back to landing)
- Sitemap.xml including all pages

### Performance
- Landing: single page, lazy-load images below fold
- SEO pages: minimal JS, mostly static HTML/CSS for fast load + crawlability
- Screenshots: WebP format, compressed, with appropriate `alt` text

### Mobile-first
- All sections stack vertically on mobile
- Feature grid: 1 column mobile, 2-3 columns desktop
- Phone mockups: single centered on mobile, side-by-side on desktop
- SEO pages: clean readable article layout

### What NOT to do
- No app store badges (we're web-first)
- No pricing section (it's free)
- No login/signup CTA (there is none)
- No GitHub link (for now)
- Don't overload the landing — keep it scannable, push detail to SEO pages
