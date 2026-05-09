# Phase 06 - Sprint 20: JWKS / Key Rotation Hardening Report

## 1. Execution Summary

Sprint 20 implemented OIDC-owned signing-key lifecycle hardening with:

- key metadata model/repository/service under `src/modules/oidc`
- active signing key integration for JWT issuance
- JWT verification path integration with key lifecycle state
- public-only JWKS publication route (`GET /jwks`)
- rotation, retirement, rollback, and compromised-state handling in key service
- key lifecycle audit and observability hooks

Status: MERGED WITH POST-MERGE CORRECTION REQUIRED.

Sprint 20 PR #58 was merged before Leader merge-readiness blockers were fully resolved. The corrective branch `fix/oidc-sprint20-key-rotation-corrections` restores contract compliance and factual validation evidence. Sprint 20 must not be treated as cleanly closed until the corrective PR is reviewed, merged, and accepted by Leader review.

Merge evidence:

- PR: `#58` (merged `2026-05-09`)
- merge commit: `b980ba4`
- runtime commit: `45441d7`
- gate-doc correction commit: `875adb0`
- report correction commit: `1cae1c1`

Post-merge corrective branch evidence:

- branch: `fix/oidc-sprint20-key-rotation-corrections`
- base: latest `main` after `63a4165`
- reason: correct missing-active signing behavior, scoped Sprint 20 formatting, validation/report accuracy, and operational context status.

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

`docs/` remains authoritative. `agent/` is operational context only and does not justify runtime behavior.

## 3. Runtime Gate Result

