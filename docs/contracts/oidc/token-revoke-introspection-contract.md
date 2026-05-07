# docs/contracts/oidc/token-revoke-introspection-contract.md

# eTroy OIDC - Token Revoke and Introspection Contract

---

## I. Purpose

This contract defines the approved token revocation and token introspection behavior for Phase 05 / Sprint 13.

It governs:

* refresh token revocation
* revocation by presented refresh token
* refresh token family handling during revocation
* revocation metadata transitions
* token introspection endpoint or service behavior
* introspection response contract
* non-revealing error and inactive-token behavior
* boundary rules between `oidc`, `auth`, `users`, and `token-lifecycle`

This contract must be approved before Sprint 13 implementation starts.

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
* `docs/planning/reports/phase-05-sprint-11-report.md`
* `docs/planning/reports/phase-05-sprint-12-report.md`

If this contract conflicts with architecture or requirements documents, the higher-authority document wins.

---

## III. Contract Position

Sprint 11 completed the refresh token foundation.

Sprint 12 completed refresh token rotation and reuse detection.

Sprint 13 extends the existing refresh-token lifecycle by adding controlled token revocation and introspection surfaces.

Sprint 13 must preserve all Sprint 11 and Sprint 12 guarantees:

* refresh tokens are opaque
* refresh tokens are stored hashed only
* raw refresh tokens are never persisted
* `auth` does not issue or validate OIDC tokens
* `users` does not store token state
* `token-lifecycle` is not reused for OIDC tokens
* refresh-token rotation remains active
* consumed-token reuse remains rejected
* reuse detection continues to compromise the token family
* concurrent refresh protection remains intact
* access tokens remain short-lived JWTs
* access tokens are not persisted or blacklisted unless a later approved contract explicitly allows it

Sprint 13 must not redefine:

* JWT access token format
* ID Token format
* claims mapper behavior
* `/userinfo` behavior
* refresh token opacity
* refresh token hash-only persistence
* refresh token rotation and reuse detection semantics except where necessary to respect revocation state

---

## IV. Sprint Scope

### Included in Sprint 13

* token revocation endpoint or service contract
* refresh token revocation by presented refresh token
* refresh token hash lookup for revocation
* setting revocation metadata on token records
* rejecting revoked refresh tokens during refresh-token grant
* revoking active refresh token family state when required by this contract
* non-revealing revoke response behavior
* token introspection endpoint or internal introspection service, if implemented under Sprint 13 assignment
* refresh token introspection by presented token, if implemented
* safe introspection response contract
* validation that revoked tokens cannot be reused
* validation that introspection does not expose sensitive persistence details
* Sprint 13 report creation

### Excluded from Sprint 13

* OIDC session management
* SSO behavior
* logout hardening
* admin token management UI
* audit module expansion
* external security event pipeline
* access token persistence
* access token blacklist behavior
* changing JWT access token format
* changing ID Token format
* changing UserInfo claims
* changing refresh-token rotation policy beyond revocation compatibility
* social login
* MFA
* external identity federation
* broad platform hardening outside token revoke/introspection scope
* unrelated repository-wide formatting cleanup

These excluded items remain Sprint 14+ or later Phase 05/Phase 06 scope unless explicitly approved by a separate contract update.

---

## V. Token Types Covered

### Refresh Token

Sprint 13 supports revocation and introspection for OIDC refresh tokens.

Refresh token revocation is required Sprint 13 scope.

Refresh token introspection is allowed Sprint 13 scope if approved by the Sprint 13 assignment.

### Access Token

Sprint 13 does not introduce access-token persistence or access-token blacklist behavior.

Access token introspection may be implemented only as stateless JWT validation if explicitly approved by Sprint 13 assignment.

Default Sprint 13 position:

* access tokens remain JWTs
* access tokens remain short-lived
* access tokens are validated by signature, issuer, audience, expiry, and scope
* access tokens are not persisted
* access-token revocation is not implemented in Sprint 13 unless a separate approved contract introduces a stateful access-token control model

