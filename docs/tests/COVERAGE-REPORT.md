# Test Coverage Report

> Generated 2026-03-15. Maps Gherkin scenarios to existing e2e (Playwright) and unit (Vitest) tests.

## Summary

| Feature Doc | Total Scenarios | Covered by e2e | Covered by unit | Not covered |
|-------------|:-:|:-:|:-:|:-:|
| organizer-screen | 30 | 4 | 10 | 16 |
| home-screen | 33 | 5 | 0 | 28 |
| join-screen | 35 | 5 | 10 | 20 |
| planner-state | 22 | 2 | 7 | 13 |
| events | 32 | 0 | 5 | 27 |
| runner-home | 16 | 6 | 0 | 10 |
| runner-setup | 24 | 10 | 3 | 11 |
| runner-scoring | 30 | 12 | 8 | 10 |
| runner-settings | 24 | 8 | 0 | 16 |
| runner-maldiciones | 26 | 0 | 0 | 26 |
| **TOTAL** | **272** | **52** | **43** | **177** |

**Overall coverage: ~35% (95 of 272 scenarios have at least one test)**

---

## Existing Test Files

### E2E (Playwright) — 23 spec files

| File | Tests | Covers |
|------|:-----:|--------|
| `e2e/home-screen.spec` | 5 | Runner home: create, import, resume, reload |
| `e2e/setup-screen.spec` | 7 | Runner setup: add/remove players, courts, formats, rounds |
| `e2e/team-pairing.spec` | 5 | Team cards, shuffle, swap, back, start |
| `e2e/tournament-flow.spec` | 5 | Full americano lifecycle, validation, persistence |
| `e2e/mexicano-flow.spec` | 3 | Mexicano lifecycle, dynamic round gen, standings |
| `e2e/mixicano-flow.spec` | 7 | Groups, lifecycle, dynamic rounds, persistence |
| `e2e/team-americano-flow.spec` | 4 | Team americano lifecycle, custom names, persistence |
| `e2e/team-mexicano-flow.spec` | 5 | Team mexicano lifecycle, dynamic rounds, persistence |
| `e2e/king-of-the-court-flow.spec` | 7 | KoTC min players, auto-court, bonus labels, lifecycle |
| `e2e/play-screen.spec` | 8 | Standings modal, score picker, progress, add round, finish, clear |
| `e2e/log-screen.spec` | 5 | Round cards, stats modal, export, add round, finish |
| `e2e/settings.spec` | 7 | Rename, add player, toggle availability, edit points, delete |
| `e2e/settings-advanced.spec` | 5 | Rounds, court rename, add court, export |
| `e2e/completed.spec` | 5 | Standings, share, round results, tabs |
| `e2e/footer.spec` | 6 | Footer links, personalize modal, language switch |
| `e2e/edge-cases.spec` | 16 | localStorage corruption, double-click, empty states, offline, hash nav |
| `e2e/rank-results.spec` | 9 | Club-ranked completion cards, carousel |
| `e2e/planner/create-tournament.spec` | 4 | Create, add players, configure format |
| `e2e/planner/join-by-code.spec` | 3 | Join by code, deep link, invalid code |
| `e2e/planner/pair-format.spec` | 3 | Needs-partner section, pair vs non-pair headers |
| `e2e/planner/player-registration.spec` | 3 | Register, cancel/re-confirm, registered list |
| `e2e/planner/telegram.spec` | 3 | Auto-fill name, startapp deep link, pre-fill registration |
| `e2e/planner/club-ranked-captain.spec` | 4 | Captain toggle, sectioned list, approve flow, disable captain |

### Unit (Vitest) — 20 test files, ~380 cases

