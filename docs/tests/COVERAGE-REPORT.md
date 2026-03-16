# Test Coverage Report

> Updated 2026-03-16. Maps Gherkin scenarios to existing e2e (Playwright) and unit (Vitest) tests.

## Summary

| Feature Doc | Total Scenarios | Covered by e2e | Covered by unit | Not covered |
|-------------|:-:|:-:|:-:|:-:|
| organizer-screen | 30 | 7 | 10 | 13 |
| home-screen | 33 | 9 | 2 | 22 |
| join-screen | 35 | 11 | 10 | 14 |
| planner-state | 22 | 5 | 7 | 10 |
| events | 32 | 10 | 5 | 17 |
| runner-home | 16 | 6 | 0 | 10 |
| runner-setup | 17 | 4 | 3 | 10 |
| runner-scoring | 30 | 12 | 8 | 10 |
| runner-settings | 24 | 13 | 0 | 11 |
| runner-maldiciones | 26 | 9 | 6 | 11 |
| **TOTAL** | **265** | **86** | **51** | **128** |

**Overall coverage: ~50% (137 of 265 scenarios have at least one test)**

---

## Test Files

### E2E (Playwright) — 31 spec files

| File | Tests | Covers |
|------|:-----:|--------|
| `e2e/home-screen.spec` | 5 | Runner home: create, import, resume, reload |
| `e2e/tournament-flow.spec` | 5 | Full americano lifecycle, validation, persistence |
| `e2e/mexicano-flow.spec` | 3 | Mexicano lifecycle, dynamic round gen, standings |
| `e2e/mixicano-flow.spec` | 7 | Groups, lifecycle, dynamic rounds, persistence |
| `e2e/team-americano-flow.spec` | 4 | Team americano lifecycle, custom names, persistence |
| `e2e/team-mexicano-flow.spec` | 5 | Team mexicano lifecycle, dynamic rounds, persistence |
| `e2e/king-of-the-court-flow.spec` | 7 | KoTC min players, auto-court, bonus labels, lifecycle |
| `e2e/play-screen.spec` | 8 | Standings modal, score picker, progress, add round, finish, clear |
| `e2e/log-screen.spec` | 5 | Round cards, stats modal, export, add round, finish |
| `e2e/settings.spec` | 7 | Rename, add player, toggle availability, edit points, delete |
| `e2e/settings-advanced.spec` | 12 | Rounds, court rename/disable, add court, replace player, cancel delete, export |
| `e2e/completed.spec` | 5 | Standings, share, round results, tabs |
| `e2e/footer.spec` | 6 | Footer links, personalize modal, language switch |
| `e2e/edge-cases.spec` | 16 | localStorage corruption, double-click, empty states, offline, hash nav |
| `e2e/rank-results.spec` | 9 | Club-ranked completion cards, carousel |
| `e2e/maldiciones.spec` | 11 | **NEW** Curse cast/shield/veto, card picker, rules modal, awards, hands |
| `e2e/accessibility.spec` | 3 | **NEW** Heading structure, form elements, score button accessibility |
| `e2e/planner/create-tournament.spec` | 7 | Create, add players, format, **NEW** persistence (tournament, player, event) |
| `e2e/planner/join-by-code.spec` | 3 | Join by code, deep link, invalid code |
| `e2e/planner/pair-format.spec` | 3 | Needs-partner section, pair vs non-pair headers |
| `e2e/planner/player-registration.spec` | 3 | Register, cancel/re-confirm, registered list |
| `e2e/planner/telegram.spec` | 3 | Auto-fill name, startapp deep link, pre-fill registration |
| `e2e/planner/club-ranked-captain.spec` | 4 | Captain toggle, sectioned list, approve flow, disable captain |
| `e2e/planner/events.spec` | 10 | **NEW** Create/delete event, link/unlink tournament, share code, weight, join event |
| `e2e/planner/start-delegation.spec` | 5 | **NEW** Default delegate, delegate to player/telegram, reset |
| `e2e/planner/launch-validation.spec` | 5 | **NEW** Min players, unpaired, court capacity, valid config, error clearing |
| `e2e/planner/partner-linking.spec` | 5 | **NEW** Select/create partner, bidirectional, rejection, removal |
| `e2e/planner/home-screen.spec` | 7 | **NEW** Mode toggle, import, deep links, edit name, tournament lists |
| `e2e/planner/join-screen-advanced.spec` | 6 | **NEW** Reserve, club, cancel, metadata, duplicate warning, organizer edit |
| `e2e/staging/smoke.spec` | 20 | **NEW** Post-deploy: auth, CRUD, join, events, delegation, multi-user sync |

