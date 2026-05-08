# eTroy OIDC - OIDC Client Management Contract

---

## I. Contract Summary

* Contract: OIDC Client Management Contract
* Phase: Phase 06 - Platform and Governance Hardening
* Primary Sprint: Sprint 18 - OIDC Client Management
* Owner Module: `src/modules/oidc`
* Orchestration Module: `src/modules/admin`
* Supporting Modules:

  * `src/modules/audit`
  * `src/infrastructure/crypto`
  * `src/infrastructure/database`
  * `src/shared/errors`
* Primary Assignment: `docs/planning/assignments/phase-06-sprint-18.md`
* Contract Path: `docs/contracts/oidc/client-management-contract.md`
* Status: Approved for Sprint 18 runtime implementation

---

## II. Purpose

This contract defines the approved OIDC client metadata lifecycle for eTroy OIDC.

Sprint 18 moves OIDC client management from static-only configuration toward contract-backed managed client metadata, while preserving OIDC module ownership and existing runtime stability.

The contract exists to ensure client management is:

* owned by `oidc`
* safely orchestrated by `admin` only through approved service contracts
* protected against raw client secret persistence
* compatible with exact-match redirect URI validation
* auditable
* bounded to approved OIDC client lifecycle behavior
* safe against identity ownership drift

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
* `docs/contracts/admin/admin-control-contract.md`
* `docs/contracts/audit/audit-event-contract.md`
* `docs/planning/assignments/phase-06-sprint-18.md`
* `docs/planning/reports/phase-06-sprint-17-report.md`
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
* Sprint 18 runtime implementation may begin only from a dedicated Sprint 18 runtime branch after this contract and `docs/planning/assignments/phase-06-sprint-18.md` are present and approved.

---

## IV. Contract Scope

### Included

Sprint 18 includes:

* OIDC client metadata model
* OIDC client repository
* OIDC client service
* create client
* get client
* bounded list/query clients for admin review
* update controlled mutable client metadata
* disable client
* rotate client secret
* hash client secret before persistence
* one-time raw client secret return on create and rotate
* exact-match redirect URI validation
* allowed grant type and scope validation
* DB-managed client validation path
* static config fallback if required to preserve existing OIDC flow behavior
* client lifecycle audit event recording
* admin-facing orchestration through approved service boundary

### Excluded

Sprint 18 excludes:

* public dynamic client registration
* third-party marketplace client onboarding
* client-owned identity storage
* social login
* external identity federation
* raw client secret persistence
* raw client secret logging
* raw client secret audit metadata
* retrieval of raw client secret after create or rotate response
* broad OAuth grant type expansion
* token issuance semantic changes outside client validation requirements
* refresh-token lifecycle changes
* session lifecycle changes
* user identity mutation
* direct user database access from `oidc`
* direct OIDC client persistence access from `admin`
* direct audit persistence access from `admin` or `oidc`
* admin dashboard UI
* broad RBAC or permission framework
* external SIEM/log pipeline
* observability hardening beyond client lifecycle audit events
* key rotation behavior

---

## V. OIDC Client Ownership Boundary

### 1. OIDC Module Ownership

`src/modules/oidc` owns:

* OIDC client metadata
* client identifier generation
* client secret hashing and verification rules
* client status lifecycle
* redirect URI validation
* client scope and grant type validation
* managed client validation path
* client lifecycle business decisions
* OIDC client repository and persistence

`src/modules/oidc` does not own:

* user identity records
* user credential validation
* admin authorization
* audit persistence
* external dashboard UI
* client application business logic

### 2. Admin Module Role

`src/modules/admin` may orchestrate approved client management operations only through `oidc` service contracts.

`admin` may:

* receive admin-facing client management requests if routing/controller exposure is approved by assignment
* validate admin request input at the delivery/orchestration boundary
* call approved `oidc` client service methods
* call `audit` service if the design records audit from admin orchestration
* map service results to HTTP responses

`admin` must not:

* import OIDC client model
* import OIDC client repository
* mutate client database records directly
* generate client secret directly
* hash client secret directly
* validate redirect URI directly as owner logic
* own OIDC client lifecycle rules
* issue tokens
* change token/session behavior
* duplicate OIDC client policy logic

### 3. Audit Module Role

`src/modules/audit` records client lifecycle audit events.

`audit` must not:

* decide whether client operations succeed
* mutate client metadata
* generate or rotate client secrets
* validate redirect URIs
* persist raw client secret
* persist full client database records

---

## VI. Approved Client Lifecycle Operations

Sprint 18 approves the following client lifecycle operations.

### 1. Create Client

The system may create a new OIDC client through approved admin orchestration.

Rules:

* client metadata is owned by `oidc`
* `client_id` must be generated by the system
* admin must not provide `client_id`
* client secret must be generated by the system
* raw client secret may be returned once in the create response
* only the client secret hash may be persisted
* raw client secret must not be logged
* raw client secret must not be recorded in audit
* redirect URIs must be validated before persistence
* allowed scopes must be validated before persistence
* allowed grant types must be validated before persistence
* client starts with approved default status unless request explicitly sets an approved status
* audit event must be recorded

Allowed create input fields:

* `name`
* `redirect_uris`
* `post_logout_redirect_uris`
* `allowed_scopes`
* `grant_types`
* `response_types`
* `status`
* `metadata` if bounded and contract-safe

Forbidden create input fields:

* `client_id`
* `client_secret`
* `client_secret_hash`
* token fields
* session fields
* user identity fields
* arbitrary pass-through client object

Create output may include:

* `client_id`
* raw `client_secret` once
* safe client metadata

Create output must not include:

* `client_secret_hash`
* internal persistence-only fields
* audit internals
* token/session data

### 2. Get Client

The system may retrieve a bounded client view.

Rules:

* must call `oidc` client service/repository through owning module
* must not expose `client_secret_hash`
* must not expose raw client secret
* must not expose token/session state
* must not expose audit internals

Allowed returned fields should be limited to:

* `client_id`
* `name`
* `redirect_uris`
* `post_logout_redirect_uris`
* `allowed_scopes`
* `grant_types`
* `response_types`
* `status`
* `createdAt`
* `updatedAt`
* `disabledAt` if present
* `secretRotatedAt` if present

### 3. List Clients

The system may provide a bounded list/query view for admin review.

Rules:

* query must be bounded
* pagination or result limit must be enforced
* arbitrary database query objects must not be accepted
* secret hash must not be returned
* raw client secret must not be returned
* token/session state must not be returned

Allowed filters:

* `client_id`
* `status`
* `name`
* `createdAt` range if implementation pattern supports it

### 4. Update Controlled Client Metadata

The system may update controlled mutable client metadata.

Allowed mutable fields:

* `name`
* `redirect_uris`
* `post_logout_redirect_uris`
* `allowed_scopes`
* `grant_types`
* `response_types`
* `status`, only through approved status operation or explicit controlled update rule
* bounded non-secret metadata if implemented

Forbidden update fields:

* `client_id`
* `client_secret`
* `client_secret_hash`
* internal database id
* token/session fields
* user identity fields
* audit internals

Rules:

* redirect URI changes must pass exact-match URI validation rules before persistence
* scopes must remain within approved allowed scope vocabulary
* grant types must remain within approved allowed grant type vocabulary
* response types must remain within approved response type vocabulary
* audit event must be recorded

### 5. Disable Client

The system may disable a client.

Rules:

* status must be owned by `oidc`
* disabled clients must not pass active client validation
* disable must not delete the client record
* disable must not mutate token/session records directly
* disable must preserve client audit/history traceability
* audit event must be recorded
* repeated disable may be idempotent or handled as a controlled no-op according to implementation convention

### 6. Rotate Client Secret

The system may rotate a client secret.

Rules:

* new raw client secret must be generated by the system
* raw client secret may be returned once in the rotate response
* only new secret hash may be persisted
* old raw secret must not be recoverable
* raw secret must not be logged
* raw secret must not be recorded in audit
* audit event must be recorded without raw secret
* rotation must not change `client_id`
* rotation must not mutate token/session state directly
* rotation should update a safe `secretRotatedAt` or equivalent timestamp if supported

---

## VII. Client Metadata Schema

Sprint 18 approved client metadata should include:

* `client_id`
* `client_secret_hash`
* `name`
* `redirect_uris`
* `post_logout_redirect_uris`
* `allowed_scopes`
* `grant_types`
* `response_types`
* `status`
* `createdAt`
* `updatedAt`
* `disabledAt`
* `secretRotatedAt`

### Required Fields

