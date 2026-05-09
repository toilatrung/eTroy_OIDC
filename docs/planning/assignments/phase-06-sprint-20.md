# Phase 06 / Sprint 20 - JWKS / Key Rotation Hardening Assignment

---

## I. Assignment Summary

- Phase: Phase 06 - Platform and Governance Hardening
- Sprint: Sprint 20 - JWKS / Key Rotation Hardening
- Task range:
  - Task 105 - Key Rotation Contract Alignment
  - Task 106 - OIDC Key Metadata Model and Repository
  - Task 107 - OIDC Key Service
  - Task 108 - Active Signing Key Integration
  - Task 109 - JWKS Publication Hardening
  - Task 110 - Rotation, Retirement, Rollback, and Compromise Handling
  - Task 111 - Key Lifecycle Audit and Observability Integration
  - Task 112 - Sprint 20 Validation and Report

- Owner module: `src/modules/oidc`
- Supporting layer: `src/infrastructure/crypto`
- Optional supporting area: `src/jobs`
- Required contracts:s
  - `docs/contracts/oidc/key-rotation-contract.md`
  - `docs/contracts/audit/audit-event-contract.md`
  - `docs/contracts/observability/observability-contract.md`

- Assignment path: `docs/planning/assignments/phase-06-sprint-20.md`
- Status: Approved for Sprint 20 runtime implementation

---

## II. Runtime Gate

Sprint 20 runtime implementation may begin only when all are true:

- Sprint 19 - Observability Hardening is merged, closed, and present in `main`.
- `docs/contracts/oidc/key-rotation-contract.md` exists and is approved.
- `docs/planning/assignments/phase-06-sprint-20.md` exists and is approved.
- `docs/contracts/audit/audit-event-contract.md` exists and is approved.
- `docs/contracts/observability/observability-contract.md` exists and is approved.
- Runtime work begins from updated `main`.
- Runtime work occurs on a dedicated Sprint 20 feature branch.
- Implementation packet is produced before coding.

Until this gate is satisfied:

- do not edit `src/`
- do not implement Sprint 20 runtime
- do not create Sprint 20 report
- do not mark Sprint 20 as started
- do not mix Sprint 20 with final security hardening or release-readiness review work
- do not introduce external KMS, HSM, SIEM, distributed tracing, or scheduled key rotation

Recommended runtime branch:

- `feature/oidc-sprint20-key-rotation`

---

## III. Source-of-Truth Basis

Sprint 20 must use the following documents:

- `docs/source-of-truth-index.md`
- `docs/README.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/architecture/detailed-source-tree.md`
- `docs/requirements/srs-v1.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-06-platform-governance-hardening.md`
- `docs/contracts/oidc/key-rotation-contract.md`
- `docs/contracts/audit/audit-event-contract.md`
- `docs/contracts/observability/observability-contract.md`
- `docs/planning/assignments/phase-06-sprint-20.md`
- `docs/planning/reports/phase-06-sprint-19-report.md`
- `docs/governance/git-rules.md`
- `docs/governance/pr-template.md`
- `docs/governance/review-checklist.md`
- `docs/governance/anti-patterns.md`
- `agent/current-context.md`
- `agent/session-history.md`
- `agent/prompts/sprint-task-execution.md`

Authority rules:

- `docs/` is authoritative.
- `agent/` is operational support only.
- `source-tree.md` is primary over `detailed-source-tree.md`.
- If this assignment conflicts with `docs/contracts/oidc/key-rotation-contract.md`, the contract wins.
- If this assignment conflicts with architecture documents, architecture documents win unless an approved architecture update is included.
- No implementation may exceed approved contract and assignment scope.

Sprint 20 exists because Phase 06 explicitly requires JWKS/key rotation lifecycle hardening, and current operational context states Sprint 20 is ready for intake but runtime-blocked until the contract and assignment are approved.

---

## IV. Sprint Objective

Implement a controlled JWKS and signing-key rotation baseline.

Sprint 20 establishes OIDC-owned signing-key lifecycle management with deterministic active key selection, safe retired-key verification overlap, public-only JWKS publication, manual/service-triggered rotation, controlled rollback, audit events, and safe observability.

Sprint 20 must ensure:

- OIDC owns key lifecycle policy.
- `infrastructure/crypto` remains a low-level crypto utility layer only.
- Exactly one active signing key is selected for new JWT signing.
- Newly signed JWTs include a correct `kid`.
- JWKS publishes public keys only.
- Retired verification keys remain available during the overlap window.
- Compromised keys are never used for signing.
- Private key material is never exposed through JWKS, API, logs, audit, metrics, reports, or committed production files.
- Refresh-token lifecycle, session lifecycle, client lifecycle, and auth credential validation behavior remain unchanged.

---

## V. Included Scope

Sprint 20 includes:

- key rotation contract alignment
- OIDC key metadata model
- OIDC key repository if persistent metadata is implemented
- OIDC key service
- system-generated unique `kid`
- key states:
  - `active`
  - `retired`
  - `compromised`

- exactly one active signing key rule
- active signing key selection for OIDC JWT signing
- JWT header `kid` integration
- JWKS publication hardening
- JWKS active public key publication
- JWKS retired public key publication during overlap window
- default overlap window of 24 hours
- service/manual-triggered rotation baseline
- key retirement behavior
- controlled rollback behavior
- compromised state handling
- predictable failure handling
- key lifecycle audit events
- safe observability/logging/metrics integration
- Sprint 20 validation and report evidence

---

## VI. Excluded Scope

Sprint 20 excludes:

- external KMS integration
- cloud key management integration
- HSM integration
- automatic scheduled rotation job
- cron-based key rotation
- operator dashboard UI
- broad admin RBAC changes
- broad final security hardening
- release-readiness review
- changing refresh-token lifecycle
- changing session lifecycle
- changing OIDC client lifecycle
- changing user identity behavior
- changing auth credential validation behavior
- changing token issuance semantics outside active key selection and JWT `kid` header behavior
- public API exposure for private/signing key material
- committing real production private keys
- exposing private key material through JWKS, API, logs, audit, metrics, reports, or errors
- distributed tracing
- SIEM or external observability pipeline
- emergency incident-response automation beyond approved `compromised` state handling
- broad formatting cleanup
- unrelated refactors

---

## VII. Owner Module and Allowed File Areas

### Primary owner: OIDC

Sprint 20 may create or update:

- `src/modules/oidc/key.model.ts`
- `src/modules/oidc/key.repository.ts`
- `src/modules/oidc/key.service.ts`
- existing OIDC token signing/provider files only as needed for active key selection and JWT `kid`
- existing OIDC JWKS publication path only as needed for public-key publication hardening

OIDC changes must remain key lifecycle and OIDC signing/JWKS behavior only.

### Supporting layer: crypto infrastructure

Sprint 20 may update:

- `src/infrastructure/crypto/keys.ts`
- `src/infrastructure/crypto/jwks.ts`
- `src/infrastructure/crypto/index.ts`

Only for low-level utility behavior:

- key generation primitive
- PEM/JWK conversion primitive
- public JWK derivation
- signing material loading/parsing primitive
- safe key helper exports

`infrastructure/crypto` must not own rotation business policy.

### Optional area: jobs

Sprint 20 baseline does not require a job.

Sprint 20 may touch:

- `src/jobs/key-rotation.job.ts`

Only if explicitly justified by implementation packet and approved assignment interpretation.

If touched, the job must:

- call approved OIDC key service methods only
- not import key model/repository
- not mutate key persistence directly
- not own rotation policy

### Audit module

Sprint 20 may update:

- `src/modules/audit/audit.types.ts`

Only to add approved key lifecycle audit event constants/types if missing.

Sprint 20 must not modify audit repository/model unless a contract-backed compatibility issue exists and is explicitly reported.

### Observability

Sprint 20 may use existing Sprint 19 logger/metrics primitives.

Sprint 20 should not create new observability infrastructure unless a minimal export or type update is required.

### Documentation deliverable

Sprint 20 must create:

- `docs/planning/reports/phase-06-sprint-20-report.md`

Sprint 20 may update operational context after runtime completion:

- `agent/current-context.md`
- `agent/session-history.md`

Only to reflect actual implementation status after validation.

---

## VIII. Expected Deliverables

Required or likely runtime deliverables:

- `src/modules/oidc/key.model.ts`
- `src/modules/oidc/key.repository.ts`
- `src/modules/oidc/key.service.ts`
- updates to OIDC signing/token provider code for active key selection and JWT `kid`
- updates to JWKS publication path
- updates to `src/infrastructure/crypto` key utilities if needed
- additive audit event type update if required
- safe observability metric/log hooks if implemented
- `docs/planning/reports/phase-06-sprint-20-report.md`