### Unit (Vitest) — 20 test files

| File | Tests | Covers |
|------|:-----:|--------|
| `tournamentReducer.test` | 62 | CREATE, LOAD, SCORE, COMPLETE, maldiciones CAST/ESCUDO/VETO, team replace |
| `playerStatus.test` | 60+ | FIFO, club, club-ranked, captain mode, solo/paired |
| `validateLaunch.test` | 24+ | Min players, even count, clubs, courts, partners |
| `partnerLogic.test` | 50+ | Set/remove/switch partner, constraints, timestamps |
| `exportToRunner.test` | 18 | Planner→Runner mapping, IDs, teams, aliases, config |
| `plannerExport.test` | 25+ | Export, import, round-trip, validation, cross-format |
| `eventStandings.test` | 20+ | Weighted scores, tiebreakers, clubs, multi-tournament |
| `tournamentBreakdown.test` | 40+ | Urgency levels, club/ranked/group breakdowns |
| `useGoogleAuth.test` | 21 | Link, claim sweep, redirect, credential collision, **NEW** timeout + skip-owned |
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
| Cancelling player promotes reserve | staging/smoke (multi-user) | playerStatus | COVERED |
| Mixicano 50/50 group split | — | — | GAP |
| Club-ranked bucket distribution | — | playerStatus | COVERED |
| Block launch <4 players | launch-validation | validateLaunch | COVERED |
| Block launch odd team count | launch-validation | validateLaunch | COVERED |
| Block launch unassigned clubs | — | validateLaunch | COVERED |
| Block launch too many courts | launch-validation | validateLaunch | COVERED |
| Warn unpaired players | launch-validation | validateLaunch | COVERED |
| Successful launch | launch-validation | validateLaunch | COVERED |
| Delegate start to player | start-delegation + staging/smoke | — | COVERED |
| Warn different user started | staging/smoke (multi-user) | — | COVERED |
| Format switch clears groups | — | — | N/A (feature removed) |
| Format switch clears clubs | — | — | N/A (feature removed) |
| Copy share link | events | — | COVERED |
| Share code resolves | join-by-code | — | COVERED |
| Duration warning | — | — | GAP |
| Sit-out fairness warning | — | — | GAP |
| Export as JSON | — | plannerExport | COVERED |
| Restore from backup | — | — | GAP |
| Launch overwrites Runner | — | — | GAP |
| Refresh preserves state | create-tournament (persistence) | — | COVERED |
| Firebase write failure | — | — | GAP |
| Captain approves player | club-ranked-captain | playerStatus | COVERED |
| Captain rejects player | — | — | GAP |
| Duplicate name warning | join-screen-advanced | — | COVERED |

