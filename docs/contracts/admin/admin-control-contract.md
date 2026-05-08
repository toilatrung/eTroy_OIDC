# eTroy OIDC - Admin Control Contract

---

## I. Contract Summary

* Contract: Admin Control Contract
* Phase: Phase 06 - Platform and Governance Hardening
* Primary Sprint: Sprint 17 - Admin Module Controls
* Owner Module: `src/modules/admin`
* Supporting Modules:

  * `src/modules/users`
  * `src/modules/audit`
* Primary Assignment: `docs/planning/assignments/phase-06-sprint-17.md`
* Contract Path: `docs/contracts/admin/admin-control-contract.md`
* Status: Draft for approval

---

## II. Purpose

This contract defines the approved administrative control boundary for eTroy OIDC.

The admin module provides controlled orchestration for approved administration use cases. It must not become the owner of user identity, OIDC protocol behavior, token/session lifecycle, client metadata, audit persistence, or cross-domain database mutation.

Sprint 17 focuses on admin-controlled user administration only.

This contract exists to ensure admin behavior is:

* explicit
* bounded
* auditable
* traceable to source-of-truth documents
* safe against identity ownership bypass
* safe against token/session/client ownership drift

---

## III. Source-of-Truth Basis

This contract is governed by:

* `docs/source-of-truth-index.md`
* `docs/README.md`
* `docs/architecture/system-overview.md`
* `docs/architecture/module-boundaries.md`
* `docs/architecture/source-tree.md`
* `docs/architecture/detailed-source-tree.md`
* `docs/requirements/srs-v1.md`
* `docs/planning/master-execution-plan.md`
* `docs/planning/phases/phase-06-platform-governance-hardening.md`
* `docs/contracts/audit/audit-event-contract.md`
* `docs/planning/assignments/phase-06-sprint-17.md`
* `docs/planning/reports/phase-06-sprint-16-report.md`
* `docs/governance/git-rules.md`
* `docs/governance/pr-template.md`
* `docs/governance/review-checklist.md`
* `docs/governance/anti-patterns.md`

Authority rules:

* `docs/` is authoritative.
* `agent/` is operational support only.
* `source-tree.md` is the primary physical structure contract.
* `detailed-source-tree.md` is supporting reference only.
* If this contract conflicts with architecture documents, architecture documents win unless an approved architecture update is included.
* No Sprint 17 runtime implementation may begin unless this contract and `docs/planning/assignments/phase-06-sprint-17.md` are approved.

---

## IV. Contract Scope

### Included

Sprint 17 admin controls include:

* admin module baseline
* admin service boundary
* admin controller boundary
* admin input validation boundary
* admin-provisioned user creation
* user admin view retrieval
* user disable orchestration
* user enable orchestration
* controlled user profile update orchestration:

  * `name`
  * `avatar_url`
* admin email verification override
* audit event recording for approved admin user actions
* minimal users-owned support required for admin user status if not already present
* Sprint 17 validation and report evidence

### Excluded

Sprint 17 admin controls do not include:

* hard delete user
* editing `sub`
* editing internal user id
* editing `password_hash` directly
* changing user email
* resetting or changing password on behalf of user
* token revocation admin control
* session invalidation admin control
* OIDC client creation/update/disable/secret rotation
* OIDC client metadata lifecycle implementation
* OIDC token/session/client direct persistence mutation
* admin dashboard UI
* broad RBAC or permission matrix
* super-admin framework
* audit query/read API
* audit dashboard
* external SIEM integration
* external observability pipeline
* direct database mutation from `admin`
* direct repository/model import from `users`, `oidc`, or `audit`

---

## V. Admin Ownership Boundary

### 1. Admin Module Ownership

`src/modules/admin` owns:

* admin orchestration use cases
* admin request validation boundary
* admin controller request/response mapping
* admin service coordination
* admin action audit coordination

`admin` does not own:

* user identity records
* password hashing
* user persistence
* OIDC token/session state
* OIDC client metadata
* audit persistence
* audit schema
* authentication/authorization system
* verification lifecycle
* password-reset lifecycle

### 2. Admin Module Allowed Behavior

`admin` may:

* orchestrate approved user administration operations through `users` service contracts
* record approved admin action audit events through `audit` service contract
* validate admin request input
* reject unsupported admin operations
* expose admin controller endpoints approved by this contract and Sprint 17 assignment
* map service results into HTTP responses

### 3. Admin Module Forbidden Behavior

`admin` must not:

* import `UserModel`
* import `user.repository`
* import audit repository
* import OIDC token/session/client models
* mutate user database directly
* mutate audit database directly
* mutate OIDC token/session/client persistence directly
* issue access tokens
* issue ID Tokens
* issue refresh tokens
* revoke tokens
* introspect tokens
* invalidate sessions
* manage OIDC clients in Sprint 17
* implement OIDC protocol behavior
* implement authentication credential validation
* implement password hashing directly
* implement email verification flow logic
* implement password-reset flow logic
* duplicate ownership logic from `users`, `oidc`, or `audit`

---

## VI. Admin Authorization Assumption

Sprint 17 does not implement a full RBAC, permission, or admin authentication system.

For Sprint 17, admin authorization is treated as an explicit boundary assumption:

* admin endpoints represent an admin-only surface
* runtime implementation must include an internal admin actor reference in service/controller inputs
* authorization enforcement may be represented by a minimal guard/stub only if consistent with existing app patterns
* broad role management is out of scope
* permission matrix design is out of scope
* unauthorized or denied admin access behavior must not be silently treated as successful admin action

If a concrete admin authentication/authorization mechanism is required before exposing HTTP endpoints and no approved mechanism exists, controller endpoints must remain internal/admin-only baseline and must not imply production-ready public admin access.

---

## VII. Approved Admin User Operations

Sprint 17 approves the following admin user operations.

### 1. Create Admin-Provisioned User

Admin may create a user account through an admin-provisioned flow.

Rules:

* must call `users` service contract
* must enforce unique email through users-owned logic
* must hash password through users-owned logic
* must not persist plain password
* may set `email_verified = true` at creation time
* must not bypass users-owned model/repository/service ownership
* must not create identity data outside `users`
* must record an audit event
* must include a reason code or administrative reason if supported by implementation
* must not send or store raw temporary credentials in audit metadata

Allowed input fields:

* `email`
* `password` or approved initial credential field
* `name`
* `avatar_url`
* `email_verified`

Forbidden input fields:

* `sub`
* internal user id
* `password_hash`
* token/session/client fields
* arbitrary user object payload

### 2. Get User Admin View

Admin may retrieve a bounded admin view of a user.

Rules:

* must call `users` service contract
* must not expose `password_hash`
* must not expose secrets
* must not expose raw token/session/client state
* must not bypass users repository/model boundary

Allowed returned fields should be limited to safe identity/admin review fields, such as:

* `id` if already exposed safely by users service
* `sub`
* `email`
* `email_verified`
* `name`
* `avatar_url`
* `status`
* `createdAt`
* `updatedAt`

### 3. Disable User

Admin may disable a user account.

Rules:

* must call `users` service contract
* must use users-owned status field and mutation behavior
* must not delete the user record
* must not mutate token/session state directly
* must record an audit event
* must preserve identity traceability and audit history
* must be idempotent or explicitly handle already-disabled users according to implementation convention

### 4. Enable User

Admin may enable a disabled user account.

Rules:

* must call `users` service contract
* must use users-owned status field and mutation behavior
* must not recreate the user record
* must not mutate token/session state directly
* must record an audit event
* must be idempotent or explicitly handle already-enabled users according to implementation convention

### 5. Update Controlled User Profile Fields

Admin may update only the following user profile fields:

* `name`
* `avatar_url`

Rules:

* must call `users` service contract
* must not update email
* must not update `sub`
* must not update internal user id
* must not update password or `password_hash`
* must record an audit event
* must reject fields outside the allowlist

### 6. Mark Email as Verified

Admin may mark a user email as verified.

Rules:

* must call `users` service contract
* must be treated as admin override, not normal email verification flow
* must not consume or create email verification tokens
* must not bypass verification module ownership for verification-flow behavior
* must record an audit event
* must not change email value
* must not mark email as unverified in Sprint 17

---

## VIII. User Status Rules

Sprint 17 may introduce minimal users-owned status support required for admin disable/enable.

