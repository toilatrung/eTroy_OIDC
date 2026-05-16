# FE-BE Endpoint Mismatch Remediation Report

Date: 2026-05-16
Repository: `eTroy_OIDC`

## Scope Classification

### Group A - Existing Foundation, Missing Exposure/Mount

1. `GET /api/v1/users/me`
2. `PATCH /api/v1/users/me/profile`
3. `POST /api/v1/users/me/password`
4. `GET /admin/users`

Applied:

- Mounted all Group A routes in `src/app/server.ts`.
- Reused existing `users` and `admin` service logic; no duplicated domain logic.
- Added self-service handlers in `users.controller` with OIDC session-cookie identity resolution.
- Updated password change contract to accept `{ currentPassword, newPassword }` and verify current password before updating hash.
- Kept controller layer thin and response shape as `{ data: ... }`.

### Group B - Missing Use Case/Module Surface

1. `GET /admin/audit-logs`
2. `GET /admin/sessions`
3. `DELETE /api/v1/users/me/sessions`
4. `POST /admin/maintenance/purge-unverified-users`

Applied:

- `GET /admin/audit-logs`: implemented through `audit` ownership with `audit.repository.listEvents` and `audit.service.listEvents`.
- `GET /admin/sessions`: implemented through `oidc` session ownership (`oidc-session` repository/service and `oidc.service` facade).
- `DELETE /api/v1/users/me/sessions`: implemented through OIDC session ownership by invalidating sessions by authenticated subject.
- `POST /admin/maintenance/purge-unverified-users`:
  - implemented as safe dry-run oriented endpoint,
  - computes candidates only,
  - explicitly returns `deletedCount: 0`,
  - blocks destructive behavior by contract and records bounded audit event metadata.

## Canonical Decisions Implemented

1. Self-service user APIs are exposed under `/api/v1/users/me*`.
2. Canonical audit listing route is `GET /admin/audit-logs`.
3. Response shape is `{ data: ... }` for added endpoints.
4. Self-service password change requires `{ currentPassword, newPassword }`.

## Files Changed

- `src/app/server.ts`
- `src/modules/users/user.controller.ts`
- `src/modules/users/user.service.ts`
- `src/modules/users/user.repository.ts`
- `src/modules/password-reset/password-reset.service.ts`
- `src/modules/admin/admin.controller.ts`
- `src/modules/admin/admin.service.ts`
- `src/modules/admin/admin.validator.ts`
- `src/modules/audit/audit.repository.ts`
- `src/modules/audit/audit.service.ts`
- `src/modules/oidc/services/oidc.service.ts`
- `src/modules/oidc/services/oidc-session.service.ts`
- `src/modules/oidc/repositories/oidc-session.repository.ts`

## Validation Evidence

Commands run:

- `npm.cmd run lint` -> PASS
- `npm.cmd run typecheck` -> PASS
- `npm.cmd run build` -> FAILED (environment `EPERM` while writing to `dist/`; no TypeScript type error remained after `typecheck` pass)
- `npm.cmd run format:check` -> FAILED (repository baseline formatting drift remains; includes pre-existing files and touched files)
- `rg -n "process\.env" src --glob "!src/config/**"` -> no matches
- `rg -n "console\.log" src` -> no matches
- `rg -n "password_hash|passwordHash" src/modules src/app` -> expected matches in `users` ownership and redaction patterns
- `rg -n "UserModel|user\.repository" src/modules/admin src/modules/oidc` -> no matches
- `rg -n "client_secret|refresh_token|access_token|id_token|private.*key" src/modules/admin src/modules/users src/app` -> only defensive redaction regex matches in middleware

## Risk Notes

- `POST /admin/maintenance/purge-unverified-users` is intentionally non-destructive under current contract constraints.
- `GET /admin/sessions` uses bounded scan over Redis session keys; behavior is safe but may require indexing optimization at higher scale.
- Build output is currently blocked by local file-lock/permission issue in `dist/`.

## Excluded Scope

- No hard-delete user purge implementation.
- No token payload/secret exposure.
- No direct repository/model ownership violations from `admin` into `users` or OIDC persistence internals.
- No RBAC redesign or auth-system redesign.
