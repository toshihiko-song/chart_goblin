import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { GeneralSettings } from '@chart-goblin/shared';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TelegramClient } from '../src/notifications/telegram.client.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { signalInclude } from '../src/signals/signal.mapper.js';

class FakeTelegram extends TelegramClient {
  readonly sent: string[] = [];
  isConfigured = () => true;
  sendMessage = async (html: string) => {
    this.sent.push(html);
  };
}

const settings: GeneralSettings = {
  timeframes: ['1h'],
  minQuoteVolumeUsd: 0,
  minSignalScore: 0,
  minAlertScore: 60,
  telegramEnabled: true,
  alertCooldownCandles: 4,
  maxSignalAgeMinutes: 15,
};

// Requires a running database (npm run db:up).
describe('NotificationsService (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let telegram: FakeTelegram;
  let coinId: number;

  const createSignal = (hoursAgo: number, score = 80) =>
    prisma.signal.create({
      data: {
        coinId,
        timeframe: '1h',
        candleOpenTime: new Date(Date.UTC(2026, 0, 1, 12 - hoursAgo)),
        direction: 'bullish',
        score,
        price: 1,
        reasons: [
          { key: 'ma-cross', name: 'MA Cross', weight: 25, reason: 'test' },
        ],
        results: [],
      },
      include: signalInclude,
    });

  beforeAll(async () => {
    telegram = new FakeTelegram();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TelegramClient)
      .useValue(telegram)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);

    const coin = await prisma.coin.create({
      data: {
        coingeckoId: `e2e-${Date.now()}`,
        symbol: 'E2E',
        name: 'E2E Coin',
      },
    });
    coinId = coin.id;
  });

  afterAll(async () => {
    await prisma.coin.delete({ where: { id: coinId } });
    await app.close();
  });

  it('alerts once, then dedupes and applies the cooldown', async () => {
    const first = await createSignal(3);
    expect(await notifications.maybeAlert(first, settings)).toBe('sent');
    expect(telegram.sent).toHaveLength(1);
    expect(telegram.sent[0]).toContain('E2E/USDT');

    const reloaded = await prisma.signal.findUniqueOrThrow({
      where: { id: first.id },
      include: signalInclude,
    });
    expect(await notifications.maybeAlert(reloaded, settings)).toBe(
      'already-sent',
    );

    // Two candles later: within the 4-candle cooldown.
    expect(
      await notifications.maybeAlert(await createSignal(1), settings),
    ).toBe('cooldown');
    expect(
      await notifications.maybeAlert(await createSignal(0, 50), settings),
    ).toBe('below-threshold');
    expect(telegram.sent).toHaveLength(1);
  });

  it('respects the telegram toggle', async () => {
    const signal = await createSignal(10);
    expect(
      await notifications.maybeAlert(signal, {
        ...settings,
        telegramEnabled: false,
      }),
    ).toBe('disabled');
  });
});
