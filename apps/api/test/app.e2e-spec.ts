import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Requires a running database (npm run db:up).
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', db: 'up' });
  });

  it('GET /api/settings/strategies lists every strategy', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/settings/strategies')
      .expect(200);
    expect(res.body.map((s: { key: string }) => s.key)).toEqual([
      'ma-cross',
      'rsi',
      'macd',
      'volume-spike',
      'breakout',
      'trend',
    ]);
  });

  it('PATCH /api/settings/strategies/:key validates params', () => {
    return request(app.getHttpServer())
      .patch('/api/settings/strategies/ma-cross')
      .send({ params: { fastPeriod: 100, slowPeriod: 50 } })
      .expect(400);
  });

  it('GET /api/signals filters by candle close age', async () => {
    const prisma = app.get(PrismaService);
    const coin = await prisma.coin.create({
      data: {
        coingeckoId: `e2e-fresh-${Date.now()}`,
        symbol: 'FRESH',
        name: 'Fresh',
        mexcSymbol: `FRESH${Date.now()}USDT`,
      },
    });
    const quarter = 15 * 60_000;
    // 15m candles that closed ~5 and ~65 minutes ago.
    const lastClose = Math.floor(Date.now() / quarter) * quarter;
    const closedAt = (minutesAgo: number) =>
      new Date(lastClose - Math.floor(minutesAgo / 15) * quarter - quarter);
    for (const minutesAgo of [0, 60]) {
      await prisma.signal.create({
        data: {
          coinId: coin.id,
          timeframe: '15m',
          candleOpenTime: closedAt(minutesAgo),
          direction: 'bullish',
          score: 80,
          price: 1,
          reasons: [],
          results: [],
        },
      });
    }

    const count = async (maxAgeMinutes: number) => {
      const res = await request(app.getHttpServer())
        .get('/api/signals')
        .query({ scope: 'history', symbol: coin.mexcSymbol, maxAgeMinutes })
        .expect(200);
      return res.body.total as number;
    };
    try {
      expect(await count(15)).toBe(1);
      expect(await count(120)).toBe(2);
      expect(await count(0)).toBe(2);
    } finally {
      await prisma.coin.delete({ where: { id: coin.id } });
    }
  });
});
