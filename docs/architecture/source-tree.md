# eTroy OIDC — Source Tree

---

## I. Purpose

This document defines the **approved physical repository structure** for eTroy OIDC.

Its objectives are to:

- lock the physical contract of the codebase
- standardize repository organization across Leader, Dev, Tester/BA, and agent usage
- prevent incorrect file placement, module leakage, and layer drift
- provide a stable baseline for code review, onboarding, and quality control

This document is the **source of truth for repository structure**.  
If implementation differs from this document without an approved architectural decision, the implementation is non-compliant.

---

## II. Repository Structure Principles

### 1. Structure must reflect architecture

Repository structure is not only storage layout. It is the physical representation of system architecture.

Core structural principles:

- `app` represents the delivery layer
- `config` represents the configuration layer
- `modules` represents domain and application logic
- `infrastructure` represents external system integration
- `shared` represents cross-cutting concerns
- `jobs` represents scheduled and background tasks

### 2. Physical structure must follow module ownership

Every directory must exist for a clear architectural reason.  
No directory may be created only for convenience.

This means:

- identity-related files must live in identity-owned areas
- OIDC-related files must live in OIDC-owned areas
- infrastructure files must live in `infrastructure`
- genuinely reusable cross-cutting files may live in `shared`

### 3. The repository must not become an ad-hoc storage area

The following are forbidden:

- creating ad-hoc directories outside approved structure
- introducing new layers without an architectural decision
- placing business logic in convenient but incorrect locations
- storing temporary, personal, or experimental files inside the main source tree

### 4. Relationship with `detailed-source-tree.md`

`source-tree.md` defines the approved structure at **contract level**.  
`detailed-source-tree.md` is a **supporting reference** used only to fill file-level detail where this document remains high-level.  
If any conflict exists, `source-tree.md` takes precedence.

---

## III. Root-level Structure

The eTroy OIDC repository must have the following root structure:

Approved root-level areas include `.github/` as a governance and automation directory.

