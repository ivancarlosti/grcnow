import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GrcEvent } from '../../common/events/events.service';
import { QueuesService } from './queues.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {
    this.queues.register('webhook.deliver', async (payload) => {
      await this.deliver(payload);
    });
  }

  async dispatch(event: GrcEvent) {
    if (!event.tenantId) return;
    const hooks = await this.prisma.base.webhook.findMany({
      where: { tenantId: event.tenantId, active: true },
    });
    for (const hook of hooks) {
      if (hook.events.length && !hook.events.includes(event.type) && !hook.events.includes('*')) continue;
      await this.queues.add('webhook.deliver', {
        webhookId: hook.id,
        tenantId: event.tenantId,
        event: event.type,
        payload: {
          event: event.type,
          tenantId: event.tenantId,
          actorId: event.actorId || null,
          entityId: event.entityId,
          occurredAt: new Date().toISOString(),
          record: event.record || null,
        },
      });
    }
  }

  async deliver(job: { webhookId: string; tenantId: string; event: string; payload: any }) {
    const hook = await this.prisma.base.webhook.findFirst({ where: { id: job.webhookId } });
    if (!hook || !hook.active) return;
    const body = JSON.stringify(job.payload);
    const signature = hook.secret ? createHmac('sha256', hook.secret).update(body).digest('hex') : undefined;
    let statusCode: number | null = null;
    let ok = false;
    let error: string | null = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GRC-Event': job.event,
          ...(signature ? { 'X-GRC-Signature': signature } : {}),
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      statusCode = response.status;
      ok = response.ok;
      if (!ok) error = `HTTP ${response.status}`;
    } catch (err) {
      error = (err as Error).message;
    }
    await this.prisma.base.webhookDelivery.create({
      data: {
        tenantId: job.tenantId,
        webhookId: job.webhookId,
        event: job.event,
        payload: job.payload,
        statusCode,
        ok,
        error,
      },
    });
    if (!ok) this.logger.warn(`Webhook ${hook.name} failed: ${error}`);
    return { ok, statusCode };
  }

  async test(webhookId: string) {
    const hook = await this.prisma.base.webhook.findFirst({ where: { id: webhookId } });
    if (!hook) return { ok: false, error: 'not_found' };
    return this.deliver({
      webhookId,
      tenantId: hook.tenantId,
      event: 'webhook.test',
      payload: { event: 'webhook.test', sentAt: new Date().toISOString() },
    });
  }

  async deliveries(webhookId: string) {
    const items = await this.prisma.db.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items };
  }
}
