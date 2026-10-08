import { crossAt, movingAverage, type Candle } from '@chart-goblin/shared';
import { z } from 'zod';
import {
  notEnoughData,
  notTriggered,
  Strategy,
  StrategyResult,
} from '../strategy.js';

const schema = z
  .object({
    type: z.enum(['EMA', 'SMA']).describe('Moving average type'),
    fastPeriod: z.number().int().min(1).max(500).describe('Fast MA period'),
    slowPeriod: z.number().int().min(2).max(500).describe('Slow MA period'),
  })
  .refine((p) => p.fastPeriod < p.slowPeriod, {
    message: 'fastPeriod must be less than slowPeriod',
  });

export type MaCrossParams = z.infer<typeof schema>;

/** Fast MA crossing the slow MA on the latest closed candle. */
export class MaCrossStrategy implements Strategy<MaCrossParams> {
  readonly key = 'ma-cross';
  readonly name = 'MA Cross';
  readonly description = 'Fast moving average crosses the slow moving average.';
  readonly paramsSchema = schema;
  readonly defaultParams: MaCrossParams = {
    type: 'EMA',
    fastPeriod: 20,
    slowPeriod: 50,
  };
  readonly defaultWeight = 25;

  requiredCandles(p: MaCrossParams): number {
    // EMAs need extra history to converge.
    return p.type === 'EMA' ? p.slowPeriod * 2 : p.slowPeriod + 1;
  }

  evaluate(candles: readonly Candle[], p: MaCrossParams): StrategyResult {
    if (candles.length < this.requiredCandles(p)) return notEnoughData();

    const closes = candles.map((c) => c.close);
    const fast = movingAverage(p.type, closes, p.fastPeriod);
    const slow = movingAverage(p.type, closes, p.slowPeriod);
    const cross = crossAt(fast, slow);
    const fastLabel = `${p.type}${p.fastPeriod}`;
    const slowLabel = `${p.type}${p.slowPeriod}`;
    const meta = { fast: fast.at(-1)!, slow: slow.at(-1)! };

    if (!cross) {
      const side = meta.fast > meta.slow ? 'above' : 'below';
      return {
        ...notTriggered(`${fastLabel} ${side} ${slowLabel}, no cross`),
        meta,
      };
    }
    return {
      triggered: true,
      direction: cross === 'above' ? 'bullish' : 'bearish',
      reason: `${fastLabel} crossed ${cross} ${slowLabel}`,
      meta,
    };
  }
}
