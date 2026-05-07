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
- Sprint 11 - Refresh Token Foundation: MERGED / CLOSED.
- Sprint 12 - Refresh Token Rotation + Reuse Detection: MERGED / CLOSED.
- Sprint 12 PR #38 was merged.
- Sprint 12 branch: `feature/oidc-sprint12-refresh-token-rotation`.
- Sprint 12 was stacked on Sprint 11 branch because Sprint 11 was not yet in `main` when Sprint 12 PR was opened.

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

## IV. Sprint 12 Closure Summary

- Sprint 12 completed:
  - refresh token rotation on successful `grant_type=refresh_token`
  - token family / lineage metadata
  - consumed-token reuse detection
  - compromised family handling
  - concurrent refresh hardening
  - renewed JWT access token plus new opaque refresh token response
- Sprint 12 validation:
  - `npm.cmd run lint`: PASS
  - `npm.cmd run typecheck`: PASS
  - `npm.cmd run build`: PASS
  - scoped Prettier check for Sprint 12 touched files/report: PASS
  - boundary scans: PASS
  - runtime/manual Sprint 12 scenarios: PASS
  - Scenario 13 JWKS verification: PASS
  - temporary key restoration: PASS

## V. Known Condition

- Global `npm.cmd run format:check` still fails due external repository-wide formatting baseline drift outside Sprint 12 scope.

## VI. Next Recommended Step

Begin Sprint 13 planning for revoke + introspection only after approved Sprint 13 contract and assignment.
