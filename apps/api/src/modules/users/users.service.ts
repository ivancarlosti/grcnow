import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { badRequest, conflict, forbidden, notFound } from '../../common/http/helpers';
import { hashPassword, randomToken } from '../../common/auth/password';
import { tenantContext } from '../../common/tenant/tenant-context';
import { normalizeLocale } from '../../config';

export interface UserDto {
  email?: string;
  name?: string;
  password?: string;
  jobTitle?: string;
  phone?: string;
  locale?: string | null;
  roleKeys?: string[];
  status?: string;
  isCompanyAdmin?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private tenantId() {
    const id = tenantContext.tenantId;
    if (!id) throw badRequest('errors.tenantNotFound');
    return id;
  }

  async list(query: { q?: string; status?: string; role?: string } = {}) {
    const where: any = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.role) where.roles = { some: { role: { key: query.role } } };
    if (query.q) {
      where.OR = [
        { name: { contains: String(query.q), mode: 'insensitive' } },
        { email: { contains: String(query.q), mode: 'insensitive' } },
      ];
    }
    const users = await this.prisma.db.user.findMany({
      where,
      include: { roles: { include: { role: true } } },
      orderBy: { name: 'asc' },
      take: 500,
    });
    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        jobTitle: user.jobTitle,
        phone: user.phone,
        locale: user.locale,
        status: user.status,
        isSuperAdmin: user.isSuperAdmin,
        isCompanyAdmin: user.isCompanyAdmin,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        roles: user.roles.map((r) => ({ id: r.role.id, key: r.role.key, name: r.role.name })),
      })),
      total: users.length,
    };
  }

  async options() {
    const users = await this.prisma.db.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
    return { items: users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })) };
  }

  async get(id: string) {
    const user = await this.prisma.db.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw notFound();
    return {
      ...user,
      passwordHash: undefined,
      roles: user.roles.map((r) => ({ id: r.role.id, key: r.role.key, name: r.role.name })),
    };
  }

  async create(dto: UserDto) {
    const tenantId = this.tenantId();
    const email = String(dto.email || '').trim().toLowerCase();
    if (!email.includes('@')) {
      throw badRequest('errors.validation', { issues: [{ path: 'email', message: 'invalid' }] });
    }
    if (!dto.name || !String(dto.name).trim()) {
      throw badRequest('errors.validation', { issues: [{ path: 'name', message: 'required' }] });
    }
    if (await this.prisma.base.user.findFirst({ where: { email } })) throw conflict('errors.emailInUse');
    const password = dto.password && dto.password.length >= 8 ? dto.password : randomToken(9);
    const user = await this.prisma.base.user.create({
      data: {
        tenantId,
        email,
        name: String(dto.name).trim(),
        jobTitle: dto.jobTitle || null,
        phone: dto.phone || null,
        locale: dto.locale ? normalizeLocale(dto.locale) : null,
        passwordHash: hashPassword(password),
        mustChangePassword: !dto.password,
        status: dto.status || 'active',
        isCompanyAdmin: Boolean(dto.isCompanyAdmin),
      },
    });
    await this.assignRoles(user.id, tenantId, dto.roleKeys || ['regular_user']);
    await this.audit.log({
      action: 'create',
      module: 'users',
      entity: 'user',
      entityId: user.id,
      after: { email, name: user.name, roleKeys: dto.roleKeys || ['regular_user'] },
    });
    return { ...(await this.get(user.id)), temporaryPassword: dto.password ? undefined : password };
  }

  async update(id: string, dto: UserDto) {
    const tenantId = this.tenantId();
    const existing = await this.prisma.base.user.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw notFound();
    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const email = dto.email.toLowerCase();
      if (await this.prisma.base.user.findFirst({ where: { email } })) throw conflict('errors.emailInUse');
    }
    const data: any = {};
    for (const key of ['name', 'jobTitle', 'phone', 'status', 'isCompanyAdmin']) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (dto.email) data.email = dto.email.toLowerCase();
    if (dto.locale !== undefined) data.locale = dto.locale ? normalizeLocale(dto.locale) : null;
    if (dto.password) {
      if (dto.password.length < 8) throw badRequest('errors.invalidPassword');
      data.passwordHash = hashPassword(dto.password);
      data.mustChangePassword = false;
    }
    await this.prisma.base.user.update({ where: { id }, data });
    if (dto.roleKeys) await this.assignRoles(id, tenantId, dto.roleKeys);
    await this.audit.log({ action: 'update', module: 'users', entity: 'user', entityId: id, after: data });
    return this.get(id);
  }

  async remove(id: string, currentUserId: string) {
    const tenantId = this.tenantId();
    if (id === currentUserId) throw badRequest('errors.cannotDeleteSelf');
    const user = await this.prisma.base.user.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!user) throw notFound();
    if (user.isCompanyAdmin) {
      const admins = await this.prisma.base.user.count({ where: { tenantId, isCompanyAdmin: true, deletedAt: null } });
      if (admins <= 1) throw forbidden('errors.lastAdmin');
    }
    await this.prisma.base.userRole.deleteMany({ where: { userId: id } });
    await this.prisma.base.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.base.user.delete({ where: { id } });
    await this.audit.log({
      action: 'delete',
      module: 'users',
      entity: 'user',
      entityId: id,
      before: { email: user.email, name: user.name },
    });
    return { ok: true, id };
  }

  async assignRoles(userId: string, tenantId: string, roleKeys: string[]) {
    const roles = await this.prisma.base.role.findMany({ where: { tenantId, key: { in: roleKeys } } });
    await this.prisma.base.userRole.deleteMany({ where: { userId } });
    for (const role of roles) {
      await this.prisma.base.userRole.create({ data: { tenantId, userId, roleId: role.id } });
    }
    return roles;
  }

}