- Sprint 19 merged/closed/present in `main`: PASS (`d2f379d`, main updated to `14a07c2`).
- Required contracts/assignment present with approved status text: PASS.
- Runtime started from updated `main`: PASS for PR #58; corrective branch starts from latest `main` after Sprint 20 merge sync.
- Dedicated branch used: PASS (`feature/oidc-sprint20-key-rotation` for PR #58; `fix/oidc-sprint20-key-rotation-corrections` for post-merge correction).
- Implementation packet produced before runtime edits: PASS for PR #58.

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
- Post-merge correction: removed signing-time bootstrap, formatted Sprint 20 touched files, reran required validation, and corrected report/context status.

## 6. Files Created or Updated

Created by PR #58:

- `src/modules/oidc/key.model.ts`
- `src/modules/oidc/key.repository.ts`
- `src/modules/oidc/key.service.ts`
- `docs/planning/reports/phase-06-sprint-20-report.md`

Updated by PR #58:

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

Corrected after merge:

- `src/modules/oidc/key.service.ts`
- Sprint 20 touched runtime files formatted with scoped Prettier
- `docs/planning/reports/phase-06-sprint-20-report.md`
- `agent/current-context.md`
- `agent/session-history.md`

## 7. Active Signing Key Behavior

- Signing resolves the active key via `OidcKeyService`.
- Signing no longer performs implicit bootstrap when no active key exists.
- Explicit bootstrap/setup, if needed operationally, is isolated to `initializeActiveSigningKey()` and is not called by token signing.
- Active-key guard after correction:
  - zero active keys -> predictable failure (`NO_ACTIVE_SIGNING_KEY`)
  - multiple active keys -> predictable failure (`MULTIPLE_ACTIVE_SIGNING_KEYS`)
- New JWTs include active key `kid` in header.
- No stale, retired, compromised, or unknown key fallback is used for signing.

## 8. JWKS Publication Behavior

- `GET /jwks` is served from OIDC controller/service.
- JWKS includes:
  - active public key
  - retired public keys still within overlap window
- JWKS excludes:
  - private signing material
  - private JWK parameters (`d`, `p`, `q`, `dp`, `dq`, `qi`)
  - compromised keys by default
  - retired keys outside overlap
  - internal persistence metadata

## 9. Overlap Window Behavior

- Default overlap window implemented as 24 hours (`24 * 60 * 60 * 1000`).
- Rotation retires previous active key and sets `retiredAt` + `overlapExpiresAt`.
- JWKS eligibility for retired keys is constrained to overlap window.
- Corrective probe verifies that a token signed before rotation remains verifiable during overlap.
- Corrective probe verifies retired keys outside overlap are excluded from JWKS.

## 10. Rotation Behavior

- Manual/service-triggered rotation implemented in `OidcKeyService.rotateSigningKey`.
- Sequence:
  - require exactly one current active key
  - create new RSA keypair
  - generate unique system `kid` (`kid_<uuid>`) with retry on collision
  - persist new key as active
  - retire prior active key
  - set overlap metadata
  - emit safe audit + metrics/log signals
- Partial-failure posture remains documented: if retirement fails after new-key activation, ambiguous active state is guarded by signing failure rather than silent fallback.

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
- Corrective private-material probe verifies JWKS, captured audit payloads, metrics output, and report content do not contain private key material.
- Required secret-safety `rg` scan remains PASS WITH REVIEW because matches are internal key handling, safe field names, redaction deny-lists, or validation command text.

## 15. Post-Merge Correction Summary

Reason for correction:

- Leader review found PR #58 was not cleanly merge-ready after merge.
- Signing path silently bootstrapped a key when zero active keys existed.
- Scoped Sprint 20 Prettier claim was inaccurate before correction.
- Manual validation evidence for zero-active, overlap verification, expiry exclusion, and compromised exclusion was incomplete.
- Operational context incorrectly marked Sprint 20 as cleanly closed.

Files corrected:

- `src/modules/oidc/key.service.ts`
- Sprint 20 touched runtime files formatted with scoped Prettier
- `docs/planning/reports/phase-06-sprint-20-report.md`
- `agent/current-context.md`
- `agent/session-history.md`

Remaining known conditions:

- Repository-wide `npm.cmd run format:check` still fails due unrelated pre-existing formatting drift outside Sprint 20 touched/corrected files.
- No committed unit/e2e test runner exists in `package.json`; corrective behavioral validation uses a temporary in-memory harness executed locally and removed before commit.
- Corrective PR review and merge are still required before Sprint 20 can be considered cleanly corrected.

## 16. Validation Evidence

### Required Commands

| Command                                                                                                                                                                                                                                                                                                                                                                                    | Result                             | Notes                                                                                                                                                                                                                        |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run lint`                                                                                                                                                                                                                                                                                                                                                                         | PASS                               | Exit 0.                                                                                                                                                                                                                      |
| `npm.cmd run typecheck`                                                                                                                                                                                                                                                                                                                                                                    | PASS                               | Exit 0.                                                                                                                                                                                                                      |
| `npm.cmd run build`                                                                                                                                                                                                                                                                                                                                                                        | PASS                               | Exit 0.                                                                                                                                                                                                                      |
| `npm.cmd run format:check`                                                                                                                                                                                                                                                                                                                                                                 | FAIL / ACCEPTED BASELINE EXCEPTION | Exit 1. Remaining files are pre-existing unrelated drift: request middleware, database, logger, metrics, redis, admin, audit service, health, and OIDC client files. Sprint 20 touched/corrected files pass scoped Prettier. |
| `npx.cmd prettier --check <Sprint 20 touched/corrected runtime files plus report/context files>`                                                                                                                                                                                                                                                                                           | PASS                               | Scoped Sprint 20/correction file set passes.                                                                                                                                                                                 |
| `rg -n "process.env" src --glob "!src/config/**"`                                                                                                                                                                                                                                                                                                                                          | PASS                               | No matches.                                                                                                                                                                                                                  |
| `rg -n "console.log" src`                                                                                                                                                                                                                                                                                                                                                                  | PASS                               | No matches.                                                                                                                                                                                                                  |
| `rg -n "BEGIN PRIVATE KEY\|PRIVATE KEY\|privateKey\|private_key\|d:\|p:\|q:\|dp:\|dq:\|qi:\|client_secret\|clientSecret\|refresh_token\|access_token\|id_token\|authorization_code\|code_verifier\|password" src/modules/oidc src/infrastructure/crypto src/modules/audit src/infrastructure/logger src/infrastructure/metrics src/app docs/planning/reports/phase-06-sprint-20-report.md` | PASS WITH REVIEW                   | Matches are internal key handling fields, token/client field names, report validation command text, and redaction/deny-list patterns. No JWKS/log/audit/metrics/report exposure of private key material found.               |
| `rg -n "UserModel\|user.repository\|mongoose.*User\|findOne(.*User\|findById(.*User" src/modules/oidc`                                                                                                                                                                                                                                                                                     | FAIL / COMMAND REGEX ERROR         | Required literal command fails with `regex parse error: unclosed group`.                                                                                                                                                     |
| `rg -n "UserModel\|user\.repository\|mongoose.*User\|findOne\\(.*User\|findById\\(.*User" src/modules/oidc`                                                                                                                                                                                                                                                                                | PASS                               | Corrected escaping equivalent found no matches.                                                                                                                                                                              |
| `rg -n "deleteOne\|findOneAndDelete\|findByIdAndDelete\|remove\(" src/modules/oidc`                                                                                                                                                                                                                                                                                                        | PASS                               | No matches.                                                                                                                                                                                                                  |
| `rg -n "setInterval\|cron\|schedule\|node-cron\|KMS\|HSM\|SIEM\|tracing\|OpenTelemetry" src docs/planning/reports/phase-06-sprint-20-report.md`                                                                                                                                                                                                                                            | PASS WITH REVIEW                   | Matches only excluded-scope text in this report. No runtime scheduling/KMS/HSM/SIEM/tracing implementation found.                                                                                                            |
| `rg -n "kid\|jwks\|rotate\|retire\|rollback\|compromised\|overlapExpiresAt\|private" src/modules/oidc src/infrastructure/crypto`                                                                                                                                                                                                                                                           | PASS WITH REVIEW                   | Matches align with approved key lifecycle implementation and low-level crypto helpers.                                                                                                                                       |

### Scoped Sprint 20 / Correction Prettier Check

Command:

```powershell
npx.cmd prettier --check src/app/server.ts src/infrastructure/crypto/index.ts src/infrastructure/crypto/jwks.ts src/infrastructure/crypto/keys.ts src/modules/audit/audit.types.ts src/modules/oidc/access-token.provider.ts src/modules/oidc/id-token.provider.ts src/modules/oidc/oidc.controller.ts src/modules/oidc/oidc.service.ts src/modules/oidc/oidc.types.ts src/modules/oidc/userinfo.service.ts src/modules/oidc/key.model.ts src/modules/oidc/key.repository.ts src/modules/oidc/key.service.ts docs/planning/reports/phase-06-sprint-20-report.md agent/current-context.md agent/session-history.md
```

Result: PASS.

## 17. Manual / Probe Validation Matrix

Temporary harness:

```powershell
$env:NODE_ENV='development'; $env:PORT='3000'; $env:MONGO_URI='mongodb://localhost:27017/etroy_oidc'; $env:REDIS_URL='redis://localhost:6379'; $env:APP_BASE_URL='http://localhost:3000'; $env:OIDC_CLIENTS_JSON='[{"clientId":"etroy-web","redirectUris":["http://localhost:5173/callback"]}]'; npx.cmd tsx .\temp-sprint20-correction-probes.ts
```

The temporary harness was removed after execution and is not part of the corrective PR.

| Check                                                             | Result           | Evidence                                                                                                                                            |
| :---------------------------------------------------------------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zero active key signing fails predictably                         | PASS             | `ZERO_ACTIVE_SIGNING=PASS`; observed `NO_ACTIVE_SIGNING_KEY`.                                                                                       |
| Multiple active keys fail predictably                             | PASS             | `MULTIPLE_ACTIVE_SIGNING=PASS`; observed `MULTIPLE_ACTIVE_SIGNING_KEYS`.                                                                            |
| Token signed before rotation remains verifiable during overlap    | PASS             | `ROTATION_OVERLAP_VERIFY=PASS`.                                                                                                                     |
| Retired key inside overlap appears in JWKS                        | PASS             | `JWKS_OVERLAP=PASS`.                                                                                                                                |
| Retired key outside overlap is excluded from JWKS                 | PASS             | `JWKS_EXPIRY=PASS`.                                                                                                                                 |
| Compromised key does not sign                                     | PASS             | `COMPROMISED_EXCLUSION=PASS`; signing used safe active key, not compromised key.                                                                    |
| Compromised key is excluded from JWKS                             | PASS             | `COMPROMISED_EXCLUSION=PASS`.                                                                                                                       |
| No private key material appears in JWKS/logs/audit/metrics/report | PASS WITH REVIEW | `PRIVATE_MATERIAL_SAFETY=PASS`; required `rg` scan verifies log/report/source paths. The probe captured audit payloads and metrics output directly. |

Probe output:

```text
SPRINT20_CORRECTION_PROBES=PASS
ZERO_ACTIVE_SIGNING=PASS
MULTIPLE_ACTIVE_SIGNING=PASS
ROTATION_OVERLAP_VERIFY=PASS
JWKS_OVERLAP=PASS
JWKS_EXPIRY=PASS
COMPROMISED_EXCLUSION=PASS
PRIVATE_MATERIAL_SAFETY=PASS
```

## 18. Excluded Scope Confirmation

Not implemented:

- external KMS/HSM/cloud key manager
- scheduled/cron rotation job
- admin dashboard/key-management UI
- broad RBAC/security-governance changes
- refresh/session/client/user/auth lifecycle changes outside signed-token key selection
- Sprint 21 final security hardening
- release-readiness review
- distributed tracing/SIEM integration
- broad formatting cleanup
- unrelated refactors

## 19. Risks, Limitations, and Deferred Work

- Repository-wide `format:check` still fails due pre-existing unrelated formatting drift outside Sprint 20 scope.
- Audit event persistence in local harness context was intentionally bypassed; event emissions are implemented, but persistence requires healthy runtime dependencies.
- Final security governance/release readiness remains Sprint 21 scope and must not start from this correction.
- Sprint 20 clean closure is pending corrective PR merge and Leader acceptance.

## 20. Handoff to Sprint 21 - Security Governance Finalization

Do not start Sprint 21 from this correction branch.

After the corrective PR is merged and accepted, Sprint 20 can hand off:

- OIDC key lifecycle model/repository/service baseline
- active signing key integration across token issuance/verification
- hardened JWKS publication path
- key lifecycle audit and observability signal points
- corrected validation evidence and known limitations

Sprint 21 should begin only after its own approved contract and assignment are present.
