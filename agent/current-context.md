# eTroy OIDC - Current Context

## I. Purpose

This file captures the current operational state of the project for fast session continuity.
It summarizes approved state and next actions without redefining architecture.

## II. Current Project State

- Documentation authority model is active: `docs/` is authoritative, `agent/` is support only.
- Phase 04 - OIDC Core: CLOSED.
- Sprint 08: CLOSED - authorize endpoint validation baseline.
- Sprint 09: CLOSED - token endpoint and authorization-code exchange baseline.
- Sprint 10: CLOSED - JWT access token, ID Token, claims mapper, and `/userinfo`.
- Phase 05 is active.
- Sprint 11 - Refresh Token Foundation: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 12 - Refresh Token Rotation + Reuse Detection: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 13 - Revoke + Introspection: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 14 - Session + SSO:
  - MERGED / CLOSED / PRESENT IN `main`
  - runtime commit: `53139b0e08f708d8e5fed3cafdcfb412f45d61a0`
  - status: COMPLETE WITH ACCEPTED EXTERNAL FORMAT CONDITION
- Sprint 15 - Logout Hardening:
  - implementation completed on branch `feature/oidc-sprint15-logout-hardening`
  - pending PR review/merge

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

## IV. Sprint 14 Validation Summary

- Validation status:
  - `npm.cmd run lint`: PASS
  - `npm.cmd run typecheck`: PASS
  - `npm.cmd run build`: PASS
  - `npm.cmd run format:check`: FAIL due accepted external repository-wide formatting baseline drift outside Sprint 14 touched files
  - scoped Sprint 14 touched-file Prettier check: PASS
  - boundary scans: PASS / PASS WITH REVIEW
  - `SPRINT14_RUNTIME_HARNESS=PASS`

## V. Known Condition

- Global `npm.cmd run format:check` remains failing due accepted external repository-wide formatting baseline drift outside Sprint 14 touched files.

## VI. Next Recommended Step

- Open Sprint 15 PR with validation evidence and contract references; do not merge directly to `main`.
