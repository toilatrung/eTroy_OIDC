# Phase 06 / Sprint 21 - Final Security Hardening and Release Readiness Review Assignment

---

## I. Assignment Summary

* Phase: Phase 06 - Platform and Governance Hardening
* Sprint: Sprint 21 - Final Security Hardening and Release Readiness Review
* Task range:

  * Task 113 - Security Hardening Contract Alignment
  * Task 114 - Source-of-Truth and Governance Review
  * Task 115 - Architecture Boundary and Source-Tree Scan
  * Task 116 - Secret / Token / Credential Leakage Review
  * Task 117 - Runtime Stability and Configuration Review
  * Task 118 - Audit / Observability / Health Readiness Review
  * Task 119 - Residual Risk Classification and Corrective Patch Control
  * Task 120 - Release Readiness Report
* Primary owner: Leader / Security Governance Review
* Runtime patch owner: owning module or layer only, if release-blocking correction is required
* Required contract:

  * `docs/contracts/security/security-hardening-contract.md`
* Supporting contracts:

  * `docs/contracts/audit/audit-event-contract.md`
  * `docs/contracts/admin/admin-control-contract.md`
  * `docs/contracts/oidc/client-management-contract.md`
  * `docs/contracts/observability/observability-contract.md`
  * `docs/contracts/oidc/key-rotation-contract.md`
* Assignment path: `docs/planning/assignments/phase-06-sprint-21.md`
* Required report:

  * `docs/planning/reports/phase-06-security-hardening-report.md`
* Status: Approved for Sprint 21 runtime implementation

---

## II. Runtime Gate

Sprint 21 execution may begin only when all are true:

* Sprint 20 - JWKS / Key Rotation Hardening is merged, corrected, closed, and present in `main`.
* Corrective PR #60 for Sprint 20 is merged and accepted.
* `docs/contracts/security/security-hardening-contract.md` exists and is approved.
* `docs/planning/assignments/phase-06-sprint-21.md` exists and is approved.
* Supporting contracts exist and are approved:

  * audit event contract
  * admin control contract
  * OIDC client management contract
  * observability contract
  * JWKS / key rotation contract
* Work begins from latest `main`.
* Work occurs on a dedicated Sprint 21 branch.
* Review packet is produced before editing files.
* Any corrective patch is tied to a release-blocking finding.

Until this gate is satisfied:

* do not edit `src/`
* do not perform runtime corrective patches
* do not mark Phase 06 complete
* do not mark the project release-ready
* do not create release-readiness claims
* do not broaden Sprint 21 into new feature development

Recommended branch:

* `feature/security-sprint21-release-readiness`

---

## III. Source-of-Truth Basis

Sprint 21 must use the following documents:

* `docs/source-of-truth-index.md`
* `docs/README.md`
* `docs/architecture/system-overview.md`
* `docs/architecture/module-boundaries.md`
* `docs/architecture/source-tree.md`
* `docs/architecture/detailed-source-tree.md`
* `docs/requirements/srs-v1.md`
* `docs/planning/master-execution-plan.md`
* `docs/planning/phases/phase-06-platform-governance-hardening.md`
* `docs/contracts/security/security-hardening-contract.md`
* `docs/contracts/audit/audit-event-contract.md`
* `docs/contracts/admin/admin-control-contract.md`
* `docs/contracts/oidc/client-management-contract.md`
* `docs/contracts/observability/observability-contract.md`
* `docs/contracts/oidc/key-rotation-contract.md`
* `docs/planning/assignments/phase-06-sprint-21.md`
* `docs/planning/reports/phase-06-sprint-20-report.md`
* `docs/planning/reports/phase-06-report.md`
* `docs/governance/git-rules.md`
* `docs/governance/pr-template.md`
* `docs/governance/review-checklist.md`
* `docs/governance/anti-patterns.md`
* `agent/current-context.md`
* `agent/session-history.md`
* `agent/prompts/sprint-task-execution.md`

Authority rules:

