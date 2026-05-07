# eTroy OIDC - Refresh Token Rotation Contract

## I. Purpose

This contract defines the approved refresh token rotation and reuse detection behavior for Phase 05 / Sprint 12.

It governs:

- refresh token rotation during `grant_type=refresh_token`
- refresh token family / lineage tracking
- consumed token state
- reuse detection
- compromised token-family handling
- concurrent refresh handling
- lifecycle metadata transitions
- boundary rules between `oidc`, `auth`, `users`, and `token-lifecycle`

This contract must be approved before Sprint 12 implementation starts.

## II. Authority

This contract is subordinate to:

- `docs/source-of-truth-index.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/requirements/srs-v1.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-05-token-session-management.md`
- `docs/contracts/oidc/jwt-token-contract.md`
- `docs/contracts/oidc/refresh-token-contract.md`
- `docs/planning/assignments/phase-05-sprint-11.md`
- `docs/planning/reports/phase-05-sprint-11-report.md`

If this contract conflicts with architecture or requirements documents, the higher-authority document wins.

## III. Contract Position

Sprint 11 completed and merged the refresh token foundation.

Sprint 11 provides:

- opaque refresh token issuance
- refresh token hash-only persistence
- refresh token expiration enforcement
- `grant_type=refresh_token` baseline
- JWT access token renewal through refresh token flow
- no rotation
- no reuse detection
- no revocation endpoint
- no introspection
- no session / SSO / logout behavior

Sprint 12 extends Sprint 11 by adding refresh token rotation and reuse detection only.

Sprint 12 must not redefine:

- JWT access token format
- ID Token format
- `/userinfo` behavior
- Sprint 11 refresh token issuance baseline
- refresh token opacity requirement
- refresh token hash-only persistence rule
- refresh token TTL baseline unless explicitly stated in this contract
- auth, users, or token-lifecycle ownership boundaries

## IV. Sprint Scope

### Included in Sprint 12

- refresh token rotation on every successful `grant_type=refresh_token` exchange
- issuing a new refresh token together with a renewed access token
- marking the previous refresh token as consumed
- storing only the hash of the newly issued refresh token
- refresh token family / lineage tracking
- parent-child token relationship metadata
- reuse detection for consumed, revoked, or compromised refresh tokens
- compromised token-family handling
- deterministic security response for refresh token reuse
- concurrent refresh handling
- lifecycle metadata transitions
- validation evidence proving old refresh tokens cannot be reused after rotation

### Excluded from Sprint 12

- token revocation endpoint
- token introspection endpoint
- OIDC session management
- SSO behavior
- logout hardening
- admin token management
- audit module expansion
- external security event pipeline
- access token persistence
- access token blacklist behavior
- changing JWT access token format
- changing ID Token format
- changing UserInfo claims
- Phase 03 token-lifecycle reuse
- direct user DB access from oidc
- unrelated repository-wide formatting cleanup

These excluded items remain Sprint 13+ or later Phase 05 scope unless explicitly approved by a separate contract update.

## V. Rotation Model

Sprint 12 uses refresh token rotation.

Rule:

Every successful `grant_type=refresh_token` exchange MUST consume the presented refresh token and issue a new refresh token.

A successful refresh-token grant response MUST include:

- new JWT `access_token`
- `token_type`
- `expires_in`
- new opaque `refresh_token`

Expected response shape:

- `access_token`: newly issued signed JWT access token
- `token_type`: `Bearer`
- `expires_in`: access token TTL in seconds
- `refresh_token`: newly issued opaque refresh token

Rules:

- the new refresh token MUST be opaque
- the new refresh token MUST NOT be a JWT
- the new refresh token MUST NOT expose claims
- the new refresh token MUST be returned to the client only once
- only the hash of the new refresh token may be persisted
- the old refresh token MUST be marked consumed before or atomically with issuing the new refresh token
- the old refresh token MUST NOT remain usable after a successful exchange
- Sprint 12 MUST NOT return an ID Token during refresh-token grant unless a later approved contract explicitly permits it

## VI. Token Family / Lineage Contract

Sprint 12 introduces refresh token lineage metadata.

A refresh token family represents the chain of refresh tokens derived from the same original authorization-code exchange.

### Required stored fields

The refresh token persistence record MUST support these additional fields:

- `familyId: string`
- `parentTokenId?: string | null`
- `replacedByTokenId?: string | null`
- `status: 'active' | 'consumed' | 'revoked' | 'compromised' | 'expired'`

