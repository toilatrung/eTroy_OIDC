# Phase 05 / Sprint 12 - Refresh Token Rotation + Reuse Detection

---

## I. Assignment Summary

* Phase: Phase 05 - Token and Session Management
* Sprint: Sprint 12 - Refresh Token Rotation + Reuse Detection
* Task Range:

  * Task 52 - Rotation Contract Alignment
  * Task 53 - Refresh Token Lineage Persistence
  * Task 54 - Rotation Service Behavior
  * Task 55 - Reuse Detection and Compromised Family Handling
  * Task 56 - Concurrent Refresh Hardening
  * Task 57 - Sprint 12 Validation and Report
* Owner Module: `src/modules/oidc`
* Branch Name: `feature/oidc-sprint12-refresh-token-rotation`

---

## II. Objective

Implement refresh token rotation and reuse detection on top of the merged Sprint 11 refresh token foundation.

Sprint 12 must ensure that every successful `grant_type=refresh_token` exchange consumes the presented refresh token, issues a new opaque refresh token, persists only the new token hash, and rejects future reuse of the consumed token.

Sprint 12 must also introduce token family / lineage tracking, compromised family handling, and concurrent refresh protection.

---

## III. Source-of-Truth Basis

Sprint 12 must follow:

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
* `docs/planning/assignments/phase-05-sprint-11.md`
* `docs/planning/reports/phase-05-sprint-11-report.md`
* `docs/planning/assignments/phase-05-sprint-12.md`
* `docs/governance/git-rules.md`
* `docs/governance/pr-template.md`
* `docs/governance/review-checklist.md`
* `docs/governance/anti-patterns.md`

Authority rules:

* `docs/` is authoritative.
* `agent/` is operational support only.
* `jwt-token-contract.md` remains the JWT access-token and ID Token baseline.
* `refresh-token-contract.md` remains the Sprint 11 refresh-token foundation baseline.
* `refresh-token-rotation-contract.md` governs Sprint 12 rotation and reuse detection.
* Sprint 11 merge baseline must be confirmed before implementation starts.

---

## IV. Prerequisites

Sprint 12 may start only after:

* Sprint 11 implementation has been merged successfully.
* `docs/contracts/oidc/refresh-token-rotation-contract.md` is approved.
* Sprint 12 assignment is approved.
* The active branch is created from the merged Sprint 11 baseline or an approved integration branch containing Sprint 11.

If Sprint 11 is not present in the active codebase, stop before coding.

---

## V. Included Scope

Sprint 12 includes:

* refresh token rotation on every successful `grant_type=refresh_token`
* issuing a new opaque refresh token during successful refresh grant
* storing only the hash of the new refresh token
* marking the presented refresh token as consumed
* recording `consumedAt`
* adding refresh token family / lineage metadata
* preserving `familyId` across rotated tokens
* recording parent-child token relationship
* linking consumed token to replacement token where feasible
* detecting reuse of consumed refresh tokens
* detecting use of revoked or compromised refresh tokens if metadata exists
* marking token family as compromised on detected reuse
* preventing future refresh grant use for compromised families
* hardening concurrent refresh behavior so only one request can rotate a token successfully
* preserving subject, client, and scope during rotation
* issuing renewed JWT access token through the existing access-token provider
* returning new access token plus new refresh token after successful rotation
* creating Sprint 12 report

---

## VI. Excluded Scope

Sprint 12 excludes:

* token revocation endpoint
* token introspection endpoint
* OIDC session management
* SSO behavior
* logout hardening
* admin token management
* audit module expansion
* external security event pipeline
* access token persistence
* access token blacklist behavior
* JWT access token format changes
* ID Token format changes
* UserInfo behavior changes
* Phase 03 `token-lifecycle` reuse
* direct user DB access from `oidc`
* changes to `auth` ownership
* changes to `users` token/session ownership
* new top-level refresh-token module
* new infrastructure adapter
* unrelated repository-wide formatting cleanup

---

## VII. Expected Deliverables

### Implementation deliverables

Expected updates:

* `src/modules/oidc/refresh-token.model.ts`
* `src/modules/oidc/refresh-token.repository.ts`
* `src/modules/oidc/refresh-token.service.ts`
* `src/modules/oidc/oidc.service.ts`
* `src/modules/oidc/oidc.types.ts`

