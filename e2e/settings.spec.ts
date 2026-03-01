import { test, expect } from '@playwright/test';
import {
  createInProgressTournament,
  navigateToTab,
} from './helpers';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createInProgressTournament(page);
    await navigateToTab(page, 'Settings');
  });

  test('shows tournament info', async ({ page }) => {
    // Tournament section heading
    await expect(page.getByRole('heading', { name: 'Tournament' })).toBeVisible();
    // Format chip
    await expect(page.getByText('americano')).toBeVisible();
    // All 4 players visible
    for (const name of ['Alice', 'Bob', 'Charlie', 'Diana']) {
      await expect(page.getByText(name)).toBeVisible();
    }
    await expect(page).toHaveScreenshot('settings-overview.png');
  });

  test('rename tournament', async ({ page }) => {
    // Click the Name field label to enter edit mode
    await page.getByText('Name', { exact: true }).click();

    // The input should appear — it will be autofocused with the current name
    const nameInput = page.locator('input[type="text"]:focus');
    await nameInput.waitFor();
    await nameInput.clear();
    await nameInput.fill('My Cup');
    await nameInput.press('Enter');

    // Verify new name appears in the field value
    await expect(page.getByRole('main').getByText('My Cup')).toBeVisible();
  });

  test('rename player', async ({ page }) => {
    // Click on "Alice" text to open edit panel
    await page.getByText('Alice').click();

    // The edit input is autofocused with Alice's name
    const editInput = page.locator('input[type="text"]:focus');
    await editInput.waitFor();
    await editInput.clear();
    await editInput.fill('Alicia');
    await editInput.press('Enter');

    // Verify new name appears
    await expect(page.getByText('Alicia')).toBeVisible();
    // Old name should be gone
    await expect(page.getByText('Alice')).not.toBeVisible();
  });

  test('add player mid-tournament', async ({ page }) => {
    // Click "+ Add Player"
    await page.getByRole('button', { name: '+ Add Player' }).click();

    // Fill the player name and click Add (exact match to avoid matching "+ Add Court")
    await page.getByPlaceholder('Player name').fill('Eve');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // Should now show 5 players in heading
    await expect(page.getByText('Players (5)')).toBeVisible();
    await expect(page.getByText('Eve')).toBeVisible();
  });

  test('toggle player availability', async ({ page }) => {
    // Click on Alice to open edit panel
    await page.getByText('Alice').click();

    // The edit panel opens with autofocused name input and an availability toggle below.
    // First dismiss the edit input by pressing Enter to save the name.
    const editInput = page.locator('input[type="text"]:focus');
    await editInput.waitFor();
    await editInput.press('Enter');

    // Now click Alice again to re-open the edit panel
    await page.getByText('Alice').click();

    // The toggle checkbox is visually hidden (width/height:0, opacity:0) and may be outside viewport.
    // Click the checkbox by dispatching a click event via JS.
    await page.locator('[class*="toggleInput"]').dispatchEvent('click');

    // After toggling, Alice should show "Unavailable"
    await expect(page.getByText('Unavailable')).toBeVisible();
    await expect(page).toHaveScreenshot('settings-player-unavailable.png');
  });

  test('edit points per match', async ({ page }) => {
    // Click the points per match field
    await page.getByText('Points per match').click();

    // Edit the value — the input is autofocused
    const pointsInput = page.locator('input[type="number"]:focus');
    await pointsInput.waitFor();
    await pointsInput.clear();
    await pointsInput.fill('32');
    await pointsInput.press('Enter');

    // Verify new value
    await expect(page.getByText('32')).toBeVisible();
  });

  test('delete tournament', async ({ page }) => {
    // Accept the confirm dialog
    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: 'Delete Tournament' }).click();

    // Should be back on home screen
    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quick Play' })).toBeVisible();
  });
});
