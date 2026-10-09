import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/accessibility/fixtures/dialog.html?lang=en');
});

test('prompt has a name, contains focus, submits, and restores focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Open prompt', exact: true });
  await trigger.click();
  const input = page.getByRole('textbox', { name: 'Prompt' });
  await expect(input).toBeFocused();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
  await trigger.evaluate((element) => element.focus());
  await expect(trigger).not.toBeFocused();
  await input.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeFocused();
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement === document.body || Boolean(document.activeElement.closest('dialog')))).toBe(true);
  }
  await input.fill('Accessible project');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('output')).toHaveText('"Accessible project"');
});

for (const [kind, result] of [['prompt', 'null'], ['confirmation', 'false'], ['alert', 'true']]) {
  test(`Escape closes ${kind} with the expected result`, async ({ page }) => {
    const trigger = page.getByRole('button', { name: `Open ${kind}`, exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog')).toHaveAttribute('open', '');
    if (kind === 'confirmation') await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('output')).toHaveText(result);
  });
}