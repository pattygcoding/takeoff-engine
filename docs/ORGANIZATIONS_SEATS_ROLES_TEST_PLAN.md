# Organizations, Seats, Roles, and Invitations: Complete Unit-Test Plan

## Purpose

This document is the executable test inventory for the organization, workspace, membership, invitation, seat, billing, email, access-control, and lifecycle behavior described in `ORGANIZATIONS_SEATS_ROLES.md` and `TEAM_SEATS.md`.

The goal is not merely to test the visible happy path. The goal is to prove that every state transition, permission boundary, capacity calculation, persistence mutation, external billing call, email decision, and failure response behaves consistently.

This is a test plan and coverage contract. Each item should become a focused automated test, or a parameterized case in a focused test when the behavior is identical. Tests should assert observable behavior and persisted state, not implementation details that are free to change.

## Scope

The test inventory covers:

- organization creation, listing, loading, and deletion;
- active, pending, and revoked memberships;
- owner, admin, estimator, and viewer organization roles;
- account-level platform roles and subscription tiers;
- invitation creation, verification, acceptance, resend, and revocation;
- invitation email delivery, suppression, failure, and confirmation payloads;
- seat occupancy and available-seat calculations;
- account-wide capacity across multiple owned organizations;
- seat upgrades, reductions, Paddle updates, and synchronization;
- Starter downgrade restrictions;
- role changes and member removal;
- authorization, authentication, and tenant isolation;
- RLS-facing model boundaries;
- frontend API-client contracts and state refresh behavior;
- validation, normalization, duplicate handling, and malformed input;
- transactional rollback and partial-failure behavior;
- observability, response shape, and security properties.

## Required Test Layers

Use the smallest layer that can prove the behavior, then add a higher-level contract test for cross-boundary behavior.

1. Pure unit tests for seat counting, eligibility, validation, role checks, token policy, and response mapping.
2. Model unit tests with a mocked database client for SQL parameters, result mapping, and error translation.
3. Route/controller unit tests with mocked models, auth context, email service, and billing provider.
4. Service contract tests for email and Paddle adapters.
5. Database integration tests for constraints, transactions, foreign keys, and RLS policies.
6. Frontend client/component tests for request payloads, displayed counts, action gating, and refresh behavior.
7. End-to-end smoke tests for the highest-value invite, acceptance, capacity, and deletion journeys.

## Test Harness Contract

Every test suite should define deterministic fixtures instead of depending on a shared mutable database.

- Freeze time when testing expiration, seven-day invite lifetimes, and billing timestamps.
- Inject token generation so tests can assert exact persistence and email URLs.
- Inject the frontend origin so invite URLs are deterministic.
- Inject the email sender so no unit test sends real mail.
- Inject the Paddle client so no unit test charges a real subscription.
- Reset mocks after every test.
- Use unique organization and user identifiers per test.
- Assert both returned responses and database mutations.
- Assert that denied operations make no forbidden mutation.
- Assert that external services are not called when validation fails.
- Use table-driven cases for role, tier, status, and boundary combinations.
- Use integration tests for constraints that mocks cannot prove.

## Canonical Fixtures

The following fixtures should be available to all relevant suites.

- `platformUser`: normal authenticated account with role `user`.
- `platformAdmin`: account with platform role `admin`.
- `paymentExemptUser`: account with role `payment_exempt`.
- `bypassUser`: normal role with `has_unlimited_bypass = true`.
- `freeUser`: active free account with one seat.
- `starterUser`: active Starter account with one seat.
- `proUser`: active Pro account with three base seats.
- `enterpriseUser`: active Enterprise account using the selected product decision for base seats.
- `legacyTeamUser`: account with legacy `subscription_tier = team`.
- `ownerMember`: active organization membership with role `owner`.
- `adminMember`: active organization membership with role `admin`.
- `estimatorMember`: active organization membership with role `estimator`.
- `viewerMember`: active organization membership with role `viewer`.
- `pendingInvite`: pending membership with a known email and token.
- `revokedInvite`: revoked membership with cleared token and expiration.
- `expiredInvite`: pending membership whose expiration is before the frozen current time.
- `knownInvitee`: pending invitation linked to an existing user.
- `unknownInvitee`: pending invitation with null `user_id`.
- `ownedOrg`: organization owned by the authenticated user.
- `memberOrg`: organization where the authenticated user is an active member.
- `foreignOrg`: organization with no relationship to the authenticated user.
- `fullOrg`: organization with occupied seats equal to `max_seats`.
- `availableOrg`: organization with one or more available seats.
- `multiOrgOwner`: user who owns at least two organizations.
- `paddleSubscriber`: user with a valid Paddle subscription id.
- `noPaddleSubscriber`: user without a Paddle subscription id.
- `emailSuccess`: email adapter response indicating delivery accepted.
- `emailFailure`: email adapter rejection or provider error.

## Assertion Standards

Every test should make the smallest complete assertion set for its behavior.

- Assert HTTP status or service result code.
- Assert stable error code, not only human-readable text.
- Assert the response body shape.
- Assert relevant fields are present and irrelevant sensitive fields are absent.
- Assert model calls use the authenticated user and organization identifiers.
- Assert database writes use normalized values.
- Assert external calls have exact recipient, subject, template, and variables.
- Assert no email or billing call occurs on rejected input.
- Assert pending invitations reserve a seat before email delivery.
- Assert email failure behavior matches the chosen product contract.
- Assert tokens are never returned in logs or unrelated responses.
- Assert all tenant-scoped queries include the correct organization boundary.

## A. Seat Calculation Unit Tests

- [ ] SEAT-001: Count one active owner as one occupied seat.
- [ ] SEAT-002: Count multiple active members as one seat each.
- [ ] SEAT-003: Count one pending invitation as one occupied seat.
- [ ] SEAT-004: Count multiple pending invitations as occupied seats.
- [ ] SEAT-005: Exclude one revoked invitation from occupied seats.
- [ ] SEAT-006: Exclude multiple revoked invitations from occupied seats.
- [ ] SEAT-007: Count active and pending rows together.
- [ ] SEAT-008: Ignore unknown membership statuses or reject them according to the model contract.
- [ ] SEAT-009: Return zero occupied seats for an empty membership list.
- [ ] SEAT-010: Treat a missing membership list as a controlled validation error, not as unlimited capacity.
- [ ] SEAT-011: Calculate available seats as `maxSeats - occupiedSeats`.
- [ ] SEAT-012: Return zero available seats when occupied seats equal capacity.
- [ ] SEAT-013: Never report negative available seats as an invitation opportunity.
- [ ] SEAT-014: Preserve an over-capacity state for remediation reporting when legacy data is already over capacity.
- [ ] SEAT-015: Treat `max_seats = 1` and one owner as full.
- [ ] SEAT-016: Treat `max_seats = 2` and one owner as having one available seat.
- [ ] SEAT-017: Treat pending invitations as capacity reservations even without a `user_id`.
- [ ] SEAT-018: Treat a revoked row with an `invited_email` as non-occupying.
- [ ] SEAT-019: Treat an active row with a null `user_id` as invalid data or count it according to the explicit model contract.
- [ ] SEAT-020: Treat a pending row with a null `invite_token` as invalid rather than silently available.
- [ ] SEAT-021: Ensure raw array length is never used for capacity decisions.
- [ ] SEAT-022: Confirm capacity calculations do not mutate the membership list.
- [ ] SEAT-023: Confirm capacity calculations do not mutate organization capacity.
- [ ] SEAT-024: Confirm duplicate object references do not double-count a logical row unless the database returned duplicates.
- [ ] SEAT-025: Confirm status comparison is exact and does not count `Pending` as `pending`.
- [ ] SEAT-026: Confirm seat count is integer-safe for valid integer capacities.
- [ ] SEAT-027: Reject negative `max_seats` before calculating availability.
- [ ] SEAT-028: Reject non-integer `max_seats` before calculating availability.
- [ ] SEAT-029: Reject negative occupied counts if a lower-level helper accepts counts directly.
- [ ] SEAT-030: Confirm large valid capacities do not overflow or lose precision.

## B. Tier and Base-Seat Tests

- [ ] TIER-001: Free resolves to one base seat.
- [ ] TIER-002: Starter resolves to one base seat.
- [ ] TIER-003: Pro resolves to three base seats.
- [ ] TIER-004: Enterprise resolves to eight base seats.
- [ ] TIER-005: Legacy Team resolves according to the compatibility policy.
- [ ] TIER-006: Unknown tier uses an explicit error or documented fallback.
- [ ] TIER-007: Null tier does not silently grant team capacity.
- [ ] TIER-008: Empty tier does not silently grant team capacity.
- [ ] TIER-009: Base seats plus zero additional seats equals the base seat count.
- [ ] TIER-010: Base seats plus positive additional seats equals total seat limit.
- [ ] TIER-011: Decimal additional seats are rejected.
- [ ] TIER-012: Negative additional seats are rejected.
- [ ] TIER-013: String numeric additional seats are either normalized or rejected consistently.
- [ ] TIER-014: Whitespace around a tier is handled consistently with the model contract.
- [ ] TIER-015: Case variants of tiers are handled consistently and documented.
- [ ] TIER-016: Base-seat lookup failure is surfaced instead of defaulting to one.
- [ ] TIER-017: Seeded tier data matches the service result for every supported tier.
- [ ] TIER-018: Frontend displayed base seats match the backend contract.
- [ ] TIER-019: Enterprise documentation, constants, seed data, and tests all assert eight base seats.
- [ ] TIER-020: The old conflicting Enterprise expectation of 20 base seats is removed or explicitly marked obsolete.
- [ ] TIER-021: A plan with no add-on price cannot be billed for an add-on.
- [ ] TIER-022: A plan that disallows add-ons rejects positive additional seats.
- [ ] TIER-023: A plan that allows add-ons accepts the maximum configured count.
- [ ] TIER-024: Additional seat limits are enforced at the configured maximum.
- [ ] TIER-025: Values above the configured maximum are rejected before Paddle is called.

