export type AnyObject = Record<string, any>;

export function deepMerge<T extends AnyObject>(target: T, source: AnyObject): T {
  const out: AnyObject = Array.isArray(target) ? [...(target as any)] : { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge((out[key] as AnyObject) || {}, value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export function setDeep(target: AnyObject, dotted: string, value: any): void {
  const parts = dotted.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
}

export function getDeep(target: AnyObject, dotted: string): any {
  return dotted.split('.').reduce((acc: any, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), target);
}

export function flatten(target: AnyObject, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(target || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

export function omitEmpty<T extends AnyObject>(obj: T): Partial<T> {
  const out: AnyObject = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out as Partial<T>;
}

export function pick<T extends AnyObject>(obj: T, keys: string[]): Partial<T> {
  const out: AnyObject = {};
  for (const key of keys) if (key in obj) out[key] = obj[key];
  return out as Partial<T>;
}
