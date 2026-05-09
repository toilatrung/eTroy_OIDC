# Phase 06 - Platform and Governance Hardening

## I. Executive Summary

Phase 06 completes the production-readiness layer for eTroy OIDC after Phase 01 through Phase 05 have been closed.

This phase does not redefine identity, authentication, OIDC protocol issuance, refresh-token lifecycle, session management, SSO, or logout behavior that has already been implemented and closed in earlier phases.

Phase 06 focuses on platform control, governance hardening, administration boundaries, auditability, observability, client lifecycle management, JWKS/key rotation, and final security review gates.

Runtime implementation must not begin until the relevant Phase 06 contracts and sprint assignments are approved.

Current phase status:

- Phase 06 status: APPROVED FOR CONTRACT-BACKED EXECUTION
- Phase 06 runtime implementation: IN PROGRESS
- Sprint 16 - Audit Logging Foundation: MERGED / CLOSED / PRESENT IN `main`
- Sprint 17 - Admin Module Controls: MERGED / CLOSED / PRESENT IN `main`
- Sprint 18 - OIDC Client Management: MERGED / CLOSED / PRESENT IN `main`
- Sprint 19 - Observability Hardening: MERGED / CLOSED / PRESENT IN `main`
- Sprint 19 validation: lint/typecheck/build PASS; scoped Sprint 19 Prettier PASS; repository-wide `format:check` FAIL / ACCEPTED BASELINE EXCEPTION outside Sprint 19 scope
- Sprint 20 - JWKS / Key Rotation Hardening: MERGED / CLOSED / PRESENT IN `main`
- Sprint 20 validation: lint/typecheck/build PASS; scoped Sprint 20 Prettier PASS; repository-wide `format:check` FAIL / ACCEPTED BASELINE EXCEPTION outside Sprint 20 scope
- Sprint 21 - Security Governance Finalization: READY FOR INTAKE / NOT STARTED
- Sprint 21 runtime gate: blocked until Sprint 21 contract and assignment are approved.

## II. Phase Objective

Reach production-ready platform and governance controls for the eTroy OIDC provider.

The phase must ensure that:

- security-relevant actions are audit-ready
- admin operations are controlled and boundary-safe
- OIDC client metadata is managed through approved ownership contracts
- observability is sufficient for operational monitoring and incident triage
- JWKS/key rotation is explicit, safe, and reviewable
- final security hardening is traceable and merge-blocking

## III. Phase Scope

### Included Scope

Phase 06 includes:

- audit event foundation
- audit event recording for security-relevant flows
- admin orchestration controls
- admin-facing user/client/token/session control surfaces where approved
- OIDC client metadata lifecycle management
- client secret handling rules
- redirect URI governance
- observability hardening through structured logs and metrics
- health/readiness review where needed
- JWKS/key rotation lifecycle
- final security governance checklist and release-readiness review

### Excluded Scope

Phase 06 excludes:

- new user identity ownership behavior outside `users`
- new credential validation ownership outside `auth`
- new OIDC token/session ownership outside `oidc`
- new verification or password-reset behavior outside Phase 03 scope
- social login
- MFA
- external identity federation
- advanced admin dashboard UI
- client application business logic
- direct identity duplication in clients
- raw refresh-token persistence
- raw client-secret persistence
- ad-hoc runtime folders or undocumented module structures

## IV. Authority and Governance Model

Phase 06 remains governed by the existing source-of-truth hierarchy:

1. `docs/source-of-truth-index.md`
2. `docs/README.md`
3. `docs/architecture/system-overview.md`
4. `docs/architecture/module-boundaries.md`
5. `docs/architecture/source-tree.md`
6. `docs/architecture/detailed-source-tree.md`
7. `docs/requirements/srs-v1.md`
8. `docs/planning/master-execution-plan.md`
9. `docs/planning/phases/phase-06-platform-governance-hardening.md`
10. Relevant Phase 06 contracts
11. Relevant Phase 06 sprint assignment
12. Relevant previous sprint reports
13. `docs/governance/git-rules.md`
14. `docs/governance/pr-template.md`
15. `docs/governance/review-checklist.md`
16. `docs/governance/anti-patterns.md`
17. `agent/current-context.md`
18. `agent/session-history.md`

Rules:

