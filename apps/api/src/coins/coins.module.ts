import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { CoinsController } from './coins.controller.js';
import { CoinsService } from './coins.service.js';

@Module({
  imports: [MarketDataModule, SettingsModule],
  controllers: [CoinsController],
  providers: [CoinsService],
  exports: [CoinsService],
})
export class CoinsModule {}