Optional only if assignment and implementation packet justify it:

- `src/jobs/key-rotation.job.ts`
- admin orchestration endpoint for manual rotation

Do not create:

- new root runtime directories
- external KMS adapter
- HSM adapter
- SIEM/log pipeline
- admin dashboard UI
- new RBAC module
- key-management business logic under `shared`
- OIDC key lifecycle business logic under `infrastructure/crypto`
- scheduled key rotation job unless explicitly justified and approved in the implementation packet

---

## IX. Task Breakdown

### Task 105 - Key Rotation Contract Alignment

Goal:

- confirm approved Sprint 20 contract and assignment
- inspect current runtime state before coding
- produce implementation packet

Required checks:

- confirm `docs/contracts/oidc/key-rotation-contract.md` is approved
- confirm `docs/planning/assignments/phase-06-sprint-20.md` is approved
- confirm audit contract is approved
- confirm observability contract is approved
- confirm Sprint 19 is merged/closed/present in `main`
- inspect current signing key usage
- inspect current JWT signing provider/path
- inspect current JWKS publication path
- inspect `src/infrastructure/crypto`
- inspect audit event type support
- inspect Sprint 19 logger/metrics primitives
- identify minimal change set before editing

Acceptance criteria:

- implementation packet exists before coding
- included/excluded scope is confirmed
- exact files to edit are identified before implementation
- no runtime edits occur before gate confirmation
- no final security hardening or Sprint 21 scope is included

---

### Task 106 - OIDC Key Metadata Model and Repository

Goal:

- implement OIDC-owned key metadata persistence if current runtime requires persistent lifecycle state.

Required metadata support:

- `kid`
- `status`
- `algorithm`
- `publicJwk`
- `privateKeyReference` or approved private signing material reference
- `createdAt`
- `activatedAt`
- `retiredAt`
- `overlapExpiresAt`
- `compromisedAt`
- `lastUsedAt`
- `rotationReason`
- `createdBy`
- `updatedAt`

Required repository behavior:

- create key metadata
- find by `kid`
- find active key
- list JWKS-eligible public keys
- mark key active
- mark key retired
- mark key compromised
- update overlap metadata
- support rollback state transition if implemented
- prevent or detect multiple active key ambiguity
- no hard delete

Rules:

- repository must be inside `src/modules/oidc`
- repository must use OIDC key model only
- repository must not access users persistence
- repository must not access refresh token/session/client repositories
- repository must not access audit persistence directly
- repository must not expose private key material through public view methods
- repository must not implement hard delete

Acceptance criteria:

- key lifecycle metadata is owned by OIDC
- `kid` is unique
- active/retired/compromised states are represented
- hard delete is not exposed
- JWKS-eligible query returns public-safe data only
- multiple active key state is prevented or detected

---

### Task 107 - OIDC Key Service

Goal:

- implement OIDC-owned key lifecycle business logic.

Required service behavior:

- initialize or resolve active signing key
- select active signing key
- generate system `kid`
- create key pair through approved crypto utility
- derive public JWK
- rotate key manually/service-triggered
- retire previous active key
- set `retiredAt`
- set `overlapExpiresAt`
- mark key compromised if implemented
- rollback to retired key if allowed
- expose JWKS-safe public key view
- emit safe audit events
- emit safe observability signals if implemented

Required rules:

- exactly one active signing key should exist for signing
- no active key must fail signing predictably
- multiple active keys must fail predictably or be guarded deterministically
- retired keys must not sign new tokens
- retired keys may verify/publish only during overlap
- compromised keys must not sign new tokens
- compromised keys must not be published by default
- private key material must not appear in API, JWKS, logs, audit, metrics, or reports
- infrastructure/crypto must not own rotation policy

Acceptance criteria:

- key service owns lifecycle policy
- active key selection is deterministic
- rotation preserves previous key during overlap
- rollback is controlled
- compromised state is enforced
- failure behavior is predictable
- audit and observability outputs are secret-safe

---

### Task 108 - Active Signing Key Integration

Goal:

- integrate active signing key selection into existing OIDC JWT signing path.

Required behavior:

- newly signed JWTs use current active key
- signed JWT header includes `kid`
- JWT `kid` matches active key metadata
- no silent fallback to stale key material
- missing active key fails predictably
- ambiguous active key state fails predictably or is blocked
- claim mapping remains unchanged
- token lifetime remains unchanged unless already defined elsewhere
- refresh/session/client lifecycle remains unchanged

Allowed changes:

- signing key lookup
- signing key provider integration
- JWT header `kid` behavior
- safe failure handling around missing/ambiguous signing key

Forbidden changes:

- claim mapping changes
- refresh token rotation changes
- revoke/introspection changes
- session lifecycle changes
- client lifecycle changes
- user identity behavior changes
- auth credential validation changes

Acceptance criteria:

- new token contains correct `kid`
- signing uses active key only
- missing key failure is deterministic
- no unrelated token/session/client behavior changes

---

### Task 109 - JWKS Publication Hardening

Goal:

- harden JWKS publication so it exposes public keys only and supports rotation overlap.

Required behavior:

- JWKS includes active public key
- JWKS includes retired public keys during overlap window
- JWKS excludes retired keys outside overlap
- JWKS excludes compromised keys by default
- JWKS excludes private key parameters
- JWKS excludes internal metadata
- each JWKS entry includes `kid`
- each JWKS entry should include compatible `alg` and `use`

Forbidden JWKS fields:

- `d`
- `p`
- `q`
- `dp`
- `dq`
- `qi`
- private PEM block
- symmetric secret
- private key reference
- database internals
- audit metadata
- rotation reason

Acceptance criteria:

- JWKS is public-only
- active key appears
- retired in-overlap key appears
- expired retired key does not appear
- private key material never appears
- compromised key is not published by default

---

### Task 110 - Rotation, Retirement, Rollback, and Compromise Handling

Goal:

- implement controlled key state transitions.

Required rotation behavior:

- validate current state
- generate new key pair
- generate unique `kid`
- derive public JWK
- activate new key
- retire previous active key
- set overlap metadata
- avoid no-active-key partial failure
- record audit event
- emit safe observability signal if implemented

Required retirement behavior:

- retired key cannot sign new tokens
- retired key remains JWKS-eligible only during overlap
- retirement is audited
- no hard delete

Required rollback behavior if implemented:

- target key must be retired
- target key must be inside overlap
- target key must not be compromised
- target signing material must be safely available
- rollback activates target key
- previous active key becomes retired
- rollback is audited
- no hard delete

Required compromised behavior if implemented:

- compromised key must not sign
- compromised key must not be active
- compromised key must not be published by default
- compromised state transition is audited
- private material is not exposed

Acceptance criteria:

- state transitions preserve traceability
- no hard delete exists
- no private key exposure exists
- rotation failure leaves system stable or fails predictably
- rollback/compromise behavior follows contract

---

### Task 111 - Key Lifecycle Audit and Observability Integration

Goal:

- record safe key lifecycle audit events and observability signals.

Required existing audit event types:

- `oidc.key.rotated`
- `oidc.key.retired`
- `oidc.key.rotation_failed`

Additional approved event types if added:

- `oidc.key.rollback_performed`
- `oidc.key.compromised`

Required audit coverage:

- successful rotation
- failed rotation
- key retirement
- rollback if implemented
- compromised state transition if implemented

Allowed audit metadata:

- `kid`
- `previousKid`
- `newKid`
- `previousStatus`
- `newStatus`
- `reasonCode`
- `overlapExpiresAt`
- `operation`
- `outcome`

Forbidden audit metadata:

- private key
- PEM content
- private JWK parameters
- signing material reference if sensitive
- environment values
- full key record
- raw error stack
- full request body
- authorization header
- tokens
- client secrets
- passwords

Allowed observability:

- rotation success counter
- rotation failure counter
- retirement counter
- rollback counter if implemented
- compromised transition counter if implemented
- active signing key availability gauge
- safe structured logs with operation/outcome/reason code and safe `kid`

Forbidden observability:

- private key logging
- PEM logging
- private JWK field logging
- full key record logging
- private material in metric labels
- high-cardinality labels without explicit approval
- raw error message labels

Acceptance criteria:

- key lifecycle mutation emits safe audit event
- audit output contains no secret material
- logs contain no private key material
- metrics contain no private key material
- observability does not alter key lifecycle behavior

---

### Task 112 - Sprint 20 Validation and Report

