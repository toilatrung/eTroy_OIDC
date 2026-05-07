# Phase 06 / Sprint 16 - Audit Logging Foundation

---

## I. Assignment Summary

- Phase: Phase 06 - Platform and Governance Hardening

- Sprint: Sprint 16 - Audit Logging Foundation

- Task Range:
  - Task 78 - Audit Contract Alignment
  - Task 79 - Audit Event Schema and Model
  - Task 80 - Audit Repository
  - Task 81 - Audit Service
  - Task 82 - Audit Event Producer Integration
  - Task 83 - Audit Query Boundary
  - Task 84 - Sprint 16 Validation and Report

- Owner Module: `src/modules/audit`

- Branch Name: `feature/audit-sprint16-foundation`

- Status: Approved (in this PR)

- Sprint 16 runtime status: NOT STARTED

- Sprint 16 runtime gate: will be unblocked after this PR is merged; runtime implementation remains not started and must occur on a separate Sprint 16 feature branch.

---

## II. Objective

Implement the audit logging foundation for security-relevant system events.

Sprint 16 must establish `modules/audit` as the single owner of audit event persistence and audit recording contracts. It must provide a controlled, append-only audit event mechanism that other approved modules can call through a service boundary.

Sprint 16 must support the Phase 06 production-readiness objective by making security-relevant actions traceable without leaking secrets, duplicating business logic, or mutating domain state owned by other modules.

Sprint 16 must not implement admin controls, OIDC client management, observability hardening, JWKS/key rotation, or final security hardening. Those belong to later Phase 06 sprints.

---

## III. Source-of-Truth Basis

Sprint 16 must follow:

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
- `docs/planning/assignments/phase-06-sprint-16.md`
- `docs/planning/reports/phase-05-consolidated-report.md`
- `docs/governance/git-rules.md`
- `docs/governance/pr-template.md`
- `docs/governance/review-checklist.md`
- `docs/governance/anti-patterns.md`

Authority rules:

- `docs/` is authoritative.
- `agent/` is operational support only.
- `source-tree.md` is the primary physical structure contract.
- `detailed-source-tree.md` is supporting reference only.
- `audit-event-contract.md` governs Sprint 16 audit event shape, redaction rules, persistence behavior, append-only policy, and query/read boundary.
- If this assignment conflicts with `audit-event-contract.md`, stop and resolve the contract conflict before implementation.
- If this assignment conflicts with architecture documents, architecture documents win unless an approved architecture update is included.
- No implementation may begin without an approved audit contract.

---

## IV. Prerequisites

Sprint 16 may start implementation only after:

- Phase 01 through Phase 05 are closed.
- Phase 06 planning is approved.
- `docs/contracts/audit/audit-event-contract.md` exists and is approved.
- Sprint 16 assignment is approved.
- Active branch is created from `main` or an approved baseline containing the Phase 05 closure state.
- The implementation packet confirms included scope, excluded scope, deliverables, allowed dependencies, forbidden dependencies, validation commands, and manual validation checks.

If `audit-event-contract.md` is missing, incomplete, or not approved on the merged baseline, stop before coding.
If this assignment is not approved on the merged baseline, stop before coding.

---

## V. Included Scope

Sprint 16 includes:

- audit event contract alignment
- audit event model
- audit event repository
- audit event service
- append-only audit event recording
- audit event category baseline
- audit event outcome baseline
- actor, subject, client, request, and correlation metadata support where approved by contract
- redaction-safe metadata handling
- bounded audit payload shape
- audit event creation API through service contract
- audit query/read interface only if approved by `audit-event-contract.md`
- minimal audit producer integration only where explicitly approved by this assignment and contract
- validation that audit module does not mutate business state
- validation that audit module does not persist or log raw secrets
- Sprint 16 report creation

---

## VI. Excluded Scope

Sprint 16 excludes:

- admin module controls
- admin dashboard UI
- admin authorization or role system
- OIDC client management
- OIDC client secret rotation
- JWKS/key rotation
- observability hardening across all modules
- external SIEM integration
- external log pipeline integration
- metrics expansion beyond audit-specific validation
- changing identity behavior
- changing auth credential validation behavior
- changing OIDC authorization/token/session/logout behavior
- changing refresh-token rotation, revoke, or introspection behavior
- changing password reset or email verification behavior
- direct user database access from audit
- direct OIDC token/session database access from audit
- audit-driven business state mutation
- audit-owned retry queue or background job unless separately approved
- broad repository-wide formatting cleanup
- new root-level directories
- new runtime module outside approved `src/modules/audit`

