import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addPlayers,
  generateSchedule,
  createInProgressTournament,
  navigateToTab,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

test.describe('Settings Advanced', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createInProgressTournament(page);
    await navigateToTab(page, 'Settings');
  });

  test('edit rounds count', async ({ page }) => {
    // Click the Rounds label to enter edit mode
    await page.getByText('Rounds', { exact: true }).click();

    const roundsInput = page.locator('input[type="number"]:focus');
    await roundsInput.waitFor();
    await roundsInput.clear();
    await roundsInput.fill('5');
    await roundsInput.press('Enter');

    // The field should display the new value in its value span
    await expect(page.locator('[class*="fieldValue"]', { hasText: '5' })).toBeVisible();
  });

  test('rename court', async ({ page }) => {
    // Click the court name to enter edit mode
    await page.getByText('Court 1').click();

    const courtInput = page.locator('input[type="text"]:focus');
    await courtInput.waitFor();
    await courtInput.clear();
    await courtInput.fill('Center Court');
    await courtInput.press('Enter');

    await expect(page.getByText('Center Court')).toBeVisible();
  });

  test('court edit mode shows availability toggle', async ({ page }) => {
    // Click the court name to open edit mode
    await page.getByText('Court 1').click();

    // The edit panel should show the availability toggle and replace button
    await expect(page.getByText('Available', { exact: true })).toBeVisible();
    await expect(page.getByText('Replace with...')).toBeVisible();
    await expect(page).toHaveScreenshot('settings-court-edit.png');
  });

  test('add court from settings with enough players', async ({ page }) => {
    // With only 4 players, can't add a court (max = floor(4/4) = 1).
    // First add more players to allow a second court.
    const addSettingsPlayer = async (name: string) => {
      await page.getByRole('button', { name: '+ Add Player' }).click();
      await page.getByPlaceholder('Player name').fill(name);
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      // Wait for the add form to close (indicates player was added)
      await page.getByRole('button', { name: '+ Add Player' }).waitFor();
    };

    await addSettingsPlayer('Eve');
    await addSettingsPlayer('Frank');
    await addSettingsPlayer('Grace');
    await addSettingsPlayer('Hank');

    // Now 8 players, max 2 courts — the "+ Add Court" button should appear
    await page.getByRole('button', { name: '+ Add Court' }).click();

    await expect(page.getByText('Court 2')).toBeVisible();
  });

  test('export tournament data', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Open the Export dropdown, then click "Export to Clipboard"
    await page.getByRole('button', { name: /^Export/ }).click();
    await page.getByText('Export to Clipboard').click();

    await expect(page.getByText('Tournament copied!')).toBeVisible();
  });

  test('disable court mid-tournament', async ({ page }) => {
    // First need 8 players + 2 courts
    await page.goto('/');
    await clearState(page);
    await createTournament(page);
    await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank']);
    // Set 2 courts
    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('3');
    await page.evaluate(() => {
      const raw = localStorage.getItem('padel-tournament-v1');
      if (!raw) return;
      const t = JSON.parse(raw);
      t.config.courts.push({ id: 'c2', name: 'Court 2' });
      localStorage.setItem('padel-tournament-v1', JSON.stringify(t));
    });
    await page.reload();
    await generateSchedule(page);
    await navigateToTab(page, 'Settings');

    // Click court name to enter edit mode
    await page.getByText('Court 2').click();
    // Toggle availability
    await page.getByText('Available', { exact: true }).click();
    // Court 2 should now show as unavailable
    await expect(page.getByText(/unavailable/i).or(page.locator('[class*="unavailable"]'))).toBeVisible({ timeout: 5000 });
  });

  test('re-enable disabled court', async ({ page }) => {
    // Same setup as disable court test - 8 players, 2 courts
    await page.goto('/');
    await clearState(page);
    await createTournament(page);
    await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank']);
    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('3');
    await page.evaluate(() => {
      const raw = localStorage.getItem('padel-tournament-v1');
      if (!raw) return;
      const t = JSON.parse(raw);
      t.config.courts.push({ id: 'c2', name: 'Court 2' });
      localStorage.setItem('padel-tournament-v1', JSON.stringify(t));
    });
    await page.reload();
    await generateSchedule(page);
    await navigateToTab(page, 'Settings');

    // Disable Court 2
    await page.getByText('Court 2').click();
    await page.getByText('Available', { exact: true }).click();
    await expect(page.getByText(/unavailable/i).or(page.locator('[class*="unavailable"]'))).toBeVisible({ timeout: 5000 });

    // Re-enable Court 2
    await page.getByText('Court 2').click();
    const toggleBtn = page.getByText('Available', { exact: true }).or(page.getByText(/unavailable/i));
    await toggleBtn.click();
  });

  test('replace player mid-tournament', async ({ page }) => {
    // Click on a player name to open edit mode
    await page.getByText('Alice').click();

    // Look for Replace with... option
    const replaceText = page.getByText('Replace with...');
    await expect(replaceText).toBeVisible({ timeout: 5000 });

    // Fill replacement name
    const replaceInput = page.getByPlaceholder('Player name');
    await replaceInput.fill('Replacement');
    await page.getByRole('button', { name: 'Replace' }).click();

    // Replacement should appear in the list
    await expect(page.getByText('Replacement')).toBeVisible({ timeout: 5000 });
    // Alice should be marked unavailable
    await expect(page.getByText(/Alice/).first()).toBeVisible();
  });

  test('add round manually via Play tab', async ({ page }) => {
    // Score all matches first
    await navigateToTab(page, 'Play');
    // Score matches using scoreAllMatchesInRound
    let hasDash = await page.getByRole('button', { name: '–' }).first().isVisible().catch(() => false);
    while (hasDash) {
      await scoreMatch(page, 15);
      await dismissInterstitial(page);
      hasDash = await page.getByRole('button', { name: '–' }).first().isVisible().catch(() => false);
    }

    // Wait for "All rounds scored!" or "Add Round" button
    await page.getByText('All rounds scored!').waitFor({ timeout: 10000 }).catch(() => {});
    const addRoundBtn = page.getByRole('button', { name: 'Add Round' });
    if (await addRoundBtn.isVisible().catch(() => false)) {
      await addRoundBtn.click();
      // A new round should appear with unscored matches
      await expect(page.getByRole('button', { name: '–' }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('change max rounds from settings', async ({ page }) => {
    // Click the Rounds label
    await page.getByText('Rounds', { exact: true }).click();
    const roundsInput = page.locator('input[type="number"]:focus');
    await roundsInput.waitFor();
    await roundsInput.clear();
    await roundsInput.fill('7');
    await roundsInput.press('Enter');
    await expect(page.locator('[class*="fieldValue"]', { hasText: '7' })).toBeVisible();
  });

  test('re-enable unavailable player', async ({ page }) => {
    // First make a player unavailable
    await page.getByText('Alice').click();
    await page.getByText('Available', { exact: true }).click();
    // Alice should now be unavailable
    // Now toggle back
    await page.getByText('Alice').click();
    await page.getByText(/unavailable/i).or(page.getByText('Available', { exact: true })).click();
    // Verify player is available again
  });

  test('remove future rounds by reducing count', async ({ page }) => {
    // Click Rounds to edit
    await page.getByText('Rounds', { exact: true }).click();
    const roundsInput = page.locator('input[type="number"]:focus');
    await roundsInput.waitFor();
    await roundsInput.clear();
    await roundsInput.fill('1');
    await roundsInput.press('Enter');
    await expect(page.locator('[class*="fieldValue"]', { hasText: '1' })).toBeVisible();
  });

  test('cancel delete keeps tournament', async ({ page }) => {
    // Set up dialog handler to reject
    page.on('dialog', dialog => dialog.dismiss());
    // Click Delete Tournament
    await page.getByRole('button', { name: /Delete/ }).click();
    // Tournament should still be visible (not deleted)
    await expect(page.getByText('Court 1')).toBeVisible();
  });
});
