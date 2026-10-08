import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.url(),

  COINGECKO_BASE_URL: z.url().default('https://api.coingecko.com/api/v3'),
  COINGECKO_API_KEY: z.string().optional(),
  MEXC_BASE_URL: z.url().default('https://api.mexc.co'),

  /** Disable the cron jobs (e.g. in tests); manual endpoints still work. */
  SCHEDULER_ENABLED: booleanString.default(true),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  // Treat empty strings from .env files as "not set".
  const cleaned = Object.fromEntries(
    Object.entries(config).filter(([, v]) => v !== ''),
  );
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
