# Phase 06 - Sprint 20: JWKS / Key Rotation Hardening Report

## 1. Execution Summary

Sprint 20 implemented OIDC-owned signing-key lifecycle hardening with:

- key metadata model/repository/service under `src/modules/oidc`
- active signing key integration for JWT issuance
- JWT verification path integration with key lifecycle state
- public-only JWKS publication route (`GET /jwks`)
- rotation, retirement, rollback, and compromised-state handling in key service
- key lifecycle audit and observability hooks

Status: implementation complete with validation evidence recorded below.

## 2. Source-of-Truth Basis

- `docs/source-of-truth-index.md`
- `docs/README.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/module-boundaries.md`
- `docs/architecture/source-tree.md`
- `docs/architecture/detailed-source-tree.md`
- `docs/requirements/srs-v1.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-06-platform-governance-hardening.md`
- `docs/contracts/oidc/key-rotation-contract.md`
- `docs/contracts/audit/audit-event-contract.md`
- `docs/contracts/observability/observability-contract.md`
- `docs/planning/assignments/phase-06-sprint-20.md`
- `docs/planning/reports/phase-06-sprint-19-report.md`
- `docs/governance/git-rules.md`
- `docs/governance/pr-template.md`
- `docs/governance/review-checklist.md`
- `docs/governance/anti-patterns.md`
- `agent/current-context.md`
- `agent/session-history.md`
- `agent/prompts/sprint-task-execution.md`

## 3. Runtime Gate Result

- Sprint 19 merged/closed/present in `main`: PASS (`d2f379d`, main updated to `14a07c2`).
- Required contracts/assignment present with approved status text: PASS.
- Runtime started from updated `main`: PASS.
- Dedicated branch used: PASS (`feature/oidc-sprint20-key-rotation`).
- Implementation packet produced before runtime edits: PASS.

## 4. Implementation Packet Summary

- Owner: `src/modules/oidc` with low-level crypto support in `src/infrastructure/crypto`.
- Included scope: Tasks 105-112 only (key lifecycle + signing/JWKS + audit/observability + validation/report).
- Excluded scope preserved: no KMS/HSM/scheduled job/admin dashboard/RBAC expansion/token-session-client lifecycle changes.
- Security rule focus: no private key leakage through JWKS/API/logs/audit/metrics/errors/report.

## 5. Implemented Tasks

- Task 105: Runtime gate + implementation packet completed before code.
- Task 106: Added OIDC key metadata model and repository.
- Task 107: Added OIDC key service with lifecycle policy and deterministic guards.
- Task 108: Integrated active signing key selection and JWT `kid` in token providers.
- Task 109: Added hardened JWKS publication path (`GET /jwks`) using public-only keys.
- Task 110: Implemented rotation/retirement/rollback/compromised transitions.
- Task 111: Added key lifecycle audit events and bounded metrics/logging hooks.
- Task 112: Completed validation and this report.

## 6. Files Created or Updated

Created:

- `src/modules/oidc/key.model.ts`
- `src/modules/oidc/key.repository.ts`
- `src/modules/oidc/key.service.ts`
- `docs/planning/reports/phase-06-sprint-20-report.md`

Updated:

- `src/modules/oidc/access-token.provider.ts`
- `src/modules/oidc/id-token.provider.ts`
- `src/modules/oidc/oidc.service.ts`
- `src/modules/oidc/oidc.controller.ts`
- `src/modules/oidc/userinfo.service.ts`
- `src/modules/oidc/oidc.types.ts`
- `src/app/server.ts`
- `src/infrastructure/crypto/keys.ts`
- `src/infrastructure/crypto/jwks.ts`
- `src/infrastructure/crypto/index.ts`
- `src/modules/audit/audit.types.ts`

## 7. Active Signing Key Behavior

- Signing now resolves active key via `OidcKeyService`.
- Active-key guard:
  - zero active keys -> predictable failure (`NO_ACTIVE_SIGNING_KEY`)
  - multiple active keys -> predictable failure (`MULTIPLE_ACTIVE_SIGNING_KEYS`)
- New JWTs include active key `kid` in header.

## 8. JWKS Publication Behavior

- `GET /jwks` added and served from OIDC controller/service.
- JWKS includes:
  - active public key
  - retired public keys still within overlap window
- JWKS excludes:
  - private signing material
  - private JWK parameters (`d`, `p`, `q`, `dp`, `dq`, `qi`)
  - compromised keys by default
  - internal persistence metadata

## 9. Overlap Window Behavior

- Default overlap window implemented as 24 hours (`24 * 60 * 60 * 1000`).
- Rotation retires previous active key and sets `retiredAt` + `overlapExpiresAt`.
- JWKS eligibility for retired keys is constrained to overlap window.