---

## VII. Expected Deliverables

### Contract / planning deliverables

Required:

- `docs/contracts/audit/audit-event-contract.md`
- `docs/planning/assignments/phase-06-sprint-16.md`
- `docs/planning/reports/phase-06-sprint-16-report.md`

Optional only if needed for navigation alignment:

- `docs/source-of-truth-index.md`
- `docs/README.md`
- `docs/planning/master-execution-plan.md`
- `agent/current-context.md`
- `agent/session-history.md`

### Implementation deliverables

Expected files:

- `src/modules/audit/audit-event.model.ts`
- `src/modules/audit/audit.repository.ts`
- `src/modules/audit/audit.service.ts`

Optional file only if query/read API is approved:

- `src/modules/audit/audit.controller.ts`

Optional supporting files only if consistent with existing project style and contract:

- `src/modules/audit/audit.types.ts`
- `src/modules/audit/audit.validator.ts`

Do not create a new root-level audit folder.

Do not place audit workflow logic in `shared`.

Do not place audit workflow logic in `infrastructure`.

---

## VIII. Task Details

### Task 78 - Audit Contract Alignment

#### Objective

Confirm Sprint 16 contract basis before coding.

#### Required work

- read all required source-of-truth documents
- confirm Phase 01 through Phase 05 are closed
- confirm Phase 06 is active for planning and contract-backed execution only
- confirm `docs/contracts/audit/audit-event-contract.md` exists and is approved
- inspect current `src/modules/audit` state
- inspect current `src/infrastructure/logger` state
- inspect current `src/infrastructure/database` state
- inspect current shared error conventions
- identify the minimal implementation needed for audit event model, repository, and service
- identify whether audit query/read API is approved
- identify whether any producer integration is approved in this sprint
- stop before coding if event schema, redaction rules, persistence policy, append-only rule, or query boundary is unclear

#### Acceptance criteria

- implementation packet exists before coding
- audit contract is approved and referenced
- Sprint 16 included and excluded scope are clear
- no runtime implementation starts from planning assumptions alone
- ambiguous audit behavior is reported before coding

---

### Task 79 - Audit Event Schema and Model

#### Objective

Implement the audit event persistence model according to the approved audit contract.

#### Required work

- create or update audit event model under `src/modules/audit`
- define only contract-approved fields
- enforce required fields where appropriate
- support event identity
- support event type/category
- support event severity
- support event outcome
- support actor reference
- support subject reference
- support client reference where applicable
- support request/correlation metadata where approved
- support bounded metadata object where approved
- support created timestamp
- prevent arbitrary unbounded object dumps
- avoid storing raw secrets or sensitive credential/token values

#### Candidate event fields

Use only if approved by contract:

- `eventId`
- `eventType`
- `category`
- `severity`
- `outcome`
- `actor`
- `subject`
- `client`
- `request`
- `correlationId`
- `reasonCode`
- `metadata`
- `occurredAt`
- `createdAt`

#### Forbidden model behavior

The model must not store:

- raw password
- password hash unless explicitly approved and justified
- raw access token
- raw ID Token
- raw refresh token
- refresh token hash unless explicitly approved and justified
- authorization code
- code verifier
- client secret
- private key material
- session cookie value
- CSRF token raw value
- email verification token
- password reset token
- full request body
- full response body
- full authorization header

#### Acceptance criteria

- audit event model exists
- model fields match approved contract
- model is bounded and explicit
- no raw secrets are persisted
- model does not reference or embed full domain objects
- model does not own user, token, session, client, password-reset, or verification state

---

### Task 80 - Audit Repository

#### Objective

Implement audit persistence access behind the audit repository layer.

#### Required work

- create `src/modules/audit/audit.repository.ts`
- implement append-only audit event creation
- expose only contract-approved read/query methods if query is approved
- keep persistence access local to audit repository
- avoid importing models/repositories from other modules
- avoid cross-domain mutation
- avoid update/delete operations for audit events unless contract explicitly approves narrow administrative retention behavior
- keep repository methods small and deterministic

#### Required repository behavior

At minimum, if approved by contract:

- append audit event
- read audit event by audit event ID
- query audit events with bounded filters

Query support must be omitted if not approved by contract.

#### Forbidden repository behavior

The audit repository must not:

- import `UserModel`
- import user repository
- import OIDC token/session/client models
- import auth internals
- mutate user data
- mutate session data
- mutate refresh-token data
- mutate client metadata
- mutate verification/password-reset lifecycle data
- implement business workflow decisions

#### Acceptance criteria

- audit repository exists
- audit persistence is behind repository boundary
- repository only owns audit records
- append-only behavior is preserved
- no cross-domain persistence access exists
- no audit event update/delete path exists unless explicitly contract-approved

---

### Task 81 - Audit Service

#### Objective

Implement the audit service as the only approved module-facing audit recording API.

#### Required work

- create `src/modules/audit/audit.service.ts`
- provide contract-approved audit record method
- normalize event input
- validate required fields
- enforce redaction-safe event shape
- reject or sanitize forbidden metadata fields
- call audit repository to persist events
- keep service independent from domain workflow ownership
- define failure behavior according to contract

#### Required service behavior

At minimum, if approved by contract:

- `recordEvent(...)`
- input normalization
- event type/category validation
- outcome validation
- metadata validation or sanitization
- safe persistence through repository

Optional only if approved:

- query method delegating to repository
- read method delegating to repository

#### Failure behavior

The contract must decide whether audit recording failure is:

- fail-open for non-critical events
- fail-closed for explicitly security-critical events
- mixed by event category

If the contract does not define failure behavior, stop before implementation.

#### Forbidden service behavior

The audit service must not:

- authenticate users
- issue tokens
- revoke tokens
- invalidate sessions
- update user profile or password
- manage OIDC clients
- inspect raw request bodies for business decisions
- own admin authorization
- own observability metrics beyond audit-specific behavior
- contain module-specific workflow logic from auth, users, oidc, admin, verification, or password-reset

#### Acceptance criteria

- audit service exists
- audit service is the module-facing record boundary
- audit service enforces contract-approved shape
- audit service prevents or sanitizes forbidden secret fields
- audit service does not mutate business state
- audit service failure behavior is explicit

---

### Task 82 - Audit Event Producer Integration

#### Objective

Integrate minimal audit event recording into approved existing flows only if contract and assignment explicitly allow it.

#### Required work

- identify approved producer modules
- integrate audit service calls only at approved boundaries
- keep producer modules as owners of their own business decisions
- ensure audit calls do not change functional behavior unless contract says audit failure is blocking
- ensure no raw secrets are sent into audit service
- ensure audit events are emitted after the owning module determines event outcome
- ensure event metadata is bounded and sanitized

#### Candidate producer events

Only implement if approved:

- login success
- login failure
- password change
- token issuance
- token revocation
- refresh-token reuse detection
- session created
- session reused
- session invalidated
- logout completed
- security validation failure

#### Recommended Sprint 16 limit

Sprint 16 should prioritize audit foundation. Producer integration should be minimal and limited to events explicitly listed in `audit-event-contract.md` and this assignment.

If broad producer integration would require touching many modules, defer it to later sprint-specific assignments.

#### Forbidden producer behavior

Producer integration must not:

- pass raw password
- pass raw token
- pass authorization code
- pass client secret
- pass full request body
- pass full response body
- pass session cookie value
- change existing auth/OIDC/session/token behavior
- introduce circular dependencies
- import audit repository directly

#### Acceptance criteria

- producer integration is limited and contract-backed
- producer modules call `audit.service` only
- no producer sends raw secrets
- existing domain behavior is unchanged
- no circular dependency is introduced
- broad event expansion is deferred if not explicitly approved

---

### Task 83 - Audit Query Boundary

#### Objective

Implement or explicitly defer audit read/query behavior based on contract approval.

#### Required work

- inspect `audit-event-contract.md` query/read boundary
- if query/read is approved:
  - implement bounded query filters
  - avoid unbounded event scans
  - avoid exposing raw metadata that contract marks internal
  - avoid public unauthenticated audit access
  - ensure controller exists only if route/API is approved

- if query/read is not approved:
  - do not create audit controller
  - do not create HTTP route
  - document deferral in Sprint 16 report

#### Candidate query filters

Use only if approved:

- `eventType`
- `category`
- `severity`
- `outcome`
- `actor.sub`
- `subject.type`
- `subject.id`
- `client.clientId`
- `correlationId`
- `occurredAt` range

#### Forbidden query behavior

Audit query must not:

- expose raw secrets
- expose internal token hashes unless explicitly approved
- expose full metadata blindly
- allow arbitrary Mongo query input
- allow unauthenticated public access
- become admin module implementation
- implement advanced dashboard behavior

#### Acceptance criteria

- query/read behavior matches contract
- if query is omitted, omission is documented
- no public unsafe audit access exists
- no arbitrary query injection exists
- controller is created only if approved

---

### Task 84 - Sprint 16 Validation and Report

#### Objective

Validate Sprint 16 implementation and record evidence.

#### Required work

- run static validation commands
- run boundary scans
- run security scans
- manually validate audit creation and redaction behavior
- document global `format:check` status accurately
- if global `format:check` fails due existing drift, run scoped touched-file Prettier check
- create Sprint 16 report
- document included scope
- document excluded scope
- document risks, limitations, and handoff to Sprint 17

#### Acceptance criteria

- report exists at `docs/planning/reports/phase-06-sprint-16-report.md`
- validation evidence is command-based
- PASS / FAIL / NOT RUN statuses are explicit
- security and boundary checks are documented
- limitations are documented
- handoff to Sprint 17 is clear

---

## IX. Allowed Dependencies

Allowed:

- `src/modules/audit`
- `src/infrastructure/database` through existing database abstraction
- `src/infrastructure/logger` for operational logging only
- `src/shared/errors` for generic error handling
- `src/shared/types` only for generic cross-cutting types
- approved producer modules calling `src/modules/audit/audit.service.ts` only where explicitly assigned
- `src/app` route wiring only if audit query/read API is approved

---

## X. Forbidden Dependencies

Forbidden:

- `audit` importing `UserModel`
- `audit` importing `user.repository`
- `audit` importing OIDC token/session/client models
- `audit` importing auth internals
- `audit` mutating user data
- `audit` mutating password data
- `audit` mutating token data
- `audit` mutating session data
- `audit` mutating client metadata
- `audit` mutating verification or password-reset lifecycle data
- `audit` issuing tokens
- `audit` revoking tokens
- `audit` invalidating sessions
- `audit` validating credentials
- `audit` managing clients
- `audit` owning admin authorization
- `shared` containing audit workflow logic
- `infrastructure` containing audit business policy
- direct `process.env` outside `src/config`
- new root-level audit directory
- unrelated infrastructure expansion
- external SIEM integration
- external logging pipeline integration

---

## XI. Security-Critical Rules

Mandatory:

- audit records must not contain raw passwords
- audit records must not contain raw access tokens
- audit records must not contain raw ID Tokens
- audit records must not contain raw refresh tokens
- audit records must not contain authorization codes
- audit records must not contain code verifiers
- audit records must not contain client secrets
- audit records must not contain private key material
- audit records must not contain session cookie values
- audit records must not contain CSRF token raw values
- audit records must not contain email verification tokens
- audit records must not contain password reset tokens
- audit metadata must be bounded and redaction-safe
- audit records must be append-only unless a retention policy is separately approved
- audit service must not mutate business state
- audit repository must not access non-audit domain persistence
- audit failure behavior must be explicit
- producer modules must not pass raw secrets to audit service
- no audit query API may be exposed without approved authorization/query contract

---

## XII. Required Validation

### Static validation