- `docs/` remains authoritative.
- `agent/` remains operational support only.
- No implementation may begin without an approved contract and assignment.
- Architecture changes must update architecture documents before or with implementation.
- Runtime code must not be justified from `agent/` files alone.

## V. Phase 06 Contract Gate

Phase 06 requires explicit contracts before sprint implementation.

### Required Contracts

#### 1. `docs/contracts/audit/audit-event-contract.md`

Purpose:

- define audit event schema
- define security-relevant event categories
- define append-only behavior
- define redaction and secret-safety rules
- define query boundary
- define event producer responsibilities

Required decisions:

- audit event fields
- actor model
- subject model
- client reference model
- request correlation fields
- sensitive value redaction
- persistence model
- read/query restrictions

#### 2. `docs/contracts/admin/admin-control-contract.md`

Purpose:

- define admin orchestration boundary
- define allowed admin operations
- define forbidden direct mutation patterns
- define admin-to-users, admin-to-oidc, and admin-to-audit interaction rules

Required decisions:

- admin authorization assumption for this project version
- user administration operations allowed in Phase 06
- client administration operations allowed in Phase 06
- token/session control operations allowed in Phase 06, if any
- required audit events for admin actions

#### 3. `docs/contracts/oidc/client-management-contract.md`

Purpose:

- define OIDC client metadata lifecycle
- define client secret handling
- define redirect URI validation
- define enabled/disabled client states
- define secret rotation behavior

Required decisions:

- client metadata schema
- client identifier generation or input rule
- client secret hashing rule
- redirect URI exact-match rule
- allowed grant types and scopes
- client status lifecycle
- update rules and immutable fields
- admin-to-oidc boundary

#### 4. `docs/contracts/observability/observability-contract.md`

Purpose:

- define operational metrics
- define required structured log fields
- define no-secret logging constraints
- define health/readiness expectations
- define monitoring coverage for identity/OIDC/security flows

Required decisions:

- metric names or metric categories
- labels/tags allowed
- forbidden labels/tags containing PII or secrets
- error-rate tracking
- token/session/client/audit event counters
- readiness dependency checks

#### 5. `docs/contracts/oidc/key-rotation-contract.md`

Purpose:

- define JWKS and signing key lifecycle
- define `kid` selection
- define active/retired key states
- define overlap window for old tokens
- define validation behavior across rotated keys

Required decisions:

- key model
- active signing key rule
- retired verification key rule
- JWKS publication rule
- key generation/storage boundary
- rotation trigger
- rollback behavior

#### 6. `docs/contracts/security/security-hardening-contract.md`

Purpose:

- define final security hardening checklist
- define release-blocking criteria
- define residual risk handling
- define cross-module security review expectations

Required decisions:

- required scans
- required manual checks
- accepted known conditions
- release blockers
- non-blocking risks
- security evidence format

## VI. Sprint Breakdown

Phase 06 is divided into six controlled sprints.

---

# Sprint 16 - Audit Logging Foundation

## 1. Objective

Implement the audit logging foundation for security-relevant system events.

Sprint 16 establishes the `audit` module as the owner of audit event persistence and query/read contracts. It must not mutate business state or absorb domain workflows.

## 2. Owner Module / Layer

Primary owner:

- `src/modules/audit`

Supporting layers:

- `src/infrastructure/database`
- `src/infrastructure/logger`
- `src/shared/errors`
- `src/shared/types`, only if generic and approved

## 3. Required Contract

Blocked until approved:

- `docs/contracts/audit/audit-event-contract.md`

## 4. Included Scope

- audit event model
- audit repository
- audit service
- append-only audit event recording
- security event category support
- redaction-safe event payload handling
- correlation metadata support
- query/read interface if approved by contract
- audit event hooks in already-approved flows only where the assignment explicitly allows

## 5. Excluded Scope

- admin control implementation
- OIDC client management implementation
- key rotation implementation
- changing identity behavior
- changing token/session behavior
- business-state mutation from `audit`
- audit dashboard UI
- SIEM integration
- external log pipeline integration

## 6. Expected Deliverables

Candidate deliverables, subject to contract approval:

