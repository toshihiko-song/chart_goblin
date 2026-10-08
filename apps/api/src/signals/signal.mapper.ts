import type {
  SignalDto,
  SignalReason,
  StrategyResultDto,
  Timeframe,
} from '@chart-goblin/shared';
import type { Alert, Coin, Signal } from '../generated/prisma/client.js';

export type SignalWithRelations = Signal & { coin: Coin; alert: Alert | null };

export const signalInclude = { coin: true, alert: true } as const;

export function toSignalDto(signal: SignalWithRelations): SignalDto {
  return {
    id: signal.id,
    coin: {
      id: signal.coin.id,
      symbol: signal.coin.symbol,
      name: signal.coin.name,
      mexcSymbol: signal.coin.mexcSymbol,
      marketCapRank: signal.coin.marketCapRank,
    },
    timeframe: signal.timeframe as Timeframe,
    candleOpenTime: signal.candleOpenTime.toISOString(),
    direction: signal.direction as SignalDto['direction'],
    score: signal.score,
    price: signal.price,
    reasons: signal.reasons as unknown as SignalReason[],
    results: signal.results as unknown as StrategyResultDto[],
    alerted: signal.alert?.status === 'sent',
    createdAt: signal.createdAt.toISOString(),
  };
}
