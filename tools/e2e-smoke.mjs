#!/usr/bin/env node
/**
 * API smoke test: health, login, tenant scoping, CRUD and cross-tenant isolation.
 * Usage: node tools/e2e-smoke.mjs   (API_URL=http://localhost:3001)
 */
const BASE = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
let failures = 0;

const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✔' : '✘'} ${name}${ok ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};

async function request(path, { method = 'GET', body, token, tenantId } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

const login = async (email, password) => {
  const { data } = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  return data?.accessToken;
};

async function main() {
  const health = await request('/api/health');
  check('health endpoint', health.status === 200 && health.data.database === true, JSON.stringify(health.data));

  const superToken = await login(
    process.env.ACCOUNT_LOGIN || 'admin@example.com',
    process.env.ACCOUNT_PASSWORD || 'admin123',
  );
  check('super admin login', Boolean(superToken));

  const tenants = await request('/api/tenants', { token: superToken });
  check('tenant list', tenants.status === 200 && tenants.data.items.length >= 1);
  const acme = tenants.data.items.find((tenant) => tenant.slug === 'acme');
  const globex = tenants.data.items.find((tenant) => tenant.slug === 'globex');

  const acmeToken = await login('admin@acme.example.com', 'Password123!');
  check('company admin login', Boolean(acmeToken));

  const risks = await request('/api/risks?pageSize=5', { token: acmeToken });
  check('risk list scoped', risks.status === 200 && risks.data.items.every((r) => r.tenantId === acme.id));

  const title = `Smoke test ${Date.now()}`;
  const created = await request('/api/risks', {
    method: 'POST',
    token: acmeToken,
    body: { title, likelihood: 4, impact: 4, category: 'security' },
  });
  check('risk created with score', created.status === 201 && created.data.score === 16, JSON.stringify(created.data));

  const updated = await request(`/api/risks/${created.data.id}`, {
    method: 'PATCH',
    token: acmeToken,
    body: { impact: 5 },
  });
  check('risk updated score', updated.data?.score === 20);

  const globexToken = await login('admin@globex.example.com', 'Password123!');
  const crossTenant = await request(`/api/risks/${created.data.id}`, { token: globexToken });
  check('cross-tenant read blocked', crossTenant.status === 404, `status ${crossTenant.status}`);

  const forbidden = await request('/api/tenants', { token: acmeToken });
  check('super-admin endpoint blocked', forbidden.status === 403, `status ${forbidden.status}`);

  const messages = await request('/api/i18n/messages?locale=ar-SA');
  check('arabic messages + rtl', messages.data?.dir === 'rtl' && Boolean(messages.data.messages.common.save));

  await request(`/api/risks/${created.data.id}`, { method: 'DELETE', token: acmeToken });
  const after = await request(`/api/risks?q=${encodeURIComponent(title)}`, { token: acmeToken });
  check('risk deleted', (after.data?.total || 0) === 0);

  if (globex) {
    const globexRisks = await request('/api/risks', { token: globexToken });
    check('tenant isolation', globexRisks.data.items.every((r) => r.tenantId === globex.id));
  }

  console.log(failures === 0 ? '\nAll smoke checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
