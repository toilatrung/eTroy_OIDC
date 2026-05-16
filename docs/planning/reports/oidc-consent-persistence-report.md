# OIDC Consent Persistence Validation Report

## 1. Branch / Scope

- Branch: `fix/oidc-consent-persistence`
- Task scope: OIDC browser interaction flow with persistent/reusable consent and Connected Applications backend APIs
- In-scope paths:
  - `src/modules/oidc/**`
  - `src/modules/audit/**`
  - `src/app/server.ts`
  - `src/config/config.ts`

## 2. Implemented Changes

### 2.1 Interaction transaction (persist + TTL)

- Added interaction model/repository/service:
  - `src/modules/oidc/models/interaction.model.ts`
  - `src/modules/oidc/repositories/interaction.repository.ts`
  - `src/modules/oidc/services/interaction.service.ts`
- Interaction stores:
  - `interaction_id`
  - `client_id`
  - `redirect_uri`
  - `scope` + normalized scope items
  - `state`
  - `code_challenge`
  - `code_challenge_method`
  - `nonce`
  - `created_at`
  - `expires_at`
  - lifecycle `status`
- TTL: Mongo TTL index on `expiresAt`.

### 2.2 Consent persistence + reuse

- Added consent model/repository/service:
  - `src/modules/oidc/models/consent.model.ts`
  - `src/modules/oidc/repositories/consent.repository.ts`
  - `src/modules/oidc/services/consent.service.ts`
- Consent key: `subject + clientId` unique index.
- Persisted fields:
  - `grantedScopes`
  - `status` (`active|revoked`)
  - `grantedAt`
  - `updatedAt`
  - `revokedAt`
- Approve path: upsert + merge scopes.
- Deny path: no consent write.
- Reuse logic in `/authorize` and `/authorize/interaction`: active consent must cover all requested scopes.

### 2.3 Browser authorize flow + decision flow

- Refactored `src/modules/oidc/services/oidc.service.ts`:
  - `GET /authorize`
    - validates client/redirect/scope/state/nonce/pkce
    - creates interaction
    - redirects to login UI when no active session
    - redirects to consent UI when consent missing/incomplete
    - skips consent and issues authorization code when consent coverage is satisfied
  - `GET /authorize/interaction`
    - resumes interaction after login
    - re-checks consent and either returns consent-required context or redirect URL
  - `POST /authorize/decision`
    - validates `interaction_id`, `decision`, session, and interaction status
    - `approve`: upsert consent + issue authorization code + return redirect URL
    - `deny`: no consent write + return redirect URL with `error=access_denied` and optional `state`

### 2.4 Connected Applications APIs

- Added endpoints:
  - `GET /api/v1/users/me/connected-applications`
  - `POST /api/v1/users/me/connected-applications/:clientId/revoke`
- Data source: persisted consent records (not static client config).
- Response excludes secrets/tokens/session internals.
- Revoke behavior: soft revoke (`status=revoked`) without hard delete.

### 2.5 Error contract and redirect policy

- Standardized OIDC-facing error codes:
  - `invalid_client`
  - `invalid_redirect_uri`
  - `invalid_scope`
  - `invalid_request`
  - `access_denied`
  - `login_required`
  - `consent_required`
  - `session_expired`
  - `interaction_expired`
  - `server_error`
- Behavior:
  - pre-validated-redirect request failures do not redirect to client
  - protocol errors with validated `redirect_uri` redirect with `error=...`
  - interaction/session errors for FE interaction APIs return safe JSON errors

### 2.6 Audit vocabulary + event emission

- Extended audit event types in `src/modules/audit/audit.types.ts` for authorize/consent lifecycle:
  - `oidc.authorization.started`
  - `oidc.authorization.login_required`
  - `oidc.authorization.consent_required`
  - `oidc.authorization.consent_approved`
  - `oidc.authorization.consent_denied`
  - `oidc.authorization.consent_reused`
  - `oidc.authorization.consent_revoked`
  - `oidc.authorization.code_issued`
  - `oidc.authorization.invalid_client`
  - `oidc.authorization.invalid_scope`
  - `oidc.authorization.interaction_expired`
- Updated contract-first vocabulary in `docs/contracts/audit/audit-event-contract.md` before finalizing runtime validity.
- Added safe audit emission at required flow points; no raw secrets/tokens/code verifier/cookies logged.

### 2.7 Route wiring / config updates

- Updated route wiring in `src/app/server.ts`:
  - add `/authorize/interaction`, `/authorize/decision`
  - add Connected Applications list/revoke endpoints
- Updated `src/config/config.ts`:
  - added OIDC interaction config:
    - `oidc.interaction.ttlSeconds`
    - `oidc.interaction.loginPath`
    - `oidc.interaction.consentPath`

