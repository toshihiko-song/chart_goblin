import type {
  CandleDto,
  MovingAverageType,
  Series,
  StrategyConfigDto,
} from '@chart-goblin/shared';

/** What to draw on the chart for one enabled strategy. */
export type ChartIndicator =
  | {
      kind: 'ma';
      key: string;
      label: string;
      lines: { type: MovingAverageType; period: number; color: string }[];
    }
  | { kind: 'range'; key: string; label: string; lookback: number }
  | {
      kind: 'volume';
      key: string;
      label: string;
      lookback: number;
      multiplier: number;
    }
  | {
      kind: 'macd';
      key: string;
      label: string;
      fast: number;
      slow: number;
      signal: number;
    }
  | {
      kind: 'rsi';
      key: string;
      label: string;
      period: number;
      oversold: number;
      overbought: number;
    };

export const INDICATOR_COLORS = {
  fast: '#facc15',
  slow: '#38bdf8',
  trend: '#c084fc',
  range: '#94a3b8',
  volumeAvg: '#fb923c',
  macd: '#38bdf8',
  macdSignal: '#fb923c',
  rsi: '#c084fc',
};

/** Accent color for a strategy's toggle chip. */
export function indicatorColor(indicator: ChartIndicator): string {
  switch (indicator.kind) {
    case 'ma':
      return indicator.lines[0].color;
    case 'range':
      return INDICATOR_COLORS.range;
    case 'volume':
      return INDICATOR_COLORS.volumeAvg;
    case 'macd':
      return INDICATOR_COLORS.macd;
    case 'rsi':
      return INDICATOR_COLORS.rsi;
  }
}

/**
 * Maps enabled strategies to chart indicators using their configured params,
 * so the chart shows exactly what the scanner evaluates.
 */
export function indicatorsFromStrategies(
  strategies: StrategyConfigDto[],
): ChartIndicator[] {
  return strategies
    .filter((s) => s.enabled)
    .flatMap((s): ChartIndicator[] => {
      const p = s.params as Record<string, number> & {
        type: MovingAverageType;
      };
      switch (s.key) {
        case 'ma-cross':
          return [
            {
              kind: 'ma',
              key: s.key,
              label: `${p.type}${p.fastPeriod} / ${p.type}${p.slowPeriod}`,
              lines: [
                {
                  type: p.type,
                  period: p.fastPeriod,
                  color: INDICATOR_COLORS.fast,
                },
                {
                  type: p.type,
                  period: p.slowPeriod,
                  color: INDICATOR_COLORS.slow,
                },
              ],
            },
          ];
        case 'trend':
          return [
            {
              kind: 'ma',
              key: s.key,
              label: `Trend ${p.type}${p.period}`,
              lines: [
                {
                  type: p.type,
                  period: p.period,
                  color: INDICATOR_COLORS.trend,
                },
              ],
            },
          ];
        case 'breakout':
          return [
            {
              kind: 'range',
              key: s.key,
              label: `Range ${p.lookback}`,
              lookback: p.lookback,
            },
          ];
        case 'volume-spike':
          return [
            {
              kind: 'volume',
              key: s.key,
              label: `Vol avg ${p.lookback} · ${p.multiplier}×`,
              lookback: p.lookback,
              multiplier: p.multiplier,
            },
          ];
        case 'macd':
          return [
            {
              kind: 'macd',
              key: s.key,
              label: `MACD ${p.fastPeriod}/${p.slowPeriod}/${p.signalPeriod}`,
              fast: p.fastPeriod,
              slow: p.slowPeriod,
              signal: p.signalPeriod,
            },
          ];
        case 'rsi':
          return [
            {
              kind: 'rsi',
              key: s.key,
              label: `RSI ${p.period} (${p.oversold}/${p.overbought})`,
              period: p.period,
              oversold: p.oversold,
              overbought: p.overbought,
            },
          ];
        default:
          // Strategies without a chart representation yet.
          return [];
      }
    });
}

/**
 * Highest high / lowest low of the `lookback` candles before each candle,
 * i.e. the range the Breakout strategy compares the close against.
 */
export function priorRange(
  candles: CandleDto[],
  lookback: number,
): { high: Series; low: Series } {
  const high: Series = [];
  const low: Series = [];
  candles.forEach((_, i) => {
    if (i < lookback) {
      high.push(null);
      low.push(null);
      return;
    }
    const window = candles.slice(i - lookback, i);
    high.push(Math.max(...window.map((c) => c.high)));
    low.push(Math.min(...window.map((c) => c.low)));
  });
  return { high, low };
}

/** Average volume of the `lookback` candles before each candle. */
export function priorVolumeAverage(
  candles: CandleDto[],
  lookback: number,
): Series {
  return candles.map((_, i) => {
    if (i < lookback) return null;
    const window = candles.slice(i - lookback, i);
    return window.reduce((sum, c) => sum + c.volume, 0) / lookback;
  });
}
