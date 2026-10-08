import type { StrategyResult } from '../strategies/strategy.js';
import { scoreResults, type WeightedResult } from './scoring.js';

const result = (
  key: string,
  weight: number,
  direction: StrategyResult['direction'],
  triggered = direction !== 'neutral',
): WeightedResult => ({
  key,
  name: key,
  weight,
  result: { triggered, direction, reason: `${key} ${direction}` },
});

describe('scoreResults', () => {
  it('sums triggered weights in the dominant direction', () => {
    const outcome = scoreResults([
      result('ma-cross', 25, 'bullish'),
      result('rsi', 15, 'neutral'),
      result('macd', 20, 'bullish'),
      result('volume-spike', 20, 'bullish'),
      result('breakout', 10, 'neutral'),
      result('trend', 10, 'bullish'),
    ]);
    expect(outcome).toEqual({
      direction: 'bullish',
      score: 75,
      reasons: [
        {
          key: 'ma-cross',
          name: 'ma-cross',
          weight: 25,
          reason: 'ma-cross bullish',
        },
        { key: 'macd', name: 'macd', weight: 20, reason: 'macd bullish' },
        {
          key: 'volume-spike',
          name: 'volume-spike',
          weight: 20,
          reason: 'volume-spike bullish',
        },
        { key: 'trend', name: 'trend', weight: 10, reason: 'trend bullish' },
      ],
    });
  });

  it('normalizes by the total enabled weight', () => {
    const outcome = scoreResults([
      result('a', 25, 'bearish'),
      result('b', 25, 'neutral'),
    ]);
    expect(outcome).toMatchObject({ direction: 'bearish', score: 50 });
  });

  it('only counts the winning direction', () => {
    const outcome = scoreResults([
      result('a', 30, 'bullish'),
      result('b', 10, 'bearish'),
      result('c', 60, 'neutral'),
    ]);
    expect(outcome).toMatchObject({ direction: 'bullish', score: 30 });
    expect(outcome!.reasons.map((r) => r.key)).toEqual(['a']);
  });

  it('returns null when nothing triggered, on ties, or with no weight', () => {
    expect(scoreResults([result('a', 10, 'neutral')])).toBeNull();
    expect(
      scoreResults([result('a', 10, 'bullish'), result('b', 10, 'bearish')]),
    ).toBeNull();
    expect(scoreResults([])).toBeNull();
  });
});
