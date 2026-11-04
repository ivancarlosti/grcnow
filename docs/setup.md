# Setup

## Services

| Service | Image | Port |
| --- | --- | --- |
| grc-web | Dockerfile target `web` | 3000 |
| grc-api | Dockerfile target `api` | 3001 |
| grc-db | postgres:16-alpine | 5433 (host) |
| grc-redis | redis:7-alpine | internal |
| grc-minio (profile `s3`) | minio/minio | 9000/9001 |

`docker compose --profile s3 up` also starts MinIO; set `STORAGE_DRIVER=s3` and the `S3_*` values.

## Environment

All variables live in `docker/.env` (compose) or `apps/api/.env` (local). See `docker/.env.example`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | session signing |
| `AUTH_METHOD` | `none` \| `account` \| `keycloak` |
| `ACCOUNT_LOGIN`, `ACCOUNT_PASSWORD` | Super Admin credentials for `account` mode |
| `KEYCLOAK_BASE_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET` | OIDC client |
| `KEYCLOAK_REDIRECT_URI`, `KEYCLOAK_POST_LOGOUT_REDIRECT_URI` | optional overrides (derived from `APP_URL`) |
| `KEYCLOAK_ACCOUNTS` | allow list: `admin@corp.com @corp.com other.com` |
| `DEFAULT_LOCALE` | global default language (also editable in the UI) |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_ROOT`, `S3_*` | file storage |
| `REDIS_URL` | BullMQ; empty means inline execution |
| `SMTP_*`, `MAIL_FROM` | notification e-mails (logged when unset) |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | AI assistant |
| `SEED_DEMO` | `true` seeds two demo companies |

reCAPTCHA v3 keys are **not** env variables. Set them in Super Admin → Global settings; the login page
and the public whistleblowing form verify the token when both keys exist.

## Database

```bash
pnpm --filter @grc/api db:generate     # prisma generate
pnpm --filter @grc/api db:push         # dev schema sync
pnpm --filter @grc/api db:migrate      # create a migration
pnpm --filter @grc/api db:seed         # global settings + compliance library + demo data
```

The container entrypoint runs `prisma migrate deploy` and seeds automatically on first boot.

## Production checklist

1. Change `JWT_SECRET` and the Super Admin password.
2. Set `APP_URL` to the public HTTPS origin (cookies become `Secure`).
3. Point `STORAGE_DRIVER=s3` at durable object storage.
4. Configure SMTP so notifications leave the platform.
5. Register `${APP_URL}/api/auth/callback` and `${APP_URL}/login` in the Keycloak client.
6. Set `SEED_DEMO=false` for a clean install.

## Troubleshooting

- **`Cannot read properties of undefined (reading 'getAllAndOverride')`** — the API was started with a
  transpiler that does not emit decorator metadata. Use `ts-node` or `node dist/main.js`.
- **Cookies not set behind a proxy** — terminate TLS and forward `X-Forwarded-Proto`; `APP_URL` must be
  the HTTPS URL.
- **`Invalid redirect uri` on logout** — register the post-logout URI in Keycloak or set
  `KEYCLOAK_POST_LOGOUT_REDIRECT_URI`.
- **Redis unavailable** — the platform logs a warning and processes jobs inline.
