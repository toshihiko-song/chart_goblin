import { Inject, Injectable } from '@nestjs/common';
import type { Strategy } from './strategy.js';

export const STRATEGIES = Symbol('STRATEGIES');

@Injectable()
export class StrategyRegistry {
  private readonly byKey: Map<string, Strategy>;

  constructor(@Inject(STRATEGIES) strategies: Strategy[]) {
    this.byKey = new Map(strategies.map((s) => [s.key, s]));
    if (this.byKey.size !== strategies.length) {
      throw new Error('Duplicate strategy keys registered');
    }
  }

  all(): Strategy[] {
    return [...this.byKey.values()];
  }

  get(key: string): Strategy | undefined {
    return this.byKey.get(key);
  }
}
