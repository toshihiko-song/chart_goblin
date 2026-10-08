import type { CoinGeckoMarket } from '../market-data/coingecko.client.js';
import type { MexcSymbol, MexcTicker } from '../market-data/mexc.client.js';
import { EXCLUDED_SYMBOLS, QUOTE_ASSET } from './coin-filters.js';

export interface UniverseEntry {
  market: CoinGeckoMarket;
  mexcSymbol: string | null;
  quoteVolume24h: number | null;
  isScannable: boolean;
}

/**
 * Pure mapping of CoinGecko coins to MEXC USDT pairs with a liquidity filter.
 * `markets` must be ordered by market cap so that, on symbol collisions
 * (two coins sharing a ticker), the larger coin wins the MEXC pair.
 */
export function buildUniverse(
  markets: CoinGeckoMarket[],
  symbols: MexcSymbol[],
  tickers: MexcTicker[],
  minQuoteVolumeUsd: number,
): UniverseEntry[] {
  const pairsByBase = new Map(
    symbols
      .filter((s) => s.tradable && s.quoteAsset === QUOTE_ASSET)
      .map((s) => [s.baseAsset.toUpperCase(), s.symbol]),
  );
  const volumeBySymbol = new Map(tickers.map((t) => [t.symbol, t.quoteVolume]));
  const claimed = new Set<string>();

  return markets.map((market) => {
    const pair = EXCLUDED_SYMBOLS.has(market.symbol)
      ? undefined
      : pairsByBase.get(market.symbol);

    if (!pair || claimed.has(pair)) {
      return {
        market,
        mexcSymbol: null,
        quoteVolume24h: null,
        isScannable: false,
      };
    }
    claimed.add(pair);

    const quoteVolume24h = volumeBySymbol.get(pair) ?? null;
    return {
      market,
      mexcSymbol: pair,
      quoteVolume24h,
      isScannable:
        quoteVolume24h !== null && quoteVolume24h >= minQuoteVolumeUsd,
    };
  });
}