| File | Tests | Covers |
|------|:-----:|--------|
| `playerStatus.test` | 60+ | FIFO, club, club-ranked, captain mode, solo/paired |
| `validateLaunch.test` | 24+ | Min players, even count, clubs, courts, partners |
| `partnerLogic.test` | 50+ | Set/remove/switch partner, constraints, timestamps |
| `exportToRunner.test` | 18 | Planner→Runner mapping, IDs, teams, aliases, config |
| `plannerExport.test` | 25+ | Export, import, round-trip, validation, cross-format |
| `eventStandings.test` | 20+ | Weighted scores, tiebreakers, clubs, multi-tournament |
| `tournamentBreakdown.test` | 40+ | Urgency levels, club/ranked/group breakdowns |
| `useGoogleAuth.test` | 19 | Link, claim sweep, redirect, credential collision |
| `useTelegramSync.test` | 7 | Device switch, claim sweep, skip conditions |
| `usePlayers.test` | 3 | Registration paths (web, telegram, duplicate) |
| `useStandings.test` | 8 | Null safety, ranking, sorting, point diff |
| `useNominations.test` | 10 | Awards, podium, lucky draw, caching |
| `usePlayerStats.test` | 12 | W-L-D, partners, opponents, courts, sit-outs |
| `useShareText.test` | 18+ | Round results, standings, messenger, summary |
| `useDistributionStats.test` | 11 | Court balance, sit-out balance, opponent spread |
| `ScoreInput.test` | 7 | Score display, picker, complement, clear |
| `MatchCard.test` | 8 | Player names, court, KoTC bonus, read-only |
| `StandingsTable.test` | 8 | Headers, rank colors, diff formatting, groups |
| `PlayerInput.test` | 6 | Add, bulk paste (newline, comma), empty validation |
| `PlayScreen.test` | 40+ | Null states, scoring dispatch, round nav, completion, ceremony |

---

## Per-Feature Coverage Detail

### organizer-screen.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Create tournament with default settings | create-tournament | — | COVERED |
| Switch Quick Play ↔ Share modes | — | — | GAP |
| Add players via bulk add | create-tournament | — | COVERED |
| Change tournament format | create-tournament | — | COVERED |
| FIFO determines playing vs reserve | — | playerStatus | COVERED |
| Cancelling player promotes reserve | — | playerStatus | COVERED |
| Mixicano 50/50 group split | — | — | GAP |
| Club-ranked bucket distribution | — | playerStatus | COVERED |
| Block launch <4 players | — | validateLaunch | COVERED |
| Block launch odd team count | — | validateLaunch | COVERED |
| Block launch unassigned clubs | — | validateLaunch | COVERED |
| Block launch too many courts | — | validateLaunch | COVERED |
| Warn unpaired players | — | validateLaunch | COVERED |
| Successful launch | — | validateLaunch | PARTIAL (unit only, no e2e) |
| Delegate start to player | — | — | GAP |
| Warn different user started | — | — | GAP |
| Format switch clears groups | — | — | GAP |
| Format switch clears clubs | — | — | GAP |
| Copy share link | — | — | GAP |
| Share code resolves | join-by-code | — | COVERED |
| Duration warning | — | — | GAP |
| Sit-out fairness warning | — | — | GAP |
| Export as JSON | — | plannerExport | COVERED |
| Restore from backup | — | — | GAP |
| Launch overwrites Runner | — | — | GAP |
| Refresh preserves state | — | — | GAP |
| Firebase write failure | — | — | GAP |
| Captain approves player | club-ranked-captain | playerStatus | COVERED |
| Captain rejects player | — | — | GAP |
| Duplicate name warning | — | — | GAP |

### home-screen.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Anonymous user lands on home | create-tournament | — | COVERED |
| Set display name | — | — | GAP |
| Link Google account | — | useGoogleAuth | COVERED |
| Google account already linked | — | useGoogleAuth | COVERED |
| Redirect flow in Telegram WebView | — | useGoogleAuth | PARTIAL |
| Tab closed during redirect | — | — | GAP |
| Join by valid code | join-by-code | — | COVERED |
| Join event by code | — | — | GAP |
| Invalid code shows error | join-by-code | — | COVERED |
| Code is case-insensitive | — | — | GAP |
| Code must be 6 chars | — | — | GAP |
| Create requires name | — | — | GAP |
| Create tournament with name | create-tournament | — | COVERED |
| Random name generation | — | — | GAP |
| Organized tournaments in list | — | — | GAP |
| Registered tournaments in list | player-registration | — | COVERED |
| Completed badge | — | — | GAP |
| Expired badge | — | — | GAP |
| Completed > Expired priority | — | — | GAP |
| Swipe to delete | — | — | GAP |
| Cannot delete others' tournament | — | — | GAP |
| Import from clipboard | — | — | GAP |
| Import from file | — | — | GAP |
| Import invalid JSON | — | — | GAP |
| Import large file | — | — | GAP |
| Change skin persists | — | — | GAP |
| Toggle Player/Organizer modes | — | — | GAP |
| URL param sets mode | — | — | GAP |
| Profile name persists | — | — | GAP |
| Name save fails silently | — | — | GAP |
| Deleted tournament cleaned up | — | — | GAP |
| ?code= deep link | join-by-code | — | COVERED |
| ?action=create deep link | — | — | GAP |

