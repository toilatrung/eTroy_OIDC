# eTroy OIDC - Logout Hardening Contract

---

## I. Purpose

This contract defines the approved logout hardening behavior for Phase 05 / Sprint 15.

It governs:

* OIDC logout endpoint behavior
* browser-facing session invalidation
* OIDC session cookie clearing
* post-logout redirect validation
* logout idempotency
* logout CSRF protection
* refresh token / refresh token family revocation on logout, if approved by Sprint 15 assignment
* boundary rules between `oidc`, `auth`, `users`, `token-lifecycle`, and infrastructure

This contract must be approved before Sprint 15 implementation starts.

---

## II. Authority

This contract is subordinate to:

* `docs/source-of-truth-index.md`
* `docs/architecture/system-overview.md`
* `docs/architecture/module-boundaries.md`
* `docs/architecture/source-tree.md`
* `docs/requirements/srs-v1.md`
* `docs/planning/master-execution-plan.md`
* `docs/planning/phases/phase-05-token-session-management.md`
* `docs/contracts/oidc/jwt-token-contract.md`
* `docs/contracts/oidc/refresh-token-contract.md`
* `docs/contracts/oidc/refresh-token-rotation-contract.md`
* `docs/contracts/oidc/token-revoke-introspection-contract.md`
* `docs/contracts/oidc/session-sso-contract.md`
* `docs/planning/reports/phase-05-sprint-11-report.md`
* `docs/planning/reports/phase-05-sprint-12-report.md`
* `docs/planning/reports/phase-05-sprint-13-report.md`
* `docs/planning/reports/phase-05-sprint-14-report.md`

If this contract conflicts with architecture or requirements documents, the higher-authority document wins.

---

## III. Contract Position

Sprint 11 completed refresh token foundation.

Sprint 12 completed refresh token rotation and reuse detection.

Sprint 13 completed token revocation and introspection.

Sprint 14 completed OIDC session and SSO foundation, including session creation, session lookup, SSO reuse, expiration handling, cookie behavior, and session invalidation primitive. Sprint 14 report confirms Sprint 14 is merged into `main` and explicitly states no final logout behavior was introduced; Sprint 15 handoff remains logout hardening only. 

Sprint 15 adds final logout hardening on top of Sprint 14 session primitives.

Sprint 15 must preserve all Sprint 11–14 guarantees:

* refresh tokens remain opaque
* refresh tokens are stored hashed only
* refresh-token grant continues to rotate refresh tokens
* consumed-token reuse remains detected
* compromised family handling remains intact
* concurrent refresh hardening remains intact
* revocation remains enforced
* introspection remains non-revealing and safe
* access tokens remain short-lived JWTs
* access tokens are not persisted or blacklisted unless a later approved contract explicitly allows it
* OIDC sessions remain owned by `modules/oidc`
* session state does not store raw tokens, password, password hash, or full profile payload
* SSO does not bypass client validation, redirect URI validation, or PKCE validation
* `auth` remains credential validation only
* `users` remains identity source of truth
* `token-lifecycle` is not reused for OIDC tokens, sessions, SSO, or logout

Sprint 15 must not redefine:

* JWT access token format
* ID Token format
* claims mapper behavior
* `/userinfo` behavior
* refresh token opacity
* refresh token hash-only persistence
* refresh-token rotation/reuse behavior
* revoke endpoint behavior except where logout explicitly calls existing revocation service behavior
* introspection endpoint behavior
* session creation or SSO rules except where logout invalidates session state

---

## IV. Sprint Scope

### Included in Sprint 15

* logout endpoint or approved logout service behavior
* browser-facing OIDC session invalidation
* session cookie clearing
* post-logout redirect validation, if approved by assignment
* idempotent logout behavior
* CSRF protection for browser-facing logout mutation
* safe handling for missing, malformed, expired, or already-invalidated session cookies
* optional refresh token / refresh token family revocation on logout if approved by Sprint 15 assignment
* preserving Sprint 14 session invalidation primitive
* preserving Sprint 13 revoke/introspection behavior
* validation evidence proving logout does not mutate identity data or expose token/session internals
* Sprint 15 report creation