Optional updates only if required by existing structure:

* `src/modules/oidc/oidc.controller.ts`
* config files under `src/config/` if a pre-existing refresh-token TTL value needs alignment
* local validation harness or test files if the repository already uses them for sprint evidence

Documentation deliverables:

* `docs/contracts/oidc/refresh-token-rotation-contract.md`
* `docs/planning/assignments/phase-05-sprint-12.md`
* `docs/planning/reports/phase-05-sprint-12-report.md`

Do not create a new module outside `src/modules/oidc`.

---

## VIII. Task Details

### Task 52 - Rotation Contract Alignment

#### Objective

Confirm Sprint 12 implementation basis before coding.

#### Required work

* read all required source-of-truth documents
* confirm Sprint 11 has been merged successfully
* confirm `refresh-token-contract.md` governs Sprint 11 foundation
* confirm `refresh-token-rotation-contract.md` governs Sprint 12
* inspect Sprint 11 refresh token model, repository, service, and `/token` refresh grant flow
* identify the minimal changes needed for rotation and reuse detection
* stop before coding if lineage fields, atomic update strategy, or boundary placement are unclear

#### Acceptance criteria

* implementation packet exists before coding
* Sprint 11 baseline is confirmed in the active codebase
* included and excluded Sprint 12 scope are clear
* rotation/reuse behavior is backed by approved contract
* no coding begins from JWT contract alone

---

### Task 53 - Refresh Token Lineage Persistence

#### Objective

Extend OIDC refresh token persistence to support token family and lineage tracking.

#### Required work

* update refresh token model/schema to include:

  * `familyId`
  * `parentTokenId`
  * `replacedByTokenId`
  * `status`
  * optional `compromisedAt`
  * optional `compromiseReason`
* ensure initial authorization-code exchange refresh token receives a new `familyId`
* ensure rotated refresh tokens preserve the same `familyId`
* ensure rotated refresh token records reference their parent token
* ensure consumed parent token can reference replacement token where feasible
* keep `tokenHash` hash-only
* keep raw refresh token out of persistence

#### Acceptance criteria

* every refresh token record has a family identity
* rotated token records preserve lineage
* old token and new token relationship is traceable
* only hash and metadata are persisted
* no raw refresh token appears in model, repository, or responses
* no refresh token family state is stored in `users`

---

### Task 54 - Rotation Service Behavior

#### Objective

Rotate refresh token on every successful refresh-token grant.

#### Required work

* update refresh grant service behavior so a valid refresh token exchange:

  * validates presented token
  * confirms active state
  * consumes presented token
  * issues new opaque refresh token
  * hashes new refresh token
  * persists new refresh token with same `familyId`
  * links parent and child token records
  * issues new JWT access token
  * returns new access token and new raw refresh token once
* preserve `subject`, `clientId`, and `scope`
* ensure renewed access token scope does not exceed stored refresh token scope
* ensure old refresh token cannot be used after successful rotation
* preserve existing Sprint 11 non-revealing error behavior

#### Acceptance criteria

* valid refresh grant returns new access token and new refresh token
* presented refresh token is marked consumed
* new refresh token is active
* old refresh token is no longer accepted
* access token remains signed JWT per `jwt-token-contract.md`
* Sprint 12 does not return ID Token from refresh grant unless separately approved
* Sprint 12 does not persist access token

---

### Task 55 - Reuse Detection and Compromised Family Handling

#### Objective

Detect reuse of consumed, revoked, or compromised refresh tokens and invalidate the affected token family.

#### Required work

* detect when a known refresh token is presented after it is no longer active
* treat consumed-token reuse as a security event
* mark reused token and related family state as compromised
* invalidate any active refresh token in the same family
* prevent future refresh grant use for compromised family
* return non-revealing `invalid_grant` behavior
* avoid exposing whether the token was consumed, revoked, compromised, or unknown

#### Acceptance criteria

* consumed refresh token reuse is rejected
* reuse does not issue access token
* reuse does not issue refresh token
* family becomes unusable after reuse detection
* latest active token in same family is rejected after compromise
* response remains non-revealing
* no audit module dependency is introduced unless separately approved

