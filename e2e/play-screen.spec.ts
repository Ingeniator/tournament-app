import { test, expect } from '@playwright/test';
import {
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

  test('new button resets tournament', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'New' }).click();

    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
  });
});
