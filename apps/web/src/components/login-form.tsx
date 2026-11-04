'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { apiPost, ApiError } from '@/lib/api';
import { Field, Input, Button, Alert } from './ui';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';

interface PublicConfig {
  authMethod: string;
  defaultLocale: string;
  recaptchaSiteKey: string | null;
  appName: string;
}

declare global {
  interface Window {
    grecaptcha?: { ready: (cb: () => void) => void; execute: (key: string, opts: any) => Promise<string> };
  }
}

function loadRecaptcha(siteKey: string): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('recaptcha_load_failed'));
    document.head.appendChild(script);
  });
}

export function LoginForm({ config, initialError }: { config: PublicConfig; initialError?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(initialError || null);
  const [loading, setLoading] = React.useState(false);
  const [locale, setLocale] = React.useState(config.defaultLocale || 'en-US');

  const translateError = (key: string | null) => {
    if (!key) return null;
    try {
      return t(key as any);
    } catch {
      return t('errors.generic');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let recaptchaToken: string | undefined;
      if (config.recaptchaSiteKey) {
        await loadRecaptcha(config.recaptchaSiteKey);
        recaptchaToken = await new Promise<string>((resolve) => {
          window.grecaptcha!.ready(async () => {
            resolve(await window.grecaptcha!.execute(config.recaptchaSiteKey!, { action: 'login' }));
          });
        });
      }
      await apiPost('/api/auth/login', { email, password, recaptchaToken });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.messageKey : 'errors.generic');
      setLoading(false);
    }
  };

  const changeLocale = (value: string) => {
    setLocale(value);
    document.cookie = `grc_locale=${value}; path=/; max-age=${365 * 24 * 3600}`;
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden bg-sidebar p-8 text-white lg:w-1/2 lg:p-12">
        <div className="absolute -end-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -start-16 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold">
              {config.appName.slice(0, 1)}
            </div>
            <div>
              <p className="text-base font-semibold">{config.appName}</p>
              <p className="text-xs text-slate-400">{t('app.tagline')}</p>
            </div>
          </div>
          <h1 className="mt-14 max-w-md text-3xl font-semibold leading-tight lg:text-4xl">{t('auth.loginTitle')}</h1>
          <p className="mt-3 max-w-sm text-sm text-slate-300">{t('auth.loginSubtitle')}</p>
          <ul className="mt-10 space-y-3 text-sm text-slate-300">
            {['risks', 'compliance', 'policies', 'incidents'].map((key) => (
              <li key={key} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary-300" />
                {t(`nav.${key}` as any)}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-[11px] text-slate-500">
          © {new Date().getFullYear()} {config.appName} · {t('app.tagline')}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t('common.login')}</h2>
            <select
              aria-label={t('common.language')}
              value={locale}
              onChange={(event) => changeLocale(event.target.value)}
              className="rounded-md border border-border bg-white px-1.5 py-1 text-xs text-slate-600"
            >
              {LOCALES.map((code) => (
                <option key={code} value={code}>
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <Alert tone="danger" className="mb-4">
              {translateError(error)}
            </Alert>
          ) : null}
          {config.authMethod === 'keycloak' ? (
            <div className="space-y-4">
              <Button className="w-full" size="lg" onClick={() => (window.location.href = '/api/auth/keycloak/login')}>
                {t('auth.ssoButton')}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">{t('auth.notAllowed')}</p>
            </div>
          ) : config.authMethod === 'none' ? (
            <div className="space-y-4">
              <Alert tone="warning">{t('auth.loginDisabled')}</Alert>
              <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>
                {t('common.open')}
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label={t('common.email')} required>
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="ps-9"
                    placeholder="you@company.com"
                  />
                </div>
              </Field>
              <Field label={t('common.password')} required>
                <div className="relative">
                  <Lock className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="ps-9"
                    placeholder="••••••••"
                  />
                </div>
              </Field>
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {t('auth.signInButton')}
              </Button>
              {config.recaptchaSiteKey ? (
                <p className="text-center text-[10px] text-muted-foreground">{t('auth.recaptchaNotice')}</p>
              ) : null}
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