## C. Organization Creation Tests

- [ ] ORG-CREATE-001: Authenticated eligible account can create an organization.
- [ ] ORG-CREATE-002: Unauthenticated request is rejected.
- [ ] ORG-CREATE-003: Platform admin can create an organization.
- [ ] ORG-CREATE-004: Payment-exempt account can create an organization.
- [ ] ORG-CREATE-005: Unlimited-bypass account can create an organization.
- [ ] ORG-CREATE-006: Enterprise account can create an organization.
- [ ] ORG-CREATE-007: Legacy Team account follows the compatibility rule.
- [ ] ORG-CREATE-008: Pro account cannot create an organization workspace.
- [ ] ORG-CREATE-009: Free account is rejected when creation is not allowed.
- [ ] ORG-CREATE-010: Starter account is rejected when creation is not allowed.
- [ ] ORG-CREATE-011: Trial account follows the explicit eligibility policy.
- [ ] ORG-CREATE-012: Inactive subscription status does not bypass tier eligibility.
- [ ] ORG-CREATE-013: Missing user profile returns a controlled server error.
- [ ] ORG-CREATE-014: Missing `seat_limit` uses the documented fallback or fails safely.
- [ ] ORG-CREATE-015: Organization name is required.
- [ ] ORG-CREATE-016: Empty organization name is rejected.
- [ ] ORG-CREATE-017: Whitespace-only organization name is rejected.
- [ ] ORG-CREATE-018: Organization name is trimmed before persistence.
- [ ] ORG-CREATE-019: Organization name maximum length is enforced.
- [ ] ORG-CREATE-020: Organization name containing normal punctuation is accepted.
- [ ] ORG-CREATE-021: Organization name containing control characters is rejected or sanitized.
- [ ] ORG-CREATE-022: Non-string organization name is rejected.
- [ ] ORG-CREATE-023: Unknown request fields do not change owner or capacity.
- [ ] ORG-CREATE-024: Organization row uses authenticated user as `owner_id`.
- [ ] ORG-CREATE-025: Organization row uses the user seat limit as `max_seats`.
- [ ] ORG-CREATE-026: Organization row does not use a client-supplied seat capacity.
- [ ] ORG-CREATE-027: Organization row initializes the expected legacy additional-seat field.
- [ ] ORG-CREATE-028: Owner membership is inserted after organization creation.
- [ ] ORG-CREATE-029: Owner membership uses role `owner`.
- [ ] ORG-CREATE-030: Owner membership uses status `active`.
- [ ] ORG-CREATE-031: Owner membership references the authenticated user.
- [ ] ORG-CREATE-032: Owner membership consumes exactly one seat.
- [ ] ORG-CREATE-033: Successful response includes the created organization.
- [ ] ORG-CREATE-034: Successful response does not expose database internals.
- [ ] ORG-CREATE-035: Organization insert failure does not attempt a member insert.
- [ ] ORG-CREATE-036: Member insert failure rolls back the organization insert.
- [ ] ORG-CREATE-037: Duplicate organization creation requests do not create an unintended duplicate when idempotency is supported.
- [ ] ORG-CREATE-038: Concurrent creation requests preserve valid owner memberships.
- [ ] ORG-CREATE-039: Creation cannot assign a different owner through payload fields.
- [ ] ORG-CREATE-040: Creation cannot create an organization with zero seats.

## D. Organization Listing Tests

- [ ] ORG-LIST-001: Authenticated user receives organizations they own.
- [ ] ORG-LIST-002: Authenticated user receives organizations where they are active member.
- [ ] ORG-LIST-003: Pending invite does not grant organization listing access.
- [ ] ORG-LIST-004: Revoked membership does not grant organization listing access.
- [ ] ORG-LIST-005: Unrelated organization is excluded.
- [ ] ORG-LIST-006: Unauthenticated listing is rejected.
- [ ] ORG-LIST-007: Listing returns organization fields required by the UI.
- [ ] ORG-LIST-008: Listing returns `my_role` for owner.
- [ ] ORG-LIST-009: Listing returns `my_role` for admin.
- [ ] ORG-LIST-010: Listing returns `my_role` for estimator.
- [ ] ORG-LIST-011: Listing returns `my_role` for viewer.
- [ ] ORG-LIST-012: Listing returns `member_status`.
- [ ] ORG-LIST-013: Listing returns active member count only.
- [ ] ORG-LIST-014: Listing does not mislabel pending invitations as active members.
- [ ] ORG-LIST-015: Listing does not expose invite tokens.
- [ ] ORG-LIST-016: Listing does not expose private member email data unnecessarily.
- [ ] ORG-LIST-017: Empty result returns an empty array.
- [ ] ORG-LIST-018: Database listing failure maps to a stable server error.
- [ ] ORG-LIST-019: Results are deterministic for the same database state.
- [ ] ORG-LIST-020: Duplicate joined rows do not duplicate organizations in the response.
- [ ] ORG-LIST-021: Listing applies the authenticated user id to every tenant query.
- [ ] ORG-LIST-022: Platform admin behavior is explicitly tested and documented.
- [ ] ORG-LIST-023: Organization owner with revoked self-row cannot access through membership fallback.
- [ ] ORG-LIST-024: Owner access remains valid when owner membership is present and active.
- [ ] ORG-LIST-025: Listing does not accidentally include organizations from another user with the same email.

## E. Organization Detail and Membership Listing Tests

- [ ] ORG-DETAIL-001: Owner can load organization details.
- [ ] ORG-DETAIL-002: Active admin can load organization details.
- [ ] ORG-DETAIL-003: Active estimator can load organization details.
- [ ] ORG-DETAIL-004: Active viewer can load organization details.
- [ ] ORG-DETAIL-005: Pending member cannot load organization details.
- [ ] ORG-DETAIL-006: Revoked member cannot load organization details.
- [ ] ORG-DETAIL-007: Unrelated user cannot load organization details.
- [ ] ORG-DETAIL-008: Unauthenticated user cannot load organization details.
- [ ] ORG-DETAIL-009: Details include organization data.
- [ ] ORG-DETAIL-010: Details include the authenticated user's organization role.
- [ ] ORG-DETAIL-011: Details include member rows.
- [ ] ORG-DETAIL-012: Owner sorts before admins.
- [ ] ORG-DETAIL-013: Admins sort before estimators.
- [ ] ORG-DETAIL-014: Estimators sort before viewers or other roles according to the documented order.
- [ ] ORG-DETAIL-015: Pending members remain visible to authorized managers.
- [ ] ORG-DETAIL-016: Revoked members are handled according to the response contract.
- [ ] ORG-DETAIL-017: Member list does not expose invite tokens to unauthorized roles.
- [ ] ORG-DETAIL-018: Member list does not expose unrelated organizations.
- [ ] ORG-DETAIL-019: Invalid organization id returns a controlled client error.
- [ ] ORG-DETAIL-020: Database detail failure returns a stable server error.
- [ ] ORG-DETAIL-021: Detail query cannot be widened by an injected identifier.
- [ ] ORG-DETAIL-022: Organization access check and member list use the same organization id.
- [ ] ORG-DETAIL-023: Missing `myRole` is not interpreted as owner on the frontend.
- [ ] ORG-DETAIL-024: Active organization member count excludes revoked rows.
- [ ] ORG-DETAIL-025: Pending count remains available when the UI needs total occupancy.

## F. Role and Permission Matrix Tests

- [ ] ROLE-001: Owner can invite a member.
- [ ] ROLE-002: Admin can invite a member.
- [ ] ROLE-003: Estimator cannot invite a member.
- [ ] ROLE-004: Viewer cannot invite a member.
- [ ] ROLE-005: Pending invitee cannot invite a member.
- [ ] ROLE-006: Revoked member cannot invite a member.
- [ ] ROLE-007: Owner can resend a non-owner invitation.
- [ ] ROLE-008: Admin can resend a non-owner invitation.
- [ ] ROLE-009: Estimator cannot resend an invitation.
- [ ] ROLE-010: Viewer cannot resend an invitation.
- [ ] ROLE-011: Owner can revoke a permitted membership under the chosen revoke policy.
- [ ] ROLE-012: Admin can revoke a permitted membership under the chosen revoke policy.
- [ ] ROLE-013: Estimator cannot revoke a membership.
- [ ] ROLE-014: Viewer cannot revoke a membership.
- [ ] ROLE-015: Owner can change a non-owner role.
- [ ] ROLE-016: Admin can change a non-owner role.
- [ ] ROLE-017: Estimator cannot change a role.
- [ ] ROLE-018: Viewer cannot change a role.
- [ ] ROLE-019: Owner can remove a non-owner member.
- [ ] ROLE-020: Admin can remove a non-owner member.
- [ ] ROLE-021: Estimator cannot remove a member.
- [ ] ROLE-022: Viewer cannot remove a member.
- [ ] ROLE-023: Owner can delete the organization.
- [ ] ROLE-024: Admin cannot delete the organization.
- [ ] ROLE-025: Estimator cannot delete the organization.
- [ ] ROLE-026: Viewer cannot delete the organization.
- [ ] ROLE-027: Account-level platform admin is distinct from organization admin.
- [ ] ROLE-028: Platform admin behavior is tested independently of organization membership.
- [ ] ROLE-029: Account-level estimator does not automatically grant organization admin rights.
- [ ] ROLE-030: Payment-exempt account role does not automatically grant every organization role.
- [ ] ROLE-031: Owner cannot be demoted through normal role update.
- [ ] ROLE-032: Owner cannot be removed through normal member removal.
- [ ] ROLE-033: Owner cannot be revoked through invitation revoke.
- [ ] ROLE-034: Unknown role is rejected.
- [ ] ROLE-035: Role casing is normalized or rejected consistently.
- [ ] ROLE-036: Empty role is rejected.
- [ ] ROLE-037: Client cannot submit `owner` as a replacement role.
- [ ] ROLE-038: Client cannot submit platform role names as organization roles.
- [ ] ROLE-039: Authorization is checked against current persisted role, not stale client role.
- [ ] ROLE-040: Role changes do not change account-level role.

