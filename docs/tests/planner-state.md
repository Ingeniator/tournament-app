# Planner State & Data Layer — Test Scenarios

## Feature Brief

### What It Does

PlannerContext is the central state management layer that wires Firebase Realtime Database to the React UI. It owns:

- **Authentication** — anonymous sign-in, Google linking, Telegram identity
- **Real-time listeners** — tournament data, players, user profile, tournament listings, chat rooms, events
- **Screen routing** — URL params (`?code=`, `?event=`, `?action=create`, `?lang=`) determine which screen renders
- **Data mutations** — tournament CRUD, player registration, partner linking, event management
- **Cross-device sync** — Telegram UID migration when user switches devices
- **Registration indexes** — 3-location writes (canonical, user index, Telegram index) for efficient lookups
- **Orphan claiming** — auto-detects registrations added by organizer via Telegram username and migrates them to the real UID

### Who Uses It

Every screen in the Planner app consumes this context. It's the backbone for organizers, players, and captains alike.

### Critical Rules

1. **Atomic multi-path updates** — tournament creation writes to `tournaments/`, `codes/`, and `users/.../organized/` in one Firebase update
2. **Registration at 3 locations** — `tournaments/{id}/players/{uid}`, `users/{uid}/registrations/{id}`, `telegramUsers/{tgName}/registrations/{id}`
3. **Duplicate prevention** — checks both UID and Telegram username before allowing registration
4. **Partner logic is a pure function** — `resolvePartnerUpdate()` computes all writes; actual Firebase update is separate
5. **Confirmation resets timestamp** — `updateConfirmed(uid, true)` sets `timestamp = Date.now()`, moving player to back of FIFO queue
6. **Unconfirm severs partner link** — setting `confirmed: false` clears bidirectional partner link and auto-cancels `addedByPartner` players
7. **Chat room sync** — tournament name/date changes propagate to `chatRooms/{instance}/tournaments/{id}`
8. **Telegram cross-device sync** — on app open, detects device switch via `telegramUsers/{username}/currentUid`; migrates all registrations and organized tournaments to new UID
9. **Lazy cleanup** — stale index entries (deleted tournaments) are removed fire-and-forget during listener callbacks
10. **Screen routing from URL** — `?code=XXXXXX` → join, `?event=XXXXXX` → event-join, `?action=create` → auto-create

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Listener teardown race condition** | Stale data overwrites fresh state | `onValue` can fire in-flight after unsubscribe; `versionRef` guard exists but not on all hooks |
| **Partner link computed from stale state** | Orphaned link; partner removed between compute and write | `resolvePartnerUpdate()` uses local `players` snapshot, not Firebase atomic read |
| **Telegram sync crash mid-migration** | Some registrations on old UID, some on new; no retry queue | Sequential per-tournament writes with no rollback |
| **Lazy cleanup failure** | Stale index entries persist; phantom tournaments in listing | `remove()` is fire-and-forget; network failure means retry on next listener fire |
| **Auto-claim vs manual register race** | Orphan stays orphaned or duplicate registration | `claimOrphanRegistration` checks `existing.exists()` but not atomic with `registerPlayer` |
| **Code lookup points to deleted tournament** | User joins nonexistent tournament | `codes/{code}` deletion can fail silently in multi-path update |
| **Auth error is generic** | User stuck on "Could not connect" with no retry | All auth errors caught with same message; no Firebase config validation |
| **Event import partial failure** | Orphaned tournaments with no event link | Sequential tournament imports with no transaction; event creation can fail after tournaments exist |
| **Organizer name stale after ownership change** | Wrong organizer name displayed | Fetched once per tournament load; no re-fetch on `organizerId` change |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation | `[e2e]` = covered by e2e test | `[unit]` = covered by unit test

### Authentication

```gherkin
Feature: Planner State — Authentication

  Scenario: Anonymous sign-in on first visit [PW] [e2e: planner/create-tournament]
    Given I open the Planner app for the first time
    Then I am automatically signed in with an anonymous UID
    And I can browse the home screen

  Scenario: Auth failure shows error message [PW]
    Given Firebase authentication fails
    Then I see "Could not connect. Check your internet and try again."
    And the app does not proceed past the loading screen

  Scenario: UID persists across page refreshes [PW]
    Given I am signed in anonymously
    When I refresh the page
    Then I retain the same UID
    And my tournaments are still visible
```

### Screen Routing from URL

```gherkin
  Scenario: ?code= routes to join screen [PW] [e2e: planner/join-by-code]
    Given a tournament exists with code "ABC123"
    When I open /plan?code=ABC123
    Then I land on the JoinScreen for that tournament

  Scenario: ?event= routes to event join screen [PW]
    Given an event exists with code "EVT456"
    When I open /plan?event=EVT456
    Then I land on the EventJoinScreen for that event

  Scenario: ?action=create auto-creates tournament [PW]
    Given I am authenticated
    When I open /plan?action=create
    Then a new tournament is created with a random name
    And I land on the OrganizerScreen

  Scenario: ?lang= sets locale before render
    Given I open /plan?lang=es
    Then the app renders in Spanish

  Scenario: Invalid ?code= falls back to home [PW]
    When I open /plan?code=BADCOD
    Then I land on the HomeScreen
    And I see an error about invalid code
```

