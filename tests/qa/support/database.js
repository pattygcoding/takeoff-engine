import pg from 'pg';
import { QA_TAG } from './qaEnvironment.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const quoteIdent = (name) => `"${String(name).replaceAll('"', '""')}"`;

export async function openDatabase(databaseUrl) {
  const local = LOCAL_HOSTS.has(new URL(databaseUrl).hostname);
  const client = new pg.Client({ connectionString: databaseUrl, ssl: local ? false : { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

export async function withDatabase(databaseUrl, work) {
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
export async function snapshotDatabase(db, schemas) {
  // One read-only repeatable-read transaction gives every table the same point-in-time view.
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    return await fingerprintTables(db, await listTables(db, schemas));
  } finally {
    await db.query('COMMIT');
  }
}

async function listTables(db, schemas) {
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

async function fingerprintTables(db, tables) {
  const snapshot = {};
  for (const { schema_name: schema, table_name: table } of tables) {
    const name = `${schema}.${table}`;
    await db.query('SAVEPOINT fingerprint');
    try {
      const { rows: [result] } = await db.query(
        `SELECT count(*)::text AS row_count,
                coalesce(md5(string_agg(md5(t::text), '' ORDER BY md5(t::text))), '') AS digest
           FROM ${quoteIdent(schema)}.${quoteIdent(table)} AS t`,
      );
      snapshot[name] = { rows: Number(result.row_count), digest: result.digest };
      await db.query('RELEASE SAVEPOINT fingerprint');
    } catch (error) {
      await db.query('ROLLBACK TO SAVEPOINT fingerprint');
      snapshot[name] = { unreadable: error.code || error.message };
    }
  }
  return snapshot;
}

export function diffSnapshots(before, after) {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return names
    .filter((name) => JSON.stringify(before[name]) !== JSON.stringify(after[name]))
    .map((name) => ({ table: name, before: before[name] ?? null, after: after[name] ?? null }));
}

export function formatSnapshotDiff(diff) {
  const describe = (state) => {
    if (!state) return 'missing';
    if (state.unreadable) return `unreadable (${state.unreadable})`;
    return `${state.rows} rows`;
  };
  return diff.map(({ table, before, after }) => {
    const sameCount = before?.rows === after?.rows;
    return `  - ${table}: ${describe(before)} -> ${describe(after)}${sameCount ? ' (row contents changed)' : ''}`;
  }).join('\n');
}

export function unreadableTables(snapshot) {
  return Object.entries(snapshot).filter(([, state]) => state.unreadable).map(([name]) => name);
}

/**
 * Accounts the suite owns. Email AND username must both carry the QA tag (username only when a
 * profile exists), so a real customer can never be mistaken for a QA account. Profiles whose
 * auth user is already gone are included: public.users is not guaranteed to cascade from auth.users.
 */
export async function findQaAuthUsers(db) {
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
export async function deleteQaProfiles(db, userIds) {
  if (!userIds.length) return 0;
  const { rowCount } = await db.query(
    'DELETE FROM public.users WHERE id = ANY($1::uuid[]) AND username ILIKE $2',
    [userIds, `${QA_TAG}-%`],
  );
  return rowCount;
}

export async function findAuthUserByEmail(db, email) {
  const { rows: [user] } = await db.query(
    'SELECT id::text AS id, email, email_confirmed_at FROM auth.users WHERE lower(email) = lower($1)',
    [email],
  );
  return user ?? null;
}

export async function findProfile(db, userId) {
  const { rows: [profile] } = await db.query('SELECT * FROM public.users WHERE id = $1', [userId]);
  return profile ?? null;
}

/**
 * Rows anywhere in the given schemas whose content mentions any marker (QA tag, QA user IDs,
 * Paddle IDs). After cleanup this must be empty: nothing the run created may survive.
 */
export async function findFootprint(db, schemas, markers) {
  const patterns = [...new Set(markers.filter(Boolean))].map((marker) => `%${marker}%`);
  if (!patterns.length) return [];
  const leftovers = [];
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
export async function purgeQaAuthAuditEntries(db, userIds = []) {
  const exists = await db.query("SELECT to_regclass('auth.audit_log_entries') IS NOT NULL AS present");
  if (!exists.rows[0].present) return 0;
  const patterns = [`%${QA_TAG}-%`, ...userIds.map((id) => `%${id}%`)];
  const { rowCount } = await db.query(
    'DELETE FROM auth.audit_log_entries WHERE payload::text ILIKE ANY($1::text[])',
    [patterns],
  );
  return rowCount;
}
