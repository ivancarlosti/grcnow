'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/ui';

interface Entry {
  id: string;
  action: string;
  module?: string;
  entity?: string;
  entityId?: string;
  actorEmail?: string;
  ip?: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const t = useTranslations();
  const [items, setItems] = React.useState<Entry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await api<{ items: Entry[]; total: number }>(`/api/audit-logs?page=${page}&pageSize=50`);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setLoading(false);
    })();
  }, [page]);

  return (
    <div>
      <PageHeader title={t('nav.auditLog')} subtitle={t('settings.general')} />
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>{t('common.actions')}</th>
                  <th>{t('common.details')}</th>
                  <th>{t('common.owner')}</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td><Badge color="slate">{entry.action}</Badge></td>
                    <td className="text-xs">
                      <span className="font-medium">{entry.module}</span>
                      {entry.entityId ? <span className="text-muted-foreground"> · {entry.entityId.slice(0, 8)}</span> : null}
                    </td>
                    <td className="text-xs">{entry.actorEmail || '—'}</td>
                    <td className="text-xs text-muted-foreground">{entry.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>{total} {t('common.total')}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t('common.previous')}
            </Button>
            <Button size="sm" variant="secondary" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
