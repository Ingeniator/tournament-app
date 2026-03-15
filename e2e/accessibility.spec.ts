import { test, expect } from '@playwright/test';
import { clearState, createTournament, addFourPlayers, generateSchedule, navigateToTab } from './helpers';

// Note: These tests check basic accessibility patterns.
// For full axe-core audits, install @axe-core/playwright.

test.describe('Accessibility Smoke', () => {
  test('home screen has proper heading structure', async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    // Main heading should be present
    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
    // Buttons should be accessible
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('setup screen has accessible form elements', async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await createTournament(page);

    // Input should have placeholder (acts as label)
    const playerInput = page.getByPlaceholder('Player name');
    await expect(playerInput).toBeVisible();

    // Add button should be accessible
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();

    // Format radio buttons should be present
    const radios = page.locator('input[type="radio"]');
    const radioCount = await radios.count();
    expect(radioCount).toBeGreaterThan(0);
  });

  test('play screen has accessible score buttons', async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await createTournament(page);
    await addFourPlayers(page);
    await generateSchedule(page);
    await navigateToTab(page, 'Play');

    // Score buttons should be accessible (role=button, name="–")
    const scoreBtn = page.getByRole('button', { name: '–' }).first();
    await expect(scoreBtn).toBeVisible();

    // Tab navigation buttons should be present
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  });
});
