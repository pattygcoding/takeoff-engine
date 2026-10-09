# Full-Stack QA Tests (core SaaS flows)

Playwright QA tests for the core flows any SaaS built on this engine needs. They run separately from the unit
tests and drive the real app: real frontend, real backend, real database, and real Paddle **sandbox** checkout.

| Spec | What it proves |
| --- | --- |
| `core/auth/createAccount.spec.js` | A visitor can sign up, verify their email, and log in. The free account is stored correctly, with the terms acceptance and 18+ age confirmation recorded. |
| `core/billing/subscriptionCheckout.spec.js` | A new customer can buy **Starter**, **Pro**, or **Enterprise**, **monthly or yearly**, with the sandbox test card. Paddle creates the subscription on the right price and billing cycle. The webhook grants the plan (tier, status, seats, Paddle IDs, and a renewal date one cycle out), and the plan picker shows it as current. |
| `core/billing/subscriptionCancellation.spec.js` | For each plan, a subscriber can click **Cancel Subscription** in Account Settings, give a reason, and confirm. Paddle then schedules the cancellation for the end of the period. The account keeps access with the reason recorded, the page shows "Access ends on" and **Restore Subscription**, and Paddle's follow-up webhook doesn't undo it. A separate test proves **Restore Subscription** undoes the cancellation in Paddle, the database, and the UI. |
| `core/billing/planChanges.spec.js` | **Upgrades free → Starter → Pro → Enterprise.** Free → Starter goes through checkout. Each later step uses the upgrade modal in Account Settings: the same Paddle subscription moves to the higher price, Paddle collects a prorated charge right away, and the plan and seats apply immediately. **Downgrades Enterprise → Pro → Starter → Free.** Paddle switches to the lower price for the next renewal and charges nothing now. The customer keeps the current plan (with a "Downgrade Scheduled" banner) until the renewal, then gets the lower plan. Free = cancel, then the paid period ends. |

### Teams, seats, and roles (`core/teams/`)

Each test creates every person it needs (Owner, Admin, Estimator, Viewer, Outsider, invitees), each signed in
in a separate browser context, so no accounts have to be created by hand.

| Spec | What it proves |
| --- | --- |
| `organizations.spec.js` | Enterprise and Pro owners create workspaces with their plan's seat count; names are validated; an owner can run several workspaces. Starter and Free accounts can't create workspaces or buy seats. Outsiders can't open or list someone else's workspace. |
| `invitations.spec.js` | Invite as Admin, Estimator, or Viewer; pending invites hold seats; "Copy Link" gives the real link. A new person signs up from the invite and lands back on it after logging in. A signed-in user accepts in one click. A signed-out user signs in and continues. Another account can't use someone else's invite. Used, revoked, replaced (resent), and expired links are refused with the right message. Duplicate, self, and invalid invites are refused. |
| `roles.spec.js` | Estimators and Viewers can't manage the team: no controls in the UI, 403 from every management API, and no visibility of invite links. Admins manage Estimators and Viewers but can't add, change, or remove Admins or the Owner, delete the workspace, or manage seats. Role changes apply immediately. Members can leave on their own; removed members lose access at once and can be re-invited. The owner can't leave their own workspace. |
| `seatLimits.spec.js` | Enterprise's 8 seats: the 9th person is refused, and revoking frees a seat. Seats are shared across an owner's workspaces, and one person uses one seat. Two invites racing for the last seat: exactly one wins. |
| `seatBilling.spec.js` | Buying extra seats is charged a prorated amount now and raises capacity everywhere. Seats in use can't be removed; extras can. Yearly plans pay the yearly seat price. Seats can be bought together with a plan at checkout. A declined payment grants no seats. Seat changes made in Paddle's billing portal sync to the app. |
| `teamBillingChanges.spec.js` | Enterprise → Pro with 5 people keeps paid seats for everyone at renewal. A Starter downgrade is refused while a team exists. Pro with extra seats → Enterprise folds them into the 8 included seats. When the owner cancels, the team works until the period ends; then invites and joins stop, but existing members stay. A failed payment blocks invites until billing recovers. |
| `teamDeletion.spec.js` | A workspace can only be deleted once nobody else holds a seat. An owner can't delete their account while the team has active members. A member deleting their account frees the seat. Deleting the owner's account cancels their Paddle subscription. |

Only core routes and APIs are used (`/register`, `/login`, `/onboarding`, `/accept-invite`, account settings,
`/api/auth`, `/api/billing`, `/api/organizations`, `/api/webhooks/paddle`), so the suite carries over to another
product built on the core.

## Running

```powershell
cd takeoff-engine
npm run test:qa          # injects the Infisical "dev" environment (Paddle sandbox)
npm run test:qa:local    # same, using variables already in your shell
npm run test:qa -- -g pro   # a single plan
npm run test:qa -- teams/   # only the team, seat, and role tests
```

