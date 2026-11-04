import { Module } from '@nestjs/common';
import { NotificationsController, WebhooksController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WebhooksService } from './webhooks.service';
import { AutomationService } from './automation.service';
import { MailService } from './mail.service';
import { QueuesService } from './queues.service';
import { EventsListener } from './events.listener';

@Module({
  controllers: [NotificationsController, WebhooksController],
  providers: [
    QueuesService,
    NotificationsService,
    WebhooksService,
    AutomationService,
    MailService,
    EventsListener,
  ],
  exports: [NotificationsService, WebhooksService, QueuesService, MailService],
})
export class NotificationsModule {}
