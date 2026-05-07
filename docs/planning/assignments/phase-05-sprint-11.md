# Phase 05 / Sprint 11 - Refresh Token Foundation

## I. Assignment Summary

- Phase: Phase 05 - Token and Session Management
- Sprint: Sprint 11 - Refresh Token Foundation
- Task Range:
  - Task 46 - Refresh Token Contract Alignment
  - Task 47 - Refresh Token Persistence
  - Task 48 - Refresh Token Service
  - Task 49 - Token Endpoint Refresh Token Issuance
  - Task 50 - Refresh Token Grant Baseline
  - Task 51 - Sprint 11 Validation and Report
- Owner Module: `src/modules/oidc`
- Branch Name: `feature/oidc-sprint11-refresh-token-foundation`

---

## II. Objective

Implement the OIDC-owned refresh token foundation required for access-token renewal after the Phase 04 JWT access token baseline.

Sprint 11 must introduce secure refresh token issuance, hashed persistence, expiration enforcement, and refresh-token grant baseline without implementing rotation, reuse detection, revoke, introspection, session, SSO, or logout behavior.

---

## III. Source-of-Truth Basis

Sprint 11 must follow:

- `docs/source-of-truth-index.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/requirements/srs-v1.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-04-oidc-core.md`
- `docs/planning/phases/phase-05-token-session-management.md`
- `docs/contracts/oidc/jwt-token-contract.md`
- `docs/contracts/oidc/refresh-token-contract.md`
- `docs/governance/git-rules.md`
- `docs/governance/pr-template.md`
- `docs/governance/review-checklist.md`
- `docs/governance/anti-patterns.md`

`docs/contracts/oidc/jwt-token-contract.md` remains the Phase 04 token format baseline. Sprint 11 must not redefine JWT access token or ID Token behavior.

`docs/contracts/oidc/refresh-token-contract.md` is the required contract for Sprint 11 implementation.

---

## IV. Included Scope

Sprint 11 includes:

- refresh token model or persistence schema under `src/modules/oidc`
- refresh token repository under `src/modules/oidc`
- refresh token service under `src/modules/oidc`
- opaque refresh token generation
- refresh token hash persistence
- refresh token expiration metadata
- refresh token validation by hash
- `/token` authorization-code exchange response update to include `refresh_token`
- `/token` refresh-token grant baseline
- new JWT access token issuance from valid refresh token
- scope preservation from original authorization grant
- client match validation during refresh-token grant
- deterministic error behavior for invalid refresh token cases
- Sprint 11 report creation

---

## V. Excluded Scope

Sprint 11 excludes:

- refresh token rotation
- refresh token family tracking
- refresh token reuse detection
- refresh token revocation endpoint
- token introspection endpoint
- OIDC session management
- SSO behavior
- logout hardening
- admin token management
- audit module expansion
- stateful access token persistence
- access token blacklist behavior
- Phase 03 `token-lifecycle` reuse
- direct user DB access from `oidc`
- changes to `auth` ownership
- changes to `users` token/session ownership
- unrelated repository-wide formatting cleanup

---

## VI. Expected Deliverables

### Implementation deliverables

- `src/modules/oidc/refresh-token.model.ts`
- `src/modules/oidc/refresh-token.repository.ts`
- `src/modules/oidc/refresh-token.service.ts`
- update existing `src/modules/oidc/oidc.service.ts`
- update existing `src/modules/oidc/oidc.controller.ts`
- update app route wiring only if required by existing `/token` request path
- update config only if refresh token TTL must be centralized
- create `docs/planning/reports/phase-05-sprint-11-report.md`

### Contract deliverable

- `docs/contracts/oidc/refresh-token-contract.md`

Do not create a separate refresh-token module outside `modules/oidc`.

---

## VII. Task Details

### Task 46 - Refresh Token Contract Alignment

#### Objective

Confirm Sprint 11 implementation basis before coding.

#### Required work

- read all required source-of-truth documents
- confirm `jwt-token-contract.md` is Phase 04 baseline only
- confirm `refresh-token-contract.md` governs Sprint 11
- identify current `/token` implementation points
- identify existing JWT access-token issuance function/service to reuse
- stop before coding if contract or source-tree placement is unclear

#### Acceptance criteria

- implementation packet exists before coding
- included and excluded scope are clear
- no Phase 05 work starts without approved refresh token contract