- `src/modules/audit/audit-event.model.ts`
- `src/modules/audit/audit.repository.ts`
- `src/modules/audit/audit.service.ts`
- optional `src/modules/audit/audit.controller.ts` only if query/read API is approved
- `docs/planning/assignments/phase-06-sprint-16.md`
- `docs/planning/reports/phase-06-sprint-16-report.md`

## 7. Boundary Rules

- `audit` owns audit records only.
- `audit` must not mutate users, clients, tokens, sessions, or lifecycle state.
- Other modules may call `audit` through service contracts only.
- Audit event creation must not leak secrets.
- Audit payloads must be explicit and bounded, not arbitrary object dumps.

## 8. Validation Commands

Required baseline:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Sprint-specific scans:

```bash
rg -n "password|refresh_token|client_secret|id_token|access_token" src/modules/audit
rg -n "UserModel|RefreshToken|Session|ClientModel" src/modules/audit
```

Expected interpretation:

- secret-related matches require review and must not show raw value persistence/logging
- direct domain model access from audit is not allowed unless explicitly approved as audit-owned persistence

## 9. Acceptance Criteria

Sprint 16 is acceptable when:

- audit contract is approved
- audit model/repository/service align with contract
- audit records are append-only
- no secret leakage exists in audit payloads
- `audit` does not mutate domain state
- validation evidence is recorded in the sprint report

## 10. Handoff Target

Sprint 17 - Admin Module Controls

---

# Sprint 17 - Admin Module Controls

## 1. Objective

Implement admin orchestration controls without violating domain ownership.

The admin module must coordinate approved operations through `users`, `oidc`, and `audit` service contracts. It must not directly mutate cross-domain persistence.

Sprint 17 readiness status:

- Sprint 17 - Admin Module Controls: MERGED / CLOSED / PRESENT IN `main`
- Sprint 17 runtime: COMPLETED
- Sprint 17 scope is admin-controlled user administration only.
- Sprint 18 remains OIDC Client Management.

## 2. Owner Module / Layer

Primary owner:

- `src/modules/admin`

Approved dependencies:

- `src/modules/users` through approved service contracts
- `src/modules/audit` through audit service contract
- `src/shared/errors`

## 3. Required Contracts

Approved runtime basis:

- `docs/contracts/admin/admin-control-contract.md`
- `docs/contracts/audit/audit-event-contract.md` for admin audit events

## 4. Included Scope

- admin service baseline
- admin controller baseline if API surface is approved
- controlled user administration orchestration if approved
- audit event recording for admin actions
- defensive input validation

## 5. Excluded Scope

- admin dashboard UI
- client management
- token/session controls
- RBAC or a new authentication/authorization role system
- direct user database mutation
- direct OIDC token/session database mutation
- direct OIDC client database mutation
- direct audit persistence bypass
- business logic duplication from `users` or `oidc`
- broad super-admin behavior without scoped contract
- hard-delete users
- edit `sub`, internal user id, or `password_hash`
- change user email in Sprint 17

## 6. Expected Deliverables

Approved deliverables, subject to Sprint 17 runtime execution:

- `src/modules/admin/admin.service.ts`
- `src/modules/admin/admin.controller.ts`
- optional `src/modules/admin/admin.validator.ts`
- `docs/planning/assignments/phase-06-sprint-17.md`
- `docs/planning/reports/phase-06-sprint-17-report.md`

## 7. Boundary Rules

- `admin` orchestrates; it does not own identity or OIDC protocol state.
- `admin` must call owning modules through approved services.
- All security-relevant admin actions must generate audit events where approved.
- No raw cross-domain repository/model import is allowed.

## 8. Validation Commands

Required baseline:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Sprint-specific scans:

```bash
rg -n "UserModel|user\.repository|mongoose|findOne|findById|updateOne|deleteOne" src/modules/admin
rg -n "RefreshToken|Session|AuthorizationCode|ClientModel" src/modules/admin
rg -n "sign|jwt|issue|generate.*token" src/modules/admin
```

Expected interpretation:

- direct ownership access is forbidden
- token issuance from admin is forbidden
- admin must use approved service contracts only

## 9. Acceptance Criteria

Sprint 17 is acceptable when:

- admin contract is approved
- admin operations are explicit and scoped
- no cross-domain raw mutation exists
- audit events are emitted for approved admin actions
- validation evidence is recorded

## 10. Handoff Target