### Excluded from Sprint 15

* admin session management UI
* audit module expansion
* external security event pipeline
* front-channel logout protocol expansion unless explicitly approved by assignment
* back-channel logout protocol expansion unless explicitly approved by assignment
* external identity provider logout
* social login logout
* MFA session policy
* access token persistence
* access token blacklist behavior
* changing JWT access token format
* changing ID Token format
* changing UserInfo claims
* changing claims mapper behavior
* changing refresh-token rotation policy outside logout integration
* changing revoke/introspection behavior outside logout integration
* broad platform hardening outside logout scope
* changes to `auth` ownership
* changes to `users` session/token ownership
* reuse of Phase 03 `token-lifecycle`
* direct user DB access from `oidc`
* new top-level logout module
* unrelated repository-wide formatting cleanup

These excluded items remain later Phase 05/Phase 06 scope unless explicitly approved by a separate contract update.

---

## V. Logout Ownership

Logout behavior belongs to `modules/oidc`.

`modules/oidc` owns:

* logout endpoint/controller behavior
* logout service orchestration
* OIDC session lookup for logout
* OIDC session invalidation
* session cookie clearing
* post-logout redirect validation
* logout CSRF validation
* optional refresh token family revocation through approved OIDC token lifecycle service

`modules/auth` must not:

* own logout behavior
* persist logout state
* validate OIDC sessions
* invalidate OIDC sessions
* revoke OIDC refresh tokens
* issue or clear OIDC session cookies
* own post-logout redirect policy

`modules/users` must not:

* own logout behavior
* store logout state
* store session state
* receive session cookie values
* mutate identity data during logout
* own OIDC token/session invalidation

`modules/token-lifecycle` must not be used for:

* OIDC logout
* OIDC session invalidation
* SSO state
* logout state
* access tokens
* refresh tokens
* ID tokens

---

## VI. Logout Endpoint Contract

Sprint 15 may expose:

* `POST /logout`

If assignment explicitly chooses an additional browser-friendly route, it must remain under OIDC logout ownership and must not bypass this contract.

Expected request inputs may include:

* OIDC session cookie
* CSRF token, if logout is browser-facing
* optional `post_logout_redirect_uri`
* optional `client_id`
* optional `state`
* optional presented `refresh_token`, only if assignment approves refresh-token revocation by submitted token during logout

### Required behavior

The logout endpoint MUST:

* parse OIDC session cookie
* validate CSRF protection where required
* safely handle missing/malformed/expired/invalidated session
* invalidate active session using Sprint 14 session invalidation primitive
* clear OIDC session cookie when feasible
* validate post-logout redirect URI if redirect behavior is implemented
* return deterministic success response for idempotent logout cases
* avoid exposing session internals
* avoid exposing token internals
* avoid mutating user identity
* avoid issuing access tokens, ID Tokens, or refresh tokens

### Allowed response behavior

For API-style logout:

* HTTP status: `200`
* response body may include minimal status payload

Recommended minimal response:

* `{"status":"logged_out"}`

For browser redirect logout, if approved:

* HTTP status: `302`
* Location: approved `post_logout_redirect_uri`
* optional `state` appended if request state is accepted

If redirect behavior is not approved in assignment, Sprint 15 must not implement redirect behavior.

---

## VII. Idempotency Contract

Logout must be idempotent.

The following cases MUST NOT produce sensitive details:

* missing session cookie
* malformed session cookie
* unknown session
* expired session
* already-invalidated session
* repeated logout request
* session already cleared

Recommended behavior:

* return the same minimal success response for already-logged-out states
* clear cookie where feasible
* do not reveal whether a session existed
* do not reveal session ID
* do not reveal subject
* do not reveal client participation list
* do not reveal token family state

Idempotent logout MUST NOT:

* reactivate a session
* create a session
* issue an authorization code
* issue access token
* issue refresh token
* issue ID Token
* mutate identity fields

---

## VIII. Session Invalidation Contract

Sprint 15 must use the Sprint 14 session invalidation primitive.

