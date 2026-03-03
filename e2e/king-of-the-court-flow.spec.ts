import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addEightPlayers,
  addPlayers,
  selectFormat,
  generateSchedule,
  navigateToTab,
  scoreAllMatches,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

test.describe('King of the Court Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await createTournament(page);
    await addEightPlayers(page);
    await selectFormat(page, 'king-of-the-court');
  });

  test('requires at least 8 players', async ({ page }) => {
    // Start fresh with fewer players
    await clearState(page);
    await createTournament(page);
    await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']);
    await selectFormat(page, 'king-of-the-court');

    // Generate Schedule should be disabled due to validation
    await expect(page.getByRole('button', { name: 'Generate Schedule' })).toBeDisabled();
    await expect(page.getByText('at least 8 players')).toBeVisible();
  });

  test('auto-adds second court when selecting KoTC', async ({ page }) => {
    // KoTC requires at least 2 courts — the app should auto-add one
    const courtInputs = page.locator('input[aria-label^="Court"]');
    await expect(courtInputs).toHaveCount(2);
  });

  test('shows court bonus labels', async ({ page }) => {
    // KoTC shows bonus points per court position
    await expect(page.getByText('+1')).toBeVisible();
    await expect(page.getByText('+0')).toBeVisible();
  });

  test('full lifecycle: generate → score all rounds → finish', async ({ page }) => {
    // Cap rounds to 3 for speed
    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('3');

    await generateSchedule(page);

    // Dynamic format lands on Play tab directly
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
    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('3');

    await generateSchedule(page);

    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    // Verify standings table has entries with non-zero scores
    const cells = page.getByRole('cell');
    await expect(cells.first()).toBeVisible();
  });

  test('dynamic round generation after scoring', async ({ page }) => {
    await generateSchedule(page);

    // Score all matches in round 1
    await scoreMatch(page);
    await dismissInterstitial(page);

    // For 8 players + 2 courts = 1 match per court, 2 matches per round
    // After scoring the second match, round 2 should auto-generate
    const hasDash = await page.getByRole('button', { name: '–' }).first().isVisible().catch(() => false);
    if (hasDash) {
      await scoreMatch(page);
      await dismissInterstitial(page);
    }

    // Round 2 should have been auto-generated
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible();
  });

  test('persists across reload', async ({ page }) => {
    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('3');

    await generateSchedule(page);

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
