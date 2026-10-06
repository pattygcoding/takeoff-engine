# Playwright QA Test Coverage (frontend repository)

What the end-to-end QA suite checks. These tests live in the frontend repo but run
**full-stack**: a real frontend, a real backend, a real database, and a real Paddle
**sandbox** checkout. For the harness, safety rules, and database-integrity details,
see [`../tests/qa/README.md`](../tests/qa/README.md).

- **Commands:** `npm run test:qa` (injects the Infisical `dev` env) or
  `npm run test:qa:local` (uses variables already in your shell).
  Filter with `npm run test:qa -- -g pro` or `npm run test:qa -- teams/`.
- **Config:** `playwright.qa.config.js` — `testDir: ./tests/qa`, `testMatch: **/*.spec.js`,
  `workers: 4`, `timeout: 180s`, `expect.timeout: 20s`, `retries: 0`,
  viewport 1440×900, screenshot/video/trace on failure, `outputDir: ./test-results/qa`.
- **Servers (started by Playwright, never your dev servers):** QA Supabase gateway
  (`5056`), backend (`5055`), frontend (`4177`). Override with `QA_FRONTEND_PORT`,
  `QA_BACKEND_PORT`, `QA_SUPABASE_GATEWAY_PORT`.
- **Global setup/teardown** (`tests/qa/globalSetup.js`): refuses to start unless the
  environment is a safe Paddle sandbox, purges leftovers from any crashed run, and
  fingerprints every `public`/`auth` table before the run. Teardown deletes everything
  the run created and **fails if the database is not byte-for-byte identical** to the start.
- **Every account is generated** per test (`qae2e-<label>-<id>`), each signed in from its
  own browser context — no hand-made accounts.

## Specs and what they prove

### Core account & billing (`tests/qa/core/`)

| Spec | Tests | What it proves |
| --- | --- | --- |
| `auth/createAccount.spec.js` | `user can create a new account` | A visitor can sign up, verify by email link, and log in. The stored profile matches what they entered, on the **free** tier, with terms-acceptance evidence and no Paddle subscription. `/auth/me` reflects the new account, and `/onboarding` offers every paid plan (no "current plan" badge). |
| `billing/subscriptionCheckout.spec.js` | `user can create a new account and pay for the <cycle> <plan> subscription` (Starter/Pro/Enterprise × monthly/yearly) | A new customer can buy any plan and billing cycle with the sandbox test card. Paddle creates the subscription on the right price/cycle; the webhook grants the plan (tier, status, seats, Paddle IDs, renewal date one cycle out); the plan picker shows it as current. |
| `billing/subscriptionCancellation.spec.js` | `user can cancel the <plan> subscription from account settings` (per plan); `user can undo a scheduled cancellation with Restore Subscription` | Cancelling in Account Settings (with a reason) schedules end-of-period cancellation in Paddle: access continues, the page shows "Access ends on" + **Restore Subscription**, and Paddle's follow-up webhook doesn't undo it. **Restore** reverses it in Paddle, the DB, and the UI. |
| `billing/planChanges.spec.js` | `user can upgrade from free to starter to pro to enterprise`; `user can downgrade from enterprise to pro to starter to free` | Upgrades (free → Starter via checkout; later steps via the upgrade modal) move the **same** Paddle subscription to the higher price, charge a prorated amount now, and apply the plan and seats immediately. Downgrades switch to the lower price at next renewal with no charge now, keeping the current plan behind a "Downgrade Scheduled" banner until renewal. Free = cancel at period end. |

### Teams, seats, and roles (`tests/qa/core/teams/`)

Every test creates the people it needs (Owner, Admin, Estimator, Viewer, Outsider, invitees),
each in a separate browser context.

