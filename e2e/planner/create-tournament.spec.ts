import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  getShareCode,
  addPlayerAsOrganizer,
  deleteTournament,
  goBack,
} from './helpers';

test.describe('Create Tournament', () => {
  test('home screen renders after auth', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await expect(page.getByRole('heading', { name: 'Tournament Planner' })).toBeVisible();
  });

  test('create tournament and see organizer screen', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    const tournamentName = await createTournament(page);

    // Verify we're on the organizer screen
    await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible();
    await expect(page.getByText('Share with Players')).toBeVisible();

    // Verify a share code is displayed
    const code = await getShareCode(page);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    // Verify tournament appears in "My Tournaments" after going back
    await goBack(page);
    await expect(page.getByText(tournamentName)).toBeVisible();

    // Clean up: re-open and delete
    await page.getByText(tournamentName).click();
    await expect(page.getByText('Share with Players')).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('organizer can add players', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);

    // Add players
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');
    await addPlayerAsOrganizer(page, 'Charlie');

    // Verify player count in the section title
    await expect(page.getByText(/Players \(3/)).toBeVisible();

    // Verify each player name appears
    for (const name of ['Alice', 'Bob', 'Charlie']) {
      await expect(page.getByText(name).first()).toBeVisible();
    }

    // Clean up
    await deleteTournament(page);
  });

  test('organizer can configure format and courts', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);

    // The "Format & Courts" section is open by default for a new tournament.
    // Wait for the select element to be visible.
    const formatSelect = page.locator('select');
    await expect(formatSelect).toBeVisible({ timeout: 10000 });

    // Change format to Mexicano
    await formatSelect.selectOption('mexicano');

    // Add a second court (the courts "+ Add" button is inside the "Format & Courts" section)
    const courtsHeader = page.getByText(/Courts \(\d+\)/).locator('..');
    await courtsHeader.getByRole('button', { name: '+ Add' }).click();
    await expect(page.getByText('Courts (2)')).toBeVisible({ timeout: 5000 });

    // Clean up
    await deleteTournament(page);
  });
});
