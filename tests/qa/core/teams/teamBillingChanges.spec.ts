import type { Page } from '@playwright/test';
import type { QaPersona } from '../../support/fixtures.ts';
import type { QaSettings, QaIdentity } from '../../support/qaEnvironment.ts';
import type { Db } from '../../support/database.ts';
import {
  apiAs,
  buyPlan,
  expect,
  expectProfile,
  forwardRenewalWebhook,
  forwardSubscriptionWebhook,
  openAccountSettings,
  paddleApi,
  planChangeCharges,
  test,
} from '../../support/fixtures.ts';
import { cancelThroughSettings, changePlanThroughSettings, restoreButton } from '../../support/accountSettings.ts';
import { acknowledgeNotice } from '../../support/fixtures.ts';
import { createQaIdentity } from '../../support/qaEnvironment.ts';
import type { PaddleEntity } from '../../support/paddleSandbox.ts';
import {
  acceptInviteViaUi,
  createWorkspace,
  expectSeatsUsed,
  inviteAndJoin,
  membersHeading,
  openInvite,
  openTeam,
  revokeViaUi,
  inviteViaUi,
  setExtraSeatsViaUi,
} from '../../support/teamWorkspace.ts';

const syntheticEmail = (settings: QaSettings, tag: string): string => createQaIdentity(tag, { emailTemplate: settings.emailTemplate }).email;
const quantityOf = (subscription: PaddleEntity, priceId: string) => (subscription.items ?? []).find((item) => item.price.id === priceId)?.quantity ?? 0;

async function ownerWithWorkspace({ page, db, customer, settings, plan }: { page: Page; db: Db; customer: QaIdentity; settings: QaSettings; plan: string }) {
  const purchase = await buyPlan(page, db, { plan, customer, settings });
  await openTeam(page, customer, settings);
  const org = (await createWorkspace(page, settings, `QA Team Billing ${customer.tag}`)).body.organization;
  return { ...purchase, org };
}

async function invitePending(page: Page, settings: QaSettings, orgId: string, count: number) {
  for (let index = 1; index <= count; index += 1) {
    const result = await apiAs(page, settings, 'POST', `/organizations/${orgId}/members`, { email: syntheticEmail(settings, `team${index}`), role: 'viewer' });
    expect(result.status).toBe(201);
  }
}

