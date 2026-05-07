# eTroy OIDC - Session and SSO Contract

---

## I. Purpose

This contract defines the approved OIDC session and SSO behavior for Phase 05 / Sprint 14.

It governs:

* OIDC-managed browser session lifecycle
* session creation after approved authentication
* session lookup during repeated `/authorize` requests
* SSO reuse across approved clients
* session expiration policy
* session storage through approved infrastructure abstraction
* browser-facing cookie behavior
* CSRF protection where relevant
* session invalidation primitives needed by Sprint 15 logout
* boundary rules between `oidc`, `auth`, `users`, `infrastructure`, and `token-lifecycle`

This contract must be approved before Sprint 14 implementation starts.

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
* `docs/planning/reports/phase-05-sprint-11-report.md`
* `docs/planning/reports/phase-05-sprint-12-report.md`
* `docs/planning/reports/phase-05-sprint-13-report.md`

If this contract conflicts with architecture or requirements documents, the higher-authority document wins.

---

## III. Contract Position

Sprint 11 completed refresh token foundation.

Sprint 12 completed refresh token rotation and reuse detection.

Sprint 13 completed token revocation and introspection.

Sprint 14 adds OIDC-managed browser session and SSO behavior.

Sprint 14 must preserve all Sprint 11–13 guarantees:

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
* `auth` remains credential validation only
* `users` remains identity source of truth
* `token-lifecycle` is not reused for OIDC tokens or sessions

Sprint 14 must not redefine:

* JWT access token format
* ID Token format
* claims mapper behavior
* `/userinfo` behavior
* refresh token opacity
* refresh token hash-only persistence
* refresh-token rotation/reuse behavior
* revoke endpoint behavior
* introspection endpoint behavior

---

## IV. Sprint Scope

### Included in Sprint 14

* OIDC session model or session record contract
* OIDC session service under `modules/oidc`
* session creation after approved authentication
* session lookup during `/authorize`
* session validation
* session expiration enforcement
* session storage through approved Redis or infrastructure-backed abstraction
* session cookie issuance
* session cookie parsing/validation
* SSO reuse across approved clients
* client participation tracking for an OIDC session, if needed for SSO/logout handoff
* session invalidation primitive needed by Sprint 15 logout
* CSRF protection where relevant to browser-facing session flows
* validation evidence that session state does not store raw tokens, passwords, password hashes, or full user profile payloads
* Sprint 14 report creation

### Excluded from Sprint 14

* logout endpoint hardening
* front-channel logout
* back-channel logout
* RP-initiated logout final behavior
* refresh token revocation on logout
* token revocation changes
* token introspection changes
* refresh token rotation changes
* access token persistence
* access token blacklist behavior
* changing JWT access token format
* changing ID Token format
* changing UserInfo claims
* admin session management UI
* audit module expansion
* social login
* MFA
* external identity federation
* broad platform hardening outside session/SSO scope
* unrelated repository-wide formatting cleanup

These excluded items remain Sprint 15+ or later Phase 05/Phase 06 scope unless explicitly approved by a separate contract update.

---

## V. Session Ownership

OIDC session lifecycle belongs to `modules/oidc`.

`modules/oidc` owns:

* session creation
* session lookup
* session validation
* session expiration
* session client participation metadata
* session invalidation primitive
* SSO reuse behavior

`modules/auth` owns credential validation only.

`modules/auth` must not:

* persist sessions
* issue session cookies
* validate OIDC sessions
* own SSO state
* manage logout state

`modules/users` owns identity data only.

`modules/users` must not:

* persist session state
* own SSO state
* receive session cookie values
* store session-client participation data

`modules/token-lifecycle` must not be used for:

* OIDC sessions
* SSO state
* session cookies
* logout state
* access tokens
* refresh tokens
* ID tokens

---

## VI. Session Storage Contract

Session state must be stored through an approved infrastructure-backed abstraction.

Preferred storage:

* Redis via `src/infrastructure/redis`

Allowed if Redis is not yet fully available in implementation baseline:

* an approved OIDC repository/service abstraction that can later be backed by Redis
* a clearly documented temporary in-memory validation harness only for tests/manual validation, not production runtime