```text
etroy-oidc/
├─ src/
├─ agent/
├─ keys/
├─ scripts/
├─ docs/
├─ .github/
├─ .env
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## IV. Root Directory Responsibilities

### 1. `src/`

`src/` is the main runtime source area.

It contains:

- delivery layer
- configuration layer
- infrastructure layer
- domain modules
- shared cross-cutting assets
- scheduled jobs
- test workspace if tests are kept inside `src`

It must not contain:

- architecture documents
- governance documents
- agent context files
- unrelated temporary artifacts

### 2. `agent/`

`agent/` is the workspace for AI context and project alignment.

Its purpose is to support:

- role-specific guidance
- context continuity
- lightweight agent-facing repository guidance

It is not part of runtime application logic.

### 3. `keys/`

`keys/` stores cryptographic materials required by the identity platform.

This includes:

- JWKS data
- private key material
- public key material

Rules:

- real sensitive key material must not be committed unless explicitly approved
- placeholder or local development material must remain controlled
- key layout must follow approved structure only

### 4. `scripts/`

`scripts/` stores repository-level operational scripts.

Typical uses:

- local key generation
- seed data
- migration utilities

Scripts are not part of the primary business runtime and must remain isolated from module logic.

### 5. `docs/`

`docs/` stores official project documentation.

It includes:

- architecture
- requirements
- planning
- governance

Official project documents must live here rather than being scattered across the repository.

### 6. `.github/`

`.github/` stores repository governance and automation assets.

It may contain:

- pull request templates
- GitHub Actions workflows
- repository-level automation metadata

Rules:

- `.github/` is not a runtime source area
- `.github/` must not contain business logic
- automation and workflow files must support governance and quality control

### 7. Root configuration files

#### `.env`

Local runtime input only. It is not the architectural definition of configuration.

#### `.env.example`

Environment contract template for onboarding and local setup.

#### `.gitignore`

Repository hygiene contract for generated artifacts, secrets, and local noise.

#### `package.json`

Node package manifest and command lifecycle contract.

#### `tsconfig.json`

TypeScript compiler contract.

#### `README.md`

Repository entry document for onboarding and orientation.

---

## V. Source Code Structure (`src/`)

The approved `src/` structure is:

```text
src/
├─ app/
├─ config/
├─ infrastructure/
├─ modules/
├─ shared/
├─ jobs/
├─ tests/
└─ index.ts
```

---

## VI. `src/app/` — Delivery Layer

`app/` is the HTTP and application delivery layer.

Responsibilities:

- server bootstrap
- application assembly
- route registration
- middleware wiring
- controller entry points

Allowed:

- request handling
- response mapping
- middleware registration
- route composition

Forbidden:

- core business logic
- token lifecycle ownership
- direct database mutation in place of module services

---

## VII. `src/config/` — Configuration Layer

`config/` is the centralized configuration layer.

Responsibilities:

- reading environment input
- validating environment variables
- exporting normalized configuration to the rest of the system

Rules:

- `process.env` must not be used directly outside configuration boundaries
- configuration must be explicit, typed, and centralized
- business logic must not be placed in this layer

---

## VIII. `src/infrastructure/` — External System Integration

`infrastructure/` contains adapters and integration code for external systems.

It covers:

- database integration
- Redis integration
- mail integration
- logging
- metrics
- cryptographic utilities

Allowed:

- provider setup
- connection management
- external library wrapping
- low-level utility integration

Forbidden:

- business workflow ownership
- domain orchestration
- domain-specific policy logic

---

## IX. `src/modules/` — Domain and Application Logic

`modules/` is the core domain area of the system and the primary ownership boundary.

Approved module groups:

```text
modules/
├─ users/
├─ auth/
├─ verification/
├─ password-reset/
├─ token-lifecycle/
├─ oidc/ (internal subfolders approved)
│  ├─ controllers/
│  ├─ services/
│  ├─ repositories/
│  ├─ models/
│  └─ providers/
├─ admin/
├─ audit/
└─ health/
```

Rules:

- each module must own a clear responsibility
- modules must not duplicate each other’s logic
- forbidden dependencies defined in `module-boundaries.md` must be respected
- structure inside each module must remain consistent with approved repository contract

---

## X. `src/shared/` — Cross-cutting Layer

`shared/` stores cross-cutting primitives that do not belong to a single domain.

Typical contents:

- constants
- generic errors
- reusable types
- generic utilities
- validators

Allowed:

- reusable stateless utilities
- generic types and errors
- cross-domain primitives

Forbidden:

- hidden business logic
- module-specific workflows
- dumping unrelated code into a common folder

---

## XI. `src/jobs/` — Scheduled and Background Tasks

`jobs/` stores scheduled maintenance and operational background tasks.

Typical uses:

- cleanup
- key rotation
- periodic maintenance

Jobs may:

- call valid services
- run maintenance workflows
- perform approved scheduled operational actions

Jobs may not:

- become a second business layer
- bypass module ownership
- mutate domain state outside approved contracts

---

## XII. `src/tests/` — Test Workspace

`tests/` is the workspace for verification at different test levels.

Typical areas include:

- unit tests
- integration tests
- e2e tests
- fixtures
- shared test helpers

Rules:

- test code must not redefine production architecture ownership
- fixtures and helpers must stay test-scoped
- test structure should remain aligned with approved source-tree contract

---

## XIII. `src/index.ts` — Runtime Entry Point

`src/index.ts` is the approved runtime entry point.

It should remain limited to:

- top-level application bootstrap
- startup orchestration
- handoff to the delivery layer

It must not become a place for business logic.

---

## XIV. Approved Root-level Product Areas

At contract level, the repository is divided into six main product areas:

1. `src/` - runtime source
2. `docs/` - official documentation
3. `.github/` - repository governance and automation
4. `scripts/` - operational scripts
5. `keys/` - cryptographic materials
6. `agent/` - lightweight AI context support
   These areas must remain clearly separated.

---

## XV. File and Folder Naming Rules

General rules:

- use lowercase
- use kebab-case where appropriate
- avoid spaces
- avoid ad-hoc special characters
- choose names that reflect structural role clearly

Source file naming patterns:

- controller files: `<name>.controller.ts`
- service files: `<name>.service.ts`
- repository files: `<name>.repository.ts`
- model files: `<name>.model.ts`
- validator files: `<name>.validator.ts`
- job files: `<name>.job.ts`

Documentation naming should remain consistent, for example:

- `system-overview.md`
- `module-boundaries.md`
- `source-tree.md`
- `detailed-source-tree.md`
- `srs-v1.md`
- `master-execution-plan.md`

---

## XVI. Structural Anti-patterns

The following anti-patterns are non-compliant:

- ad-hoc directories outside approved structure
- duplicated module layouts for the same responsibility
- business logic hidden in `infrastructure` or `shared`
- direct ownership bypass between modules
- temporary or personal files mixed into product source areas
- introducing new layers without an architectural decision

---

## XVII. Change Control

Any structural change must follow change control:

1. propose and approve an architectural decision
2. update `source-tree.md` first (contract level)
3. update `detailed-source-tree.md` as supporting detail when needed
4. ensure implementation and review checks align with updated contract

No structural drift is allowed outside this process.

---

## XVIII. Compliance Rule

Compliance is binary at contract level:

- if repository structure matches this document, it is compliant
- if structure diverges without approved decision, it is non-compliant

Non-compliance must be corrected before merge/release quality gates.

---

## XIX. Conclusion

`source-tree.md` locks the physical repository contract of eTroy OIDC so that:

- source code reflects approved architecture
- module ownership remains clear
- file placement stays consistent
- onboarding and review become predictable
- the repository can scale without structural drift

Without this contract, even a correct logical architecture can degrade into an inconsistent and ungoverned codebase.
