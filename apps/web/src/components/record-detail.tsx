'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, Send, Trash2 } from 'lucide-react';
import { api, apiDelete, apiPatch, apiPost, ApiError } from '@/lib/api';
import type { FieldDef, Meta, Row } from './module-page';
import { useFieldLabel } from './module-page';
import { Alert, Button, Card, Checkbox, Drawer, Field, Input, Select, Spinner, StatusBadge, Tabs, Textarea } from './ui';

interface Comment {
  id: string;
  body: string;
  authorId: string | null;
  authorName?: string | null;
  createdAt: string;
}

interface FileRow {
  id: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
}

export function RecordDetail({ moduleKey, id }: { moduleKey: string; id: string }) {
  const t = useTranslations();
  const labelFor = useFieldLabel();
  const [meta, setMeta] = React.useState<Meta | null>(null);
  const [record, setRecord] = React.useState<Row | null>(null);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [files, setFiles] = React.useState<FileRow[]>([]);
  const [history, setHistory] = React.useState<Row[]>([]);
  const [tab, setTab] = React.useState('overview');
  const [error, setError] = React.useState<string | null>(null);
  const [options, setOptions] = React.useState<Record<string, { value: string; label: string }[]>>({});
  const [commentText, setCommentText] = React.useState('');
  const [editOpen, setEditOpen] = React.useState(false);
  const [form, setForm] = React.useState<Row>({});
  const [customValues, setCustomValues] = React.useState<Row>({});
  const [saving, setSaving] = React.useState(false);
  const [ackDone, setAckDone] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [recordData, metaData] = await Promise.all([
        api<Row>(`/api/${moduleKey}/${id}`),
        meta ? Promise.resolve(meta) : api<Meta>(`/api/${moduleKey}/meta`),
      ]);
      setRecord(recordData);
      if (!meta) {
        setMeta(metaData);
        const refs = new Set(
          metaData.fields
            .filter((f: FieldDef) => f.ref && ['select', 'user'].includes(f.type))
            .map((f: FieldDef) => f.ref as string),
        );
        const next: Record<string, { value: string; label: string }[]> = {};
        await Promise.all(
          [...refs].map(async (ref) => {
            try {
              next[ref] = (await api<{ items: any[] }>(`/api/${ref}/options`)).items || [];
            } catch {
              next[ref] = [];
            }
          }),
        );
        setOptions(next);
      }
      const [commentData, fileData, historyData] = await Promise.all([
        api<{ items: Comment[] }>(`/api/comments?entity=${moduleKey}&entityId=${id}`).catch(() => ({ items: [] })),
        api<{ items: FileRow[] }>(`/api/files?entity=${moduleKey}&entityId=${id}`).catch(() => ({ items: [] })),
        api<{ items: Row[] }>(`/api/audit-logs?module=${moduleKey}&pageSize=100`).catch(() => ({ items: [] })),
      ]);
      setComments(commentData.items || []);
      setFiles(fileData.items || []);
      setHistory((historyData.items || []).filter((entry) => entry.entityId === id).slice(0, 20));
    } catch (err) {
      setError(err instanceof ApiError ? err.messageKey : 'errors.generic');
    }
  }, [moduleKey, id, meta]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openEdit = () => {
    if (!record) return;
    const initial: Row = {};
    meta?.fields.forEach((field) => {
      const fieldValue = record[field.name];
      if (field.type === 'date' && fieldValue) initial[field.name] = String(fieldValue).slice(0, 10);
      else if (field.type === 'datetime' && fieldValue) initial[field.name] = String(fieldValue).slice(0, 16);
      else if (field.type === 'stringList' || field.type === 'multiselect') {
        initial[field.name] = (fieldValue || []).join(', ');
      } else if (field.type === 'json') initial[field.name] = fieldValue ? JSON.stringify(fieldValue, null, 2) : '';
      else initial[field.name] = fieldValue ?? '';
    });
    setForm(initial);
    setCustomValues(record.custom || {});
    setEditOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Row = { ...form, custom: customValues };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = null;
      });
      await apiPatch(`/api/${moduleKey}/${id}`, payload);
      setEditOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.messageKey : 'errors.generic');
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    await apiPost('/api/comments', { entity: moduleKey, entityId: id, body: commentText.trim() });
    setCommentText('');
    await load();
  };

  const upload = async (file: File) => {
    const data = new FormData();
    data.append('file', file);
    data.append('entity', moduleKey);
    data.append('entityId', id);
    data.append('category', moduleKey);
    await api('/api/files', { method: 'POST', formData: data });
    await load();
  };

  const removeRecord = async () => {
    if (!window.confirm(t('confirmDelete.message'))) return;
    await apiDelete(`/api/${moduleKey}/${id}`);
    window.location.href = `/${moduleKey}`;
  };

  const acknowledge = async () => {
    await apiPost(`/api/policies/${id}/acknowledge`, {});
    setAckDone(true);
  };

  const translateStatus = (raw: string) => {
    try {
      return t(`status.${raw}` as any);
    } catch {
      return raw;
    }
  };

  const value = (field: FieldDef) => {
    const raw = record?.[field.name];
    if (raw === null || raw === undefined || raw === '') return <span className="text-muted-foreground">—</span>;
    if (field.type === 'boolean') return raw ? t('common.yes') : t('common.no');
    if (['status', 'result', 'severity', 'priority', 'riskLevel', 'criticality', 'treatment'].includes(field.name)) {
      return <StatusBadge status={String(raw)} label={translateStatus(String(raw))} badge={field.name === 'status' ? record?.badge : null} />;
    }
    if (field.type === 'user') return (options['users'] || []).find((o) => o.value === raw)?.label || String(raw);
    if (field.ref && field.ref !== 'users') {
      return (options[field.ref] || []).find((o) => o.value === raw)?.label || String(raw);
    }
    if (field.type === 'date' || field.type === 'datetime') return new Date(raw).toLocaleString();
    if (Array.isArray(raw)) return raw.join(', ');
    if (field.type === 'json') {
      return <pre className="max-w-full overflow-x-auto text-xs">{JSON.stringify(raw, null, 2)}</pre>;
    }
    if (field.type === 'textarea') return <p className="whitespace-pre-wrap text-sm">{String(raw)}</p>;
    return String(raw);
  };

  if (error && !record) return <Alert tone="danger">{t(error as any)}</Alert>;
  if (!record || !meta) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const titleField = ['title', 'name', 'subject', 'code'].find((key) => record[key]) || 'code';
  const tabs = [
    { key: 'overview', label: t('detail.tabs.overview') },
    { key: 'comments', label: `${t('detail.tabs.comments')} (${comments.length})` },
    { key: 'attachments', label: `${t('detail.tabs.attachments')} (${files.length})` },
    { key: 'history', label: t('detail.tabs.history') },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href={`/${moduleKey}`} className="mt-1 rounded-md p-1.5 text-slate-500 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{String(record[titleField])}</h1>
              {record.status ? (
                <StatusBadge
                  status={String(record.status)}
                  label={translateStatus(String(record.status))}
                  badge={record.badge}
                />
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {labelFor(moduleKey)} · {record.code || record.id}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {moduleKey === 'policies' ? (
            <Button size="sm" variant="outline" onClick={acknowledge} disabled={ackDone}>
              <Check className="h-3.5 w-3.5" /> {t('actions.acknowledge')}
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={openEdit}>
            {t('common.edit')}
          </Button>
          <Button size="sm" variant="danger" onClick={removeRecord}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-3">
          <Alert tone="danger">{t(error as any)}</Alert>
        </div>
      ) : null}

      <Card>
        <div className="px-4 pt-2">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
        <div className="p-5">
          {tab === 'overview' ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {meta.fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.type === 'textarea' || field.type === 'json'
                      ? 'sm:col-span-2 lg:col-span-3'
                      : undefined
                  }
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {labelFor(field.name)}
                  </p>
                  <div className="mt-1 text-sm text-slate-800">{value(field)}</div>
                </div>
              ))}
            </div>
          ) : null}
          {tab === 'comments' ? (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('detail.noComments')}</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{comment.authorName || '—'}</span>
                      <span className="text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{comment.body}</p>
                  </div>
                ))
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  rows={2}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={t('detail.commentPlaceholder')}
                />
                <Button onClick={addComment} disabled={!commentText.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}

          {tab === 'attachments' ? (
            <div className="space-y-3">
              <input
                type="file"
                className="block text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
              ) : (
                files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-800">{file.filename}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB · {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <a className="link text-xs" href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer">
                      {t('common.download')}
                    </a>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {tab === 'history' ? (
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('detail.noHistory')}</p>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 text-xs"
                  >
                    <span className="font-medium text-slate-700">
                      {entry.action} · {entry.actorEmail || '—'}
                    </span>
                    <span className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}

        </div>
      </Card>
      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`${t('common.edit')} · ${String(record[titleField])}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {meta.fields
            .filter((field) => !field.readOnly)
            .map((field) => {
              const fieldValue = form[field.name] ?? '';
              const setValue = (next: any) => setForm((current) => ({ ...current, [field.name]: next }));
              let control: React.ReactNode;
              if (field.type === 'textarea' || field.type === 'json') {
                control = <Textarea rows={4} value={fieldValue} onChange={(event) => setValue(event.target.value)} />;
              } else if (field.type === 'select' || field.type === 'multiselect') {
                const items = field.ref
                  ? options[field.ref] || []
                  : (field.options || []).map((option) => ({ value: option, label: translateStatus(option) }));
                control = (
                  <Select value={fieldValue} onChange={(event) => setValue(event.target.value)}>
                    <option value="">—</option>
                    {items.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              } else if (field.type === 'user') {
                control = (
                  <Select value={fieldValue} onChange={(event) => setValue(event.target.value)}>
                    <option value="">—</option>
                    {(options['users'] || []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              } else if (field.type === 'boolean') {
                control = (
                  <Checkbox
                    checked={Boolean(form[field.name])}
                    onChange={(event) => setValue(event.target.checked)}
                    label={labelFor(field.name)}
                  />
                );
              } else {
                control = (
                  <Input
                    type={
                      field.type === 'date'
                        ? 'date'
                        : field.type === 'datetime'
                          ? 'datetime-local'
                          : field.type === 'int' || field.type === 'number'
                            ? 'number'
                            : 'text'
                    }
                    value={fieldValue}
                    onChange={(event) => setValue(event.target.value)}
                  />
                );
              }
              return (
                <Field
                  key={field.name}
                  label={labelFor(field.name)}
                  required={field.required}
                  className={field.type === 'textarea' || field.type === 'json' ? 'sm:col-span-2' : undefined}
                >
                  {control}
                </Field>
              );
            })}
        </div>
      </Drawer>

    </div>
  );
}