### join-screen.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Register with a name | player-registration | — | COVERED |
| Name auto-filled from Google | — | — | GAP |
| Name auto-filled from Telegram | telegram | — | COVERED |
| Edit registered name | — | — | GAP |
| Cancel participation | player-registration | — | COVERED |
| Re-confirm after cancelling | player-registration | — | COVERED |
| Cancelling promotes reserve | — | playerStatus | COVERED |
| Link to existing player | — | partnerLogic | COVERED |
| Create and invite new partner | — | partnerLogic | COVERED |
| Remove partner link | — | partnerLogic | COVERED |
| Auto-added partner cancelled on unlink | — | partnerLogic | PARTIAL |
| Mixicano opposite group | — | partnerLogic | COVERED |
| Club format same club | — | partnerLogic | COVERED |
| Changing club breaks link | — | partnerLogic | PARTIAL (wouldBreakPartnerLink) |
| Changing rank breaks link | — | partnerLogic | PARTIAL |
| Select group | — | — | GAP |
| Select club | — | — | GAP |
| Select rank | — | — | GAP |
| Duplicate name warning | — | — | GAP |
| Register with duplicate | — | — | GAP |
| Captain: player joins as registered | — | playerStatus | COVERED |
| Captain approves player | club-ranked-captain | playerStatus | COVERED |
| Captain rejects player | — | — | GAP |
| Captain filters club | — | — | GAP |
| Captain assigns rank | — | — | GAP |
| Reserve position updates | — | — | GAP |
| Reserve promoted | — | playerStatus | COVERED |
| Organizer launches from join | — | — | GAP |
| Delegate launches | — | — | GAP |
| Non-organizer no Start button | — | — | GAP |
| Download calendar .ics | — | — | GAP |
| Registration persists after refresh | — | — | GAP |
| Partner persists after refresh | — | — | GAP |
| Rapid Enter no duplicates | — | — | GAP |
| Auto-added partner never claims | — | — | GAP |

### planner-state.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Anonymous sign-in on first visit | create-tournament | — | COVERED |
| Auth failure shows error | — | — | GAP |
| UID persists across refresh | — | — | GAP |
| ?code= routes to join | join-by-code | — | COVERED |
| ?event= routes to event join | — | — | GAP |
| ?action=create auto-creates | — | — | GAP |
| ?lang= sets locale | — | — | GAP |
| Invalid ?code= falls back | — | — | GAP |
| Registration at 3 indexes | — | usePlayers | COVERED |
| Duplicate UID prevented | — | usePlayers | COVERED |
| Duplicate Telegram prevented | — | usePlayers | COVERED |
| Confirming resets timestamp | — | — | GAP |
| Unconfirm severs partner | — | — | GAP |
| Unconfirm auto-cancels partner | — | — | GAP |
| Telegram cross-device sync | — | useTelegramSync | COVERED |
| Sync crash partial state | — | — | GAP |
| Auto-claim orphan registration | — | — | GAP |
| Race: orphan claim vs register | — | — | GAP |
| Partner computed from stale state | — | — | GAP |
| Chat room sync on name change | — | — | GAP |
| Stale index cleaned up | — | — | GAP |
| Real-time data updates | — | — | GAP |

### events.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Create event with name and date | — | — | GAP |
| Event code is immutable | — | — | GAP |
| Cannot create without name | — | — | GAP |
| Past date allowed | — | — | GAP |
| Link own tournament | — | — | GAP |
| Link tournament by code | — | — | GAP |
| Cannot link same twice | — | — | GAP |
| Unlink tournament | — | — | GAP |
| Default weight 1.0 | — | — | GAP |
| Change tournament weight | — | eventStandings | COVERED |
| Weight zero eliminates | — | — | GAP |
| Negative weight distorts | — | — | GAP |
| All-draft = draft status | — | — | GAP |
| One started = active | — | — | GAP |
| All completed = completed | — | — | GAP |
| Past-date still shows draft | — | — | GAP |
| Standings aggregate scores | — | eventStandings | COVERED |
| Weighted standings | — | eventStandings | COVERED |
| Tiebreaker resolves equal | — | eventStandings | COVERED |
| Sit-out compensation | — | — | GAP |
| Club standings by name | — | eventStandings | COVERED |
| Copy share link | — | — | GAP |
| Copy event code | — | — | GAP |
| Share hidden for completed | — | — | GAP |
| Export to clipboard | — | — | GAP |
| Export as file | — | — | GAP |
| Export fails silently | — | — | GAP |
| Delete event | — | — | GAP |
| Only owner can delete | — | — | GAP |
| Player sees tournaments | — | — | GAP |
| Join button on unfilled | — | — | GAP |
| Linked tournament deleted | — | — | GAP |

