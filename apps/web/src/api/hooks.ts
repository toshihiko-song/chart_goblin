import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CandleDto,
  CoinDto,
  GeneralSettings,
  Paginated,
  ScanRunSummary,
  SignalDto,
  StrategyConfigDto,
  Timeframe,
} from '@chart-goblin/shared';
import { api, jsonBody, queryString } from './client';

const REFRESH_MS = 60_000;

export interface SignalFilters {
  scope: 'current' | 'history';
  tf?: Timeframe;
  direction?: 'bullish' | 'bearish';
  minScore?: number;
  symbol?: string;
  /** Candle closed within N minutes; 0 = no limit. Omit to use the server default. */
  maxAgeMinutes?: number;
  sort?: 'score' | 'time';
  limit?: number;
  offset?: number;
}

export function useSignals(filters: SignalFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['signals', filters],
    enabled,
    queryFn: () =>
      api<Paginated<SignalDto>>(`/signals${queryString({ ...filters })}`),
    refetchInterval: REFRESH_MS,
    placeholderData: (previous) => previous,
  });
}

export function useCoins() {
  return useQuery({
    queryKey: ['coins'],
    queryFn: () => api<CoinDto[]>('/coins'),
  });
}

export function useCoin(symbol: string) {
  return useQuery({
    queryKey: ['coins', symbol],
    queryFn: () => api<CoinDto>(`/coins/${encodeURIComponent(symbol)}`),
  });
}

export function useCandles(symbol: string, tf: Timeframe, limit = 500) {
  return useQuery({
    queryKey: ['candles', symbol, tf, limit],
    queryFn: () =>
      api<CandleDto[]>(
        `/coins/${encodeURIComponent(symbol)}/candles${queryString({ tf, limit })}`,
      ),
    refetchInterval: REFRESH_MS,
  });
}

export function useRefreshCoins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ coins: number; mapped: number; scannable: number }>(
        '/coins/refresh',
        {
          method: 'POST',
        },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coins'] }),
  });
}

export interface ScannerStatus {
  timeframe: Timeframe;
  running: boolean;
  lastRun: (ScanRunSummary & { candleOpenTime: string }) | null;
}

export function useScannerStatus() {
  return useQuery({
    queryKey: ['scanner-status'],
    queryFn: () => api<ScannerStatus[]>('/scanner/status'),
    refetchInterval: (query) =>
      query.state.data?.some((s) => s.running) ? 3_000 : REFRESH_MS,
  });
}

export function useRunScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tf: Timeframe) =>
      api<ScanRunSummary>(`/scanner/run${queryString({ tf })}`, {
        method: 'POST',
      }),
    onMutate: () => qc.invalidateQueries({ queryKey: ['scanner-status'] }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['scanner-status'] });
      void qc.invalidateQueries({ queryKey: ['signals'] });
    },
  });
}

export function useRunAllScans() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<ScanRunSummary[]>('/scanner/run-all', { method: 'POST' }),
    onMutate: () => qc.invalidateQueries({ queryKey: ['scanner-status'] }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['scanner-status'] });
      void qc.invalidateQueries({ queryKey: ['signals'] });
    },
  });
}

export function useGeneralSettings() {
  return useQuery({
    queryKey: ['settings', 'general'],
    queryFn: () => api<GeneralSettings>('/settings/general'),
  });
}

export function useUpdateGeneralSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<GeneralSettings>) =>
      api<GeneralSettings>('/settings/general', jsonBody(patch)),
    onSuccess: (data) => qc.setQueryData(['settings', 'general'], data),
  });
}

export function useStrategies() {
  return useQuery({
    queryKey: ['settings', 'strategies'],
    queryFn: () => api<StrategyConfigDto[]>('/settings/strategies'),
  });
}

export type StrategyPatch = Partial<
  Pick<StrategyConfigDto, 'enabled' | 'weight' | 'params'>
>;

export function useUpdateStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, patch }: { key: string; patch: StrategyPatch }) =>
      api<StrategyConfigDto>(`/settings/strategies/${key}`, jsonBody(patch)),
    onSuccess: (updated) =>
      qc.setQueryData<StrategyConfigDto[]>(['settings', 'strategies'], (list) =>
        list?.map((s) => (s.key === updated.key ? updated : s)),
      ),
  });
}

export function useTelegramStatus() {
  return useQuery({
    queryKey: ['telegram-status'],
    queryFn: () =>
      api<{ telegramConfigured: boolean }>('/notifications/status'),
  });
}

export function useTestTelegram() {
  return useMutation({
    mutationFn: () => api<void>('/notifications/test', { method: 'POST' }),
  });
}
