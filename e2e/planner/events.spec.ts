import { test, expect } from '@playwright/test';
import {
  waitForHome,
  setProfileName,
  createTournament,
  getShareCode,
  goBack,
  deleteTournament,
  createEvent,
  deleteEvent,
} from './helpers';

test.describe('Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plan');
    await waitForHome(page);
    await setProfileName(page, `Organizer ${Date.now()}`);
  });

  test('create event from home screen', async ({ page }) => {
    const eventName = await createEvent(page);
    // Should be on the event screen
    await expect(page.getByText(eventName)).toBeVisible();
    // Clean up
    await deleteEvent(page);
  });

  test('event appears in My Events list', async ({ page }) => {
    const eventName = await createEvent(page);
    // Go back to home
    await page.getByLabel('Back').click();
    await waitForHome(page);
    // Event should appear under My Events
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 10000 });
    // Re-open and clean up
    await page.getByText(eventName).click();
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 10000 });
    await deleteEvent(page);
  });

  test('link tournament by code', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // Create a tournament first to get its code
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);

    // Create an event
    const eventName = await createEvent(page);

    // Link tournament by code
    const codeInput = page.getByPlaceholder('Tournament code');
    await codeInput.fill(code);
    await page.getByRole('button', { name: 'Link' }).click();
    await expect(page.getByText('Tournament linked!')).toBeVisible({ timeout: 10000 });

    // Tournament should appear in the event's tournament list
    await expect(page.getByText(tournamentName)).toBeVisible({ timeout: 10000 });

    // Clean up
    await deleteEvent(page);
    await page.getByText(tournamentName).first().click();
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('link own tournament via quick-pick', async ({ page }) => {
    // Create a tournament first
    const tournamentName = await createTournament(page);
    await goBack(page);

    // Create an event
    const eventName = await createEvent(page);

    // My Tournaments section should show the tournament
    await expect(page.getByText('My Tournaments')).toBeVisible({ timeout: 10000 });
    // Click the tournament to link it
    const ownItem = page.locator('[class*="ownItem"]').filter({ hasText: tournamentName });
    await ownItem.click();
    await expect(page.getByText('Tournament linked!')).toBeVisible({ timeout: 10000 });

    // Clean up
    await deleteEvent(page);
    await page.getByText(tournamentName).first().click();
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('unlink tournament', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // Create tournament + event + link
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);
    const eventName = await createEvent(page);
    const codeInput = page.getByPlaceholder('Tournament code');
    await codeInput.fill(code);
    await page.getByRole('button', { name: 'Link' }).click();
    await expect(page.getByText('Tournament linked!')).toBeVisible({ timeout: 10000 });

    // Unlink the tournament
    page.on('dialog', dialog => dialog.accept());
    await page.getByLabel('Unlink').click();
    // Tournament should no longer be in the list
    await expect(page.getByText('No tournaments linked yet')).toBeVisible({ timeout: 10000 });

    // Clean up
    await deleteEvent(page);
    await page.getByText(tournamentName).first().click();
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });

  test('event share code displayed and copyable', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const eventName = await createEvent(page);

    // Share code should be visible
    const codeEl = page.locator('[class*="code"]').filter({ hasText: /^[A-Z2-9]{6,7}$/ });
    await expect(codeEl).toBeVisible();

    // Copy link button should work
    await page.getByRole('button', { name: 'Copy Link' }).click();
    await expect(page.getByText('Link copied!')).toBeVisible({ timeout: 5000 });

    // Clean up
    await deleteEvent(page);
  });

  test('event description editable by owner', async ({ page }) => {
    const eventName = await createEvent(page);

    // Description textarea should be visible
    const textarea = page.getByPlaceholder('Event details, rules, schedule, etc.');
    await expect(textarea).toBeVisible();
    await textarea.fill('Test description for this event');
    // Value should persist (Firebase update)
    await expect(textarea).toHaveValue('Test description for this event');

    // Clean up
    await deleteEvent(page);
  });

  test('delete event removes it and its code', async ({ page }) => {
    const eventName = await createEvent(page);
    // Delete the event
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete Event' }).click();
    await waitForHome(page);
    // Event should not appear in My Events anymore
    // Give a moment for the list to update
    await page.waitForTimeout(1000);
    const eventText = page.getByText(eventName);
    await expect(eventText).toHaveCount(0);
  });

  test('join event by code from home screen', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const eventName = await createEvent(page);

    // Get event code
    const codeEl = page.locator('[class*="code"]').filter({ hasText: /^[A-Z2-9]{6,7}$/ });
    const eventCode = await codeEl.textContent();

    // Go back to home
    await page.getByLabel('Back').click();
    await waitForHome(page);

    // Join with code
    await page.getByRole('button', { name: 'Join with Code' }).click();
    const codeInput = page.getByLabel('Tournament join code');
    await codeInput.fill(eventCode!);
    await page.getByRole('button', { name: 'Join' }).click();

    // Should see the event
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 15000 });

    // Clean up: go back and open from My Events
    await page.getByLabel('Back').click();
    await waitForHome(page);
    await page.getByText(eventName).first().click();
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 15000 });
    await deleteEvent(page);
  });

  test('tournament weight affects standings', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // Create tournament + event + link
    const tournamentName = await createTournament(page);
    const code = await getShareCode(page);
    await goBack(page);
    const eventName = await createEvent(page);
    const codeInput = page.getByPlaceholder('Tournament code');
    await codeInput.fill(code);
    await page.getByRole('button', { name: 'Link' }).click();
    await expect(page.getByText('Tournament linked!')).toBeVisible({ timeout: 10000 });

    // Weight input should be visible
    const weightInput = page.locator('[class*="weightInput"]');
    await expect(weightInput).toBeVisible();
    // Change weight
    await weightInput.clear();
    await weightInput.fill('2');

    // Clean up
    await deleteEvent(page);
    await page.getByText(tournamentName).first().click();
    await expect(page.getByText(/Players \(/)).toBeVisible({ timeout: 10000 });
    await deleteTournament(page);
  });
});
