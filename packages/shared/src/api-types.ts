import type { Timeframe } from './timeframe.js';

/** DTOs exchanged between the NestJS API and the dashboard. Dates are ISO strings. */

export type Direction = 'bullish' | 'bearish';

export interface CoinDto {
  id: number;
  coingeckoId: string;
  symbol: string;
  name: string;
  marketCapRank: number | null;
  marketCapUsd: number | null;
  mexcSymbol: string | null;
  quoteVolume24h: number | null;
  isScannable: boolean;
  updatedAt: string;
}

export interface CandleDto {
  /** Epoch milliseconds (UTC). */
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalReason {
  key: string;
  name: string;
  weight: number;
  reason: string;
}

export interface StrategyResultDto {
  key: string;
  name: string;
  triggered: boolean;
  direction: Direction | 'neutral';
  reason: string;
  meta?: Record<string, number>;
}

export interface SignalDto {
  id: number;
  coin: Pick<
    CoinDto,
    'id' | 'symbol' | 'name' | 'mexcSymbol' | 'marketCapRank'
  >;
  timeframe: Timeframe;
  candleOpenTime: string;
  direction: Direction;
  score: number;
  price: number;
  reasons: SignalReason[];
  results: StrategyResultDto[];
  alerted: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface GeneralSettings {
  /** Timeframes the scanner runs on. */
  timeframes: Timeframe[];
  /** Minimum 24h MEXC quote volume (USDT) for a coin to be scanned. */
  minQuoteVolumeUsd: number;
  /** Signals below this score are not stored. */
  minSignalScore: number;
  /** Signals at or above this score trigger a Telegram alert. */
  minAlertScore: number;
  telegramEnabled: boolean;
  /** Don't re-alert the same coin/timeframe/direction within this many candles. */
  alertCooldownCandles: number;
  /**
   * Opportunities only show signals whose candle closed within this many
   * minutes. 0 = no limit (latest scan of each timeframe).
   */
  maxSignalAgeMinutes: number;
}

/** JSON Schema (draft 2020-12 subset) describing a strategy's params, for building forms. */
export interface ParamsJsonSchema {
  type: 'object';
  properties: Record<
    string,
    {
      type?: 'number' | 'integer' | 'string' | 'boolean';
      enum?: string[];
      minimum?: number;
      maximum?: number;
      exclusiveMinimum?: number;
      description?: string;
      default?: unknown;
    }
  >;
  required?: string[];
}

export interface StrategyConfigDto {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  weight: number;
  params: Record<string, unknown>;
  paramsSchema: ParamsJsonSchema;
}

export interface ScanRunSummary {
  timeframe: Timeframe;
  startedAt: string;
  finishedAt: string;
  coinsScanned: number;
  coinsFailed: number;
  signals: number;
  alerts: number;
}
