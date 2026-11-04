import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, PERMISSIONS_KEY, SUPER_ADMIN_KEY } from './auth.decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const superAdminOnly = this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // public routes

    if (superAdminOnly && !user.isSuperAdmin) {
      throw new ForbiddenException({ messageKey: 'errors.superAdminOnly', message: 'Super Admin only' });
    }

    if (required && required.length) {
      const ok = required.every((permission) => hasPermission(user, permission));
      if (!ok) {
        throw new ForbiddenException({
          messageKey: 'errors.forbidden',
          message: `Missing permission: ${required.join(', ')}`,
        });
      }
    }
    return true;
  }
}
