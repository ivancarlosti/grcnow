'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { api, apiPut } from '@/lib/api';
import { Badge, Button, Card, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { LOCALES, LOCALE_LABELS } from '@/i18n/config';

interface Row { namespace: string; key: string; default: string; override: string | null }

export default function TranslationsPage() {
  const t = useTranslations();
  const [locale, setLocale] = React.useState('en-US');
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [term, setTerm] = React.useState('');
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [savedKey, setSavedKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setRows(null);
    const data = await api<{ items: Row[] }>(`/api/i18n/translations?locale=${locale}&q=${encodeURIComponent(term)}`);
    setRows(data.items || []);
  }, [locale, term]);

  React.useEffect(() => {
    const timeout = setTimeout(() => void load(), term ? 350 : 0);
    return () => clearTimeout(timeout);
  }, [load, term]);

  const save = async (key: string) => {
    const value = drafts[key];
    if (value === undefined) return;
    await apiPut('/api/i18n/translations', { locale, key, value });
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1500);
  };

  const reset = async (key: string) => {
    await api('/api/i18n/translations', { method: 'DELETE', body: { locale, key } }).catch(() => undefined);
    await load();
  };

  return (
    <div>
      <PageHeader title={t('nav.translations')} subtitle={t('settings.translationsHint')} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <Select value={locale} onChange={(event) => setLocale(event.target.value)} className="w-auto">
            {LOCALES.map((code) => <option key={code} value={code}>{LOCALE_LABELS[code]}</option>)}
          </Select>
          <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder={t('common.searchPlaceholder')} className="max-w-sm" />
          <Badge color="slate">{rows?.length ?? '…'}</Badge>
        </div>
        {rows === null ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            {rows.map((row) => (
              <div key={row.key} className="grid grid-cols-1 gap-2 border-b border-border/60 px-4 py-2.5 md:grid-cols-[240px_1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] text-slate-700">{row.key}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{row.default}</p>
                </div>
                <Input
                  value={drafts[row.key] ?? row.override ?? ''}
                  placeholder={row.default}
                  onChange={(event) => setDrafts({ ...drafts, [row.key]: event.target.value })}
                />
                <div className="flex items-center gap-1">
                  <Button size="sm" variant={savedKey === row.key ? 'outline' : 'secondary'} onClick={() => save(row.key)}>
                    {savedKey === row.key ? t('common.success') : t('common.save')}
                  </Button>
                  {row.override ? <Button size="sm" variant="ghost" onClick={() => reset(row.key)}>{t('settings.resetTranslation')}</Button> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