Sprint 14 provided an OIDC-owned session invalidation primitive and explicitly did not implement final logout behavior. 

Required behavior:

* find session from OIDC session cookie where possible
* call OIDC session service invalidation behavior
* mark session `status = 'invalidated'`
* set `invalidatedAt`
* prevent future SSO reuse
* make repeated invalidation safe
* clear cookie where feasible

Session invalidation MUST NOT:

* delete user identity
* mutate user profile
* change password state
* bypass OIDC session service
* store logout state in `auth`
* store logout state in `users`

---

## IX. Session Cookie Clearing Contract

Sprint 15 must clear the OIDC session cookie on logout where feasible.

Cookie clearing must use the same cookie identity parameters as session issuance, including:

* cookie name
* path
* domain if configured
* `HttpOnly`
* `SameSite`
* `Secure` in production

Recommended cookie name inherited from Sprint 14:

* `etroy_oidc_sid`

Cookie clearing rules:

* clear cookie on successful logout
* clear cookie for missing/invalid/expired/unknown session where feasible
* clear cookie for CSRF failure only if doing so does not weaken security or leak state
* do not expose session cookie value in logs
* do not return session cookie value in response body

---

## X. Post-Logout Redirect Contract

Sprint 15 may implement post-logout redirect only if assignment approves it.

If implemented, post-logout redirect validation MUST enforce:

* `post_logout_redirect_uri` must belong to a validated client
* `client_id` must identify a known OIDC client
* redirect URI matching must be exact
* unregistered redirect URI must be rejected
* open redirect behavior is forbidden
* arbitrary URL redirects are forbidden
* state reflection is allowed only after redirect URI validation succeeds

Rules:

* do not redirect to unknown clients
* do not redirect to unregistered URI
* do not use partial, prefix, or wildcard matching
* do not infer client solely from redirect URI if ambiguity exists
* do not expose session or token state in redirect URI
* do not include access token, refresh token, ID Token, or token hash in redirect parameters

If redirect validation fails:

* do not redirect to the provided URI
* return deterministic error or safe fallback response
* do not reveal session/token internals

---

## XI. Logout CSRF Contract

CSRF protection is required for browser-facing logout mutation.

Sprint 15 must either:

1. implement CSRF protection for browser-facing logout; or
2. explicitly document why the implemented logout surface is not browser-mutating and therefore does not require CSRF protection.

Preferred CSRF models:

* double-submit cookie pattern
* synchronizer token pattern
* signed/hashed CSRF token associated with OIDC session

CSRF rules:

* CSRF token raw value MUST NOT be logged
* CSRF token hash/digest may be stored if needed
* invalid/missing CSRF token MUST reject browser-facing logout mutation
* CSRF error response MUST NOT expose session internals
* CSRF validation MUST occur before state mutation where feasible
* CSRF validation MUST NOT query user DB directly
* CSRF logic must remain inside OIDC/session/logout service boundary or generic middleware if already approved

Sprint 15 must not introduce ad-hoc CSRF logic scattered across controllers.

---

## XII. Refresh Token Revocation on Logout

Sprint 15 may revoke refresh token family on logout only if Sprint 15 assignment approves it.

Default approved behavior for Sprint 15:

* session invalidation is required
* refresh token family revocation on logout is conditionally allowed
* access token blacklist/persistence remains excluded

If refresh token revocation on logout is implemented, it MUST:

* use existing OIDC refresh token revocation service/repository behavior
* revoke only token family associated with the logged-out session/client context where such association exists
* avoid requiring raw refresh token storage
* avoid storing refresh tokens in session
* preserve compromised family state
* preserve consumed-token reuse detection
* preserve refresh-token rotation guarantees
* return non-revealing logout response
* not expose token hash
* not expose token family internals

Sprint 15 MUST NOT:

* persist access tokens
* blacklist JWT access tokens
* store refresh token raw value in session
* revoke tokens through `auth`
* store token revocation state in `users`
* use `token-lifecycle` for OIDC refresh token revocation

