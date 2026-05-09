# eTroy OIDC - Observability Contract

---

## I. Contract Summary

* Contract: Observability Contract
* Phase: Phase 06 - Platform and Governance Hardening
* Primary Sprint: Sprint 19 - Observability Hardening
* Owner Layers:

  * `src/infrastructure/logger`
  * `src/infrastructure/metrics`
  * `src/modules/health`
* Participating Areas:

  * `src/app`
  * `src/modules/users`
  * `src/modules/auth`
  * `src/modules/verification`
  * `src/modules/password-reset`
  * `src/modules/oidc`
  * `src/modules/admin`
  * `src/modules/audit`
* Primary Assignment: `docs/planning/assignments/phase-06-sprint-19.md`
* Contract Path: `docs/contracts/observability/observability-contract.md`
* Status: Approved for Sprint 19 runtime implementation

---

## II. Purpose

This contract defines the approved observability hardening boundary for eTroy OIDC.

Sprint 19 improves operational visibility through structured logging, metrics, request correlation, and health/readiness reporting without leaking secrets, changing domain behavior, or moving business logic into infrastructure.

This contract exists to ensure observability is:

* structured
* bounded
* secret-safe
* traceable
* useful for operational monitoring
* aligned with module boundaries
* safe against infrastructure business-logic drift
* safe against high-cardinality or sensitive metric labels

Phase 06 explicitly includes observability hardening through structured logs and metrics, health/readiness review, and security-relevant monitoring coverage.  The architecture requires infrastructure to remain an integration layer and not absorb business workflow ownership. 

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
* `docs/planning/assignments/phase-06-sprint-19.md`
* `docs/planning/reports/phase-06-sprint-18-report.md`
* `docs/governance/git-rules.md`
* `docs/governance/pr-template.md`
* `docs/governance/review-checklist.md`
* `docs/governance/anti-patterns.md`

Authority rules:

* `docs/` is authoritative.
* `agent/` is operational support only.
* `source-tree.md` is the primary physical structure contract.
* `detailed-source-tree.md` is supporting reference only.
* If this contract conflicts with architecture documents, architecture documents win unless an approved architecture update is included.
* Sprint 19 runtime implementation may begin only after Sprint 18 is merged, closed, and present in `main`.
* Sprint 19 runtime implementation must begin from updated `main` on a dedicated Sprint 19 feature branch.
* Sprint 19 implementation must not exceed this contract and its sprint assignment.

The source-of-truth model states that `docs/` is authoritative, `agent/` cannot override approved documents, and `source-tree.md` wins over `detailed-source-tree.md` on structure conflicts. 

---

## IV. Contract Scope

### Included

Sprint 19 includes:

* structured logging field normalization
* request/correlation id baseline
* request lifecycle logging if approved by implementation packet
* safe operational error logging
* no-secret logging policy enforcement
* metrics primitive normalization
* metrics endpoint exposure if approved by implementation packet
* request lifecycle metrics
* error-rate metrics
* health endpoint refinement
* readiness endpoint refinement
* MongoDB readiness check if existing infrastructure supports it or can be extended safely
* Redis readiness check if existing infrastructure supports it or can be extended safely
* audit record outcome counters if safe
* admin action counters if safe
* OIDC/client/token/session counters if safe and non-secret
* bounded instrumentation in selected modules only
* Sprint 19 validation and report evidence

### Excluded

Sprint 19 excludes:

* external monitoring vendor integration
* SIEM pipeline implementation
* distributed tracing
* full observability platform rollout
* log shipping infrastructure
* dashboard UI
* audit dashboard
* business workflow logic inside `logger`
* business workflow logic inside `metrics`
* changing business behavior to satisfy logging or metrics
* changing token issuance semantics
* changing refresh token lifecycle
* changing session lifecycle
* changing client lifecycle behavior
* changing user identity behavior
* broad instrumentation across all modules
* high-cardinality metric labels
* logging secrets
* logging raw tokens
* logging raw client secrets
* logging authorization codes
* logging session cookies
* logging private key material
* logging full request or response bodies
* exposing PII through metric labels
* JWKS/key rotation behavior
* security hardening checklist beyond observability-specific secret-safety controls

