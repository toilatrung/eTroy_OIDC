# Phase 05 / Sprint 14 - Session + SSO

---

## I. Assignment Summary

* Phase: Phase 05 - Token and Session Management
* Sprint: Sprint 14 - Session + SSO
* Task Range:

  * Task 64 - Session/SSO Contract Alignment
  * Task 65 - OIDC Session Persistence / Storage Abstraction
  * Task 66 - Session Service and Cookie Behavior
  * Task 67 - Session Creation after Approved Authentication
  * Task 68 - Session Lookup and SSO Reuse for `/authorize`
  * Task 69 - Session Invalidation Primitive
  * Task 70 - Sprint 14 Validation and Report
* Owner Module: `src/modules/oidc`
* Branch Name: `feature/oidc-sprint14-session-sso`

---

## II. Objective

Implement OIDC-managed browser session and SSO behavior on top of the merged Sprint 13 revoke/introspection baseline.

Sprint 14 must allow an authenticated OIDC browser session to be created, stored, validated, reused across approved clients, expired, and invalidated through a controlled service primitive.

Sprint 14 must preserve all Sprint 11 through Sprint 13 token lifecycle guarantees:

* refresh tokens remain opaque
* refresh tokens are stored hashed only
* refresh-token grant continues to rotate refresh tokens
* consumed-token reuse remains detected
* compromised family handling remains intact
* concurrent refresh hardening remains intact
* revocation remains enforced
* introspection remains non-revealing and safe
* access tokens remain short-lived JWTs
* access tokens are not persisted or blacklisted
* `auth` remains credential validation only
* `users` remains identity source of truth
* `token-lifecycle` is not reused for OIDC tokens or sessions

---

## III. Source-of-Truth Basis

Sprint 14 must follow:

* `docs/source-of-truth-index.md`
* `docs/architecture/system-overview.md`
* `docs/architecture/module-boundaries.md`
* `docs/architecture/source-tree.md`
* `docs/architecture/detailed-source-tree.md`
* `docs/requirements/srs-v1.md`
* `docs/planning/master-execution-plan.md`
* `docs/planning/phases/phase-05-token-session-management.md`
* `docs/contracts/oidc/jwt-token-contract.md`
* `docs/contracts/oidc/refresh-token-contract.md`
* `docs/contracts/oidc/refresh-token-rotation-contract.md`
* `docs/contracts/oidc/token-revoke-introspection-contract.md`
* `docs/contracts/oidc/session-sso-contract.md`
* `docs/planning/assignments/phase-05-sprint-11.md`
* `docs/planning/reports/phase-05-sprint-11-report.md`
* `docs/planning/assignments/phase-05-sprint-12.md`
* `docs/planning/reports/phase-05-sprint-12-report.md`
* `docs/planning/assignments/phase-05-sprint-13.md`
* `docs/planning/reports/phase-05-sprint-13-report.md`
* `docs/planning/assignments/phase-05-sprint-14.md`
* `docs/governance/git-rules.md`
* `docs/governance/pr-template.md`
* `docs/governance/review-checklist.md`
* `docs/governance/anti-patterns.md`

Authority rules:

* `docs/` is authoritative.
* `agent/` is operational support only.
* `jwt-token-contract.md` remains the JWT access-token and ID Token baseline.
* `refresh-token-contract.md` remains the Sprint 11 refresh-token foundation baseline.
* `refresh-token-rotation-contract.md` remains the Sprint 12 rotation and reuse-detection baseline.
* `token-revoke-introspection-contract.md` remains the Sprint 13 revoke/introspection baseline.
* `session-sso-contract.md` governs Sprint 14 session and SSO behavior.
* Sprint 13 merge baseline must be confirmed before implementation starts.

---

## IV. Prerequisites

Sprint 14 may start implementation only after:

* Sprint 11 is merged and present in `main`.
* Sprint 12 is merged and present in `main`.
* Sprint 13 is merged and present in `main`.
* Sprint 13 report is completed.
* `docs/contracts/oidc/session-sso-contract.md` is approved.
* Sprint 14 assignment is approved.
* The active branch is created from `main` or an approved baseline containing Sprint 13.

If Sprint 13 is not present in the active codebase, stop before coding.

---

## V. Included Scope

Sprint 14 includes:

