import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../../config';
import { AuthUser, extractToken, IS_PUBLIC_KEY } from './auth.decorators';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest();

    // AUTH_METHOD=none: everything runs as the seeded Super Admin (dev/demo).
    if (env.authMethod === 'none') {
      req.user = await this.noneModeUser();
      return true;
    }

    const token = extractToken(req);
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException({ messageKey: 'errors.unauthorized', message: 'Unauthorized' });
    }

    // Tenant API tokens (integration clients): grc_<id>_<secret>
    if (token.startsWith('grc_')) {
      const apiUser = await this.resolveApiToken(token);
      if (apiUser) {
        req.user = apiUser;
        return true;
      }
      if (isPublic) return true;
      throw new UnauthorizedException({ messageKey: 'errors.unauthorized', message: 'Invalid API token' });
    }

    const payload = await this.verify(token, isPublic);
    if (!payload) return true;
    const user = await this.loadUser(payload.sub);
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException({ messageKey: 'errors.sessionExpired', message: 'Session expired' });
    }
    req.user = {
      ...user,
      impersonatedBy: payload.impersonatedBy || null,
      tenantId: payload.tenantId === undefined ? user.tenantId : payload.tenantId,
      isSuperAdmin: payload.isSuperAdmin ?? user.isSuperAdmin,
      authMethod: 'jwt',
    };
    return true;
  }

  private async verify(token: string, isPublic: boolean): Promise<any> {
    try {
      return await this.jwt.verifyAsync(token, { secret: env.jwtSecret });
    } catch {
      if (isPublic) return null;
      throw new UnauthorizedException({ messageKey: 'errors.unauthorized', message: 'Invalid session' });
    }
  }

  private async loadUser(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.base.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.status === 'disabled') return null;
    const permissions = new Set<string>();
    user.roles.forEach((ur) => (ur.role?.permissions || []).forEach((p) => permissions.add(p)));
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      isCompanyAdmin: user.isCompanyAdmin,
      permissions: [...permissions],
      locale: user.locale,
    };
  }

  private async noneModeUser(): Promise<AuthUser> {
    const admin = await this.prisma.base.user.findFirst({
      where: { isSuperAdmin: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (admin) {
      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        tenantId: null,
        isSuperAdmin: true,
        isCompanyAdmin: true,
        permissions: ['*'],
        locale: admin.locale,
        authMethod: 'none',
      };
    }
    return {
      id: 'dev-super-admin',
      email: env.accountLogin,
      name: 'Super Admin',
      tenantId: null,
      isSuperAdmin: true,
      isCompanyAdmin: true,
      permissions: ['*'],
      authMethod: 'none',
    };
  }

  private async resolveApiToken(raw: string): Promise<AuthUser | null> {
    const token = await this.prisma.base.apiToken.findFirst({
      where: { tokenHash: sha256(raw), revokedAt: null },
    });
    if (!token) return null;
    if (token.expiresAt && token.expiresAt.getTime() < Date.now()) return null;
    await this.prisma.base.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
    const admin = await this.prisma.base.user.findFirst({
      where: { tenantId: token.tenantId, isCompanyAdmin: true, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    const permissions = new Set<string>();
    admin?.roles.forEach((ur) => (ur.role?.permissions || []).forEach((p) => permissions.add(p)));
    token.scopes.forEach((s) => permissions.add(s));
    return {
      id: admin?.id || `token:${token.id}`,
      email: admin?.email || `api-token:${token.name}`,
      name: admin?.name || token.name,
      tenantId: token.tenantId,
      isSuperAdmin: false,
      isCompanyAdmin: true,
      permissions: [...permissions],
      authMethod: 'api_token',
    };
  }
}
