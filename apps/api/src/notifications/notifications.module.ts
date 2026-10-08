import { Module } from '@nestjs/common';
import { HttpTelegramClient } from './http-telegram.client.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { TelegramClient } from './telegram.client.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: TelegramClient, useClass: HttpTelegramClient },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