* OIDC session model or session record contract under `src/modules/oidc`
* OIDC session repository or storage abstraction under `src/modules/oidc`
* OIDC session service under `src/modules/oidc`
* session creation after approved authentication continuation
* high-entropy session id generation
* session storage through approved Redis or infrastructure-backed abstraction
* session expiration metadata
* session validation
* session lookup from browser-facing OIDC session cookie
* session cookie issuance
* session cookie parsing and validation
* secure cookie attributes
* SSO reuse across approved clients during repeated `/authorize`
* preservation of normal `/authorize` validation:

  * `client_id`
  * exact `redirect_uri`
  * PKCE
  * supported response type
* tracking client participation in session metadata
* session `lastSeenAt` update when safe and appropriate
* expired session rejection
* invalidated session rejection
* missing/malformed cookie safe handling
* session invalidation primitive for Sprint 15 logout
* CSRF assessment and implementation where Sprint 14 exposes browser-facing session mutation
* Sprint 14 report creation

---

## VI. Excluded Scope

Sprint 14 excludes:

* final logout endpoint behavior
* logout hardening
* RP-initiated logout final flow
* front-channel logout
* back-channel logout
* refresh token revocation on logout
* token revocation behavior changes
* token introspection behavior changes
* refresh token rotation behavior changes
* access token persistence
* access token blacklist behavior
* changing JWT access token format
* changing ID Token format
* changing UserInfo claims
* changing claims mapper behavior
* admin session management UI
* audit module expansion
* external security event pipeline
* social login
* MFA
* external identity federation
* broad platform hardening outside session/SSO scope
* changes to `auth` ownership
* changes to `users` session/token ownership
* reuse of Phase 03 `token-lifecycle`
* direct user DB access from `oidc`
* new top-level session module
* unrelated repository-wide formatting cleanup

---

## VII. Expected Deliverables

### Implementation deliverables

Expected new files:

* `src/modules/oidc/oidc-session.model.ts`
* `src/modules/oidc/oidc-session.repository.ts`
* `src/modules/oidc/oidc-session.service.ts`

Expected updates:

* `src/modules/oidc/oidc.service.ts`
* `src/modules/oidc/oidc.controller.ts`
* `src/modules/oidc/oidc.types.ts`
* `src/app/server.ts`

Optional updates only if required by existing structure:

* `src/config/schema.ts`
* `src/config/config.ts`
* `src/config/env.ts`
* `src/infrastructure/redis/*` only if minimal low-level Redis abstraction support is required
* local validation harness or test files if the repository already uses them for sprint evidence

Documentation deliverables:

* `docs/contracts/oidc/session-sso-contract.md`
* `docs/planning/assignments/phase-05-sprint-14.md`
* `docs/planning/reports/phase-05-sprint-14-report.md`

Do not create a new module outside `src/modules/oidc`.

---

## VIII. Task Details

### Task 64 - Session/SSO Contract Alignment

#### Objective

Confirm Sprint 14 implementation basis before coding.

#### Required work

* read all required source-of-truth documents
* confirm Sprint 11, Sprint 12, and Sprint 13 are merged and present in the active baseline
* confirm `session-sso-contract.md` governs Sprint 14
* inspect current `/authorize` and `/authorize/continue` implementation
* inspect current auth bridge or authentication continuation path
* inspect available Redis/infrastructure abstraction
* identify minimal changes needed for session creation, session lookup, SSO reuse, and invalidation primitive
* stop before coding if session storage, cookie behavior, or SSO flow is unclear

#### Acceptance criteria

* implementation packet exists before coding
* Sprint 13 baseline is confirmed in the active codebase
* included and excluded Sprint 14 scope are clear
* session/SSO behavior is backed by approved contract
* no coding begins without Sprint 14 contract and assignment approval

---

### Task 65 - OIDC Session Persistence / Storage Abstraction

#### Objective

Add OIDC-owned session storage while preserving architecture boundaries.

#### Required work

* create session model or record shape under `src/modules/oidc`
* create session repository/storage abstraction under `src/modules/oidc`
* use Redis through approved infrastructure abstraction where feasible
* if Redis integration is insufficient, use an approved repository/service abstraction that can later be backed by Redis
* store required session metadata:

  * `sessionId`
  * `subject`
  * `clientIds`
  * `createdAt`
  * `expiresAt`
  * `lastSeenAt`
  * `status`
* support optional metadata only if contract-aligned:

  * `authTime`
  * `ipHash`
  * `userAgentHash`
  * `invalidatedAt`
  * `csrfTokenHash`
