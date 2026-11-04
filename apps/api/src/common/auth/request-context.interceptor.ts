import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContext } from '../tenant/tenant-context';

/** Opens the AsyncLocalStorage context that scopes every Prisma query. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const ctx = {
      userId: user?.id,
      userEmail: user?.email,
      tenantId: req.tenantId ?? user?.tenantId ?? null,
      isSuperAdmin: user?.isSuperAdmin ?? false,
      isCompanyAdmin: user?.isCompanyAdmin ?? false,
      impersonatedBy: user?.impersonatedBy ?? null,
      permissions: user?.permissions ?? [],
      locale: user?.locale ?? undefined,
      ip: req.ip,
    };
    return tenantContext.run(ctx, () => next.handle());
  }
}
