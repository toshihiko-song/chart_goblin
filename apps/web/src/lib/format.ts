import type { Timeframe } from '@chart-goblin/shared';

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '1h': '1H',
  '4h': '4H',
  '1d': '1D',
};

export function pairLabel(symbol: string): string {
  return `${symbol}/USDT`;
}

export function formatPrice(value: number): string {
  if (value >= 1000)
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1)
    return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return value.toPrecision(4);
}

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

export function formatUsd(value: number | null): string {
  return value === null ? '—' : `$${compact.format(value)}`;
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size)
      return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** TradingView's interval codes (minutes, or D for daily). */
const TRADINGVIEW_INTERVAL: Record<Timeframe, string> = {
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
};

/** TradingView chart for a MEXC spot pair (e.g. "BTCUSDT") on a timeframe. */
export function tradingViewUrl(
  mexcSymbol: string,
  timeframe: Timeframe,
): string {
  const params = new URLSearchParams({
    symbol: `MEXC:${mexcSymbol}`,
    interval: TRADINGVIEW_INTERVAL[timeframe],
  });
  return `https://www.tradingview.com/chart/?${params}`;
}
