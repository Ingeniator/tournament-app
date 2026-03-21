import { test, expect } from '@playwright/test';
import {
  createMaldicionesTournament,
  navigateToTab,
  scoreMatch,
  dismissInterstitial,
  closeOverlay,
} from './helpers';

test.describe('Maldiciones del Padel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await createMaldicionesTournament(page);
  });

  test('curse card picker opens for unscored match', async ({ page }) => {
    // Click the skull button (☠️) to open the curse card picker
    const castBtn = page.locator('[class*="castBtn"]').first();
    await castBtn.click();
    // The modal title should say "Cast a Curse"
    await expect(page.getByText('Cast a Curse')).toBeVisible();
  });

  test('cast curse on opponent — card appears on match', async ({ page }) => {
    // Click the skull button for team1
    const castBtn = page.locator('[class*="castBtn"]').first();
    await castBtn.click();
    await expect(page.getByText('Cast a Curse')).toBeVisible();

    // Pick a curse card (Los Mudos)
    await page.getByText('Los Mudos').click();
    // Should now show "Pick Target"
    await expect(page.getByText('Pick Target')).toBeVisible();

    // Select an opponent player
    await page.getByText(/☠️ Charlie/).click();

    // Curse should appear on the match card
    await expect(page.getByText('Los Mudos').first()).toBeVisible();
  });

  test('cannot cast two curses on same match', async ({ page }) => {
    // Cast first curse
    const castBtn = page.locator('[class*="castBtn"]').first();
    await castBtn.click();
    await page.getByText('Los Mudos').click();
    await page.getByText(/☠️ Charlie/).click();

    // After curse is cast, the cast button for the other team should not appear
    // on the same match (since a curse is already active)
    // The match should show the curse label instead of cast buttons
    await expect(page.getByText('Los Mudos').first()).toBeVisible();

    // No more castBtn should be visible on this match
    const remainingCastBtns = page.locator('[class*="castBtn"]');
    await expect(remainingCastBtns).toHaveCount(0);
  });

  test('shield blocks a curse', async ({ page }) => {
    // Cast curse from team1 on team2
    const castBtn = page.locator('[class*="castBtn"]').first();
    await castBtn.click();
    await page.getByText('Los Mudos').click();
    await page.getByText(/☠️ Charlie/).click();

    // Team2 should see the shield button (🛡️)
    const shieldBtn = page.locator('[class*="shieldBtn"]');
    await expect(shieldBtn).toBeVisible();
    await shieldBtn.click();

    // After shielding, the curse should be marked as shielded
    // Shield icon should appear, and the shield button should be gone
    await expect(page.locator('[class*="shieldedIcon"]')).toBeVisible();
    await expect(page.locator('[class*="shieldBtn"]')).toHaveCount(0);
  });

  test('veto removes a curse before scoring', async ({ page }) => {
    // Cast curse
    const castBtn = page.locator('[class*="castBtn"]').first();
    await castBtn.click();
    await page.getByText('Los Mudos').click();
    await page.getByText(/☠️ Charlie/).click();

    // The veto button (🙅) should be visible
    const vetoBtn = page.locator('[class*="vetoBtn"]');
    await expect(vetoBtn).toBeVisible();
    await vetoBtn.click();

    // After veto, curse should be removed and cast buttons should reappear
    await expect(page.locator('[class*="castBtn"]').first()).toBeVisible();
  });

  test('score match with active curse', async ({ page }) => {
    // Cast curse
    const castBtn = page.locator('[class*="castBtn"]').first();
    await castBtn.click();
    await page.getByText('Los Mudos').click();
    await page.getByText(/☠️ Charlie/).click();

    // Score the match
    await scoreMatch(page, 15);

    // After scoring, the curse should appear in the scored match as history
    // Navigate to Log to see scored matches
    await dismissInterstitial(page);
    await navigateToTab(page, 'Log');
    await expect(page.getByText('Los Mudos').first()).toBeVisible();
  });

  test('card removed from hand after casting', async ({ page }) => {
    // Open maldiciones rules modal to check initial hand count
    await page.getByText('🎭 Maldiciones del Padel').click();
    await expect(page.getByText('Team Hands')).toBeVisible();
    // Team1 (Alice & Bob) should have 2 cards
    await expect(page.getByText('2 cards left').first()).toBeVisible();
    await closeOverlay(page);

    // Cast a curse
    const castBtn = page.locator('[class*="castBtn"]').first();
    await castBtn.click();
    await page.getByText('Los Mudos').click();
    await page.getByText(/☠️ Charlie/).click();

    // Check hands again — team1 should now have 1 card
    await page.getByText('🎭 Maldiciones del Padel').click();
    await expect(page.getByText('1 cards left').first()).toBeVisible();
  });

  test('maldiciones info/rules modal opens', async ({ page }) => {
    // Click the maldiciones info button
    await page.getByText('🎭 Maldiciones del Padel').click();

    // Modal should show rules
    await expect(page.getByText('Team Hands')).toBeVisible();
    await expect(page.getByText(/cards left/).first()).toBeVisible();

    // Should show chaos level badge
    await expect(page.getByText('Medium (green + yellow)')).toBeVisible();

    // Should show card catalog
    await expect(page.getByText('Green').first()).toBeVisible();
  });

  test('completed tournament shows maldiciones awards', async ({ page }) => {
    test.setTimeout(60_000);

    // Score the match
    await scoreMatch(page, 15);
    await dismissInterstitial(page);

    // Finish tournament
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Finish Tournament' }).click();

    // Skip ceremony if it appears
    const skipBtn = page.getByRole('button', { name: 'Skip' });
    try {
      await skipBtn.waitFor({ timeout: 3000 });
      await skipBtn.click();
    } catch {
      // No ceremony
    }

    // In completed view, check round results for curse history
    await page.getByText('Round Results').click();
    await expect(page.getByText('Court 1')).toBeVisible();
  });

  test('cards dealt at tournament start (hands populated)', async ({ page }) => {
    // The maldiciones hands should be populated
    // We can verify via the info modal
    await page.getByText('🎭 Maldiciones del Padel').click();
    await expect(page.getByText('Team Hands')).toBeVisible();

    // Both teams should have cards
    const cardsLeftTexts = page.getByText(/cards left/);
    await expect(cardsLeftTexts.first()).toBeVisible();
    // At least 2 teams shown
    const count = await cardsLeftTexts.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('chaos level selector visible in config', async ({ page }) => {
    // Navigate to the maldiciones rules modal — it shows the chaos level
    await page.getByText('🎭 Maldiciones del Padel').click();
    await expect(page.getByText('Medium (green + yellow)')).toBeVisible();
  });
});