Sprint 18 - OIDC Client Management

---

# Sprint 18 - OIDC Client Management

## 1. Objective

Implement OIDC client metadata lifecycle management under the `oidc` domain, with admin orchestration where approved.

This sprint moves client metadata away from static-only configuration if the contract approves persistent client management.

## 2. Owner Module / Layer

Primary owner:

- `src/modules/oidc`

Orchestration dependency:

- `src/modules/admin` may orchestrate client operations through approved `oidc` service contracts

Supporting layers:

- `src/infrastructure/database`
- `src/infrastructure/crypto`
- `src/shared/errors`

## 3. Required Contract

Blocked until approved:

- `docs/contracts/oidc/client-management-contract.md`
- `docs/contracts/admin/admin-control-contract.md` for admin-facing client operations
- `docs/contracts/audit/audit-event-contract.md` for client lifecycle audit events

## 4. Included Scope

- OIDC client model
- client repository
- client service
- create client
- retrieve client
- update controlled mutable metadata
- disable client
- rotate client secret
- hash client secret before persistence
- validate redirect URI through exact-match rules
- integrate managed clients with existing OIDC validation path if approved
- audit client lifecycle events

## 5. Excluded Scope

- dynamic public self-service client registration
- third-party marketplace clients
- client-owned identity storage
- social login
- external federation
- raw client secret persistence
- changing token issuance semantics unless explicitly required by client validation contract
- broad OAuth grant type expansion beyond approved flows

## 6. Expected Deliverables

Candidate deliverables, subject to contract approval:

- `src/modules/oidc/client.model.ts`
- `src/modules/oidc/client.repository.ts`
- `src/modules/oidc/client.service.ts`
- optional `src/modules/oidc/client.controller.ts` only if OIDC-owned admin route is approved
- updates to existing OIDC client validation path
- `docs/planning/assignments/phase-06-sprint-18.md`
- `docs/planning/reports/phase-06-sprint-18-report.md`

## 7. Boundary Rules

- `oidc` owns client metadata.
- `admin` may orchestrate client management only through `oidc` service contracts.
- Client secrets must be hashed before persistence.
- Redirect URI validation must remain exact-match unless contract explicitly changes it.
- Clients must not become identity owners.

## 8. Validation Commands

Required baseline:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Sprint-specific scans:

```bash
rg -n "client_secret|clientSecret|secret" src/modules/oidc
rg -n "UserModel|user\.repository|mongoose.*User" src/modules/oidc
rg -n "redirect_uri|redirectUris|redirect_uris" src/modules/oidc
```

Expected interpretation:

- client secret matches require review for hash-only persistence
- direct user DB access from OIDC remains forbidden
- redirect URI handling must align with exact-match contract

## 9. Acceptance Criteria

Sprint 18 is acceptable when:

- client-management contract is approved
- client metadata lifecycle is implemented under `oidc`
- client secrets are never stored raw
- redirect URI validation remains strict
- admin interactions do not bypass `oidc`
- validation evidence is recorded

## 10. Handoff Target

Sprint 19 - Observability Hardening

---

# Sprint 19 - Observability Hardening

## 1. Objective

Improve operational visibility through structured logging, metrics, and health/readiness review without leaking secrets or moving business logic into infrastructure.

## 2. Owner Module / Layer

Primary owner:

- `src/infrastructure/logger`
- `src/infrastructure/metrics`
- `src/modules/health`

Participating modules:

- `users`
- `auth`
- `verification`
- `password-reset`
- `oidc`
- `admin`
- `audit`

## 3. Required Contract

Blocked until approved:

- `docs/contracts/observability/observability-contract.md`
- `docs/contracts/audit/audit-event-contract.md` where observability overlaps audit-safe event correlation

## 4. Included Scope

- structured logging field normalization
- request correlation support if approved
- metrics counters/gauges/histograms where approved
- health/readiness endpoint refinement if approved
- error-rate visibility
- security-relevant event metrics
- token/session/client lifecycle metrics without secret leakage

## 5. Excluded Scope

- external monitoring vendor integration
- SIEM pipeline implementation
- logging secrets or raw tokens
- domain workflow logic inside logger/metrics infrastructure
- changing business behavior to satisfy metrics
- distributed tracing unless explicitly approved

