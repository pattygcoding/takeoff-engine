import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Save-path guards.
 *
 * Step 2 used to persist nothing, Step 3 saved only through a modal, and submitting emailed the
 * stale estimate and then locked the project. Behavioural tests cover the hook; these guards fail
 * the build if the wiring that makes those tests meaningful is removed — even if someone deletes
 * the tests themselves.
 */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const GUARDED_FILES = {
  autosave: 'src/product/lib/useProjectAutosave.ts',
  summary: 'src/product/lib/estimateSummary.ts',
  workspace: 'src/product/components/ProjectWorkspace.tsx',
  editStep: 'src/product/components/EditStep.tsx',
  resultsStep: 'src/product/components/ResultsStep.tsx',
  userWorkspace: 'src/product/components/UserWorkspace.tsx',
  chip: 'src/product/components/SaveStatusChip.tsx',
} as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

/** The body of a `const handleX = ...` handler, up to the next handler declaration. */
function handlerBody(source: string, name: string): string {
  const start = source.indexOf(`const ${name}`);
  if (start < 0) return '';

  const nextHandlers = [...source.matchAll(/const (?:handle[A-Z]\w*|process[A-Z]\w*)\s*=/g)]
    .map((match) => match.index ?? 0)
    .filter((index) => index > start);

  const end = nextHandlers.length > 0 ? Math.min(...nextHandlers) : source.length;
  return source.slice(start, end);
}

test('save guards: every guarded file exists and was actually inspected', () => {
  for (const relativePath of Object.values(GUARDED_FILES)) {
    const fullPath = path.join(projectRoot, relativePath);
    assert.ok(fs.existsSync(fullPath), `${relativePath} is missing`);
    assert.ok(read(relativePath).length > 200, `${relativePath} looks empty`);
  }
});

test('Step 2/3 draft autosave is wired into the workspace', () => {
  const source = read(GUARDED_FILES.workspace);

  assert.match(source, /useProjectAutosave\(/, 'the workspace must run the autosave');
  assert.match(source, /useLiveEstimate\(/, 'the workspace must own the live estimate');
  assert.match(source, /enabled:\s*!isLocked/, 'locked projects must never autosave');
  assert.match(source, /saveState=\{autosave\}/, 'both steps must receive the save state');
  assert.match(source, /summary:\s*live\.ready \? buildEstimateSummary/, 'the summary must come from the live estimate');
});

test('the submit path flushes the draft before emailing the proposal', () => {
  const body = handlerBody(read(GUARDED_FILES.resultsStep), 'handleSendProposalEmail');
  assert.ok(body, 'handleSendProposalEmail not found');

  const flushIndex = body.indexOf('flush(');
  const sendIndex = body.indexOf('sendProposalEmail(');

  assert.ok(flushIndex >= 0, 'the send handler must await saveState.flush()');
  assert.ok(sendIndex >= 0, 'the send handler must call proposalsApi.sendProposalEmail');
  assert.ok(
    flushIndex < sendIndex,
    'flush() must run before sendProposalEmail(): the backend snapshots the SAVED estimate and locks the project',
  );
});

test('the share-link path adopts the project the backend created', () => {
  const body = handlerBody(read(GUARDED_FILES.resultsStep), 'handleGenerateShareableProposal');
  assert.ok(body, 'handleGenerateShareableProposal not found');
  assert.match(body, /res\.project/, 'the generate response must be inspected for the created project');
  assert.match(body, /onProjectSaved\(/, 'the created project must be adopted so the next save updates it');
});

test('opening a project never clobbers a dirty local draft', () => {
  const body = handlerBody(read(GUARDED_FILES.userWorkspace), 'handleOpenProject');
  assert.ok(body, 'handleOpenProject not found');

  const dirtyIndex = body.indexOf('isLocalDraftDirty(');
  const setItemsIndex = body.indexOf('setItems(');

  assert.ok(dirtyIndex >= 0, 'handleOpenProject must consult isLocalDraftDirty');
  assert.ok(setItemsIndex >= 0, 'handleOpenProject must load the cloud copy somewhere');
  assert.ok(dirtyIndex < setItemsIndex, 'the dirty check must run before setItems()');
});

test('the autosave hook keeps its safety invariants', () => {
  const source = read(GUARDED_FILES.autosave);

  assert.match(source, /if \(!enabled\) return true;/, 'a locked project must short-circuit');
  assert.match(source, /if \(snapshot\.items\.length === 0\) return true;/, 'an empty grid must not create a draft');
  assert.match(source, /projectsApi\.create\(/, 'the first edit must create the draft');
  assert.match(source, /projectsApi\.update\(/, 'later edits must update the same project');
  assert.match(source, /recordSavedFingerprint\(/, 'the saved fingerprint must be remembered');
  assert.match(source, /lastSaved\.current === nextFingerprint|nextFingerprint === lastSaved\.current/, 'unchanged estimates must be skipped');
});

test('both steps render the draft save status', () => {
  assert.match(read(GUARDED_FILES.editStep), /<SaveStatusChip state=\{saveState\}/, 'Step 2 must show the save state');
  assert.match(read(GUARDED_FILES.resultsStep), /<SaveStatusChip state=\{saveState\}/, 'Step 3 must show the save state');
});

test('the summary helper is the single source for summary_json', () => {
  const results = read(GUARDED_FILES.resultsStep);

  assert.match(results, /buildEstimateSummary\(totals, items\.length\)/, 'Step 3 must use the shared summary helper');
  assert.doesNotMatch(
    results,
    /totalItemsCount: items\.length/,
    'the duplicated inline summary payload must not come back',
  );
});
