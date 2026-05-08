# Phase 06 / Sprint 17 - Admin Module Controls Assignment

---

## I. Assignment Summary

* Phase: Phase 06 - Platform and Governance Hardening
* Sprint: Sprint 17 - Admin Module Controls
* Task range:

  * Task 85 - Admin Contract Alignment
  * Task 86 - Users Status Support
  * Task 87 - Admin Service
  * Task 88 - Admin Controller and Validator
  * Task 89 - Admin Audit Event Integration
  * Task 90 - Sprint 17 Validation and Report
* Owner module: `src/modules/admin`
* Supporting modules:

  * `src/modules/users`
  * `src/modules/audit`
* Required contracts:

  * `docs/contracts/admin/admin-control-contract.md`
  * `docs/contracts/audit/audit-event-contract.md`
* Assignment path: `docs/planning/assignments/phase-06-sprint-17.md`
* Status: Approved for Sprint 17 runtime implementation

---

## II. Runtime Start Conditions

Sprint 17 runtime implementation is approved to start only when all execution conditions remain true:

* `docs/contracts/admin/admin-control-contract.md` exists and is approved.
* `docs/planning/assignments/phase-06-sprint-17.md` exists and is approved.
* `docs/contracts/audit/audit-event-contract.md` is present and approved.
* Sprint 16 audit foundation is merged, closed, and present in `main`.
* Runtime work begins from updated `main` on a dedicated Sprint 17 feature branch.
* Implementation packet is produced before coding.

This source-intake cleanup does not start runtime implementation. Before Sprint 17 coding:

* create a dedicated Sprint 17 runtime branch from updated `main`
* produce the implementation packet before coding
* do not edit `src/` for behavior on the source-intake cleanup branch
* do not implement admin runtime outside the dedicated runtime branch
* do not create Sprint 17 report until Sprint 17 runtime execution

---

## III. Source-of-Truth Basis

Sprint 17 must use the following documents:

* `docs/source-of-truth-index.md`
* `docs/README.md`
* `docs/architecture/system-overview.md`
* `docs/architecture/module-boundaries.md`
* `docs/architecture/source-tree.md`
* `docs/architecture/detailed-source-tree.md`
* `docs/requirements/srs-v1.md`
* `docs/planning/master-execution-plan.md`
* `docs/planning/phases/phase-06-platform-governance-hardening.md`
* `docs/contracts/admin/admin-control-contract.md`
* `docs/contracts/audit/audit-event-contract.md`
* `docs/planning/assignments/phase-06-sprint-17.md`
* `docs/planning/reports/phase-06-sprint-16-report.md`
* `docs/governance/git-rules.md`
* `docs/governance/pr-template.md`
* `docs/governance/review-checklist.md`
* `docs/governance/anti-patterns.md`
* `agent/current-context.md`
* `agent/session-history.md`
* `agent/prompts/sprint-task-execution.md`

Authority rules:

* `docs/` is authoritative.
* `agent/` is operational support only.
* `source-tree.md` is primary over `detailed-source-tree.md`.
* If this assignment conflicts with `docs/contracts/admin/admin-control-contract.md`, the contract wins.
* If this assignment conflicts with architecture documents, architecture documents win unless an approved architecture update is included.
* No implementation may exceed approved contract and assignment scope.

---

## IV. Sprint Objective

Implement the admin module control baseline for controlled user administration.

Sprint 17 establishes `src/modules/admin` as an orchestration module. It must coordinate approved user administration actions through `users` service contracts and record audit events through the approved `audit` service contract.

Sprint 17 must not make `admin` the owner of identity data, user persistence, audit persistence, OIDC token/session behavior, or OIDC client metadata.

---

## V. Included Scope

Sprint 17 includes:

* admin service baseline
* admin controller baseline
* admin validator baseline
* admin-provisioned user creation
* bounded user admin view retrieval
* user disable orchestration
* user enable orchestration
* controlled profile update orchestration:

  * `name`
  * `avatar_url`
* admin email verification override
* audit event recording for approved admin user actions
* minimal users-owned status support if missing
* minimal users-owned service methods required by admin orchestration
* Sprint 17 report and validation evidence

---

## VI. Excluded Scope

Sprint 17 excludes:

