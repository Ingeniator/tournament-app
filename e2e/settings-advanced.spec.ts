import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addPlayers,
  generateSchedule,
  createInProgressTournament,
  navigateToTab,
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

    await expect(page.getByText('5')).toBeVisible();
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
    await expect(page.locator('button', { hasText: /^Available$/ })).toBeVisible();
    await expect(page.getByText('Replace with...')).toBeVisible();
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

    await page.getByRole('button', { name: 'Copy Tournament Data' }).click();

    await expect(page.getByText('Tournament copied!')).toBeVisible();
  });
});