## G. Invitation Creation Tests

- [ ] INV-CREATE-001: Owner creates a pending invitation for a known user.
- [ ] INV-CREATE-002: Admin creates a pending invitation for a known user.
- [ ] INV-CREATE-003: Owner creates a pending invitation for an unknown email.
- [ ] INV-CREATE-004: Admin creates a pending invitation for an unknown email.
- [ ] INV-CREATE-005: Estimator invitation attempt is denied.
- [ ] INV-CREATE-006: Viewer invitation attempt is denied.
- [ ] INV-CREATE-007: Unauthenticated invitation attempt is denied.
- [ ] INV-CREATE-008: Foreign organization invitation attempt is denied.
- [ ] INV-CREATE-009: Pending member invitation attempt is denied.
- [ ] INV-CREATE-010: Revoked member invitation attempt is denied.
- [ ] INV-CREATE-011: Missing email is rejected.
- [ ] INV-CREATE-012: Empty email is rejected.
- [ ] INV-CREATE-013: Whitespace-only email is rejected.
- [ ] INV-CREATE-014: Email is trimmed before lookup and persistence.
- [ ] INV-CREATE-015: Email normalization uses the approved case policy.
- [ ] INV-CREATE-016: Invalid email syntax is rejected.
- [ ] INV-CREATE-017: Excessively long email is rejected.
- [ ] INV-CREATE-018: Unicode email behavior follows the supported email policy.
- [ ] INV-CREATE-019: Missing role is rejected.
- [ ] INV-CREATE-020: Unsupported role is rejected.
- [ ] INV-CREATE-021: `owner` invite role is rejected.
- [ ] INV-CREATE-022: `admin` invite role is accepted when allowed.
- [ ] INV-CREATE-023: `estimator` invite role is accepted.
- [ ] INV-CREATE-024: `viewer` invite role is accepted when the product decision enables it.
- [ ] INV-CREATE-025: Client-supplied status is ignored.
- [ ] INV-CREATE-026: Client-supplied token is ignored.
- [ ] INV-CREATE-027: Client-supplied expiration is ignored.
- [ ] INV-CREATE-028: Client-supplied inviter is ignored.
- [ ] INV-CREATE-029: Seat count includes active members.
- [ ] INV-CREATE-030: Seat count includes pending invitations.
- [ ] INV-CREATE-031: Seat count excludes revoked invitations.
- [ ] INV-CREATE-032: Invitation at exact capacity returns `SEAT_LIMIT_EXCEEDED`.
- [ ] INV-CREATE-033: Invitation one below capacity succeeds.
- [ ] INV-CREATE-034: Invitation into an over-capacity legacy organization is rejected.
- [ ] INV-CREATE-035: Seat check happens before creating a membership.
- [ ] INV-CREATE-036: Seat failure creates no membership.
- [ ] INV-CREATE-037: Existing pending email follows the duplicate-invite policy.
- [ ] INV-CREATE-038: Existing active email follows the duplicate-member policy.
- [ ] INV-CREATE-039: Existing revoked email can be re-invited when allowed.
- [ ] INV-CREATE-040: Existing membership in another organization is allowed independently.
- [ ] INV-CREATE-041: Known user is linked by `user_id`.
- [ ] INV-CREATE-042: Unknown user stores null `user_id`.
- [ ] INV-CREATE-043: New row uses status `pending`.
- [ ] INV-CREATE-044: New row stores the normalized invited email.
- [ ] INV-CREATE-045: New row stores the selected organization role.
- [ ] INV-CREATE-046: New row stores the authenticated inviter.
- [ ] INV-CREATE-047: New row stores the correct organization id.
- [ ] INV-CREATE-048: Token has the required entropy and format.
- [ ] INV-CREATE-049: Token is not derived from email, user id, or organization id.
- [ ] INV-CREATE-050: Token is not reused across two invitations.
- [ ] INV-CREATE-051: Expiration is exactly seven days under a frozen clock.
- [ ] INV-CREATE-052: Expiration is stored in a timezone-safe format.
- [ ] INV-CREATE-053: Token and expiration are returned only where the API contract requires them.
- [ ] INV-CREATE-054: Database insert failure returns a stable error.
- [ ] INV-CREATE-055: Database insert failure does not send an email.
- [ ] INV-CREATE-056: Invite creation does not modify the user's account role.
- [ ] INV-CREATE-057: Invite creation does not modify organization max seats.
- [ ] INV-CREATE-058: Concurrent invites cannot exceed capacity.
- [ ] INV-CREATE-059: Concurrent duplicate invites obey the unique constraint policy.
- [ ] INV-CREATE-060: Successful response identifies whether email was sent.

## H. Invitation Email Tests

- [ ] EMAIL-001: Successful invite creation invokes the email adapter once.
- [ ] EMAIL-002: Email recipient is the normalized invited email.
- [ ] EMAIL-003: Email sender uses the configured product sender.
- [ ] EMAIL-004: Email reply-to uses the configured support or product address.
- [ ] EMAIL-005: Email subject identifies an organization invitation.
- [ ] EMAIL-006: Email template includes the organization name.
- [ ] EMAIL-007: Email template includes the inviter display name when available.
- [ ] EMAIL-008: Email template includes the invited organization role.
- [ ] EMAIL-009: Email template includes the invitation expiration.
- [ ] EMAIL-010: Email template includes the generated invitation URL.
- [ ] EMAIL-011: Invitation URL uses the configured frontend origin.
- [ ] EMAIL-012: Invitation URL uses HTTPS in production configuration.
- [ ] EMAIL-013: Invitation URL contains the correct token.
- [ ] EMAIL-014: Invitation URL does not contain unrelated user secrets.
- [ ] EMAIL-015: Email variables are HTML-escaped where the template requires it.
- [ ] EMAIL-016: Organization names cannot inject markup into HTML email.
- [ ] EMAIL-017: Invited email cannot inject template variables.
- [ ] EMAIL-018: Missing inviter display name uses the documented fallback.
- [ ] EMAIL-019: Missing organization name fails safely rather than sending a malformed message.
- [ ] EMAIL-020: Email adapter success produces `emailSent = true`.
- [ ] EMAIL-021: Email adapter provider rejection produces the documented `emailSent` result.
- [ ] EMAIL-022: Email adapter timeout produces the documented `emailSent` result.
- [ ] EMAIL-023: Email adapter exception does not leak provider credentials.
- [ ] EMAIL-024: Email failure does not accidentally clear the pending invitation.
- [ ] EMAIL-025: Email failure does not create a second membership.
- [ ] EMAIL-026: Email failure behavior is explicitly selected: rollback or retain pending invite.
- [ ] EMAIL-027: If retained, a failed-delivery invitation can be resent.
- [ ] EMAIL-028: If rolled back, a failed-delivery invitation releases the seat.
- [ ] EMAIL-029: Email is not sent when seat capacity is exceeded.
- [ ] EMAIL-030: Email is not sent for invalid role.
- [ ] EMAIL-031: Email is not sent for invalid email.
- [ ] EMAIL-032: Email is not sent for unauthorized caller.
- [ ] EMAIL-033: Email is not sent when database insert fails.
- [ ] EMAIL-034: Email adapter receives no raw database row with secrets unless required.
- [ ] EMAIL-035: Email logs redact invite token.
- [ ] EMAIL-036: Email logs redact recipient data according to privacy policy.
- [ ] EMAIL-037: Retry behavior does not send duplicate mail without an explicit retry.
- [ ] EMAIL-038: Explicit resend sends a fresh token and one email.
- [ ] EMAIL-039: Provider message id is stored or returned only if the contract requires it.
- [ ] EMAIL-040: Email localization uses the selected locale without editing generated locale files in this change.

## I. Invitation Verification Tests

- [ ] INV-VERIFY-001: Valid token returns invitation details.
- [ ] INV-VERIFY-002: Missing token is rejected.
- [ ] INV-VERIFY-003: Empty token is rejected.
- [ ] INV-VERIFY-004: Whitespace token is rejected or normalized consistently.
- [ ] INV-VERIFY-005: Unknown token returns a non-disclosing invalid-invite error.
- [ ] INV-VERIFY-006: Revoked token is rejected.
- [ ] INV-VERIFY-007: Expired token is rejected.
- [ ] INV-VERIFY-008: Token at the exact expiration instant follows the documented boundary.
- [ ] INV-VERIFY-009: Token just before expiration succeeds.
- [ ] INV-VERIFY-010: Token cannot be used from another organization context.
- [ ] INV-VERIFY-011: Verification does not require authentication.
- [ ] INV-VERIFY-012: Verification does not activate the membership.
- [ ] INV-VERIFY-013: Verification does not consume a second seat.
- [ ] INV-VERIFY-014: Verification returns organization name.
- [ ] INV-VERIFY-015: Verification returns invited email according to privacy policy.
- [ ] INV-VERIFY-016: Verification returns invited role.
- [ ] INV-VERIFY-017: Verification returns inviter display name.
- [ ] INV-VERIFY-018: Verification returns expiration.
- [ ] INV-VERIFY-019: Verification never returns the stored token unnecessarily.
- [ ] INV-VERIFY-020: Verification never returns unrelated member records.
- [ ] INV-VERIFY-021: Malformed token cannot cause SQL injection.
- [ ] INV-VERIFY-022: Very long token is rejected without expensive work.
- [ ] INV-VERIFY-023: Database lookup failure maps to a stable server error.
- [ ] INV-VERIFY-024: Verification does not send email.
- [ ] INV-VERIFY-025: Verification response is safe for a public landing page.

## J. Invitation Acceptance Tests

