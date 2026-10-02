import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/home', '/login', '/register', '/forgot-password', '/terms', '/privacy', '/refund', '/acceptable-use', '/disclaimer', '/guide', '/accessibility'];

for (const route of routes) {
  test(`${route} has no detected WCAG A/AA violations and reflows`, async ({ page }) => {
    await page.goto(`${route}?lang=en`);
    await expect(page.locator('#main-content')).toBeVisible();
    if (route === '/home') {
      await expect(page.getByRole('dialog')).toBeVisible();
      const dialogResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(dialogResults.violations).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(results.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('skip link is first and moves keyboard focus into content', async ({ page }) => {
  await page.goto('/login?lang=en');
  await expect(page.locator('#main-content')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.getElementById('main-content').contains(document.activeElement))).toBe(true);
});

test('account inputs have visible associated labels and autofill purposes', async ({ page }) => {
  await page.goto('/register?lang=en');
  for (const [id, purpose] of Object.entries({
    'register-first-name': 'given-name',
    'register-last-name': 'family-name',
    'register-username': 'username',
    'register-email': 'email',
    'register-phone': 'tel',
    'register-password': 'new-password',
  })) {
    const input = page.locator(`#${id}`);
    await expect(input).toHaveAttribute('autocomplete', purpose);
    await page.locator(`label[for="${id}"]`).click();
    await expect(input).toBeFocused();
  }
});

test('client navigation focuses the new heading', async ({ page }) => {
  await page.goto('/login?lang=en');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('document language follows the selected locale and preserves fragment links', async ({ page }) => {
  await page.goto('/home?lang=es#calculator');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page).toHaveURL(/#calculator$/);
});

test('mobile navigation exposes its expanded state', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.isMobile, 'Mobile navigation only');
  await page.goto('/home?lang=en');
  await expect(page.getByRole('dialog')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const toggle = page.getByRole('button', { name: 'Toggle navigation menu' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#landing-mobile-menu')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('accessibility statement is reachable and offers an existing support contact', async ({ page }) => {
  await page.goto('/login?lang=en');
  await page.getByRole('link', { name: 'Accessibility', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Accessibility' })).toBeFocused();
  await expect(page.locator('article a[href="mailto:pattygsocials@gmail.com"]')).toBeVisible();
});

const LANDING_AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function dismissLandingNotice(page) {
  await page.goto('/home?lang=en');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('landing theme toggle is labelled and both themes pass axe', async ({ page }) => {
  await dismissLandingNotice(page);
  const toggle = page.getByRole('button', { name: /Switch to (light|dark) mode/ }).filter({ visible: true });
  await expect(toggle).toHaveCount(1);
  for (let i = 0; i < 2; i += 1) {
    await toggle.click();
    const results = await new AxeBuilder({ page }).withTags(LANDING_AXE_TAGS).analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) }))).toEqual([]);
  }
});

test('landing language picker exposes its state and passes axe when open', async ({ page }) => {
  await dismissLandingNotice(page);
  const picker = page.getByRole('button', { name: /language/i }).filter({ visible: true });
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
  await picker.click();
  await expect(picker).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Español' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(LANDING_AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
  await expect(picker).toBeFocused();
});

test('landing calculator inputs are labelled and results are announced', async ({ page }) => {
  await dismissLandingNotice(page);
  const length = page.getByLabel('Pipe Run Length (LF)');
  await length.fill('1000');
  await expect(page.locator('#calculator [aria-live="polite"]')).toContainText('555.6');
});

test('failed login exposes an announced error associated with the form', async ({ page }) => {
  await page.route('**/auth/login', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Invalid login credentials.' }),
  }));
  await page.goto('/login?lang=en');
  await page.locator('#login-identifier').fill('accessibility-test');
  await page.locator('#login-password').fill('invalid-test-password');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('alert')).toContainText('Invalid login credentials.');
  await expect(page.locator('form')).toHaveAttribute('aria-describedby', 'auth-error');
  await expect(page.locator('form')).toHaveAttribute('aria-busy', 'false');
});

test('password reset success is announced without moving focus', async ({ page }) => {
  await page.route('**/auth/forgot-password', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Reset instructions sent.' }),
  }));
  await page.goto('/forgot-password?lang=en');
  await page.locator('#forgot-email').fill('accessibility@example.com');
  const submit = page.locator('form button[type="submit"]');
  await submit.click();
  await expect(page.getByRole('status')).toHaveText('Reset instructions sent.');
  await expect(submit).toBeFocused();
});

test('reduced motion removes long transitions and focus has a visible outline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login?lang=en');
  await expect(page.locator('#main-content')).toBeVisible();
  await page.keyboard.press('Tab');
  const style = await page.getByRole('link', { name: 'Skip to main content' }).evaluate((element) => {
    const computed = getComputedStyle(element);
    return { outlineWidth: computed.outlineWidth, outlineStyle: computed.outlineStyle, transitionDuration: computed.transitionDuration };
  });
  expect(style.outlineWidth).toBe('3px');
  expect(style.outlineStyle).toBe('solid');
  expect(parseFloat(style.transitionDuration)).toBeLessThanOrEqual(0.00001);
});