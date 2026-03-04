import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  addPlayerAsOrganizer,
  deleteTournament,
} from './helpers';

/** Select Club Ranked format and add 2 clubs */
async function selectClubRankedWithClubs(page: import('@playwright/test').Page) {
  // Open Format section
  const formatSection = page.getByText('Format').first();
  await formatSection.click();
  await expect(page.locator('input[name="format-preset"]').first()).toBeVisible({ timeout: 5000 });

  // Select Club Ranked
  await page.getByText('Club Ranked', { exact: true }).first().click();
  await expect(page.getByText(/Clubs \(/)).toBeVisible({ timeout: 5000 });

  // Add 2 clubs (starts at 0)
  const addClubBtn = page.getByRole('button', { name: '+ Add' }).filter({ hasText: '+ Add' });
  // There may be multiple "+ Add" buttons (courts, clubs). Target the one inside the clubs section.
  const clubsSection = page.locator('[class*="clubsSection"], [class*="clubs"]').filter({ hasText: /Clubs \(/ });
  const clubAddBtn = clubsSection.getByRole('button', { name: '+ Add' });
  await clubAddBtn.click();
  await expect(page.getByText(/Clubs \(1\)/)).toBeVisible({ timeout: 3000 });
  await clubAddBtn.click();
  await expect(page.getByText(/Clubs \(2\)/)).toBeVisible({ timeout: 3000 });

  // Collapse Format section to clean up the view
  await formatSection.click();
}

/** Switch to "Share & Invite" player mode */
async function switchToShareMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Share & Invite' }).click();
}

/** Open the Format collapsible section (captain mode checkbox lives inside it) */
async function openFormatSection(page: import('@playwright/test').Page) {
  const formatSection = page.getByText('Format').first();
  await formatSection.click();
  await expect(page.locator('input[name="format-preset"]').first()).toBeVisible({ timeout: 5000 });
}

/** Toggle captain mode checkbox (inside the Format section) */
async function toggleCaptainCheckbox(page: import('@playwright/test').Page, checked: boolean) {
  // Ensure Format section is open (checkbox lives inside it)
  const checkbox = page.getByRole('checkbox', { name: 'Captain mode' });
  if (!await checkbox.isVisible().catch(() => false)) {
    await openFormatSection(page);
  }
  await checkbox.click();
  // Wait for the Firebase round-trip to update the checkbox state
  if (checked) {
    await expect(checkbox).toBeChecked({ timeout: 15000 });
  } else {
    await expect(checkbox).not.toBeChecked({ timeout: 15000 });
  }
}

/** Approve a player via Firebase REST API (simulates captain approval) */
async function approvePlayer(page: import('@playwright/test').Page, playerName: string) {
  // Get the share code from the page to identify the tournament
  const shareCode = await page.locator('text=/^[A-Z2-9]{6}$/').first().textContent({ timeout: 5000 });
  if (!shareCode) throw new Error('Share code not found on page');

  await page.evaluate(async ({ name, code }) => {
    const { auth } = await import('/plan/src/firebase.ts');
    if (!auth?.currentUser) throw new Error('Not authenticated');
    const token = await auth.currentUser.getIdToken();

    const dbUrl = 'https://tournament-app-a1059-default-rtdb.europe-west1.firebasedatabase.app';

    // Look up tournament ID by share code
    const codeRes = await fetch(`${dbUrl}/codes/${code}.json?auth=${token}`);
    const tournamentId = await codeRes.json() as string | null;
    if (!tournamentId) throw new Error(`Tournament not found for code ${code}`);

    // Fetch just the players for this tournament
    const playersRes = await fetch(`${dbUrl}/tournaments/${tournamentId}/players.json?auth=${token}`);
    const players = await playersRes.json() as Record<string, { name: string }> | null;
    if (!players) throw new Error('No players found');

    const playerEntry = Object.entries(players).find(([, p]) => p.name === name);
    if (!playerEntry) throw new Error(`Player ${name} not found`);

    // PATCH the player's captainApproved field
    await fetch(`${dbUrl}/tournaments/${tournamentId}/players/${playerEntry[0]}.json?auth=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captainApproved: true }),
    });
  }, { name: playerName, code: shareCode });
}

/** Assign a player to a club via the combobox in the player list */
async function assignPlayerToClub(page: import('@playwright/test').Page, playerName: string, clubName: string) {
  // Find the playerItem container that has the player name, then select from its combobox
  const row = page.locator('[class*="playerItem"]').filter({ hasText: playerName });
  await row.getByRole('combobox').first().selectOption({ label: clubName });
}

test.describe('Club Ranked — Captain Mode', () => {
  test('captain mode toggle is visible for club-ranked format', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);
    await selectClubRankedWithClubs(page);
    await openFormatSection(page);

    // Captain mode checkbox should be visible inside Format section (requires club format)
    await expect(page.getByRole('checkbox', { name: 'Captain mode' })).toBeVisible({ timeout: 5000 });

    await deleteTournament(page);
  });

  test('club-ranked without captain mode shows sectioned list (Playing/Reserve)', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);
    await selectClubRankedWithClubs(page);

    // Add players (in quick mode, no captain mode)
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');

    // Sections should appear even without captain mode
    await expect(page.getByText(/Playing \(2\)/)).toBeVisible({ timeout: 5000 });

    // No Registered section without captain mode
    await expect(page.getByText(/^Registered \(/)).not.toBeVisible();

    await deleteTournament(page);
  });

  test('club-ranked with captain mode shows Registered section for unapproved players', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);
    await selectClubRankedWithClubs(page);

    // Add players first (before enabling captain mode to avoid option conflicts)
    await addPlayerAsOrganizer(page, 'Alice');
    await addPlayerAsOrganizer(page, 'Bob');

    // Assign players to clubs
    await assignPlayerToClub(page, 'Alice', 'Club 1');
    await assignPlayerToClub(page, 'Bob', 'Club 2');

    // Switch to share mode and enable captain mode
    await switchToShareMode(page);
    await toggleCaptainCheckbox(page, true);

    // Players are not captain-approved → should appear in "Registered" section
    await expect(page.getByText(/Registered \(2\)/)).toBeVisible({ timeout: 5000 });

    // "Playing" section should NOT appear (no approved players)
    await expect(page.getByText(/^Playing \(/)).not.toBeVisible();

    // Approve Alice via Firebase — she should move to Playing
    await approvePlayer(page, 'Alice');
    await expect(page.getByText(/Playing \(1\)/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Registered \(1\)/)).toBeVisible({ timeout: 5000 });

    await deleteTournament(page);
  });

  test('disabling captain mode removes Registered section but keeps Playing', async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);

    await createTournament(page);
    await selectClubRankedWithClubs(page);

    // Add player first (before captain mode)
    await addPlayerAsOrganizer(page, 'Alice');
    await assignPlayerToClub(page, 'Alice', 'Club 1');

    // Enable captain mode
    await switchToShareMode(page);
    await toggleCaptainCheckbox(page, true);
    await expect(page.getByText(/Registered \(/)).toBeVisible({ timeout: 5000 });

    // Disable captain mode
    await toggleCaptainCheckbox(page, false);

    // Registered section should disappear, but Playing should remain
    await expect(page.getByText(/^Registered \(/)).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Playing \(1\)/)).toBeVisible({ timeout: 5000 });

    await deleteTournament(page);
  });
});
