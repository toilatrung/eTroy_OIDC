# Phase 05 - Token and Session Management

---

## I. Overview

### Objective

Enforce secure token and session lifecycle management after the Phase 04 OIDC core baseline.

Phase 04 completed the client-usable OIDC token and identity output baseline:

- JWT `access_token`
- signed `id_token`
- claims mapping
- `/userinfo`

Phase 05 does not redefine that baseline. Phase 05 extends it with lifecycle behavior for:

- access token lifecycle policy
- refresh token issuance and hashed persistence
- access token renewal through refresh token flow
- refresh token rotation
- refresh token reuse detection
- token revocation
- token introspection, if approved for implementation
- OIDC session management
- SSO behavior across approved clients
- logout hardening, if approved for implementation

Phase 05 must preserve all Phase 04 OIDC boundaries and must not move token/session ownership into `auth`, `users`, or the Phase 03 `token-lifecycle` module.

---

## II. Status

- Status: CLOSED
- Implementation range: Sprint 11 - Sprint 15
- Previous phase: Phase 04 - OIDC Core
- Closure verification basis:
  - Sprint 11 report: `docs/planning/reports/phase-05-sprint-11-report.md`
  - Sprint 12 report: `docs/planning/reports/phase-05-sprint-12-report.md`
  - Sprint 13 report: `docs/planning/reports/phase-05-sprint-13-report.md`
  - Sprint 14 report: `docs/planning/reports/phase-05-sprint-14-report.md`
  - Sprint 15 report: `docs/planning/reports/phase-05-sprint-15-report.md`
  - Consolidated closure report: `docs/planning/reports/phase-05-consolidated-report.md`
  - Merge evidence on `main`:
    - Sprint 11 merge commit: `ebd0c6d`
    - Sprint 12 merge commit: `41044f9`
    - Sprint 13 merge commit: `472d347`
    - Sprint 14 merge commit: `56084b6`
    - Sprint 15 merge commit: `128944c`
- Phase 04 closure basis:
  - Sprint 08 completed `/authorize` validation baseline.
  - Sprint 09 completed `/token` and authorization-code exchange baseline.
  - Sprint 10 completed JWT access token, ID Token, claims mapper, and `/userinfo`.
  - Tester Postman evidence closed prior Sprint 10 runtime validation gaps.

---

## III. Contract Basis

Phase 05 execution is governed by:

- `docs/source-of-truth-index.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/requirements/srs-v1.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-04-oidc-core.md`
- `docs/contracts/oidc/jwt-token-contract.md`
- Phase 05 sprint assignments under `docs/planning/assignments/`
- Phase 05 token/session contracts under `docs/contracts/oidc/`, if created and approved

### JWT Contract Position

`docs/contracts/oidc/jwt-token-contract.md` is the approved Phase 04 / Sprint 10 contract for:

- JWT access token format
- ID Token format
- claims mapping
- `/userinfo`
- RS256 signing and JWKS usage
- Sprint 10 token response without refresh token

The JWT contract is an input baseline for Phase 05. It is not sufficient by itself to authorize Phase 05 implementation of:

- refresh token issuance
- refresh token persistence
- refresh token hashing format
- refresh token TTL
- `grant_type=refresh_token`
- refresh token rotation
- refresh token reuse detection
- revocation
- introspection
- session lifecycle
- SSO
- logout hardening

### Contract Rules

- no contract -> no code
- contract not approved -> no implementation
- `docs/` remains authoritative
- `agent/` remains operational support only
- architecture documents override planning convenience
- Phase 05 must not retroactively redefine Phase 04 deliverables
- Phase 05 implementation must not rely only on the JWT contract when implementing refresh/session lifecycle behavior
- Sprint 11+ assignment documents must lock exact implementation scope before coding

---

## IV. Scope

### Included

