import { apiAs, buyPlan, expect, label, test } from '../../support/fixtures.js';
import { createQaIdentity } from '../../support/qaEnvironment.js';
import {
  changeRoleViaUi,
  createWorkspace,
  deleteWorkspaceButton,
  expectSeatsUsed,
  inviteAndJoin,
  inviteForm,
  inviteViaUi,
  leaveButton,
  leaveViaUi,
  manageSeatsButton,
  memberRow,
  membersHeading,
  openTeam,
  removeViaUi,
  revokeViaUi,
  roleSelect,
} from '../../support/teamWorkspace.js';

const tw = (key) => label(`core.teamWorkspaceManager.${key}`);
const yourRole = (page) => page.getByText(`${tw('yourRole')}:`);
const syntheticEmail = (settings, tag) => createQaIdentity(tag, { emailTemplate: settings.emailTemplate }).email;

async function memberIds(page, settings, orgId) {
  const { body } = await apiAs(page, settings, 'GET', `/organizations/${orgId}`);
  return Object.fromEntries(body.members.map((m) => [m.user_email || m.invited_email, m]));
}

test.describe('roles', () => {
  test.use({ customerLabel: 'roleowner' });

  test('admins, estimators, and viewers get exactly their permissions', async ({ page, db, customer, settings, persona }) => {
    await buyPlan(page, db, { plan: 'enterprise', customer, settings });
    await openTeam(page, customer, settings);
    const org = (await createWorkspace(page, settings, `QA Roles ${customer.tag}`)).body.organization;

    const admin = await persona('admin');
    const estimator = await persona('estimator');
    const viewer = await persona('viewer');
    for (const [member, role] of [[admin, 'admin'], [estimator, 'estimator'], [viewer, 'viewer']]) {
      await openTeam(page, customer, settings);
      await inviteAndJoin({ ownerPage: page, member, settings, role });
    }
    await openTeam(page, customer, settings);
    const pendingEmail = syntheticEmail(settings, 'pending');
    expect((await inviteViaUi(page, settings, { email: pendingEmail, role: 'viewer' })).status).toBe(201);
    const ids = await memberIds(page, settings, org.id);

    await test.step('every member sees the workspace, their role, and the owner', async () => {
      for (const [member, roleKey] of [[admin, 'roleAdmin'], [estimator, 'roleEstimator'], [viewer, 'roleViewer']]) {
        await openTeam(member.page, member.customer, settings);
        await expect(membersHeading(member.page)).toBeVisible();
        await expect(yourRole(member.page)).toContainText(tw(roleKey));
        await expect(member.page.getByText(`${tw('owner')}: ${customer.email}`)).toBeVisible();
        await expect(leaveButton(member.page)).toBeVisible();
      }
      await expect(leaveButton(page)).toHaveCount(0);
    });

    for (const [name, member] of [['estimator', estimator], ['viewer', viewer]]) {
      await test.step(`the ${name} cannot manage the team (UI and API)`, async () => {
        const p = member.page;
        await expect(inviteForm(p)).toHaveCount(0);
        await expect(manageSeatsButton(p)).toHaveCount(0);
        await expect(deleteWorkspaceButton(p)).toHaveCount(0);
        for (const email of [admin.customer.email, estimator.customer.email, viewer.customer.email, pendingEmail]) {
          await expect(roleSelect(p, email)).toHaveCount(0);
        }
        for (const action of ['resend', 'revoke', 'remove', 'copyLink']) {
          await expect(p.getByRole('row').getByRole('button', { name: tw(action), exact: true })).toHaveCount(0);
        }

        const pending = ids[pendingEmail];
        const view = await apiAs(p, settings, 'GET', `/organizations/${org.id}`);
        expect(view.status).toBe(200);
        expect(view.body.members.find((m) => m.id === pending.id).invite_token, 'invite links are hidden from non-managers').toBeUndefined();
        const attempts = [
          ['POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, 'nope'), role: 'viewer' }],
          ['POST', `/organizations/${org.id}/members/${pending.id}/resend`],
          ['POST', `/organizations/${org.id}/members/${pending.id}/revoke`],
          ['PUT', `/organizations/${org.id}/members/${pending.id}`, { role: 'estimator' }],
          ['DELETE', `/organizations/${org.id}/members/${pending.id}`],
          ['DELETE', `/organizations/${org.id}`],
        ];
        for (const [method, path, body] of attempts) {
          expect((await apiAs(p, settings, method, path, body)).status, `${method} ${path}`).toBe(403);
        }
      });
    }

    await test.step('the admin manages estimators and viewers, but not admins or the owner', async () => {
      const p = admin.page;
      await expect(inviteForm(p)).toBeVisible();
      await expect(p.locator('#team-invite-role option[value="admin"]')).toHaveCount(0);
      await expect(roleSelect(p, estimator.customer.email)).toBeVisible();
      await expect(roleSelect(p, admin.customer.email)).toHaveCount(0);
      await expect(manageSeatsButton(p)).toHaveCount(0);
      await expect(deleteWorkspaceButton(p)).toHaveCount(0);

      expect((await changeRoleViaUi(p, settings, estimator.customer.email, 'viewer')).status).toBe(200);
      expect((await changeRoleViaUi(p, settings, estimator.customer.email, 'estimator')).status).toBe(200);
      const invited = syntheticEmail(settings, 'byadmin');
      expect((await inviteViaUi(p, settings, { email: invited, role: 'viewer' })).status).toBe(201);
      expect((await revokeViaUi(p, settings, invited)).status).toBe(200);
      expect((await apiAs(p, settings, 'GET', `/organizations/${org.id}`)).body.members.find((m) => m.id === ids[pendingEmail].id).invite_token).toBeTruthy();

      const ownerRow = ids[customer.email];
      const refusals = [
        ['POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, 'newadmin'), role: 'admin' }],
        ['PUT', `/organizations/${org.id}/members/${ids[estimator.customer.email].id}`, { role: 'admin' }],
        ['PUT', `/organizations/${org.id}/members/${ownerRow.id}`, { role: 'viewer' }],
        ['DELETE', `/organizations/${org.id}/members/${ownerRow.id}`],
        ['DELETE', `/organizations/${org.id}`],
      ];
      for (const [method, path, body] of refusals) {
        expect((await apiAs(p, settings, method, path, body)).status, `${method} ${path}`).toBe(403);
      }
    });

    await test.step('only the owner can promote, change, or remove an admin', async () => {
      await openTeam(page, customer, settings);
      expect((await changeRoleViaUi(page, settings, viewer.customer.email, 'admin')).status).toBe(200);
      const promoted = ids[viewer.customer.email];
      for (const [method, path, body] of [
        ['PUT', `/organizations/${org.id}/members/${promoted.id}`, { role: 'viewer' }],
        ['DELETE', `/organizations/${org.id}/members/${promoted.id}`],
      ]) {
        expect((await apiAs(admin.page, settings, method, path, body)).status, `${method} ${path}`).toBe(403);
      }
      await openTeam(admin.page, admin.customer, settings);
      await expect(roleSelect(admin.page, viewer.customer.email)).toHaveCount(0);
      expect((await changeRoleViaUi(page, settings, viewer.customer.email, 'viewer')).status).toBe(200);
    });

    await test.step('role changes take effect immediately', async () => {
      expect((await changeRoleViaUi(page, settings, estimator.customer.email, 'admin')).status).toBe(200);
      await openTeam(estimator.page, estimator.customer, settings);
      await expect(inviteForm(estimator.page)).toBeVisible();
      expect((await changeRoleViaUi(page, settings, estimator.customer.email, 'viewer')).status).toBe(200);
      await openTeam(estimator.page, estimator.customer, settings);
      await expect(inviteForm(estimator.page)).toHaveCount(0);
      expect((await apiAs(estimator.page, settings, 'POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, 'late'), role: 'viewer' })).status).toBe(403);
    });
  });

  test('members can leave; removed members lose access and can be re-invited', async ({ page, db, customer, settings, persona }) => {
    await buyPlan(page, db, { plan: 'enterprise', customer, settings });
    await openTeam(page, customer, settings);
    const org = (await createWorkspace(page, settings, `QA Leave ${customer.tag}`)).body.organization;
    const member = await persona('member');
    await inviteAndJoin({ ownerPage: page, member, settings, role: 'estimator' });

    await test.step('a member leaves on their own and the seat is freed', async () => {
      await openTeam(member.page, member.customer, settings);
      expect((await leaveViaUi(member.page, settings)).status).toBe(200);
      await expect(member.page.getByText(tw('leftWorkspaceSuccess').replace('{{name}}', org.name))).toBeVisible();
      await expect(membersHeading(member.page)).toHaveCount(0);
      await openTeam(page, customer, settings);
      await expect(memberRow(page, member.customer.email)).toHaveCount(0);
      await expectSeatsUsed(page, 1, 8);
    });

    await test.step('the owner cannot leave their own workspace', async () => {
      const attempt = await apiAs(page, settings, 'POST', `/organizations/${org.id}/leave`);
      expect(attempt.status).toBe(400);
      expect(attempt.body.code).toBe('OWNER_CANNOT_LEAVE');
    });

    await test.step('re-invited, then removed: access ends immediately', async () => {
      await inviteAndJoin({ ownerPage: page, member, settings, role: 'viewer' });
      await openTeam(page, customer, settings);
      expect((await removeViaUi(page, settings, member.customer.email)).status).toBe(200);
      await expect(memberRow(page, member.customer.email)).toHaveCount(0);
      expect((await apiAs(member.page, settings, 'GET', `/organizations/${org.id}`)).status).toBe(403);
      expect(await openTeam(member.page, member.customer, settings)).toEqual([]);
    });
  });
});
