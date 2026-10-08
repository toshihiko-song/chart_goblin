import { TIMEFRAMES, type Timeframe } from '@chart-goblin/shared';
import type { UrlFilters } from '../lib/useSignalFilters';
import { TIMEFRAME_LABEL } from '../lib/format';
import { inputClass, Segmented } from './ui';

const AGE_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 1440, label: '24 hours' },
  { value: 0, label: 'Any time' },
];

export function SignalFilters({
  filters,
  onChange,
  defaultMaxAge,
}: {
  filters: UrlFilters;
  onChange: (patch: Partial<UrlFilters>) => void;
  /** Shows the "Closed within" filter; the value used when the URL has none. */
  defaultMaxAge?: number;
}) {
  const age = filters.maxAgeMinutes ?? defaultMaxAge;
  const ageOptions = AGE_OPTIONS.some((o) => o.value === age)
    ? AGE_OPTIONS
    : [...AGE_OPTIONS, { value: age ?? 0, label: `${age} min` }];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {defaultMaxAge !== undefined && (
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Closed within
          <select
            value={age}
            onChange={(e) =>
              onChange({ maxAgeMinutes: Number(e.target.value) })
            }
            className={inputClass}
          >
            {ageOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <Segmented
        value={filters.tf ?? 'all'}
        options={[
          { value: 'all', label: 'All' },
          ...TIMEFRAMES.map((tf) => ({
            value: tf,
            label: TIMEFRAME_LABEL[tf],
          })),
        ]}
        onChange={(v) =>
          onChange({ tf: v === 'all' ? undefined : (v as Timeframe) })
        }
      />
      <Segmented
        value={filters.direction ?? 'all'}
        options={[
          { value: 'all', label: 'Both' },
          { value: 'bullish', label: '▲ Bull' },
          { value: 'bearish', label: '▼ Bear' },
        ]}
        onChange={(v) =>
          onChange({
            direction: v === 'all' ? undefined : (v as 'bullish' | 'bearish'),
          })
        }
      />
      <label className="flex items-center gap-2 text-sm text-slate-400">
        Min score
        <input
          type="number"
          min={0}
          max={100}
          step={5}
          value={filters.minScore ?? ''}
          placeholder="0"
          onChange={(e) =>
            onChange({
              minScore:
                e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          className={`${inputClass} w-20`}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-400">
        Sort
        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({ sort: e.target.value as 'score' | 'time' })
          }
          className={inputClass}
        >
          <option value="score">Score</option>
          <option value="time">Newest</option>
        </select>
      </label>
    </div>
  );
}
