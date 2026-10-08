import { emptySeries, type Series } from './types.js';

export type MovingAverageType = 'SMA' | 'EMA';

/** Simple moving average. */
export function sma(values: readonly number[], period: number): Series {
  assertPeriod(period);
  const out: Series = emptySeries(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** Exponential moving average, seeded with the SMA of the first `period` values. */
export function ema(values: readonly number[], period: number): Series {
  assertPeriod(period);
  const out: Series = emptySeries(values.length);
  if (values.length < period) return out;

  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function movingAverage(
  type: MovingAverageType,
  values: readonly number[],
  period: number,
): Series {
  return type === 'EMA' ? ema(values, period) : sma(values, period);
}

export function assertPeriod(period: number): void {
  if (!Number.isInteger(period) || period < 1) {
    throw new RangeError(`Invalid period: ${period}`);
  }
}
