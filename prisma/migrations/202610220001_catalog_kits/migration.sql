ALTER TABLE "Product" ADD COLUMN "quantityTiers" JSONB NOT NULL DEFAULT '[]', ADD COLUMN "compositionImageId" TEXT;
ALTER TABLE "CatalogRequest" ADD COLUMN "kitSnapshot" JSONB;
CREATE TABLE "CatalogKit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "commercialRevision" INTEGER NOT NULL DEFAULT 1,
  "tiers" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "CatalogKitProduct" (
  "kitId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "CatalogKitProduct_pkey" PRIMARY KEY ("kitId", "productId"),
  CONSTRAINT "CatalogKitProduct_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "CatalogKit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CatalogKitProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "CatalogKitEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kitId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogKitEvent_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "CatalogKit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CatalogKit_active_position_idx" ON "CatalogKit"("active", "position");
CREATE INDEX "CatalogKitProduct_productId_idx" ON "CatalogKitProduct"("productId");
CREATE INDEX "CatalogKitEvent_kitId_createdAt_idx" ON "CatalogKitEvent"("kitId", "createdAt");
