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
- Sprint 13 - Revoke + Introspection:
  - implementation complete
  - docs gate commit: `67fd737`
  - runtime/report commit: `e39ecba`
  - branch pushed: `feature/oidc-sprint13-revoke-introspection`
  - PR-ready / ready for review / ready to merge pending reviewer approval
  - status: COMPLETE WITH ACCEPTED EXTERNAL FORMAT CONDITION

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

## IV. Sprint 13 Validation Summary

- Validation status:
  - `npm.cmd run lint`: PASS
  - `npm.cmd run typecheck`: PASS
  - `npm.cmd run build`: PASS
  - boundary scans: PASS / PASS WITH REVIEW
  - runtime/manual Sprint 13 scenarios 1-19: PASS
- Scoped Sprint 13 touched-file Prettier check: PASS.

## V. Known Condition

- Global `npm.cmd run format:check` remains failing due accepted external repository-wide formatting baseline drift outside Sprint 13 touched files.

## VI. Next Recommended Step

- Open/review/merge Sprint 13 PR.
- After Sprint 13 merge, begin Sprint 14 planning only from approved Sprint 14 assignment/contract.
- Sprint 14 must not start implementation until approved assignment/contract exists.
