import type { Candle } from '@chart-goblin/shared';

/** Builds hourly candles from closes; open = previous close, wicks ±0.5%. */
export function candlesFromCloses(
  closes: number[],
  volumes?: number[],
): Candle[] {
  return closes.map((close, i) => {
    const open = i === 0 ? close : closes[i - 1];
    return {
      openTime: i * 3_600_000,
      open,
      high: Math.max(open, close) * 1.005,
      low: Math.min(open, close) * 0.995,
      close,
      volume: volumes?.[i] ?? 100,
    };
  });
}

export const flat = (n: number, value = 100): number[] => Array(n).fill(value);