---

### Task 56 - Concurrent Refresh Hardening

#### Objective

Prevent multiple successful rotations from the same refresh token under concurrent use.

#### Required work

* implement repository-level or service-level atomic guard so only one request can consume an active refresh token
* ensure two concurrent submissions of the same token cannot both create valid child tokens
* ensure only one active token remains in the family after successful rotation
* define failed concurrent attempts as rejected and, where contract-aligned, reuse-detection candidates
* avoid controller-level lifecycle checks as the primary integrity mechanism

#### Acceptance criteria

* only one concurrent refresh attempt succeeds
* duplicate concurrent attempt fails
* no two active child refresh tokens are created from the same parent
* no two active refresh tokens remain in the same family due to race condition
* access token issuance does not occur for failed concurrent attempt
* refresh token issuance does not occur for failed concurrent attempt

---

### Task 57 - Sprint 12 Validation and Report

#### Objective

Validate Sprint 12 implementation and record evidence.

#### Required work

* run required static validation commands
* run required boundary scans
* run runtime/manual scenarios from the rotation contract
* record PASS / FAIL / NOT RUN accurately
* create Sprint 12 report
* include risks and limitations
* include handoff to Sprint 13

#### Acceptance criteria

* report exists at `docs/planning/reports/phase-05-sprint-12-report.md`
* validation evidence is command-based and reproducible
* boundary/security checks are explicit
* concurrent refresh behavior is validated
* reuse detection behavior is validated
* Sprint 13 handoff is documented

---

## IX. Allowed Dependencies

Allowed:

* `src/modules/oidc`
* `src/modules/users` through approved service/account contracts only, if subject resolution is required
* `src/infrastructure/crypto` through approved utilities
* `src/shared` for generic errors/types/validators
* `src/config` for centralized TTL/config values
* existing `/token` delivery path

---

## X. Forbidden Dependencies

Forbidden:

* `oidc` importing `UserModel`
* `oidc` importing `user.repository`
* `oidc` depending on `token-lifecycle`
* `auth` rotating refresh tokens
* `auth` validating refresh tokens
* `auth` detecting refresh token reuse
* `auth` issuing access or refresh tokens
* `users` storing token family state
* `users` storing token compromise state
* `shared` containing refresh-token rotation workflow logic
* `infrastructure` containing refresh-token business policy
* direct `process.env` outside `src/config`
* new top-level refresh-token module
* unrelated infrastructure expansion

---

## XI. Security-Critical Rules

Mandatory:

* raw refresh token must never be persisted
* raw refresh token must never be logged
* refresh token hash must never be returned
* refresh token must remain opaque and not JWT
* old refresh token must become unusable after successful rotation
* consumed-token reuse must be rejected
* reuse must not issue access token
* reuse must not issue refresh token
* detected reuse must invalidate the family
* compromised family must not be usable for future refresh grants
* concurrent refresh must not produce two valid child tokens
* client mismatch must be rejected
* expired tokens must be rejected
* renewed access token scope must not exceed stored refresh token scope
* access token must not be persisted
* password and `password_hash` must never appear in refresh token records or OIDC responses
* Sprint 12 must not implement revoke endpoint, introspection endpoint, session, SSO, or logout

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
* scoped Prettier check for Sprint 12 touched files
* confirmation that Sprint 12 touched files pass formatting
* list of external failing files if available
* explicit statement that Sprint 12 did not mix unrelated formatting cleanup

### Boundary scans

Required commands:

* `rg -n "process\\.env" src --glob "!src/config/**"`
* `rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc`
* `rg -n "token-lifecycle" src/modules/oidc`
* `rg -n "refresh|refresh_token|refreshToken|rotation|reuse|family|compromised" src/modules/auth`
* `rg -n "refresh_token|refreshToken|tokenHash|familyId|compromised" src/modules/users`
* `rg -n "password_hash|passwordHash" src/modules/oidc`
* `rg -n "introspection|session|sso|logout" src/modules/oidc`

Expected results:

* no direct `process.env` outside config
* no direct users DB access from `oidc`
* no `token-lifecycle` dependency from `oidc`
* no refresh-token rotation/reuse behavior in `auth`
* no refresh-token family/compromise state in `users`
* no password hash exposure in `oidc`
* no Sprint 13+ behavior introduced early

