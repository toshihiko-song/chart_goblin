import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import type { GeneralSettings, StrategyConfigDto } from '@chart-goblin/shared';
import { SettingsService } from './settings.service.js';
import { StrategyConfigService } from './strategy-config.service.js';

/** Request bodies are validated with zod inside the services. */
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly strategies: StrategyConfigService,
  ) {}

  @Get('general')
  getGeneral(): Promise<GeneralSettings> {
    return this.settings.getGeneral();
  }

  @Patch('general')
  updateGeneral(@Body() body: unknown): Promise<GeneralSettings> {
    return this.settings.updateGeneral(body);
  }

  @Get('strategies')
  listStrategies(): Promise<StrategyConfigDto[]> {
    return this.strategies.list();
  }

  @Patch('strategies/:key')
  updateStrategy(
    @Param('key') key: string,
    @Body() body: unknown,
  ): Promise<StrategyConfigDto> {
    return this.strategies.update(key, body);
  }
}
