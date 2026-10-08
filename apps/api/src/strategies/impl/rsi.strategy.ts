import { rsi, type Candle } from '@chart-goblin/shared';
import { z } from 'zod';
import {
  fmt,
  notEnoughData,
  notTriggered,
  Strategy,
  StrategyResult,
} from '../strategy.js';

const schema = z
  .object({
    period: z.number().int().min(2).max(200).describe('RSI period'),
    oversold: z.number().min(0).max(100).describe('Oversold (bullish)'),
    overbought: z.number().min(0).max(100).describe('Overbought (bearish)'),
  })
  .refine((p) => p.oversold < p.overbought, {
    message: 'oversold must be below overbought',
  });

export type RsiParams = z.infer<typeof schema>;

/** RSI in oversold (bullish) or overbought (bearish) territory. */
export class RsiStrategy implements Strategy<RsiParams> {
  readonly key = 'rsi';
  readonly name = 'RSI';
  readonly description = 'RSI at or beyond the oversold/overbought levels.';
  readonly paramsSchema = schema;
  readonly defaultParams: RsiParams = {
    period: 14,
    oversold: 30,
    overbought: 70,
  };
  readonly defaultWeight = 15;

  requiredCandles(p: RsiParams): number {
    return p.period * 3;
  }

  evaluate(candles: readonly Candle[], p: RsiParams): StrategyResult {
    if (candles.length < this.requiredCandles(p)) return notEnoughData();

    const value = rsi(
      candles.map((c) => c.close),
      p.period,
    ).at(-1)!;
    const meta = { rsi: value };
    const label = `RSI(${p.period}) ${fmt(value, 3)}`;

    if (value <= p.oversold) {
      return {
        triggered: true,
        direction: 'bullish',
        reason: `${label} oversold`,
        meta,
      };
    }
    if (value >= p.overbought) {
      return {
        triggered: true,
        direction: 'bearish',
        reason: `${label} overbought`,
        meta,
      };
    }
    return { ...notTriggered(`${label} neutral`), meta };
  }
}