### Task 47 - Refresh Token Persistence

#### Objective

Add OIDC-owned refresh token persistence with hashed token storage only.

#### Required work

- create refresh token persistence schema/model under `src/modules/oidc`
- create repository for create/find/update operations
- persist `tokenHash`, `subject`, `clientId`, `scope`, `issuedAt`, `expiresAt`, metadata timestamps
- ensure raw refresh token is never stored
- avoid storing access token, ID Token, password, password hash, or full user profile

#### Acceptance criteria

- refresh token record stores hash only
- refresh token record includes expiry metadata
- repository hides persistence details from controller
- no user identity persistence is accessed directly from `oidc`
- no refresh token data is stored in `users`

### Task 48 - Refresh Token Service

#### Objective

Implement refresh token generation, hashing coordination, and validation behavior.

#### Required work

- generate high-entropy opaque refresh token
- hash refresh token before repository persistence
- create refresh token record after successful authorization-code exchange
- validate presented refresh token by hash lookup/comparison
- reject expired refresh token
- reject client mismatch
- return safe service-level result for access-token renewal
- ensure raw token and hash are never logged or exposed

#### Acceptance criteria

- service returns raw refresh token only at issuance boundary
- service never returns token hash to controller response
- expired token validation fails
- unknown token validation fails with non-revealing error
- malformed token validation fails with non-revealing error

### Task 49 - Token Endpoint Refresh Token Issuance

#### Objective

Add `refresh_token` to successful authorization-code token exchange response.

#### Required work

- update token exchange flow after successful authorization code validation
- create refresh token record for the validated subject/client/scope
- include raw opaque refresh token in `/token` response
- preserve existing Sprint 10 `access_token`, `id_token`, `token_type`, and `expires_in`
- ensure refresh token is not embedded into JWT claims

#### Acceptance criteria

- successful authorization-code exchange returns `refresh_token`
- access token remains JWT per Sprint 10 contract
- ID Token remains signed per Sprint 10 contract
- refresh token is opaque
- only refresh token hash is persisted
- response does not expose token hash

### Task 50 - Refresh Token Grant Baseline

#### Objective

Support access-token renewal through `grant_type=refresh_token`.

#### Required work

- update `/token` handling to accept `grant_type=refresh_token`
- validate client and presented refresh token
- reject expired, malformed, unknown, or client-mismatched refresh token
- issue new JWT access token using existing JWT contract behavior
- preserve scope from refresh token record
- do not return rotated refresh token in Sprint 11
- do not implement reuse detection in Sprint 11
- do not implement revoke/introspection/session/logout in Sprint 11

#### Acceptance criteria

- valid refresh token returns new JWT access token
- new access token verifies under existing JWT/JWKS rules
- returned scope does not exceed stored refresh token scope
- invalid refresh token cases are rejected
- Sprint 11 does not rotate refresh tokens
- Sprint 11 does not persist access tokens

### Task 51 - Sprint 11 Validation and Report

#### Objective

Validate Sprint 11 and record evidence.

#### Required work

- run required static validation commands
- run boundary scans
- run manual/runtime scenarios
- create Sprint 11 report
- record `PASS` / `FAIL` / `NOT RUN` accurately
- include risks and limitations
- include handoff to Sprint 12

#### Acceptance criteria

- report exists at `docs/planning/reports/phase-05-sprint-11-report.md`
- validation evidence is command-based and reproducible
- boundary/security checks are explicit
- Sprint 12 handoff is documented

---

## VIII. Allowed Dependencies

Allowed:

- `src/modules/oidc`
- `src/modules/users` through approved service/account contracts only
- `src/infrastructure/crypto` through approved utilities
- `src/shared` for generic errors/types/validators
- `src/config` for centralized TTL/config values
- existing app route wiring for `/token`

---

## IX. Forbidden Dependencies

Forbidden:

- `oidc` importing `UserModel`
- `oidc` importing `user.repository`
- `oidc` depending on `token-lifecycle`
- `auth` generating or validating refresh tokens
- `users` storing refresh token state
- `shared` containing refresh-token workflow logic
- `infrastructure` containing refresh-token business policy
- direct `process.env` outside `src/config`
- new top-level refresh-token module
- unrelated infrastructure expansion

---

