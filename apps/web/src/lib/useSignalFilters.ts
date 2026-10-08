import { TIMEFRAMES, type Timeframe } from '@chart-goblin/shared';
import { useSearchParams } from 'react-router';
import type { SignalFilters as Filters } from '../api/hooks';

export type UrlFilters = Pick<
  Filters,
  'tf' | 'direction' | 'minScore' | 'sort' | 'maxAgeMinutes'
>;

/** Signal filters kept in the URL so views are shareable and survive reloads. */
export function useSignalFilters(): [
  UrlFilters,
  (patch: Partial<UrlFilters>) => void,
] {
  const [params, setParams] = useSearchParams();
  const tf = params.get('tf');
  const direction = params.get('direction');
  const minScore = params.get('minScore');
  const maxAge = params.get('maxAgeMinutes');
  const filters: UrlFilters = {
    tf: (TIMEFRAMES as readonly string[]).includes(tf ?? '')
      ? (tf as Timeframe)
      : undefined,
    direction:
      direction === 'bullish' || direction === 'bearish'
        ? direction
        : undefined,
    minScore: minScore ? Number(minScore) : undefined,
    sort: params.get('sort') === 'time' ? 'time' : 'score',
    maxAgeMinutes: maxAge ? Number(maxAge) : undefined,
  };

  const update = (patch: Partial<UrlFilters>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) next.delete(key);
      else next.set(key, String(value));
    }
    next.delete('page');
    setParams(next, { replace: true });
  };
  return [filters, update];
}
