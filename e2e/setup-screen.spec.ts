import { test, expect } from '@playwright/test';
import {
  clearState,
  createTournament,
  addFourPlayers,
  addPlayers,
  selectFormat,
} from './helpers';

test.describe('Setup Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await createTournament(page);
  });

  test('remove player from list', async ({ page }) => {
    await addFourPlayers(page);
    await expect(page.getByText('4 player(s) added')).toBeVisible();
    await expect(page).toHaveScreenshot('setup-four-players.png');

    // Remove Alice using aria-label
    await page.getByRole('button', { name: 'Remove Alice' }).click();

    await expect(page.getByText('3 player(s) added')).toBeVisible();
    await expect(page.getByText('Alice')).not.toBeVisible();
  });

  test('select Team Americano format', async ({ page }) => {
    await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']);
    await selectFormat(page, 'team-americano');

    await expect(page.getByRole('button', { name: 'Set up Teams' })).toBeVisible();
  });

  test('select Mexicano format', async ({ page }) => {
    await addFourPlayers(page);
    await selectFormat(page, 'mexicano');

    await expect(page.getByRole('button', { name: 'Generate Schedule' })).toBeEnabled();
  });

  test('add court with enough players', async ({ page }) => {
    await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank']);

    await page.getByRole('button', { name: '+ Add court' }).click();

    await expect(page.getByLabel('Court 2 name')).toBeVisible();
  });

  test('remove court', async ({ page }) => {
    await addPlayers(page, ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank']);

    await page.getByRole('button', { name: '+ Add court' }).click();
    await expect(page.getByLabel('Court 2 name')).toBeVisible();

    await page.getByRole('button', { name: 'Remove court' }).last().click();

    await expect(page.getByLabel('Court 2 name')).not.toBeVisible();
    await expect(page.getByLabel('Court 1 name')).toBeVisible();
  });

  test('cancel discards tournament', async ({ page }) => {
    await addFourPlayers(page);

    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Tournament Manager' })).toBeVisible();
  });

  test('configure rounds and points', async ({ page }) => {
    await addFourPlayers(page);

    const roundsInput = page.locator('#config-rounds');
    await roundsInput.fill('5');
    await expect(roundsInput).toHaveValue('5');

    const pointsInput = page.locator('#config-points');
    await pointsInput.fill('16');
    await expect(pointsInput).toHaveValue('16');
    await expect(page).toHaveScreenshot('setup-custom-config.png');
  });
});