- [ ] INV-ACCEPT-001: Authenticated recipient accepts a valid invitation.
- [ ] INV-ACCEPT-002: Unauthenticated recipient is rejected.
- [ ] INV-ACCEPT-003: Missing token is rejected.
- [ ] INV-ACCEPT-004: Unknown token is rejected.
- [ ] INV-ACCEPT-005: Revoked token is rejected.
- [ ] INV-ACCEPT-006: Expired token is rejected.
- [ ] INV-ACCEPT-007: Exact expiration boundary follows the selected policy.
- [ ] INV-ACCEPT-008: Acceptance changes status from pending to active.
- [ ] INV-ACCEPT-009: Acceptance sets `user_id` to the authenticated user.
- [ ] INV-ACCEPT-010: Acceptance clears `invite_token`.
- [ ] INV-ACCEPT-011: Acceptance clears `invite_expires_at`.
- [ ] INV-ACCEPT-012: Acceptance preserves organization id.
- [ ] INV-ACCEPT-013: Acceptance preserves invited role.
- [ ] INV-ACCEPT-014: Acceptance preserves inviter audit field.
- [ ] INV-ACCEPT-015: Acceptance does not increase occupied seats.
- [ ] INV-ACCEPT-016: Acceptance does not create a second membership row.
- [ ] INV-ACCEPT-017: Acceptance of an invite already linked to the same user is idempotent or rejected explicitly.
- [ ] INV-ACCEPT-018: Acceptance by a different existing member follows duplicate policy.
- [ ] INV-ACCEPT-019: Acceptance by a user whose email differs from `invited_email` is rejected.
- [ ] INV-ACCEPT-020: Email matching is case-insensitive.
- [ ] INV-ACCEPT-021: Email matching trims authenticated and invited email addresses before comparison.
- [ ] INV-ACCEPT-022: Email mismatch does not activate the invitation.
- [ ] INV-ACCEPT-023: Acceptance after capacity was reduced below occupancy is handled safely.
- [ ] INV-ACCEPT-024: Acceptance after organization deletion is rejected.
- [ ] INV-ACCEPT-025: Acceptance after membership revocation is rejected.
- [ ] INV-ACCEPT-026: Acceptance database failure leaves the invitation pending.
- [ ] INV-ACCEPT-027: Acceptance cannot alter owner role.
- [ ] INV-ACCEPT-028: Acceptance does not alter account-level platform role.
- [ ] INV-ACCEPT-029: Acceptance response includes organization and membership summary.
- [ ] INV-ACCEPT-030: Acceptance response does not expose the consumed token.
- [ ] INV-ACCEPT-031: Acceptance query is scoped to the token and valid status.
- [ ] INV-ACCEPT-032: Concurrent acceptance requests result in one active membership.
- [ ] INV-ACCEPT-033: Concurrent acceptance cannot create two active rows.
- [ ] INV-ACCEPT-034: Acceptance audit data records the authenticated actor if supported.
- [ ] INV-ACCEPT-035: Acceptance does not send an invitation email again.

## K. Invitation Resend Tests

- [ ] INV-RESEND-001: Owner can resend a pending invitation.
- [ ] INV-RESEND-002: Admin can resend a pending invitation.
- [ ] INV-RESEND-003: Estimator cannot resend an invitation.
- [ ] INV-RESEND-004: Viewer cannot resend an invitation.
- [ ] INV-RESEND-005: Unauthenticated resend is rejected.
- [ ] INV-RESEND-006: Foreign organization resend is rejected.
- [ ] INV-RESEND-007: Owner membership cannot be resent.
- [ ] INV-RESEND-008: Active member resend is rejected because active members are removed, not resent.
- [ ] INV-RESEND-009: Revoked invitation resend is rejected; a new invitation must be created when re-inviting is allowed.
- [ ] INV-RESEND-010: Unknown member id returns a controlled error.
- [ ] INV-RESEND-011: Resend generates a new token.
- [ ] INV-RESEND-012: Resend invalidates the old token.
- [ ] INV-RESEND-013: Resend refreshes expiration to seven days.
- [ ] INV-RESEND-014: Resend preserves or restores `pending` status only for a pending invitation.
- [ ] INV-RESEND-015: Resend preserves invited email.
- [ ] INV-RESEND-016: Resend preserves invited role.
- [ ] INV-RESEND-017: Resend updates `invited_by` to the current manager when required.
- [ ] INV-RESEND-018: Resend does not create a second row.
- [ ] INV-RESEND-019: Resend does not consume an additional seat.
- [ ] INV-RESEND-020: Resend sends exactly one email.
- [ ] INV-RESEND-021: Resend email contains the new token.
- [ ] INV-RESEND-022: Resend email does not contain the old token.
- [ ] INV-RESEND-023: Email failure preserves the documented token state.
- [ ] INV-RESEND-024: Database update failure does not send email.
- [ ] INV-RESEND-025: Database update failure leaves the old valid invite according to rollback policy.
- [ ] INV-RESEND-026: Resend response reports delivery status.
- [ ] INV-RESEND-027: Resend response does not expose provider credentials.
- [ ] INV-RESEND-028: Concurrent resends leave only the final token valid.
- [ ] INV-RESEND-029: Resend cannot cross organization boundaries.
- [ ] INV-RESEND-030: Resend does not modify organization max seats.

## L. Invitation Revocation Tests

- [ ] INV-REVOKE-001: Owner can revoke a pending invitation.
- [ ] INV-REVOKE-002: Admin can revoke a pending invitation.
- [ ] INV-REVOKE-003: Estimator cannot revoke an invitation.
- [ ] INV-REVOKE-004: Viewer cannot revoke an invitation.
- [ ] INV-REVOKE-005: Unauthenticated revoke is rejected.
- [ ] INV-REVOKE-006: Foreign organization revoke is rejected.
- [ ] INV-REVOKE-007: Owner membership cannot be revoked.
- [ ] INV-REVOKE-008: Revocation sets status to revoked.
- [ ] INV-REVOKE-009: Revocation clears invite token.
- [ ] INV-REVOKE-010: Revocation clears invite expiration.
- [ ] INV-REVOKE-011: Revocation releases one occupied seat.
- [ ] INV-REVOKE-012: Revoked token cannot verify.
- [ ] INV-REVOKE-013: Revoked token cannot accept.
- [ ] INV-REVOKE-014: Revoked token cannot be reused after re-invite.
- [ ] INV-REVOKE-015: Revocation does not delete unrelated memberships.
- [ ] INV-REVOKE-016: Revocation does not send an email unless explicitly required.
- [ ] INV-REVOKE-017: Revoking an already revoked row is idempotent or returns a clear conflict.
- [ ] INV-REVOKE-018: Revoking an active member is rejected and makes no membership mutation.
- [ ] INV-REVOKE-019: Revocation database failure leaves the original row unchanged.
- [ ] INV-REVOKE-020: Revocation response identifies released capacity when supported.
- [ ] INV-REVOKE-021: Revocation cannot be used to remove the owner.
- [ ] INV-REVOKE-022: Revocation is tenant-scoped by organization id.
- [ ] INV-REVOKE-023: Revocation cannot be triggered by a stale admin after role removal.
- [ ] INV-REVOKE-024: Revocation audit actor is recorded when audit support exists.
- [ ] INV-REVOKE-025: Revocation does not change account seat limit.

## M. Role Update Tests

- [ ] ROLE-UPDATE-001: Owner changes estimator to viewer.
- [ ] ROLE-UPDATE-002: Owner changes viewer to estimator.
- [ ] ROLE-UPDATE-003: Owner changes estimator to admin.
- [ ] ROLE-UPDATE-004: Owner changes admin to estimator.
- [ ] ROLE-UPDATE-005: Admin changes estimator to viewer.
- [ ] ROLE-UPDATE-006: Admin changes viewer to estimator.
- [ ] ROLE-UPDATE-007: Admin changes another member to admin.
- [ ] ROLE-UPDATE-008: Admin cannot change owner role.
- [ ] ROLE-UPDATE-009: Admin cannot remove owner by role update.
- [ ] ROLE-UPDATE-010: Estimator cannot update roles.
- [ ] ROLE-UPDATE-011: Viewer cannot update roles.
- [ ] ROLE-UPDATE-012: Unknown role is rejected.
- [ ] ROLE-UPDATE-013: Missing role is rejected.
- [ ] ROLE-UPDATE-014: Role update validates target organization.
- [ ] ROLE-UPDATE-015: Role update validates target member.
- [ ] ROLE-UPDATE-016: Role update validates current actor role.
- [ ] ROLE-UPDATE-017: Role update preserves membership status.
- [ ] ROLE-UPDATE-018: Role update preserves user id.
- [ ] ROLE-UPDATE-019: Role update preserves invited email.
- [ ] ROLE-UPDATE-020: Role update preserves invite token state for pending rows according to policy.
- [ ] ROLE-UPDATE-021: Role update does not change seat count.
- [ ] ROLE-UPDATE-022: Role update response returns the new role.
- [ ] ROLE-UPDATE-023: Role update database failure returns a stable error.
- [ ] ROLE-UPDATE-024: Role update database failure leaves the old role.
- [ ] ROLE-UPDATE-025: Concurrent role updates produce a valid final role.
- [ ] ROLE-UPDATE-026: Role update does not alter account-level role.
- [ ] ROLE-UPDATE-027: Role update does not alter organization owner id.
- [ ] ROLE-UPDATE-028: Role update cannot assign a platform admin role.
- [ ] ROLE-UPDATE-029: Role update cannot assign arbitrary SQL values.
- [ ] ROLE-UPDATE-030: Role update cannot cross tenant boundaries.

## N. Member Removal Tests

