import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const MODULE_ALIASES: Record<string, string> = {
  'business-units': 'businessUnits',
  'control-tests': 'controls',
  'risk-reviews': 'risks',
  'compliance-mappings': 'compliance',
  'policy-versions': 'policies',
  'audit-findings': 'findings',
  'account-reviews': 'accountReviews',
  'training-courses': 'training',
  'data-flows': 'dataFlows',
  'processing-activities': 'ropa',
};

/** Records every mutating API call in the immutable audit trail. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = String(req.method || '').toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next.handle();
    const path = String(req.originalUrl || req.url || '');
    if (path.includes('/audit-logs') || path.includes('/notifications')) return next.handle();

    const segments = path.split('?')[0].split('/').filter(Boolean); // api, module, id...
    const rawModule = segments[1] || 'unknown';
    const module = MODULE_ALIASES[rawModule] || rawModule;
    const action = method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'update';

    return next.handle().pipe(
      tap({
        next: (response) => {
          const entityId =
            (response && (response.id || (response.data && response.data.id))) || req.params?.id || undefined;
          void this.audit.log({
            action: path.includes('/import') ? 'import' : path.includes('/export') ? 'export' : action,
            module,
            entity: module,
            entityId: entityId ? String(entityId) : undefined,
            after: method === 'DELETE' ? undefined : this.body(req),
            ip: req.ip,
            userAgent: req.headers?.['user-agent'],
          });
        },
      }),
    );
  }

  private body(req: any) {
    const body = req.body;
    if (!body || typeof body !== 'object') return undefined;
    const clone: any = { ...body };
    delete clone.password;
    delete clone.passwordConfirm;
    delete clone.recaptchaToken;
    return clone;
  }
}
