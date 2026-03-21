import { test, expect } from '@playwright/test';
import {
  createTournament,
  scoreAllMatches,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

const MIXICANO_PLAYERS = [
  { id: 'p1', name: 'Alice', group: 'A' },
  { id: 'p2', name: 'Bob', group: 'A' },
  { id: 'p3', name: 'Charlie', group: 'A' },
  { id: 'p4', name: 'Diana', group: 'A' },
  { id: 'p5', name: 'Eve', group: 'B' },
  { id: 'p6', name: 'Frank', group: 'B' },
  { id: 'p7', name: 'Grace', group: 'B' },
  { id: 'p8', name: 'Henry', group: 'B' },
];

test.describe('Mixicano Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTournament(page, {
      format: 'mixicano',
      players: MIXICANO_PLAYERS,
    });
  });

  test('full lifecycle: score all rounds → finish', async ({ page }) => {
    // Mixicano is dynamic — score all rounds
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
    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    // Verify standings table has entries
    const cells = page.getByRole('cell');
    await expect(cells.first()).toBeVisible();
  });

  test('dynamic round generation after scoring', async ({ page }) => {
    // With 8 players on 1 court, there are 2 matches per round (4 players play, 4 sit out)
    // Score each match individually until round 1 is complete
    await scoreMatch(page);
    await dismissInterstitial(page);

    // Score second match if there is one
    const hasDash = await page.getByRole('button', { name: '–' }).first().isVisible().catch(() => false);
    if (hasDash) {
      await scoreMatch(page);
      await dismissInterstitial(page);
    }

    // Round 2 should auto-generate
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible({ timeout: 10000 });
  });

  test('persists across reload', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
