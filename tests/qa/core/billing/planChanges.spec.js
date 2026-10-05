import {
  baseSeatsFor,
  buyPlan,
  createVerifiedAccount,
  expect,
  expectProfile,
  forwardRenewalWebhook,
  forwardSubscriptionWebhook,
  getJson,
  label,
  openAccountSettings,
  paddleApi,
  PLAN_CTA_KEYS,
  planChangeCharges,
  purchasePlanThroughUi,
  test,
} from '../../support/fixtures.js';
import { findProfile } from '../../support/database.js';
import { cancelThroughSettings, changePlanThroughSettings } from '../../support/accountSettings.js';

const COLLECTED = new Set(['paid', 'completed']);
const collectedCharges = async (settings, subscriptionId) => (await planChangeCharges(settings, subscriptionId)).filter((txn) => COLLECTED.has(txn.status));
const billedPriceIds = (subscription) => subscription.items.filter((entry) => entry.status !== 'inactive').map((entry) => entry.price.id);

/** The core plan picker marks the entitled plan as current ("free" = none) and offers the rest. */
async function expectPickerShows(page, plan) {
  await page.goto('/onboarding?lang=en');
  const currentPlan = page.getByRole('button', { name: label('core.upgradeModal.currentPlanBadge') });
  if (plan === 'free') {
    await expect(currentPlan).toHaveCount(0);
  } else {
    await expect(currentPlan).toBeDisabled();
  }
  for (const [tier, key] of Object.entries(PLAN_CTA_KEYS)) {
    await expect(page.getByRole('button', { name: label(key), exact: true })).toHaveCount(tier === plan ? 0 : 1);
  }
}

test.describe('upgrades', () => {
  test.use({ customerLabel: 'upgrade' });

  test('user can upgrade from free to starter to pro to enterprise', async ({ page, db, customer, settings }) => {
    const authUser = await createVerifiedAccount(page, db, customer, settings);
    let subscription;

    await test.step('starts on free', async () => {
      expect((await findProfile(db, authUser.id)).subscription_tier).toBe('free');
      await expectPickerShows(page, 'free');
    });

    await test.step('free -> starter (first purchase through checkout)', async () => {
      subscription = await purchasePlanThroughUi(page, { plan: 'starter', customer, settings });
      await expectProfile(db, authUser.id, (row) => row.subscription_tier === 'starter' && row.paddle_subscription_id === subscription.id, 'entitled to starter');
      await expectPickerShows(page, 'starter');
    });

    for (const [from, to] of [['starter', 'pro'], ['pro', 'enterprise']]) {
      await test.step(`${from} -> ${to}`, async () => {
        const chargesBefore = (await collectedCharges(settings, subscription.id)).length;

        await openAccountSettings(page, customer, settings);
        const result = await changePlanThroughSettings(page, { plan: to, direction: 'upgrade', settings });
        expect(result.changeType).toBe('upgrade');

        // The same Paddle subscription now bills the higher plan, and the prorated difference was collected now.
        const paddleSubscription = await paddleApi(settings).getSubscription(subscription.id);
        expect(paddleSubscription.status).toBe('active');
        expect(billedPriceIds(paddleSubscription)).toEqual([settings.paddle.priceIds.monthly[to]]);
        await expect.poll(async () => (await collectedCharges(settings, subscription.id)).length, {
          message: 'Paddle collected a prorated upgrade charge',
          timeout: 60_000,
        }).toBe(chargesBefore + 1);

        // The upgrade applies immediately, and Paddle's own notification agrees.
        const baseSeats = await baseSeatsFor(db, to);
        const expected = { subscription_tier: to, subscription_status: 'active', seat_limit: baseSeats, scheduled_tier: null, paddle_subscription_id: subscription.id };
        expect(await expectProfile(db, authUser.id, (row) => row.subscription_tier === to, `entitled to ${to}`)).toMatchObject(expected);
        await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.updated');
        expect(await findProfile(db, authUser.id)).toMatchObject(expected);

        expect(await getJson(page, `${settings.apiUrl}/billing/subscription-details`)).toMatchObject({ subscriptionTier: to, seatLimit: baseSeats, scheduledTier: null });
        await expectPickerShows(page, to);
      });
    }
  });
});

