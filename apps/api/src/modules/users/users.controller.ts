import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { UsersService } from './users.service';
import { AuthUser, CurrentUser, RequirePermissions } from '../../common/auth/auth.decorators';
import { parseInput } from '../../common/http/helpers';

const roleKeys = z.array(z.string().max(60)).max(20);

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(160),
  password: z.string().min(8).max(200).optional(),
  jobTitle: z.string().max(160).optional(),
  phone: z.string().max(60).optional(),
  locale: z.string().max(10).nullable().optional(),
  roleKeys: roleKeys.optional(),
  status: z.enum(['active', 'disabled', 'invited']).optional(),
  isCompanyAdmin: z.boolean().optional(),
});

const updateSchema = createSchema.partial().extend({ email: z.string().email().optional() });

@Controller('api/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions('users:read')
  @Get()
  list(@Query() query: Record<string, string>) {
    return this.users.list(query);
  }

  @RequirePermissions('users:read')
  @Get('options')
  async options() {
    return this.users.options();
  }

  @RequirePermissions('users:read')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @RequirePermissions('users:write')
  @Post()
  create(@Body() body: unknown) {
    return this.users.create(parseInput(createSchema, body));
  }

  @RequirePermissions('users:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.users.update(id, parseInput(updateSchema, body));
  }

  @RequirePermissions('users:write')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.users.remove(id, user.id);
  }
}
