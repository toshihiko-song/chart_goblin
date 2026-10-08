import { candlesFromCloses, flat } from '../testing.js';
import { BreakoutStrategy } from './breakout.strategy.js';
import { MacdStrategy } from './macd.strategy.js';
import { MaCrossStrategy } from './ma-cross.strategy.js';
import { RsiStrategy } from './rsi.strategy.js';
import { TrendStrategy } from './trend.strategy.js';
import { VolumeSpikeStrategy } from './volume-spike.strategy.js';

describe('MaCrossStrategy', () => {
  const strategy = new MaCrossStrategy();
  const params = { type: 'SMA' as const, fastPeriod: 3, slowPeriod: 5 };

  it('detects a bullish cross on the last candle', () => {
    const result = strategy.evaluate(
      candlesFromCloses([...flat(10), 99, 99, 104]),
      params,
    );
    expect(result).toMatchObject({
      triggered: true,
      direction: 'bullish',
      reason: 'SMA3 crossed above SMA5',
    });
  });

  it('detects a bearish cross', () => {
    const result = strategy.evaluate(
      candlesFromCloses([...flat(10), 101, 101, 96]),
      params,
    );
    expect(result).toMatchObject({ triggered: true, direction: 'bearish' });
  });

  it('does not trigger when the cross happened earlier', () => {
    const result = strategy.evaluate(
      candlesFromCloses([...flat(10), 99, 99, 104, 105]),
      params,
    );
    expect(result.triggered).toBe(false);
  });

  it('reports insufficient data', () => {
    expect(strategy.evaluate(candlesFromCloses([1, 2]), params)).toMatchObject({
      triggered: false,
      reason: 'Not enough candles',
    });
  });

  it('rejects fast >= slow', () => {
    expect(
      strategy.paramsSchema.safeParse({
        type: 'EMA',
        fastPeriod: 50,
        slowPeriod: 20,
      }).success,
    ).toBe(false);
  });
});

describe('RsiStrategy', () => {
  const strategy = new RsiStrategy();
  const params = strategy.defaultParams;

  it('flags oversold as bullish and overbought as bearish', () => {
    const falling = Array.from({ length: 60 }, (_, i) => 200 - i);
    const rising = Array.from({ length: 60 }, (_, i) => 100 + i);
    expect(
      strategy.evaluate(candlesFromCloses(falling), params).direction,
    ).toBe('bullish');
    expect(strategy.evaluate(candlesFromCloses(rising), params).direction).toBe(
      'bearish',
    );
  });

  it('stays neutral in a choppy market', () => {
    const choppy = Array.from({ length: 60 }, (_, i) => (i % 2 ? 101 : 99));
    expect(strategy.evaluate(candlesFromCloses(choppy), params).triggered).toBe(
      false,
    );
  });
});

describe('MacdStrategy', () => {
  const strategy = new MacdStrategy();
  const params = strategy.defaultParams;

  it('detects a bullish crossover after a downtrend reverses', () => {
    // Accelerating decline keeps MACD below its signal line until the reversal.
    const closes = Array.from({ length: 80 }, (_, i) => 300 - (i * i) / 40);
    expect(strategy.evaluate(candlesFromCloses(closes), params).triggered).toBe(
      false,
    );
    // Find the first candle after the reversal where MACD crosses up.
    let result = strategy.evaluate(candlesFromCloses(closes), params);
    for (let i = 1; i < 30 && !result.triggered; i++) {
      closes.push(closes.at(-1)! + 3);
      result = strategy.evaluate(candlesFromCloses(closes), params);
    }
    expect(result).toMatchObject({ triggered: true, direction: 'bullish' });
  });
});

describe('VolumeSpikeStrategy', () => {
  const strategy = new VolumeSpikeStrategy();
  const params = { lookback: 5, multiplier: 2 };

  it('triggers on a green candle with 3x volume', () => {
    const candles = candlesFromCloses(
      [...flat(5), 105],
      [...flat(5, 100), 300],
    );
    expect(strategy.evaluate(candles, params)).toMatchObject({
      triggered: true,
      direction: 'bullish',
      reason: 'Volume 3x average',
    });
  });

  it('ignores normal volume', () => {
    const candles = candlesFromCloses(
      [...flat(5), 105],
      [...flat(5, 100), 150],
    );
    expect(strategy.evaluate(candles, params).triggered).toBe(false);
  });
});

describe('BreakoutStrategy', () => {
  const strategy = new BreakoutStrategy();

  it('detects breaks above the range high and below the range low', () => {
    const params = { lookback: 5 };
    expect(
      strategy.evaluate(candlesFromCloses([...flat(5), 110]), params).direction,
    ).toBe('bullish');
    expect(
      strategy.evaluate(candlesFromCloses([...flat(5), 90]), params).direction,
    ).toBe('bearish');
    expect(
      strategy.evaluate(candlesFromCloses([...flat(5), 100.1]), params)
        .triggered,
    ).toBe(false);
  });
});

describe('TrendStrategy', () => {
  const strategy = new TrendStrategy();

  it('is bullish above the MA and bearish below it', () => {
    const params = { type: 'SMA' as const, period: 10 };
    expect(
      strategy.evaluate(candlesFromCloses([...flat(10), 120]), params),
    ).toMatchObject({
      triggered: true,
      direction: 'bullish',
      reason: 'Price above SMA10',
    });
    expect(
      strategy.evaluate(candlesFromCloses([...flat(10), 80]), params).direction,
    ).toBe('bearish');
  });
});
