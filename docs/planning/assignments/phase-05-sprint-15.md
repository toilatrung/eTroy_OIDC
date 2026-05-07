# Phase 05 / Sprint 15 - Logout Hardening

---

## I. Assignment Summary

* Phase: Phase 05 - Token and Session Management
* Sprint: Sprint 15 - Logout Hardening
* Task Range:

  * Task 71 - Logout Contract Alignment
  * Task 72 - Logout Request Validation
  * Task 73 - Session Invalidation Integration
  * Task 74 - Refresh Token Revocation on Logout
  * Task 75 - Post-Logout Redirect and Cookie Clearing
  * Task 76 - Logout CSRF and Idempotency
  * Task 77 - Sprint 15 Validation and Report
* Owner Module: `src/modules/oidc`
* Branch Name: `feature/oidc-sprint15-logout-hardening`

---

## II. Objective

Implement final OIDC logout hardening on top of the merged Sprint 14 session and SSO foundation.

Sprint 15 must provide controlled logout behavior that invalidates the OIDC browser session, clears the session cookie where feasible, handles repeated or invalid logout requests safely, and optionally revokes refresh token family state where explicitly approved by this assignment.

Sprint 15 must preserve all Sprint 11 through Sprint 14 guarantees:

* refresh tokens remain opaque
* refresh tokens are stored hashed only
* refresh-token grant continues to rotate refresh tokens
* consumed-token reuse remains detected
* compromised family handling remains intact
* concurrent refresh hardening remains intact
* revocation remains enforced
* introspection remains non-revealing and safe
* OIDC sessions remain owned by `modules/oidc`
* session state does not store raw tokens, password, password hash, or full user profile payload
* SSO does not bypass client validation, redirect URI validation, or PKCE validation
* access tokens remain short-lived JWTs
* access tokens are not persisted or blacklisted
* `auth` remains credential validation only
* `users` remains identity source of truth
* `token-lifecycle` is not reused for OIDC tokens, sessions, SSO, or logout

---

## III. Source-of-Truth Basis

Sprint 15 must follow:

* `docs/source-of-truth-index.md`
* `docs/README.md`
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
* `docs/contracts/oidc/logout-hardening-contract.md`
* `docs/planning/assignments/phase-05-sprint-11.md`
* `docs/planning/reports/phase-05-sprint-11-report.md`
* `docs/planning/assignments/phase-05-sprint-12.md`
* `docs/planning/reports/phase-05-sprint-12-report.md`
* `docs/planning/assignments/phase-05-sprint-13.md`
* `docs/planning/reports/phase-05-sprint-13-report.md`
* `docs/planning/assignments/phase-05-sprint-14.md`
* `docs/planning/reports/phase-05-sprint-14-report.md`
* `docs/planning/assignments/phase-05-sprint-15.md`
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
* `session-sso-contract.md` remains the Sprint 14 session/SSO baseline.
* `logout-hardening-contract.md` governs Sprint 15 logout behavior.
* Sprint 14 merge baseline must be confirmed before implementation starts.

---

## IV. Prerequisites

Sprint 15 may start implementation only after:

* Sprint 11 is merged and present in `main`.
* Sprint 12 is merged and present in `main`.
* Sprint 13 is merged and present in `main`.
* Sprint 14 is merged and present in `main`.
* Sprint 14 report is completed.
* `docs/contracts/oidc/logout-hardening-contract.md` is approved.
* Sprint 15 assignment is approved.
* The active branch is created from `main` or an approved baseline containing Sprint 14.

If Sprint 14 is not present in the active codebase, stop before coding.

---

## V. Included Scope

Sprint 15 includes:

* OIDC-owned logout endpoint or approved logout service behavior
* `POST /logout` route wiring if approved by implementation structure
* OIDC session lookup from the Sprint 14 session cookie
* OIDC session invalidation through Sprint 14 invalidation primitive
* OIDC session cookie clearing
* safe handling for:

  * missing session cookie
  * malformed session cookie
  * unknown session
  * expired session
  * already-invalidated session
  * repeated logout request
* idempotent logout behavior
* non-revealing logout response
* post-logout redirect validation if implemented
* exact-match validation for approved `post_logout_redirect_uri`
* optional `state` preservation only after redirect validation succeeds
* CSRF protection for browser-facing logout mutation, or explicit documented non-applicability
* refresh token family revocation on logout where session-to-token-family association is available and approved
* validation that logout does not mutate user identity
* validation that logout does not expose session/token internals
* Sprint 12, Sprint 13, and Sprint 14 non-regression validation
* Sprint 15 report creation

---

## VI. Excluded Scope

