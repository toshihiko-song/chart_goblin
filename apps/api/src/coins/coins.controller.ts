import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { CoinDto } from '@chart-goblin/shared';
import { toCoinDto } from './coin.mapper.js';
import { CoinsService, UniverseRefreshResult } from './coins.service.js';

@Controller('coins')
export class CoinsController {
  constructor(private readonly coins: CoinsService) {}

  @Get()
  async findAll(): Promise<CoinDto[]> {
    return (await this.coins.findAll()).map(toCoinDto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(): Promise<UniverseRefreshResult> {
    return this.coins.refreshUniverse();
  }

  @Get(':symbol')
  async findOne(@Param('symbol') symbol: string): Promise<CoinDto> {
    return toCoinDto(await this.coins.findBySymbol(symbol));
  }
}
