# Release Notes

## v0.7.0

### New Features

#### Player Aliases
  - Organizers can set display name aliases for players in the link profile modal
  - Aliases are used as player names in the runner during gameplay
  - Aliases shown as subtext below player name in the organizer's player list
  - Aliases included in tournament and event export/import

#### Tournament & Event Export/Import
  - Export tournaments and events as JSON (copy to clipboard or download file)
  - Import tournaments and events on HomeScreen to create copies with all players
  - Cross-format compatibility: runner exports can be imported into planner and vice versa
  - Unified format markers (`padel-tournament-v1`, `padel-event-v1`) with backward compatibility for old formats

#### Direct Launch to Play
  - "Let's play" now opens the runner directly in play mode — schedule is generated on load
  - SetupScreen and TeamPairingScreen are skipped for planner-originated tournaments

#### Rank Results Card
  - New visual card showing rank-based match results in standings view

#### Landing Page SEO
  - FAQPage and HowTo structured data schemas for search engines
  - Rich noscript content for crawlers
  - Prerendering script for static HTML generation
  - Sitemap added

### Improvements

  - Import button removed from EventScreen and OrganizerScreen detail pages (available only on HomeScreen, where it creates new items)
  - Domain reverted from torneo.me to padelday.net

### Bug Fixes

  - Fixed Firebase ancestor path conflict when importing tournaments with players
  - Fixed undefined description causing event import to fail
  - Fixed export format mismatch between runner and planner

### Technical

  - Cross-format import/export test coverage (runner ↔ planner)
  - Planner export tests expanded to 31 tests
  - Runner import tests expanded to 33 tests
  - E2E tests for rank results card

## v0.6.0

### New Features

#### Tournament Breakdown Views
  - Visual progress bars and matrix views showing tournament fill status on Event and EventJoin screens
  - Urgency messaging ("Hurry! Only 2 spots left", "{Club} needs {count} more")
  - Per-format breakdown views: simple, club, club-ranked, group
  - Captain mode awareness in breakdown display

#### Visited Events Tracking
  - Players see previously visited events in a "My Events" section on the home screen
  - Visit history persisted in Firebase under user profile

#### Home Screen Player/Organizer Mode Toggle
  - Home screen split into Player mode (registered tournaments, visited events, join with code) and Organizer mode (created tournaments, events, create actions)

#### Partner Selection Dropdown
  - Partner assignment converted from free-text input to dropdown selector
  - Shows eligible players filtered by club/rank/group constraints
  - "+ New player" option for adding unregistered partners

#### Quick-Link Tournaments to Events
  - Event organizers can link their own tournaments to an event from a list without entering codes

#### Club Filter for Captains
  - Captain mode join screen now has "My Club" / "All Players" toggle to filter the player list

#### Share Event from Join Screen
  - Event share card (code + copy link) now shown on EventJoinScreen

#### Join Code Resolves Events
  - Join code input now resolves both tournament and event codes

### Bug Fixes

  - Fixed club americano tournament start — persistence migration no longer incorrectly converts new club-americano exports to club-ranked
  - Relaxed club americano validation to accept 2 players per club (down from 4)
  - Fixed pair-aware player status for club-ranked format — pairs treated atomically for bucket allocation
  - Fixed captain approval to work per-pair (both partners must be approved)
  - Fixed StartWarningModal to check for existing runner data before redirect

### Improvements

#### Error Handling
  - Added error callbacks to all Firebase `onValue` listeners across ~12 hooks
  - New `dataError` state exposed from PlannerContext and displayed in App when data fails to load

#### Player Status Refactoring
  - Unified captain mode and partner filtering logic in playerStatus.ts
  - Club-ranked format now shares pair-aware logic with other fixed-partner formats

#### i18n
  - All 7 languages updated with new keys for breakdown messages, mode toggle, partner selection, event features

### Technical

  - New `clubShared.ts` shared strategy helpers for club individual formats
  - Expanded club americano tests for 2-per-club scenarios
  - Refactored playerStatus tests with pair-aware helpers

## v0.5.0

### New Features

#### Pair-Based Status for Team Formats
  - In pair tournament formats, capacity is now counted in pair slots instead of individual slots
  - Solo players (no partner) get "Needs partner" status — they don't consume capacity slots
  - Pairs are prioritized by when they were formed (`pairedAt` timestamp)

#### Sectioned Player List
  - Player list in pair formats is now split into sections: Playing, Reserve, Registered, Needs Partner, Cancelled
  - Pairs are visually grouped together within sections
  - Cancelled section is collapsed by default

#### Captain Mode
  - Club organizers can enable captain mode for pair+club formats
  - Per-club captain assignment (pick from registered players or enter Telegram username)
  - Captains can approve or reject pairs from their club on the join screen
  - Unapproved pairs show "Awaiting captain approval" status
  - Captain link modal: captains can link Telegram profiles and assign partners for players in their club directly from the join screen

### Bug Fixes

  - Tournament deletion now properly cleans up associated chatrooms

## v0.4.0

### New Features

#### Timed Rounds and Sets
  - New scoring mode with configurable round duration and set count
  - Supports timed play alongside existing points-based scoring

#### Partner Linking for Team Formats
  - Players can link partners before tournament start in team formats
  - Guards and UI improvements to prevent invalid partner assignments

#### Registration Enhancements
  - Club, rank, and group selection available before registration
  - Color indicators for ranks and clubs (with "no color" option)
  - Reserve player status constraints for same rank within a club

#### Americano Baseline Distributions
  - New baseline score distribution options for Americano format

