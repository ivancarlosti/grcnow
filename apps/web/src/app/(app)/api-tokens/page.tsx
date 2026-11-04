'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { api, apiDelete, apiPost } from '@/lib/api';
import { Alert, Button, Card, Field, Input, Modal, PageHeader, Select } from '@/components/ui';

interface Token {
  id: string;
  name: string;
  scopes: string[];
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export default function ApiTokensPage() {
  const t = useTranslations();
  const [items, setItems] = React.useState<Token[]>([]);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [scopes, setScopes] = React.useState('*:read');
  const [created, setCreated] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setItems((await api<{ items: Token[] }>('/api/api-tokens')).items || []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const result = await apiPost<{ token: string }>('/api/api-tokens', {
      name,
      scopes: scopes.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setCreated(result.token);
    setOpen(false);
    setName('');
    await load();
  };

  const revoke = async (id: string) => {
    await apiDelete(`/api/api-tokens/${id}`);
    await load();
  };

  return (
    <div>
      <PageHeader
        title={t('nav.apiTokens')}
        subtitle={t('settings.apiTokens')}
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('settings.createToken')}</Button>}
      />
      {created ? (
        <Alert tone="warning" className="mb-3">
          <p className="text-xs">{t('settings.tokenCreated')}</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 text-[11px]">{created}</code>
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(created)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Alert>
      ) : null}
      <Card>
        <div className="divide-y divide-border/60">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">{t('common.noData')}</p>
          ) : (
            items.map((token) => (
              <div key={token.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{token.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {token.scopes.join(', ')} · {new Date(token.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => revoke(token.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('settings.createToken')}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button onClick={create} disabled={!name}>{t('common.create')}</Button></>}
      >
        <div className="space-y-3">
          <Field label={t('settings.tokenName')} required>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label={t('settings.scopes')} hint="*:read, risks:*, policies:write">
            <Select value={scopes} onChange={(event) => setScopes(event.target.value)}>
              <option value="*:read">*:read</option>
              <option value="risks:*,controls:*,policies:*">risks:*, controls:*, policies:*</option>
              <option value="*">*</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
