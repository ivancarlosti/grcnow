import { Injectable, Logger } from '@nestjs/common';
import * as vm from 'node:vm';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GrcEvent } from '../../common/events/events.service';

interface Intent {
  type: 'notify' | 'webhook' | 'task' | 'log';
  [key: string]: any;
}

/**
 * Tenant automation rules. Conditions/actions are JavaScript snippets authored
 * by company administrators (trusted input) and executed in a short-lived VM
 * context without access to require/process/globalThis.
 */
@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: GrcEvent) {
    if (!event.tenantId) return;
    const rules = await this.prisma.base.automationRule.findMany({
      where: { tenantId: event.tenantId, event: event.type, active: true },
    });
    for (const rule of rules) {
      const intents: Intent[] = [];
      try {
        const sandbox = {
          record: event.record || {},
          previous: event.previous || {},
          Math,
          Date,
          JSON,
          intents,
          notify: (payload: any) => intents.push({ type: 'notify', ...payload }),
          webhook: (payload: any) => intents.push({ type: 'webhook', ...payload }),
          createTask: (payload: any) => intents.push({ type: 'task', ...payload }),
          log: (message: any) => this.logger.debug(`[automation:${rule.name}] ${message}`),
        };
        const code = `(function(){ ${rule.condition ? `if(!(${rule.condition})) { return; }` : ''} ${rule.action} })()`;
        vm.runInNewContext(code, sandbox, { timeout: 400, displayErrors: true });
        await this.execute(intents, event);
        await this.prisma.base.automationRule.update({
          where: { id: rule.id },
          data: { runCount: { increment: 1 }, lastRunAt: new Date() },
        });
      } catch (err) {
        this.logger.warn(`Automation "${rule.name}" failed: ${(err as Error).message}`);
      }
    }
  }

  private async execute(intents: Intent[], event: GrcEvent) {
    for (const intent of intents) {
      if (intent.type === 'notify') {
        await this.prisma.base.notification.create({
          data: {
            tenantId: event.tenantId,
            userId: intent.to || null,
            type: event.module,
            titleKey: intent.titleKey || 'notification.riskCreated',
            params: intent.params || {},
            link: intent.link || `/${event.module}/${event.entityId}`,
          },
        });
      } else if (intent.type === 'task') {
        if (!intent.projectId) continue;
        await this.prisma.base.task.create({
          data: {
            tenantId: event.tenantId as string,
            projectId: intent.projectId,
            title: intent.title || 'Automated task',
            description: intent.description || null,
            assigneeId: intent.assigneeId || null,
            dueDate: intent.dueDate ? new Date(intent.dueDate) : null,
            status: 'todo',
            priority: intent.priority || 'medium',
          },
        });
      } else if (intent.type === 'webhook') {
        if (!intent.url) continue;
        try {
          await fetch(intent.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: event.type, record: event.record }),
          });
        } catch (err) {
          this.logger.warn(`automation webhook failed: ${(err as Error).message}`);
        }
      }
    }
  }
}
