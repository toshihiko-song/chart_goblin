import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Candle, Timeframe } from '@chart-goblin/shared';
import { fetchJson } from '../common/http.js';
import type { Env } from '../config/env.js';
import {
  KlineQuery,
  MexcClient,
  MexcSymbol,
  MexcTicker,
} from './mexc.client.js';

/** MEXC names some intervals differently (e.g. it rejects "1h"). */
const MEXC_INTERVAL: Record<Timeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '1h': '60m',
  '4h': '4h',
  '1d': '1d',
};

const MAX_KLINE_LIMIT = 1000;

interface ExchangeInfoResponse {
  symbols: {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    isSpotTradingAllowed: boolean;
  }[];
}

interface TickerResponse {
  symbol: string;
  lastPrice: string;
  quoteVolume: string;
}

/** [openTime, open, high, low, close, volume, closeTime, quoteVolume] */
type KlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
];

@Injectable()
export class HttpMexcClient extends MexcClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.baseUrl = config.get('MEXC_BASE_URL', { infer: true });
  }

  async getSymbols(): Promise<MexcSymbol[]> {
    const info = await fetchJson<ExchangeInfoResponse>(
      `${this.baseUrl}/api/v3/exchangeInfo`,
      { timeoutMs: 30_000 },
    );
    return info.symbols.map((s) => ({
      symbol: s.symbol,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
      // MEXC reports status "1" for online pairs.
      tradable: s.status === '1' && s.isSpotTradingAllowed,
    }));
  }

  async get24hTickers(): Promise<MexcTicker[]> {
    const rows = await fetchJson<TickerResponse[]>(
      `${this.baseUrl}/api/v3/ticker/24hr`,
      { timeoutMs: 30_000 },
    );
    return rows.map((r) => ({
      symbol: r.symbol,
      lastPrice: Number(r.lastPrice),
      quoteVolume: Number(r.quoteVolume),
    }));
  }

  async getKlines(
    symbol: string,
    timeframe: Timeframe,
    { limit = 500, startTime, endTime }: KlineQuery = {},
  ): Promise<Candle[]> {
    const params = new URLSearchParams({
      symbol,
      interval: MEXC_INTERVAL[timeframe],
      limit: String(Math.min(limit, MAX_KLINE_LIMIT)),
    });
    if (startTime !== undefined) params.set('startTime', String(startTime));
    if (endTime !== undefined) params.set('endTime', String(endTime));

    const rows = await fetchJson<KlineRow[]>(
      `${this.baseUrl}/api/v3/klines?${params}`,
    );
    return rows.map((r) => ({
      openTime: r[0],
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }));
  }
}
