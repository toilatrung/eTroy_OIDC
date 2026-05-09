# eTroy OIDC - JWKS / Key Rotation Contract

---

## I. Contract Summary

- Contract: JWKS / Key Rotation Contract
- Phase: Phase 06 - Platform and Governance Hardening
- Primary Sprint: Sprint 20 - JWKS / Key Rotation Hardening
- Owner Module: `src/modules/oidc`
- Supporting Layer: `src/infrastructure/crypto`
- Optional Supporting Area: `src/jobs`
- Primary Assignment: `docs/planning/assignments/phase-06-sprint-20.md`
- Contract Path: `docs/contracts/oidc/key-rotation-contract.md`
- Status: Approved for Sprint 20 runtime implementation

---

## II. Purpose

This contract defines the approved JWKS and signing-key lifecycle for eTroy OIDC.

Sprint 20 makes key selection, JWKS publication, key rotation, retired-key verification, rollback, audit, and observability behavior explicit and reviewable.

The contract exists to ensure key rotation is:

- owned by `oidc`
- supported by `infrastructure/crypto` only for low-level key utilities
- safe against private key leakage
- compatible with existing JWT/OIDC token issuance
- deterministic during rotation and rollback
- auditable
- observable without exposing secret material
- bounded to Sprint 20 scope

---

## III. Source-of-Truth Basis

This contract is governed by:

- `docs/source-of-truth-index.md`
- `docs/README.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/architecture/detailed-source-tree.md`
- `docs/requirements/srs-v1.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-06-platform-governance-hardening.md`
- `docs/contracts/audit/audit-event-contract.md`
- `docs/contracts/observability/observability-contract.md`
- `docs/planning/assignments/phase-06-sprint-20.md`
- `docs/planning/reports/phase-06-sprint-19-report.md`
- `docs/governance/git-rules.md`
- `docs/governance/pr-template.md`
- `docs/governance/review-checklist.md`
- `docs/governance/anti-patterns.md`

Authority rules:

- `docs/` is authoritative.
- `agent/` is operational support only.
- `source-tree.md` is the primary physical structure contract.
- `detailed-source-tree.md` is supporting reference only.
- If this contract conflicts with architecture documents, architecture documents win unless an approved architecture update is included.
- Sprint 20 runtime implementation may begin only after Sprint 19 is merged, closed, and present in `main`.
- Sprint 20 runtime implementation must begin from updated `main` on a dedicated Sprint 20 feature branch.
- Sprint 20 implementation must not exceed this contract and its sprint assignment.

---

## IV. Contract Scope

### Included

Sprint 20 includes:

- OIDC-owned signing key lifecycle policy
- key metadata model
- key repository if persistent metadata is implemented
- key service
- system-generated `kid`
- active signing key selection
- exactly one active signing key at a time
- retired verification key rule
- compromised key state rule
- JWKS publication of public keys only
- JWKS publication of active key and retired keys inside overlap window
- default overlap window of 24 hours
- manual/service-triggered key rotation baseline
- key retirement behavior
- controlled rollback behavior
- predictable key rotation failure behavior
- audit events for key lifecycle
- safe observability/logging/metrics integration
- validation report and evidence

### Excluded

Sprint 20 excludes:

- external KMS integration
- cloud key management integration
- HSM integration
- automatic scheduled rotation job
- cron-based key rotation
- operator dashboard UI
- broad admin RBAC changes
- broad final security hardening
- changing refresh-token lifecycle
- changing session lifecycle
- changing OIDC client lifecycle
- changing user identity behavior
- changing auth credential validation behavior
- changing token issuance semantics beyond active key selection and JWT `kid` header behavior
- public API exposure for private/signing key material
- committing real production private keys
- exposing private key material through JWKS, API, logs, audit, metrics, reports, or errors
- distributed tracing
- SIEM or external observability pipeline
- key compromise incident-response automation beyond the approved `compromised` state handling

---

## V. Ownership Boundary

### 1. OIDC Ownership

`src/modules/oidc` owns:

- signing key lifecycle policy
- key metadata lifecycle
- active signing key selection
- retired verification key eligibility
- compromised key state policy
- JWKS publication policy
- rotation business decision
- rollback business decision
- signing key service orchestration
- key lifecycle audit producer decisions
- OIDC token signing integration

`src/modules/oidc` must not:

- query user ownership data directly
- own low-level cryptographic primitive implementation when infrastructure abstraction exists
- expose private key material through public API
- leak private key material through audit/log/metrics/report
- mutate refresh-token/session/client lifecycle as part of Sprint 20

### 2. Crypto Infrastructure Support

`src/infrastructure/crypto` may own:

- key generation primitive
- PEM/JWK conversion primitive
- public JWK derivation
- signing material loading/parsing primitive
- key verification helper if generic
- low-level cryptographic validation helper
- safe key utility exports

`src/infrastructure/crypto` must not own:

- active/retired/compromised lifecycle policy
- rotation decision
- rollback decision
- JWKS publication eligibility policy
- audit event decision
- OIDC token issuance workflow
- domain persistence workflow
- business orchestration

### 3. Optional Jobs Area

`src/jobs` may be used only if a future assignment explicitly approves scheduled or maintenance key rotation.

Sprint 20 baseline does not require automatic scheduled rotation.

If `src/jobs` is touched in Sprint 20, it must be justified by the assignment and must only call approved OIDC key service methods. It must not bypass `oidc` ownership or mutate key persistence directly.

---

## VI. Key Metadata Model

Sprint 20 approved key metadata should include:

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

### Required Fields

Required key metadata:

- `kid`
- `status`
- `algorithm`
- `publicJwk`
- `createdAt`
- `updatedAt`

Required when applicable:

- `activatedAt`
- `retiredAt`
- `overlapExpiresAt`
- `compromisedAt`
- `rotationReason`

### Private Material Rule

Private key material must not be returned through:

- JWKS endpoint
- health endpoint
- readiness endpoint
- metrics endpoint
- admin endpoint
- audit event
- log line
- report evidence
- error response

Private signing material may be stored or referenced only through the approved crypto/key boundary selected by implementation.

If private key material is persisted, it must be treated as sensitive secret material and must never be logged, audited, exposed, or committed as real production key material.

### Public JWK Rule

`publicJwk` may be persisted or derived if it contains public key fields only.

Allowed public JWK fields for RSA-style public keys include:

- `kty`
- `kid`
- `use`
- `alg`
- `n`
- `e`

Forbidden JWKS/public JWK fields:

- `d`
- `p`
- `q`
- `dp`
- `dq`
- `qi`
- private PEM blocks
- symmetric secrets
- internal persistence fields

---

## VII. Key State Model

Approved key states:

- `active`
- `retired`
- `compromised`

### 1. Active

Rules:

- exactly one key should be active for signing at a time
- active key signs new OIDC JWTs
- active key public component is published in JWKS
- active key must have a unique `kid`
- active key must have valid signing material available
- if no active key exists, token signing must fail predictably

### 2. Retired

Rules:

- retired keys must not sign new tokens
- retired keys may remain eligible for verification during the overlap window
- retired keys may be published in JWKS only while inside overlap window
- retired keys must have `retiredAt`
- retired keys should have `overlapExpiresAt`
- retired keys outside overlap must be excluded from JWKS
- retired keys must preserve audit/history traceability

### 3. Compromised

Rules:

- compromised keys must not sign new tokens
- compromised keys must not be selected as active
- compromised keys should not be published in JWKS by default
- compromised state represents an emergency/security condition
- any use of compromised key material for verification requires separate explicit emergency policy
- marking a key compromised must be audited
- compromised key metadata must not be hard-deleted in Sprint 20

---

## VIII. `kid` Rules

`kid` identifies the signing key used by JWT and JWKS consumers.

Rules:

- `kid` must be system-generated
- `kid` must be unique
- `kid` must be stable for the key record lifecycle
- `kid` must not be admin/user supplied
- `kid` must not contain private key material
- `kid` must not encode sensitive data
- `kid` must be present in JWT headers for newly issued signed tokens
- `kid` must be present in JWKS entries
- `kid` must not be editable after key creation

Recommended format:

- `kid_<random-or-uuid>`

Collision behavior:

- collision must be prevented through uniqueness enforcement and/or retry
- collision failure must not expose private key material or persistence internals

---

## IX. Signing Key Selection Rule

New OIDC JWTs must be signed with the current active key.

Rules:

- signing key selection must go through OIDC key service or approved OIDC-owned abstraction
- token provider/signing code must not directly read arbitrary key files if an approved key service exists
- if exactly one active key exists, it is selected for signing
- if no active key exists, signing must fail predictably
- if multiple active keys are detected, signing must fail predictably or use a deterministic guard that prevents ambiguous signing
- token issuance must not silently fall back to stale, unknown, retired, or compromised key material
- token signing integration may change only to support active key selection and JWT `kid` header behavior
- Sprint 20 must not change claim mapping, token lifetime, refresh-token lifecycle, session lifecycle, or client lifecycle

Expected JWT header behavior:

- signed JWT header includes `kid`
- `kid` matches active key metadata
- consumers can locate the corresponding public key in JWKS while the token is valid or during the overlap window

---

## X. JWKS Publication Rule

JWKS must publish public keys only.

JWKS may include:

- active public key
- retired public keys still inside overlap window

JWKS must exclude:

- private key material
- private JWK parameters
- private PEM blocks
- symmetric secrets
- internal database identifiers unless explicitly safe
- retired keys outside overlap
- compromised keys by default
- arbitrary metadata
- environment/config secrets

JWKS response rules:

- response must be deterministic
- each key must include `kid`
- each key must include public key material only
- each key should include `alg` and `use` if compatible with existing JWT/JWKS behavior
- response must not expose persistence-only metadata
- response must not expose rotation reason, actor, audit metadata, or private references

---

## XI. Overlap Window Rule

Default overlap window:

- 24 hours

Rules:

- when a key is rotated out, it becomes `retired`
- retired key gets `retiredAt`
- retired key gets `overlapExpiresAt`
- retired key remains available for verification during overlap
- retired key remains published in JWKS during overlap
- after overlap expires, retired key is excluded from JWKS
- existing valid tokens signed before rotation should remain verifiable during overlap
- rotation must not invalidate valid tokens prematurely unless the old key is marked `compromised` and emergency policy applies

If implementation uses token TTL to compute overlap:

- overlap must be at least as long as the maximum relevant JWT verification lifetime unless a shorter window is explicitly justified
- default 24 hours remains the planning baseline

---

## XII. Rotation Trigger and Rotation Flow

Sprint 20 approved baseline:

- manual/service-triggered rotation

Excluded baseline:

- automatic scheduled rotation
- cron-based rotation
- external KMS-triggered rotation
- operator dashboard-triggered workflow

### Approved Rotation Flow

Rotation should perform the following controlled sequence:

1. validate current key state
2. generate new key pair through approved crypto utility
3. generate unique `kid`
4. derive public JWK
5. persist or register new key metadata and signing reference
6. mark new key as `active`
7. mark previous active key as `retired`
8. set previous key `retiredAt`
9. set previous key `overlapExpiresAt`
10. emit safe audit event
11. emit safe metric/log event if implemented
12. return safe rotation result without private key material

Atomicity rule:

- rotation must avoid a state where no signing key exists after a partial failure
- if full transactional behavior is not available, implementation must fail predictably and document partial-failure handling
- previous active key must remain usable if new key activation fails before completion

---

## XIII. Retirement Rule

Key retirement may happen:

- as part of rotation
- as a controlled explicit operation if assignment approves it
- as part of marking a key compromised

Rules:

- active key cannot be retired without ensuring another active key exists unless the operation is explicitly an emergency shutdown and is documented
- retired key must not sign new tokens
- retired key may remain in JWKS only during overlap
- retired key outside overlap should be excluded from JWKS
- retirement must be audited
- retirement must not hard-delete key metadata
- retirement must not expose private key material

---

## XIV. Rollback Rule

Rollback is a controlled recovery action.

Allowed rollback conditions:

- target key is `retired`
- target key is still inside overlap window
- target key is not `compromised`
- target key has signing material safely available
- rollback is explicitly requested through approved service method
- rollback records an audit event