Goal:

- validate Sprint 20 implementation and record evidence.

Required report:

- `docs/planning/reports/phase-06-sprint-20-report.md`

Report must include:

- execution summary
- source-of-truth basis
- implemented tasks
- files created or updated
- validation evidence
- manual validation matrix
- excluded scope confirmation
- active key selection behavior
- JWKS publication behavior
- overlap window behavior
- rotation behavior
- rollback behavior if implemented
- compromised state behavior if implemented
- audit/observability evidence
- risks, limitations, deferred work
- handoff to Sprint 21 / Final Security Hardening and Release Readiness Review

Acceptance criteria:

- validation commands are run or explicitly marked NOT RUN with reason
- manual checks are documented
- global format drift, if present, is documented consistently
- scoped touched-file formatting is verified if global format check fails
- report confirms no private key leakage
- report confirms no refresh/session/client lifecycle changes
- report confirms no external KMS/HSM/scheduled rotation scope
- report does not claim unsupported runtime behavior

---

## X. Allowed Dependencies

`src/modules/oidc` may depend on:

- OIDC key repository/model within its own module
- approved `src/infrastructure/crypto` key utilities
- approved `src/modules/audit/audit.service`
- approved `src/infrastructure/logger`
- approved `src/infrastructure/metrics`
- `src/shared/errors`
- existing OIDC token/signing internals required for active key integration

`src/infrastructure/crypto` may depend on:

- approved crypto libraries already used by the project
- generic TypeScript types
- no domain modules

`src/jobs`, if used, may depend on:

- approved OIDC key service only
- logger/metrics primitives if safe and needed

`src/modules/audit` may be updated only for:

- event type constants/types
- no key lifecycle decision-making

---

## XI. Forbidden Dependencies

`src/modules/oidc` must not depend on:

- `UserModel`
- `user.repository`
- raw user database queries
- admin internals
- audit repository/model direct persistence
- client repository/model for key lifecycle behavior
- refresh-token/session repositories unless existing signing path already requires them and no new lifecycle change is introduced
- direct `process.env`

`src/infrastructure/crypto` must not depend on:

- `src/modules/oidc`
- `src/modules/users`
- `src/modules/auth`
- `src/modules/admin`
- `src/modules/audit`
- domain repositories
- domain models
- domain workflow services

`src/jobs`, if used, must not depend on:

- OIDC key model
- OIDC key repository
- raw database collections
- crypto internals for business policy
- admin internals

Sprint 20 must not introduce:

- external KMS SDK
- HSM SDK
- SIEM dependency
- distributed tracing dependency
- dashboard UI dependency
- broad RBAC dependency

---

## XII. Security-Critical Rules

Sprint 20 must enforce:

- no private key material in JWKS
- no private key material in API responses
- no private key material in logs
- no private key material in audit
- no private key material in metrics
- no private key material in reports
- no real production private key commits
- no private JWK parameters in public JWKS
- no hard delete of key metadata
- exactly one active signing key for signing
- missing active key fails predictably
- multiple active key ambiguity fails predictably or is prevented
- no silent fallback to stale signing key
- retired keys do not sign new tokens
- retired keys publish only during overlap
- compromised keys do not sign
- compromised keys are not active
- compromised keys are not published by default
- `kid` is system-generated and stable
- JWT header includes active key `kid`
- OIDC does not directly query user ownership database
- infrastructure/crypto does not own rotation business workflow
- jobs do not bypass OIDC ownership
- no refresh-token lifecycle behavior changes
- no session lifecycle behavior changes
- no client lifecycle behavior changes
- no auth credential validation behavior changes
- no direct `process.env` outside config
- no `console.log`

---

## XIII. Required Validation Commands

Run:

```bash id="sp20-validation-baseline"
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Run Sprint-specific scans:

```bash id="sp20-validation-scans"
rg -n "BEGIN PRIVATE KEY|PRIVATE KEY|privateKey|private_key|d|p|q|dp|dq|qi" src docs --glob "!docs/planning/reports/**"
rg -n "kid|jwks|jwk|key rotation|rotated|retired|compromised" src/modules/oidc src/infrastructure/crypto src/jobs docs/contracts docs/planning
rg -n "UserModel|user\\.repository|RefreshToken|Session|ClientModel|client\\.repository" src/modules/oidc
rg -n "deleteOne|findOneAndDelete|findByIdAndDelete" src/modules/oidc src/infrastructure/crypto
rg -n "logger\\.|metrics\\.|auditService|recordEvent" src/modules/oidc src/infrastructure/crypto src/jobs
```

If additional audit event types are added, also run:

```bash id="sp20-validation-audit"
rg -n "oidc\\.key\\.rotated|oidc\\.key\\.retired|oidc\\.key\\.rotation_failed|oidc\\.key\\.rollback_performed|oidc\\.key\\.compromised" docs/contracts/audit src/modules
```

If a job is added, also run:

```bash id="sp20-validation-jobs"
rg -n "key|rotation|kid|jwks" src/jobs
rg -n "key\\.repository|KeyModel|findOneAndUpdate|updateOne|deleteOne" src/jobs
```

Expected interpretation:

- private-key matches require manual review and must not indicate logging, audit, API exposure, JWKS exposure, metric exposure, report leakage, or committed production secrets.
- private JWK parameter matches require review and must not appear in JWKS output.
- `kid`, `jwks`, and key lifecycle matches must align with the key rotation contract.
- direct user DB access from OIDC is forbidden.
- hard delete is forbidden.
- observability/audit matches must prove safe metadata only.
- jobs, if present, may call OIDC key service only.

---

## XIV. Manual Validation Checks

Sprint 20 must manually validate:

1. Exactly one active signing key exists after initialization or setup.
2. New signed JWT includes `kid` in header.
3. JWT `kid` matches active key metadata.
4. JWKS includes active public key.
5. JWKS entry includes matching `kid`.
6. JWKS does not include private JWK parameters.
7. JWKS does not include PEM private key material.
8. Rotation generates a new system-generated `kid`.
9. Rotation activates the new key.
10. Rotation retires the previous active key.
11. Previous key receives `retiredAt`.
12. Previous key receives `overlapExpiresAt`.
13. Retired key remains published in JWKS during overlap.
14. Token signed before rotation remains verifiable during overlap.
15. Retired key is excluded from JWKS after overlap expires.
16. Retired key does not sign new tokens.
17. Compromised key does not sign new tokens.
18. Compromised key is not selected as active.
19. Compromised key is not published by default.
20. Rotation failure is predictable and does not leave system without an active signing key.
21. Multiple active key state is prevented or fails predictably.
22. Missing active key state fails token signing predictably.
23. Rollback succeeds only for retired, non-compromised key inside overlap.
24. Rollback does not hard-delete key records.
25. Rollback creates safe audit event if implemented.
26. Rotation creates safe audit event.
27. Retirement creates safe audit event.
28. Rotation failure creates safe audit event.
29. Audit event does not include private key material.
30. Audit event does not include private JWK parameters.
31. Audit event does not include full key record.
32. Logs do not include private key material.
33. Logs do not include private JWK parameters.
34. Metrics do not expose private key material.
35. Metrics labels do not include private key material.
36. OIDC does not directly query user DB.
37. `infrastructure/crypto` does not own rotation business policy.
38. Jobs, if added, call OIDC key service only.
39. No refresh-token lifecycle behavior changed.
40. No session lifecycle behavior changed.
41. No client lifecycle behavior changed.
42. No auth credential validation behavior changed.
43. No external KMS/HSM integration introduced.
44. No real production private key material committed.
45. Sprint 20 report records validation evidence.

---

## XV. Branch and Commit Guidance

Recommended runtime branch:

- `feature/oidc-sprint20-key-rotation`

Commit message guidance:

- `feat(oidc): implement Sprint 20 key rotation`

If split commits are needed, acceptable messages include:

- `feat(oidc): add signing key lifecycle`
- `feat(oidc): harden JWKS publication`
- `feat(oidc): add key rotation audit events`
- `docs(planning): add Sprint 20 validation report`

All commits must remain within Sprint 20 scope.

Do not commit unrelated formatting cleanup.

Do not commit real production private key material.

---

## XVI. Handoff Target

Sprint 20 hands off to:

- Sprint 21 / Final Security Hardening and Release Readiness Review

Sprint 21 may use:

- key rotation validation evidence
- JWKS publication evidence
- audit event evidence
- observability evidence
- private-key leakage scans
- runtime stability evidence

Sprint 21 must still define final security hardening and release-blocking criteria through its own approved contract or assignment before implementation.
