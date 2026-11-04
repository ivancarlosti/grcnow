'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api, apiPost } from '@/lib/api';
import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';

export default function WhistleblowingForm() {
  const params = useParams<{ slug: string }>();
  const t = useTranslations();
  const [tenant, setTenant] = React.useState<any>(null);
  const [form, setForm] = React.useState({ category: 'fraud', subject: '', message: '', contactEmail: '' });
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api(`/api/public/tenants/${params.slug}`).then(setTenant).catch(() => setError('errors.tenantNotFound'));
  }, [params.slug]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiPost(`/api/public/whistleblowing/${params.slug}`, form);
      setDone(true);
      setForm({ category: 'fraud', subject: '', message: '', contactEmail: '' });
    } catch {
      setError('errors.generic');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
          {(tenant?.name || 'G').slice(0, 1)}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{t('wb.title')}</h1>
          <p className="text-xs text-muted-foreground">{tenant?.name}</p>
        </div>
      </div>
      {error ? <Alert tone="danger" className="mb-3">{t(error as any)}</Alert> : null}
      {done ? (
        <Card className="p-6">
          <p className="text-sm font-medium text-emerald-700">{t('wb.thanks')}</p>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="mb-4 text-xs text-muted-foreground">{t('wb.subtitle')}</p>
          <form onSubmit={submit} className="space-y-3">
            <Field label={t('wb.category')}>
              <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {['fraud', 'harassment', 'discrimination', 'safety', 'corruption', 'other'].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('wb.subject')} required>
              <Input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
            </Field>
            <Field label={t('wb.message')} required>
              <Textarea required rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
            </Field>
            <Field label={`${t('common.email')} (${t('common.optional')})`}>
              <Input type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
            </Field>
            <Button type="submit">{t('wb.submit')}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
