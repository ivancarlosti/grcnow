import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, Type } from '@nestjs/common';
import type { Response } from 'express';
import { CrudService } from './crud.service';
import { ModuleDef } from './types';
import { RequirePermissions } from '../auth/auth.decorators';
import { parseInput } from '../http/helpers';
import { z } from 'zod';

const importSchema = z.object({ csv: z.string().min(1).max(5_000_000) });

const CRUD_PERMISSIONS: Record<string, string> = {
  list: 'read',
  get: 'read',
  meta: 'read',
  options: 'read',
  exportCsv: 'read',
  importCsv: 'write',
  create: 'write',
  update: 'write',
  remove: 'write',
};

/**
 * Builds a fully functional REST controller for a module definition.
 * Every module gets list/search/filter/sort/pagination, CRUD, metadata,
 * relation options and CSV import/export with permission checks.
 */
export function createCrudController(def: ModuleDef): Type<any> {
  @Controller(`api/${def.key}`)
  class CrudController {
    constructor(private readonly crud: CrudService) {}

    @Get()
    list(@Query() query: Record<string, any>) {
      return this.crud.list(def, query);
    }

    @Get('meta')
    meta() {
      return this.crud.meta(def);
    }

    @Get('options')
    options() {
      return def.key === 'users' ? this.crud.userOptions() : this.crud.options(def);
    }

    @Get('export')
    async exportCsv(@Query() query: Record<string, any>, @Res() res: Response) {
      const csv = await this.crud.exportCsv(def, query);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${def.key}.csv"`);
      return res.send(csv);
    }

    @Post('import')
    importCsv(@Body() body: unknown) {
      const { csv } = parseInput(importSchema, body);
      return this.crud.importCsv(def, csv);
    }

    @Get(':id')
    get(@Param('id') id: string) {
      return this.crud.get(def, id);
    }

    @Post()
    create(@Body() body: Record<string, any>) {
      return this.crud.create(def, body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: Record<string, any>) {
      return this.crud.update(def, id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.crud.remove(def, id);
    }
  }

  for (const [method, action] of Object.entries(CRUD_PERMISSIONS)) {
    const descriptor = Object.getOwnPropertyDescriptor(CrudController.prototype, method);
    if (descriptor) {
      RequirePermissions(`${def.permission}:${action}`)(CrudController.prototype, method, descriptor);
    }
  }
  return CrudController;
}
