ALTER TABLE "Sale" ADD COLUMN "taxConfirmedAt" TIMESTAMP(3);
ALTER TABLE "PricingSnapshot" ADD COLUMN "taxEvidence" JSONB;
CREATE TABLE "TaxProfileState" ("id" INTEGER NOT NULL DEFAULT 1, "version" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "TaxProfileState_pkey" PRIMARY KEY ("id"), CONSTRAINT "TaxProfileState_singleton" CHECK ("id"=1 AND "version">=0));
CREATE TABLE "TaxProfileRevision" ("id" TEXT NOT NULL, "revision" INTEGER NOT NULL, "values" JSONB NOT NULL, "replacesId" TEXT, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TaxProfileRevision_pkey" PRIMARY KEY ("id"), CONSTRAINT "TaxProfileRevision_revision_positive" CHECK ("revision">0), CONSTRAINT "TaxProfileRevision_replaces_fkey" FOREIGN KEY ("replacesId") REFERENCES "TaxProfileRevision"("id") ON DELETE RESTRICT);
CREATE UNIQUE INDEX "TaxProfileRevision_revision_key" ON "TaxProfileRevision"("revision");
CREATE UNIQUE INDEX "TaxProfileRevision_replacesId_key" ON "TaxProfileRevision"("replacesId");
CREATE TABLE "TaxReportMemory" ("id" TEXT NOT NULL, "operationKey" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "competence" TEXT NOT NULL, "result" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TaxReportMemory_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TaxReportMemory_actorId_operationKey_key" ON "TaxReportMemory"("actorId", "operationKey");
CREATE INDEX "TaxReportMemory_competence_createdAt_idx" ON "TaxReportMemory"("competence", "createdAt");
