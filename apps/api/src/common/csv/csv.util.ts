import { parse } from 'csv-parse/sync';

export interface CsvColumn {
  key: string;
  label: string;
}

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  let str: string;
  if (value instanceof Date) str = value.toISOString();
  else if (Array.isArray(value)) str = value.join('|');
  else if (typeof value === 'object') str = JSON.stringify(value);
  else str = String(value);
  if (/[",\n\r;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export function toCsv(rows: Record<string, any>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

export function parseCsv(content: string): Record<string, string>[] {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[];
  return records;
}

/** Maps CSV header labels/keys onto module field names (case-insensitive). */
export function mapCsvRow(row: Record<string, string>, columns: CsvColumn[]): Record<string, string> {
  const byLabel = new Map<string, string>();
  columns.forEach((c) => {
    byLabel.set(c.label.toLowerCase(), c.key);
    byLabel.set(c.key.toLowerCase(), c.key);
  });
  const result: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const key = byLabel.get(String(rawKey).trim().toLowerCase());
    if (key) result[key] = value;
  }
  return result;
}
