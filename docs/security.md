# Security review log

## 2026-11-04 — dependency + code scanning pass

### Findings from GitHub

| Source | Finding | Severity | Status |
| --- | --- | --- | --- |
| Dependabot | `multer` DoS via pending `fileFilter` after teardown | high | fixed — `multer` 2.5.0 (root override) |
| Dependabot | `deepmerge-ts` stack exhaustion on recursive graphs (via `@prisma/config`) | high | fixed — root override to `deepmerge-ts` 8.0.x |
| Dependabot | `nodemailer` addressparser/SMTP/DKIM DoS, SSRF, TLS and header issues (21 advisories) | high/medium/low | fixed — `nodemailer` 10.3.1, `@types/nodemailer` 8.0.2 |
| Dependabot | `postcss` path traversal / arbitrary `.map` read / XSS in stringify (5 advisories) | high/medium | fixed — `postcss` 8.5.32 (root override covers the Next.js copy) |
| Dependabot | `csv-parse` prototype replacement reachable via `columns` | medium | fixed — `csv-parse` 7.0.2 |
| Code scanning | `js/prototype-pollution-utility` in `apps/api/src/common/utils/objects.ts` | warning | fixed — unsafe keys rejected, own properties written with `Object.defineProperty` |
| Code scanning | `js/prototype-pollution-utility` in `tools/generate-locales.mjs` | warning | fixed — `setDeep`/fallback merge hardened |
| Secret scanning | none | — | — |

Dependabot PR #4 (csv-parse, nodemailer, multer) was validated locally (`typecheck`, API smoke test,
CSV import, file upload) and squash-merged rather than recreated.

### Hardening applied with the fixes

- `apps/api/src/common/utils/objects.ts`: `safeSetProperty` refuses `__proto__`/`prototype`/`constructor`
  and writes data properties via `Object.defineProperty`; `deepMerge`, `setDeep`, `flatten`, `omitEmpty`,
  `pick` and `getDeep` all use it. `pick` now only copies own properties.
- `apps/api/src/modules/i18n/i18n.controller.ts`: translation overrides require a dotted key matching
  `^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$` and reject unsafe segments (400 instead of silently ignoring).
- `apps/api/src/common/audit/audit.service.ts` and `common/csv/csv.util.ts` write through
  `safeSetProperty` as defence in depth.
- `tools/generate-locales.mjs`: translation source keys are validated before being written.

### Verification

```bash
pnpm typecheck                                   # api + web
pnpm --filter @grc/api test                      # 6 prototype-pollution regression tests
pnpm --filter @grc/web build                     # postcss 8.5.32
node tools/e2e-smoke.mjs                         # API smoke test
```

Live probes against a running API: `PUT /api/i18n/translations` with `__proto__.polluted`,
`common.__proto__.polluted` and `constructor.prototype.polluted` now returns `400 errors.validation`,
`GET /api/i18n/messages` never exposes injected keys, and a CSV import whose header contains
`__proto__` is rejected by field validation without polluting the process.

### Notes / accepted risk

- `deepmerge-ts` 8 is only consumed by the Prisma config loader; `prisma validate`, `db:push` and
  `db:seed` were re-run after the override.
- `postcss` is build-time only (Tailwind/Next pipeline); the override to 8.5.32 also replaces the
  8.4.31 copy bundled with Next 15.
- Keycloak and SMTP were not exercised against live servers in this review; both paths are covered by
  configuration validation only.
