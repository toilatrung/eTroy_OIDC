# eTroy OIDC - Audit Event Contract

---

## I. Contract Summary

- Contract: Audit Event Contract
- Phase: Phase 06 - Platform and Governance Hardening
- Primary Sprint: Sprint 16 - Audit Logging Foundation
- Owner Module: `src/modules/audit`
- Primary Assignment: `docs/planning/assignments/phase-06-sprint-16.md`
- Contract Path: `docs/contracts/audit/audit-event-contract.md`
- Status: Approved
- Sprint 16 runtime status: MERGED / CLOSED / PRESENT IN `main`
- Sprint 16 PR: `#49` (merged `2026-05-08`)
- Sprint 16 runtime commit: `c17c3aecf29927b3c69cf61b791cac49d98f8dc5`

---

## II. Purpose

This contract defines the audit event model, persistence rules, recording boundary, redaction rules, producer responsibilities, query/read boundary, and validation requirements for eTroy OIDC.

The contract exists to ensure security-relevant system activity can be recorded consistently without leaking secrets, duplicating business logic, mutating domain state, or violating module boundaries.

This contract and the Sprint 16 assignment are approved. Sprint 16 runtime implementation has been merged and closed in `main`; later audit producers must remain contract-backed by their owning sprint assignments.

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
- `docs/planning/assignments/phase-06-sprint-16.md`
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
- If sprint implementation conflicts with this contract, implementation is non-compliant.
- No audit runtime implementation may begin without this contract approval.

---

## IV. Contract Scope

### Included

This contract defines:

- audit event ownership
- audit event schema
- audit event category vocabulary
- audit event type vocabulary
- actor model
- subject model
- client model
- request metadata model
- correlation metadata model
- event metadata boundary
- append-only persistence rule
- redaction and secret-safety rules
- producer responsibilities
- failure behavior
- audit query/read boundary
- validation requirements
- merge-blocking conditions

### Excluded

This contract does not define:

- admin module control implementation
- admin authorization model
- OIDC client management implementation
- client secret rotation implementation
- observability metrics implementation
- JWKS/key rotation implementation
- final security hardening implementation
- external SIEM integration
- external logging pipeline integration
- audit dashboard UI
- user identity mutation behavior
- auth credential validation behavior
- OIDC token/session lifecycle behavior
- verification or password-reset lifecycle behavior

---

## V. Ownership Boundary

### 1. Audit Module Ownership

`src/modules/audit` owns:

- audit event schema
- audit event persistence
- audit event repository
- audit event recording service
- audit event query/read interface only if explicitly approved
- audit event redaction and metadata boundary enforcement

### 2. Audit Module Allowed Behavior

`audit` may:

- persist audit events
- expose a service-level API to record audit events
- validate audit event payload shape
- sanitize or reject forbidden audit metadata
- provide bounded read/query methods if approved
- provide a controller only if query/read API is approved

### 3. Audit Module Forbidden Behavior

`audit` must not:

- mutate user data
- mutate password data
- mutate auth credential state
- mutate OIDC authorization code state
- mutate access-token state
- mutate refresh-token state
- mutate ID Token state
- mutate session state
- mutate client metadata
- mutate verification state
- mutate password-reset state
- issue tokens
- revoke tokens
- introspect tokens
- invalidate sessions
- validate user credentials
- manage users
- manage clients
- implement admin authorization
- implement auth workflow logic
- implement OIDC workflow logic
- implement verification workflow logic
- implement password-reset workflow logic
- become a general observability or metrics subsystem

### 4. Producer Module Ownership

Producer modules remain responsible for their own business decisions.

Examples:

- `auth` decides whether login succeeds or fails.
- `users` decides whether a profile or password mutation succeeds.
- `oidc` decides whether token issuance, refresh rotation, revoke, introspection, session reuse, or logout succeeds.
- `admin` decides whether admin actions are allowed after Sprint 17 contracts approve admin behavior.

`audit` records the event outcome. It does not decide the outcome.

---

