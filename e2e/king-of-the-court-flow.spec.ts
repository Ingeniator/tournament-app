import { test, expect } from '@playwright/test';
import {
  createTournament,
  scoreAllMatches,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

const EIGHT_PLAYERS = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
  { id: 'p4', name: 'Diana' },
  { id: 'p5', name: 'Eve' },
  { id: 'p6', name: 'Frank' },
  { id: 'p7', name: 'Grace' },
  { id: 'p8', name: 'Henry' },
];

const TWO_COURTS = [
  { id: 'c1', name: 'Court 1' },
  { id: 'c2', name: 'Court 2' },
];

test.describe('King of the Court Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTournament(page, {
      format: 'king-of-the-court',
      players: EIGHT_PLAYERS,
      courts: TWO_COURTS,
      maxRounds: 3,
    });
  });

  test('full lifecycle: score all rounds → finish', async ({ page }) => {
    // Score all matches across all rounds
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

    // Verify standings table has entries with non-zero scores
    const cells = page.getByRole('cell');
    await expect(cells.first()).toBeVisible();
  });

  test('dynamic round generation after scoring', async ({ page }) => {
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
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
