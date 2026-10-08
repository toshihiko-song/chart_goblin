import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJson } from '../common/http.js';
import type { Env } from '../config/env.js';
import { CoinGeckoClient, CoinGeckoMarket } from './coingecko.client.js';

interface MarketResponse {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
  market_cap: number | null;
}

@Injectable()
export class HttpCoinGeckoClient extends CoinGeckoClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.baseUrl = config.get('COINGECKO_BASE_URL', { infer: true });
    const apiKey = config.get('COINGECKO_API_KEY', { infer: true });
    this.headers = apiKey ? { 'x-cg-demo-api-key': apiKey } : {};
  }

  async getTopByMarketCap(limit: number): Promise<CoinGeckoMarket[]> {
    const params = new URLSearchParams({
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: String(Math.min(limit, 250)),
      page: '1',
    });
    const rows = await fetchJson<MarketResponse[]>(
      `${this.baseUrl}/coins/markets?${params}`,
      { init: { headers: this.headers } },
    );
    return rows.map((r) => ({
      id: r.id,
      symbol: r.symbol.toUpperCase(),
      name: r.name,
      marketCapRank: r.market_cap_rank,
      marketCapUsd: r.market_cap,
    }));
  }
}
