import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WORKSPACE_PATHS, isWorkspacePath } from '../../../src/product/routes/workspacePaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userWorkspaceSource = fs.readFileSync(
  path.resolve(__dirname, '../../../src/product/components/UserWorkspace.jsx'),
  'utf8',
);

describe('Workspace path matching', () => {
  it('lists every route UserWorkspace renders so new pages are not treated as 404s', () => {
    const routePaths = [...userWorkspaceSource.matchAll(/<Route[\s\S]*?path="([^"]+)"/g)]
      .map(([, routePath]) => routePath)
      .filter((routePath) => routePath !== '*');
    assert.ok(routePaths.length > 0);
    assert.deepEqual([...routePaths].sort(), [...WORKSPACE_PATHS].sort());
  });

  it('accepts known workspace pages, with or without a trailing slash', () => {
    for (const subPath of ['', 'projects', 'settings', 'upload', 'edit', 'results', 'export', 'export/', 'takeoff/42/edit', 'takeoff/abc-123/results', 'TAKEOFF/7/EXPORT']) {
      assert.equal(isWorkspacePath(subPath), true, subPath);
    }
    assert.equal(isWorkspacePath(undefined), true);
  });

  it('rejects unknown pages so they render the 404 page', () => {
    for (const subPath of ['bogus', 'projects/extra', 'takeoff', 'takeoff/42', 'takeoff/42/delete', 'pricing/plans']) {
      assert.equal(isWorkspacePath(subPath), false, subPath);
    }
  });
});