## VI. Audit Event Schema

### 1. Required Top-Level Fields

Each persisted audit event must include:

- `eventId`
- `eventType`
- `category`
- `severity`
- `outcome`
- `occurredAt`
- `createdAt`

### 2. Conditionally Required Fields

The following fields are required when relevant to the event type:

- `actor`
- `subject`
- `client`
- `request`
- `correlationId`
- `reasonCode`
- `metadata`

If a field is not applicable, it must be omitted or explicitly set according to implementation conventions. It must not be filled with misleading placeholder values.

### 3. Field Definitions

#### `eventId`

Purpose:

- unique audit event identifier

Rules:

- must be generated by the audit system or trusted infrastructure
- must not be derived from raw token, password, client secret, authorization code, session cookie, or private key material
- must be stable after persistence

Recommended format:

- UUID or equivalent high-entropy identifier

#### `eventType`

Purpose:

- machine-readable event name

Rules:

- must use a controlled vocabulary
- must be specific enough for review and filtering
- must not contain user input
- must not contain secrets

Format:

- dot-separated lowercase string

Examples:

- `auth.login.success`
- `auth.login.failure`
- `user.password.changed`
- `oidc.token.issued`
- `oidc.refresh.reuse_detected`

#### `category`

Purpose:

- high-level audit event grouping

Allowed values:

- `auth`
- `user`
- `oidc`
- `admin`
- `client`
- `token`
- `session`
- `security`
- `system`

#### `severity`

Purpose:

- review priority and incident triage signal

Allowed values:

- `info`
- `warning`
- `critical`

Usage guidance:

- `info`: expected successful lifecycle event
- `warning`: failed or denied security-relevant event
- `critical`: compromise, replay, reuse detection, unsafe configuration, or high-risk administrative/security event

#### `outcome`

Purpose:

- result of the event

Allowed values:

- `success`
- `failure`
- `denied`
- `noop`

Usage guidance:

- `success`: intended action completed
- `failure`: action failed due validation, state, or processing issue
- `denied`: action was blocked by policy/security control
- `noop`: safe idempotent no-op, such as repeated logout or revoke of an already-revoked object where response is intentionally non-revealing

#### `occurredAt`

Purpose:

- time the domain event occurred

Rules:

- must be a timestamp
- should be set as close as possible to event production time

#### `createdAt`

Purpose:

- time the audit record was persisted

Rules:

- must be a timestamp
- may differ from `occurredAt`
- must be assigned at persistence time or immediately before persistence

---

## VII. Actor Model

### 1. Purpose

`actor` identifies the party that initiated the action.

### 2. Allowed Actor Types

Allowed values:

- `user`
- `admin`
- `client`
- `system`
- `unknown`

### 3. Actor Shape

The actor object may contain:

- `type`
- `sub`
- `adminSub`
- `clientId`
- `display`
- `source`

### 4. Actor Field Rules

`type`:

- required when actor is present
- must use allowed actor type values

`sub`:

- allowed only for end-user actor references
- must reference identity subject
- must not embed full user object

`adminSub`:

- allowed only for admin actor references
- must not embed full admin/user object

`clientId`:

- allowed only for client actor references
- must be the client identifier, not the client secret

`display`:

- optional
- must be sanitized
- must not contain password, token, secret, authorization header, or raw request body

`source`:

- optional
- may describe source such as `browser`, `api`, `job`, or `system`
- must not contain raw IP if IP storage is not approved for the event

### 5. Forbidden Actor Content

Actor must not contain:

- password
- password hash
- raw token
- token hash unless explicitly approved
- client secret
- authorization code
- session cookie
- CSRF token
- full user object
- full request body

---

## VIII. Subject Model

### 1. Purpose

`subject` identifies the entity affected by the action.

### 2. Allowed Subject Types

Allowed values:

- `user`
- `admin`
- `client`
- `token`
- `token_family`
- `session`
- `authorization_code`
- `verification`
- `password_reset`
- `key`
- `system`
- `unknown`