### home-screen.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Anonymous user lands on home | create-tournament + staging/smoke | — | COVERED |
| Set display name | home-screen + staging/smoke | — | COVERED |
| Link Google account | — | useGoogleAuth | COVERED |
| Google account already linked | — | useGoogleAuth | COVERED |
| Redirect flow in Telegram WebView | — | useGoogleAuth | PARTIAL |
| Tab closed during redirect | — | — | GAP |
| Join by valid code | join-by-code | — | COVERED |
| Join event by code | events + staging/smoke | — | COVERED |
| Invalid code shows error | join-by-code + staging/smoke | — | COVERED |
| Code is case-insensitive | — | — | GAP |
| Code must be 6 chars | — | — | GAP |
| Create requires name | — | — | GAP |
| Create tournament with name | create-tournament | — | COVERED |
| Random name generation | — | — | GAP |
| Organized tournaments in list | home-screen | — | COVERED |
| Registered tournaments in list | player-registration + home-screen | — | COVERED |
| Completed badge | — | — | GAP |
| Expired badge | — | — | GAP |
| Completed > Expired priority | — | — | GAP |
| Swipe to delete | — | — | GAP |
| Cannot delete others' tournament | staging/smoke (multi-user) | — | COVERED |
| Import from clipboard | home-screen | — | COVERED |
| Import from file | — | — | GAP |
| Import invalid JSON | — | — | GAP |
| Import large file | — | — | GAP |
| Change skin persists | — | — | GAP |
| Toggle Player/Organizer modes | home-screen | — | COVERED |
| URL param sets mode | — | — | GAP |
| Profile name persists | staging/smoke | — | COVERED |
| Name save fails silently | — | — | GAP |
| Deleted tournament cleaned up | — | — | GAP |
| ?code= deep link | join-by-code + staging/smoke | — | COVERED |
| ?action=create deep link | — | — | GAP |

### join-screen.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Register with a name | player-registration + staging/smoke | — | COVERED |
| Name auto-filled from Google | — | — | GAP |
| Name auto-filled from Telegram | telegram | — | COVERED |
| Edit registered name | — | — | GAP |
| Cancel participation | player-registration + staging/smoke | — | COVERED |
| Re-confirm after cancelling | player-registration + staging/smoke | — | COVERED |
| Cancelling promotes reserve | staging/smoke (multi-user) | playerStatus | COVERED |
| Link to existing player | partner-linking | partnerLogic | COVERED |
| Create and invite new partner | partner-linking | partnerLogic | COVERED |
| Remove partner link | partner-linking | partnerLogic | COVERED |
| Auto-added partner cancelled on unlink | — | partnerLogic | PARTIAL |
| Mixicano opposite group | — | partnerLogic | COVERED |
| Club format same club | — | partnerLogic | COVERED |
| Changing club breaks link | — | partnerLogic | PARTIAL |
| Changing rank breaks link | — | partnerLogic | PARTIAL |
| Select group | — | — | GAP |
| Select club | join-screen-advanced | — | COVERED |
| Select rank | — | — | GAP |
| Duplicate name warning | join-screen-advanced | — | COVERED |
| Register with duplicate | — | — | GAP |
| Captain: player joins as registered | — | playerStatus | COVERED |
| Captain approves player | club-ranked-captain | playerStatus | COVERED |
| Captain rejects player | — | — | GAP |
| Captain filters club | — | — | GAP |
| Captain assigns rank | — | — | GAP |
| Reserve position updates | join-screen-advanced + staging/smoke | — | COVERED |
| Reserve promoted | staging/smoke (multi-user) | playerStatus | COVERED |
| Organizer launches from join | — | — | GAP |
| Delegate launches | staging/smoke (multi-user) | — | COVERED |
| Non-organizer no Start button | staging/smoke (multi-user) | — | COVERED |
| Download calendar .ics | — | — | GAP |
| Registration persists after refresh | create-tournament (persistence) | — | COVERED |
| Partner persists after refresh | staging/smoke (bidirectional) | — | COVERED |
| Rapid Enter no duplicates | — | — | GAP |
| Auto-added partner never claims | — | — | GAP |

