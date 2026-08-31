# Team Seats and Workspaces

This document describes how team workspaces, memberships, and paid seat capacity are intended to work in the frontend. The backend remains authoritative for all permission and capacity decisions.

## Core Model

A paid seat is a capacity slot in an organization. Each organization has a `max_seats` value, which is normally synchronized from its owner's subscription `seat_limit`.

An occupied seat is an organization membership with one of these statuses:

- `active`: the owner or a team member who accepted an invitation.
- `pending`: an invitation that has been issued but not yet accepted.

A `revoked` invitation does not occupy a seat. The capacity rule is:

```text
occupiedSeats = activeMembers + pendingInvitations
availableSeats = maxSeats - occupiedSeats
```

The organization owner occupies a seat from the moment the organization is created.

## Seat Allowances

The starting capacity is determined by the account subscription tier:

| Tier | Included base seats |
| --- | ---: |
| Free | 1 |
| Starter | 1 |
| Pro | 3 |
| Enterprise | 8 |

Additional seats are paid add-ons. The total seat capacity is:

```text
seatLimit = baseSeatsForTier + additionalSeats
```

The seat manager in `src/core/components/auth/TeamWorkspaceManager.jsx` lets a qualifying user set the desired number of additional seats. It calls `POST /api/billing/update-seats` with `{ additionalSeats, orgId }`.

The server validates the request, updates Paddle when an active Paddle subscription exists, saves `seat_limit` and `additional_seats` to the user, and synchronizes `max_seats` to every organization owned by that user. Billing changes use immediate prorated billing in Paddle.

## Who Can Use Team Capacity

The backend allows multi-seat scaling for Pro and Enterprise subscribers, as well as administrative or unlimited-bypass accounts. Organization creation is more restrictive: it is intended for Enterprise/Team subscribers and privileged accounts.

Frontend visibility should be treated as guidance only. The API must continue enforcing eligibility, organization membership, organization role, and capacity because clients can be bypassed.

## Workspaces and Roles

An organization is a workspace owned by one user. Creating it automatically creates an `active` membership for that owner with the `owner` role.

Supported roles are:

| Role | Intended capability |
| --- | --- |
| `owner` | Owns the organization, manages capacity, and may delete the organization when no other occupied seats remain. |
| `admin` | Can invite members, resend or revoke invitations, remove members, and change non-owner roles. |
| `estimator` | Standard estimating collaborator. |
| `viewer` | Read-only collaborator role. |

Only an owner or admin may manage organization members. The owner role cannot be changed or removed through the normal member controls.

## Invitation Lifecycle

Inviting a person reserves capacity before they accept. This prevents a workspace from sending more invitations than it can support.

```text
Admin invites email
  -> membership is created as pending
  -> pending membership occupies one seat
  -> a 7-day invitation token/link is issued
  -> recipient signs in or signs up and accepts
  -> membership changes to active
```

An admin can resend a pending invitation. Resending replaces the token and refreshes its expiry. An admin can also revoke a pending invitation. Revocation invalidates the link and releases that seat because the membership is no longer `pending` or `active`.

The invitation acceptance UI is `src/core/components/auth/AcceptInvitePage.jsx`. It verifies the token with `GET /api/organizations/invitations/verify` and accepts it with `POST /api/organizations/invitations/accept` after the recipient is authenticated.

## Capacity Enforcement

Before creating an invitation, the server counts both active and pending members. When occupied seats are equal to `max_seats`, the request fails with `SEAT_LIMIT_EXCEEDED`.

The frontend should use the same definition whenever it displays utilization or decides whether to show the invite form:

```javascript
const occupiedSeats = members.filter(
  (member) => member.status === 'active' || member.status === 'pending'
).length;

const canInvite = occupiedSeats < activeOrg.max_seats;
```

Do not use `members.length` as the capacity count, because the list can include revoked invitations. The server check is the final authority even when the UI indicates capacity is available.

## Reducing Capacity

Users may remove paid add-on seats, but the resulting total capacity cannot be lower than the number of active and pending memberships across all organizations they own. They must first remove active members or revoke pending invitations.

The same principle applies when deleting an organization: the owner must remove all other active members and revoke every pending invitation first. Revoked entries do not block deletion.

## Frontend Integration Points

- `src/core/components/auth/TeamWorkspaceManager.jsx`: workspace switcher, member list, invites, role changes, removals, deletion, and seat manager UI.
- `src/core/components/auth/AcceptInvitePage.jsx`: invite token verification and acceptance flow.
- `src/core/lib/auth/organizations.js`: organization and member API client.
- `src/core/lib/billing/billing.js`: `updateSeats(additionalSeats, orgId)` API client.

When modifying these views, keep seat counts and actions up to date by reloading the selected organization after invitations, revocations, removals, role changes, and seat updates. Refresh the authenticated profile after a seat update so the displayed subscription capacity reflects the saved `seat_limit` and `additional_seats` values.