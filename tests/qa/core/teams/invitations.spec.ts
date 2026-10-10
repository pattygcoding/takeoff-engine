import type { Page } from '@playwright/test';
import type { QaPersona } from '../../support/fixtures.ts';
import type { QaSettings, QaIdentity } from '../../support/qaEnvironment.ts';
import type { Db } from '../../support/database.ts';
import {
  apiAs,
  buyPlan,
  expect,
  label,
  registerThroughUi,
  submitLoginForm,
  test,
  verifyEmail,
} from '../../support/fixtures.ts';
import { createQaIdentity } from '../../support/qaEnvironment.ts';
import {
  acceptInviteViaUi,
  copyInviteLinkViaUi,
  createWorkspace,
  expectSeatsUsed,
  inviteViaUi,
  memberRow,
  membersHeading,
  openInvite,
  openTeam,
  resendViaUi,
  revokeViaUi,
} from '../../support/teamWorkspace.ts';

const ai = (key: string): string => label(`core.acceptInvite.${key}`);
const invalidInvite = (page: Page) => page.getByRole('heading', { name: ai('invitationInvalidOrExpired') });
const syntheticEmail = (settings: QaSettings, tag: string): string => createQaIdentity(tag, { emailTemplate: settings.emailTemplate }).email;
const yourRole = (page: Page) => page.getByText(`${label('core.teamWorkspaceManager.yourRole')}:`);

/** Enterprise owner with one workspace, signed in on `page`. */
async function ownerWithWorkspace({ page, db, customer, settings }: { page: Page; db: Db; customer: QaIdentity; settings: QaSettings }) {
  await buyPlan(page, db, { plan: 'enterprise', customer, settings });
  await openTeam(page, customer, settings);
  const created = await createWorkspace(page, settings, `QA Invites ${customer.tag}`);
  expect(created.status).toBe(201);
  return created.body.organization;
}

