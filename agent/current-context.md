# eTroy OIDC - Current Context

## I. Purpose

This file captures the current operational state of the project for fast session continuity.
It summarizes approved state and next actions without redefining architecture.

## II. Current Project State

- Documentation authority model is active: `docs/` is authoritative, `agent/` is support only.
- Phase 01 - Environment and Infrastructure Foundation: CLOSED.
- Phase 02 - Identity Core: CLOSED.
- Phase 03 - Account Lifecycle: CLOSED.
- Phase 04 - OIDC Core: CLOSED.
- Sprint 08: CLOSED - authorize endpoint validation baseline.
- Sprint 09: CLOSED - token endpoint and authorization-code exchange baseline.
- Sprint 10: CLOSED - JWT access token, ID Token, claims mapper, and `/userinfo`.
- Phase 05 - Token and Session Management: CLOSED.
- Sprint 11 - Refresh Token Foundation: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 12 - Refresh Token Rotation + Reuse Detection: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 13 - Revoke + Introspection: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 14 - Session + SSO: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 15 - Logout Hardening: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 16 - Audit Logging Foundation: MERGED / CLOSED / PRESENT IN `main`.
- Phase 06 - Platform and Governance Hardening: APPROVED FOR CONTRACT-BACKED EXECUTION.
- Phase 06 runtime implementation: IN PROGRESS (Sprint 17 complete in `main`; Sprint 18 not started).
- Sprint 17 merge evidence:
  - PR: `#53`
  - PR merged: `2026-05-08`
  - runtime commit: `15302ea`
  - merge commit on `main`: `a41ea4b`
  - post-merge audit result: `APPROVE`
  - corrective action: `NONE REQUIRED`
- Sprint 18 - OIDC Client Management: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 18 merge evidence:
  - PR: `#54` (https://github.com/toilatrung/etroy-oidc/pull/54)
  - runtime commit: `7f0be85`
  - status: `IMPLEMENTED / MANUAL RUNTIME VALIDATED / VALIDATION EVIDENCE COMPLETE`
  - manual runtime validation:
    - DB-backed integration validation
    - local database: `etroy-oidc-runtime-test`
    - 11/11 runtime scenarios PASS
    - temporary harness `temp-validation.ts` created, executed, and removed
  - validation:
    - `npm.cmd run lint`: PASS
    - `npm.cmd run typecheck`: PASS
    - `npm.cmd run format:check`: PASS
    - `npm.cmd run build`: PASS
    - Sprint 18 boundary/security scans: PASS / PASS WITH REVIEW
    - manual validation matrix: 50/50 PASS
- Known follow-up note:
  - No unit/e2e test runner exists in `package.json`; runtime validation was DB-backed manual harness, not committed test suite.
- Next sprint: Sprint 19 - Observability Hardening.
- Sprint 19 status: READY FOR INTAKE / NOT STARTED.
- Sprint 19 gate: implementation must not begin until Sprint 19 contract and assignment are approved.

## III. Phase Boundary Notes

- Phase 04 remains closed at Sprint 08 through Sprint 10 scope only.
- Phase 05 owns:
  - access token lifecycle management
  - refresh token lifecycle management with hashed persistence
  - token rotation
  - token revoke
  - introspection if approved by Phase 05 planning
  - session management
  - SSO behavior
  - logout hardening if approved by Phase 05 planning
- Phase 06 owns:
  - OIDC client metadata lifecycle management
  - secure secret generation and hash-only persistence
  - admin-to-oidc orchestration boundaries
  - observability hardening
- Do not move refresh token lifecycle, rotation, revoke, introspection, session, SSO, or logout hardening into Phase 04.

## IV. Phase 05/06 Validation Summary

- Sprint 11-18 validation posture:
  - `npm.cmd run lint`: PASS
  - `npm.cmd run typecheck`: PASS
  - `npm.cmd run build`: PASS
  - `npm.cmd run format:check`: PASS (following repository-wide cleanup and scoped checks)
  - boundary scans: PASS / PASS WITH REVIEW
  - runtime/manual harnesses: PASS

## V. Known Condition

- Unit and E2E test runners are currently missing from `package.json`; validation relies on build/static checks and manual DB-backed harnesses.

## VI. Next Recommended Step

- Keep Sprint 18 marked MERGED / CLOSED / PRESENT IN `main`.
- Wait for Sprint 19 intake and readiness confirmation.
- Do not start Sprint 19 implementation without approved contract and assignment.
