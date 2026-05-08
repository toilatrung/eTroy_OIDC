# Phase 06 / Sprint 17 - Admin Module Controls Report

## I. Execution Summary

Sprint 17 implemented the admin module control baseline for approved admin-controlled user administration.

The implementation keeps `src/modules/admin` as an orchestration module. It coordinates user administration through `src/modules/users/user.service.ts` and records audit events through `src/modules/audit/audit.service.ts`.

## II. Source-of-Truth Basis

- `docs/source-of-truth-index.md`
- `docs/README.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-06-platform-governance-hardening.md`
- `docs/planning/assignments/phase-06-sprint-17.md`
- `docs/contracts/admin/admin-control-contract.md`
- `docs/contracts/audit/audit-event-contract.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/governance/anti-patterns.md`

## III. Implemented Tasks

- Task 85 - Admin Contract Alignment: completed before runtime edits.
- Task 86 - Users Status Support: added users-owned `active` / `disabled` status support and service methods.
- Task 87 - Admin Service: implemented admin orchestration for approved user operations.
- Task 88 - Admin Controller and Validator: implemented thin controller handlers and strict input validation.
- Task 89 - Admin Audit Event Integration: added approved admin user audit event recording.
- Task 90 - Sprint 17 Validation and Report: recorded validation evidence in this report.

## IV. Files Created or Updated

- `src/app/server.ts`
- `src/modules/admin/admin.controller.ts`
- `src/modules/admin/admin.service.ts`
- `src/modules/admin/admin.validator.ts`
- `src/modules/audit/audit.types.ts`
- `src/modules/users/user.model.ts`
- `src/modules/users/user.repository.ts`
- `src/modules/users/user.service.ts`
- `docs/planning/reports/phase-06-sprint-17-report.md`

## V. Validation Evidence

Final command status:

- `npm.cmd run lint`: PASS
- `npm.cmd run format:check`: PASS
- `npm.cmd run typecheck`: PASS
- `npm.cmd run build`: PASS
- `SPRINT17_ADMIN_HARNESS=PASS`: PASS

Boundary scans:

- `rg -n "process\\.env" src --glob "!src/config/**"`: PASS, no matches.
- `rg -n "console\\.log" src`: PASS, no matches.
- `rg -n "UserModel|user\\.repository|mongoose|findOne|findById|updateOne|deleteOne|findOneAndUpdate|findByIdAndUpdate" src/modules/admin`: PASS, no matches.
- `rg -n "RefreshToken|Session|AuthorizationCode|ClientModel" src/modules/admin`: PASS, no matches.
- `rg -n "sign|jwt|issue|generate.*token|revoke|introspect|invalidate.*session" src/modules/admin`: PASS, no matches.
- `rg -n "password_hash|passwordHash|client_secret|clientSecret|refresh_token|access_token|id_token|authorization_code|code_verifier|private.*key|BEGIN PRIVATE KEY|csrf" src/modules/admin`: PASS, no forbidden matches.
- `rg -n "deleteOne|findOneAndDelete|findByIdAndDelete" src/modules/users src/modules/admin`: PASS, no matches.
- `rg -n "status" src/modules/users`: PASS, expected users-owned status matches.
- `rg -n "password_hash|passwordHash" src/modules/users src/modules/admin`: PASS WITH REVIEW, expected users-owned password hash handling in `src/modules/users`; no admin password hash mutation.
- `rg -n "admin\\.user\\.created|admin\\.user\\.disabled|admin\\.user\\.enabled|admin\\.user\\.profile\\.updated|admin\\.user\\.email_verified\\.marked" docs/contracts/audit src/modules`: PASS, approved event vocabulary present.

## VI. Manual Validation Matrix

- Admin-provisioned user creation is implemented through `users` service only.
- Duplicate email rejection remains users-owned through existing uniqueness checks and repository error normalization.
- Admin-provisioned passwords are hashed inside `users` service logic.
- Admin-provisioned creation may set `email_verified = true`.
- Admin audit metadata does not include raw password or password hash.
- Service-level harness confirmed raw admin-provisioned password is not passed to audit metadata.
- Bounded admin user view is implemented and excludes `password_hash`.
- Disable and enable use users-owned `status` mutation.
- Disable and enable do not delete user records.
- Controlled profile update only accepts `name` and `avatar_url`.
- Email change, `sub` mutation, internal id mutation, and `password_hash` mutation are rejected by strict admin validation.
- Password reset/change on behalf of user is not implemented.
- Email verification override marks the users-owned field without creating or consuming verification tokens.
- Approved admin mutations attempt audit events through `audit.service`.
- Audit actor uses safe `adminSub`; audit subject uses safe target user `sub`.
- Admin service imports users service and audit service only for cross-module operations.
- Admin controller remains thin.
- No admin dashboard UI, RBAC framework, token/session controls, or client management behavior was introduced.

## VII. Excluded Scope Confirmation

Not implemented:

- OIDC token issuance
- Token revocation
- Token introspection
- Session invalidation
- OIDC client management
- RBAC framework
- Admin dashboard UI
- Hard delete
- Email change
- `sub` mutation
- Password reset/change
- Broad refactors
- Runtime architecture outside Sprint 17 scope

## VIII. Risks, Limitations, and Deferred Work

- Sprint 17 does not implement a production RBAC framework by contract. Admin endpoints require an internal `x-admin-sub` actor reference for attribution, not authorization.
- Disabled-user downstream effects on login, token, and session behavior remain out of Sprint 17 scope.
- OIDC client lifecycle remains deferred to Sprint 18.

## IX. Handoff to Sprint 18

Sprint 18 may build on the admin orchestration boundary, but OIDC client metadata lifecycle must remain under the Sprint 18 client-management contract and must not be inferred from Sprint 17.
