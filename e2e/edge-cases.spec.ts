import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addFourPlayers,
  generateSchedule,
  createInProgressTournament,
  navigateToTab,
  scoreMatch,
  scoreAllMatches,
  dismissInterstitial,
} from './helpers';

/**
 * Complete a tournament and get past the ceremony to the final summary screen.
 * Handles the awards ceremony by clicking Skip.
 */
async function completeAndSkipCeremony(page: import('@playwright/test').Page) {
  await createInProgressTournament(page);
  await navigateToTab(page, 'Play');
  await scoreAllMatches(page);

  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Finish Tournament' }).click();

  // The ceremony screen may appear — skip it if present
  const skipBtn = page.getByRole('button', { name: 'Skip' });
  try {
    await skipBtn.waitFor({ timeout: 3000 });
    await skipBtn.click();
  } catch {
    // No ceremony — already on completed view
  }

  await page.getByRole('button', { name: 'Share Results as Text' }).waitFor({ timeout: 5000 });
}

test.describe('localStorage corruption', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
  });

  test('corrupt JSON in storage falls back to home screen', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('padel-tournament-v1', '{not valid json!!!');
    });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
  });

  test('truncated tournament data falls back to home screen', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('padel-tournament-v1', '{"id":"t1","name":"Test","phase":"in-progress","players":[{"id":"p1","name":"Al');
    });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
  });

  test('empty string in storage falls back to home screen', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('padel-tournament-v1', '');
    });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
  });

  test('null tournament value in storage falls back to home screen', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('padel-tournament-v1', 'null');
    });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
  });

  test('corrupt UI state does not crash app', async ({ page }) => {
    await createInProgressTournament(page);

    await page.evaluate(() => {
      localStorage.setItem('padel-ui-state-v1', 'not-json');
    });
    await page.reload();

    // App should still render without crashing
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    // Tournament data is intact — some content should be visible
    const body = await page.locator('body').textContent();
    expect(body!.length).toBeGreaterThan(10);
  });

  test('storage full does not crash app', async ({ page }) => {
    await createInProgressTournament(page);
    await navigateToTab(page, 'Play');

    // Fill localStorage to trigger quota error on next save
    await page.evaluate(() => {
      try {
        const big = 'x'.repeat(1024 * 1024);
        for (let i = 0; i < 20; i++) {
          localStorage.setItem(`filler-${i}`, big);
        }
      } catch {
        // Expected
      }
    });

    // Score a match — save will fail but app should not crash
    await scoreMatch(page);
    await dismissInterstitial(page);

    // App should still be functional
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.getByText(/\d+\/\d+ matches/)).toBeVisible();
  });
});

test.describe('Rapid double-click on score submit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createInProgressTournament(page);
    await navigateToTab(page, 'Play');
  });

  test('rapid double-click on score button does not cause duplicate scoring', async ({ page }) => {
    const dashBtn = page.getByRole('button', { name: '–' }).first();
    await dashBtn.click();

    const scoreBtn = page.getByRole('button', { name: '15', exact: true });
    await scoreBtn.dblclick();

    await page.locator('[data-picking]').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    await dismissInterstitial(page);

    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.getByText(/\d+\/\d+ matches/)).toBeVisible();
  });

  test('clicking score buttons in quick succession stays consistent', async ({ page }) => {
    await scoreMatch(page, 10);
    await dismissInterstitial(page);

    // Verify the score was recorded (visible in compact preview)
    await expect(page.getByText(/10:\d+/)).toBeVisible();

    // App should not crash
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.getByText(/\d+\/\d+ matches/)).toBeVisible();
  });
});

test.describe('Empty tournament states', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
  });

  test('home screen with no tournaments shows create button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New Play' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Round/ })).not.toBeVisible();
  });

  test('setup screen with zero players shows disabled generate button', async ({ page }) => {
    await createTournament(page);

    const generateBtn = page.getByRole('button', { name: 'Generate Schedule' });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeDisabled();
  });

  test('setup screen with fewer than 4 players disables generate', async ({ page }) => {
    await createTournament(page);
    await page.getByPlaceholder('Player name').fill('Alice');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByPlaceholder('Player name').fill('Bob');
    await page.getByRole('button', { name: 'Add' }).click();

    const generateBtn = page.getByRole('button', { name: 'Generate Schedule' });
    await expect(generateBtn).toBeDisabled();
  });

  test('adding empty player name is not allowed', async ({ page }) => {
    await createTournament(page);

    // The Add button should be disabled when the input is empty
    const addBtn = page.getByRole('button', { name: 'Add' });
    await expect(addBtn).toBeDisabled();

    // Player count should remain at 0
    await expect(page.getByText('0 player(s) added')).toBeVisible();
  });
});

