import { test, expect } from '@playwright/test';
import {
  createCompletedTournament,
  navigateToTab,
} from './helpers';

test.describe('Completed Tournament', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createCompletedTournament(page);
  });

  test('shows final standings table', async ({ page }) => {
    // Completed view should show standings with column headers
    await expect(page.getByRole('columnheader', { name: '#' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Pts' }).first()).toBeVisible();
  });

  test('shows share buttons', async ({ page }) => {
    // The completed view should have sharing options
    await expect(page.getByRole('button', { name: 'Share Results as Image' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });

  test('round results expandable', async ({ page }) => {
    const summary = page.locator('summary', { hasText: 'Round Results' });
    await summary.click();

    await expect(page.getByText('Round 1')).toBeVisible();
  });

  test('share results as text', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.getByRole('button', { name: 'Share Results as Text' }).click();

    // Should show a toast confirming copy
    await expect(page.getByText('Copied')).toBeVisible();
  });

  test('tab navigation in completed state', async ({ page }) => {
    await navigateToTab(page, 'Log');
    await expect(page.getByRole('button', { name: 'Statistics' })).toBeVisible();

    await navigateToTab(page, 'Settings');
    await expect(page.getByRole('heading', { name: 'Tournament' })).toBeVisible();

    await navigateToTab(page, 'Play');
    // Completed view has "Share Results as Text" button
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });
});
