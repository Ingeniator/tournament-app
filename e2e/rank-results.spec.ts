import { test, expect, type Page } from '@playwright/test';

/**
 * Seed a completed club-ranked tournament with 3 clubs, 2 ranks, 3 rounds.
 * Each rank has 3 matches (full round-robin: A vs B, A vs C, B vs C).
 */
async function seedClubRankedCompleted(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    const tournament = {
      id: 'cr-test',
      name: 'Club Championship',
      config: {
        format: 'club-ranked',
        pointsPerMatch: 21,
        courts: [
          { id: 'c1', name: 'Court 1' },
          { id: 'c2', name: 'Court 2' },
        ],
        maxRounds: null,
        rankLabels: ['1st Rank', '2nd Rank'],
      },
      phase: 'completed',
      ceremonyCompleted: true,
      clubs: [
        { id: 'clubA', name: 'Eagles' },
        { id: 'clubB', name: 'Hawks' },
        { id: 'clubC', name: 'Wolves' },
      ],
      players: [
        // Eagles - rank 0
        { id: 'p1', name: 'Alice', clubId: 'clubA', rankSlot: 0 },
        { id: 'p2', name: 'Bob', clubId: 'clubA', rankSlot: 0 },
        // Eagles - rank 1
        { id: 'p3', name: 'Charlie', clubId: 'clubA', rankSlot: 1 },
        { id: 'p4', name: 'Diana', clubId: 'clubA', rankSlot: 1 },
        // Hawks - rank 0
        { id: 'p5', name: 'Eve', clubId: 'clubB', rankSlot: 0 },
        { id: 'p6', name: 'Frank', clubId: 'clubB', rankSlot: 0 },
        // Hawks - rank 1
        { id: 'p7', name: 'Grace', clubId: 'clubB', rankSlot: 1 },
        { id: 'p8', name: 'Henry', clubId: 'clubB', rankSlot: 1 },
        // Wolves - rank 0
        { id: 'p9', name: 'Ivan', clubId: 'clubC', rankSlot: 0 },
        { id: 'p10', name: 'Julia', clubId: 'clubC', rankSlot: 0 },
        // Wolves - rank 1
        { id: 'p11', name: 'Kevin', clubId: 'clubC', rankSlot: 1 },
        { id: 'p12', name: 'Laura', clubId: 'clubC', rankSlot: 1 },
      ],
      teams: [
        { id: 't1', player1Id: 'p1', player2Id: 'p2' },
        { id: 't2', player1Id: 'p3', player2Id: 'p4' },
        { id: 't3', player1Id: 'p5', player2Id: 'p6' },
        { id: 't4', player1Id: 'p7', player2Id: 'p8' },
        { id: 't5', player1Id: 'p9', player2Id: 'p10' },
        { id: 't6', player1Id: 'p11', player2Id: 'p12' },
      ],
      rounds: [
        // Round 1: Eagles vs Hawks (Wolves sit out)
        {
          id: 'r1',
          roundNumber: 1,
          matches: [
            {
              id: 'm1',
              courtId: 'c1',
              team1: ['p1', 'p2'],
              team2: ['p5', 'p6'],
              score: { team1Points: 15, team2Points: 6 },
            },
            {
              id: 'm2',
              courtId: 'c2',
              team1: ['p3', 'p4'],
              team2: ['p7', 'p8'],
              score: { team1Points: 10, team2Points: 11 },
            },
          ],
          sitOuts: ['p9', 'p10', 'p11', 'p12'],
        },
        // Round 2: Eagles vs Wolves (Hawks sit out)
        {
          id: 'r2',
          roundNumber: 2,
          matches: [
            {
              id: 'm3',
              courtId: 'c1',
              team1: ['p1', 'p2'],
              team2: ['p9', 'p10'],
              score: { team1Points: 12, team2Points: 9 },
            },
            {
              id: 'm4',
              courtId: 'c2',
              team1: ['p3', 'p4'],
              team2: ['p11', 'p12'],
              score: { team1Points: 14, team2Points: 7 },
            },
          ],
          sitOuts: ['p5', 'p6', 'p7', 'p8'],
        },
        // Round 3: Hawks vs Wolves (Eagles sit out)
        {
          id: 'r3',
          roundNumber: 3,
          matches: [
            {
              id: 'm5',
              courtId: 'c1',
              team1: ['p5', 'p6'],
              team2: ['p9', 'p10'],
              score: { team1Points: 13, team2Points: 8 },
            },
            {
              id: 'm6',
              courtId: 'c2',
              team1: ['p7', 'p8'],
              team2: ['p11', 'p12'],
              score: { team1Points: 11, team2Points: 10 },
            },
          ],
          sitOuts: ['p1', 'p2', 'p3', 'p4'],
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    localStorage.setItem('padel-tournament-v1', JSON.stringify(tournament));
  });
  await page.reload();
}

test.describe('Rank Results Cards', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await seedClubRankedCompleted(page);
  });

  test('shows rank result cards in completed view', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
    // The rank labels should be visible in the carousel
    await expect(page.getByText('1st Rank').first()).toBeVisible({ timeout: 5000 });
  });

  test('rank card shows tournament name', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();
    await expect(page.getByText('Club Championship').first()).toBeVisible();
  });

  test('rank card shows player names from all 3 matches', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();

    // First rank card (rank 0) should show all 3 round-robin matches
    await expect(page.getByText('Alice & Bob').first()).toBeVisible();
    await expect(page.getByText('Eve & Frank').first()).toBeVisible();
    await expect(page.getByText('Ivan & Julia').first()).toBeVisible();
  });

  test('rank card shows all 3 club names', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();

    await expect(page.getByText('Eagles').first()).toBeVisible();
    await expect(page.getByText('Hawks').first()).toBeVisible();
    await expect(page.getByText('Wolves').first()).toBeVisible();
  });

  test('can navigate to rank cards via carousel dots', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();

    const dots = page.locator('button[aria-label^="Go to slide"]');
    const dotCount = await dots.count();
    // standings + club standings + 2 rank cards + nominations
    expect(dotCount).toBeGreaterThanOrEqual(4);

    // Navigate to first rank card (after standings & club standings)
    await dots.nth(2).click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.getByText('1st Rank').first()).toBeVisible();
  });

  test('second rank card shows rank 1 matches', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();

    const dots = page.locator('button[aria-label^="Go to slide"]');
    await dots.nth(3).click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.getByText('2nd Rank').first()).toBeVisible();
    // Rank 1 matches: Charlie & Diana, Grace & Henry, Kevin & Laura
    await expect(page.getByText('Charlie & Diana').first()).toBeVisible();
    await expect(page.getByText('Grace & Henry').first()).toBeVisible();
    await expect(page.getByText('Kevin & Laura').first()).toBeVisible();
  });

  test('rank cards appear after standings in carousel order', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();

    // First slide should be the standings table
    await expect(page.getByRole('columnheader', { name: '#' }).first()).toBeVisible();

    // Navigate to rank card slide
    const dots = page.locator('button[aria-label^="Go to slide"]');
    await dots.nth(2).click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.getByText('1st Rank').first()).toBeVisible();
  });

  test('screenshot of rank results card with 3 matches', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();

    const dots = page.locator('button[aria-label^="Go to slide"]');
    await dots.nth(2).click({ force: true });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('rank-results-card.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Rank Results Cards - no ranks', () => {
  test('no rank cards when tournament has no rankLabels', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.clear();
      const tournament = {
        id: 'no-rank-test',
        name: 'Normal Cup',
        config: {
          format: 'americano',
          pointsPerMatch: 24,
          courts: [{ id: 'c1', name: 'Court 1' }],
          maxRounds: null,
        },
        phase: 'completed',
        ceremonyCompleted: true,
        players: [
          { id: 'p1', name: 'Alice' },
          { id: 'p2', name: 'Bob' },
          { id: 'p3', name: 'Charlie' },
          { id: 'p4', name: 'Diana' },
        ],
        rounds: [
          {
            id: 'r1',
            roundNumber: 1,
            matches: [
              {
                id: 'm1',
                courtId: 'c1',
                team1: ['p1', 'p2'],
                team2: ['p3', 'p4'],
                score: { team1Points: 15, team2Points: 9 },
              },
            ],
            sitOuts: [],
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      localStorage.setItem('padel-tournament-v1', JSON.stringify(tournament));
    });
    await page.reload();

    await expect(page.getByRole('button', { name: 'Share Results as Text' })).toBeVisible();

    const rankText = page.getByText('1st Rank');
    await expect(rankText).toHaveCount(0);
  });
});