test.describe('plan and billing changes with a team', () => {
  test.use({ customerLabel: 'teambill' });

  test('Enterprise -> Pro with 5 people keeps paid seats for everyone at renewal', async ({ page, db, customer, settings }) => {
    const { authUser, subscription, org } = await ownerWithWorkspace({ page, db, customer, settings, plan: 'enterprise' });
    await invitePending(page, settings, org.id, 4);
    const chargesBefore = (await planChangeCharges(settings, subscription.id)).length;

    await openAccountSettings(page, customer, settings);
    expect((await changePlanThroughSettings(page, { plan: 'pro', direction: 'downgrade', settings })).changeType).toBe('downgrade_scheduled');

    // Paddle bills Pro + 2 extra seats from the renewal (3 included + 2 = 5 people); nothing is charged now.
    const paddleSubscription = await paddleApi(settings).getSubscription(subscription.id);
    expect(quantityOf(paddleSubscription, settings.paddle.priceIds.monthly.pro ?? '')).toBe(1);
    expect(quantityOf(paddleSubscription, settings.paddle.seatPriceIds.monthly ?? '')).toBe(2);
    expect((await planChangeCharges(settings, subscription.id)).length).toBe(chargesBefore);
    expect(await expectProfile(db, authUser.id, (row) => row.scheduled_tier === 'pro', 'downgrade scheduled'))
      .toMatchObject({ subscription_tier: 'enterprise', seat_limit: 8, scheduled_additional_seats: 2 });

    await forwardRenewalWebhook(settings, subscription.id);
    expect(await expectProfile(db, authUser.id, (row) => row.subscription_tier === 'pro', 'Pro at renewal'))
      .toMatchObject({ seat_limit: 5, additional_seats: 2, scheduled_tier: null });
    await openTeam(page, customer, settings);
    await expectSeatsUsed(page, 5, 5);
  });

  test('a Starter downgrade is refused while the team exists and allowed once it is empty', async ({ page, db, customer, settings }) => {
    const { authUser, org } = await ownerWithWorkspace({ page, db, customer, settings, plan: 'pro' });
    const email = syntheticEmail(settings, 'blocker');
    expect((await apiAs(page, settings, 'POST', `/organizations/${org.id}/members`, { email, role: 'viewer' })).status).toBe(201);

    await openAccountSettings(page, customer, settings);
    const refused = await changePlanThroughSettings(page, { plan: 'starter', direction: 'downgrade', settings, expectFailure: true });
    expect(refused.code).toBe('SEAT_REDUCTION_BLOCKED');
    expect((await expectProfile(db, authUser.id, () => true, 'profile')).scheduled_tier).toBeNull();

    await openTeam(page, customer, settings);
    expect((await revokeViaUi(page, settings, email)).status).toBe(200);
    await openAccountSettings(page, customer, settings);
    expect((await changePlanThroughSettings(page, { plan: 'starter', direction: 'downgrade', settings })).changeType).toBe('downgrade_scheduled');
    await expectProfile(db, authUser.id, (row) => row.scheduled_tier === 'starter', 'Starter scheduled');
  });

  test('Pro with extra seats -> Enterprise folds the extra seats into the included 8', async ({ page, db, customer, settings }) => {
    const { authUser, subscription } = await ownerWithWorkspace({ page, db, customer, settings, plan: 'pro' });
    expect((await setExtraSeatsViaUi(page, settings, 2)).status).toBe(200);
    await expectProfile(db, authUser.id, (row) => row.seat_limit === 5, 'Pro with 5 seats');

    await openAccountSettings(page, customer, settings);
    expect((await changePlanThroughSettings(page, { plan: 'enterprise', direction: 'upgrade', settings })).changeType).toBe('upgrade');
    const paddleSubscription = await paddleApi(settings).getSubscription(subscription.id);
    expect(quantityOf(paddleSubscription, settings.paddle.priceIds.monthly.enterprise ?? '')).toBe(1);
    expect(quantityOf(paddleSubscription, settings.paddle.seatPriceIds.monthly ?? ''), 'no paying twice for seats Enterprise includes').toBe(0);
    expect(await expectProfile(db, authUser.id, (row) => row.subscription_tier === 'enterprise', 'Enterprise'))
      .toMatchObject({ seat_limit: 8, additional_seats: 0 });
    await openTeam(page, customer, settings);
    await expectSeatsUsed(page, 1, 8);
  });

  test('when the owner cancels, the team works until the period ends; then invites and joins stop', async ({ page, db, customer, settings, persona }) => {
    const { authUser, subscription, org } = await ownerWithWorkspace({ page, db, customer, settings, plan: 'enterprise' });
    const member = await persona('stays');
    await inviteAndJoin({ ownerPage: page, member, settings, role: 'estimator' });
    const latecomer = await persona('latecomer');
    await openTeam(page, customer, settings);
    const lateInvite = await inviteViaUi(page, settings, { email: latecomer.customer.email, role: 'viewer' });
    expect(lateInvite.status).toBe(201);

    await test.step('canceled but still paid up: invites keep working; restoring changes nothing for the team', async () => {
      await openAccountSettings(page, customer, settings);
      await cancelThroughSettings(page, settings);
      const during = await apiAs(page, settings, 'POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, 'during'), role: 'viewer' });
      expect(during.status).toBe(201);
      await restoreButton(page).click();
      await acknowledgeNotice(page, 'core.accountSettings.restoreSubscriptionSuccessTitle');
      await expectProfile(db, authUser.id, (row) => row.cancels_at_period_end === false, 'restored');
      await openAccountSettings(page, customer, settings);
      await cancelThroughSettings(page, settings);
    });

    await test.step('after the paid period ends, invites and joins are blocked; existing members stay', async () => {
      const paddle = paddleApi(settings);
      await paddle.endSubscription(await paddle.getSubscription(subscription.id));
      await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.canceled');
      await expectProfile(db, authUser.id, (row) => row.subscription_status === 'canceled', 'subscription ended');

      const invite = await apiAs(page, settings, 'POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, 'after'), role: 'viewer' });
      expect(invite.status).toBe(402);
      expect(invite.body.code).toBe('OWNER_SUBSCRIPTION_INACTIVE');

      await openInvite(latecomer.page, lateInvite.body.inviteUrl);
      const join = await acceptInviteViaUi(latecomer.page, settings);
      expect(join.status).toBe(409);
      expect(join.body.code).toBe('SEAT_LIMIT_EXCEEDED');

      expect((await apiAs(member.page, settings, 'GET', `/organizations/${org.id}`)).status).toBe(200);
      await openTeam(member.page, member.customer, settings);
      await expect(membersHeading(member.page)).toBeVisible();
    });
  });

  test('a failed payment blocks invites until billing recovers', async ({ page, db, customer, settings }) => {
    const { authUser, subscription, org } = await ownerWithWorkspace({ page, db, customer, settings, plan: 'enterprise' });

    // The sandbox cannot fail a renewal on demand, so Paddle's notification of one is simulated.
    await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.past_due', { status: 'past_due' });
    await expectProfile(db, authUser.id, (row) => row.subscription_status === 'past_due', 'past due');
    const blocked = await apiAs(page, settings, 'POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, 'pastdue'), role: 'viewer' });
    expect(blocked.status).toBe(402);
    expect(blocked.body.code).toBe('OWNER_SUBSCRIPTION_INACTIVE');

    await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.updated', { status: 'active' });
    await expectProfile(db, authUser.id, (row) => row.subscription_status === 'active', 'recovered');
    const allowed = await apiAs(page, settings, 'POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, 'recovered'), role: 'viewer' });
    expect(allowed.status).toBe(201);
  });
});
