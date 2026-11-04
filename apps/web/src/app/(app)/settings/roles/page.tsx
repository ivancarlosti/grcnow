'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { api, apiDelete, apiPost } from '@/lib/api';
import { Alert, Badge, Button, Card, Field, Input, Modal, PageHeader, Textarea } from '@/components/ui';

interface Role { id: string; key: string; name: string; description?: string; permissions: string[]; isSystem: boolean; _count?: { users: number } }

export default function RolesPage() {
  const t = useTranslations();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ key: '', name: '', description: '', permissions: '*:read' });
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setRoles((await api<{ items: Role[] }>('/api/roles')).items || []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const create = async () => {
    try {
      await apiPost('/api/roles', { ...form, permissions: form.permissions.split(',').map((p) => p.trim()).filter(Boolean) });
      setOpen(false);
      await load();
    } catch {
      setError('errors.generic');
    }
  };

  const remove = async (id: string) => {
    await apiDelete(`/api/roles/${id}`).catch(() => setError('errors.forbidden'));
    await load();
  };

  return (
    <div>
      <PageHeader
        title={t('nav.roles')}
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('actions.new')}</Button>}
      />
      {error ? <Alert tone="danger" className="mb-3">{t(error as any)}</Alert> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{role.name}</p>
                <p className="text-[11px] text-muted-foreground">{role.key} · {role._count?.users || 0} {t('settings.usersCount')}</p>
              </div>
              {role.isSystem ? <Badge color="slate">{t('common.optional')}</Badge> : (
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(role.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{role.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {role.permissions.slice(0, 8).map((permission) => <Badge key={permission} color="teal">{permission}</Badge>)}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('actions.new')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={create} disabled={!form.key || !form.name}>{t('common.save')}</Button></>}
      >
        <div className="space-y-3">
          <Field label={t('settings.key')} required><Input value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} /></Field>
          <Field label={t('common.name')} required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label={t('common.description')}><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <Field label={t('nav.roles')} hint="risks:*, controls:read, policies:*">
            <Textarea rows={3} value={form.permissions} onChange={(event) => setForm({ ...form, permissions: event.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
