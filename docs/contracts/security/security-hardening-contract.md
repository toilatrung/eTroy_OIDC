# eTroy OIDC - Security Hardening Contract

---

## I. Contract Summary

* Contract: Security Hardening Contract
* Phase: Phase 06 - Platform and Governance Hardening
* Primary Sprint: Sprint 21 - Final Security Hardening and Release Readiness Review
* Owner Role: Leader / Security Governance Review
* Primary Runtime Owner: repository-wide review, with corrective patches only in owning modules if release-blocking issues are found
* Primary Assignment: `docs/planning/assignments/phase-06-sprint-21.md`
* Contract Path: `docs/contracts/security/security-hardening-contract.md`
* Primary Report: `docs/planning/reports/phase-06-security-hardening-report.md`
* Status: Approved for Sprint 21 runtime implementation

---

## II. Purpose

This contract defines the final security hardening and release-readiness rules for eTroy OIDC.

Sprint 21 is not a feature sprint. It is the final governance, security, architecture, and operational-readiness review sprint for Phase 06.

The contract exists to ensure the project can be assessed for production readiness through:

* source-of-truth alignment
* architecture boundary compliance
* security-critical rule verification
* token/session/client/key lifecycle safety review
* audit and observability safety review
* runtime stability review
* configuration and dependency readiness review
* validation evidence review
* known condition classification
* residual risk handling
* release-readiness decision

Sprint 21 must not silently introduce new product behavior or broaden the system beyond approved contracts.

---

## III. Source-of-Truth Basis

This contract is governed by:

* `docs/source-of-truth-index.md`
* `docs/README.md`
* `docs/architecture/system-overview.md`
* `docs/architecture/module-boundaries.md`
* `docs/architecture/source-tree.md`
* `docs/architecture/detailed-source-tree.md`
* `docs/requirements/srs-v1.md`
* `docs/planning/master-execution-plan.md`
* `docs/planning/phases/phase-06-platform-governance-hardening.md`
* `docs/contracts/audit/audit-event-contract.md`
* `docs/contracts/admin/admin-control-contract.md`
* `docs/contracts/oidc/client-management-contract.md`
* `docs/contracts/observability/observability-contract.md`
* `docs/contracts/oidc/key-rotation-contract.md`
* `docs/contracts/security/security-hardening-contract.md`
* `docs/planning/assignments/phase-06-sprint-21.md`
* `docs/planning/reports/phase-06-sprint-20-report.md`
* `docs/governance/git-rules.md`
* `docs/governance/pr-template.md`
* `docs/governance/review-checklist.md`
* `docs/governance/anti-patterns.md`

Authority rules:

* `docs/` is authoritative.
* `agent/` is operational support only.
* `source-tree.md` is the primary physical structure contract.
* `detailed-source-tree.md` is supporting reference only.
* Architecture and requirements documents win over planning convenience.
* Governance documents define review and merge discipline.
* Sprint 21 may not use operational context to override approved contracts.

---

## IV. Contract Scope

### Included

Sprint 21 includes:

* final source-of-truth alignment review
* final architecture boundary review
* final source-tree compliance review
* final module dependency review
* final security-critical rule verification
* final secret leakage review
* final token/session/client/key lifecycle safety review
* final audit event and logging safety review
* final observability and readiness endpoint review
* final runtime stability review
* final configuration and dependency readiness review
* validation evidence review across Phase 06
* known condition classification
* residual risk classification
* release-blocking issue classification
* minimal corrective patches only when release-blocking and contract-backed
* final release-readiness report

### Excluded

Sprint 21 excludes:

* new product feature development
* broad refactor
* architecture redesign
* undocumented source-tree changes
* module rewrite
* cosmetic cleanup unrelated to release readiness
* broad formatting cleanup unless explicitly classified as release-blocking
* new OIDC flows
* new OAuth grant types
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

---

## V. Sprint 21 Runtime Gate

Sprint 21 execution may begin only when all are true:

* Sprint 20 is merged, closed, corrected, and present in `main`.
* `docs/contracts/security/security-hardening-contract.md` exists and is approved.
* `docs/planning/assignments/phase-06-sprint-21.md` exists and is approved.
* Supporting contracts are present and approved:

  * `docs/contracts/audit/audit-event-contract.md`
  * `docs/contracts/admin/admin-control-contract.md`
  * `docs/contracts/oidc/client-management-contract.md`
  * `docs/contracts/observability/observability-contract.md`
  * `docs/contracts/oidc/key-rotation-contract.md`
* Work begins from latest `main`.
* Work occurs on a dedicated Sprint 21 branch.
* A review packet is produced before editing files.
* Any corrective patch is tied to a release-blocking finding.

Until this gate is satisfied:

* do not edit `src/`
* do not perform corrective runtime patches
* do not create final release-readiness claims
* do not mark Phase 06 complete
* do not mark the project release-ready

Recommended branch:

* `feature/security-sprint21-release-readiness`

---

## VI. Ownership and Review Boundary

Sprint 21 is repository-wide in review scope but not repository-wide in patch permission.

### 1. Leader / Security Governance Review Ownership

Leader owns:

* final decision packet
* source-of-truth review
* architecture compliance review
* release-blocking classification
* residual risk classification
* release-readiness conclusion
* merge readiness decision
* Phase 06 closure recommendation

Leader must not:

* accept unsupported completion claims
* accept runtime instability silently
* accept validation gaps as pass
* allow agent files to override `docs/`
* allow broad corrective patches without source-of-truth basis

### 2. Runtime Corrective Patch Ownership

If Sprint 21 finds a release-blocking issue, the fix must occur only in the owning module or layer.

Examples:

* `users` fixes remain in `src/modules/users`
* `auth` fixes remain in `src/modules/auth`
* OIDC token/session/client/key fixes remain in `src/modules/oidc`
* audit fixes remain in `src/modules/audit`
* observability/logger/metrics fixes remain in approved infrastructure areas
* config fixes remain in `src/config`
* delivery wiring fixes remain in `src/app`
* source-tree or governance fixes remain in `docs/`

Corrective patches must be minimal, traceable, and reviewable.

### 3. Infrastructure Boundary

`src/infrastructure` may not absorb business workflow during Sprint 21.

Infrastructure changes are allowed only for:

* safe adapter correction
* logger/metrics sanitization correction
* crypto primitive correction
* dependency readiness correction
* connection/readiness behavior correction

Infrastructure must not own domain policy.

---

## VII. Required Review Areas

Sprint 21 must review the following areas.

### 1. Source-of-Truth Alignment

Review:

* source-of-truth index
* documentation guide
* architecture contracts
* requirements contract
* master execution plan
* Phase 06 plan
* contracts
* assignments
* reports
* governance docs
* operational context files

Required result:

* no active document contradiction that affects release readiness
* no lower-authority file overriding higher-authority documents
* no missing current Sprint 21 source documents
* no stale next-action state after Sprint 21 closure

### 2. Architecture Boundary Compliance

Review critical rules:

* `auth` does not generate tokens
* `oidc` does not directly query user ownership data
* refresh tokens are not stored raw
* identity remains single source of truth
* `infrastructure` does not contain business workflow
* `shared` does not contain domain workflow
* modules do not import forbidden internal repositories/models
* controllers remain thin
* persistence access remains behind owning repositories

### 3. Source-Tree Compliance

Review:

* no ad-hoc runtime folders
* no temporary files committed in product source
* no generated artifacts committed improperly
* no real private keys committed
* no docs placed outside approved documentation areas
* no business logic in `.github`, `scripts`, `agent`, or `keys`

### 4. Secret and Credential Safety

Review that the system does not leak or persist raw sensitive material incorrectly.

Sensitive material includes:

* passwords
* password hashes in public outputs
* refresh tokens
* access tokens
* ID tokens
* authorization codes
* code verifiers
* code challenges when unsafe
* client secrets
* client secret hashes in public outputs
* private keys
* private JWK parameters
* session cookies
* CSRF values
* authorization headers
* environment secrets

