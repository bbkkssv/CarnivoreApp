import { test, expect } from '@playwright/test';

test.describe('Setup verification', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Create Next App/);
  });
});