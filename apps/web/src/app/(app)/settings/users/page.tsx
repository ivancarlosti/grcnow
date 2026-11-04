'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { api, apiDelete, apiPatch, apiPost, ApiError } from '@/lib/api';
import { Alert, Badge, Button, Card, Field, Input, Modal, PageHeader, Select } from '@/components/ui';

interface Role { id: string; key: string; name: string }
interface User {
  id: string; email: string; name: string; jobTitle?: string | null; status: string;
  isCompanyAdmin: boolean; roles: Role[];
}

const EMPTY = { email: '', name: '', jobTitle: '', password: '', roleKeys: ['regular_user'], status: 'active', isCompanyAdmin: false };

export default function UsersPage() {
  const t = useTranslations();
  const [users, setUsers] = React.useState<User[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | null>(null);
  const [form, setForm] = React.useState<any>(EMPTY);
  const [error, setError] = React.useState<string | null>(null);
  const [temp, setTemp] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [userData, roleData] = await Promise.all([api<{ items: User[] }>('/api/users'), api<{ items: Role[] }>('/api/roles')]);
    setUsers(userData.items || []);
    setRoles(roleData.items || []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ email: user.email, name: user.name, jobTitle: user.jobTitle || '', password: '', roleKeys: user.roles.map((role) => role.key), status: user.status, isCompanyAdmin: user.isCompanyAdmin });
    setOpen(true);
  };

  const save = async () => {
    setError(null);
    try {
      if (editing) await apiPatch(`/api/users/${editing.id}`, form);
      else {
        const result = await apiPost<{ temporaryPassword?: string }>('/api/users', form);
        if (result?.temporaryPassword) setTemp(result.temporaryPassword);
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.messageKey : 'errors.generic');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('confirmDelete.message'))) return;
    await apiDelete(`/api/users/${id}`).catch(() => setError('errors.generic'));
    await load();
  };

  return (
    <div>
      <PageHeader
        title={t('nav.users')}
        subtitle={`${users.length} ${t('settings.usersCount')}`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> {t('actions.new')}</Button>}
      />
      {error ? <Alert tone="danger" className="mb-3">{t(error as any)}</Alert> : null}
      {temp ? <Alert tone="warning" className="mb-3">{t('common.password')}: <code className="font-mono">{temp}</code></Alert> : null}

      <Card>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('common.email')}</th>
                <th>{t('nav.roles')}</th>
                <th>{t('common.status')}</th>
                <th className="text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.name}</td>
                  <td className="text-xs">{user.email}</td>
                  <td><div className="flex flex-wrap gap-1">{user.roles.map((role) => <Badge key={role.id} color="teal">{role.name}</Badge>)}</div></td>
                  <td><Badge color={user.status === 'active' ? 'green' : 'slate'}>{user.status}</Badge></td>
                  <td className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(user)}>{t('common.edit')}</Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(user.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
        title={editing ? t('common.edit') : t('actions.new')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={save}>{t('common.save')}</Button></>}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('common.email')} required><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label={t('common.name')} required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label={t('common.password')} hint="min. 8"><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
          <Field label={t('nav.roles')}>
            <Select value={form.roleKeys[0] || ''} onChange={(event) => setForm({ ...form, roleKeys: [event.target.value] })}>
              {roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.status')}>
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="active">{t('common.active')}</option>
              <option value="disabled">{t('status.inactive')}</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
