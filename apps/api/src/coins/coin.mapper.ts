import type { CoinDto } from '@chart-goblin/shared';
import type { Coin } from '../generated/prisma/client.js';

export function toCoinDto(coin: Coin): CoinDto {
  return {
    id: coin.id,
    coingeckoId: coin.coingeckoId,
    symbol: coin.symbol,
    name: coin.name,
    marketCapRank: coin.marketCapRank,
    marketCapUsd: coin.marketCapUsd,
    mexcSymbol: coin.mexcSymbol,
    quoteVolume24h: coin.quoteVolume24h,
    isScannable: coin.isScannable,
    updatedAt: coin.updatedAt.toISOString(),
  };
}
