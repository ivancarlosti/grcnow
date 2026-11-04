'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Send, Sparkles } from 'lucide-react';
import { api, apiPost } from '@/lib/api';
import { Alert, Badge, Button, Card, PageHeader, Textarea } from '@/components/ui';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function InsightsPage() {
  const t = useTranslations();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<{ enabled: boolean; model: string; mcp?: any } | null>(null);

  React.useEffect(() => {
    Promise.all([api('/api/ai/status'), api('/api/mcp').catch(() => null)]).then(([ai, mcp]) => setStatus({ ...ai, mcp }));
  }, []);

  const send = async () => {
    if (!input.trim()) return;
    const next = [...messages, { role: 'user' as const, content: input.trim() }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const result = await apiPost<{ reply: string; offline?: boolean; messageKey?: string }>('/api/ai/chat', {
        messages: next,
        locale: document.documentElement.lang,
      });
      setMessages([...next, { role: 'assistant', content: result.reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: t('errors.generic') }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('ai.title')}
        subtitle={t('ai.disclaimer')}
        actions={status ? <Badge color={status.enabled ? 'green' : 'amber'}>{status.enabled ? status.model : t('ai.notConfigured')}</Badge> : null}
      />
      {status && !status.enabled ? <Alert tone="warning" className="mb-3">{t('ai.notConfigured')}</Alert> : null}

      <Card className="flex h-[60vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <Sparkles className="h-8 w-8 text-primary/50" />
              <p>{t('ai.placeholder')}</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === 'user'
                    ? 'ms-auto max-w-[80%] rounded-xl bg-primary px-3 py-2 text-sm text-white'
                    : 'max-w-[85%] whitespace-pre-wrap rounded-xl bg-muted px-3 py-2 text-sm text-slate-800'
                }
              >
                {message.content}
              </div>
            ))
          )}
          {loading ? <p className="text-xs text-muted-foreground">{t('common.loading')}</p> : null}
        </div>
        <div className="flex items-end gap-2 border-t border-border p-3">
          <Textarea
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('ai.placeholder')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <Button onClick={send} disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-xs font-semibold text-slate-800">MCP endpoint</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          POST /api/mcp · JSON-RPC 2.0 · tools: {status?.mcp?.tools?.map((tool: any) => tool.name).join(', ') || '—'}
        </p>
      </Card>
    </div>
  );
}
