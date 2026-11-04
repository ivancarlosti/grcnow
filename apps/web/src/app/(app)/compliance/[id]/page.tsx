'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { api, apiPost, apiDelete } from '@/lib/api';
import { Badge, Button, Card, PageHeader, ProgressBar, Select, Spinner, StatusBadge } from '@/components/ui';

interface Analysis {
  package: { id: string; name: string; authority: string; version: string };
  requirements: number;
  mapped: number;
  score: number;
}

interface Requirement {
  id: string;
  ref: string;
  title: string;
  category?: string;
  chapter?: { title: string };
  mappings: { id: string; status: string; entityLabel?: string }[];
}

export default function ComplianceAnalysisPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations();
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [requirements, setRequirements] = React.useState<Requirement[]>([]);
  const [entities, setEntities] = React.useState<{ value: string; label: string }[]>([]);
  const [selected, setSelected] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const [a, r, controls] = await Promise.all([
      api<Analysis>(`/api/compliance/packages/${params.id}/analysis`),
      api<{ items: Requirement[] }>(`/api/compliance/packages/${params.id}/requirements`),
      api<{ items: { value: string; label: string }[] }>('/api/controls/options'),
    ]);
    setAnalysis(a);
    setRequirements(r.items || []);
    setEntities(controls.items || []);
  }, [params.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const map = async (requirementId: string) => {
    if (!selected) return;
    setBusy(true);
    await apiPost('/api/compliance/mappings', { requirementId, entityType: 'control', entityId: selected, status: 'implemented' });
    await load();
    setBusy(false);
  };

  const unmap = async (id: string) => {
    setBusy(true);
    await apiDelete(`/api/compliance/mappings/${id}`);
    await load();
    setBusy(false);
  };

  if (!analysis) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/compliance" className="rounded-md p-1.5 text-slate-500 hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader
          title={analysis.package.name}
          subtitle={`${analysis.package.authority} · ${analysis.package.version} · ${analysis.mapped}/${analysis.requirements}`}
        />
      </div>
      <Card className="mb-4 p-5">
        <p className="text-xs text-muted-foreground">{t('compliance.coverage')}</p>
        <p className="text-3xl font-semibold text-slate-900">{analysis.score}%</p>
        <ProgressBar value={analysis.score} className="mt-2" />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <Select value={selected} onChange={(event) => setSelected(event.target.value)} className="max-w-xs">
            <option value="">
              {t('compliance.mapping')} — {t('nav.controls')}
            </option>
            {entities.map((entity) => (
              <option key={entity.value} value={entity.value}>
                {entity.label}
              </option>
            ))}
          </Select>
          <Badge color="slate">{requirements.length}</Badge>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {requirements.map((requirement) => (
            <div key={requirement.id} className="border-b border-border/60 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    <span className="me-2 text-xs text-primary">{requirement.ref}</span>
                    {requirement.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {requirement.chapter?.title || requirement.category || ''}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={!selected || busy} onClick={() => map(requirement.id)}>
                  {t('compliance.mapping')}
                </Button>
              </div>
              {requirement.mappings.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {requirement.mappings.map((mapping) => (
                    <span
                      key={mapping.id}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]"
                    >
                      <StatusBadge status={mapping.status} />
                      <span className="max-w-[200px] truncate">{mapping.entityLabel}</span>
                      <button className="text-red-500" onClick={() => unmap(mapping.id)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