### ID Token

Sprint 13 does not revoke or introspect ID Tokens.

ID Token behavior remains governed by `jwt-token-contract.md`.

---

## VI. Revocation Endpoint Contract

Sprint 13 may expose:

* `POST /revoke`

Expected request body format:

* `token=<opaque-refresh-token>`
* `token_type_hint=refresh_token`
* `client_id=<client-id>`

Client authentication or client validation requirements must follow the approved existing OIDC client validation model unless Sprint 13 assignment defines a stricter rule.

### Required behavior

The revoke endpoint MUST:

* accept a presented token value
* hash or digest the presented refresh token using the approved refresh-token hashing strategy
* look up the refresh token by hash
* validate client ownership when token is found
* set revocation metadata when a valid matching refresh token is found
* prevent the revoked token from being used in future refresh-token grant exchanges
* return a non-revealing successful response for unknown token values where OAuth-compatible behavior requires it
* avoid exposing whether the token existed

### Successful response

Recommended response:

* HTTP status: `200`
* response body: empty object or minimal success payload

Allowed minimal response body:

* `{ "revoked": true }`

If the project chooses OAuth-compatible silent revocation semantics, the response body may omit token existence details.

### Non-revealing behavior

The endpoint MUST NOT reveal:

* whether the token exists
* whether the token was already revoked
* whether the token was consumed
* whether the token was compromised
* whether the token belongs to a different client
* token hash
* token lineage metadata

### Error cases

The endpoint MAY reject:

* missing token
* malformed request
* unsupported `token_type_hint`
* invalid client
* unauthorized client

Error responses MUST NOT expose persisted token details.

---

## VII. Revocation Metadata Contract

Refresh token records MUST support revocation metadata.

Sprint 11 already reserved:

* `revokedAt?: Date | null`

Sprint 12 introduced or preserved:

* `status: 'active' | 'consumed' | 'revoked' | 'compromised'`
* `familyId`
* `parentTokenId`
* `replacedByTokenId`

Sprint 13 may add:

* `revokedReason?: 'client_request' | 'security_policy' | 'logout' | 'admin_action' | null`
* `revokedByClientId?: string | null`

### Required metadata transitions

When a refresh token is revoked:

* `revokedAt` MUST be set
* `status` MUST become `revoked` unless the token is already `compromised`
* `updatedAt` MUST be updated
* raw token value MUST NOT be stored
* token hash MUST NOT be exposed

### State precedence

State precedence:

1. `compromised`
2. `revoked`
3. `consumed`
4. `active`

Rules:

* a compromised token family MUST remain compromised
* revocation MUST NOT downgrade compromised state
* revoked token MUST NOT become active again
* consumed token MUST NOT become active again
* expired token MUST NOT become active again

---

## VIII. Family Revocation Rules

Default Sprint 13 behavior:

* revocation by presented refresh token SHOULD revoke the presented token and the active token in the same family.

Rationale:

* Sprint 12 rotation means older tokens are usually consumed.
* If a client revokes a refresh token, the durable authorization represented by the refresh token family should be invalidated.
* Revoking the family prevents a newer rotated token in the same family from remaining usable unexpectedly.

Required behavior:

* find the refresh token by presented token hash
* identify its `familyId`
* mark active token(s) in the same family as revoked
* preserve compromised state if family was already compromised
* ensure no token in the family can be used for future refresh grant after family revocation
* do not issue access token during revocation
* do not issue refresh token during revocation

Allowed implementation:

* repository method to revoke family by `familyId`
* service-level orchestration inside `modules/oidc`
* status transition from `active` to `revoked`
* `revokedAt` timestamp applied consistently

Forbidden implementation:

* revoking only the consumed parent while leaving active child usable, unless Sprint 13 assignment explicitly chooses single-token revocation
* deleting token records to represent revocation
* moving token state into `users`
* using `auth` for revocation
* using `token-lifecycle` for revocation

