import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type { Env } from '../config/env.js';
import type { Coin } from '../generated/prisma/client.js';
import { CoinGeckoClient } from '../market-data/coingecko.client.js';
import { MexcClient } from '../market-data/mexc.client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { buildUniverse } from './universe.js';

export const UNIVERSE_SIZE = 100;

export interface UniverseRefreshResult {
  coins: number;
  mapped: number;
  scannable: number;
}

@Injectable()
export class CoinsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CoinsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coinGecko: CoinGeckoClient,
    private readonly mexc: MexcClient,
    private readonly settings: SettingsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Populate the universe on first start so the scanner has something to do. */
  onApplicationBootstrap(): void {
    if (!this.config.get('SCHEDULER_ENABLED', { infer: true })) return;
    void this.prisma.coin.count().then(async (count) => {
      if (count > 0) return;
      this.logger.log('No coins yet, refreshing universe');
      await this.refreshUniverseSafely();
    });
  }

  @Cron('0 10 0 * * *', { name: 'refresh-universe', timeZone: 'UTC' })
  async scheduledRefresh(): Promise<void> {
    if (!this.config.get('SCHEDULER_ENABLED', { infer: true })) return;
    await this.refreshUniverseSafely();
  }

  /**
   * Fetches the CoinGecko top coins, maps them to MEXC USDT pairs and applies the
   * liquidity filter. Coins that dropped out of the top list are kept (signals
   * reference them) but are no longer scanned.
   */
  async refreshUniverse(): Promise<UniverseRefreshResult> {
    const [markets, symbols, tickers, settings] = await Promise.all([
      this.coinGecko.getTopByMarketCap(UNIVERSE_SIZE),
      this.mexc.getSymbols(),
      this.mexc.get24hTickers(),
      this.settings.getGeneral(),
    ]);
    const universe = buildUniverse(
      markets,
      symbols,
      tickers,
      settings.minQuoteVolumeUsd,
    );

    await this.prisma.$transaction(async (tx) => {
      // Release all pairs first so a pair can move between coins without
      // violating the unique constraint on mexcSymbol.
      await tx.coin.updateMany({
        data: { mexcSymbol: null, isScannable: false, marketCapRank: null },
      });
      for (const {
        market,
        mexcSymbol,
        quoteVolume24h,
        isScannable,
      } of universe) {
        const data = {
          symbol: market.symbol,
          name: market.name,
          marketCapRank: market.marketCapRank,
          marketCapUsd: market.marketCapUsd,
          mexcSymbol,
          quoteVolume24h,
          isScannable,
        };
        await tx.coin.upsert({
          where: { coingeckoId: market.id },
          create: { coingeckoId: market.id, ...data },
          update: data,
        });
      }
    });

    const result = {
      coins: universe.length,
      mapped: universe.filter((e) => e.mexcSymbol).length,
      scannable: universe.filter((e) => e.isScannable).length,
    };
    this.logger.log(
      `Universe refreshed: ${result.coins} coins, ${result.mapped} on MEXC, ${result.scannable} scannable`,
    );
    return result;
  }

  findAll(): Promise<Coin[]> {
    return this.prisma.coin.findMany({
      where: { marketCapRank: { not: null } },
      orderBy: { marketCapRank: 'asc' },
    });
  }

  findScannable(): Promise<Coin[]> {
    return this.prisma.coin.findMany({
      where: { isScannable: true },
      orderBy: { marketCapRank: 'asc' },
    });
  }

  /** Looks a coin up by MEXC pair (e.g. "BTCUSDT") or CoinGecko symbol (e.g. "BTC"). */
  async findBySymbol(symbol: string): Promise<Coin> {
    const upper = symbol.toUpperCase();
    const coin = await this.prisma.coin.findFirst({
      where: { OR: [{ mexcSymbol: upper }, { symbol: upper }] },
      orderBy: [{ mexcSymbol: { sort: 'asc', nulls: 'last' } }],
    });
    if (!coin) throw new NotFoundException(`Unknown coin ${symbol}`);
    return coin;
  }

  private async refreshUniverseSafely(): Promise<void> {
    try {
      await this.refreshUniverse();
    } catch (error) {
      this.logger.error('Universe refresh failed', error as Error);
    }
  }
}
