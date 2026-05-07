# Phase 05 / Sprint 13 - Revoke + Introspection

---

## I. Assignment Summary

* Phase: Phase 05 - Token and Session Management
* Sprint: Sprint 13 - Revoke + Introspection
* Task Range:

  * Task 58 - Revoke/Introspection Contract Alignment
  * Task 59 - Revocation Metadata and Repository Behavior
  * Task 60 - Revoke Endpoint / Service Behavior
  * Task 61 - Refresh Grant Revocation Compatibility
  * Task 62 - Introspection Endpoint / Service Behavior
  * Task 63 - Sprint 13 Validation and Report
* Owner Module: `src/modules/oidc`
* Branch Name: `feature/oidc-sprint13-revoke-introspection`

---

## II. Objective

Implement controlled token revocation and introspection behavior on top of the merged Sprint 12 refresh token rotation and reuse-detection foundation.

Sprint 13 must add refresh token revocation, family revocation behavior, revoked-token compatibility with refresh-token grant validation, and safe introspection behavior if approved by this assignment.

Sprint 13 must preserve all Sprint 11 and Sprint 12 guarantees:

* refresh tokens remain opaque
* refresh tokens are stored hashed only
* refresh-token grant continues to rotate refresh tokens
* consumed-token reuse remains detected
* compromised family handling remains intact
* concurrent refresh hardening remains intact
* renewed access tokens remain short-lived JWTs
* no token lifecycle behavior moves into `auth`, `users`, or `token-lifecycle`

---

## III. Source-of-Truth Basis

Sprint 13 must follow:

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
* `docs/planning/assignments/phase-05-sprint-11.md`
* `docs/planning/reports/phase-05-sprint-11-report.md`
* `docs/planning/assignments/phase-05-sprint-12.md`
* `docs/planning/reports/phase-05-sprint-12-report.md`
* `docs/planning/assignments/phase-05-sprint-13.md`
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
* `token-revoke-introspection-contract.md` governs Sprint 13 revocation and introspection behavior.
* Sprint 12 merge baseline must be confirmed before implementation starts.

---

## IV. Prerequisites

Sprint 13 may start implementation only after:

* Sprint 11 is merged and present in `main`.
* Sprint 12 is merged and present in `main`.
* Sprint 12 report is completed.
* `docs/contracts/oidc/token-revoke-introspection-contract.md` is approved.
* Sprint 13 assignment is approved.
* The active branch is created from `main` or an approved baseline containing Sprint 12.

If Sprint 12 is not present in the active codebase, stop before coding.

---

## V. Included Scope

Sprint 13 includes:

* refresh token revocation by presented opaque refresh token
* revoke endpoint or service behavior for `POST /revoke`
* refresh token hash lookup for revocation
* revocation metadata transition:

  * `revokedAt`
  * `status = 'revoked'`
  * optional `revokedReason`
  * optional `revokedByClientId`
* family revocation behavior for the refresh token family
* preserving `compromised` state if the family is already compromised
* ensuring revoked refresh tokens cannot be used for refresh-token grant
* ensuring active refresh token in a revoked family cannot be used
* non-revealing revoke responses
* idempotent revoke behavior for already-revoked or unknown tokens
* introspection endpoint or service behavior for `POST /introspect`
* refresh token introspection with safe active/inactive response
* access token introspection through stateless JWT validation, if implemented
* introspection inactive response for unknown, expired, consumed, revoked, compromised, or client-mismatched tokens
* validation that introspection does not expose raw token, token hash, lineage internals, password, or password hash
* Sprint 13 report creation

---

## VI. Excluded Scope

Sprint 13 excludes:

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
* changing UserInfo behavior
* changing claims mapper behavior
* changing refresh-token rotation policy beyond revocation compatibility
* social login
* MFA
* external identity federation
* broad platform hardening outside token revoke/introspection scope
* changes to `auth` ownership
* changes to `users` token/session ownership
* reuse of Phase 03 `token-lifecycle`
* direct user DB access from `oidc`
* new top-level revoke/introspection module
* unrelated repository-wide formatting cleanup

---

## VII. Expected Deliverables

### Implementation deliverables

Expected updates:

* `src/modules/oidc/refresh-token.model.ts`
* `src/modules/oidc/refresh-token.repository.ts`
* `src/modules/oidc/refresh-token.service.ts`
* `src/modules/oidc/oidc.service.ts`
* `src/modules/oidc/oidc.controller.ts`
* `src/modules/oidc/oidc.types.ts`

Expected route wiring:

* update existing app route wiring only for approved:

  * `POST /revoke`
  * `POST /introspect`

Optional updates only if required by existing structure:

* config files under `src/config/` if endpoint/client-validation settings already require centralized configuration
* local validation harness or test files if the repository already uses them for sprint evidence

Documentation deliverables:

* `docs/contracts/oidc/token-revoke-introspection-contract.md`
* `docs/planning/assignments/phase-05-sprint-13.md`
* `docs/planning/reports/phase-05-sprint-13-report.md`

Do not create a new module outside `src/modules/oidc`.

---

## VIII. Task Details

### Task 58 - Revoke/Introspection Contract Alignment

#### Objective

Confirm Sprint 13 implementation basis before coding.

#### Required work

* read all required source-of-truth documents
* confirm Sprint 11 and Sprint 12 are merged and present in the active baseline
* confirm `refresh-token-contract.md` governs Sprint 11 foundation
* confirm `refresh-token-rotation-contract.md` governs Sprint 12 rotation/reuse behavior
* confirm `token-revoke-introspection-contract.md` governs Sprint 13
* inspect Sprint 12 refresh token model, repository, service, rotation flow, reuse detection, family compromise handling, and concurrency guard
* identify the minimal changes needed for revoke and introspection
* stop before coding if endpoint behavior, family revocation policy, or introspection response contract is unclear

#### Acceptance criteria

* implementation packet exists before coding
* Sprint 12 baseline is confirmed in the active codebase
* included and excluded Sprint 13 scope are clear
* revoke/introspection behavior is backed by approved contract
* no coding begins from JWT contract alone
* no coding begins without Sprint 13 contract and assignment approval

---

### Task 59 - Revocation Metadata and Repository Behavior

#### Objective

Extend OIDC refresh token persistence and repository behavior to support revocation state safely.

#### Required work

* confirm existing fields:

  * `revokedAt`
  * `status`
  * `familyId`
  * `tokenHash`
* add optional revocation metadata only if needed:

  * `revokedReason`
  * `revokedByClientId`
* implement repository method for revoking a token by hash/client context
* implement repository method for revoking active token(s) in a token family
* preserve compromised state if family is already compromised
* prevent revocation from reactivating consumed, expired, revoked, or compromised tokens
* avoid deleting token records to represent revocation
* keep token hash and raw token out of API responses

#### Acceptance criteria

* refresh token records can represent revoked state
* revocation metadata is persisted safely
* family revocation can invalidate active token state
* compromised state is not downgraded to revoked
* raw refresh token is never persisted
* token hash is never exposed
* no revocation state appears in `users`

---

### Task 60 - Revoke Endpoint / Service Behavior

#### Objective

Implement refresh token revocation behavior through the approved OIDC service/controller boundary.

#### Required work

* add approved `POST /revoke` handling if not already present
* accept presented opaque refresh token
* accept or validate `token_type_hint=refresh_token`
* validate client identity according to existing OIDC client validation model
* hash/digest presented refresh token using approved refresh-token hash strategy
* look up token by hash
* revoke presented token and active family state when found and client-matched
* return non-revealing response for unknown token
* keep already-revoked token handling idempotent
* avoid exposing whether token existed, was already revoked, consumed, compromised, or client-mismatched
* ensure no access token or refresh token is issued during revocation

#### Acceptance criteria

* valid active refresh token can be revoked
* revoked refresh token cannot be used for refresh-token grant
* unknown token revocation returns approved non-revealing response
* repeated revocation is idempotent and non-revealing
* consumed token revocation does not reactivate it
* compromised family revocation does not downgrade compromised state
* revoke response does not include token hash, raw token, lineage internals, password, or password hash

---

### Task 61 - Refresh Grant Revocation Compatibility

#### Objective

Ensure refresh-token grant validation correctly rejects revoked tokens and revoked families while preserving Sprint 12 guarantees.

#### Required work

* update refresh-token grant validation to reject:

  * revoked token
  * revoked family
  * compromised token
  * compromised family
  * consumed token
  * expired token
  * client-mismatched token
