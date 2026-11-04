export type AnyObject = Record<string, any>;

/**
 * Writes an own, enumerable data property without going through the prototype chain.
 * Returns `false` (and writes nothing) for the keys that enable prototype pollution,
 * so user supplied JSON, CSV headers or translation keys can never mutate Object.prototype.
 */
export function safeSetProperty(target: AnyObject, key: string, value: any): boolean {
  if (key === '__proto__' || key === 'prototype' || key === 'constructor') return false;
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
  return true;
}

function isUnsafeKey(key: string): boolean {
  return key === '__proto__' || key === 'prototype' || key === 'constructor';
}

export function deepMerge<T extends AnyObject>(target: T, source: AnyObject): T {
  const out: AnyObject = Array.isArray(target) ? [...(target as any)] : { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      safeSetProperty(out, key, deepMerge((out[key] as AnyObject) || {}, value));
    } else {
      safeSetProperty(out, key, value);
    }
  }
  return out as T;
}

export function setDeep(target: AnyObject, dotted: string, value: any): void {
  const parts = dotted.split('.');
  if (parts.some(isUnsafeKey)) return;
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const current = node[part];
    if (typeof current !== 'object' || current === null) {
      const created: AnyObject = {};
      safeSetProperty(node, part, created);
      node = created;
    } else {
      node = current;
    }
  }
  safeSetProperty(node, parts[parts.length - 1], value);
}

export function getDeep(target: AnyObject, dotted: string): any {
  return dotted
    .split('.')
    .reduce((acc: any, part) => (isUnsafeKey(part) ? undefined : acc && typeof acc === 'object' ? acc[part] : undefined), target);
}

export function flatten(target: AnyObject, prefix = ''): Record<string, any> {
  const out: AnyObject = {};
  for (const [key, value] of Object.entries(target || {})) {
    if (isUnsafeKey(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(flatten(value, path))) {
        safeSetProperty(out, nestedKey, nestedValue);
      }
    } else {
      safeSetProperty(out, path, value);
    }
  }
  return out as Record<string, any>;
}

export function omitEmpty<T extends AnyObject>(obj: T): Partial<T> {
  const out: AnyObject = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isUnsafeKey(k)) continue;
    if (v !== undefined && v !== null && v !== '') safeSetProperty(out, k, v);
  }
  return out as Partial<T>;
}

export function pick<T extends AnyObject>(obj: T, keys: string[]): Partial<T> {
  const out: AnyObject = {};
  for (const key of keys) {
    if (isUnsafeKey(key)) continue;
    if (Object.prototype.hasOwnProperty.call(obj, key)) safeSetProperty(out, key, obj[key]);
  }
  return out as Partial<T>;
}
