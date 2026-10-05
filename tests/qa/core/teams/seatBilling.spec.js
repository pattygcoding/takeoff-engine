import {
  apiAs,
  buyPlan,
  createVerifiedAccount,
  expect,
  expectProfile,
  forwardSubscriptionWebhook,
  label,
  openAccountSettings,
  paddleApi,
  planChangeCharges,
  test,
} from '../../support/fixtures.js';
import { payWithPaddleOverlay } from '../../support/paddleSandbox.js';
import { createQaIdentity } from '../../support/qaEnvironment.js';
import { createWorkspace, expectSeatsUsed, openTeam, setExtraSeatsViaUi } from '../../support/teamWorkspace.js';

const COLLECTED = new Set(['paid', 'completed']);
const collectedCharges = async (settings, subscriptionId) => (await planChangeCharges(settings, subscriptionId)).filter((txn) => COLLECTED.has(txn.status)).length;
const quantityOf = (subscription, priceId) => subscription.items.find((item) => item.price.id === priceId)?.quantity ?? 0;
const syntheticEmail = (settings, tag) => createQaIdentity(tag, { emailTemplate: settings.emailTemplate }).email;
// Paddle sandbox card that succeeds on the first payment (after a 3D Secure challenge) and declines every later one.
const DECLINES_AFTER_FIRST_PAYMENT = '4000 0027 6000 3184';

async function orgMaxSeats(db, ownerId) {
  const { rows } = await db.query('SELECT max_seats FROM public.organizations WHERE owner_id = $1', [ownerId]);
  return rows.map((row) => row.max_seats);
}

async function ownerWithWorkspace({ page, db, customer, settings, plan = 'enterprise', interval = 'monthly', paySettings = settings }) {
  const purchase = await buyPlan(page, db, { plan, interval, customer, settings: paySettings });
  await openTeam(page, customer, settings);
  const org = (await createWorkspace(page, settings, `QA Seat Billing ${customer.tag}`)).body.organization;
  return { ...purchase, org };
}

