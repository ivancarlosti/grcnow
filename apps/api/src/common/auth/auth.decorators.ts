import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  impersonatedBy?: string | null;
  permissions: string[];
  locale?: string | null;
  authMethod?: string;
}

export const IS_PUBLIC_KEY = 'grc:public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'grc:permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const SUPER_ADMIN_KEY = 'grc:super_admin_only';
export const SuperAdminOnly = () => SetMetadata(SUPER_ADMIN_KEY, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as AuthUser;
});

export const ReqCtx = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return {
    user: req.user as AuthUser | undefined,
    tenantId: req.tenantId as string | null,
    ip: req.ip as string,
    userAgent: req.headers['user-agent'] as string,
  };
});

export const COOKIE_NAME = 'grc_token';
export const REFRESH_COOKIE_NAME = 'grc_refresh';

export function extractToken(req: any): string | null {
  const header = req.headers?.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  return null;
}

export function hasPermission(user: AuthUser | undefined, required: string): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (!required) return true;
  const [mod, act] = required.split(':');
  return user.permissions.some((p) => {
    if (p === '*' || p === required) return true;
    if (p === `${mod}:*`) return true;
    if (p === `*:${act}`) return true;
    return false;
  });
}