---

## XIII. Manual Validation Scenarios

Required scenarios:

1. Initial authorization-code exchange returns an opaque refresh token.
2. First valid `grant_type=refresh_token` returns a new access token and a new refresh token.
3. First valid refresh-token exchange marks the presented refresh token as consumed.
4. New refresh token preserves subject, client, scope, and family lineage.
5. Old refresh token cannot be used again.
6. Reusing old refresh token triggers reuse detection.
7. Reuse detection invalidates the active token family.
8. After family compromise, the latest refresh token in that family is rejected.
9. Concurrent submissions of the same refresh token allow only one successful rotation.
10. Duplicate concurrent refresh attempt fails.
11. Rotation does not persist raw refresh token.
12. Rotation does not expose token hash.
13. Rotated access token verifies against JWKS/public key.
14. Rotated access token scope does not exceed stored refresh token scope.
15. Expired refresh token cannot rotate.
16. Client mismatch is rejected.
17. Sprint 12 does not implement revoke endpoint.
18. Sprint 12 does not implement introspection endpoint.
19. Sprint 12 does not implement session, SSO, or logout behavior.

---

## XIV. PR and Report Requirements

Sprint 12 PR must include:

* phase/sprint/task references
* source-of-truth references
* refresh token contract reference
* refresh token rotation contract reference
* Sprint 11 merge baseline confirmation
* included scope
* excluded scope
* file list
* validation commands with PASS / FAIL / NOT RUN
* boundary scan evidence
* runtime/manual validation evidence
* concurrent refresh validation evidence
* reuse detection validation evidence
* security notes
* risks and limitations
* handoff to Sprint 13

Sprint 12 report path:

`docs/planning/reports/phase-05-sprint-12-report.md`

---

## XV. Merge-Blocking Conditions

Block Sprint 12 if:

* rotation contract is missing or not referenced
* Sprint 12 assignment is missing or not referenced
* Sprint 11 merge baseline is not confirmed
* raw refresh token is persisted
* refresh token hash is exposed
* refresh token is implemented as JWT
* old refresh token remains usable after successful rotation
* two active refresh tokens exist in the same family without approved rationale
* consumed refresh token reuse does not trigger rejection
* reuse detection issues a new access token
* reuse detection issues a new refresh token
* compromised family remains usable after detected reuse
* concurrent refresh can produce multiple successful rotations
* rotation or reuse logic appears in `auth`
* refresh token family state appears in `users`
* `oidc` imports user model or repository
* `oidc` uses Phase 03 `token-lifecycle`
* access token is persisted
* access token renewal broadens scope
* revoke/introspection/session/SSO/logout behavior appears before approved sprint
* validation evidence is missing
* unrelated formatting cleanup is mixed into the implementation PR

---

## XVI. Definition of Done

Sprint 12 is complete when:

* `refresh-token-rotation-contract.md` is approved and referenced
* Sprint 12 assignment is approved and referenced
* Sprint 11 merge baseline is confirmed
* each successful refresh-token grant rotates the refresh token
* old refresh token is consumed and cannot be reused
* new refresh token is opaque
* new refresh token is stored hashed only
* token family / lineage metadata is persisted
* consumed-token reuse is detected
* reuse detection invalidates the token family
* compromised family cannot be used for future refresh grants
* concurrent refresh attempts cannot produce multiple valid child tokens
* renewed access token follows `jwt-token-contract.md`
* no raw refresh token is persisted, logged, or exposed
* no refresh-token rotation behavior is implemented in `auth`
* no token family state is added to `users`
* no `token-lifecycle` dependency appears in `oidc`
* no Sprint 13+ behavior is introduced early
* all required validation evidence is recorded
* Sprint 12 report is created

---

## XVII. Handoff to Sprint 13

Sprint 13 should start from the Sprint 12 rotation/reuse-detection foundation and add only approved scope:

* token revocation endpoint
* refresh token revocation by presented token
* revocation metadata handling
* introspection endpoint or internal introspection service, if approved
* safe active/inactive token response contract, if approved

Sprint 13 must not start until its assignment or contract is approved.