* `client_id`
* `client_secret_hash`
* `name`
* `redirect_uris`
* `allowed_scopes`
* `grant_types`
* `response_types`
* `status`

### Status Values

Allowed statuses:

* `active`
* `disabled`

Rules:

* new clients should default to `active` unless explicitly created as `disabled`
* disabled clients must be rejected by active client validation
* status is not token/session state

### Internal Field Rules

The following must never be returned in normal API response:

* `client_secret_hash`
* internal database id unless explicitly safe and required
* persistence internals

---

## VIII. Client Identifier Rules

`client_id` must be generated by the system.

Rules:

* must be unique
* must not be supplied by admin input
* must not be derived from raw client secret
* must not encode sensitive data
* must be stable after creation
* must not be editable in Sprint 18

Recommended format:

* opaque high-entropy or collision-resistant identifier with a safe prefix if useful, such as `client_<random>`

Collision behavior:

* generation must check uniqueness or rely on database uniqueness with retry/error handling
* collision must not leak persistence internals

---

## IX. Client Secret Rules

Client secrets are sensitive credentials.

Rules:

* raw client secret must be generated by the system
* raw client secret may be returned only once on create
* raw client secret may be returned only once on rotate
* raw client secret must not be persisted
* raw client secret must not be logged
* raw client secret must not be recorded in audit metadata
* raw client secret must not be exposed by get/list/update operations
* only client secret hash may be persisted
* client secret hash must not be returned through API
* secret verification must compare raw submitted secret against stored hash through approved hash/crypto utility

Hashing requirements:

* use approved infrastructure crypto/hash abstraction if compatible
* do not implement ad-hoc hashing inside controller
* do not persist raw secret even temporarily in client metadata
* do not store raw secret in operational context or report examples

Audit rules:

* audit may record that rotation occurred
* audit may record client id and safe reason code
* audit must not record raw secret
* audit must not record secret hash

---

## X. Redirect URI Rules

Redirect URI validation must remain strict.

Rules:

* exact-match redirect URI validation is required
* wildcard redirect URIs are forbidden
* partial prefix matching is forbidden
* substring matching is forbidden
* unvalidated dynamic redirect URI registration is forbidden
* redirect URI must be syntactically valid
* redirect URI must use an approved scheme according to implementation policy
* localhost redirect URIs may be allowed only if existing development behavior allows them or if explicitly approved
* redirect URI values must not contain tokens, authorization codes, client secrets, or credentials

Existing OIDC authorization validation must continue to reject unregistered redirect URIs.

If DB-managed clients are integrated, authorization validation must check managed client redirect URIs using exact-match logic.

Static config fallback, if retained, must also preserve exact-match validation.

---

## XI. Grant Type, Response Type, and Scope Rules

### 1. Grant Types

Sprint 18 approved grant types:

* `authorization_code`
* `refresh_token`, only if already supported by existing OIDC flow and client validation path requires it

Forbidden unless later approved:

* `client_credentials`
* `password`
* `implicit`
* device code flow
* token exchange
* custom grant types

### 2. Response Types

Sprint 18 approved response types:

* `code`

Forbidden unless later approved:

* `token`
* `id_token`
* hybrid response types

### 3. Scopes

Sprint 18 approved scopes should align with existing OIDC behavior:

* `openid`
* `profile`
* `email`

Rules:

* `openid` is required for OIDC flows
* scopes must be normalized and validated
* unknown scopes must be rejected or ignored according to existing OIDC policy, but behavior must be deterministic
* client allowed scopes must not create identity ownership in clients

---

## XII. Managed Client Validation Path

Sprint 18 may integrate DB-managed clients into the existing OIDC client validation path.

Rules:

* managed client lookup must stay inside `oidc`
* OIDC must not query user ownership data directly
* managed client validation must check client status
* disabled clients must be rejected
* redirect URI validation must be exact-match
* client credential validation must use hash comparison
* static config fallback may remain if required for backward compatibility
* fallback must not override a disabled managed client with the same `client_id`
* fallback behavior must be deterministic and documented in Sprint 18 report

Recommended precedence:

1. check DB-managed client by `client_id`
2. if found, use managed client validation rules
3. if not found and fallback is enabled, check existing static config clients
4. if not found anywhere, reject client

---

## XIII. Admin-to-OIDC Orchestration Boundary