### 5. OIDC Token and Claims Safety

Review:

* JWT signing remains inside OIDC-approved path
* JWTs are signed
* `kid` maps to JWKS key behavior
* claims pass through approved mapper
* no password hash appears in token or UserInfo
* `/userinfo` exposes only approved claims
* auth does not issue OIDC tokens
* users does not own claims mapping or token issuance

### 6. Refresh Token Lifecycle Safety

Review:

* refresh tokens are hashed before persistence
* raw refresh token is not stored
* rotation behavior remains safe
* reuse detection remains intact
* revocation behavior remains intact
* introspection behavior remains bounded
* no Sprint 21 change weakens Phase 05 lifecycle guarantees

### 7. Session, SSO, and Logout Safety

Review:

* session ownership remains OIDC-owned
* SSO behavior remains bounded to approved clients
* logout invalidates applicable session state
* cookies/session identifiers are not logged or exposed
* admin/client/key/audit changes do not mutate session lifecycle unexpectedly

### 8. OIDC Client Management Safety

Review:

* client secrets are hashed before persistence
* raw client secret is returned only once on create/rotate
* client secret hash is not returned
* disabled managed clients cannot be bypassed by static fallback
* redirect URI exact-match validation remains intact
* wildcard/prefix/substring redirect matching is not introduced
* admin does not import OIDC client model/repository

### 9. JWKS and Key Rotation Safety

Review:

* exactly one active signing key behavior is enforced
* zero-active signing fails predictably
* multiple-active signing fails predictably
* JWKS exposes public keys only
* private JWK parameters are not exposed
* retired keys remain published only during overlap
* compromised keys are not published by default
* signing does not silently bootstrap or fallback to stale key material
* key lifecycle audit/metrics/logging does not leak private key material

### 10. Audit Safety

Review:

* audit is append-only where required
* audit does not mutate business state
* audit metadata is bounded
* audit metadata is redaction-safe
* audit does not persist raw secrets
* audit does not record full request/response objects
* audit events exist for security-relevant Phase 06 flows
* audit failure behavior is documented and acceptable

### 11. Logging and Observability Safety

Review:

* logs are structured and sanitized
* logs do not include secrets or tokens
* metrics are aggregate-safe
* metric labels do not contain raw secrets or high-risk identifiers
* `/metrics` does not expose sensitive internals
* `/health` and `/ready` do not expose secrets
* readiness checks fail predictably when dependencies are unavailable

### 12. Configuration and Runtime Stability

Review:

* configuration is centralized in `src/config`
* direct `process.env` outside `src/config` is absent
* startup fails fast for invalid required configuration
* MongoDB and Redis readiness behavior is deterministic
* runtime does not silently accept missing critical dependencies
* app can bootstrap under approved baseline environment
* known runtime limitations are documented

---

## VIII. Known Condition Classification

Sprint 21 must explicitly classify known conditions.

### 1. Repository-Wide Format Drift

Known condition:

* `npm.cmd run format:check` may fail due repository-wide baseline drift outside sprint-scoped files.

Sprint 21 must classify this as one of:

* release-blocking
* accepted release condition with documented rationale
* corrective cleanup required before release

If accepted, the report must identify:

* why it does not threaten runtime behavior
* which files are affected
* whether touched Sprint 21 files are formatting-clean
* whether a dedicated cleanup PR is required later

### 2. Missing Unit / E2E Test Runner

Known condition:

* no committed unit/e2e test runner exists in `package.json`.

Sprint 21 must classify this as one of:

* release-blocking
* accepted release condition with documented manual validation basis
* required before production release

If accepted, the report must identify:

* which manual validations substitute for automated tests
* what risk remains
* whether future test harness work is required

### 3. Temporary Harness Validation

Known condition:

* multiple runtime validations used temporary local harnesses rather than committed automated tests.

Sprint 21 must classify this as one of:

* release-blocking
* accepted release condition with evidence
* requires committed regression harness before release

### 4. Dependency Availability

Known condition:

* runtime stability depends on approved MongoDB/Redis configuration and readiness behavior.