## 6. Expected Deliverables

Candidate deliverables, subject to contract approval:

- updates to `src/infrastructure/logger/logger.ts`
- updates to `src/infrastructure/metrics/metrics.ts`
- updates to `src/modules/health/health.controller.ts` if present/approved
- minimal instrumentation in modules where explicitly approved
- `docs/planning/assignments/phase-06-sprint-19.md`
- `docs/planning/reports/phase-06-sprint-19-report.md`

## 7. Boundary Rules

- infrastructure provides instrumentation primitives only.
- modules own business event decisions.
- no secret, credential, token, authorization code, or client secret value may be logged.
- metrics labels must not contain high-cardinality secrets or PII.

## 8. Validation Commands

Required baseline:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Sprint-specific scans:

```bash
rg -n "password|client_secret|refresh_token|access_token|id_token|authorization_code|code_verifier|code_challenge" src/infrastructure src/modules
rg -n "logger\.|metrics\.|recordMetric|increment|observe" src
```

Expected interpretation:

- matches must be reviewed for redaction and no raw secret output
- instrumentation must not introduce domain behavior into infrastructure

## 9. Acceptance Criteria

Sprint 19 is acceptable when:

- observability contract is approved
- logging and metrics are structured and bounded
- health/readiness behavior is explicit
- no secret leakage exists
- instrumentation does not change domain ownership
- validation evidence is recorded

## 10. Handoff Target

Sprint 20 - JWKS / Key Rotation Hardening

---

# Sprint 20 - JWKS / Key Rotation Hardening

## 1. Objective

Harden JWKS and signing-key lifecycle behavior so that token signing, verification, and key publication remain safe during rotation.

## 2. Owner Module / Layer

Primary owner:

- `src/infrastructure/crypto`
- `src/modules/oidc`

Supporting layer:

- `src/jobs` if scheduled key rotation is approved

## 3. Required Contract

Blocked until approved:

- `docs/contracts/oidc/key-rotation-contract.md`
- `docs/contracts/audit/audit-event-contract.md` for key lifecycle audit events if approved
- `docs/contracts/observability/observability-contract.md` for metrics/logging around key rotation if approved

## 4. Included Scope

- explicit signing key metadata
- `kid` selection rule
- JWKS publication review
- active/retired key lifecycle
- token verification compatibility across rotation window
- key rotation job only if approved
- audit/metrics events for key lifecycle only if approved

## 5. Excluded Scope

- committing production private keys
- external KMS integration unless approved
- changing token claim semantics
- changing token/session lifecycle behavior
- rotating client secrets
- modifying identity/auth behavior
- unsafe removal of verification keys before token expiry window

## 6. Expected Deliverables

Candidate deliverables, subject to contract approval:

- updates to `src/infrastructure/crypto/keys.ts`
- updates to `src/infrastructure/crypto/jwks.ts`
- updates to OIDC token signing key selection path
- optional `src/jobs/key-rotation.job.ts` if approved
- `docs/planning/assignments/phase-06-sprint-20.md`
- `docs/planning/reports/phase-06-sprint-20-report.md`

## 7. Boundary Rules

- crypto infrastructure handles key loading, key metadata, signing support, and JWKS generation.
- OIDC owns token issuance behavior and selects signing key through approved crypto contracts.
- Jobs may trigger approved maintenance but must not bypass service contracts.
- Real production private keys must not be committed.

## 8. Validation Commands

Required baseline:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Sprint-specific scans:

```bash
rg -n "private.*key|PRIVATE|BEGIN PRIVATE KEY|client_secret|refresh_token" src keys docs --glob "!docs/planning/reports/**"
rg -n "kid|jwks|sign|verify|publicKey|privateKey" src/infrastructure/crypto src/modules/oidc src/jobs
```

Expected interpretation:

- private key references require review and must not expose production key material
- signing and verification behavior must preserve token compatibility during overlap window

## 9. Acceptance Criteria

Sprint 20 is acceptable when:

- key rotation contract is approved
- signing key selection is explicit
- JWKS output is deterministic and safe
- retired keys remain available for approved validation window
- production private key material is not committed
- validation evidence is recorded

## 10. Handoff Target

Sprint 21 - Security Governance Finalization

---

# Sprint 21 - Security Governance Finalization

