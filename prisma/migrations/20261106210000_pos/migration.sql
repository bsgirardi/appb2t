ALTER TABLE "Sale" ALTER COLUMN "customerId" DROP NOT NULL;
CREATE TABLE "PosOrder" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "version" INTEGER NOT NULL DEFAULT 1,
 "input" JSONB NOT NULL,
 "saleId" TEXT REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "PosOrder_saleId_key" ON "PosOrder"("saleId");
CREATE INDEX "PosOrder_actorId_createdAt_idx" ON "PosOrder"("actorId","createdAt");
CREATE UNIQUE INDEX "PosOrder_one_open_per_actor" ON "PosOrder"("actorId") WHERE "saleId" IS NULL;

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_unidentified_document_check" CHECK ("customerId" IS NOT NULL OR COALESCE("document"->>'customerIdentification' = 'UNIDENTIFIED', false));
