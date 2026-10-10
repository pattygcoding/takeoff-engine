import type { Page } from '@playwright/test';
import type { QaSettings, QaIdentity } from '../../support/qaEnvironment.ts';
import type { Db } from '../../support/database.ts';
import { apiAs, buyPlan, expect, test } from '../../support/fixtures.ts';
import { createQaIdentity } from '../../support/qaEnvironment.ts';
import {
  createWorkspace,
  expectSeatsUsed,
  inviteAndJoin,
  inviteForm,
  inviteViaUi,
  openTeam,
  revokeViaUi,
  selectWorkspace,
} from '../../support/teamWorkspace.ts';

const syntheticEmail = (settings: QaSettings, tag: string): string =>
  createQaIdentity(tag, { emailTemplate: settings.emailTemplate }).email;

test.describe('seat limits', () => {
  test.use({ customerLabel: 'seatowner' });

  test('Enterprise: pending invites hold seats, the 9th person is refused, and revoking frees a seat', async ({ page, db, customer, settings }) => {
    await buyPlan(page, db, { plan: 'enterprise', customer, settings });
    await openTeam(page, customer, settings);
    const org = (await createWorkspace(page, settings, `QA Seats ${customer.tag}`)).body.organization;

    const invited = [];
    for (let index = 1; index <= 7; index += 1) {
      const email = syntheticEmail(settings, `seat${index}`);
      expect((await inviteViaUi(page, settings, { email, role: 'estimator' })).status).toBe(201);
      invited.push(email);
    }
    await expectSeatsUsed(page, 8, 8);
    await expect(inviteForm(page), 'a full workspace hides the invite form').toHaveCount(0);

    const ninth = await apiAs(page, settings, 'POST', `/organizations/${org.id}/members`, { email: syntheticEmail(settings, 'seat9'), role: 'viewer' });
    expect(ninth.status).toBe(400);
    expect(ninth.body.code).toBe('SEAT_LIMIT_EXCEEDED');

    expect((await revokeViaUi(page, settings, invited[0])).status).toBe(200);
    await expectSeatsUsed(page, 7, 8);
    await expect(inviteForm(page)).toBeVisible();
    expect((await inviteViaUi(page, settings, { email: syntheticEmail(settings, 'seat10'), role: 'viewer' })).status).toBe(201);
    await expectSeatsUsed(page, 8, 8);
  });

  test('seats are shared across workspaces and one person uses one seat', async ({ page, db, customer, settings, persona }) => {
    await buyPlan(page, db, { plan: 'pro', customer, settings });
    await openTeam(page, customer, settings);
    const nameA = `QA Pool A ${customer.tag}`;
    const nameB = `QA Pool B ${customer.tag}`;
    const orgA = (await createWorkspace(page, settings, nameA)).body.organization;
    const member = await persona('pooled');

    await inviteAndJoin({ ownerPage: page, member, settings, role: 'estimator' });
    await openTeam(page, customer, settings);
    const orgB = (await createWorkspace(page, settings, nameB)).body.organization;
    await inviteAndJoin({ ownerPage: page, member, settings, role: 'viewer' });

    const memberOrgs = (await apiAs(member.page, settings, 'GET', '/organizations')).body.organizations.map((org) => org.id).sort();
    expect(memberOrgs).toEqual([orgA.id, orgB.id].sort());

    // Owner + the member (counted once across both workspaces) = 2 of Pro's 3 seats.
    await openTeam(page, customer, settings);
    await selectWorkspace(page, settings, nameB);
    expect((await inviteViaUi(page, settings, { email: syntheticEmail(settings, 'third'), role: 'viewer' })).status).toBe(201);
    const fourth = await apiAs(page, settings, 'POST', `/organizations/${orgA.id}/members`, { email: syntheticEmail(settings, 'fourth'), role: 'viewer' });
    expect(fourth.status).toBe(400);
    expect(fourth.body.code).toBe('SEAT_LIMIT_EXCEEDED');
  });

  test('two invites racing for the last seat: exactly one wins', async ({ page, db, customer, settings }) => {
    await buyPlan(page, db, { plan: 'pro', customer, settings });
    await openTeam(page, customer, settings);
    const org = (await createWorkspace(page, settings, `QA Race ${customer.tag}`)).body.organization;
    expect((await inviteViaUi(page, settings, { email: syntheticEmail(settings, 'first'), role: 'viewer' })).status).toBe(201);

    const race = await Promise.all(['racea', 'raceb'].map((tag) => apiAs(page, settings, 'POST', `/organizations/${org.id}/members`, {
      email: syntheticEmail(settings, tag),
      role: 'viewer',
    })));
    expect(race.map((result) => result.status).sort()).toEqual([201, 400]);
    expect(race.find((result) => result.status === 400)!.body.code).toBe('SEAT_LIMIT_EXCEEDED');

    await openTeam(page, customer, settings);
    await expectSeatsUsed(page, 3, 3);
  });
});
