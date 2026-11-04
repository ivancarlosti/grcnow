'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { api, apiPut } from '@/lib/api';
import { Button, Card, Input, PageHeader, Spinner, StatusBadge } from '@/components/ui';

const LEVEL: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-orange-200 text-orange-900',
  critical: 'bg-red-300 text-red-950',
};

export default function RiskMatrixPage() {
  const t = useTranslations();
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [appetite, setAppetite] = React.useState(12);
  const [loaded, setLoaded] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const [dashboard, matrix] = await Promise.all([
        api<{ riskMatrix: { appetite: number; cells: { likelihood: number; impact: number; count: number; level: string }[] } }>('/api/dashboard'),
        api<{ appetite: number }>('/api/risk-matrix').catch(() => null),
      ]);
      const map: Record<string, number> = {};
      dashboard.riskMatrix.cells.forEach((cell) => (map[`${cell.likelihood}-${cell.impact}`] = cell.count));
      setCounts(map);
      setAppetite(matrix?.appetite ?? dashboard.riskMatrix.appetite ?? 12);
      setLoaded(true);
    })();
  }, []);

  const save = async () => {
    await apiPut('/api/risk-matrix', { appetite: Number(appetite) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div>
      <PageHeader
        title={t('nav.riskMatrix')}
        subtitle={t('risk.appetite')}
        actions={
          <div className="flex items-end gap-2">
            <Input type="number" min={1} max={25} value={appetite} onChange={(event) => setAppetite(Number(event.target.value))} className="w-24" />
            <Button size="sm" onClick={save}>{t('common.save')}</Button>
            {saved ? <StatusBadge status="active" label={t('common.success')} /> : null}
          </div>
        }
      />
      <Card className="p-5">
        <div className="grid grid-cols-5 gap-1.5">
          {[5, 4, 3, 2, 1].map((likelihood) =>
            [1, 2, 3, 4, 5].map((impact) => {
              const score = likelihood * impact;
              const level = score >= 16 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';
              return (
                <div key={`${likelihood}-${impact}`} className={`flex h-16 flex-col items-center justify-center rounded-lg ${LEVEL[level]}`}>
                  <span className="text-lg font-semibold">{counts[`${likelihood}-${impact}`] || ''}</span>
                  <span className="text-[10px] opacity-70">{score}</span>
                </div>
              );
            }),
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground">
          <span>{t('fields.likelihood')} ↑</span>
          <span>{t('fields.impact')} →</span>
        </div>
      </Card>
    </div>
  );
}
