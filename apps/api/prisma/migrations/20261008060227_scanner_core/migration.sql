-- CreateTable
CREATE TABLE "candles" (
    "coinId" INTEGER NOT NULL,
    "timeframe" TEXT NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "candles_pkey" PRIMARY KEY ("coinId","timeframe","openTime")
);

-- CreateTable
CREATE TABLE "strategy_configs" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL,
    "params" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_configs_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" SERIAL NOT NULL,
    "coinId" INTEGER NOT NULL,
    "timeframe" TEXT NOT NULL,
    "candleOpenTime" TIMESTAMP(3) NOT NULL,
    "direction" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "signalId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "signals_timeframe_candleOpenTime_idx" ON "signals"("timeframe", "candleOpenTime");

-- CreateIndex
CREATE INDEX "signals_createdAt_idx" ON "signals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "signals_coinId_timeframe_candleOpenTime_direction_key" ON "signals"("coinId", "timeframe", "candleOpenTime", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_signalId_key" ON "alerts"("signalId");

-- AddForeignKey
ALTER TABLE "candles" ADD CONSTRAINT "candles_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "coins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "coins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