### Registration — 3-Location Writes

```gherkin
  Scenario: Registration writes to all 3 indexes [unit: usePlayers.test]
    Given I register for tournament "T1" as UID "user-1"
    Then my registration exists at tournaments/T1/players/user-1
    And a reference exists at users/user-1/registrations/T1
    And if I have a Telegram username, a reference exists at telegramUsers/{tgName}/registrations/T1

  Scenario: Duplicate UID registration is prevented [PW] [unit: usePlayers.test]
    Given I am already registered in tournament "T1"
    When I try to register again
    Then no duplicate registration is created

  Scenario: Duplicate Telegram username registration is prevented [unit: usePlayers.test]
    Given player with my Telegram username is already registered
    When I try to register with same Telegram username
    Then I am matched to the existing registration (orphan claim)
```

### Confirmation & FIFO

```gherkin
  Scenario: Confirming resets timestamp to now
    Given I registered at 10:00 AM and cancelled at 10:05
    When I re-confirm at 10:30
    Then my timestamp is set to 10:30
    And I move to the back of the FIFO queue

  Scenario: Unconfirm severs partner link
    Given I am paired with "Bob"
    When I set confirmed to false
    Then my partner link with Bob is cleared (both directions)

  Scenario: Unconfirm auto-cancels addedByPartner player
    Given I am paired with "Charlie" who was added by me
    When I cancel (confirmed = false)
    Then Charlie's registration is also cancelled
```

### Telegram Cross-Device Sync

```gherkin
  Scenario: Detect device switch and migrate registrations [unit: useTelegramSync.test]
    Given I used Telegram username "alice_bot" on Device A (UID-A)
    When I open the app on Device B (UID-B)
    And the app detects a different currentUid for "alice_bot"
    Then all my registrations are migrated from UID-A to UID-B
    And my organized tournaments update organizerId to UID-B

  Scenario: Sync crash mid-migration leaves partial state
    Given the app is migrating 4 tournament registrations
    And migration succeeds for tournaments 1 and 2
    When the app crashes before migrating tournament 3
    Then tournaments 1-2 are under UID-B
    And tournaments 3-4 remain under UID-A
    # Risk: no retry queue; next app open doesn't re-attempt
```

### Orphan Claiming

```gherkin
  Scenario: Auto-claim orphan registration
    Given the organizer added a player with my Telegram username
    And that registration has a placeholder UID
    When I open the tournament
    Then my real UID replaces the placeholder
    And I see myself as registered

  Scenario: Race between orphan claim and manual register
    Given an orphan registration exists for my Telegram username
    When I tap Register at the same moment the auto-claim runs
    Then only one registration exists for me
    # Risk: not atomic — could result in duplicate or missed claim
```

### Partner Logic

```gherkin
  Scenario: Partner update computed from current player list [unit: partnerLogic.test]
    Given players [Alice, Bob, Carol] are registered
    When Alice sets Bob as partner
    Then resolvePartnerUpdate produces writes for both Alice and Bob

  Scenario: Partner link with stale player data
    Given the local state has [Alice, Bob]
    But Bob was just deleted on another device
    When Alice sets Bob as partner
    Then the write succeeds but creates an orphaned link
    # Risk: no server-side validation of partner existence
```

### Chat Room Sync

```gherkin
  Scenario: Tournament name change propagates to chat room
    Given a tournament shared in a Telegram chat room
    When the organizer renames it from "Friday Padel" to "Saturday Padel"
    Then the chat room entry updates to "Saturday Padel"

  Scenario: Date change propagates to chat room
    Given a tournament shared in a Telegram chat room
    When the organizer changes the date
    Then the chat room entry updates with the new date
```

### Lazy Cleanup

```gherkin
  Scenario: Stale index entry cleaned up on listener fire
    Given a tournament I organized was deleted externally
    When the my-tournaments listener fires
    Then it detects the tournament no longer exists
    And removes the stale index entry from my organized list

  Scenario: Lazy cleanup failure leaves phantom entry
    Given a stale index entry exists
    When the cleanup remove() call fails (network error)
    Then the phantom tournament persists in my list
    And cleanup is retried on the next listener fire
```

### Persistence & Real-Time Sync

```gherkin
  Scenario: Tournament data updates in real time [PW]
    Given I am viewing a tournament
    When another user registers
    Then their name appears in my player list without refresh

  Scenario: Multiple concurrent viewers see consistent state [PW]
    Given Alice and Bob both view the same tournament
    When Alice adds a player
    Then Bob sees the new player in their list
```
