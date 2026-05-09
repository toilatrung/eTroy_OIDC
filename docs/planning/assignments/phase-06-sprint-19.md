# Phase 06 / Sprint 19 - Observability Hardening Assignment

---

## I. Assignment Summary

* Phase: Phase 06 - Platform and Governance Hardening
* Sprint: Sprint 19 - Observability Hardening
* Task range:

  * Task 98 - Observability Contract Alignment
  * Task 99 - Structured Logging Normalization
  * Task 100 - Request Correlation Baseline
  * Task 101 - Metrics Baseline
  * Task 102 - Health / Readiness Refinement
  * Task 103 - Safe Minimal Instrumentation
  * Task 104 - Sprint 19 Validation and Report
* Owner layers:

  * `src/infrastructure/logger`
  * `src/infrastructure/metrics`
  * `src/modules/health`
* Participating areas:

  * `src/app`
  * `src/modules/users`
  * `src/modules/auth`
  * `src/modules/verification`
  * `src/modules/password-reset`
  * `src/modules/oidc`
  * `src/modules/admin`
  * `src/modules/audit`
* Required contracts:

  * `docs/contracts/observability/observability-contract.md`
  * `docs/contracts/audit/audit-event-contract.md`
* Assignment path: `docs/planning/assignments/phase-06-sprint-19.md`
* Status: Approved for Sprint 19 runtime implementation

---

## II. Runtime Gate

Sprint 19 runtime implementation may begin only when all are true:

* Sprint 18 - OIDC Client Management is merged, closed, and present in `main`.
* `docs/contracts/observability/observability-contract.md` exists and is approved.
* `docs/planning/assignments/phase-06-sprint-19.md` exists and is approved.
* `docs/contracts/audit/audit-event-contract.md` is present and approved.
* Runtime work begins from updated `main`.
* Runtime work occurs on a dedicated Sprint 19 feature branch.
* Implementation packet is produced before coding.

Until this gate is satisfied:

* do not edit `src/`
* do not implement Sprint 19 runtime
* do not create Sprint 19 report
* do not mark Sprint 19 as started
* do not mix Sprint 19 with Sprint 20 key rotation or final security hardening work

Recommended runtime branch:

* `feature/observability-sprint19-hardening`

---

## III. Source-of-Truth Basis

Sprint 19 must use the following documents:

* `docs/source-of-truth-index.md`
* `docs/README.md`
* `docs/architecture/system-overview.md`
* `docs/architecture/module-boundaries.md`
* `docs/architecture/source-tree.md`
* `docs/architecture/detailed-source-tree.md`
* `docs/requirements/srs-v1.md`
* `docs/planning/master-execution-plan.md`
* `docs/planning/phases/phase-06-platform-governance-hardening.md`
* `docs/contracts/observability/observability-contract.md`
* `docs/contracts/audit/audit-event-contract.md`
* `docs/planning/assignments/phase-06-sprint-19.md`
* `docs/planning/reports/phase-06-sprint-18-report.md`
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
* If this assignment conflicts with `docs/contracts/observability/observability-contract.md`, the contract wins.
* If this assignment conflicts with architecture documents, architecture documents win unless an approved architecture update is included.
* No implementation may exceed approved contract and assignment scope.

Phase 06 explicitly includes observability hardening through structured logs and metrics, health/readiness review, and security-relevant monitoring coverage.  The module boundary rules require infrastructure to stay adapter-focused and forbid business logic in infrastructure. 

---

## IV. Sprint Objective

Implement a bounded observability hardening baseline.

Sprint 19 establishes safe structured logging, request correlation, metrics primitives, health/readiness refinement, and limited instrumentation without leaking secrets or changing domain behavior.

Sprint 19 must ensure:

* logger remains infrastructure-owned.
* metrics remains infrastructure-owned.
* health/readiness remains health-module-owned.
* participating modules only emit approved safe signals.
* observability does not become business logic.
* logs do not contain secrets, raw tokens, raw client secrets, authorization codes, session cookies, or full request/response bodies.
* metrics labels do not contain secrets, PII, or high-cardinality values by default.
* readiness checks are bounded and non-mutating.
* `/metrics`, if exposed, returns aggregate metrics only.

---

## V. Included Scope

Sprint 19 includes:

* observability contract alignment
* structured logging field normalization
* safe logger helper behavior if needed
* request/correlation id generation
* request/correlation id propagation through app request context
* request lifecycle logging if safe
* safe operational error logging
* no-secret logging enforcement
* metrics primitive normalization
* counter support
* gauge support if needed
* histogram support if needed
* metrics endpoint exposure if approved by implementation packet
* request lifecycle metrics
* HTTP error-rate metrics
* health endpoint refinement
* readiness endpoint introduction or refinement
* MongoDB readiness check if supported safely
* Redis readiness check if supported safely
* audit record outcome counters if safe
* admin action counters if safe
* OIDC/client/token/session counters if safe and minimal
* limited instrumentation in selected modules only
* Sprint 19 report and validation evidence

---

## VI. Excluded Scope

Sprint 19 excludes:

* external monitoring vendor integration
* SIEM pipeline implementation
* distributed tracing
* full observability platform rollout
* log shipping infrastructure
* dashboard UI
* audit dashboard
* broad instrumentation across all modules
* instrumentation wrappers around every service/repository
* business workflow logic inside `logger`
* business workflow logic inside `metrics`
* changing business behavior to satisfy logs or metrics
* changing token issuance semantics
* changing refresh token lifecycle
* changing session lifecycle
* changing client lifecycle behavior
* changing user identity behavior
* JWKS/key rotation
* final security hardening checklist outside observability-specific controls
* logging secrets
* logging raw tokens
* logging client secrets
* logging authorization codes
* logging session cookies
* logging private key material
* logging full request bodies
* logging full response bodies
* metrics labels containing PII or secrets
* metrics labels containing high-cardinality identifiers by default
* unrelated refactors
* broad formatting cleanup

---

## VII. Owner Layers and Allowed File Areas

### Primary owner: logger infrastructure

Sprint 19 may update:

* `src/infrastructure/logger/logger.ts`
* `src/infrastructure/logger/index.ts` if existing export shape requires it

Logger changes must remain infrastructure primitive behavior only.

### Primary owner: metrics infrastructure

Sprint 19 may update:

* `src/infrastructure/metrics/metrics.ts`
* `src/infrastructure/metrics/index.ts` if existing export shape requires it

Metrics changes must remain primitive/adapter behavior only.

### Primary owner: health module

Sprint 19 may update:

* `src/modules/health/health.controller.ts`
* optional health service/helper only if existing project patterns justify it and it stays health-owned

Health changes must not mutate dependency state or expose internals.

### App layer

Sprint 19 may update:

* `src/app/server.ts`
* existing middleware/route files if present
* optional new middleware file only if consistent with source-tree structure and existing app pattern

Allowed app changes:

* request correlation middleware
* request lifecycle logging wiring
* health/readiness/metrics route wiring

Forbidden app changes:

* business logic
* token/session lifecycle logic
* direct database mutation
* credential validation logic

### Participating modules

Sprint 19 may update selected module service/controller files only for explicitly approved safe instrumentation:

* `src/modules/audit/audit.service.ts`
* `src/modules/admin/admin.service.ts`
* selected `src/modules/oidc/*` files only at approved outcome boundaries
* selected `src/modules/auth/*`, `users/*`, `verification/*`, `password-reset/*` only if contract-backed and minimal

Participating module changes must be minimal and must not alter business outcomes.

---

## VIII. Expected Deliverables

Required documentation deliverables:

* `docs/contracts/observability/observability-contract.md`
* `docs/planning/assignments/phase-06-sprint-19.md`
* `docs/planning/reports/phase-06-sprint-19-report.md`

Required or likely runtime deliverables:

* `src/infrastructure/logger/logger.ts`
* `src/infrastructure/metrics/metrics.ts`
* `src/modules/health/health.controller.ts`
* `src/app/server.ts` or existing app route/middleware file if needed

Optional only if existing project structure supports it:

* `src/app/middlewares/request-correlation.middleware.ts`
* `src/app/middlewares/request-logging.middleware.ts`
* `src/modules/health/health.service.ts`
* `src/infrastructure/database/index.ts` or `connection.ts` for safe readiness method
* `src/infrastructure/redis/index.ts` or `client.ts` for safe readiness method

Do not create:

* external vendor adapters
* SIEM pipeline files
* dashboard UI files
* tracing modules
* observability domain module under `src/modules`
* business-specific instrumentation framework in `shared`
* key rotation files
* security-hardening checklist files
* broad wrapper infrastructure that alters service behavior

---

## IX. Task Breakdown

### Task 98 - Observability Contract Alignment

Goal:

* confirm approved Sprint 19 contract and assignment
* inspect runtime state before coding
* produce implementation packet

Required checks:

* confirm `observability-contract.md` is approved
* confirm `phase-06-sprint-19.md` is approved
* confirm audit contract is approved
* confirm Sprint 18 is merged/closed/present in `main`
* inspect existing logger implementation
* inspect existing metrics implementation
* inspect existing health controller
* inspect app server/middleware structure
* inspect safe readiness support in database and Redis infrastructure
* identify minimal instrumentation points

Acceptance criteria:

* implementation packet exists before coding
* included/excluded scope is confirmed
* exact files to edit are identified before implementation
* no runtime edits occur before gate confirmation
* no Sprint 20/key-rotation work is included

---

### Task 99 - Structured Logging Normalization

Goal:

* normalize structured logging fields and secret-safe logging behavior.

Required behavior:

* maintain or implement structured log primitive
* support safe common fields:

  * `requestId`
  * `correlationId`
  * `module`
  * `operation`
  * `outcome`
  * `reasonCode`
  * `statusCode`
  * `durationMs`
  * `eventType`
  * `errorName`
  * `errorCode`
* reject, drop, or sanitize unsafe fields deterministically
* avoid arbitrary object dumps
* avoid full request/response body logging
* avoid raw error object logging if unsafe

Forbidden log content:

* password
* password hash
* access token
* ID Token
* refresh token
* authorization code
* code verifier
* client secret
* client secret hash
* private key material
* session cookie
* CSRF token
* full authorization header
* full request body
* full response body
* full database record

Acceptance criteria:

* logger outputs bounded structured logs
* unsafe fields are not logged
* no `console.log` is introduced
* logger infrastructure contains no business workflow

---

### Task 100 - Request Correlation Baseline

Goal:

* add request/correlation id baseline at app layer.

Required behavior:

* generate request id when absent
* accept only safe incoming correlation id if supported
* regenerate or sanitize unsafe incoming correlation id
* attach safe request context for downstream logging/metrics if existing patterns allow
* include request/correlation id in request lifecycle logs
* do not log request body
* do not log authorization header
* do not log cookies

Allowed file areas:

* `src/app`
* existing middleware structure if present

Rules:

* middleware must not authenticate users
* middleware must not authorize admin actions
* middleware must not inspect token/session/client state
* middleware must not mutate domain state
* middleware must not parse credentials for observability

Acceptance criteria:

* request id exists for each request
* unsafe correlation input is handled deterministically
* request context is safe and bounded
* no business behavior changes

---

### Task 101 - Metrics Baseline

Goal:

* implement or normalize metrics primitives and safe metric output.

Required behavior:

* counter primitive
* gauge primitive if needed
* histogram primitive if needed
* safe label allowlist
* deterministic rejection/drop/sanitization of unsafe labels
* request count metric
* request duration metric if feasible
* error count metric
* readiness status metric if feasible
* metrics endpoint if implementation packet approves it

Allowed labels:

* `method`
* `route`
* `status_class`
* `module`
* `operation`
* `outcome`
* `event_type`
* `dependency`
* `grant_type` if controlled vocabulary
* `scope_group` if bounded and non-PII

Forbidden labels:

* email
* raw IP
* user agent
* `sub`
* `adminSub`
* request id
* correlation id
* access token
* refresh token
* ID Token
* authorization code
* code verifier
* client secret
* session id
* token family id
* raw redirect URI
* arbitrary error message
* arbitrary user input

Acceptance criteria:

* metrics primitives exist and are usable
* labels are bounded
* metrics do not expose secrets or PII
* metrics infrastructure contains no business workflow
* `/metrics`, if implemented, exposes aggregate metrics only

---

### Task 102 - Health / Readiness Refinement

Goal:

* refine health and readiness behavior safely.

Required behavior:

* health endpoint returns safe service availability status
* readiness endpoint returns safe dependency readiness if approved
* MongoDB readiness check if supported safely
* Redis readiness check if supported safely
* dependency errors are summarized safely
* checks are bounded and fast
* checks do not mutate state

Allowed response fields:

* `status`
* `timestamp`
* `service`
* `version` if already safe
* `uptime` if safe
* dependency status summary

Forbidden response fields:

* connection strings
* env vars
* raw config
* raw dependency errors
* stack traces
* tokens
* credentials
* user/client/audit data

Acceptance criteria:

* `/health` remains safe
* `/ready`, if implemented, reports dependency readiness safely
* no secrets or internals are exposed
* health module does not mutate dependency state

---

### Task 103 - Safe Minimal Instrumentation

Goal:

* add minimal approved instrumentation at selected operational boundaries.

Allowed instrumentation points:

* app request lifecycle
* centralized error handling if existing pattern supports it
* health/readiness result
* audit record outcome
* admin operation outcome
* selected OIDC authorization/token/client/session outcome counters where safe

Rules:

* do not instrument every module broadly
* do not instrument every repository method
* do not wrap all services generically
* do not change business outcomes
* do not add instrumentation that requires secrets
* do not log full payloads
* do not emit high-cardinality metric labels

Acceptance criteria:

* instrumentation is minimal and documented
* no domain behavior changes
* no secret leakage
* no high-cardinality labels by default
* instrumentation remains traceable to contract

---

### Task 104 - Sprint 19 Validation and Report

Goal:

* validate Sprint 19 implementation and record evidence.

Required report:

* `docs/planning/reports/phase-06-sprint-19-report.md`

Report must include:

* execution summary
* source-of-truth basis
* implemented tasks
* files created or updated
* validation evidence
* manual validation matrix
* excluded scope confirmation
* metrics endpoint decision
* readiness endpoint decision
* instrumentation scope decision
* risks, limitations, deferred work
* handoff to Sprint 20

Acceptance criteria:

* validation commands are run or explicitly marked NOT RUN with reason
* manual checks are documented
* global format drift, if present, is documented consistently
* scoped touched-file formatting is verified if global format check fails
* report confirms no raw secret logging
* report confirms no unsafe metric labels
* report confirms no domain behavior changes
* report does not claim unsupported observability behavior

---

## X. Allowed Dependencies

Logger infrastructure may depend on:

* existing logger library already used by project
* `src/config` normalized configuration
* generic TypeScript types
* no domain modules

Metrics infrastructure may depend on:

* existing metrics utility/library already used by project
* generic TypeScript types
* no domain modules

Health module may depend on:

* safe infrastructure readiness primitives
* `src/infrastructure/database`
* `src/infrastructure/redis`
* `src/infrastructure/logger` only if needed for safe status
* `src/infrastructure/metrics` only if needed for safe status
* `src/shared/errors` if existing patterns require it

App layer may depend on:

* logger primitive
* metrics primitive
* request correlation middleware/helper
* health controller
* approved module controllers already wired by the server

Participating modules may depend on:

* logger primitive
* metrics primitive

Only where explicitly approved by implementation packet and without changing domain ownership.

---

## XI. Forbidden Dependencies

`src/infrastructure/logger` must not depend on:

* `users`
* `auth`
* `verification`
* `password-reset`
* `oidc`
* `admin`
* `audit`
* module repositories
* module models
* raw request business payloads

`src/infrastructure/metrics` must not depend on:

* `users`
* `auth`
* `verification`
* `password-reset`
* `oidc`
* `admin`
* `audit`
* module repositories
* module models
* business workflow services

`src/modules/health` must not depend on:

* user repository/model
* OIDC token/session/client repositories
* audit repository/model
* admin internals
* auth credential validation logic

Sprint 19 must not introduce:

* external monitoring vendor SDKs unless explicitly approved
* SIEM pipeline dependencies
* tracing dependencies
* new business module for observability
* direct `process.env` outside `src/config`

---

## XII. Security-Critical Rules

Sprint 19 must enforce:

* no raw password logging
* no password hash logging
* no raw access token logging
* no raw ID Token logging
* no raw refresh token logging
* no refresh token hash logging
* no authorization code logging
* no code verifier logging
* no client secret logging
* no client secret hash logging
* no private key logging
* no session cookie logging
* no CSRF token logging
* no full authorization header logging
* no full request body logging
* no full response body logging
* no full database record logging
* no PII metric labels
* no secret metric labels
* no high-cardinality metric labels by default
* no business workflow logic in infrastructure
* no domain behavior changes for observability
* no `process.env` direct use outside config
* no `console.log`
* readiness must not expose secrets or raw internals

---

## XIII. Required Validation Commands

