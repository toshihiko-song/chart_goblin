import { Module } from '@nestjs/common';
import { StrategiesModule } from '../strategies/strategies.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { StrategyConfigService } from './strategy-config.service.js';

@Module({
  imports: [StrategiesModule],
  controllers: [SettingsController],
  providers: [SettingsService, StrategyConfigService],
  exports: [SettingsService, StrategyConfigService],
})
export class SettingsModule {}
