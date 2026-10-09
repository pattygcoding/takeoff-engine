import { expect, test } from '@playwright/test';

test('accept-invite route renders an invalid state when the token is absent', async ({ page }) => {
  await page.goto('/accept-invite?lang=en');
  await expect(page.locator('h2').first()).toBeVisible();
  await expect(page).toHaveURL(/accept-invite\?lang=en/);
});