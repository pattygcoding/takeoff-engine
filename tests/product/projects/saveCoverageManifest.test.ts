import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Keeps `docs/SAVE_TEST_COVERAGE.md` honest.
 *
 * The manifest is the map of "which test enforces which save invariant". If a test file is added or
 * renamed without updating the doc (or the doc points at a file that no longer exists), this fails.
 */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const TEST_DIR = path.join(projectRoot, 'tests', 'product', 'projects');
const MANIFEST = path.join(projectRoot, 'docs', 'SAVE_TEST_COVERAGE.md');

function saveTestFiles(): string[] {
  return fs.readdirSync(TEST_DIR).filter((name) => /\.(test|vitest)\.(ts|tsx)$/.test(name));
}

describe('save test coverage manifest', () => {
  it('lists every save test file', () => {
    const manifest = fs.readFileSync(MANIFEST, 'utf8');

    for (const file of saveTestFiles()) {
      assert.ok(manifest.includes(file), `${file} is missing from docs/SAVE_TEST_COVERAGE.md`);
    }
  });

  it('only references test files that exist', () => {
    const manifest = fs.readFileSync(MANIFEST, 'utf8');
    const referenced = [
      ...manifest.matchAll(/tests\/product\/projects\/([\w.-]+\.(?:test|vitest)\.(?:ts|tsx))(?![\w])/g),
    ].map((match) => match[1]);

    assert.ok(referenced.length > 0, 'the manifest must reference at least one test file');
    for (const file of referenced) {
      assert.ok(fs.existsSync(path.join(TEST_DIR, file)), `${file} is referenced but missing`);
    }
  });
});
