import { Body, Controller, Get, Injectable, Post } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AuthUser, CurrentUser } from '../../common/auth/auth.decorators';
import { env } from '../../config';

@Injectable()
export class AIService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  enabled() {
    return Boolean(env.openai.apiKey);
  }

  async context(): Promise<string> {
    const summary = await this.dashboard.summary();
    const risky = await this.prisma.db.risk.findMany({
      orderBy: { score: 'desc' },
      take: 8,
      select: { code: true, title: true, score: true, status: true, treatment: true },
    });
    const overdue = await this.prisma.db.control.findMany({
      where: { nextTestAt: { lt: new Date() } },
      take: 5,
      select: { code: true, name: true, nextTestAt: true },
    });
    return [
      `Counts: ${JSON.stringify(summary.counts)}`,
      `Compliance: ${summary.compliance.map((c) => `${c.name} ${c.score}%`).join('; ')}`,
      `Top risks: ${risky.map((r) => `${r.code} ${r.title} (score ${r.score}, ${r.status})`).join('; ')}`,
      `Overdue controls: ${overdue.map((c) => `${c.code} ${c.name}`).join('; ') || 'none'}`,
    ].join('\n');
  }

  async chat(messages: { role: string; content: string }[], user: AuthUser, locale: string) {
    const context = await this.context();
    if (!this.enabled()) {
      return {
        offline: true,
        messageKey: 'ai.notConfigured',
        reply: `Live AI is not configured. Current posture summary:\n${context}`,
      };
    }
    const system = [
      'You are a Governance, Risk and Compliance (GRC) assistant inside a multi-tenant platform.',
      `Always answer in the language of locale "${locale}".`,
      'Base every statement on the tenant data below; if the data does not contain the answer, say so.',
      'Be concise, use bullet points and never invent numbers.',
      `Tenant data:\n${context}`,
    ].join('\n');

    const response = await fetch(`${env.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.openai.apiKey}` },
      body: JSON.stringify({
        model: env.openai.model,
        messages: [{ role: 'system', content: system }, ...messages.slice(-10)],
        temperature: 0.2,
        max_tokens: 700,
      }),
    });
    if (!response.ok) {
      return {
        offline: true,
        messageKey: 'ai.notConfigured',
        reply: `AI provider error (${response.status}). Posture summary:\n${context}`,
      };
    }
    const data: any = await response.json();
    return { reply: data?.choices?.[0]?.message?.content || '', usage: data?.usage };
  }
}

@Controller('api/ai')
export class AIController {
  constructor(private readonly ai: AIService) {}

  @Get('status')
  status() {
    return { enabled: this.ai.enabled(), model: env.openai.model };
  }

  @Post('chat')
  chat(
    @Body() body: { messages: { role: string; content: string }[]; locale?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.ai.chat(body?.messages || [], user, body?.locale || user?.locale || 'en-US');
  }
}
