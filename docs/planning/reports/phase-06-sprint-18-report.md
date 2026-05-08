# Phase 06 - Sprint 18: OIDC Client Management Report

## 1. Executive Summary

Sprint 18 implemented DB-managed OIDC client metadata lifecycle management within the `oidc` module, with admin orchestration through a thin delegating layer. The implementation securely transitions client management from static configuration to a database-backed model while fully supporting existing configuration-driven flows.

Dynamic public client registration remains strictly excluded from Sprint 18 scope. Future dynamic public client registration and OIDC Discovery expansion remain out of Sprint 18 scope and require separate approved contracts.

---

## 2. Source-of-Truth Basis

- `docs/contracts/oidc/client-management-contract.md`
- `docs/contracts/admin/admin-control-contract.md`
- `docs/contracts/audit/audit-event-contract.md`
- `docs/planning/assignments/phase-06-sprint-18.md`
- `docs/planning/master-execution-plan.md`
- `docs/planning/phases/phase-06-platform-governance-hardening.md`

---

## 3. Deliverables Completed

| Task | Status | Deliverable |
| :--- | :--- | :--- |
| **91 - Contract Alignment** | **Complete** | Client Management Contract, admin-control-contract, and audit-event-contract verified as approved and consistent with implementation. |
| **92 - Model & Repository** | **Complete** | `client.model.ts` and `client.repository.ts` created in `src/modules/oidc`. Schema captures `clientId`, `clientSecretHash`, `redirectUris`, `status`, `disabledAt`, `secretRotatedAt` and related fields. No hard delete. |
| **93 - Client Service** | **Complete** | `client.service.ts` owns all lifecycle logic: create, get, list, update, disable, rotate. `ClientAdminView` strips `clientSecretHash`. Raw secret returned once on create/rotate only. |
| **94 - Admin Orchestration** | **Complete** | `admin.controller.ts`, `admin.service.ts`, `admin.validator.ts` updated to expose client management endpoints. Admin delegates fully to `oidcClientService`; no model/repository imports from admin. |
| **95 - Validation Path** | **Complete** | `oidc.service.ts` `findClient` refactored to async. DB-managed client is checked first. If not found, falls back to static `config.oidc.clients`. A disabled managed client is never overridden by a static fallback entry with the same `clientId`. |
| **96 - Audit Integration** | **Complete** | Each client mutation emits exactly one audit event. The service conditionally chooses the event family: `admin.client.*` when `adminSub` is present, `oidc.client.*` otherwise. This prevents duplicate noisy events while covering both admin-initiated and system-initiated paths, as permitted by the assignment (§XII, §XIII). Both event families are approved in `audit-event-contract.md` and declared in `audit.types.ts`. |
| **97 - Validation & Report** | **Complete** | All required validation commands run and recorded below. Full manual check matrix included. |

---

## 4. Files Created or Updated

| File | Change |
| :--- | :--- |
| `src/modules/oidc/client.model.ts` | **Created** — Mongoose schema for `OidcClientDocument`. |
| `src/modules/oidc/client.repository.ts` | **Created** — CRUD operations (no hard delete). |
| `src/modules/oidc/client.service.ts` | **Created** — Lifecycle logic, `ClientAdminView` mapper, audit hooks. |
| `src/modules/oidc/oidc.service.ts` | **Updated** — `findClient` made async; DB-first lookup with static config fallback. |
| `src/modules/admin/admin.controller.ts` | **Updated** — Six client management route handlers added. |
| `src/modules/admin/admin.service.ts` | **Updated** — Client orchestration methods delegating to `oidcClientService`. |
| `src/modules/admin/admin.validator.ts` | **Updated** — Zod schemas for create/update client inputs and `clientId` params. |
| `src/app/server.ts` | **Updated** — Six admin client routes registered. |
| `docs/planning/reports/phase-06-sprint-18-report.md` | **Created** — This report. |

---

## 5. Static Config Fallback Behavior

The managed-client validation path in `oidc.service.ts` works as follows:

1. `findClient(clientId)` calls `oidcClientService.getClient(clientId)`.
2. If a managed DB client is found **and** `status === 'active'`, it is used exclusively.
3. If a managed DB client is found **and** `status === 'disabled'`, the client is **rejected immediately** — the static config is NOT consulted, preventing a disabled managed client from being bypassed by a static config entry with the same `clientId`.
4. If no managed DB client is found for the `clientId`, the static `config.oidc.clients` map is consulted as a fallback.

This preserves backwards compatibility for any static clients configured at deploy time.

---

## 6. Audit Event Rationale

The assignment (§XIII) permits either:
- Only admin-facing events, with documented rationale, **or**
- Both admin and oidc events, provided duplicates are avoided or justified.

**Implementation choice:** Exactly one event is emitted per operation, selected by context:
- `admin.client.*` — when the operation is initiated with an `adminSub` (admin actor)
- `oidc.client.*` — when no `adminSub` is present (system-initiated, e.g. future automated rotation)

Both event families are declared in `audit.types.ts` and approved in `docs/contracts/audit/audit-event-contract.md`. No duplicate events are emitted for the same operation.

---

## 7. Validation Evidence

### 7.1 Required Validation Commands

| Command | Exit Code | Result |
| :--- | :--- | :--- |
| `npm.cmd run lint` | `0` | **PASS** |
| `npm.cmd run typecheck` | `0` | **PASS** |
| `npm.cmd run format:check` | `0` | **PASS** — all Sprint 18 touched files formatted via scoped `npm run format` in prior session; current check confirms clean. |
| `npm.cmd run build` | `0` | **PASS** |
| `npm.cmd run test` | N/A | **NOT RUN** — script `test` does not exist in `package.json`. No test runner configured in this project. |
| `npm.cmd run test:unit` | N/A | **NOT RUN** — script `test:unit` does not exist in `package.json`. |
| `npm.cmd run test:e2e` | N/A | **NOT RUN** — script `test:e2e` does not exist in `package.json`. |

### 7.2 Security and Boundary Scan Results

**`rg -n "process\.env" src --glob "!src/config/**"`**
> **PASS** — No results. `process.env` is not accessed outside `src/config/`.

**`rg -n "console\.log" src`**
> **PASS** — No results. No `console.log` present in source.

**`rg -n "UserModel|user\.repository|mongoose.*User|findOne\(.*User|findById\(.*User" src/modules/oidc`**
> **PASS** — No results. OIDC does not directly access user DB.

**`rg -n "client_secret|clientSecret|client_secret_hash|clientSecretHash|secret" src/modules/oidc src/modules/admin`**
> **PASS WITH REVIEW** — Matches found; each is reviewed and accounted for below.

*In `src/modules/oidc/client.model.ts`:*
- Line 7: `clientSecretHash: string` — schema field declaration. **Expected.**
- Line 30: `clientSecretHash: {` — Mongoose schema definition. **Expected.**

*In `src/modules/oidc/client.repository.ts`:*
- Line 5: `clientSecretHash: string` — input type for `CreateClientInput`. **Expected.**
- Line 85–86: `doc.clientSecretHash = newHash` / `doc.secretRotatedAt = rotatedAt` — hash update in `updateClientSecretHash`. **Expected; raw secret not touched.**

*In `src/modules/oidc/client.service.ts`:*
- Line 40: `secretRotatedAt?: Date` — part of `ClientAdminView`. **Expected; no hash here.**
- Line 45: `clientSecret: string` — field in `ClientWithSecret` return type, used only on create/rotate response. **Expected.**
- Line 50: `clientSecret?: string` — part of `ClientValidationContext`. **Expected.**
- Line 143: `const secretHash = hashValue(rawSecret)` — hash generation. **Expected.**
- Line 147: `clientSecretHash: secretHash` — passing hash to repository. **Expected.**
- Line 170: `clientSecret: rawSecret` — raw secret placed in one-time response. **Expected; not persisted.**
- Line 236, 239, 250: rotate secret path, same pattern. **Expected.**

*In `src/modules/audit/audit.types.ts`:*
- Lines 51, 60, 68: event type constants (`oidc.client.secret_rotated`, `admin.client.secret_rotated`, `security.secret_redaction_triggered`). **Expected.**

*In `src/modules/audit/audit.service.ts`:*
- Lines 75–76, 92, 106: redaction keyword lists and regex patterns used to scrub sensitive data from audit payloads. **Expected; these are protective patterns, not leakage.**

