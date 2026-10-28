-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('CONTATO', 'LEVANTAMENTO', 'PROPOSTA', 'NEGOCIACAO', 'GANHO', 'PERDIDO');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "opportunityId" TEXT;

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'CONTATO',
    "nextAction" TEXT,
    "nextContactDate" DATE,
    "pendingNotes" TEXT NOT NULL DEFAULT '',
    "lossReason" TEXT,
    "principalQuoteId" TEXT,
    "wonSaleId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityEvent" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "authorKind" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityOperation" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityOperation_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_principalQuoteId_key" ON "Opportunity"("principalQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_wonSaleId_key" ON "Opportunity"("wonSaleId");

-- CreateIndex
CREATE INDEX "Opportunity_stage_nextContactDate_idx" ON "Opportunity"("stage", "nextContactDate");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_nextContactDate_idx" ON "Opportunity"("ownerId", "nextContactDate");

-- CreateIndex
CREATE INDEX "Opportunity_customerId_idx" ON "Opportunity"("customerId");

-- CreateIndex
CREATE INDEX "OpportunityEvent_opportunityId_createdAt_id_idx" ON "OpportunityEvent"("opportunityId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Quote_opportunityId_idx" ON "Quote"("opportunityId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_principalQuoteId_fkey" FOREIGN KEY ("principalQuoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_wonSaleId_fkey" FOREIGN KEY ("wonSaleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityEvent" ADD CONSTRAINT "OpportunityEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
