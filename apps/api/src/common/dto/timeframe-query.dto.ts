import { TIMEFRAMES, type Timeframe } from '@chart-goblin/shared';
import { IsIn } from 'class-validator';

export class TimeframeQueryDto {
  @IsIn(TIMEFRAMES)
  tf: Timeframe;
}
