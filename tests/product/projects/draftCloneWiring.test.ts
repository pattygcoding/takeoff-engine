import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Draft-to-draft clone wiring.
 *
 * The duplicate handler used to be handed to Step 2/3 only for locked projects, and the workspace
 * offered no clone action while editing a draft. These guards fail the build if that gating comes
 * back, even if the behavioural tests are removed.
 */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('the workspace hands the duplicate handler to both steps for any saved project', () => {
  const workspace = read('src/product/components/ProjectWorkspace.tsx');

  const wired = workspace.match(/onDuplicate=\{currentProject\?\.id \? handleDuplicate : undefined\}/g) ?? [];
  assert.equal(wired.length, 2, 'Step 2 and Step 3 must both receive the duplicate handler');
  assert.doesNotMatch(
    workspace,
    /onDuplicate=\{isLocked \? handleDuplicate : undefined\}/,
    'a draft must be cloneable while editing',
  );
  assert.match(workspace, /product\.projectWorkspace\.duplicateProject/, 'the workspace needs a clone action');
});

test('Step 2 and Step 3 render the draft duplicate action when editable', () => {
  assert.match(read('src/product/components/EditStep.tsx'), /!readOnly && onDuplicate &&/);
  assert.match(read('src/product/components/ResultsStep.tsx'), /!readOnly && onDuplicate &&/);
});