test.describe('invitations', () => {
  test.use({ customerLabel: 'inviter' });

  test('a new person creates an account from the invite and joins; every role can be invited', async ({ page, db, customer, settings, persona }) => {
    const workspace = await ownerWithWorkspace({ page, db, customer, settings });
    const invitee = await persona('newbie', { signUp: false });

    const invite = await test.step('the owner invites an estimator, an admin, and a viewer; each holds a seat', async () => {
      const estimator = await inviteViaUi(page, settings, { email: invitee.customer.email, role: 'estimator' });
      expect(estimator.status).toBe(201);
      for (const role of ['admin', 'viewer']) {
        const email = syntheticEmail(settings, `pend${role}`);
        expect((await inviteViaUi(page, settings, { email, role })).status).toBe(201);
        await expect(memberRow(page, email)).toContainText('pending');
      }
      await expectSeatsUsed(page, 4, 8);
      expect(await copyInviteLinkViaUi(page, invitee.customer.email)).toBe(estimator.body.inviteUrl);
      return estimator.body;
    });

    await test.step('the invitation shows the workspace, role, and inviter', async () => {
      await openInvite(invitee.page, invite.inviteUrl);
      await expect(invitee.page.getByRole('heading', { name: ai('joinOrg').replace('{{orgName}}', String(workspace.name)) })).toBeVisible();
      await expect(invitee.page.getByText(invitee.customer.email)).toBeVisible();
      await expect(invitee.page.getByText(ai('roleEstimator'), { exact: true })).toBeVisible();
      await expect(invitee.page.getByText(`${customer.firstName} ${customer.lastName}`)).toBeVisible();
    });

    await test.step('they create an account, verify it, sign in, and land back on the invitation', async () => {
      await invitee.page.getByRole('button', { name: ai('createAccountToAccept') }).click();
      await expect(invitee.page).toHaveURL(/\/register(\?|$)/);
      await registerThroughUi(invitee.page, invitee.customer);
      await verifyEmail(db, invitee.customer, settings, { method: 'link' });
      await submitLoginForm(invitee.page, invitee.customer);
      await expect(invitee.page).toHaveURL(/\/accept-invite\?token=/);
    });

    await test.step('they accept and see the workspace with their role', async () => {
      expect((await acceptInviteViaUi(invitee.page, settings)).status).toBe(200);
      await expect(membersHeading(invitee.page)).toBeVisible();
      await expect(yourRole(invitee.page)).toContainText(label('core.teamWorkspaceManager.roleEstimator'));
      await openTeam(page, customer, settings);
      await expect(memberRow(page, invitee.customer.email)).toContainText('active');
      await expectSeatsUsed(page, 4, 8);
    });
  });

  test('a signed-in user accepts; the link cannot be reused; duplicate and invalid invites are refused', async ({ page, db, customer, settings, persona }) => {
    const workspace = await ownerWithWorkspace({ page, db, customer, settings });
    const member = await persona('member');

    const invite = await inviteViaUi(page, settings, { email: member.customer.email, role: 'viewer' });
    expect(invite.status).toBe(201);

    await test.step('signed in, they accept in one click', async () => {
      await openInvite(member.page, invite.body.inviteUrl);
      await expect(member.page.getByText(member.customer.email).first()).toBeVisible();
      expect((await acceptInviteViaUi(member.page, settings)).status).toBe(200);
      await expect(yourRole(member.page)).toContainText(label('core.teamWorkspaceManager.roleViewer'));
    });

    await test.step('the used link no longer works', async () => {
      await openInvite(member.page, invite.body.inviteUrl);
      await expect(invalidInvite(member.page)).toBeVisible();
    });

    await test.step('duplicates are refused; re-inviting a pending person keeps one seat', async () => {
      await openTeam(page, customer, settings);
      const again = await inviteViaUi(page, settings, { email: member.customer.email, role: 'viewer' });
      expect(again.status).toBe(409);
      await expect(page.getByText(again.body.error)).toBeVisible();
      const self = await inviteViaUi(page, settings, { email: customer.email, role: 'viewer' });
      expect(self.status).toBe(409);

      const pendingEmail = syntheticEmail(settings, 'pending');
      expect((await inviteViaUi(page, settings, { email: pendingEmail, role: 'estimator' })).status).toBe(201);
      await expectSeatsUsed(page, 3, 8);
      expect((await inviteViaUi(page, settings, { email: pendingEmail, role: 'viewer' })).status).toBe(201);
      await expectSeatsUsed(page, 3, 8);
      await expect(memberRow(page, pendingEmail)).toHaveCount(1);
    });

    await test.step('an invalid email is refused', async () => {
      const invalid = await apiAs(page, settings, 'POST', `/organizations/${workspace.id}/members`, { email: 'not-an-email', role: 'estimator' });
      expect(invalid.status).toBe(400);
    });
  });

  test('a signed-out member signs in from the invite and joins; another account cannot use it', async ({ page, db, customer, settings, persona }) => {
    await ownerWithWorkspace({ page, db, customer, settings });
    const member = await persona('returning', { signUp: false });
    await registerThroughUi(member.page, member.customer);
    await verifyEmail(db, member.customer, settings, { method: 'admin' });

    const invite = await inviteViaUi(page, settings, { email: member.customer.email, role: 'estimator' });
    expect(invite.status).toBe(201);

    await test.step('a different signed-in account is refused', async () => {
      const other = await persona('other');
      await openInvite(other.page, invite.body.inviteUrl);
      const attempt = await acceptInviteViaUi(other.page, settings);
      expect(attempt.status).toBe(400);
      await expect(other.page.getByText(attempt.body.error)).toBeVisible();
      await openTeam(page, customer, settings);
      await expect(memberRow(page, member.customer.email)).toContainText('pending');
    });

    await test.step('the invitee signs in from the invitation and accepts', async () => {
      await openInvite(member.page, invite.body.inviteUrl);
      await member.page.getByRole('button', { name: ai('signInToAccept') }).click();
      await expect(member.page).toHaveURL(/\/login(\?|$)/);
      await submitLoginForm(member.page, member.customer);
      await expect(member.page).toHaveURL(/\/accept-invite\?token=/);
      expect((await acceptInviteViaUi(member.page, settings)).status).toBe(200);
      await openTeam(page, customer, settings);
      await expect(memberRow(page, member.customer.email)).toContainText('active');
    });
  });

  test('revoked, resent, and expired invitations', async ({ page, db, customer, settings, persona }) => {
    await ownerWithWorkspace({ page, db, customer, settings });
    const visitor = await persona('visitor', { signUp: false });

    await test.step('revoking frees the seat and the link says it was revoked', async () => {
      const email = syntheticEmail(settings, 'revoked');
      const invite = await inviteViaUi(page, settings, { email, role: 'estimator' });
      await expectSeatsUsed(page, 2, 8);
      expect((await revokeViaUi(page, settings, email)).status).toBe(200);
      await expect(memberRow(page, email)).toContainText('revoked');
      await expectSeatsUsed(page, 1, 8);
      await openInvite(visitor.page, invite.body.inviteUrl);
      await expect(invalidInvite(visitor.page)).toBeVisible();
      await expect(visitor.page.getByText(/revoked/i)).toBeVisible();
    });

    await test.step('resending replaces the link and restarts the 7-day expiry', async () => {
      const email = syntheticEmail(settings, 'resent');
      const first = await inviteViaUi(page, settings, { email, role: 'viewer' });
      await db.query("UPDATE public.organization_members SET invite_expires_at = NOW() + INTERVAL '1 day' WHERE invited_email = $1", [email]);
      const resent = await resendViaUi(page, settings, email);
      expect(resent.status).toBe(200);
      expect(resent.body.inviteUrl).not.toBe(first.body.inviteUrl);
      const { rows: [row] } = await db.query('SELECT invite_expires_at FROM public.organization_members WHERE invited_email = $1', [email]);
      expect((new Date(row.invite_expires_at).getTime() - Date.now()) / 86_400_000).toBeGreaterThan(6.9);

      await openInvite(visitor.page, first.body.inviteUrl);
      await expect(invalidInvite(visitor.page)).toBeVisible();
      await openInvite(visitor.page, resent.body.inviteUrl);
      await expect(visitor.page.getByText(email)).toBeVisible();
    });

    await test.step('an expired link is refused', async () => {
      const email = syntheticEmail(settings, 'expired');
      const invite = await inviteViaUi(page, settings, { email, role: 'estimator' });
      // The clock cannot be advanced 7 days, so the QA invitation's expiry is moved into the past.
      await db.query("UPDATE public.organization_members SET invite_expires_at = NOW() - INTERVAL '1 minute' WHERE invited_email = $1", [email]);
      await openInvite(visitor.page, invite.body.inviteUrl);
      await expect(invalidInvite(visitor.page)).toBeVisible();
      await expect(visitor.page.getByText(/link has expired/i)).toBeVisible();
    });
  });
});
