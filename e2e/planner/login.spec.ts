import { test, expect } from '@playwright/test';
import { waitForHome, setProfileName } from './helpers';

test.describe('Firebase Login', () => {
  test('anonymous auth — lands on home screen', async ({ page }) => {
    await page.goto('/plan');
    // Wait for the app to load — heading always appears
    await expect(page.getByRole('heading', { name: 'Tournament Planner' })).toBeVisible({ timeout: 15000 });

    // Should see the Google sign-in button (anonymous user, not linked)
    await expect(page.getByText('Sign in with Google')).toBeVisible();
  });

  test('anonymous auth — name prompt in organizer mode', async ({ page }) => {
    await page.goto('/plan?mode=organizer');
    await expect(page.getByRole('heading', { name: 'Tournament Planner' })).toBeVisible({ timeout: 15000 });

    // In organizer mode, new users see the name prompt
    // (may or may not appear depending on prior session state)
    const namePrompt = page.getByText('Set your name to get started');
    const loggedIn = page.getByText('Logged in as');
    await Promise.race([
      namePrompt.waitFor({ timeout: 15000 }),
      loggedIn.waitFor({ timeout: 15000 }),
    ]);

    // One of these should be visible
    const hasPrompt = await namePrompt.isVisible().catch(() => false);
    const hasLoggedIn = await loggedIn.isVisible().catch(() => false);
    expect(hasPrompt || hasLoggedIn).toBe(true);
  });

  test('set profile name and verify persistence', async ({ page }) => {
    await page.goto('/plan?mode=organizer');
    await waitForHome(page);

    const testName = `TestUser ${Date.now()}`;
    await setProfileName(page, testName);

    // Name should show in the logged-in badge
    await expect(page.getByText('Logged in as')).toBeVisible();
    await expect(page.getByText(testName)).toBeVisible();

    // Reload and verify name persists
    await page.reload();
    await waitForHome(page);
    await expect(page.getByText(testName)).toBeVisible({ timeout: 15000 });
  });

  test('Google sign-in button visible before linking', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: 'Tournament Planner' })).toBeVisible({ timeout: 15000 });

    // Google sign-in button should be visible for anonymous users
    const googleBtn = page.getByText('Sign in with Google');
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();
  });

  test('auth state survives page reload', async ({ page }) => {
    await page.goto('/plan?mode=organizer');
    await waitForHome(page);
    await setProfileName(page, `Reload Test ${Date.now()}`);

    // Verify logged-in state
    await expect(page.getByText('Logged in as')).toBeVisible();

    // Reload page
    await page.reload();
    await waitForHome(page);

    // Should still be logged in (same anonymous session via indexedDB)
    await expect(page.getByText('Logged in as')).toBeVisible({ timeout: 15000 });
  });

  test('edit profile name', async ({ page }) => {
    await page.goto('/plan?mode=organizer');
    await waitForHome(page);

    const originalName = `Original ${Date.now()}`;
    await setProfileName(page, originalName);

    // Click the edit button (pencil icon)
    await page.getByLabel('Edit name').click();

    // Clear and type new name
    const nameInput = page.getByLabel('Group Name / Your name');
    await nameInput.clear();
    const newName = `Updated ${Date.now()}`;
    await nameInput.fill(newName);
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify new name is displayed
    await expect(page.getByText(newName)).toBeVisible({ timeout: 10000 });
  });

  test('player mode shows join flow without requiring name', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: 'Tournament Planner' })).toBeVisible({ timeout: 15000 });

    // Player mode should show "Join with Code" and registered tournaments
    await expect(page.getByRole('button', { name: 'Join with Code' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Registered Tournaments')).toBeVisible();
  });
});