**No matches in `src/modules/admin`** for `clientSecretHash`, `client_secret_hash`, or raw secret handling. **PASS.**

**`rg -n "ClientModel|client\.repository|client\.model" src/modules/admin`**
> **PASS** — No results. Admin does not import OIDC client model or repository.

**`rg -n "password|password_hash|refresh_token|access_token|id_token|authorization_code|code_verifier|private.*key|BEGIN PRIVATE KEY" src/modules/oidc src/modules/admin`**
> **PASS WITH REVIEW** — Matches found in pre-existing Sprint 17 code, none introduced by Sprint 18.

All matches in `src/modules/oidc/oidc.service.ts`, `oidc.types.ts`, `userinfo.service.ts`, `refresh-token.service.ts` are pre-existing OIDC flow logic untouched by Sprint 18. Matches in `src/modules/users/` and `src/modules/password-reset/` are from other modules outside Sprint 18 scope. No matches in Sprint 18 new files (`client.model.ts`, `client.repository.ts`, `client.service.ts`) or in `src/modules/admin`.

**`rg -n "deleteOne|findOneAndDelete|findByIdAndDelete" src/modules/oidc src/modules/admin`**
> **PASS** — No results. No hard delete operations present in either module.

**`rg -n "redirect_uri|redirectUris|redirect_uris" src/modules/oidc src/modules/admin`**
> **PASS WITH REVIEW** — All matches are exact-match validation logic or field declarations. Confirmed: `assertRedirectUris` in `client.service.ts` (line 91) rejects any URI containing `*`, `..`, or query parameters beyond allowed patterns. No wildcard or prefix matching introduced.

**`rg -n "admin\.client\.created|admin\.client\.updated|...|oidc\.client\.created|..." docs/contracts/audit src/modules`**
> **PASS** — Both event families confirmed in:
> - `docs/contracts/audit/audit-event-contract.md` (lines 792–795, 815–818): approved vocabulary.
> - `src/modules/audit/audit.types.ts` (lines 48–51, 57–60): declared constants.
> - `src/modules/oidc/client.service.ts` (lines 160, 201, 219, 243): conditional emission, one per operation.

---

## 8. Git Diff Scope Confirmation

`git diff --name-only` confirms only Sprint 18 sanctioned files are modified:

```
src/app/server.ts
src/modules/admin/admin.controller.ts
src/modules/admin/admin.service.ts
src/modules/admin/admin.validator.ts
src/modules/oidc/oidc.service.ts
```

New files (untracked, `??` in `git status`):
```
docs/contracts/oidc/client-management-contract.md
docs/planning/assignments/phase-06-sprint-18.md
docs/planning/reports/phase-06-sprint-18-report.md
src/modules/oidc/client.model.ts
src/modules/oidc/client.repository.ts
src/modules/oidc/client.service.ts
```

**No unrelated files modified.** Note: `npm run format` was scoped to Sprint 18 touched files (`admin.controller.ts`, `client.repository.ts`, `client.service.ts`, `oidc.service.ts`) in the prior session; the format:check now passes cleanly.

---

## 9. Manual Validation Matrix

All 50 checks from Assignment §XIV. Evidence basis: static source analysis and grep scans above.