Allowed user statuses:

* `active`
* `disabled`

Rules:

* user status is owned by `users`
* admin may orchestrate status changes only through `users` service
* `admin` must not own or persist status directly
* status must not be implemented as token/session state
* status must not require direct OIDC token/session mutation in Sprint 17
* downstream effects of disabled users on login/token/session behavior are outside Sprint 17 unless separately approved

If status already exists in runtime, Sprint 17 must use the existing users-owned status contract rather than duplicating it.

---

## IX. Immutable User Fields

Admin must not modify:

* `sub`
* internal user id
* `password_hash`
* password hash algorithm metadata
* created identity identifiers
* token/session/client references
* OIDC subject mapping data

`sub` is a stable OIDC subject identifier. Any future need to migrate, merge, or change subject identity requires a separate identity migration contract and must not be implemented in Sprint 17.

---

## X. Admin -> Users Service Boundary

Admin must use approved `users` service contracts for all user operations.

Allowed dependency direction:

* `admin` -> `users` service

Forbidden:

* `admin` -> `UserModel`
* `admin` -> `user.repository`
* `admin` -> raw Mongoose user queries
* `admin` -> direct database update/delete operations
* copying user business logic into `admin`
* implementing password hashing in `admin`
* implementing email uniqueness checks directly in `admin` if users service already owns them

Users-owned changes required for Sprint 17, if missing, must remain inside `src/modules/users`.

Minimal users-owned support may include:

* user status field
* user status update service method
* admin-provisioned create-user service option
* admin-safe profile update method if existing method is insufficient
* admin email-verified override service method if existing method requires clearer semantics

These changes must not transfer user ownership to `admin`.

---

## XI. Admin -> Audit Service Boundary

Admin must use approved `audit` service contract for audit recording.

Allowed dependency direction:

* `admin` -> `audit` service

Forbidden:

* `admin` -> audit repository
* `admin` -> audit event model direct persistence
* `admin` -> arbitrary audit collection writes
* passing raw secrets to audit
* passing full request body to audit
* passing full user database record to audit
* passing password, password hash, token, session cookie, client secret, or authorization header to audit

Audit failures must follow the approved audit failure behavior unless this contract later defines a stricter rule.

Sprint 17 admin operations must not rely on audit persistence as primary business state.

---

## XII. Audit Event Requirements

Every approved admin user mutation must emit an audit event.

Required admin action events:

* `admin.user.created`
* `admin.user.disabled`
* `admin.user.enabled`
* `admin.user.profile.updated`
* `admin.user.email_verified.marked`

Optional security/admin denial event:

* `security.unauthorized_admin_action`

If these event types are not present in `docs/contracts/audit/audit-event-contract.md`, that contract must receive an additive vocabulary update before runtime implementation uses them.

Audit event rules:

* actor must identify admin actor safely
* subject must identify target user safely
* metadata must be bounded
* reason code should be included where useful
* no raw password, token, cookie, secret, authorization code, client secret, or full request body may be recorded
* no full user object may be recorded
* no `password_hash` may be recorded
* no raw temporary credential may be recorded

Example safe event shape:

```json
{
  "eventType": "admin.user.disabled",
  "category": "admin",
  "severity": "warning",
  "outcome": "success",
  "actor": {
    "type": "admin",
    "adminSub": "admin-sub"
  },
  "subject": {
    "type": "user",
    "sub": "target-user-sub"
  },
  "reasonCode": "ADMIN_USER_DISABLED"
}
```

---

## XIII. API / Controller Exposure Decision

Sprint 17 may implement `src/modules/admin/admin.controller.ts`.

Controller rules:

* controller must remain thin
* controller must delegate to `admin.service`
* controller must not access repositories directly
* controller must not implement business ownership logic
* controller must not expose raw persistence errors
* controller must not accept arbitrary object payloads for pass-through mutation
* controller must not expose secret fields
* controller must not implement a broad RBAC framework
* controller must map validation failures and service errors consistently with project conventions

Approved API surface, subject to Sprint 17 assignment:

* create admin-provisioned user
* get user admin view
* disable user
* enable user
* update controlled profile fields
* mark email as verified

