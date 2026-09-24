# Organizations, Seats, and Roles

This document describes how Takeoff Engine organizations are supposed to work with paid seats, workspace roles, invitations, billing, and access control. It is written as the implementation reference for product, frontend, backend, QA, and support.

## Short Version

An organization is a shared workspace owned by one account. The owner has a subscription seat capacity, and every organization they own uses that capacity through `organizations.max_seats`.

A seat is occupied by an organization membership with `status = 'active'` or `status = 'pending'`. Revoked invitations do not occupy seats.

```text
occupiedSeats = activeMembers + pendingInvitations
availableSeats = maxSeats - occupiedSeats
```

The owner is inserted as an active `owner` member when the organization is created, so the owner always consumes one seat.

Only organization `owner` and `admin` roles can manage team members. Only the `owner` can delete the organization. Platform `admin` is a separate account-level role and should not be confused with organization `admin`.

## Data Model

### `public.users`

The user record stores account-level subscription, billing, and platform permission state.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Supabase auth user id and primary user id. |
| `role` | Platform role: `user`, `admin`, `payment_exempt`, `estimator`, or `user_payment_exempt`. |
| `subscription_tier` | Account plan: `free`, `starter`, `pro`, `enterprise`, or `trial`. Some route checks also reference legacy `team`. |
| `subscription_status` | Billing state, usually `active` when paid. |
| `has_unlimited_bypass` | Allows privileged access without normal plan gating. |
| `seat_limit` | Total account seat capacity after base seats plus add-on seats. |
| `additional_seats` | Paid add-on seat count above the tier base seats. |
| `paddle_subscription_id` | Paddle subscription used for live seat billing updates. |

### `public.organizations`

An organization is the shared workspace container.

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Organization id. |
| `name` | Workspace/company name displayed in the UI. |
| `owner_id` | User who owns the organization and pays for its capacity. |
| `max_seats` | Current seat capacity for this organization. Normally synchronized from the owner's `users.seat_limit`. |
| `additional_seats` | Legacy/denormalized organization-level add-on seat field. Current billing logic primarily uses `users.additional_seats`. |

Creating an organization inserts the organization row and then inserts one `organization_members` row for the owner with `role = 'owner'` and `status = 'active'`.

### `public.organization_members`

This table represents both accepted members and outstanding invitations.

Important fields:

| Field | Purpose |
| --- | --- |
| `organization_id` | Workspace the membership belongs to. |
| `user_id` | User id for accepted members or known invited users. May be null for invited emails that do not have an account yet. |
| `role` | Organization role: `owner`, `admin`, `estimator`, or `viewer`. |
| `invited_email` | Email address the invitation was sent to. |
| `status` | Membership state: `pending`, `active`, or `revoked`. |
| `invite_token` | Secure magic-link invitation token. Cleared after acceptance or revocation. |
| `invite_expires_at` | Invitation expiration timestamp. Current invite lifetime is 7 days. |
| `invited_by` | User who created or resent the invite. |

Uniqueness rules prevent duplicate membership rows by `(organization_id, user_id)` and duplicate invited emails by `(organization_id, invited_email)`.

## Two Kinds of Roles

The system has account-level roles and organization-level roles. They are related but not interchangeable.

### Account-Level Roles: `users.role`

These are platform permissions stored on the user profile.

| Role | Meaning |
| --- | --- |
| `user` | Normal paid or trial account. |
| `admin` | Platform admin. Can bypass normal platform checks and database RLS admin checks. |
| `payment_exempt` | Complimentary or manually exempt paid-access account. |
| `estimator` | Account-level estimator role retained by the platform model. It is not the same as org `estimator`. |
| `user_payment_exempt` | User with payment exemption semantics. |

Account-level roles control platform-wide behavior such as admin access, payment exemption, and organization creation eligibility.

### Organization Roles: `organization_members.role`

These are workspace permissions inside one organization.

