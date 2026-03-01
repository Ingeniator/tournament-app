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
    // After reload, a round heading should be visible (app restores to Log tab)
    await expect(page.getByRole('heading', { name: /^Round \d+$/ }).first()).toBeVisible({ timeout: 5000 });
  });

  test('new play creates tournament', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Quick Play' })).toBeVisible();
    await expect(page).toHaveScreenshot('home-empty-state.png');
    await createTournament(page);

    // Should be in setup screen
    await expect(page.getByPlaceholder('Tournament name')).toBeVisible();
  });

  test('import valid tournament JSON', async ({ page }) => {
    // Build a minimal valid export JSON (wraps tournament in envelope)
    const exportData = {
      _format: 'padel-tournament-v1',
      tournament: {
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
      },
    };

    // Mock clipboard to return the tournament JSON
    await page.evaluate((json) => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: () => Promise.resolve(json) },
        writable: true,
      });
    }, JSON.stringify(exportData));

    // Open the import dropdown, then click "Import from Clipboard"
    await page.getByRole('button', { name: /^Import/ }).click();
    await page.getByText('Import from Clipboard').click();

    // Should load the tournament — setup screen with tournament name populated
    await expect(page.getByPlaceholder('Tournament name')).toHaveValue('Imported Cup');
  });

  test('import invalid JSON shows error', async ({ page }) => {
    // Mock clipboard to return invalid JSON
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: () => Promise.resolve('not valid json') },
        writable: true,
      });
    });

    // Open the import dropdown, then click "Import from Clipboard"
    await page.getByRole('button', { name: /^Import/ }).click();
    await page.getByText('Import from Clipboard').click();

    // Should show an error message
    await expect(page.locator('[class*="error"], [class*="Error"]').first()).toBeVisible();
    await expect(page).toHaveScreenshot('home-import-error.png');
  });
});
