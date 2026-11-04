# REST API

Base URL: `/api`. Authentication is a httpOnly cookie set by `POST /api/auth/login` or
`Authorization: Bearer <token>`; tenant API tokens use `Authorization: Bearer grc_<id>_<secret>`.

## Conventions

- Errors: `{ statusCode, messageKey, message, issues?, path, timestamp }` — translate `messageKey` on the client.
- Lists: `?page=1&pageSize=25&q=&sort=createdAt&dir=desc` plus any field name as filter.
- Every module exposes the same CRUD surface:
  `GET /api/:module`, `GET /api/:module/meta`, `GET /api/:module/options`,
  `GET /api/:module/:id`, `POST /api/:module`, `PATCH /api/:module/:id`, `DELETE /api/:module/:id`,
  `GET /api/:module/export` (CSV), `POST /api/:module/import` (`{ "csv": "..." }`).
- `GET /api/:module/meta` returns field definitions, list columns, custom fields and tabs — the UI is
  metadata driven from this payload.
- All mutations are written to the immutable audit trail.

## Modules

`business-units`, `assets`, `vendors`, `controls`, `control-tests`, `risks`, `policies`, `exceptions`,
`projects`, `tasks`, `incidents`, `findings`, `bcp`, `bcp-tests`, `assessments`, `assessment-templates`,
`training-courses`, `training-assignments`, `account-reviews`, `account-review-items`, `whistleblowing`,
`data-flows`, `ropa`, `compliance-mappings`, `custom-fields`, `status-rules`, `webhooks`, `automation-rules`.

## Specialized endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/dashboard` | KPI counts, risk matrix cells, compliance coverage, activity, my tasks |
| `GET /api/compliance/packages` | library + adopted frameworks |
| `POST /api/compliance/packages/:id/adopt` | clone a template into the company |
| `GET /api/compliance/packages/:id/analysis` | coverage per chapter |
| `GET /api/compliance/packages/:id/requirements` | requirements with mappings |
| `POST /api/compliance/mappings` | map a requirement to a control/policy |
| `GET /api/risk-matrix`, `PUT /api/risk-matrix` | appetite and thresholds |
| `POST /api/policies/:id/publish`, `/:id/acknowledge`, `/:id/versions` | policy lifecycle |
| `GET /api/search?q=` | cross-module search |
| `GET /api/audit-logs` | audit trail (paginated) |
| `GET /api/notifications`, `POST /api/notifications/:id/read` | in-app inbox |
| `GET/PUT /api/notifications/templates` | multilingual e-mail templates |
| `GET/PUT /api/settings`, `/api/settings/global`, `/api/settings/company` | configuration |
| `GET/PUT /api/i18n/translations`, `GET /api/i18n/messages` | translations |
| `GET /api/tenants`, `POST /api/tenants`, `PATCH /api/tenants/:id` | Super Admin companies |
| `POST /api/auth/impersonate/:tenantId`, `/api/auth/stop-impersonating` | audited impersonation |
| `POST /api/ai/chat`, `GET /api/ai/status` | AI assistant |
| `GET/POST /api/mcp` | MCP server (JSON-RPC 2.0: `initialize`, `tools/list`, `tools/call`) |

## Webhooks

Payload: `{ event, tenantId, actorId, entityId, occurredAt, record }`, signed with
`X-GRC-Signature: HMAC-SHA256(body, secret)` and `X-GRC-Event`. Deliveries are stored and visible in the
UI; retries happen through BullMQ when Redis is configured.

## Public endpoints

`GET /api/public/config`, `GET /api/public/tenants/:slug`, `POST /api/public/whistleblowing/:slug`,
`GET/POST /api/public/assessments/:token`.
