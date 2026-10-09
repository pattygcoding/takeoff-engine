import { expect } from '@playwright/test';
import { acknowledgeNotice, label, openAccountSettings } from './fixtures.js';

const tw = (key) => label(`core.teamWorkspaceManager.${key}`);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pathOf = (res) => new URL(res.url()).pathname;

function waitForApi(page, settings, method, pathPattern) {
  const apiPath = new URL(settings.apiUrl).pathname;
  return page.waitForResponse((res) => res.request().method() === method
    && res.url().startsWith(settings.apiUrl)
    && pathPattern.test(pathOf(res).slice(apiPath.length)));
}

async function asResult(responsePromise) {
  const res = await responsePromise;
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

export const membersHeading = (page) => page.getByRole('heading', { name: new RegExp(`^${escapeRegExp(tw('workspaceMembers'))}`) });
export const memberRow = (page, email) => page.getByRole('row').filter({ hasText: email });
export const inviteForm = (page) => page.locator('form').filter({ has: page.locator('#team-invite-email') });
export const manageSeatsButton = (page) => page.getByRole('button', { name: tw('manageSeatButton') });
export const leaveButton = (page) => page.getByRole('button', { name: tw('leaveWorkspaceButton'), exact: true });
export const deleteWorkspaceButton = (page) => page.getByRole('button', { name: tw('deleteOrgButton') });
export const roleSelect = (page, email) => page.getByRole('combobox', { name: tw('memberRoleLabel').replace('{{email}}', email) });

/** Account settings with the team section loaded. Returns the workspaces the API listed. */
export async function openTeam(page, customer, settings) {
  const listed = waitForApi(page, settings, 'GET', /^\/organizations$/);
  await openAccountSettings(page, customer, settings);
  const { organizations } = await (await listed).json();
  if (organizations.length) await expect(membersHeading(page)).toBeVisible();
  return organizations;
}

/** "Workspace Members (occupied / max Seats Used)" */
export async function expectSeatsUsed(page, occupied, max) {
  await expect(membersHeading(page)).toContainText(`(${occupied} / ${max} ${tw('seatsUsed')})`);
}

export async function createWorkspace(page, settings, name) {
  await page.getByRole('textbox', { name: tw('newOrgNameLabel') }).fill(name);
  const created = waitForApi(page, settings, 'POST', /^\/organizations$/);
  // The app re-selects the new workspace after creating it; wait until it is the one shown.
  const shown = waitForApi(page, settings, 'GET', /^\/organizations\/[^/]+$/);
  shown.catch(() => {});
  await page.getByRole('button', { name: tw('createOrgButton') }).click();
  const result = await asResult(created);
  if (result.status === 201) {
    const selected = await shown;
    expect(pathOf(selected).endsWith(`/organizations/${result.body.organization.id}`)).toBe(true);
    await expect(membersHeading(page)).toBeVisible();
  }
  return result;
}

export async function selectWorkspace(page, settings, name) {
  const loaded = waitForApi(page, settings, 'GET', /^\/organizations\/[^/]+$/);
  await page.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)} \\(`) }).click();
  await loaded;
}

export async function inviteViaUi(page, settings, { email, role = 'estimator' }) {
  const form = inviteForm(page);
  await form.locator('#team-invite-email').fill(email);
  await form.locator('#team-invite-role').selectOption(role);
  const sent = waitForApi(page, settings, 'POST', /^\/organizations\/[^/]+\/members$/);
  await form.getByRole('button', { name: tw('sendInviteButton') }).click();
  const result = await asResult(sent);
  if (result.status === 201) await expect(memberRow(page, email)).toBeVisible();
  return result;
}

/** "Copy Link" on a pending invitation; returns the link from the clipboard. */
export async function copyInviteLinkViaUi(page, email) {
  await memberRow(page, email).getByRole('button', { name: tw('copyLink') }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  await acknowledgeNotice(page, 'core.teamWorkspaceManager.linkCopiedTitle');
  return link;
}

export async function resendViaUi(page, settings, email) {
  const resent = waitForApi(page, settings, 'POST', /^\/organizations\/[^/]+\/members\/[^/]+\/resend$/);
  await memberRow(page, email).getByRole('button', { name: tw('resend'), exact: true }).click();
  const result = await asResult(resent);
  await acknowledgeNotice(page, 'core.teamWorkspaceManager.inviteResentTitle');
  return result;
}

async function confirmDialog(page, titleKey, confirmKey) {
  const dialog = page.getByRole('dialog', { name: label(titleKey) });
  await dialog.getByRole('button', { name: label(confirmKey) }).click();
}

export async function revokeViaUi(page, settings, email) {
  const revoked = waitForApi(page, settings, 'POST', /^\/organizations\/[^/]+\/members\/[^/]+\/revoke$/);
  await memberRow(page, email).getByRole('button', { name: tw('revoke'), exact: true }).click();
  await confirmDialog(page, 'core.teamWorkspaceManager.revokeInviteTitle', 'core.teamWorkspaceManager.revokeInviteButton');
  return asResult(revoked);
}

export async function removeViaUi(page, settings, email) {
  const removed = waitForApi(page, settings, 'DELETE', /^\/organizations\/[^/]+\/members\/[^/]+$/);
  await memberRow(page, email).getByRole('button', { name: tw('remove'), exact: true }).click();
  await confirmDialog(page, 'core.teamWorkspaceManager.removeMemberTitle', 'core.teamWorkspaceManager.removeMemberButton');
  return asResult(removed);
}

export async function changeRoleViaUi(page, settings, email, role) {
  const changed = waitForApi(page, settings, 'PUT', /^\/organizations\/[^/]+\/members\/[^/]+$/);
  await roleSelect(page, email).selectOption(role);
  return asResult(changed);
}

export async function leaveViaUi(page, settings) {
  const left = waitForApi(page, settings, 'POST', /^\/organizations\/[^/]+\/leave$/);
  await leaveButton(page).click();
  await confirmDialog(page, 'core.teamWorkspaceManager.leaveWorkspaceTitle', 'core.teamWorkspaceManager.leaveWorkspaceConfirmButton');
  return asResult(left);
}

export async function deleteWorkspaceViaUi(page, settings) {
  const deleted = waitForApi(page, settings, 'DELETE', /^\/organizations\/[^/]+$/);
  await deleteWorkspaceButton(page).click();
  await confirmDialog(page, 'core.teamWorkspaceManager.deleteOrgTitle', 'core.teamWorkspaceManager.deleteOrgConfirmButton');
  return asResult(deleted);
}

/** "Manage Seat Capacity" -> set the extra-seat count -> "Save & Update Billing". */
export async function setExtraSeatsViaUi(page, settings, extraSeats) {
  await manageSeatsButton(page).click();
  const modal = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: tw('seatModalTitle') }) });
  const counter = modal.locator('span.font-mono');
  for (let guard = 0; guard < 50; guard += 1) {
    const current = Number(await counter.textContent());
    if (current === extraSeats) break;
    await modal.getByRole('button', { name: current < extraSeats ? '+' : '-', exact: true }).click();
  }
  await expect(counter).toHaveText(String(extraSeats));

  const saved = waitForApi(page, settings, 'POST', /^\/billing\/update-seats$/);
  await modal.getByRole('button', { name: tw('saveUpdateBillingButton') }).click();
  const result = await asResult(saved);
  await acknowledgeNotice(page, result.status === 200 ? 'core.teamWorkspaceManager.seatsUpdatedTitle' : 'core.teamWorkspaceManager.seatsUpdateErrorTitle');
  return result;
}

/** The invitee opens their invitation link. Returns the page's invitation card text. */
export async function openInvite(page, inviteUrl) {
  const url = new URL(inviteUrl);
  await page.goto(`${url.pathname}${url.search}`);
}

/** Signed-in invitee clicks "Accept Invitation & Join Workspace". */
export async function acceptInviteViaUi(page, settings) {
  const accepted = waitForApi(page, settings, 'POST', /^\/organizations\/invitations\/accept$/);
  await page.getByRole('button', { name: label('core.acceptInvite.acceptAndJoin') }).click();
  const result = await asResult(accepted);
  if (result.status === 200) {
    await acknowledgeNotice(page, 'core.acceptInvite.teamJoinedTitle');
    await expect(page).toHaveURL(/\/settings(\?|$)/);
  }
  return result;
}

/** Invite someone by email from the owner's page and have them accept from their own page. */
export async function inviteAndJoin({ ownerPage, member, settings, role }) {
  const { status, body } = await inviteViaUi(ownerPage, settings, { email: member.customer.email, role });
  expect(status, `invite failed: ${JSON.stringify(body)}`).toBe(201);
  await openInvite(member.page, body.inviteUrl);
  const accepted = await acceptInviteViaUi(member.page, settings);
  expect(accepted.status, `accept failed: ${JSON.stringify(accepted.body)}`).toBe(200);
  return body;
}

/** Account settings -> Delete Account -> type username -> Permanently Delete. */
export async function deleteAccountViaUi(page, settings, customer) {
  await page.getByRole('button', { name: label('core.accountSettings.deleteAccountButton'), exact: true }).click();
  await page.locator('#delete-account-confirm').fill(customer.username);
  const deleted = waitForApi(page, settings, 'DELETE', /^\/auth\/account$/);
  await page.getByRole('button', { name: label('core.accountSettings.permanentlyDeleteButton') }).click();
  return asResult(deleted);
}
