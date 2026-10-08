# Chart Goblin

A crypto opportunity scanner. It scans the CoinGecko top 100 coins on their MEXC USDT pairs (15m / 1h / 4h / 1d), runs a set of technical strategies, combines their results into a 0–100 score, sends Telegram alerts for strong signals, and shows everything in a dashboard.

It only **detects signals**. It never places orders.

## Quick start

Requires Node 24+ and Docker.

```bash
npm install                              # also builds packages/shared and generates the Prisma client
cp apps/api/.env.example apps/api/.env   # add Telegram credentials here (optional)
npm run db:up                            # Postgres 17 in Docker on localhost:5433
npm run db:migrate                       # apply Prisma migrations
npm run dev:api                          # API on http://localhost:3001/api
npm run dev:web                          # dashboard on http://localhost:5173
```

On first start the API loads the coin universe automatically. Scheduled scans run shortly after each candle closes (UTC). To scan immediately, use the **Scan** buttons on the Opportunities page.

## Layout

```
apps/api         NestJS modular monolith (Prisma + PostgreSQL)
apps/web         Vite + React dashboard (React Router, TanStack Query, Tailwind, lightweight-charts)
packages/shared  Pure TypeScript: timeframes, indicator math (SMA/EMA/RSI/MACD), API DTO types
```

API modules (`apps/api/src`):

| Module          | Responsibility                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `market-data`   | `CoinGeckoClient` and `MexcClient`: abstract classes with HTTP implementations                     |
| `coins`         | Top-100 universe, mapping to MEXC USDT pairs, stablecoin/wrapped-token exclusion, liquidity filter |
| `candles`       | Syncs and stores **closed** candles: 500 backfilled, incremental after that, 1000 kept             |
| `strategies`    | Pure strategies and their registry; no database, HTTP or Telegram access                           |
| `signals`       | Scoring, signal persistence, query API                                                             |
| `notifications` | `TelegramClient` and alert dedupe/cooldown                                                         |
| `scanner`       | Cron jobs per timeframe and manual scans; scans run one at a time                                  |
| `settings`      | General settings and per-strategy config (enabled, weight, params)                                 |

## Strategies and scoring

| Strategy     | Default params | Weight | Triggers when                                                  |
| ------------ | -------------- | -----: | -------------------------------------------------------------- |
| MA Cross     | EMA 20 / 50    |     25 | fast MA crosses the slow MA on the last closed candle          |
| RSI          | 14, 30 / 70    |     15 | RSI ≤ oversold (bullish) or ≥ overbought (bearish)             |
| MACD         | 12 / 26 / 9    |     20 | MACD line crosses its signal line                              |
| Volume Spike | 20 candles, 2× |     20 | volume ≥ multiplier × average; direction from the candle color |
| Breakout     | 20 candles     |     10 | close breaks the previous range high/low                       |
| Trend        | EMA 200        |     10 | close above (bullish) or below (bearish) the MA                |

For each direction:

```
score = triggered weight in that direction ÷ total enabled weight × 100
```

The signal takes the stronger direction. Disabling a strategy re-normalizes the scale, so scores still run 0–100. Each signal stores every strategy result, so the dashboard can show why it scored what it did.

- Signals below **min signal score** (default 30) are not stored.
- Signals at or above **min alert score** (default 60) are sent to Telegram.
- A signal is alerted at most once. There is also a per coin/timeframe/direction cooldown (default 4 candles).

### Adding a strategy

1. Implement `Strategy<P>` in `apps/api/src/strategies/impl/` with a zod `paramsSchema`, `defaultParams` and `defaultWeight`. Indicator math goes in `packages/shared` if it is reusable.
2. Add an instance to the list in `strategies.module.ts`.

The config row is seeded on startup. The settings page builds its form from the zod schema (exported as JSON Schema), so no UI changes are needed.

## Configuration

`apps/api/.env`:

| Variable                                  | Default               | Notes                                                                                     |
| ----------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`                            | —                     | matches docker-compose                                                                    |
| `PORT`                                    | `3001`                |                                                                                           |
| `MEXC_BASE_URL`                           | `https://api.mexc.co` | `api.mexc.com` is blocked on some networks                                                |
| `COINGECKO_BASE_URL`, `COINGECKO_API_KEY` | public API            | the key is optional (demo key header)                                                     |
| `SCHEDULER_ENABLED`                       | `true`                | `false` disables crons and the automatic first universe load; manual endpoints still work |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`  | —                     | create a bot with @BotFather and send it a message; your chat id is in `getUpdates`       |

Everything else is configured from the dashboard **Settings** page: timeframes, thresholds, liquidity filter, alert cooldown, Telegram on/off, and per-strategy enable/weight/params.

> **Liquidity note:** most MEXC volume is on futures, so spot 24h volume for mid-caps such as LINK or UNI is often under $1M. The default spot filter is therefore $250k.

## API

| Method      | Path                                                                                                   |                                           |
| ----------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| GET         | `/api/health`                                                                                          | DB check                                  |
| GET         | `/api/coins`, `/api/coins/:symbol`                                                                     | universe; `:symbol` is `BTCUSDT` or `BTC` |
| POST        | `/api/coins/refresh`                                                                                   | refresh the universe now                  |
| GET         | `/api/coins/:symbol/candles?tf=1h&limit=300`                                                           | closed candles                            |
| GET         | `/api/signals?scope=current\|history&tf=&direction=&minScore=&symbol=&sort=score\|time&limit=&offset=` |                                           |
| POST        | `/api/scanner/run?tf=1h`                                                                               | scan now (waits for completion)           |
| GET         | `/api/scanner/status`                                                                                  | last run per timeframe                    |
| GET / PATCH | `/api/settings/general`                                                                                |                                           |
| GET         | `/api/settings/strategies`                                                                             |                                           |
| PATCH       | `/api/settings/strategies/:key`                                                                        | `{ enabled?, weight?, params? }`          |
| GET         | `/api/notifications/status`                                                                            | whether Telegram is configured            |
| POST        | `/api/notifications/test`                                                                              | send a Telegram test message              |

## Scripts

| Script                              |                                            |
| ----------------------------------- | ------------------------------------------ |
| `npm run build` / `lint` / `test`   | all workspaces                             |
| `npm run test:e2e`                  | API integration tests (needs the database) |
| `npm run dev:shared`                | rebuild `packages/shared` on change        |
| `npm run prisma:studio -w apps/api` | browse the database                        |

## Not yet included

Backtesting (the pure strategies and stored candles are designed to support it), and serving the built dashboard from the API in production.
