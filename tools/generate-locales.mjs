#!/usr/bin/env node
/**
 * Generates /locales/{locale}/common.json and /locales/{locale}/modules/*.json
 * from locales-source.mjs, plus the web fallback bundle.
 *
 * Run: pnpm locales
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, MESSAGES } from './locales-source.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const localesDir = path.join(root, 'locales');
const COMMON_GROUPS = new Set(['app', 'common', 'auth', 'errors', 'nav', 'actions', 'status', 'fields', 'roles', 'modules']);

function setDeep(target, dotted, value) {
  const parts = dotted.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

const buckets = new Map(); // locale -> Map<file, object>
LOCALES.forEach((locale) => buckets.set(locale, new Map()));

let count = 0;
for (const [key, values] of Object.entries(MESSAGES)) {
  if (!Array.isArray(values) || values.length !== LOCALES.length) {
    throw new Error(`Bad translation entry for "${key}": expected ${LOCALES.length} values`);
  }
  LOCALES.forEach((locale, index) => {
    const group = key.split('.')[0];
    const file = COMMON_GROUPS.has(group) ? 'common' : `modules/${group}`;
    const map = buckets.get(locale);
    if (!map.has(file)) map.set(file, {});
    setDeep(map.get(file), key, values[index]);
  });
  count += 1;
}

if (count < 200) {
  throw new Error(`Only ${count} keys defined; the brief requires at least 200 core keys`);
}

for (const [locale, files] of buckets) {
  const dir = path.join(localesDir, locale);
  fs.rmSync(dir, { recursive: true, force: true });
  for (const [file, data] of files) {
    writeJson(path.join(dir, `${file}.json`), data);
  }
}

// Web fallback bundle (en-US merged) so the UI can render before the API answers.
const enFiles = buckets.get('en-US');
const merged = {};
for (const data of enFiles.values()) {
  for (const [k, v] of Object.entries(data)) {
    merged[k] = typeof merged[k] === 'object' && merged[k] !== null ? { ...merged[k], ...v } : v;
  }
}
writeJson(path.join(root, 'apps/web/src/i18n/fallback-messages.json'), merged);
writeJson(path.join(localesDir, 'manifest.json'), {
  locales: LOCALES,
  fallback: 'en-US',
  rtl: ['ar-SA'],
  keyCount: count,
  generatedAt: new Date().toISOString(),
});

console.log(`Generated ${LOCALES.length} locales × ${count} keys → ${localesDir}`);
