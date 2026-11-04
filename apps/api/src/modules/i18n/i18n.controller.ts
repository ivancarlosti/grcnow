import { Body, Controller, Delete, Get, Put, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { I18nService } from './i18n.service';
import { Public, RequirePermissions, SuperAdminOnly } from '../../common/auth/auth.decorators';
import { isRtl, LOCALES, normalizeLocale } from '../../config';
import { SettingsService } from '../settings/settings.service';
import { parseInput } from '../../common/http/helpers';

const UNSAFE_KEY_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

const translationKey = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+$/)
  .refine((key) => !key.split('.').some((segment) => UNSAFE_KEY_SEGMENTS.has(segment)));

const translationSchema = z.object({
  locale: z.string(),
  key: translationKey,
  value: z.string().max(5000).default(''),
});

const translationResetSchema = z.object({
  locale: z.string(),
  key: translationKey,
});


const LOCALE_NAMES: Record<string, string> = {
  'en-US': 'English (US)',
  'pt-BR': 'Português (Brasil)',
  'es-MX': 'Español (México)',
  'fr-FR': 'Français',
  'zh-CN': '简体中文',
  'hi-IN': 'हिन्दी',
  'ar-SA': 'العربية',
};

@Controller('api/i18n')
export class I18nController {
  constructor(
    private readonly i18n: I18nService,
    private readonly settings: SettingsService,
  ) {}

  @Public()
  @Get('locales')
  async locales() {
    const globalDefault = await this.settings.defaultLocale();
    return {
      defaultLocale: globalDefault,
      locales: LOCALES.map((code) => ({
        code,
        name: LOCALE_NAMES[code] || code,
        dir: isRtl(code) ? 'rtl' : 'ltr',
      })),
    };
  }

  @Public()
  @Get('messages')
  async messages(@Query('locale') locale: string | undefined, @Req() req: any) {
    const wanted = locale || req.user?.locale || undefined;
    let resolved = normalizeLocale(wanted);
    if (!wanted && req.user) {
      resolved = await this.i18n.resolveLocale(req.user);
    } else if (!wanted) {
      const cookie = req.cookies?.grc_locale;
      resolved = cookie ? normalizeLocale(cookie) : await this.settings.defaultLocale();
    }
    const messages = await this.i18n.messages(resolved);
    return { locale: resolved, dir: isRtl(resolved) ? 'rtl' : 'ltr', messages };
  }

  @SuperAdminOnly()
  @Get('translations')
  async translations(@Query('locale') locale: string, @Query('q') q: string) {
    const resolved = normalizeLocale(locale);
    const rows = await this.i18n.listTranslations(resolved, q);
    return { locale: resolved, total: rows.length, items: rows };
  }

  @SuperAdminOnly()
  @RequirePermissions('settings:write')
  @Get('translations/export')
  async exportTranslations(@Query('locale') locale: string) {
    const rows = await this.i18n.listTranslations(normalizeLocale(locale));
    return { locale: normalizeLocale(locale), items: rows };
  }

  @SuperAdminOnly()
  @RequirePermissions('settings:write')
  @Put('translations')
  async save(@Body() body: unknown) {
    const dto = parseInput(translationSchema, body);
    await this.i18n.setOverride(dto.locale, dto.key, dto.value);
    return { ok: true, locale: normalizeLocale(dto.locale), key: dto.key, value: dto.value };
  }

  @SuperAdminOnly()
  @RequirePermissions('settings:write')
  @Delete('translations')
  async reset(@Body() body: unknown) {
    const dto = parseInput(translationResetSchema, body);
    await this.i18n.deleteOverride(dto.locale, dto.key);
    return { ok: true };
  }

  @SuperAdminOnly()
  @RequirePermissions('settings:write')
  @Get('translations/resolve')
  async resolve(@Query('locale') locale: string, @Req() req: any) {
    const resolved = locale ? normalizeLocale(locale) : await this.i18n.resolveLocale(req.user);
    return { locale: resolved };
  }
}
