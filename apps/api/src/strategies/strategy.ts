import type { Candle, Direction } from '@chart-goblin/shared';
import type { z } from 'zod';

export interface StrategyResult {
  triggered: boolean;
  direction: Direction | 'neutral';
  /** Human-readable explanation, e.g. "EMA20 crossed above EMA50". */
  reason: string;
  meta?: Record<string, number>;
}

/**
 * A pure signal detector. Strategies must not touch the database, HTTP clients
 * or notifications, so they can be reused for backtesting later.
 */
export interface Strategy<P extends object = object> {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly paramsSchema: z.ZodType<P>;
  readonly defaultParams: P;
  readonly defaultWeight: number;
  /** Minimum number of closed candles `evaluate` needs. */
  requiredCandles(params: P): number;
  /** `candles` are closed candles ordered oldest → newest. */
  evaluate(candles: readonly Candle[], params: P): StrategyResult;
}

export const notTriggered = (reason: string): StrategyResult => ({
  triggered: false,
  direction: 'neutral',
  reason,
});

export const notEnoughData = (): StrategyResult =>
  notTriggered('Not enough candles');

/** Compact number formatting for reasons (6 significant digits). */
export function fmt(value: number, digits = 6): string {
  return String(Number(value.toPrecision(digits)));
}
