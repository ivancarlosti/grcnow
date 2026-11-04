'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, Upload } from 'lucide-react';
import { api, apiPost } from '@/lib/api';
import { Button, Card, Modal, PageHeader, ProgressBar, Textarea, Badge } from '@/components/ui';

interface PackageRow {
  id: string;
  name: string;
  authority: string;
  version: string;
  description?: string;
  _count?: { requirements: number; chapters: number };
}

export default function CompliancePage() {
  const t = useTranslations();
  const [data, setData] = React.useState<{ library: PackageRow[]; adopted: PackageRow[] } | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [payload, setPayload] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setData(await api('/api/compliance/packages'));
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const adopt = async (id: string) => {
    setBusy(true);
    await apiPost(`/api/compliance/packages/${id}/adopt`, {}).catch(() => setError('errors.generic'));
    await load();
    setBusy(false);
  };

  const runImport = async () => {
    setBusy(true);
    try {
      await apiPost('/api/compliance/packages/import', JSON.parse(payload));
      setImportOpen(false);
      setPayload('');
      await load();
    } catch {
      setError('errors.importFailed');
    } finally {
      setBusy(false);
    }
  };

  const adoptedIds = new Set((data?.adopted || []).map((p) => `${p.authority}:${p.version}`));

  return (
    <div>
      <PageHeader
        title={t('nav.compliance')}
        subtitle={t('compliance.requirements')}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> {t('compliance.importPackage')}
            </Button>
          </>
        }
      />
      {error ? <p className="mb-3 text-xs text-red-600">{t(error as any)}</p> : null}

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('compliance.coverage')}
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(data?.adopted || []).map((pkg) => (
          <Card key={pkg.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/compliance/${pkg.id}`} className="text-sm font-semibold text-slate-800 hover:text-primary">
                  {pkg.name}
                </Link>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {pkg.authority} · {pkg.version} · {pkg._count?.requirements || 0} {t('compliance.requirements')}
                </p>
              </div>
              <Badge color="green">{t('status.active')}</Badge>
            </div>
            <div className="mt-3">
              <ProgressBar value={0} />
            </div>
            <Link href={`/compliance/${pkg.id}`} className="link mt-2 inline-block text-xs">
              {t('nav.complianceAnalysis')}
            </Link>
          </Card>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('nav.compliancePackages')}
      </h2>
      <Card>
        <div className="divide-y divide-border/60">
          {(data?.library || []).map((pkg) => {
            const adopted = adoptedIds.has(`${pkg.authority}:${pkg.version}`);
            return (
              <div key={pkg.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{pkg.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {pkg.authority} · {pkg.version} · {pkg._count?.requirements || 0} {t('compliance.requirements')}
                  </p>
                </div>
                {adopted ? (
                  <Badge color="green">{t('status.active')}</Badge>
                ) : (
                  <Button size="sm" variant="outline" loading={busy} onClick={() => adopt(pkg.id)}>
                    <Plus className="h-3.5 w-3.5" /> {t('common.add')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={t('compliance.importPackage')}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={busy} onClick={runImport} disabled={!payload.trim()}>
              {t('common.import')}
            </Button>
          </>
        }
      >
        <p className="mb-2 text-xs text-muted-foreground">
          {'{ "name": "...", "authority": "CUSTOM", "chapters": [{ "ref": "1", "title": "...", "requirements": [...] }] }'}
        </p>
        <Textarea
          rows={12}
          className="font-mono text-xs"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
        />
      </Modal>
    </div>
  );
}
