import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthUser, CurrentUser, RequirePermissions } from '../../common/auth/auth.decorators';
import { badRequest, notFound } from '../../common/http/helpers';
import { tenantContext } from '../../common/tenant/tenant-context';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Controller('api/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @RequirePermissions('audit:read')
  @Get()
  list(@Query() query: Record<string, any>) {
    return this.audit.list({
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 50,
      module: query.module,
      action: query.action,
      actorId: query.actorId,
    });
  }
}

@Controller('api/api-tokens')
export class ApiTokensController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @RequirePermissions('settings:read')
  @Get()
  async list() {
    const items = await this.prisma.db.apiToken.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return { items: items.map(({ tokenHash, ...rest }) => rest) };
  }

  @RequirePermissions('settings:write')
  @Post()
  async create(
    @Body() body: { name: string; scopes?: string[]; expiresInDays?: number },
    @CurrentUser() user: AuthUser,
  ) {
    if (!body?.name) throw badRequest('errors.validation');
    const id = `tok${randomBytes(8).toString('hex')}`;
    const secret = randomBytes(24).toString('hex');
    const token = `grc_${id}_${secret}`;
    const expiresAt = body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 24 * 3600 * 1000) : null;
    const created = await this.prisma.db.apiToken.create({
      data: {
        id,
        tenantId: tenantContext.tenantId,
        name: body.name,
        tokenHash: sha256(token),
        scopes: body.scopes || ['*:read'],
        createdBy: user.id,
        expiresAt,
      },
    });
    await this.audit.log({ action: 'create', module: 'api-tokens', entity: 'token', entityId: created.id });
    return { id: created.id, name: created.name, token, scopes: created.scopes, expiresAt };
  }

  @RequirePermissions('settings:write')
  @Delete(':id')
  async revoke(@Param('id') id: string) {
    const token = await this.prisma.db.apiToken.findFirst({ where: { id } });
    if (!token) throw notFound();
    await this.prisma.db.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
    await this.audit.log({ action: 'delete', module: 'api-tokens', entity: 'token', entityId: id });
    return { ok: true };
  }
}
