# Accessibility Maintenance

## Target and Limits

Target WCAG 2.2 Level AA. This is a remediation baseline, not a conformance
certification or a guarantee against legal claims. Applicable law depends on
jurisdiction and business circumstances; have qualified counsel review obligations
and public statements. Do not use an overlay, waiver, or disclaimer as a substitute
for removing barriers.

The public statement is at https://takeoffengine.com/accessibility and uses the
existing support email. Before release, the owner must verify that mailbox is
monitored, assign a remediation owner, and establish a realistic response process.
Do not publish an unapproved response SLA or claim full compliance.

## Automated Checks

From the frontend repository:

```sh
npm ci
npx playwright install chromium
npm run test:a11y
npm test
npm run build:local
```

The Playwright suite starts its own local Vite server on port 4175. Keep that port
available. It checks English public routes with axe WCAG A/AA rules and best
practices, 320px reflow, desktop/mobile rendering in both themes, associated account
labels, autofill, skip navigation, route focus, document language, expanded mobile
navigation, mocked authentication feedback, and shared native dialog behavior. The landing notice is checked open
and the underlying page is checked after dismissal. Dialog tests use a local
fixture without backend accounts or real billing actions.

The GitHub Actions workflow runs these browser checks on pushes and pull requests.
Configure it as a required branch-protection check in repository settings. This
file does not configure branch protection. Traces and screenshots on failure can
contain page content; keep real customer information out of test fixtures.

Automated passes mean only that the tested rules found no failures in those
states. Axe does not prove WCAG conformance. Chromium mobile emulation is not
VoiceOver, TalkBack, or testing on a physical device.

## Outstanding Release Review

- Obtain an independent manual WCAG 2.2 AA audit, ideally including disabled users.
- Complete each essential workflow using only Tab, Shift+Tab, Enter, Space,
  arrows, and Escape. Check visible focus, logical order, no traps, and focus not
  hidden behind sticky headers or dialogs.
- Test NVDA with Firefox/Chrome on Windows, VoiceOver with Safari on macOS/iOS,
  and TalkBack on Android. Verify names, roles, values, headings, error recovery,
  live updates, and reading order.
- Test 200% text zoom, 400% browser zoom/320 CSS pixels, text-spacing overrides,
  landscape orientation, reduced motion, and Windows forced-colors mode. Test
  both themes and all generated locales, including long strings.
- Audit authenticated projects, spreadsheet import/mapping, editable estimate
  tables, rate libraries, account/team settings, all custom dialogs, onboarding,
  and upgrade checkout. The billing upgrade modal is not yet migrated to the
  native dialog wrapper; verify any future migration with Paddle's external
  overlay so the checkout is not made inert behind a modal.
- Audit client proposal viewing and signing. Provide keyboard and assistive
  technology alternatives to drawing/dragging. Verify review/correction before
  signatures, purchases, deletions, and other consequential submissions.
- Audit PDF/Word exports for tagged structure, reading order, headings, table
  headers, accessible links, language, and image alternatives. Browser accessibility
  does not make exported files accessible. Establish an accessible alternative
  format while remediating exports.
- Check every form's field-level errors and suggestions, loading/success states,
  authentication and recovery, timeouts, and external payment flows. Public form
  labels and announcements are improved, but all error cases are not yet audited.
- Confirm meaningful images have useful alternatives, decorative media is ignored,
  controls meet WCAG 2.2 target-size/spacing requirements, and non-text contrast
  remains sufficient in hover, focus, selected, disabled, and error states.

## Feedback and Evidence

For each report, record the date, affected URL/workflow, assistive technology if
provided, impact, reproduction steps, owner, priority, workaround, fix, verification,
and response. Do not request diagnosis, disability proof, passwords, or confidential
project data. Offer assistance and track the underlying fix; email support alone is
not a substitute for accessible functionality.

Keep dated audit reports, test results, remediation tickets, release versions, and
retests as evidence of the ongoing process. Review the statement after material
changes. Schedule recurring checks and retest third-party integrations after updates.

Only edit English strings in src/lang/en.json. Translation generation must be run
by the user or explicitly authorized by the user; no accessibility test or workflow
invokes the translator.