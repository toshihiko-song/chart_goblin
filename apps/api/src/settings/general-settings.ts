import { TIMEFRAMES, type GeneralSettings } from '@chart-goblin/shared';
import { z } from 'zod';

export const generalSettingsSchema = z.object({
  timeframes: z
    .array(z.enum(TIMEFRAMES))
    .min(1)
    // Canonical order (fastest first) without duplicates.
    .transform((tfs) => TIMEFRAMES.filter((tf) => tfs.includes(tf))),
  minQuoteVolumeUsd: z.number().min(0),
  minSignalScore: z.number().int().min(0).max(100),
  minAlertScore: z.number().int().min(0).max(100),
  telegramEnabled: z.boolean(),
  alertCooldownCandles: z.number().int().min(0).max(1000),
  maxSignalAgeMinutes: z.number().int().min(0).max(10_080),
}) satisfies z.ZodType<GeneralSettings>;

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  timeframes: [...TIMEFRAMES],
  minQuoteVolumeUsd: 250_000,
  minSignalScore: 30,
  minAlertScore: 60,
  telegramEnabled: true,
  alertCooldownCandles: 4,
  maxSignalAgeMinutes: 15,
};
