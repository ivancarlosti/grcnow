import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { tenantContext } from '../../common/tenant/tenant-context';

export interface NotificationInput {
  tenantId?: string | null;
  userId?: string | null;
  type: string;
  titleKey: string;
  params?: Record<string, any>;
  link?: string;
  email?: string;
  locale?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, onlyUnread = false) {
    const items = await this.prisma.db.notification.findMany({
      where: { userId, ...(onlyUnread ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items, total: items.length, unread: items.filter((n) => !n.readAt).length };
  }

  async unreadCount(userId: string) {
    return this.prisma.db.notification.count({ where: { userId, readAt: null } });
  }

  async push(input: NotificationInput) {
    return this.prisma.db.notification.create({
      data: {
        tenantId: input.tenantId ?? tenantContext.tenantId,
        userId: input.userId ?? null,
        type: input.type,
        titleKey: input.titleKey,
        params: input.params || {},
        link: input.link || null,
      },
    });
  }

  async markRead(id: string, userId: string) {
    await this.prisma.db.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async markAll(userId: string) {
    await this.prisma.db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async templates() {
    const tenantId = tenantContext.tenantId;
    const [global, tenant] = await Promise.all([
      this.prisma.base.notificationTemplate.findMany({ where: { tenantId: null }, orderBy: { event: 'asc' } }),
      tenantId
        ? this.prisma.base.notificationTemplate.findMany({ where: { tenantId }, orderBy: { event: 'asc' } })
        : Promise.resolve([]),
    ]);
    const merged = new Map<string, any>();
    global.forEach((t) => merged.set(`${t.event}:${t.locale}`, { ...t, scope: 'global' }));
    tenant.forEach((t) => merged.set(`${t.event}:${t.locale}`, { ...t, scope: 'tenant' }));
    return { items: [...merged.values()].sort((a, b) => `${a.event}${a.locale}`.localeCompare(`${b.event}${b.locale}`)) };
  }

  async saveTemplate(body: { event: string; locale: string; subject: string; body: string; scope?: 'global' | 'tenant' }) {
    const tenantId = body.scope === 'global' ? null : tenantContext.tenantId;
    const existing = await this.prisma.base.notificationTemplate.findFirst({
      where: { tenantId, event: body.event, locale: body.locale },
    });
    if (existing) {
      return this.prisma.base.notificationTemplate.update({
        where: { id: existing.id },
        data: { subject: body.subject, body: body.body },
      });
    }
    return this.prisma.base.notificationTemplate.create({
      data: { tenantId, event: body.event, locale: body.locale, subject: body.subject, body: body.body },
    });
  }
}
