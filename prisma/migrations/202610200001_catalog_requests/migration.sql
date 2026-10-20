CREATE TYPE "CatalogRequestState" AS ENUM ('RECEBIDA', 'EM_ATENDIMENTO', 'ORCAMENTO_PREPARADO', 'ENCERRADA');
CREATE TABLE "CatalogRequest" (
  "id" TEXT NOT NULL PRIMARY KEY, "sequence" SERIAL NOT NULL,
  "state" "CatalogRequestState" NOT NULL DEFAULT 'RECEBIDA', "version" INTEGER NOT NULL DEFAULT 1,
  "attemptHash" TEXT NOT NULL, "contentHash" TEXT NOT NULL, "name" TEXT NOT NULL,
  "preferredChannel" TEXT NOT NULL, "contact" JSONB NOT NULL, "knownTotal" DECIMAL(18,2),
  "consultCount" INTEGER NOT NULL, "assigneeId" TEXT, "quoteId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogRequest_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CatalogRequest_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CatalogRequest_sequence_key" ON "CatalogRequest"("sequence");
CREATE UNIQUE INDEX "CatalogRequest_attemptHash_key" ON "CatalogRequest"("attemptHash");
CREATE UNIQUE INDEX "CatalogRequest_quoteId_key" ON "CatalogRequest"("quoteId");
CREATE INDEX "CatalogRequest_state_createdAt_idx" ON "CatalogRequest"("state", "createdAt");
CREATE INDEX "CatalogRequest_name_idx" ON "CatalogRequest"("name");
CREATE TABLE "CatalogRequestLine" (
  "id" TEXT NOT NULL PRIMARY KEY, "requestId" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL, "quantity" INTEGER NOT NULL, "priceKind" TEXT NOT NULL,
  "unitPrice" DECIMAL(18,2), "subtotal" DECIMAL(18,2),
  CONSTRAINT "CatalogRequestLine_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CatalogRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CatalogRequestLine_requestId_position_key" ON "CatalogRequestLine"("requestId", "position");
CREATE TABLE "CatalogRequestEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "requestId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '', "actorId" TEXT, "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CatalogRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CatalogRequestEvent_requestId_createdAt_idx" ON "CatalogRequestEvent"("requestId", "createdAt");
CREATE TABLE "CatalogRequestBrowser" ("id" TEXT NOT NULL PRIMARY KEY, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "CatalogRequestBrowser_expiresAt_idx" ON "CatalogRequestBrowser"("expiresAt");
CREATE TABLE "CatalogRequestQuota" ("key" TEXT NOT NULL PRIMARY KEY, "attempts" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "CatalogRequestQuota_expiresAt_idx" ON "CatalogRequestQuota"("expiresAt");