Forbidden:

* storing OIDC session state in `users`
* storing OIDC session state in `auth`
* storing OIDC session state in `token-lifecycle`
* storing session state directly inside controller globals
* storing full identity records in session
* storing raw access tokens in session
* storing raw refresh tokens in session
* storing ID Tokens in session
* storing passwords or password hashes in session

### Required session record fields

A session record MUST include:

* `sessionId`
* `subject`
* `createdAt`
* `expiresAt`
* `lastSeenAt`
* `clientIds`
* `status`

Recommended TypeScript shape:

* `sessionId: string`
* `subject: string`
* `createdAt: Date`
* `expiresAt: Date`
* `lastSeenAt: Date`
* `clientIds: string[]`
* `status: 'active' | 'expired' | 'invalidated'`

Optional fields:

* `authTime?: Date`
* `ipHash?: string`
* `userAgentHash?: string`
* `invalidatedAt?: Date | null`
* `csrfTokenHash?: string | null`

### Field Rules

* `sessionId` MUST be high entropy.
* `sessionId` MUST NOT be derived from user identity data.
* `subject` MUST reference approved user subject (`sub`).
* `clientIds` MUST include approved OIDC clients that reused or participated in the session.
* `expiresAt` MUST be enforced.
* `status` MUST represent lifecycle state.
* `csrfTokenHash`, if used, MUST store only a hash/digest.
* raw CSRF token values MUST NOT be persisted if avoidable.
* raw session cookie value MUST NOT be logged.

---

## VII. Session Cookie Contract

Sprint 14 may introduce a browser-facing OIDC session cookie.

Recommended cookie name:

* `etroy_oidc_sid`

Rules:

* cookie value MUST be high entropy or a protected opaque session handle
* cookie value MUST NOT contain raw user identity data
* cookie value MUST NOT contain access token
* cookie value MUST NOT contain refresh token
* cookie value MUST NOT contain ID Token
* cookie value MUST NOT contain password or password hash
* cookie MUST be `HttpOnly`
* cookie MUST use `SameSite=Lax` by default unless an approved browser/OIDC flow requires a stricter or different setting
* cookie MUST use `Secure` in production
* cookie path SHOULD be restricted to OIDC-relevant paths where feasible
* cookie max-age or expiry MUST align with session expiration policy
* cookie handling must be centralized in OIDC service/controller boundary, not scattered across app code

Environment-specific secure-cookie behavior must go through centralized config if configurable.

---

## VIII. Session Creation Contract

A session may be created only after approved authentication.

Allowed creation points:

* successful local credential authentication as part of an OIDC interaction
* approved auth-bridge result consumed by OIDC
* other explicitly approved authentication completion boundary

Rules:

* `auth` may validate credentials and return authentication result
* `oidc` creates the OIDC session
* session creation MUST record `subject`
* session creation MUST record initial `clientId`
* session creation MUST set `createdAt`, `lastSeenAt`, and `expiresAt`
* session creation MUST set status to `active`
* session creation MUST issue the session cookie if browser flow requires it
* session creation MUST NOT issue access token directly
* session creation MUST NOT bypass authorization-code flow
* session creation MUST NOT persist password or credential material

---

## IX. Session Lookup Contract

Repeated `/authorize` requests may use an active OIDC session to avoid re-authentication.

Session lookup rules:

* parse session cookie
* locate session through approved OIDC session service
* reject missing session
* reject unknown session
* reject expired session
* reject invalidated session
* reject malformed cookie/session handle
* update `lastSeenAt` when safe and appropriate
* add requesting `clientId` to `clientIds` when SSO reuse is accepted
* continue OIDC authorization flow without credential prompt when session is active and client/request validation succeeds

Session lookup MUST NOT:

* bypass `client_id` validation
* bypass `redirect_uri` validation
* bypass PKCE requirements
* bypass consent rules if consent is required by future approved contract
* bypass account status checks if required by approved users contract
* query users DB directly
* generate token response directly from `/authorize`

---

## X. SSO Behavior Contract