---

## V. Ownership Boundary

### 1. Logger Infrastructure Ownership

`src/infrastructure/logger` owns:

* logger initialization
* logger configuration normalization through config boundary
* structured log output primitive
* common safe log fields
* logger adapter behavior
* redaction-safe logging helper behavior if implemented

`logger` must not own:

* domain business decisions
* authentication decisions
* OIDC protocol decisions
* user mutation decisions
* client lifecycle decisions
* audit persistence
* metrics business semantics

### 2. Metrics Infrastructure Ownership

`src/infrastructure/metrics` owns:

* metrics primitives
* counter/gauge/histogram helpers if implemented
* metric naming normalization
* metric label allowlist behavior
* metrics endpoint output formatting if implemented

`metrics` must not own:

* domain business decisions
* token/session/client lifecycle decisions
* user identity mutation
* audit persistence
* authorization rules
* incident response policy

### 3. Health Module Ownership

`src/modules/health` owns:

* health endpoint response mapping
* readiness endpoint response mapping if implemented
* dependency readiness aggregation if approved
* safe status reporting

`health` must not:

* mutate dependency state
* perform recovery actions
* expose connection strings
* expose secrets
* expose raw config
* expose database internals
* perform deep diagnostics beyond approved readiness checks

### 4. Participating Module Responsibility

Participating modules may emit approved logs/metrics only at contract-backed points.

Participating modules remain owners of their own business decisions.

Examples:

* `auth` decides login success/failure.
* `oidc` decides token/client/session outcomes.
* `admin` decides admin orchestration outcome.
* `audit` records audit persistence outcome.

Logger and metrics only record safe operational signals.

---

## VI. Structured Logging Contract

### 1. Required Log Shape

Structured logs should use a bounded common field model.

Allowed common fields:

* `level`
* `message`
* `timestamp`
* `requestId`
* `correlationId`
* `method`
* `path`
* `statusCode`
* `durationMs`
* `module`
* `operation`
* `outcome`
* `reasonCode`
* `clientId`
* `sub`
* `adminSub`
* `eventType`
* `errorName`
* `errorCode`

Rules:

* fields must be explicit and bounded
* fields must not include raw request body
* fields must not include raw response body
* fields must not include raw headers
* fields must not include cookies
* fields must not include authorization header
* fields must not include tokens or secrets
* logs must not use arbitrary object dumps

### 2. Required Log Levels

Approved log levels:

* `debug`
* `info`
* `warn`
* `error`

Usage guidance:

* `info`: expected lifecycle or request-level operational event
* `warn`: rejected/denied/suspicious but controlled condition
* `error`: unexpected failure or dependency failure
* `debug`: local/development diagnostic only if safe and bounded

### 3. Forbidden Log Content

Logs must never contain:

* password
* password hash
* raw access token
* raw ID Token
* raw refresh token
* refresh token hash
* authorization code
* code verifier
* client secret
* client secret hash
* private key material
* session cookie
* CSRF token
* email verification token
* password reset token
* full authorization header
* full request body
* full response body
* full database record
* unbounded error stack unless sanitized and explicitly approved

The audit contract already forbids these classes of secret material in audit records and metadata; Sprint 19 must apply equivalent or stricter rules to logs and metrics. 

### 4. Error Logging Rules

Error logs may include:

* safe error name
* safe error code
* reason code
* module
* operation
* requestId
* correlationId
* sanitized message

Error logs must not include:

* raw exception objects if they contain request/config/secrets
* raw stack traces unless sanitized and approved
* persistence internals that reveal secrets
* full query input
* full request input

---

## VII. Request Correlation Contract

### 1. Purpose

Request correlation links logs, metrics, audit events, and operational traces without exposing sensitive data.

### 2. Approved Correlation Fields

Allowed fields:

* `requestId`
* `correlationId`

Optional if already safe and approved by implementation:

* internal `sessionId`
* internal `tokenFamilyId`
* `clientId`
* `sub`
* `adminSub`

Rules:

* generated ids must not be derived from secrets
* correlation id must not be derived from raw token, cookie, authorization code, client secret, or password
* incoming correlation id must be validated or regenerated if unsafe
* correlation fields must be propagated in request context only where safe
* correlation must not become business state

