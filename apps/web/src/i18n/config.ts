export const LOCALES = ['en-US', 'pt-BR', 'es-MX', 'fr-FR', 'zh-CN', 'hi-IN', 'ar-SA'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en-US';
export const RTL_LOCALES: string[] = ['ar-SA'];

export const LOCALE_LABELS: Record<string, string> = {
  'en-US': 'English (US)',
  'pt-BR': 'Português (Brasil)',
  'es-MX': 'Español (México)',
  'fr-FR': 'Français',
  'zh-CN': '简体中文',
  'hi-IN': 'हिन्दी',
  'ar-SA': 'العربية',
};

export function isRtl(locale?: string | null): boolean {
  return RTL_LOCALES.includes(locale || '');
}

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  const exact = LOCALES.find((l) => l.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const lang = value.split('-')[0].toLowerCase();
  return LOCALES.find((l) => l.toLowerCase().startsWith(`${lang}-`)) || DEFAULT_LOCALE;
}
