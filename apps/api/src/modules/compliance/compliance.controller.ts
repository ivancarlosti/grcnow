import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ComplianceService } from './compliance.service';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { parseInput } from '../../common/http/helpers';

const mapSchema = z.object({
  requirementId: z.string().min(3),
  entityType: z.enum(['control', 'policy', 'risk', 'project', 'exception']),
  entityId: z.string().min(3),
  status: z.enum(['implemented', 'partial', 'not_implemented', 'not_applicable']).optional(),
  notes: z.string().max(2000).optional(),
});

@Controller('api/compliance')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @RequirePermissions('compliance:read')
  @Get('packages')
  packages() {
    return this.compliance.packages();
  }

  @RequirePermissions('compliance:read')
  @Get('packages/:id/analysis')
  analysis(@Param('id') id: string) {
    return this.compliance.analysis(id);
  }

  @RequirePermissions('compliance:read')
  @Get('packages/:id/requirements')
  requirements(@Param('id') id: string, @Query('q') q: string, @Query('page') page: string) {
    return this.compliance.requirements(id, q, Number(page) || 1, 50);
  }

  @RequirePermissions('compliance:write')
  @Post('packages/:id/adopt')
  adopt(@Param('id') id: string) {
    return this.compliance.adopt(id);
  }

  @RequirePermissions('compliance:write')
  @Post('packages/import')
  importPackage(@Body() body: any) {
    return this.compliance.importPackage(body);
  }

  @RequirePermissions('compliance:write')
  @Post('mappings')
  map(@Body() body: unknown) {
    return this.compliance.map(parseInput(mapSchema, body));
  }

  @RequirePermissions('compliance:write')
  @Delete('mappings/:id')
  unmap(@Param('id') id: string) {
    return this.compliance.unmap(id);
  }
}
