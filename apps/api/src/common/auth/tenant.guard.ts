import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Resolves and validates the active tenant for the request.
 *  - company users: their own tenant, blocked when suspended
 *  - super admin: optional x-tenant-id header selects the tenant context
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      req.tenantId = null;
      return true;
    }

    if (user.isSuperAdmin) {
      const headerTenant = req.headers['x-tenant-id'] || req.query?.tenantId;
      if (headerTenant && headerTenant !== 'all') {
        const tenant = await this.prisma.base.tenant.findFirst({
          where: { id: String(headerTenant), deletedAt: null },
        });
        if (!tenant) throw new ForbiddenException({ messageKey: 'errors.tenantNotFound' });
        req.tenantId = tenant.id;
        req.tenant = tenant;
      } else {
        req.tenantId = null;
        req.tenant = null;
      }
      return true;
    }

    if (!user.tenantId) {
      req.tenantId = null;
      return true;
    }

    const tenant = await this.prisma.base.tenant.findFirst({
      where: { id: user.tenantId, deletedAt: null },
    });
    if (!tenant) throw new ForbiddenException({ messageKey: 'errors.tenantNotFound' });
    if (tenant.status !== 'active') {
      throw new ForbiddenException({ messageKey: 'errors.tenantSuspended' });
    }
    req.tenantId = tenant.id;
    req.tenant = tenant;
    return true;
  }
}
