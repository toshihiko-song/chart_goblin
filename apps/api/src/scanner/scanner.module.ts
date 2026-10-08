import { Module } from '@nestjs/common';
import { CandlesModule } from '../candles/candles.module.js';
import { CoinsModule } from '../coins/coins.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { SignalsModule } from '../signals/signals.module.js';
import { ScannerController } from './scanner.controller.js';
import { ScannerService } from './scanner.service.js';

@Module({
  imports: [
    CoinsModule,
    CandlesModule,
    SettingsModule,
    SignalsModule,
    NotificationsModule,
  ],
  controllers: [ScannerController],
  providers: [ScannerService],
})
export class ScannerModule {}
