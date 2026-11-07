CREATE TABLE "CommercialSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "replyWaitDays" INTEGER NOT NULL DEFAULT 14,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedById" TEXT NOT NULL,
  CONSTRAINT "CommercialSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialSettings_singleton" CHECK ("id" = 1),
  CONSTRAINT "CommercialSettings_replyWaitDays_range" CHECK ("replyWaitDays" BETWEEN 1 AND 365)
);