## 10. Rotation Behavior

- Manual/service-triggered rotation implemented in `OidcKeyService.rotateSigningKey`.
- Sequence:
  - create new RSA keypair
  - generate unique system `kid` (`kid_<uuid>`) with retry on collision
  - persist as active
  - retire prior active key
  - set overlap metadata
  - emit safe audit + metrics/log signals
- Partial-failure posture favors avoiding no-active-key state.

## 11. Retirement Behavior

- Retired keys are never selected for signing.
- Retired keys are JWKS-eligible only while in overlap.
- Retirement audit event emitted (`oidc.key.retired`).
- No hard-delete behavior introduced.

## 12. Rollback Behavior

- Implemented rollback only for retired keys within overlap window.
- Guarded conditions:
  - key must exist
  - status must be `retired`
  - overlap must still be valid
- Rollback audit event emitted (`oidc.key.rollback_performed`).
- No hard-delete behavior introduced.

## 13. Compromised State Behavior

- Compromised state transition implemented in key service.
- Compromised keys are excluded from signing and default JWKS publication.
- If compromising active key, service rotates first, then marks target compromised.
- Compromised audit event emitted (`oidc.key.compromised`).

## 14. Audit and Observability Evidence

- Audit event vocabulary expanded in `src/modules/audit/audit.types.ts`:
  - `oidc.key.rollback_performed`
  - `oidc.key.compromised`
- Existing key events retained:
  - `oidc.key.rotated`
  - `oidc.key.retired`
  - `oidc.key.rotation_failed`
- Observability signals added:
  - counters: `oidc_key_rotation_total`, `oidc_key_rollback_total`, `oidc_key_compromised_total`
  - gauge: `oidc_active_signing_key_available`
  - structured logs with bounded metadata only

## 15. Validation Evidence

### Required Commands

| Command                                           | Result                             | Notes                                                                                          |
| :------------------------------------------------ | :--------------------------------- | :--------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- | ---------------- | -------------------------------------------------------- |
| `npm.cmd run lint`                                | PASS                               | Exit 0                                                                                         |
| `npm.cmd run typecheck`                           | PASS                               | Exit 0                                                                                         |
| `npm.cmd run build`                               | PASS                               | Exit 0                                                                                         |
| `npm.cmd run format:check`                        | FAIL / ACCEPTED BASELINE EXCEPTION | Pre-existing non-Sprint-20 files remain off-format; Sprint 20 touched files checked separately |
| `rg -n "process.env" src --glob "!src/config/**"` | PASS                               | No matches                                                                                     |
| `rg -n "console.log" src`                         | PASS                               | No matches                                                                                     |
| `rg -n "private.\*key                             | PRIVATE                            | BEGIN PRIVATE KEY                                                                              | client_secret                   | refresh_token" src keys docs --glob "!docs/planning/reports/\*\*"` | PASS WITH REVIEW                                                 | Matches are expected contract text, placeholder key file, and defensive sanitization patterns |
| `rg -n "kid                                       | jwks                               | sign                                                                                           | verify                          | publicKey                                                          | privateKey" src/infrastructure/crypto src/modules/oidc src/jobs` | PASS WITH REVIEW                                                                              | Matches align with Sprint 20 scope and no leakage path found |
| `rg -n "UserModel                                 | user.repository                    | mongoose.\*User                                                                                | findOne(.\*User                 | findById(.\*User" src/modules/oidc`                                | PASS                                                             | No matches                                                                                    |
| `rg -n "deleteOne                                 | findOneAndDelete                   | findByIdAndDelete" src/modules/oidc`                                                           | PASS                            | No matches                                                         |
| `rg -n "d:                                        | p:                                 | q:                                                                                             | dp:                             | dq:                                                                | qi:                                                              | BEGIN PRIVATE KEY                                                                             | privateKey                                                   | private_key" src/modules/oidc src/infrastructure/crypto` | PASS WITH REVIEW | Internal key-handling matches only; no JWKS leakage path |
| `rg -n "oidc\\.key\\.rotated                      | oidc\\.key\\.retired               | oidc\\.key\\.rotation_failed                                                                   | oidc\\.key\\.rollback_performed | oidc\\.key\\.compromised" docs/contracts/audit src/modules`        | PASS WITH REVIEW                                                 | New event types added in runtime vocabulary; contract mentions base key events                |

### Scoped Sprint 20 Prettier Check

Command:

```powershell
npx.cmd prettier --check src/app/server.ts src/infrastructure/crypto/index.ts src/infrastructure/crypto/jwks.ts src/infrastructure/crypto/keys.ts src/modules/audit/audit.types.ts src/modules/oidc/access-token.provider.ts src/modules/oidc/id-token.provider.ts src/modules/oidc/oidc.controller.ts src/modules/oidc/oidc.service.ts src/modules/oidc/oidc.types.ts src/modules/oidc/userinfo.service.ts src/modules/oidc/key.model.ts src/modules/oidc/key.repository.ts src/modules/oidc/key.service.ts
```

