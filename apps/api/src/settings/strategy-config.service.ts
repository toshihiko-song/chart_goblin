import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type { ParamsJsonSchema, StrategyConfigDto } from '@chart-goblin/shared';
import { z } from 'zod';
import type { StrategyConfig } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Strategy } from '../strategies/strategy.js';
import { StrategyRegistry } from '../strategies/strategy.registry.js';

export interface ActiveStrategy {
  strategy: Strategy;
  params: object;
  weight: number;
}

const updateSchema = z
  .object({
    enabled: z.boolean(),
    weight: z.number().int().min(0).max(100),
    params: z.record(z.string(), z.unknown()),
  })
  .partial()
  .strict();

@Injectable()
export class StrategyConfigService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: StrategyRegistry,
  ) {}

  /** Seeds a config row with defaults for every registered strategy. */
  async onModuleInit(): Promise<void> {
    await this.prisma.strategyConfig.createMany({
      data: this.registry.all().map((s) => ({
        key: s.key,
        enabled: true,
        weight: s.defaultWeight,
        params: s.defaultParams,
      })),
      skipDuplicates: true,
    });
  }

  async list(): Promise<StrategyConfigDto[]> {
    const rows = await this.rowsByKey();
    return this.registry.all().flatMap((strategy) => {
      const row = rows.get(strategy.key);
      return row ? [this.toDto(strategy, row)] : [];
    });
  }

  /** Enabled strategies with resolved params, for the scanner. */
  async getActive(): Promise<ActiveStrategy[]> {
    const rows = await this.rowsByKey();
    return this.registry.all().flatMap((strategy) => {
      const row = rows.get(strategy.key);
      if (!row?.enabled) return [];
      return [
        {
          strategy,
          params: this.resolveParams(strategy, row.params),
          weight: row.weight,
        },
      ];
    });
  }

  async update(key: string, patch: unknown): Promise<StrategyConfigDto> {
    const strategy = this.registry.get(key);
    if (!strategy) throw new NotFoundException(`Unknown strategy ${key}`);

    const parsed = updateSchema.safeParse(patch);
    if (!parsed.success)
      throw new BadRequestException(z.prettifyError(parsed.error));
    const { enabled, weight, params } = parsed.data;

    let nextParams: object | undefined;
    if (params) {
      const current = await this.prisma.strategyConfig.findUniqueOrThrow({
        where: { key },
      });
      const merged = {
        ...this.resolveParams(strategy, current.params),
        ...params,
      };
      const result = strategy.paramsSchema.safeParse(merged);
      if (!result.success) {
        throw new BadRequestException(z.prettifyError(result.error));
      }
      nextParams = result.data;
    }

    const row = await this.prisma.strategyConfig.update({
      where: { key },
      data: { enabled, weight, params: nextParams },
    });
    return this.toDto(strategy, row);
  }

  /** Stored params over defaults; falls back to defaults if they no longer validate. */
  private resolveParams(strategy: Strategy, stored: unknown): object {
    const merged = { ...strategy.defaultParams, ...(stored as object) };
    const result = strategy.paramsSchema.safeParse(merged);
    return result.success ? result.data : strategy.defaultParams;
  }

  private toDto(strategy: Strategy, row: StrategyConfig): StrategyConfigDto {
    const { $schema: _, ...paramsSchema } = z.toJSONSchema(
      strategy.paramsSchema,
    );
    return {
      key: strategy.key,
      name: strategy.name,
      description: strategy.description,
      enabled: row.enabled,
      weight: row.weight,
      params: this.resolveParams(strategy, row.params) as Record<
        string,
        unknown
      >,
      paramsSchema: paramsSchema as ParamsJsonSchema,
    };
  }

  private async rowsByKey(): Promise<Map<string, StrategyConfig>> {
    const rows = await this.prisma.strategyConfig.findMany();
    return new Map(rows.map((r) => [r.key, r]));
  }
}
