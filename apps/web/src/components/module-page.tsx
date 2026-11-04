'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Download, Filter, Plus, Search, Trash2, Upload } from 'lucide-react';
import { api, apiDelete, apiPatch, apiPost, downloadCsv, ApiError } from '@/lib/api';
import {
  Badge, Button, Card, Checkbox, Drawer, EmptyState, Field, Input, Modal, PageHeader,
  Select, Spinner, StatusBadge, Textarea,
} from './ui';

export interface FieldDef {
  name: string;
  type: string;
  required?: boolean;
  options?: string[];
  optionPrefix?: string;
  readOnly?: boolean;
  ref?: string;
}

export interface CustomField {
  id: string;
  key: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  tab?: string;
}

export interface Meta {
  key: string;
  labelKey: string;
  fields: FieldDef[];
  listFields: string[];
  searchFields: string[];
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
  codePrefix?: string | null;
  customFields: CustomField[];
}

export type Row = Record<string, any>;

const humanize = (name: string) =>
  name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).replace(/ Id$/, '').trim();

const BADGE_FIELDS = new Set(['status', 'result', 'severity', 'priority', 'riskLevel', 'criticality', 'treatment']);

export function useFieldLabel() {
  const t = useTranslations();
  return React.useCallback(
    (field: string) => {
      for (const key of [`common.${field}`, `fields.${field}`, `status.${field}`]) {
        try {
          const value = t(key as any);
          if (value && value !== key) return value;
        } catch {
          /* keep looking */
        }
      }
      return humanize(field);
    },
    [t],
  );
}

