-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "fulfillmentMode" TEXT NOT NULL DEFAULT 'LEGACY';

-- AlterTable
ALTER TABLE "StockReservation" ADD COLUMN     "productionLineId" TEXT,
ALTER COLUMN "saleId" DROP NOT NULL,
ALTER COLUMN "lineKey" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "origin" TEXT NOT NULL,
    "saleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "responsibleId" TEXT,
    "dueDate" DATE,
    "notes" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "premises" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "saleLineKey" TEXT,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "technology" "Technology" NOT NULL,
    "targetUnits" INTEGER NOT NULL,
    "plannedPrinterId" TEXT,

    CONSTRAINT "ProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionEvent" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "lineId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT,
    "reprintOf" TEXT,
    "goodUnits" INTEGER NOT NULL DEFAULT 0,
    "failedUnits" INTEGER NOT NULL DEFAULT 0,
    "canceledUnits" INTEGER NOT NULL DEFAULT 0,
    "machineMinutes" DECIMAL(24,6),
    "setupMinutes" DECIMAL(24,6),
    "finishingMinutes" DECIMAL(24,6),
    "materialComplete" BOOLEAN NOT NULL DEFAULT false,
    "timeComplete" BOOLEAN NOT NULL DEFAULT false,
    "printerId" TEXT,
    "executorId" TEXT,
    "actorId" TEXT NOT NULL,
    "premises" JSONB,
    "reason" TEXT NOT NULL DEFAULT '',
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionMaterialLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,

    CONSTRAINT "ProductionMaterialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionReservationAllocation" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,

    CONSTRAINT "ProductionReservationAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionReservationEvent" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionReservationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "ownerSaleId" TEXT,
    "lineKey" TEXT,
    "inventoriedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FinishedStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedOrigin" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "stockId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lineId" TEXT,
    "eventId" TEXT,
    "initialValue" DECIMAL(24,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishedOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedMovement" (
    "id" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "sourceId" TEXT,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishedMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedCommitment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "lineKey" TEXT NOT NULL,
    "originId" TEXT NOT NULL,

    CONSTRAINT "FinishedCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedCommitmentEvent" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishedCommitmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDelivery" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "actorId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDeliveryLine" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "lineKey" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "movementId" TEXT NOT NULL,
    "sourceLineId" TEXT,

    CONSTRAINT "ProductionDeliveryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionCostRevision" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "factsHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionCostRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionCommand" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionCommand_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_sequence_key" ON "ProductionOrder"("sequence");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_dueDate_idx" ON "ProductionOrder"("status", "dueDate");

-- CreateIndex
CREATE INDEX "ProductionLine_orderId_saleLineKey_idx" ON "ProductionLine"("orderId", "saleLineKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionEvent_sequence_key" ON "ProductionEvent"("sequence");

-- CreateIndex
CREATE INDEX "ProductionEvent_lineId_sequence_idx" ON "ProductionEvent"("lineId", "sequence");

-- CreateIndex
CREATE INDEX "ProductionMaterialLink_movementId_idx" ON "ProductionMaterialLink"("movementId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionMaterialLink_eventId_movementId_key" ON "ProductionMaterialLink"("eventId", "movementId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionReservationAllocation_lineId_reservationId_key" ON "ProductionReservationAllocation"("lineId", "reservationId");

-- CreateIndex
CREATE INDEX "ProductionReservationEvent_allocationId_idx" ON "ProductionReservationEvent"("allocationId");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedStock_productId_key" ON "FinishedStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedStock_ownerSaleId_lineKey_key" ON "FinishedStock"("ownerSaleId", "lineKey");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedOrigin_sequence_key" ON "FinishedOrigin"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedOrigin_eventId_key" ON "FinishedOrigin"("eventId");

-- CreateIndex
CREATE INDEX "FinishedOrigin_stockId_sequence_idx" ON "FinishedOrigin"("stockId", "sequence");

-- CreateIndex
CREATE INDEX "FinishedMovement_originId_idx" ON "FinishedMovement"("originId");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedCommitment_saleId_lineKey_originId_key" ON "FinishedCommitment"("saleId", "lineKey", "originId");

-- CreateIndex
CREATE INDEX "FinishedCommitmentEvent_commitmentId_idx" ON "FinishedCommitmentEvent"("commitmentId");

-- CreateIndex
CREATE INDEX "ProductionDelivery_saleId_createdAt_idx" ON "ProductionDelivery"("saleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionDeliveryLine_movementId_key" ON "ProductionDeliveryLine"("movementId");

-- CreateIndex
CREATE INDEX "ProductionDeliveryLine_deliveryId_idx" ON "ProductionDeliveryLine"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionCostRevision_lineId_factsHash_key" ON "ProductionCostRevision"("lineId", "factsHash");

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_productionLineId_fkey" FOREIGN KEY ("productionLineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEvent" ADD CONSTRAINT "ProductionEvent_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEvent" ADD CONSTRAINT "ProductionEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionMaterialLink" ADD CONSTRAINT "ProductionMaterialLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ProductionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionMaterialLink" ADD CONSTRAINT "ProductionMaterialLink_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReservationAllocation" ADD CONSTRAINT "ProductionReservationAllocation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReservationAllocation" ADD CONSTRAINT "ProductionReservationAllocation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "StockReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReservationEvent" ADD CONSTRAINT "ProductionReservationEvent_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "ProductionReservationAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedStock" ADD CONSTRAINT "FinishedStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedStock" ADD CONSTRAINT "FinishedStock_ownerSaleId_fkey" FOREIGN KEY ("ownerSaleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedOrigin" ADD CONSTRAINT "FinishedOrigin_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "FinishedStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedOrigin" ADD CONSTRAINT "FinishedOrigin_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedOrigin" ADD CONSTRAINT "FinishedOrigin_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ProductionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedMovement" ADD CONSTRAINT "FinishedMovement_originId_fkey" FOREIGN KEY ("originId") REFERENCES "FinishedOrigin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedMovement" ADD CONSTRAINT "FinishedMovement_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FinishedMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedCommitment" ADD CONSTRAINT "FinishedCommitment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedCommitment" ADD CONSTRAINT "FinishedCommitment_originId_fkey" FOREIGN KEY ("originId") REFERENCES "FinishedOrigin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedCommitmentEvent" ADD CONSTRAINT "FinishedCommitmentEvent_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "FinishedCommitment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDelivery" ADD CONSTRAINT "ProductionDelivery_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDelivery" ADD CONSTRAINT "ProductionDelivery_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductionDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDeliveryLine" ADD CONSTRAINT "ProductionDeliveryLine_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "ProductionDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDeliveryLine" ADD CONSTRAINT "ProductionDeliveryLine_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "FinishedCommitment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDeliveryLine" ADD CONSTRAINT "ProductionDeliveryLine_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "FinishedMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionCostRevision" ADD CONSTRAINT "ProductionCostRevision_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_fulfillment_check" CHECK ("fulfillmentMode" IN ('LEGACY','U3'));
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_owner_check" CHECK (("saleId" IS NOT NULL AND "lineKey" IS NOT NULL AND "productionLineId" IS NULL) OR ("saleId" IS NULL AND "lineKey" IS NULL AND "productionLineId" IS NOT NULL));
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_origin_check" CHECK ((origin='SALE' AND "saleId" IS NOT NULL) OR (origin='STOCK' AND "saleId" IS NULL));
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_status_check" CHECK (status IN ('RASCUNHO','LIBERADA','EM_EXECUCAO','CONCLUIDA','CANCELADA'));
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_target_check" CHECK ("targetUnits">0);
ALTER TABLE "ProductionMaterialLink" ADD CONSTRAINT "ProductionMaterialLink_quantity_check" CHECK (quantity<>0);
ALTER TABLE "ProductionReservationEvent" ADD CONSTRAINT "ProductionReservationEvent_kind_check" CHECK (quantity>0 AND kind IN ('RESERVE','CONSUME','RELEASE'));
ALTER TABLE "FinishedStock" ADD CONSTRAINT "FinishedStock_owner_check" CHECK (("productId" IS NOT NULL AND "ownerSaleId" IS NULL AND "lineKey" IS NULL) OR ("productId" IS NULL AND "ownerSaleId" IS NOT NULL AND "lineKey" IS NOT NULL));
ALTER TABLE "FinishedOrigin" ADD CONSTRAINT "FinishedOrigin_value_check" CHECK ("initialValue" IS NULL OR "initialValue">=0);
ALTER TABLE "FinishedMovement" ADD CONSTRAINT "FinishedMovement_sign_check" CHECK ((kind IN ('PRODUCTION','OPENING','LEGACY','ADJUSTMENT_IN','UNDO_DELIVERY') AND units>=0) OR (kind IN ('DELIVERY','LOSS','ADJUSTMENT_OUT','CORRECTION') AND units<0));
ALTER TABLE "FinishedCommitmentEvent" ADD CONSTRAINT "FinishedCommitmentEvent_sign_check" CHECK ((kind IN ('RESERVE','UNDO_DELIVERY') AND units>0) OR (kind IN ('RELEASE','DELIVER') AND units<0));
ALTER TABLE "ProductionEvent" ADD CONSTRAINT "ProductionEvent_kind_check" CHECK (kind IN ('REPORT','CORRECTION','CLOSE_REMAINDER','COMPLETE','UPDATE'));
ALTER TABLE "ProductionEvent" ADD CONSTRAINT "ProductionEvent_sign_check" CHECK ((kind='CORRECTION' AND "goodUnits"<=0 AND "failedUnits"<=0 AND "canceledUnits"=0 AND ("machineMinutes" IS NULL OR "machineMinutes"<=0) AND ("setupMinutes" IS NULL OR "setupMinutes"<=0) AND ("finishingMinutes" IS NULL OR "finishingMinutes"<=0)) OR (kind<>'CORRECTION' AND "goodUnits">=0 AND "failedUnits">=0 AND "canceledUnits">=0 AND ("machineMinutes" IS NULL OR "machineMinutes">=0) AND ("setupMinutes" IS NULL OR "setupMinutes">=0) AND ("finishingMinutes" IS NULL OR "finishingMinutes">=0)));
