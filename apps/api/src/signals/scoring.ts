import type { Direction, SignalReason } from '@chart-goblin/shared';
import type { StrategyResult } from '../strategies/strategy.js';

export interface WeightedResult {
  key: string;
  name: string;
  weight: number;
  result: StrategyResult;
}

export interface ScoreOutcome {
  direction: Direction;
  /** 0–100: triggered weight in `direction` as a share of all enabled weight. */
  score: number;
  reasons: SignalReason[];
}

/**
 * Combines strategy results into one directional score. Weights are normalized
 * by the total enabled weight, so enabling/disabling strategies keeps the scale
 * at 0–100. Returns null when nothing triggered or both directions tie.
 */
export function scoreResults(
  results: readonly WeightedResult[],
): ScoreOutcome | null {
  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight === 0) return null;

  const weightFor = (direction: Direction) =>
    results
      .filter((r) => r.result.triggered && r.result.direction === direction)
      .reduce((sum, r) => sum + r.weight, 0);
  const bullish = weightFor('bullish');
  const bearish = weightFor('bearish');
  if (bullish === bearish) return null;

  const direction: Direction = bullish > bearish ? 'bullish' : 'bearish';
  const reasons = results
    .filter(
      (r) =>
        r.result.triggered && r.result.direction === direction && r.weight > 0,
    )
    .sort((a, b) => b.weight - a.weight)
    .map(({ key, name, weight, result }) => ({
      key,
      name,
      weight,
      reason: result.reason,
    }));

  return {
    direction,
    score: Math.round((Math.max(bullish, bearish) / totalWeight) * 100),
    reasons,
  };
}
