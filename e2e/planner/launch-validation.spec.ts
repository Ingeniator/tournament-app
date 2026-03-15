import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  addPlayerAsOrganizer,
  deleteTournament,
} from './helpers';

test.describe('Launch Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);
  });

  test('cannot start with <4 players — error shown', async ({ page }) => {
    await createTournament(page);

    // Add only 2 players
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');

    // Try to start — look for the Start Tournament button
    const startBtn = page.getByRole('button', { name: 'Start Tournament' });
    // The button may be disabled or clicking it shows an error
    if (await startBtn.isEnabled()) {
      await startBtn.click();
    }
    // Validation error about minimum players
    await expect(page.getByText(/at least 4/i)).toBeVisible({ timeout: 5000 });

    // Clean up
    await deleteTournament(page);
  });

  test('cannot start team format with unpaired players', async ({ page }) => {
    await createTournament(page);

    // Change format to Team Americano
    await page.getByText('Format').first().click();
    await expect(page.locator('input[name="format-preset"]').first()).toBeVisible({ timeout: 10000 });
    await page.getByText('Team Americano', { exact: true }).first().click();

    // Add 4 players but don't pair them
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');
    await addPlayerAsOrganizer(page, 'Charlie');
    await addPlayerAsOrganizer(page, 'Diana');

    // Try to start
    const startBtn = page.getByRole('button', { name: 'Start Tournament' });
    if (await startBtn.isEnabled()) {
      await startBtn.click();
    }
    // Should show validation error about needing partners
    await expect(page.getByText(/partner/i)).toBeVisible({ timeout: 5000 });

    // Clean up
    await deleteTournament(page);
  });

  test('cannot start with too many courts', async ({ page }) => {
    await createTournament(page);

    // Add 4 players (supports max 1 court)
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');
    await addPlayerAsOrganizer(page, 'Charlie');
    await addPlayerAsOrganizer(page, 'Diana');

    // Add a second court
    await page.getByText('Format').first().click();
    const courtsHeader = page.getByText(/Courts \(\d+\)/).locator('..');
    await courtsHeader.getByRole('button', { name: '+ Add' }).click();
    await expect(page.getByText('Courts (2)')).toBeVisible({ timeout: 5000 });

    // Try to start
    const startBtn = page.getByRole('button', { name: 'Start Tournament' });
    if (await startBtn.isEnabled()) {
      await startBtn.click();
    }
    // Should show validation error about courts
    await expect(page.getByText(/court/i)).toBeVisible({ timeout: 5000 });

    // Clean up
    await deleteTournament(page);
  });

  test('can start with valid config', async ({ page }) => {
    test.setTimeout(60_000);
    await createTournament(page);

    // Add 4 players
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');
    await addPlayerAsOrganizer(page, 'Charlie');
    await addPlayerAsOrganizer(page, 'Diana');

    // Start tournament should work
    const startBtn = page.getByRole('button', { name: 'Start Tournament' });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    // Should not show any validation error before clicking
    // The button should be enabled
    await expect(startBtn).toBeEnabled();

    // Clean up (don't actually start as it would redirect to runner)
    await deleteTournament(page);
  });

  test('error clears after fixing issue', async ({ page }) => {
    await createTournament(page);

    // Add only 2 players to trigger error
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');

    // Try to start
    const startBtn = page.getByRole('button', { name: 'Start Tournament' });
    if (await startBtn.isEnabled()) {
      await startBtn.click();
    }
    await expect(page.getByText(/at least 4/i)).toBeVisible({ timeout: 5000 });

    // Add more players to fix the issue
    await addPlayerAsOrganizer(page, 'Charlie');
    await addPlayerAsOrganizer(page, 'Diana');

    // Error should clear (validation runs on player count change)
    // Give a moment for re-render
    await page.waitForTimeout(500);
    // Verify the error is gone or the start button is now enabled
    const errorVisible = await page.getByText(/at least 4/i).isVisible().catch(() => false);
    expect(errorVisible).toBe(false);

    // Clean up
    await deleteTournament(page);
  });
});
