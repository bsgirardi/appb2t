CREATE TABLE "PricingComparison" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "operationKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
  "contractVersion" INTEGER NOT NULL DEFAULT 1, "calculationVersion" INTEGER NOT NULL DEFAULT 1,
  "context" JSONB NOT NULL, CONSTRAINT "PricingComparison_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PricingComparison_actorId_operationKey_key" ON "PricingComparison"("actorId", "operationKey");
CREATE INDEX "PricingComparison_createdAt_id_idx" ON "PricingComparison"("createdAt", "id");
CREATE TABLE "PricingComparisonItem" (
  "id" TEXT NOT NULL, "comparisonId" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "snapshotId" TEXT NOT NULL, "context" JSONB NOT NULL,
  CONSTRAINT "PricingComparisonItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PricingComparisonItem_snapshotId_key" ON "PricingComparisonItem"("snapshotId");
CREATE UNIQUE INDEX "PricingComparisonItem_comparisonId_position_key" ON "PricingComparisonItem"("comparisonId", "position");
ALTER TABLE "PricingComparisonItem" ADD CONSTRAINT "PricingComparisonItem_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "PricingComparison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PricingComparisonItem" ADD CONSTRAINT "PricingComparisonItem_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PricingSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
