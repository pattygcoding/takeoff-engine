# Playwright Accessibility (a11y) Test Coverage

What the browser accessibility suite checks, test by test. For the accessibility
policy, target, and manual-audit backlog, see [`ACCESSIBILITY.md`](./ACCESSIBILITY.md).

- **Command:** `npm run test:a11y` (runs `playwright test` with `playwright.config.js`)
- **Runner:** Playwright + `@axe-core/playwright` (`AxeBuilder`)
- **Test directory:** `tests/accessibility`
- **Web server:** starts its own Vite dev server on `http://127.0.0.1:4175`
  (`npm run dev:local`). Keep that port free — `reuseExistingServer: false`.
- **Backend:** none. `**/api/billing/pricing` is mocked with a generated catalog
  fixture (`tests/helpers/paddleCatalogFixture.js`) so pricing-gated controls stay enabled.
- **Settings:** `fullyParallel: true`, `workers: 2`, `reducedMotion: 'reduce'`
  (disables colour transitions so axe never samples a mid-animation colour),
  screenshot on failure, trace on failure.

## Project matrix (every test runs once per project)

| Project | Viewport | Theme | Notes |
| --- | --- | --- | --- |
| `desktop-light` | 1440×900 | light | theme seeded in `localStorage.takeoff_engine_theme` |
| `desktop-dark` | 1440×900 | dark | |
| `mobile-light` | 320×800 | light | `isMobile: true`, `hasTouch: true` |
| `mobile-dark` | 320×800 | dark | `isMobile: true`, `hasTouch: true` |

Total: **116 tests** (2 skipped — the mobile-only navigation test on the two desktop projects).

## Axe rule sets (`withTags`)

| Where | Tags |
| --- | --- |
| Route scans | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice` |
| Landing notice dialog (open) | `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` |
| Landing interactions (toggle, language picker) | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice` |
| Native dialog fixture | `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` |

## Files

| File | Kind |
| --- | --- |
| `tests/accessibility/public-pages.spec.js` | Playwright specs for public routes and landing interactions |
| `tests/accessibility/dialogs.spec.js` | Playwright specs for the shared native `<dialog>` wrapper |
| `tests/accessibility/imageAltText.test.js` | `node:test` static analysis (no browser); also picked up under this folder |
| `tests/accessibility/fixtures/dialog.html` + `dialog.jsx` | Local dialog fixture (no backend/real billing) |

---

## `public-pages.spec.js`

Scanned routes (each gets the axe + reflow test below):
`/home`, `/login`, `/register`, `/forgot-password`, `/terms`, `/privacy`, `/refund`,
`/acceptable-use`, `/disclaimer`, `/guide`, `/accessibility`, `/someone/not-a-real-page`.

| Test | What it checks |
| --- | --- |
| `` `${route} has no detected WCAG A/AA violations and reflows` `` (×12 routes) | Loads `route?lang=en`, waits for `#main-content` and its `h1` (routes are lazy-loaded), then: (1) an axe run with the full tag set yields **zero** violations; (2) the page does **not** scroll horizontally (`documentElement.scrollWidth <= window.innerWidth + 1`, i.e. 320 px reflow). For `/home` it also scans the landing notice dialog while open and confirms `Escape` closes it. |
| `skip link is first and moves keyboard focus into content` | On `/login`, the first `Tab` focuses "Skip to main content"; `Enter` moves focus inside `#main-content`. |
| `account inputs have visible associated labels and autofill purposes` | On `/register`, each of `register-first-name`, `register-last-name`, `register-username`, `register-email`, `register-phone`, `register-password` has the right `autocomplete` value (`given-name`, `family-name`, `username`, `email`, `tel`, `new-password`), and clicking its `label[for]` focuses the input. |
| `client navigation focuses the new heading` | On `/login`, clicking "Create Account" (client-side route change) moves focus to the new `h1`. |
| `document language follows the selected locale and preserves fragment links` | `/home?lang=es#calculator` sets `<html lang="es">` and keeps the `#calculator` fragment. |
| `mobile navigation exposes its expanded state` (mobile only) | On `/home`, dismisses the notice, then the menu toggle reports `aria-expanded="false"` → `true`, `#landing-mobile-menu` becomes visible, and axe passes while open. |
| `accessibility statement is reachable and offers an existing support contact` | From `/login`, the "Accessibility" link opens the statement; its `h1` receives focus and an `article a[href="mailto:pattygsocials@gmail.com"]` is visible. |
| `unknown pages show a not-found page while workspace links still ask visitors to log in` | `/someone/not-a-real-page` shows a "Page not found" `h1`, title `Page not found - Takeoff Engine`, `meta[name=robots]` = `noindex`; "Go to Home Page" goes to `/home`. `/someone/projects` (unauthenticated) redirects to `/login`. |
| `landing theme toggle is labelled and both themes pass axe` | The "Switch to light/dark mode" control is uniquely visible/labelled; toggling it and scanning passes axe in **both** themes. |
| `landing language picker exposes its state and passes axe when open` | The language button's `aria-expanded` flips `false` → `true` on open, `Español` is visible, axe passes while open, and `Escape` closes it, restores `aria-expanded="false"`, and returns focus to the trigger. |
| `landing calculator inputs are labelled and results are announced` | Filling "Pipe Run Length (LF)" with `1000` updates the `#calculator [aria-live="polite"]` region (contains `555.6`). |
| `failed login exposes an announced error associated with the form` | With `POST **/auth/login` mocked to `401`, submitting an invalid login shows `role="alert"` "Invalid login credentials.", the form is `aria-describedby="auth-error"`, and `aria-busy="false"`. |
| `password reset success is announced without moving focus` | With `POST **/auth/forgot-password` mocked, submitting shows `role="status"` "Reset instructions sent." and keeps focus on the submit button. |
| `reduced motion removes long transitions and focus has a visible outline` | Under `reducedMotion: 'reduce'`, the skip link's computed outline is `3px solid` and its `transitionDuration` is effectively `0`. |

## `dialogs.spec.js`

Loads the local fixture `/tests/accessibility/fixtures/dialog.html?lang=en` (no accounts or real billing).

| Test | What it checks |
| --- | --- |
| `prompt has a name, contains focus, submits, and restores focus` | Opening the prompt focuses its textbox; axe passes; focus is trapped inside the dialog across tabs; submitting (`Enter`) closes the dialog, restores focus to the trigger, and writes the result to `<output>`. |
| `Escape closes prompt with the expected result` | `Escape` closes the prompt (result `null`); focus returns to the trigger. |
| `Escape closes confirmation with the expected result` | The confirmation opens with "Cancel" focused; `Escape` closes it (result `false`); focus returns to the trigger. |
| `Escape closes alert with the expected result` | `Escape` closes the alert (result `true`); focus returns to the trigger. |

## `imageAltText.test.js` (`node:test`, static — no browser)

| Test | What it checks |
| --- | --- |
| `detects images without an alt attribute` | Unit check of the tag parser: `<img>` without `alt` is flagged; `alt="..."`, `alt=""`, and `alt={expr}` are accepted. |
| `requires every frontend image to declare alt text or an empty decorative alt` | Walks every `.html/.htm/.js/.jsx/.ts/.tsx` file under `src/` and `public/` and fails, listing file:line, for any `<img>` missing an `alt` attribute. |

## Limitations

- Passing axe means only that the tested rules found no violations **in those states** — it is not a WCAG
  conformance guarantee. See [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) for the manual-audit backlog
  (screen readers, zoom/forced-colors, authenticated workflows, exports, external checkout, etc.).
- Chromium emulation is not VoiceOver/TalkBack on real devices.

