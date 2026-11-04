import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { NotificationsService } from './notifications.service';
import { WebhooksService } from './webhooks.service';
import { AuthUser, CurrentUser, RequirePermissions } from '../../common/auth/auth.decorators';
import { parseInput } from '../../common/http/helpers';

const templateSchema = z.object({
  event: z.string().min(3).max(120),
  locale: z.string().min(2).max(10),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(5000),
  scope: z.enum(['global', 'tenant']).optional(),
});

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('unread') unread?: string) {
    return this.notifications.list(user.id, unread === 'true');
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Get('templates')
  @RequirePermissions('settings:read')
  templates() {
    return this.notifications.templates();
  }

  @Put('templates')
  @RequirePermissions('settings:write')
  saveTemplate(@Body() body: unknown) {
    return this.notifications.saveTemplate(parseInput(templateSchema, body));
  }

  @Post('read-all')
  markAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAll(user.id);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notifications.markRead(id, user.id);
  }
}

@Controller('api/webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooks: WebhooksService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get(':id/deliveries')
  @RequirePermissions('integrations:read')
  deliveries(@Param('id') id: string) {
    return this.webhooks.deliveries(id);
  }

  @Post(':id/test')
  @RequirePermissions('integrations:write')
  test(@Param('id') id: string) {
    return this.webhooks.test(id);
  }
}