Sprint 18 may expose admin-facing client management through `admin`.

Rules:

* admin controller may receive client management requests
* admin service may orchestrate by calling approved OIDC client service methods
* OIDC remains owner of client metadata lifecycle
* admin must not import client model
* admin must not import client repository
* admin must not hash client secret
* admin must not verify client credential directly
* admin must not implement redirect URI exact-match policy as owner logic
* admin must not mutate token/session state
* admin must not duplicate OIDC client validation policy

Allowed dependency direction:

* `admin` -> `oidc` client service
* `admin` -> `audit` service if audit events are produced from admin orchestration

Forbidden dependency direction:

* `admin` -> OIDC client repository
* `admin` -> OIDC client model
* `admin` -> OIDC token/session repositories
* `admin` -> raw database client collection

---

## XIV. Audit Event Requirements

Every approved client mutation must emit an audit event.

Required client lifecycle events:

* `admin.client.created`
* `admin.client.updated`
* `admin.client.disabled`
* `admin.client.secret_rotated`
* `oidc.client.created`
* `oidc.client.updated`
* `oidc.client.disabled`
* `oidc.client.secret_rotated`

Allowed implementation approach:

* record admin-facing events if operation is initiated through admin orchestration
* record OIDC-owned events if operation is produced inside OIDC service
* avoid duplicate noisy events unless both are intentionally required and documented
* at minimum, each mutation must have one audit event with safe actor/subject/client reference

Audit event rules:

* actor must identify admin actor safely when admin initiated the action
* subject/client must identify target client by `clientId`
* metadata must be bounded
* reason code should be included where useful
* raw client secret must never be recorded
* client secret hash must never be recorded
* full client object must never be recorded
* redirect URI list may be recorded only if explicitly bounded and judged non-secret by implementation; otherwise record summary/count only
* no token/session/user credential data may be recorded

If required event types are missing from `docs/contracts/audit/audit-event-contract.md`, that contract must receive an additive vocabulary update before runtime implementation uses them.

---

## XV. API / Controller Exposure Decision

Sprint 18 approves admin-facing client management API exposure through `admin` orchestration, while keeping OIDC ownership.

Approved API surface, subject to assignment:

* create client
* get client
* list clients
* update controlled client metadata
* disable client
* rotate client secret

Controller rules:

* controller must remain thin
* controller must delegate to service
* controller must not access repositories directly
* controller must not implement client ownership logic
* controller must not expose raw persistence errors
* controller must not accept arbitrary object payloads for pass-through mutation
* controller must not expose `client_secret_hash`
* controller must expose raw client secret only in create/rotate response
* controller must not log raw client secret
* controller must not implement broad RBAC framework

If no production admin authorization framework exists, endpoints remain internal/admin-only baseline under existing Sprint 17 admin authorization assumption.

---

## XVI. Forbidden Dependencies and Behaviors

Sprint 18 must not introduce:

* raw client secret persistence
* raw client secret logs
* raw client secret audit metadata
* public dynamic client registration
* client-owned user identity data
* direct user DB access from OIDC
* OIDC client repository/model import from admin
* audit repository import from admin or OIDC producer path
* token issuance ownership changes outside client validation path
* refresh token lifecycle changes
* session invalidation behavior
* social login
* external federation
* marketplace client workflow
* broad RBAC
* admin dashboard UI
* ad-hoc source tree folders

---

## XVII. Validation Requirements

