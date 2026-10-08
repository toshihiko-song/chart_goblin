import { crossAt, macd, type Candle } from '@chart-goblin/shared';
import { z } from 'zod';
import {
  notEnoughData,
  notTriggered,
  Strategy,
  StrategyResult,
} from '../strategy.js';

const schema = z
  .object({
    fastPeriod: z.number().int().min(1).max(200).describe('Fast EMA period'),
    slowPeriod: z.number().int().min(2).max(400).describe('Slow EMA period'),
    signalPeriod: z
      .number()
      .int()
      .min(1)
      .max(200)
      .describe('Signal EMA period'),
  })
  .refine((p) => p.fastPeriod < p.slowPeriod, {
    message: 'fastPeriod must be less than slowPeriod',
  });

export type MacdParams = z.infer<typeof schema>;

/** MACD line crossing its signal line on the latest closed candle. */
export class MacdStrategy implements Strategy<MacdParams> {
  readonly key = 'macd';
  readonly name = 'MACD';
  readonly description = 'MACD line crosses the signal line.';
  readonly paramsSchema = schema;
  readonly defaultParams: MacdParams = {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  };
  readonly defaultWeight = 20;

  requiredCandles(p: MacdParams): number {
    return (p.slowPeriod + p.signalPeriod) * 2;
  }

  evaluate(candles: readonly Candle[], p: MacdParams): StrategyResult {
    if (candles.length < this.requiredCandles(p)) return notEnoughData();

    const result = macd(
      candles.map((c) => c.close),
      p.fastPeriod,
      p.slowPeriod,
      p.signalPeriod,
    );
    const cross = crossAt(result.macd, result.signal);
    const meta = { macd: result.macd.at(-1)!, signal: result.signal.at(-1)! };

    if (!cross) {
      const side = meta.macd > meta.signal ? 'above' : 'below';
      return { ...notTriggered(`MACD ${side} signal, no cross`), meta };
    }
    return {
      triggered: true,
      direction: cross === 'above' ? 'bullish' : 'bearish',
      reason: `MACD ${cross === 'above' ? 'bullish' : 'bearish'} crossover`,
      meta,
    };
  }
}
