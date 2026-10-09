import type { Page } from '@playwright/test';
import type { QaSettings } from '../../support/qaEnvironment.ts';
import {
  baseSeatsFor,
  buyPlan,
  daysUntil,
  expect,
  getJson,
  label,
  PLAN_CTA_KEYS,
  test,
} from '../../support/fixtures.ts';
import { QA_INTERVALS, QA_PLANS } from '../../support/qaEnvironment.ts';

const CYCLES: Record<string, { paddleInterval: string; title: string; minDays: number; maxDays: number }> = {
  monthly: { paddleInterval: 'month', title: '', minDays: 27, maxDays: 32 },
  annually: { paddleInterval: 'year', title: 'yearly ', minDays: 363, maxDays: 367 },
};

for (const interval of QA_INTERVALS) {
  const cycle = CYCLES[interval];

  for (const plan of QA_PLANS) {
    test.describe(`${plan} plan (${interval})`, () => {
      test.use({ customerLabel: interval === 'annually' ? `${plan}yr` : plan });

      test(`user can create a new account and pay for the ${cycle.title}${plan} subscription`, async ({ page, db, customer, settings }) => {
        const { subscription, profile } = await buyPlan(page, db, { plan, interval, customer, settings });

        // Paddle sandbox charged the test card for exactly this plan and billing cycle.
        expect(subscription.status).toBe('active');
        expect(subscription.items.map((item: any) => item.price.id)).toContain(settings.paddle.priceIds[interval][plan]);
        expect(subscription.billing_cycle).toEqual({ interval: cycle.paddleInterval, frequency: 1 });

        // The account is entitled to the plan, linked to the Paddle subscription that pays for it.
        const baseSeats = await baseSeatsFor(db, plan);
        expect(profile).toMatchObject({
          subscription_tier: plan,
          subscription_status: 'active',
          paddle_customer_id: subscription.customer_id,
          seat_limit: baseSeats,
          additional_seats: 0,
          has_unlimited_bypass: false,
          cancels_at_period_end: false,
        });
        // It renews one billing cycle from now.
        expect(daysUntil(profile.subscription_renews_at)).toBeGreaterThan(cycle.minDays);
        expect(daysUntil(profile.subscription_renews_at)).toBeLessThan(cycle.maxDays);

        const details = await getJson(page, `${settings.apiUrl}/billing/subscription-details`);
        expect(details).toMatchObject({ subscriptionTier: plan, subscriptionStatus: 'active', seatLimit: baseSeats });

        // The plan picker now shows the purchased plan as current and no longer offers it.
        await page.goto('/onboarding?lang=en');
        await expect(page.getByRole('button', { name: label('core.upgradeModal.currentPlanBadge') })).toBeDisabled();
        await expect(page.getByRole('button', { name: label(PLAN_CTA_KEYS[plan]), exact: true })).toHaveCount(0);
      });
    });
  }
}
