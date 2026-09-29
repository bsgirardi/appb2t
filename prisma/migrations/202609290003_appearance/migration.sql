-- CreateTable
CREATE TABLE "CompanyAppearance" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slogan" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "footer" TEXT NOT NULL,
    "lightPrimary" TEXT NOT NULL,
    "lightAccent" TEXT NOT NULL,
    "darkPrimary" TEXT NOT NULL,
    "darkAccent" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "CompanyAppearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyLogo" (
    "appearanceId" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,

    CONSTRAINT "CompanyLogo_pkey" PRIMARY KEY ("appearanceId")
);

-- AddForeignKey
ALTER TABLE "CompanyLogo" ADD CONSTRAINT "CompanyLogo_appearanceId_fkey" FOREIGN KEY ("appearanceId") REFERENCES "CompanyAppearance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