### 3. Subject Shape

The subject object may contain:

- `type`
- `id`
- `sub`
- `clientId`
- `sessionId`
- `tokenFamilyId`
- `keyId`

### 4. Subject Field Rules

`type`:

- required when subject is present
- must use allowed subject type values

`id`:

- may contain internal non-secret identifier
- must not contain raw token, raw code, raw secret, or raw cookie

`sub`:

- allowed for user identity subject
- must not embed user object

`clientId`:

- allowed for OIDC client subject
- must not contain client secret

`sessionId`:

- allowed only if it is an internal reference and not raw cookie value

`tokenFamilyId`:

- allowed only if it is a safe internal reference and not raw refresh token or token hash unless explicitly approved

`keyId`:

- allowed for signing/JWKS key lifecycle events
- must not contain private key material

### 5. Forbidden Subject Content

Subject must not contain:

- raw refresh token
- raw access token
- raw ID Token
- authorization code
- code verifier
- client secret
- private key material
- session cookie value
- CSRF token raw value
- password
- password hash
- full database record from another module

---

## IX. Client Model

### 1. Purpose

`client` identifies the OIDC client context related to an audit event.

### 2. Client Shape

The client object may contain:

- `clientId`
- `redirectUri`
- `scope`
- `grantType`

### 3. Client Field Rules

`clientId`:

- allowed and recommended when event is client-related
- must not be confused with client secret

`redirectUri`:

- allowed only after validation or as sanitized rejected input according to event type
- must not contain token or code parameters

`scope`:

- allowed as normalized scope string or array
- must not contain secrets

`grantType`:

- allowed for token endpoint events
- must use approved grant identifiers

### 4. Forbidden Client Content

Client must not contain:

- `client_secret`
- `clientSecret`
- raw credential material
- full client database record
- unbounded metadata

---

## X. Request Metadata Model

### 1. Purpose

`request` stores sanitized request context useful for audit review and incident triage.

### 2. Allowed Request Fields

The request object may contain:

- `method`
- `path`
- `ip`
- `userAgent`
- `correlationId`
- `requestId`

### 3. Field Rules

`method`:

- may store HTTP method

`path`:

- may store route path
- must not include sensitive query string unless sanitized

`ip`:

- optional
- must follow project privacy/security decision
- should be stored only if approved by event contract use case

`userAgent`:

- optional
- must be bounded in length

`correlationId` / `requestId`:

- allowed
- must not be derived from secrets

### 4. Forbidden Request Content

Request metadata must not contain:

- full request body
- full query string containing secrets
- full authorization header
- cookies
- raw session cookie
- CSRF token
- access token
- refresh token
- ID Token
- authorization code
- code verifier
- client secret
- password

---

## XI. Correlation Model

### 1. Purpose

Correlation fields link audit events across a request or flow without exposing sensitive data.

### 2. Allowed Correlation Fields

Allowed:

- `correlationId`
- `requestId`
- `sessionId`
- `tokenFamilyId`
- `clientId`
- `sub`

### 3. Rules

- correlation values must be internal references or non-secret identifiers
- correlation values must not be raw credentials, tokens, codes, cookies, or secrets
- if `sessionId` is stored, it must be an internal session identifier, not raw cookie value
- if `tokenFamilyId` is stored, it must be a safe internal family identifier, not raw refresh token

---

## XII. Metadata Boundary

### 1. Purpose

`metadata` allows event-specific context without changing the core schema.

### 2. Metadata Rules

Metadata must be:

- bounded
- explicit
- sanitized
- serializable
- limited to event-specific safe fields
- validated or sanitized by `audit.service`

### 3. Forbidden Metadata

Metadata must not contain:

- full request body
- full response body
- full database record
- full user profile object
- password
- password hash
- raw access token
- raw ID Token
- raw refresh token
- refresh token hash unless explicitly approved
- authorization code
- code verifier
- code challenge if contract chooses to treat it as sensitive
- client secret
- private key material
- raw CSRF token
- raw session cookie
- verification token
- password reset token
- full authorization header
- unbounded error stack unless explicitly approved and sanitized

