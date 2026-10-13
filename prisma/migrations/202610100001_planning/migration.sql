-- CreateEnum
CREATE TYPE "PlanningBatchState" AS ENUM ('DRAFT', 'PENDING', 'SCHEDULED', 'PREPARING', 'PRINTING', 'AWAITING_REMOVAL', 'CLOSED', 'CANCELED');

-- CreateTable
CREATE TABLE "PlanningState" (
    "id" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanningState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningCalendar" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "printerId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "weekly" JSONB NOT NULL,
    "exceptions" JSONB NOT NULL,

    CONSTRAINT "PlanningCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningMachineSettings" (
    "printerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "prepareMinutes" DECIMAL(24,6) NOT NULL,
    "removeMinutes" DECIMAL(24,6) NOT NULL,

    CONSTRAINT "PlanningMachineSettings_pkey" PRIMARY KEY ("printerId")
);

-- CreateTable
CREATE TABLE "PlanningBatch" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "printerId" TEXT NOT NULL,
    "state" "PlanningBatchState" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "materialItemId" TEXT NOT NULL,
    "colorKey" TEXT NOT NULL,
    "colorLabel" TEXT NOT NULL,
    "profileConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "fitConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "colorAvailabilityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "durationMinutes" DECIMAL(24,6),
    "durationConfirmedAt" TIMESTAMP(3),
    "estimateReference" JSONB,
    "prepareMinutes" DECIMAL(24,6) NOT NULL,
    "removeMinutes" DECIMAL(24,6) NOT NULL,
    "remainingMinutes" DECIMAL(24,6),
    "remainingAsOf" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningParticipation" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "settledUnits" INTEGER NOT NULL DEFAULT 0,
    "needQuantity" DECIMAL(24,6) NOT NULL DEFAULT 0,

    CONSTRAINT "PlanningParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningMaterialCoverage" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "quantity" DECIMAL(24,6) NOT NULL,

    CONSTRAINT "PlanningMaterialCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningMilestone" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "instant" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT,

    CONSTRAINT "PlanningMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningReportLink" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "goodUnits" INTEGER NOT NULL,
    "failedUnits" INTEGER NOT NULL,

    CONSTRAINT "PlanningReportLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningAudit" (
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB NOT NULL,

    CONSTRAINT "PlanningAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningCommand" (
    "key" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningCommand_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanningCalendar_printerId_key" ON "PlanningCalendar"("printerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningBatch_sequence_key" ON "PlanningBatch"("sequence");

-- CreateIndex
CREATE INDEX "PlanningBatch_printerId_state_position_idx" ON "PlanningBatch"("printerId", "state", "position");

-- CreateIndex
CREATE INDEX "PlanningParticipation_lineId_idx" ON "PlanningParticipation"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningParticipation_batchId_lineId_key" ON "PlanningParticipation"("batchId", "lineId");

-- CreateIndex
CREATE INDEX "PlanningMaterialCoverage_allocationId_idx" ON "PlanningMaterialCoverage"("allocationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningMaterialCoverage_participationId_allocationId_key" ON "PlanningMaterialCoverage"("participationId", "allocationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningMilestone_sourceId_key" ON "PlanningMilestone"("sourceId");

-- CreateIndex
CREATE INDEX "PlanningMilestone_batchId_instant_idx" ON "PlanningMilestone"("batchId", "instant");

-- CreateIndex
CREATE INDEX "PlanningReportLink_eventId_idx" ON "PlanningReportLink"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningReportLink_participationId_eventId_key" ON "PlanningReportLink"("participationId", "eventId");

-- CreateIndex
CREATE INDEX "PlanningAudit_revision_idx" ON "PlanningAudit"("revision");

-- AddForeignKey
ALTER TABLE "PlanningCalendar" ADD CONSTRAINT "PlanningCalendar_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningMachineSettings" ADD CONSTRAINT "PlanningMachineSettings_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningBatch" ADD CONSTRAINT "PlanningBatch_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningBatch" ADD CONSTRAINT "PlanningBatch_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningParticipation" ADD CONSTRAINT "PlanningParticipation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PlanningBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningParticipation" ADD CONSTRAINT "PlanningParticipation_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningMaterialCoverage" ADD CONSTRAINT "PlanningMaterialCoverage_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "PlanningParticipation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningMaterialCoverage" ADD CONSTRAINT "PlanningMaterialCoverage_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "ProductionReservationAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningMilestone" ADD CONSTRAINT "PlanningMilestone_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PlanningBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningMilestone" ADD CONSTRAINT "PlanningMilestone_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PlanningMilestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningReportLink" ADD CONSTRAINT "PlanningReportLink_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "PlanningParticipation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningReportLink" ADD CONSTRAINT "PlanningReportLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ProductionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlanningState" ADD CONSTRAINT planning_singleton CHECK (id = 1 AND revision >= 0);
ALTER TABLE "PlanningCalendar" ADD CONSTRAINT planning_calendar_resource CHECK ((resource='TEAM' AND "printerId" IS NULL AND id='TEAM') OR (resource='PRINTER' AND "printerId" IS NOT NULL AND id='PRINTER:' || "printerId"));
ALTER TABLE "PlanningMachineSettings" ADD CONSTRAINT planning_settings_times CHECK ("prepareMinutes" >= 0 AND "removeMinutes" >= 0);
ALTER TABLE "PlanningBatch" ADD CONSTRAINT planning_batch_times CHECK (("durationMinutes" IS NULL OR "durationMinutes" >= 0) AND "prepareMinutes" >= 0 AND "removeMinutes" >= 0 AND ("remainingMinutes" IS NULL OR "remainingMinutes" >= 0));
ALTER TABLE "PlanningParticipation" ADD CONSTRAINT planning_piece_limits CHECK (units > 0 AND "settledUnits" >= 0 AND "settledUnits" <= units AND "needQuantity" >= 0);
ALTER TABLE "PlanningMaterialCoverage" ADD CONSTRAINT planning_coverage_positive CHECK (quantity > 0);
ALTER TABLE "PlanningReportLink" ADD CONSTRAINT planning_report_units CHECK ("goodUnits" >= 0 AND "failedUnits" >= 0 AND "goodUnits" + "failedUnits" > 0);
CREATE UNIQUE INDEX planning_occupied_machine ON "PlanningBatch" ("printerId") WHERE state IN ('PREPARING','PRINTING','AWAITING_REMOVAL');