### runner-home.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Create with selected format | home-screen | — | COVERED |
| Create with random name | — | — | GAP |
| All 14 formats selectable | — | — | GAP |
| Resume saved tournament | home-screen + tournament-flow | — | COVERED |
| Resume in-progress | home-screen | — | COVERED |
| No resume when empty | edge-cases | — | COVERED |
| Import valid JSON clipboard | home-screen | — | COVERED |
| Import valid JSON file | — | — | GAP |
| Import invalid JSON | home-screen | — | COVERED |
| Import missing fields | — | — | GAP |
| Planner export auto-loads | — | exportToRunner | PARTIAL |
| Creating overwrites existing | — | — | GAP |
| Importing overwrites existing | — | — | GAP |
| Saved to localStorage | tournament-flow | — | COVERED |
| Corrupt localStorage handled | edge-cases (4 variants) | — | COVERED |
| iOS install banner | — | — | GAP |

### runner-setup.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Add single player | tournament-flow | PlayerInput | COVERED |
| Add multiple players | tournament-flow | — | COVERED |
| Bulk import players | — | PlayerInput (bulk paste) | COVERED |
| Edit player name | — | PlayerList | COVERED |
| Remove player | setup-screen | PlayerList | COVERED |
| Duplicate names suffixed | — | — | GAP |
| Bulk import with duplicates | — | — | GAP |
| Set courts count | setup-screen | — | COVERED |
| Set scoring mode points | — | — | GAP |
| Set scoring mode timed | — | — | GAP |
| Set round count | setup-screen | — | COVERED |
| Cannot proceed <4 players | tournament-flow + edge-cases | — | COVERED |
| Courts cannot exceed /4 | — | — | GAP |
| Team format even count | — | — | GAP |
| Club format all assigned | — | — | GAP |
| Mixicano requires groups | mixicano-flow | — | COVERED |
| Scoring values positive | — | — | GAP |
| Sit-out fairness warning | — | — | GAP |
| Duration estimate | — | — | GAP |
| Assign player to group | mixicano-flow | PlayerList | COVERED |
| Assign player to club | — | — | GAP |
| Auto-generate teams | team-pairing | — | COVERED |
| Shuffle teams | team-pairing | — | COVERED |
| Swap players | team-pairing | — | COVERED |
| Rename team | — | — | GAP |
| Shuffle resets custom names | — | — | GAP |
| Mixicano cross-group pairs | — | — | GAP |
| Start generates schedule | tournament-flow | — | COVERED |
| Team format → pairing first | team-pairing | — | COVERED |
| Setup persists after refresh | tournament-flow | — | COVERED |
| Team pairing persists | — | — | GAP |

### runner-scoring.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Enter match score | play-screen + tournament-flow | ScoreInput + PlayScreen | COVERED |
| Score all matches in round | tournament-flow | PlayScreen | COVERED |
| Edit previously scored match | — | — | GAP |
| Clear match score | play-screen | ScoreInput + PlayScreen | COVERED |
| Reject invalid score | — | ScoreInput | PARTIAL |
| Accept valid games score | — | — | GAP |
| Accept valid sets score | — | — | GAP |
| Standings update after scoring | mexicano-flow + team-americano-flow | useStandings | COVERED |
| Tiebreaker by point diff | — | useStandings | COVERED |
| Tiebreaker by matches won | — | — | GAP |
| Alphabetical tiebreaker | — | — | GAP |
| Club standings aggregate | — | — | GAP |
| Sit-out gets average points | — | — | GAP |
| Partially scored round → sit-outs | — | — | GAP |
| Next round auto-generates (dynamic) | mexicano-flow + mixicano-flow + king-of-the-court-flow | — | COVERED |
| Partial scoring no trigger | — | — | GAP |
| KoTC winners stay top court | — | — | GAP |
| All rounds pre-generated (static) | tournament-flow | — | COVERED |
| Navigate rounds via carousel | — | — | GAP |
| Complete fully scored tournament | tournament-flow + play-screen | PlayScreen | COVERED |
| Complete with unscored matches | log-screen | — | COVERED |
| Complete with unscored rounds | — | — | GAP |
| Ceremony premature | — | — | GAP |
| Podium awards at completion | — | useNominations | COVERED |
| Custom awards | — | useNominations | COVERED |
| Lucky draw | — | useNominations | COVERED |
| Edit past score (dynamic) | — | — | GAP |
| Share standings image | completed | — | COVERED |
| Share text | completed | useShareText | COVERED |
| Scores persist after refresh | tournament-flow + edge-cases | — | COVERED |

