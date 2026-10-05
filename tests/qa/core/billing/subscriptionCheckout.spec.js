import {
  baseSeatsFor,
  createVerifiedAccount,
  expect,
  expectProfile,
  getJson,
  label,
  PLAN_CTA_KEYS,
  purchasePlanThroughUi,
  test,
} from '../../support/fixtures.js';
import { QA_PLANS } from '../../support/qaEnvironment.js';

for (const plan of QA_PLANS) {
  test.describe(`${plan} plan`, () => {
    test.use({ customerLabel: plan });

    test(`user can create a new account and pay for the ${plan} subscription`, async ({ page, db, customer, settings }) => {
      const authUser = await createVerifiedAccount(page, db, customer, settings);
      const subscription = await purchasePlanThroughUi(page, { plan, customer, settings });

      // Paddle sandbox charged the test card for exactly this plan.
      expect(subscription.status).toBe('active');
      expect(subscription.items.map((item) => item.price.id)).toContain(settings.paddle.priceIds[plan]);

      // The account is entitled to the plan, linked to the Paddle subscription that pays for it.
      const baseSeats = await baseSeatsFor(db, plan);
      const profile = await expectProfile(
        db,
        authUser.id,
        (row) => row.paddle_subscription_id === subscription.id,
        `profile linked to Paddle subscription ${subscription.id}`,
      );
      expect(profile).toMatchObject({
        subscription_tier: plan,
        subscription_status: 'active',
        paddle_customer_id: subscription.customer_id,
        seat_limit: baseSeats,
        additional_seats: 0,
        has_unlimited_bypass: false,
      });

      const details = await getJson(page, `${settings.apiUrl}/billing/subscription-details`);
      expect(details).toMatchObject({ subscriptionTier: plan, subscriptionStatus: 'active', seatLimit: baseSeats });

      // The plan picker now shows the purchased plan as current and no longer offers it.
      await page.goto('/onboarding?lang=en');
      await expect(page.getByRole('button', { name: label('core.upgradeModal.currentPlanBadge') })).toBeDisabled();
      await expect(page.getByRole('button', { name: label(PLAN_CTA_KEYS[plan]), exact: true })).toHaveCount(0);
    });
  });
}