If the project lacks an approved admin authorization surface, controller endpoints must be treated as internal/admin-only baseline and must not imply production-ready public admin access.

---

## XIV. Validation Requirements

Sprint 17 implementation must run or explicitly report inability to run:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
rg -n "UserModel|user\\.repository|mongoose|findOne|findById|updateOne|deleteOne|findOneAndUpdate|findByIdAndUpdate" src/modules/admin
rg -n "RefreshToken|Session|AuthorizationCode|ClientModel" src/modules/admin
rg -n "sign|jwt|issue|generate.*token|revoke|introspect|invalidate.*session" src/modules/admin
rg -n "password_hash|passwordHash|client_secret|clientSecret|refresh_token|access_token|id_token|authorization_code|code_verifier|private.*key|BEGIN PRIVATE KEY|csrf" src/modules/admin
```

If Sprint 17 adds users-owned status support, also run:

```bash
rg -n "status" src/modules/users
rg -n "deleteOne|findOneAndDelete|findByIdAndDelete" src/modules/users src/modules/admin
```

Expected interpretation:

* direct user model/repository access from `admin` is forbidden
* token/session/client model access from `admin` is forbidden
* token issuance/revoke/introspection/session invalidation behavior in `admin` is forbidden
* secret-related matches require manual review and must not show raw secret persistence or logging
* delete operations require review and must not implement hard user deletion

---

## XV. Manual Validation Requirements

Sprint 17 must manually validate:

1. Admin can create an admin-provisioned user through admin service/controller.
2. Admin-provisioned user creation enforces unique email.
3. Admin-provisioned user password is hashed only through users-owned logic.
4. Admin-provisioned user may be created with `email_verified = true`.
5. Admin-provisioned user creation does not store raw password in audit event.
6. Admin can retrieve a bounded user admin view.
7. Admin user view does not expose `password_hash`.
8. Admin can disable user through users-owned status mutation.
9. Admin can enable user through users-owned status mutation.
10. Admin disable/enable does not delete user record.
11. Admin can update only `name` and `avatar_url`.
12. Admin cannot update email through Sprint 17 admin profile update.
13. Admin cannot update `sub`.
14. Admin cannot update internal user id.
15. Admin cannot update `password_hash`.
16. Admin can mark email as verified through admin override.
17. Admin mark-email-verified does not consume or create verification token.
18. Every approved admin mutation emits an audit event.
19. Audit event does not contain raw password, password hash, token, session cookie, client secret, or full request body.
20. Admin does not import `UserModel`, `user.repository`, audit repository, OIDC token/session/client models, or raw persistence.
21. Admin does not mutate token/session/client state.
22. Admin controller remains thin if implemented.
23. No admin dashboard UI is introduced.
24. No broad RBAC/permission system is introduced.

---

## XVI. Merge-Blocking Conditions

Sprint 17 must be blocked or rejected if any of the following occurs:

* `admin-control-contract.md` is not approved before runtime implementation
* `phase-06-sprint-17.md` is not approved before runtime implementation
* admin imports `UserModel`
* admin imports `user.repository`
* admin imports audit repository
* admin imports OIDC token/session/client models
* admin directly mutates user persistence
* admin directly mutates audit persistence
* admin directly mutates token/session/client persistence
* admin implements token issuance
* admin implements token revoke/introspection
* admin invalidates sessions
* admin implements OIDC client management in Sprint 17
* admin hard-deletes user
* admin modifies `sub`
* admin modifies internal user id
* admin modifies `password_hash`
* admin changes user email
* admin resets/changes password on behalf of user
* admin persists or logs raw passwords, tokens, client secrets, session cookies, authorization headers, or full request bodies
* admin records unbounded audit metadata
* admin duplicates users-owned business logic
* admin duplicates audit persistence logic
* Sprint 17 mixes OIDC client management scope from Sprint 18
* validation evidence is missing
* source-of-truth references are missing in PR/report

---

## XVII. Handoff

Sprint 17 hands off to:

* Sprint 18 - OIDC Client Management

Sprint 18 may use the admin orchestration boundary established in Sprint 17, but client metadata lifecycle, client secret handling, redirect URI governance, and client lifecycle audit events remain Sprint 18 scope.
