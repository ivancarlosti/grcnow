import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { parseInput } from '../../common/http/helpers';
import { PERMISSION_MODULES } from '../../common/constants/permissions';
import { tenantContext } from '../../common/tenant/tenant-context';
import { badRequest, forbidden, notFound } from '../../common/http/helpers';
import { AuditService } from '../../common/audit/audit.service';

const roleSchema = z.object({
  key: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().max(80)).default([]),
});

@Controller('api/roles')
export class RolesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @RequirePermissions('roles:read')
  @Get()
  async list() {
    const tenantId = tenantContext.tenantId;
    const roles = await this.prisma.base.role.findMany({
      where: { tenantId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    return { items: roles, total: roles.length };
  }

  @RequirePermissions('roles:read')
  @Get('permissions')
  permissions() {
    return {
      modules: PERMISSION_MODULES.map((m) => ({
        ...m,
        actions: ['read', 'write'],
      })),
      wildcards: ['*', '*:read', 'module:*'],
    };
  }

  @RequirePermissions('roles:write')
  @Post()
  async create(@Body() body: unknown) {
    const dto = parseInput(roleSchema, body);
    const tenantId = tenantContext.tenantId;
    if (!tenantId) throw badRequest('errors.tenantNotFound');
    if (await this.prisma.base.role.findFirst({ where: { tenantId, key: dto.key } })) {
      throw badRequest('errors.conflict');
    }
    const role = await this.prisma.base.role.create({
      data: { tenantId, key: dto.key, name: dto.name, description: dto.description, permissions: dto.permissions },
    });
    await this.audit.log({ action: 'create', module: 'roles', entity: 'role', entityId: role.id, after: role });
    return role;
  }

  @RequirePermissions('roles:write')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseInput(roleSchema.partial(), body);
    const role = await this.prisma.base.role.findFirst({ where: { id } });
    if (!role) throw notFound();
    if (role.isSystem && dto.key && dto.key !== role.key) throw forbidden('errors.forbidden');
    const updated = await this.prisma.base.role.update({
      where: { id },
      data: { name: dto.name, description: dto.description, permissions: dto.permissions, key: dto.key },
    });
    await this.audit.log({ action: 'update', module: 'roles', entity: 'role', entityId: id, after: updated });
    return updated;
  }

  @RequirePermissions('roles:write')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const role = await this.prisma.base.role.findFirst({ where: { id } });
    if (!role) throw notFound();
    if (role.isSystem) throw forbidden('errors.forbidden');
    await this.prisma.base.userRole.deleteMany({ where: { roleId: id } });
    await this.prisma.base.role.delete({ where: { id } });
    await this.audit.log({ action: 'delete', module: 'roles', entity: 'role', entityId: id, before: role });
    return { ok: true, id };
  }
}