* ensure session record does not store:

  * raw access token
  * raw refresh token
  * ID Token
  * password
  * password hash
  * full user profile payload
* keep persistence access behind the OIDC session repository/storage abstraction

#### Acceptance criteria

* session storage is owned by `modules/oidc`
* session record contains only approved metadata
* session state is not stored in `auth`
* session state is not stored in `users`
* session behavior does not use `token-lifecycle`
* no raw token/password/profile payload is stored in session state
* storage is replaceable by Redis-backed infrastructure abstraction where applicable

---

### Task 66 - Session Service and Cookie Behavior

#### Objective

Implement OIDC session service behavior and secure browser cookie handling.

#### Required work

* create OIDC session service
* generate high-entropy session ids
* create active session records
* validate session id/session record
* reject missing/unknown/expired/invalidated sessions
* update `lastSeenAt` when safe and appropriate
* issue OIDC session cookie after session creation
* parse OIDC session cookie during `/authorize`
* clear expired or invalid session cookie where feasible
* apply secure cookie attributes:

  * `HttpOnly`
  * `SameSite=Lax` by default
  * `Secure` in production
  * path restriction where feasible
  * max-age or expiry aligned with session TTL
* route configurable cookie/session values through `src/config` if configurable

#### Acceptance criteria

* session cookie is opaque or protected
* session cookie does not expose identity data
* session cookie does not contain access token, refresh token, ID Token, password, or password hash
* cookie is `HttpOnly`
* production cookie uses `Secure`
* expired or invalidated sessions are rejected
* malformed session cookie is handled safely
* cookie behavior is not implemented in `auth`

---

### Task 67 - Session Creation after Approved Authentication

#### Objective

Create OIDC session only after approved authentication continuation.

#### Required work

* identify approved authentication continuation point in OIDC flow
* after successful authentication continuation, create OIDC session for the authenticated subject
* attach initial validated `clientId` to the session
* set `createdAt`, `lastSeenAt`, `expiresAt`, and `status`
* issue session cookie for browser flow
* preserve existing authorization-code issuance behavior
* avoid direct token response from session creation
* avoid bypassing authorization-code flow
* avoid storing credential material or full profile data

#### Acceptance criteria

* session is created only after approved authentication
* `auth` performs credential validation only and does not own session creation
* OIDC owns session record creation
* initial client participation is recorded
* authorization-code flow remains intact
* token issuance still occurs only through `/token`

---

### Task 68 - Session Lookup and SSO Reuse for `/authorize`

#### Objective

Enable repeated `/authorize` requests to reuse an active OIDC session for SSO.

#### Required work

* parse session cookie during `GET /authorize`
* validate session through OIDC session service
* reject unknown, expired, invalidated, or malformed session handles
* when active session exists, use session subject as authenticated subject for OIDC authorize continuation
* preserve normal `/authorize` validation:

  * `response_type=code`
  * `client_id`
  * exact `redirect_uri`
  * `scope`
  * PKCE `code_challenge`
  * PKCE `code_challenge_method`
  * `state`
* track requesting client in session `clientIds`
* issue or continue toward authorization code behavior without credential prompt when SSO reuse is valid
* ensure SSO reuse does not return tokens directly from `/authorize`
* ensure one client cannot access another client’s tokens

#### Acceptance criteria

* active session can be reused for repeated `/authorize`
* SSO reuse still validates client
* SSO reuse still validates exact redirect URI
* SSO reuse still enforces PKCE
* SSO reuse can produce authorization-code flow continuation
* missing session cookie does not imply authenticated state
* expired session is rejected
* invalidated session is rejected
* SSO reuse does not change `/token`, `/revoke`, `/introspect`, or `/userinfo` behavior

---

### Task 69 - Session Invalidation Primitive

#### Objective

Provide service-level session invalidation primitive for Sprint 15 logout.

#### Required work

* implement `invalidateSession(sessionId)` or equivalent OIDC session service method
* mark session `status = 'invalidated'`
* set `invalidatedAt`
* make invalidation idempotent
* prevent future SSO reuse after invalidation
* avoid token revocation in Sprint 14
* avoid logout redirect behavior in Sprint 14
* expose primitive only through service or validation harness unless assignment-approved route behavior is needed

#### Acceptance criteria

