-- CreateTable
CREATE TABLE "ProfitabilityState" (
    "saleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "currentRevisionId" TEXT NOT NULL,

    CONSTRAINT "ProfitabilityState_pkey" PRIMARY KEY ("saleId")
);

-- CreateTable
CREATE TABLE "ProfitabilityRevision" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "predecessorId" TEXT,
    "actorId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "ProfitabilityRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitabilityCommand" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitabilityCommand_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ProfitabilityAssessment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "factsHash" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitabilityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfitabilityState_currentRevisionId_key" ON "ProfitabilityState"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitabilityState_saleId_currentRevisionId_key" ON "ProfitabilityState"("saleId", "currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitabilityRevision_predecessorId_key" ON "ProfitabilityRevision"("predecessorId");

-- CreateIndex
CREATE INDEX "ProfitabilityRevision_saleId_createdAt_idx" ON "ProfitabilityRevision"("saleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitabilityRevision_saleId_version_key" ON "ProfitabilityRevision"("saleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitabilityRevision_saleId_id_key" ON "ProfitabilityRevision"("saleId", "id");

-- CreateIndex
CREATE INDEX "ProfitabilityAssessment_saleId_createdAt_idx" ON "ProfitabilityAssessment"("saleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitabilityAssessment_saleId_engineVersion_factsHash_key" ON "ProfitabilityAssessment"("saleId", "engineVersion", "factsHash");

-- AddForeignKey
ALTER TABLE "ProfitabilityState" ADD CONSTRAINT "ProfitabilityState_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitabilityState" ADD CONSTRAINT "ProfitabilityState_saleId_currentRevisionId_fkey" FOREIGN KEY ("saleId", "currentRevisionId") REFERENCES "ProfitabilityRevision"("saleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitabilityRevision" ADD CONSTRAINT "ProfitabilityRevision_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitabilityRevision" ADD CONSTRAINT "ProfitabilityRevision_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ProfitabilityRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitabilityRevision" ADD CONSTRAINT "ProfitabilityRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitabilityCommand" ADD CONSTRAINT "ProfitabilityCommand_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitabilityAssessment" ADD CONSTRAINT "ProfitabilityAssessment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitabilityAssessment" ADD CONSTRAINT "ProfitabilityAssessment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