| Role | Intended behavior | Can invite/resend/revoke? | Can change roles? | Can remove members? | Can delete org? |
| --- | --- | ---: | ---: | ---: | ---: |
| `owner` | Owns the workspace and pays for seats. Inserted automatically at org creation. | Yes | Yes, except owner role | Yes, except owner | Yes, after other occupied seats are removed |
| `admin` | Manages team membership for the workspace. | Yes | Yes, except owner role | Yes, except owner | No |
| `estimator` | Standard collaborator for estimating work. | No | No | No | No |
| `viewer` | Read-only collaborator role by product intent. | No | No | No | No |

Current product RLS grants all active organization members database access to organization projects, estimates, and rate libraries. It does not yet distinguish `estimator` write access from `viewer` read-only access at the database policy layer. If true read-only viewer behavior is required, route-level or RLS-level role checks must be tightened.

## Seat Capacity

Seat capacity is calculated from the owner's subscription tier and add-on seats.

```text
seatLimit = baseSeatsForTier + additionalSeats
```

That value is stored on `users.seat_limit` and synchronized to `organizations.max_seats` for every organization owned by that user during billing updates and webhook processing.

### Base Seats

The current intended tier model is:

| Tier | Base seats | Notes |
| --- | ---: | --- |
| `free` | 1 | Single-user trial capacity. |
| `starter` | 1 | Strictly single-user. No extra seats or team members for downgrade eligibility. |
| `pro` | 3 | Multi-seat scaling allowed. |
| `enterprise` | Needs cleanup | See inconsistency note below. |

### Enterprise Seat Inconsistency To Resolve

There is a current implementation/documentation mismatch:

| Source | Enterprise base seats |
| --- | ---: |
| Frontend `TeamWorkspaceManager.jsx` calculation | 8 |
| Existing `TEAM_SEATS.md` | 8 |
| Seed data `subscription_tier_limits.base_seats` | 8 |
| Seed data enterprise description | Says 20 included seats |
| Backend product test `proposalsAndOrganizations.test.js` | Expects 20 |
| `organizations.max_seats` table default | 20, but org creation normally passes `user.seat_limit` or 8 |

The operational source used by billing and seat updates is `TierLimitsModel.getBaseSeatsForTier(tier)`, backed by `subscription_tier_limits`. With the current seed data, Enterprise behaves as 8 base seats in the billing-backed path. The test and description should be reconciled with the intended business plan before changing behavior.

## What Occupies a Seat

Seat occupancy is based on membership status, not just row count.

| Membership status | Occupies seat? | Meaning |
| --- | ---: | --- |
| `active` | Yes | Accepted member. Includes the owner. |
| `pending` | Yes | Invitation has been created and capacity is reserved. |
| `revoked` | No | Invitation was invalidated and capacity was released. |

Do not use raw `members.length` for capacity decisions because revoked invitations can remain in the list. Use this rule instead:

```js
const occupiedSeats = members.filter(
  (member) => member.status === 'active' || member.status === 'pending'
).length;
```

The backend invite endpoint uses this active-or-pending rule before creating an invitation. The frontend currently displays some counts using `members.length`; those displays should be treated as UI hints and should be updated if revoked rows are shown.

## Eligibility Rules

### Creating Organizations

`POST /api/organizations` allows organization creation for accounts that satisfy at least one of these conditions:

- `users.role = 'admin'`
- `users.role = 'payment_exempt'`
- `users.has_unlimited_bypass = true`
- `users.subscription_tier = 'enterprise'`
- `users.subscription_tier = 'team'` legacy check

Pro users cannot create organizations. They may manage their eligible Pro add-on seats, but organization workspaces are an Enterprise-only feature.

### Updating Seat Counts

`POST /api/billing/update-seats` allows seat scaling for:

- `subscription_tier = 'pro'`
- `subscription_tier = 'enterprise'`
- platform `admin`
- accounts with `has_unlimited_bypass = true`

The route rejects seat scaling for Free and Starter users unless they have admin or bypass privileges.

### Starter Downgrades

Starter is treated as a strict single-user license. Checkout and downgrade preview logic block Starter when the owner has occupied seats in owned organizations or existing extra seats. Users must remove active team members and revoke pending invitations before moving to Starter.

## Organization Lifecycle