---

## IX. Refresh Grant Compatibility

After Sprint 13, refresh-token grant validation MUST reject:

* expired refresh token
* consumed refresh token
* revoked refresh token
* compromised refresh token
* refresh token from compromised family
* refresh token from revoked family
* client-mismatched refresh token
* unknown refresh token

If a revoked token is presented during refresh-token grant:

* request MUST be rejected
* OAuth error SHOULD be `invalid_grant`
* no access token may be issued
* no refresh token may be issued
* response MUST remain non-revealing

Revocation handling MUST NOT break Sprint 12 guarantees:

* rotation still occurs for valid active refresh token
* old token still becomes consumed
* reuse of consumed token still triggers compromise behavior
* concurrent refresh protection still allows only one successful rotation

---

## X. Introspection Endpoint Contract

Sprint 13 may expose:

* `POST /introspect`

Expected request body format:

* `token=<token>`
* `token_type_hint=refresh_token` or `access_token`
* `client_id=<client-id>`

Client authentication or validation requirements must follow the approved existing OIDC client validation model unless Sprint 13 assignment defines a stricter rule.

### Required behavior if introspection is implemented

The introspection endpoint MUST:

* accept a presented token
* determine token type from `token_type_hint` or safe token parsing
* return a safe active/inactive result
* avoid exposing persistence internals
* avoid exposing token hash
* avoid exposing raw stored metadata unnecessarily
* enforce client ownership or audience compatibility
* return inactive for unknown, expired, revoked, consumed, compromised, or client-mismatched tokens

### Minimal inactive response

Inactive response MUST be:

* `active: false`

Recommended inactive response body:

* `{ "active": false }`

### Refresh token active response

For an active refresh token, response MAY include:

* `active: true`
* `client_id`
* `sub`
* `scope`
* `exp`
* `iat`
* `token_type: "refresh_token"`

It MUST NOT include:

* token hash
* raw token
* internal database ID unless explicitly approved
* full lineage graph
* password or password hash
* full user profile
* compromise details
* replacement token ID
* parent token ID

### Access token active response

If access token introspection is approved, it MUST be stateless JWT validation only unless a later contract explicitly approves access-token persistence.

For a valid JWT access token, response MAY include:

* `active: true`
* `client_id` or `aud`
* `sub`
* `scope`
* `exp`
* `iat`
* `iss`
* `token_type: "access_token"`

It MUST NOT include:

* refresh token state
* ID Token data
* password or password hash
* full user profile
* raw persistence fields
* signing secrets
* JWKS private key data

---

## XI. Introspection Active Rules

A refresh token is active only when all are true:

* token hash is known
* token belongs to the requesting/validated client
* token is not expired
* token status is `active`
* `consumedAt` is null
* `revokedAt` is null
* token family is not compromised
* token family is not revoked
* token is not replaced by a child token

A refresh token is inactive when any are true:

* token is unknown
* token is expired
* token is consumed
* token is revoked
* token is compromised
* token family is compromised
* token family is revoked
* client does not match
* token hash lookup fails

An access token is active only when all are true:

* JWT signature is valid
* issuer is valid
* audience/client is valid
* `exp` is in the future
* required claims are present
* token format follows `jwt-token-contract.md`

An access token is inactive when any are true:

* token is malformed
* signature is invalid
* issuer is invalid
* audience/client mismatch occurs
* token is expired
* required claims are missing

---

## XII. Introspection Security Rules

Mandatory:

* inactive response must be non-revealing
* unknown token must return `active: false`, not detailed error
* expired token must return `active: false`
* revoked token must return `active: false`
* consumed token must return `active: false`
* compromised token must return `active: false`
* client-mismatched token must return `active: false`
* token hash must never be returned
* raw token must never be returned
* internal lifecycle transition details must not be returned
* introspection must not query `users` DB directly
* introspection must not call `auth`
* introspection must not use `token-lifecycle`
* introspection must not create tokens
* introspection must not mutate token state

