import pg from 'pg';
import { QA_TAG } from './qaEnvironment.ts';

/** A connected `pg` client as used by the QA harness. */
export type Db = pg.Client;

/** A row of `auth.users` as read by the QA harness. */
export interface AuthUserRow {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  [key: string]: unknown;
}

/** A row of `public.users` (profile) as read by the QA harness. */
export interface ProfileRow {
  id: string;
  username?: string;
  email?: string;
  role?: string;
  subscription_tier?: string;
  subscription_status?: string;
  has_unlimited_bypass?: boolean;
  trial_uses_remaining?: number;
  seat_limit?: number;
  additional_seats?: number;
  cancels_at_period_end?: boolean;
  scheduled_tier?: string | null;
  scheduled_change_effective_at?: string | null;
  subscription_renews_at?: string | null;
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  [key: string]: unknown;
}

/** A QA-relevant account row (`auth.users` full-joined with `public.users`). */
export interface QaAuthUserRow {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  has_auth_user: boolean;
  has_profile: boolean;
  paddle_customer_id: string;
  paddle_subscription_id: string | null;
  [key: string]: unknown;
}

/** One table's fingerprint inside a database snapshot. */
export interface TableFingerprint {
  rows?: number;
  digest?: string;
  unreadable?: string;
  rowHashes?: Map<string, string>;
}

/** Content fingerprint of every table in the given schemas, keyed by `schema.table`. */
export type Snapshot = Record<string, TableFingerprint>;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const quoteIdent = (name: unknown): string => `"${String(name).replaceAll('"', '""')}"`;

