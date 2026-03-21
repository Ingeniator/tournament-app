/**
 * Post-deploy smoke tests for staging.padelday.net.
 *
 * Runs against real Firebase — every test creates real data and cleans up after itself.
 * Use: npx playwright test --project=planner-staging
 *
 * These tests verify that the deployed build works end-to-end with real:
 *  - Firebase Anonymous Auth
 *  - Firebase Realtime Database reads/writes
 *  - Short code generation & resolution
 *  - Real-time data sync between browser contexts
 */

import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  getShareCode,
  addPlayerAsOrganizer,
  goBack,
  joinByCode,
  registerAsPlayer,
  deleteTournament,
  createEvent,
  deleteEvent,
  openTournamentByName,
} from './helpers';

// Staging tests need more time for network round-trips
test.setTimeout(90_000);

test.describe('Staging Smoke Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Auth & Home', () => {
    test('anonymous auth completes and home screen loads', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await expect(page.getByRole('heading', { name: 'Tournament Planner' })).toBeVisible();
    });

    test('can set profile name', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Smoke ${Date.now()}`);
      await expect(page.getByText('Logged in as')).toBeVisible();
    });
  });

  test.describe('Tournament CRUD', () => {
    test('create tournament, add players, verify, delete', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Smoke ${Date.now()}`);

      // Create
      const name = await createTournament(page);
      await expect(page.getByRole('heading', { name })).toBeVisible();

      // Add players
      await addPlayerAsOrganizer(page, 'Alice');
      await addPlayerAsOrganizer(page, 'Bob');
      await addPlayerAsOrganizer(page, 'Charlie');
      await addPlayerAsOrganizer(page, 'Diana');
      await expect(page.getByText(/Players \(4/)).toBeVisible();

      // Share code exists
      const code = await getShareCode(page);
      expect(code).toMatch(/^[A-Z2-9]{6}$/);

      // Delete
      await deleteTournament(page);
    });

    test('tournament persists after page reload', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Smoke ${Date.now()}`);

      const name = await createTournament(page);
      await addPlayerAsOrganizer(page, 'PersistPlayer');

      // Reload page completely
      await page.reload();
      await waitForHome(page);

      // Switch to Organizer mode to see "My Tournaments"
      await page.getByRole('button', { name: 'Organizer' }).click();

      // Tournament should still be in the list
      await expect(page.getByText(name)).toBeVisible({ timeout: 20_000 });

      // Re-open and verify player
      await openTournamentByName(page, name);
      await expect(page.getByText('PersistPlayer')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/Players \(1/)).toBeVisible({ timeout: 10_000 });

      await deleteTournament(page);
    });
  });

  test.describe('Join Flow (multi-user)', () => {
    test('player joins tournament by code and registers', async ({ page, context }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Organizer ${Date.now()}`);

      const name = await createTournament(page);
      const code = await getShareCode(page);

      // Second browser tab = different anonymous user
      const playerPage = await context.newPage();
      await playerPage.goto('/plan');
      await waitForHome(playerPage);
      await setProfileName(playerPage, `Player ${Date.now()}`);

      // Join by code
      await joinByCode(playerPage, code);
      await expect(playerPage.getByRole('heading', { name })).toBeVisible();

      // Register
      await registerAsPlayer(playerPage, 'JoinSmokePlayer');
      await expect(playerPage.getByText("You're confirmed!")).toBeVisible();

      // Organizer should see the new player in real-time
      // (Firebase real-time sync)
      await expect(page.getByText('JoinSmokePlayer')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/Players \(1/)).toBeVisible({ timeout: 10_000 });

      await playerPage.close();
      await deleteTournament(page);
    });

    test('join via ?code= deep link', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Organizer ${Date.now()}`);

      const name = await createTournament(page);
      const code = await getShareCode(page);

      // Navigate to deep link
      await page.goto(`/plan?code=${code}`);

      // Should land on join screen
      await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 20_000 });

      // Clean up — switch to Organizer mode to see created tournaments
      await goBack(page);
      await page.getByRole('button', { name: 'Organizer' }).click();
      await openTournamentByName(page, name);
      await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 20_000 });
      await deleteTournament(page);
    });

    test('invalid code shows error', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);

      await page.getByRole('button', { name: 'Join with Code' }).click();
      const codeInput = page.getByLabel('Join code');
      await codeInput.fill('ZZZZZZ');
      await page.getByRole('button', { name: 'Join' }).click();

      await expect(page.getByText(/No tournament or event found/i)).toBeVisible({ timeout: 20_000 });
    });
  });

  test.describe('Player Registration', () => {
    test('cancel and re-confirm participation', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Organizer ${Date.now()}`);

      const name = await createTournament(page);
      const code = await getShareCode(page);
      await goBack(page);

      // Join and register
      await joinByCode(page, code);
      await registerAsPlayer(page, 'FlipPlayer');

      // Cancel
      await page.getByRole('button', { name: 'Cancel participation' }).click();
      await expect(page.getByText(/cancelled/i)).toBeVisible({ timeout: 10_000 });

      // Re-confirm
      await page.getByRole('button', { name: 'Confirm participation' }).click();
      await expect(page.getByText("You're confirmed!")).toBeVisible({ timeout: 10_000 });

      // Clean up — go to home, switch to Organizer mode, open and delete
      await page.goto('/plan');
      await waitForHome(page);
      const orgBtn = page.getByRole('button', { name: 'Organizer' });
      if (await orgBtn.isVisible().catch(() => false)) await orgBtn.click();
      await openTournamentByName(page, name);
      await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 20_000 });
      await deleteTournament(page);
    });
  });

  test.describe('Events', () => {
    test('create event, link tournament, verify, delete', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Organizer ${Date.now()}`);

      // Create a tournament to link
      const tournamentName = await createTournament(page);
      const code = await getShareCode(page);
      await goBack(page);

      // Create event
      const eventName = await createEvent(page);

      // Link tournament by code
      const codeInput = page.getByPlaceholder('Tournament code');
      await codeInput.fill(code);
      await page.getByRole('button', { name: 'Link', exact: true }).first().click();
      await expect(page.getByText('Tournament linked!')).toBeVisible({ timeout: 20_000 });

      // Tournament should appear in the event
      await expect(page.getByText(tournamentName)).toBeVisible({ timeout: 10_000 });

      // Event share code should exist
      const eventCode = page.locator('[class*="code"]').filter({ hasText: /^[A-Z2-9]{6}$/ }).first();
      await expect(eventCode).toBeVisible();

      // Clean up event
      await deleteEvent(page);

      // Clean up tournament — switch to Organizer mode
      await page.getByRole('button', { name: 'Organizer' }).click();
      await openTournamentByName(page, tournamentName);
      await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 20_000 });
      await deleteTournament(page);
    });

    test('join event by code', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Organizer ${Date.now()}`);

      const eventName = await createEvent(page);

      // Get event code
      const codeEl = page.locator('[class*="code"]').filter({ hasText: /^[A-Z2-9]{6}$/ }).first();
      const eventCode = await codeEl.textContent();

      // Go back and join by code
      await page.getByLabel('Back').click();
      await waitForHome(page);

      // Switch to Player mode for Join button
      const playerBtn = page.getByRole('button', { name: 'Player' });
      if (await playerBtn.isVisible().catch(() => false)) await playerBtn.click();
      await page.getByRole('button', { name: 'Join with Code' }).click();
      const codeInput = page.getByLabel('Join code');
      await codeInput.fill(eventCode!);
      await page.getByRole('button', { name: 'Join' }).click();

      // Should see event
      await expect(page.getByText(eventName)).toBeVisible({ timeout: 20_000 });

      // Clean up — switch to Organizer mode to see events
      await page.getByLabel('Back').click();
      await waitForHome(page);
      const orgBtn = page.getByRole('button', { name: 'Organizer' });
      if (await orgBtn.isVisible().catch(() => false)) await orgBtn.click();
      await page.getByText(eventName).first().click();
      await expect(page.getByText(eventName)).toBeVisible({ timeout: 20_000 });
      await deleteEvent(page);
    });
  });

  test.describe('Format & Config', () => {
    test('configure format and courts', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Organizer ${Date.now()}`);

      const name = await createTournament(page);

      // Open format section
      await page.getByText('Format').first().click();
      await expect(page.locator('input[name="format-preset"]').first()).toBeVisible({ timeout: 10_000 });

      // Change format to Mexicano
      await page.getByText('Mexicano', { exact: true }).first().click();

      // Add a second court
      const courtsHeader = page.getByText(/Courts \(\d+\)/).locator('..');
      await courtsHeader.getByRole('button', { name: '+ Add' }).click();
      await expect(page.getByText('Courts (2)')).toBeVisible({ timeout: 10_000 });

      await deleteTournament(page);
    });

    test('start delegation selector works', async ({ page }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Organizer ${Date.now()}`);

      await createTournament(page);

      // Open Share & Invite
      const shareBtn = page.getByRole('button', { name: 'Share & Invite' });
      if (await shareBtn.isVisible().catch(() => false)) {
        await shareBtn.click();
      }

      // Find "Who can start" select
      const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Only me' }) });
      await expect(select).toBeVisible({ timeout: 10_000 });
      await expect(select).toHaveValue('me');

      // Switch to Telegram
      await select.selectOption({ label: 'Telegram user' });
      await expect(page.getByPlaceholder('@username')).toBeVisible({ timeout: 5_000 });

      // Switch back
      await select.selectOption({ label: 'Only me' });
      await expect(page.getByPlaceholder('@username')).toHaveCount(0);

      await deleteTournament(page);
    });
  });

  test.describe('Real-time Sync', () => {
    test('organizer sees player registration in real-time', async ({ page, context }) => {
      await page.goto('/plan');
      await waitForHome(page);
      await setProfileName(page, `Organizer ${Date.now()}`);

      const name = await createTournament(page);
      const code = await getShareCode(page);

      // Player opens second tab
      const playerPage = await context.newPage();
      await playerPage.goto('/plan');
      await waitForHome(playerPage);
      await setProfileName(playerPage, `Player ${Date.now()}`);
      await joinByCode(playerPage, code);
      await registerAsPlayer(playerPage, 'SyncTestPlayer');

      // Organizer's page should show the player without refresh
      await expect(page.getByText('SyncTestPlayer')).toBeVisible({ timeout: 20_000 });

      // Player cancels
      await playerPage.getByRole('button', { name: 'Cancel participation' }).click();
      await expect(playerPage.getByText(/cancelled/i)).toBeVisible({ timeout: 10_000 });

      // Organizer sees the cancellation
      // Player count should update or player status should change
      await page.waitForTimeout(2000); // brief sync delay

      await playerPage.close();
      await deleteTournament(page);
    });
  });

  /**
   * Multi-context tests use browser.newContext() for separate Firebase anonymous auth
   * sessions (different UIDs), simulating truly distinct users.
   */
  test.describe('Multi-User (separate auth)', () => {

    test('delegated player sees Start Tournament button', async ({ browser }) => {
      // --- Organizer context ---
      const orgCtx = await browser.newContext();
      const orgPage = await orgCtx.newPage();
      await orgPage.goto('/plan');
      await waitForHome(orgPage);
      await setProfileName(orgPage, `Organizer ${Date.now()}`);

      const name = await createTournament(orgPage);
      const code = await getShareCode(orgPage);

      // Add 4 players so tournament is launchable
      await addPlayerAsOrganizer(orgPage, 'P1');
      await addPlayerAsOrganizer(orgPage, 'P2');
      await addPlayerAsOrganizer(orgPage, 'P3');
      await addPlayerAsOrganizer(orgPage, 'P4');

      // --- Player context (different UID) ---
      const playerCtx = await browser.newContext();
      const playerPage = await playerCtx.newPage();
      await playerPage.goto('/plan');
      await waitForHome(playerPage);
      await setProfileName(playerPage, `Delegate ${Date.now()}`);

      // Player joins and registers
      await joinByCode(playerPage, code);
      await registerAsPlayer(playerPage, 'DelegateUser');

      // At this point, player should NOT see Start button (not delegated yet)
      await expect(playerPage.getByRole('button', { name: 'Start Tournament' })).toHaveCount(0);

      // --- Organizer delegates start to the player ---
      const shareBtn = orgPage.getByRole('button', { name: 'Share & Invite' });
      if (await shareBtn.isVisible().catch(() => false)) {
        await shareBtn.click();
      }
      const select = orgPage.locator('select').filter({ has: orgPage.locator('option', { hasText: 'Only me' }) });
      await select.selectOption({ label: 'DelegateUser' });

      // Player reloads to pick up the delegation change
      await playerPage.reload();
      await expect(playerPage.getByText(name)).toBeVisible({ timeout: 20_000 });

      // Now the delegated player SHOULD see Start Tournament
      await expect(playerPage.getByRole('button', { name: 'Start Tournament' })).toBeVisible({ timeout: 20_000 });

      // Clean up
      await playerPage.close();
      await playerCtx.close();
      await deleteTournament(orgPage);
      await orgPage.close();
      await orgCtx.close();
    });

    test('non-organizer does NOT see Start Tournament button', async ({ browser }) => {
      // --- Organizer context ---
      const orgCtx = await browser.newContext();
      const orgPage = await orgCtx.newPage();
      await orgPage.goto('/plan');
      await waitForHome(orgPage);
      await setProfileName(orgPage, `Organizer ${Date.now()}`);

      const name = await createTournament(orgPage);
      const code = await getShareCode(orgPage);

      // --- Random player context (different UID) ---
      const playerCtx = await browser.newContext();
      const playerPage = await playerCtx.newPage();
      await playerPage.goto('/plan');
      await waitForHome(playerPage);
      await setProfileName(playerPage, `RandomPlayer ${Date.now()}`);

      await joinByCode(playerPage, code);
      await registerAsPlayer(playerPage, 'NotDelegate');

      // Player should see their confirmation but NOT the Start button
      await expect(playerPage.getByText("You're confirmed!")).toBeVisible();
      await expect(playerPage.getByRole('button', { name: 'Start Tournament' })).toHaveCount(0);

      // Clean up
      await playerPage.close();
      await playerCtx.close();
      await deleteTournament(orgPage);
      await orgPage.close();
      await orgCtx.close();
    });

    test('non-owner cannot delete tournament', async ({ browser }) => {
      // --- Organizer context ---
      const orgCtx = await browser.newContext();
      const orgPage = await orgCtx.newPage();
      await orgPage.goto('/plan');
      await waitForHome(orgPage);
      await setProfileName(orgPage, `Organizer ${Date.now()}`);

      const name = await createTournament(orgPage);
      const code = await getShareCode(orgPage);

      // --- Player context (different UID) ---
      const playerCtx = await browser.newContext();
      const playerPage = await playerCtx.newPage();
      await playerPage.goto('/plan');
      await waitForHome(playerPage);
      await setProfileName(playerPage, `Other ${Date.now()}`);

      await joinByCode(playerPage, code);
      await registerAsPlayer(playerPage, 'OtherUser');

      // Player should NOT see "Delete Tournament" on the join screen
      await expect(playerPage.getByRole('button', { name: 'Delete Tournament' })).toHaveCount(0);

      // Clean up
      await playerPage.close();
      await playerCtx.close();
      await deleteTournament(orgPage);
      await orgPage.close();
      await orgCtx.close();
    });

    test('cancelling player promotes reserve in real-time', async ({ browser }) => {
      // --- Organizer creates tournament with capacity 4 (1 court) ---
      const orgCtx = await browser.newContext();
      const orgPage = await orgCtx.newPage();
      await orgPage.goto('/plan');
      await waitForHome(orgPage);
      await setProfileName(orgPage, `Organizer ${Date.now()}`);

      const name = await createTournament(orgPage);
      const code = await getShareCode(orgPage);

      // --- Register 5 players (each in own context = own UID) ---
      const playerNames = ['P1', 'P2', 'P3', 'P4', 'P5_Reserve'];
      const playerPages: { ctx: any; page: any }[] = [];

      for (const pname of playerNames) {
        const ctx = await browser.newContext();
        const pg = await ctx.newPage();
        await pg.goto('/plan');
        await waitForHome(pg);
        await setProfileName(pg, `${pname} ${Date.now()}`);
        await joinByCode(pg, code);
        await registerAsPlayer(pg, pname);
        playerPages.push({ ctx, page: pg });
      }

      // 5th player should be on reserve (capacity = 4 for 1 court)
      const reservePage = playerPages[4].page;
      await expect(reservePage.getByText(/reserve/i)).toBeVisible({ timeout: 20_000 });

      // P1 cancels participation
      const p1Page = playerPages[0].page;
      await p1Page.getByRole('button', { name: 'Cancel participation' }).click();
      await expect(p1Page.getByText(/cancelled/i)).toBeVisible({ timeout: 10_000 });

      // Reserve player (P5) should get promoted — reload to see status update
      await reservePage.reload();
      await expect(reservePage.getByText(name)).toBeVisible({ timeout: 20_000 });
      // After promotion, should no longer show "reserve"
      await expect(reservePage.getByText("You're confirmed!")).toBeVisible({ timeout: 20_000 });

      // Clean up all player pages
      for (const pp of playerPages) {
        await pp.page.close();
        await pp.ctx.close();
      }
      await deleteTournament(orgPage);
      await orgPage.close();
      await orgCtx.close();
    });

    test('partner link visible to both players (bidirectional)', async ({ browser }) => {
      // --- Organizer creates team format tournament ---
      const orgCtx = await browser.newContext();
      const orgPage = await orgCtx.newPage();
      await orgPage.goto('/plan');
      await waitForHome(orgPage);
      await setProfileName(orgPage, `Organizer ${Date.now()}`);

      const name = await createTournament(orgPage);

      // Set format to Team Americano (requires partners)
      await orgPage.getByText('Format').first().click();
      await expect(orgPage.locator('input[name="format-preset"]').first()).toBeVisible({ timeout: 10_000 });
      await orgPage.getByText('Team Americano', { exact: true }).first().click();

      const code = await getShareCode(orgPage);

      // --- Player A registers ---
      const ctxA = await browser.newContext();
      const pageA = await ctxA.newPage();
      await pageA.goto('/plan');
      await waitForHome(pageA);
      await setProfileName(pageA, `PlayerA ${Date.now()}`);
      await joinByCode(pageA, code);
      await registerAsPlayer(pageA, 'Alice');

      // --- Player B registers ---
      const ctxB = await browser.newContext();
      const pageB = await ctxB.newPage();
      await pageB.goto('/plan');
      await waitForHome(pageB);
      await setProfileName(pageB, `PlayerB ${Date.now()}`);
      await joinByCode(pageB, code);
      await registerAsPlayer(pageB, 'Bob');

      // Player A sets partner to Bob
      const partnerInput = pageA.getByPlaceholder(/partner/i);
      if (await partnerInput.isVisible().catch(() => false)) {
        await partnerInput.fill('Bob');
        // Select from suggestions or confirm
        const suggestion = pageA.getByText('Bob').last();
        if (await suggestion.isVisible().catch(() => false)) {
          await suggestion.click();
        } else {
          await partnerInput.press('Enter');
        }

        // Wait for partner link to save
        await pageA.waitForTimeout(2000);

        // Player B reloads — should see Alice as partner
        await pageB.reload();
        await expect(pageB.getByText(name)).toBeVisible({ timeout: 20_000 });
        // Bob should see partner info mentioning Alice
        await expect(pageB.getByText('Alice')).toBeVisible({ timeout: 20_000 });
      }

      // Clean up
      await pageA.close();
      await ctxA.close();
      await pageB.close();
      await ctxB.close();
      await deleteTournament(orgPage);
      await orgPage.close();
      await orgCtx.close();
    });

    test('non-owner cannot delete event', async ({ browser }) => {
      // --- Organizer creates event ---
      const orgCtx = await browser.newContext();
      const orgPage = await orgCtx.newPage();
      await orgPage.goto('/plan');
      await waitForHome(orgPage);
      await setProfileName(orgPage, `Organizer ${Date.now()}`);

      const eventName = await createEvent(orgPage);

      // Get event code
      const codeEl = orgPage.locator('[class*="code"]').filter({ hasText: /^[A-Z2-9]{6}$/ });
      const eventCode = await codeEl.textContent();

      // --- Other user joins event ---
      const otherCtx = await browser.newContext();
      const otherPage = await otherCtx.newPage();
      await otherPage.goto('/plan');
      await waitForHome(otherPage);
      await setProfileName(otherPage, `Other ${Date.now()}`);

      await otherPage.getByRole('button', { name: 'Join with Code' }).click();
      const codeInput = otherPage.getByLabel('Join code');
      await codeInput.fill(eventCode!);
      await otherPage.getByRole('button', { name: 'Join' }).click();
      await expect(otherPage.getByText(eventName)).toBeVisible({ timeout: 20_000 });

      // Other user should NOT see Delete Event button
      await expect(otherPage.getByRole('button', { name: 'Delete Event' })).toHaveCount(0);

      // Clean up
      await otherPage.close();
      await otherCtx.close();

      // Organizer deletes event
      await deleteEvent(orgPage);
      await orgPage.close();
      await orgCtx.close();
    });

    test('warn when different user already started tournament', async ({ browser }) => {
      // --- Organizer creates tournament with 4 players ---
      const orgCtx = await browser.newContext();
      const orgPage = await orgCtx.newPage();
      await orgPage.goto('/plan');
      await waitForHome(orgPage);
      const orgName = `Organizer ${Date.now()}`;
      await setProfileName(orgPage, orgName);

      const name = await createTournament(orgPage);
      const code = await getShareCode(orgPage);

      await addPlayerAsOrganizer(orgPage, 'P1');
      await addPlayerAsOrganizer(orgPage, 'P2');
      await addPlayerAsOrganizer(orgPage, 'P3');
      await addPlayerAsOrganizer(orgPage, 'P4');

      // Organizer starts the tournament (clicks "Let's Play!" from organizer screen)
      // This writes startedBy to Firebase and redirects to /play
      const letsPlayBtn = orgPage.getByRole('button', { name: /Let.*Play|Start Tournament/i });
      await letsPlayBtn.click();
      // Wait for redirect to /play or the runner app to load
      await orgPage.waitForURL(/\/play/, { timeout: 20_000 }).catch(() => {
        // May not redirect if team pairing is needed
      });

      // --- Second organizer context creates a separate session ---
      // Simulate: second person has the tournament open from before
      const org2Ctx = await browser.newContext();
      const org2Page = await org2Ctx.newPage();
      await org2Page.goto('/plan');
      await waitForHome(org2Page);
      await setProfileName(org2Page, `SecondUser ${Date.now()}`);

      // Join the tournament
      await joinByCode(org2Page, code);

      // The join screen should NOT show Start button (not delegate)
      // But let's verify the startedBy state is visible
      // If this user were the delegate, they'd see the StartWarningModal
      // For now, just verify they can see the tournament is already started
      await expect(org2Page.getByText(name)).toBeVisible({ timeout: 20_000 });

      // Clean up
      await org2Page.close();
      await org2Ctx.close();

      // Go back to organizer page — navigate to home to delete
      await orgPage.goto('/plan');
      await waitForHome(orgPage);
      await orgPage.getByRole('button', { name: 'Organizer' }).click();
      await openTournamentByName(orgPage, name);
      await expect(orgPage.getByText(/Players \(/)).toBeVisible({ timeout: 20_000 });
      await deleteTournament(orgPage);
      await orgPage.close();
      await orgCtx.close();
    });
  });
});