---

## XIII. Boundary Rules

### `modules/oidc`

Owns:

* token revocation
* revocation metadata transitions
* refresh token family revocation
* token introspection
* active/inactive token evaluation
* refresh-token grant compatibility with revoked state

Must NOT:

* query user DB directly
* mutate user identity
* reuse Phase 03 `token-lifecycle`
* store raw refresh tokens
* expose token hashes
* move revoke/introspection logic into `auth`
* move token state into `users`
* implement session/SSO/logout behavior in Sprint 13
* implement admin token management UI in Sprint 13

### `modules/auth`

Must NOT:

* revoke OIDC tokens
* introspect OIDC tokens
* validate refresh tokens
* mutate refresh token state
* issue access tokens
* issue refresh tokens
* manage sessions

### `modules/users`

Must NOT:

* store token revocation state
* store introspection state
* store refresh token family state
* issue or validate refresh tokens
* own OIDC lifecycle behavior

### `modules/token-lifecycle`

Must NOT be used for:

* OIDC access tokens
* OIDC refresh tokens
* ID tokens
* authorization codes
* session state
* SSO state
* logout state
* token revocation
* token introspection

---

## XIV. File Placement Contract

Expected implementation area:

* `src/modules/oidc`

Expected Sprint 13 changes may include:

* update `src/modules/oidc/refresh-token.model.ts`
* update `src/modules/oidc/refresh-token.repository.ts`
* update `src/modules/oidc/refresh-token.service.ts`
* update `src/modules/oidc/oidc.service.ts`
* update `src/modules/oidc/oidc.controller.ts`
* update `src/modules/oidc/oidc.types.ts`
* update app route wiring only for approved `/revoke` and `/introspect` routes
* create `docs/planning/reports/phase-05-sprint-13-report.md`

Sprint 13 should not need:

* new top-level module
* new infrastructure adapter
* new `auth` files
* new `users` token fields
* new session storage
* new admin module
* new audit module

Do not create a separate `token-revocation` or `token-introspection` module unless architecture documents are updated first.

---

## XV. Security Rules

Mandatory:

* raw refresh tokens must never be persisted
* raw refresh tokens must never be logged
* refresh token hashes must never be exposed
* revoke response must not reveal token existence
* introspection inactive response must be non-revealing
* revoked refresh tokens must not be usable
* revoked families must not be usable
* compromised families must remain unusable
* consumed-token reuse detection must remain active
* client mismatch must be rejected or returned inactive depending on endpoint semantics
* expired tokens must be rejected or returned inactive depending on endpoint semantics
* access tokens must remain short-lived JWTs
* access tokens must not be persisted
* `auth` must not own token revocation or introspection
* `users` must not store token state
* `token-lifecycle` must not be reused
* no password or password hash may appear in revoke/introspection responses

---

## XVI. Validation Requirements

### Static validation

Required commands:

* `npm.cmd run lint`
* `npm.cmd run typecheck`
* `npm.cmd run format:check`
* `npm.cmd run build`

If repository-wide `format:check` fails due known external formatting baseline drift, Sprint 13 report must include:

* full command result
* scoped Prettier check for Sprint 13 touched files
* explicit confirmation that Sprint 13 touched files pass formatting
* list of external failing files if available
* statement that no unrelated formatting cleanup was mixed into Sprint 13

### Boundary validation

Required scans:

* `rg -n "process\\.env" src --glob "!src/config/**"`
* `rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc`
* `rg -n "token-lifecycle" src/modules/oidc`
* `rg -n "revoke|revocation|introspect|introspection" src/modules/auth`
* `rg -n "revoke|revocation|introspect|introspection|tokenHash|familyId" src/modules/users`
* `rg -n "password_hash|passwordHash" src/modules/oidc`
* `rg -n "session|sso|logout" src/modules/oidc src/app`

Expected posture:

* no direct `process.env` outside config
* no direct user DB access from `oidc`
* no `token-lifecycle` dependency from `oidc`
* no revoke/introspection behavior in `auth`
* no token revocation/introspection state in `users`
* no password hash exposure in `oidc`
* no Sprint 14+ behavior introduced early

### Runtime/manual validation

Required scenarios:

1. Valid active refresh token can be revoked.
2. Revoked refresh token cannot be used for refresh-token grant.
3. Revoking an unknown token returns non-revealing success or approved non-revealing response.
4. Revoking an already revoked token is idempotent and non-revealing.
5. Revoking a consumed token does not reactivate it.
6. Revoking a token in a compromised family does not downgrade compromised state.
7. Family revocation invalidates active token in same family.
8. Refresh-token grant after family revocation is rejected.
9. Reuse detection remains active after Sprint 13 changes.
10. Concurrent refresh protection remains active after Sprint 13 changes.
11. Refresh token introspection returns `active: true` for active token, if introspection is implemented.
12. Refresh token introspection returns `active: false` for revoked token, if introspection is implemented.
13. Refresh token introspection returns `active: false` for consumed token, if introspection is implemented.
14. Refresh token introspection returns `active: false` for compromised family, if introspection is implemented.
15. Refresh token introspection returns `active: false` for unknown token, if introspection is implemented.
16. Access token introspection returns `active: true` for valid JWT, if access token introspection is implemented.
17. Access token introspection returns `active: false` for expired or invalid JWT, if access token introspection is implemented.
18. Introspection does not return token hash, raw token, password, password hash, or lineage internals.
19. Sprint 13 does not implement session, SSO, or logout behavior.

---

## XVII. Merge-Blocking Conditions

Block Sprint 13 PR if any of these occur:

* this contract is not referenced
* Sprint 13 assignment is not referenced
* Sprint 12 merge baseline is not confirmed
* raw refresh token is stored
* refresh token hash is exposed
* revoked refresh token remains usable
* revoked family remains usable
* compromised family becomes usable again
* consumed-token reuse detection is broken
* concurrent refresh protection is broken
* introspection returns token hash
* introspection returns raw token
* introspection exposes lineage internals
* introspection exposes password or password hash
* revoke/introspection logic appears in `auth`
* revocation/introspection state appears in `users`
* `oidc` imports user model or user repository
* `oidc` uses Phase 03 `token-lifecycle`
* access token is persisted
* access token blacklist is introduced without explicit approval
* access token renewal broadens scope
* session/SSO/logout behavior appears before Sprint 14/15 approval
* validation evidence is missing or placeholder-only
* unrelated formatting cleanup is mixed into the implementation PR

---

## XVIII. Definition of Done

Sprint 13 is complete when:

* this contract is approved and referenced
* Sprint 13 assignment is approved and referenced
* Sprint 12 merge baseline is confirmed
* refresh token revocation is implemented
* revoked refresh token cannot be used for refresh-token grant
* family revocation behavior is implemented according to this contract
* revocation response is non-revealing
* introspection is implemented if approved by Sprint 13 assignment
* introspection inactive responses are non-revealing
* introspection does not expose sensitive token state
* Sprint 12 rotation/reuse/concurrency guarantees remain intact
* no raw refresh token is persisted, logged, or exposed
* no revoke/introspection behavior is implemented in `auth`
* no token state is added to `users`
* no `token-lifecycle` dependency appears in `oidc`
* no Sprint 14+ behavior is introduced early
* all required validation evidence is recorded
* Sprint 13 report is created

---

## XIX. Handoff to Sprint 14

Sprint 13 produces the revocation and introspection control surface.

Sprint 14 remains responsible for:

* OIDC session management
* SSO behavior across approved clients
* browser-facing session state
* session expiration policy
* session invalidation primitives needed by logout
* Redis-backed or approved infrastructure-backed session storage

Sprint 14 must not start implementation until its assignment or contract is approved.
