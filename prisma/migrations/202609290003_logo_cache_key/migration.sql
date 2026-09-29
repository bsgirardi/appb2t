ALTER TABLE "CompanyLogo" ADD COLUMN "cacheKey" TEXT;
UPDATE "CompanyLogo" SET "cacheKey" = md5(random()::text || clock_timestamp()::text);
ALTER TABLE "CompanyLogo" ALTER COLUMN "cacheKey" SET NOT NULL;
