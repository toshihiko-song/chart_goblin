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
  lookback: z.number().int().min(2).max(500).describe('Range lookback'),
});

export type BreakoutParams = z.infer<typeof schema>;

/** Close above the highest high (or below the lowest low) of the previous candles. */
export class BreakoutStrategy implements Strategy<BreakoutParams> {
  readonly key = 'breakout';
  readonly name = 'Breakout';
  readonly description = 'Close breaks the high/low of the recent range.';
  readonly paramsSchema = schema;
  readonly defaultParams: BreakoutParams = { lookback: 20 };
  readonly defaultWeight = 10;

  requiredCandles(p: BreakoutParams): number {
    return p.lookback + 1;
  }

  evaluate(candles: readonly Candle[], p: BreakoutParams): StrategyResult {
    if (candles.length < this.requiredCandles(p)) return notEnoughData();

    const last = candles.at(-1)!;
    const range = candles.slice(-p.lookback - 1, -1);
    const high = Math.max(...range.map((c) => c.high));
    const low = Math.min(...range.map((c) => c.low));
    const meta = { high, low, close: last.close };

    if (last.close > high) {
      return {
        triggered: true,
        direction: 'bullish',
        reason: `Broke ${p.lookback}-candle high ${fmt(high)}`,
        meta,
      };
    }
    if (last.close < low) {
      return {
        triggered: true,
        direction: 'bearish',
        reason: `Broke ${p.lookback}-candle low ${fmt(low)}`,
        meta,
      };
    }
    return { ...notTriggered(`Inside ${p.lookback}-candle range`), meta };
  }
}
