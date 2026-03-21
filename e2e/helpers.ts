import { type Page, expect } from '@playwright/test';

/** Clear localStorage and reload to get a fresh home screen. */
export async function clearState(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('heading', { name: 'Tournament Manager' }).waitFor();
}

interface TournamentOptions {
  name?: string;
  players?: Array<{ id: string; name: string; group?: string; clubId?: string; rankSlot?: number }>;
  format?: string;
  courts?: Array<{ id: string; name: string }>;
  maxRounds?: number | null;
  pointsPerMatch?: number;
  teams?: Array<{ id: string; player1Id: string; player2Id: string }>;
  scoringMode?: string;
  targetDuration?: number;
}

/**
 * Create a tournament by seeding localStorage and reloading.
 * The app auto-generates the schedule from setup phase on load.
 * Ends on the Play tab in in-progress state.
 */
export async function createTournament(page: Page, options?: TournamentOptions) {
  const opts = options ?? {};
  await page.evaluate((o) => {
    localStorage.clear();
    const id = Math.random().toString(36).slice(2, 10);
    const now = Date.now();
    const config: Record<string, unknown> = {
      format: o.format ?? 'americano',
      pointsPerMatch: o.pointsPerMatch ?? 24,
      courts: o.courts ?? [{ id: 'c1', name: 'Court 1' }],
      maxRounds: o.maxRounds ?? null,
    };
    if (o.scoringMode) config.scoringMode = o.scoringMode;
    if (o.targetDuration) config.targetDuration = o.targetDuration;

    const tournament: Record<string, unknown> = {
      id,
      name: o.name ?? 'Test Cup',
      config,
      phase: 'setup',
      players: o.players ?? [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
        { id: 'p4', name: 'Diana' },
      ],
      rounds: [],
      createdAt: now,
      updatedAt: now,
    };
    if (o.teams) tournament.teams = o.teams;
    localStorage.setItem('padel-tournament-v1', JSON.stringify(tournament));
  }, opts);

  await page.reload();
  // App auto-generates schedule from setup phase, lands on in-progress view
  await page.locator('nav').getByRole('button', { name: 'Play' }).waitFor();
}

/** Navigate to a tab using the bottom navigation. */
export async function navigateToTab(page: Page, tab: 'Play' | 'Log' | 'Settings') {
  await page.locator('nav').getByRole('button', { name: tab }).click();
}

/** Close any open modal/overlay by clicking the ✕ button. */
export async function closeOverlay(page: Page) {
  const closeBtn = page.getByRole('button', { name: '✕' });
  await closeBtn.waitFor({ timeout: 5000 });
  await closeBtn.click();
  await closeBtn.waitFor({ state: 'hidden' });
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

  // The picker grid appears. Click the score value inside the grid (not the scoreBtn display).
  const picker = page.locator('[data-picking]');
  await picker.locator('[class*="cell"]', { hasText: new RegExp(`^${team1Score}$`) }).click();

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
 * Create a full in-progress tournament: 4 players, americano format.
 * Ends on the Play tab.
 */
export async function createInProgressTournament(page: Page) {
  await createTournament(page);
}

/**
 * Create a completed tournament: in-progress → score all matches → finish.
 * Uses maxRounds=3 to keep the setup fast. Ends on the Play tab in completed state.
 */
export async function createCompletedTournament(page: Page) {
  await createTournament(page, { maxRounds: 3 });
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

/**
 * Verify a text is visible on the page.
 */
export async function expectVisible(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).toBeVisible();
}

/**
 * Create a maldiciones-enabled team-americano tournament via localStorage.
 * 4 players, 1 court, maldiciones with medium chaos level.
 * Returns on the Play tab with maldiciones UI active.
 */
export async function createMaldicionesTournament(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    const id = Math.random().toString(36).slice(2, 10);
    const now = Date.now();
    const players = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Charlie' },
      { id: 'p4', name: 'Diana' },
    ];
    const teams = [
      { id: 'team1', player1Id: 'p1', player2Id: 'p2' },
      { id: 'team2', player1Id: 'p3', player2Id: 'p4' },
    ];
    const maldicionesHands = {
      team1: { cardIds: ['los-mudos', 'el-espejo'], hasShield: true },
      team2: { cardIds: ['slow-motion', 'el-pegajoso'], hasShield: true },
    };
    const tournament = {
      id,
      name: 'Maldiciones Cup',
      config: {
        format: 'team-americano',
        pointsPerMatch: 24,
        courts: [{ id: 'c1', name: 'Court 1' }],
        maxRounds: 3,
        maldiciones: { enabled: true, chaosLevel: 'medium' },
      },
      phase: 'in-progress',
      players,
      teams,
      maldicionesHands,
      rounds: [{
        id: 'r1', roundNumber: 1, sitOuts: [],
        matches: [
          { id: 'm1', courtId: 'c1', team1: ['p1', 'p2'], team2: ['p3', 'p4'], score: null },
        ],
      }],
      createdAt: now,
      updatedAt: now,
    };
    localStorage.setItem('padel-tournament-v1', JSON.stringify(tournament));
  });
  await page.reload();
  await navigateToTab(page, 'Play');
}