- access token lifecycle policy after Phase 04 JWT baseline
- access token renewal through refresh token flow
- refresh token lifecycle management
- refresh token issuance as part of approved OIDC token response behavior
- refresh token hashed persistence only
- refresh token expiration policy
- refresh token rotation
- refresh token reuse detection
- refresh token revocation
- token introspection, if approved by Sprint 13 assignment
- OIDC session management
- SSO behavior across approved clients
- logout hardening, if approved by Sprint 15 assignment
- Redis-backed or approved infrastructure-backed session state
- token/session cleanup jobs, if approved by sprint assignment
- security event hooks or audit handoff points, if approved by sprint assignment

### Excluded

- redefining Sprint 10 JWT access token format
- replacing Phase 04 claims mapper behavior
- replacing Phase 04 `/userinfo` baseline
- Phase 03 identity lifecycle token behavior
- reuse of `token-lifecycle` for OIDC access, refresh, or ID tokens
- user registration
- credential validation ownership
- password reset ownership
- email verification ownership
- direct user identity mutation from `oidc`
- direct user database access from `oidc`
- client management/admin UI
- social login
- MFA
- external identity federation
- unrelated repository-wide formatting cleanup
- broad platform hardening outside token/session lifecycle scope

---

## V. Access Token Lifecycle Position

Phase 04 already provides JWT access token issuance as the OIDC core baseline.

Phase 05 access token lifecycle management should be implemented primarily through refresh-token lifecycle behavior unless a later approved Phase 05 contract explicitly introduces additional stateful access-token controls.

Default Phase 05 position:

- access tokens remain JWTs
- access tokens remain short-lived
- access token expiration is enforced through `exp`
- clients obtain new access tokens through an approved refresh token flow
- refresh tokens carry the durable lifecycle state
- refresh tokens are hashed before persistence
- refresh token rotation, reuse detection, and revocation provide lifecycle control

Phase 05 must not silently introduce stateful access-token revocation, access-token persistence, or access-token blacklist behavior unless explicitly approved by a Phase 05 contract or sprint assignment.

---

## VI. Mandatory Boundary Rules

### 1. OIDC owns OIDC token lifecycle

`modules/oidc` owns:

- access token lifecycle policy
- refresh token lifecycle
- refresh token persistence contract
- refresh token rotation
- revocation
- introspection
- OIDC session lifecycle
- SSO behavior
- logout behavior

### 2. Auth must remain credential validation only

`modules/auth` must not:

- generate access tokens
- generate refresh tokens
- generate ID tokens
- manage sessions
- own OIDC lifecycle state
- persist token state
- implement refresh-token grant behavior
- implement revoke or introspection behavior

### 3. Users remains identity source of truth

`modules/users` owns:

- user identity data
- user lookup contracts
- profile and password mutation

`modules/oidc` may consume user identity only through approved `users` service contracts.

`modules/oidc` must not:

- import `UserModel`
- import `user.repository`
- query user persistence directly
- mutate identity data directly
- store token/session state in user records

### 4. Phase 03 token-lifecycle must not be reused

`modules/token-lifecycle` is limited to non-OIDC identity lifecycle purposes:

- `email_verification`
- `password_reset`

It must not be used for:

- access tokens
- refresh tokens
- ID tokens
- authorization codes
- OIDC sessions
- SSO state
- logout state
- token revocation
- token introspection

### 5. Refresh token persistence must be hashed only

Raw refresh tokens must never be persisted.

Allowed behavior:

- generate raw refresh token for one-time client response
- hash refresh token before storage
- persist only hash and lifecycle metadata
- verify presented refresh token by comparing its hash or equivalent approved secure digest
- redact token values in logs, errors, and reports

Forbidden behavior:

- storing raw refresh token
- logging raw refresh token
- returning persisted token hashes to clients
- exposing token state through direct persistence projection
- using reversible encryption as a substitute for hash-only persistence unless explicitly approved by a contract

---

## VII. Security Rules

Mandatory:

