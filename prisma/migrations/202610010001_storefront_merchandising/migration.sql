ALTER TABLE "Product"
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "shortDescription" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "specifications" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "colors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "availability" TEXT NOT NULL DEFAULT 'CONSULT',
  ADD COLUMN "leadTimeDays" INTEGER;
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
ALTER TABLE "Product" ADD CONSTRAINT "Product_availability_check"
  CHECK ("availability" IN ('CONSULT', 'AVAILABLE', 'MADE_TO_ORDER', 'UNAVAILABLE'));
ALTER TABLE "Product" ADD CONSTRAINT "Product_leadTimeDays_check"
  CHECK ("leadTimeDays" IS NULL OR "leadTimeDays" BETWEEN 1 AND 365);
ALTER TABLE "CompanyAppearance" ADD COLUMN "storefront" JSONB NOT NULL DEFAULT '{}';