* active session can be invalidated
* invalidated session cannot be reused for SSO
* repeated invalidation is safe/idempotent
* invalidation does not revoke refresh tokens in Sprint 14
* invalidation does not implement final logout behavior
* Sprint 15 has a clear service primitive to call

---

### Task 70 - Sprint 14 Validation and Report

#### Objective

Validate Sprint 14 implementation and record evidence.

#### Required work

* run required static validation commands
* run required boundary scans
* run runtime/manual scenarios from the session/SSO contract
* record PASS / FAIL / NOT RUN accurately
* document any accepted external formatting drift
* create Sprint 14 report
* include risks and limitations
* include handoff to Sprint 15

#### Acceptance criteria

* report exists at `docs/planning/reports/phase-05-sprint-14-report.md`
* validation evidence is command-based and reproducible
* boundary/security checks are explicit
* session creation is validated
* session cookie security is validated
* SSO reuse is validated
* session invalidation primitive is validated
* Sprint 13 revoke/introspection non-regression is documented
* Sprint 15 handoff is documented

---

## IX. Allowed Dependencies

Allowed:

* `src/modules/oidc`
* `src/modules/auth` through approved credential-validation/authentication continuation contract only
* `src/modules/users` through approved service/account contracts only, if subject/account status resolution is required
* `src/infrastructure/redis` through approved low-level abstraction
* `src/infrastructure/crypto` through approved utilities for high-entropy id generation or hashing where applicable
* `src/shared` for generic errors/types/validators
* `src/config` for centralized TTL/cookie/session settings
* existing app route wiring for approved `/authorize` and `/authorize/continue` behavior

---

## X. Forbidden Dependencies

Forbidden:

* `oidc` importing `UserModel`
* `oidc` importing `user.repository`
* `oidc` depending on `token-lifecycle`
* `auth` issuing OIDC sessions
* `auth` storing OIDC sessions
* `auth` validating OIDC sessions
* `auth` owning SSO behavior
* `users` storing session state
* `users` storing session-client participation
* `users` receiving session cookie values
* `shared` containing session/SSO workflow logic
* `infrastructure` containing session/SSO business policy
* direct `process.env` outside `src/config`
* new top-level session module
* unrelated infrastructure expansion
* final logout endpoint/hardening behavior

---

## XI. Security-Critical Rules

Mandatory:

* session cookie must be opaque or protected
* session cookie must not expose user identity data
* session cookie must not contain access token
* session cookie must not contain refresh token
* session cookie must not contain ID Token
* session cookie must not contain password or password hash
* session state must not store access token
* session state must not store refresh token
* session state must not store ID Token
* session state must not store password
* session state must not store password hash
* session state must not store full user profile payload
* session cookie must be `HttpOnly`
* production session cookie must be `Secure`
* expired session must be rejected
* invalidated session must be rejected
* SSO must not bypass client validation
* SSO must not bypass redirect URI validation
* SSO must not bypass PKCE validation
* SSO must not bypass token lifecycle guarantees
* session logic must not be added to `auth`
* session state must not be added to `users`
* `token-lifecycle` must not be reused
* no direct user DB access from `oidc`
* Sprint 14 must not implement final logout behavior

---

## XII. Required Validation

### Static validation

Required commands:

* `npm.cmd run lint`
* `npm.cmd run typecheck`
* `npm.cmd run format:check`
* `npm.cmd run build`

If repository-wide `format:check` fails due accepted external formatting baseline drift, the report must include:

* full command result
* scoped Prettier check for Sprint 14 touched files
* confirmation that Sprint 14 touched files pass formatting
* list of external failing files if available
* explicit statement that Sprint 14 did not mix unrelated formatting cleanup

### Boundary scans

Required commands:

* `rg -n "process\\.env" src --glob "!src/config/**"`
* `rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc`
* `rg -n "token-lifecycle" src/modules/oidc`
* `rg -n "session|sso|cookie|csrf|logout" src/modules/auth`
* `rg -n "session|sso|cookie|csrf|logout" src/modules/users`
* `rg -n "access_token|refresh_token|id_token|tokenHash|password_hash|passwordHash" src/modules/oidc/*session* src/modules/oidc`
* `rg -n "logout" src/modules/oidc src/app`

Expected results:

* no direct `process.env` outside config
* no direct users DB access from `oidc`
* no `token-lifecycle` dependency from `oidc`
* no session/SSO behavior in `auth`
* no session/SSO state in `users`
* no raw token/password storage in session implementation
* no final logout behavior introduced early

