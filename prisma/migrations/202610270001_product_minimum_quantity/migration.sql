ALTER TABLE "Product" ADD COLUMN "minimumQuantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Product" ADD CONSTRAINT "Product_minimumQuantity_check"
  CHECK ("minimumQuantity" BETWEEN 1 AND 100000);