export async function openDatabase(databaseUrl: string): Promise<Db> {
  const local = LOCAL_HOSTS.has(new URL(databaseUrl).hostname);
  const client = new pg.Client({ connectionString: databaseUrl, ssl: local ? false : { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

export async function withDatabase<T>(databaseUrl: string, work: (db: Db) => Promise<T>): Promise<T> {
  const client = await openDatabase(databaseUrl);
  try {
    return await work(client);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Content fingerprint of every table in the given schemas: row count plus an order-independent
 * digest of every row. Two equal snapshots mean no row was added, removed, or changed.
 * Sequences are intentionally excluded; PostgreSQL never rolls them back, even after deletes.
 */
export async function snapshotDatabase(db: Db, schemas: string[]): Promise<Snapshot> {
  // One read-only repeatable-read transaction gives every table the same point-in-time view.
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    return await fingerprintTables(db, await listTables(db, schemas));
  } finally {
    await db.query('COMMIT');
  }
}

async function listTables(db: Db, schemas: string[]): Promise<Array<{ schema_name: string; table_name: string }>> {
  const { rows } = await db.query(
    `SELECT n.nspname AS schema_name, c.relname AS table_name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p') AND n.nspname = ANY($1::text[])
      ORDER BY 1, 2`,
    [schemas],
  );
  return rows;
}

const ROW_DETAIL_LIMIT = 5000;

async function fingerprintTables(
  db: Db,
  tables: Array<{ schema_name: string; table_name: string }>,
): Promise<Snapshot> {
  const snapshot: Snapshot = {};
  for (const { schema_name: schema, table_name: table } of tables) {
    const name = `${schema}.${table}`;
    const relation = `${quoteIdent(schema)}.${quoteIdent(table)}`;
    await db.query('SAVEPOINT fingerprint');
    try {
      const { rows: [result] } = await db.query(
        `SELECT count(*)::text AS row_count,
                coalesce(md5(string_agg(md5(t::text), '' ORDER BY md5(t::text))), '') AS digest
           FROM ${relation} AS t`,
      );
      snapshot[name] = { rows: Number(result.row_count), digest: result.digest };
      // Per-row hashes (keyed by id when present) let a failed comparison name the exact rows.
      if ((snapshot[name].rows ?? 0) > 0 && (snapshot[name].rows ?? 0) <= ROW_DETAIL_LIMIT) {
        const { rows } = await db.query(`SELECT coalesce(to_jsonb(t)->>'id', md5(t::text)) AS key, md5(t::text) AS hash FROM ${relation} AS t`);
        Object.defineProperty(snapshot[name], 'rowHashes', { value: new Map(rows.map((row) => [row.key, row.hash])), enumerable: false });
      }
      await db.query('RELEASE SAVEPOINT fingerprint');
    } catch (error) {
      await db.query('ROLLBACK TO SAVEPOINT fingerprint');
      const failure = error as { code?: string; message: string };
      snapshot[name] = { unreadable: failure.code || failure.message };
    }
  }
  return snapshot;
}

export function diffSnapshots(
  before: Snapshot,
  after: Snapshot,
): Array<{ table: string; before: TableFingerprint | null; after: TableFingerprint | null }> {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return names
    .filter((name) => JSON.stringify(before[name]) !== JSON.stringify(after[name]))
    .map((name) => ({ table: name, before: before[name] ?? null, after: after[name] ?? null }));
}

function describeRowChanges(
  before: TableFingerprint | null | undefined,
  after: TableFingerprint | null | undefined,
): string {
  if (!before?.rowHashes && !after?.rowHashes) return '';
  const old: Map<string, string> = before?.rowHashes || new Map();
  const now: Map<string, string> = after?.rowHashes || new Map();
  const added = [...now.keys()].filter((key) => !old.has(key));
  const removed = [...old.keys()].filter((key) => !now.has(key));
  const changed = [...now.keys()].filter((key) => old.has(key) && old.get(key) !== now.get(key));
  const list = (keys: string[]): string =>
    keys.slice(0, 5).join(', ') + (keys.length > 5 ? `, +${keys.length - 5} more` : '');
  return [
    added.length ? `added: ${list(added)}` : '',
    removed.length ? `removed: ${list(removed)}` : '',
    changed.length ? `changed: ${list(changed)}` : '',
  ].filter(Boolean).map((line) => `\n      ${line}`).join('');
}

export function formatSnapshotDiff(
  diff: Array<{ table: string; before: TableFingerprint | null; after: TableFingerprint | null }>,
): string {
  const describe = (state: TableFingerprint | null | undefined): string => {
    if (!state) return 'missing';
    if (state.unreadable) return `unreadable (${state.unreadable})`;
    return `${state.rows} rows`;
  };
  return diff.map(({ table, before, after }) => {
    const sameCount = before?.rows === after?.rows;
    return `  - ${table}: ${describe(before)} -> ${describe(after)}${sameCount ? ' (row contents changed)' : ''}${describeRowChanges(before, after)}`;
  }).join('\n');
}

export function unreadableTables(snapshot: Snapshot): string[] {
  return Object.entries(snapshot).filter(([, state]) => state.unreadable).map(([name]) => name);
}

/**
 * Accounts the suite owns. Email AND username must both carry the QA tag (username only when a
 * profile exists), so a real customer can never be mistaken for a QA account. Profiles whose
 * auth user is already gone are included: public.users is not guaranteed to cascade from auth.users.
 */
export async function findQaAuthUsers(db: Db): Promise<QaAuthUserRow[]> {
  const { rows } = await db.query(
    `SELECT coalesce(a.id, p.id)::text AS id,
            coalesce(a.email, p.email) AS email,
            a.email_confirmed_at,
            (a.id IS NOT NULL) AS has_auth_user,
            (p.id IS NOT NULL) AS has_profile,
            p.paddle_customer_id, p.paddle_subscription_id
       FROM auth.users a
       FULL OUTER JOIN public.users p ON p.id = a.id
      WHERE (a.id IS NOT NULL AND a.email ILIKE $1 AND (p.id IS NULL OR p.username ILIKE $2))
         OR (a.id IS NULL AND p.email ILIKE $1 AND p.username ILIKE $2)`,
    [`%${QA_TAG}-%`, `${QA_TAG}-%`],
  );
  return rows;
}

/** Removes QA profiles (their product/org rows cascade from public.users). */
export async function deleteQaProfiles(db: Db, userIds: string[]): Promise<number> {
  if (!userIds.length) return 0;
  const { rowCount } = await db.query(
    'DELETE FROM public.users WHERE id = ANY($1::uuid[]) AND username ILIKE $2',
    [userIds, `${QA_TAG}-%`],
  );
  return rowCount ?? 0;
}

export async function findAuthUserByEmail(db: Db, email: string): Promise<AuthUserRow | null> {
  const { rows: [user] } = await db.query(
    'SELECT id::text AS id, email, email_confirmed_at FROM auth.users WHERE lower(email) = lower($1)',
    [email],
  );
  return user ?? null;
}

export async function findProfile(db: Db, userId: string): Promise<ProfileRow | null> {
  const { rows: [profile] } = await db.query('SELECT * FROM public.users WHERE id = $1', [userId]);
  return profile ?? null;
}

/**
 * Rows anywhere in the given schemas whose content mentions any marker (QA tag, QA user IDs,
 * Paddle IDs). After cleanup this must be empty: nothing the run created may survive.
 */
export async function findFootprint(
  db: Db,
  schemas: string[],
  markers: unknown[],
): Promise<Array<{ table: string; rows: number }>> {
  const patterns = [...new Set(markers.filter(Boolean))].map((marker) => `%${marker}%`);
  if (!patterns.length) return [];
  const leftovers: Array<{ table: string; rows: number }> = [];
  for (const { schema_name: schema, table_name: table } of await listTables(db, schemas)) {
    try {
      const { rows: [result] } = await db.query(
        `SELECT count(*)::int AS hits FROM ${quoteIdent(schema)}.${quoteIdent(table)} AS t WHERE t::text ILIKE ANY($1::text[])`,
        [patterns],
      );
      if (result.hits) leftovers.push({ table: `${schema}.${table}`, rows: result.hits });
    } catch {
      // Tables the role cannot read are reported by the snapshot as unreadable.
    }
  }
  return leftovers;
}

/**
 * Supabase writes auth audit rows (signup, login, user_deleted, ...) that are not linked to
 * auth.users by a foreign key, so they survive user deletion and must be removed explicitly.
 */
export async function purgeQaAuthAuditEntries(db: Db, userIds: string[] = []): Promise<number> {
  const exists = await db.query("SELECT to_regclass('auth.audit_log_entries') IS NOT NULL AS present");
  if (!exists.rows[0].present) return 0;
  const patterns = [`%${QA_TAG}-%`, ...userIds.map((id) => `%${id}%`)];
  const { rowCount } = await db.query(
    'DELETE FROM auth.audit_log_entries WHERE payload::text ILIKE ANY($1::text[])',
    [patterns],
  );
  return rowCount ?? 0;
}
