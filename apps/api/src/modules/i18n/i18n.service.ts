import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaService } from '../../common/prisma/prisma.service';
import { deepMerge, flatten, setDeep, AnyObject } from '../../common/utils/objects';
import { env, FALLBACK_LOCALE, Locale, LOCALES, normalizeLocale } from '../../config';
import { SettingsService } from '../settings/settings.service';

export interface TranslationRow {
  namespace: string;
  key: string;
  default: string;
  override: string | null;
}

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);
  private readonly fileCache = new Map<string, AnyObject>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  supported(): readonly Locale[] {
    return LOCALES;
  }

  /** Read + merge /locales/{locale}/common.json and modules/*.json from disk. */
  fileMessages(locale: Locale): AnyObject {
    const cached = this.fileCache.get(locale);
    if (cached) return cached;
    const dir = path.join(env.localesDir, locale);
    let merged: AnyObject = {};
    try {
      if (!fs.existsSync(dir)) {
        this.logger.warn(`Locale directory not found: ${dir}`);
      } else {
        const files: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isFile() && entry.name.endsWith('.json')) files.push(path.join(dir, entry.name));
          if (entry.isDirectory()) {
            const moduleDir = path.join(dir, entry.name);
            for (const mod of fs.readdirSync(moduleDir)) {
              if (mod.endsWith('.json')) files.push(path.join(moduleDir, mod));
            }
          }
        }
        for (const file of files) {
          const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
          merged = deepMerge(merged, parsed);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to load locale ${locale}: ${(err as Error).message}`);
    }
    this.fileCache.set(locale, merged);
    return merged;
  }

  /** Merged file messages + database overrides for a locale. */
  async messages(localeInput?: string | null): Promise<AnyObject> {
    const locale = normalizeLocale(localeInput);
    const base = JSON.parse(JSON.stringify(this.fileMessages(locale)));
    const overrides = await this.prisma.base.translation.findMany({ where: { locale } });
    for (const row of overrides) {
      if (row.value === '') continue;
      setDeep(base, row.key.includes('.') ? row.key : `${row.namespace}.${row.key}`, row.value);
    }
    return base;
  }

  /** Locale precedence: user preference → company default → global default → en-US. */
  async resolveLocale(user?: { locale?: string | null; tenantId?: string | null } | null): Promise<Locale> {
    if (user?.locale) return normalizeLocale(user.locale);
    if (user?.tenantId) {
      const tenant = await this.prisma.base.tenant.findUnique({ where: { id: user.tenantId } });
      if (tenant?.defaultLocale) return normalizeLocale(tenant.defaultLocale);
    }
    return this.settings.defaultLocale();
  }

  async listTranslations(localeInput: string, search?: string): Promise<TranslationRow[]> {
    const locale = normalizeLocale(localeInput);
    const defaults = flatten(this.fileMessages(locale));
    const overrides = await this.prisma.base.translation.findMany({ where: { locale } });
    const overrideMap = new Map(overrides.map((o) => [o.key, o.value]));
    const term = (search || '').toLowerCase();
    const rows: TranslationRow[] = [];
    for (const [key, value] of Object.entries(defaults)) {
      if (term && !key.toLowerCase().includes(term) && !String(value).toLowerCase().includes(term)) continue;
      rows.push({
        namespace: key.split('.')[0],
        key,
        default: String(value),
        override: overrideMap.get(key) ?? null,
      });
    }
    rows.sort((a, b) => a.key.localeCompare(b.key));
    return rows;
  }

  async setOverride(localeInput: string, key: string, value: string): Promise<void> {
    const locale = normalizeLocale(localeInput);
    if (!LOCALES.includes(locale)) throw new Error('unsupported locale');
    const namespace = key.split('.')[0];
    await this.prisma.base.translation.upsert({
      where: { locale_namespace_key: { locale, namespace, key } },
      create: { locale, namespace, key, value },
      update: { value },
    });
  }

  async deleteOverride(localeInput: string, key: string): Promise<void> {
    const locale = normalizeLocale(localeInput);
    await this.prisma.base.translation.deleteMany({ where: { locale, key } });
  }

  /** Simple placeholder interpolation used by server-side e-mail rendering. */
  static interpolate(template: string, values: Record<string, unknown>): string {
    return String(template || '').replace(/\{(\w+)\}/g, (_, name) =>
      values[name] === undefined ? `{${name}}` : String(values[name]),
    );
  }

  async translate(locale: string, key: string, values: Record<string, unknown> = {}): Promise<string> {
    const messages = await this.messages(locale);
    const parts = key.split('.');
    let node: any = messages;
    for (const part of parts) {
      node = node?.[part];
      if (node === undefined) break;
    }
    const template = typeof node === 'string' ? node : key;
    return I18nService.interpolate(template, values);
  }

  fallback(): Locale {
    return FALLBACK_LOCALE;
  }
}
