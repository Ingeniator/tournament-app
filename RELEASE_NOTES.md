# Release Notes

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
