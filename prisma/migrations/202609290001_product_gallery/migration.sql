ALTER TABLE "ProductImage" ADD COLUMN "id" TEXT, ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
UPDATE "ProductImage" SET "id" = 'legacy_' || "productId";
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_pkey";
ALTER TABLE "ProductImage" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id");
ALTER TABLE "ProductImage" ALTER COLUMN "position" DROP DEFAULT;
CREATE UNIQUE INDEX "ProductImage_productId_position_key" ON "ProductImage"("productId", "position");