- no raw refresh token persistence
- no token payload logging
- no full bearer token logging
- no refresh token hash exposure
- no session secret exposure
- no direct `process.env` access outside `src/config/`
- no token lifecycle logic in `auth`
- no direct user DB access from `oidc`
- no Phase 03 `token-lifecycle` dependency from `oidc`
- token expiry must be enforced
- refresh token expiry must be enforced
- refresh token rotation must invalidate previous token state when rotation is in scope
- reuse detection must treat reused refresh tokens as a security event when reuse detection is in scope
- logout must invalidate applicable session/token state according to the approved sprint contract
- session cookies, if implemented, must use secure defaults appropriate to environment configuration
- CSRF protection must be applied where relevant to browser-facing session/logout flows

---

## VIII. Sprint Breakdown

| Sprint    | Scope                                    |
| --------- | ---------------------------------------- |
| Sprint 11 | Refresh Token Foundation                 |
| Sprint 12 | Refresh Token Rotation + Reuse Detection |
| Sprint 13 | Revoke + Introspection                   |
| Sprint 14 | Session + SSO                            |
| Sprint 15 | Logout Hardening                         |

---

## IX. Sprint 11 - Refresh Token Foundation

### Goal

Introduce OIDC-owned refresh token issuance and hashed persistence as the secure foundation for access-token renewal.

### Contract Gate

Sprint 11 must not begin implementation until its assignment or a dedicated refresh-token contract defines:

- refresh token issuance rule
- refresh token response behavior
- refresh token storage schema
- refresh token hash strategy
- refresh token TTL
- refresh token expiration behavior
- `grant_type=refresh_token` exchange behavior, if included
- access token renewal behavior
- excluded behavior for rotation, reuse detection, revoke, introspection, session, and logout

### Scope

High-level scope:

- refresh token model or persistence structure under `modules/oidc`
- refresh token repository under `modules/oidc`
- refresh token service behavior under `modules/oidc`
- refresh token generation
- refresh token hashing before persistence
- refresh token expiration metadata
- token response update to include `refresh_token` only when allowed by approved grant/scope policy
- `grant_type=refresh_token` exchange baseline, if approved by Sprint 11 assignment
- access token renewal through refresh token flow, if approved by Sprint 11 assignment
- validation that raw refresh tokens are never persisted

### Deliverable Direction

Sprint 11 should produce the minimal secure refresh-token lifecycle foundation needed by later rotation and revocation sprints.

The expected direction is:

- Phase 04 continues to own JWT access-token issuance baseline.
- Sprint 11 adds refresh-token-backed renewal capability.
- Refresh token state becomes the durable lifecycle control point.
- Access token remains short-lived and JWT-based.

### Boundary Rules

- `oidc` owns refresh token behavior.
- `auth` must not generate refresh tokens.
- `users` must not persist token data.
- `token-lifecycle` must not be reused.
- persistence must store only hash and lifecycle metadata.
- Sprint 11 must not introduce stateful access-token revocation unless explicitly approved.

### Explicitly Excluded

- rotation chains
- reuse detection
- revoke endpoint
- introspection endpoint
- OIDC session management
- SSO behavior
- logout hardening
- broad stateful access-token persistence or blacklist behavior unless explicitly approved

---

## X. Sprint 12 - Refresh Token Rotation + Reuse Detection

### Goal

Harden refresh token renewal by rotating refresh tokens and detecting reuse of invalidated tokens.

### Scope

High-level scope:

- refresh token rotation on successful refresh
- invalidation of previous refresh token after rotation
- token family or lineage tracking if approved by assignment
- reuse detection for already-used or revoked refresh tokens
- security response policy for detected reuse
- defensive handling of concurrent refresh attempts
- lifecycle metadata updates for rotated, used, revoked, or compromised token state

### Deliverable Direction

Sprint 12 should make refresh-token renewal safer by ensuring refresh tokens are not long-lived reusable bearer credentials.

### Boundary Rules

