-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'CONVERTIDO');

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'RASCUNHO',
    "version" INTEGER NOT NULL DEFAULT 1,
    "customerId" TEXT,
    "input" JSONB NOT NULL,
    "snapshot" JSONB,
    "totals" JSONB,
    "validUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommerceEvent" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommerceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLogo" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT,
    "bytes" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,

    CONSTRAINT "DocumentLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_sequence_key" ON "Quote"("sequence");

-- CreateIndex
CREATE INDEX "Quote_status_createdAt_idx" ON "Quote"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteItem_quoteId_position_key" ON "QuoteItem"("quoteId", "position");

-- CreateIndex
CREATE INDEX "CommerceEvent_quoteId_createdAt_idx" ON "CommerceEvent"("quoteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentLogo_quoteId_key" ON "DocumentLogo"("quoteId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommerceEvent" ADD CONSTRAINT "CommerceEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLogo" ADD CONSTRAINT "DocumentLogo_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