* hard delete user
* edit `sub`
* edit internal user id
* edit `password_hash` directly
* change user email
* reset/change password on behalf of user
* token revocation admin control
* session invalidation admin control
* OIDC client creation
* OIDC client update
* OIDC client disable
* OIDC client secret rotation
* OIDC client metadata lifecycle implementation
* direct token/session/client persistence mutation
* admin dashboard UI
* broad RBAC or permission matrix
* super-admin framework
* audit query/read API
* audit dashboard
* external SIEM/log pipeline
* observability hardening
* key rotation
* broad formatting cleanup
* unrelated refactors

---

## VII. Owner Module and Allowed File Areas

### Primary owner

* `src/modules/admin`

### Supporting users-owned changes

Sprint 17 may update `src/modules/users` only for minimal users-owned support needed by approved admin orchestration:

* user status field
* user status type
* user status model/repository/service handling
* users service method for admin-provisioned creation if existing creation method is insufficient
* users service method for status update
* users service method for admin-safe view if existing retrieval shape is insufficient
* users service method for admin email-verified override if existing method requires clearer semantics

These changes must preserve `users` ownership.

### Supporting audit-owned changes

Sprint 17 may update audit contract vocabulary before runtime only if needed.

Runtime code should use the existing Sprint 16 audit service foundation.

Sprint 17 must not modify audit repository/model unless a contract-backed compatibility issue is found and explicitly reported.

---

## VIII. Expected Deliverables

Required runtime deliverables after approval:

* `src/modules/admin/admin.service.ts`
* `src/modules/admin/admin.controller.ts`
* `src/modules/admin/admin.validator.ts`
* `docs/planning/reports/phase-06-sprint-17-report.md`

Likely supporting users-owned deliverables if status support is missing:

* `src/modules/users/user.model.ts`
* `src/modules/users/user.repository.ts`
* `src/modules/users/user.service.ts`

Optional only if existing project patterns require it:

* `src/modules/admin/admin.types.ts`

Do not create:

* `src/modules/admin/admin.repository.ts`
* `src/modules/admin/admin.model.ts`
* `src/modules/admin/admin-auth.service.ts`
* `src/modules/audit/audit.controller.ts`
* admin dashboard UI files
* OIDC client management files
* token/session admin control files

---

## IX. Task Breakdown

### Task 85 - Admin Contract Alignment

Goal:

* confirm approved Sprint 17 contract and assignment
* inspect runtime state before coding
* produce implementation packet

Required checks:

* confirm `admin-control-contract.md` is approved
* confirm `phase-06-sprint-17.md` is approved
* confirm audit contract is approved
* confirm Sprint 16 audit foundation exists in `src/modules/audit`
* confirm `src/modules/admin/admin.service.ts` current state
* inspect users service capabilities
* inspect audit service API
* identify exact minimal users-owned changes required

Acceptance criteria:

* implementation packet exists in agent response before coding
* included/excluded scope is confirmed
* no runtime edits are made before the packet is confirmed

---

### Task 86 - Users Status Support

Goal:

* add minimal users-owned support required for admin disable/enable.

Allowed implementation:

* add user status field if missing
* allowed statuses:

  * `active`
  * `disabled`
* set default status to `active`
* add users-owned service/repository method for controlled status mutation
* ensure status changes happen only through users-owned logic

Rules:

* `admin` must not own status persistence
* `admin` must not mutate user model/repository directly
* no hard delete behavior
* no token/session invalidation behavior
* no login/token behavior changes unless separately approved

Acceptance criteria:

* users model supports status
* users service exposes controlled enable/disable or status update method
* repository mutation remains inside `users`
* admin can call users service only
* no direct user persistence access from `admin`

---

### Task 87 - Admin Service

Goal:

* implement `admin.service.ts` as the orchestration boundary for approved admin user operations.

Required service operations:

* create admin-provisioned user
* get user admin view
* disable user
* enable user
* update controlled profile fields:

  * `name`
  * `avatar_url`
* mark email as verified

Rules:

* service must call users service for user operations
* service must call audit service for audit events
* service must not import user model/repository
* service must not import audit repository
* service must not import OIDC token/session/client models
* service must not implement password hashing directly
* service must not implement email uniqueness directly if users service owns it
* service must not mutate token/session/client state
* service must not expose raw password, password hash, tokens, session cookies, or client secrets

