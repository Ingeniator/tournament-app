import { type Page, expect } from '@playwright/test';

/** Staging-specific timeout for Firebase operations. */
const FB_TIMEOUT = 20_000;

/**
 * Wait for Firebase auth to complete and the home screen to render.
 * Staging builds may be slower — uses extended timeouts and retries.
 */
export async function waitForHome(page: Page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await page.getByRole('heading', { name: 'Tournament Planner' }).waitFor({ timeout: FB_TIMEOUT });
      break;
    } catch {
      const retryBtn = page.getByRole('button', { name: 'Retry' });
      if (await retryBtn.isVisible().catch(() => false)) {
        await retryBtn.click();
      } else if (attempt === 4) {
        throw new Error('Home screen did not load after 5 attempts');
      }
    }
  }
  await Promise.race([
    page.getByText('Set your name to get started').waitFor({ timeout: FB_TIMEOUT }),
    page.getByText('Logged in as').waitFor({ timeout: FB_TIMEOUT }),
  ]);
}

/**
 * Set the user's profile name. Safe to call when name is already set.
 */
export async function setProfileName(page: Page, name: string) {
  const namePrompt = page.getByText('Set your name to get started');
  if (await namePrompt.isVisible().catch(() => false)) {
    const input = page.getByPlaceholder('Group Name / Your name');
    await input.fill(name);
    await page.getByRole('button', { name: 'Save' }).click();
  }
  await expect(page.getByText('Logged in as')).toBeVisible({ timeout: FB_TIMEOUT });
}

/**
 * Create a tournament from the home screen.
 * Uses a timestamped name to avoid collisions on shared staging.
 */
export async function createTournament(page: Page, name?: string) {
  const tournamentName = name ?? `Staging ${Date.now()}`;
  const input = page.locator('#tournament-name');
  await input.clear();
  await input.fill(tournamentName);
  const createBtn = page.getByRole('button', { name: 'Create Tournament' });
  await expect(createBtn).toBeEnabled({ timeout: FB_TIMEOUT });
  await createBtn.click();
  await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible({ timeout: FB_TIMEOUT });
  await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: FB_TIMEOUT });
  return tournamentName;
}

/** Get the 6-character share code from the organizer screen. */
export async function getShareCode(page: Page): Promise<string> {
  const shareBtn = page.getByRole('button', { name: 'Share & Invite' });
  if (await shareBtn.isVisible().catch(() => false)) {
    await shareBtn.click();
  }
  const codeEl = page.locator('span[class*="code"]').filter({ hasText: /^[A-Z2-9]{6}$/ });
  const code = await codeEl.textContent({ timeout: 10_000 });
  if (!code || code.length !== 6) throw new Error(`Invalid share code: ${code}`);
  return code;
}

/** Add a player from the organizer screen. */
export async function addPlayerAsOrganizer(page: Page, name: string) {
  const input = page.getByPlaceholder('Player name or paste a list');
  await input.click();
  await expect(input).toHaveValue('', { timeout: 5000 });
  await input.fill(name);
  await input.press('Enter');
  await expect(page.getByText(name).first()).toBeVisible({ timeout: FB_TIMEOUT });
  await expect(input).toHaveValue('', { timeout: 5000 });
}

/** Navigate back to home from any screen. */
export async function goBack(page: Page) {
  await page.getByLabel('Back').click();
  await waitForHome(page);
}

/** Join a tournament by code from the home screen. */
export async function joinByCode(page: Page, code: string) {
  await page.getByRole('button', { name: 'Join with Code' }).click();
  const codeInput = page.getByLabel('Tournament join code');
  await codeInput.fill(code);
  await page.getByRole('button', { name: 'Join' }).click();
  // Wait for either the join screen or the event screen
  await Promise.race([
    page.getByText('Join this tournament as').waitFor({ timeout: FB_TIMEOUT }),
    page.getByText(/Tournaments \(/).waitFor({ timeout: FB_TIMEOUT }),
  ]);
}

/** Register as a player from the join screen. */
export async function registerAsPlayer(page: Page, name: string) {
  const input = page.getByPlaceholder('Enter your name');
  await input.clear();
  await input.fill(name);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText("You're confirmed!")).toBeVisible({ timeout: FB_TIMEOUT });
}

/** Delete the current tournament from the organizer screen. */
export async function deleteTournament(page: Page) {
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Tournament' }).click();
  await waitForHome(page);
}

/** Create an event from the home screen. */
export async function createEvent(page: Page, name?: string) {
  const eventName = name ?? `Staging Event ${Date.now()}`;
  await page.getByRole('button', { name: 'Create Event' }).click();
  await page.locator('#event-name').fill(eventName);
  const createBtn = page.getByRole('button', { name: 'Create Event' }).last();
  await createBtn.click();
  await expect(page.getByText(eventName)).toBeVisible({ timeout: FB_TIMEOUT });
  return eventName;
}

/** Delete the current event from the event screen. */
export async function deleteEvent(page: Page) {
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Event' }).click();
  await waitForHome(page);
}

/** Open a tournament from the home screen by name. */
export async function openTournamentByName(page: Page, name: string) {
  await page.getByText(name).first().click();
}
