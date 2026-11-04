import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantContext } from '../tenant/tenant-context';

/**
 * Models that carry tenant_id and must always be filtered by the current tenant.
 * Each of them declares @@unique([tenantId, id]) so composite where clauses are
 * legal for findUnique/update/delete.
 */
export const TENANT_SCOPED_MODELS = new Set<string>([
  'User',
  'BusinessUnit',
  'Asset',
  'Vendor',
  'Control',
  'ControlTest',
  'Risk',
  'RiskReview',
  'RiskMatrix',
  'ComplianceMapping',
  'AuditFinding',
  'Policy',
  'PolicyVersion',
  'ExceptionRecord',
  'Project',
  'Task',
  'Incident',
  'BusinessContinuityPlan',
  'BcpTest',
  'AssessmentTemplate',
  'Assessment',
  'TrainingCourse',
  'TrainingAssignment',
  'AccountReview',
  'AccountReviewItem',
  'WhistleblowingReport',
  'DataFlow',
  'ProcessingActivity',
  'File',
  'Comment',
  'Approval',
  'StatusRule',
  'SavedView',
  'AutomationRule',
  'CustomField',
  'CustomTab',
  'Webhook',
]);

const WHERE_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

const UNIQUE_OPERATIONS = new Set(['findUnique', 'findUniqueOrThrow', 'update', 'delete']);

/**
 * Prisma client wrapper.
 *
 * `db` is an extended client whose every tenant-scoped operation is rewritten on
 * the fly with the tenant coming from AsyncLocalStorage. This is the single
 * enforcement point of data isolation: no service can forget the tenant filter.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly base = new PrismaClient({
    log: process.env.PRISMA_LOG === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

  readonly db: PrismaClient;

  constructor() {
    const extended = this.base.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const ctx = tenantContext.get();
            const tenantId = ctx?.tenantId || null;
            if (!tenantId || !model || !TENANT_SCOPED_MODELS.has(model)) {
              return query(args);
            }
            const next: any = { ...(args || {}) };
            if (WHERE_OPERATIONS.has(operation)) {
              next.where = { ...(next.where || {}), tenantId };
            } else if (UNIQUE_OPERATIONS.has(operation)) {
              next.where = { ...(next.where || {}), tenantId };
            } else if (operation === 'create') {
              next.data = { ...(next.data || {}), tenantId };
            } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
              next.data = Array.isArray(next.data)
                ? next.data.map((d: any) => ({ ...d, tenantId }))
                : { ...(next.data || {}), tenantId };
            } else if (operation === 'upsert') {
              next.where = { ...(next.where || {}), tenantId };
              next.create = { ...(next.create || {}), tenantId };
            }
            return query(next);
          },
        },
      },
    });
    this.db = extended as unknown as PrismaClient;
  }

  async onModuleInit() {
    await this.base.$connect();
  }

  async onModuleDestroy() {
    await this.base.$disconnect();
  }
}
