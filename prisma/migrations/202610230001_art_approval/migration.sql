-- CreateTable
CREATE TABLE "ArtPackage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "currentRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtRevision" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "instructions" TEXT NOT NULL DEFAULT '',
    "lines" JSONB NOT NULL,
    "manifest" JSONB,
    "manifestHash" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtLineRequirement" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sourceLineId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "packageId" TEXT,
    "configurationHash" TEXT NOT NULL,

    CONSTRAINT "ArtLineRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtFile" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "byteLength" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "preview" BYTEA,
    "previewSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtDecision" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "manifestHash" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "operationKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtAccessGrant" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtAccessSession" (
    "tokenHash" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtAccessSession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "ArtCommand" (
    "key" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtCommand_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ArtEvent" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtPackage_currentRevisionId_key" ON "ArtPackage"("currentRevisionId");

-- CreateIndex
CREATE INDEX "ArtPackage_requestId_idx" ON "ArtPackage"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtRevision_packageId_number_key" ON "ArtRevision"("packageId", "number");

-- CreateIndex
CREATE INDEX "ArtLineRequirement_packageId_idx" ON "ArtLineRequirement"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtLineRequirement_requestId_sourceLineId_key" ON "ArtLineRequirement"("requestId", "sourceLineId");

-- CreateIndex
CREATE INDEX "ArtFile_revisionId_idx" ON "ArtFile"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtDecision_revisionId_key" ON "ArtDecision"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtAccessGrant_tokenHash_key" ON "ArtAccessGrant"("tokenHash");

-- CreateIndex
CREATE INDEX "ArtAccessGrant_revisionId_idx" ON "ArtAccessGrant"("revisionId");

-- CreateIndex
CREATE INDEX "ArtAccessSession_grantId_idx" ON "ArtAccessSession"("grantId");

-- CreateIndex
CREATE INDEX "ArtEvent_revisionId_createdAt_idx" ON "ArtEvent"("revisionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ArtPackage" ADD CONSTRAINT "ArtPackage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CatalogRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtPackage" ADD CONSTRAINT "ArtPackage_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "ArtRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtRevision" ADD CONSTRAINT "ArtRevision_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ArtPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtLineRequirement" ADD CONSTRAINT "ArtLineRequirement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CatalogRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtLineRequirement" ADD CONSTRAINT "ArtLineRequirement_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ArtPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtFile" ADD CONSTRAINT "ArtFile_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ArtRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtDecision" ADD CONSTRAINT "ArtDecision_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ArtRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtAccessGrant" ADD CONSTRAINT "ArtAccessGrant_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ArtRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtAccessSession" ADD CONSTRAINT "ArtAccessSession_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "ArtAccessGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtCommand" ADD CONSTRAINT "ArtCommand_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtEvent" ADD CONSTRAINT "ArtEvent_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ArtRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
