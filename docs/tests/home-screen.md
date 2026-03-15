# HomeScreen — Test Scenarios

## Feature Brief

### What It Does

HomeScreen is the entry point and dashboard of the Planner app. It operates in two modes:

**Player mode:**
- View registered tournaments (joined), group tournaments (via Telegram chat), and visited events
- Join a tournament or event by 6-character code
- See tournament metadata: date, location, organizer name, status badges (Completed / Expired)

**Organizer mode:**
- Create new tournaments (with random name generation)
- View and manage owned tournaments (swipe-to-delete)
- Import tournaments from clipboard (JSON paste) or file upload (.json)
- Create and manage events (multi-tournament series)

**Cross-mode:**
- Edit / save display name (stored in Firebase user profile)
- Sign in with Google (cross-device account linking)
- Skin / theme picker (persisted to Firebase + localStorage)
- Feedback submission modal
- Mode toggle via button set or `?mode=organizer` URL param

### Who Uses It

- **Players** — join tournaments, view registrations, discover events
- **Organizers** — create tournaments/events, import data, manage owned items
- **Cross-device users** — link Google account to access data on multiple devices
- **Telegram users** — see chat room tournaments, auto-populate profile name

### Critical Rules

1. **Anonymous auth by default** — users start with Firebase anonymous UID; Google linking is optional
2. **Google link claim sweep** — when linking to an already-used Google account, all organized tournaments and registrations migrate from old anonymous UID to the Google-linked UID
3. **Name is mandatory for organizers** — create button disabled until profile name is set
4. **Join code = 6 chars, uppercase** — input is case-insensitive; code can resolve to either a tournament or an event (checked sequentially)
5. **Expired = tournament date < today (midnight)** — timezone-naive comparison using browser local time
6. **Completed = has `completedAt` timestamp** — takes priority over expired
7. **Swipe-to-delete** — only organizers can delete their own tournaments
8. **Import validates JSON format** — supports both `padel-event-v1` and `planner-event-v1` export envelopes

### Biggest Risks

| Risk | Impact | Why |
|------|--------|-----|
| **Claim sweep partial failure** | Tournaments split between old and new UID; data loss | Sequential writes with no rollback; crash mid-sweep leaves inconsistent state |
| **Redirect auth loop** | User stuck in infinite redirect (Telegram WebView) | `credential-already-in-use` triggers second redirect; no loop breaker |
| **Session storage loss** | Pre-link UID lost if tab closes before redirect completes | `google-link-pre-uid` in sessionStorage; gone on tab close |
| **Import without size/content validation** | UI freeze on large JSON; generic "Import failed" error | No file size limit; double JSON parsing; no detailed error messages |
| **Timezone mismatch on expiration** | Badge shows Expired prematurely or too late | `new Date(t.date)` may parse as UTC while `now` is local midnight |
| **Profile name save silent failure** | UI closes edit mode; user sees old name revert later | `updateUserName()` can fail but `setEditingUserName(false)` always runs |
| **Stale deletion re-entrancy** | Tournament list flickers or shows deleted items | `onValue` re-fires during lazy cleanup `remove()`; mitigated by version counter but fragile |
| **Anonymous auth unrecoverable** | Generic "Could not connect" for all auth errors | No retry, no distinction between network error and Firebase misconfiguration |

---

## Gherkin Scenarios

> **Legend:** `[PW]` = good candidate for Playwright automation | `[e2e]` = covered by e2e test | `[unit]` = covered by unit test

### Authentication — Happy Path

```gherkin
Feature: Planner Home — Authentication

  Scenario: Anonymous user lands on home screen [PW] [e2e: planner/create-tournament]
    Given I open the Planner app for the first time
    Then I am signed in anonymously
    And I see the Player mode dashboard
    And the name field prompts me to set a display name

  Scenario: Set display name [PW]
    Given I am on the home screen without a name
    When I enter "Alice" as my display name
    And I save
    Then my name badge shows "Alice"
    And the name persists after page refresh
```

### Google Sign-In

```gherkin
  Scenario: Link Google account successfully [PW] [unit: useGoogleAuth.test]
    Given I am signed in anonymously
    When I tap "Sign in with Google"
    And I complete the Google OAuth flow
    Then my account shows the linked Google email
    And my tournaments are preserved under the new identity

  Scenario: Google account already linked to another user [unit: useGoogleAuth.test]
    Given I am signed in anonymously as UID-A
    And the Google account is already linked to UID-B
    When I tap "Sign in with Google"
    Then the claim sweep migrates my tournaments from UID-A to UID-B
    And I am signed in as UID-B
    And my organized tournaments and registrations are intact

  Scenario: Google redirect flow in Telegram WebView [unit: useGoogleAuth.test]
    Given I am in a Telegram WebView
    When I tap "Sign in with Google"
    Then the auth uses redirect flow (not popup)
    And after redirect returns I am signed in with Google

  Scenario: Tab closed during Google redirect
    Given I started the Google redirect flow
    And sessionStorage has my pre-link UID
    When I close the tab before the redirect completes
    And I reopen the app
    Then I am still signed in anonymously
    And no data was lost from the interrupted link
```

### Join by Code

