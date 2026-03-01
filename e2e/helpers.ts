import { type Page, expect } from '@playwright/test';

/** Clear localStorage and reload to get a fresh home screen. */
export async function clearState(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('heading', { name: 'Tournament Manager' }).waitFor();
}

/** Click "Quick Play" to create a tournament and wait for setup screen. */
export async function createTournament(page: Page) {
  await page.getByRole('button', { name: 'Quick Play' }).click();
  await page.getByPlaceholder('Tournament name').waitFor();
}

/** Add a single player by name in the setup screen. */
export async function addPlayer(page: Page, name: string) {
  await page.getByPlaceholder('Player name').fill(name);
  await page.getByRole('button', { name: 'Add' }).click();
}

/** Add four standard players. */
export async function addFourPlayers(page: Page) {
  for (const name of ['Alice', 'Bob', 'Charlie', 'Diana']) {
    await addPlayer(page, name);
  }
}

/** Click "Generate Schedule" and close the Statistics overlay if it appears. */
export async function generateSchedule(page: Page) {
  await page.getByRole('button', { name: 'Generate Schedule' }).click();
  // After generating, the app switches to Log tab and may auto-open Statistics overlay.
  // Some formats (e.g. Mexicano) don't show the overlay, so handle both cases.
  try {
    await closeOverlay(page);
  } catch {
    // No overlay appeared
  }
}

/** Close any open modal/overlay by clicking the ✕ button. */
export async function closeOverlay(page: Page) {
  const closeBtn = page.getByRole('button', { name: '✕' });
  await closeBtn.waitFor({ timeout: 5000 });
  await closeBtn.click();
  await closeBtn.waitFor({ state: 'hidden' });
}

/** Navigate to a tab using the bottom navigation. */
export async function navigateToTab(page: Page, tab: 'Play' | 'Log' | 'Settings') {
  await page.getByRole('button', { name: tab }).click();
}

/**
 * Dismiss the round-complete interstitial if it appears.
 * The interstitial shows "Round N complete!" with a "Continue" button.
 */
export async function dismissInterstitial(page: Page) {
  const continueBtn = page.getByRole('button', { name: 'Continue' });
  // Give a short moment for the interstitial to potentially appear
  try {
    await continueBtn.waitFor({ timeout: 1000 });
    await continueBtn.click();
    await continueBtn.waitFor({ state: 'hidden' });
  } catch {
    // No interstitial appeared — that's fine
  }
}

/**
 * Score a single unscored match: click the "–" button for team1,
 * then pick a score from the picker grid. Dismisses any interstitial first.
 */
export async function scoreMatch(page: Page, team1Score = 15) {
  // Dismiss any interstitial overlay that might be blocking
  await dismissInterstitial(page);

  // Click the first "–" button (unscored team1 side)
  const dashBtn = page.getByRole('button', { name: '–' }).first();
  await dashBtn.click();

  // The picker grid appears. Click the score value.
  await page.getByRole('button', { name: String(team1Score), exact: true }).click();

  // Wait for the score animation to complete (280ms fly animation, then state commits).
  // The picker has a data-picking attribute while open; it's removed when score is saved.
  await page.locator('[data-picking]').waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
}

/**
 * Score all matches in the current round. Handles the round-complete interstitial.
 * Returns after all matches in the active round are scored.
 */
export async function scoreAllMatchesInRound(page: Page, team1Score = 15) {
  // Keep scoring while there are "–" buttons visible in the active round
  while (await page.getByRole('button', { name: '–' }).first().isVisible().catch(() => false)) {
    await scoreMatch(page, team1Score);
  }
}

/**
 * Create a full in-progress tournament: new play → 4 players → generate schedule.
 * Ends on the Log tab with the stats overlay closed.
 */
export async function createInProgressTournament(page: Page) {
  await clearState(page);
  await createTournament(page);
  await addFourPlayers(page);
  await generateSchedule(page);
}

/**
 * Get the count of players shown in the setup screen footer.
 */
export async function getPlayerCount(page: Page): Promise<string> {
  return await page.locator('text=/\\d+ player\\(s\\) added/').textContent() ?? '';
}

/**
 * Verify a text is visible on the page.
 */
export async function expectVisible(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).toBeVisible();
}

/** Add N players by name. */
export async function addPlayers(page: Page, names: string[]) {
  for (const name of names) {
    await addPlayer(page, name);
  }
}

/** Select a tournament format from the FormatPicker radio list. */
export async function selectFormat(page: Page, format: 'americano' | 'team-americano' | 'mexicano') {
  const labels: Record<string, string> = {
    'americano': 'Americano',
    'team-americano': 'Team Americano',
    'mexicano': 'Mexicano',
  };
  const label = labels[format];
  // Click the exact preset name span — this selects the parent label's radio.
  await page.getByText(label, { exact: true }).click();
}

/**
 * Create a team-americano setup: clear state → create tournament → add 6 players
 * → select team-americano format → click "Set up Teams".
 * Lands on the team-pairing screen.
 */
export async function createTeamAmericanoSetup(page: Page) {
  await clearState(page);
  await createTournament(page);
  await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']);
  await selectFormat(page, 'team-americano');
  await page.getByRole('button', { name: 'Set up Teams' }).click();
  // Wait for team pairing screen
  await page.getByRole('heading', { name: 'Teams' }).waitFor();
}

/**
 * Score all matches across all rounds until "All rounds scored!" is visible.
 * Must be on the Play tab. Handles interstitials between rounds.
 */
export async function scoreAllMatches(page: Page, team1Score = 15) {
  let safetyCounter = 0;
  const maxIterations = 100;

  while (safetyCounter < maxIterations) {
    safetyCounter++;

    const allScoredVisible = await page.getByText('All rounds scored!').isVisible().catch(() => false);
    if (allScoredVisible) break;

    // Dismiss any interstitial that may be blocking
    await dismissInterstitial(page);

    const hasDash = await page.getByRole('button', { name: '–' }).first().isVisible().catch(() => false);
    if (hasDash) {
      await scoreMatch(page, team1Score);
    } else {
      // Wait for a UI element to appear instead of fixed timeout
      await Promise.race([
        page.getByRole('button', { name: '–' }).first().waitFor({ timeout: 2000 }).catch(() => {}),
        page.getByText('All rounds scored!').waitFor({ timeout: 2000 }).catch(() => {}),
        page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 2000 }).catch(() => {}),
      ]);
    }
  }
}

/**
 * Create a completed tournament: in-progress → score all matches → finish.
 * Uses 3 rounds to keep the setup fast. Ends on the Play tab in completed state.
 */
export async function createCompletedTournament(page: Page) {
  await clearState(page);
  await createTournament(page);
  await addFourPlayers(page);

  // Cap rounds to 3 so scoring finishes quickly
  const roundsInput = page.locator('#config-rounds');
  await roundsInput.fill('3');

  await generateSchedule(page);
  await navigateToTab(page, 'Play');
  await scoreAllMatches(page);

  // Finish the tournament
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

  // Completed view shows "Share Results as Text" button
  await page.getByRole('button', { name: 'Share Results as Text' }).waitFor();
}
