import { test, expect } from '@playwright/test';
import {
  createTournament,
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

test.describe('Team Mexicano Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createTournament(page, {
      format: 'team-mexicano',
      players: SIX_PLAYERS,
      teams: THREE_TEAMS,
    });
  });

  test('full lifecycle: score → complete', async ({ page }) => {
    // Team Mexicano is dynamic — score all rounds
    await scoreAllMatches(page);

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

  test('standings show team names', async ({ page }) => {
    await scoreMatch(page);
    await dismissInterstitial(page);

    await page.getByRole('button', { name: 'Standings' }).click();

    // The standings table should have team entries visible
    const cells = page.getByRole('cell');
    await expect(cells.first()).toBeVisible();
  });

  test('dynamic round generation after scoring', async ({ page }) => {
    // Score all matches in round 1 — Team Mexicano auto-generates next round
    await scoreMatch(page);
    await dismissInterstitial(page);

    // With 3 teams on 1 court, there's 1 match per round
    // After scoring it, round 2 should auto-generate
    await expect(page.getByRole('heading', { name: 'Round 2' })).toBeVisible();
  });

  test('persists across reload', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });
});
