import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { TenantsService } from './tenants.service';
import { RequirePermissions, SuperAdminOnly } from '../../common/auth/auth.decorators';
import { parseInput } from '../../common/http/helpers';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().max(60).optional(),
  domain: z.string().max(120).optional(),
  defaultLocale: z.string().max(10).optional(),
  primaryColor: z.string().max(20).optional(),
  adminEmail: z.string().email(),
  adminName: z.string().max(120).optional(),
  adminPassword: z.string().min(8).max(200).optional(),
  plan: z.string().max(40).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  domain: z.string().max(120).nullable().optional(),
  defaultLocale: z.string().max(10).nullable().optional(),
  primaryColor: z.string().max(20).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  plan: z.string().max(40).optional(),
  timezone: z.string().max(60).optional(),
});

@Controller('api/tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('current')
  async current(@Req() req: any) {
    if (!req.tenantId) return { tenant: null };
    const tenant = await this.tenants.get(req.tenantId);
    const usage = await this.tenants.list();
    return { tenant, usage: usage.items.find((t) => t.id === tenant.id)?.usage || null };
  }

  @SuperAdminOnly()
  @Get()
  list() {
    return this.tenants.list();
  }

  @SuperAdminOnly()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.tenants.get(id);
  }

  @SuperAdminOnly()
  @RequirePermissions('tenants:write')
  @Post()
  create(@Body() body: unknown) {
    const dto = parseInput(createSchema, body);
    return this.tenants.create(dto);
  }

  @SuperAdminOnly()
  @RequirePermissions('tenants:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseInput(updateSchema, body);
    return this.tenants.update(id, dto);
  }

  @SuperAdminOnly()
  @RequirePermissions('tenants:write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenants.remove(id);
  }
}
