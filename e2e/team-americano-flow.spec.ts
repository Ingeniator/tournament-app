import { test, expect } from '@playwright/test';
import {
  createTeamAmericanoSetup,
  closeOverlay,
  navigateToTab,
  scoreAllMatches,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

test.describe('Team Americano Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTeamAmericanoSetup(page);
  });

  test('full lifecycle: setup → score → complete', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Tournament' }).click();
    await closeOverlay(page);

    await navigateToTab(page, 'Play');
    await scoreAllMatches(page);

    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Finish Tournament' }).click();

    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });

  test('standings show custom team names', async ({ page }) => {
    // Fill the first team name input (placeholder is dynamic player names)
    const firstTeamInput = page.locator('[class*="teamNameInput"]').first();
    await firstTeamInput.fill('The Aces');

    await page.getByRole('button', { name: 'Start Tournament' }).click();
    await closeOverlay(page);

    await navigateToTab(page, 'Play');
    await page.getByRole('button', { name: 'Standings' }).click();

    await expect(page.getByText('The Aces')).toBeVisible();
    await expect(page).toHaveScreenshot('team-americano-standings.png');
  });

  test('scoring updates standings', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Tournament' }).click();
    await closeOverlay(page);

    await navigateToTab(page, 'Play');
    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    // At least one team should have points > 0 in the standings table
    await expect(page.getByRole('cell', { name: '15' }).first()).toBeVisible();
    await expect(page).toHaveScreenshot('team-americano-scored-standings.png');
  });

  test('persists across reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Tournament' }).click();
    await closeOverlay(page);

    await navigateToTab(page, 'Play');
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
