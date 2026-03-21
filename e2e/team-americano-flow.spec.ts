import { test, expect } from '@playwright/test';
import {
  createTournament,
  navigateToTab,
  scoreAllMatches,
  scoreMatch,
  dismissInterstitial,
} from './helpers';

const SIX_PLAYERS = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
  { id: 'p4', name: 'Diana' },
  { id: 'p5', name: 'Eve' },
  { id: 'p6', name: 'Frank' },
];

const THREE_TEAMS = [
  { id: 'team1', player1Id: 'p1', player2Id: 'p2' },
  { id: 'team2', player1Id: 'p3', player2Id: 'p4' },
  { id: 'team3', player1Id: 'p5', player2Id: 'p6' },
];

test.describe('Team Americano Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTournament(page, {
      format: 'team-americano',
      players: SIX_PLAYERS,
      teams: THREE_TEAMS,
    });
  });

  test('full lifecycle: score → complete', async ({ page }) => {
    await navigateToTab(page, 'Play');
    await scoreAllMatches(page);

    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Finish Tournament' }).click();

    // Skip the post-tournament ceremony/awards screen if it appears
    const skipBtn = page.getByRole('button', { name: 'Skip' });
    try {
      await skipBtn.waitFor({ timeout: 3000 });
      await skipBtn.click();
    } catch {
      // No ceremony screen
    }

    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });

  test('scoring updates standings', async ({ page }) => {
    await navigateToTab(page, 'Play');
    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    // At least one team should have points > 0 in the standings table
    await expect(page.getByRole('cell', { name: '15' }).first()).toBeVisible();
    await expect(page).toHaveScreenshot('team-americano-scored-standings.png');
  });

  test('persists across reload', async ({ page }) => {
    await navigateToTab(page, 'Play');
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
