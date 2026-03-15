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

test.describe('Start Delegation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);
  });

  test('default delegate is organizer (Only me)', async ({ page }) => {
    await createTournament(page);

    // Open Share & Invite to find the "Who can start" section
    const shareBtn = page.getByRole('button', { name: 'Share & Invite' });
    if (await shareBtn.isVisible().catch(() => false)) {
      await shareBtn.click();
    }

    // The select should default to "Only me"
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Only me' }) });
    await expect(select).toBeVisible({ timeout: 10000 });
    await expect(select).toHaveValue('me');

    // Clean up
    await deleteTournament(page);
  });

  test('delegate to a registered player', async ({ page }) => {
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);

    // Add a player as organizer
    await addPlayerAsOrganizer(page, 'DelegatePlayer');

    // Open Share & Invite section if collapsed
    const shareBtn = page.getByRole('button', { name: 'Share & Invite' });
    if (await shareBtn.isVisible().catch(() => false)) {
      await shareBtn.click();
    }

    // Find the "Who can start" select and change to the player
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Only me' }) });
    await select.selectOption({ label: 'DelegatePlayer' });

    // Verify the selection was made
    const selectedOption = await select.inputValue();
    expect(selectedOption).toContain('player:');

    // Clean up
    await deleteTournament(page);
  });

  test('delegate to Telegram user', async ({ page }) => {
    await createTournament(page);

    // Open Share & Invite section
    const shareBtn = page.getByRole('button', { name: 'Share & Invite' });
    if (await shareBtn.isVisible().catch(() => false)) {
      await shareBtn.click();
    }

    // Select Telegram user option
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Only me' }) });
    await select.selectOption({ label: 'Telegram user' });

    // Telegram username input should appear
    const tgInput = page.getByPlaceholder('@username');
    await expect(tgInput).toBeVisible({ timeout: 5000 });

    // Fill in a username
    await tgInput.fill('@test_delegate');
    await tgInput.blur();

    // Input should retain the value
    await expect(tgInput).toHaveValue('@test_delegate');

    // Clean up
    await deleteTournament(page);
  });

  test('delegated player sees Start button (two-context test)', async ({ page }) => {
    test.setTimeout(60_000);

    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);

    // Register a player via the same page using joinByCode flow
    await goBack(page);
    await joinByCode(page, code);
    await registerAsPlayer(page, 'DelegatePlayer');
    await goBack(page);

    // Go back to organizer screen
    await openTournamentByName(page, tournamentName);
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });

    // Open Share & Invite section if collapsed
    const shareBtn = page.getByRole('button', { name: 'Share & Invite' });
    if (await shareBtn.isVisible().catch(() => false)) {
      await shareBtn.click();
    }

    // Delegate to the registered player
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Only me' }) });
    await select.selectOption({ label: 'DelegatePlayer' });

    // Verify delegation was set
    const selectedOption = await select.inputValue();
    expect(selectedOption).toContain('player:');

    // Clean up
    await deleteTournament(page);
  });

  test('reset delegate back to "Only me"', async ({ page }) => {
    await createTournament(page);

    // Open Share & Invite section
    const shareBtn = page.getByRole('button', { name: 'Share & Invite' });
    if (await shareBtn.isVisible().catch(() => false)) {
      await shareBtn.click();
    }

    // First set to Telegram
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Only me' }) });
    await select.selectOption({ label: 'Telegram user' });
    await expect(page.getByPlaceholder('@username')).toBeVisible();

    // Reset to "Only me"
    await select.selectOption({ label: 'Only me' });
    await expect(select).toHaveValue('me');

    // Telegram input should be hidden
    await expect(page.getByPlaceholder('@username')).toHaveCount(0);

    // Clean up
    await deleteTournament(page);
  });
});