* `docs/` is authoritative.
* `agent/` is operational support only.
* `source-tree.md` is primary over `detailed-source-tree.md`.
* Architecture and requirements documents win over planning convenience.
* Governance documents define PR and merge discipline.
* If this assignment conflicts with `docs/contracts/security/security-hardening-contract.md`, the contract wins.
* If this assignment conflicts with architecture documents, architecture documents win unless an approved architecture update is included.
* No Sprint 21 correction may exceed approved contract and assignment scope.

---

## IV. Sprint Objective

Perform final security, architecture, governance, and release-readiness review for eTroy OIDC after Phase 06 Sprint 16 through Sprint 20.

Sprint 21 must determine whether the project is:

* `RELEASE READY`
* `RELEASE READY WITH ACCEPTED CONDITIONS`
* `NOT RELEASE READY / BLOCKED`

Sprint 21 is not a feature sprint.

The sprint must verify:

* source-of-truth consistency
* module boundary compliance
* source-tree compliance
* security-critical rules
* secret and credential safety
* token/session/client/key lifecycle safety
* audit/logging/observability safety
* configuration and runtime stability
* validation evidence credibility
* known condition classification
* residual risk handling
* release-blocking issue status

---

## V. Included Scope

Sprint 21 includes:

* security hardening contract alignment
* final source-of-truth review
* final governance review
* final architecture boundary review
* final source-tree review
* repository-wide security scan review
* secret leakage review
* credential handling review
* token issuance safety review
* refresh-token lifecycle safety review
* session/SSO/logout safety review
* OIDC client lifecycle safety review
* JWKS/key rotation safety review
* audit event safety review
* logging safety review
* metrics and readiness endpoint safety review
* runtime bootstrap and configuration review
* dependency readiness review
* known condition classification
* release-blocker classification
* accepted residual risk documentation
* minimal corrective patches only when release-blocking and contract-backed
* final release-readiness report

---

## VI. Excluded Scope

Sprint 21 excludes:

* new product feature development
* broad refactor
* architecture redesign
* undocumented source-tree change
* module rewrite
* cosmetic cleanup unrelated to release readiness
* broad formatting cleanup unless explicitly classified as release-blocking
* new OIDC flow
* new OAuth grant type
* social login
* MFA
* external identity federation
* admin dashboard UI
* broad RBAC framework
* external KMS integration
* HSM integration
* SIEM integration
* distributed tracing integration
* changing token issuance semantics
* changing refresh-token lifecycle
* changing session lifecycle
* changing OIDC client lifecycle
* changing JWKS/key rotation lifecycle
* changing user identity ownership
* changing auth credential validation ownership
* changing audit persistence model
* changing observability architecture
* direct commit to `main`
* hidden acceptance of critical risk

---

## VII. Review Ownership and Allowed File Areas

### Primary review owner

Sprint 21 is owned by:

* Leader / Security Governance Review

The review is repository-wide.

### Runtime corrective patch rule

Sprint 21 is not repository-wide in patch permission.

If a release-blocking correction is required, it must be made only in the owning module or layer.

Allowed correction areas by finding type:

* user identity issue:

  * `src/modules/users`
* credential validation issue:

  * `src/modules/auth`
* OIDC token/session/client/key issue:

  * `src/modules/oidc`
* audit issue:

  * `src/modules/audit`
* admin orchestration issue:

  * `src/modules/admin`
* health/readiness issue:

  * `src/modules/health`
  * `src/app`
  * approved infrastructure readiness helper
* logger/metrics issue:

  * `src/infrastructure/logger`
  * `src/infrastructure/metrics`
* crypto primitive issue:

  * `src/infrastructure/crypto`
* configuration issue:

  * `src/config`
* delivery/routing issue:

  * `src/app`
* documentation/governance issue:

  * `docs/`
* operational context update:

  * `agent/current-context.md`
  * `agent/session-history.md`

Forbidden correction locations:

* ad-hoc new runtime directories
* `shared` for domain workflow
* `infrastructure` for business policy
* `agent` for source-of-truth correction
* `.github` for runtime behavior
* `keys` for real production secret material

---

## VIII. Expected Deliverables

Required:

* `docs/contracts/security/security-hardening-contract.md`
* `docs/planning/assignments/phase-06-sprint-21.md`
* `docs/planning/reports/phase-06-security-hardening-report.md`

Likely final state updates after Sprint 21 validation:

* `docs/planning/master-execution-plan.md`
* `docs/planning/phases/phase-06-platform-governance-hardening.md`
* `agent/current-context.md`
* `agent/session-history.md`

Optional only if required by release-blocking finding:

* minimal runtime corrective patch in owning module/layer
* minimal source-of-truth correction in `docs/`
* minimal governance correction in:

  * `docs/governance/review-checklist.md`
  * `docs/governance/anti-patterns.md`
  * `docs/governance/pr-template.md`

Do not create:

* new feature modules
* broad test framework unless explicitly classified as release-blocking
* external integration adapters
* deployment platform files not already approved
* dashboard UI
* RBAC framework
* KMS/HSM/SIEM/tracing integration

---

## IX. Task Breakdown

### Task 113 - Security Hardening Contract Alignment

Goal:

* confirm Sprint 21 contract and assignment are approved before execution.

Required checks:

* confirm Sprint 20 is merged/closed/present in `main` after PR #60
* confirm `docs/contracts/security/security-hardening-contract.md` exists
* confirm `docs/planning/assignments/phase-06-sprint-21.md` exists
* confirm supporting contracts exist
* confirm work starts from latest `main`
* confirm dedicated Sprint 21 branch
* produce review packet before editing files

Acceptance criteria:

* review packet exists before edits
* no runtime patch begins before gate confirmation
* scope is explicitly included/excluded
* release-blocking criteria are known before review
* no Sprint 21 release-readiness claim is made before validation

---

### Task 114 - Source-of-Truth and Governance Review

Goal:

* verify source-of-truth alignment and governance readiness.

Review documents:

* source-of-truth index
* documentation guide
* architecture docs
* requirements contract
* master execution plan
* Phase 06 plan
* Phase 06 contracts
* Sprint 16-20 reports
* Sprint 21 contract and assignment
* governance docs
* operational context files

Required checks:

* `docs/` remains authoritative
* `agent/` remains support-only
* source-tree precedence is preserved
* current phase/sprint state is accurate
* previous sprint closure status is accurate
* no stale next-action state blocks Sprint 21
* PR/governance rules remain enforceable
* review checklist and anti-patterns cover Sprint 21 concerns

Acceptance criteria:

* no active source-of-truth contradiction blocks release readiness
* stale operational context is corrected if found
* governance gaps are classified as blocker or accepted condition
* Sprint 21 report records review result

---

### Task 115 - Architecture Boundary and Source-Tree Scan

Goal:

* verify architecture boundary and physical structure compliance.

Required review areas:

* module ownership
* allowed/forbidden dependencies
* source-tree placement
* app/config/modules/infrastructure/shared/jobs boundaries
* controller/service/repository layering
* no ad-hoc runtime folders
* no temporary source contamination

Critical checks:

* `auth` does not generate token
* `oidc` does not directly query user ownership data
* refresh token is not stored raw
* identity remains single source of truth
* `infrastructure` does not own business workflow
* `shared` does not contain domain workflow
* admin does not bypass owning modules
* audit does not mutate business state

Acceptance criteria:

* architecture scan is recorded
* source-tree scan is recorded
* all findings classified
* release-blocking boundary violations are fixed or block release

---

### Task 116 - Secret / Token / Credential Leakage Review

Goal:

* verify no sensitive data is persisted, returned, logged, audited, exposed, or committed incorrectly.

Sensitive material to review:

* passwords
* password hashes
* refresh tokens
* access tokens
* ID tokens
* authorization codes
* code verifiers
* code challenges
* client secrets
* client secret hashes
* private keys
* private JWK parameters
* session cookies
* CSRF values
* authorization headers
* environment secrets

Required checks:

* no plain password persistence
* no raw refresh-token persistence
* no raw client-secret persistence
* no private key exposure
* no token leakage through logs/audit/metrics
* no private JWK parameters in JWKS
* no secret material committed under `keys/`
* no raw env/config secret exposure

