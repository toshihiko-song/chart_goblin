import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('status')
  status(): { telegramConfigured: boolean } {
    return { telegramConfigured: this.notifications.isConfigured() };
  }

  @Post('test')
  @HttpCode(204)
  test(): Promise<void> {
    return this.notifications.sendTest();
  }
}
