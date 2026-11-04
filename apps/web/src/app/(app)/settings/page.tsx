'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { api, apiPut } from '@/lib/api';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';

export default function SettingsPage() {
  const t = useTranslations();
  const [data, setData] = React.useState<any>(null);
  const [form, setForm] = React.useState<any>({});
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api('/api/settings').then((settings) => {
      setData(settings);
      setForm({
        name: settings.tenant?.name || '',
        domain: settings.tenant?.domain || '',
        defaultLocale: settings.tenant?.defaultLocale || '',
        primaryColor: settings.tenant?.primaryColor || '#0f766e',
        logoUrl: settings.tenant?.logoUrl || '',
        timezone: settings.tenant?.timezone || 'UTC',
      });
    });
  }, []);

  const save = async () => {
    try {
      await apiPut('/api/settings/company', {
        ...form,
        defaultLocale: form.defaultLocale || null,
        domain: form.domain || null,
        logoUrl: form.logoUrl || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('errors.generic');
    }
  };

  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.company')} />
      {saved ? <Alert tone="success" className="mb-3">{t('common.success')}</Alert> : null}
      {error ? <Alert tone="danger" className="mb-3">{t(error as any)}</Alert> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t('settings.company')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('settings.companyName')} required>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label={t('settings.domain')}>
              <Input value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} />
            </Field>
            <Field label={t('settings.companyDefaultLanguage')} hint={t('settings.languageHint')}>
              <Select value={form.defaultLocale} onChange={(event) => setForm({ ...form, defaultLocale: event.target.value })}>
                <option value="">{t('common.none')}</option>
                {LOCALES.map((locale) => <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>)}
              </Select>
            </Field>
            <Field label={t('settings.branding')}>
              <Input type="color" value={form.primaryColor} onChange={(event) => setForm({ ...form, primaryColor: event.target.value })} />
            </Field>
            <Field label="Logo URL" className="sm:col-span-2">
              <Input value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} />
            </Field>
          </div>
          <div className="mt-4"><Button onClick={save}>{t('common.saveChanges')}</Button></div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">{t('settings.authentication')}</h2>
            <p className="text-xs text-muted-foreground">{t('settings.authMethod')}: <b>{data.app.authMethod}</b></p>
            <p className="mt-1 text-xs text-muted-foreground">{t('settings.storageDriver')}: <b>{data.app.storageDriver}</b></p>
            <p className="mt-1 text-xs text-muted-foreground">{t('settings.loginProtection')}: <b>{data.app.recaptchaEnabled ? t('common.active') : t('common.inactive')}</b></p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">{t('nav.administration')}</h2>
            <div className="flex flex-col gap-1 text-xs">
              <Link className="link" href="/settings/users">{t('nav.users')}</Link>
              <Link className="link" href="/settings/roles">{t('nav.roles')}</Link>
              <Link className="link" href="/custom-fields">{t('settings.customFields')}</Link>
              <Link className="link" href="/status-rules">{t('settings.statusRules')}</Link>
              <Link className="link" href="/api-tokens">{t('nav.apiTokens')}</Link>
              {data.isSuperAdmin ? <Link className="link" href="/admin/settings">{t('nav.globalSettings')}</Link> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