Result: PASS.

## 16. Manual Validation Matrix

| #     | Check                                                                                      | Result           | Evidence                                                                          |
| :---- | :----------------------------------------------------------------------------------------- | :--------------- | :-------------------------------------------------------------------------------- |
| 1     | Exactly one active signing key selected                                                    | PASS             | In-memory harness + service guard logic                                           |
| 2     | New JWT contains `kid` header                                                              | PASS             | In-memory harness (`SPRINT20_KEY_SERVICE_HARNESS=PASS`)                           |
| 3     | JWT `kid` matches active metadata                                                          | PASS             | In-memory harness                                                                 |
| 4     | JWKS includes active public key                                                            | PASS             | In-memory harness                                                                 |
| 5     | JWKS entries include `kid`                                                                 | PASS             | In-memory harness                                                                 |
| 6     | JWKS excludes private JWK params                                                           | PASS             | In-memory harness + key/JWKS mapping code                                         |
| 7     | JWKS excludes private PEM                                                                  | PASS             | Code review + JWKS response shape                                                 |
| 8-12  | Rotation creates new key, activates it, retires previous key, sets retire/overlap metadata | PASS             | In-memory harness                                                                 |
| 13    | Retired key published during overlap                                                       | PASS             | In-memory harness + repository eligibility query                                  |
| 14    | Pre-rotation token verification during overlap                                             | NOT RUN          | No DB-backed end-to-end harness in this sprint report run                         |
| 15    | Retired key excluded after overlap                                                         | NOT RUN          | Time-window expiry scenario not executed in runtime harness                       |
| 16    | Retired key does not sign new tokens                                                       | PASS             | Service signs only active key                                                     |
| 17-19 | Compromised key cannot sign / be active / be published                                     | PASS             | Service logic + in-memory harness compromise flow                                 |
| 20-22 | Predictable failure for rotation issues and missing/ambiguous active key                   | PASS WITH REVIEW | Service error codes/guards implemented; full fault-injection runtime not executed |
| 23-24 | Rollback only for eligible retired key; no hard-delete                                     | PASS             | Service guards + in-memory harness                                                |
| 25-28 | Rollback/rotation/retirement/failure audit events                                          | PASS WITH REVIEW | Event emissions present; persistence depends on runtime DB availability           |
| 29-35 | Audit/log/metrics secret safety                                                            | PASS WITH REVIEW | Contract-safe metadata only + scans + logger/metrics sanitization                 |
| 36-43 | Boundary and scope non-regression checks                                                   | PASS             | Dependency scans + code inspection                                                |
| 44    | No real production private key committed                                                   | PASS WITH REVIEW | `keys/private.pem` remains placeholder content                                    |
| 45    | Sprint 20 report includes evidence                                                         | PASS             | This report                                                                       |

Additional runtime harness command:

```powershell
npx.cmd tsx C:\tmp\sprint20-key-harness.ts
```

Result: `SPRINT20_KEY_SERVICE_HARNESS=PASS`.

## 17. Excluded Scope Confirmation

Not implemented:

- external KMS/HSM/cloud key manager
- scheduled/cron rotation job
- admin dashboard/key-management UI
- broad RBAC/security-governance changes
- refresh/session/client/user/auth lifecycle changes outside signed-token key selection
- distributed tracing/SIEM integration
- broad formatting cleanup
- unrelated refactors

## 18. Risks, Limitations, and Deferred Work

- Repository-wide `format:check` still fails due pre-existing baseline drift outside Sprint 20 scope.
- Audit event persistence in local harness context used fail-open behavior when DB was unavailable; event emissions are implemented but persistence requires healthy runtime dependencies.
- Contract file `docs/contracts/audit/audit-event-contract.md` currently lists core key events; Sprint 20 runtime adds rollback/compromised vocabulary in `audit.types.ts`. A contract additive vocabulary sync is recommended.
- Full end-to-end overlap-expiry runtime scenario (time advancement with persisted records) is deferred.

## 19. Handoff to Sprint 21 - Security Governance Finalization

Sprint 20 hands off:

- OIDC key lifecycle model/repository/service baseline
- active signing key integration across token issuance/verification
- hardened JWKS publication path
- key lifecycle audit and observability signal points
- validation evidence and known limitations

Sprint 21 should:

- execute final governance/security contract alignment for additive key audit vocabulary
- run final release-readiness security checks with environment-backed runtime scenarios
- close remaining repository-wide formatting baseline drift in dedicated scope if approved
