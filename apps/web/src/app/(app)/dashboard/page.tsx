import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle, ClipboardCheck, FileText, ShieldAlert } from 'lucide-react';
import { serverFetch, getSession } from '@/lib/server';
import { Card, PageHeader, ProgressBar, StatusBadge } from '@/components/ui';

interface Dashboard {
  counts: Record<string, number>;
  compliance: { id: string; name: string; authority: string; score: number }[];
  riskMatrix: { cells: { likelihood: number; impact: number; count: number; level: string }[] };
  recentActivity: { id: string; action: string; module: string; createdAt: string }[];
  myTasks: { id: string; title: string; status: string }[];
  upcomingReviews: { type: string; id: string; code: string; title: string; date: string }[];
}

const LEVEL: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-orange-200 text-orange-900',
  critical: 'bg-red-300 text-red-950',
};

export default async function DashboardPage() {
  const t = await getTranslations();
  const [data, session] = await Promise.all([serverFetch<Dashboard>('/api/dashboard'), getSession()]);
  if (!data) return <div className="surface p-8 text-sm text-muted-foreground">{t('common.noData')}</div>;

  const kpis = [
    { key: 'totalRisks', value: data.counts.risks, href: '/risks', icon: ShieldAlert },
    { key: 'highRisks', value: data.counts.highRisks, href: '/risks', icon: AlertTriangle },
    { key: 'controlsDue', value: data.counts.controlsDue, href: '/controls', icon: ClipboardCheck },
    { key: 'policiesDue', value: data.counts.policiesDue, href: '/policies', icon: FileText },
  ];

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={`${t('dashboard.subtitle')}${session?.tenant?.name ? ` · ${session.tenant.name}` : ''}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.key} href={kpi.href} className="surface p-4 transition hover:border-primary/40">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`dashboard.${kpi.key}` as any)}
                </p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{kpi.value ?? 0}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-800">{t('dashboard.riskMatrix')}</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-5 gap-1">
              {[5, 4, 3, 2, 1].map((likelihood) =>
                [1, 2, 3, 4, 5].map((impact) => {
                  const cell = data.riskMatrix.cells.find((c) => c.likelihood === likelihood && c.impact === impact);
                  return (
                    <div
                      key={`${likelihood}-${impact}`}
                      className={`flex h-11 items-center justify-center rounded-md text-sm font-semibold ${LEVEL[cell?.level || 'medium']}`}
                    >
                      {cell?.count ? cell.count : ''}
                    </div>
                  );
                }),
              )}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t('fields.likelihood')} ↑ · {t('fields.impact')} →
            </p>
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-800">{t('dashboard.complianceByFramework')}</h3>
          </div>
          <div className="space-y-3 p-5">
            {data.compliance.slice(0, 5).map((item) => (
              <div key={item.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <Link href={`/compliance/${item.id}`} className="font-medium text-slate-700 hover:text-primary">
                    {item.authority}
                  </Link>
                  <span className="font-semibold text-slate-800">{item.score}%</span>
                </div>
                <ProgressBar
                  value={item.score}
                  color={item.score >= 75 ? 'bg-emerald-500' : item.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-800">{t('dashboard.upcomingReviews')}</h3>
          </div>
          <div className="divide-y divide-border/60">
            {data.upcomingReviews.length === 0 ? (
              <p className="px-5 py-6 text-xs text-muted-foreground">{t('common.noData')}</p>
            ) : (
              data.upcomingReviews.slice(0, 6).map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={`/records/${item.type === 'risk' ? 'risks' : 'policies'}/${item.id}`}
                  className="flex items-center justify-between px-5 py-2.5 text-xs hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">{item.title}</span>
                    <span className="text-[11px] text-muted-foreground">{item.code}</span>
                  </span>
                  <span className="ms-2 shrink-0 text-[11px] text-muted-foreground">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-800">{t('dashboard.myTasks')}</h3>
          </div>
          <div className="divide-y divide-border/60">
            {data.myTasks.length === 0 ? (
              <p className="px-5 py-6 text-xs text-muted-foreground">{t('common.noData')}</p>
            ) : (
              data.myTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-5 py-2.5 text-xs">
                  <span className="truncate text-slate-800">{task.title}</span>
                  <StatusBadge status={task.status} label={task.status} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-3.5">
            <h3 className="text-sm font-semibold text-slate-800">{t('dashboard.recentActivity')}</h3>
          </div>
          <div className="divide-y divide-border/60">
            {data.recentActivity.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-5 py-2 text-[11px]">
                <span className="truncate text-slate-700">
                  <span className="font-medium">{entry.action}</span> · {entry.module}
                </span>
                <span className="ms-2 shrink-0 text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
