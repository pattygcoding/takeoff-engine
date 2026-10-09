import { deleteQaProfiles, findQaAuthUsers, purgeQaAuthAuditEntries } from './database.ts';
import type { Db } from './database.ts';
import { createPaddleSandboxApi } from './paddleSandbox.ts';
import { createSupabaseAdmin } from './supabaseAdmin.ts';
import { QA_TAG } from './qaEnvironment.ts';
import type { QaSettings } from './qaEnvironment.ts';

/** What `purgeQaArtifacts` reports back about a cleanup run. */
export interface PurgeResult {
  users: number;
  auditRows: number;
  paddleCustomers: number;
  paddleSubscriptions: number;
  markers: unknown[];
}

/**
 * Removes everything QA created: Paddle sandbox subscriptions/customers first (so nothing keeps
 * billing), then the QA auth users (public.users and its dependents cascade), then the auth
 * audit rows Supabase keeps without a foreign key. Returns the markers to scan for afterwards.
 */
export async function purgeQaArtifacts(db: Db, settings: QaSettings): Promise<PurgeResult> {
  const users = await findQaAuthUsers(db);
  const paddleIds = users.flatMap((user) => [user.paddle_customer_id, user.paddle_subscription_id]).filter(Boolean);

  const paddle = createPaddleSandboxApi({ baseUrl: settings.paddle.apiBaseUrl });
  const paddleResult = await paddle.purgeQaCustomers(users.map((user) => user.paddle_customer_id));

  const admin = createSupabaseAdmin();
  for (const user of users.filter((account) => account.has_auth_user)) await admin.deleteUser(user.id);

  const userIds = users.map((user) => user.id);
  await deleteQaProfiles(db, userIds);
  const auditRows = await purgeQaAuthAuditEntries(db, userIds);

  return {
    users: users.length,
    auditRows,
    paddleCustomers: paddleResult.customers,
    paddleSubscriptions: paddleResult.subscriptions,
    markers: [`${QA_TAG}-`, ...userIds, ...paddleIds],
  };
}

export const describePurge = (result: PurgeResult): string => `${result.users} QA user(s), ${result.auditRows} auth audit row(s), `
  + `${result.paddleSubscriptions} Paddle sandbox subscription(s) canceled, ${result.paddleCustomers} customer(s) archived`;
