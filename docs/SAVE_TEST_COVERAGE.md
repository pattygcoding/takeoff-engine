# Draft Save & Autosave Test Coverage

What enforces that Step 2 and Step 3 drafts actually reach the cloud, and that submitting can never
email a stale estimate. For the behaviour itself, see `useProjectAutosave.ts`,
`ProjectWorkspace.tsx` and `ResultsStep.tsx`.

- **Gate:** `npm run verify` (typecheck → lint → `node --test` guards → `vitest`).
- **Behavioural tests:** `npm run test:unit` (Vitest, jsdom).
- **Static guards:** `npm test` (Node's test runner, source scanning).

## Invariants and the test that enforces each

| Invariant | Enforced by |
| --- | --- |
| A brand-new takeoff creates its draft project on the first Step 2 edit (derived name, `status: 'draft'`), and later edits update that same project instead of duplicating it. | `tests/product/projects/projectAutosave.vitest.tsx` |
| The workspace adopts the created draft and rewrites the URL, so a refresh reopens the same project. | `tests/product/projects/projectWorkspaceAutosave.vitest.tsx` |
| Rapid grid edits coalesce into one debounced request; an unchanged estimate is skipped entirely. | `tests/product/projects/projectAutosave.vitest.tsx` |
| A locked (awarded / submitted / archived / declined) project never autosaves, and an empty grid never creates a project. | `tests/product/projects/projectAutosave.vitest.tsx` |
| A failed save reports `status: 'error'`, keeps the last successful timestamp, and is retried on the next edit — never hammered in a loop. | `tests/product/projects/projectAutosave.vitest.tsx` |
| `flush()` saves immediately (bypassing the debounce) so submit can await it. | `tests/product/projects/projectAutosave.vitest.tsx` |
| Opening a project from the dashboard or a direct URL never replaces edits this browser has not pushed yet. | `tests/product/projects/projectAutosave.vitest.tsx` (fingerprint) + `tests/product/projects/saveGuards.test.ts` (wiring) |
| Submitting the proposal flushes the draft **before** `POST /api/proposals/send-email`, which snapshots the saved estimate and locks the project. | `tests/product/projects/saveGuards.test.ts` |
| Generating a share link adopts the project the backend created, so the next save updates it instead of creating a duplicate. | `tests/product/projects/saveGuards.test.ts` |
| Both Step 2 and Step 3 render the draft save status (`Saving…` / `Saved 12:04` / `Couldn't save — retry`). | `tests/product/projects/saveGuards.test.ts` |
| `summary_json` is built from one shared helper, so the dashboard's bid total cannot silently go to `$0.00`. | `tests/product/projects/estimateSummary.test.ts` + `tests/product/projects/saveGuards.test.ts` |
| A draft can be duplicated into a new draft (same estimate, column schema and quote cover block), and Step 2/3 offer the action while the project is still editable. | `tests/product/projects/draftClone.vitest.tsx` + `tests/product/projects/draftCloneWiring.test.ts` |
| This manifest stays in sync with the suite (every test file listed, every listed file real). | `tests/product/projects/saveCoverageManifest.test.ts` |

## Why static guards as well as behavioural tests

The behavioural tests prove the hook works. The guards in
`tests/product/projects/saveGuards.test.ts` prove the **call sites** still use it — the exact place
the original bug lived (`handleCalculate` navigated without saving, and the send handler emailed the
saved copy). Deleting a behavioural test cannot silently re-open that hole, because the guard reads
the component source and fails on the missing `flush()`, the missing dirty check, or the missing
autosave wiring.

## Manual checks the suite cannot cover

- Two browsers editing the same project: last write wins (the autosave is per-browser by design).
- A save that fails because the session expired: the chip shows the retry affordance; signing in
  again and editing retries automatically.
