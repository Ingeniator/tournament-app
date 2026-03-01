# Release Notes

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