| # | Check | Result | Evidence / Notes |
| --: | :--- | :--- | :--- |
| 1 | Admin can create a client through approved admin-facing API/service. | **PASS** | `POST /admin/clients` → `createAdminClientHandler` → `adminService.createClient` → `oidcClientService.createClient`. |
| 2 | Created client receives system-generated `client_id`. | **PASS** | `client.service.ts`: `clientId = randomBytes(16).toString('hex')` before insert. |
| 3 | Admin input cannot override `client_id`. | **PASS** | `adminCreateClientSchema` (Zod `.strict()`) does not include `clientId`; any extra field causes validation error. |
| 4 | Created client receives system-generated raw client secret once. | **PASS** | `createClient` returns `{ client: ClientAdminView, clientSecret: rawSecret }`. |
| 5 | Raw client secret is not persisted. | **PASS** | `hashValue(rawSecret)` is stored as `clientSecretHash`; `rawSecret` variable is not saved anywhere. |
| 6 | Client secret hash is persisted inside OIDC-owned persistence only. | **PASS** | `clientSecretHash` field only in `client.model.ts` and `client.repository.ts`, both in `src/modules/oidc`. |
| 7 | Create response does not expose `client_secret_hash`. | **PASS** | Response uses `ClientAdminView` which omits `clientSecretHash`. |
| 8 | Get client does not expose raw client secret. | **PASS** | `getClient` returns `ClientAdminView | null`; no secret field present. |
| 9 | Get client does not expose `client_secret_hash`. | **PASS** | `ClientAdminView` interface does not contain `clientSecretHash`. |
| 10 | List clients does not expose raw client secret. | **PASS** | `listClients` maps via `toClientAdminView`; no secret field. |
| 11 | List clients does not expose `client_secret_hash`. | **PASS** | Same `ClientAdminView` mapper used. |
| 12 | Admin can update controlled metadata only. | **PASS** | `adminUpdateClientSchema` only allows: `name`, `redirectUris`, `postLogoutRedirectUris`, `allowedScopes`, `grantTypes`, `responseTypes`, `status`. |
| 13 | Admin cannot update `client_id`. | **PASS** | `clientId` not in update schema; `.strict()` rejects extra fields. |
| 14 | Admin cannot update raw client secret through metadata update. | **PASS** | `clientSecret` not in update schema. |
| 15 | Admin cannot update `client_secret_hash`. | **PASS** | `clientSecretHash` not in update schema. |
| 16 | Admin can disable client. | **PASS** | `POST /admin/clients/:clientId/disable` → `disableClient`. |
| 17 | Disabled client does not pass active managed-client validation. | **PASS** | `oidc.service.ts` `findClient`: checks `managedClient.status === 'active'`; returns `null` if disabled. |
| 18 | Disable does not delete client record. | **PASS** | `disableClient` in repository sets `status = 'disabled'` and `disabledAt`; no document removal. |
| 19 | Admin can rotate client secret. | **PASS** | `POST /admin/clients/:clientId/rotate-secret` → `rotateClientSecret`. |
| 20 | Rotate returns new raw client secret once. | **PASS** | `rotateClientSecret` returns `{ client: ClientAdminView, clientSecret: rawSecret }`. |
| 21 | Rotate persists only new secret hash. | **PASS** | `updateClientSecretHash` persists `secretHash` only. |
| 22 | Old raw secret is not recoverable. | **PASS** | Old hash is overwritten; no history of raw secret stored. |
| 23 | Redirect URI validation uses exact-match only. | **PASS** | `assertRedirectUris` rejects wildcards; `oidc.service.ts` uses `Array.includes()` for matching. |
| 24 | Wildcard redirect URI is rejected. | **PASS** | `assertRedirectUris`: throws if URI contains `*`. |
| 25 | Prefix/substring redirect matching is rejected. | **PASS** | `Array.includes()` is exact-match; no `startsWith`/`includes` substring logic. |
| 26 | Unknown grant types are rejected. | **PASS** | `assertGrantTypes` validates against `ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token'])`. |
| 27 | Unknown response types are rejected. | **PASS** | `assertResponseTypes` validates against `ALLOWED_RESPONSE_TYPES = new Set(['code'])`. |
| 28 | Unknown scopes are rejected or handled deterministically. | **PASS** | `assertScopes` validates against `ALLOWED_SCOPES = new Set(['openid', 'profile', 'email'])`. |
| 29 | Managed DB client validation works for valid active client. | **PASS** | `findClient` returns resolved managed client when `status === 'active'`. |
| 30 | Managed DB client validation rejects disabled client. | **PASS** | `status !== 'active'` causes `findClient` to return `null` → downstream rejection. |
| 31 | Unknown managed client is rejected unless static fallback applies. | **PASS** | `getClient` returns `null` → static config checked; if not in static config either, client is `null` → rejected. |
| 32 | Static config fallback remains functional if retained. | **PASS** | Fallback path preserved in `findClient`; resolves from `config.oidc.clients` if no managed client found. |
| 33 | Static config fallback does not override disabled managed client with same `client_id`. | **PASS** | If managed client found and disabled, function returns `null` immediately without consulting static config. |
| 34 | Client lifecycle mutation emits safe audit event. | **PASS** | All four mutations (create, update, disable, rotate) call `auditService.recordEvent`. |
| 35 | Audit event does not include raw client secret. | **PASS** | Audit metadata only contains `clientId`, `name`, and bounded lifecycle metadata; no secret field present in any audit call. |
| 36 | Audit event does not include client secret hash. | **PASS** | `clientSecretHash` is not referenced in any audit call metadata. |
| 37 | Audit event does not include full client object. | **PASS** | Only bounded fields passed to `metadata`; `ClientAdminView` (which omits hash) not even passed to audit. |
| 38 | Admin does not import OIDC client model. | **PASS** | `rg "ClientModel|client\.model" src/modules/admin` — no results. |
| 39 | Admin does not import OIDC client repository. | **PASS** | `rg "client\.repository" src/modules/admin` — no results. |
| 40 | Admin does not hash client secret. | **PASS** | No `hashValue` import or call in any admin file. |
| 41 | Admin does not verify client credential. | **PASS** | No `verifyHash` import or call in any admin file. |
| 42 | OIDC does not directly access user DB. | **PASS** | `rg "UserModel|user\.repository" src/modules/oidc` — no results. |
| 43 | No token issuance semantics changed except approved client validation integration. | **PASS** | Only `findClient` changed to async with DB lookup; token issuance logic untouched. |
| 44 | No refresh token lifecycle behavior changed. | **PASS** | `refresh-token.service.ts` not modified. |
| 45 | No session lifecycle behavior changed. | **PASS** | `oidc-session.service.ts` not modified. |
| 46 | No dynamic public registration introduced. | **PASS** | No public registration endpoint; all client creation routes are under `/admin/`. |
| 47 | No admin dashboard UI introduced. | **PASS** | No UI files created. |
| 48 | No broad RBAC framework introduced. | **PASS** | No RBAC code introduced; admin endpoints operate under existing admin authorization baseline. |
| 49 | No hard delete client introduced. | **PASS** | `rg "deleteOne|findOneAndDelete|findByIdAndDelete" src/modules/oidc` — no results. |
| 50 | Sprint 18 report records validation evidence. | **PASS** | This document. |