### 3. Middleware Placement

Sprint 19 may add request correlation middleware in the app/delivery layer.

Allowed file areas:

* `src/app`
* existing middleware area if present
* minimal server wiring if required

Rules:

* middleware may assign `requestId` and `correlationId`
* middleware may attach safe request context for downstream logging
* middleware must not authenticate users
* middleware must not authorize admin actions
* middleware must not inspect or mutate token/session/client state
* middleware must not log request body

---

## VIII. Metrics Contract

### 1. Metric Types

Approved metric types:

* counter
* gauge
* histogram

Implementation may remain lightweight if the existing metrics infrastructure is minimal.

### 2. Metric Naming Rules

Metric names must be:

* stable
* lowercase
* namespaced
* descriptive
* free of user input

Recommended prefixes:

* `http_`
* `oidc_`
* `auth_`
* `admin_`
* `audit_`
* `health_`
* `system_`

### 3. Approved Metric Categories

Sprint 19 may include:

* HTTP request count
* HTTP request duration
* HTTP error count
* auth login outcome count if safe
* OIDC authorization outcome count if safe
* OIDC token outcome count if safe
* OIDC client lifecycle outcome count if safe
* admin action outcome count if safe
* audit record outcome count if safe
* health/readiness status
* dependency readiness status

### 4. Metric Label Rules

Allowed labels:

* `method`
* `route`
* `status_class`
* `module`
* `operation`
* `outcome`
* `event_type`
* `dependency`
* `client_type` only if bounded and not user input
* `grant_type` only if approved vocabulary
* `scope_group` only if bounded and non-PII

Forbidden labels:

* email
* raw IP address
* user agent
* `sub`
* `adminSub`
* raw `clientId` if high-cardinality risk is not explicitly accepted
* access token
* ID Token
* refresh token
* authorization code
* code verifier
* client secret
* session id
* token family id
* password
* request path with arbitrary ids
* full redirect URI
* arbitrary error message
* arbitrary user input

### 5. High-Cardinality Rule

Metrics must not use labels with unbounded cardinality.

Examples of high-cardinality values:

* user id / subject
* admin subject
* client id at large scale
* request id
* correlation id
* raw path with identifiers
* raw error message
* raw redirect URI
* email
* IP address
* user agent

If client-level monitoring is required later, it must be approved in a separate observability expansion or security operations contract.

---

## IX. Metrics Endpoint Contract

Sprint 19 may expose a metrics endpoint if implementation confirms it fits the existing app structure.

Recommended endpoint:

* `GET /metrics`

Rules:

* endpoint must not expose secrets
* endpoint must not expose raw PII
* endpoint must not expose raw tokens
* endpoint must not expose raw client secrets
* endpoint must not expose raw authorization codes
* endpoint must not expose raw cookies
* endpoint must not expose environment values
* endpoint must not expose database connection strings
* endpoint must not expose private key material
* endpoint should expose only aggregated metrics
* endpoint must not mutate application state

Access rule:

* Sprint 19 may treat `/metrics` as internal operational endpoint.
* If public exposure risk exists and no access control exists, document the limitation in the report and keep endpoint internal-only or avoid route exposure.

---

## X. Health / Readiness Contract

### 1. Health Endpoint

Health endpoint purpose:

* report process-level service availability

Allowed response fields:

* `status`
* `timestamp`
* `service`
* `version` if already safe
* `uptime` if safe

Forbidden response fields:

* secrets
* env vars
* connection strings
* raw dependency errors
* stack traces
* tokens
* user/client/audit data

### 2. Readiness Endpoint

Readiness endpoint purpose:

* report whether the service is ready to handle requests.

Allowed dependency checks:

* MongoDB readiness
* Redis readiness
* logger readiness if meaningful
* metrics readiness if meaningful

Rules:

* checks must be bounded and fast
* checks must not mutate data
* checks must not perform deep diagnostics
* checks must not expose credentials
* dependency errors must be summarized safely
* readiness failure should be operationally clear but not leak internals

### 3. Dependency Check Ownership

