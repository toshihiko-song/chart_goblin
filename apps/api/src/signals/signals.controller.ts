import { Controller, Get, Query } from '@nestjs/common';
import {
  TIMEFRAMES,
  type Paginated,
  type SignalDto,
  type Timeframe,
} from '@chart-goblin/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SettingsService } from '../settings/settings.service.js';
import { SignalsService } from './signals.service.js';

class SignalQueryDto {
  @IsOptional()
  @IsIn(['current', 'history'])
  scope: 'current' | 'history' = 'current';

  @IsOptional()
  @IsIn(TIMEFRAMES)
  tf?: Timeframe;

  @IsOptional()
  @IsIn(['bullish', 'bearish'])
  direction?: 'bullish' | 'bearish';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsOptional()
  @IsString()
  symbol?: string;

  /** Candle closed within N minutes. Defaults to the setting for scope=current; 0 = no limit. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_080)
  maxAgeMinutes?: number;

  @IsOptional()
  @IsIn(['score', 'time'])
  sort: 'score' | 'time' = 'score';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 100;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

@Controller('signals')
export class SignalsController {
  constructor(
    private readonly signals: SignalsService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  async find(
    @Query() { tf, maxAgeMinutes, ...query }: SignalQueryDto,
  ): Promise<Paginated<SignalDto>> {
    if (maxAgeMinutes === undefined && query.scope === 'current') {
      ({ maxSignalAgeMinutes: maxAgeMinutes } =
        await this.settings.getGeneral());
    }
    return this.signals.find({ ...query, timeframe: tf, maxAgeMinutes });
  }
}
