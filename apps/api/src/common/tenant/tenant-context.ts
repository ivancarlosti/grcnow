import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  userId?: string;
  userEmail?: string;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
  isCompanyAdmin?: boolean;
  impersonatedBy?: string | null;
  permissions?: string[];
  locale?: string;
  ip?: string;
}

/** Request-scoped context used by the tenant-aware Prisma client. */
export class TenantContextStore {
  private readonly als = new AsyncLocalStorage<RequestContext>();

  run<T>(ctx: RequestContext, fn: () => T): T {
    return this.als.run(ctx, fn);
  }

  get(): RequestContext | undefined {
    return this.als.getStore();
  }

  get tenantId(): string | null {
    return this.als.getStore()?.tenantId ?? null;
  }
}

export const tenantContext = new TenantContextStore();
