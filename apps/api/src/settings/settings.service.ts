import { BadRequestException, Injectable } from '@nestjs/common';
import type { GeneralSettings } from '@chart-goblin/shared';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DEFAULT_GENERAL_SETTINGS,
  generalSettingsSchema,
} from './general-settings.js';

const GENERAL_KEY = 'general';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeneral(): Promise<GeneralSettings> {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: GENERAL_KEY },
    });
    const stored = generalSettingsSchema.partial().safeParse(row?.value ?? {});
    // Fall back to defaults for anything missing or no longer valid.
    return {
      ...DEFAULT_GENERAL_SETTINGS,
      ...(stored.success ? stored.data : {}),
    };
  }

  async updateGeneral(patch: unknown): Promise<GeneralSettings> {
    const parsed = generalSettingsSchema.partial().strict().safeParse(patch);
    if (!parsed.success) {
      throw new BadRequestException(z.prettifyError(parsed.error));
    }
    const next = { ...(await this.getGeneral()), ...parsed.data };
    await this.prisma.appSetting.upsert({
      where: { key: GENERAL_KEY },
      create: { key: GENERAL_KEY, value: next },
      update: { value: next },
    });
    return next;
  }
}
