export const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d'] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];

const MINUTE = 60_000;

export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '5m': 5 * MINUTE,
  '15m': 15 * MINUTE,
  '1h': 60 * MINUTE,
  '4h': 240 * MINUTE,
  '1d': 1440 * MINUTE,
};

export function isTimeframe(value: unknown): value is Timeframe {
  return (TIMEFRAMES as readonly unknown[]).includes(value);
}

/** Open time (ms) of the most recent candle that has fully closed at `now`. */
export function lastClosedOpenTime(
  timeframe: Timeframe,
  now = Date.now(),
): number {
  const ms = TIMEFRAME_MS[timeframe];
  return Math.floor(now / ms) * ms - ms;
}
