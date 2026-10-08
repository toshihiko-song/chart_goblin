import { Controller, Get, Param, Query } from '@nestjs/common';
import type { CandleDto } from '@chart-goblin/shared';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CoinsService } from '../coins/coins.service.js';
import { TimeframeQueryDto } from '../common/dto/timeframe-query.dto.js';
import { CandlesService, RETAINED_CANDLES } from './candles.service.js';

class CandlesQueryDto extends TimeframeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RETAINED_CANDLES)
  limit = 300;
}

@Controller('coins/:symbol/candles')
export class CandlesController {
  constructor(
    private readonly coins: CoinsService,
    private readonly candles: CandlesService,
  ) {}

  /** Stored closed candles. Syncs first so charts work for coins not yet scanned. */
  @Get()
  async find(
    @Param('symbol') symbol: string,
    @Query() { tf, limit }: CandlesQueryDto,
  ): Promise<CandleDto[]> {
    const coin = await this.coins.findBySymbol(symbol);
    if (coin.mexcSymbol) {
      await this.candles.sync({ id: coin.id, mexcSymbol: coin.mexcSymbol }, tf);
    }
    return this.candles.getRecent(coin.id, tf, limit);
  }
}
