import type { Page } from '@playwright/test';
import type { QaSettings } from '../../support/qaEnvironment.ts';
import type { Db } from '../../support/database.ts';
import {
  buyPlan,
  expect,
  expectProfile,
  forwardSubscriptionWebhook,
  getJson,
  label,
  openAccountSettings,
  paddleApi,
  test,
  acknowledgeNotice,
} from '../../support/fixtures.ts';
import { CANCEL_FEEDBACK, CANCEL_REASON, cancelButton, cancelThroughSettings, restoreButton } from '../../support/accountSettings.ts';
import { QA_PLANS } from '../../support/qaEnvironment.ts';

/** Cancellation keeps access until the period ends, in Paddle, the database, the API, and the UI. */
async function expectScheduledCancellation({
  page,
  db,
  settings,
  plan,
  authUser,
  subscription,
}: {
  page: Page;
  db: Db;
  settings: QaSettings;
  plan: string;
  authUser: Record<string, any>;
  subscription: any;
}) {
  const paddleSubscription = await paddleApi(settings).getSubscription(subscription.id);
  expect(paddleSubscription.status, 'Paddle keeps billing access until the period ends').toBe('active');
  expect(paddleSubscription.scheduled_change?.action, 'Paddle must not renew the subscription').toBe('cancel');

  const profile = await expectProfile(db, authUser.id, (row) => row.cancels_at_period_end === true, 'cancellation recorded');
  expect(profile).toMatchObject({
    subscription_tier: plan,
    subscription_status: 'active',
    paddle_subscription_id: subscription.id,
    cancellation_reason: `${CANCEL_REASON}: ${CANCEL_FEEDBACK}`,
  });
  expect(profile.canceled_at).toBeTruthy();

  const details = await getJson(page, `${settings.apiUrl}/billing/subscription-details`);
  expect(details).toMatchObject({ subscriptionTier: plan, subscriptionStatus: 'active', cancelsAtPeriodEnd: true });

  await expect(page.getByText(new RegExp(`^${label('core.accountSettings.accessEndsOn')} `))).toBeVisible();
  await expect(restoreButton(page)).toBeVisible();
  await expect(cancelButton(page)).toHaveCount(0);
}

for (const plan of QA_PLANS) {
  test.describe(`${plan} plan`, () => {
    test.use({ customerLabel: `${plan}cx` });

    test(`user can cancel the ${plan} subscription from account settings`, async ({ page, db, customer, settings }) => {
      const { authUser, subscription } = await buyPlan(page, db, { plan, customer, settings });

      await openAccountSettings(page, customer, settings);
      await cancelThroughSettings(page, settings);
      await expectScheduledCancellation({ page, db, settings, plan, authUser, subscription });

      // Paddle then notifies the app of the scheduled cancellation; that must not undo it.
      await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.updated');
      const profile = await expectProfile(db, authUser.id, () => true, 'profile after webhook');
      expect(profile).toMatchObject({ subscription_tier: plan, subscription_status: 'active', cancels_at_period_end: true });

      // The scheduled cancellation survives a reload.
      await openAccountSettings(page, customer, settings);
      await expect(restoreButton(page)).toBeVisible();
      await expect(cancelButton(page)).toHaveCount(0);
    });
  });
}

test.describe('restore', () => {
  test.use({ customerLabel: 'restore' });

  test('user can undo a scheduled cancellation with Restore Subscription', async ({ page, db, customer, settings }) => {
    const plan = 'pro';
    const { authUser, subscription } = await buyPlan(page, db, { plan, customer, settings });
    await openAccountSettings(page, customer, settings);
    await cancelThroughSettings(page, settings);
    await expectScheduledCancellation({ page, db, settings, plan, authUser, subscription });

    const restoring = page.waitForResponse(`${settings.apiUrl}/billing/restore-subscription`);
    await restoreButton(page).click();
    expect((await restoring).status()).toBe(200);
    await acknowledgeNotice(page, 'core.accountSettings.restoreSubscriptionSuccessTitle');

    // Paddle renews again, the account is no longer scheduled to end, and the UI offers cancel again.
    const paddleSubscription = await paddleApi(settings).getSubscription(subscription.id);
    expect(paddleSubscription.status).toBe('active');
    expect(paddleSubscription.scheduled_change).toBeNull();

    await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.updated');
    const profile = await expectProfile(db, authUser.id, (row) => row.cancels_at_period_end === false, 'cancellation undone');
    expect(profile).toMatchObject({ subscription_tier: plan, subscription_status: 'active', paddle_subscription_id: subscription.id });

    await openAccountSettings(page, customer, settings);
    await expect(page.getByText(new RegExp(`^${label('core.accountSettings.renewsOn')} `))).toBeVisible();
    await expect(cancelButton(page)).toBeVisible();
    await expect(restoreButton(page)).toHaveCount(0);
  });
});
