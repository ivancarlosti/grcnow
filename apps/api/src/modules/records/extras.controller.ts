import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthUser, CurrentUser, RequirePermissions } from '../../common/auth/auth.decorators';
import { notFound, badRequest } from '../../common/http/helpers';
import { tenantContext } from '../../common/tenant/tenant-context';

@Controller('api/policies')
export class PolicyExtrasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @RequirePermissions('policies:read')
  @Get(':id/versions')
  async versions(@Param('id') id: string) {
    const policy = await this.prisma.db.policy.findFirst({ where: { id } });
    if (!policy) throw notFound();
    const items = await this.prisma.db.policyVersion.findMany({
      where: { policyId: id },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  }

  @RequirePermissions('policies:read')
  @Get(':id/acknowledgements')
  async acknowledgements(@Param('id') id: string) {
    const items = await this.prisma.db.policyAck.findMany({ where: { policyId: id } });
    const userIds = items.map((a) => a.userId);
    const users = userIds.length
      ? await this.prisma.db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
      : [];
    const map = new Map(users.map((u) => [u.id, u]));
    const totalUsers = await this.prisma.db.user.count({ where: { status: 'active' } });
    return {
      totalUsers,
      acknowledged: items.length,
      items: items.map((ack) => ({ ...ack, user: map.get(ack.userId) || null })),
    };
  }

  @Post(':id/acknowledge')
  async acknowledge(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const policy = await this.prisma.db.policy.findFirst({ where: { id } });
    if (!policy) throw notFound();
    const existing = await this.prisma.db.policyAck.findFirst({ where: { policyId: id, userId: user.id } });
    if (existing) return existing;
    const ack = await this.prisma.db.policyAck.create({
      data: { tenantId: tenantContext.tenantId as string, policyId: id, userId: user.id },
    });
    await this.audit.log({ action: 'acknowledge', module: 'policies', entity: 'policy', entityId: id });
    return ack;
  }

  @RequirePermissions('policies:write')
  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const policy = await this.prisma.db.policy.findFirst({ where: { id } });
    if (!policy) throw notFound();
    const updated = await this.prisma.db.policy.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date(), approvedAt: policy.approvedAt || new Date(), approvedBy: policy.approvedBy || user.id },
    });
    await this.audit.log({ action: 'publish', module: 'policies', entity: 'policy', entityId: id });
    return updated;
  }

  @RequirePermissions('policies:write')
  @Post(':id/versions')
  async newVersion(
    @Param('id') id: string,
    @Body() body: { version: string; content?: string; changeSummary?: string },
    @CurrentUser() user: AuthUser,
  ) {
    if (!body?.version) throw badRequest('errors.validation');
    const policy = await this.prisma.db.policy.findFirst({ where: { id } });
    if (!policy) throw notFound();
    const version = await this.prisma.db.policyVersion.create({
      data: {
        tenantId: tenantContext.tenantId as string,
        policyId: id,
        version: body.version,
        content: body.content ?? policy.content,
        changeSummary: body.changeSummary || null,
        createdBy: user.id,
      },
    });
    await this.prisma.db.policy.update({
      where: { id },
      data: {
        version: body.version,
        content: body.content ?? policy.content,
        status: 'review',
        approvedAt: null,
        approvedBy: null,
        publishedAt: null,
      },
    });
    await this.audit.log({ action: 'update', module: 'policies', entity: 'policy', entityId: id, after: { version: body.version } });
    return version;
  }
}

@Controller('api/risk-matrix')
export class RiskMatrixController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermissions('risks:read')
  @Get()
  async get() {
    const matrix = await this.prisma.db.riskMatrix.findFirst({ where: { isDefault: true } });
    if (!matrix) return { appetite: 12, thresholds: [], likelihoodScale: [], impactScale: [] };
    return matrix;
  }

  @RequirePermissions('risks:write')
  @Put()
  async update(@Body() body: { appetite?: number; thresholds?: any[] }) {
    const matrix = await this.prisma.db.riskMatrix.findFirst({ where: { isDefault: true } });
    if (!matrix) throw notFound();
    return this.prisma.db.riskMatrix.update({
      where: { id: matrix.id },
      data: {
        appetite: body.appetite !== undefined ? Number(body.appetite) : matrix.appetite,
        thresholds: (body.thresholds as any) || (matrix.thresholds as any),
      },
    });
  }
}