```gherkin
  Scenario: Join tournament by valid code [PW] [e2e: planner/join-by-code]
    Given a tournament exists with code "ABC123"
    When I enter "abc123" in the join field
    And I tap Join
    Then I am navigated to the JoinScreen for that tournament

  Scenario: Join event by valid event code [PW]
    Given an event exists with code "XYZ789"
    When I enter "XYZ789" in the join field
    And I tap Join
    Then I am navigated to the EventJoinScreen for that event

  Scenario: Invalid code shows error [PW] [e2e: planner/join-by-code]
    Given no tournament or event exists with code "BADCOD"
    When I enter "BADCOD" and tap Join
    Then I see an error message that the code was not found

  Scenario: Code input is case-insensitive [PW]
    Given a tournament exists with code "ABC123"
    When I enter "abc123"
    Then the code resolves to the same tournament

  Scenario: Code must be exactly 6 characters [PW]
    Given I type "ABC" in the join field
    Then the Join button is disabled
    When I type "ABC1234" (7 chars)
    Then the Join button is still disabled
```

### Tournament Creation — Organizer Mode

```gherkin
  Scenario: Create tournament requires a name [PW]
    Given I am in Organizer mode
    And I have not set a display name
    Then the Create button is disabled

  Scenario: Create tournament with name set [PW] [e2e: planner/create-tournament]
    Given I am in Organizer mode with name "Alice"
    When I enter "Weekend Padel" as tournament name
    And I tap Create
    Then I am navigated to the OrganizerScreen
    And the tournament appears in my organized list

  Scenario: Random name generation [PW]
    Given I am in Organizer mode
    When I tap the random name button
    Then a tournament name is auto-filled
    And it is a non-empty string
```

### Tournament Listings

```gherkin
  Scenario: Organized tournaments appear in organizer tab [PW]
    Given I have created 3 tournaments
    When I switch to Organizer mode
    Then I see all 3 tournaments in my list
    And each shows name, date, and format

  Scenario: Registered tournaments appear in player tab [PW] [e2e: planner/player-registration]
    Given I have joined 2 tournaments
    When I am in Player mode
    Then I see both tournaments
    And each shows the organizer's name

  Scenario: Completed badge on finished tournament [PW]
    Given I joined a tournament that has completedAt set
    When I view my tournaments
    Then that tournament shows a "Completed" badge

  Scenario: Expired badge on past-date tournament [PW]
    Given I joined a tournament with date yesterday
    And it has no completedAt
    When I view my tournaments
    Then that tournament shows an "Expired" badge

  Scenario: Completed takes priority over expired [PW]
    Given a tournament with date yesterday and completedAt set
    When I view my tournaments
    Then it shows "Completed" badge (not "Expired")
```

### Swipe to Delete

```gherkin
  Scenario: Delete owned tournament by swiping [PW]
    Given I am in Organizer mode with a tournament "Old Padel"
    When I swipe left on "Old Padel"
    And I confirm deletion
    Then "Old Padel" is removed from my list
    And its share code no longer resolves

  Scenario: Cannot delete tournament I don't own
    Given I see a tournament organized by someone else
    Then the swipe-to-delete gesture is not available
```

### Import

```gherkin
  Scenario: Import tournament from clipboard [PW]
    Given I am in Organizer mode
    And a valid planner JSON is in my clipboard
    When I tap Import and select "From clipboard"
    Then the tournament is imported
    And it appears in my organized list

  Scenario: Import tournament from file upload [PW]
    Given I am in Organizer mode
    When I tap Import and select a valid .json file
    Then the tournament is imported successfully

  Scenario: Import invalid JSON shows error [PW]
    Given I have "{broken json" in my clipboard
    When I attempt to import from clipboard
    Then I see "Import failed" error message

  Scenario: Import very large file
    Given I select a 50MB .json file
    When I attempt to import
    Then the app does not freeze
    # Risk: no file size limit currently
```

### Theme / Skin Picker

```gherkin
  Scenario: Change skin persists after refresh [PW]
    Given I am on the home screen
    When I select a different skin/theme
    Then the UI updates to the new theme
    When I refresh the page
    Then the new theme is still active
```

### Mode Toggle

```gherkin
  Scenario: Toggle between Player and Organizer modes [PW]
    Given I am in Player mode
    When I tap the Organizer mode button
    Then I see organizer-specific controls (Create, Import)
    When I tap Player mode button
    Then I see player-specific controls (join field, registered tournaments)

  Scenario: URL param sets initial mode [PW]
    Given I open the app with ?mode=organizer
    Then I land in Organizer mode
```

### Persistence & Interrupted Flows

```gherkin
  Scenario: Profile name persists after refresh [PW]
    Given I set my name to "Alice"
    When I refresh the page
    Then my name badge still shows "Alice"

  Scenario: Name save fails silently
    Given I edit my name to "Bob"
    And the Firebase write fails
    Then the edit mode closes
    But my name reverts to the old value on next load
    # Risk: no error feedback to user

  Scenario: Deleted tournament cleaned up from listings
    Given a tournament I joined was deleted by its organizer
    When my listings listener fires
    Then the stale entry is removed from my list
    # Lazy cleanup — may take one extra listener cycle
```

### Deep Links

```gherkin
  Scenario: Open app with ?code= param [PW] [e2e: planner/join-by-code]
    Given I open /plan?code=ABC123
    Then I land on the JoinScreen for that tournament

  Scenario: Open app with ?event= param [PW]
    Given I open /plan?event=XYZ789
    Then I land on the EventJoinScreen for that event

  Scenario: Open app with ?action=create [PW]
    Given I open /plan?action=create
    Then a tournament is auto-created with a random name
    And I land on the OrganizerScreen

  Scenario: Deep link with invalid code [PW]
    Given I open /plan?code=BADCOD
    And no tournament exists with that code
    Then I land on the HomeScreen
    And I see an error that the code was not found
```
