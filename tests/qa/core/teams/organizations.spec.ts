import { apiAs, buyPlan, expect, label, purchasePlanThroughUi, test } from '../../support/fixtures.js';
import {
  createWorkspace,
  expectSeatsUsed,
  inviteForm,
  manageSeatsButton,
  memberRow,
  membersHeading,
  openTeam,
} from '../../support/teamWorkspace.js';

const tw = (key) => label(`core.teamWorkspaceManager.${key}`);
const requiresTeamPlan = (page) => page.getByText(tw('requiresEnterprise').split('{{')[0]);
const newWorkspaceName = (page) => page.getByRole('textbox', { name: tw('newOrgNameLabel') });

test.describe('workspaces', () => {
  test.use({ customerLabel: 'orgowner' });

  test('an Enterprise owner creates workspaces; names are validated; outsiders cannot see them', async ({ page, db, customer, settings, persona }) => {
    await buyPlan(page, db, { plan: 'enterprise', customer, settings });
    expect(await openTeam(page, customer, settings)).toEqual([]);
    await expect(page.getByText(tw('noWorkspaces'))).toBeVisible();

    await test.step('workspace names are required and limited to 150 characters', async () => {
      await newWorkspaceName(page).fill('   ');
      await expect(page.getByRole('button', { name: tw('createOrgButton') })).toBeDisabled();
      const tooLong = await createWorkspace(page, settings, 'x'.repeat(151));
      expect(tooLong.status).toBe(400);
      await expect(page.getByText(tooLong.body.error)).toBeVisible();
    });

    const name = `QA Workspace ${customer.tag}`;
    const created = await test.step('the owner creates a workspace with the plan seat count', async () => {
      const result = await createWorkspace(page, settings, name);
      expect(result.status).toBe(201);
      await expect(page.getByText(tw('createdOrgSuccess').replace('{{name}}', name))).toBeVisible();
      await expect(memberRow(page, customer.email)).toContainText(tw('roleOwner'));
      await expectSeatsUsed(page, 1, 8);
      const { body } = await apiAs(page, settings, 'GET', '/organizations');
      expect(body.organizations).toEqual([expect.objectContaining({ id: result.body.organization.id, name, my_role: 'owner', max_seats: 8 })]);
      return result.body.organization;
    });

    await test.step('the owner can run a second workspace', async () => {
      const second = await createWorkspace(page, settings, `${name} B`);
      expect(second.status).toBe(201);
      await expect(page.getByRole('button', { name: new RegExp(`^${name} \\(`) })).toBeVisible();
      await expect(page.getByRole('button', { name: new RegExp(`^${name} B \\(`) })).toBeVisible();
    });

    await test.step('an outsider cannot open or list the workspace', async () => {
      const outsider = await persona('outsider');
      expect((await apiAs(outsider.page, settings, 'GET', `/organizations/${created.id}`)).status).toBe(403);
      expect((await apiAs(outsider.page, settings, 'GET', '/organizations')).body.organizations).toEqual([]);
      expect(await openTeam(outsider.page, outsider.customer, settings)).toEqual([]);
      await expect(membersHeading(outsider.page)).toHaveCount(0);
    });
  });

  test('Pro owners can create a workspace; Starter and Free accounts cannot, and cannot buy seats', async ({ page, db, customer, settings, persona }) => {
    await test.step('Pro: a workspace with 3 seats and seat management', async () => {
      await buyPlan(page, db, { plan: 'pro', customer, settings });
      await openTeam(page, customer, settings);
      await expect(requiresTeamPlan(page)).toHaveCount(0);
      const created = await createWorkspace(page, settings, `QA Pro Workspace ${customer.tag}`);
      expect(created.status).toBe(201);
      await expectSeatsUsed(page, 1, 3);
      await expect(manageSeatsButton(page)).toBeVisible();
      await expect(inviteForm(page)).toBeVisible();
    });

    const starter = await persona('starter');
    await purchasePlanThroughUi(starter.page, { plan: 'starter', customer: starter.customer, settings });
    const free = await persona('free');

    for (const [tier, member] of [['Starter', starter], ['Free', free]]) {
      await test.step(`${tier}: no workspace creation and no seat purchases`, async () => {
        await openTeam(member.page, member.customer, settings);
        await expect(requiresTeamPlan(member.page)).toBeVisible();
        await expect(newWorkspaceName(member.page)).toHaveCount(0);

        const create = await apiAs(member.page, settings, 'POST', '/organizations', { name: 'Not allowed' });
        expect(create.status).toBe(403);
        expect(create.body.code).toBe('ENTERPRISE_REQUIRED');
        const seats = await apiAs(member.page, settings, 'POST', '/billing/update-seats', { additionalSeats: 1 });
        expect(seats.status).toBe(400);
        expect(seats.body.code).toBe('SEAT_MANAGEMENT_NOT_ALLOWED');
      });
    }
  });
});
