import { test, expect } from '@playwright/test';
import {
  createTeamAmericanoSetup,
  closeOverlay,
} from './helpers';

test.describe('Team Pairing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTeamAmericanoSetup(page);
  });

  test('displays team cards with players', async ({ page }) => {
    // Verify team headings
    await expect(page.getByText('Team 1')).toBeVisible();
    await expect(page.getByText('Team 2')).toBeVisible();
    await expect(page.getByText('Team 3')).toBeVisible();

    // Verify all player names are visible
    for (const name of ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']) {
      await expect(page.getByText(name)).toBeVisible();
    }
  });

  test('shuffle randomizes teams', async ({ page }) => {
    // Capture all player chip texts across all teams
    const getPlayerOrder = async () => {
      const chips = page.locator('[class*="playerChip"]');
      const texts: string[] = [];
      const count = await chips.count();
      for (let i = 0; i < count; i++) {
        texts.push(await chips.nth(i).textContent() ?? '');
      }
      return texts.join(',');
    };

    const initial = await getPlayerOrder();

    // Click shuffle multiple times to get a different arrangement
    let changed = false;
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: 'Shuffle Teams' }).click();
      const current = await getPlayerOrder();
      if (current !== initial) {
        changed = true;
        break;
      }
    }

    expect(changed).toBe(true);
  });

  test('swap players between teams', async ({ page }) => {
    // Get all player chip buttons (6 players, 2 per team)
    const chips = page.locator('[class*="playerChip"]');

    // Get the first player (Team 1, player 1) and third player (Team 2, player 1)
    const player1Name = await chips.nth(0).textContent();
    const player3Name = await chips.nth(2).textContent();

    // Click player 1 (selects)
    await chips.nth(0).click();

    // Click player 3 from different team (swaps)
    await chips.nth(2).click();

    // After swap, positions should be reversed
    await expect(chips.nth(0)).toHaveText(player3Name!);
    await expect(chips.nth(2)).toHaveText(player1Name!);
  });

  test('back returns to setup', async ({ page }) => {
    await page.getByRole('button', { name: 'Back' }).click();

    await expect(page.getByPlaceholder('Player name')).toBeVisible();
  });

  test('start tournament begins play', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Tournament' }).click();
    // After starting, statistics overlay opens — close it
    await closeOverlay(page);

    // Should see round content on the Log tab
    await expect(page.getByText('Round 1')).toBeVisible();
  });
});
