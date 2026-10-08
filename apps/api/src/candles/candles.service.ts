import { Injectable } from '@nestjs/common';
import {
  lastClosedOpenTime,
  TIMEFRAME_MS,
  type Candle,
  type Timeframe,
} from '@chart-goblin/shared';
import { MexcClient } from '../market-data/mexc.client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Candles fetched on the first sync of a coin/timeframe. */
export const BACKFILL_CANDLES = 500;
/** Candles kept per coin/timeframe; older ones are pruned. */
export const RETAINED_CANDLES = 1000;
/** MEXC's maximum kline limit per request. */
const MAX_FETCH = 1000;

export interface SyncTarget {
  id: number;
  mexcSymbol: string;
}

export interface SyncOptions {
  /** History the caller needs; triggers a deeper backfill if not stored yet. */
  minCandles?: number;
  now?: number;
}

@Injectable()
export class CandlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mexc: MexcClient,
  ) {}

  /**
   * Brings stored candles up to date with the latest closed candle.
   * Only closed candles are stored, so existing rows never change.
   * Returns the number of new candles.
   */
  async sync(
    coin: SyncTarget,
    timeframe: Timeframe,
    { minCandles = 0, now = Date.now() }: SyncOptions = {},
  ): Promise<number> {
    const tfMs = TIMEFRAME_MS[timeframe];
    const lastClosed = lastClosedOpenTime(timeframe, now);
    const where = { coinId: coin.id, timeframe };
    const backfill = Math.min(
      Math.max(BACKFILL_CANDLES, minCandles),
      MAX_FETCH,
    );

    const [latest, stored] = await Promise.all([
      this.prisma.candle.findFirst({
        where,
        orderBy: { openTime: 'desc' },
        select: { openTime: true },
      }),
      this.prisma.candle.count({ where }),
    ]);
    let latestTime = latest?.openTime.getTime();
    const missing =
      latestTime === undefined ? Infinity : (lastClosed - latestTime) / tfMs;

    // Start over when too far behind to fill the gap in one request (indicators
    // assume a contiguous series) or when the caller needs more history than is
    // stored. For pairs younger than `minCandles` this refetches each time,
    // which is a single request.
    if (
      latestTime !== undefined &&
      (missing > MAX_FETCH || (stored < backfill && stored < minCandles))
    ) {
      await this.prisma.candle.deleteMany({ where });
      latestTime = undefined;
    }
    if (latestTime !== undefined && latestTime >= lastClosed) return 0;
    const limit = latestTime === undefined ? backfill : missing;

    // +1 because the newest kline MEXC returns is usually still open.
    const candles = await this.mexc.getKlines(coin.mexcSymbol, timeframe, {
      limit: limit + 1,
    });
    const closed = candles.filter((c) => c.openTime <= lastClosed);

    const { count } = await this.prisma.candle.createMany({
      data: closed.map((c) => ({
        coinId: coin.id,
        timeframe,
        openTime: new Date(c.openTime),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      skipDuplicates: true,
    });

    await this.prisma.candle.deleteMany({
      where: {
        coinId: coin.id,
        timeframe,
        openTime: { lt: new Date(lastClosed - RETAINED_CANDLES * tfMs) },
      },
    });
    return count;
  }

  /** The most recent `limit` stored candles, oldest → newest. */
  async getRecent(
    coinId: number,
    timeframe: Timeframe,
    limit: number,
  ): Promise<Candle[]> {
    const rows = await this.prisma.candle.findMany({
      where: { coinId, timeframe },
      orderBy: { openTime: 'desc' },
      take: limit,
    });
    return rows.reverse().map((r) => ({
      openTime: r.openTime.getTime(),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }));
  }
}
