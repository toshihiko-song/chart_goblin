-- CreateTable
CREATE TABLE "coins" (
    "id" SERIAL NOT NULL,
    "coingeckoId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketCapRank" INTEGER,
    "marketCapUsd" DOUBLE PRECISION,
    "mexcSymbol" TEXT,
    "quoteVolume24h" DOUBLE PRECISION,
    "isScannable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coins_coingeckoId_key" ON "coins"("coingeckoId");

-- CreateIndex
CREATE UNIQUE INDEX "coins_mexcSymbol_key" ON "coins"("mexcSymbol");

-- CreateIndex
CREATE INDEX "coins_isScannable_idx" ON "coins"("isScannable");