Acceptance criteria:

* all approved admin operations are implemented through service orchestration
* unsupported fields are rejected
* immutable fields cannot be modified
* audit events are recorded for approved admin mutations
* audit failures follow Sprint 16 audit service behavior and do not become business state

---

### Task 88 - Admin Controller and Validator

Goal:

* expose a thin admin API/controller baseline for approved Sprint 17 admin operations.

Required controller behavior:

* parse request input
* call validator
* call admin service
* map service result to HTTP response
* keep controller thin

Approved API surface:

* create admin-provisioned user
* get user admin view
* disable user
* enable user
* update controlled profile fields
* mark email as verified

Validator responsibilities:

* validate required parameters
* validate controlled profile update allowlist
* reject unsupported fields
* reject immutable fields:

  * `sub`
  * internal user id
  * `password_hash`
* reject email change input
* reject password reset/change input
* reject arbitrary pass-through payloads

Rules:

* controller must not access repositories
* controller must not implement business logic
* controller must not implement broad RBAC
* controller must not imply production-ready public admin access if no admin authorization mechanism exists
* controller endpoints must be treated as admin-only/internal baseline under Sprint 17 assumptions

Acceptance criteria:

* controller exists and delegates to service
* validator rejects forbidden inputs
* no repository/model access appears in controller
* no broad permission system is introduced

---

### Task 89 - Admin Audit Event Integration

Goal:

* record audit events for every approved admin mutation.

Required events:

* `admin.user.created`
* `admin.user.disabled`
* `admin.user.enabled`
* `admin.user.profile.updated`
* `admin.user.email_verified.marked`

Optional denial/security event if implemented:

* `security.unauthorized_admin_action`

Rules:

* event vocabulary must be approved before runtime uses it
* admin must call audit service, not audit repository
* audit actor must represent admin safely
* audit subject must represent target user safely
* audit metadata must be bounded
* audit must not include raw password
* audit must not include password hash
* audit must not include tokens
* audit must not include session cookies
* audit must not include client secrets
* audit must not include full request body
* audit must not include full user database record

Acceptance criteria:

* each approved admin mutation attempts audit recording
* audit payload uses safe actor/subject references
* audit payload excludes forbidden values
* audit failure does not expose secrets
* audit failure handling remains consistent with Sprint 16 audit behavior

---

### Task 90 - Sprint 17 Validation and Report

Goal:

* validate Sprint 17 implementation and record evidence.

Required report:

* `docs/planning/reports/phase-06-sprint-17-report.md`

Report must include:

* execution summary
* source-of-truth basis
* implemented tasks
* files created or updated
* validation evidence
* manual validation matrix
* excluded scope confirmation
* risks, limitations, deferred work
* handoff to Sprint 18

Acceptance criteria:

* validation commands are run or explicitly marked NOT RUN with reason
* manual checks are documented
* global format drift, if present, is documented consistently
* scoped touched-file formatting is verified if global format check fails
* report does not claim unsupported runtime behavior

---

## X. Allowed Dependencies

Admin module may depend on:

* `src/modules/users/user.service`
* `src/modules/audit/audit.service`
* `src/shared/errors`
* generic TypeScript and Express types already used by the project
* project validation utilities if already approved and generic

Users module may depend on:

* existing database abstraction
* existing crypto/hash abstraction
* existing shared errors/types

Audit module dependency should remain unchanged unless a contract-backed compatibility issue is found.

---

## XI. Forbidden Dependencies

`src/modules/admin` must not depend on:

* `UserModel`
* `user.repository`
* audit repository
* audit event model direct persistence
* OIDC refresh token repository/model
* OIDC session repository/model
* OIDC authorization code repository/model
* OIDC client model/repository
* raw Mongoose user queries
* raw database connection for user mutation
* token signing utilities
* token issuing providers
* session invalidation services
* client secret handling implementation
* direct `process.env`

Admin must not import or implement:

* JWT signing
* token issuance
* token revocation
* token introspection
* session invalidation
* client management lifecycle
* password hashing
* email verification token lifecycle
* password reset token lifecycle

---

## XI. Security-Critical Rules

Sprint 17 must enforce:

* no plain password persistence
* no password hash exposure in admin view
* no raw password in audit events
* no raw temporary credential in audit events
* no token/session/client secret exposure
* no direct mutation of users persistence from admin
* no hard delete user
* no `sub` mutation
* no internal user id mutation
* no `password_hash` mutation
* no email change
* no password reset/change on behalf of user
* admin-provisioned user password must be hashed through users-owned logic
* admin-provisioned user may set `email_verified = true`
* email-verified admin override must not consume verification tokens
* disable/enable must be users-owned status mutation only
* audit metadata must be bounded and redaction-safe

---

## XII. Required Validation Commands

Run:

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
rg -n "deleteOne|findOneAndDelete|findByIdAndDelete" src/modules/users src/modules/admin
```

If Sprint 17 touches `users`, also run:

```bash
rg -n "status" src/modules/users
rg -n "password_hash|passwordHash" src/modules/users src/modules/admin
```

If Sprint 17 updates audit vocabulary, also run:

```bash
rg -n "admin\\.user\\.created|admin\\.user\\.disabled|admin\\.user\\.enabled|admin\\.user\\.profile\\.updated|admin\\.user\\.email_verified\\.marked" docs/contracts/audit src/modules
```

Expected interpretation:

* `status` matches in `users` are expected if implementing disable/enable support.
* `password_hash` matches in `users` may be expected where users owns credential persistence.
* `password_hash` matches in `admin` are not allowed except validator rejection strings or scan-reviewed forbidden-field constants.
* delete operation matches require review and must not implement hard user deletion.
* token/session/client matches in `admin` are forbidden unless they are scan-reviewed denial strings and do not implement behavior.

---

## XIII. Manual Validation Checks

Sprint 17 must manually validate:

1. Admin can create admin-provisioned user.
2. Admin-provisioned user creation enforces duplicate email rejection.
3. Admin-provisioned user password is hashed through users-owned logic.
4. Admin-provisioned user may be created with `email_verified = true`.
5. Admin-provisioned user creation does not store raw password in audit.
6. Admin can get bounded user admin view.
7. User admin view does not expose `password_hash`.
8. Admin can disable user.
9. Admin can enable user.
10. Disable/enable uses users-owned status.
11. Disable/enable does not hard-delete user.
12. Admin can update `name`.
13. Admin can update `avatar_url`.
14. Admin cannot update email.
15. Admin cannot update `sub`.
16. Admin cannot update internal user id.
17. Admin cannot update `password_hash`.
18. Admin cannot reset/change password on behalf of user.
19. Admin can mark email as verified.
20. Mark email verified does not create verification token.
21. Mark email verified does not consume verification token.
22. Every approved admin mutation records or attempts to record an audit event.
23. Audit event actor identifies admin safely.
24. Audit event subject identifies target user safely.
25. Audit metadata does not include raw password.
26. Audit metadata does not include password hash.
27. Audit metadata does not include tokens.
28. Audit metadata does not include session cookies.
29. Audit metadata does not include full request body.
30. Admin service imports users service and audit service only for cross-module operations.
31. Admin does not import `UserModel`.
32. Admin does not import `user.repository`.
33. Admin does not import audit repository.
34. Admin does not import OIDC token/session/client models.
35. Admin controller remains thin.
36. Admin validator rejects unsupported fields.
37. No admin dashboard UI is introduced.
38. No RBAC/permission system is introduced.
39. No token/session/client management behavior is introduced.
40. Sprint 17 report records validation evidence.

---

## XIV. Branch and Commit Guidance

Recommended runtime branch:

* `feature/admin-sprint17-controls`

Commit message guidance:

* `feat(admin): implement Sprint 17 user controls`
* or split if needed:

  * `feat(users): add controlled user status support`
  * `feat(admin): add user control orchestration`
  * `docs(planning): add Sprint 17 validation report`

All commits must remain within Sprint 17 scope.

Do not commit unrelated formatting cleanup.

---

## XV. Handoff Target

Sprint 17 hands off to:

* Sprint 18 - OIDC Client Management

Sprint 18 may use the admin orchestration boundary established by Sprint 17, but OIDC client metadata lifecycle remains Sprint 18 scope.

Sprint 17 must not implement Sprint 18 client management behavior early.