## X. Security-Critical Rules

Mandatory:

- raw refresh token must never be persisted
- raw refresh token must never be logged
- refresh token hash must never be returned
- refresh token must be opaque, not JWT
- refresh token must not contain claims
- refresh token must not be embedded in access token or ID Token
- expired refresh token must be rejected
- client mismatch must be rejected
- renewed access token scope must not exceed original granted scope
- password and `password_hash` must never appear in refresh token records or OIDC responses
- Sprint 11 must not implement rotation/reuse/revoke/introspection/session/logout early

---

## XI. Required Validation

### Static validation

Required commands:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
```

### Boundary scans

Required commands:

```bash
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc
rg -n "token-lifecycle" src/modules/oidc
rg -n "refresh|refresh_token|refreshToken|grant_type=refresh_token" src/modules/auth
rg -n "refresh_token|refreshToken|tokenHash" src/modules/users
rg -n "password_hash|passwordHash" src/modules/oidc
rg -n "revocation|introspection|session|sso|logout|reuse|rotation" src/modules/oidc
```

Expected results:

- no direct `process.env` outside config
- no direct users DB access from `oidc`
- no `token-lifecycle` dependency from `oidc`
- no refresh-token behavior in `auth`
- no refresh-token ownership in `users`
- no password hash exposure in `oidc`
- no Sprint 12+ behavior introduced early

---

## XII. Manual Validation Scenarios

Required scenarios:

- authorization-code exchange returns `access_token`, `id_token`, `token_type`, `expires_in`, and `refresh_token`
- refresh token is opaque and not JWT
- raw refresh token is not persisted
- persisted refresh token record stores hash only
- valid `grant_type=refresh_token` returns a new JWT access token
- renewed JWT access token verifies against JWKS/public key
- renewed JWT access token uses original subject/client/scope
- expired refresh token is rejected
- malformed refresh token is rejected
- unknown refresh token is rejected
- client mismatch is rejected
- refresh token hash is never returned in response
- raw refresh token does not appear in logs or error payloads
- Sprint 11 does not rotate refresh tokens
- Sprint 11 does not implement revoke, introspection, session, SSO, or logout

---

## XIII. PR and Report Requirements

Sprint 11 PR must include:

- phase/sprint/task references
- source-of-truth references
- refresh token contract reference
- included scope
- excluded scope
- file list
- validation commands with `PASS` / `FAIL` / `NOT RUN`
- boundary scan evidence
- manual validation evidence
- security notes
- risks and limitations
- handoff to Sprint 12

Sprint 11 report path:

```text
docs/planning/reports/phase-05-sprint-11-report.md
```

---

## XIV. Merge-Blocking Conditions

Block Sprint 11 if:

- refresh token contract is missing or not referenced
- Sprint 11 assignment is missing or not referenced
- raw refresh token is persisted
- refresh token hash is exposed
- refresh token is implemented as JWT
- refresh token behavior appears in `auth`
- refresh token state appears in `users`
- `oidc` imports user model or repository
- `oidc` uses Phase 03 `token-lifecycle`
- access token renewal broadens scope
- rotation/reuse detection appears before Sprint 12
- revoke/introspection/session/logout appears before approved sprint
- validation evidence is missing
- unrelated formatting cleanup is mixed into the implementation PR

---

## XV. Definition of Done

Sprint 11 is complete when:

- `refresh-token-contract.md` is approved and referenced
- refresh token model/repository/service are implemented under `modules/oidc`
- authorization-code exchange can return opaque `refresh_token`
- refresh token is stored hashed only
- refresh token expiration is enforced
- refresh-token grant can issue a new JWT access token
- renewed access token follows `jwt-token-contract.md`
- no raw refresh token is persisted, logged, or exposed
- no token behavior is added to `auth`
- no token state is added to `users`
- no `token-lifecycle` dependency appears in `oidc`
- no Sprint 12+ behavior is introduced early
- all required validation is recorded
- Sprint 11 report is created

---

## XVI. Handoff to Sprint 12

Sprint 12 should start from the Sprint 11 refresh-token foundation and add:

- refresh token rotation
- token lineage or family tracking, if approved
- reuse detection
- compromised-token response behavior
- defensive concurrent refresh handling
- stronger lifecycle metadata transitions

Sprint 12 must not start until its assignment or contract is approved.