Sprint 15 excludes:

* admin session management UI
* admin token management UI
* audit module expansion
* external security event pipeline
* external identity provider logout
* social login logout
* MFA session policy
* front-channel logout protocol expansion unless explicitly approved by a separate assignment update
* back-channel logout protocol expansion unless explicitly approved by a separate assignment update
* access token persistence
* access token blacklist behavior
* changing JWT access token format
* changing ID Token format
* changing UserInfo claims
* changing claims mapper behavior
* changing refresh-token rotation policy outside logout integration
* changing revoke/introspection endpoint behavior outside logout integration
* broad platform hardening outside logout scope
* changes to `auth` ownership
* changes to `users` session/token/logout ownership
* reuse of Phase 03 `token-lifecycle`
* direct user DB access from `oidc`
* new top-level logout module
* unrelated repository-wide formatting cleanup

---

## VII. Expected Deliverables

### Implementation deliverables

Expected new file if separation is useful:

* `src/modules/oidc/logout.service.ts`

Expected updates:

* `src/modules/oidc/oidc-session.service.ts`
* `src/modules/oidc/oidc-session.repository.ts`
* `src/modules/oidc/refresh-token.service.ts`
* `src/modules/oidc/oidc.controller.ts`
* `src/modules/oidc/oidc.service.ts`
* `src/modules/oidc/oidc.types.ts`
* `src/app/server.ts`

Optional updates only if required by existing structure:

* `src/config/schema.ts`
* `src/config/config.ts`
* `src/config/env.ts`
* local validation harness or test files if the repository already uses them for sprint evidence

Documentation deliverables:

* `docs/contracts/oidc/logout-hardening-contract.md`
* `docs/planning/assignments/phase-05-sprint-15.md`
* `docs/planning/reports/phase-05-sprint-15-report.md`

Do not create a new module outside `src/modules/oidc`.

---

## VIII. Task Details

### Task 71 - Logout Contract Alignment

#### Objective

Confirm Sprint 15 implementation basis before coding.

#### Required work

* read all required source-of-truth documents
* confirm Sprint 11, Sprint 12, Sprint 13, and Sprint 14 are merged and present in the active baseline
* confirm `logout-hardening-contract.md` governs Sprint 15
* inspect Sprint 14 session model, repository, service, cookie handling, SSO reuse, expiration handling, and invalidation primitive
* inspect Sprint 13 revoke/introspection service behavior
* inspect Sprint 12 refresh token family/reuse/concurrency behavior
* identify the minimal changes needed for logout endpoint behavior, cookie clearing, idempotency, CSRF, post-logout redirect validation, and optional refresh-token revocation on logout
* stop before coding if logout route shape, CSRF model, redirect behavior, or token revocation-on-logout behavior is unclear

#### Acceptance criteria

* implementation packet exists before coding
* Sprint 14 baseline is confirmed in the active codebase
* included and excluded Sprint 15 scope are clear
* logout behavior is backed by approved contract
* no coding begins without Sprint 15 contract and assignment approval

---

### Task 72 - Logout Request Validation

#### Objective

Validate logout requests safely without leaking session, token, or identity details.

#### Required work

* add approved `POST /logout` handling if not already present
* parse OIDC session cookie using Sprint 14 cookie/session conventions
* safely handle missing, malformed, unknown, expired, or invalidated session
* accept optional `post_logout_redirect_uri` only if redirect behavior is implemented
* accept optional `client_id` only as part of redirect validation or token-family scoping where needed
* accept optional `state` only for safe redirect round-trip after redirect validation succeeds
* reject or safely ignore unsupported logout fields
* avoid exposing whether a session existed
* avoid exposing subject, session ID, client participation list, token hash, or token family state
* avoid issuing authorization code or tokens during logout

#### Acceptance criteria

* missing session cookie is handled safely
* malformed session cookie is handled safely
* expired session is handled safely
* already-invalidated session is handled safely
* repeated logout is safe
* logout response does not expose session or token internals
* logout does not issue authorization code, access token, refresh token, or ID Token

---

### Task 73 - Session Invalidation Integration

#### Objective

Integrate logout with the Sprint 14 OIDC session invalidation primitive.

#### Required work

* use existing OIDC session service invalidation behavior
* invalidate active session by session id
* mark session `status = 'invalidated'`
* set `invalidatedAt`
* keep invalidation idempotent
* ensure invalidated session cannot be reused for SSO
* clear OIDC session cookie where feasible
* preserve Sprint 14 SSO behavior for other active sessions
* avoid mutating user identity
* avoid storing logout state in `auth` or `users`