### 4. Metadata Size Rule

Implementation must enforce a bounded metadata shape.

Acceptable strategies:

- allowlist event-specific metadata keys
- reject unknown metadata keys
- sanitize unknown metadata keys
- limit serialized metadata size

The selected strategy must be documented in Sprint 16 implementation/report.

---

## XIII. Event Category and Type Vocabulary

### 1. General Rule

Event type vocabulary is controlled.

Implementations must not invent new event types without updating this contract or an approved sprint assignment.

### 2. Auth Events

Allowed event types:

- `auth.login.success`
- `auth.login.failure`
- `auth.current_password.verified`
- `auth.current_password.failed`

Owner of business decision:

- `auth`

Audit role:

- record outcome only

### 3. User Events

Allowed event types:

- `user.created`
- `user.profile.updated`
- `user.password.changed`
- `user.email.verified`
- `user.status.changed`

Owner of business decision:

- `users`, or the approved module orchestrating through `users`

Audit role:

- record outcome only

### 4. OIDC Authorization Events

Allowed event types:

- `oidc.authorization.started`
- `oidc.authorization.login_required`
- `oidc.authorization.consent_required`
- `oidc.authorization.consent_approved`
- `oidc.authorization.consent_denied`
- `oidc.authorization.consent_reused`
- `oidc.authorization.consent_revoked`
- `oidc.authorization.code_issued`
- `oidc.authorization.invalid_client`
- `oidc.authorization.invalid_scope`
- `oidc.authorization.interaction_expired`
- `oidc.authorization.accepted`
- `oidc.authorization.denied`
- `oidc.authorization.pkce_failed`
- `oidc.authorization.invalid_redirect_uri`

Owner of business decision:

- `oidc`

Audit role:

- record outcome only

### 5. OIDC Token Events

Allowed event types:

- `oidc.token.issued`
- `oidc.token.revoked`
- `oidc.token.introspection.performed`
- `oidc.refresh.rotated`
- `oidc.refresh.reuse_detected`
- `oidc.refresh.family_compromised`

Owner of business decision:

- `oidc`

Audit role:

- record outcome only

### 6. OIDC Session and Logout Events

Allowed event types:

- `oidc.session.created`
- `oidc.session.reused`
- `oidc.session.invalidated`
- `oidc.logout.completed`
- `oidc.logout.csrf_failed`

Owner of business decision:

- `oidc`

Audit role:

- record outcome only

### 7. Client Events

Allowed event types:

- `oidc.client.created`
- `oidc.client.updated`
- `oidc.client.disabled`
- `oidc.client.secret_rotated`

Owner of business decision:

- `oidc` for client metadata
- `admin` may orchestrate through `oidc` after admin/client contracts approve it

Audit role:

- record outcome only

### 8. Admin Events

Allowed event types:

- `admin.user.created`
- `admin.user.disabled`
- `admin.user.enabled`
- `admin.user.profile.updated`
- `admin.user.email_verified.marked`
- `admin.client.created`
- `admin.client.updated`
- `admin.client.disabled`
- `admin.client.secret_rotated`
- `admin.token.revoked`
- `admin.session.invalidated`

Owner of business decision:

- `admin` orchestration through owning modules after Sprint 17 contract approval

Audit role:

- record outcome only
- audit does not decide whether an admin action is allowed
- audit does not mutate user, client, token, session, or other business state
- admin producers must call the approved audit service contract, not the audit repository
- admin audit events must not persist raw passwords, password hashes, tokens, session cookies, client secrets, or full request bodies

Sprint 17 additive admin user vocabulary:

- `admin.user.created`
- `admin.user.disabled`
- `admin.user.enabled`
- `admin.user.profile.updated`
- `admin.user.email_verified.marked`

These event types are reserved for approved Sprint 17 admin-controlled user administration. Runtime use must remain within the approved admin control contract and Sprint 17 assignment.

