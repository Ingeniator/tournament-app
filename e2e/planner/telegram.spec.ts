import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  getShareCode,
  goBack,
  deleteTournament,
} from './helpers';

/**
 * Inject a mock Telegram WebApp API.
 * Blocks the real telegram-web-app.js script and replaces it with our mock,
 * so the app sees a fully controlled Telegram environment.
 */
async function mockTelegramWebApp(
  page: import('@playwright/test').Page,
  opts: {
    userId?: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    startParam?: string;
    chatInstance?: string;
  } = {},
) {
  const {
    userId = 123456789,
    firstName = 'TelegramUser',
    lastName = 'Bot',
    username = 'tg_e2e_user',
    startParam,
    chatInstance,
  } = opts;

  // Block the real Telegram WebApp script so it doesn't overwrite our mock
  await page.route('**/telegram-web-app.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: '',
  }));

  await page.addInitScript(({ userId, firstName, lastName, username, startParam, chatInstance }) => {
    (window as any).Telegram = {
      WebApp: {
        initData: 'mock',
        initDataUnsafe: {
          user: {
            id: userId,
            first_name: firstName,
            last_name: lastName,
            username: username,
          },
          ...(startParam ? { start_param: startParam } : {}),
          ...(chatInstance ? { chat_instance: chatInstance } : {}),
        },
        ready() {},
        expand() {},
        openLink() {},
      },
    };
  }, { userId, firstName, lastName, username, startParam, chatInstance });
}

test.describe('Telegram Integration', () => {
  test('auto-fills profile name from Telegram identity', async ({ page }) => {
    await mockTelegramWebApp(page, {
      firstName: 'Pavel',
      lastName: 'Durov',
      username: 'durov',
    });

    await page.goto('/plan');
    await waitForHome(page);

    // Telegram user's name should be auto-set as profile name
    await expect(page.getByText('Logged in as')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Pavel Durov')).toBeVisible();
  });

  test('deep link via startapp parameter opens join screen', async ({ page, context }) => {
    // First, create a tournament to get a valid code (without Telegram mock)
    const setupPage = await context.newPage();
    await setupPage.goto('/plan');
    await waitForHome(setupPage);
    await setProfileName(setupPage, `Organizer ${Date.now()}`);
    const tournamentName = await createTournament(setupPage);
    const code = await getShareCode(setupPage);

    // Now simulate opening the planner via Telegram deep link with startapp=CODE
    await mockTelegramWebApp(page, {
      firstName: 'Telegram',
      lastName: 'Player',
      username: 'tg_player',
      startParam: code,
    });

    await page.goto('/plan');

    // Should land directly on the join screen (startapp acts like ?code=)
    await expect(page.getByRole('heading', { name: tournamentName })).toBeVisible({ timeout: 15000 });

    // The registration form or confirmed state should be visible
    await expect(
      page.getByText('Join this tournament as').or(page.getByText("You're confirmed!"))
    ).toBeVisible({ timeout: 5000 });

    await page.close();

    // Clean up
    await goBack(setupPage);
    await setupPage.getByText(tournamentName).click();
    await expect(setupPage.getByText('Share with Players')).toBeVisible({ timeout: 10000 });
    await deleteTournament(setupPage);
    await setupPage.close();
  });

  test('Telegram username is pre-filled in registration', async ({ page, browser }) => {
    // Create a tournament with the default page
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);

    // Open a fresh browser context (separate Firebase UID, no profile name set)
    const tgContext = await browser.newContext();
    const tgPage = await tgContext.newPage();

    await mockTelegramWebApp(tgPage, {
      firstName: 'Nikola',
      lastName: 'Tesla',
      username: 'nikolatesla',
      startParam: code,
    });

    await tgPage.goto('/plan');

    // Should be on join screen
    await expect(tgPage.getByRole('heading', { name: tournamentName })).toBeVisible({ timeout: 15000 });

    // The name input should be pre-filled with the Telegram display name
    const nameInput = tgPage.getByPlaceholder('Enter your name');
    await expect(nameInput).toHaveValue('Nikola Tesla', { timeout: 10000 });

    await tgContext.close();

    // Clean up
    await goBack(page);
    await page.getByText(tournamentName).click();
    await expect(page.getByText('Share with Players')).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });
});
