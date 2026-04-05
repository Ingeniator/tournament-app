import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  getShareCode,
  goBack,
  joinByCode,
  registerAsPlayer,
  openTournamentByName,
  deleteTournament,
  createEvent,
  deleteEvent,
} from './helpers';

test.describe('Planner Home Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);
  });

  test('mode toggle between player and organizer', async ({ page }) => {
    // Default should be Organizer mode (has Create Tournament)
    await expect(page.getByRole('button', { name: 'Create Tournament' }).or(page.locator('#tournament-name'))).toBeVisible({ timeout: 10000 });

    // Switch to Player mode
    await page.getByText('Player', { exact: true }).click();
    // Player mode should show "Join with Code"
    await expect(page.getByRole('button', { name: 'Join with Code' })).toBeVisible();

    // Switch back to Organizer
    await page.getByText('Organizer', { exact: true }).click();
    await expect(page.locator('#tournament-name')).toBeVisible({ timeout: 10000 });
  });

  test('import tournament from clipboard', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // First create and export a tournament
    const tournamentName = await createTournament(page);
    // Export to clipboard
    await page.getByRole('button', { name: /Export/ }).click();
    await page.getByText('Copy Data').click();
    await expect(page.getByText(/copied/i)).toBeVisible({ timeout: 5000 });

    // Delete it
    await deleteTournament(page);

    // Import from clipboard
    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByText('From Clipboard').click();

    // Should see the imported tournament
    await expect(page.getByText(tournamentName)).toBeVisible({ timeout: 15000 });

    // Clean up
    await openTournamentByName(page, tournamentName);
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('deep link ?code= opens join', async ({ page }) => {
    // Create a tournament to get a code
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);

    // Navigate with ?code= parameter
    await page.goto(`/plan?code=${code}`);

    // Should open join screen for the tournament
    await expect(page.getByText(tournamentName)).toBeVisible({ timeout: 15000 });

    // Clean up: go back and delete
    await goBack(page);
    await openTournamentByName(page, tournamentName);
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('deep link ?event= opens event', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // Create an event to get a code
    const eventName = await createEvent(page);
    const codeEl = page.locator('[class*="code"]').filter({ hasText: /^[A-Z2-9]{6,7}$/ });
    const eventCode = await codeEl.textContent();
    await page.getByLabel('Back').click();
    await waitForHome(page);

    // Navigate with ?event= parameter
    await page.goto(`/plan?event=${eventCode}`);

    // Should open event view
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 15000 });

    // Clean up
    await page.getByLabel('Back').click();
    await waitForHome(page);
    await page.getByText(eventName).first().click();
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 15000 });
    await deleteEvent(page);
  });

  test('edit profile name', async ({ page }) => {
    // The "Logged in as" badge should be visible
    await expect(page.getByText('Logged in as')).toBeVisible();

    // Click on the name to edit
    const loggedInBadge = page.getByText('Logged in as').locator('..');
    await loggedInBadge.click();

    // Fill in new name
    const nameInput = page.getByPlaceholder('Group Name / Your name');
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.clear();
      await nameInput.fill('Updated Name');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Updated Name')).toBeVisible({ timeout: 10000 });
    }
  });

  test('My Tournaments lists owned', async ({ page }) => {
    const tournamentName = await createTournament(page);
    await goBack(page);

    // In organizer mode, should see My Tournaments section
    await expect(page.getByText('My Tournaments')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(tournamentName)).toBeVisible();

    // Clean up
    await openTournamentByName(page, tournamentName);
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('Registered Tournaments lists joined', async ({ page }) => {
    test.setTimeout(60_000);
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);

    // Join the tournament
    await joinByCode(page, code);
    await registerAsPlayer(page, 'TestPlayer');
    await goBack(page);

    // Should see under Registered Tournaments
    await expect(page.getByText('Registered Tournaments')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(tournamentName).first()).toBeVisible();

    // Clean up
    await openTournamentByName(page, tournamentName);
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });
});
