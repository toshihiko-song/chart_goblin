import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { TIMEFRAMES, type Timeframe } from '@chart-goblin/shared';
import { useCandles, useCoin, useSignals, useStrategies } from '../api/hooks';
import { CandleChart } from '../components/CandleChart';
import { SignalTable } from '../components/SignalTable';
import {
  Card,
  EmptyState,
  ErrorText,
  PageHeader,
  Segmented,
} from '../components/ui';
import {
  indicatorColor,
  indicatorsFromStrategies,
} from '../lib/chart-indicators';
import {
  formatPrice,
  formatUsd,
  pairLabel,
  TIMEFRAME_LABEL,
  tradingViewUrl,
} from '../lib/format';

export function CoinPage() {
  const { symbol = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tfParam = params.get('tf');
  const tf: Timeframe = (TIMEFRAMES as readonly string[]).includes(
    tfParam ?? '',
  )
    ? (tfParam as Timeframe)
    : '1h';
  // Strategy keys whose indicators the user has hidden on this chart.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const coin = useCoin(symbol);
  const candles = useCandles(symbol, tf);
  const mexcSymbol = coin.data?.mexcSymbol ?? undefined;
  const enabledQuery = { enabled: Boolean(mexcSymbol) };
  const chartSignals = useSignals(
    { scope: 'history', symbol: mexcSymbol, tf, limit: 500, sort: 'time' },
    enabledQuery,
  );
  const allSignals = useSignals(
    { scope: 'history', symbol: mexcSymbol, limit: 100, sort: 'time' },
    enabledQuery,
  );
  const strategies = useStrategies();
  // Indicators of the enabled strategies, with their configured params.
  const available = useMemo(
    () => indicatorsFromStrategies(strategies.data ?? []),
    [strategies.data],
  );
  const indicators = useMemo(
    () => available.filter((i) => !hidden.has(i.key)),
    [available, hidden],
  );

  const toggleIndicator = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (coin.error) {
    return (
      <>
        <ErrorText error={coin.error} />
        <Link to="/coins" className="text-sm text-emerald-400">
          ← Back to coins
        </Link>
      </>
    );
  }
  const c = coin.data;
  const last = candles.data?.at(-1);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-baseline gap-3">
            {c ? pairLabel(c.symbol) : symbol}
            {last && (
              <span className="tabular text-base font-normal text-slate-300">
                {formatPrice(last.close)}
              </span>
            )}
          </span>
        }
        subtitle={
          c && (
            <>
              {c.name} · Rank #{c.marketCapRank ?? '—'} · Market cap{' '}
              {formatUsd(c.marketCapUsd)} · MEXC 24h vol{' '}
              {formatUsd(c.quoteVolume24h)} ·{' '}
              {c.isScannable ? (
                <span className="text-emerald-400">scanning</span>
              ) : (
                <span className="text-slate-500">not scanned</span>
              )}
            </>
          )
        }
        actions={
          c?.mexcSymbol && (
            <a
              href={tradingViewUrl(c.mexcSymbol, tf)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              Open in TradingView ↗
            </a>
          )
        }
      />
      <Card
        className="mb-5"
        title={
          <Segmented
            value={tf}
            options={TIMEFRAMES.map((t) => ({
              value: t,
              label: TIMEFRAME_LABEL[t],
            }))}
            onChange={(t) => setParams({ tf: t }, { replace: true })}
          />
        }
        actions={
          <div className="flex flex-wrap gap-1.5">
            {available.length === 0 && !strategies.isLoading && (
              <span className="text-xs text-slate-500">
                No strategies enabled
              </span>
            )}
            {available.map((indicator) => {
              const on = !hidden.has(indicator.key);
              const color = indicatorColor(indicator);
              return (
                <button
                  key={indicator.key}
                  type="button"
                  onClick={() => toggleIndicator(indicator.key)}
                  title={on ? 'Hide on chart' : 'Show on chart'}
                  className={`rounded border px-2 py-0.5 text-xs transition-colors ${
                    on
                      ? 'border-slate-600 text-slate-100'
                      : 'border-slate-800 text-slate-500 line-through'
                  }`}
                  style={on ? { borderColor: color, color } : undefined}
                >
                  {indicator.label}
                </button>
              );
            })}
          </div>
        }
      >
        <div className="p-2">
          <ErrorText error={candles.error} />
          {c && !c.mexcSymbol ? (
            <EmptyState>No MEXC USDT pair for this coin.</EmptyState>
          ) : (
            <CandleChart
              candles={candles.data ?? []}
              indicators={indicators}
              signals={chartSignals.data?.items ?? []}
            />
          )}
        </div>
      </Card>
      <Card title="Signal history (all timeframes)">
        <SignalTable
          hidePair
          signals={allSignals.data?.items ?? []}
          emptyMessage="No signals for this coin yet."
        />
      </Card>
    </>
  );
}