Sprint 21 must classify dependency readiness as:

* acceptable
* acceptable with operational setup requirement
* release-blocking

### 5. Deferred Scope

Sprint 21 must classify deferred items from previous sprints as:

* intentionally out of scope
* accepted residual risk
* future backlog
* release-blocking gap

---

## IX. Corrective Patch Policy

Sprint 21 may include corrective patches only when all are true:

* a finding is release-blocking
* the fix is minimal
* the owning module/layer is clear
* source-of-truth basis is explicit
* the patch does not introduce new feature scope
* validation can prove the correction
* PR scope remains reviewable

Corrective patches are allowed for:

* secret leakage correction
* boundary violation correction
* unsafe audit/log/metric metadata correction
* readiness or startup fail-fast correction
* missing validation/report accuracy correction
* source-of-truth contradiction correction
* release-blocking documentation correction

Corrective patches are not allowed for:

* broad refactor
* new feature
* full test framework introduction unless explicitly classified as release-blocking
* architecture redesign
* dashboard/RBAC/KMS/HSM/SIEM/tracing expansion
* broad formatting cleanup unless explicitly release-blocking
* opportunistic cleanup

---

## X. Validation Requirements

Sprint 21 must run or explicitly report inability to run:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run format:check
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
```

Security-sensitive scans:

```bash
rg -n "password|password_hash|passwordHash|client_secret|clientSecret|refresh_token|access_token|id_token|authorization_code|code_verifier|code_challenge|private.*key|BEGIN PRIVATE KEY|session.*cookie|authorization.*header|csrf" src docs keys --glob "!docs/planning/reports/**"
rg -n "UserModel|user\\.repository|mongoose" src/modules/oidc src/modules/admin src/modules/audit
rg -n "sign|jwt|issue|generate.*token" src/modules/auth src/modules/admin src/modules/users src/modules/audit
rg -n "shared/.+service|workflow|usecase|issue|token" src/shared
rg -n "business|workflow|policy" src/infrastructure
```

Architecture and source-tree scans:

```bash
rg -n "from ['\\\"]\\.\\./users|from ['\\\"]\\.\\./auth|from ['\\\"]\\.\\./oidc|from ['\\\"]\\.\\./admin|from ['\\\"]\\.\\./audit" src/modules
rg -n "deleteOne|findOneAndDelete|findByIdAndDelete|remove\\(" src/modules src/infrastructure
rg -n "TODO|FIXME|HACK|temporary|temp-validation|throwaway" src docs agent
```

OIDC/key/client specific scans:

```bash
rg -n "client_secret|clientSecret|client_secret_hash|clientSecretHash" src/modules/oidc src/modules/admin
rg -n "BEGIN PRIVATE KEY|PRIVATE KEY|privateKey|private_key|\\\"d\\\"|\\\"p\\\"|\\\"q\\\"|\\\"dp\\\"|\\\"dq\\\"|\\\"qi\\\"" src docs keys --glob "!docs/planning/reports/**"
rg -n "kid|jwks|jwk|rotate|rotated|retired|compromised|NO_ACTIVE_SIGNING_KEY|MULTIPLE_ACTIVE_SIGNING_KEYS" src/modules/oidc src/infrastructure/crypto docs/contracts docs/planning
```

Audit / observability scans:

```bash
rg -n "recordEvent|auditService|metadata|redact|forbidden|secret" src/modules/audit src/modules/admin src/modules/oidc
rg -n "logger\\.|metrics\\.|incrementCounter|setGauge|observeHistogram|/metrics|/health|/ready" src
```

Expected interpretation:

* Security-sensitive matches require manual review.
* Match presence is not automatic failure.
* Forbidden ownership patterns are release-blocking.
* Secret exposure in output/log/audit/metrics/JWKS is release-blocking.
* Touched Sprint 21 files must be formatting-clean even if global format drift is accepted.
* Every scan must be recorded as PASS, FAIL, PASS WITH REVIEW, or NOT RUN with reason.

---

## XI. Manual Validation Requirements

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

## XII. Release-Blocking Conditions

Sprint 21 must mark the project `NOT RELEASE READY / BLOCKED` if any of these occur:

* missing Sprint 21 contract
* missing Sprint 21 assignment
* Sprint 20 is not merged/closed/present in `main`
* source-of-truth contradiction affects release behavior
* undocumented architecture change exists
* boundary violation exists
* `auth` generates tokens
* `oidc` directly queries user ownership database
* refresh tokens are persisted raw
* identity logic is duplicated outside identity source
* raw client secret is persisted, logged, audited, or retrievable after one-time response
* private key material is committed, logged, audited, exposed through JWKS, or exposed through metrics
* JWT signing can silently fallback to stale/unknown key material
* missing active signing key does not fail predictably
* multiple active signing keys do not fail predictably or are not prevented
* `/userinfo` exposes raw persistence fields
* audit mutates business state
* audit records raw secrets/tokens/private keys
* logs expose raw secrets/tokens/private keys
* metrics expose raw secrets/tokens/private keys
* `/health`, `/ready`, or `/metrics` expose secrets
* configuration can bypass centralized validation
* runtime cannot bootstrap in approved baseline environment and no accepted condition explains it
* required infrastructure dependency failure is uncontrolled
* validation evidence is missing
* known critical instability is deferred without explicit acceptance
* direct push or governance bypass occurs
* release-readiness conclusion is unsupported by evidence

---

## XIII. Release Decision Outcomes

Sprint 21 report must end with one controlled outcome.

### 1. RELEASE READY

Allowed only if:

* all critical validations pass
* no release blockers remain
* no accepted condition threatens production baseline
* runtime baseline is stable and reproducible
* governance evidence is complete

### 2. RELEASE READY WITH ACCEPTED CONDITIONS

Allowed only if:

* no critical security or architecture blocker remains
* known conditions are explicitly documented
* accepted conditions have rationale and owner visibility
* conditions do not invalidate production baseline
* follow-up items are identified

Examples of possible accepted conditions:

* repository-wide formatting drift outside touched files, if classified as non-runtime and governed separately
* missing committed automated test suite, if manual validation evidence is accepted and future test hardening is documented
* local infrastructure dependency setup requirement, if readiness behavior is deterministic and documented

### 3. NOT RELEASE READY / BLOCKED

Required if:

* any release-blocking condition remains unresolved
* validation evidence is insufficient
* runtime stability is not credible
* source-of-truth conflicts block release determination
* security-critical rule is violated

---

## XIV. Required Report Format

Sprint 21 must produce:

`docs/planning/reports/phase-06-security-hardening-report.md`

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

The report must not:

* claim validation that was not run
* hide failed commands
* treat release blockers as accepted conditions without rationale
* include private secret values
* include raw token examples
* include private key material
* use `agent/` files as contract authority

---

## XV. PR and Merge Governance

Sprint 21 PR must include:

* phase/sprint/task references
* exact source-of-truth references
* contract basis
* included scope
* explicitly excluded scope
* validation evidence
* scan evidence
* known condition classification
* release-readiness decision
* risk and rollback notes
* reviewer focus

Merge must be blocked if:

* PR template sections are placeholder-only
* source-of-truth references are missing
* validation evidence is missing
* release-readiness decision is unsupported
* corrective patches exceed approved scope
* security-sensitive findings are not reviewed
* known conditions are not classified
* report contradicts command output
* governance checklist fails

---

## XVI. Handoff

Sprint 21 hands off to:

* Phase 06 closure decision
* release readiness decision
* production deployment preparation, if release-ready
* dedicated follow-up backlog for accepted non-blocking conditions

Sprint 21 may recommend future work, but must not implement future scope without a new approved contract or assignment.

Potential follow-up categories:

* automated test harness
* formatting baseline cleanup
* deployment runbook
* incident response runbook
* operational dashboard
* external monitoring integration
* KMS/HSM integration
* MFA/social login/external federation

These follow-ups remain out of Sprint 21 unless explicitly approved by separate source-of-truth update.