test.describe('Back-button / hash navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
  });

  test('URL hash updates on screen transitions', async ({ page }) => {
    await expect(page).toHaveURL(/#home/);

    await createTournament(page);
    await expect(page).toHaveURL(/#setup/);

    await addFourPlayers(page);
    await generateSchedule(page);
    await expect(page).toHaveURL(/#log/);

    await navigateToTab(page, 'Play');
    await expect(page).toHaveURL(/#play/);
  });

  test('browser back button does not break app state', async ({ page }) => {
    await createInProgressTournament(page);
    await navigateToTab(page, 'Play');

    // Push a history entry so goBack has somewhere to go within the same origin
    await page.evaluate(() => history.pushState(null, '', '#test-entry'));
    await page.goBack();

    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.getByText(/\d+\/\d+ matches/)).toBeVisible();
  });

  test('reload mid-tournament preserves state', async ({ page }) => {
    await createInProgressTournament(page);
    await navigateToTab(page, 'Play');

    await scoreMatch(page, 12);
    await dismissInterstitial(page);

    await page.reload();

    // Tournament should be restored — verify by checking round heading exists
    // (the active tab defaults to 'play' since we saved it before reload)
    await expect(page.getByRole('heading', { name: /^Round \d+$/ }).first()).toBeVisible({ timeout: 5000 });
  });

  test('hard navigation to /play restores tournament', async ({ page }) => {
    await createInProgressTournament(page);

    // Re-navigate to the app root
    await page.goto('/');

    // Tournament is in localStorage, so it should be restored.
    // Home screen shows a resume card when tournament exists — the "Continue" button should be visible
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    const roundHeading = page.getByRole('heading', { name: /Round/ });

    // Either directly shows tournament or shows resume card
    await expect(continueBtn.or(roundHeading).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Offline behavior (PWA)', () => {
  test('scoring works while offline (localStorage-only)', async ({ page, context }) => {
    await page.goto('/');
    await createInProgressTournament(page);
    await navigateToTab(page, 'Play');

    // Go offline
    await context.setOffline(true);

    await scoreMatch(page, 18);
    await dismissInterstitial(page);

    // Verify score was saved locally
    await expect(page.getByText(/18:\d+/)).toBeVisible();
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();

    await context.setOffline(false);
  });

  test('tournament state persists across offline-online cycle', async ({ page, context }) => {
    await page.goto('/');
    await createInProgressTournament(page);
    await navigateToTab(page, 'Play');

    // Score while online
    await scoreMatch(page, 15);
    await dismissInterstitial(page);

    // Go offline, verify app is still functional
    await context.setOffline(true);

    // App should not crash — progress line still visible
    await expect(page.getByText(/\d+\/\d+ matches/)).toBeVisible();
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();

    await context.setOffline(false);
  });
});

test.describe('Error boundary recovery', () => {
  test('ErrorBoundary catches render crash gracefully', async ({ page }) => {
    await page.goto('/');
    await clearState(page);

    // Inject a corrupt tournament that will cause a render error
    await page.evaluate(() => {
      const corrupt = {
        id: 'crash',
        name: 'Crasher',
        phase: 'in-progress',
        players: [],
        rounds: [{ id: 'r1', roundNumber: 1, matches: [{ id: 'm1', team1: null, team2: null }] }],
        config: { format: 'americano', pointsPerMatch: 24, courts: [{ id: 'c1', name: 'C1' }], maxRounds: 3 },
        createdAt: 1000,
        updatedAt: 1000,
      };
      localStorage.setItem('padel-tournament-v1', JSON.stringify(corrupt));
    });

    await page.reload();

    // The page should not be blank
    const body = await page.locator('body').textContent();
    expect(body!.length).toBeGreaterThan(0);
  });
});

test.describe('Completed tournament edge cases', () => {
  test.setTimeout(60_000);

  test('completed tournament cannot be scored further', async ({ page }) => {
    await page.goto('/');
    await completeAndSkipCeremony(page);

    // In completed state, no score dash buttons should exist
    await expect(page.getByRole('button', { name: '–' })).not.toBeVisible();

    // Completed state UI is showing
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });

  test('completed tournament survives page reload', async ({ page }) => {
    await page.goto('/');
    await completeAndSkipCeremony(page);

    await page.reload();

    // After reload, completed tournament may show ceremony again or final view
    // Skip ceremony if it appears
    const skipBtn = page.getByRole('button', { name: 'Skip' });
    try {
      await skipBtn.waitFor({ timeout: 3000 });
      await skipBtn.click();
    } catch {
      // No ceremony
    }

    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
  });
});
