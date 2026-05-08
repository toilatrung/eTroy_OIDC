# eTroy OIDC - Documentation Guide

## I. Purpose

This file is the main documentation entry point for humans and AI agents.
It explains where to start, how documents are organized, and how to follow the source-of-truth hierarchy.

## II. Documentation Structure

### 1. Architecture

Location: `docs/architecture/`

Purpose: define system design, boundary enforcement, and physical repository contracts.

### 2. Requirements

Location: `docs/requirements/`

Purpose: define required behavior, scope boundaries, and acceptance criteria.

### 3. Planning

Location: `docs/planning/`

Purpose: define execution control, phases, and sprint-level operational sequencing.

### 4. Governance

Location: `docs/governance/`

Purpose: define repository control, PR discipline, and merge-blocking review rules.

## III. Recommended Reading Paths

### 1. For architecture understanding

Read:

1. `docs/source-of-truth-index.md`
2. `docs/architecture/system-overview.md`
3. `docs/architecture/module-boundaries.md`
4. `docs/architecture/source-tree.md`
5. `docs/architecture/detailed-source-tree.md`

### 2. For implementation work

Read:

1. `docs/source-of-truth-index.md`
2. architecture documents
3. `docs/requirements/srs-v1.md`
4. `docs/planning/master-execution-plan.md`
5. current phase file in `docs/planning/phases/`

### 3. For repository governance and review

Read:

1. `docs/source-of-truth-index.md`
2. `docs/governance/git-rules.md`
3. `docs/governance/pr-template.md`
4. `docs/governance/review-checklist.md`
5. `docs/governance/anti-patterns.md`

### 4. For AI agent loading

Load in this sequence:

1. `docs/source-of-truth-index.md`
2. this file (`docs/README.md`)
3. architecture contracts
4. requirements contract
5. planning controls
6. governance controls
7. `agent/` operational context files

## IV. Source-of-Truth Notes

- `docs/source-of-truth-index.md` is the authority file for documentation precedence.
- `docs/` is authoritative.
- `agent/` is operational support and must not redefine architecture or requirements.
- `source-tree.md` is primary.
- `detailed-source-tree.md` is supporting detail only.

## V. Document Map

- `system-overview.md` -> high-level architecture and system role
- `module-boundaries.md` -> module ownership and dependency rules
- `source-tree.md` -> primary physical structure contract
- `detailed-source-tree.md` -> supporting file-level detail reference
- `srs-v1.md` -> requirements contract
- `master-execution-plan.md` -> execution control model
- `phase-01-environment-bootstrap.md` -> completed foundation phase breakdown
- `phase-02-identity-core.md` -> identity core phase breakdown
- `phase-03-account-lifecycle.md` -> account lifecycle phase breakdown
- `phase-04-oidc-core.md` -> OIDC core phase breakdown
- `phase-05-token-session-management.md` -> Phase 05 closed scope and boundary baseline
- `phase-05-consolidated-report.md` -> Phase 05 closure and merge/validation evidence
- `phase-06-platform-governance-hardening.md` -> Phase 06 approved contract-backed execution plan (runtime in progress)
- `docs/planning/assignments/` -> sprint-level assignment documents defining execution scope and task contracts
- `docs/planning/reports/` -> sprint/phase execution evidence, validation results, and handoff context
- `phase-06-sprint-16.md` -> Sprint 16 Audit Logging Foundation assignment (merged / closed / present in `main`)
- `phase-06-sprint-17.md` -> Sprint 17 Admin Module Controls assignment (approved for runtime implementation)
- `docs/contracts/oidc/jwt-token-contract.md` -> JWT Token Contract (Phase 04 / Sprint 10)
- `docs/contracts/oidc/refresh-token-contract.md` -> Refresh Token Foundation Contract (Phase 05 / Sprint 11)
- `docs/contracts/oidc/refresh-token-rotation-contract.md` -> Refresh Token Rotation Contract (Phase 05 / Sprint 12)
- `docs/contracts/oidc/token-revoke-introspection-contract.md` -> Revoke and Introspection Contract (Phase 05 / Sprint 13)
- `docs/contracts/oidc/session-sso-contract.md` -> Session and SSO Contract (Phase 05 / Sprint 14)
- `docs/contracts/oidc/logout-hardening-contract.md` -> Logout Hardening Contract (Phase 05 / Sprint 15)
- `docs/contracts/audit/audit-event-contract.md` -> Audit Event Contract
- `docs/contracts/admin/admin-control-contract.md` -> Admin Control Contract (approved for Sprint 17 runtime implementation)
- governance documents -> repository control and merge discipline
- `anti-patterns.md` -> merge-blocking anti-pattern reference aligned with architecture and governance

Current planning status:

- Phase 01: CLOSED
- Phase 02: CLOSED
- Phase 03: CLOSED
- Phase 04: CLOSED
- Phase 05: CLOSED
- Current next phase: Phase 06 - Platform and Governance Hardening
- Phase 06 status: APPROVED FOR CONTRACT-BACKED EXECUTION
- Phase 06 runtime implementation: IN PROGRESS
- Sprint 16 - Audit Logging Foundation: MERGED / CLOSED / PRESENT IN `main`
- Sprint 16 PR: `#49` (merged `2026-05-08`)
- Sprint 16 runtime commit: `c17c3aecf29927b3c69cf61b791cac49d98f8dc5`
- Sprint 16 post-merge audit: APPROVE (no corrective action required)
- Next sprint: Sprint 17 - Admin Module Controls
- Admin Control Contract: Approved for Sprint 17 runtime implementation
- Sprint 17 Assignment: Approved for Sprint 17 runtime implementation
- Next step: start Sprint 17 runtime on a dedicated Sprint 17 feature branch from updated `main`
- Phase 06 planning themes (high-level only): audit logging, admin controls, client management, observability, key rotation, security hardening

## VI. Maintenance Rules

- Keep documents aligned with approved authority order.
- Update contracts before implementation changes.
- Do not introduce undocumented architecture changes.
- Keep markdown render-safe and terminology consistent.
- Treat governance and source-of-truth changes as review-critical.

## VII. Conclusion

This guide keeps the documentation set navigable, enforceable, and operationally reliable for both humans and AI agents.