#### Tournament Start Delegation
  - "Start Tournament" restricted on JoinScreen — only designated organizer can start
  - Delegated start rights for tournament organizers

### Improvements

#### Unified Setup Flow
  - Planner and runner entry merged into a single unified form
  - Runner setup and planner organizer screen consolidated
  - Team setup moved from runner to planner
  - Scoring section moved to a more prominent position

#### OrganizerScreen Redesign
  - Refactored into collapsible sections (format, courts, players)
  - ClubPanel component added to planner's OrganizerScreen
  - Court cap with warnings and toast notifications
  - Max court limit removed — court count set first

#### Format Picker Improvements
  - Wizard now derives initial state from selected format's preset tags
  - Cross-group formats list fixed

#### Player Management
  - Improved name deduplication after manual renaming in team pairing mode
  - Fixed user name duplication in planner during team setup
  - Updated layout for player dropdown menus
  - Remove button now uses a trash bin icon instead of ×

#### Group Tournaments
  - Group tournaments now sync on name/date changes

#### Landing Page
  - Updated landing page content

### Technical

  - Improved CI/CD pipeline
  - All build chunks now under 500 kB (code-splitting optimizations)

### Bug Fixes

  - Fixed club americano selection
  - Fixed cross-group assignments
  - Fixed team pairing and team pairing modal
  - Fixed club badge text color
  - Fixed "Rendered more hooks than during the previous render" error
  - Various build fixes

## v0.3.0

### New Features    

#### Club Tournament Formats
  - Added 5 new club-based tournament strategies: Club Americano, Club Mexicano, Club Ranked, Club Team Americano, and Club Team Mexicano
  - Players are organized into clubs/groups with inter-club matchmaking and per-club standings
  - Club standings table with colored club badges in both live view and image export
  - Club/group selection available on the join page in Planner

#### Mixed Formats
  - Added Mixed Americano, Mixed Team Americano, Mixed Team Mexicano, and Mixed King of the Court formats
  - Cross-group pairing support refactored and now available across all formats via FormatPicker wizard

#### Maldiciones del Padel Mode
  - New "curse card" game mode for all team formats with 3 chaos levels: Lite, Medium, Hardcore
  - 17 unique curse cards across Green/Yellow/Red tiers (e.g., Los Mudos, Mano Muerta, El Solo)
  - Card dealing, shield/veto mechanics, and curse casting UI during match play
  - Dedicated Maldiciones awards at ceremony (El Brujo, El Superviviente, Escudo de Oro, etc.)

#### Events (Multi-Tournament Aggregation)
  - New Event entity in Planner: group multiple tournaments under a single event
  - Event creation form, organizer management screen, and shareable event links (6-char codes)
  - Weighted combined standings across linked tournaments (individual + club)
  - Event join screen for players to view all tournaments and standings in one place

#### Games Scoring Mode
  - New scoring option alongside the existing points-based scoring

#### Shareable Event Links
  - Events can be shared via short codes, similar to tournament sharing

### Improvements

#### Format Picker Wizard
  - New FormatPicker component with presets and a guided wizard flow
  - Auto-applies the resolved format when toggling "Cross-group pairs" or "Club competition"

#### Runner UX
  - Swipe-to-delete for tournaments on the home screen
  - Organizer can now edit player usernames on the setup page
  - Confirmation dialog before tournament reopen
  - Tournament restart guard for organizers
  - Comma-separated player list input support
  - "Never Shared Court" constraint adjusted for club tournaments
  - Improved round count recommendations for club-ranked tournaments
  - Export dropdown for share/export buttons

#### Planner UX
  - Rank Picker on JoinScreen for club-ranked tournaments
  - Customizable rank names for club-ranked tournament slots (moved config from Runner to Planner)
  - Improved player status utilities with new test coverage

#### Standings & Awards
  - Fixed event standings computation
  - Pair standings now use two-row layout with colored club dots
  - Club badges and club standings included in image export
  - Info buttons added to Club Americano pair mode and match mode settings
  - Nomination card pair names now split on separate rows

#### Landing Page
  - Complete landing page redesign with multi-page routing
  - New content pages: Formats, Americano, Mexicano, Awards, Maldiciones, Club
  - Screenshots added for mobile views

### Technical

  - Strategy taxonomy documentation added
  - Shared strategy helpers extracted (clubShared.ts, shared.ts refactor)
  - Mixicano strategy merged into Mexicano module
  - Unit tests added for awards subsystem (matchData, selection, individual, duo, club, maldiciones)
  - Unit tests for event standings and player status utilities
  - E2E tests updated for new features
  - Translations updated across all 7 languages (EN, ES, FR, IT, PT, SR, SV)
  - ESLint config updated

### Bug Fixes

  - Fixed nomination card pair name display
  - Fixed club americano image export
  - Fixed React hooks violations and code duplication in Club Americano
  - Fixed Serbian plural forms

## v0.2.0

**3 new tournament formats**
- Mixicano — mixed-gender with automatic partner rotation
- King of the Court — court-based rotation
- Team Mexicano — team variant of Mexicano

**Post-tournament awards ceremony**
Highlights like "Instant Classic" and "Most Dominant" shown after finishing

**Smarter round generation**
Additional rounds now pair players with similar standings

**3 new languages**
French, Serbian, Swedish

**Mid-tournament editing**
Add/remove courts and change Mixicano groups from Settings

**Tournament backup**
Automatic backup on completion with restore option

### Fixes
- Tournament cancellation flow
- Export/import between devices
- Opponent balance with sit-outs in Americano
- Various visual and translation fixes