### runner-settings.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Add court during tournament | settings-advanced | — | COVERED |
| Cannot add court beyond limit | — | — | GAP |
| Rename court | settings-advanced | — | COVERED |
| Disable court | — | — | GAP |
| Re-enable court | — | — | GAP |
| Add player mid-tournament | settings | — | COVERED |
| Mark player unavailable | settings | — | COVERED |
| Re-enable player | — | — | GAP |
| Replace player | — | — | GAP |
| Replace player mid-round | — | — | GAP |
| Add more rounds | play-screen + log-screen | — | COVERED |
| Remove future rounds | — | — | GAP |
| Cannot remove scored rounds | — | — | GAP |
| Regenerate future rounds | — | — | GAP |
| Export to clipboard | settings-advanced + log-screen | — | COVERED |
| Export as file | — | — | GAP |
| Import mid-session | — | — | GAP |
| Export incomplete | — | — | GAP |
| Delete with confirmation | settings | — | COVERED |
| Cancel delete | — | — | GAP |
| Delete without export | — | — | GAP |
| Enable maldiciones | — | — | GAP |
| Disable maldiciones | — | — | GAP |
| Settings persist after refresh | — | — | GAP |

### runner-maldiciones.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Cards dealt — lite | — | — | GAP |
| Cards dealt — medium | — | — | GAP |
| Cards dealt — hardcore | — | — | GAP |
| Card hands unique | — | — | GAP |
| Cast curse on opposing player | — | — | GAP |
| Cannot curse teammate | — | — | GAP |
| One curse per match | — | — | GAP |
| Cast before scoring | — | — | GAP |
| Block with shield | — | — | GAP |
| No shields remaining | — | — | GAP |
| Shield count finite | — | — | GAP |
| Veto before scoring | — | — | GAP |
| Cannot veto after scored | — | — | GAP |
| Veto timing race | — | — | GAP |
| Dynamic formats + cards | — | — | GAP |
| Fixed-partner cards | — | — | GAP |
| Replaced player's cards | — | — | GAP |
| Cards after unavailable | — | — | GAP |
| Disable after dealing | — | — | GAP |
| Re-enable after disable | — | — | GAP |
| Chaos level change no effect | — | — | GAP |
| Awards at ceremony | — | — | GAP |
| Awards with minimal activity | — | — | GAP |
| No awards when off | — | — | GAP |
| Card hands persist | — | — | GAP |
| Cast curse persists | — | — | GAP |

---

## Top Coverage Gaps (by priority)

### Critical — No tests at all
1. **Maldiciones** — 26 scenarios, 0 tests (entire feature untested)
2. **Events** — 27 uncovered scenarios (no e2e; 5 unit tests only for standings math)
3. **Start delegation** — 0 tests for delegate flow
4. **Format switch cleanup** — 0 tests for stale data on format change

### High — Only unit tests, no e2e
5. **Launch validation UI** — unit tests validate logic, but no e2e confirms UI shows errors
6. **Partner linking UI** — rich unit tests for logic, but no e2e tests for the actual UI flow
7. **Club-ranked status** — unit coverage is strong, but no e2e for the full organizer flow
8. **Google auth claim sweep** — unit tests exist, but no e2e for the actual redirect/popup UI

### Medium — Partial coverage
9. **Planner home screen** — only 5 scenarios covered; missing mode toggle, import, badges, skin
10. **Runner settings** — only 8/24 covered; missing court disable, player replace, round management
11. **Join screen** — 5 e2e + 10 unit, but 20 gaps including calendar, reserve position, captain filter

### Low — Nice to have
12. **Persistence after refresh** — tested for Runner but not systematically for Planner
13. **Error handling** — Firebase failures, clipboard errors, corrupt state mostly untested
14. **Accessibility** — no tests for keyboard navigation, screen readers
