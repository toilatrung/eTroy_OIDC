# eTroy OIDC - Refresh Token Contract

## I. Purpose

This contract defines the approved refresh token behavior for Phase 05 / Sprint 11.

It governs:

- refresh token issuance
- refresh token response behavior
- refresh token hashed persistence
- refresh token expiration
- refresh token validation
- `grant_type=refresh_token` baseline
- access token renewal through refresh token flow
- boundary rules between `oidc`, `auth`, `users`, and `token-lifecycle`

This contract must be approved before Sprint 11 implementation starts.

---

## II. Authority

This contract is subordinate to:

- `docs/source-of-truth-index.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/requirements/srs-v1.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-04-oidc-core.md`
- `docs/planning/phases/phase-05-token-session-management.md`
- `docs/contracts/oidc/jwt-token-contract.md`

If this contract conflicts with architecture or requirements documents, the higher-authority document wins.

---

## III. Contract Position

`docs/contracts/oidc/jwt-token-contract.md` defines the Phase 04 / Sprint 10 JWT access token, ID Token, claims, and UserInfo baseline. It explicitly hands off refresh token lifecycle, refresh token hashing, rotation, revoke, introspection, session lifecycle, SSO, and logout hardening to Phase 05.

This refresh token contract extends that baseline for Phase 05 / Sprint 11.

Sprint 11 must not redefine:

- JWT access token format
- ID Token format
- claims mapper behavior
- `/userinfo` claim output
- RS256 signing rules
- JWKS usage

Sprint 11 introduces refresh-token-backed access token renewal.

---

## IV. Sprint Scope

### Included in Sprint 11

- refresh token issuance during approved authorization-code token exchange
- refresh token raw value returned to client only once
- refresh token hash persistence
- refresh token expiration metadata
- refresh token lookup by hash
- refresh token validation
- `grant_type=refresh_token` baseline
- issuing a new JWT access token from a valid refresh token
- deterministic invalid/expired refresh token error handling
- validation evidence proving raw refresh tokens are never persisted

### Excluded from Sprint 11

- refresh token rotation
- refresh token family tracking
- refresh token reuse detection
- token revocation endpoint
- token introspection endpoint
- OIDC session management
- SSO behavior
- logout hardening
- admin token management
- audit module expansion
- stateful access token persistence
- access token blacklist behavior
- Phase 03 token-lifecycle reuse
- direct user DB access from `oidc`

These excluded items remain Sprint 12+ or later Phase 05 scope unless explicitly approved by a separate contract update.

---

## V. Refresh Token Type

Refresh tokens are opaque bearer credentials.

### Rules

- refresh token value MUST be high entropy
- refresh token value MUST NOT be a JWT
- refresh token value MUST NOT expose claims
- refresh token value MUST NOT be derived from user identity data
- refresh token value MUST NOT be reversible from persisted data
- refresh token value MUST be returned to the client only at issuance boundary approved by contract

### Recommended token shape

```text
<base64url-random-value>
```

The exact generation utility must use approved crypto infrastructure or Node.js cryptographic randomness through an approved `oidc` service boundary.

---

## VI. Refresh Token Persistence Contract

Refresh token persistence belongs to `modules/oidc`.

### Required stored fields

A refresh token record MUST store:

```ts
{
  id: string;
  tokenHash: string;
  subject: string;
  clientId: string;
  scope: string;
  issuedAt: Date;
  expiresAt: Date;
  consumedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Field Rules

- `tokenHash` MUST store only the hash or approved secure digest of the raw refresh token
- `subject` MUST reference the user subject (`sub`) from the approved user identity contract
- `clientId` MUST match the validated OIDC client
- `scope` MUST reflect granted scopes
- `issuedAt` MUST be set at issuance time
- `expiresAt` MUST be enforced during validation
- `consumedAt` is reserved for Sprint 12 rotation/reuse behavior and SHOULD remain unused in Sprint 11 unless explicitly required for baseline exchange control
- `revokedAt` is reserved for Sprint 13 revocation behavior and SHOULD remain unused in Sprint 11 unless explicitly approved

### Forbidden stored fields

A refresh token record MUST NOT store:

- raw refresh token
- access token
- ID Token
- authorization code raw value
- password
- `password_hash`
- full user profile payload
- session cookie value
- client secret raw value

---

## VII. Refresh Token Hashing Rules

### Mandatory

- raw refresh token MUST be hashed before persistence
- hash comparison MUST be used to validate presented refresh tokens
- raw refresh token MUST NOT be logged
- token hash MUST NOT be returned in API responses
- token hash MUST NOT be exposed in error payloads
- token hash MUST NOT be sent to clients

Hashing may use the existing approved cryptographic hashing utility if suitable for token hashing. If the existing utility is password-specific or unsuitable for token lookup, Sprint 11 assignment must approve a deterministic secure digest approach before implementation.

Implementation must not invent an ad-hoc hashing strategy outside approved infrastructure or contract scope.

---

## VIII. TTL Rules

Default Sprint 11 refresh token TTL:

```text
refresh_token: 30 days
```

### Rules

- TTL MUST be centralized through config if configurable
- `expiresAt` MUST be persisted
- expired refresh tokens MUST be rejected
- token renewal MUST NOT extend an expired refresh token
- Sprint 11 MUST NOT implement sliding expiration unless explicitly approved
- Sprint 11 MUST NOT implement rotation-based TTL changes; rotation belongs to Sprint 12

---

## IX. Authorization-Code Token Response Update

When authorization-code exchange succeeds and refresh token issuance is allowed, `/token` response MUST include:

```json
{
  "access_token": "<signed-jwt-access-token>",
  "token_type": "Bearer",
  "expires_in": 900,
  "id_token": "<signed-jwt-id-token>",
  "refresh_token": "<opaque-refresh-token>"
}
```

### Rules

- `access_token` remains the Sprint 10 JWT access token
- `id_token` remains the Sprint 10 signed ID Token
- `refresh_token` MUST be opaque
- `refresh_token` MUST be returned only as a raw token response value
- only the refresh token hash may be persisted
- `refresh_token` MUST NOT be included inside `access_token` or `id_token` claims
- `refresh_token` MUST NOT be issued by `auth`

---

## X. Refresh Token Grant Contract

Sprint 11 introduces `/token` support for:

```x-www-form-urlencoded
grant_type=refresh_token
refresh_token=<opaque-refresh-token>
client_id=<client-id>
```

Client authentication or client validation requirements must follow the approved existing OIDC client validation model unless Sprint 11 assignment defines a stricter rule.

### Successful response

A valid refresh token exchange MUST return:

```json
{
  "access_token": "<signed-jwt-access-token>",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### Rules

- `access_token` MUST be a new JWT access token
- `token_type` MUST be `Bearer`
- `expires_in` MUST match access token TTL
- Sprint 11 MUST NOT return a rotated refresh token
- Sprint 11 MUST NOT return a new ID Token unless explicitly approved later
- Sprint 11 MUST NOT extend refresh token lifetime during refresh-token grant exchange

### Failure cases

The token endpoint MUST reject:

- missing `refresh_token`
- malformed `refresh_token`
- unknown refresh token
- expired refresh token
- revoked refresh token if revocation metadata exists
- refresh token with mismatched client
- refresh token whose subject can no longer be resolved through approved identity contract, if subject resolution is required
- unsupported grant type

Error responses must not reveal whether the token hash exists.

---

## XI. Access Token Renewal Rules

When a refresh token is valid, Sprint 11 may issue a new JWT access token.

### Rules

- new access token MUST follow `jwt-token-contract.md`
- new access token MUST use current issuance time
- new access token MUST include valid `iss`, `sub`, `aud`, `iat`, `exp`, and `scope`
- `aud` MUST match the refresh token client
- `scope` MUST not exceed the scope stored with the refresh token
- access token TTL remains governed by JWT contract/config
- access token remains short-lived
- access token is not persisted unless a later approved contract explicitly introduces stateful access-token controls

---

## XII. Boundary Rules

### `modules/oidc`

Owns:

- refresh token generation
- refresh token hashing coordination
- refresh token persistence
- refresh token validation
- refresh token grant handling
- access token renewal through refresh token flow

Must NOT:

- query user DB directly
- mutate user identity
- reuse Phase 03 `token-lifecycle`
- store raw refresh tokens
- implement Sprint 12+ rotation/reuse behavior in Sprint 11
- implement Sprint 13 revoke/introspection behavior in Sprint 11
- implement session/SSO/logout behavior in Sprint 11

### `modules/auth`

Owns:

- credential validation only

Must NOT:

- generate refresh tokens
- validate refresh tokens
- renew access tokens
- own token persistence
- manage sessions

### `modules/users`

Owns:

- user identity data
- approved identity lookup contracts

Must NOT:

- store refresh token data
- issue refresh tokens
- validate refresh tokens
- own OIDC token lifecycle
- receive token hashes into user records

### `modules/token-lifecycle`

Owns:

- non-OIDC identity lifecycle tokens only

Must NOT be used for:

- OIDC access tokens
- refresh tokens
- ID tokens
- authorization codes
- sessions
- SSO state
- logout state

---

## XIII. File Placement Contract

Sprint 11 implementation should remain inside approved structure.

### Expected implementation area

```text
src/modules/oidc
```

### Expected deliverables may include

- `src/modules/oidc/refresh-token.model.ts`
- `src/modules/oidc/refresh-token.repository.ts`
- `src/modules/oidc/refresh-token.service.ts`
- updates to existing `src/modules/oidc/oidc.service.ts`
- updates to existing `src/modules/oidc/oidc.controller.ts`
- updates to config files only if TTL or refresh-token settings must be centralized
- updates to app route wiring only if existing `/token` routing must support refresh-token grant

Do not create a new top-level module for refresh tokens unless an architecture decision updates source-tree and module-boundaries first.

---

## XIV. Security Rules

### Mandatory

- refresh token raw value returned only once
- refresh token raw value never persisted
- refresh token hash never exposed
- refresh token validation must use hash/digest comparison
- expired refresh tokens rejected
- invalid refresh tokens rejected with non-revealing error
- no raw token logging
- no token payload logging
- no refresh token in JWT claims
- no password or password hash in token record
- no direct user DB access from `oidc`
- no Phase 03 `token-lifecycle` usage
- no token logic in `auth`

---

## XV. Validation Requirements

### Static validation

Required commands:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
```

### Boundary validation

Required scans:

```bash
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc
rg -n "token-lifecycle" src/modules/oidc
rg -n "refresh|refresh_token|refreshToken|grant_type=refresh_token" src/modules/auth
rg -n "refresh_token|refreshToken|tokenHash" src/modules/users
rg -n "password_hash|passwordHash" src/modules/oidc
rg -n "revocation|introspection|session|sso|logout|reuse|rotation" src/modules/oidc
```

Expected posture:

- no direct `process.env` outside config
- no direct user DB access from `oidc`
- no Phase 03 `token-lifecycle` dependency from `oidc`
- no refresh token behavior in `auth`
- no refresh token ownership in `users`
- no password hash exposure from `oidc`
- no Sprint 12+ or Sprint 13+ behavior introduced early

### Runtime/manual validation

Required scenarios:

- authorization-code exchange returns `refresh_token` when allowed
- raw refresh token is not persisted
- persisted refresh token record contains hash only
- valid refresh token grant returns a new JWT access token
- new JWT access token verifies against JWKS/public key
- expired refresh token is rejected
- malformed refresh token is rejected
- unknown refresh token is rejected
- client mismatch is rejected
- refresh token hash is never returned to client
- raw refresh token does not appear in logs or errors
- refresh grant does not return a rotated refresh token in Sprint 11
- Sprint 11 does not implement revoke/introspection/session/logout behavior

---

## XVI. Merge-Blocking Conditions

Block Sprint 11 PR if any of these occur:

- refresh token contract is not referenced
- Sprint 11 assignment is not referenced
- raw refresh token is stored
- refresh token hash is returned to client
- refresh token behavior appears in `auth`
- refresh token data appears in `users`
- `oidc` imports `UserModel` or `user.repository`
- `oidc` uses `token-lifecycle`
- refresh token is a JWT
- refresh token claims are exposed
- `grant_type=refresh_token` renews access token with broader scope than original grant
- rotation/reuse detection is implemented without Sprint 12 approval
- revoke/introspection/session/logout behavior appears in Sprint 11 without approval
- stateful access-token persistence or blacklist is introduced without contract approval
- validation evidence is missing or placeholder-only

---

## XVII. Definition of Done

Sprint 11 is complete when:

- refresh token contract is approved and referenced
- refresh token is issued during approved authorization-code token exchange
- refresh token is opaque
- refresh token is stored hashed only
- refresh token expiration is enforced
- refresh token grant baseline works
- valid refresh token can renew JWT access token
- renewed access token follows `jwt-token-contract.md`
- no raw refresh token is persisted or logged
- no refresh token lifecycle behavior is implemented in `auth`
- no token/session data is stored in `users`
- `oidc` does not reuse `token-lifecycle`
- no Sprint 12+ lifecycle behavior is introduced early
- all required validation evidence is recorded

---

## XVIII. Handoff to Sprint 12

Sprint 11 produces the refresh token foundation.

Sprint 12 remains responsible for:

- refresh token rotation
- token family or lineage tracking, if approved
- reuse detection
- security response for detected reuse
- concurrent refresh handling
- lifecycle metadata hardening