test.describe('paying for seats', () => {
  test.use({ customerLabel: 'seatbuyer' });

  test('the owner buys extra seats, cannot cut below seats in use, then removes the extras', async ({ page, db, customer, settings }) => {
    const { authUser, subscription, org } = await ownerWithWorkspace({ page, db, customer, settings });
    const seatPrice = settings.paddle.seatPriceIds.monthly;
    const paddle = paddleApi(settings);

    await test.step('adding 2 seats is charged now (prorated) and raises capacity to 10', async () => {
      const chargesBefore = await collectedCharges(settings, subscription.id);
      expect((await setExtraSeatsViaUi(page, settings, 2)).status).toBe(200);
      expect(quantityOf(await paddle.getSubscription(subscription.id), seatPrice)).toBe(2);
      await expect.poll(() => collectedCharges(settings, subscription.id), { message: 'prorated seat charge collected', timeout: 60_000 }).toBe(chargesBefore + 1);
      expect(await expectProfile(db, authUser.id, (row) => row.seat_limit === 10, 'seat limit 10')).toMatchObject({ additional_seats: 2 });
      expect(await orgMaxSeats(db, authUser.id)).toEqual([10]);
      await expectSeatsUsed(page, 1, 10);
    });

    await test.step('seats in use cannot be removed', async () => {
      for (let index = 1; index <= 9; index += 1) {
        const invite = await apiAs(page, settings, 'POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, `fill${index}`), role: 'viewer' });
        expect(invite.status).toBe(201);
      }
      await openTeam(page, customer, settings);
      await expectSeatsUsed(page, 10, 10);
      const refused = await setExtraSeatsViaUi(page, settings, 1);
      expect(refused.status).toBe(400);
      expect(refused.body.code).toBe('SEAT_REDUCTION_BLOCKED');
      expect(quantityOf(await paddle.getSubscription(subscription.id), seatPrice)).toBe(2);
    });

    await test.step('after freeing a seat, the extra seat can be removed from billing', async () => {
      const { body } = await apiAs(page, settings, 'GET', `/organizations/${org.id}`);
      const pending = body.members.find((m) => m.status === 'pending');
      expect((await apiAs(page, settings, 'POST', `/organizations/${org.id}/members/${pending.id}/revoke`)).status).toBe(200);
      await openTeam(page, customer, settings);
      expect((await setExtraSeatsViaUi(page, settings, 1)).status).toBe(200);
      expect(quantityOf(await paddle.getSubscription(subscription.id), seatPrice)).toBe(1);
      await expectProfile(db, authUser.id, (row) => row.seat_limit === 9 && row.additional_seats === 1, 'seat limit 9');
      await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.updated');
      await expectProfile(db, authUser.id, (row) => row.seat_limit === 9 && row.additional_seats === 1, 'Paddle notification agrees');
    });
  });

  test('yearly subscribers are billed the yearly seat price', async ({ page, db, customer, settings }) => {
    const { authUser, subscription } = await ownerWithWorkspace({ page, db, customer, settings, interval: 'annually' });
    expect((await setExtraSeatsViaUi(page, settings, 1)).status).toBe(200);
    const paddleSubscription = await paddleApi(settings).getSubscription(subscription.id);
    expect(quantityOf(paddleSubscription, settings.paddle.seatPriceIds.annually)).toBe(1);
    expect(quantityOf(paddleSubscription, settings.paddle.seatPriceIds.monthly)).toBe(0);
    await expect.poll(() => collectedCharges(settings, subscription.id), { timeout: 60_000 }).toBe(1);
    await expectProfile(db, authUser.id, (row) => row.seat_limit === 9, 'seat limit 9');
  });

  test('extra seats can be bought together with a plan at checkout', async ({ page, db, customer, settings }) => {
    const authUser = await createVerifiedAccount(page, db, customer, settings);
    await openAccountSettings(page, customer, settings);
    await page.getByRole('button', { name: label('core.accountSettings.upgradeToPro'), exact: true }).click();

    const modal = page.getByRole('dialog', { name: label('core.upgradeModal.title') });
    await modal.getByRole('group', { name: label('core.upgradeModal.planOptionsLabel') })
      .getByRole('button').filter({ has: page.getByText(label('core.upgradeModal.proTier'), { exact: true }) }).click();
    await modal.getByRole('button', { name: '+', exact: true }).click();
    await modal.getByRole('button', { name: '+', exact: true }).click();
    const upgrade = modal.getByRole('button', { name: new RegExp(`^${label('core.upgradeModal.upgradeButton').split('{{')[0]}`) });
    await expect(upgrade).toBeEnabled({ timeout: 30_000 });
    await upgrade.click();
    await payWithPaddleOverlay(page, { email: customer.email, cardholderName: `${customer.firstName} ${customer.lastName}`, card: settings.card });

    const subscription = await paddleApi(settings).waitForSubscription({ email: customer.email, priceId: settings.paddle.priceIds.monthly.pro });
    expect(quantityOf(subscription, settings.paddle.seatPriceIds.monthly)).toBe(2);
    await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.created');
    expect(await expectProfile(db, authUser.id, (row) => row.paddle_subscription_id === subscription.id && row.seat_limit === 5, 'Pro with 5 seats'))
      .toMatchObject({ subscription_tier: 'pro', additional_seats: 2 });
  });

  test('a declined payment grants no seats', async ({ page, db, customer, settings }) => {
    const paySettings = { ...settings, card: { ...settings.card, number: DECLINES_AFTER_FIRST_PAYMENT, threeDSecure: true } };
    const { authUser, subscription } = await ownerWithWorkspace({ page, db, customer, settings, paySettings });
    const declined = await setExtraSeatsViaUi(page, settings, 1);
    expect(declined.status).toBe(402);
    expect(declined.body.code).toBe('SEAT_CHANGE_NOT_BILLED');
    expect(quantityOf(await paddleApi(settings).getSubscription(subscription.id), settings.paddle.seatPriceIds.monthly)).toBe(0);
    expect(await expectProfile(db, authUser.id, () => true, 'profile')).toMatchObject({ seat_limit: 8, additional_seats: 0 });
    await openTeam(page, customer, settings);
    await expectSeatsUsed(page, 1, 8);
  });

  test("seats changed in Paddle's billing portal sync to the app", async ({ page, db, customer, settings }) => {
    const { authUser, subscription } = await ownerWithWorkspace({ page, db, customer, settings });
    await paddleApi(settings).updateItems(subscription.id, [
      { priceId: settings.paddle.priceIds.monthly.enterprise, quantity: 1 },
      { priceId: settings.paddle.seatPriceIds.monthly, quantity: 3 },
    ]);
    await forwardSubscriptionWebhook(settings, subscription.id, 'subscription.updated');
    await expectProfile(db, authUser.id, (row) => row.seat_limit === 11 && row.additional_seats === 3, 'seat limit 11');
    expect(await orgMaxSeats(db, authUser.id)).toEqual([11]);
    await openTeam(page, customer, settings);
    await expectSeatsUsed(page, 1, 11);
  });
});
