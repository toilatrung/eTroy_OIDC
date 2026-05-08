# eTroy OIDC - Master Execution Plan (v2)

---

## I. Purpose

This document defines how eTroy OIDC is executed from:

- architecture contracts (`system-overview.md`, `module-boundaries.md`, `source-tree.md`)
- requirements contract (`srs-v1.md`)

into a controlled, production-ready implementation workflow.

Objectives:

- ensure implementation follows approved architecture
- standardize team execution workflow
- prevent architectural drift
- drive delivery to production-ready quality

---

## II. Scope

This document does **not** define:

- system design (owned by `system-overview.md`)
- product requirements (owned by `srs-v1.md`)

This document defines:

- execution strategy
- phase and sprint structure
- development workflow
- quality and governance control

---

## III. Execution Model

### 1. Development Lifecycle (Mandatory)

Contract -> Review -> Approve -> Implement -> Validate -> PR -> Review -> Merge

### 2. Contract-first Principle

All implementation must begin from approved contracts:

- API contracts
- flow definitions
- data schemas
- claim definitions

Rules:

- no contract -> no code
- contract not approved -> no implementation
- contract bypass is forbidden

### 3. Source of Truth Binding

All code must align with:

- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/architecture/system-overview.md`
- `docs/requirements/srs-v1.md`

---

## IV. Architectural Enforcement

### 1. Absolute Rules

Forbidden:

- `auth` generates token
- `oidc` directly accesses ownership user data in database
- client owns/stores identity as primary source
- refresh token stored raw

### 2. Boundary Enforcement

- modules may call only approved dependencies
- layer bypass is forbidden
- duplicate logic across module ownership boundaries is forbidden

### 3. Violation Handling

- boundary violation -> PR rejected
- security violation -> immediate rejection
- contract violation -> implementation rollback and correction

---

## V. Phase Strategy (Production Model)

### Phase 01 - Environment and Infrastructure Foundation

Objective:

- establish runtime and infrastructure baseline

Scope:

- repository structure alignment
- TypeScript baseline
- configuration system
- environment distribution
- logger
- MongoDB integration
- Redis integration
- base error handling

Sprints:

- Sprint 01 - Environment Bootstrap
- Sprint 02 - Config Distribution Standard
- Sprint 03 - Infrastructure Layer

### Phase 02 - Identity Core

Objective:

- implement identity core under single-source-of-truth principles

Scope:

- `users` module
- `auth` module (credential validation only)
- password hashing
- email uniqueness
- profile update
- password change

Sprints:

- Sprint 04 - User Module
- Sprint 05 - Auth Module

### Phase 03 - Account Lifecycle

Objective:

- complete user account lifecycle flows

Scope:

- email verification
- password reset
- unified non-OIDC token lifecycle for verification and reset use cases

Sprints:

- Sprint 06 - Verification Module
- Sprint 07 - Password Reset Module

### Phase 04 - OIDC Core

Objective:

- implement OpenID Connect provider core

Scope:

- authorization endpoint (`/authorize`)
- token endpoint (`/token`)
- PKCE validation
- Authorization Code Flow
- ID Token RSA signing
- claims mapping (`claims.mapper`)

Sprints:

- Sprint 08 - Provider Foundation + Authorization Endpoint
- Sprint 09 - Token Endpoint + Authorization Code Exchange
- Sprint 10 - ID Token + Claims + UserInfo

### Phase 05 - Token and Session Management

Objective:

- enforce secure token and session lifecycle

Scope:

- access token lifecycle management
- refresh token lifecycle management (hashed persistence only)
- token rotation
- token revoke
- introspection if approved by Phase 05 planning
- session management
- SSO behavior
- logout hardening if approved by Phase 05 planning

Sprints:

- Sprint 11+ - Token and Session Lifecycle Sprints

### Phase 06 - Platform and Governance Hardening

Objective:

- reach production-ready governance and platform controls

Scope:

- client management
- admin module controls
- audit logging
- observability (metrics + logging)
- key rotation (JWKS)
- security hardening

Sprints:

- Later Sprint - Logging and Audit
- Later Sprint - Governance Extension Tasks

---

## VI. Sprint Strategy

Principles:

- sprints must be small and measurable
- sprint scopes must not overlap ambiguously
- dependencies must be explicit

Each sprint must include:

- concrete deliverables
- acceptance criteria
- explicit contract references

---

## VII. Task Definition

Each task must include:

- context (reference document)
- module ownership
- input and output
- acceptance criteria

---

## VIII. Development Workflow

### 1. Standard Flow

Task -> Contract -> Implementation -> PR -> Review -> Merge

### 2. PR Requirements

Each PR must include:

- context
- affected module
- references:
  - `srs-v1.md`
  - `module-boundaries.md`
  - `source-tree.md`

### 3. Review Checklist Focus

- correct module ownership
- no boundary violation
- no duplicate logic
- no security regression
- requirement alignment with SRS

### 4. Blocking Rules

Reject PR if:

- module boundaries are violated
- data ownership is incorrect
- no contract basis is provided
- logic is hardcoded against approved architecture

---

## IX. Definition of Done

A task is complete when:

- code is in the correct module ownership area
- no boundary rules are violated
- required tests and validations pass
- review is completed
- no approved flow is broken

---

## X. Quality Gates

### 1. Code Quality

- no duplicate logic
- clear naming
- no dead code leakage

### 2. Security

- password always hashed
- required tokens signed
- refresh token hashed only
- input validation enforced

### 3. Architecture

- no layer bypass
- no forbidden dependency
- module ownership enforced

---

## XI. Risk Management

### 1. Technical Risks

- boundary failure -> structural instability
- token handling defects -> security breach
- session handling defects -> SSO failure

### 2. Process Risks

- implementation without contract discipline
- weak review enforcement
- missing governance controls

---

## XII. Metrics

Track at minimum:

- authentication success rate
- token issuance rate
- error rate
- security incident trend

---

## XIII. Change Management

For requirement or architecture changes:

1. update requirement and architecture documents first
2. update execution references as needed
3. implement only after document alignment

Forbidden:

- coding first and updating contracts later
- silent architecture changes

---

## XIV. Conclusion

The Master Execution Plan governs delivery by enforcing:

- contract-first execution
- architecture and quality controls
- production-focused phase progression

It is the operational control layer that keeps implementation aligned with approved system contracts.

---

## Current Status

- Architecture: completed
- Requirements: completed
- Execution Plan: active and controlling
- Phase 01 - Environment and Infrastructure Foundation: CLOSED
- Phase 02 - Identity Core: CLOSED
- Phase 03 - Account Lifecycle: CLOSED
- Phase 04 - OIDC Core: CLOSED
- Phase 05 - Token and Session Management: CLOSED
- Current next phase: Phase 06 - Platform and Governance Hardening
- Phase 06 status: APPROVED FOR CONTRACT-BACKED EXECUTION
- Phase 06 runtime implementation: IN PROGRESS
- Sprint 16 - Audit Logging Foundation: MERGED / CLOSED / PRESENT IN `main`
- Sprint 17 - Admin Module Controls: MERGED / CLOSED / PRESENT IN `main`
- Sprint 17 PR: `#53` (merged `2026-05-08`)
- Sprint 17 runtime commit: `15302ea`
- Sprint 17 post-merge audit: APPROVE (no corrective action required)
- Next sprint: Sprint 18 - OIDC Client Management
- Sprint 18 status: READY FOR INTAKE
- Sprint 18 runtime: NOT STARTED

---

## Next Step

Wait for Sprint 18 contract and assignment approval before beginning Sprint 18 runtime implementation.
