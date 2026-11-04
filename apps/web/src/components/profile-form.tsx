'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiPatch, apiPost, ApiError } from '@/lib/api';
import { Alert, Button, Card, Field, Input, PageHeader, Select } from '@/components/ui';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';
import type { SessionUser } from '@/lib/server';

export function ProfileForm({ session }: { session: SessionUser }) {
  const t = useTranslations();
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: session.name,
    jobTitle: session.jobTitle || '',
    locale: session.locale || 'en-US',
  });
  const [passwords, setPasswords] = React.useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const save = async () => {
    try {
      await apiPatch('/api/auth/me', form);
      if (form.locale) document.cookie = `grc_locale=${form.locale}; path=/; max-age=${365 * 24 * 3600}`;
      setMessage('common.success');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.messageKey : 'errors.generic');
    }
  };

  const changePassword = async () => {
    try {
      await apiPost('/api/auth/change-password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setMessage('common.success');
    } catch (err) {
      setError(err instanceof ApiError ? err.messageKey : 'errors.generic');
    }
  };

  return (
    <div>
      <PageHeader title={t('common.profile')} subtitle={session.email} />
      {message ? <Alert tone="success" className="mb-3">{t('common.success')}</Alert> : null}
      {error ? <Alert tone="danger" className="mb-3">{t(error as any)}</Alert> : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="space-y-3">
            <Field label={t('common.name')}><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label={t('common.title')}><Input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} /></Field>
            <Field label={t('settings.preferredLanguage')} hint={t('settings.languageHint')}>
              <Select value={form.locale} onChange={(event) => setForm({ ...form, locale: event.target.value })}>
                {LOCALES.map((locale) => <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>)}
              </Select>
            </Field>
            <Button onClick={save}>{t('common.saveChanges')}</Button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="space-y-3">
            <Field label={t('common.password')}>
              <Input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
            </Field>
            <Field label={t('settings.adminPassword')} hint="min. 8">
              <Input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
            </Field>
            <Button variant="secondary" onClick={changePassword} disabled={passwords.newPassword.length < 8}>{t('common.save')}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
