CREATE TABLE "MonthlyGoal" (
  "month" TEXT NOT NULL PRIMARY KEY,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "values" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonthlyGoal_month_check" CHECK ("month" ~ '^(19[0-9]{2}|[2-9][0-9]{3})-(0[1-9]|1[0-2])$')
);
CREATE TABLE "MonthlyGoalRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "month" TEXT NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "values" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonthlyGoalRevision_month_fkey" FOREIGN KEY ("month") REFERENCES "MonthlyGoal"("month") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MonthlyGoalRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MonthlyGoalRevision_month_version_key" ON "MonthlyGoalRevision"("month", "version");