### 9. Security Events

Allowed event types:

- `security.csrf.failed`
- `security.pkce.failed`
- `security.invalid_redirect_uri`
- `security.suspicious_token_reuse`
- `security.unauthorized_admin_action`
- `security.secret_redaction_triggered`

Owner of business decision:

- owning module for the flow

Audit role:

- record outcome only

### 10. Key Events

Allowed event types:

- `oidc.key.rotated`
- `oidc.key.retired`
- `oidc.key.rotation_failed`
- `oidc.key.rollback_performed`
- `oidc.key.compromised`

Owner of business decision:

- `oidc` and `infrastructure/crypto` according to key-rotation contract in Sprint 20

Audit role:

- record outcome only

### 11. Sprint 16 Implementation Limit

Sprint 16 must not implement all event producers automatically.

Sprint 16 may implement:

- audit event schema
- audit repository
- audit service
- event type vocabulary
- minimal producer hooks only if explicitly approved by Sprint 16 assignment

Broad event producer integration should be deferred to the sprint that owns the relevant domain behavior unless Sprint 16 assignment explicitly includes it.

---

## XIV. Append-Only Persistence Rule

### 1. Default Rule

Audit records are append-only.

Once persisted, an audit event must not be updated or deleted by normal runtime behavior.

### 2. Forbidden Runtime Mutations

Runtime implementation must not provide ordinary business paths for:

- editing audit event content
- deleting audit event content
- overwriting audit metadata
- rewriting event outcome
- changing actor/subject/client fields after persistence

### 3. Retention Exception

Audit retention, archival, or deletion policy is not part of Sprint 16.

If retention behavior is later needed, it must be defined by a separate approved contract and must not silently alter this append-only rule.

### 4. Correction Strategy

If an audit event is wrong, the preferred strategy is:

- append a correction event
- do not mutate the original event

---

## XV. Secret Redaction Rules

### 1. Absolute Forbidden Values

Audit records must never persist or log raw:

- password
- access token
- ID Token
- refresh token
- authorization code
- code verifier
- client secret
- private key material
- session cookie value
- CSRF token
- email verification token
- password reset token
- full authorization header

### 2. High-Risk Values

The following require explicit approval before persistence:

- password hash
- refresh token hash
- access token hash
- ID Token hash
- authorization code hash
- CSRF token hash
- IP address
- full user agent
- raw email address
- full error stack

Default position:

- do not persist these values unless required by contract and justified.

### 3. Preferred Safe References

Prefer:

- `sub`
- `clientId`
- internal `sessionId`
- internal `tokenFamilyId`
- `eventId`
- `correlationId`
- `requestId`
- `keyId`
- masked email
- email hash if explicitly approved
- reason code

### 4. Redaction Behavior

If forbidden values are provided to audit service:

Implementation must do one of the following according to Sprint 16 implementation decision:

- reject the event
- sanitize the event
- drop forbidden metadata keys
- replace value with a fixed marker such as `[REDACTED]`

The selected behavior must be deterministic and documented in Sprint 16 report.

### 5. Logging Rule

Audit implementation must not log forbidden values during validation failure, persistence failure, or diagnostic handling.

---

## XVI. Producer Responsibilities

### 1. Producer Definition

A producer is any module that calls `audit.service` to record an event.

Candidate producers:

- `auth`
- `users`
- `verification`
- `password-reset`
- `oidc`
- `admin`
- `jobs`
- `system`

### 2. Producer Obligations

Producer modules must:

- keep ownership of their own business decisions
- call audit only after determining event outcome
- pass only approved event fields
- avoid passing raw secrets
- avoid passing full request/response objects
- avoid passing full domain models
- provide safe references instead of sensitive values
- handle audit failure according to contract
- not import audit repository directly

### 3. Producer Forbidden Behavior

Producer modules must not:

- rely on audit to validate credentials
- rely on audit to issue tokens
- rely on audit to revoke tokens
- rely on audit to invalidate sessions
- rely on audit to authorize admin action
- send raw password/token/secret data to audit
- treat audit persistence as primary business state

