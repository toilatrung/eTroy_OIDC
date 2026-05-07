# eTroy OIDC - Detailed Source Tree (Supporting Reference)

---

## I. Authority and Scope

This document is a **supporting reference** for file-level naming and granularity.

Authority order:

1. `docs/architecture/source-tree.md` (primary contract)
2. `docs/architecture/detailed-source-tree.md` (secondary detail)

If any conflict exists, `source-tree.md` takes precedence.

---

## II. Root Structure (Detailed View)

```text
etroy-oidc/
├─ src/
├─ keys/
├─ scripts/
├─ docs/
├─ .github/
├─ agent/
├─ .env
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
└─ README.md
```

`.github/` is an approved root-level governance and automation area (non-runtime).

```text
.github/
|- pull_request_template.md
\\- workflows/
```

Rules:

- `.github/` supports repository governance and automation only
- `.github/` must not contain business logic or runtime source code

---

## III. Source Code (`src/`)

```text
src/
|- app/
|  |- controllers/
|  |- middlewares/
|  |- routes/
|  \- server.ts
|- config/
|  |- env.ts
|  |- config.ts
|  \- schema.ts
|- infrastructure/
|  |- database/
|  |  |- connection.ts
|  |  \- index.ts
|  |- redis/
|  |  |- client.ts
|  |  \- index.ts
|  |- mail/
|  |  |- mail.service.ts
|  |  \- index.ts
|  |- logger/
|  |  |- logger.ts
|  |  \- index.ts
|  |- metrics/
|  |  \- metrics.ts
|  \- crypto/
|     |- keys.ts
|     |- jwks.ts
|     |- hash.ts
|     \- index.ts
|- modules/
|  |- users/
|  |  |- user.model.ts
|  |  |- user.repository.ts
|  |  |- user.service.ts
|  |  \- user.controller.ts
|  |- auth/
|  |  |- auth.service.ts
|  |  |- auth.controller.ts
|  |  \- auth.validator.ts
|  |- verification/
|  |  |- verification.service.ts
|  |  \- verification.model.ts
|  |- password-reset/
|  |  |- password-reset.service.ts
|  |  \- password-reset.model.ts
|  |- oidc/
|  |  |- oidc.service.ts
|  |  |- oidc.controller.ts
|  |  |- oidc.provider.ts
|  |  \- claims.mapper.ts
|  |- admin/
|  |  \- admin.service.ts
|  |- audit/
|  |  \- audit.service.ts
|  \- health/
|     \- health.controller.ts
|- shared/
|  |- constants/
|  |- errors/
|  |- types/
|  |- utils/
|  \- validators/
|- jobs/
|  |- key-rotation.job.ts
|  \- cleanup.job.ts
|- tests/
|  |- unit/
|  |- integration/
|  |- e2e/
|  |- fixtures/
|  \- helpers/
\- index.ts
```

---

## IV. Keys

```text
keys/
├─ jwks.json
├─ private.pem
└─ public.pem
```

Rules:

- never commit real production private key material
- key files support token signing and JWKS publication contracts

---

## V. Scripts

```text
scripts/
├─ generate-keys.ts
├─ seed-data.ts
└─ migrate.ts
```

---

## VI. Documentation (`docs/`)

```text
docs/
|- architecture/
|  |- system-overview.md
|  |- module-boundaries.md
|  |- source-tree.md
|  \- detailed-source-tree.md
|- requirements/
|  \- srs-v1.md
|- planning/
|  |- master-execution-plan.md
|  |- phases/
|  |  |- phase-01-environment-bootstrap.md
|  |  \- phase-02-identity-core.md
|  |- assignments/
|  |  \- phase-<nn>-sprint-<nn>.md (sprint-level assignment contracts by phase/sprint)
|  \- reports/
|     \- phase-<nn>-sprint-<nn>-report.md / phase-<nn>-consolidated-report.md (execution evidence and handoff context)
\- governance/
   |- git-rules.md
   |- pr-template.md
   |- review-checklist.md
   \- anti-patterns.md
```

---

## VII. Agent Context (`agent/`)

```text
agent/
|- current-context.md
|- session-history.md
|- handoff-template.md
|- context-log.md
|- roles/
|  |- leader.md
|  |- dev.md
|  \- tester.md
\- prompts/
   |- README.md
   \- sprint-task-execution.md
```

---

## VIII. Boundary Rules (Reference)

Allowed dependencies:

- `app` -> `modules`
- `modules` -> `infrastructure` (through service contracts)
- `modules` -> `shared`

Forbidden dependencies:

- direct cross-domain `modules` -> `modules` ownership bypass
- `oidc` -> direct user ownership database access
- `auth` -> token generation
- `infrastructure` -> module business ownership logic

---

## IX. Design Intent

1. Controllers remain module-owned where applicable to support module cohesion.
2. Infrastructure remains replaceable and does not absorb business logic.
3. `shared` remains stateless and cross-cutting only.
4. OIDC remains isolated from local-auth ownership responsibilities.

---

## X. Practical Use

Use this document to:

- infer file naming
- infer expected file granularity
- verify repository-level physical layout details

Do not use this document to override `source-tree.md`.
