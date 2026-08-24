import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const aliasesDir = path.resolve(__dirname, '../src/data/aliases');

function cleanAlias(str) {
  return String(str).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

describe('Column & Header Alias Integrity Tests', () => {
  const aliasFiles = fs
    .readdirSync(aliasesDir)
    .filter((f) => f.endsWith('.json'));

  it('verifies that all alias JSON files exist and are valid non-empty arrays of strings', () => {
    assert.ok(aliasFiles.length >= 10, `Expected at least 10 alias files, found ${aliasFiles.length}`);

    for (const file of aliasFiles) {
      const fullPath = path.join(aliasesDir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const data = JSON.parse(raw);

      assert.ok(Array.isArray(data), `${file} must export an array`);
      assert.ok(data.length > 0, `${file} must not be empty`);

      for (const item of data) {
        assert.strictEqual(typeof item, 'string', `All items in ${file} must be strings (found ${typeof item})`);
        assert.ok(item.trim().length > 0, `Items in ${file} must not be empty strings`);
      }
    }
  });

  it('ensures no exact duplicates within any single alias file', () => {
    for (const file of aliasFiles) {
      const fullPath = path.join(aliasesDir, file);
      const list = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

      const exactSeen = new Set();

      for (const alias of list) {
        const lower = alias.trim().toLowerCase();
        assert.ok(!exactSeen.has(lower), `Duplicate exact alias "${alias}" found in ${file}`);
        exactSeen.add(lower);
      }
    }
  });

  it('ensures no conflicting cross-file collisions between target field column aliases', () => {
    // Only test column alias files that map to target CSV fields (excluding ignoredIndexAliases which intentionally intercepts item # / pos)
    const targetFieldFiles = aliasFiles.filter((f) => f !== 'ignoredIndexAliases.json');
    const globalNormalizedMap = new Map(); // normalizedClean -> { originalAlias, file }

    for (const file of targetFieldFiles) {
      const fullPath = path.join(aliasesDir, file);
      const list = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

      for (const alias of list) {
        const normalized = cleanAlias(alias);
        if (!normalized) continue;

        if (globalNormalizedMap.has(normalized)) {
          const prior = globalNormalizedMap.get(normalized);
          if (prior.file !== file) {
            assert.fail(
              `Cross-file alias collision detected!\n` +
              `Alias: "${alias}" in ${file}\n` +
              `Collides with: "${prior.originalAlias}" in ${prior.file}\n` +
              `Normalized key: "${normalized}"`
            );
          }
        }

        globalNormalizedMap.set(normalized, { originalAlias: alias, file });
      }
    }
  });

  it('ensures ignoredIndexAliases does not collide with actual scope description aliases', () => {
    const ignoredIndexPath = path.join(aliasesDir, 'ignoredIndexAliases.json');
    const itemDescPath = path.join(aliasesDir, 'itemDescriptionAliases.json');

    const ignoredIndices = JSON.parse(fs.readFileSync(ignoredIndexPath, 'utf8')).map(cleanAlias);
    const itemDescriptions = JSON.parse(fs.readFileSync(itemDescPath, 'utf8')).map(cleanAlias);

    const intersection = ignoredIndices.filter((idx) => itemDescriptions.includes(idx));
    assert.deepStrictEqual(
      intersection,
      [],
      `Ignored index aliases must not clash with item description aliases: ${intersection.join(', ')}`
    );
  });
});