If session-to-refresh-token-family association does not exist from prior approved scope, Sprint 15 must not invent broad token revocation semantics without updating assignment/contract. It must document the limitation and hand off a later approved improvement.

---

## XIII. Access Token Logout Position

Sprint 15 does not implement stateful access-token logout.

Default behavior:

* access tokens remain short-lived JWTs
* access tokens are not persisted
* access token blacklist is not implemented
* logout does not mutate access token storage
* access token expiry remains governed by JWT `exp`

If future security policy requires immediate JWT access-token invalidation, that must be introduced by a separate approved contract that explicitly defines stateful access-token controls.

Sprint 15 must not silently add access-token persistence or blacklist behavior.

---

## XIV. Route / Endpoint Contract

Allowed affected routes:

* `POST /logout`, if implemented
* existing app route wiring needed to expose approved logout endpoint
* session cookie clearing within approved logout response

Allowed service integration:

* OIDC session service invalidation
* OIDC refresh token revocation service only if approved by assignment
* OIDC client validation for post-logout redirect only if redirect behavior is approved

Sprint 15 must not modify behavior of:

* `/token`, except where shared service internals require non-breaking compatibility
* `/revoke`, except where existing service is reused internally without changing endpoint contract
* `/introspect`, except where existing service remains compatible
* `/userinfo`
* `/authorize`, except where logout-cleared session naturally affects later authorize behavior

Sprint 15 must not introduce:

* admin logout endpoint
* external provider logout endpoint
* social login logout route
* MFA logout policy route

---

## XV. Boundary Rules

### `modules/oidc`

Owns:

* logout endpoint/controller
* logout service orchestration
* OIDC session invalidation
* OIDC session cookie clearing
* post-logout redirect validation
* logout CSRF handling
* optional OIDC refresh-token revocation integration

Must NOT:

* query user DB directly
* mutate user identity
* reuse Phase 03 `token-lifecycle`
* store raw tokens in session or logout state
* store password or password hash in session/logout state
* move logout behavior into `auth`
* move logout state into `users`
* implement admin dashboard behavior
* implement external identity provider logout
* add access-token blacklist without approved contract

### `modules/auth`

Must NOT:

* own logout behavior
* issue or clear OIDC session cookie
* invalidate OIDC session
* revoke OIDC refresh tokens
* introspect OIDC tokens
* issue tokens
* store logout state

### `modules/users`

Must NOT:

* store logout state
* store session state
* store token state
* mutate identity during logout
* receive session cookie value
* receive refresh token hash
* own logout policy

### `modules/token-lifecycle`

Must NOT be used for:

* OIDC logout
* OIDC session invalidation
* OIDC refresh token revocation
* access tokens
* refresh tokens
* ID tokens
* SSO state
* logout state

### `infrastructure/redis`

Allowed:

* store/update/delete session records through approved abstraction
* support low-level session persistence operations

Must NOT:

* own logout policy
* decide redirect behavior
* decide token revocation behavior
* contain domain-specific logout orchestration

---

## XVI. File Placement Contract

Expected implementation area:

* `src/modules/oidc`

Expected Sprint 15 changes may include:

* `src/modules/oidc/logout.service.ts`, if a dedicated service is needed
* updates to `src/modules/oidc/oidc-session.service.ts`
* updates to `src/modules/oidc/oidc-session.repository.ts`
* updates to `src/modules/oidc/refresh-token.service.ts`, only if logout-approved refresh-token revocation integration needs a service method
* updates to `src/modules/oidc/oidc.controller.ts`
* updates to `src/modules/oidc/oidc.service.ts`
* updates to `src/modules/oidc/oidc.types.ts`
* updates to `src/app/server.ts` for approved logout route wiring
* updates to `src/config/` only for centralized logout/cookie/CSRF/post-logout settings
* create `docs/planning/reports/phase-05-sprint-15-report.md`

Sprint 15 should not need:

* new top-level logout module
* new `auth` files
* new `users` token/session/logout fields
* new admin module
* new audit module
* new external provider module
* new access-token persistence model
* new token-lifecycle behavior

Do not create a separate top-level `logout` module unless architecture documents are updated first.

