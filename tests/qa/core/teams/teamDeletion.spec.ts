import type { Page } from '@playwright/test';
import type { QaSettings, QaIdentity } from '../../support/qaEnvironment.ts';
import { apiAs, buyPlan, expect, label, paddleApi, test } from '../../support/fixtures.ts';
import { findAuthUserByEmail, findProfile } from '../../support/database.ts';
import { createQaIdentity } from '../../support/qaEnvironment.ts';
import {
  createWorkspace,
  deleteAccountViaUi,
  deleteWorkspaceButton,
  deleteWorkspaceViaUi,
  expectSeatsUsed,
  inviteAndJoin,
  inviteViaUi,
  memberRow,
  membersHeading,
  openTeam,
  revokeViaUi,
} from '../../support/teamWorkspace.ts';

const tw = (key: string): string => label(`core.teamWorkspaceManager.${key}`);
const syntheticEmail = (settings: QaSettings, tag: string): string => createQaIdentity(tag, { emailTemplate: settings.emailTemplate }).email;

test.describe('deleting workspaces and accounts', () => {
  test.use({ customerLabel: 'deleter' });

  test('a workspace can only be deleted once nobody else holds a seat', async ({ page, db, customer, settings }) => {
    await buyPlan(page, db, { plan: 'enterprise', customer, settings });
    await openTeam(page, customer, settings);
    const name = `QA Delete ${customer.tag}`;
    const org = (await createWorkspace(page, settings, name)).body.organization;
    const email = syntheticEmail(settings, 'holder');
    expect((await inviteViaUi(page, settings, { email, role: 'viewer' })).status).toBe(201);

    await expect(deleteWorkspaceButton(page)).toHaveCount(0);
    const refused = await apiAs(page, settings, 'DELETE', `/organizations/${org.id}`);
    expect(refused.status).toBe(400);
    expect(refused.body.code).toBe('ORG_HAS_MEMBERS');

    expect((await revokeViaUi(page, settings, email)).status).toBe(200);
    expect((await deleteWorkspaceViaUi(page, settings)).status).toBe(200);
    await expect(page.getByText(tw('deleteOrgSuccess').replace('{{name}}', name))).toBeVisible();
    expect(await openTeam(page, customer, settings)).toEqual([]);
    expect((await apiAs(page, settings, 'GET', `/organizations/${org.id}`)).status).toBe(404);
  });

  test('owners cannot leave members stranded; a member deleting their account frees the seat; deleting the owner stops billing', async ({ page, db, customer, settings, persona }) => {
    const { subscription, authUser } = await buyPlan(page, db, { plan: 'enterprise', customer, settings });
    await openTeam(page, customer, settings);
    await createWorkspace(page, settings, `QA Account Delete ${customer.tag}`);
    const member = await persona('leaver');
    await inviteAndJoin({ ownerPage: page, member, settings, role: 'estimator' });

    await test.step('the owner cannot delete their account while the team has active members', async () => {
      await openTeam(page, customer, settings);
      const refused = await deleteAccountViaUi(page, settings, customer);
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('OWNS_TEAM_WITH_MEMBERS');
      await expect(page.getByText(refused.body.error)).toBeVisible();
      await page.getByRole('button', { name: label('core.accountSettings.cancelButton'), exact: true }).click();
      expect(await findProfile(db, authUser.id)).toBeTruthy();
    });

    await test.step('a member deletes their own account and the seat is freed', async () => {
      await openTeam(member.page, member.customer, settings);
      const deleted = await deleteAccountViaUi(member.page, settings, member.customer);
      expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
      await expect(member.page).toHaveURL(/\/login(\?|$)/);
      expect(await findAuthUserByEmail(db, member.customer.email)).toBeNull();
      await openTeam(page, customer, settings);
      await expect(memberRow(page, member.customer.email)).toHaveCount(0);
      await expectSeatsUsed(page, 1, 8);
    });

    await test.step('the owner deletes their account; the subscription is canceled in Paddle', async () => {
      const deleted = await deleteAccountViaUi(page, settings, customer);
      expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
      await expect(page).toHaveURL(/\/login(\?|$)/);
      expect(await findProfile(db, authUser.id)).toBeNull();
      expect((await paddleApi(settings).getSubscription(subscription.id)).status).toBe('canceled');
      await expect(membersHeading(page)).toHaveCount(0);
    });
  });
});
