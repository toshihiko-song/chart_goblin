import type { SignalDto } from '@chart-goblin/shared';
import { formatAlert } from './alert-message.js';

describe('formatAlert', () => {
  it('renders pair, score, timeframe and reasons', () => {
    const signal = {
      coin: {
        id: 1,
        symbol: 'BTC',
        name: 'Bitcoin',
        mexcSymbol: 'BTCUSDT',
        marketCapRank: 1,
      },
      timeframe: '1h',
      direction: 'bullish',
      score: 85,
      price: 82677.13,
      reasons: [
        {
          key: 'ma-cross',
          name: 'MA Cross',
          weight: 25,
          reason: 'EMA20 crossed above EMA50',
        },
        {
          key: 'volume-spike',
          name: 'Volume Spike',
          weight: 20,
          reason: 'Volume 2x average',
        },
      ],
    } as SignalDto;

    expect(formatAlert(signal)).toBe(
      [
        '🚨 <b>BTC/USDT</b>  🟢 Bullish',
        '',
        'Score: <b>85/100</b>',
        'Timeframe: 1H',
        'Price: 82677.13',
        '',
        '✓ <b>MA Cross</b>: EMA20 crossed above EMA50',
        '✓ <b>Volume Spike</b>: Volume 2x average',
      ].join('\n'),
    );
  });
});
