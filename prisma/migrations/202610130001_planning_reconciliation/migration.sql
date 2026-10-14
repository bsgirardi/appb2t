ALTER TABLE "PlanningParticipation" ADD COLUMN "releasedUnits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlanningParticipation" ADD CONSTRAINT planning_released_units CHECK ("releasedUnits" >= 0 AND "releasedUnits" + "settledUnits" <= units);
ALTER TABLE "PlanningMaterialCoverage" ADD COLUMN "releasedQuantity" DECIMAL(24,6) NOT NULL DEFAULT 0;
ALTER TABLE "PlanningMaterialCoverage" ADD CONSTRAINT planning_released_material CHECK ("releasedQuantity" >= 0 AND "releasedQuantity" <= quantity);
ALTER TABLE "PlanningReportLink" DROP CONSTRAINT planning_report_units;
ALTER TABLE "PlanningReportLink" ADD CONSTRAINT planning_report_units CHECK ("goodUnits" >= 0 AND "failedUnits" >= 0);
