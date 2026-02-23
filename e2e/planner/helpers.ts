import { type Page, expect } from '@playwright/test';

/**
 * Wait for Firebase auth to complete and the home screen to render.
 * Waits for either the name prompt or the "Logged in as" badge,
 * which indicates auth and profile loading are both done.
 */
export async function waitForHome(page: Page) {
  // Firebase auth can be slow in headless mode — if we see a "Connection Error"
  // page, click Retry and wait again.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.getByRole('heading', { name: 'Tournament Planner' }).waitFor({ timeout: 15000 });
      break;
    } catch {
      const retryBtn = page.getByRole('button', { name: 'Retry' });
      if (await retryBtn.isVisible().catch(() => false)) {
        await retryBtn.click();
      } else {
        throw new Error('Home screen did not load');
      }
    }
  }
  // Wait for auth + profile to finish loading (either name prompt or logged-in badge)
  await Promise.race([
    page.getByText('Set your name to get started').waitFor({ timeout: 15000 }),
    page.getByText('Logged in as').waitFor({ timeout: 15000 }),
  ]);
}

/**
 * Set the user's profile name if the name prompt is visible (first visit).
 * Safe to call even if the name is already set.
 */
export async function setProfileName(page: Page, name: string) {
  const namePrompt = page.getByText('Set your name to get started');
  if (await namePrompt.isVisible().catch(() => false)) {
    const input = page.getByPlaceholder('Group Name / Your name');
    await input.fill(name);
    await page.getByRole('button', { name: 'Save' }).click();
  }
  // Wait for the "Logged in as" badge to confirm name was saved
  await expect(page.getByText('Logged in as')).toBeVisible({ timeout: 10000 });
}

/**
 * Create a tournament from the home screen.
 * Returns the tournament name used.
 */
export async function createTournament(page: Page, name?: string) {
  const tournamentName = name ?? `E2E Test ${Date.now()}`;
  const input = page.locator('#tournament-name');
  await input.clear();
  await input.fill(tournamentName);
  // Wait for the button to become enabled (requires userName to be set)
  const createBtn = page.getByRole('button', { name: 'Create Tournament' });
  await expect(createBtn).toBeEnabled({ timeout: 10000 });
  await createBtn.click();
  // Wait for the organizer screen to load (share code appears)
  await expect(page.getByText('Share with Players')).toBeVisible({ timeout: 15000 });
  return tournamentName;
}

/**
 * Get the 6-character share code from the organizer screen.
 */
export async function getShareCode(page: Page): Promise<string> {
  const codeEl = page.locator('span[class*="code"]').filter({ hasText: /^[A-Z2-9]{6}$/ });
  const code = await codeEl.textContent({ timeout: 5000 });
  if (!code || code.length !== 6) throw new Error(`Invalid share code: ${code}`);
  return code;
}

/**
 * Add a player from the organizer screen.
 */
export async function addPlayerAsOrganizer(page: Page, name: string) {
  const input = page.getByPlaceholder('Player name or paste a list');
  // Ensure input is focused and empty before typing
  await input.click();
  await expect(input).toHaveValue('', { timeout: 5000 });
  await input.fill(name);
  await input.press('Enter');
  // Wait for the player to appear in the list and the input to clear
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  await expect(input).toHaveValue('', { timeout: 5000 });
}

/**
 * Navigate back to home from any screen.
 */
export async function goBack(page: Page) {
  await page.getByLabel('Back').click();
  await waitForHome(page);
}

/**
 * Join a tournament by code from the home screen.
 * Assumes we're already on the home screen.
 */
export async function joinByCode(page: Page, code: string) {
  await page.getByRole('button', { name: 'Join with Code' }).click();
  const codeInput = page.getByLabel('Tournament join code');
  await codeInput.fill(code);
  await page.getByRole('button', { name: 'Join' }).click();
  // Wait for join screen to load
  await expect(page.getByText('Join this tournament as')).toBeVisible({ timeout: 10000 });
}

/**
 * Register as a player from the join screen.
 */
export async function registerAsPlayer(page: Page, name: string) {
  const input = page.getByPlaceholder('Enter your name');
  await input.clear();
  await input.fill(name);
  await page.getByRole('button', { name: 'Register' }).click();
  // Wait for the confirmed state
  await expect(page.getByText("You're confirmed!")).toBeVisible({ timeout: 10000 });
}

/**
 * Open a tournament from the home screen by name.
 * Clicks the first matching tournament entry.
 */
export async function openTournamentByName(page: Page, name: string) {
  await page.getByText(name).first().click();
}

/**
 * Delete the current tournament from the organizer screen (cleanup).
 */
export async function deleteTournament(page: Page) {
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete Tournament' }).click();
  // Should return to home
  await waitForHome(page);
}