## 3. Files Changed

- `src/app/server.ts`
- `src/config/config.ts`
- `src/modules/audit/audit.types.ts`
- `src/modules/oidc/controllers/oidc.controller.ts`
- `src/modules/oidc/services/oidc.service.ts`
- `src/modules/oidc/models/consent.model.ts`
- `src/modules/oidc/models/interaction.model.ts`
- `src/modules/oidc/repositories/consent.repository.ts`
- `src/modules/oidc/repositories/interaction.repository.ts`
- `src/modules/oidc/services/consent.service.ts`
- `src/modules/oidc/services/interaction.service.ts`
- `docs/contracts/audit/audit-event-contract.md`

## 4. Validation Evidence

### 4.1 Required commands

- `npm.cmd run lint`: PASS
- `npm.cmd run typecheck`: PASS
- `npm.cmd run build`: PASS
  - Non-escalated run failed with `TS5033 EPERM` on `dist/**`; rerun with escalated permissions succeeded (`tsc -p tsconfig.json`).
- Scoped format check (`npx.cmd prettier --check` on touched files): PASS

### 4.2 Boundary/security scans (required)

- `rg -n "process\\.env" src --glob "!src/config/**"`: PASS (no match)
- `rg -n "console\\.log" src`: PASS (no match)
- `rg -n "UserModel|user\\.repository|findById|findOne" src/modules/oidc`:
  - REVIEWED
  - matches are repository persistence methods (`findOne`/`findOneAndUpdate`) and an internal `interactionService.findById`, no direct user DB ownership bypass
- `rg -n "token-lifecycle" src/modules/oidc`: PASS (no match)
- `rg -n "client_secret|clientSecret|client_secret_hash|clientSecretHash" src/modules/oidc src/modules/admin`:
  - REVIEWED
  - matches are expected OIDC client-management code paths, not exposed through Connected Applications response
- `rg -n "authorization_code|code_verifier|access_token|id_token|refresh_token|session" src/modules/auth`: PASS (no match)

## 5. Manual Validation Matrix

Status key:

- `PASS`: executed and passed
- `FAIL`: executed and failed
- `NOT RUN`: not executed yet

1. User chua login goi `/authorize` -> redirect login voi `interaction_id`: PASS
2. Login xong quay lai interaction dang cho: PASS
3. User chua consent -> redirect consent: PASS
4. User bam Allow -> luu consent, issue code, tra redirect URL: PASS
5. User bam Deny -> khong luu consent, redirect `error=access_denied`: PASS
6. Authorize lan sau cung `client_id + scopes` -> reuse consent, skip consent screen: PASS
7. Client yeu cau scope moi -> consent screen xuat hien lai: NOT RUN
8. Revoke consent -> Connected Applications khong con active consent: PASS
9. Sau revoke, authorize lai -> yeu cau consent lai: PASS
10. Connected Applications API doc tu consent persistence that: PASS
11. Invalid `redirect_uri` reject theo exact-match policy: NOT RUN
12. Invalid `client_id` bi reject: NOT RUN
13. Missing/invalid PKCE bi reject: NOT RUN
14. Expired interaction bi reject an toan: NOT RUN
15. Audit log co event tuong ung va khong chua secret/token nhay cam: NOT RUN

## 6. Runtime Evidence

Executed runtime validation (automated local flow) confirmed PASS for:

- login-required redirect
- consent-required redirect
- consent approve path
- consent reuse path
- connected applications active listing
- revoke path
- connected applications revoked listing
- post-revoke consent-required path
- deny path with `error=access_denied`

Observed sample outputs:

- login redirect: `http://localhost:5173/oidc/login?interaction_id=...`
- consent redirect: `http://localhost:5173/oidc/consent?interaction_id=...`
- approve redirect URL: `http://localhost:5173/callback?code=...&state=...`
- deny redirect URL: `http://localhost:5173/callback?error=access_denied&state=...`

## 7. Risks / Notes

- FE must consume `/authorize/interaction` and `/authorize/decision` for complete browser UX.
- Register contract was not expanded in this task because no explicit approved register-field contract update was provided.

## 8. FE Handoff

FE integration points:

1. Start OIDC browser flow at `GET /authorize`.
2. On login redirect, extract `interaction_id` and call `GET /authorize/interaction?interaction_id=...`.
3. If response is `consent_required`, render consent UI using returned `clientId/clientName/requestedScopes`.
4. Submit decision to `POST /authorize/decision` with `{ interaction_id, decision }`.
5. Navigate browser to returned `redirectUrl`.
6. Connected Applications:
   - list from `GET /api/v1/users/me/connected-applications`
   - disconnect via `POST /api/v1/users/me/connected-applications/:clientId/revoke`