The suite starts its own servers on dedicated ports and never reuses your dev servers:
frontend `4177`, backend `5055`, QA Supabase gateway `5056`. Override them with `QA_FRONTEND_PORT`,
`QA_BACKEND_PORT`, and `QA_SUPABASE_GATEWAY_PORT`.

## Safety

**Money.** The config refuses to start unless both `PADDLE_ENVIRONMENT` and `VITE_PADDLE_ENVIRONMENT` are
`sandbox`. It also refuses if any Paddle key or token is a live one, if `NODE_ENV` is `production`, or if it's
running on a deployed host. Payments use Paddle's sandbox test card `4242 4242 4242 4242`.

**Database (shared with the app).** The run must leave the database identical to how it found it:

1. **Global setup** removes anything left by an interrupted earlier run. It then fingerprints every table in
   `public` and `auth` (row count plus a digest of every row, taken in one consistent snapshot).
2. Every QA customer is tagged: `qae2e-<label>-<id>` as the username and `delivered+qae2e-…@resend.dev` as the
   email. Cleanup only touches accounts where both the email and the username carry the tag.
3. **Global teardown** cancels the QA Paddle sandbox subscriptions and archives the QA Paddle customers. It
   deletes the QA users and their profiles (dependent rows cascade) and removes any Supabase auth audit rows.
   It then scans every table for any trace of the run and compares the fingerprint with the starting one.
   **Any leftover row or any difference fails the run.**

Sequences are not compared, because PostgreSQL never rolls them back. If real users change the shared
database during a run, the failure names the exact tables and row IDs that changed. Re-run when it's quiet.

**Side effects that are disabled for QA runs:**

- **App emails.** The local backend runs with `RESEND_API_KEY` empty, so welcome emails, team invitations, and
  receipts are simulated (logged, not sent). Invite links come from the app's "Copy Link" button or API response.
- **Supabase confirmation emails and their rate limit.** The local backend talks to Supabase through
  `support/supabaseGateway.js`. For QA-tagged addresses only, that gateway turns the signup into Supabase's
  admin `generate_link`. It creates the same unconfirmed user but sends no email, so Supabase's email rate
  limit never applies. All other traffic passes through unchanged. No application code has a QA bypass.
- **Supabase sign-in and verification rate limits** (about 30 per 5 minutes per IP). Signup-focused tests
  redeem the real verification link at `/auth/v1/verify`. Setup accounts (team members, owners) are confirmed
  through the Auth Admin API instead, which isn't rate limited. If Supabase still answers a QA sign-in or
  verification with HTTP 429, the gateway and harness wait and retry instead of failing the test.
- **Backend auth rate limiter.** Each simulated customer sends its API traffic from its own random IPv6
  documentation address (`2001:db8::/32`), so the per-IP limiter sees separate customers instead of one machine.
- **Admin bootstrap.** Backend startup normally re-promotes the configured admin accounts. The QA backend
  disables this so it can't touch real rows.

**Webhooks.** Paddle's sandbox can't reach `localhost`. After each Paddle change (purchase, plan change, cancel,
restore), the harness fetches the real subscription from the Paddle sandbox API and posts it to
`/api/webhooks/paddle`, signed the same way Paddle signs notifications. The app's own signature verification and
entitlement logic run unchanged.

**Time and states the sandbox can't produce on demand** are simulated, and only these:

- **Renewal** (when a scheduled downgrade takes effect): the harness delivers the real subscription with its
  billing period moved forward one cycle.
- **End of a canceled period:** Paddle ends the subscription immediately, and the harness then delivers Paddle's
  real `subscription.canceled` notification.
- **Failed renewal payment:** the harness delivers the real subscription marked `past_due`, then `active` again.
- **Invite expiry (7 days):** the QA invitation's expiry date is moved into the past.

Declined payments use Paddle's sandbox card `4000 0027 6000 3184`: the first payment succeeds after a 3D Secure
challenge, which the harness completes, and every later charge is declined.

**Emails.** The app never emails anyone during QA runs. Paddle's sandbox may still send its own emails, such as
seller notifications or webhook-delivery alerts.

## Required variables (all present in Infisical `dev`)

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `PADDLE_ENVIRONMENT`,
`PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET_KEY`, `PADDLE_PRICE_ID_{STARTER,PRO,ENTERPRISE}_{MONTHLY,ANNUALLY}`,
`VITE_PADDLE_ENVIRONMENT`, `VITE_PADDLE_CLIENT_TOKEN`.

Optional: `QA_EMAIL_TEMPLATE` (default `delivered+{tag}@resend.dev`), `QA_SNAPSHOT_SCHEMAS`
(default `public,auth`), and `QA_CARD_NUMBER` / `QA_CARD_CVV` / `QA_CARD_POSTCODE` / `QA_CARD_COUNTRY`.

## Debugging failures

Screenshots, video, a Playwright trace, and the browser console log are kept for failed tests in
`test-results/qa/`. Screenshots of every extra person's browser (team members, invitees) are attached too.
Open a trace with `npx playwright show-trace <path-to-trace.zip>`.
