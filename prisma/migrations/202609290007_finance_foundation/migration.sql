-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "MovementKind" AS ENUM ('RECEIPT', 'PAYMENT', 'TRANSFER', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'CARD', 'BOLETO', 'TRANSFER', 'OTHER');

-- AlterTable
ALTER TABLE "FinancialEntry" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL,
    "openingDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "systemCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "kind" "MovementKind" NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "settlementId" TEXT,
    "transferId" TEXT,
    "reversalOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransfer" (
    "id" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAuditEvent" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "changes" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCommand" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceCommand_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_systemCode_key" ON "FinancialCategory"("systemCode");

-- CreateIndex
CREATE INDEX "Settlement_entryId_idx" ON "Settlement"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_settlementId_key" ON "CashMovement"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_reversalOfId_key" ON "CashMovement"("reversalOfId");

-- CreateIndex
CREATE INDEX "CashMovement_accountId_effectiveDate_idx" ON "CashMovement"("accountId", "effectiveDate");

-- CreateIndex
CREATE INDEX "CashMovement_categoryId_effectiveDate_idx" ON "CashMovement"("categoryId", "effectiveDate");

-- CreateIndex
CREATE INDEX "FinancialAuditEvent_entityType_entityId_createdAt_idx" ON "FinancialAuditEvent"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "FinancialTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransfer" ADD CONSTRAINT "FinancialTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransfer" ADD CONSTRAINT "FinancialTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve existing commercial obligations while assigning their stable category.
INSERT INTO "FinancialCategory" (id,name,kind,active,version,"systemCode","updatedAt")
VALUES ('system-sale-revenue','Receita de vendas','REVENUE',true,1,'SALE_REVENUE',CURRENT_TIMESTAMP);
UPDATE "FinancialEntry" SET "categoryId"='system-sale-revenue' WHERE "saleInstallmentId" IS NOT NULL;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_positive_amount" CHECK (amount > 0);
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_nonzero_amount" CHECK (amount <> 0);
ALTER TABLE "FinancialTransfer" ADD CONSTRAINT "FinancialTransfer_positive_distinct" CHECK (amount > 0 AND "fromAccountId" <> "toAccountId");
