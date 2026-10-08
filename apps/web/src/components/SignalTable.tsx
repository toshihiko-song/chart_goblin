import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { TIMEFRAME_MS, type SignalDto } from '@chart-goblin/shared';
import {
  formatDateTime,
  formatPrice,
  pairLabel,
  TIMEFRAME_LABEL,
  timeAgo,
} from '../lib/format';
import { DirectionBadge, ScoreBar } from './badges';
import { EmptyState } from './ui';

interface Props {
  signals: SignalDto[];
  emptyMessage: string;
  /** Hide the pair column (e.g. on the coin page). */
  hidePair?: boolean;
}

export function SignalTable({ signals, emptyMessage, hidePair }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (signals.length === 0) return <EmptyState>{emptyMessage}</EmptyState>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr className="border-b border-slate-800">
            {!hidePair && <th className="px-4 py-2 font-medium">Pair</th>}
            <th className="px-3 py-2 font-medium">TF</th>
            <th className="px-3 py-2 font-medium">Signal</th>
            <th className="px-3 py-2 font-medium">Score</th>
            <th className="px-3 py-2 font-medium">Why</th>
            <th className="px-3 py-2 text-right font-medium">Price</th>
            <th className="px-4 py-2 text-right font-medium">Closed</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => {
            const open = expanded === s.id;
            return (
              <Fragment key={s.id}>
                <tr
                  onClick={() => setExpanded(open ? null : s.id)}
                  className="cursor-pointer border-b border-slate-800/60 hover:bg-slate-900"
                >
                  {!hidePair && (
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/coins/${s.coin.mexcSymbol ?? s.coin.symbol}?tf=${s.timeframe}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-slate-100 hover:text-emerald-400"
                      >
                        {pairLabel(s.coin.symbol)}
                      </Link>
                      <div className="text-xs text-slate-500">
                        #{s.coin.marketCapRank ?? '—'} {s.coin.name}
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-slate-300">
                    {TIMEFRAME_LABEL[s.timeframe]}
                  </td>
                  <td className="px-3 py-2.5">
                    <DirectionBadge direction={s.direction} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreBar score={s.score} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {s.reasons.map((r) => (
                        <span
                          key={r.key}
                          title={`${r.reason} (+${r.weight})`}
                          className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300"
                        >
                          {r.name}
                        </span>
                      ))}
                      {s.alerted && (
                        <span title="Telegram alert sent" className="text-xs">
                          🔔
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-slate-300">
                    {formatPrice(s.price)}
                  </td>
                  <td
                    className="px-4 py-2.5 text-right text-xs text-slate-500"
                    title={`Candle closed ${formatDateTime(closeTime(s))}`}
                  >
                    {timeAgo(closeTime(s))}
                  </td>
                </tr>
                {open && (
                  <tr className="border-b border-slate-800/60 bg-slate-900/60">
                    <td colSpan={hidePair ? 6 : 7} className="px-4 py-3">
                      <SignalBreakdown signal={s} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function closeTime(signal: SignalDto): string {
  const open = new Date(signal.candleOpenTime).getTime();
  return new Date(open + TIMEFRAME_MS[signal.timeframe]).toISOString();
}

/** Every evaluated strategy with its outcome, explaining the score. */
function SignalBreakdown({ signal }: { signal: SignalDto }) {
  const weights = new Map(signal.reasons.map((r) => [r.key, r.weight]));
  return (
    <div className="grid gap-1.5 text-sm sm:grid-cols-2">
      {signal.results.map((r) => {
        const counted = weights.has(r.key);
        return (
          <div key={r.key} className="flex items-baseline gap-2">
            <span className={counted ? 'text-emerald-400' : 'text-slate-600'}>
              {counted ? '✓' : '·'}
            </span>
            <span className={counted ? 'text-slate-200' : 'text-slate-500'}>
              <span className="font-medium">{r.name}</span>: {r.reason}
              {counted && (
                <span className="text-slate-500"> (+{weights.get(r.key)})</span>
              )}
            </span>
          </div>
        );
      })}
      <div className="text-xs text-slate-500 sm:col-span-2">
        Candle opened {formatDateTime(signal.candleOpenTime)} · detected{' '}
        {formatDateTime(signal.createdAt)}
      </div>
    </div>
  );
}
