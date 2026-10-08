import { Injectable } from '@nestjs/common';
import {
  TIMEFRAME_MS,
  TIMEFRAMES,
  type Paginated,
  type ScanRunSummary,
  type SignalDto,
  type StrategyResultDto,
  type Timeframe,
} from '@chart-goblin/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ScoreOutcome } from './scoring.js';
import {
  signalInclude,
  toSignalDto,
  type SignalWithRelations,
} from './signal.mapper.js';

const SCAN_RUNS_KEY = 'scan-runs';

export interface ScanRunRecord extends ScanRunSummary {
  /** Open time (ISO) of the candle evaluated by this run. */
  candleOpenTime: string;
}

export interface SignalQuery {
  /** current = signals from the latest scan of each timeframe. */
  scope: 'current' | 'history';
  timeframe?: Timeframe;
  direction?: 'bullish' | 'bearish';
  minScore?: number;
  /** MEXC pair, e.g. BTCUSDT */
  symbol?: string;
  /** Only signals whose candle closed within this many minutes (0/undefined = no limit). */
  maxAgeMinutes?: number;
  sort: 'score' | 'time';
  limit: number;
  offset: number;
}

export interface NewSignal {
  coinId: number;
  timeframe: Timeframe;
  candleOpenTime: Date;
  price: number;
  outcome: ScoreOutcome;
  results: StrategyResultDto[];
}

@Injectable()
export class SignalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent per coin/timeframe/candle/direction, so re-scans don't duplicate. */
  record(signal: NewSignal): Promise<SignalWithRelations> {
    const { coinId, timeframe, candleOpenTime, price, outcome, results } =
      signal;
    const data = {
      score: outcome.score,
      price,
      reasons: outcome.reasons as unknown as Prisma.InputJsonValue,
      results: results as unknown as Prisma.InputJsonValue,
    };
    return this.prisma.signal.upsert({
      where: {
        coinId_timeframe_candleOpenTime_direction: {
          coinId,
          timeframe,
          candleOpenTime,
          direction: outcome.direction,
        },
      },
      create: {
        coinId,
        timeframe,
        candleOpenTime,
        direction: outcome.direction,
        ...data,
      },
      update: data,
      include: signalInclude,
    });
  }

  async find(query: SignalQuery): Promise<Paginated<SignalDto>> {
    const where: Prisma.SignalWhereInput = {
      timeframe: query.timeframe,
      direction: query.direction,
      score: query.minScore !== undefined ? { gte: query.minScore } : undefined,
      coin: query.symbol
        ? { mexcSymbol: query.symbol.toUpperCase() }
        : undefined,
    };

    // A candle "closed" at open + timeframe; it is fresh if that is within
    // the max age, i.e. it opened at or after now - maxAge - timeframe.
    const now = Date.now();
    const freshSince = (tf: Timeframe): Date | undefined =>
      query.maxAgeMinutes
        ? new Date(now - query.maxAgeMinutes * 60_000 - TIMEFRAME_MS[tf])
        : undefined;

    if (query.scope === 'current') {
      const runs = await this.getScanRuns();
      const latest = TIMEFRAMES.flatMap((tf) => {
        const run = runs[tf];
        if (!run) return [];
        const candleOpenTime = new Date(run.candleOpenTime);
        const since = freshSince(tf);
        return since && candleOpenTime < since
          ? []
          : [{ timeframe: tf, candleOpenTime }];
      });
      if (latest.length === 0) return { items: [], total: 0 };
      where.OR = latest;
    } else if (query.maxAgeMinutes) {
      where.OR = TIMEFRAMES.map((tf) => ({
        timeframe: tf,
        candleOpenTime: { gte: freshSince(tf) },
      }));
    }

    const orderBy: Prisma.SignalOrderByWithRelationInput[] =
      query.sort === 'score'
        ? [{ score: 'desc' }, { candleOpenTime: 'desc' }]
        : [{ candleOpenTime: 'desc' }, { score: 'desc' }];

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.signal.findMany({
        where,
        orderBy,
        take: query.limit,
        skip: query.offset,
        include: signalInclude,
      }),
      this.prisma.signal.count({ where }),
    ]);
    return { items: rows.map(toSignalDto), total };
  }

  async getScanRuns(): Promise<Partial<Record<Timeframe, ScanRunRecord>>> {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: SCAN_RUNS_KEY },
    });
    return (row?.value ?? {}) as Partial<Record<Timeframe, ScanRunRecord>>;
  }

  async saveScanRun(run: ScanRunRecord): Promise<void> {
    const runs = { ...(await this.getScanRuns()), [run.timeframe]: run };
    await this.prisma.appSetting.upsert({
      where: { key: SCAN_RUNS_KEY },
      create: {
        key: SCAN_RUNS_KEY,
        value: runs as unknown as Prisma.InputJsonValue,
      },
      update: { value: runs as unknown as Prisma.InputJsonValue },
    });
  }
}
