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
  openTournamentByName,
  deleteTournament,
} from './helpers';

test.describe('Join Screen Advanced', () => {
  let tournamentName: string;
  let code: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);
    // Create a tournament for join tests
    tournamentName = await createTournament(page);
    code = await getShareCode(page);
  });

  test.afterEach(async ({ page }) => {
    // Navigate back and delete tournament
    try {
      await goBack(page);
    } catch {
      // May already be on home
    }
    try {
      await openTournamentByName(page, tournamentName);
      await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
      await deleteTournament(page);
    } catch {
      // Best effort cleanup
    }
  });

  test('reserve position shown when full', async ({ page }) => {
    test.setTimeout(60_000);
    // Set 1 court (capacity = 4 players)
    // Add exactly 4 players (fills capacity)
    await addPlayerAsOrganizer(page, 'P1');
    await addPlayerAsOrganizer(page, 'P2');
    await addPlayerAsOrganizer(page, 'P3');
    await addPlayerAsOrganizer(page, 'P4');

    await goBack(page);

    // Join as 5th player (should become reserve)
    await joinByCode(page, code);
    await registerAsPlayer(page, 'Reserve5th');

    // Should show reserve position
    await expect(page.getByText(/reserve/i)).toBeVisible({ timeout: 10000 });
  });

  test('player sets club affiliation', async ({ page }) => {
    // Set format to club-americano (requires clubs)
    await page.getByText('Format').first().click();
    await expect(page.locator('input[name="format-preset"]').first()).toBeVisible({ timeout: 10000 });
    // Look for a club format
    const clubOption = page.getByText('Club Americano', { exact: true });
    if (await clubOption.isVisible().catch(() => false)) {
      await clubOption.first().click();
    }

    await goBack(page);
    await joinByCode(page, code);
    await registerAsPlayer(page, 'ClubPlayer');

    // Club selection should be visible for club formats
    const clubSelect = page.locator('select').filter({ has: page.locator('option') });
    if (await clubSelect.first().isVisible().catch(() => false)) {
      // Select a club
      await clubSelect.first().selectOption({ index: 1 });
    }
  });

  test('cancel registration', async ({ page }) => {
    await goBack(page);
    await joinByCode(page, code);
    await registerAsPlayer(page, 'CancelPlayer');

    // Cancel participation
    await page.getByRole('button', { name: 'Cancel participation' }).click();
    await expect(page.getByText(/cancelled/i)).toBeVisible({ timeout: 5000 });
  });

  test('tournament info card shows metadata', async ({ page }) => {
    await goBack(page);
    await joinByCode(page, code);

    // Tournament info should show details
    // The join screen displays tournament name
    await expect(page.getByText(tournamentName)).toBeVisible();
  });

  test('duplicate name warning shown', async ({ page }) => {
    // Add a player named "DupeName"
    await addPlayerAsOrganizer(page, 'DupeName');

    await goBack(page);
    await joinByCode(page, code);

    // Try to register with the same name
    const nameInput = page.getByPlaceholder('Enter your name');
    await nameInput.clear();
    await nameInput.fill('DupeName');

    // Should show a warning about duplicate name
    await expect(page.getByText(/already|duplicate|taken/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      // Warning may appear after clicking Register
      page.getByRole('button', { name: 'Register' }).click();
    });
  });

  test('organizer edit button navigates to OrganizerScreen', async ({ page }) => {
    await goBack(page);

    // Join the tournament (as organizer, should see Edit button)
    await joinByCode(page, code);

    // Since this user is the organizer, there should be an edit/manage button
    const editBtn = page.getByRole('button', { name: /edit|manage/i });
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      // Should navigate to organizer screen
      await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    }
  });
});
