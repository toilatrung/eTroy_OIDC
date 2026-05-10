# eTroy OIDC

eTroy OIDC is the backend OpenID Connect Provider for the eTroy ecosystem.

This repository provides the central identity and authentication service responsible for user identity, authentication, OpenID Connect flows, token issuance, session and SSO behavior, client management, audit logging, observability, and JWKS/key rotation.

It is designed as the identity source of truth for ecosystem applications. Client applications consume identity from this service and must not own or duplicate user identity records.

## Repository Role

This repository is the backend service for the eTroy OIDC platform.

```text
Repository: eTroy OIDC
Role: Backend / OpenID Provider service
Primary responsibility: Identity, authentication, OIDC protocol, token/session lifecycle, and platform governance
```

This repository does not contain the frontend application or the standalone API exploration UI.

## Related Repositories

The eTroy OIDC platform is expected to work with the following related repositories:

```text
etroy-oidc-ui
```

Frontend application for user-facing identity and account lifecycle flows, such as registration, login, logout, profile management, consent, and applicable admin-facing screens.

```text
etroy-odic-api
```

API Explorer used for inspecting, testing, and validating backend API and OIDC endpoints.

## System Context

eTroy OIDC acts as the central identity layer for the eTroy ecosystem.

Supported ecosystem clients include:

- eTroy
- eTroy Bulletin
- Troy Course Lab

Core principles:

- eTroy OIDC owns user identity.
- Client applications do not authenticate users directly.
- Client applications do not own user identity records.
- Client applications validate tokens and consume identity claims.
- Identity updates must go through the identity layer.

## High-level Platform View

```text
+-------------------+
|  etroy-oidc-ui    |
|  Frontend UI      |
+---------+---------+
          |
          | User-facing identity flows
          v
+---------+---------+
|   eTroy OIDC      |
|   Backend / OP    |
+---------+---------+
          ^
          | API inspection and validation
+---------+---------+
| etroy-odic-api    |
| API Explorer      |
+-------------------+
```

## Core Capabilities

### Identity and Account Lifecycle

- User registration
- User login
- Email verification
- Password reset
- Password change
- Display-name/profile update
- User identity ownership through the `users` module

### Authentication

- Local credential validation
- Register/login orchestration
- Current credential verification for sensitive operations
- Authentication support for OIDC flow continuation

Authentication is intentionally separated from OIDC token issuance. The `auth` module validates credentials only and must not generate OIDC tokens.

### OpenID Connect

- Authorization Code Flow with PKCE
- `/authorize`
- `/token`
- `/userinfo`
- ID Token issuance
- Access Token issuance
- Refresh Token issuance
- Scope-based claims mapping
- RSA-signed JWTs
- JWKS publication

### Token and Session Lifecycle

- Refresh token hash-only persistence
- Refresh token rotation
- Refresh token reuse detection
- Token revocation
- Token introspection
- OIDC session management
- SSO support
- Logout hardening

### Client Management

- Admin-managed OIDC clients
- System-generated `client_id`
- System-generated client secret
- Client secret hash-only persistence
- One-time raw client secret return on create/rotate
- Exact-match redirect URI validation
- Client disablement
- Client secret rotation

### Platform and Governance

- Audit event foundation
- Admin control boundaries
- Safe structured logging
- Metrics and readiness endpoints
- JWKS/key rotation hardening
- Final security hardening and release-readiness review

## Architecture

The backend follows a Modular Monolith and Domain-based Architecture.

Primary source areas:

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

## Layer Responsibilities

### `app/`

Delivery layer.

Responsibilities:

- HTTP server bootstrap
- middleware wiring
- route registration
- request handling
- response mapping

The `app` layer must not own business logic, token lifecycle logic, or direct database mutation.

### `config/`

Centralized configuration layer.

Responsibilities:

- environment loading
- environment validation
- normalized configuration export
- typed configuration access

Direct `process.env` usage outside this boundary is forbidden.

### `infrastructure/`

External integration layer.

Responsibilities:

- MongoDB integration
- Redis integration
- mail adapter
- logger adapter
- metrics primitives
- cryptographic utilities

Infrastructure must remain adapter-focused and must not own business workflow logic.

### `modules/`

Domain and application logic layer.

Approved modules:

```text
modules/
├─ users/
├─ auth/
├─ verification/
├─ password-reset/
├─ token-lifecycle/
├─ oidc/
├─ admin/
├─ audit/
└─ health/
```

This is the primary ownership boundary of the system.

### `shared/`

Cross-cutting primitives only.

Allowed contents:

- generic constants
- generic errors
- reusable types
- generic utilities
- generic validators

The `shared` layer must not become a dumping ground for domain-specific workflows.

### `jobs/`

Scheduled and background operational tasks.

Jobs may call approved services but must not bypass module ownership or directly mutate persistence outside the owning module contract.

## Module Ownership Rules

### `users`

Owns:

- user identity records
- core identity fields
- user lifecycle data
- profile mutation rules

Must not own:

- OIDC protocol flow
- token generation
- client management logic

### `auth`

Owns:

- local credential validation
- register/login orchestration
- current password verification

Must not own:

- access token generation
- refresh token generation
- ID Token generation
- OIDC session issuance

### `verification`

Owns:

- email verification flow
- verification request and completion workflow

Must not own:

- password reset behavior
- OIDC token behavior
- direct identity mutation bypassing `users`

### `password-reset`

Owns:

- password reset request flow
- password reset confirmation flow

Must not own:

- email verification behavior
- OIDC token behavior
- direct password mutation bypassing approved `users`/`auth` contracts

### `token-lifecycle`

Owns:

- non-OIDC lifecycle tokens for identity lifecycle flows
- token hashing
- token expiration
- one-time token usage
- token revocation for verification/reset purposes

Must not own:

- OIDC access tokens
- OIDC refresh tokens
- ID Tokens
- sessions
- direct user identity mutation

### `oidc`

Owns:

- OIDC protocol flow
- authorization code flow
- token issuance
- claims mapping
- UserInfo
- refresh token lifecycle
- session and SSO lifecycle
- logout behavior
- OIDC client metadata
- JWKS and signing key lifecycle

Must not own:

- user identity lifecycle
- credential validation policy
- direct user database access bypassing `users`

### `admin`

Owns:

- admin-facing orchestration
- controlled administrative use cases

Must not own:

- direct cross-domain database mutation
- token issuance implementation
- OIDC client persistence internals
- broad business logic from other modules

### `audit`

Owns:

- audit event persistence
- audit event query/record interfaces

Must not own:

- business state mutation
- domain policy decisions

### `health`

Owns:

- health reporting
- readiness reporting
- dependency readiness checks

Must not own:

- business logic
- identity logic
- token/session behavior

## Critical Boundary Rules

The following rules are mandatory:

- `auth` must not generate access tokens, refresh tokens, or ID Tokens.
- `oidc` must not directly query user ownership data from the database.
- Refresh tokens must never be stored raw.
- Client secrets must never be stored raw.
- Private key material must never be exposed through JWKS, logs, audit, metrics, reports, or API responses.
- Identity must remain the single source of truth in eTroy OIDC.
- Infrastructure must not contain business workflow logic.
- Shared utilities must not contain domain workflows.
- Controllers must remain thin.
- Persistence access must remain behind the owning repository layer.
- Configuration must be loaded through `src/config`.

## Technology Stack

### Runtime

- Node.js
- Express
- TypeScript

### OIDC and Security

- `oidc-provider`
- JWT
- RSA signing
- JWKS
- PKCE
- Argon2 password hashing

### Data and Infrastructure

- MongoDB
- Redis
- Nodemailer
- Pino
- Zod

## Requirements

Before running the backend locally, prepare:

- Node.js
- npm
- MongoDB
- Redis
- valid `.env` configuration based on `.env.example`
- local development key material where required

Do not commit real production private keys or secrets.

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Update `.env` with local MongoDB, Redis, OIDC, and application settings.

Start local infrastructure if needed.

Example with Docker:

```bash
docker run -d --name etroy-mongo -p 27017:27017 mongo:latest
docker run -d --name etroy-redis -p 6379:6379 redis:latest
```

Run the backend in development mode:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Start the built application:

```bash
npm start
```

Actual script names should follow the current `package.json`.

## Development Validation

Run the standard validation chain before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Additional boundary checks may be required depending on the sprint, module, or PR scope.

Common checks include:

```bash
rg -n "process\.env" src --glob "!src/config/**"
rg -n "console\.log" src
rg -n "UserModel|user\.repository|mongoose.*User|findOne\(.*User|findById\(.*User" src/modules/oidc
rg -n "jwt|sign|id_token|access_token|refresh_token|generate.*token" src/modules/auth
```

## Known Validation Condition

Repository-wide `format:check` drift has been classified as an accepted condition in the current release-readiness posture.

When this occurs, PRs must still document:

- whether the failure is pre-existing
- whether touched files are formatting-clean
- whether the drift is outside the PR scope
- whether a dedicated cleanup PR is required

Do not silently claim `format:check` passed if it failed.

## API and UI Integration

### Frontend

The frontend repository is:

```text
etroy-oidc-ui
```

It should point to the backend base URL exposed by this service.

Typical frontend responsibilities include:

- login UI
- registration UI
- email verification screens
- password reset screens
- consent screen
- account/profile management screens
- logout flow
- applicable admin-facing screens

### API Explorer

The API Explorer repository is:

```text
etroy-odic-api
```

It is used for API inspection, endpoint validation, and manual testing of backend behavior.

It should be configured with the backend API/OIDC base URL.

## Documentation

Project documentation lives under:

```text
docs/
```

Important documentation areas:

### `docs/architecture/`

Architecture contracts, module boundaries, and source-tree rules.

### `docs/requirements/`

Software requirements and acceptance criteria.

### `docs/contracts/`

Feature, flow, security, lifecycle, and implementation contracts.

### `docs/planning/`

Execution plan, phases, sprint assignments, and sprint reports.

### `docs/governance/`

Git workflow, PR rules, review checklist, and anti-patterns.

### `agent/`

Operational context for AI-assisted execution.

The `agent/` directory is support-only and must not override `docs/`.

## Source-of-truth Policy

The documentation authority model is:

1. `docs/source-of-truth-index.md`
2. `docs/README.md`
3. architecture documents
4. requirements documents
5. planning documents
6. governance documents
7. `agent/` operational files

Rules:

- `docs/` is authoritative.
- `agent/` is operational support only.
- `source-tree.md` is the primary repository structure contract.
- `detailed-source-tree.md` is supporting detail only.
- Architecture and requirements documents override implementation convenience.
- Undocumented architecture changes are invalid until approved and reflected in source-of-truth documents.

## Development Workflow

This project follows contract-first development.

Mandatory flow:

```text
Contract -> Review -> Approve -> Implement -> Validate -> PR -> Review -> Merge
```

Implementation must not begin without an approved contract when the change affects behavior, architecture, security, or module ownership.

## Git and PR Rules

Direct commits to primary branches are forbidden.

All meaningful changes must go through:

1. Working branch
2. Pull request
3. Review
4. Validation evidence
5. Merge after approval

Branch naming examples:

```text
feature/oidc-client-management
fix/oidc-key-rotation
docs/update-security-contract
chore/format-baseline-cleanup
```

Commit message format:

```text
<type>(<scope>): <message>
```

Examples:

```text
feat(oidc): add managed client validation
fix(config): enforce fail-fast env validation
docs(governance): update review checklist
chore(docs): sync release readiness status
```

Allowed commit types include:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `build`

## Pull Request Requirements

Every meaningful PR must include:

- summary
- context
- related phase, sprint, or task
- affected module or layer
- source-of-truth references
- included scope
- excluded scope
- boundary check
- security check
- exact validation commands and results
- risk and rollback notes
- reviewer focus

Merge must be blocked if:

- source-of-truth references are missing
- validation evidence is missing or placeholder-only
- module boundaries are violated
- security-critical rules are violated
- raw secrets or tokens are persisted or exposed
- undocumented architecture changes are introduced
- unrelated code is included

## Security Notes

Do not commit:

- real private keys
- production secrets
- raw refresh tokens
- raw client secrets
- password hashes in public outputs
- generated build artifacts
- local logs
- temporary validation harness files

Sensitive values must not appear in:

- logs
- audit metadata
- metrics labels
- API responses
- readiness output
- reports
- committed examples

## License

Copyright (c) 2026 Trịnh Quang Trung.

All rights reserved.

This source code is proprietary and confidential. No part of this repository may be copied, modified, distributed, sublicensed, or used for commercial or non-commercial purposes without explicit written permission from the owner.