- rotation logic stays inside `oidc`.
- reuse detection must not depend on `auth`.
- user identity must be referenced only by approved subject/user identity reference.
- no direct user DB queries.
- no raw refresh token storage.

### Explicitly Excluded

- revoke endpoint
- introspection endpoint
- session and SSO behavior
- logout hardening
- admin-facing token management

---

## XI. Sprint 13 - Revoke + Introspection

### Goal

Add token lifecycle control surfaces for revocation and, if approved, introspection.

### Scope

High-level scope:

- token revocation endpoint or service contract
- refresh token revocation by presented token
- revocation metadata update
- client validation for revocation requests, if required by approved contract
- introspection endpoint or internal introspection service, if approved
- introspection response contract for active/inactive token state, if approved
- validation that revoked refresh tokens cannot be reused
- validation that introspection does not expose sensitive persistence details

### Deliverable Direction

Sprint 13 should provide controlled token lifecycle management surfaces while keeping sensitive token state private.

### Boundary Rules

- revocation and introspection belong to `oidc`.
- `auth` must not own revoke or introspection.
- `users` must not own token state.
- introspection must not expose raw persistence internals.
- refresh token hashes must never be returned.

### Explicitly Excluded

- session and SSO behavior
- logout hardening
- admin dashboard controls
- broad audit module implementation unless explicitly approved

---

## XII. Sprint 14 - Session + SSO

### Goal

Introduce OIDC-managed session state and SSO behavior across approved clients.

### Scope

High-level scope:

- OIDC session model or Redis-backed session abstraction
- login session establishment after approved authentication
- session lookup for repeated authorize requests
- SSO reuse across approved clients
- session expiration policy
- session invalidation primitives needed by logout
- browser-facing cookie handling, if approved
- secure cookie configuration using centralized config
- CSRF protection where relevant

### Deliverable Direction

Sprint 14 should allow an authenticated user session to be reused safely across approved OIDC clients without reintroducing credential validation into `oidc`.

### Boundary Rules

- `oidc` owns OIDC session lifecycle.
- `auth` validates credentials only and does not own session state.
- Redis usage must go through approved infrastructure abstraction.
- session state must not duplicate full identity records.
- session state must not store passwords, password hashes, raw tokens, or unnecessary user profile data.

### Explicitly Excluded

- logout hardening beyond primitives needed for session invalidation
- admin session management
- MFA
- social login
- external federation

---

## XIII. Sprint 15 - Logout Hardening

### Goal

Harden logout behavior by invalidating applicable OIDC session and token state according to approved policy.

### Scope

High-level scope:

- logout endpoint or service contract
- session invalidation
- refresh token revocation on logout, if approved by assignment
- client redirect validation for logout continuation, if approved
- logout CSRF controls where relevant
- idempotent logout handling
- post-logout behavior for browser clients
- security validation for session/token invalidation results

### Deliverable Direction

Sprint 15 should close the token/session lifecycle loop by ensuring logout produces predictable and secure invalidation behavior.

### Boundary Rules

- logout behavior belongs to `oidc`.
- logout must not mutate user identity.
- logout must not require `auth` to own session state.
- logout must not expose raw token/session internals.
- logout must preserve client redirect validation rules.

### Explicitly Excluded

- client management UI
- admin dashboard
- external identity provider logout
- social login logout
- MFA session policy

---

## XIV. Integration Constraints

Allowed:

- `oidc` may depend on `users` through approved service/account contracts.
- `oidc` may depend on `auth` for credential-validation support only.
- `oidc` may use `infrastructure/redis` for session storage through approved abstraction.
- `oidc` may use `infrastructure/crypto` for secure token hashing/signing utilities where appropriate.
- `oidc` may use `shared` for generic errors/types/validators.
- jobs may call approved `oidc` services for cleanup if explicitly included by sprint assignment.

Forbidden:

