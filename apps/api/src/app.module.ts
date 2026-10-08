import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CandlesModule } from './candles/candles.module.js';
import { CoinsModule } from './coins/coins.module.js';
import { validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ScannerModule } from './scanner/scanner.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SignalsModule } from './signals/signals.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    SettingsModule,
    CoinsModule,
    CandlesModule,
    SignalsModule,
    NotificationsModule,
    ScannerModule,
  ],
})
export class AppModule {}
