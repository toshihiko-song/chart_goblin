import { useRunAllScans, useScannerStatus } from '../api/hooks';
import { Button, ErrorText } from './ui';

/** Rescans every enabled timeframe on demand and reports the outcome. */
export function ScanAllButton() {
  const scanAll = useRunAllScans();
  const { data: status } = useScannerStatus();
  const busy = scanAll.isPending || Boolean(status?.some((s) => s.running));

  const summary = scanAll.data;
  const signals = summary?.reduce((sum, r) => sum + r.signals, 0) ?? 0;
  const alerts = summary?.reduce((sum, r) => sum + r.alerts, 0) ?? 0;
  const failed = summary?.reduce((sum, r) => sum + r.coinsFailed, 0) ?? 0;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        disabled={busy}
        onClick={() => scanAll.mutate()}
      >
        <span className={busy ? 'inline-block animate-spin' : undefined}>
          ↻
        </span>
        {busy ? 'Scanning…' : 'Scan now'}
      </Button>
      {summary && !scanAll.isPending && (
        <span className="text-xs text-slate-400">
          {summary.length === 0
            ? 'Scans already in progress'
            : `Scanned ${summary.length} timeframe${summary.length === 1 ? '' : 's'} · ${signals} signals · ${alerts} alerts${failed ? ` · ${failed} coins failed` : ''}`}
        </span>
      )}
      <ErrorText error={scanAll.error} />
    </div>
  );
}
