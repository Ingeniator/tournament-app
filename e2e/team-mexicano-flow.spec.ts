import { test, expect } from '@playwright/test';
import {
  createTeamMexicanoSetup,
  closeOverlay,
  navigateToTab,
  scoreAllMatches,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

test.describe('Team Mexicano Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTeamMexicanoSetup(page);
  });

  test('full lifecycle: setup → score → complete', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Tournament' }).click();
    try { await closeOverlay(page); } catch { /* no overlay */ }

    // Team Mexicano is dynamic — lands on Play tab
    await scoreAllMatches(page);

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

  test('standings show team names', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Tournament' }).click();
    try { await closeOverlay(page); } catch { /* no overlay */ }

    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    // The standings table should have team entries visible
    const cells = page.getByRole('cell');
    await expect(cells.first()).toBeVisible();
  });

  test('dynamic round generation after scoring', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Tournament' }).click();
    try { await closeOverlay(page); } catch { /* no overlay */ }

    // Score all matches in round 1 — Team Mexicano auto-generates next round
    await scoreMatch(page);
    await dismissInterstitial(page);

    // With 3 teams on 1 court, there's 1 match per round
    // After scoring it, round 2 should auto-generate
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible();
  });

  test('custom team names in standings', async ({ page }) => {
    // Rename first team
    const firstTeamInput = page.locator('[class*="teamNameInput"]').first();
    await firstTeamInput.fill('Los Lobos');

    await page.getByRole('button', { name: 'Start Tournament' }).click();
    try { await closeOverlay(page); } catch { /* no overlay */ }

    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    await expect(page.getByText('Los Lobos')).toBeVisible();
  });

  test('persists across reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Tournament' }).click();
    try { await closeOverlay(page); } catch { /* no overlay */ }

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
