import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addFourPlayers,
  selectFormat,
  generateSchedule,
  navigateToTab,
  scoreAllMatches,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

test.describe('Mexicano Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await createTournament(page);
    await addFourPlayers(page);
    await selectFormat(page, 'mexicano');
    // Verify format was actually changed — the Mexicano preset row should be selected
    await expect(page.locator('input[name="format-preset"]:checked')).toBeVisible();
  });

  test('full lifecycle: generate → score all rounds → finish', async ({ page }) => {
    await generateSchedule(page);
    await navigateToTab(page, 'Play');

    // Mexicano auto-generates the next round when all matches are scored,
    // so scoreAllMatches handles the full tournament progression.
    await scoreAllMatches(page);

    // Finish
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Finish Tournament' }).click();

    // Skip ceremony screen if it appears
    const skipBtn = page.getByRole('button', { name: 'Skip' });
    try {
      await skipBtn.waitFor({ timeout: 3000 });
      await skipBtn.click();
    } catch {
      // No ceremony screen
    }

    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });

  test('standings update after scoring', async ({ page }) => {
    await generateSchedule(page);
    await navigateToTab(page, 'Play');

    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    // Verify a scored value is visible in the standings table
    await expect(page.getByRole('cell', { name: '15' }).first()).toBeVisible();
    await expect(page).toHaveScreenshot('mexicano-standings.png');
  });

  test('dynamic round generation after scoring', async ({ page }) => {
    await generateSchedule(page);
    await navigateToTab(page, 'Play');

    // Score the single match in round 1 — Mexicano auto-generates the next round
    await scoreMatch(page);
    await dismissInterstitial(page);

    // Round 2 should have been auto-generated
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible();
  });
});
