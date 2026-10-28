-- CreateEnum
CREATE TYPE "CommissionModel" AS ENUM ('RETIDA', 'SEPARADA');

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "model" "CommissionModel" NOT NULL,
    "percent" DECIMAL(7,4) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProductCondition" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "percent" DECIMAL(7,4),
    "minimum" INTEGER,

    CONSTRAINT "PartnerProductCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentShipment" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignmentShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentShipmentLine" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,

    CONSTRAINT "ConsignmentShipmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentShipmentAllocation" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,

    CONSTRAINT "ConsignmentShipmentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentEvent" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "partnerId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "consignmentSaleId" TEXT,
    "kind" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT,
    "sourceId" TEXT,
    "effectiveDate" DATE NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "receiver" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentEventAllocation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "shipmentAllocationId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "internalMovementId" TEXT,

    CONSTRAINT "ConsignmentEventAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentSale" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "saleId" TEXT,
    "reference" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "model" "CommissionModel" NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "snapshot" JSONB,
    "totals" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL,
    "replacesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignmentSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentSaleLine" (
    "id" TEXT NOT NULL,
    "consignmentSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "percent" DECIMAL(7,4) NOT NULL,
    "gross" DECIMAL(18,2),
    "commission" DECIMAL(18,2),

    CONSTRAINT "ConsignmentSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentSaleAllocation" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "shipmentAllocationId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,

    CONSTRAINT "ConsignmentSaleAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentFinancialLink" (
    "id" TEXT NOT NULL,
    "consignmentSaleId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "ConsignmentFinancialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentStatement" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "partnerId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLOSED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignmentStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentStatementLine" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "consignmentSaleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "ConsignmentStatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsignmentCommand" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignmentCommand_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_customerId_key" ON "Partner"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProductCondition_partnerId_productId_key" ON "PartnerProductCondition"("partnerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentShipment_sequence_key" ON "ConsignmentShipment"("sequence");

-- CreateIndex
CREATE INDEX "ConsignmentShipment_partnerId_createdAt_idx" ON "ConsignmentShipment"("partnerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentShipmentLine_shipmentId_productId_key" ON "ConsignmentShipmentLine"("shipmentId", "productId");

-- CreateIndex
CREATE INDEX "ConsignmentShipmentAllocation_originId_idx" ON "ConsignmentShipmentAllocation"("originId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentShipmentAllocation_lineId_originId_key" ON "ConsignmentShipmentAllocation"("lineId", "originId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentEvent_sequence_key" ON "ConsignmentEvent"("sequence");

-- CreateIndex
CREATE INDEX "ConsignmentEvent_partnerId_effectiveDate_idx" ON "ConsignmentEvent"("partnerId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentEventAllocation_internalMovementId_key" ON "ConsignmentEventAllocation"("internalMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentEventAllocation_eventId_shipmentAllocationId_key" ON "ConsignmentEventAllocation"("eventId", "shipmentAllocationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentSale_saleId_key" ON "ConsignmentSale"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentSale_replacesId_key" ON "ConsignmentSale"("replacesId");

-- CreateIndex
CREATE INDEX "ConsignmentSale_partnerId_effectiveDate_idx" ON "ConsignmentSale"("partnerId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentSale_partnerId_reference_key" ON "ConsignmentSale"("partnerId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentSaleLine_consignmentSaleId_productId_key" ON "ConsignmentSaleLine"("consignmentSaleId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentSaleAllocation_lineId_shipmentAllocationId_key" ON "ConsignmentSaleAllocation"("lineId", "shipmentAllocationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentFinancialLink_entryId_key" ON "ConsignmentFinancialLink"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentFinancialLink_consignmentSaleId_role_key" ON "ConsignmentFinancialLink"("consignmentSaleId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentStatement_sequence_key" ON "ConsignmentStatement"("sequence");

-- CreateIndex
CREATE INDEX "ConsignmentStatement_partnerId_competence_idx" ON "ConsignmentStatement"("partnerId", "competence");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentStatementLine_statementId_consignmentSaleId_key" ON "ConsignmentStatementLine"("statementId", "consignmentSaleId");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProductCondition" ADD CONSTRAINT "PartnerProductCondition_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProductCondition" ADD CONSTRAINT "PartnerProductCondition_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentShipment" ADD CONSTRAINT "ConsignmentShipment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentShipmentLine" ADD CONSTRAINT "ConsignmentShipmentLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ConsignmentShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentShipmentLine" ADD CONSTRAINT "ConsignmentShipmentLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentShipmentAllocation" ADD CONSTRAINT "ConsignmentShipmentAllocation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ConsignmentShipmentLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentShipmentAllocation" ADD CONSTRAINT "ConsignmentShipmentAllocation_originId_fkey" FOREIGN KEY ("originId") REFERENCES "FinishedOrigin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentEvent" ADD CONSTRAINT "ConsignmentEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentEvent" ADD CONSTRAINT "ConsignmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ConsignmentShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentEvent" ADD CONSTRAINT "ConsignmentEvent_consignmentSaleId_fkey" FOREIGN KEY ("consignmentSaleId") REFERENCES "ConsignmentSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentEvent" ADD CONSTRAINT "ConsignmentEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ConsignmentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentEventAllocation" ADD CONSTRAINT "ConsignmentEventAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ConsignmentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentEventAllocation" ADD CONSTRAINT "ConsignmentEventAllocation_shipmentAllocationId_fkey" FOREIGN KEY ("shipmentAllocationId") REFERENCES "ConsignmentShipmentAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentEventAllocation" ADD CONSTRAINT "ConsignmentEventAllocation_internalMovementId_fkey" FOREIGN KEY ("internalMovementId") REFERENCES "FinishedMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentSale" ADD CONSTRAINT "ConsignmentSale_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentSale" ADD CONSTRAINT "ConsignmentSale_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentSale" ADD CONSTRAINT "ConsignmentSale_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "ConsignmentSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentSaleLine" ADD CONSTRAINT "ConsignmentSaleLine_consignmentSaleId_fkey" FOREIGN KEY ("consignmentSaleId") REFERENCES "ConsignmentSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentSaleLine" ADD CONSTRAINT "ConsignmentSaleLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentSaleAllocation" ADD CONSTRAINT "ConsignmentSaleAllocation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ConsignmentSaleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentSaleAllocation" ADD CONSTRAINT "ConsignmentSaleAllocation_shipmentAllocationId_fkey" FOREIGN KEY ("shipmentAllocationId") REFERENCES "ConsignmentShipmentAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentFinancialLink" ADD CONSTRAINT "ConsignmentFinancialLink_consignmentSaleId_fkey" FOREIGN KEY ("consignmentSaleId") REFERENCES "ConsignmentSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentFinancialLink" ADD CONSTRAINT "ConsignmentFinancialLink_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentStatement" ADD CONSTRAINT "ConsignmentStatement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentStatementLine" ADD CONSTRAINT "ConsignmentStatementLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "ConsignmentStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsignmentStatementLine" ADD CONSTRAINT "ConsignmentStatementLine_consignmentSaleId_fkey" FOREIGN KEY ("consignmentSaleId") REFERENCES "ConsignmentSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Guards for cross-command invariants.
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_fulfillment_check";
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_fulfillment_check" CHECK ("fulfillmentMode" IN ('LEGACY','U3','CONSIGNMENT'));
ALTER TABLE "FinishedMovement" DROP CONSTRAINT "FinishedMovement_sign_check";
ALTER TABLE "FinishedMovement" ADD CONSTRAINT "FinishedMovement_sign_check" CHECK (
  (kind IN ('PRODUCTION','OPENING','LEGACY','ADJUSTMENT_IN','UNDO_DELIVERY') AND units >= 0)
  OR (kind IN ('DELIVERY','LOSS','ADJUSTMENT_OUT','CORRECTION','CONSIGNMENT_OUT') AND units < 0)
  OR (kind = 'CONSIGNMENT_RETURN' AND units > 0)
);
CREATE UNIQUE INDEX "ConsignmentStatementLine_active_sale_key" ON "ConsignmentStatementLine" ("consignmentSaleId") WHERE active;
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_terms_check" CHECK (percent BETWEEN 0 AND 100 AND "dueDay" BETWEEN 1 AND 28);
ALTER TABLE "PartnerProductCondition" ADD CONSTRAINT "PartnerProductCondition_terms_check" CHECK ((percent IS NULL OR percent BETWEEN 0 AND 100) AND (minimum IS NULL OR minimum >= 0));
ALTER TABLE "ConsignmentShipmentLine" ADD CONSTRAINT "ConsignmentShipmentLine_units_check" CHECK (units > 0);
ALTER TABLE "ConsignmentShipmentAllocation" ADD CONSTRAINT "ConsignmentShipmentAllocation_units_check" CHECK (units > 0);
ALTER TABLE "ConsignmentEventAllocation" ADD CONSTRAINT "ConsignmentEventAllocation_units_check" CHECK (units > 0);
ALTER TABLE "ConsignmentSaleAllocation" ADD CONSTRAINT "ConsignmentSaleAllocation_units_check" CHECK (units > 0);
ALTER TABLE "ConsignmentSaleLine" ADD CONSTRAINT "ConsignmentSaleLine_values_check" CHECK (quantity > 0 AND "unitPrice" > 0 AND percent BETWEEN 0 AND 100);
ALTER TABLE "ConsignmentSale" ADD CONSTRAINT "ConsignmentSale_dueDay_check" CHECK ("dueDay" BETWEEN 1 AND 28);
ALTER TABLE "ConsignmentFinancialLink" ADD CONSTRAINT "ConsignmentFinancialLink_role_check" CHECK (role IN ('REPASSE','COMISSAO'));
ALTER TABLE "ConsignmentEvent" ADD CONSTRAINT "ConsignmentEvent_stages_check" CHECK (("fromStage" IS NULL OR "fromStage" IN ('outbound','partner','inbound','sold','lost')) AND ("toStage" IS NULL OR "toStage" IN ('outbound','partner','inbound','sold','lost')));
