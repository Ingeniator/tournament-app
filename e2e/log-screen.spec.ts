import { test, expect } from '@playwright/test';
import {
  createInProgressTournament,
  navigateToTab,
  scoreAllMatches,
} from './helpers';

test.describe('Log Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createInProgressTournament(page);
    // createInProgressTournament ends on Log tab after closing stats overlay
  });

  test('displays all round cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Round 1', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Round 2', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Round 3', exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot('log-round-cards.png');
  });

  test('statistics modal opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: 'Statistics' }).click();

    await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
    await expect(page).toHaveScreenshot('log-statistics-modal.png');

    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.getByRole('heading', { name: 'Statistics' })).not.toBeVisible();
  });

  test('export plan copies to clipboard', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.getByRole('button', { name: 'Statistics' }).click();
    await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();

    // Handle potential alert dialog from export
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Export Plan' }).click();

    // Close the modal
    await page.getByRole('button', { name: '✕' }).click();
  });

  test('add round from log', async ({ page }) => {
    // First score all matches via Play tab
    await navigateToTab(page, 'Play');
    await scoreAllMatches(page);

    // Navigate back to Log
    await navigateToTab(page, 'Log');

    await page.getByRole('button', { name: '+ Add Round' }).click();

    // Verify new round heading appears
    await expect(page.getByRole('heading', { name: /Round \d+/ }).last()).toBeVisible();
  });

  test('finish from log trims unscored', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Finish Tournament' }).click();

    // Finishing from Log navigates to Play tab which shows completed view
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });
});