SSO means a valid OIDC session can be reused across approved clients.

Rules:

* SSO reuse is allowed only for validated OIDC clients
* client must pass normal `/authorize` validation
* redirect URI must remain exact-match validated
* PKCE rules must remain enforced
* session subject must become the authenticated subject for the authorization flow
* SSO reuse may issue a new authorization code after normal authorize continuation rules
* SSO reuse MUST NOT directly return tokens from `/authorize`
* SSO reuse MUST NOT skip security checks unrelated to credential prompt
* session `clientIds` SHOULD track every client that successfully reused the session
* SSO must not allow one client to access another client's tokens
* SSO must not weaken refresh-token rotation/reuse/revocation guarantees

---

## XI. Session Expiration Policy

Default Sprint 14 session TTL:

* OIDC browser session: 8 hours

Rules:

* TTL MUST be centralized through config if configurable
* `expiresAt` MUST be persisted
* expired session MUST be rejected
* expired session MUST NOT be reused for SSO
* expired session SHOULD cause session cookie clearing where feasible
* session expiration MUST NOT revoke refresh tokens in Sprint 14 unless explicitly approved
* sliding expiration is not enabled by default
* sliding expiration may be added only if explicitly approved by assignment or contract update

---

## XII. Session Invalidation Primitive

Sprint 14 must provide a session invalidation primitive for Sprint 15 logout.

Required service behavior:

* invalidate session by `sessionId`
* mark session `status = 'invalidated'`
* set `invalidatedAt`
* prevent future SSO reuse
* support idempotent invalidation
* avoid token revocation unless explicitly approved by Sprint 15 contract
* avoid logout redirect behavior in Sprint 14

This is a primitive only. Sprint 14 must not implement final logout endpoint behavior unless Sprint 14 assignment explicitly approves a minimal internal route for validation.

Sprint 15 owns logout hardening and final logout behavior.

---

## XIII. CSRF Protection Contract

CSRF protection is required where browser-facing session mutation occurs.

Relevant mutation points may include:

* session creation continuation endpoint
* session invalidation primitive if exposed through browser-facing route
* future logout endpoint

Sprint 14 minimum:

* identify browser-facing session mutation endpoints
* apply CSRF protection if such endpoints are exposed
* use a non-secret-safe response pattern for invalid CSRF
* do not log CSRF token raw values
* store only CSRF hash/digest if persistence is needed

If Sprint 14 does not expose a browser-facing session mutation endpoint beyond existing validated OIDC flow, the report must explicitly document why additional CSRF implementation is not required in Sprint 14 and hand it off to Sprint 15 logout.

---

## XIV. Route / Endpoint Contract

Sprint 14 may update existing OIDC browser flow endpoints.

Allowed affected endpoints:

* `GET /authorize`
* `POST /authorize/continue`

Allowed behavior changes:

* read OIDC session cookie
* create OIDC session after approved authentication continuation
* reuse active session for SSO where request/client validation succeeds
* clear expired or invalid session cookie where feasible

Sprint 14 should not introduce final logout endpoint.

Sprint 14 must not modify:

* `/token` behavior except where session context is already part of an approved future contract
* `/revoke`
* `/introspect`
* `/userinfo`
* refresh token rotation behavior
* refresh token revocation behavior
* token introspection behavior

---

## XV. Boundary Rules

### `modules/oidc`

Owns:

* session creation
* session lookup
* session validation
* session expiration
* SSO reuse
* session invalidation primitive
* session cookie coordination

Must NOT:

* query user DB directly
* mutate user identity
* reuse Phase 03 `token-lifecycle`
* store raw tokens in session state
* store password or password hash in session state
* move session behavior into `auth`
* move session state into `users`
* implement final logout behavior in Sprint 14
* change token revocation/introspection behavior unless explicitly required by approved contract

### `modules/auth`

Must NOT:

* issue OIDC session
* persist OIDC session
* validate OIDC session
* own SSO behavior
* own logout behavior
* issue tokens

### `modules/users`

Must NOT:

* store session state
* store session-client participation
* own SSO behavior
* own logout behavior
* receive session cookie value
* store tokens

