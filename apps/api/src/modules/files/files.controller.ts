import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthUser, CurrentUser, RequirePermissions } from '../../common/auth/auth.decorators';
import { env } from '../../config';
import { AuditService } from '../../common/audit/audit.service';
import { tenantContext } from '../../common/tenant/tenant-context';

@Controller('api/files')
export class FilesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: env.storageMaxFileMb * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: any,
    @Body() body: { entity?: string; entityId?: string; category?: string },
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException({ messageKey: 'errors.validation' });
    const tenantId = tenantContext.tenantId || user.tenantId;
    if (!tenantId) throw new BadRequestException({ messageKey: 'errors.tenantNotFound' });
    const stored = await this.storage.put(
      tenantId,
      file.buffer,
      file.originalname,
      file.mimetype,
      body.category || body.entity || 'general',
    );
    const record = await this.prisma.db.file.create({
      data: {
        tenantId,
        storageKey: stored.key,
        filename: file.originalname,
        mime: file.mimetype,
        size: file.size,
        driver: stored.driver,
        category: body.category || null,
        entity: body.entity || null,
        entityId: body.entityId || null,
        uploadedBy: user.id,
      },
    });
    await this.audit.log({
      action: 'upload',
      module: 'files',
      entity: body.entity || 'file',
      entityId: record.id,
      after: { filename: record.filename, size: record.size },
    });
    return record;
  }

  @Get()
  async list(@Query('entity') entity?: string, @Query('entityId') entityId?: string) {
    const where: any = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    const items = await this.prisma.db.file.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    return { items };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const file = await this.prisma.db.file.findFirst({ where: { id } });
    if (!file) throw new NotFoundException({ messageKey: 'errors.notFound' });
    return file;
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const file = await this.prisma.db.file.findFirst({ where: { id } });
    if (!file) throw new NotFoundException({ messageKey: 'errors.notFound' });
    const presigned = await this.storage.presignedUrl(file.storageKey);
    if (presigned) return res.redirect(presigned);
    res.setHeader('Content-Type', file.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    const stream = await this.storage.stream(file.storageKey);
    return (stream as any).pipe(res);
  }

  @RequirePermissions('files:write')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const file = await this.prisma.db.file.findFirst({ where: { id } });
    if (!file) throw new NotFoundException({ messageKey: 'errors.notFound' });
    await this.storage.delete(file.storageKey);
    await this.prisma.db.file.delete({ where: { id } });
    await this.audit.log({ action: 'delete', module: 'files', entity: 'file', entityId: id });
    return { ok: true };
  }
}
