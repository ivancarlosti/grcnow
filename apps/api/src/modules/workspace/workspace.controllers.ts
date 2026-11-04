import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SearchService } from './search.service';
import { SettingsService } from '../settings/settings.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  AuthUser,
  CurrentUser,
  RequirePermissions,
  SuperAdminOnly,
} from '../../common/auth/auth.decorators';
import { parseInput, badRequest, notFound } from '../../common/http/helpers';
import { tenantContext } from '../../common/tenant/tenant-context';
import { env, LOCALES, normalizeLocale, persistEnv } from '../../config';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Controller('api/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  run(@Query('q') q: string) {
    return this.search.search(q);
  }
}

const commentSchema = z.object({ entity: z.string().min(2), entityId: z.string().min(2), body: z.string().min(1).max(5000) });

@Controller('api/comments')
export class CommentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @RequirePermissions('comments:read')
  @Get()
  async list(@Query('entity') entity: string, @Query('entityId') entityId: string) {
    const items = await this.prisma.db.comment.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    const authorIds = [...new Set(items.map((c) => c.authorId).filter(Boolean))] as string[];
    const authors = authorIds.length
      ? await this.prisma.base.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(authors.map((a) => [a.id, a.name]));
    return { items: items.map((comment) => ({ ...comment, authorName: comment.authorId ? names.get(comment.authorId) : null })) };
  }

  @RequirePermissions('comments:write')
  @Post()
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const dto = parseInput(commentSchema, body);
    const created = await this.prisma.db.comment.create({
      data: { ...dto, authorId: user.id, tenantId: tenantContext.tenantId as string },
    });
    await this.audit.log({
      action: 'create',
      module: 'comments',
      entity: dto.entity,
      entityId: dto.entityId,
      after: { body: dto.body },
    });
    return { ...created, authorName: user.name };
  }

  @RequirePermissions('comments:write')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.db.comment.delete({ where: { id } });
    return { ok: true };
  }
}

@Controller('api/saved-views')
export class SavedViewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('module') module?: string) {
    const items = await this.prisma.db.savedView.findMany({
      where: { userId: user.id, ...(module ? { module } : {}) },
      orderBy: { createdAt: 'asc' },
    });
    return { items };
  }

  @Post()
  create(@Body() body: { module: string; name: string; query: any; isShared?: boolean }, @CurrentUser() user: AuthUser) {
    if (!body?.module || !body?.name) throw badRequest('errors.validation');
    return this.prisma.db.savedView.create({
      data: {
        tenantId: tenantContext.tenantId as string,
        userId: user.id,
        module: body.module,
        name: body.name,
        query: body.query || {},
        isShared: Boolean(body.isShared),
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.prisma.db.savedView.deleteMany({ where: { id, userId: user.id } });
    return { ok: true };
  }
}
