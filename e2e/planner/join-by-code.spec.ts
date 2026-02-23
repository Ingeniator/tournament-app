import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  getShareCode,
  goBack,
  joinByCode,
  deleteTournament,
} from './helpers';

test.describe('Join via Short Code', () => {
  test('join tournament by 6-character code', async ({ page, context }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    // Create a tournament and grab the code
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);

    // Open a second tab (simulates another user viewing the tournament)
    const playerPage = await context.newPage();
    await playerPage.goto('/plan');
    await waitForHome(playerPage);

    await joinByCode(playerPage, code);

    // Verify the join screen shows the tournament name
    await expect(playerPage.getByRole('heading', { name: tournamentName })).toBeVisible();

    // Verify the registration form is shown
    await expect(playerPage.getByText('Join this tournament as')).toBeVisible();

    await playerPage.close();

    // Clean up: open tournament and delete
    await page.getByText(tournamentName).click();
    await expect(page.getByText('Share with Players')).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('join via deep link with ?code= parameter', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    // Create a tournament and get the code
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);

    // Navigate to the deep link URL
    await page.goto(`/plan?code=${code}`);

    // Should land on the join screen directly
    await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible({ timeout: 15000 });

    // Go back and clean up
    await goBack(page);
    await page.getByText(tournamentName).click();
    await expect(page.getByText('Share with Players')).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('invalid code shows error', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);

    await page.getByRole('button', { name: 'Join with Code' }).click();
    const codeInput = page.getByLabel('Tournament join code');
    await codeInput.fill('XXXXXX');
    await page.getByRole('button', { name: 'Join' }).click();

    await expect(page.getByText('Tournament not found')).toBeVisible({ timeout: 10000 });
  });
});
