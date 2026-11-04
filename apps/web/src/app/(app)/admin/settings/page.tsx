'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { api, apiPut } from '@/lib/api';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';

export default function AdminSettingsPage() {
  const t = useTranslations();
  const [data, setData] = React.useState<any>(null);
  const [form, setForm] = React.useState<any>({});
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api('/api/settings/global').then((global) => {
      setData(global);
      setForm({
        appName: global.appName,
        supportEmail: global.supportEmail,
        defaultLocale: global.defaultLocale,
        recaptchaSiteKey: global.recaptchaSiteKey,
        recaptchaSecretKey: global.recaptchaSecretKey,
        recaptchaMinScore: global.recaptchaMinScore,
      });
    });
  }, []);

  const save = async () => {
    try {
      await apiPut('/api/settings/global', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('errors.generic');
    }
  };

  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div>
      <PageHeader title={t('nav.globalSettings')} subtitle={t('nav.platform')} />
      {saved ? <Alert tone="success" className="mb-3">{t('common.success')}</Alert> : null}
      {error ? <Alert tone="danger" className="mb-3">{t(error as any)}</Alert> : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t('settings.general')}</h2>
          <div className="space-y-3">
            <Field label={t('app.name')}><Input value={form.appName} onChange={(event) => setForm({ ...form, appName: event.target.value })} /></Field>
            <Field label={t('common.email')}><Input value={form.supportEmail} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} /></Field>
            <Field label={t('settings.globalDefaultLanguage')} hint={t('settings.languageHint')}>
              <Select value={form.defaultLocale} onChange={(event) => setForm({ ...form, defaultLocale: event.target.value })}>
                {LOCALES.map((locale) => <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>)}
              </Select>
            </Field>
            <Button onClick={save}>{t('common.saveChanges')}</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">{t('settings.loginProtection')}</h2>
          <div className="space-y-3">
            <Field label={t('settings.recaptchaSiteKey')}><Input value={form.recaptchaSiteKey} onChange={(event) => setForm({ ...form, recaptchaSiteKey: event.target.value })} /></Field>
            <Field label={t('settings.recaptchaSecretKey')} hint="v3 score keys"><Input type="password" value={form.recaptchaSecretKey} onChange={(event) => setForm({ ...form, recaptchaSecretKey: event.target.value })} /></Field>
            <Field label={t('settings.recaptchaMinScore')}><Input type="number" step="0.1" min="0" max="1" value={form.recaptchaMinScore} onChange={(event) => setForm({ ...form, recaptchaMinScore: Number(event.target.value) })} /></Field>
            <Button onClick={save}>{t('common.saveChanges')}</Button>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">{t('settings.authentication')}</h2>
          <p className="text-xs text-muted-foreground">{t('settings.authMethod')}: <b>{data.authMethod}</b> · {t('settings.storageDriver')}: <b>{data.storageDriver}</b></p>
          <div className="mt-2 flex gap-3 text-xs">
            <Link href="/admin/translations" className="link">{t('nav.translations')}</Link>
            <Link href="/admin/companies" className="link">{t('nav.companies')}</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
