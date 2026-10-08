import type { Candle } from '@chart-goblin/shared';
import { z } from 'zod';
import {
  fmt,
  notEnoughData,
  notTriggered,
  Strategy,
  StrategyResult,
} from '../strategy.js';

const schema = z.object({
  lookback: z.number().int().min(2).max(500).describe('Average lookback'),
  multiplier: z.number().min(1).max(100).describe('Spike multiplier (× avg)'),
});

export type VolumeSpikeParams = z.infer<typeof schema>;

/**
 * Latest volume well above the average of the preceding candles.
 * Direction follows the candle body (green = bullish, red = bearish).
 */
export class VolumeSpikeStrategy implements Strategy<VolumeSpikeParams> {
  readonly key = 'volume-spike';
  readonly name = 'Volume Spike';
  readonly description =
    'Volume of the latest candle compared with the recent average.';
  readonly paramsSchema = schema;
  readonly defaultParams: VolumeSpikeParams = { lookback: 20, multiplier: 2 };
  readonly defaultWeight = 20;

  requiredCandles(p: VolumeSpikeParams): number {
    return p.lookback + 1;
  }

  evaluate(candles: readonly Candle[], p: VolumeSpikeParams): StrategyResult {
    if (candles.length < this.requiredCandles(p)) return notEnoughData();

    const last = candles.at(-1)!;
    const previous = candles.slice(-p.lookback - 1, -1);
    const average =
      previous.reduce((sum, c) => sum + c.volume, 0) / previous.length;
    const ratio = average > 0 ? last.volume / average : 0;
    const meta = { volume: last.volume, average, ratio };
    const label = `Volume ${fmt(ratio, 3)}x average`;

    if (ratio < p.multiplier || last.close === last.open) {
      return { ...notTriggered(label), meta };
    }
    return {
      triggered: true,
      direction: last.close > last.open ? 'bullish' : 'bearish',
      reason: label,
      meta,
    };
  }
}