Required commands:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run format:check`
- `npm.cmd run build`

If repository-wide `format:check` fails due accepted external formatting baseline drift, the report must include:

- full command result
- scoped Prettier check for Sprint 16 touched files
- confirmation that Sprint 16 touched files pass formatting
- list of external failing files if available
- explicit statement that Sprint 16 did not mix unrelated formatting cleanup

### Boundary scans

Required commands:

- `rg -n "process\\.env" src --glob "!src/config/**"`
- `rg -n "console\\.log" src`
- `rg -n "UserModel|user\\.repository|RefreshToken|Session|ClientModel|AuthorizationCode" src/modules/audit`
- `rg -n "updateOne|deleteOne|findOneAndUpdate|findByIdAndUpdate" src/modules/audit`
- `rg -n "sign|jwt|issue|generate.*token|revoke|introspect|invalidate.*session" src/modules/audit`
- `rg -n "password|password_hash|passwordHash|client_secret|clientSecret|refresh_token|access_token|id_token|authorization_code|code_verifier|private.*key|BEGIN PRIVATE KEY|csrf" src/modules/audit`

Expected results:

- no direct `process.env` outside config
- no `console.log`
- no direct user/token/session/client model access from `audit`
- no cross-domain mutation from `audit`
- no token issuance, revoke, introspection, or session invalidation behavior in `audit`
- no raw secret persistence or logging in audit implementation
- any security-sensitive keyword match is reviewed and explained

---

## XIII. Manual Validation Scenarios

Required scenarios:

1. Audit service records a minimum valid event.
2. Audit service rejects or sanitizes missing required fields according to contract.
3. Audit service rejects or sanitizes forbidden secret fields.
4. Audit event persistence is append-only.
5. Audit repository accesses only audit event persistence.
6. Audit service does not mutate user data.
7. Audit service does not mutate token data.
8. Audit service does not mutate session data.
9. Audit service does not mutate client metadata.
10. Audit service does not expose raw password, token, authorization code, client secret, private key, session cookie, or CSRF token.
11. Audit metadata remains bounded and explicit.
12. Audit failure behavior matches contract.
13. Producer integration, if implemented, emits only contract-approved event types.
14. Producer integration, if implemented, does not change existing domain behavior.
15. Audit query/read API, if implemented, uses bounded filters only.
16. Audit query/read API, if implemented, does not expose raw secret fields.
17. Audit controller, if implemented, remains thin.
18. No audit query/read HTTP route exists if not approved by contract.
19. No new runtime folder outside approved source tree is created.
20. Sprint 16 does not introduce admin controls, client management, key rotation, or observability hardening.

---

## XIV. PR and Report Requirements

Sprint 16 PR must include:

- phase/sprint/task references
- source-of-truth references
- audit event contract reference
- Phase 06 phase plan reference
- included scope
- excluded scope
- file list
- validation commands with PASS / FAIL / NOT RUN
- boundary scan evidence
- security scan evidence
- manual validation evidence
- audit event schema summary
- append-only behavior confirmation
- redaction / secret-safety confirmation
- query/read boundary confirmation
- producer integration summary if implemented
- risks and limitations
- handoff to Sprint 17

Sprint 16 report path:

`docs/planning/reports/phase-06-sprint-16-report.md`

---

## XV. Merge-Blocking Conditions

Block Sprint 16 if:

- `audit-event-contract.md` is missing or not referenced
- Sprint 16 assignment is missing or not referenced
- implementation starts before audit contract approval
- audit event schema does not match contract
- audit persists raw password
- audit persists raw access token
- audit persists raw ID Token
- audit persists raw refresh token
- audit persists authorization code
- audit persists code verifier
- audit persists client secret
- audit persists private key material
- audit persists session cookie value
- audit persists CSRF token raw value
- audit stores full request body or full response body without explicit approval
- audit metadata is unbounded
- audit mutates user data
- audit mutates token data
- audit mutates session data
- audit mutates client metadata
- audit imports another module's internal model/repository without explicit contract
- audit implements auth, OIDC, admin, verification, or password-reset workflow logic
- audit query/read API is exposed without approved boundary
- audit query/read API is public or unsafe
- `shared` contains audit workflow logic
- `infrastructure` contains audit business policy
- direct `process.env` appears outside `src/config`
- validation evidence is missing
- security-sensitive findings are not reviewed
- unrelated formatting cleanup is mixed into the implementation PR
- Sprint 16 includes admin controls, client management, key rotation, or observability hardening without separate approval

---

## XVI. Definition of Done

Sprint 16 is complete when:

- `audit-event-contract.md` is approved and referenced
- Sprint 16 assignment is approved and referenced
- audit event model is implemented
- audit repository is implemented
- audit service is implemented
- audit event persistence is append-only
- audit event payload is bounded and redaction-safe
- audit does not persist raw secrets
- audit does not mutate business state
- audit does not import non-audit domain internals
- query/read behavior is implemented only if approved
- producer integration is implemented only if approved
- no direct `process.env` exists outside config
- no `console.log` exists
- all required validation evidence is recorded
- Sprint 16 report is created

---

## XVII. Handoff After Sprint 16

Sprint 16 should hand off to Sprint 17 - Admin Module Controls.

The handoff must include:

- audit service API available for admin action recording
- approved event category and event type vocabulary
- redaction rules for admin-facing events
- query/read boundary status
- producer integration status
- known audit limitations
- any deferred audit event producers
- any accepted format baseline condition
- any unresolved security or architecture risk

Sprint 16 does not authorize Sprint 17 implementation by itself. Sprint 17 must start from approved admin contract, audit contract, and Sprint 17 assignment.