test.describe('downgrades', () => {
  test.use({ customerLabel: 'downgrade' });

  test('user can downgrade from enterprise to pro to starter to free', async ({ page, db, customer, settings }) => {
    const { authUser, subscription } = await buyPlan(page, db, { plan: 'enterprise', customer, settings });
    await expectPickerShows(page, 'enterprise');

    for (const [from, to] of [['enterprise', 'pro'], ['pro', 'starter']]) {
      await test.step(`${from} -> ${to}`, async () => {
        const chargesBefore = (await planChangeCharges(settings, subscription.id)).length;

        await openAccountSettings(page, customer, settings);
        const result = await changePlanThroughSettings(page, { plan: to, direction: 'downgrade', settings });
        expect(result.changeType).toBe('downgrade_scheduled');

        // Paddle bills the lower plan from the next renewal, without charging or crediting anything now.
        const paddleSubscription = await paddleApi(settings).getSubscription(subscription.id);
        expect(paddleSubscription.status).toBe('active');
        expect(billedPriceIds(paddleSubscription)).toEqual([settings.paddle.priceIds.monthly[to]]);
        expect((await planChangeCharges(settings, subscription.id)).length, 'a downgrade must not create a charge').toBe(chargesBefore);

        // The customer keeps the current plan until the renewal, which is when the downgrade is scheduled.
        const scheduled = await expectProfile(db, authUser.id, (row) => row.scheduled_tier === to, `downgrade to ${to} scheduled`);
        expect(scheduled.subscription_tier).toBe(from);
        expect(new Date(scheduled.scheduled_change_effective_at).getTime()).toBe(new Date(paddleSubscription.next_billed_at).getTime());
        await expect(page.getByRole('heading', { name: label('core.accountSettings.downgradeScheduledTitle') })).toBeVisible();
        expect(await getJson(page, `${settings.apiUrl}/billing/subscription-details`)).toMatchObject({ subscriptionTier: from, scheduledTier: to });

        // Paddle's notification of the change must not downgrade early.
        await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.updated');
        expect(await findProfile(db, authUser.id)).toMatchObject({ subscription_tier: from, scheduled_tier: to });
        await expectPickerShows(page, from);

        // At the renewal, the downgrade takes effect.
        await forwardRenewalWebhook(settings, subscription.id);
        const renewed = await expectProfile(db, authUser.id, (row) => row.subscription_tier === to, `downgraded to ${to} at renewal`);
        expect(renewed).toMatchObject({ subscription_status: 'active', seat_limit: await baseSeatsFor(db, to), scheduled_tier: null });
        await expectPickerShows(page, to);
      });
    }

    await test.step('starter -> free (cancel, then the paid period ends)', async () => {
      await openAccountSettings(page, customer, settings);
      await cancelThroughSettings(page, settings);
      expect(await expectProfile(db, authUser.id, (row) => row.cancels_at_period_end === true, 'cancellation scheduled'))
        .toMatchObject({ subscription_tier: 'starter', subscription_status: 'active' });

      // The sandbox cannot wait for the period to end, so Paddle ends the subscription now and notifies the app.
      const paddle = paddleApi(settings);
      await paddle.endSubscription(await paddle.getSubscription(subscription.id));
      const ended = await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.canceled');
      expect(ended.status).toBe('canceled');

      expect(await expectProfile(db, authUser.id, (row) => row.subscription_tier === 'free', 'back on free'))
        .toMatchObject({ subscription_status: 'canceled', seat_limit: 1, additional_seats: 0, cancels_at_period_end: false });
      expect(await getJson(page, `${settings.apiUrl}/billing/subscription-details`)).toMatchObject({ subscriptionTier: 'free' });
      await expectPickerShows(page, 'free');
    });
  });
});
