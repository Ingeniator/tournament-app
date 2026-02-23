import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  getShareCode,
  goBack,
  joinByCode,
  registerAsPlayer,
  openTournamentByName,
  deleteTournament,
} from './helpers';

test.describe('Player Registration', () => {
  test('player can register for a tournament', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    // Create tournament, get code, go back
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);

    // Join via code
    await joinByCode(page, code);

    // Register as a player
    await registerAsPlayer(page, 'TestPlayer');

    // Verify confirmation
    await expect(page.getByText("You're confirmed!")).toBeVisible();
    await expect(page.getByText('Registered as')).toBeVisible();
    await expect(page.getByText('TestPlayer').first()).toBeVisible();

    // Verify the player appears in the player list
    await expect(page.getByText(/Players \(1/)).toBeVisible();

    // Clean up: go back, open from My Tournaments (first entry), delete
    await goBack(page);
    await openTournamentByName(page, tournamentName);
    await expect(page.getByText('Share with Players')).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('registered player can cancel and re-confirm participation', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);

    await joinByCode(page, code);
    await registerAsPlayer(page, 'FlipPlayer');

    // Cancel participation
    await page.getByRole('button', { name: 'Cancel participation' }).click();
    await expect(page.getByText("You've cancelled")).toBeVisible({ timeout: 5000 });

    // Re-confirm
    await page.getByRole('button', { name: 'Confirm participation' }).click();
    await expect(page.getByText("You're confirmed!")).toBeVisible({ timeout: 5000 });

    // Clean up
    await goBack(page);
    await openTournamentByName(page, tournamentName);
    // May land on organizer or join screen depending on which section was clicked
    await Promise.race([
      page.getByText('Share with Players').waitFor({ timeout: 10000 }),
      page.getByText("You're confirmed!").waitFor({ timeout: 10000 }),
    ]);
    // If on join screen, go back and open via My Tournaments (first section)
    if (await page.getByText("You're confirmed!").isVisible().catch(() => false)) {
      await goBack(page);
      // My Tournaments is listed before Registered, so the first instance is the organizer entry
      await openTournamentByName(page, tournamentName);
      await expect(page.getByText('Share with Players')).toBeVisible({ timeout: 10000 });
    }
    await deleteTournament(page);
  });

  test('tournament appears in Registered Tournaments list after joining', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);

    await joinByCode(page, code);
    await registerAsPlayer(page, 'ListPlayer');

    // Go back to home
    await goBack(page);

    // Tournament should appear under "Registered Tournaments" heading
    await expect(page.getByText('Registered Tournaments')).toBeVisible();
    await expect(page.getByText(tournamentName).first()).toBeVisible({ timeout: 10000 });

    // Clean up: open tournament (first instance = My Tournaments = organizer view)
    await openTournamentByName(page, tournamentName);
    await Promise.race([
      page.getByText('Share with Players').waitFor({ timeout: 10000 }),
      page.getByText("You're confirmed!").waitFor({ timeout: 10000 }),
    ]);
    if (await page.getByText("You're confirmed!").isVisible().catch(() => false)) {
      await goBack(page);
      await openTournamentByName(page, tournamentName);
      await expect(page.getByText('Share with Players')).toBeVisible({ timeout: 10000 });
    }
    await deleteTournament(page);
  });
});