---

## XIII. Manual Validation Scenarios

Required scenarios:

1. Session is created after approved authentication continuation.
2. Session cookie is issued with approved attributes.
3. Session record stores subject/client metadata only, not raw tokens or passwords.
4. Active session can be looked up from repeated `/authorize`.
5. Valid SSO reuse still enforces client validation.
6. Valid SSO reuse still enforces exact redirect URI validation.
7. Valid SSO reuse still enforces PKCE validation.
8. SSO reuse can issue or continue toward authorization code behavior without credential prompt.
9. Expired session is rejected.
10. Invalidated session is rejected.
11. Missing session cookie does not create implicit authenticated state.
12. Malformed session cookie is rejected safely.
13. Session invalidation primitive prevents future SSO reuse.
14. Session state does not store access token, refresh token, ID Token, password, password hash, or full profile payload.
15. Sprint 14 does not change refresh token rotation/reuse behavior.
16. Sprint 14 does not change revoke/introspection behavior.
17. Sprint 14 does not implement final logout behavior.
18. Sprint 14 does not add session behavior to `auth`, `users`, or `token-lifecycle`.

---

## XIV. PR and Report Requirements

Sprint 14 PR must include:

* phase/sprint/task references
* source-of-truth references
* JWT token contract reference
* refresh token contract reference
* refresh token rotation contract reference
* token revoke/introspection contract reference
* session/SSO contract reference
* Sprint 11 merge baseline confirmation
* Sprint 12 merge baseline confirmation
* Sprint 13 merge baseline confirmation
* included scope
* excluded scope
* file list
* validation commands with PASS / FAIL / NOT RUN
* boundary scan evidence
* runtime/manual validation evidence
* session creation validation evidence
* SSO reuse validation evidence
* session invalidation primitive validation evidence
* Sprint 13 non-regression validation
* security notes
* risks and limitations
* handoff to Sprint 15

Sprint 14 report path:

`docs/planning/reports/phase-05-sprint-14-report.md`

---

## XV. Merge-Blocking Conditions

Block Sprint 14 if:

* session/SSO contract is missing or not referenced
* Sprint 14 assignment is missing or not referenced
* Sprint 13 merge baseline is not confirmed
* session state is stored in `auth`
* session state is stored in `users`
* session behavior uses `token-lifecycle`
* session record stores raw access token
* session record stores raw refresh token
* session record stores ID Token
* session record stores password or password hash
* session record stores full user profile payload
* session cookie exposes identity data
* session cookie is not `HttpOnly`
* production cookie is not `Secure`
* SSO bypasses client validation
* SSO bypasses redirect URI validation
* SSO bypasses PKCE validation
* SSO changes token lifecycle behavior without contract approval
* final logout endpoint/hardening is implemented early
* revoke/introspection behavior is changed without contract approval
* `auth` issues tokens or sessions
* `oidc` imports user model or user repository
* direct `process.env` appears outside `src/config`
* validation evidence is missing
* unrelated formatting cleanup is mixed into the implementation PR

---

## XVI. Definition of Done

Sprint 14 is complete when:

* `session-sso-contract.md` is approved and referenced
* Sprint 14 assignment is approved and referenced
* Sprint 13 merge baseline is confirmed
* OIDC session creation is implemented
* OIDC session lookup is implemented
* OIDC session expiration is enforced
* OIDC session invalidation primitive is implemented
* SSO reuse across approved clients is implemented
* session cookie behavior follows approved security rules
* session state does not store raw tokens, password, password hash, or full profile payload
* SSO preserves client validation, redirect URI validation, and PKCE validation
* Sprint 13 revoke/introspection guarantees remain intact
* no session behavior is implemented in `auth`
* no session state is added to `users`
* no `token-lifecycle` dependency appears in OIDC session behavior
* no final logout behavior is introduced early
* all required validation evidence is recorded
* Sprint 14 report is created

---

## XVII. Handoff to Sprint 15

Sprint 15 should start from the Sprint 14 session/SSO foundation and add only approved logout hardening scope:

* logout endpoint behavior
* browser-facing session invalidation
* refresh token revocation on logout, if approved
* client redirect validation for logout continuation, if approved
* logout CSRF controls
* idempotent logout handling
* post-logout behavior for browser clients

Sprint 15 must not start until its assignment or contract is approved.
