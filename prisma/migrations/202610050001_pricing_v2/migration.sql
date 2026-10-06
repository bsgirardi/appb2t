-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "costRevisionId" TEXT;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "lineKey" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "costRevisionId" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "lineKey" TEXT;

-- CreateTable
CREATE TABLE "PricingSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "values" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fees" JSONB NOT NULL,
    "fixedCost" DECIMAL(18,6) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingExtra" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitCost" DECIMAL(18,6) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSnapshot" (
    "id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operationKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,

    CONSTRAINT "PricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCalculationRevision" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productVersion" INTEGER NOT NULL,
    "calculation" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCalculationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCostRevision" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT,
    "saleId" TEXT,
    "revision" INTEGER NOT NULL,
    "bindings" JSONB NOT NULL,
    "frozenAt" TIMESTAMP(3),
    "sourceRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentCostRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingSnapshot_actorId_operationKey_key" ON "PricingSnapshot"("actorId", "operationKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCalculationRevision_productId_productVersion_key" ON "ProductCalculationRevision"("productId", "productVersion");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCostRevision_quoteId_revision_key" ON "DocumentCostRevision"("quoteId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCostRevision_saleId_revision_key" ON "DocumentCostRevision"("saleId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteItem_quoteId_lineKey_key" ON "QuoteItem"("quoteId", "lineKey");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_saleId_lineKey_key" ON "SaleItem"("saleId", "lineKey");
ALTER TABLE "DocumentCostRevision" ADD CONSTRAINT "DocumentCostRevision_owner_check" CHECK (("quoteId" IS NOT NULL) <> ("saleId" IS NOT NULL));