### 4. Sprint Ownership Rule

A sprint may add producer events only for flows inside its approved scope.

Examples:

- Sprint 16 may establish audit service and minimal approved producers.
- Sprint 17 may add admin action producers.
- Sprint 18 may add client lifecycle producers.
- Sprint 20 may add key lifecycle producers.

---

## XVII. Audit Failure Behavior

### 1. Default Behavior

Default audit failure behavior is fail-open for non-critical events.

This means:

- the primary business flow may continue if audit persistence fails
- the failure must be logged safely through operational logging
- no raw event payload or secret may be logged

### 2. Security-Critical Events

For events classified as security-critical, the owning sprint contract may define fail-closed behavior.

Examples that may require fail-closed in future contracts:

- admin privilege mutation
- key rotation state mutation
- client secret rotation
- security policy override

Sprint 16 does not define broad fail-closed behavior unless explicitly approved.

### 3. Failure Recording

If audit recording fails:

- do not retry indefinitely inside the request path
- do not leak event payload in error response
- do not expose persistence internals to clients
- do not mutate business state to compensate unless separately approved

### 4. Report Requirement

Sprint 16 report must state the implemented failure behavior.

---

## XVIII. Query / Read Boundary

### 1. Default Position

Sprint 16 may implement repository-level bounded query/read methods if approved, but it should not expose public HTTP audit query endpoints unless access control is approved.

### 2. Query API Requires Approval

Audit query/read API requires explicit approval for:

- allowed caller
- authorization boundary
- filters
- pagination
- returned fields
- redaction behavior
- sorting
- maximum result size

### 3. Allowed Query Filters

Allowed if approved:

- `eventType`
- `category`
- `severity`
- `outcome`
- `actor.type`
- `actor.sub`
- `actor.adminSub`
- `actor.clientId`
- `subject.type`
- `subject.id`
- `subject.sub`
- `client.clientId`
- `correlationId`
- `requestId`
- `occurredAt` range
- `createdAt` range

### 4. Forbidden Query Behavior

Audit query must not:

- accept arbitrary Mongo query objects from request input
- expose full metadata blindly
- expose raw secrets
- expose token hashes unless explicitly approved
- expose private key material
- expose cookies
- expose authorization headers
- allow unbounded scans
- provide unauthenticated public access
- become admin dashboard implementation

### 5. Controller Rule

`src/modules/audit/audit.controller.ts` may be created only if query/read API is approved.

If not approved, do not create audit controller in Sprint 16.

---

## XIX. Controller Boundary

If an audit controller is approved:

- controller must remain thin
- controller must delegate to audit service
- controller must not implement query policy beyond request parsing/response mapping
- controller must not access repository directly
- controller must not expose raw metadata
- controller must not allow arbitrary query object passthrough
- controller must not implement admin authorization unless approved by admin contract

---

## XX. Repository Boundary

Audit repository must:

- own audit event persistence only
- use audit event model only
- provide append-only create behavior
- provide bounded query only if approved
- not import other module models
- not mutate non-audit collections
- not implement business decisions
- not implement redaction policy that belongs in service unless explicitly designed as persistence guard

---

## XXI. Service Boundary

Audit service must:

- be the module-facing audit API
- validate event shape
- normalize event input
- enforce redaction/sanitization/rejection behavior
- delegate persistence to audit repository
- expose query/read only if approved
- not implement business workflows from other modules
- not directly access non-audit persistence
- not use raw external low-level dependencies if approved infrastructure abstraction exists

---

## XXII. Storage Contract

### 1. Persistence Store

Audit event records should be persisted in the existing database layer unless a later contract approves a different store.

### 2. Collection Naming

Recommended collection name:

- `audit_events`

### 3. Indexing

Recommended indexes, subject to implementation feasibility:

- `eventId` unique
- `eventType`
- `category`
- `severity`
- `outcome`
- `actor.sub`
- `actor.adminSub`
- `actor.clientId`
- `subject.type`
- `subject.id`
- `client.clientId`
- `correlationId`
- `occurredAt`
- `createdAt`

Indexes must not require storing forbidden raw secrets.

### 4. Retention

Retention is out of Sprint 16 scope.

No retention deletion job may be implemented in Sprint 16 unless this contract is amended.

---

## XXIII. Approved Event Examples

### 1. Login Success

Allowed safe event shape:

```json
{
  "eventType": "auth.login.success",
  "category": "auth",
  "severity": "info",
  "outcome": "success",
  "actor": {
    "type": "user",
    "sub": "user-sub"
  },
  "subject": {
    "type": "user",
    "sub": "user-sub"
  },
  "request": {
    "method": "POST",
    "path": "/login",
    "correlationId": "request-correlation-id"
  },
  "reasonCode": "LOGIN_SUCCESS"
}
```

### 2. Login Failure

Allowed safe event shape:

```json
{
  "eventType": "auth.login.failure",
  "category": "auth",
  "severity": "warning",
  "outcome": "failure",
  "actor": {
    "type": "unknown"
  },
  "subject": {
    "type": "user"
  },
  "request": {
    "method": "POST",
    "path": "/login",
    "correlationId": "request-correlation-id"
  },
  "reasonCode": "INVALID_CREDENTIALS"
}
```

Forbidden:

- storing submitted email/password pair
- storing raw password
- storing full request body

### 3. Token Issued

Allowed safe event shape:

```json
{
  "eventType": "oidc.token.issued",
  "category": "token",
  "severity": "info",
  "outcome": "success",
  "actor": {
    "type": "client",
    "clientId": "client-id"
  },
  "subject": {
    "type": "user",
    "sub": "user-sub"
  },
  "client": {
    "clientId": "client-id",
    "grantType": "authorization_code"
  },
  "reasonCode": "TOKEN_ISSUED"
}
```

Forbidden:

- access token
- ID Token
- refresh token
- authorization code
- client secret
- token response body

### 4. Refresh Token Reuse Detected

Allowed safe event shape:

```json
{
  "eventType": "oidc.refresh.reuse_detected",
  "category": "security",
  "severity": "critical",
  "outcome": "denied",
  "actor": {
    "type": "client",
    "clientId": "client-id"
  },
  "subject": {
    "type": "token_family",
    "tokenFamilyId": "internal-family-id"
  },
  "client": {
    "clientId": "client-id"
  },
  "reasonCode": "REFRESH_REUSE_DETECTED"
}
```

Forbidden:

- raw refresh token
- refresh token hash unless explicitly approved
- full token family record

### 5. Logout Completed

Allowed safe event shape:

```json
{
  "eventType": "oidc.logout.completed",
  "category": "session",
  "severity": "info",
  "outcome": "success",
  "actor": {
    "type": "user",
    "sub": "user-sub"
  },
  "subject": {
    "type": "session",
    "sessionId": "internal-session-id"
  },
  "reasonCode": "LOGOUT_COMPLETED"
}
```

Forbidden:

- session cookie value
- CSRF token
- raw token
- full session record

---

## XXIV. Disallowed Event Examples

### 1. Full Request Body

Forbidden:

```json
{
  "metadata": {
    "body": {
      "email": "user@example.com",
      "password": "plain-password"
    }
  }
}
```

Reason:

- leaks credentials
- violates metadata boundary
- violates secret redaction rules

### 2. Token Response Body

Forbidden:

```json
{
  "metadata": {
    "access_token": "raw-access-token",
    "id_token": "raw-id-token",
    "refresh_token": "raw-refresh-token"
  }
}
```

Reason:

- raw token persistence is forbidden
- token response body must not be audited

### 3. Client Secret

Forbidden:

```json
{
  "client": {
    "clientId": "client-id",
    "clientSecret": "raw-client-secret"
  }
}
```

Reason:

- client secret persistence in audit is forbidden

---

## XXV. Implementation Requirements