Dependency check primitives belong in the relevant infrastructure adapter if needed.

Examples:

* database ping inside `src/infrastructure/database`
* Redis ping inside `src/infrastructure/redis`

Health module may call these primitives and aggregate safe statuses.

Health module must not directly access raw low-level client internals if a safe infrastructure abstraction exists.

---

## XI. Approved Instrumentation Points

Sprint 19 allows limited instrumentation only.

Approved points:

* request lifecycle in app layer
* health/readiness result
* audit service record outcome
* admin operation outcome at orchestration boundary
* OIDC authorization/token/client/session outcome counters where safe and minimal
* error boundary or centralized error handling if existing pattern supports it

Not approved:

* broad instrumentation in every function
* logging every request body
* logging every response body
* adding metrics to every repository method
* changing domain flows to emit metrics
* wrapping all services with generic instrumentation
* adding runtime behavior that changes outcomes

Instrumentation must be minimal, safe, and explicitly documented in Sprint 19 report.

---

## XII. Module-Specific Observability Rules

### 1. `auth`

May record safe metrics/logs for:

* login success/failure count
* current password verification outcome count

Must not log:

* password
* password hash
* email unless masked or explicitly approved
* credential input

### 2. `users`

May record safe metrics/logs for:

* user creation outcome
* profile update outcome
* password change outcome

Must not log:

* password
* password hash
* full user object
* email unless masked or explicitly approved

### 3. `oidc`

May record safe metrics/logs for:

* authorization accepted/denied counts
* token issued/failure counts
* refresh rotation/reuse detection counts
* session created/reused/invalidated counts
* logout outcome counts
* client validation outcome counts
* client lifecycle outcome counts

Must not log:

* access token
* ID Token
* refresh token
* authorization code
* code verifier
* code challenge unless policy explicitly allows
* client secret
* client secret hash
* session cookie
* full redirect URI containing sensitive query parameters

### 4. `admin`

May record safe metrics/logs for:

* admin user operation outcome
* admin client operation outcome
* denied admin action outcome if already represented safely

Must not log:

* raw password
* raw client secret
* password hash
* client secret hash
* full request body
* full user/client object

### 5. `audit`

May record safe metrics/logs for:

* audit event recorded
* audit event rejected
* audit event failed

Must not log:

* full audit payload
* forbidden metadata
* raw event input if rejected
* secrets that redaction was supposed to remove

---

## XIII. Privacy and PII Rules

Default position:

* do not log or label PII unless explicitly required and bounded.

High-risk PII includes:

* email address
* raw IP address
* full user agent
* user subject at high cardinality
* admin subject at high cardinality
* full name
* avatar URL if it can reveal identity
* raw redirect URI if it includes user-specific parameters

Allowed safe alternatives:

* reason code
* status class
* operation
* outcome
* module
* bounded event type
* masked email if already approved
* aggregate counters
* dependency name

---

## XIV. Security and Redaction Rules

Sprint 19 must enforce:

* no raw secret logging
* no raw token metrics
* no secret metric labels
* no full request body logging
* no full response body logging
* no arbitrary object logging
* no unbounded metadata logging
* no high-cardinality labels by default
* no `process.env` direct use outside `src/config`
* no `console.log`
* no business logic in infrastructure
* no module ownership bypass for observability

If forbidden content reaches a logger or metrics function, implementation should either:

* reject the field
* drop the field
* sanitize the field
* replace with a fixed marker such as `[REDACTED]`

Selected behavior must be deterministic and documented in Sprint 19 report.

---

## XV. API / Route Exposure Decision

Sprint 19 may expose:

* health endpoint if already present or safely implemented
* readiness endpoint if safely implemented
* metrics endpoint if safely implemented

Recommended routes, subject to existing server patterns:

* `GET /health`
* `GET /ready`
* `GET /metrics`

Rules:

* controllers/handlers must remain thin
* route handlers must not contain business logic
* `/metrics` must expose aggregated metrics only
* `/health` and `/ready` must not expose secrets or raw dependency internals
* route wiring must stay in approved app/server structure
* no admin dashboard UI is introduced

---

## XVI. Validation Requirements

