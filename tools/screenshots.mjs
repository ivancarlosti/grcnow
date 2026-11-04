#!/usr/bin/env node
/**
 * Regenerates the README screenshots.
 * Requires the API (3001) and web (3000) running, plus `pnpm add -Dw playwright`.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const WEB = process.env.WEB_URL || 'http://localhost:3000';
const OUT = path.resolve('docs/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(OUT, '01-login.png') });

await page.fill('input[type=email]', process.env.SEED_ADMIN || 'admin@acme.example.com');
await page.fill('input[type=password]', process.env.SEED_PASSWORD || 'Password123!');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard', { timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, '02-dashboard.png') });

for (const [route, file] of [
  ['/risks', '03-risks.png'],
  ['/compliance', '04-compliance.png'],
  ['/settings/users', '05-users.png'],
]) {
  await page.goto(`${WEB}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, file) });
}

// Arabic (RTL) dashboard
await page.evaluate(() => {
  document.cookie = 'grc_locale=ar-SA; path=/; max-age=86400';
});
await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, '06-dashboard-ar.png') });

await browser.close();
console.log(`Screenshots written to ${OUT}`);
