'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { api, apiDelete, apiPatch, apiPost } from '@/lib/api';
import { Alert, Badge, Button, Card, Field, Input, Modal, PageHeader, Select } from '@/components/ui';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';

interface Tenant {
  id: string; name: string; slug: string; domain?: string | null; status: string;
  defaultLocale?: string | null; usage: { users: number; risks: number; controls: number; storageBytes: number };
}

export default function AdminCompaniesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [items, setItems] = React.useState<Tenant[]>([]);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: '', domain: '', defaultLocale: 'en-US', adminEmail: '', adminName: '', adminPassword: '' });

  const load = React.useCallback(async () => {
    setItems((await api<{ items: Tenant[] }>('/api/tenants')).items || []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const create = async () => {
    try {
      await apiPost('/api/tenants', { ...form, adminPassword: form.adminPassword || undefined });
      setOpen(false);
      await load();
    } catch {
      setError('errors.generic');
    }
  };

  const impersonate = async (id: string) => {
    await apiPost(`/api/auth/impersonate/${id}`, {});
    router.push('/dashboard');
    router.refresh();
  };

  const toggle = async (tenant: Tenant) => {
    await apiPatch(`/api/tenants/${tenant.id}`, { status: tenant.status === 'active' ? 'suspended' : 'active' });
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('confirmDelete.message'))) return;
    await apiDelete(`/api/tenants/${id}`);
    await load();
  };

  return (
    <div>
      <PageHeader
        title={t('nav.companies')}
        subtitle={`${items.length} ${t('settings.companies')}`}
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('settings.createCompany')}</Button>}
      />
      {error ? <Alert tone="danger" className="mb-3">{t(error as any)}</Alert> : null}
      <Card>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>{t('settings.companyName')}</th>
                <th>{t('settings.usage')}</th>
                <th>{t('common.language')}</th>
                <th>{t('common.status')}</th>
                <th className="text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-[11px] text-muted-foreground">{tenant.slug}{tenant.domain ? ` · ${tenant.domain}` : ''}</p>
                  </td>
                  <td className="text-xs">{tenant.usage.users} {t('settings.usersCount')} · {tenant.usage.risks} {t('nav.risks')} · {(tenant.usage.storageBytes / 1024).toFixed(0)} KB</td>
                  <td className="text-xs">{tenant.defaultLocale || '—'}</td>
                  <td><Badge color={tenant.status === 'active' ? 'green' : 'red'}>{tenant.status}</Badge></td>
                  <td className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => impersonate(tenant.id)} title={t('settings.impersonate')}><ExternalLink className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(tenant)}>{tenant.status === 'active' ? t('settings.suspend') : t('settings.activate')}</Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(tenant.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('settings.createCompany')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={create} disabled={!form.name || !form.adminEmail}>{t('common.create')}</Button></>}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('settings.companyName')} required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label={t('settings.domain')}><Input value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} /></Field>
          <Field label={t('settings.adminEmail')} required><Input type="email" value={form.adminEmail} onChange={(event) => setForm({ ...form, adminEmail: event.target.value })} /></Field>
          <Field label={t('settings.adminName')}><Input value={form.adminName} onChange={(event) => setForm({ ...form, adminName: event.target.value })} /></Field>
          <Field label={t('settings.adminPassword')} hint="min. 8"><Input type="password" value={form.adminPassword} onChange={(event) => setForm({ ...form, adminPassword: event.target.value })} /></Field>
          <Field label={t('settings.defaultLanguage')}>
            <Select value={form.defaultLocale} onChange={(event) => setForm({ ...form, defaultLocale: event.target.value })}>
              {LOCALES.map((locale) => <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
