'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Card, PageHeader, Spinner, StatusBadge } from '@/components/ui';

interface Result {
  id: string;
  module: string;
  title: string;
  subtitle?: string;
  status?: string | null;
  updatedAt: string;
}

export default function SearchPage() {
  const params = useSearchParams();
  const t = useTranslations();
  const term = params.get('q') || '';
  const [items, setItems] = React.useState<Result[] | null>(null);

  React.useEffect(() => {
    if (!term) {
      setItems([]);
      return;
    }
    api<{ items: Result[] }>(`/api/search?q=${encodeURIComponent(term)}`).then((data) => setItems(data.items || []));
  }, [term]);

  return (
    <div>
      <PageHeader title={t('search.results')} subtitle={`"${term}"`} />
      <Card>
        {items === null ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('search.noResults', { term })}</p>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <Link key={item.id} href={`/records/${item.module}/${item.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.subtitle} · {item.module}</p>
                </div>
                <StatusBadge status={item.status || undefined} label={item.status || undefined} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
