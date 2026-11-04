import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AuditService } from './audit/audit.service';
import { EventsService } from './events/events.service';
import { StatusRulesService } from './status/status-rules.service';
import { CrudService } from './crud/crud.service';

/**
 * Shared infrastructure providers. Kept global so feature modules can inject
 * them without re-importing, and so Prisma stays a single connection pool.
 */
@Global()
@Module({
  providers: [PrismaService, AuditService, EventsService, StatusRulesService, CrudService],
  exports: [PrismaService, AuditService, EventsService, StatusRulesService, CrudService],
})
export class CoreModule {}