- `oidc` importing `UserModel`
- `oidc` importing `user.repository`
- `oidc` using `token-lifecycle` for OIDC token/session behavior
- `auth` generating or persisting tokens
- `auth` managing sessions
- `users` storing token/session state
- `shared` containing OIDC token lifecycle workflows
- `infrastructure` containing OIDC business policy
- direct `process.env` access outside `src/config/`
- raw refresh token persistence

---

## XV. Required Validation Posture

Every Phase 05 sprint must include:

### Static validation

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
```

### Boundary validation

Recommended scans:

```bash
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc
rg -n "token-lifecycle" src/modules/oidc
rg -n "refresh|revoke|rotation|introspection|session|sso|logout" src/modules/auth
rg -n "refresh_token|refreshToken" src/modules/users
rg -n "password_hash|passwordHash" src/modules/oidc
```

Expected posture:

- no direct `process.env` outside config
- no direct user DB access from `oidc`
- no Phase 03 `token-lifecycle` dependency from `oidc`
- no token/session lifecycle behavior in `auth`
- no refresh token ownership in `users`
- no password hash exposure through `oidc`

### Manual validation

Each sprint assignment must define manual validation scenarios for its scope.

Minimum Phase 05 scenario groups:

- refresh token is returned only when allowed
- raw refresh token is never stored
- expired refresh token is rejected
- refresh token can renew access token when approved by assignment
- rotated refresh token invalidates prior token when rotation is in scope
- reused refresh token is detected when reuse detection is in scope
- revoked refresh token is rejected when revocation is in scope
- introspection returns safe active/inactive state only, if implemented
- session can be established, reused, expired, and invalidated when session is in scope
- SSO works only through approved session behavior when SSO is in scope
- logout invalidates applicable state when logout is in scope
- sensitive token/session values never appear in responses, logs, or reports

---

## XVI. Merge-Blocking Conditions

Block Phase 05 PRs if any of these occur:

- no approved assignment or contract basis
- implementation cites only `jwt-token-contract.md` for refresh/session lifecycle behavior
- `/token` returns `refresh_token` without approved Sprint 11 assignment or refresh-token contract
- `grant_type=refresh_token` is implemented without approved Sprint 11 assignment or refresh-token contract
- raw refresh token is persisted
- refresh token hash is exposed
- stateful access-token persistence, blacklist, or revocation appears without explicit Phase 05 contract approval
- `auth` generates tokens or manages sessions
- `users` stores token/session state
- `oidc` directly queries user ownership persistence
- `oidc` reuses Phase 03 `token-lifecycle`
- session state stores passwords, password hashes, raw tokens, or full identity records
- logout mutates identity data
- token/session logic is placed in `shared` or `infrastructure`
- direct `process.env` appears outside `src/config/`
- validation evidence is missing, contradictory, or placeholder-only
- unrelated formatting cleanup is mixed into token/session implementation PRs

---

## XVII. Definition of Done

Phase 05 is complete when:

- refresh tokens are issued only through approved OIDC flow behavior
- refresh tokens are stored hashed only
- refresh token expiration is enforced
- access token renewal through refresh token flow is implemented according to approved contract
- refresh token rotation is implemented
- refresh token reuse detection is implemented
- revocation is implemented for approved token types
- introspection is implemented if approved by Sprint 13 assignment
- OIDC session lifecycle is implemented
- SSO behavior works across approved clients
- logout invalidates applicable session/token state according to approved policy
- `auth` remains credential-validation only
- `users` remains identity source of truth
- `token-lifecycle` remains separate from OIDC token/session behavior
- no boundary violations exist
- required validation evidence is available
- sprint reports document PASS/FAIL/NOT RUN outcomes accurately

---

## XVIII. Output

Phase 05 produces:

- secure OIDC refresh token lifecycle
- access token renewal through refresh token flow
- refresh token rotation and reuse detection
- revoke and introspection surfaces, if approved
- OIDC session lifecycle
- SSO baseline
- logout hardening baseline

This becomes input for Phase 06 platform and governance hardening, including admin controls, audit logging expansion, observability, and operational security hardening.
