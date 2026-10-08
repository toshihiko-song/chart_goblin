import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  lastClosedOpenTime,
  type GeneralSettings,
  type ScanRunSummary,
  type StrategyResultDto,
  type Timeframe,
} from '@chart-goblin/shared';
import { CandlesService } from '../candles/candles.service.js';
import { CoinsService } from '../coins/coins.service.js';
import { mapWithConcurrency } from '../common/concurrency.js';
import type { Env } from '../config/env.js';
import type { Coin } from '../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  StrategyConfigService,
  type ActiveStrategy,
} from '../settings/strategy-config.service.js';
import { scoreResults, type WeightedResult } from '../signals/scoring.js';
import { SignalsService } from '../signals/signals.service.js';
import type { StrategyResult } from '../strategies/strategy.js';

/** Parallel coins per scan; keeps MEXC requests well under rate limits. */
const CONCURRENCY = 4;

interface CoinScanResult {
  signal: boolean;
  alert: boolean;
}

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  /** Timeframes with a scan queued or in progress. */
  private readonly running = new Set<Timeframe>();
  /**
   * Scans run one at a time: several timeframes close together at the top of
   * the hour, and running them in parallel would multiply MEXC request rates.
   */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly coins: CoinsService,
    private readonly candles: CandlesService,
    private readonly settings: SettingsService,
    private readonly strategyConfigs: StrategyConfigService,
    private readonly signals: SignalsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Each job runs shortly after the candle closes (UTC, like MEXC candles).
  @Cron('20 */5 * * * *', { name: 'scan-5m', timeZone: 'UTC' })
  scan5m(): Promise<void> {
    return this.scheduled('5m');
  }

  @Cron('30 */15 * * * *', { name: 'scan-15m', timeZone: 'UTC' })
  scan15m(): Promise<void> {
    return this.scheduled('15m');
  }

  @Cron('45 0 * * * *', { name: 'scan-1h', timeZone: 'UTC' })
  scan1h(): Promise<void> {
    return this.scheduled('1h');
  }

  @Cron('0 1 */4 * * *', { name: 'scan-4h', timeZone: 'UTC' })
  scan4h(): Promise<void> {
    return this.scheduled('4h');
  }

  @Cron('15 1 0 * * *', { name: 'scan-1d', timeZone: 'UTC' })
  scan1d(): Promise<void> {
    return this.scheduled('1d');
  }

  isRunning(timeframe: Timeframe): boolean {
    return this.running.has(timeframe);
  }

  /**
   * Manually scans every enabled timeframe (queued one after another).
   * Timeframes already scanning are skipped rather than rejected.
   */
  async runAll(): Promise<ScanRunSummary[]> {
    const { timeframes } = await this.settings.getGeneral();
    return Promise.all(
      timeframes
        .filter((tf) => !this.running.has(tf))
        .map((tf) => this.run(tf)),
    );
  }

  /** Scans every scannable coin on one timeframe, after any queued scans. */
  async run(timeframe: Timeframe): Promise<ScanRunSummary> {
    if (this.running.has(timeframe)) {
      throw new ConflictException(`A ${timeframe} scan is already running`);
    }
    this.running.add(timeframe);
    const scan = this.queue.then(() => this.execute(timeframe));
    this.queue = scan.catch(() => undefined);
    try {
      return await scan;
    } finally {
      this.running.delete(timeframe);
    }
  }

  private async scheduled(timeframe: Timeframe): Promise<void> {
    if (!this.config.get('SCHEDULER_ENABLED', { infer: true })) return;
    const settings = await this.settings.getGeneral();
    if (!settings.timeframes.includes(timeframe) || this.running.has(timeframe))
      return;
    try {
      await this.run(timeframe);
    } catch (error) {
      this.logger.error(`${timeframe} scan failed`, error as Error);
    }
  }

  private async execute(timeframe: Timeframe): Promise<ScanRunSummary> {
    const startedAt = new Date();
    const candleOpenTime = lastClosedOpenTime(timeframe, startedAt.getTime());
    const [coins, strategies, settings] = await Promise.all([
      this.coins.findScannable(),
      this.strategyConfigs.getActive(),
      this.settings.getGeneral(),
    ]);

    const results = await mapWithConcurrency(coins, CONCURRENCY, (coin) =>
      this.scanCoin(coin, timeframe, candleOpenTime, strategies, settings),
    );

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        this.logger.warn(
          `${timeframe} ${coins[i].mexcSymbol}: ${(r.reason as Error).message}`,
        );
      }
    });
    const ok = results.flatMap((r) =>
      r.status === 'fulfilled' ? [r.value] : [],
    );

    const summary: ScanRunSummary = {
      timeframe,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      coinsScanned: ok.length,
      coinsFailed: results.length - ok.length,
      signals: ok.filter((r) => r.signal).length,
      alerts: ok.filter((r) => r.alert).length,
    };
    await this.signals.saveScanRun({
      ...summary,
      candleOpenTime: new Date(candleOpenTime).toISOString(),
    });
    this.logger.log(
      `${timeframe} scan: ${summary.coinsScanned} coins, ${summary.signals} signals, ` +
        `${summary.alerts} alerts, ${summary.coinsFailed} failed`,
    );
    return summary;
  }

  private async scanCoin(
    coin: Coin,
    timeframe: Timeframe,
    candleOpenTime: number,
    strategies: ActiveStrategy[],
    settings: GeneralSettings,
  ): Promise<CoinScanResult> {
    const none = { signal: false, alert: false };
    if (!coin.mexcSymbol) return none;

    const needed = Math.max(
      50,
      ...strategies.map((s) => s.strategy.requiredCandles(s.params)),
    );
    await this.candles.sync(
      { id: coin.id, mexcSymbol: coin.mexcSymbol },
      timeframe,
      {
        minCandles: needed,
      },
    );
    const candles = await this.candles.getRecent(coin.id, timeframe, needed);
    if (candles.at(-1)?.openTime !== candleOpenTime) {
      throw new Error(
        'Latest closed candle missing (pair halted or delisted?)',
      );
    }

    const weighted: WeightedResult[] = strategies.map(
      ({ strategy, params, weight }) => ({
        key: strategy.key,
        name: strategy.name,
        weight,
        result: this.evaluateSafely(() => strategy.evaluate(candles, params)),
      }),
    );
    const outcome = scoreResults(weighted);
    if (!outcome || outcome.score < settings.minSignalScore) return none;

    const signal = await this.signals.record({
      coinId: coin.id,
      timeframe,
      candleOpenTime: new Date(candleOpenTime),
      price: candles.at(-1)!.close,
      outcome,
      results: weighted.map<StrategyResultDto>(({ key, name, result }) => ({
        key,
        name,
        ...result,
      })),
    });
    const decision = await this.notifications.maybeAlert(signal, settings);
    return { signal: true, alert: decision === 'sent' };
  }

  private evaluateSafely(evaluate: () => StrategyResult): StrategyResult {
    try {
      return evaluate();
    } catch (error) {
      return {
        triggered: false,
        direction: 'neutral',
        reason: `Error: ${(error as Error).message}`,
      };
    }
  }
}
