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

/** Writes an own property, refusing the keys that enable prototype pollution. */
function safeSet(target, key, value) {
  if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

function isUnsafeKey(key) {
  return key === '__proto__' || key === 'prototype' || key === 'constructor';
}

function setDeep(target, dotted, value) {
  const parts = dotted.split('.');
  if (parts.some(isUnsafeKey)) {
    throw new Error(`Unsafe translation key: ${dotted}`);
  }
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const current = node[part];
    if (typeof current !== 'object' || current === null) {
      const created = {};
      safeSet(node, part, created);
      node = created;
    } else {
      node = current;
    }
  }
  safeSet(node, parts[parts.length - 1], value);
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
    if (isUnsafeKey(k)) continue;
    const current = merged[k];
    const next = typeof current === 'object' && current !== null ? { ...current, ...v } : v;
    safeSet(merged, k, next);
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