Sprint 19 implementation must run or explicitly report inability to run:

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

Expected interpretation:

* secret-related matches require review and must not show raw secret logging or metric labels.
* `logger` / `metrics` matches must confirm instrumentation does not introduce domain behavior into infrastructure.
* body-related matches must confirm full request/response body is not logged.
* identity/correlation matches must confirm values are either safe, bounded, or not used as high-cardinality metric labels.

If metrics route is implemented, also run:

```bash
rg -n "GET /metrics|/metrics|metrics" src/app src/modules src/infrastructure
```

If readiness checks are implemented, also run:

```bash
rg -n "ready|readiness|health|ping" src/modules/health src/infrastructure
```

---

## XVII. Manual Validation Requirements

Sprint 19 must manually validate:

1. Request correlation id is generated when absent.
2. Unsafe incoming correlation id is rejected, sanitized, or replaced.
3. Request logs include safe request/correlation id.
4. Request logs do not include request body.
5. Request logs do not include authorization header.
6. Request logs do not include cookies.
7. Request logs do not include tokens.
8. Request logs do not include client secret.
9. Error logs include safe error code/reason.
10. Error logs do not expose raw stack traces unless sanitized and approved.
11. Metrics counters increment for approved request lifecycle events.
12. Metrics labels are bounded.
13. Metrics labels do not include email.
14. Metrics labels do not include raw IP.
15. Metrics labels do not include user agent.
16. Metrics labels do not include subject/admin subject by default.
17. Metrics labels do not include request id or correlation id.
18. Metrics labels do not include raw client id unless explicitly accepted and bounded.
19. Metrics labels do not include raw redirect URI.
20. Metrics labels do not include tokens or secrets.
21. `/metrics`, if implemented, returns aggregate metrics only.
22. `/metrics`, if implemented, does not expose env/config secrets.
23. `/health` returns safe service availability status.
24. `/health` does not expose dependency internals.
25. `/ready`, if implemented, reports MongoDB readiness safely.
26. `/ready`, if implemented, reports Redis readiness safely.
27. Readiness checks are bounded and do not mutate data.
28. Audit outcome instrumentation does not log full audit payload.
29. Admin instrumentation does not log raw password or raw client secret.
30. OIDC instrumentation does not log tokens, authorization codes, code verifier, session cookie, or client secret.
31. Logger infrastructure contains no business workflow.
32. Metrics infrastructure contains no business workflow.
33. Health module does not mutate dependency state.
34. No broad instrumentation across unrelated modules was introduced.
35. No token/session/client lifecycle behavior was changed.
36. No key rotation behavior was introduced.
37. Sprint 19 report records exact validation evidence.

---

## XVIII. Merge-Blocking Conditions

Sprint 19 must be blocked or rejected if any of the following occurs:

* `observability-contract.md` is missing
* `phase-06-sprint-19.md` is missing
* Sprint 18 is not merged/closed/present in `main`
* runtime begins from outdated `main`
* logger logs raw password
* logger logs raw token
* logger logs raw client secret
* logger logs authorization code
* logger logs session cookie
* logger logs full request body
* logger logs full response body
* metrics labels include secrets
* metrics labels include high-cardinality identifiers without approval
* `/metrics` exposes secrets or PII
* `/health` or `/ready` exposes connection strings or raw config
* infrastructure contains business workflow logic
* shared layer receives module-specific observability workflow
* instrumentation changes domain behavior
* token/session/client lifecycle behavior changes without approved contract
* external monitoring vendor integration is introduced
* SIEM pipeline is introduced
* distributed tracing is introduced without approval
* broad unrelated refactor is included
* validation evidence is missing
* PR lacks exact source-of-truth references

The merge-blocking checklist already requires traceability, source-of-truth alignment, architecture compliance, validation evidence, and security review before approval. 

---

## XIX. Handoff

Sprint 19 hands off to:

* Sprint 20 - JWKS / Key Rotation Hardening

Sprint 20 may use the structured logging, metrics primitives, request correlation, and safe health/readiness patterns introduced by Sprint 19. Sprint 20 must still define key lifecycle behavior through its own approved key rotation contract before runtime implementation.