### 1. Organization Creation

Request:

```text
POST /api/organizations
{ "name": "Tri-County Excavation" }
```

Flow:

1. User must be authenticated.
2. Backend loads `UserModel.findById(req.user.id)`.
3. Backend checks team-plan eligibility.
4. Backend inserts `public.organizations` with `owner_id = req.user.id` and `max_seats = user.seat_limit || 8`.
5. Backend inserts owner membership with `role = 'owner'` and `status = 'active'`.
6. Response returns the organization.

The owner consumes one seat immediately.

### 2. Listing Organizations

Request:

```text
GET /api/organizations
```

Returns organizations where the user is the owner or an active member. The list includes:

- organization fields
- `my_role`
- `member_status`
- `active_member_count`

`active_member_count` counts only active members. It does not include pending invites, so it should not be used alone as total seat occupancy.

### 3. Loading Organization Details

Request:

```text
GET /api/organizations/:orgId
```

Access requires owner status or active membership. The response includes:

- `organization`
- `myRole`
- `members`

The member list is ordered as owner, admin, estimator, then other roles.

### 4. Deleting an Organization

Request:

```text
DELETE /api/organizations/:orgId
```

Rules:

1. User must be authenticated.
2. User must have organization access.
3. Only `organizations.owner_id` can delete the organization.
4. Deletion is blocked while any non-owner active or pending membership occupies a seat.
5. The owner must remove active members and revoke pending invitations first.

Revoked invitations do not block deletion.

## Invitation Lifecycle

### 1. Inviting a Member

Request:

```text
POST /api/organizations/:orgId/members
{ "email": "estimator@contractor.com", "role": "estimator" }
```

Rules:

1. User must be authenticated.
2. User must be an active member of the organization or owner.
3. User's org role must be `owner` or `admin`.
4. Email is required.
5. Backend counts active plus pending memberships.
6. If occupied seats are greater than or equal to `organizations.max_seats`, the route returns `SEAT_LIMIT_EXCEEDED`.
7. Backend creates or updates a pending membership row.
8. Backend generates a secure token with a 7-day expiration.
9. Backend sends a transactional invite email when email service is available.
10. Response returns the member row, generated invite URL, and whether email was sent.

Existing users are linked through `user_id`; unknown users are tracked by `invited_email` until they accept.

### 2. Verifying an Invitation

Request:

```text
GET /api/organizations/invitations/verify?token=...
```

Rules:

- Token is required.
- Revoked invites fail.
- Expired invites fail.
- Valid invites return organization name, invited email, role, inviter display name, and expiration.

This endpoint does not require authentication because it powers the public invitation landing step.

### 3. Accepting an Invitation

Request:

```text
POST /api/organizations/invitations/accept
{ "token": "..." }
```

Rules:

1. User must be authenticated.
2. Token must exist.
3. Invitation must not be revoked.
4. Invitation must not be expired.
5. Backend sets `user_id` to the authenticated user, changes `status` to `active`, clears `invite_token`, and clears `invite_expires_at`.

Current acceptance logic does not enforce that the authenticated user's email matches `invited_email`. If email matching is required for security/product policy, add that check before accepting the invite.

### 4. Resending an Invitation

Request:

```text
POST /api/organizations/:orgId/members/:memberId/resend
```

Rules:

- User must be owner or admin.
- Owner membership cannot be resent.
- Backend regenerates the token, refreshes expiration to 7 days, sets status to `pending`, and sends a new email when possible.

### 5. Revoking an Invitation

Request:

```text
POST /api/organizations/:orgId/members/:memberId/revoke
```

Rules:

- User must be owner or admin.
- Owner membership cannot be revoked.
- Backend sets `status = 'revoked'`, clears token, and clears expiration.
- Revocation releases the occupied seat.

The current revoke route does not explicitly require the current status to be `pending`; it updates any non-owner membership to `revoked`. If active members should only be removable via delete, this route should be tightened to pending-only.

## Member Management

### Updating Roles

Request:

```text
PUT /api/organizations/:orgId/members/:memberId
{ "role": "admin" }
```

Rules:

- User must be owner or admin.
- New role must be `admin`, `estimator`, or `viewer`.
- Owner membership cannot be changed.
- There is no route to transfer ownership today.

### Removing Members

Request:

```text
DELETE /api/organizations/:orgId/members/:memberId
```

Rules:

- User must be owner or admin.
- Owner membership cannot be removed.
- Deleting the row releases the seat.

## Billing and Seat Sync

### Checkout

`POST /api/billing/create-checkout` builds Paddle checkout items for Starter, Pro, or Enterprise. Pro and Enterprise can include an extra-seat price item when `additionalSeats > 0`.

Starter checkout blocks if the user already has extra seats or occupied seats in owned organizations.

### Updating Seats on an Existing Subscription

Request:

```text
POST /api/billing/update-seats
{ "additionalSeats": 2, "orgId": "optional-current-org-id" }
```

Flow:

1. Backend loads the authenticated user.
2. Backend calculates base seats from `subscription_tier_limits`.
3. Backend computes `newTotalSeats = baseSeats + additionalSeats`.
4. Backend verifies the user may scale seats.
5. Backend counts active plus pending memberships across all organizations owned by the user.
6. If `newTotalSeats` is less than occupied seats across owned organizations, the request is rejected.
7. If the user has a Paddle subscription, backend updates Paddle subscription items and uses immediate prorated billing.
8. Backend updates the user with the new `seat_limit` and `additional_seats`.
9. Backend updates every organization owned by the user so `organizations.max_seats = newTotalSeats`.
10. Response returns updated seat totals and whether Paddle was updated.

Seat capacity is owner-wide in practice because every organization owned by a user is synchronized to the same `seat_limit`. The capacity check for lowering seats also counts occupied seats across all owned organizations.

## Access Control and RLS

The API routes are the main business-rule enforcement layer. RLS protects database access underneath.

Core RLS behavior:

- Users can read their own profile, platform admins can read profiles, and organization teammates can read teammate profiles.
- Users can update their own profile; platform admins can update profiles.
- Organization rows are visible to owners, platform admins, and active organization members.
- Organization rows can be updated by owners or platform admins.
- Organization member rows are visible to the row's user, platform admins, organization owners, and active organization members.
- Subscription tier limits are publicly readable.
- Promo codes and admin audit logs are restricted.

Product RLS behavior:

- Projects are manageable by their owner, platform admins, or active members of the linked organization.
- Estimates are manageable when their parent project is accessible under the same rule.
- Rate libraries are accessible by their owner, platform admins, or active members of the linked organization.

Current product RLS checks active membership, not organization role. That means `viewer` is not yet database-enforced read-only if writes go directly through Supabase policies.

## Frontend Integration Points

| File | Responsibility |
| --- | --- |
| `src/core/components/auth/TeamWorkspaceManager.jsx` | Organization switcher, create org form, member table, invite form, seat modal, role changes, removals, revocation, deletion. |
| `src/core/components/auth/AcceptInvitePage.jsx` | Invitation verification and acceptance UI. |
| `src/core/lib/auth/organizations.js` | Frontend client for organization API routes. |
| `src/core/lib/billing/billing.js` | Frontend client for billing and seat-update API routes. |
| `src/core/constants` | Plan prices and displayed included seat constants. |

Frontend controls are guidance only. The backend must remain authoritative for eligibility, capacity, membership, and role decisions.

## Backend Integration Points

| File | Responsibility |
| --- | --- |
| `src/core/routes/organizations.routes.js` | Organization API, role checks, invite flow, deletion checks. |
| `src/core/models/organization.model.js` | Organization and membership SQL operations. |
| `src/core/routes/billing.routes.js` | Checkout, downgrade previews, add-on seat updates. |
| `src/core/routes/webhooks.routes.js` | Paddle webhook subscription sync and organization `max_seats` sync. |
| `src/core/models/tierLimits.model.js` | Base-seat lookup from `subscription_tier_limits`. |
| `sql/001_core_saas_schema.sql` | Core users, organizations, members, tier limits, and RLS. |
| `sql/002_product_schema.sql` | Organization-linked product tables and product RLS. |
| `sql/003_core_saas_seed_data.sql` | Seeded base seats and pricing. |