- [ ] MEMBER-REMOVE-001: Owner removes an active estimator.
- [ ] MEMBER-REMOVE-002: Owner removes an active viewer.
- [ ] MEMBER-REMOVE-003: Owner removes an active admin.
- [ ] MEMBER-REMOVE-004: Admin removes an active estimator.
- [ ] MEMBER-REMOVE-005: Admin removes an active viewer.
- [ ] MEMBER-REMOVE-006: Admin removes an active admin when permitted.
- [ ] MEMBER-REMOVE-007: Estimator cannot remove a member.
- [ ] MEMBER-REMOVE-008: Viewer cannot remove a member.
- [ ] MEMBER-REMOVE-009: Owner cannot remove the owner membership.
- [ ] MEMBER-REMOVE-010: Admin cannot remove the owner membership.
- [ ] MEMBER-REMOVE-011: Unauthenticated removal is rejected.
- [ ] MEMBER-REMOVE-012: Foreign organization removal is rejected.
- [ ] MEMBER-REMOVE-013: Unknown member id returns a controlled error.
- [ ] MEMBER-REMOVE-014: Removing an active member releases one seat.
- [ ] MEMBER-REMOVE-015: Removing a pending row is rejected in favor of the pending-only revoke endpoint.
- [ ] MEMBER-REMOVE-016: Removing a revoked row is idempotent or returns a clear conflict.
- [ ] MEMBER-REMOVE-017: Removal deletes or marks the row according to the retention policy.
- [ ] MEMBER-REMOVE-018: Removal clears invitation secrets when deleting a pending row.
- [ ] MEMBER-REMOVE-019: Removal does not change max seats.
- [ ] MEMBER-REMOVE-020: Removal does not change owner's seat limit.
- [ ] MEMBER-REMOVE-021: Removal database failure leaves membership intact.
- [ ] MEMBER-REMOVE-022: Removal response identifies the removed member.
- [ ] MEMBER-REMOVE-023: Removed member loses organization access immediately.
- [ ] MEMBER-REMOVE-024: Removed member cannot access organization projects.
- [ ] MEMBER-REMOVE-025: Removed member cannot access organization rate libraries.
- [ ] MEMBER-REMOVE-026: Removal cannot cross organization boundaries.
- [ ] MEMBER-REMOVE-027: Stale admin cannot remove after losing admin role.
- [ ] MEMBER-REMOVE-028: Concurrent removal requests do not corrupt membership state.
- [ ] MEMBER-REMOVE-029: Removal audit actor is recorded when supported.
- [ ] MEMBER-REMOVE-030: Removal does not alter account authentication status.

## O. Organization Deletion Tests

- [ ] ORG-DELETE-001: Owner deletes an organization with only the owner active.
- [ ] ORG-DELETE-002: Admin cannot delete an organization.
- [ ] ORG-DELETE-003: Estimator cannot delete an organization.
- [ ] ORG-DELETE-004: Viewer cannot delete an organization.
- [ ] ORG-DELETE-005: Unauthenticated deletion is rejected.
- [ ] ORG-DELETE-006: Foreign user deletion is rejected.
- [ ] ORG-DELETE-007: Organization with an active non-owner is not deletable.
- [ ] ORG-DELETE-008: Organization with a pending invitation is not deletable.
- [ ] ORG-DELETE-009: Organization with a revoked invitation is deletable.
- [ ] ORG-DELETE-010: Organization with active and revoked rows is blocked only by active rows.
- [ ] ORG-DELETE-011: Organization with pending and revoked rows is blocked only by pending rows.
- [ ] ORG-DELETE-012: Owner row is excluded from the non-owner blocking check.
- [ ] ORG-DELETE-013: Missing organization id returns a controlled error.
- [ ] ORG-DELETE-014: Deletion removes organization-linked memberships.
- [ ] ORG-DELETE-015: Deletion removes or handles linked product records according to cascade policy.
- [ ] ORG-DELETE-016: Deletion removes invitation tokens.
- [ ] ORG-DELETE-017: Deletion removes the organization from subsequent listing.
- [ ] ORG-DELETE-018: Deletion removes access to organization details.
- [ ] ORG-DELETE-019: Deletion removes access to organization projects.
- [ ] ORG-DELETE-020: Deletion removes access to organization rate libraries.
- [ ] ORG-DELETE-021: Deletion database failure does not leave a partially deleted tenant.
- [ ] ORG-DELETE-022: Deletion checks occupancy atomically with deletion.
- [ ] ORG-DELETE-023: Concurrent invite cannot create an occupied row after the deletion check.
- [ ] ORG-DELETE-024: Repeated deletion is idempotent or returns a documented not-found result.
- [ ] ORG-DELETE-025: Deletion response does not expose unrelated data.
- [ ] ORG-DELETE-026: Platform admin deletion behavior is explicitly defined and tested.
- [ ] ORG-DELETE-027: Organization owner cannot delete another owner's organization.
- [ ] ORG-DELETE-028: Owner membership cannot be deleted independently during organization deletion.
- [ ] ORG-DELETE-029: Deletion audit data is recorded when supported.
- [ ] ORG-DELETE-030: Deletion does not delete the owner's user account.

## P. Billing Checkout Tests

- [ ] BILL-CHECKOUT-001: Starter checkout is created with the Starter price.
- [ ] BILL-CHECKOUT-002: Pro checkout is created with the Pro price.
- [ ] BILL-CHECKOUT-003: Enterprise checkout is created with the Enterprise price.
- [ ] BILL-CHECKOUT-004: Unsupported tier is rejected.
- [ ] BILL-CHECKOUT-005: Unauthenticated checkout is rejected.
- [ ] BILL-CHECKOUT-006: Starter checkout with zero add-ons succeeds.
- [ ] BILL-CHECKOUT-007: Starter checkout with additional seats is rejected.
- [ ] BILL-CHECKOUT-008: Starter checkout with occupied team seats is rejected.
- [ ] BILL-CHECKOUT-009: Starter checkout with pending invitations is rejected.
- [ ] BILL-CHECKOUT-010: Starter checkout counts occupied seats across all owned organizations.
- [ ] BILL-CHECKOUT-011: Starter checkout ignores revoked invitations.
- [ ] BILL-CHECKOUT-012: Pro checkout accepts valid additional seats.
- [ ] BILL-CHECKOUT-013: Enterprise checkout accepts valid additional seats.
- [ ] BILL-CHECKOUT-014: Zero additional seats omits the add-on item.
- [ ] BILL-CHECKOUT-015: Positive additional seats includes the correct add-on quantity.
- [ ] BILL-CHECKOUT-016: Negative additional seats are rejected.
- [ ] BILL-CHECKOUT-017: Decimal additional seats are rejected.
- [ ] BILL-CHECKOUT-018: Checkout uses the authenticated user's id.
- [ ] BILL-CHECKOUT-019: Client cannot select another user's billing identity.
- [ ] BILL-CHECKOUT-020: Paddle price identifiers are never client-controlled.
- [ ] BILL-CHECKOUT-021: Checkout failure returns a stable error.
- [ ] BILL-CHECKOUT-022: Checkout failure does not mutate seat fields.
- [ ] BILL-CHECKOUT-023: Checkout response includes only approved checkout fields.
- [ ] BILL-CHECKOUT-024: Checkout URL is returned when Paddle succeeds.
- [ ] BILL-CHECKOUT-025: Billing provider credentials are not returned.

## Q. Seat Update and Paddle Tests

- [ ] BILL-SEATS-001: Pro user increases additional seats.
- [ ] BILL-SEATS-002: Enterprise user increases additional seats.
- [ ] BILL-SEATS-003: Platform admin can update seats according to policy.
- [ ] BILL-SEATS-004: Unlimited-bypass user can update seats according to policy.
- [ ] BILL-SEATS-005: Free user cannot update seats without privilege.
- [ ] BILL-SEATS-006: Starter user cannot update seats without privilege.
- [ ] BILL-SEATS-007: Unsupported tier cannot update seats.
- [ ] BILL-SEATS-008: Unauthenticated update is rejected.
- [ ] BILL-SEATS-009: New total equals base seats plus requested add-ons.
- [ ] BILL-SEATS-010: Additional seats are validated as a nonnegative integer.
- [ ] BILL-SEATS-011: New total below owned occupancy is rejected.
- [ ] BILL-SEATS-012: Owned occupancy includes active members across all owned organizations.
- [ ] BILL-SEATS-013: Owned occupancy includes pending invitations across all owned organizations.
- [ ] BILL-SEATS-014: Owned occupancy excludes revoked invitations across all owned organizations.
- [ ] BILL-SEATS-015: Membership in an organization the user does not own is excluded from owner-wide reduction checks.
- [ ] BILL-SEATS-016: Updating one organization still synchronizes every owned organization.
- [ ] BILL-SEATS-017: Optional `orgId` is validated when supplied.
- [ ] BILL-SEATS-018: Foreign `orgId` cannot influence the update.
- [ ] BILL-SEATS-019: Paddle subscription item quantity is correct.
- [ ] BILL-SEATS-020: Paddle update uses the authenticated subscription id.
- [ ] BILL-SEATS-021: Paddle update requests immediate proration when required.
- [ ] BILL-SEATS-022: Paddle update is not called when validation fails.
- [ ] BILL-SEATS-023: No-subscription user updates local capacity according to policy.
- [ ] BILL-SEATS-024: Paddle failure does not update local seat fields unless explicitly designed as eventual consistency.
- [ ] BILL-SEATS-025: Local database failure after Paddle success is observable and recoverable.
- [ ] BILL-SEATS-026: Local database failure rolls back where transactionally possible.
- [ ] BILL-SEATS-027: User `seat_limit` is updated to new total.
- [ ] BILL-SEATS-028: User `additional_seats` is updated to requested add-ons.
- [ ] BILL-SEATS-029: Every owned organization receives the new `max_seats`.
- [ ] BILL-SEATS-030: Foreign organizations do not receive the new `max_seats`.
- [ ] BILL-SEATS-031: Response returns base seats.
- [ ] BILL-SEATS-032: Response returns additional seats.
- [ ] BILL-SEATS-033: Response returns total seats.
- [ ] BILL-SEATS-034: Response reports whether Paddle was updated.
- [ ] BILL-SEATS-035: Response reports the requested organization context safely.
- [ ] BILL-SEATS-036: Concurrent seat reductions cannot pass stale occupancy checks.
- [ ] BILL-SEATS-037: Concurrent increases converge on a valid final state.
- [ ] BILL-SEATS-038: Seat update does not change organization ownership.
- [ ] BILL-SEATS-039: Seat update does not change membership roles.
- [ ] BILL-SEATS-040: Seat update does not send invitation emails.

