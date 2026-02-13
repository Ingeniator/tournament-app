import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addPlayer,
  addFourPlayers,
  generateSchedule,
  navigateToTab,
  scoreAllMatches,
} from './helpers';

test.describe('Tournament Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
  });

  test('home screen renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Play' })).toBeVisible();
  });

  test('create tournament and add players', async ({ page }) => {
    await createTournament(page);
    await addFourPlayers(page);

    // Verify player count in setup footer
    await expect(page.getByText('4 player(s) added')).toBeVisible();

    // Verify each player name appears
    for (const name of ['Alice', 'Bob', 'Charlie', 'Diana']) {
      await expect(page.getByText(name)).toBeVisible();
    }
  });

  test('validation blocks schedule with fewer than 4 players', async ({ page }) => {
    await createTournament(page);
    await addPlayer(page, 'Alice');
    await addPlayer(page, 'Bob');
    await addPlayer(page, 'Charlie');

    // Generate Schedule button should be disabled
    await expect(page.getByRole('button', { name: 'Generate Schedule' })).toBeDisabled();
  });

  test('score matches and complete tournament', async ({ page }) => {
    await createTournament(page);
    await addFourPlayers(page);
    await generateSchedule(page);

    // Navigate to the Play tab
    await navigateToTab(page, 'Play');

    // We should see Round 1 heading
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    // Score all matches across all rounds
    await scoreAllMatches(page);

    // All rounds should be scored — "Finish Tournament" should be visible
    await expect(page.getByRole('button', { name: 'Finish Tournament' })).toBeVisible();

    // Accept the confirm dialog and finish
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Finish Tournament' }).click();

    // Should see completed state with share button
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });

  test('persists tournament across reload', async ({ page }) => {
    await createTournament(page);
    await addFourPlayers(page);
    await generateSchedule(page);

    // Navigate to Play tab and verify Round 1 heading visible
    await navigateToTab(page, 'Play');
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    // Reload the page
    await page.reload();

    // The tournament should still be there — the app restores from localStorage.
    // After reload the active tab (Play) is restored so Round 1 heading reappears.
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
