import type { Direction } from '@chart-goblin/shared';

export function DirectionBadge({ direction }: { direction: Direction }) {
  const bullish = direction === 'bullish';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
        bullish
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-rose-500/10 text-rose-400'
      }`}
    >
      {bullish ? '▲' : '▼'} {bullish ? 'Bullish' : 'Bearish'}
    </span>
  );
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-slate-500';
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2" title={`Score ${score}/100`}>
      <span className="tabular w-7 text-right font-semibold text-slate-100">
        {score}
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full ${scoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