Rollback behavior:

- target retired key becomes `active`
- current active key becomes `retired`
- key transition history is preserved
- no key record is hard-deleted
- rollback does not change token/session/client lifecycle behavior
- rollback response does not include private key material

Rollback must not:

- activate a compromised key
- activate a key outside overlap unless separately approved
- silently choose a fallback key
- mutate unrelated OIDC state
- log private key material
- audit private key material

---

## XV. Audit Event Requirements

Key lifecycle operations must emit safe audit events.

Approved existing audit event types:

- `oidc.key.rotated`
- `oidc.key.retired`
- `oidc.key.rotation_failed`

Sprint 20 additionally approves the following event types if audit vocabulary is updated:

- `oidc.key.rollback_performed`
- `oidc.key.compromised`

Required audit coverage:

- successful rotation
- failed rotation
- key retirement
- rollback, if implemented
- compromised state transition, if implemented

Audit actor:

- `system` for system/service-originated operation
- `admin` if operation is initiated through approved admin orchestration in a later sprint or approved extension
- `unknown` only if actor cannot be determined and event still needs recording

Audit subject:

- `type: key`
- `keyId` or `kid`

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
- JWK private parameters
- signing material reference if sensitive
- environment values
- full key record
- raw error stack
- full request body
- authorization header
- tokens
- client secrets
- passwords

If required key event types are missing from `docs/contracts/audit/audit-event-contract.md`, that contract must receive an additive vocabulary update before runtime implementation emits the new events.

---

## XVI. Observability and Logging Requirements

Sprint 20 may use Sprint 19 logger/metrics primitives.

Allowed logs:

- operation
- outcome
- reason code
- `kid`
- previous/new key identifiers
- overlap expiry
- safe error code

Forbidden logs:

- private key material
- PEM content
- private JWK parameters
- signing material
- environment values
- full key record
- raw exception object if it contains sensitive data
- raw stack trace unless sanitized and approved

Allowed metrics:

- key rotation success counter
- key rotation failure counter
- key retirement counter
- key rollback counter if implemented
- compromised key transition counter if implemented
- active signing key availability gauge

Forbidden metrics labels:

- private key material
- PEM content
- raw error message
- raw request/correlation id
- environment values
- high-cardinality actor identifiers
- full `kid` as label if cardinality risk is not explicitly accepted

Recommended metric labels:

- `operation`
- `outcome`
- `reason_code`
- `key_state`

---

## XVII. API / Route Exposure Decision

Sprint 20 does not require public key-management APIs.

Approved public OIDC-facing surface:

- JWKS endpoint behavior, if currently implemented or wired by OIDC provider

Rules:

- JWKS endpoint exposes public keys only
- JWKS endpoint must not expose private metadata
- JWKS endpoint must not mutate key state

Admin-facing key management API:

- not required for Sprint 20 baseline
- may be omitted
- if introduced, it must be explicitly approved by assignment and must stay admin orchestration only
- admin must not import key model/repository directly
- admin must not handle private key material

Recommended Sprint 20 baseline:

- key rotation is service/manual-triggered and validated through service-level/runtime harness
- no new public admin dashboard or broad key management API

---

## XVIII. Forbidden Dependencies and Behaviors

Sprint 20 must not introduce:

- private key logging
- private key audit metadata
- private key metric labels
- private key exposure in JWKS
- real production private key commits
- hard delete of key metadata
- silent fallback to stale signing key
- ambiguous multi-active-key signing behavior
- direct user DB access from OIDC
- refresh-token lifecycle changes
- session lifecycle changes
- client lifecycle changes
- auth credential validation changes
- external KMS dependency
- HSM dependency
- SIEM dependency
- distributed tracing dependency
- broad admin dashboard UI
- broad RBAC framework
- business workflow logic inside `infrastructure/crypto`
- jobs bypassing OIDC service ownership
- direct `process.env` outside `src/config`

---

## XIX. Expected Runtime Deliverables

Expected deliverables, subject to assignment:

- `src/modules/oidc/key.model.ts`
- `src/modules/oidc/key.repository.ts`
- `src/modules/oidc/key.service.ts`
- updates to OIDC signing/token provider code for active key selection and JWT `kid`
- updates to JWKS publication path
- updates to `src/infrastructure/crypto` key utilities if needed
- additive audit event type update if required
- safe observability metric/log hooks if implemented
- `docs/planning/reports/phase-06-sprint-20-report.md`

Optional only if assignment approves and source-tree supports:

- `src/jobs/key-rotation.job.ts`
- admin orchestration endpoint for manual rotation

Do not create:

- new root runtime directories
- external KMS adapter
- HSM adapter
- SIEM/log pipeline
- admin dashboard UI
- key-management business logic under `shared`
- OIDC key lifecycle logic under `infrastructure/crypto`

---

## XX. Validation Requirements

Sprint 20 implementation must run or explicitly report inability to run:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Sprint-specific scans:

```bash
rg -n "BEGIN PRIVATE KEY|PRIVATE KEY|privateKey|private_key|d|p|q|dp|dq|qi" src docs --glob "!docs/planning/reports/**"
rg -n "kid|jwks|jwk|key rotation|rotated|retired|compromised" src/modules/oidc src/infrastructure/crypto src/jobs docs/contracts docs/planning
rg -n "UserModel|user\\.repository|RefreshToken|Session|ClientModel|client\\.repository" src/modules/oidc
rg -n "deleteOne|findOneAndDelete|findByIdAndDelete" src/modules/oidc src/infrastructure/crypto
rg -n "logger\\.|metrics\\.|auditService|recordEvent" src/modules/oidc src/infrastructure/crypto src/jobs
```

Expected interpretation:

- private-key matches require manual review and must not indicate logging, audit, API exposure, JWKS exposure, or committed production secrets.
- private JWK parameter matches require review and must not appear in JWKS output.
- `kid` / `jwks` / key lifecycle matches must align with this contract.
- direct user DB access from OIDC is forbidden.
- hard delete is forbidden.
- observability/audit matches must prove safe metadata only.

If additional audit event types are added, also run:

```bash
rg -n "oidc\\.key\\.rotated|oidc\\.key\\.retired|oidc\\.key\\.rotation_failed|oidc\\.key\\.rollback_performed|oidc\\.key\\.compromised" docs/contracts/audit src/modules
```

If a job is added, also run:

```bash
rg -n "key|rotation|kid|jwks" src/jobs
rg -n "key\\.repository|KeyModel|findOneAndUpdate|updateOne|deleteOne" src/jobs
```

Expected interpretation:

- jobs may call approved OIDC key service only.
- jobs must not import key model/repository or mutate persistence directly.

---

## XXI. Manual Validation Requirements

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

## XXII. Merge-Blocking Conditions

Sprint 20 must be blocked or rejected if any of the following occurs:

- `key-rotation-contract.md` is missing
- `phase-06-sprint-20.md` is missing
- Sprint 19 is not merged/closed/present in `main`
- runtime begins from outdated `main`
- private key material is committed
- private key material is exposed through JWKS
- private key material is returned through API
- private key material is logged
- private key material is recorded in audit
- private key material appears in metrics
- JWKS contains private JWK parameters
- raw environment/config secrets are exposed
- multiple active signing keys can exist without deterministic guard
- token signing silently falls back to stale key material
- missing active key does not fail predictably
- retired key is removed before overlap and breaks valid token verification
- compromised key signs new tokens
- compromised key is published by default
- OIDC directly queries user ownership data
- refresh-token lifecycle behavior changes
- session lifecycle behavior changes
- client lifecycle behavior changes
- auth credential validation behavior changes
- `infrastructure/crypto` owns business rotation workflow
- jobs bypass OIDC service ownership
- external KMS/HSM/SIEM/distributed tracing scope is introduced
- validation evidence is missing
- runtime is non-runnable or startup behavior becomes unstable

---

## XXIII. Handoff

Sprint 20 hands off to:

- Sprint 21 / Final Security Hardening and Release Readiness Review

Sprint 21 may use key rotation evidence, audit events, observability signals, and JWKS validation results as part of release readiness review.

Sprint 21 must still define final security hardening and release-blocking criteria through its own approved contract or assignment before runtime implementation.