Acceptance criteria:

* all secret-sensitive findings are manually reviewed
* all true leaks are release-blocking
* false positives are documented
* accepted residual risks are documented with rationale
* no private secret value is copied into Sprint 21 report

---

### Task 117 - Runtime Stability and Configuration Review

Goal:

* verify runtime baseline is controlled, deterministic, and supportable.

Required checks:

* configuration is centralized in `src/config`
* no direct `process.env` outside config
* invalid required configuration fails fast
* app can bootstrap under approved baseline environment
* MongoDB readiness is deterministic
* Redis readiness is deterministic
* health/readiness behavior is safe
* known dependency requirements are documented
* startup does not silently accept critical missing values
* runtime errors are bounded and diagnosable

Acceptance criteria:

* runtime/config review is recorded
* dependency readiness classification exists
* startup/bootstrap findings are classified
* release-blocking runtime instability is fixed or blocks release

---

### Task 118 - Audit / Observability / Health Readiness Review

Goal:

* verify audit, logging, metrics, health, and readiness safety.

Required audit checks:

* audit records are bounded
* audit does not mutate business state
* audit does not persist raw secrets
* audit event vocabulary covers Phase 06 security-relevant flows
* audit failure behavior is documented

Required logging checks:

* logs are structured
* logs do not contain raw tokens/secrets/private keys
* logs do not contain full request/response bodies
* logs use safe metadata only

Required metrics checks:

* metrics are aggregate-safe
* metric labels do not contain raw secrets
* labels do not contain uncontrolled high-cardinality identifiers
* `/metrics` does not expose sensitive internals

Required health/readiness checks:

* `/health` is secret-safe
* `/ready` is secret-safe
* dependency readiness failure is deterministic
* readiness output does not expose credentials or internal secrets

Acceptance criteria:

* audit/logging/observability review is recorded
* sensitive findings are classified
* unsafe output is fixed or blocks release
* report includes evidence without exposing secrets

---

### Task 119 - Residual Risk Classification and Corrective Patch Control

Goal:

* classify known conditions, residual risks, and release blockers.

Known conditions requiring classification:

* repository-wide `format:check` drift
* missing unit/e2e test runner in `package.json`
* temporary harness validation from previous sprints
* MongoDB/Redis dependency setup requirements
* deferred scope from Sprint 16-20
* any remaining validation gaps

Allowed classifications:

* release-blocking
* accepted release condition
* accepted residual risk
* future backlog
* intentionally out of scope
* requires corrective patch before release

Corrective patch rules:

* only release-blocking issues may be patched in Sprint 21
* patch must be minimal
* patch must stay in owning module/layer
* patch must have source-of-truth basis
* patch must be validated
* patch must be recorded in report

Acceptance criteria:

* every known condition is classified
* every release blocker is fixed or blocks release
* accepted conditions have rationale
* no hidden risk acceptance remains

---

### Task 120 - Release Readiness Report

Goal:

* produce final Sprint 21 report and release-readiness decision.

Required report path:

* `docs/planning/reports/phase-06-security-hardening-report.md`

Report must include:

1. Executive summary
2. Source-of-truth basis
3. Sprint 21 runtime gate result
4. Review packet summary
5. Files created or updated
6. Validation command results
7. Security scan results
8. Architecture boundary review
9. Secret leakage review
10. Token/session/client/key lifecycle review
11. Audit/logging/observability review
12. Runtime stability and configuration review
13. Known condition classification
14. Corrective patches, if any
15. Residual risks
16. Release blockers
17. Release-readiness decision
18. Handoff / post-release recommendations

Required final decision:

* `RELEASE READY`
* `RELEASE READY WITH ACCEPTED CONDITIONS`
* `NOT RELEASE READY / BLOCKED`

Acceptance criteria:

* report contains exact command evidence
* report does not hide failed commands
* report does not claim unrun validation
* report does not include private secret values
* release decision is supported by evidence
* Phase 06 closure recommendation is controlled

---

## X. Allowed Dependencies

Sprint 21 review may inspect all repository areas.

Runtime correction dependencies must follow owning module boundaries.

