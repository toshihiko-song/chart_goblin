import { movingAverage, type Candle } from '@chart-goblin/shared';
import { z } from 'zod';
import {
  notEnoughData,
  notTriggered,
  Strategy,
  StrategyResult,
} from '../strategy.js';

const schema = z.object({
  type: z.enum(['EMA', 'SMA']).describe('Moving average type'),
  period: z.number().int().min(2).max(500).describe('Trend MA period'),
});

export type TrendParams = z.infer<typeof schema>;

/** Trend confirmation: price above (bullish) or below (bearish) a long MA. */
export class TrendStrategy implements Strategy<TrendParams> {
  readonly key = 'trend';
  readonly name = 'Trend';
  readonly description = 'Close relative to a long-term moving average.';
  readonly paramsSchema = schema;
  readonly defaultParams: TrendParams = { type: 'EMA', period: 200 };
  readonly defaultWeight = 10;

  requiredCandles(p: TrendParams): number {
    return p.type === 'EMA' ? Math.ceil(p.period * 1.5) : p.period;
  }

  evaluate(candles: readonly Candle[], p: TrendParams): StrategyResult {
    if (candles.length < this.requiredCandles(p)) return notEnoughData();

    const close = candles.at(-1)!.close;
    const ma = movingAverage(
      p.type,
      candles.map((c) => c.close),
      p.period,
    ).at(-1)!;
    const meta = { close, ma };
    const label = `${p.type}${p.period}`;

    if (close > ma) {
      return {
        triggered: true,
        direction: 'bullish',
        reason: `Price above ${label}`,
        meta,
      };
    }
    if (close < ma) {
      return {
        triggered: true,
        direction: 'bearish',
        reason: `Price below ${label}`,
        meta,
      };
    }
    return { ...notTriggered(`Price at ${label}`), meta };
  }
}