### planner-state.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Anonymous sign-in on first visit | create-tournament + staging/smoke | — | COVERED |
| Auth failure shows error | — | — | GAP |
| UID persists across refresh | staging/smoke | — | COVERED |
| ?code= routes to join | join-by-code + staging/smoke | — | COVERED |
| ?event= routes to event join | home-screen | — | COVERED |
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
| Real-time data updates | staging/smoke (multi-user) | — | COVERED |

### events.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Create event with name and date | events + staging/smoke | — | COVERED |
| Event code is immutable | — | — | GAP |
| Cannot create without name | — | — | GAP |
| Past date allowed | — | — | GAP |
| Link own tournament | events | — | COVERED |
| Link tournament by code | events + staging/smoke | — | COVERED |
| Cannot link same twice | — | — | GAP |
| Unlink tournament | events | — | COVERED |
| Default weight 1.0 | — | — | GAP |
| Change tournament weight | events | eventStandings | COVERED |
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
| Copy share link | events | — | COVERED |
| Copy event code | events | — | COVERED |
| Share hidden for completed | — | — | GAP |
| Export to clipboard | — | — | GAP |
| Export as file | — | — | GAP |
| Export fails silently | — | — | GAP |
| Delete event | events + staging/smoke | — | COVERED |
| Only owner can delete | staging/smoke (multi-user) | — | COVERED |
| Player sees tournaments | events (join event) + staging/smoke | — | COVERED |
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
| Planner export auto-loads | — | exportToRunner | PARTIAL (unit only) |
| Creating overwrites existing | — | — | GAP |
| Importing overwrites existing | — | — | GAP |
| Saved to localStorage | tournament-flow | — | COVERED |
| Corrupt localStorage handled | edge-cases (4 variants) | — | COVERED |
| iOS install banner | — | — | GAP |

### runner-setup.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Planner tournament auto-generates | — | exportToRunner | PARTIAL |
| Planner team tournament auto-generates | — | exportToRunner | PARTIAL |
| Player names match Planner | — | exportToRunner | COVERED |
| Config defaults resolved | — | resolveConfigDefaults | COVERED |
| Import valid JSON auto-advance | home-screen | — | COVERED |
| Import in-progress resumes as-is | home-screen | — | COVERED |
| Import invalid JSON error | home-screen | — | COVERED |
| Import unknown format rejected | — | — | GAP |
| Import missing fields rejected | — | — | GAP |
| Resume in-progress after refresh | tournament-flow | — | COVERED |
| Resume setup-phase auto-advances | — | — | GAP |
| No tournament shows HomeScreen | edge-cases | — | COVERED |
| Americano generates all rounds | tournament-flow | — | COVERED |
| Mexicano generates only round 1 | mexicano-flow | — | COVERED |
| Maldiciones cards dealt | maldiciones | — | COVERED |
| Duplicate names suffixed | — | — | GAP |
| Corrupt localStorage handled | edge-cases | — | COVERED |

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
| Disable court | settings-advanced | — | COVERED |
| Re-enable court | — | — | GAP |
| Add player mid-tournament | settings | — | COVERED |
| Mark player unavailable | settings | — | COVERED |
| Re-enable player | settings-advanced | — | COVERED |
| Replace player | settings-advanced | — | COVERED |
| Replace player mid-round | — | — | GAP |
| Add more rounds | play-screen + log-screen + settings-advanced | — | COVERED |
| Remove future rounds | settings-advanced | — | COVERED |
| Cannot remove scored rounds | — | — | GAP |
| Regenerate future rounds | — | — | GAP |
| Export to clipboard | settings-advanced + log-screen | — | COVERED |
| Export as file | — | — | GAP |
| Import mid-session | — | — | GAP |
| Export incomplete | — | — | GAP |
| Delete with confirmation | settings | — | COVERED |
| Cancel delete | settings-advanced | — | COVERED |
| Delete without export | — | — | GAP |
| Enable maldiciones | — | — | GAP |
| Disable maldiciones | — | — | GAP |
| Settings persist after refresh | — | — | GAP |