## R. Downgrade Preview Tests

- [ ] DOWNGRADE-001: Starter preview succeeds with one owner and no add-ons.
- [ ] DOWNGRADE-002: Starter preview rejects existing additional seats.
- [ ] DOWNGRADE-003: Starter preview rejects an active member.
- [ ] DOWNGRADE-004: Starter preview rejects a pending invitation.
- [ ] DOWNGRADE-005: Starter preview ignores revoked invitations.
- [ ] DOWNGRADE-006: Starter preview checks every owned organization.
- [ ] DOWNGRADE-007: Starter preview excludes organizations owned by someone else.
- [ ] DOWNGRADE-008: Starter preview reports the blocking organization when policy permits.
- [ ] DOWNGRADE-009: Starter preview response does not expose unrelated member data.
- [ ] DOWNGRADE-010: Starter preview uses current persisted occupancy, not stale client counts.
- [ ] DOWNGRADE-011: Preview does not mutate seats.
- [ ] DOWNGRADE-012: Preview does not call Paddle.
- [ ] DOWNGRADE-013: Preview does not send email.
- [ ] DOWNGRADE-014: Preview handles missing profile safely.
- [ ] DOWNGRADE-015: Preview handles database failure with a stable error.

## S. Organization-Wide Synchronization Tests

- [ ] SYNC-001: New organization inherits the owner's current seat limit.
- [ ] SYNC-002: Billing update synchronizes one owned organization.
- [ ] SYNC-003: Billing update synchronizes multiple owned organizations.
- [ ] SYNC-004: Billing update leaves foreign organizations unchanged.
- [ ] SYNC-005: Webhook subscription update recalculates base seats.
- [ ] SYNC-006: Webhook add-on update recalculates total seats.
- [ ] SYNC-007: Webhook update persists user seat fields.
- [ ] SYNC-008: Webhook update persists organization max seats.
- [ ] SYNC-009: Webhook replay is idempotent.
- [ ] SYNC-010: Out-of-order webhook does not reduce capacity incorrectly.
- [ ] SYNC-011: Invalid webhook signature does not mutate seats.
- [ ] SYNC-012: Unknown subscription tier does not grant capacity.
- [ ] SYNC-013: Sync failure identifies affected organizations for remediation.
- [ ] SYNC-014: Partial organization update is rolled back or reconciled.
- [ ] SYNC-015: Sync does not alter organization additional-seat legacy data unexpectedly.
- [ ] SYNC-016: Sync does not alter member statuses.
- [ ] SYNC-017: Sync does not delete invitations.
- [ ] SYNC-018: Sync does not send member emails.
- [ ] SYNC-019: Sync preserves owner identity.
- [ ] SYNC-020: Sync handles an owner with zero organizations.

## T. Model and SQL Contract Tests

- [ ] MODEL-001: Organization insert binds name, owner id, and max seats in the expected order.
- [ ] MODEL-002: Organization lookup binds organization id safely.
- [ ] MODEL-003: Organization list binds authenticated user id safely.
- [ ] MODEL-004: Membership insert binds all required fields.
- [ ] MODEL-005: Membership update binds only permitted fields.
- [ ] MODEL-006: Membership delete binds organization and member identifiers.
- [ ] MODEL-007: Occupancy query counts only active and pending statuses.
- [ ] MODEL-008: Occupancy query excludes revoked status.
- [ ] MODEL-009: Owned occupancy query filters by owner id.
- [ ] MODEL-010: Owned occupancy query includes all owned organizations.
- [ ] MODEL-011: Owned occupancy query excludes member-only organizations.
- [ ] MODEL-012: Duplicate user membership constraint is enforced by the database.
- [ ] MODEL-013: Duplicate invited-email constraint is enforced by the database.
- [ ] MODEL-014: Foreign key prevents membership for a missing organization.
- [ ] MODEL-015: Foreign key behavior for deleted users matches the account policy.
- [ ] MODEL-016: Organization owner foreign key behavior matches deletion policy.
- [ ] MODEL-017: Status constraint rejects unsupported values.
- [ ] MODEL-018: Organization role constraint rejects unsupported values.
- [ ] MODEL-019: Invite token uniqueness is enforced if required.
- [ ] MODEL-020: Invite expiration column preserves timezone.
- [ ] MODEL-021: Null `user_id` is allowed only for pending unknown invitees.
- [ ] MODEL-022: Revoked invitations clear token through model operation.
- [ ] MODEL-023: Accepted invitations clear token through model operation.
- [ ] MODEL-024: Model maps database errors to stable domain errors.
- [ ] MODEL-025: Model never concatenates user input into SQL.
- [ ] MODEL-026: Model returns plain domain objects without client credentials.
- [ ] MODEL-027: Model handles no-row results distinctly from database errors.
- [ ] MODEL-028: Model transaction commits both organization and owner membership.
- [ ] MODEL-029: Model transaction rolls back both creation steps on failure.
- [ ] MODEL-030: Model transaction protects deletion and occupancy checks.

## U. RLS and Tenant-Isolation Tests

- [ ] RLS-001: User reads own profile.
- [ ] RLS-002: Platform admin reads permitted profiles.
- [ ] RLS-003: Unrelated user cannot read private profile data.
- [ ] RLS-004: Active organization members read permitted teammate profiles.
- [ ] RLS-005: Organization owner reads own organization.
- [ ] RLS-006: Active admin reads organization.
- [ ] RLS-007: Active estimator reads organization.
- [ ] RLS-008: Active viewer reads organization.
- [ ] RLS-009: Pending invitee cannot read organization.
- [ ] RLS-010: Revoked member cannot read organization.
- [ ] RLS-011: Unrelated user cannot read organization.
- [ ] RLS-012: Owner updates organization.
- [ ] RLS-013: Platform admin updates organization under admin policy.
- [ ] RLS-014: Admin update capability matches intended policy.
- [ ] RLS-015: Estimator update capability matches intended policy.
- [ ] RLS-016: Viewer write access is denied for organization-scoped product records.
- [ ] RLS-017: Viewer read-only behavior is enforced at both route and RLS boundaries, not only through UI gating.
- [ ] RLS-018: Active member reads organization members according to policy.
- [ ] RLS-019: Pending invitee cannot enumerate members.
- [ ] RLS-020: Revoked member cannot enumerate members.
- [ ] RLS-021: Project access follows active membership.
- [ ] RLS-022: Estimate access follows parent project access.
- [ ] RLS-023: Rate-library access follows active membership.
- [ ] RLS-024: Foreign organization project is inaccessible.
- [ ] RLS-025: Foreign organization estimate is inaccessible.
- [ ] RLS-026: Foreign organization rate library is inaccessible.
- [ ] RLS-027: RLS cannot be bypassed by changing client role text.
- [ ] RLS-028: RLS cannot be bypassed by changing organization id in payload.
- [ ] RLS-029: Platform admin bypass is deliberate and audited.
- [ ] RLS-030: Service-role database access is never exposed to the frontend.

## V. Frontend API Client Tests

- [ ] FE-CLIENT-001: List organizations sends authenticated request.
- [ ] FE-CLIENT-002: Create organization sends only the name.
- [ ] FE-CLIENT-003: Load organization details uses the selected organization id.
- [ ] FE-CLIENT-004: Invite client sends normalized email and selected role.
- [ ] FE-CLIENT-005: Invite client does not send client-generated token.
- [ ] FE-CLIENT-006: Update role client sends only the new role.
- [ ] FE-CLIENT-007: Remove member client uses the correct member id.
- [ ] FE-CLIENT-008: Resend client uses the correct member id.
- [ ] FE-CLIENT-009: Revoke client uses the correct member id.
- [ ] FE-CLIENT-010: Delete organization client uses the selected organization id.
- [ ] FE-CLIENT-011: Verify invite client works without an authenticated session.
- [ ] FE-CLIENT-012: Accept invite client sends the token after authentication.
- [ ] FE-CLIENT-013: Update seats client sends additional seats and optional org id.
- [ ] FE-CLIENT-014: Client maps `SEAT_LIMIT_EXCEEDED` to the expected UI error.
- [ ] FE-CLIENT-015: Client maps expired invite error to the expected UI state.
- [ ] FE-CLIENT-016: Client maps email delivery failure status correctly.
- [ ] FE-CLIENT-017: Client does not retry non-idempotent invite creation automatically.
- [ ] FE-CLIENT-018: Client handles network failure without duplicating invites.
- [ ] FE-CLIENT-019: Client handles unauthorized response by refreshing auth state.
- [ ] FE-CLIENT-020: Client handles forbidden response without showing owner controls.
- [ ] FE-CLIENT-021: Client handles validation errors field-by-field where supported.
- [ ] FE-CLIENT-022: Client does not display invite tokens outside the acceptance URL flow.
- [ ] FE-CLIENT-023: Client refreshes organization after successful invite.
- [ ] FE-CLIENT-024: Client refreshes organization after successful resend.
- [ ] FE-CLIENT-025: Client refreshes organization after successful revoke.
- [ ] FE-CLIENT-026: Client refreshes organization after successful role update.
- [ ] FE-CLIENT-027: Client refreshes organization after successful member removal.
- [ ] FE-CLIENT-028: Client refreshes organization after successful seat update.
- [ ] FE-CLIENT-029: Client refreshes authenticated profile after seat update.
- [ ] FE-CLIENT-030: Client calculates displayed occupancy using active plus pending rows.

## W. Team Workspace UI Tests