### Existing fields retained from Sprint 11

The record MUST continue to store:

- `id`
- `tokenHash`
- `subject`
- `clientId`
- `scope`
- `issuedAt`
- `expiresAt`
- `consumedAt`
- `revokedAt`
- `createdAt`
- `updatedAt`

### Field Rules

- `familyId` MUST be generated when the initial refresh token is issued during authorization-code exchange.
- All rotated refresh tokens derived from the original token MUST preserve the same `familyId`.
- `parentTokenId` MUST point to the refresh token record consumed to create the new token.
- `replacedByTokenId` SHOULD point to the new refresh token record that replaced the consumed token.
- Only one refresh token in a family SHOULD be active at a time.
- `status` MUST represent lifecycle state clearly and consistently.
- `tokenHash` remains hash-only and MUST NOT be exposed.
- Raw refresh token values MUST NOT be stored in any lineage field.

## VII. Lifecycle State Rules

### active

A token is active when:

- it has not expired
- it has not been consumed
- it has not been revoked
- it has not been marked compromised
- it is the current usable token in its family

### consumed

A token becomes consumed when:

- it was successfully used in `grant_type=refresh_token`
- a replacement refresh token was issued
- `consumedAt` is set

A consumed token MUST NOT be accepted again.

### expired

A token is expired when:

- current time is greater than `expiresAt`

Expired tokens MUST be rejected.

Sprint 12 MAY compute expiration from `expiresAt` without persisting `status = 'expired'`, unless implementation chooses to materialize the status safely.

### revoked

A token is revoked when:

- `revokedAt` is set
- `status` is `revoked`

Sprint 12 must preserve compatibility with revocation metadata, but Sprint 12 does not implement the revoke endpoint.

### compromised

A token or token family becomes compromised when refresh-token reuse is detected.

A compromised token/family MUST NOT be accepted for future refresh-token grant exchanges.

## VIII. Rotation Transaction Rules

A successful rotation must perform the following logical steps:

1. validate presented refresh token
2. confirm token is active
3. mark presented token as consumed
4. issue new opaque refresh token
5. hash new refresh token
6. persist new refresh token record with same `familyId`
7. link old token to new token through lineage metadata
8. issue new JWT access token
9. return new access token and new raw refresh token once

Atomicity requirement:

The old-token consumption and new-token creation MUST be atomic or concurrency-safe enough to prevent two successful rotations from the same presented refresh token.

Allowed implementation strategies:

- repository-level atomic compare-and-update
- transaction if existing persistence setup supports it
- conditional update on active status / missing `consumedAt`
- unique active-family constraint if feasible within current Mongo/Mongoose structure
- service-level retry/fail behavior after failed atomic consume

Forbidden implementation strategies:

- read-then-write sequence that allows two successful refreshes from the same token
- accepting multiple rotations from the same refresh token
- returning a new refresh token before the old token is safely consumed
- relying on controller-level checks for lifecycle integrity

## IX. Reuse Detection Rules

Refresh token reuse occurs when a presented refresh token is:

- already consumed
- already revoked
- already marked compromised
- no longer the active token in its family
- linked to a replacement token through `replacedByTokenId`
- otherwise fails active-state validation after being found as a known token

On detected reuse:

- request MUST be rejected
- error response MUST be non-revealing
- the token family MUST be treated as compromised
- all active tokens in the same family MUST be invalidated or marked compromised
- no new access token may be issued
- no new refresh token may be issued

Error response must not reveal:

- whether token exists
- whether token was consumed
- whether token was revoked
- whether token was compromised
- whether family compromise was triggered

Recommended response semantics:

- OAuth error: `invalid_grant`
- HTTP status: `400`

## X. Compromised Family Handling

When reuse is detected, the refresh token family MUST be invalidated.

Required behavior:

- mark reused token as compromised if possible
- mark active token in the same family as compromised
- prevent future refresh-token grant use for any token in the family
- preserve metadata needed for future audit/security reporting
- do not expose compromise details to the client response

Implementation may use:

- `status = 'compromised'`
- `compromisedAt: Date`
- `compromiseReason: 'reuse_detected'`
- family-level update method in repository

If extra fields such as `compromisedAt` or `compromiseReason` are added, they must stay inside `modules/oidc` refresh-token persistence and must not leak to API responses.

Sprint 12 does not require a separate audit module event unless explicitly approved by assignment.

## XI. Concurrent Refresh Handling

Concurrent refresh occurs when the same refresh token is submitted more than once at nearly the same time.

