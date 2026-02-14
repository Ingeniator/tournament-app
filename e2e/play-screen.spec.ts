import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addPlayers,
  generateSchedule,
  createInProgressTournament,
  navigateToTab,
  scoreMatch,
  scoreAllMatches,
  dismissInterstitial,
} from './helpers';

test.describe('Play Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createInProgressTournament(page);
    await navigateToTab(page, 'Play');
  });

  test('standings modal opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: 'Standings' }).click();

    await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.getByRole('heading', { name: 'Standings' })).not.toBeVisible();
  });

  test('score picker shows cancel', async ({ page }) => {
    // Click the first "–" button to open the picker
    const dashBtn = page.getByRole('button', { name: '–' }).first();
    await dashBtn.click();

    // The picker grid should appear with a Cancel button
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // The dash button should still be there (score unchanged)
    await expect(page.getByRole('button', { name: '–' }).first()).toBeVisible();
  });

  test('progress line updates on scoring', async ({ page }) => {
    // Verify initial progress shows 0 matches scored
    await expect(page.getByText(/0\/\d+ matches/)).toBeVisible();

    // Score one match
    await scoreMatch(page);
    await dismissInterstitial(page);

    // Progress text should now show at least 1 match scored
    await expect(page.getByText(/[1-9]\d*\/\d+ matches/)).toBeVisible();
  });

  test('add round after all scored', async ({ page }) => {
    await scoreAllMatches(page);

    await expect(page.getByText('All rounds scored!')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Round' })).toBeVisible();

    await page.getByRole('button', { name: '+ Add Round' }).click();

    // A new round should appear
    await expect(page.getByRole('heading', { name: /Round \d+/ }).last()).toBeVisible();
  });

  test('finish tournament completes', async ({ page }) => {
    await scoreAllMatches(page);

    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Finish Tournament' }).click();

    // Completed state shows "Share Results as Text"
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });

  test('clear button resets scored match', async ({ page }) => {
    // Need multiple matches per round so a scored match stays in the active round.
    // Create a fresh 8-player tournament with 2 courts (2 matches per round).
    await clearState(page);
    await createTournament(page);
    await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']);
    await page.getByRole('button', { name: '+ Add court' }).click();
    await generateSchedule(page);
    await navigateToTab(page, 'Play');

    // Score one match — the round still has another unscored match so it stays active
    await scoreMatch(page, 15);

    // The scored match's ScoreInput shows "15" and "9" buttons (round still active)
    // Click "15" to open the picker grid with Clear button
    await page.getByRole('button', { name: '15' }).first().click();

    // Click Clear to reset the score
    await page.getByRole('button', { name: 'Clear' }).click();

    // Verify "–" reappears — all 4 "–" buttons restored (2 per match × 2 matches)
    await expect(page.getByRole('button', { name: '–' })).toHaveCount(4);
  });

  test('varied scores display correctly', async ({ page }) => {
    await scoreMatch(page, 20);
    await dismissInterstitial(page);

    // After scoring, round 1 goes to compact preview showing "20:4"
    await expect(page.getByText('20:4')).toBeVisible();
  });

  test('new button resets tournament', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'New' }).click();

    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
  });
});