Sprint 18 implementation must run or explicitly report inability to run:

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run format:check
npm.cmd run build
rg -n "process\\.env" src --glob "!src/config/**"
rg -n "console\\.log" src
rg -n "UserModel|user\\.repository|mongoose.*User|findOne\\(.*User|findById\\(.*User" src/modules/oidc
rg -n "client_secret|clientSecret|client_secret_hash|clientSecretHash|secret" src/modules/oidc src/modules/admin
rg -n "ClientModel|client\\.repository|client.repository|client\\.model|client.model" src/modules/admin
rg -n "password|password_hash|refresh_token|access_token|id_token|authorization_code|code_verifier|private.*key|BEGIN PRIVATE KEY" src/modules/oidc src/modules/admin
rg -n "deleteOne|findOneAndDelete|findByIdAndDelete" src/modules/oidc src/modules/admin
rg -n "redirect_uri|redirectUris|redirect_uris" src/modules/oidc src/modules/admin
```

Expected interpretation:

* client secret matches require review and must prove hash-only persistence and one-time response handling.
* `client_secret_hash` matches in `oidc` may be expected if OIDC owns secret persistence.
* `client_secret_hash` matches in `admin` are forbidden except validator rejection strings or scan-reviewed forbidden-field constants.
* OIDC direct user DB access is forbidden.
* Admin direct client model/repository access is forbidden.
* Delete operation matches require review and must not implement hard delete.
* Redirect URI matches must align with exact-match validation.

If audit event vocabulary is updated, also run:

```bash
rg -n "admin\\.client\\.created|admin\\.client\\.updated|admin\\.client\\.disabled|admin\\.client\\.secret_rotated|oidc\\.client\\.created|oidc\\.client\\.updated|oidc\\.client\\.disabled|oidc\\.client\\.secret_rotated" docs/contracts/audit src/modules
```

---

## XVIII. Manual Validation Requirements

Sprint 18 must manually validate:

1. Admin can create a client through approved admin-facing API/service.
2. Created client receives system-generated `client_id`.
3. Admin input cannot override `client_id`.
4. Created client receives system-generated raw client secret once.
5. Raw client secret is not persisted.
6. Client secret hash is persisted inside OIDC-owned persistence only.
7. Create response does not expose `client_secret_hash`.
8. Get client does not expose raw client secret.
9. Get client does not expose `client_secret_hash`.
10. List clients does not expose raw client secret.
11. List clients does not expose `client_secret_hash`.
12. Admin can update controlled metadata only.
13. Admin cannot update `client_id`.
14. Admin cannot update raw client secret through metadata update.
15. Admin cannot update `client_secret_hash`.
16. Admin can disable client.
17. Disabled client does not pass active managed-client validation.
18. Disable does not delete client record.
19. Admin can rotate client secret.
20. Rotate returns new raw client secret once.
21. Rotate persists only new secret hash.
22. Old raw secret is not recoverable.
23. Redirect URI validation uses exact-match only.
24. Wildcard redirect URI is rejected.
25. Prefix/substring redirect matching is rejected.
26. Unknown grant types are rejected.
27. Unknown response types are rejected.
28. Unknown scopes are rejected or handled deterministically according to existing policy.
29. Managed DB client validation works for valid active client.
30. Managed DB client validation rejects disabled client.
31. Static config fallback remains functional if retained.
32. Static config fallback does not override disabled managed client with same `client_id`.
33. Client lifecycle mutation emits safe audit event.
34. Audit event does not include raw client secret.
35. Audit event does not include client secret hash.
36. Audit event does not include full client object.
37. Admin does not import OIDC client model.
38. Admin does not import OIDC client repository.
39. OIDC does not directly access user DB.
40. No token issuance semantics are changed except approved client validation integration.
41. No refresh token lifecycle behavior is changed.
42. No session lifecycle behavior is changed.
43. No dynamic public registration is introduced.
44. No admin dashboard UI is introduced.
45. Sprint 18 report records validation evidence.

---

## XIX. Merge-Blocking Conditions

Sprint 18 must be blocked or rejected if any of the following occurs:

* `client-management-contract.md` is missing
* `phase-06-sprint-18.md` is missing
* runtime begins from an outdated `main`
* raw client secret is persisted
* raw client secret is logged
* raw client secret is recorded in audit
* client secret hash is returned in API response
* raw client secret can be retrieved after create/rotate
* `client_id` can be modified
* admin can provide arbitrary `client_id`
* admin imports OIDC client model
* admin imports OIDC client repository
* admin directly mutates OIDC client persistence
* OIDC directly queries user ownership database
* hard delete client is introduced
* wildcard redirect URI matching is introduced
* prefix/substring redirect URI matching is introduced
* public dynamic registration is introduced
* token/session lifecycle behavior is changed without approved contract
* client-owned identity storage is introduced
* broad RBAC or admin dashboard UI is introduced
* audit events include secret material
* validation evidence is missing
* source-of-truth references are missing in PR/report

---

## XX. Handoff

Sprint 18 hands off to:

* Sprint 19 - Observability Hardening

Sprint 19 may use client lifecycle events and safe client identifiers for observability, but logging/metrics contracts must still forbid secret leakage, high-risk identifiers, and business logic movement into infrastructure.