Required behavior:

- only one request may succeed
- all other concurrent attempts must fail
- failed attempts after the first successful rotation SHOULD be treated as reuse
- token family compromise behavior SHOULD apply when a consumed token is presented again after successful rotation

Implementation must avoid:

- issuing two valid child refresh tokens from one parent
- leaving two active refresh tokens in the same family
- race conditions that allow duplicate access-token renewal from the same refresh token

Recommended repository-level operation:

Atomically consume token only if:

- token hash matches
- token belongs to the client
- token is not expired
- token is active
- `consumedAt` is null
- `revokedAt` is null
- `status` is active

If the conditional update fails after the token was found, treat the request as invalid and evaluate whether family compromise handling applies.

## XII. Refresh Token TTL Rules

Sprint 12 must preserve the Sprint 11 refresh token TTL baseline unless a later approved contract changes it.

Default:

- refresh token TTL: 30 days

Rotation TTL rule:

- a rotated refresh token SHOULD receive a new `issuedAt`
- a rotated refresh token SHOULD receive a new `expiresAt` based on the configured refresh token TTL
- Sprint 12 may therefore implement rolling refresh token expiry through rotation

Constraints:

- expired tokens must not rotate
- expired tokens must not issue new access tokens
- expired tokens must not issue new refresh tokens
- refresh token TTL must remain centralized through config if configurable
- rotation must not alter access token TTL

## XIII. Access Token Renewal Rules

During successful refresh-token rotation:

- new access token MUST follow `docs/contracts/oidc/jwt-token-contract.md`
- new access token MUST be signed JWT
- new access token MUST use current `iat`
- new access token MUST derive `exp` from configured access token TTL
- `sub` MUST match the refresh token subject
- `aud` MUST match the refresh token client
- `scope` MUST not exceed stored refresh token scope
- access token MUST NOT be persisted
- access token blacklist behavior MUST NOT be introduced in Sprint 12

Sprint 12 changes refresh token lifecycle only. It does not change JWT access token structure.

## XIV. Boundary Rules

### modules/oidc

Owns:

- refresh token rotation
- token lineage / family metadata
- consumed token state
- reuse detection
- compromised family handling
- access-token renewal through refresh token flow

Must NOT:

- query user DB directly
- mutate user identity
- reuse Phase 03 token-lifecycle
- store raw refresh tokens
- move lifecycle logic into auth
- move token state into users
- implement revoke endpoint unless Sprint 13 contract approves it
- implement introspection unless Sprint 13 contract approves it
- implement session/SSO/logout behavior in Sprint 12

### modules/auth

Must NOT:

- rotate refresh tokens
- validate refresh tokens
- detect refresh token reuse
- mark token families compromised
- issue access tokens
- issue refresh tokens
- manage sessions

### modules/users

Must NOT:

- store refresh token lineage
- store refresh token family state
- store token compromise state
- issue or validate refresh tokens
- own OIDC lifecycle behavior

### modules/token-lifecycle

Must NOT be used for:

- OIDC access tokens
- OIDC refresh tokens
- ID tokens
- authorization codes
- session state
- SSO state
- logout state
- rotation/reuse detection

## XV. File Placement Contract

Expected implementation area:

- `src/modules/oidc`

Expected Sprint 12 changes may include:

- update `src/modules/oidc/refresh-token.model.ts`
- update `src/modules/oidc/refresh-token.repository.ts`
- update `src/modules/oidc/refresh-token.service.ts`
- update `src/modules/oidc/oidc.service.ts`
- update `src/modules/oidc/oidc.types.ts`
- update related OIDC tests or local validation harnesses if they exist
- create `docs/planning/reports/phase-05-sprint-12-report.md`

Sprint 12 should not need:

- new top-level module
- new infrastructure adapter
- new auth files
- new users token fields
- new session storage
- new app route beyond existing `/token`

Do not create a separate refresh-token-rotation module unless architecture documents are updated first.

## XVI. Security Rules

Mandatory:

- raw refresh tokens must never be persisted
- raw refresh tokens must never be logged
- refresh token hashes must never be exposed
- refresh token values must remain opaque
- old refresh token must become unusable after successful rotation
- reuse of consumed/revoked/compromised token must be detected
- reuse must not issue access token
- reuse must not issue refresh token
- compromised family must be invalidated
- client mismatch must be rejected
- expired tokens must be rejected
- token state must not be stored in users
- token logic must not be added to auth
- token-lifecycle must not be reused
- access token must remain short-lived JWT
- access token must not be persisted

