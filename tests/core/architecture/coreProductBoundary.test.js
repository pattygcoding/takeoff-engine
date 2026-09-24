import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

// Core must remain independent of product so it can be reused/shipped without product-specific logic.
const SCAN_DIRS = [path.join(projectRoot, 'src', 'core'), path.join(projectRoot, 'tests', 'core')];

const CODE_FILE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const IMPORT_SPECIFIER_PATTERN = /\b(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;

function listFilesRecursively(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursively(fullPath));
    } else if (CODE_FILE_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function isProductImportSpecifier(specifier) {
  return specifier.startsWith('#product/') || specifier === '#product' || /(^|[\\/])product([\\/]|$)/.test(specifier);
}

function findProductImportViolations(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  let match;
  IMPORT_SPECIFIER_PATTERN.lastIndex = 0;
  while ((match = IMPORT_SPECIFIER_PATTERN.exec(content)) !== null) {
    const specifier = match[1];
    if (isProductImportSpecifier(specifier)) {
      const lineNumber = content.slice(0, match.index).split('\n').length;
      violations.push(`${path.relative(projectRoot, filePath)}:${lineNumber} imports '${specifier}'`);
    }
  }
  return violations;
}

test('Core/Product Architectural Boundary (frontend): core must never import from product', () => {
  const allViolations = SCAN_DIRS.flatMap((dir) => listFilesRecursively(dir).flatMap(findProductImportViolations));

  assert.equal(
    allViolations.length,
    0,
    `Found core files importing from product (tight coupling not allowed):\n${allViolations.join('\n')}`
  );
});

test('Core/Product Architectural Boundary (frontend): scan actually inspects files', () => {
  const scannedCount = SCAN_DIRS.reduce((count, dir) => count + listFilesRecursively(dir).length, 0);
  assert.ok(scannedCount > 0, 'Expected to find at least one file under src/core or tests/core to scan');
});
