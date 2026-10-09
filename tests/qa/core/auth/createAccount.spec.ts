import { createVerifiedAccount, expect, expectProfile, getJson, label, PLAN_CTA_KEYS, test } from '../../support/fixtures.js';

test.use({ customerLabel: 'signup' });

test('user can create a new account', async ({ page, db, customer, settings }) => {
  const authUser = await createVerifiedAccount(page, db, customer, settings, { verification: 'link' });

  // The profile is persisted with what the visitor entered, on the free tier, with terms evidence.
  const profile = await expectProfile(db, authUser.id, (row) => Boolean(row.terms_accepted_at), 'profile with terms acceptance');
  expect(profile).toMatchObject({
    username: customer.username,
    email: customer.email,
    first_name: customer.firstName,
    last_name: customer.lastName,
    role: 'user',
    subscription_tier: 'free',
  });
  expect(profile.terms_accepted_version).toBeTruthy();
  // The 18+ age attestation is captured alongside the terms acceptance at registration.
  expect(profile.age_confirmed).toBe(true);
  expect(profile.age_confirmed_at).toBeTruthy();
  expect(profile.paddle_subscription_id).toBeNull();

  // The authenticated session belongs to the new account.
  const { user } = await getJson(page, `${settings.apiUrl}/auth/me`);
  expect(user).toMatchObject({ id: authUser.id, username: customer.username, subscription_tier: 'free' });

  // A new account has no paid plan yet: every paid plan is offered on the plan picker.
  await page.goto('/onboarding?lang=en');
  for (const key of Object.values(PLAN_CTA_KEYS)) {
    await expect(page.getByRole('button', { name: label(key), exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: label('core.upgradeModal.currentPlanBadge') })).toHaveCount(0);
});