### runner-maldiciones.md

| Scenario | e2e | unit | Status |
|----------|:---:|:----:|:------:|
| Cards dealt — lite | — | — | GAP |
| Cards dealt — medium | maldiciones (hands populated) | — | COVERED |
| Cards dealt — hardcore | — | — | GAP |
| Card hands unique | — | — | GAP |
| Cast curse on opposing player | maldiciones | tournamentReducer | COVERED |
| Cannot curse teammate | — | — | GAP |
| One curse per match | maldiciones | tournamentReducer | COVERED |
| Cast before scoring | maldiciones (score with curse) | tournamentReducer | COVERED |
| Block with shield | maldiciones | tournamentReducer | COVERED |
| No shields remaining | — | tournamentReducer | COVERED |
| Shield count finite | maldiciones (card removed from hand) | tournamentReducer | COVERED |
| Veto before scoring | maldiciones | tournamentReducer | COVERED |
| Cannot veto after scored | — | — | GAP |
| Veto timing race | — | — | GAP |
| Dynamic formats + cards | — | — | GAP |
| Fixed-partner cards | maldiciones (team-americano) | — | COVERED |
| Replaced player's cards | — | — | GAP |
| Cards after unavailable | — | — | GAP |
| Disable after dealing | — | — | GAP |
| Re-enable after disable | — | — | GAP |
| Chaos level change no effect | maldiciones (chaos level visible) | — | COVERED |
| Awards at ceremony | maldiciones (completed tournament) | — | COVERED |
| Awards with minimal activity | — | — | GAP |
| No awards when off | — | — | GAP |
| Card hands persist | maldiciones (info modal shows hands) | — | COVERED |
| Cast curse persists | — | — | GAP |

---

## Top Coverage Gaps (by priority)

### Resolved (previously Critical)
1. ~~**Maldiciones**~~ — 11/26 covered (e2e: cast, shield, veto, picker, rules modal, awards, hands; unit: reducer)
2. ~~**Events**~~ — 15/32 covered (e2e: create, link, unlink, share, delete, join; staging: owner-only delete)
3. ~~**Start delegation**~~ — covered (e2e: delegate to player/telegram/reset; staging: delegate sees Start, non-delegate blocked)
4. ~~**Format switch cleanup**~~ — N/A (feature removed from codebase; format is immutable after creation)

### Resolved (previously High)
5. ~~**Launch validation UI**~~ — covered (e2e: min players, unpaired, courts, valid config, error clearing)
6. ~~**Partner linking UI**~~ — covered (e2e: select/create partner, bidirectional, rejection, removal)
7. **Google auth claim sweep** — unit edge cases added (timeout, skip-owned); no e2e (impractical)

### Remaining High-Priority Gaps
8. **Maldiciones depth** — 15 untested: lite/hardcore dealing, teammate restriction, veto-after-scored, dynamic formats, player replacement with cards, disable/re-enable
9. **Events depth** — 17 untested: immutable code, status transitions (draft/active/completed), weight edge cases, export, linked-tournament-deleted
10. **Runner scoring** — 10 untested: edit scored match, games/sets modes, tiebreaker details, sit-out compensation, carousel nav

### Remaining Medium-Priority Gaps
11. **Planner home screen** — 22/33 still uncovered: badges, swipe-delete, skin, import-from-file, deep links
12. **Join screen** — 14/35 uncovered: edit name, group/rank selection, captain filter/assign, calendar .ics
13. **Runner settings** — 11/24 uncovered: re-enable court, replace mid-round, export-as-file, maldiciones toggle

### Low Priority
14. **Planner state** — 10/22 uncovered: timestamp reset, partner unconfirm, stale index cleanup, race conditions
15. **Runner home** — 10/16 uncovered: random name, all formats, import edge cases, iOS banner
16. **Accessibility** — basic smoke tests added; no full axe-core audits yet
