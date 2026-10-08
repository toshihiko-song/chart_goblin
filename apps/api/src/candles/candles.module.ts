import { Module } from '@nestjs/common';
import { CoinsModule } from '../coins/coins.module.js';
import { MarketDataModule } from '../market-data/market-data.module.js';
import { CandlesController } from './candles.controller.js';
import { CandlesService } from './candles.service.js';

@Module({
  imports: [MarketDataModule, CoinsModule],
  controllers: [CandlesController],
  providers: [CandlesService],
  exports: [CandlesService],
})
export class CandlesModule {}