## XVII. Validation Requirements

### Static validation

Required commands:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
```

If repository-wide `format:check` fails due known external formatting drift, Sprint 12 report must include:

- full command result
- scoped Prettier check for Sprint 12 touched files
- explicit confirmation that Sprint 12 touched files pass formatting
- list of external failing files if available
- statement that no unrelated formatting cleanup was mixed into Sprint 12

### Boundary validation

Required scans:

```bash
rg -n "process\.env" src --glob "!src/config/**"
rg -n "UserModel|user\.repository|findById|findOne" src/modules/oidc
rg -n "token-lifecycle" src/modules/oidc
rg -n "refresh|refresh_token|refreshToken|rotation|reuse|family|compromised" src/modules/auth
rg -n "refresh_token|refreshToken|tokenHash|familyId|compromised" src/modules/users
rg -n "password_hash|passwordHash" src/modules/oidc
rg -n "introspection|session|sso|logout" src/modules/oidc
```

Expected posture:

- no direct `process.env` outside config
- no direct user DB access from oidc
- no token-lifecycle dependency from oidc
- no refresh-token rotation/reuse behavior in auth
- no refresh-token family/compromise state in users
- no password hash exposure in oidc
- no Sprint 13+ behavior introduced early

### Runtime/manual validation

Required scenarios:

- Initial authorization-code exchange returns an opaque refresh token.
- First valid `grant_type=refresh_token` returns a new access token and a new refresh token.
- First valid refresh-token exchange marks the presented refresh token as consumed.
- New refresh token preserves subject, client, scope, and family lineage.
- Old refresh token cannot be used again.
- Reusing old refresh token triggers reuse detection.
- Reuse detection invalidates the active token family.
- After family compromise, the latest refresh token in that family is rejected.
- Concurrent submissions of the same refresh token allow only one successful rotation.
- Rotation does not persist raw refresh token.
- Rotation does not expose token hash.
- Rotated access token verifies against JWKS/public key.
- Rotated access token scope does not exceed stored refresh token scope.
- Expired refresh token cannot rotate.
- Client mismatch is rejected.
- Sprint 12 does not implement revoke endpoint.
- Sprint 12 does not implement introspection endpoint.
- Sprint 12 does not implement session, SSO, or logout behavior.

## XVIII. Merge-Blocking Conditions

Block Sprint 12 PR if any of these occur:

- this rotation contract is not referenced
- Sprint 12 assignment is not referenced
- Sprint 11 merge baseline is not confirmed
- raw refresh token is stored
- refresh token hash is returned to client
- refresh token is implemented as JWT
- old refresh token remains usable after successful rotation
- two active refresh tokens exist in the same family without explicit approved rationale
- consumed refresh token reuse does not trigger rejection
- reuse detection issues a new access token
- reuse detection issues a new refresh token
- compromised family remains usable after detected reuse
- concurrent refresh can produce multiple successful rotations
- rotation or reuse logic appears in auth
- refresh token family state appears in users
- oidc imports user model or user repository
- oidc uses Phase 03 token-lifecycle
- access token is persisted
- access token renewal broadens scope
- revoke/introspection/session/SSO/logout behavior appears before approved sprint
- validation evidence is missing or placeholder-only
- unrelated formatting cleanup is mixed into the implementation PR

## XIX. Definition of Done

Sprint 12 is complete when:

- rotation contract is approved and referenced
- Sprint 12 assignment is approved and referenced
- each successful refresh-token grant rotates the refresh token
- old refresh token is consumed and cannot be reused
- new refresh token is opaque and stored hashed only
- token family / lineage metadata is persisted
- reuse of consumed token is detected
- reuse detection invalidates the family
- concurrent refresh attempts cannot produce multiple valid child tokens
- renewed access token follows `jwt-token-contract.md`
- no raw refresh token is persisted, logged, or exposed
- no refresh rotation behavior is implemented in auth
- no token family state is added to users
- no token-lifecycle dependency appears in oidc
- no Sprint 13+ behavior is introduced early
- all required validation evidence is recorded
- Sprint 12 report is created

## XX. Handoff to Sprint 13

Sprint 12 produces the refresh token rotation and reuse-detection foundation.

Sprint 13 remains responsible for:

- token revocation endpoint
- refresh token revocation by presented token
- revocation metadata handling
- introspection endpoint or internal introspection service, if approved
- safe active/inactive token response contract, if approved

Sprint 13 must not start implementation until its assignment or contract is approved.

