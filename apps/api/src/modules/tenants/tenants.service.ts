import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { badRequest, conflict, notFound } from '../../common/http/helpers';
import { hashPassword } from '../../common/auth/password';
import { DEFAULT_ROLES } from '../../common/constants/permissions';
import { normalizeLocale } from '../../config';

export interface CreateTenantDto {
  name: string;
  slug?: string;
  domain?: string;
  defaultLocale?: string;
  primaryColor?: string;
  adminEmail: string;
  adminName?: string;
  adminPassword?: string;
  plan?: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const tenants = await this.prisma.base.tenant.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
    const [users, risks, controls, files] = await Promise.all([
      this.prisma.base.user.groupBy({ by: ['tenantId'], _count: { _all: true } }),
      this.prisma.base.risk.groupBy({ by: ['tenantId'], _count: { _all: true } }),
      this.prisma.base.control.groupBy({ by: ['tenantId'], _count: { _all: true } }),
      this.prisma.base.file.groupBy({ by: ['tenantId'], _sum: { size: true }, _count: { _all: true } }),
    ]);
    const userMap = new Map(users.map((u) => [u.tenantId, u._count._all]));
    const riskMap = new Map(risks.map((r) => [r.tenantId, r._count._all]));
    const controlMap = new Map(controls.map((c) => [c.tenantId, c._count._all]));
    const fileMap = new Map(files.map((f) => [f.tenantId, { count: f._count._all, size: f._sum.size || 0 }]));
    return {
      items: tenants.map((tenant) => ({
        ...tenant,
        usage: {
          users: userMap.get(tenant.id) || 0,
          risks: riskMap.get(tenant.id) || 0,
          controls: controlMap.get(tenant.id) || 0,
          files: fileMap.get(tenant.id)?.count || 0,
          storageBytes: fileMap.get(tenant.id)?.size || 0,
        },
      })),
      total: tenants.length,
    };
  }

  async get(id: string) {
    const tenant = await this.prisma.base.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw notFound('errors.tenantNotFound');
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    const name = String(dto.name || '').trim();
    if (!name) throw badRequest('errors.validation');
    const email = String(dto.adminEmail || '').trim().toLowerCase();
    if (!email.includes('@')) {
      throw badRequest('errors.validation', { issues: [{ path: 'adminEmail', message: 'invalid' }] });
    }

    const slug = slugify(dto.slug || name);
    if (await this.prisma.base.tenant.findFirst({ where: { slug } })) throw conflict('errors.conflict');
    if (await this.prisma.base.user.findFirst({ where: { email } })) throw conflict('errors.emailInUse');

    const tenant = await this.prisma.base.tenant.create({
      data: {
        name,
        slug,
        domain: dto.domain ? String(dto.domain).toLowerCase().replace(/^@/, '') : null,
        defaultLocale: dto.defaultLocale ? normalizeLocale(dto.defaultLocale) : null,
        primaryColor: dto.primaryColor || '#0f766e',
        plan: dto.plan || 'standard',
        status: 'active',
      },
    });

    const roles = await this.provisionRoles(tenant.id);
    const adminRole = roles.get('company_admin');
    const admin = await this.prisma.base.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name: dto.adminName?.trim() || email.split('@')[0],
        passwordHash: hashPassword(dto.adminPassword || 'ChangeMe123!'),
        isCompanyAdmin: true,
        status: 'active',
        locale: tenant.defaultLocale || null,
      },
    });
    if (adminRole) {
      await this.prisma.base.userRole.create({
        data: { tenantId: tenant.id, userId: admin.id, roleId: adminRole },
      });
    }

    await this.prisma.base.riskMatrix.create({
      data: {
        tenantId: tenant.id,
        name: 'Default 5x5',
        likelihoodScale: [1, 2, 3, 4, 5].map((value) => ({ value })),
        impactScale: [1, 2, 3, 4, 5].map((value) => ({ value })),
        thresholds: [
          { min: 1, max: 4, level: 'low', color: 'green' },
          { min: 5, max: 9, level: 'medium', color: 'amber' },
          { min: 10, max: 15, level: 'high', color: 'orange' },
          { min: 16, max: 25, level: 'critical', color: 'red' },
        ],
        appetite: 12,
        isDefault: true,
      },
    });

    await this.prisma.base.statusRule.createMany({
      data: [
        {
          tenantId: tenant.id,
          module: 'risks',
          name: 'Overdue review',
          condition: { all: [{ field: 'nextReviewDate', op: 'overdue' }] },
          statusKey: 'overdue',
          label: 'Overdue review',
          color: 'red',
          priority: 0,
        },
        {
          tenantId: tenant.id,
          module: 'controls',
          name: 'Test overdue',
          condition: { all: [{ field: 'nextTestAt', op: 'overdue' }] },
          statusKey: 'overdue',
          label: 'Test overdue',
          color: 'amber',
          priority: 0,
        },
      ],
    });

    await this.audit.log({
      action: 'create',
      module: 'tenants',
      entity: 'tenant',
      entityId: tenant.id,
      after: { name: tenant.name, slug: tenant.slug, adminEmail: email },
      tenantId: tenant.id,
    });
    this.logger.log(`Tenant created: ${tenant.name} (${tenant.id})`);
    return { ...tenant, users: [{ id: admin.id, email: admin.email, name: admin.name }] };
  }
  async update(id: string, dto: Record<string, any>) {
    await this.get(id);
    const data: any = {};
    for (const key of ['name', 'domain', 'primaryColor', 'logoUrl', 'status', 'plan', 'timezone']) {
      if (dto[key] !== undefined) data[key] = dto[key] === '' ? null : dto[key];
    }
    if (dto.defaultLocale !== undefined) {
      data.defaultLocale = dto.defaultLocale ? normalizeLocale(dto.defaultLocale) : null;
    }
    const tenant = await this.prisma.base.tenant.update({ where: { id }, data });
    await this.audit.log({ action: 'update', module: 'tenants', entity: 'tenant', entityId: id, after: data });
    return tenant;
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.base.tenant.update({ where: { id }, data: { deletedAt: new Date(), status: 'suspended' } });
    await this.prisma.base.refreshToken.updateMany({
      where: { user: { tenantId: id }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'delete', module: 'tenants', entity: 'tenant', entityId: id });
    return { ok: true, id };
  }

  private async provisionRoles(tenantId: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const role of DEFAULT_ROLES) {
      const created = await this.prisma.base.role.create({
        data: {
          tenantId,
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
        },
      });
      map.set(role.key, created.id);
    }
    return map;
  }

  /** Ensures the tenant has the default roles (used by seed/repair). */
  async ensureRoles(tenantId: string) {
    const existing = await this.prisma.base.role.findMany({ where: { tenantId } });
    const map = new Map(existing.map((r) => [r.key, r.id]));
    for (const role of DEFAULT_ROLES) {
      if (map.has(role.key)) continue;
      const created = await this.prisma.base.role.create({
        data: {
          tenantId,
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
        },
      });
      map.set(role.key, created.id);
    }
    return map;
  }



}
