import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventsService, GrcEvent } from '../../common/events/events.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationsService } from './notifications.service';
import { WebhooksService } from './webhooks.service';
import { AutomationService } from './automation.service';
import { MailService } from './mail.service';
import { QueuesService } from './queues.service';

/**
 * Fan-out of domain events: automation rules, webhooks, in-app notifications
 * and multilingual e-mails.
 */
@Injectable()
export class EventsListener implements OnModuleInit {
  private readonly logger = new Logger(EventsListener.name);

  constructor(
    private readonly events: EventsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
    private readonly automation: AutomationService,
    private readonly mail: MailService,
    private readonly queues: QueuesService,
  ) {
    this.queues.register('mail.send', async (payload) => {
      await this.mail.sendTemplate(payload);
    });
  }

  onModuleInit() {
    this.events.subscribe((event) => void this.handle(event));
  }

  private async handle(event: GrcEvent) {
    await this.automation.handle(event).catch((err) => this.logger.warn(err.message));
    await this.webhooks.dispatch(event).catch((err) => this.logger.warn(err.message));
    await this.notifyOwner(event).catch((err) => this.logger.warn(err.message));
  }

  private async notifyOwner(event: GrcEvent) {
    if (!['risks.created', 'incidents.created', 'findings.created'].includes(event.type)) return;
    const record = event.record;
    const ownerId = record?.ownerId || record?.assigneeId;
    if (!ownerId || !event.tenantId) return;
    const titleKey =
      event.type === 'risks.created'
        ? 'notification.riskCreated'
        : event.type === 'incidents.created'
          ? 'notification.incidentCreated'
          : 'notification.findingCreated';
    const params = {
      title: record.title || record.name || record.code,
      score: record.score,
      actor: record.createdBy || 'system',
    };
    await this.notifications.push({
      tenantId: event.tenantId,
      userId: ownerId,
      type: event.module,
      titleKey,
      params,
      link: `/${event.module}/${event.entityId}`,
    });
    const owner = await this.prisma.base.user.findFirst({ where: { id: ownerId } });
    const tenant = await this.prisma.base.tenant.findFirst({ where: { id: event.tenantId } });
    if (owner?.email) {
      await this.queues.add('mail.send', {
        to: owner.email,
        event: titleKey,
        locale: owner.locale || tenant?.defaultLocale || 'en-US',
        tenantId: event.tenantId,
        values: { ...params, tenant: tenant?.name || 'GRC', link: `/` },
      });
    }
  }
}
