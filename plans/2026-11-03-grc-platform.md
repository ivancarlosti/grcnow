# GRC Platform (Eramba-equivalent) — Master Plan

## Context

The repository starts empty (only CI workflows). We must build a production-ready,
multi-tenant GRC SaaS equivalent to Eramba (demo.cloud.eramba.org), with:

- Super Admin (consultant) creating isolated companies (tenants).
- Per-company RBAC (Company Admin, GRC Manager, Auditor, Risk Owner, Policy Owner, Regular User).
- Full GRC module set (organization, controls, risks, compliance packages, policies,
  exceptions, projects, incidents, findings, BCP, assessments, training, account reviews,
  whistleblowing, data privacy/RoPA).
- i18n with 7 locales, resolution hierarchy user > company > global > en-US, RTL for ar-SA.
- Pluggable auth: `AUTH_METHOD=none|account|keycloak` (OIDC + PKCE + allow list + reCAPTCHA v3).
- Storage abstraction `STORAGE_DRIVER=local|s3`.
- REST API + webhooks, CSV import/export, audit trail, saved views, custom fields,
  dynamic status rules, automation, AI assistant + MCP endpoint.

## Goal

A Dockerized monorepo that boots with `docker compose up`, seeds demo data, and satisfies
every acceptance criterion in the brief, delivered in 4 testable phases.

## Architecture

```
/                       pnpm workspace root, Dockerfile (multi-stage, targets api/web)
/docker                 docker-compose.yml, docker-compose.dev.yml, .env.example
/plans                  this folder (implementation plans, per phase)
/docs                   setup, api, auth, i18n, storage, modules, testing, screenshots
/locales/{locale}       common.json + modules/*.json — source of truth for translations
/apps/api               NestJS 11 + Prisma 6 + PostgreSQL + BullMQ (optional Redis)
/apps/web               Next.js 15 (App Router) + Tailwind 3 + shadcn-style UI + next-intl 4
```

### Tenancy

- `tenants` = companies. Every business table carries `tenant_id`.
- A Prisma client extension (`TenantPrisma`) injects `tenantId` into every `where`/`data`
  for tenant-scoped models, driven by `AsyncLocalStorage`. Tenant-scoped models use
  `@@unique([tenantId, id])` so `findUnique/update/delete` stay tenant-safe.
- Global tables (`tenants`, `compliance packages` templates, `translations`, global
  `settings`) are excluded and only reachable through services with explicit bypass.
- Super Admin has `tenantId = null`; to act on a tenant it sends `x-tenant-id`, which the
  tenant guard validates before the context is opened. Impersonation issues a short-lived
  token carrying `impersonatedBy` and a target tenant.

### Auth strategy pattern

`AUTH_METHOD` selects one of three `AuthStrategy` providers (`NoneStrategy`,
`AccountStrategy`, `KeycloakStrategy`) resolved by a Nest factory provider. JWT access
tokens are httpOnly cookies (`grc_token`) + `Authorization: Bearer` support (for API
clients). Refresh tokens are hashed in DB. reCAPTCHA v3 verification is applied to
`/api/auth/login` and the public subscription/whistleblowing forms when configured.

### i18n

- Backend never returns translated UI copy: it returns keys and locale metadata.
- `GET /api/i18n/messages` resolves the locale (user pref > company default > global
  default > en-US) and returns DB translations merged over the JSON files.
- Frontend uses `next-intl` with messages fetched server-side; `<html lang dir>` is set
  from the resolved locale; RTL driven by Tailwind logical utilities + `dir` attribute.
- Super Admin translation editor writes to the `translations` table (per-locale overrides).

### Storage

`StorageService` with `LocalDriver` (`/storage/app/{tenantId}/...`) and `S3Driver`
(@aws-sdk/client-s3, works with S3/MinIO/R2/Wasabi). Every upload (policies, evidence,
training material, comments attachments, whistleblowing attachments) goes through it.

## Phases

### Phase 1 — Foundation
1. Workspace, Docker, env, docs/plans scaffolding.
2. Prisma schema (all modules), migrations, seed (tenants, users, roles, ISO 27001 package).
3. Auth (none/account/keycloak, PKCE, allow list, reCAPTCHA, refresh, impersonation).
4. Multi-tenancy enforcement + RBAC guard + audit trail + settings.
5. i18n backend (resolution hierarchy, message endpoint, translations editor) + 7 locales.
6. Modules: organization (business units, assets, vendors), internal controls (+ tests),
   risk management (matrix, treatment, reviews, appetite).
7. Web shell: sidebar, header, language switcher, login, dashboard, generic CRUD UI.

### Phase 2 — Core GRC
Compliance packages (+ ISO 27001/SOC2/NIST/GDPR/DORA/PCI-DSS JSON import, mappings,
analysis %), policies (lifecycle + versions + acknowledgements), exceptions, projects
(+tasks, kanban), incidents, audit findings, attachments/evidence through storage.

### Phase 3 — Extended modules
BCP + tests, assessments/questionnaires (public links, scoring), awareness training,
account reviews (CSV import), whistleblowing (anonymous per-company form), data flow +
RoPA, comments, approvals, custom fields/tabs.

### Phase 4 — Cross-cutting & platform
Dynamic status rules, notifications (multilingual email + webhooks + templates),
CSV import/export everywhere, saved views, automation (JS rule engine), REST API tokens,
AI assistant (OpenAI) + MCP endpoint, global search, Super Admin panel (global settings,
translations editor, auth + storage settings, usage), screenshots in README.

## Steps (execution checklist)

- [x] Root scaffold + docker compose + env example + .dockerignore/.gitignore
- [x] Prisma schema + migration + seed
- [x] API common layer (prisma, context, guards, filters, audit, csv)
- [x] Auth module (3 strategies) + tests
- [x] i18n + translations + locales generator
- [x] Tenants/users/roles/settings + super admin endpoints
- [x] Phase 1 domain modules
- [x] Web shell + pages + i18n/RTL + login
- [x] Phase 2 modules + UI
- [x] Phase 3 modules + UI
- [x] Phase 4 cross-cutting + super admin panel + AI/MCP
- [x] Smoke tests (API e2e script), screenshots, README, docs

## Risks

- Scope is enormous: mitigated with a metadata-driven CRUD engine shared by most modules,
  while keeping real relational tables and dedicated logic for risk/compliance/policy.
- Prisma tenant isolation: mitigated by composite uniques + ALS-scoped extension + e2e
  cross-tenant leak tests.
- Keycloak cannot be reached in CI: mitigated by unit-testing URL/PKCE/allow-list logic
  with a mocked token endpoint, plus a documented manual verification checklist.
- OIDC/session cookies across ports: mitigated by Next.js rewrites so the browser always
  talks to a single origin.
- RTL/locale correctness: verified with Playwright screenshots per locale.


## Status (implementation)

Delivered in this branch: full Phase 1-4 scope — monorepo, Prisma schema (40+ tenant-scoped
models), seed with 2 demo companies and 6 compliance frameworks, auth strategies
(none/account/keycloak + reCAPTCHA from settings), tenant isolation extension, RBAC,
audit trail, i18n with 7 locales (418 keys) and DB overrides, organization/controls/risks,
compliance + policies + exceptions + projects + incidents + findings + BCP + assessments +
training + account reviews + whistleblowing + privacy, custom fields, status rules, saved
views, notifications, webhooks, automation, API tokens, AI assistant, MCP endpoint, Next.js
UI for every module and Super Admin panel. Verified with `pnpm typecheck`, `next build` and
`node tools/e2e-smoke.mjs`.
