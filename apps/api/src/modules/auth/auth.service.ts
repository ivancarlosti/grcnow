import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { env } from '../../config';
import { hashPassword, randomToken, safeEqual, verifyPassword } from '../../common/auth/password';
import { badRequest } from '../../common/http/helpers';
import { COOKIE_NAME, REFRESH_COOKIE_NAME, AuthUser } from '../../common/auth/auth.decorators';
import { SettingsService } from '../settings/settings.service';
import { buildLogoutUrl } from './oidc.util';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------- helpers
  private cookieOptions(maxAgeSeconds?: number) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: env.appUrl.startsWith('https://'),
      path: '/',
      ...(maxAgeSeconds ? { maxAge: maxAgeSeconds * 1000 } : {}),
    };
  }

  async publicUser(userId: string) {
    const user = await this.prisma.base.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: true } }, tenant: true },
    });
    if (!user) throw new UnauthorizedException({ messageKey: 'errors.unauthorized' });
    const permissions = new Set<string>();
    user.roles.forEach((r) => (r.role?.permissions || []).forEach((p) => permissions.add(p)));
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      jobTitle: user.jobTitle,
      phone: user.phone,
      locale: user.locale,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      isCompanyAdmin: user.isCompanyAdmin,
      unassigned: user.unassigned,
      avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            logoUrl: user.tenant.logoUrl,
            primaryColor: user.tenant.primaryColor,
            defaultLocale: user.tenant.defaultLocale,
            status: user.tenant.status,
          }
        : null,
      roles: user.roles.map((r) => ({
        id: r.role.id,
        key: r.role.key,
        name: r.role.name,
        permissions: r.role.permissions,
      })),
      permissions: [...permissions],
    };
  }

  async me(user: { id: string }) {
    const profile = await this.publicUser(user.id);
    const tenants = profile.isSuperAdmin
      ? await this.prisma.base.tenant.findMany({
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, slug: true, status: true, logoUrl: true, defaultLocale: true },
        })
      : [];
    const unread = await this.prisma.base.notification.count({
      where: { userId: user.id, readAt: null },
    });
    return { ...profile, tenants, unreadNotifications: unread, authMethod: env.authMethod };
  }

  async issueTokens(
    userId: string,
    opts: { tenantId: string | null; isSuperAdmin: boolean; isCompanyAdmin: boolean; impersonatedBy?: string | null },
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; expiresAt: string }> {
    const user = await this.prisma.base.user.findFirst({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ messageKey: 'errors.unauthorized' });
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: opts.tenantId,
      isSuperAdmin: opts.isSuperAdmin,
      isCompanyAdmin: opts.isCompanyAdmin,
      impersonatedBy: opts.impersonatedBy || null,
    };
    const accessToken = await this.jwt.signAsync(payload, { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn as any });
    const decoded: any = this.jwt.decode(accessToken);
    const refreshToken = randomToken(48);
    await this.prisma.base.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + env.refreshDays * 24 * 3600 * 1000),
        ip: meta.ip,
        userAgent: meta.userAgent,
        impersonatedBy: opts.impersonatedBy || null,
      },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: decoded?.exp && decoded?.iat ? decoded.exp - decoded.iat : 8 * 3600,
      expiresAt: new Date((decoded?.exp || 0) * 1000).toISOString(),
    };
  }

  setSessionCookies(res: any, tokens: { accessToken: string; refreshToken: string; expiresIn: number }) {
    res.cookie(COOKIE_NAME, tokens.accessToken, this.cookieOptions(tokens.expiresIn));
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, this.cookieOptions(env.refreshDays * 24 * 3600));
  }

  clearSessionCookies(res: any) {
    res.clearCookie(COOKIE_NAME, this.cookieOptions());
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
  }

  // ------------------------------------------------------------------ login
  async login(
    dto: { email: string; password: string; recaptchaToken?: string },
    meta: { ip?: string; userAgent?: string },
  ) {
    if (env.authMethod === 'keycloak') throw badRequest('auth.useKeycloak');
    if (env.authMethod === 'none') throw badRequest('auth.loginDisabled');

    try {
      await this.settings.verifyRecaptcha(dto.recaptchaToken, meta.ip, 'login');
    } catch {
      throw badRequest('auth.captchaFailed');
    }

    const email = String(dto.email || '').trim().toLowerCase();
    const password = String(dto.password || '');
    if (!email || !password) throw badRequest('errors.validation');

    let userId: string | null = null;

    // The environment-provided account always maps to the Super Admin identity.
    if (email === env.accountLogin.toLowerCase() && safeEqual(password, env.accountPassword)) {
      const superAdmin =
        (await this.prisma.base.user.findFirst({ where: { isSuperAdmin: true, deletedAt: null } })) ||
        (await this.prisma.base.user.create({
          data: {
            email,
            name: 'Super Admin',
            isSuperAdmin: true,
            isCompanyAdmin: true,
            passwordHash: hashPassword(password),
          },
        }));
      userId = superAdmin.id;
    } else {
      const user = await this.prisma.base.user.findFirst({ where: { email, deletedAt: null } });
      if (!user || !verifyPassword(password, user.passwordHash)) {
        await this.audit.log({ action: 'login_failed', module: 'auth', entity: 'user', after: { email }, ip: meta.ip });
        throw new UnauthorizedException({ messageKey: 'auth.invalidCredentials' });
      }
      if (user.status === 'disabled') throw new ForbiddenException({ messageKey: 'errors.forbidden' });
      userId = user.id;
    }

    const user = await this.prisma.base.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ messageKey: 'auth.invalidCredentials' });
    if (!user.isSuperAdmin && user.tenantId) {
      const tenant = await this.prisma.base.tenant.findUnique({ where: { id: user.tenantId } });
      if (!tenant || tenant.status !== 'active') throw new ForbiddenException({ messageKey: 'errors.tenantSuspended' });
    }

    const tokens = await this.issueTokens(
      user.id,
      { tenantId: user.tenantId, isSuperAdmin: user.isSuperAdmin, isCompanyAdmin: user.isCompanyAdmin },
      meta,
    );
    await this.prisma.base.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({
      action: 'login',
      module: 'auth',
      entity: 'user',
      entityId: user.id,
      after: { email: user.email },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { ...tokens, user: await this.publicUser(user.id) };
  }

  async refresh(rawToken: string | undefined, meta: { ip?: string; userAgent?: string }) {
    if (!rawToken) throw new UnauthorizedException({ messageKey: 'auth.sessionExpired' });
    const row = await this.prisma.base.refreshToken.findFirst({
      where: { tokenHash: sha256(rawToken), revokedAt: null },
    });
    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({ messageKey: 'auth.sessionExpired' });
    }
    const user = await this.prisma.base.user.findFirst({ where: { id: row.userId, deletedAt: null } });
    if (!user || user.status === 'disabled') throw new UnauthorizedException({ messageKey: 'errors.unauthorized' });

    await this.prisma.base.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    const tokens = await this.issueTokens(
      user.id,
      {
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin,
        isCompanyAdmin: user.isCompanyAdmin,
        impersonatedBy: row.impersonatedBy,
      },
      meta,
    );
    return { ...tokens, user: await this.publicUser(user.id) };
  }

  async logout(user: { id: string }, rawToken: string | undefined, res: any, idTokenHint?: string) {
    if (rawToken) {
      await this.prisma.base.refreshToken.updateMany({
        where: { tokenHash: sha256(rawToken) },
        data: { revokedAt: new Date() },
      });
    }
    this.clearSessionCookies(res);
    await this.audit.log({ action: 'logout', module: 'auth', entity: 'user', entityId: user?.id });
    return {
      ok: true,
      redirectUrl: env.authMethod === 'keycloak' ? buildLogoutUrl(idTokenHint) : null,
    };
  }

  async updateProfile(userId: string, dto: { name?: string; jobTitle?: string; phone?: string; locale?: string | null }) {
    const data: any = {};
    if (dto.name !== undefined) data.name = String(dto.name).trim();
    if (dto.jobTitle !== undefined) data.jobTitle = dto.jobTitle;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.locale !== undefined) data.locale = dto.locale || null;
    await this.prisma.base.user.update({ where: { id: userId }, data });
    await this.audit.log({ action: 'update', module: 'profile', entity: 'user', entityId: userId, after: data });
    return this.publicUser(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.base.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ messageKey: 'errors.unauthorized' });
    const isEnvAccount = user.email.toLowerCase() === env.accountLogin.toLowerCase();
    if (!isEnvAccount && !verifyPassword(currentPassword, user.passwordHash)) {
      throw badRequest('auth.invalidCredentials');
    }
    if (!newPassword || newPassword.length < 8) throw badRequest('errors.invalidPassword');
    await this.prisma.base.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword), mustChangePassword: false },
    });
    await this.audit.log({ action: 'change_password', module: 'auth', entity: 'user', entityId: userId });
    return { ok: true };
  }

  /** Super Admin opens a company as its Company Admin (audited impersonation). */
  async impersonate(admin: AuthUser, tenantId: string, meta: { ip?: string; userAgent?: string }) {
    const tenant = await this.prisma.base.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw badRequest('errors.tenantNotFound');
    const target =
      (await this.prisma.base.user.findFirst({
        where: { tenantId, isCompanyAdmin: true, deletedAt: null, status: 'active' },
        orderBy: { createdAt: 'asc' },
      })) ||
      (await this.prisma.base.user.findFirst({
        where: { tenantId, deletedAt: null, status: 'active' },
        orderBy: { createdAt: 'asc' },
      }));
    if (!target) throw badRequest('errors.notFound');
    const tokens = await this.issueTokens(
      target.id,
      { tenantId, isSuperAdmin: false, isCompanyAdmin: true, impersonatedBy: admin.id },
      meta,
    );
    await this.audit.log({
      action: 'impersonate',
      module: 'tenants',
      entity: 'tenant',
      entityId: tenantId,
      after: { targetUserId: target.id, targetEmail: target.email },
      actorId: admin.id,
      actorEmail: admin.email,
      tenantId,
    });
    return { ...tokens, user: await this.publicUser(target.id) };
  }

  /** Restores the Super Admin session after an impersonation. */
  async restoreAdmin(rawAdminToken: string, meta: { ip?: string; userAgent?: string }) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(rawAdminToken, { secret: env.jwtSecret });
    } catch {
      throw new UnauthorizedException({ messageKey: 'auth.sessionExpired' });
    }
    if (!payload?.isSuperAdmin) throw new ForbiddenException({ messageKey: 'errors.superAdminOnly' });
    const user = await this.prisma.base.user.findFirst({ where: { id: payload.sub, deletedAt: null } });
    if (!user) throw new UnauthorizedException({ messageKey: 'errors.unauthorized' });
    const tokens = await this.issueTokens(
      user.id,
      { tenantId: null, isSuperAdmin: true, isCompanyAdmin: user.isCompanyAdmin },
      meta,
    );
    return { ...tokens, user: await this.publicUser(user.id) };
  }

  async config() {
    const recaptcha = await this.settings.recaptcha();
    return {
      authMethod: env.authMethod,
      recaptchaSiteKey: recaptcha.enabled ? recaptcha.siteKey : null,
      defaultLocale: await this.settings.defaultLocale(),
      storageDriver: env.storageDriver,
      appName: (await this.settings.get(null, 'app_name', 'GRC Platform')) || 'GRC Platform',
      keycloakEnabled: env.authMethod === 'keycloak',
    };
  }
}