### `modules/token-lifecycle`

Must NOT be used for:

* OIDC session
* SSO state
* logout state
* session cookie
* OIDC token lifecycle

### `infrastructure/redis`

Allowed:

* store session records
* retrieve session records
* delete/session-expire records
* provide low-level Redis operations through approved abstraction

Must NOT:

* own OIDC session policy
* decide SSO behavior
* implement logout policy
* contain domain-specific session orchestration

---

## XVI. File Placement Contract

Expected implementation area:

* `src/modules/oidc`

Expected Sprint 14 changes may include:

* `src/modules/oidc/oidc-session.model.ts`
* `src/modules/oidc/oidc-session.repository.ts`
* `src/modules/oidc/oidc-session.service.ts`
* updates to `src/modules/oidc/oidc.service.ts`
* updates to `src/modules/oidc/oidc.controller.ts`
* updates to `src/modules/oidc/oidc.types.ts`
* updates to app route wiring only for approved session/SSO behavior
* updates to `src/config/` only for centralized session TTL/cookie settings
* create `docs/planning/reports/phase-05-sprint-14-report.md`

Optional if existing Redis abstraction is insufficient:

* minimal adapter extension under `src/infrastructure/redis`, but only as low-level infrastructure support

Sprint 14 should not need:

* new top-level session module
* new `auth` files
* new `users` token/session fields
* new logout module
* new admin module
* new audit module

Do not create a separate `session` module unless architecture documents are updated first.

---

## XVII. Security Rules

Mandatory:

* no raw access token in session state
* no raw refresh token in session state
* no ID Token in session state
* no password in session state
* no password hash in session state
* no full user profile payload in session state
* session cookie must be opaque or protected
* session cookie must be `HttpOnly`
* session cookie must be `Secure` in production
* session cookie must not expose identity data
* expired sessions must be rejected
* invalidated sessions must be rejected
* SSO must not bypass client validation
* SSO must not bypass redirect URI validation
* SSO must not bypass PKCE validation
* SSO must not bypass token lifecycle guarantees
* session logic must not be added to `auth`
* session state must not be added to `users`
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

If repository-wide `format:check` fails due known external formatting baseline drift, Sprint 14 report must include:

* full command result
* scoped Prettier check for Sprint 14 touched files
* explicit confirmation that Sprint 14 touched files pass formatting
* list of external failing files if available
* statement that no unrelated formatting cleanup was mixed into Sprint 14

### Boundary validation

Required scans:

* `rg -n "process\\.env" src --glob "!src/config/**"`
* `rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc`
* `rg -n "token-lifecycle" src/modules/oidc`
* `rg -n "session|sso|cookie|csrf|logout" src/modules/auth`
* `rg -n "session|sso|cookie|csrf|logout" src/modules/users`
* `rg -n "access_token|refresh_token|id_token|tokenHash|password_hash|passwordHash" src/modules/oidc/*session* src/modules/oidc`
* `rg -n "logout" src/modules/oidc src/app`

Expected posture:

* no direct `process.env` outside config
* no direct user DB access from `oidc`
* no `token-lifecycle` dependency from `oidc`
* no session/SSO behavior in `auth`
* no session/SSO state in `users`
* no raw token/password storage in session implementation
* no final logout behavior introduced early

### Runtime/manual validation

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

## XIX. Merge-Blocking Conditions

Block Sprint 14 PR if any of these occur:

* this contract is not referenced
* Sprint 14 assignment is not referenced
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
* validation evidence is missing or placeholder-only
* unrelated formatting cleanup is mixed into the implementation PR

---

## XX. Definition of Done

Sprint 14 is complete when:

* this contract is approved and referenced
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

## XXI. Handoff to Sprint 15

Sprint 14 produces the OIDC session and SSO foundation.

Sprint 15 remains responsible for:

* logout endpoint behavior
* session invalidation through browser-facing logout
* refresh token revocation on logout, if approved
* client redirect validation for logout continuation, if approved
* logout CSRF controls
* idempotent logout handling
* post-logout behavior for browser clients

Sprint 15 must not start implementation until its assignment or contract is approved.
