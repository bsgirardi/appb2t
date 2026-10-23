-- AlterTable
ALTER TABLE "ArtLineRequirement" ADD COLUMN     "details" JSONB;

-- CreateTable
CREATE TABLE "ArtDocumentBinding" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT,
    "saleId" TEXT,
    "lineKey" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sourceLineId" TEXT NOT NULL,
    "configurationHash" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ArtDocumentBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtDocumentBinding_requestId_sourceLineId_idx" ON "ArtDocumentBinding"("requestId", "sourceLineId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtDocumentBinding_quoteId_lineKey_key" ON "ArtDocumentBinding"("quoteId", "lineKey");

-- CreateIndex
CREATE UNIQUE INDEX "ArtDocumentBinding_saleId_lineKey_key" ON "ArtDocumentBinding"("saleId", "lineKey");

-- AddForeignKey
ALTER TABLE "ArtDocumentBinding" ADD CONSTRAINT "ArtDocumentBinding_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtDocumentBinding" ADD CONSTRAINT "ArtDocumentBinding_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
