export interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  marketCapRank: number | null;
  marketCapUsd: number | null;
}

/** Abstraction over CoinGecko so the coin universe logic can be tested with fakes. */
export abstract class CoinGeckoClient {
  /** Coins ordered by market cap, descending. */
  abstract getTopByMarketCap(limit: number): Promise<CoinGeckoMarket[]>;
}
