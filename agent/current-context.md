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
- Phase 06 runtime implementation: IN PROGRESS (Sprint 16 complete in `main`; Sprint 17 not started).
- Sprint 16 merge evidence:
  - PR: `#49`
  - PR merged: `2026-05-08`
  - runtime commit: `c17c3aecf29927b3c69cf61b791cac49d98f8dc5`
  - merge commit on `main`: `45d0f24c8f68d77a7a3f878ac3c7ce8188d87980`
  - post-merge audit result: `APPROVE`
  - corrective action: `NONE REQUIRED`
- Next sprint: Sprint 17 - Admin Module Controls.
- Sprint 17 status: PENDING SOURCE INTAKE / BLOCKED BEFORE CONTRACT AND ASSIGNMENT APPROVAL.
- Sprint 17 gate: do not start runtime until Sprint 17 source documents are provided and approved.

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
- Do not move refresh token lifecycle, rotation, revoke, introspection, session, SSO, or logout hardening into Phase 04.

## IV. Phase 05 Validation Summary

- Sprint 11-15 validation posture:
  - `npm.cmd run lint`: PASS
  - `npm.cmd run typecheck`: PASS
  - `npm.cmd run build`: PASS
  - `npm.cmd run format:check`: FAIL due accepted external repository-wide formatting baseline drift outside sprint-scoped touched files
  - scoped touched-file Prettier checks: PASS
  - boundary scans: PASS / PASS WITH REVIEW
  - runtime/manual harnesses: PASS

## V. Known Condition

- Global `npm.cmd run format:check` remains failing due accepted external repository-wide formatting baseline drift outside Sprint 11-15 touched files.

## VI. Next Recommended Step

- Keep Sprint 16 marked MERGED / CLOSED / PRESENT IN `main`.
- Prepare Sprint 17 source intake only (contract/assignment documents first).
- Keep Sprint 17 runtime blocked until Sprint 17 source documents are provided and approved.
