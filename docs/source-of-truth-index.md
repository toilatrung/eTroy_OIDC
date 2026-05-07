# eTroy OIDC - Source of Truth Index

## I. Purpose

This document defines the documentation authority model for eTroy OIDC.
It exists to prevent ambiguity, enforce contract-first execution, and stop architectural drift.

## II. Authority Model

- `docs/` is the authoritative documentation layer.
- `agent/` is an operational support layer only.
- `agent/` files must never override approved documents in `docs/`.
- `source-tree.md` is the primary repository structure contract.
- `detailed-source-tree.md` is a supporting reference only.

## III. Approved Source-of-Truth Documents

### 1. Architecture

- `docs/architecture/system-overview.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/architecture/detailed-source-tree.md`

### 2. Requirements

- `docs/requirements/srs-v1.md`

### 3. Contracts

- `docs/contracts/oidc/jwt-token-contract.md`
- `docs/contracts/oidc/refresh-token-contract.md`
- `docs/contracts/oidc/refresh-token-rotation-contract.md`
- `docs/contracts/oidc/token-revoke-introspection-contract.md`
- `docs/contracts/oidc/session-sso-contract.md`
- `docs/contracts/oidc/logout-hardening-contract.md`
- `docs/contracts/audit/audit-event-contract.md` (Draft for approval)

### 4. Planning

- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-01-environment-bootstrap.md`
- `docs/planning/phases/phase-02-identity-core.md`
- `docs/planning/phases/phase-03-account-lifecycle.md`
- `docs/planning/phases/phase-04-oidc-core.md`
- `docs/planning/phases/phase-05-token-session-management.md`
- `docs/planning/phases/phase-06-platform-governance-hardening.md`
- `docs/planning/reports/phase-05-consolidated-report.md`

### 5. Governance

- `docs/governance/git-rules.md`
- `docs/governance/pr-template.md`
- `docs/governance/review-checklist.md`
- `docs/governance/anti-patterns.md`

## IV. Reading Order

Recommended reading order for humans and AI agents:

1. `docs/source-of-truth-index.md`
2. `docs/README.md`
3. `docs/architecture/system-overview.md`
4. `docs/architecture/module-boundaries.md`
5. `docs/architecture/source-tree.md`
6. `docs/architecture/detailed-source-tree.md`
7. `docs/requirements/srs-v1.md`
8. `docs/planning/master-execution-plan.md`
9. `docs/planning/phases/phase-01-environment-bootstrap.md`
10. `docs/planning/phases/phase-02-identity-core.md`
11. `docs/planning/phases/phase-03-account-lifecycle.md`
12. `docs/planning/phases/phase-04-oidc-core.md`
13. `docs/planning/phases/phase-05-token-session-management.md`
14. `docs/planning/phases/phase-06-platform-governance-hardening.md`
15. `docs/planning/reports/phase-05-consolidated-report.md`
16. `docs/contracts/oidc/jwt-token-contract.md`
17. `docs/contracts/oidc/refresh-token-contract.md`
18. `docs/contracts/oidc/refresh-token-rotation-contract.md`
19. `docs/contracts/oidc/token-revoke-introspection-contract.md`
20. `docs/contracts/oidc/session-sso-contract.md`
21. `docs/contracts/oidc/logout-hardening-contract.md`
22. `docs/contracts/audit/audit-event-contract.md`
23. Relevant sprint assignment under `docs/planning/assignments/`, selected from the execution prompt or current task context
24. Relevant sprint report under `docs/planning/reports/`, when reviewing completed work or continuing from prior implementation
25. `docs/governance/git-rules.md`
26. `docs/governance/pr-template.md`
27. `docs/governance/review-checklist.md`
28. `docs/governance/anti-patterns.md`

Sprint assignment and report documents are task-context documents. They must not be hard-coded as fixed reading-order entries in this index.

Current phase execution baseline:

- Phase 01: CLOSED
- Phase 02: CLOSED
- Phase 03: CLOSED
- Phase 04: CLOSED
- Phase 05: CLOSED
- Current next phase: Phase 06 - Platform and Governance Hardening
- Phase 06 status: APPROVED FOR CONTRACT-BACKED EXECUTION
- Phase 06 runtime implementation: NOT STARTED
- Next sprint: Sprint 16 - Audit Logging Foundation
- Sprint 16 runtime gate: BLOCKED UNTIL `docs/contracts/audit/audit-event-contract.md` and `docs/planning/assignments/phase-06-sprint-16.md` are approved
- Phase 06 planning themes (high-level only): audit logging, admin controls, client management, observability, key rotation, security hardening

## V. Conflict Resolution Rules

When documents conflict, resolve in this order:

1. `docs/source-of-truth-index.md`
2. `docs/README.md`
3. architecture documents
4. requirements documents
5. planning documents
6. governance documents
7. `agent/` operational files

Additional rule:

- if `source-tree.md` and `detailed-source-tree.md` differ, `source-tree.md` wins.

Undocumented architecture changes are invalid until approved and reflected in the authoritative docs.

## VI. Update Rules

- Update contracts before implementation.
- Do not merge structural or architectural changes without source-of-truth updates.
- Keep naming and ownership semantics consistent with architecture contracts.
- Treat governance updates as merge-affecting changes.

## VII. Non-Authoritative Materials

The following are non-authoritative and cannot override `docs/` contracts:

- `agent/current-context.md`
- `agent/session-history.md`
- `agent/handoff-template.md`
- `agent/roles/*`
- `agent/prompts/*`
- ad-hoc notes, scratch docs, historical transcripts, or deprecated drafts

Deprecated or historical materials are reference-only and must not override approved current documents.

## VIII. Usage Guidance for Humans and Agents

- Use `docs/` to determine what is officially correct.
- Use `agent/` to understand current operational state and handoff context.
- Before coding or review, load architecture contracts first.
- Treat merge-blocking governance checks as mandatory, not advisory.

## IX. Conclusion

This index is the entry point for documentation authority in eTroy OIDC.
It protects contract-first execution, module ownership, and repository governance across human and AI workflows.
