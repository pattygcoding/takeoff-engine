import {
  diffSnapshots,
  findFootprint,
  formatSnapshotDiff,
  snapshotDatabase,
  unreadableTables,
  withDatabase,
} from './support/database.ts';
import { describePurge, purgeQaArtifacts } from './support/cleanup.ts';
import { assertSafeQaEnvironment, loadQaSettings } from './support/qaEnvironment.ts';

const log = (message: string): void => console.log(`[qa] ${message}`);

/**
 * Guarantees the database is identical before and after the QA run:
 *   setup    -> remove leftovers of any crashed run, then fingerprint every table
 *   teardown -> remove everything this run created, prove no trace remains, and compare the
 *               fingerprint with the starting one. Any difference fails the run.
 */
export default async function globalSetup() {
  assertSafeQaEnvironment();
  const settings = loadQaSettings();
  const databaseUrl = process.env.DATABASE_URL ?? '';

  const before = await withDatabase(databaseUrl, async (db) => {
    const leftovers = await purgeQaArtifacts(db, settings);
    if (leftovers.users || leftovers.auditRows || leftovers.paddleCustomers) {
      log(`Removed leftovers from a previous interrupted run: ${describePurge(leftovers)}.`);
    }
    const snapshot = await snapshotDatabase(db, settings.snapshotSchemas);
    const unreadable = unreadableTables(snapshot);
    if (unreadable.length) {
      throw new Error(`Cannot fingerprint ${unreadable.join(', ')}; DATABASE_URL needs read access to every table to prove the run leaves no changes.`);
    }
    log(`Database fingerprint taken: ${Object.keys(snapshot).length} tables in ${settings.snapshotSchemas.join(', ')}.`);
    return snapshot;
  });

  return async function globalTeardown() {
    await withDatabase(databaseUrl, async (db) => {
      const purge = await purgeQaArtifacts(db, settings);
      log(`Cleanup: ${describePurge(purge)}.`);

      const footprint = await findFootprint(db, settings.snapshotSchemas, purge.markers);
      const after = await snapshotDatabase(db, settings.snapshotSchemas);
      const diff = diffSnapshots(before, after);

      const failures: string[] = [];
      if (footprint.length) {
        failures.push(`QA data still present after cleanup:\n${footprint.map((hit) => `  - ${hit.table}: ${hit.rows} row(s)`).join('\n')}`);
      }
      if (diff.length) {
        failures.push(
          `Database differs from its state at the start of the run:\n${formatSnapshotDiff(diff)}\n`
          + '  If real users were active on the shared database during the run, re-run when it is idle.',
        );
      }
      if (failures.length) throw new Error(`QA database integrity check failed.\n${failures.join('\n')}`);
      log('Database integrity verified: identical to the start of the run.');
    });
  };
}