#### Acceptance criteria

* active session logout invalidates session
* invalidated session cannot be reused for SSO
* repeated invalidation remains idempotent
* logout clears cookie where feasible
* logout does not mutate user profile, password, email, status, or identity fields
* logout state remains inside OIDC-owned session/logout behavior

---

### Task 74 - Refresh Token Revocation on Logout

#### Objective

Revoke refresh-token family state on logout only where contract-approved association exists.

#### Required work

* inspect whether Sprint 14 session records or Sprint 13/Sprint 12 token records provide a safe session-to-refresh-token-family association
* if association exists:

  * revoke refresh token family through existing OIDC refresh token service/repository behavior
  * preserve compromised family state
  * preserve consumed-token reuse detection
  * preserve refresh-token rotation guarantees
  * keep response non-revealing
* if association does not exist:

  * do not invent broad or unsafe token revocation semantics
  * do not store raw refresh tokens in session
  * document limitation in Sprint 15 report
  * hand off later contract-backed association improvement
* ensure logout does not require access-token persistence
* ensure logout does not introduce access-token blacklist behavior

#### Acceptance criteria

* refresh-token family revocation on logout is implemented only if safe association exists
* raw refresh token is never stored in session
* token hash is never exposed
* compromised family state is not downgraded
* Sprint 12 reuse detection remains intact
* Sprint 13 revoke/introspection remains intact
* if token revocation is not implemented, report clearly states why it is out of current safe association scope

---

### Task 75 - Post-Logout Redirect and Cookie Clearing

#### Objective

Implement safe cookie clearing and optional post-logout redirect behavior.

#### Required work

* clear OIDC session cookie using the same cookie identity parameters as Sprint 14 session issuance
* ensure cookie clearing includes:

  * correct cookie name
  * correct path
  * domain if configured
  * `HttpOnly`
  * `SameSite`
  * `Secure` in production
* implement post-logout redirect only if approved and supported by existing client metadata
* validate `client_id` before accepting `post_logout_redirect_uri`
* enforce exact-match registered post-logout redirect URI or approved client redirect URI policy
* reject arbitrary, wildcard, prefix, or partial redirect matching
* append `state` only after redirect validation succeeds
* do not include token/session data in redirect parameters

#### Acceptance criteria

* logout clears session cookie where feasible
* redirect is not implemented unless exact-match validation can be enforced
* unregistered redirect URI is rejected
* arbitrary redirect is impossible
* `state` is reflected only after valid redirect validation
* redirect response does not leak token/session internals

---

### Task 76 - Logout CSRF and Idempotency

#### Objective

Protect browser-facing logout mutation and enforce idempotent logout behavior.

#### Required work

* identify whether implemented logout surface is browser-facing mutation
* if browser-facing:

  * implement approved CSRF protection
  * validate CSRF before state mutation where feasible
  * reject missing/invalid CSRF token safely
  * avoid logging raw CSRF token
  * store only CSRF hash/digest if persistence is required
* if not browser-facing:

  * document why additional CSRF protection is not required
* ensure repeated logout produces deterministic safe behavior
* ensure logout does not reveal session existence or token existence
* ensure logout never creates a new session
* ensure logout never reactivates a session

#### Acceptance criteria

* browser-facing logout mutation has CSRF protection or a documented approved non-applicability rationale
* missing/invalid CSRF is rejected safely when CSRF applies
* valid CSRF path succeeds when CSRF applies
* repeated logout returns safe deterministic behavior
* logout does not reveal whether session/token existed
* logout does not create or reactivate session state

---

### Task 77 - Sprint 15 Validation and Report

#### Objective

Validate Sprint 15 implementation and record evidence.

#### Required work

* run required static validation commands
* run required boundary scans
* run runtime/manual scenarios from the logout hardening contract
* record PASS / FAIL / NOT RUN accurately
* document accepted external formatting drift if still present
* create Sprint 15 report
* include risks and limitations
* include Phase 05 closure posture or Phase 06 handoff

#### Acceptance criteria

* report exists at `docs/planning/reports/phase-05-sprint-15-report.md`
* validation evidence is command-based and reproducible
* boundary/security checks are explicit
* logout endpoint/service behavior is validated
* session invalidation is validated
* cookie clearing is validated
* idempotency is validated
* CSRF posture is validated or explicitly justified
* redirect behavior is validated if implemented
* refresh token revocation on logout is validated if implemented
* Sprint 12, Sprint 13, and Sprint 14 non-regression checks are recorded
* handoff after Sprint 15 is documented

---

## IX. Allowed Dependencies

Allowed:

* `src/modules/oidc`
* `src/modules/auth` through approved credential-validation/authentication continuation contract only, without logout ownership
* `src/modules/users` through approved service/account contracts only, if subject/account status resolution is already required by existing OIDC flows
* `src/infrastructure/redis` through approved low-level abstraction for session persistence
* `src/infrastructure/crypto` through approved utilities for high-entropy values or CSRF hashing where applicable
* `src/shared` for generic errors/types/validators
* `src/config` for centralized logout/cookie/CSRF/post-logout settings
* existing app route wiring for approved `POST /logout`

---

## X. Forbidden Dependencies

Forbidden:

* `oidc` importing `UserModel`
* `oidc` importing `user.repository`
* `oidc` depending on `token-lifecycle`
* `auth` owning logout behavior
* `auth` issuing or clearing OIDC session cookie
* `auth` invalidating OIDC session
* `auth` revoking OIDC refresh tokens
* `auth` introspecting OIDC tokens
* `users` storing logout state
* `users` storing session state
* `users` storing token state
* `users` receiving session cookie values
* `users` receiving refresh token hashes
* `shared` containing logout workflow logic
* `infrastructure` containing logout business policy
* direct `process.env` outside `src/config`
* new top-level logout module
* unrelated infrastructure expansion
* access-token persistence model
* access-token blacklist behavior

---

## XI. Security-Critical Rules

Mandatory:

* logout must be idempotent
* logout must not reveal session existence
* logout must not reveal token existence
* logout must not expose session ID
* logout must not expose token hash
* logout must not expose raw refresh token
* logout must not expose access token
* logout must not expose ID Token
* logout must not expose password or password hash
* logout must not mutate user identity
* logout must invalidate OIDC session
* logout must clear OIDC session cookie where feasible
* invalidated session must not be reusable for SSO
* CSRF protection must be applied where browser-facing mutation exists, or non-applicability must be documented
* post-logout redirect must be exact-match validated if implemented
* arbitrary redirect is forbidden
* access token persistence is forbidden
* access token blacklist is forbidden
* `auth` must not own logout
* `users` must not store logout/session/token state
* `token-lifecycle` must not be reused
* no direct user DB access from `oidc`

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
* scoped Prettier check for Sprint 15 touched files
* confirmation that Sprint 15 touched files pass formatting
* list of external failing files if available
* explicit statement that Sprint 15 did not mix unrelated formatting cleanup

### Boundary scans

Required commands:

* `rg -n "process\\.env" src --glob "!src/config/**"`
* `rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc`
* `rg -n "token-lifecycle" src/modules/oidc`
* `rg -n "logout|post_logout|front-channel|back-channel|csrf|session" src/modules/auth`
* `rg -n "logout|post_logout|front-channel|back-channel|csrf|session|tokenHash|refreshToken" src/modules/users`
* `rg -n "access_token|refresh_token|id_token|tokenHash|password_hash|passwordHash" src/modules/oidc/*logout* src/modules/oidc/*session* src/modules/oidc`
* `rg -n "access-token.*blacklist|blacklist.*access-token|persist.*access_token|accessToken.*model" src/modules/oidc src/modules/auth src/modules/users`

Expected results:

* no direct `process.env` outside config
* no direct users DB access from `oidc`
* no `token-lifecycle` dependency from `oidc`
* no logout/session ownership in `auth`
* no logout/session/token state in `users`
* no raw token/password storage in logout/session implementation
* no access-token persistence or blacklist
* no external provider/social/MFA logout behavior introduced early

---

## XIII. Manual Validation Scenarios

Required scenarios:

1. Active session logout invalidates the OIDC session.
2. Active session logout clears OIDC session cookie where feasible.
3. Invalidated session cannot be reused for SSO.
4. Repeated logout is idempotent.
5. Missing session cookie logout returns safe non-revealing response.
6. Malformed session cookie logout returns safe non-revealing response and clears cookie where feasible.
7. Expired session logout returns safe non-revealing response.
8. Already-invalidated session logout returns safe non-revealing response.
9. Logout does not mutate user identity data.
10. Logout does not expose session ID, subject, token hash, raw token, password, or password hash.
11. Logout CSRF protection rejects missing/invalid CSRF token if browser-facing mutation is implemented.
12. Valid logout CSRF path succeeds if CSRF is implemented.
13. Post-logout redirect accepts only registered exact-match URI if redirect is implemented.
14. Post-logout redirect rejects unregistered URI if redirect is implemented.
15. `state` is preserved only after valid post-logout redirect validation if redirect is implemented.
16. Refresh token family is revoked on logout if safe association exists and Sprint 15 implements token revocation on logout.
17. Refresh token family is not modified if safe association does not exist and revocation-on-logout is excluded from implementation.
18. Sprint 14 SSO/session non-regression remains PASS.
19. Sprint 13 revoke/introspection non-regression remains PASS.
20. Sprint 12 rotation/reuse/concurrency non-regression remains PASS.
21. Sprint 15 does not implement access-token persistence or blacklist behavior.
22. Sprint 15 does not add logout/session behavior to `auth`, `users`, or `token-lifecycle`.

