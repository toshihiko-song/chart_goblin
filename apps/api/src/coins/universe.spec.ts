import type { CoinGeckoMarket } from '../market-data/coingecko.client.js';
import { buildUniverse } from './universe.js';

const market = (id: string, symbol: string, rank: number): CoinGeckoMarket => ({
  id,
  symbol,
  name: id,
  marketCapRank: rank,
  marketCapUsd: 1_000_000 / rank,
});

describe('buildUniverse', () => {
  const symbols = [
    { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', tradable: true },
    { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', tradable: true },
    {
      symbol: 'DEADUSDT',
      baseAsset: 'DEAD',
      quoteAsset: 'USDT',
      tradable: false,
    },
    {
      symbol: 'USDCUSDT',
      baseAsset: 'USDC',
      quoteAsset: 'USDT',
      tradable: true,
    },
    { symbol: 'LOWUSDT', baseAsset: 'LOW', quoteAsset: 'USDT', tradable: true },
  ];
  const tickers = [
    { symbol: 'BTCUSDT', lastPrice: 1, quoteVolume: 5_000_000 },
    { symbol: 'ETHUSDT', lastPrice: 1, quoteVolume: 3_000_000 },
    { symbol: 'USDCUSDT', lastPrice: 1, quoteVolume: 9_000_000 },
    { symbol: 'LOWUSDT', lastPrice: 1, quoteVolume: 10 },
  ];

  it('maps pairs, applies liquidity and exclusion filters', () => {
    const result = buildUniverse(
      [
        market('bitcoin', 'BTC', 1),
        market('ethereum', 'ETH', 2),
        market('usd-coin', 'USDC', 3),
        market('dead', 'DEAD', 4),
        market('low', 'LOW', 5),
        market('no-pair', 'NOPE', 6),
      ],
      symbols,
      tickers,
      1_000_000,
    );

    expect(
      result.map((e) => [e.market.id, e.mexcSymbol, e.isScannable]),
    ).toEqual([
      ['bitcoin', 'BTCUSDT', true],
      ['ethereum', 'ETHUSDT', true],
      ['usd-coin', null, false],
      ['dead', null, false],
      ['low', 'LOWUSDT', false],
      ['no-pair', null, false],
    ]);
  });

  it('gives a shared ticker to the higher-ranked coin only', () => {
    const result = buildUniverse(
      [market('ethereum', 'ETH', 2), market('eth-imposter', 'ETH', 90)],
      symbols,
      tickers,
      0,
    );
    expect(result.map((e) => e.mexcSymbol)).toEqual(['ETHUSDT', null]);
  });
});
