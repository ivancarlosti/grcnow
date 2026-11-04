import { cache } from 'react';
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import fallbackMessages from './fallback-messages.json';
import { DEFAULT_LOCALE, isRtl, normalizeLocale } from './config';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001';

export interface AppI18n {
  locale: string;
  dir: 'ltr' | 'rtl';
  messages: Record<string, any>;
}

/**
 * Resolves locale + messages for the current request.
 * The API applies the precedence user preference → company default → global
 * default → en-US; the `grc_locale` cookie wins when the user switched manually.
 */
export const getAppI18n = cache(async (): Promise<AppI18n> => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('grc_locale')?.value;
  const token = cookieStore.get('grc_token')?.value;
  const headerParts: string[] = [];
  if (token) headerParts.push(`grc_token=${token}`);
  if (localeCookie) headerParts.push(`grc_locale=${localeCookie}`);

  try {
    const url = new URL(`${API_INTERNAL_URL}/api/i18n/messages`);
    if (localeCookie) url.searchParams.set('locale', localeCookie);
    const response = await fetch(url.toString(), {
      headers: headerParts.length ? { cookie: headerParts.join('; ') } : {},
      cache: 'no-store',
    });
    if (response.ok) {
      const data = await response.json();
      return {
        locale: normalizeLocale(data.locale),
        dir: data.dir === 'rtl' ? 'rtl' : 'ltr',
        messages: data.messages || (fallbackMessages as any),
      };
    }
  } catch {
    // API unreachable — fall back to the bundled English bundle.
  }
  const locale = normalizeLocale(localeCookie || DEFAULT_LOCALE);
  return { locale, dir: isRtl(locale) ? 'rtl' : 'ltr', messages: fallbackMessages as any };
});

export default getRequestConfig(async () => {
  const { locale, messages } = await getAppI18n();
  return { locale, messages };
});
