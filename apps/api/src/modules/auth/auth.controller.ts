import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, SuperAdminOnly } from '../../common/auth/auth.decorators';
import { AuthService } from './auth.service';
import { KeycloakService } from './keycloak.service';
import { env } from '../../config';
import { parseInput } from '../../common/http/helpers';

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  recaptchaToken: z.string().optional(),
});

const profileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  locale: z.string().max(10).nullable().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().max(200).optional().default(''),
  newPassword: z.string().min(8).max(200),
});

const OIDC_COOKIE = 'grc_oidc';
const ADMIN_COOKIE = 'grc_admin_token';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly keycloak: KeycloakService,
  ) {}

  @Public()
  @Get('config')
  config() {
    return this.auth.config();
  }

  @Public()
  @Post('login')
  async login(@Body() body: unknown, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const dto = parseInput(loginSchema, body);
    const result = await this.auth.login(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
    this.auth.setSessionCookies(res, result);
    return result;
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.grc_refresh;
    const result = await this.auth.refresh(raw, { ip: req.ip, userAgent: req.headers['user-agent'] });
    this.auth.setSessionCookies(res, result);
    return result;
  }

  @Public()
  @Post('logout')
  async logout(@Body() body: { idTokenHint?: string }, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const user = req.user || { id: 'anonymous' };
    return this.auth.logout(user, req.cookies?.grc_refresh, res, body?.idTokenHint);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    if (!user) throw new UnauthorizedException({ messageKey: 'errors.unauthorized' });
    return this.auth.me(user);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const dto = parseInput(profileSchema, body);
    return this.auth.updateProfile(user.id, dto);
  }

  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const dto = parseInput(passwordSchema, body);
    return this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @SuperAdminOnly()
  @Post('impersonate/:tenantId')
  async impersonate(
    @CurrentUser() admin: AuthUser,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenantId = String(req.params?.tenantId || '');
    const result = await this.auth.impersonate(admin, tenantId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.cookie(ADMIN_COOKIE, req.cookies?.['grc_token'] || '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.appUrl.startsWith('https://'),
      path: '/',
    });
    this.auth.setSessionCookies(res, result);
    return result;
  }

  @Post('stop-impersonating')
  async stopImpersonating(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const adminToken = req.cookies?.[ADMIN_COOKIE];
    if (!adminToken) throw new UnauthorizedException({ messageKey: 'auth.sessionExpired' });
    const result = await this.auth.restoreAdmin(adminToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.auth.setSessionCookies(res, result);
    res.clearCookie(ADMIN_COOKIE, { path: '/' });
    return result;
  }

  @Public()
  @Get('keycloak/login')
  keycloakLogin(@Res() res: Response) {
    if (env.authMethod !== 'keycloak') {
      return res.redirect(`${env.appUrl}/login?error=auth.methodNotAvailable`);
    }
    try {
      const { url, oidcState } = this.keycloak.loginUrl();
      res.cookie(OIDC_COOKIE, oidcState, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.appUrl.startsWith('https://'),
        path: '/',
        maxAge: 10 * 60 * 1000,
      });
      return res.redirect(url);
    } catch {
      return res.redirect(`${env.appUrl}/login?error=auth.keycloakNotConfigured`);
    }
  }

  @Public()
  @Get('callback')
  async keycloakCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const cookieState = req.cookies?.[OIDC_COOKIE];
    res.clearCookie(OIDC_COOKIE, { path: '/' });
    if (error || !code) return res.redirect(`${env.appUrl}/login?error=auth.loginFailed`);
    try {
      const parsed = cookieState ? JSON.parse(cookieState) : null;
      if (!parsed || parsed.state !== state) {
        return res.redirect(`${env.appUrl}/login?error=auth.invalidState`);
      }
      const result = await this.keycloak.handleCallback(code, cookieState, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      this.auth.setSessionCookies(res, result.tokens);
      return res.redirect(`${env.appUrl}/dashboard`);
    } catch (err: any) {
      const key = err?.response?.messageKey || 'auth.loginFailed';
      return res.redirect(`${env.appUrl}/login?error=${encodeURIComponent(key)}`);
    }
  }
}
