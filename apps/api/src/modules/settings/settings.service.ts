import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { env, Locale, normalizeLocale } from '../../config';

export interface RecaptchaConfig {
  siteKey: string;
  secretKey: string;
  minScore: number;
  enabled: boolean;
}

@Injectable()
export class SettingsService {
  private cache = new Map<string, { value: any; at: number }>();
  private readonly ttl = 3000;

  constructor(private readonly prisma: PrismaService) {}

  private key(tenantId: string | null, key: string) {
    return `${tenantId || 'global'}:${key}`;
  }

  async get(tenantId: string | null, key: string, fallback: any = null): Promise<any> {
    const cacheKey = this.key(tenantId, key);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < this.ttl) return cached.value;
    const row = await this.prisma.base.setting.findFirst({ where: { tenantId, key } });
    let value: any = fallback;
    if (row) {
      try {
        value = JSON.parse(row.value);
      } catch {
        value = row.value;
      }
    }
    this.cache.set(cacheKey, { value, at: Date.now() });
    return value;
  }

  async set(tenantId: string | null, key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    const existing = await this.prisma.base.setting.findFirst({ where: { tenantId, key } });
    if (existing) {
      await this.prisma.base.setting.update({ where: { id: existing.id }, data: { value: serialized } });
    } else {
      await this.prisma.base.setting.create({ data: { tenantId, key, value: serialized } });
    }
    this.cache.delete(this.key(tenantId, key));
  }

  async setMany(tenantId: string | null, values: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      await this.set(tenantId, key, value);
    }
  }

  async all(tenantId: string | null): Promise<Record<string, any>> {
    const rows = await this.prisma.base.setting.findMany({ where: { tenantId } });
    const result: Record<string, any> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return result;
  }

  async defaultLocale(): Promise<Locale> {
    const value = await this.get(null, 'default_locale', null);
    return normalizeLocale(value || env.defaultLocale);
  }

  async recaptcha(): Promise<RecaptchaConfig> {
    const [siteKey, secretKey, minScore] = await Promise.all([
      this.get(null, 'recaptcha_site_key', ''),
      this.get(null, 'recaptcha_secret_key', ''),
      this.get(null, 'recaptcha_min_score', 0.5),
    ]);
    const enabled = Boolean(siteKey && secretKey);
    return { siteKey, secretKey, minScore: Number(minScore) || 0.5, enabled };
  }

  /**
   * Verifies a reCAPTCHA v3 token when the captcha is configured.
   * Throws a 400 with errors.captchaFailed otherwise.
   */
  async verifyRecaptcha(token: string | undefined, ip?: string, action?: string): Promise<void> {
    const config = await this.recaptcha();
    if (!config.enabled) return;
    if (!token) {
      throw new Error('captcha_missing');
    }
    const params = new URLSearchParams({ secret: config.secretKey, response: token });
    if (ip) params.set('remoteip', ip);
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?${params.toString()}`, {
      method: 'POST',
    });
    const data: any = await response.json().catch(() => ({}));
    if (!data.success) throw new Error('captcha_failed');
    if (action && data.action && data.action !== action) throw new Error('captcha_action_mismatch');
    if (typeof data.score === 'number' && data.score < config.minScore) throw new Error('captcha_low_score');
  }
}