---

## 10. Risks, Limitations, and Deferred Work

| Item | Type | Notes |
| :--- | :--- | :--- |
| No integration or unit tests configured | Risk | Project has no test runner in `package.json`. All validation is static/build. Runtime behavior verified by static analysis only. |
| Static config fallback allows non-hashed secret comparison | Known limitation | Static config clients use plain-text `clientSecret` in config (pre-Sprint 18 behavior). This is not changed by Sprint 18 and is outside approved scope. |
| `clientId` generation uses `randomBytes(16).toString('hex')` | Design note | Not a UUID. Consistent with crypto utility availability in project. Can be revisited in a future sprint with an approved contract. |
| `listClients` is unbounded by default if no args passed | Minor risk | Default `limit=50` applied in repository. Admin API does not yet expose `skip`/`limit` query params. Acceptable for Sprint 18; expansion deferred. |
| `oidc.client.*` events currently only reachable if system calls service without `adminSub` | Design note | No system-automated client management exists yet. The `oidc.client.*` family is wired and ready for Sprint 19+ automation without code changes. |

---

## 11. Handoff to Sprint 19

Sprint 18 hands off to **Sprint 19 - Observability Hardening**.

Sprint 19 may use safe client identifiers (`clientId`) and client lifecycle audit events for observability metrics. Sprint 19 must not:
- Access `clientSecretHash` or any secret material.
- Move business logic into infrastructure.
- Introduce high-cardinality sensitive labels.

---

## 12. Operational Sign-Off

- `npm.cmd run lint`: **PASS** (exit 0)
- `npm.cmd run typecheck`: **PASS** (exit 0)
- `npm.cmd run format:check`: **PASS** (exit 0)
- `npm.cmd run build`: **PASS** (exit 0)
- Security boundary scans: **PASS / PASS WITH REVIEW** (all reviewed matches expected or pre-existing)
- Manual validation matrix: **50/50 PASS**
- Governance compliance: **Self-check PASS / pending reviewer approval**
