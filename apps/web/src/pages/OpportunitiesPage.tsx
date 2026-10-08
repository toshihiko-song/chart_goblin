import { TIMEFRAME_MS, type Timeframe } from '@chart-goblin/shared';
import { useGeneralSettings, useSignals } from '../api/hooks';
import { ScanAllButton } from '../components/ScanAllButton';
import { ScanStatus } from '../components/ScanStatus';
import { SignalFilters } from '../components/SignalFilters';
import { SignalTable } from '../components/SignalTable';
import { TIMEFRAME_LABEL } from '../lib/format';
import { useSignalFilters } from '../lib/useSignalFilters';
import { Card, ErrorText, PageHeader } from '../components/ui';

function ageLabel(minutes: number): string {
  if (minutes === 0) return 'any time';
  if (minutes % 60 === 0)
    return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
  return `${minutes} minutes`;
}

/** Minutes until the next candle of `timeframe` closes and is scanned. */
function minutesToClose(timeframe: Timeframe, now = Date.now()): number {
  const ms = TIMEFRAME_MS[timeframe];
  return Math.ceil((Math.ceil(now / ms) * ms - now) / 60_000);
}

export function OpportunitiesPage() {
  const [filters, setFilters] = useSignalFilters();
  const { data: settings } = useGeneralSettings();
  const defaultMaxAge = settings?.maxSignalAgeMinutes;
  const maxAge = filters.maxAgeMinutes ?? defaultMaxAge;
  // Settings keep timeframes in TIMEFRAMES order, so the first is the fastest.
  const fastest = filters.tf ?? settings?.timeframes[0] ?? '5m';
  const { data, error, isLoading } = useSignals(
    { scope: 'current', limit: 500, ...filters, maxAgeMinutes: maxAge },
    { enabled: maxAge !== undefined },
  );

  return (
    <>
      <PageHeader
        title="Opportunities"
        subtitle={
          maxAge === undefined
            ? 'Fresh signals from the latest closed candles.'
            : `Signals whose candle closed within the last ${ageLabel(maxAge)}. Click a row to see why it scored.`
        }
        actions={<ScanAllButton />}
      />
      <ScanStatus />
      <Card
        title={`${data?.total ?? 0} fresh signals`}
        actions={
          <SignalFilters
            filters={filters}
            onChange={setFilters}
            defaultMaxAge={defaultMaxAge}
          />
        }
      >
        <ErrorText error={error} />
        {!isLoading && (
          <SignalTable
            signals={data?.items ?? []}
            emptyMessage={
              maxAge
                ? `Nothing in the last ${ageLabel(maxAge)}. The next ${TIMEFRAME_LABEL[fastest]} candle closes in ${minutesToClose(fastest)} min and is scanned automatically.`
                : 'No signals match. Try another timeframe or lower the min score.'
            }
          />
        )}
      </Card>
    </>
  );
}