| Spec | Tests | What it proves |
| --- | --- | --- |
| `organizations.spec.js` | `an Enterprise owner creates workspaces; names are validated; outsiders cannot see them`; `Pro owners can create a workspace; Starter and Free accounts cannot, and cannot buy seats` | Enterprise and Pro owners can create workspaces up to their plan's seat count, names are validated, an owner can run several workspaces, and Starter/Free accounts cannot create workspaces or buy seats. Outsiders can't open or list someone else's workspace. |
| `invitations.spec.js` | `a new person creates an account from the invite and joins; every role can be invited`; `a signed-in user accepts; the link cannot be reused; duplicate and invalid invites are refused`; `a signed-out member signs in from the invite and joins; another account cannot use it`; `revoked, resent, and expired invitations` | Invite as Admin/Estimator/Viewer; pending invites hold seats; "Copy Link" returns the real link. A new person signs up from the invite and lands back on it after logging in; a signed-in user accepts in one click; a signed-out user signs in then continues; another account can't use the invite. Used, revoked, replaced (resent), and expired links are refused with the right message; duplicate/self/invalid invites are refused. |
| `roles.spec.js` | `admins, estimators, and viewers get exactly their permissions`; `members can leave; removed members lose access and can be re-invited` | Estimators/Viewers can't manage the team (no UI controls, 403 from management APIs, no invite-link visibility). Admins manage Estimators/Viewers but can't add/change/remove Admins or the Owner, delete the workspace, or manage seats. Role changes apply immediately; members can leave; removed members lose access at once and can be re-invited; owners can't leave their own workspace. |
| `seatLimits.spec.js` | `Enterprise: pending invites hold seats, the 9th person is refused, and revoking frees a seat`; `seats are shared across workspaces and one person uses one seat`; `two invites racing for the last seat: exactly one wins` | Enterprise's 8 seats behave correctly: the 9th person is refused, revoking frees a seat, seats are shared across an owner's workspaces, one person consumes one seat, and a race for the last seat lets exactly one invite win. |
| `seatBilling.spec.js` | `the owner buys extra seats, cannot cut below seats in use, then removes the extras`; `yearly subscribers are billed the yearly seat price`; `extra seats can be bought together with a plan at checkout`; `a declined payment grants no seats`; `seats changed in Paddle's billing portal sync to the app` | Buying extra seats is prorated now and raises capacity everywhere; seats in use can't be removed but extras can; yearly plans pay the yearly seat price; seats can be bought with a plan at checkout; a declined payment grants nothing; changes made in Paddle's billing portal sync back to the app. |
| `teamBillingChanges.spec.js` | `Enterprise -> Pro with 5 people keeps paid seats for everyone at renewal`; `a Starter downgrade is refused while the team exists and allowed once it is empty`; `Pro with extra seats -> Enterprise folds the extra seats into the included 8`; `when the owner cancels, the team works until the period ends; then invites and joins stop`; `a failed payment blocks invites until billing recovers` | Plan changes interact correctly with teams: seats are preserved at renewal, Starter downgrades are blocked while a team exists, Pro extras fold into Enterprise's included seats, cancellation lets the team work until period end (then invites/joins stop but members stay), and a failed payment blocks invites until billing recovers. |
| `teamDeletion.spec.js` | `a workspace can only be deleted once nobody else holds a seat`; `owners cannot leave members stranded; a member deleting their account frees the seat; deleting the owner stops billing` | A workspace can only be deleted when nobody else holds a seat; an owner can't delete their account while the team has active members; a member deleting their account frees the seat; deleting the owner's account cancels their Paddle subscription. |

## Scope note

Only core routes and APIs are exercised (`/register`, `/login`, `/onboarding`,
`/accept-invite`, account settings, `/api/auth`, `/api/billing`, `/api/organizations`,
`/api/webhooks/paddle`), so the suite carries over to another product built on the core.

## Frontend assertions used throughout

Most specs assert against the live UI (Playwright role/text locators) **and** verify the
database, Paddle sandbox, and API responses. Typical frontend checks include: page URLs and
redirects, plan/price and "current plan"/"Downgrade Scheduled"/"Access ends on" badges,
upgrade/cancel/restore buttons and modals, seat counters and validation messages, invite
links and role controls, 403-driven hidden controls, and blocking/advisory banners.

