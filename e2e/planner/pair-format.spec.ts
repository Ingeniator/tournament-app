import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  addPlayerAsOrganizer,
  deleteTournament,
} from './helpers';

/** Select Team Americano format from the FormatPicker */
async function selectTeamAmericano(page: import('@playwright/test').Page) {
  // Open the Format section (collapsed by default for existing tournaments)
  const formatSection = page.getByText('Format').first();
  await formatSection.click();
  // Wait for radio list to be visible
  await expect(page.locator('input[name="format-preset"]').first()).toBeVisible({ timeout: 5000 });
  // Click the Team Americano radio label
  await page.getByText('Team Americano', { exact: true }).first().click();
  // Wait for format to be applied by checking it's selected
  await expect(page.locator('input[name="format-preset"][value="team-americano"], input[name="format-preset"]:checked').first()).toBeVisible({ timeout: 3000 });
}

test.describe('Pair Format — Team Americano', () => {
  test('solo players show in Needs partner section', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);
    await selectTeamAmericano(page);

    // Add players
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');

    // Both players should be in "Needs partner" section since they have no partners
    await expect(page.getByText(/Needs partner/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Alice').first()).toBeVisible();
    await expect(page.getByText('Bob').first()).toBeVisible();

    // "Playing" section should NOT appear (no complete pairs)
    await expect(page.getByText(/^Playing \(/)).not.toBeVisible();

    // Clean up
    await deleteTournament(page);
  });

  test('section headers appear for pair formats', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);
    await selectTeamAmericano(page);

    // Add a player
    await addPlayerAsOrganizer(page, 'SoloPlayer');

    // The "Needs partner" section header should be visible
    const needsPartner = page.getByText(/Needs partner/i);
    await expect(needsPartner).toBeVisible({ timeout: 5000 });

    // Clean up
    await deleteTournament(page);
  });

  test('non-pair format does not show sections', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);

    // Default format is Americano (non-pair format)
    await addPlayerAsOrganizer(page, 'NormalPlayer');

    // Should NOT show pair-format sections
    await expect(page.getByText(/Needs partner/i)).not.toBeVisible();
    await expect(page.getByText('NormalPlayer').first()).toBeVisible();

    // Clean up
    await deleteTournament(page);
  });
});