- [ ] UI-TEAM-001: Workspace switcher lists accessible organizations.
- [ ] UI-TEAM-002: Workspace switcher excludes revoked memberships.
- [ ] UI-TEAM-003: Create form is visible only when account eligibility allows it.
- [ ] UI-TEAM-004: Create form validates blank name.
- [ ] UI-TEAM-005: Create form displays server validation errors.
- [ ] UI-TEAM-006: Successful create selects the new organization.
- [ ] UI-TEAM-007: Member table displays owner distinctly.
- [ ] UI-TEAM-008: Member table displays admins distinctly.
- [ ] UI-TEAM-009: Member table displays estimators distinctly.
- [ ] UI-TEAM-010: Member table displays viewers distinctly.
- [ ] UI-TEAM-011: Member table displays pending invitations distinctly.
- [ ] UI-TEAM-012: Member table displays revoked rows according to product policy.
- [ ] UI-TEAM-013: Invite action is visible to owner.
- [ ] UI-TEAM-014: Invite action is visible to admin.
- [ ] UI-TEAM-015: Invite action is hidden or disabled for estimator.
- [ ] UI-TEAM-016: Invite action is hidden or disabled for viewer.
- [ ] UI-TEAM-017: Invite action is disabled at capacity.
- [ ] UI-TEAM-018: Capacity display includes pending invitations.
- [ ] UI-TEAM-019: Capacity display excludes revoked invitations.
- [ ] UI-TEAM-020: Resend action appears only for eligible pending rows.
- [ ] UI-TEAM-021: Revoke action appears only for eligible pending rows under policy.
- [ ] UI-TEAM-022: Remove action never appears for owner.
- [ ] UI-TEAM-023: Role selector cannot choose owner.
- [ ] UI-TEAM-024: Delete action appears only for owner.
- [ ] UI-TEAM-025: Delete action explains blocked occupied seats.
- [ ] UI-TEAM-026: Seat modal shows base and add-on seats.
- [ ] UI-TEAM-027: Seat modal rejects negative input.
- [ ] UI-TEAM-028: Seat modal rejects decimal input.
- [ ] UI-TEAM-029: Seat modal shows server rejection without changing local state.
- [ ] UI-TEAM-030: Seat modal refreshes profile and organization after success.
- [ ] UI-TEAM-031: Loading states prevent duplicate invite submissions.
- [ ] UI-TEAM-032: Loading states prevent duplicate seat updates.
- [ ] UI-TEAM-033: Error states are dismissible and do not erase form input unexpectedly.
- [ ] UI-TEAM-034: Organization switch does not retain previous member actions.
- [ ] UI-TEAM-035: Stale organization response cannot overwrite a newer selection.

## X. Accept Invite UI Tests

- [ ] UI-INVITE-001: Missing token shows invalid invitation state.
- [ ] UI-INVITE-002: Verification loading state is shown.
- [ ] UI-INVITE-003: Valid verification shows organization name.
- [ ] UI-INVITE-004: Valid verification shows invited role.
- [ ] UI-INVITE-005: Expired verification shows expiration state.
- [ ] UI-INVITE-006: Revoked verification shows invalid state.
- [ ] UI-INVITE-007: Unauthenticated valid invite prompts sign-in or sign-up.
- [ ] UI-INVITE-008: Authenticated user can accept valid invite.
- [ ] UI-INVITE-009: Acceptance success shows the new workspace.
- [ ] UI-INVITE-010: Acceptance failure preserves a useful error state.
- [ ] UI-INVITE-011: Acceptance cannot be submitted twice while pending.
- [ ] UI-INVITE-012: Token is not rendered as visible page text.
- [ ] UI-INVITE-013: Token is not logged by the component.
- [ ] UI-INVITE-014: Email mismatch error is displayed if enforced.
- [ ] UI-INVITE-015: Expired invite does not offer a misleading accept action.
- [ ] UI-INVITE-016: Accept page handles network failure.
- [ ] UI-INVITE-017: Accept page handles unauthorized response.
- [ ] UI-INVITE-018: Accept page handles organization deletion during flow.
- [ ] UI-INVITE-019: Accept page supports the configured locale.
- [ ] UI-INVITE-020: Accept page does not edit generated locale files as part of component changes.

## Y. Email Confirmation and Delivery Contract Tests

- [ ] EMAIL-CONTRACT-001: Invite email is sent only after a valid pending membership exists.
- [ ] EMAIL-CONTRACT-002: Invite email is not sent before the database write when ordering is required.
- [ ] EMAIL-CONTRACT-003: Invite email is not sent after a rolled-back transaction.
- [ ] EMAIL-CONTRACT-004: Delivery success is represented consistently in route response.
- [ ] EMAIL-CONTRACT-005: Provider acceptance is not confused with recipient confirmation.
- [ ] EMAIL-CONTRACT-006: Recipient confirmation is represented only when the provider supplies it.
- [ ] EMAIL-CONTRACT-007: Bounce response is represented according to provider mapping.
- [ ] EMAIL-CONTRACT-008: Complaint response is represented according to provider mapping.
- [ ] EMAIL-CONTRACT-009: Suppressed recipient response does not mark delivery successful.
- [ ] EMAIL-CONTRACT-010: Provider timeout is retryable only under explicit policy.
- [ ] EMAIL-CONTRACT-011: Retry uses the same pending membership when safe.
- [ ] EMAIL-CONTRACT-012: Retry does not create a second seat reservation.
- [ ] EMAIL-CONTRACT-013: Retry token rotation invalidates the previous token.
- [ ] EMAIL-CONTRACT-014: Confirmation callback cannot activate an invitation without authenticated acceptance.
- [ ] EMAIL-CONTRACT-015: Confirmation callback cannot be used to change invite role.
- [ ] EMAIL-CONTRACT-016: Confirmation callback cannot be used to change invite recipient.
- [ ] EMAIL-CONTRACT-017: Email provider webhook signature is validated when supported.
- [ ] EMAIL-CONTRACT-018: Email provider webhook replay is idempotent.
- [ ] EMAIL-CONTRACT-019: Email provider webhook does not reveal invite tokens.
- [ ] EMAIL-CONTRACT-020: Email delivery logs include correlation id but redact secrets.
- [ ] EMAIL-CONTRACT-021: Email template plain-text and HTML variants contain equivalent core information.
- [ ] EMAIL-CONTRACT-022: Email links use the correct environment origin.
- [ ] EMAIL-CONTRACT-023: Development email mode is incapable of sending production mail accidentally.
- [ ] EMAIL-CONTRACT-024: Missing email configuration follows the documented no-provider behavior.
- [ ] EMAIL-CONTRACT-025: Email adapter errors map to stable application errors.

## Z. Security and Abuse-Resistance Tests

- [ ] SECURITY-001: Brute-force token guesses do not reveal whether an email exists.
- [ ] SECURITY-002: Token comparison is timing-safe where applicable.
- [ ] SECURITY-003: Tokens have sufficient entropy.
- [ ] SECURITY-004: Tokens expire after the configured lifetime.
- [ ] SECURITY-005: Revoked tokens remain invalid permanently.
- [ ] SECURITY-006: Consumed tokens remain invalid permanently.
- [ ] SECURITY-007: Old resend tokens remain invalid.
- [ ] SECURITY-008: Invite token is never accepted as a bearer identity for another user.
- [ ] SECURITY-009: Authenticated acceptance uses the current authenticated user id.
- [ ] SECURITY-010: Invitation acceptance rejects authenticated users whose email does not match `invited_email`.
- [ ] SECURITY-011: Organization ids cannot be enumerated through error detail.
- [ ] SECURITY-012: Member ids cannot access another organization.
- [ ] SECURITY-013: SQL injection strings are rejected or safely parameterized.
- [ ] SECURITY-014: HTML injection strings are escaped in emails and UI.
- [ ] SECURITY-015: Header injection in email fields is prevented.
- [ ] SECURITY-016: Oversized payloads are rejected.
- [ ] SECURITY-017: Repeated invite requests are rate limited where required.
- [ ] SECURITY-018: Repeated verify requests are rate limited where required.
- [ ] SECURITY-019: Repeated accept requests are rate limited where required.
- [ ] SECURITY-020: Repeated resend requests are rate limited where required.
- [ ] SECURITY-021: Authorization uses server-side membership state.
- [ ] SECURITY-022: Client role fields cannot elevate privileges.
- [ ] SECURITY-023: Platform admin and organization admin claims cannot be confused.
- [ ] SECURITY-024: Billing identifiers cannot be changed by request payload.
- [ ] SECURITY-025: Paddle webhook signature verification is mandatory.
- [ ] SECURITY-026: Email provider credentials are not serialized in errors.
- [ ] SECURITY-027: Invite tokens are excluded from general application logs.
- [ ] SECURITY-028: Sensitive fields are excluded from analytics events.
- [ ] SECURITY-029: Deleted organization data is not returned from cached reads.
- [ ] SECURITY-030: Revoked member access is invalidated without requiring client cache expiry.

## AA. Error, Transaction, and Recovery Tests

- [ ] ERROR-001: Auth middleware failure returns the standard unauthorized response.
- [ ] ERROR-002: Auth middleware malformed identity returns the standard unauthorized response.
- [ ] ERROR-003: User lookup database failure returns a stable server response.
- [ ] ERROR-004: Organization lookup database failure returns a stable server response.
- [ ] ERROR-005: Membership lookup database failure returns a stable server response.
- [ ] ERROR-006: Membership insert failure returns a stable server response.
- [ ] ERROR-007: Membership update failure returns a stable server response.
- [ ] ERROR-008: Membership delete failure returns a stable server response.
- [ ] ERROR-009: Email adapter failure follows the selected consistency policy.
- [ ] ERROR-010: Paddle adapter failure follows the selected consistency policy.
- [ ] ERROR-011: Transaction rollback removes partial organization creation.
- [ ] ERROR-012: Transaction rollback removes partial membership creation.
- [ ] ERROR-013: Transaction rollback preserves prior valid invite during failed resend.
- [ ] ERROR-014: Transaction rollback preserves prior role during failed role update.
- [ ] ERROR-015: Transaction rollback preserves prior membership during failed removal.
- [ ] ERROR-016: Transaction rollback preserves organization when deletion cascades fail.
- [ ] ERROR-017: Retriable errors can be retried without duplicate seats.
- [ ] ERROR-018: Non-retriable validation errors are not retried.
- [ ] ERROR-019: Client timeout does not imply operation failure without reconciliation.
- [ ] ERROR-020: Repeated request behavior is documented for every mutation.
- [ ] ERROR-021: Error responses have stable machine-readable codes.
- [ ] ERROR-022: Error responses have safe user-facing messages.
- [ ] ERROR-023: Error responses do not include stack traces in production mode.
- [ ] ERROR-024: Error responses do not include SQL or provider payloads.
- [ ] ERROR-025: Error handling emits one correlation id per request.