---

## XVII. Security Rules

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
* CSRF protection must be applied where browser-facing mutation exists
* post-logout redirect must be exact-match validated if implemented
* arbitrary redirect is forbidden
* access token persistence is forbidden
* access token blacklist is forbidden unless later approved
* `auth` must not own logout
* `users` must not store logout/session/token state
* `token-lifecycle` must not be reused
* no direct user DB access from `oidc`

---

## XVIII. Validation Requirements

### Static validation

Required commands:

* `npm.cmd run lint`
* `npm.cmd run typecheck`
* `npm.cmd run format:check`
* `npm.cmd run build`

If repository-wide `format:check` fails due known external formatting baseline drift, Sprint 15 report must include:

* full command result
* scoped Prettier check for Sprint 15 touched files
* explicit confirmation that Sprint 15 touched files pass formatting
* list of external failing files if available
* statement that no unrelated formatting cleanup was mixed into Sprint 15

### Boundary validation

Required scans:

* `rg -n "process\\.env" src --glob "!src/config/**"`
* `rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc`
* `rg -n "token-lifecycle" src/modules/oidc`
* `rg -n "logout|post_logout|front-channel|back-channel|csrf|session" src/modules/auth`
* `rg -n "logout|post_logout|front-channel|back-channel|csrf|session|tokenHash|refreshToken" src/modules/users`
* `rg -n "access_token|refresh_token|id_token|tokenHash|password_hash|passwordHash" src/modules/oidc/*logout* src/modules/oidc/*session* src/modules/oidc`
* `rg -n "access-token.*blacklist|blacklist.*access-token|persist.*access_token|accessToken.*model" src/modules/oidc src/modules/auth src/modules/users`

Expected posture:

* no direct `process.env` outside config
* no direct user DB access from `oidc`
* no `token-lifecycle` dependency from `oidc`
* no logout/session ownership in `auth`
* no logout/session/token state in `users`
* no raw token/password storage in logout/session implementation
* no access-token persistence or blacklist
* no external provider/social/MFA logout behavior introduced early

### Runtime/manual validation

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
16. Refresh token family is revoked on logout if Sprint 15 assignment approves token revocation on logout.
17. Refresh token family is not modified if Sprint 15 assignment excludes token revocation on logout.
18. Sprint 14 SSO/session non-regression remains PASS.
19. Sprint 13 revoke/introspection non-regression remains PASS.
20. Sprint 12 rotation/reuse/concurrency non-regression remains PASS.
21. Sprint 15 does not implement access-token persistence or blacklist behavior.
22. Sprint 15 does not add logout/session behavior to `auth`, `users`, or `token-lifecycle`.

---

## XIX. Merge-Blocking Conditions

Block Sprint 15 PR if any of these occur:

* this contract is not referenced
* Sprint 15 assignment is not referenced
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
* validation evidence is missing or placeholder-only
* unrelated formatting cleanup is mixed into implementation PR

---

## XX. Definition of Done

Sprint 15 is complete when:

* this contract is approved and referenced
* Sprint 15 assignment is approved and referenced
* Sprint 14 merge baseline is confirmed
* logout endpoint or approved logout service behavior is implemented
* OIDC session invalidation is integrated
* OIDC session cookie clearing is implemented where feasible
* logout is idempotent
* logout response is non-revealing
* post-logout redirect validation is implemented if approved
* logout CSRF protection is implemented or explicitly justified as not applicable
* refresh token revocation on logout is implemented if approved by assignment
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

## XXI. Handoff After Sprint 15

Sprint 15 closes the Phase 05 token/session lifecycle loop if all Sprint 11–15 deliverables remain valid.

After Sprint 15, next recommended work belongs to Phase 06 or dedicated hardening tracks, such as:

* admin controls
* client management hardening
* audit logging expansion
* observability and metrics
* key rotation hardening
* security review hardening
* repository-wide formatting baseline cleanup if still deferred

Sprint 15 does not authorize Phase 06 implementation by itself. Phase 06 must start from approved planning, contracts, and assignment documents.