* preserve Sprint 12 rotation behavior for valid active tokens
* preserve Sprint 12 consumed-token reuse detection
* preserve Sprint 12 family-compromise behavior
* preserve Sprint 12 concurrent refresh protection
* ensure revoked token does not issue access token
* ensure revoked token does not issue refresh token
* keep error behavior non-revealing

#### Acceptance criteria

* revoked refresh token grant returns non-revealing `invalid_grant`
* active token in revoked family returns non-revealing `invalid_grant`
* reuse detection still compromises family when consumed token is reused
* concurrent refresh still allows only one successful rotation
* valid active non-revoked token can still rotate
* access token renewal scope does not exceed stored refresh token scope

---

### Task 62 - Introspection Endpoint / Service Behavior

#### Objective

Implement safe token introspection behavior according to the Sprint 13 contract.

#### Required work

* add approved `POST /introspect` handling if not already present
* accept presented token
* support `token_type_hint=refresh_token`
* support `token_type_hint=access_token` only as stateless JWT validation if implemented
* validate client according to existing OIDC client validation model
* return inactive response for:

  * unknown token
  * expired token
  * consumed token
  * revoked token
  * compromised token
  * compromised family
  * revoked family
  * client-mismatched token
  * invalid access token
  * expired access token
* return safe active response for active refresh token
* return safe active response for valid access token if access-token introspection is implemented
* avoid mutating token state during introspection
* avoid calling `auth`
* avoid querying users DB directly
* avoid exposing token hash, raw token, lineage internals, password, password hash, full user profile, signing secrets, or private key material

#### Acceptance criteria

* active refresh token introspection can return `active: true`
* revoked refresh token introspection returns `active: false`
* consumed refresh token introspection returns `active: false`
* compromised-family refresh token introspection returns `active: false`
* unknown token introspection returns `active: false`
* access token introspection, if implemented, validates JWT statelessly
* expired/invalid access token introspection returns `active: false`
* introspection response does not expose sensitive persistence details
* introspection does not mutate refresh token state

---

### Task 63 - Sprint 13 Validation and Report

#### Objective

Validate Sprint 13 implementation and record evidence.

#### Required work

* run required static validation commands
* run required boundary scans
* run runtime/manual scenarios from the revoke/introspection contract
* record PASS / FAIL / NOT RUN accurately
* create Sprint 13 report
* include risks and limitations
* include handoff to Sprint 14

#### Acceptance criteria

* report exists at `docs/planning/reports/phase-05-sprint-13-report.md`
* validation evidence is command-based and reproducible
* boundary/security checks are explicit
* revocation behavior is validated
* introspection behavior is validated if implemented
* Sprint 12 guarantees are revalidated after Sprint 13 changes
* Sprint 14 handoff is documented

---

## IX. Allowed Dependencies

Allowed:

* `src/modules/oidc`
* `src/modules/users` through approved service/account contracts only, if subject resolution is required
* `src/infrastructure/crypto` through approved utilities
* `src/infrastructure/logger` through approved logging abstraction, if security-safe logging is needed
* `src/shared` for generic errors/types/validators
* `src/config` for centralized settings if needed
* existing app route wiring for approved `/revoke` and `/introspect`

---

## X. Forbidden Dependencies

Forbidden:

* `oidc` importing `UserModel`
* `oidc` importing `user.repository`
* `oidc` depending on `token-lifecycle`
* `auth` revoking OIDC tokens
* `auth` introspecting OIDC tokens
* `auth` validating refresh tokens
* `auth` mutating refresh token state
* `auth` issuing access or refresh tokens
* `users` storing token revocation state
* `users` storing introspection state
* `users` storing token family state
* `shared` containing revoke/introspection workflow logic
* `infrastructure` containing revoke/introspection business policy
* direct `process.env` outside `src/config`
* new top-level revoke/introspection module
* unrelated infrastructure expansion

---

## XI. Security-Critical Rules

Mandatory:

* raw refresh token must never be persisted
* raw refresh token must never be logged
* refresh token hash must never be returned
* revoke response must not reveal token existence
* unknown token revoke must be non-revealing
* repeated revoke must be idempotent and non-revealing
* introspection inactive response must be non-revealing
* unknown token introspection must return `active: false`
* revoked refresh token must not be usable
* active token in revoked family must not be usable
* compromised family must remain unusable
* consumed-token reuse detection must remain active
* concurrent refresh protection must remain active
* client mismatch must be rejected or returned inactive depending on endpoint semantics
* expired tokens must be rejected or returned inactive depending on endpoint semantics
* access tokens must remain short-lived JWTs
* access tokens must not be persisted
* access-token blacklist behavior must not be introduced
* password and `password_hash` must never appear in revoke/introspection responses
* Sprint 13 must not implement session, SSO, or logout

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
* scoped Prettier check for Sprint 13 touched files
* confirmation that Sprint 13 touched files pass formatting
* list of external failing files if available
* explicit statement that Sprint 13 did not mix unrelated formatting cleanup

### Boundary scans

Required commands:

* `rg -n "process\\.env" src --glob "!src/config/**"`
* `rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc`
* `rg -n "token-lifecycle" src/modules/oidc`
* `rg -n "revoke|revocation|introspect|introspection" src/modules/auth`
* `rg -n "revoke|revocation|introspect|introspection|tokenHash|familyId" src/modules/users`
* `rg -n "password_hash|passwordHash" src/modules/oidc`
* `rg -n "session|sso|logout" src/modules/oidc src/app`

Expected results:

* no direct `process.env` outside config
* no direct users DB access from `oidc`
* no `token-lifecycle` dependency from `oidc`
* no revoke/introspection behavior in `auth`
* no token revocation/introspection state in `users`
* no password hash exposure in `oidc`
* no Sprint 14+ behavior introduced early

---

## XIII. Manual Validation Scenarios

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
11. Refresh token introspection returns `active: true` for active token.
12. Refresh token introspection returns `active: false` for revoked token.
13. Refresh token introspection returns `active: false` for consumed token.
14. Refresh token introspection returns `active: false` for compromised family.
15. Refresh token introspection returns `active: false` for unknown token.
16. Access token introspection returns `active: true` for valid JWT if access-token introspection is implemented.
17. Access token introspection returns `active: false` for expired or invalid JWT if access-token introspection is implemented.
18. Introspection does not return token hash, raw token, password, password hash, or lineage internals.
19. Sprint 13 does not implement session, SSO, or logout behavior.

---

## XIV. PR and Report Requirements

Sprint 13 PR must include:

* phase/sprint/task references
* source-of-truth references
* refresh token contract reference
* refresh token rotation contract reference
* token revoke/introspection contract reference
* Sprint 11 merge baseline confirmation
* Sprint 12 merge baseline confirmation
* included scope
* excluded scope
* file list
* validation commands with PASS / FAIL / NOT RUN
* boundary scan evidence
* runtime/manual validation evidence
* revocation validation evidence
* introspection validation evidence if implemented
* Sprint 12 non-regression validation
* security notes
* risks and limitations
* handoff to Sprint 14

Sprint 13 report path:

`docs/planning/reports/phase-05-sprint-13-report.md`

---

## XV. Merge-Blocking Conditions

Block Sprint 13 if:

* token revoke/introspection contract is missing or not referenced
* Sprint 13 assignment is missing or not referenced
* Sprint 12 merge baseline is not confirmed
* raw refresh token is persisted
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
* `oidc` imports user model or repository
* `oidc` uses Phase 03 `token-lifecycle`
* access token is persisted
* access token blacklist is introduced without explicit approval
* access token renewal broadens scope
* session/SSO/logout behavior appears before Sprint 14/15 approval
* validation evidence is missing
* unrelated formatting cleanup is mixed into the implementation PR

---

## XVI. Definition of Done

Sprint 13 is complete when:

* `token-revoke-introspection-contract.md` is approved and referenced
* Sprint 13 assignment is approved and referenced
* Sprint 12 merge baseline is confirmed
* refresh token revocation is implemented
* revoked refresh token cannot be used for refresh-token grant
* family revocation behavior is implemented according to contract
* revoke response is non-revealing
* introspection is implemented according to this assignment
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

## XVII. Handoff to Sprint 14

Sprint 14 should start from the Sprint 13 revoke/introspection control surface and add only approved scope:

* OIDC session management
* SSO behavior across approved clients
* browser-facing session state
* session expiration policy
* session invalidation primitives needed by logout
* Redis-backed or approved infrastructure-backed session storage

Sprint 14 must not start until its assignment or contract is approved.
