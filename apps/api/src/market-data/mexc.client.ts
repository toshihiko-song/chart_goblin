import type { Candle, Timeframe } from '@chart-goblin/shared';

export interface MexcSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  /** True when the pair is online and spot trading is allowed. */
  tradable: boolean;
}

export interface MexcTicker {
  symbol: string;
  lastPrice: number;
  /** 24h volume in quote asset (USDT). */
  quoteVolume: number;
}

export interface KlineQuery {
  limit?: number;
  startTime?: number;
  endTime?: number;
}

/** Abstraction over the MEXC spot REST API (public endpoints only). */
export abstract class MexcClient {
  abstract getSymbols(): Promise<MexcSymbol[]>;
  abstract get24hTickers(): Promise<MexcTicker[]>;
  /** Candles ordered oldest → newest. The last one may still be open. */
  abstract getKlines(
    symbol: string,
    timeframe: Timeframe,
    query?: KlineQuery,
  ): Promise<Candle[]>;
}
