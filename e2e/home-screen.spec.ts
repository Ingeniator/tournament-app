import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addFourPlayers,
  generateSchedule,
} from './helpers';

test.describe('Home Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
  });

  test('restores saved tournament on reload', async ({ page }) => {
    await createTournament(page);
    await addFourPlayers(page);
    await generateSchedule(page);

    // Reload the page — should restore tournament, not show home screen
    await page.reload();

    // The app restores the in-progress tournament directly
    // Should show round headings, not the home screen
    await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible();
  });

  test('new play creates tournament', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New Play' })).toBeVisible();
    await createTournament(page);

    // Should be in setup screen
    await expect(page.getByPlaceholder('Tournament name')).toBeVisible();
  });

  test('import valid tournament JSON', async ({ page }) => {
    // Build a minimal valid tournament JSON
    const tournament = {
      _format: 'padel-tournament-v1',
      id: 'test-import-1',
      name: 'Imported Cup',
      phase: 'setup',
      format: 'americano',
      players: [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
        { id: 'p4', name: 'Player 4' },
      ],
      config: {
        format: 'americano',
        courts: [{ id: 'c1', name: 'Court 1' }],
        pointsPerMatch: 24,
        maxRounds: null,
      },
      rounds: [],
      activeTab: 'play',
    };

    await page.getByRole('button', { name: 'Import from Clipboard' }).click();
    await page.getByPlaceholder('Paste tournament JSON here').fill(JSON.stringify(tournament));
    await page.getByRole('button', { name: 'Import' }).click();

    // Should load the tournament — we should see the setup screen with players
    await expect(page.getByText('Imported Cup')).toBeVisible();
  });

  test('import invalid JSON shows error', async ({ page }) => {
    await page.getByRole('button', { name: 'Import from Clipboard' }).click();
    await page.getByPlaceholder('Paste tournament JSON here').fill('not valid json');
    await page.getByRole('button', { name: 'Import' }).click();

    // Should show an error message
    await expect(page.locator('[class*="error"], [class*="Error"]').first()).toBeVisible();
  });
});
