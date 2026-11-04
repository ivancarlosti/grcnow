import { Body, Controller, Get, Put } from '@nestjs/common';
import { z } from 'zod';
import { SettingsService } from '../settings/settings.service';
import { TenantsService } from '../tenants/tenants.service';
import { AuthUser, CurrentUser, RequirePermissions, SuperAdminOnly } from '../../common/auth/auth.decorators';
import { badRequest, parseInput } from '../../common/http/helpers';
import { tenantContext } from '../../common/tenant/tenant-context';
import { env, LOCALES, normalizeLocale, persistEnv } from '../../config';

const globalSettingsSchema = z.object({
  appName: z.string().min(1).max(120).optional(),
  supportEmail: z.string().max(200).optional(),
  defaultLocale: z.string().max(10).optional(),
  recaptchaSiteKey: z.string().max(200).optional(),
  recaptchaSecretKey: z.string().max(200).optional(),
  recaptchaMinScore: z.coerce.number().min(0).max(1).optional(),
});

const companySettingsSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  domain: z.string().max(120).nullable().optional(),
  defaultLocale: z.string().max(10).nullable().optional(),
  primaryColor: z.string().max(20).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  timezone: z.string().max(60).optional(),
});

@Controller('api/settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly tenants: TenantsService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    const [appName, supportEmail, recaptcha] = await Promise.all([
      this.settings.get(null, 'app_name', 'GRC Platform'),
      this.settings.get(null, 'support_email', ''),
      this.settings.recaptcha(),
    ]);
    const tenant = tenantContext.tenantId ? await this.tenants.get(tenantContext.tenantId) : null;
    return {
      app: {
        name: appName,
        supportEmail,
        defaultLocale: await this.settings.defaultLocale(),
        locales: LOCALES,
        authMethod: env.authMethod,
        storageDriver: env.storageDriver,
        recaptchaEnabled: recaptcha.enabled,
      },
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            domain: tenant.domain,
            defaultLocale: tenant.defaultLocale,
            primaryColor: tenant.primaryColor,
            logoUrl: tenant.logoUrl,
            timezone: tenant.timezone,
            status: tenant.status,
          }
        : null,
      isSuperAdmin: Boolean(user?.isSuperAdmin),
    };
  }

  @SuperAdminOnly()
  @Get('global')
  async global() {
    const [appName, supportEmail, recaptcha, defaultLocale] = await Promise.all([
      this.settings.get(null, 'app_name', 'GRC Platform'),
      this.settings.get(null, 'support_email', ''),
      this.settings.recaptcha(),
      this.settings.defaultLocale(),
    ]);
    return {
      appName,
      supportEmail,
      defaultLocale,
      recaptchaSiteKey: recaptcha.siteKey,
      recaptchaSecretKey: recaptcha.secretKey ? '********' : '',
      recaptchaMinScore: recaptcha.minScore,
      recaptchaEnabled: recaptcha.enabled,
      authMethod: env.authMethod,
      storageDriver: env.storageDriver,
      locales: LOCALES,
    };
  }

  @SuperAdminOnly()
  @RequirePermissions('settings:write')
  @Put('global')
  async saveGlobal(@Body() body: unknown) {
    const dto = parseInput(globalSettingsSchema, body);
    if (dto.appName !== undefined) await this.settings.set(null, 'app_name', dto.appName);
    if (dto.supportEmail !== undefined) await this.settings.set(null, 'support_email', dto.supportEmail);
    if (dto.defaultLocale) {
      const locale = normalizeLocale(dto.defaultLocale);
      await this.settings.set(null, 'default_locale', locale);
      persistEnv('DEFAULT_LOCALE', locale);
    }
    if (dto.recaptchaSiteKey !== undefined) await this.settings.set(null, 'recaptcha_site_key', dto.recaptchaSiteKey);
    if (dto.recaptchaSecretKey && dto.recaptchaSecretKey !== '********') {
      await this.settings.set(null, 'recaptcha_secret_key', dto.recaptchaSecretKey);
    }
    if (dto.recaptchaMinScore !== undefined) await this.settings.set(null, 'recaptcha_min_score', dto.recaptchaMinScore);
    return this.global();
  }

  @RequirePermissions('settings:write')
  @Put('company')
  async saveCompany(@Body() body: unknown) {
    const dto = parseInput(companySettingsSchema, body);
    const tenantId = tenantContext.tenantId;
    if (!tenantId) throw badRequest('errors.tenantNotFound');
    const tenant = await this.tenants.update(tenantId, dto);
    return { tenant };
  }
}