Run:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
rg -n "password|password_hash|passwordHash|client_secret|clientSecret|refresh_token|access_token|id_token|authorization_code|code_verifier|code_challenge|private.*key|BEGIN PRIVATE KEY|session.*cookie|authorization.*header|csrf" src/infrastructure src/modules src/app
rg -n "logger\\.|metrics\\.|recordMetric|increment|observe|counter|gauge|histogram" src
rg -n "req\\.body|request\\.body|body:" src/infrastructure src/modules src/app
rg -n "email|userAgent|ip|sub|adminSub|clientId|requestId|correlationId" src/infrastructure src/modules src/app
```

If metrics route is implemented, also run:

```bash
rg -n "GET /metrics|/metrics|metrics" src/app src/modules src/infrastructure
```

If readiness checks are implemented, also run:

```bash
rg -n "ready|readiness|health|ping" src/modules/health src/infrastructure
```

Expected interpretation:

* secret-related matches require review and must not show raw secret logging or metric labels.
* `logger` / `metrics` matches must confirm instrumentation does not introduce domain behavior into infrastructure.
* body-related matches must confirm full request/response body is not logged.
* identity/correlation matches must confirm values are safe, bounded, or not used as high-cardinality metric labels.
* readiness matches must confirm dependency checks are bounded and non-mutating.

---

## XIV. Manual Validation Checks

Sprint 19 must manually validate:

1. Request id is generated when absent.
2. Correlation id is generated or safely accepted when present.
3. Unsafe incoming correlation id is rejected, sanitized, or replaced.
4. Request logs include safe request/correlation id.
5. Request logs do not include request body.
6. Request logs do not include authorization header.
7. Request logs do not include cookies.
8. Request logs do not include tokens.
9. Request logs do not include client secret.
10. Error logs include safe error code/reason.
11. Error logs do not expose raw stack traces unless sanitized and approved.
12. Logger does not use arbitrary object dumps.
13. Metrics counters increment for approved request lifecycle events.
14. Metrics duration tracking works if implemented.
15. Metrics labels are bounded.
16. Metrics labels do not include email.
17. Metrics labels do not include raw IP.
18. Metrics labels do not include user agent.
19. Metrics labels do not include `sub` or `adminSub` by default.
20. Metrics labels do not include request id or correlation id.
21. Metrics labels do not include raw client id unless explicitly accepted and bounded.
22. Metrics labels do not include raw redirect URI.
23. Metrics labels do not include tokens or secrets.
24. `/metrics`, if implemented, returns aggregate metrics only.
25. `/metrics`, if implemented, does not expose env/config secrets.
26. `/health` returns safe service availability status.
27. `/health` does not expose dependency internals.
28. `/ready`, if implemented, reports MongoDB readiness safely.
29. `/ready`, if implemented, reports Redis readiness safely.
30. Readiness checks are bounded and do not mutate data.
31. Audit outcome instrumentation does not log full audit payload.
32. Audit outcome instrumentation does not log forbidden metadata.
33. Admin instrumentation does not log raw password or raw client secret.
34. OIDC instrumentation does not log tokens.
35. OIDC instrumentation does not log authorization codes.
36. OIDC instrumentation does not log code verifier.
37. OIDC instrumentation does not log session cookie.
38. OIDC instrumentation does not log client secret.
39. Logger infrastructure contains no business workflow.
40. Metrics infrastructure contains no business workflow.
41. Health module does not mutate dependency state.
42. No broad instrumentation across unrelated modules was introduced.
43. No token issuance behavior was changed.
44. No refresh token lifecycle behavior was changed.
45. No session lifecycle behavior was changed.
46. No client lifecycle behavior was changed.
47. No key rotation behavior was introduced.
48. No external monitoring vendor integration was introduced.
49. No SIEM pipeline was introduced.
50. Sprint 19 report records exact validation evidence.

---

## XV. Branch and Commit Guidance

Recommended runtime branch:

* `feature/observability-sprint19-hardening`

Commit message guidance:

* `feat(observability): implement Sprint 19 hardening`

If split commits are needed, acceptable messages include:

* `feat(logger): normalize structured logging`
* `feat(metrics): add safe metrics baseline`
* `feat(health): refine readiness reporting`
* `docs(planning): add Sprint 19 validation report`

All commits must remain within Sprint 19 scope.

Do not commit unrelated formatting cleanup.

---

## XVI. Handoff Target

Sprint 19 hands off to:

* Sprint 20 - JWKS / Key Rotation Hardening

Sprint 20 may reuse safe logger, metrics, request correlation, and readiness patterns introduced by Sprint 19. Sprint 20 must still define JWKS/signing-key lifecycle through its own approved key-rotation contract before runtime implementation.
