import { ema } from './moving-average.js';
import { emptySeries, type Series } from './types.js';

export interface MacdResult {
  macd: Series;
  signal: Series;
  histogram: Series;
}

/** MACD line (fast EMA − slow EMA), its signal EMA and the histogram. */
export function macd(
  closes: readonly number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult {
  if (fastPeriod >= slowPeriod) {
    throw new RangeError('MACD fast period must be shorter than slow period');
  }
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const macdLine: Series = closes.map((_, i) =>
    fast[i] !== null && slow[i] !== null ? fast[i]! - slow[i]! : null,
  );

  // The signal line is an EMA over the defined part of the MACD line.
  const start = macdLine.findIndex((v) => v !== null);
  const signal: Series = emptySeries(closes.length);
  if (start !== -1) {
    const signalValues = ema(macdLine.slice(start) as number[], signalPeriod);
    signalValues.forEach((v, i) => (signal[start + i] = v));
  }

  const histogram: Series = macdLine.map((m, i) =>
    m !== null && signal[i] !== null ? m - signal[i]! : null,
  );
  return { macd: macdLine, signal, histogram };
}