---

## XIV. PR and Report Requirements

Sprint 15 PR must include:

* phase/sprint/task references
* source-of-truth references
* JWT token contract reference
* refresh token contract reference
* refresh token rotation contract reference
* token revoke/introspection contract reference
* session/SSO contract reference
* logout hardening contract reference
* Sprint 11 merge baseline confirmation
* Sprint 12 merge baseline confirmation
* Sprint 13 merge baseline confirmation
* Sprint 14 merge baseline confirmation
* included scope
* excluded scope
* file list
* validation commands with PASS / FAIL / NOT RUN
* boundary scan evidence
* runtime/manual validation evidence
* logout validation evidence
* session invalidation validation evidence
* cookie clearing validation evidence
* CSRF validation evidence or non-applicability rationale
* post-logout redirect validation evidence if implemented
* refresh token revocation-on-logout evidence if implemented
* Sprint 12/13/14 non-regression validation
* security notes
* risks and limitations
* handoff to Phase 06 or next approved hardening track

Sprint 15 report path:

`docs/planning/reports/phase-05-sprint-15-report.md`

---

## XV. Merge-Blocking Conditions

Block Sprint 15 if:

* logout hardening contract is missing or not referenced
* Sprint 15 assignment is missing or not referenced
* Sprint 14 merge baseline is not confirmed
* logout does not invalidate session
* invalidated session can still be reused for SSO
* logout is not idempotent
* logout reveals session existence or token existence
* logout exposes session ID, token hash, raw token, password, or password hash
* logout mutates user identity
* logout state is stored in `auth`
* logout/session/token state is stored in `users`
* logout behavior uses `token-lifecycle`
* post-logout redirect allows unregistered URI
* post-logout redirect uses partial/prefix/wildcard matching without explicit approval
* browser-facing logout mutation lacks CSRF protection and no approved non-browser rationale is documented
* refresh token revocation on logout stores raw refresh token
* refresh token revocation on logout bypasses existing OIDC revocation service/repository boundary
* access token is persisted
* access token blacklist is introduced without explicit approval
* Sprint 13 revoke/introspection behavior is broken
* Sprint 14 session/SSO behavior is broken
* `auth` issues tokens or sessions
* `oidc` imports user model or user repository
* direct `process.env` appears outside `src/config`
* validation evidence is missing
* unrelated formatting cleanup is mixed into the implementation PR

---

## XVI. Definition of Done

Sprint 15 is complete when:

* `logout-hardening-contract.md` is approved and referenced
* Sprint 15 assignment is approved and referenced
* Sprint 14 merge baseline is confirmed
* logout endpoint or approved logout service behavior is implemented
* OIDC session invalidation is integrated
* OIDC session cookie clearing is implemented where feasible
* logout is idempotent
* logout response is non-revealing
* post-logout redirect validation is implemented if approved
* logout CSRF protection is implemented or explicitly justified as not applicable
* refresh token revocation on logout is implemented if safe association exists and approved
* safe limitation is documented if refresh token revocation on logout is not implemented
* logout does not mutate user identity
* logout does not expose token/session internals
* Sprint 14 session/SSO guarantees remain intact
* Sprint 13 revoke/introspection guarantees remain intact
* Sprint 12 rotation/reuse/concurrency guarantees remain intact
* no logout behavior is implemented in `auth`
* no logout/session/token state is added to `users`
* no `token-lifecycle` dependency appears in OIDC logout behavior
* no access-token persistence or blacklist behavior is introduced
* all required validation evidence is recorded
* Sprint 15 report is created

---

## XVII. Handoff After Sprint 15

Sprint 15 should close the Phase 05 token/session lifecycle loop if all Sprint 11 through Sprint 15 deliverables remain valid.

After Sprint 15, next recommended work belongs to Phase 06 or a dedicated hardening track:

* admin controls
* client management hardening
* audit logging expansion
* observability and metrics
* key rotation hardening
* security review hardening
* repository-wide formatting baseline cleanup if still deferred

Sprint 15 does not authorize Phase 06 implementation by itself. Phase 06 must start from approved planning, contracts, and assignment documents.
