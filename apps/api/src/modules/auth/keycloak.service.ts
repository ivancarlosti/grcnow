import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { hashPassword, randomToken } from '../../common/auth/password';
import { env } from '../../config';
import { AuthService } from './auth.service';
import {
  buildAuthorizationUrl,
  buildLogoutUrl,
  createOidcState,
  exchangeCode,
  isEmailAllowed,
  keycloakConfigured,
  OidcState,
  verifyIdToken,
} from './oidc.util';

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  loginUrl(): { url: string; oidcState: string } {
    if (!keycloakConfigured()) throw new ForbiddenException({ messageKey: 'auth.keycloakNotConfigured' });
    const state = createOidcState(`${env.appUrl}/api/auth/callback`);
    const url = buildAuthorizationUrl(state, state.challenge);
    return { url, oidcState: JSON.stringify(state) };
  }

  async handleCallback(
    code: string,
    rawState: string | undefined,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ tokens: any; user: any }> {
    if (!rawState) throw new ForbiddenException({ messageKey: 'auth.invalidState' });
    let state: OidcState;
    try {
      state = JSON.parse(rawState);
    } catch {
      throw new ForbiddenException({ messageKey: 'auth.invalidState' });
    }
    const tokenResponse = await exchangeCode(code, state.verifier, state.redirectUri);
    if (tokenResponse.error || !tokenResponse.id_token) {
      this.logger.warn(`Keycloak token error: ${tokenResponse.error} ${tokenResponse.error_description}`);
      throw new ForbiddenException({ messageKey: 'auth.invalidState' });
    }
    const claims = await verifyIdToken(tokenResponse.id_token, state.nonce);
    const email = String(claims.email || claims.preferred_username || '').toLowerCase();
    if (!email) throw new ForbiddenException({ messageKey: 'auth.notAllowed' });
    if (!isEmailAllowed(email)) {
      await this.audit.log({
        action: 'login_denied',
        module: 'auth',
        entity: 'user',
        after: { email, reason: 'allow_list' },
        ip: meta.ip,
      });
      throw new ForbiddenException({ messageKey: 'auth.notAllowed' });
    }

    const displayName =
      [claims.given_name, claims.family_name].filter(Boolean).join(' ') || claims.name || email.split('@')[0];
    const user = await this.provision(email, displayName, String(claims.sub || ''));
    const tokens = await this.auth.issueTokens(
      user.id,
      { tenantId: user.tenantId, isSuperAdmin: user.isSuperAdmin, isCompanyAdmin: user.isCompanyAdmin },
      meta,
    );
    await this.prisma.base.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({
      action: 'login_keycloak',
      module: 'auth',
      entity: 'user',
      entityId: user.id,
      after: { email },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { tokens, user: await this.auth.publicUser(user.id) };
  }

  logoutUrl(idTokenHint?: string) {
    return buildLogoutUrl(idTokenHint);
  }

  /** JIT provisioning: existing user → tenant by e-mail domain → unassigned. */
  private async provision(email: string, name: string, keycloakSub: string) {
    const existing = await this.prisma.base.user.findFirst({ where: { email } });
    if (existing) {
      if (!existing.keycloakSub && keycloakSub) {
        await this.prisma.base.user.update({ where: { id: existing.id }, data: { keycloakSub } });
      }
      if (existing.status === 'disabled') throw new ForbiddenException({ messageKey: 'errors.forbidden' });
      return existing;
    }

    const domain = email.split('@')[1];
    const tenant = domain
      ? await this.prisma.base.tenant.findFirst({ where: { domain, deletedAt: null, status: 'active' } })
      : null;

    const user = await this.prisma.base.user.create({
      data: {
        email,
        name,
        keycloakSub: keycloakSub || null,
        tenantId: tenant?.id || null,
        unassigned: !tenant,
        status: 'active',
        locale: tenant?.defaultLocale || null,
        passwordHash: hashPassword(randomToken(16)),
      },
    });

    if (tenant) {
      const roleKey = 'regular_user';
      let role = await this.prisma.base.role.findFirst({ where: { tenantId: tenant.id, key: roleKey } });
      if (!role) {
        role = await this.prisma.base.role.create({
          data: { tenantId: tenant.id, key: roleKey, name: 'Regular User', permissions: ['*:read'] },
        });
      }
      await this.prisma.base.userRole.create({ data: { tenantId: tenant.id, userId: user.id, roleId: role.id } });
    }
    await this.audit.log({
      action: 'provision',
      module: 'auth',
      entity: 'user',
      entityId: user.id,
      after: { email, tenantId: tenant?.id || null },
      tenantId: tenant?.id || null,
    });
    return user;
  }
}
