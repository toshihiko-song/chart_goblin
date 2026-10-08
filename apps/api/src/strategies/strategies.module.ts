import { Module } from '@nestjs/common';
import { BreakoutStrategy } from './impl/breakout.strategy.js';
import { MacdStrategy } from './impl/macd.strategy.js';
import { MaCrossStrategy } from './impl/ma-cross.strategy.js';
import { RsiStrategy } from './impl/rsi.strategy.js';
import { TrendStrategy } from './impl/trend.strategy.js';
import { VolumeSpikeStrategy } from './impl/volume-spike.strategy.js';
import type { Strategy } from './strategy.js';
import { STRATEGIES, StrategyRegistry } from './strategy.registry.js';

/** To add a strategy: implement `Strategy` in ./impl and append it here. */
const strategies: Strategy<any>[] = [
  new MaCrossStrategy(),
  new RsiStrategy(),
  new MacdStrategy(),
  new VolumeSpikeStrategy(),
  new BreakoutStrategy(),
  new TrendStrategy(),
];

@Module({
  providers: [{ provide: STRATEGIES, useValue: strategies }, StrategyRegistry],
  exports: [StrategyRegistry],
})
export class StrategiesModule {}