## API Summary

| Endpoint | Auth required? | Required org role | Purpose |
| --- | ---: | --- | --- |
| `GET /api/organizations` | Yes | Any owned or active member org | List accessible organizations. |
| `POST /api/organizations` | Yes | Account eligibility | Create organization and owner membership. |
| `GET /api/organizations/:orgId` | Yes | Owner or active member | Load organization details and members. |
| `DELETE /api/organizations/:orgId` | Yes | Owner only | Delete org when no other active/pending seats remain. |
| `POST /api/organizations/:orgId/members` | Yes | Owner or admin | Invite a member if capacity exists. |
| `PUT /api/organizations/:orgId/members/:memberId` | Yes | Owner or admin | Change non-owner role. |
| `DELETE /api/organizations/:orgId/members/:memberId` | Yes | Owner or admin | Remove non-owner member. |
| `POST /api/organizations/:orgId/members/:memberId/resend` | Yes | Owner or admin | Regenerate invite token and resend. |
| `POST /api/organizations/:orgId/members/:memberId/revoke` | Yes | Owner or admin | Revoke non-owner invite/member row. |
| `GET /api/organizations/invitations/verify` | No | Token-based | Validate invite link. |
| `POST /api/organizations/invitations/accept` | Yes | Token-based | Accept invite as authenticated user. |
| `POST /api/billing/update-seats` | Yes | Account eligibility | Change add-on seats and sync org capacity. |

## Expected User Stories

### Owner Creates a Workspace

1. Enterprise or otherwise eligible user opens Account Settings.
2. User creates an organization.
3. System creates organization with `max_seats = user.seat_limit`.
4. System creates active owner membership.
5. Workspace appears in the organization switcher.

### Admin Invites a Teammate

1. Owner/admin enters an email and chooses `admin`, `estimator`, or `viewer`.
2. System checks active plus pending count against `max_seats`.
3. System creates pending membership and reserves a seat.
4. System emails the invite link.
5. Recipient accepts while authenticated.
6. System converts pending membership to active.

### Owner Reduces Paid Seats

1. Owner opens seat manager.
2. Owner chooses fewer add-on seats.
3. Backend computes the new total capacity.
4. Backend counts active plus pending memberships across all owned organizations.
5. If the new capacity is too low, backend rejects the change and tells owner to remove members or revoke invites.
6. If valid, backend updates Paddle, the user seat fields, and all owned organizations.

### Owner Deletes a Workspace

1. Owner removes active non-owner members.
2. Owner revokes pending invitations.
3. Owner deletes the organization.
4. Backend deletes the organization only when no other occupied seats remain.

## Product Decisions That Still Need Cleanup

These are the main issues to resolve so implementation, tests, and docs agree:

1. (Solved) enterprise requires 8 seats
2. (Solved) pro should not allow organizations to be created, only enterprise. Update any advertising language if necessary
3. (Solved) `viewer` must be enforced as read-only at API/RLS level. Current product RLS only checks active membership and should be tightened.
4. (Solved) invite acceptance must require the authenticated user's email to match `invited_email`.
5. (Solved) revoke semantics should apply only to pending invitations. Active members should be removed, not revoked.
6. (Solved) frontend capacity displays should count active plus pending memberships instead of raw member rows when revoked rows remain visible.

## Implementation Rules

When changing this system:

- Count seats with active plus pending memberships only.
- Treat revoked invitations as non-occupying.
- Keep backend checks authoritative even if the UI hides invalid actions.
- Do not allow owner role changes through normal member role updates.
- Do not allow owner membership removal through normal member removal.
- Do not reduce total seats below occupied seats across organizations owned by the user.
- Synchronize `users.seat_limit` and owned `organizations.max_seats` whenever billing changes capacity.
- Keep account-level roles and organization-level roles separate in naming, UI text, tests, and API logic.
- Update `takeoff-engine/src/lang/en.json` only for new UI strings; do not manually edit generated locale files.