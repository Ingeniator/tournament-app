import { test, expect } from '@playwright/test';
import { clearState, createInProgressTournament, navigateToTab } from './helpers';

test.describe('AppFooter', () => {
  test.describe('Home Screen', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await clearState(page);
    });

    test('shows footer with all links', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      await expect(footer.getByText('Free & open source')).toBeVisible();
      await expect(footer.getByText('Made with care')).toBeVisible();
      await expect(footer.getByRole('button', { name: 'Support us' })).toBeVisible();
      await expect(footer.getByRole('button', { name: 'Send feedback' })).toBeVisible();
      await expect(footer.getByRole('button', { name: 'Personalize' })).toBeVisible();
      await expect(footer).toHaveScreenshot('footer-home.png');
    });

    test('Personalize opens modal with language selector', async ({ page }) => {
      await page.locator('footer').getByRole('button', { name: 'Personalize' }).click();

      const modal = page.getByRole('heading', { name: 'Personalize' });
      await expect(modal).toBeVisible();
      await expect(page.getByText('Language')).toBeVisible();

      // Language buttons visible
      for (const lang of ['EN', 'ES', 'IT', 'PT']) {
        await expect(page.getByRole('button', { name: lang, exact: true })).toBeVisible();
      }
      await expect(page).toHaveScreenshot('footer-personalize-modal.png');
    });

    test('Personalize modal closes on X button', async ({ page }) => {
      await page.locator('footer').getByRole('button', { name: 'Personalize' }).click();
      await expect(page.getByRole('heading', { name: 'Personalize' })).toBeVisible();

      await page.getByRole('button', { name: '✕' }).click();
      await expect(page.getByRole('heading', { name: 'Personalize' })).not.toBeVisible();
    });

    test('language switch works from Personalize modal', async ({ page }) => {
      await page.locator('footer').getByRole('button', { name: 'Personalize' }).click();
      await page.getByRole('button', { name: 'ES', exact: true }).click();
      await page.getByRole('button', { name: '✕' }).click();

      // Footer should now show Spanish text
      const footer = page.locator('footer');
      await expect(footer.getByText('Hecho con cariño')).toBeVisible();
    });
  });

  test.describe('Settings Screen', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await createInProgressTournament(page);
      await navigateToTab(page, 'Settings');
    });

    test('shows footer with all links', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      await expect(footer.getByText('Free & open source')).toBeVisible();
      await expect(footer.getByText('Made with care')).toBeVisible();
      await expect(footer.getByRole('button', { name: 'Support us' })).toBeVisible();
      await expect(footer.getByRole('button', { name: 'Send feedback' })).toBeVisible();
      await expect(footer.getByRole('button', { name: 'Personalize' })).toBeVisible();
    });

    test('Personalize opens modal from settings', async ({ page }) => {
      await page.locator('footer').getByRole('button', { name: 'Personalize' }).click();
      await expect(page.getByRole('heading', { name: 'Personalize' })).toBeVisible();
      await expect(page.getByText('Language')).toBeVisible();
    });
  });
});