Allowed if correcting in `src/modules/oidc`:

* OIDC-owned repositories/services
* approved users/auth service contracts only where already allowed
* audit service through approved contract
* infrastructure crypto/logger/metrics through approved abstractions
* shared generic errors/types/utilities

Allowed if correcting in `src/modules/admin`:

* approved users service contracts
* approved OIDC service contracts
* approved audit service contracts
* shared generic errors/types/utilities

Allowed if correcting in `src/modules/audit`:

* audit model/repository/service only
* infrastructure logger if already approved
* shared generic errors/types/utilities

Allowed if correcting in `src/infrastructure`:

* external library wrappers
* connection/readiness helpers
* crypto/logger/metrics primitives
* no domain module dependency

Allowed if correcting in `src/config`:

* environment schema
* environment loading
* normalized config export
* no domain business logic

Allowed if correcting docs:

* authoritative docs under `docs/`
* operational state under `agent/` only after source-of-truth state is correct

---

## XI. Forbidden Dependencies

Sprint 21 must not introduce:

* `auth` -> token issuance dependency
* `oidc` -> direct user model/repository ownership access
* `admin` -> OIDC model/repository direct access
* `audit` -> business state mutation dependency
* `infrastructure` -> module business service dependency
* `shared` -> domain workflow ownership
* `jobs` -> raw repository mutation bypassing owning service
* direct `process.env` outside `src/config`
* raw database access from arbitrary modules
* external KMS SDK
* HSM SDK
* SIEM SDK
* distributed tracing SDK
* dashboard UI framework
* broad RBAC framework

---

## XII. Security-Critical Rules

Sprint 21 must verify and preserve:

* no plain-text password persistence
* no password hash in tokens/public responses
* no raw refresh-token persistence
* no raw client-secret persistence
* no client-secret hash in API response
* no private key exposure
* no private JWK parameters in JWKS
* no token/secret/private-key logging
* no token/secret/private-key audit metadata
* no token/secret/private-key metric label
* auth does not generate OIDC tokens
* OIDC does not directly query user ownership DB
* identity remains single source of truth
* refresh token remains hashed
* token claims go through approved mapper
* UserInfo does not expose raw persistence fields
* session identifiers/cookies are not exposed
* logout/session behavior remains bounded
* disabled clients cannot bypass validation
* redirect URI exact-match remains enforced
* zero-active signing fails predictably
* multiple-active signing fails predictably
* retired keys publish only during overlap
* compromised keys are not published by default
* audit remains bounded and append-safe
* logs remain sanitized
* metrics remain aggregate-safe
* health/readiness endpoints remain secret-safe
* runtime dependency failures are deterministic
* validation evidence is complete

---

## XIII. Required Validation Commands

Baseline validation:

```bash id="sp21-validation-baseline"
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Security-sensitive scans:

```bash id="sp21-security-scans"
rg -n "password|password_hash|passwordHash|client_secret|clientSecret|refresh_token|access_token|id_token|authorization_code|code_verifier|code_challenge|private.*key|BEGIN PRIVATE KEY|session.*cookie|authorization.*header|csrf" src docs keys --glob "!docs/planning/reports/**"
rg -n "UserModel|user\\.repository|mongoose" src/modules/oidc src/modules/admin src/modules/audit
rg -n "sign|jwt|issue|generate.*token" src/modules/auth src/modules/admin src/modules/users src/modules/audit
rg -n "shared/.+service|workflow|usecase|issue|token" src/shared
rg -n "business|workflow|policy" src/infrastructure
```

Architecture and source-tree scans:

```bash id="sp21-architecture-scans"
rg -n "from ['\\\"]\\.\\./users|from ['\\\"]\\.\\./auth|from ['\\\"]\\.\\./oidc|from ['\\\"]\\.\\./admin|from ['\\\"]\\.\\./audit" src/modules
rg -n "deleteOne|findOneAndDelete|findByIdAndDelete|remove\\(" src/modules src/infrastructure
rg -n "TODO|FIXME|HACK|temporary|temp-validation|throwaway" src docs agent
```

OIDC / key / client specific scans:

```bash id="sp21-oidc-scans"
rg -n "client_secret|clientSecret|client_secret_hash|clientSecretHash" src/modules/oidc src/modules/admin
rg -n "BEGIN PRIVATE KEY|PRIVATE KEY|privateKey|private_key|\\\"d\\\"|\\\"p\\\"|\\\"q\\\"|\\\"dp\\\"|\\\"dq\\\"|\\\"qi\\\"" src docs keys --glob "!docs/planning/reports/**"
rg -n "kid|jwks|jwk|rotate|rotated|retired|compromised|NO_ACTIVE_SIGNING_KEY|MULTIPLE_ACTIVE_SIGNING_KEYS" src/modules/oidc src/infrastructure/crypto docs/contracts docs/planning
```

Audit / observability scans:

```bash id="sp21-audit-observability-scans"
rg -n "recordEvent|auditService|metadata|redact|forbidden|secret" src/modules/audit src/modules/admin src/modules/oidc
rg -n "logger\\.|metrics\\.|incrementCounter|setGauge|observeHistogram|/metrics|/health|/ready" src
```

Expected interpretation:

* Security-sensitive matches require manual review.
* Match presence is not automatic failure.
* Forbidden ownership patterns are release-blocking.
* Secret exposure in output/log/audit/metrics/JWKS is release-blocking.
* Touched Sprint 21 files must be formatting-clean even if global format drift is accepted.
* Every scan must be recorded as `PASS`, `FAIL`, `PASS WITH REVIEW`, or `NOT RUN` with reason.

---

## XIV. Manual Validation Checks

Sprint 21 must manually validate:

1. `docs/` remains authoritative and `agent/` remains support-only.
2. No current source-of-truth contradiction blocks release readiness.
3. Phase 01 through Phase 05 remain closed.
4. Sprint 16 through Sprint 20 remain merged/closed/present in `main`.
5. Sprint 21 has approved contract and assignment before execution.
6. No implementation begins without approved contract.
7. No direct commit to `main` occurs.
8. PR-based workflow is preserved.
9. Auth does not generate tokens.
10. OIDC does not directly query user ownership database.
11. Refresh tokens are not persisted raw.
12. Identity is not duplicated outside the identity source of truth.
13. Infrastructure does not own business workflow.
14. Shared does not contain module-specific workflow.
15. Controllers remain thin where modified or reviewed.
16. Persistence remains behind owning repository layers.
17. Direct `process.env` outside `src/config` is absent.
18. `console.log` is absent.
19. Passwords are not persisted plain text.
20. Password hashes do not appear in tokens or public responses.
21. Raw refresh tokens are not persisted.
22. Raw client secrets are not persisted.
23. Client secret hashes are not returned by API.
24. Client secrets are not logged or audited.
25. JWT access token and ID Token are signed.
26. JWT claims pass through approved mapper.
27. `/userinfo` does not expose raw persistence fields.
28. Session identifiers/cookies are not logged.
29. Logout/session behavior remains consistent with approved contract.
30. JWKS exposes public keys only.
31. JWKS does not expose private JWK parameters.
32. Key rotation does not silently fallback or bootstrap during signing.
33. Zero-active signing failure is predictable.
34. Multiple-active signing failure is predictable.
35. Retired keys publish only during overlap.
36. Compromised keys are not published by default.
37. Audit metadata is bounded and secret-safe.
38. Audit does not mutate business state.
39. Logs do not include raw secrets/tokens.
40. Metrics do not include raw secrets/tokens.
41. `/metrics` is aggregate-safe.
42. `/health` and `/ready` are secret-safe.
43. Dependency readiness failure behavior is deterministic.
44. Global `format:check` status is classified.
45. Missing unit/e2e runner condition is classified.
46. Temporary harness validation condition is classified.
47. All release blockers are fixed or explicitly block release.
48. Accepted residual risks are documented with rationale.
49. Sprint 21 report contains exact validation evidence.
50. Release-readiness conclusion is explicitly stated.

---

## XV. Known Condition Classification Requirements

Sprint 21 must classify at minimum:

### 1. Repository-wide `format:check` drift

Classification must be one of:

* release-blocking
* accepted release condition
* corrective cleanup required before release

Required rationale:

* whether drift affects runtime behavior
* whether Sprint 21 touched files are formatting-clean
* whether cleanup is deferred to dedicated PR/task

### 2. Missing unit/e2e test runner

Classification must be one of:

* release-blocking
* accepted release condition with manual validation basis
* required before production release

Required rationale:

* which manual validations substitute for automated tests
* what risk remains
* whether future test harness work is required

### 3. Temporary harness validation

Classification must be one of:

* release-blocking
* accepted release condition with evidence
* requires committed regression harness before release

Required rationale:

* which sprints used temporary harnesses
* what they validated
* whether the evidence is sufficient for current release-readiness decision

### 4. Runtime dependency readiness

Classification must be one of:

* acceptable
* acceptable with operational setup requirement
* release-blocking

Required rationale:

* MongoDB readiness behavior
* Redis readiness behavior
* startup behavior
* approved environment setup requirement

### 5. Deferred scope

Classification must be one of:

* intentionally out of scope
* accepted residual risk
* future backlog
* release-blocking gap

Required rationale:

* source-of-truth basis
* why it does or does not block release

---

## XVI. Corrective Patch Policy

Sprint 21 may patch only when all are true:

* finding is release-blocking
* fix is minimal
* owner module/layer is clear
* source-of-truth basis is explicit
* patch does not introduce new feature scope
* patch does not create architecture drift
* validation can prove the correction
* PR scope remains reviewable

Allowed corrective patch categories:

* secret leakage correction
* boundary violation correction
* unsafe audit/log/metric metadata correction
* readiness or startup fail-fast correction
* validation/report accuracy correction
* source-of-truth contradiction correction
* release-blocking documentation correction

Forbidden corrective patch categories:

* broad refactor
* new feature
* full test framework introduction unless explicitly release-blocking
* architecture redesign
* admin dashboard / RBAC expansion
* KMS / HSM / SIEM / tracing expansion
* broad formatting cleanup unless explicitly release-blocking
* opportunistic cleanup

Every corrective patch must be recorded in the Sprint 21 report.

---

## XVII. Release Decision Rules

Sprint 21 final report must end with one decision.

### 1. `RELEASE READY`

Allowed only if:

* all critical validations pass
* no release blockers remain
* no accepted condition threatens production baseline
* runtime baseline is stable and reproducible
* governance evidence is complete

### 2. `RELEASE READY WITH ACCEPTED CONDITIONS`

Allowed only if:

* no critical security or architecture blocker remains
* known conditions are explicitly documented
* accepted conditions have rationale and owner visibility
* conditions do not invalidate production baseline
* follow-up items are identified

### 3. `NOT RELEASE READY / BLOCKED`

Required if:

* any release-blocking condition remains unresolved
* validation evidence is insufficient
* runtime stability is not credible
* source-of-truth conflicts block release determination
* security-critical rule is violated

---

## XVIII. Branch and Commit Guidance

Recommended branch:

* `feature/security-sprint21-release-readiness`

Commit message guidance:

* `docs(security): add Sprint 21 release readiness review`
* `fix(<scope>): correct Sprint 21 release blocker`
* `docs(planning): add Sprint 21 security hardening report`
* `docs(agent): mark Sprint 21 release readiness state`

All commits must remain within Sprint 21 scope.

Do not commit:

* unrelated formatting cleanup
* temporary harness files
* generated build artifacts
* real private key material
* logs
* local environment files
* ad-hoc notes outside approved docs/agent areas

---

## XIX. Handoff Target

Sprint 21 hands off to:

* Phase 06 closure decision
* release readiness decision
* production deployment preparation if release-ready
* dedicated backlog for accepted non-blocking follow-up items

Potential follow-up categories:

* automated test harness
* formatting baseline cleanup
* deployment runbook
* incident response runbook
* operational dashboard
* external monitoring integration
* KMS/HSM integration
* MFA/social login/external federation

These follow-ups remain out of Sprint 21 unless approved by separate source-of-truth update.
