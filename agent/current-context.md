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
- Phase 06 - Platform and Governance Hardening: CLOSED WITH ACCEPTED CONDITIONS.
- Project implementation baseline: COMPLETE WITH ACCEPTED CONDITIONS.
- Phase 06 runtime implementation: COMPLETE WITH ACCEPTED CONDITIONS (Sprint 16 through Sprint 21 merged into `main`).
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
- Sprint 19 - Observability Hardening: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 19 merge evidence:
  - PR: `#56` (https://github.com/toilatrung/etroy-oidc/pull/56)
  - merge commit on `main`: `d2f379d1ef03255f352269c8c9e4492ed406a836`
  - runtime commit: `c03191a2eac0aa6ccfa814a216a1138b1bca355e`
  - merged at: `2026-05-09T17:51:40+07:00`
  - delivered scope:
    - safe structured logger normalization
    - request/correlation ID middleware
    - request lifecycle logging/metrics
    - safe metrics primitives
    - aggregate-only `/metrics`
    - safe `/health` and `/ready`
    - MongoDB/Redis readiness helpers
    - audit outcome metric
  - validation:
    - `npm.cmd run lint`: PASS
    - `npm.cmd run typecheck`: PASS
    - `npm.cmd run build`: PASS
    - scoped Sprint 19 Prettier: PASS
    - repository-wide `npm.cmd run format:check`: FAIL / ACCEPTED BASELINE EXCEPTION
  - known condition:
    - repository-wide formatting baseline drift remains deferred to a separate PR/task.
    - no broad formatting cleanup was included in Sprint 19.
- Sprint 20 - JWKS / Key Rotation Hardening: MERGED / CLOSED / PRESENT IN `main` after corrective PR #60.
- Sprint 20 merge evidence:
  - PR: `#58` (https://github.com/toilatrung/etroy-oidc/pull/58)
  - merge commit on `main`: `b980ba4`
  - runtime commit: `45441d7`
  - gate-doc correction commit: `875adb0`
  - report correction commit: `1cae1c1`
  - PR #58 post-merge readiness result:
    - PR #58 merged but required post-merge correction.
    - blockers were signing-time zero-active bootstrap, inaccurate scoped Prettier/report claims, incomplete manual overlap/compromised validation evidence, and governance/context correction.
  - corrective PR:
    - PR: `#60` (https://github.com/toilatrung/etroy-oidc/pull/60)
    - merge commit on `main`: `b7075dc`
    - corrective commit: `11bc541`
    - status: merged and accepted; Sprint 20 corrected closure may be recorded.
  - corrective branch:
    - `fix/oidc-sprint20-key-rotation-corrections`
    - starts from latest `main` after Sprint 20 merge sync
    - scope: Sprint 20 correction only; Sprint 21 not started
  - corrected validation on corrective branch:
    - `npm.cmd run lint`: PASS
    - `npm.cmd run typecheck`: PASS
    - `npm.cmd run build`: PASS
    - scoped Sprint 20 Prettier: PASS
    - repository-wide `npm.cmd run format:check`: FAIL / ACCEPTED BASELINE EXCEPTION outside PR #60 scope
    - Sprint 20 rg scans: PASS / PASS WITH REVIEW
    - zero-active signing probe: PASS (`NO_ACTIVE_SIGNING_KEY`)
    - multiple-active signing probe: PASS (`MULTIPLE_ACTIVE_SIGNING_KEYS`)
    - rotation overlap verification probe: PASS
    - JWKS overlap/expiry probes: PASS
    - compromised exclusion probe: PASS
    - private-material safety probe: PASS WITH REVIEW
  - known limitations:
    - repository-wide formatting drift remains deferred
    - corrective validation used a temporary in-memory harness, removed after execution
    - final security governance/release-readiness remains Sprint 21 scope
- Current next phase: Phase 07 - Production Stabilization / Follow-up.
- Sprint 21 status: MERGED / CLOSED / PRESENT IN `main`.
- Sprint 21 gate: PASS (contract/assignment approved, latest `main`, dedicated branch, review packet produced).
- Sprint 21 blocker follow-up:
  - active repository `keys/private.pem` removed and PEM ignore guard added
  - git-history check shows placeholder-only historical key marker, no real private key material evidence
- Sprint 21 report:
  - `docs/planning/reports/phase-06-security-hardening-report.md`

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
- Sprint 20 must not introduce JWKS/key rotation runtime from Sprint 19 context alone.
- Sprint 21 must not introduce final security governance from Sprint 20 context alone.
- Do not move refresh token lifecycle, rotation, revoke, introspection, session, SSO, or logout hardening into Phase 04.

## IV. Phase 05/06 Validation Summary

- Sprint 11-20 validation posture:
  - `npm.cmd run lint`: PASS
  - `npm.cmd run typecheck`: PASS
  - `npm.cmd run build`: PASS
  - Sprint 20 scoped Prettier: PASS
  - Sprint 20 repository-wide `npm.cmd run format:check`: FAIL / ACCEPTED BASELINE EXCEPTION
  - boundary scans: PASS / PASS WITH REVIEW
  - corrective runtime/manual probes: PASS

## V. Known Condition

- Unit and E2E test runners are currently missing from `package.json`; validation relies on build/static checks and manual DB-backed harnesses.
- Repository-wide formatting baseline drift remains deferred to a separate PR/task after Sprint 19. Sprint 19 did not include broad formatting cleanup.

## VI. Project implementation baseline: COMPLETE WITH ACCEPTED CONDITIONS

- Phase 06 is closed with accepted conditions.
- Project implementation baseline is complete with accepted conditions.
- Transition to Phase 07 (Post-release Stabilization / Follow-up) for repository-wide format cleanup and regression hardening.
