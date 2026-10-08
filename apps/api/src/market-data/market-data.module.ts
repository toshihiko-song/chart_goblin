import { Module } from '@nestjs/common';
import { CoinGeckoClient } from './coingecko.client.js';
import { HttpCoinGeckoClient } from './http-coingecko.client.js';
import { HttpMexcClient } from './http-mexc.client.js';
import { MexcClient } from './mexc.client.js';

@Module({
  providers: [
    { provide: CoinGeckoClient, useClass: HttpCoinGeckoClient },
    { provide: MexcClient, useClass: HttpMexcClient },
  ],
  exports: [CoinGeckoClient, MexcClient],
})
export class MarketDataModule {}