export function ModulePage({ moduleKey }: { moduleKey: string }) {
  const t = useTranslations();
  const labelFor = useFieldLabel();
  const [meta, setMeta] = React.useState<Meta | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sort, setSort] = React.useState<string | undefined>();
  const [dir, setDir] = React.useState<'asc' | 'desc'>('desc');
  const [term, setTerm] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [options, setOptions] = React.useState<Record<string, { value: string; label: string }[]>>({});
  const [userMap, setUserMap] = React.useState<Record<string, string>>({});
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [form, setForm] = React.useState<Record<string, any>>({});
  const [customValues, setCustomValues] = React.useState<Record<string, any>>({});
  const [saving, setSaving] = React.useState(false);
  const [issues, setIssues] = React.useState<Record<string, string>>({});
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importResult, setImportResult] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const loaded = await api<Meta>(`/api/${moduleKey}/meta`);
        setMeta(loaded);
        const refs = new Set(
          loaded.fields.filter((f) => f.ref && ['select', 'user'].includes(f.type)).map((f) => f.ref as string),
        );
        const next: Record<string, { value: string; label: string }[]> = {};
        await Promise.all(
          [...refs].map(async (ref) => {
            try {
              const data = await api<{ items: { value: string; label: string }[] }>(`/api/${ref}/options`);
              next[ref] = data.items || [];
            } catch {
              next[ref] = [];
            }
          }),
        );
        setOptions(next);
        const map: Record<string, string> = {};
        (next['users'] || []).forEach((u) => (map[u.value] = u.label.split(' (')[0]));
        setUserMap(map);
      } catch (err) {
        setError(err instanceof ApiError ? err.messageKey : 'errors.generic');
      }
    })();
  }, [moduleKey]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (term) params.set('q', term);
      if (sort) {
        params.set('sort', sort);
        params.set('dir', dir);
      }
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      const data = await api<{ items: Row[]; total: number }>(`/api/${moduleKey}?${params.toString()}`);
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.messageKey : 'errors.generic');
    } finally {
      setLoading(false);
    }
  }, [moduleKey, page, pageSize, term, sort, dir, filters]);

  React.useEffect(() => {
    const timeout = setTimeout(() => void load(), term ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [load, term]);

  const translateStatus = (value: any) => {
    for (const key of [`status.${value}`, `risk.treatment.${value}`, `risk.${value}`]) {
      try {
        const label = t(key as any);
        if (label && label !== key) return label;
      } catch {
        /* next */
      }
    }
    return String(value);
  };

  const title = (() => {
    try {
      return t((meta?.labelKey || `nav.${moduleKey}`) as any);
    } catch {
      return labelFor(moduleKey);
    }
  })();

  const openCreate = () => {
    setEditing(null);
    const initial: Record<string, any> = {};
    meta?.fields.forEach((field) => {
      if (field.type === 'boolean') initial[field.name] = false;
      if (field.name === 'status' && field.options?.length) initial[field.name] = field.options[0];
    });
    setForm(initial);
    setCustomValues({});
    setIssues({});
    setDrawerOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    const initial: Record<string, any> = {};
    meta?.fields.forEach((field) => {
      const value = row[field.name];
      if (field.type === 'date' && value) initial[field.name] = String(value).slice(0, 10);
      else if (field.type === 'datetime' && value) initial[field.name] = String(value).slice(0, 16);
      else if (field.type === 'stringList' || field.type === 'multiselect') initial[field.name] = (value || []).join(', ');
      else if (field.type === 'json') initial[field.name] = value ? JSON.stringify(value, null, 2) : '';
      else initial[field.name] = value ?? '';
    });
    setForm(initial);
    setCustomValues(row.custom || {});
    setIssues({});
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setIssues({});
    try {
      const payload: Record<string, any> = { ...form, custom: customValues };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = null;
      });
      if (editing) await apiPatch(`/api/${moduleKey}/${editing.id}`, payload);
      else await apiPost(`/api/${moduleKey}`, payload);
      setDrawerOpen(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        const next: Record<string, string> = {};
        (err.issues || []).forEach((issue) => (next[issue.path] = issue.message));
        setIssues(next);
        if (!Object.keys(next).length) setError(err.messageKey);
      } else setError('errors.generic');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await apiDelete(`/api/${moduleKey}/${deleting.id}`).catch(() => setError('errors.generic'));
    setDeleting(null);
    await load();
  };

  const runImport = async () => {
    try {
      const result = await apiPost(`/api/${moduleKey}/import`, { csv: importText });
      setImportResult(result);
      await load();
    } catch {
      setImportResult({ failed: 1, errors: [{ row: 0, message: 'errors.importFailed' }] });
    }
  };

  const toggleSort = (field: string) => {
    if (sort === field) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSort(field);
      setDir('asc');
    }
  };

  const renderCell = (row: Row, fieldName: string) => {
    const field = meta?.fields.find((f) => f.name === fieldName);
    const value = row[fieldName];
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
    if (field?.type === 'boolean') {
      return value ? <Badge color="green">✓</Badge> : <span className="text-muted-foreground">—</span>;
    }
    if (BADGE_FIELDS.has(fieldName)) {
      return <StatusBadge status={String(value)} label={translateStatus(value)} badge={fieldName === 'status' ? row.badge : null} />;
    }
    if (field?.type === 'user') return userMap[value] || <span className="text-xs">{value}</span>;
    if (field?.ref && field.ref !== 'users') {
      return (options[field.ref] || []).find((option) => option.value === value)?.label || String(value);
    }
    if (field?.type === 'date' || field?.type === 'datetime') return new Date(value).toLocaleDateString();
    if (Array.isArray(value)) return value.join(', ');
    if (field?.type === 'json') return <span className="text-xs text-muted-foreground">{JSON.stringify(value).slice(0, 60)}</span>;
    return String(value);
  };

  const filterFields = (meta?.fields || []).filter((f) => f.type === 'select' && f.options?.length).slice(0, 4);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={
          loading && !rows.length
            ? t('common.loading')
            : t('common.showing', {
                from: total === 0 ? 0 : (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })
        }
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => downloadCsv(moduleKey, { q: term, ...filters })}>
              <Download className="h-3.5 w-3.5" /> {t('common.export')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> {t('common.import')}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('actions.new')}
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {(() => {
            try {
              return t(error as any);
            } catch {
              return t('errors.generic');
            }
          })()}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
            <Input
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setPage(1);
              }}
              placeholder={t('common.searchPlaceholder')}
              className="ps-9"
            />
          </div>
          {filterFields.map((field) => (
            <Select
              key={field.name}
              value={filters[field.name] || ''}
              onChange={(event) => {
                setFilters((current) => ({ ...current, [field.name]: event.target.value }));
                setPage(1);
              }}
              className="w-auto min-w-[130px]"
            >
              <option value="">
                {labelFor(field.name)}: {t('common.all')}
              </option>
              {field.options!.map((option) => (
                <option key={option} value={option}>
                  {translateStatus(option)}
                </option>
              ))}
            </Select>
          ))}
          {Object.values(filters).some(Boolean) ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              <Filter className="h-3.5 w-3.5" /> {t('common.clear')}
            </Button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          {loading && !rows.length ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title={t('common.noResults')}
              description={term ? t('search.noResults', { term }) : t('common.noData')}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> {t('actions.new')}
                </Button>
              }
            />
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  {(meta?.listFields || []).map((field) => (
                    <th key={field}>
                      <button className="inline-flex items-center gap-1 hover:text-slate-800" onClick={() => toggleSort(field)}>
                        {labelFor(field)}
                        {sort === field ? (
                          dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : null}
                      </button>
                    </th>
                  ))}
                  <th className="w-24 text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {(meta?.listFields || []).map((field, index) => (
                      <td key={field}>
                        {index === 0 ? (
                          <Link href={`/records/${moduleKey}/${row.id}`} className="link font-medium">
                            {renderCell(row, field)}
                          </Link>
                        ) : (
                          renderCell(row, field)
                        )}
                      </td>
                    ))}
                    <td className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-md border border-border bg-white px-1.5 py-1"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / {t('common.page')}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              {t('common.previous')}
            </Button>
            <span>
              {page} {t('common.of')} {pages}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
              {t('common.next')}
            </Button>
          </div>
        </div>

      </Card>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `${t('common.edit')} · ${title}` : `${t('actions.new')} · ${title}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(meta?.fields || []).map((field) => {
            const value = form[field.name] ?? '';
            const setValue = (next: any) => setForm((current) => ({ ...current, [field.name]: next }));
            const common = { disabled: field.readOnly, id: field.name };
            let control: React.ReactNode;
            if (field.type === 'textarea' || field.type === 'json') {
              control = (
                <Textarea
                  {...common}
                  rows={field.type === 'json' ? 5 : 3}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              );
            } else if (field.type === 'select' || field.type === 'multiselect') {
              const refItems = field.ref ? options[field.ref] || [] : undefined;
              control = (
                <Select {...common} value={value} onChange={(event) => setValue(event.target.value)}>
                  <option value="">—</option>
                  {refItems
                    ? refItems.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))
                    : (field.options || []).map((option) => (
                        <option key={option} value={option}>
                          {translateStatus(option)}
                        </option>
                      ))}
                </Select>
              );
            } else if (field.type === 'user') {
              control = (
                <Select {...common} value={value} onChange={(event) => setValue(event.target.value)}>
                  <option value="">—</option>
                  {(options['users'] || []).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              );
            } else if (field.type === 'boolean') {
              control = (
                <Checkbox
                  id={field.name}
                  checked={Boolean(form[field.name])}
                  onChange={(event) => setValue(event.target.checked)}
                  label={labelFor(field.name)}
                />
              );
            } else if (field.type === 'date' || field.type === 'datetime') {
              control = (
                <Input
                  {...common}
                  type={field.type === 'date' ? 'date' : 'datetime-local'}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              );
            } else if (field.type === 'int' || field.type === 'number') {
              control = <Input {...common} type="number" value={value} onChange={(event) => setValue(event.target.value)} />;
            } else {
              control = (
                <Input
                  {...common}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={field.type === 'stringList' ? 'a, b, c' : undefined}
                />
              );
            }
            return (
              <Field
                key={field.name}
                label={labelFor(field.name)}
                required={field.required}
                error={issues[field.name]}
                className={field.type === 'textarea' || field.type === 'json' ? 'sm:col-span-2' : undefined}
              >
                {control}
              </Field>
            );
          })}
        </div>
        {meta?.customFields?.length ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('settings.customFields')}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {meta.customFields.map((field) => {
                const value = customValues[field.key] ?? '';
                const setValue = (next: any) => setCustomValues((current) => ({ ...current, [field.key]: next }));
                return (
                  <Field key={field.id} label={field.label} required={field.required}>
                    {field.type === 'textarea' ? (
                      <Textarea rows={3} value={value} onChange={(event) => setValue(event.target.value)} />
                    ) : field.type === 'select' ? (
                      <Select value={value} onChange={(event) => setValue(event.target.value)}>
                        <option value="">—</option>
                        {(field.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === 'checkbox' ? (
                      <Checkbox
                        checked={Boolean(customValues[field.key])}
                        onChange={(event) => setValue(event.target.checked)}
                        label={field.label}
                      />
                    ) : (
                      <Input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          </div>
        ) : null}

      </Drawer>
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t('confirmDelete.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">{t('confirmDelete.message')}</p>
        {deleting ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {deleting.code || deleting.name || deleting.title || deleting.id}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportResult(null);
        }}
        title={t('actions.importCsv')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              {t('common.close')}
            </Button>
            <Button onClick={runImport} disabled={!importText.trim()}>
              {t('common.import')}
            </Button>
          </>
        }
      >
        <p className="mb-2 text-xs text-muted-foreground">
          {t('common.import')} CSV · {t('fields.title')}, {t('common.status')} …
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mb-3 block w-full text-xs"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) setImportText(await file.text());
          }}
        />
        <Textarea
          rows={8}
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          placeholder={'code,name,status\nCTL-1000,Backup test,active'}
          className="font-mono text-xs"
        />
        {importResult ? (
          <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs">
            <p>
              {t('common.total')}: {importResult.total} · {t('common.created')}: {importResult.created} ·{' '}
              {t('common.error')}: {importResult.failed}
            </p>
            {(importResult.errors || []).slice(0, 5).map((err: any, index: number) => (
              <p key={index} className="text-red-600">
                #{err.row}: {err.message}
              </p>
            ))}
          </div>
        ) : null}
      </Modal>


    </div>
  );
}
