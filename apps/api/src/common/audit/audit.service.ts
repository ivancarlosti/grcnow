import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tenantContext } from '../tenant/tenant-context';

export interface AuditEntry {
  action: string;
  module?: string;
  entity?: string;
  entityId?: string;
  before?: any;
  after?: any;
  actorId?: string;
  actorEmail?: string;
  tenantId?: string | null;
  ip?: string;
  userAgent?: string;
}

/** Immutable activity trail — insert only, no update/delete API. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    const ctx = tenantContext.get();
    try {
      await this.prisma.base.auditLog.create({
        data: {
          tenantId: entry.tenantId !== undefined ? entry.tenantId : ctx?.tenantId ?? null,
          actorId: entry.actorId ?? ctx?.userId ?? null,
          actorEmail: entry.actorEmail ?? ctx?.userEmail ?? null,
          action: entry.action,
          module: entry.module ?? null,
          entity: entry.entity ?? null,
          entityId: entry.entityId ?? null,
          before: entry.before ? this.sanitize(entry.before) : undefined,
          after: entry.after ? this.sanitize(entry.after) : undefined,
          ip: entry.ip ?? ctx?.ip ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(`audit log failed: ${(err as Error).message}`);
    }
  }

  private sanitize(value: any): any {
    if (!value || typeof value !== 'object') return value;
    const clone: any = Array.isArray(value) ? [] : {};
    for (const [key, val] of Object.entries(value)) {
      if (/password|secret|token/i.test(key)) continue;
      clone[key] = val;
    }
    return JSON.parse(JSON.stringify(clone, (k, v) => (v instanceof Date ? v.toISOString() : v)));
  }

  async list(params: { page?: number; pageSize?: number; module?: string; action?: string; actorId?: string }) {
    const ctx = tenantContext.get();
    const where: any = { tenantId: ctx?.tenantId ?? null };
    if (params.module) where.module = params.module;
    if (params.action) where.action = params.action;
    if (params.actorId) where.actorId = params.actorId;
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize) || 50));
    const [items, total] = await Promise.all([
      this.prisma.base.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.base.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
