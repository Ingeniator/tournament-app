import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addPlayers,
  selectFormat,
  assignGroups,
  generateSchedule,
  scoreAllMatches,
  scoreAllMatchesInRound,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

test.describe('Mixicano Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await createTournament(page);
    await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']);
    await selectFormat(page, 'mixicano');
  });

  test('shows group label inputs when mixicano is selected', async ({ page }) => {
    // Group labels configuration should appear for cross-group formats
    await expect(page.getByLabel('Group A name')).toBeVisible();
  });

  test('shows group assignment buttons on players', async ({ page }) => {
    // Each player should have Left Side / Right Side group buttons
    await expect(page.getByRole('button', { name: 'Left Side' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Right Side' }).first()).toBeVisible();
  });

  test('blocks generate without group assignments', async ({ page }) => {
    // Without assigning groups, generate should be disabled
    await expect(page.getByRole('button', { name: 'Generate Schedule' })).toBeDisabled();
    await expect(page.getByText('no group assigned')).toBeVisible();
  });

  test('full lifecycle: assign groups → generate → score → finish', async ({ page }) => {
    // Assign groups: 4 in each group
    await assignGroups(
      page,
      ['Alice', 'Bob', 'Charlie', 'Diana'],
      ['Eve', 'Frank', 'Grace', 'Henry'],
    );

    // Cap rounds for speed
    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('3');

    await generateSchedule(page);

    // Mixicano is dynamic — lands on Play tab
    await scoreAllMatches(page);

    // Finish
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

  test('standings update after scoring', async ({ page }) => {
    await assignGroups(
      page,
      ['Alice', 'Bob', 'Charlie', 'Diana'],
      ['Eve', 'Frank', 'Grace', 'Henry'],
    );

    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('3');

    await generateSchedule(page);

    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    // Verify standings table has entries
    const cells = page.getByRole('cell');
    await expect(cells.first()).toBeVisible();
  });

  test('dynamic round generation after scoring', async ({ page }) => {
    await assignGroups(
      page,
      ['Alice', 'Bob', 'Charlie', 'Diana'],
      ['Eve', 'Frank', 'Grace', 'Henry'],
    );

    await generateSchedule(page);

    // With 8 players on 1 court, there are 2 matches per round (4 players play, 4 sit out)
    // Score each match individually until round 1 is complete
    await scoreMatch(page);
    await dismissInterstitial(page);

    // Score second match if there is one
    const hasDash = await page.getByRole('button', { name: '–' }).first().isVisible().catch(() => false);
    if (hasDash) {
      await scoreMatch(page);
      await dismissInterstitial(page);
    }

    // Round 2 should auto-generate
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible({ timeout: 10000 });
  });

  test('persists across reload', async ({ page }) => {
    await assignGroups(
      page,
      ['Alice', 'Bob', 'Charlie', 'Diana'],
      ['Eve', 'Frank', 'Grace', 'Henry'],
    );

    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('3');

    await generateSchedule(page);

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
