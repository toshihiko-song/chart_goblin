import { TIMEFRAMES } from '@chart-goblin/shared';
import { useRunScan, useScannerStatus } from '../api/hooks';
import { TIMEFRAME_LABEL, timeAgo } from '../lib/format';
import { ErrorText } from './ui';

/** Last scan per timeframe, with a button to scan now. */
export function ScanStatus() {
  const { data } = useScannerStatus();
  const runScan = useRunScan();

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TIMEFRAMES.map((tf) => {
          const status = data?.find((s) => s.timeframe === tf);
          const running =
            status?.running || (runScan.isPending && runScan.variables === tf);
          const run = status?.lastRun;
          return (
            <div
              key={tf}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200">
                  {TIMEFRAME_LABEL[tf]}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {running
                    ? 'Scanning…'
                    : run
                      ? `${timeAgo(run.finishedAt)} · ${run.coinsScanned} coins${
                          run.coinsFailed ? `, ${run.coinsFailed} failed` : ''
                        }`
                      : 'Never scanned'}
                </div>
              </div>
              <button
                type="button"
                disabled={running}
                onClick={() => runScan.mutate(tf)}
                className="rounded-md px-2 py-1 text-xs text-emerald-400 hover:bg-slate-800 disabled:opacity-40"
                title={`Scan ${TIMEFRAME_LABEL[tf]} now`}
              >
                {running ? '…' : 'Scan'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-2">
        <ErrorText error={runScan.error} />
      </div>
    </div>
  );
}