## AB. Webhook and External-System Tests

- [ ] WEBHOOK-001: Valid subscription-created webhook updates the account.
- [ ] WEBHOOK-002: Valid subscription-updated webhook updates the account.
- [ ] WEBHOOK-003: Valid subscription-canceled webhook applies the cancellation policy.
- [ ] WEBHOOK-004: Invalid signature is rejected.
- [ ] WEBHOOK-005: Missing signature is rejected.
- [ ] WEBHOOK-006: Malformed payload is rejected.
- [ ] WEBHOOK-007: Unknown customer is handled safely.
- [ ] WEBHOOK-008: Unknown subscription id is handled safely.
- [ ] WEBHOOK-009: Duplicate event is idempotent.
- [ ] WEBHOOK-010: Out-of-order event does not regress capacity.
- [ ] WEBHOOK-011: Subscription tier maps to the correct base seats.
- [ ] WEBHOOK-012: Add-on quantity maps to the correct additional seats.
- [ ] WEBHOOK-013: User total seat limit is recalculated.
- [ ] WEBHOOK-014: Owned organization max seats are synchronized.
- [ ] WEBHOOK-015: Synchronization includes multiple owned organizations.
- [ ] WEBHOOK-016: Synchronization excludes foreign organizations.
- [ ] WEBHOOK-017: Webhook never changes member roles.
- [ ] WEBHOOK-018: Webhook never creates invitation emails.
- [ ] WEBHOOK-019: Webhook failure is observable through logs and metrics.
- [ ] WEBHOOK-020: Webhook response is timely and does not expose secrets.

## AC. Observability and Audit Tests

- [ ] OBS-001: Organization creation emits the expected audit event.
- [ ] OBS-002: Invitation creation emits the expected audit event.
- [ ] OBS-003: Invitation acceptance emits the expected audit event.
- [ ] OBS-004: Invitation resend emits the expected audit event.
- [ ] OBS-005: Invitation revocation emits the expected audit event.
- [ ] OBS-006: Role update emits the expected audit event.
- [ ] OBS-007: Member removal emits the expected audit event.
- [ ] OBS-008: Organization deletion emits the expected audit event.
- [ ] OBS-009: Seat update emits the expected audit event.
- [ ] OBS-010: Denied authorization emits a security event when required.
- [ ] OBS-011: Capacity rejection emits a useful metric.
- [ ] OBS-012: Email success and failure metrics are distinct.
- [ ] OBS-013: Paddle success and failure metrics are distinct.
- [ ] OBS-014: Audit events identify actor, organization, and target safely.
- [ ] OBS-015: Audit events redact invitation tokens.
- [ ] OBS-016: Audit event failure does not break the primary operation unless required.
- [ ] OBS-017: Correlation id is preserved through database and email calls.
- [ ] OBS-018: Logs distinguish platform admin from organization admin.
- [ ] OBS-019: Logs distinguish pending, active, and revoked states.
- [ ] OBS-020: Metrics do not count revoked invitations as occupied seats.

## AD. Regression Tests for Solved Decisions and Legacy Gaps

These tests lock the resolved product decisions into permanent assertions and keep legacy compatibility questions visible where they still exist.

- [ ] GAP-001: Enterprise base-seat value is eight in frontend constants, backend tier limits, seed data, docs, and tests.
- [ ] GAP-002: Pro organization-creation eligibility is rejected in both UI and backend, while Pro add-on seat management remains available where allowed.
- [ ] GAP-003: Viewer read-only behavior is enforced at every organization-scoped write path.
- [ ] GAP-004: Viewer read-only behavior is enforced by database RLS and route authorization, not only route permissions or UI gating.
- [ ] GAP-005: Invitation acceptance requires authenticated user email to match `invited_email` case-insensitively.
- [ ] GAP-006: Revoke endpoint rejects active members and applies only to pending invitations.
- [ ] GAP-007: Frontend capacity displays count active plus pending, not raw rows.
- [ ] GAP-008: Active member count is not used as total occupied seat count.
- [ ] GAP-009: Legacy `organizations.additional_seats` behavior is either retired or tested as authoritative nowhere.
- [ ] GAP-010: Legacy Team tier handling is either retired or covered as compatibility behavior.
- [ ] GAP-011: All generated locale files remain untouched by English-only UI test-plan changes.
- [ ] GAP-012: The current hard-coded Enterprise test expectation is reconciled with seeded configuration.

## AE. Coverage Completion Gates

The suite is complete only when all of the following are true.

- [ ] Every route has authenticated, unauthenticated, authorized, unauthorized, valid, invalid, empty, boundary, and dependency-failure cases.
- [ ] Every mutation asserts both success state and no-mutation-on-rejection state.
- [ ] Every membership status has explicit access and capacity tests.
- [ ] Every organization role has explicit action permissions.
- [ ] Every account-level role and relevant subscription tier has explicit eligibility tests.
- [ ] Every email path asserts recipient, template variables, URL, delivery result, and failure behavior.
- [ ] Every token path asserts generation, expiration, rotation, invalidation, and non-disclosure.
- [ ] Every seat path tests active, pending, revoked, exact-capacity, and over-capacity states.
- [ ] Every billing path tests local persistence, Paddle calls, proration, and synchronization.
- [ ] Every cross-organization path tests owned and foreign organizations.
- [ ] Every database constraint has at least one integration test that exercises the real constraint.
- [ ] Every RLS policy has allow and deny tests using real database roles or an equivalent integration harness.
- [ ] Every frontend mutation refreshes the relevant organization and profile state.
- [ ] Every known documentation mismatch has a decision-gated regression test.
- [ ] No test relies on real email delivery, real Paddle billing, or shared production data.
- [ ] Test execution is deterministic under a frozen clock.
- [ ] Test execution is safe to run in parallel or explicitly serializes shared resources.
- [ ] Coverage reports include branches for error handling, not only line coverage.
- [ ] Mutation testing or equivalent negative testing covers authorization and capacity predicates.
- [ ] CI runs backend unit tests, backend integration tests, frontend tests, and focused end-to-end smoke tests.
- [ ] CI fails when a new organization route lacks a corresponding test inventory entry.
- [ ] CI fails when supported organization roles or statuses change without matrix updates.
- [ ] CI fails when tier base-seat configuration changes without tier test updates.
- [ ] CI fails when invitation email template variables change without email contract updates.
- [ ] CI verifies that no translator command is run by the automated test workflow.

## Suggested Test File Layout

- `takeoff-engine-backend/tests/core/organizations/seatCalculations.test.js`
- `takeoff-engine-backend/tests/core/organizations/organizationCreation.test.js`
- `takeoff-engine-backend/tests/core/organizations/organizationAccess.test.js`
- `takeoff-engine-backend/tests/core/organizations/membershipRoles.test.js`
- `takeoff-engine-backend/tests/core/organizations/invitations.test.js`
- `takeoff-engine-backend/tests/core/organizations/invitationEmails.test.js`
- `takeoff-engine-backend/tests/core/organizations/organizationDeletion.test.js`
- `takeoff-engine-backend/tests/core/billing/seatUpdates.test.js`
- `takeoff-engine-backend/tests/core/billing/downgradeEligibility.test.js`
- `takeoff-engine-backend/tests/core/billing/paddleSeatSync.test.js`
- `takeoff-engine-backend/tests/core/database/organizationConstraints.test.js`
- `takeoff-engine-backend/tests/core/database/organizationRls.test.js`
- `takeoff-engine/tests/core/auth/organizationsClient.test.js`
- `takeoff-engine/tests/core/auth/teamWorkspaceManager.test.jsx`
- `takeoff-engine/tests/core/auth/acceptInvitePage.test.jsx`
- `takeoff-engine/tests/accessibility/organizationManagement.accessibility.test.jsx`
- `takeoff-engine/tests/e2e/organizationInvitation.smoke.test.js`

## Test Data Matrix Minimum

At minimum, each relevant suite should parameterize these dimensions.

- Tiers: free, starter, pro, enterprise, legacy team, unknown.
- Account roles: user, admin, payment_exempt, estimator, user_payment_exempt.
- Organization roles: owner, admin, estimator, viewer.
- Membership statuses: active, pending, revoked.
- Seat states: below capacity, exact capacity, above capacity.
- Invitation identity: known user, unknown email, matching authenticated email, mismatching authenticated email.
- Invitation time: before expiration, exact expiration, after expiration.
- Billing state: no Paddle subscription, active subscription, canceled subscription, provider failure.
- Organization relationship: owner, active member, pending invitee, revoked member, unrelated user.
- Email state: provider success, provider rejection, timeout, missing configuration, webhook confirmation.
- Request state: valid, missing fields, wrong types, oversized values, duplicate request, concurrent request.

## Final QA Sign-Off

A release reviewer should sign off only after the test results demonstrate that the backend remains authoritative, the frontend does not over-promise access, pending invitations reserve capacity, revoked invitations release capacity, owner protections cannot be bypassed, email links are secure and accurately reported, seat billing synchronizes all owned organizations, and every unresolved product decision is either implemented or explicitly blocked from release.