Sprint 16 implementation must include:

- audit event model
- audit repository
- audit service
- append-only persistence
- explicit payload shape
- redaction-safe metadata handling
- validation/sanitization/rejection of forbidden fields
- bounded query/read only if approved
- report evidence

Sprint 16 implementation must not include:

- broad producer integration across all modules unless approved
- admin controls
- client management behavior
- key rotation behavior
- observability metrics expansion
- external SIEM/log pipeline
- audit dashboard UI
- business state mutation

---

## XXVI. Validation Requirements

### 1. Static Validation

Required commands:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run format:check`
- `npm.cmd run build`

### 2. Boundary Scans

Required commands:

- `rg -n "process\\.env" src --glob "!src/config/**"`
- `rg -n "console\\.log" src`
- `rg -n "UserModel|user\\.repository|RefreshToken|Session|ClientModel|AuthorizationCode" src/modules/audit`
- `rg -n "updateOne|deleteOne|findOneAndUpdate|findByIdAndUpdate" src/modules/audit`
- `rg -n "sign|jwt|issue|generate.*token|revoke|introspect|invalidate.*session" src/modules/audit`
- `rg -n "password|password_hash|passwordHash|client_secret|clientSecret|refresh_token|access_token|id_token|authorization_code|code_verifier|private.*key|BEGIN PRIVATE KEY|csrf" src/modules/audit`

### 3. Expected Validation Interpretation

Expected:

- no direct `process.env` outside `src/config`
- no `console.log`
- no direct user/token/session/client model access from `audit`
- no cross-domain mutation from `audit`
- no token issuance, revoke, introspection, or session invalidation behavior in `audit`
- no raw secret persistence or logging in audit implementation
- any security-sensitive keyword match is reviewed and explained

### 4. Format Drift Handling

If repository-wide `npm.cmd run format:check` fails because of accepted external formatting baseline drift, Sprint 16 report must include:

- exact command result
- FAIL status for global format check
- scoped touched-file Prettier result
- confirmation that Sprint 16 touched files pass formatting
- confirmation that Sprint 16 did not mix unrelated formatting cleanup

---

## XXVII. Manual Validation Requirements

Sprint 16 must manually validate:

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
12. Audit failure behavior matches this contract.
13. Producer integration, if implemented, emits only approved event types.
14. Producer integration, if implemented, does not change existing domain behavior.
15. Audit query/read API, if implemented, uses bounded filters only.
16. Audit query/read API, if implemented, does not expose raw secret fields.
17. Audit controller, if implemented, remains thin.
18. No audit query/read HTTP route exists if not approved by contract.
19. No new runtime folder outside approved source tree is created.
20. Sprint 16 does not introduce admin controls, client management, key rotation, or observability hardening.

---

## XXVIII. PR Requirements

Sprint 16 PR must include:

- phase/sprint/task references
- source-of-truth references
- this audit event contract reference
- Phase 06 phase plan reference
- Sprint 16 assignment reference
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

---

## XXIX. Merge-Blocking Conditions

Block Sprint 16 if:

- this contract is missing or not referenced
- Sprint 16 assignment is missing or not referenced
- implementation starts before this contract is approved
- audit event schema does not match this contract
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

## XXX. Definition of Done

This contract is satisfied when Sprint 16 implementation proves:

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
- validation evidence is recorded
- Sprint 16 report is created

---

## XXXI. Handoff to Sprint 17

Sprint 16 must hand off to Sprint 17:

- audit service API
- approved event categories
- approved event types
- actor/subject/client/request metadata model
- redaction rules
- failure behavior
- query/read boundary status
- producer integration status
- known limitations
- deferred producer events
- accepted validation conditions
- unresolved security or architecture risks

Sprint 16 does not authorize Sprint 17 implementation by itself.

Sprint 17 must start from:

- approved `docs/contracts/admin/admin-control-contract.md`
- approved `docs/contracts/audit/audit-event-contract.md`
- approved `docs/planning/assignments/phase-06-sprint-17.md`
