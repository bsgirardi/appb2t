CREATE TYPE "AdChannel" AS ENUM ('INSTAGRAM','WHATSAPP');
CREATE TYPE "AdStatus" AS ENUM ('DRAFT','REVIEWED','ARCHIVED');
CREATE TABLE "AdvertisingDraft" (
 "id" TEXT NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "channel" "AdChannel" NOT NULL, "internalName" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
 "imageIds" JSONB NOT NULL, "source" JSONB NOT NULL, "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
 "version" INTEGER NOT NULL DEFAULT 1, "reviewedVersion" INTEGER, "reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "updatedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "reviewedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "creationKey" TEXT NOT NULL, "creationHash" TEXT NOT NULL
);
CREATE UNIQUE INDEX "AdvertisingDraft_createdById_creationKey_key" ON "AdvertisingDraft"("createdById","creationKey");
CREATE INDEX "AdvertisingDraft_channel_status_updatedAt_id_idx" ON "AdvertisingDraft"("channel","status","updatedAt","id");
CREATE INDEX "AdvertisingDraft_productId_idx" ON "AdvertisingDraft"("productId");
CREATE TABLE "AdvertisingExport" (
 "id" TEXT NOT NULL PRIMARY KEY, "draftId" TEXT NOT NULL REFERENCES "AdvertisingDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "draftVersion" INTEGER NOT NULL, "channel" "AdChannel" NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AdvertisingExport_draftId_createdAt_idx" ON "AdvertisingExport"("draftId","createdAt");
