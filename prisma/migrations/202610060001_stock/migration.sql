-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "materialId" TEXT,
    "extraId" TEXT,
    "method" TEXT NOT NULL,
    "manualUnitCost" DECIMAL(24,6),
    "inventoriedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIdentity" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "method" TEXT NOT NULL,
    "manualUnitCost" DECIMAL(24,6),
    "confirmedValue" DECIMAL(24,6),
    "sourceId" TEXT,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptLineId" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovementAllocation" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "identityId" TEXT,
    "quantity" DECIMAL(24,6) NOT NULL,

    CONSTRAINT "StockMovementAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "lineKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservationEvent" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "movementId" TEXT,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockValuationRevision" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "factsHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockValuationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockValuationAllocation" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "value" DECIMAL(24,6),
    "provisional" BOOLEAN NOT NULL,

    CONSTRAINT "StockValuationAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "document" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "actorId" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "effectiveDate" DATE NOT NULL,
    "total" DECIMAL(18,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "confirmedValue" DECIMAL(18,2),

    CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptFinancialLink" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptFinancialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCommand" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCommand_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_materialId_key" ON "StockItem"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_extraId_key" ON "StockItem"("extraId");

-- CreateIndex
CREATE UNIQUE INDEX "StockIdentity_itemId_label_key" ON "StockIdentity"("itemId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "StockIdentity_id_itemId_key" ON "StockIdentity"("id", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_sequence_key" ON "StockMovement"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_receiptLineId_key" ON "StockMovement"("receiptLineId");

-- CreateIndex
CREATE INDEX "StockMovement_itemId_sequence_idx" ON "StockMovement"("itemId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_id_itemId_key" ON "StockMovement"("id", "itemId");

-- CreateIndex
CREATE INDEX "StockMovementAllocation_movementId_idx" ON "StockMovementAllocation"("movementId");

-- CreateIndex
CREATE INDEX "StockReservation_saleId_lineKey_idx" ON "StockReservation"("saleId", "lineKey");

-- CreateIndex
CREATE INDEX "StockReservationEvent_reservationId_idx" ON "StockReservationEvent"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockValuationRevision_itemId_factsHash_key" ON "StockValuationRevision"("itemId", "factsHash");

-- CreateIndex
CREATE INDEX "StockValuationAllocation_revisionId_idx" ON "StockValuationAllocation"("revisionId");

-- CreateIndex
CREATE INDEX "PurchaseReceiptLine_receiptId_idx" ON "PurchaseReceiptLine"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptFinancialLink_entryId_key" ON "ReceiptFinancialLink"("entryId");

-- CreateIndex
CREATE INDEX "ReceiptFinancialLink_receiptId_idx" ON "ReceiptFinancialLink"("receiptId");

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "PricingExtra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIdentity" ADD CONSTRAINT "StockIdentity_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "PurchaseReceiptLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovementAllocation" ADD CONSTRAINT "StockMovementAllocation_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovementAllocation" ADD CONSTRAINT "StockMovementAllocation_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "StockIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservationEvent" ADD CONSTRAINT "StockReservationEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "StockReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockValuationRevision" ADD CONSTRAINT "StockValuationRevision_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockValuationAllocation" ADD CONSTRAINT "StockValuationAllocation_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "StockValuationRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptFinancialLink" ADD CONSTRAINT "ReceiptFinancialLink_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptFinancialLink" ADD CONSTRAINT "ReceiptFinancialLink_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
