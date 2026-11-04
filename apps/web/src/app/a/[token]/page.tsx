'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api, apiPost } from '@/lib/api';
import { Alert, Button, Card, Checkbox, Field, Input, Spinner, Textarea } from '@/components/ui';

interface Question { id?: string; key: string; label: string; type: string; weight?: number }
interface Payload { name: string; status: string; questions: Question[]; tenant?: { name: string }; answered: boolean; score?: number }

export default function PublicAssessmentPage() {
  const params = useParams<{ token: string }>();
  const t = useTranslations();
  const [data, setData] = React.useState<Payload | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [done, setDone] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api<Payload>(`/api/public/assessments/${params.token}`).then(setData).catch(() => setError('errors.notFound'));
  }, [params.token]);

  const submit = async () => {
    try {
      const result = await apiPost<{ score: number }>(`/api/public/assessments/${params.token}`, { answers });
      setDone(result.score);
    } catch {
      setError('errors.generic');
    }
  };

  if (error) return <div className="mx-auto max-w-2xl px-5 py-12"><Alert tone="danger">{t(error as any)}</Alert></div>;
  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-lg font-semibold text-slate-900">{data.name}</h1>
      <p className="mb-4 text-xs text-muted-foreground">{data.tenant?.name} · {t('assessment.publicTitle')}</p>
      {done !== null ? (
        <Card className="p-6">
          <p className="text-sm font-medium text-emerald-700">{t('assessment.thanks')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('common.score')}: {done}%</p>
        </Card>
      ) : (
        <Card className="space-y-4 p-5">
          {data.questions.map((question) => {
            const key = question.id || question.key;
            return (
              <Field key={key} label={question.label}>
                {question.type === 'boolean' ? (
                  <Checkbox
                    checked={Boolean(answers[key])}
                    onChange={(event) => setAnswers({ ...answers, [key]: event.target.checked })}
                    label={t('common.yes')}
                  />
                ) : (
                  <Textarea rows={2} value={answers[key] || ''} onChange={(event) => setAnswers({ ...answers, [key]: event.target.value })} />
                )}
              </Field>
            );
          })}
          <Button onClick={submit}>{t('assessment.submit')}</Button>
        </Card>
      )}
    </div>
  );
}