## 1. Objective

Perform final security and governance hardening review for release readiness.

Sprint 21 is not a broad feature sprint. It is a controlled review and hardening sprint that closes residual governance, security, validation, and documentation gaps.

## 2. Owner Module / Layer

Primary owner:

- repository governance and cross-module review

Affected areas may include:

- `docs/governance`
- `docs/planning/reports`
- `agent/current-context.md`
- security-sensitive runtime paths only if contract-backed corrections are needed

## 3. Required Contract

Blocked until approved:

- `docs/contracts/security/security-hardening-contract.md`

Supporting contracts:

- `docs/contracts/audit/audit-event-contract.md`
- `docs/contracts/admin/admin-control-contract.md`
- `docs/contracts/oidc/client-management-contract.md`
- `docs/contracts/observability/observability-contract.md`
- `docs/contracts/oidc/key-rotation-contract.md`

## 4. Included Scope

- final security checklist execution
- final architecture boundary scan
- final source-tree compliance review
- final governance checklist review
- residual risk documentation
- accepted known condition documentation
- release-readiness report
- small corrective changes only if contract-backed and explicitly assigned

## 5. Excluded Scope

- new feature development
- undocumented architecture changes
- broad refactors
- module rewrites
- cosmetic cleanup unrelated to release blocking
- direct push to `main`
- hidden risk acceptance without documentation

## 6. Expected Deliverables

Candidate deliverables:

- `docs/planning/reports/phase-06-security-hardening-report.md`
- optional updates to `docs/governance/review-checklist.md`
- optional updates to `docs/governance/anti-patterns.md`
- optional updates to `docs/planning/master-execution-plan.md`
- optional updates to `agent/current-context.md`
- optional corrective runtime patches only if explicitly required and contract-backed

## 7. Boundary Rules

- Sprint 21 must not become a dumping ground for leftover features.
- Security corrections must cite exact source-of-truth basis.
- Any runtime change must remain minimal and PR-scoped.
- Known risks must be either fixed, explicitly accepted, or marked release-blocking.

## 8. Validation Commands

Required baseline:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Security scans:

```bash
rg -n "password|client_secret|refresh_token|access_token|id_token|authorization_code|code_verifier|private.*key|BEGIN PRIVATE KEY" src docs keys --glob "!docs/planning/reports/**"
rg -n "UserModel|user\.repository|mongoose" src/modules/oidc src/modules/admin src/modules/audit
rg -n "sign|jwt|issue|generate.*token" src/modules/auth src/modules/admin src/modules/users src/modules/audit
rg -n "shared/.+service|workflow|usecase|issue|token" src/shared
rg -n "business|workflow|policy" src/infrastructure
```

Expected interpretation:

- findings require manual review
- security-sensitive matches are not automatically failures, but must be explained
- forbidden ownership patterns are release-blocking

## 9. Acceptance Criteria

Sprint 21 is acceptable when:

- security hardening contract is approved
- all scans are run or explicitly marked NOT RUN with reason
- critical boundary violations are absent
- secret persistence/logging risks are absent or fixed
- residual risks are documented
- release-readiness posture is explicit

## 10. Handoff Target

Project release readiness / post-Phase 06 production stabilization

## VII. Phase Dependency Order

Recommended execution order:

1. Maintain the approved Phase 06 phase plan at `docs/planning/phases/phase-06-platform-governance-hardening.md`.
2. Approve required contracts for the active sprint scope.
3. Approve Sprint 16 assignment.
4. Implement Sprint 16 only after both audit contract and Sprint 16 assignment are approved.
5. Create and approve Sprint 17 assignment after Sprint 16 contract/readiness is stable.
6. Implement Sprint 17 only after admin and audit contracts are approved.
7. Create and approve Sprint 18 assignment after client-management contract is approved.
8. Implement Sprint 18 only after client-management/admin/audit boundaries are locked.
9. Create and implement Sprint 19 after observability contract approval.
10. Create and implement Sprint 20 after key-rotation contract approval.
11. Create and execute Sprint 21 after all Phase 06 sprint evidence exists.

## VIII. Required Documentation Changes

Phase 06 planning requires the following source-of-truth updates:

- maintain canonical phase plan at `docs/planning/phases/phase-06-platform-governance-hardening.md`
- maintain `docs/contracts/audit/audit-event-contract.md` as sprint gate contract
- create `docs/contracts/admin/admin-control-contract.md`
- create `docs/contracts/oidc/client-management-contract.md`
- create `docs/contracts/observability/observability-contract.md`
- create `docs/contracts/oidc/key-rotation-contract.md`
- create `docs/contracts/security/security-hardening-contract.md`
- maintain sprint assignments under `docs/planning/assignments/`
- create sprint reports under `docs/planning/reports/` after execution
- update `docs/source-of-truth-index.md`
- update `docs/README.md`
- update `docs/planning/master-execution-plan.md`
- update `agent/current-context.md` only as operational handoff context
- update `agent/session-history.md` only for concise state transitions

## IX. Branch and PR Strategy

Recommended branch naming:

- `docs/phase06-platform-governance-plan`
- `docs/phase06-contracts`
- `feature/audit-sprint16-foundation`
- `feature/admin-sprint17-controls`
- `feature/oidc-sprint18-client-management`
- `feature/observability-sprint19-hardening`
- `feature/oidc-sprint20-key-rotation`
- `feature/security-sprint21-final-hardening`

Rules:

- planning/contracts should be reviewed before runtime branches
- each runtime sprint should use a separate PR
- direct commits to `main` are forbidden
- unrelated formatting cleanup must not be mixed into feature PRs
- global format drift must be handled as a separate governance cleanup item unless Phase 06 explicitly makes it release-blocking

## X. Phase-Level Validation Posture

Every Phase 06 runtime sprint should run:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

If global `format:check` remains failing because of accepted repository-wide baseline drift, the sprint report must include:

- exact command result
- FAIL status
- reason
- scoped touched-file Prettier check result
- confirmation that drift is outside sprint-touched files

No sprint may claim full validation PASS if `format:check` fails globally.

## XI. Phase-Level Manual Checks

Required manual checks across Phase 06:

- no admin direct database mutation across domains
- no audit module domain-state mutation
- no raw client secret persistence
- no raw refresh token persistence regression
- no raw token or credential logging
- no OIDC direct user ownership database access
- no auth token generation
- no identity duplication outside `users`
- no business logic in `infrastructure`
- no module-specific workflow in `shared`
- no production private key material committed
- no undocumented runtime structure

## XII. Phase 06 Definition of Done

Phase 06 is complete when:

- Phase 06 phase plan is approved
- all required Phase 06 contracts are approved
- Sprint 16 through Sprint 21 are completed or explicitly descoped by governance decision
- each sprint has a report with validation evidence
- all runtime changes are merged through PRs
- audit, admin, client management, observability, key rotation, and security hardening boundaries are verified
- release-readiness risks are documented
- no unresolved merge-blocking security or architecture issue remains

## XIII. Known Risks

### 1. Admin Scope Expansion

Risk:

- admin can become a god module if it directly mutates users, OIDC clients, sessions, or tokens.

Control:

- admin must orchestrate only through approved service contracts.

### 2. Audit Secret Leakage

Risk:

- audit events can accidentally persist credentials, raw tokens, authorization codes, or client secrets.

Control:

- audit payload schema must be explicit and redaction-safe.

### 3. Client Management Weakening OIDC Security

Risk:

- dynamic client management can loosen redirect URI or secret handling.

Control:

- exact-match redirect validation and hash-only client secret persistence must be locked by contract.

### 4. Observability PII Leakage

Risk:

- logs/metrics can expose PII or secrets through labels and structured fields.

Control:

- observability contract must forbid raw secrets and high-risk labels.

### 5. Unsafe Key Rotation

Risk:

- removing old keys too early can break validation for still-valid tokens.

Control:

- key rotation contract must define overlap window and retired verification behavior.

### 6. Governance Drift

Risk:

- final hardening can become broad cleanup without traceable scope.

Control:

- Sprint 21 must stay checklist-driven and contract-backed.

## XIV. Recommended Immediate Next Step

Create the Phase 06 status-sync PR containing only documentation changes:

- canonical Phase 06 phase plan path alignment
- contract and assignment approval-state/gate alignment
- source-of-truth index update
- documentation guide update
- master execution plan update
- agent context update

No runtime implementation should be included in this PR.
