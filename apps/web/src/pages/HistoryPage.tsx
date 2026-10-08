import { useSearchParams } from 'react-router';
import { useSignals } from '../api/hooks';
import { SignalFilters } from '../components/SignalFilters';
import { SignalTable } from '../components/SignalTable';
import { useSignalFilters } from '../lib/useSignalFilters';
import { Button, Card, ErrorText, PageHeader } from '../components/ui';

const PAGE_SIZE = 50;

export function HistoryPage() {
  const [filters, setFilters] = useSignalFilters();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const { data, error } = useSignals({
    scope: 'history',
    ...filters,
    sort: params.get('sort') === 'score' ? 'score' : 'time',
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const goTo = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  };

  return (
    <>
      <PageHeader
        title="Signal history"
        subtitle="Every stored signal, newest first by default."
      />
      <Card
        title={`${data?.total ?? 0} signals`}
        actions={
          <SignalFilters
            filters={{
              ...filters,
              sort: params.get('sort') === 'score' ? 'score' : 'time',
            }}
            onChange={setFilters}
          />
        }
      >
        <ErrorText error={error} />
        <SignalTable
          signals={data?.items ?? []}
          emptyMessage="No signals recorded yet."
        />
        {pages > 1 && (
          <div className="flex items-center justify-end gap-3 px-4 py-3 text-sm text-slate-400">
            <Button disabled={page <= 1} onClick={() => goTo(page - 1)}>
              ← Prev
            </Button>
            Page {page} of {pages}
            <Button disabled={page >= pages} onClick={() => goTo(page + 1)}>
              Next →
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
