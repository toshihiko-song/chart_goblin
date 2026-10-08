import { useState } from 'react';
import { Link } from 'react-router';
import { useCoins, useRefreshCoins } from '../api/hooks';
import {
  Button,
  Card,
  EmptyState,
  ErrorText,
  PageHeader,
  Toggle,
} from '../components/ui';
import { formatUsd } from '../lib/format';

export function CoinsPage() {
  const { data: coins = [], error, isLoading } = useCoins();
  const refresh = useRefreshCoins();
  const [scannableOnly, setScannableOnly] = useState(false);
  const shown = scannableOnly ? coins.filter((c) => c.isScannable) : coins;
  const scannable = coins.filter((c) => c.isScannable).length;

  return (
    <>
      <PageHeader
        title="Coin universe"
        subtitle={`CoinGecko top ${coins.length} · ${scannable} scannable on MEXC (USDT pair with enough 24h volume). Refreshed daily.`}
        actions={
          <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? 'Refreshing…' : '↻ Refresh now'}
          </Button>
        }
      />
      <ErrorText error={error ?? refresh.error} />
      <Card
        title={`${shown.length} coins`}
        actions={
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <Toggle
              checked={scannableOnly}
              onChange={setScannableOnly}
              label="Scannable only"
            />
            Scannable only
          </label>
        }
      >
        {!isLoading && shown.length === 0 ? (
          <EmptyState>No coins yet. Click “Refresh now”.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Coin</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Market cap
                  </th>
                  <th className="px-3 py-2 font-medium">MEXC pair</th>
                  <th className="px-3 py-2 text-right font-medium">
                    MEXC 24h vol
                  </th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-800/60 hover:bg-slate-900"
                  >
                    <td className="tabular px-4 py-2 text-slate-500">
                      {c.marketCapRank}
                    </td>
                    <td className="px-3 py-2">
                      {c.mexcSymbol ? (
                        <Link
                          to={`/coins/${c.mexcSymbol}`}
                          className="font-medium text-slate-100 hover:text-emerald-400"
                        >
                          {c.symbol}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-400">
                          {c.symbol}
                        </span>
                      )}
                      <span className="ml-2 text-slate-500">{c.name}</span>
                    </td>
                    <td className="tabular px-3 py-2 text-right text-slate-300">
                      {formatUsd(c.marketCapUsd)}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {c.mexcSymbol ?? '—'}
                    </td>
                    <td className="tabular px-3 py-2 text-right text-slate-300">
                      {formatUsd(c.quoteVolume24h)}
                    </td>
                    <td className="px-4 py-2">
                      {c.isScannable ? (
                        <span className="text-xs text-emerald-400">
                          ● Scanning
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {c.mexcSymbol
                            ? 'Low liquidity'
                            : 'No MEXC pair / excluded'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
