-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "checkoutPolicy" JSONB;

-- AlterTable
ALTER TABLE "CommerceEvent" ADD COLUMN     "authorKind" TEXT NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "checkoutId" TEXT,
ALTER COLUMN "actorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CatalogKit" ADD COLUMN     "checkoutPolicy" JSONB;

-- CreateTable
CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'REVIEW',
    "attemptHash" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "review" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "requestId" TEXT,
    "quoteId" TEXT,
    "saleId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutOffer" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "quoteVersion" INTEGER NOT NULL,
    "review" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT,
    "accessId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutAccess" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutOperation" (
    "key" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutOperation_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CheckoutEvent" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutCancellation" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutQuota" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutQuota_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_sequence_key" ON "Checkout"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_attemptHash_key" ON "Checkout"("attemptHash");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_requestId_key" ON "Checkout"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_quoteId_key" ON "Checkout"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_saleId_key" ON "Checkout"("saleId");

-- CreateIndex
CREATE INDEX "Checkout_state_createdAt_idx" ON "Checkout"("state", "createdAt");

-- CreateIndex
CREATE INDEX "CheckoutOffer_checkoutId_active_idx" ON "CheckoutOffer"("checkoutId", "active");

-- CreateIndex
CREATE INDEX "CheckoutSession_expiresAt_idx" ON "CheckoutSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutAccess_tokenHash_key" ON "CheckoutAccess"("tokenHash");

-- CreateIndex
CREATE INDEX "CheckoutEvent_checkoutId_createdAt_idx" ON "CheckoutEvent"("checkoutId", "createdAt");

-- CreateIndex
CREATE INDEX "CheckoutCancellation_checkoutId_state_idx" ON "CheckoutCancellation"("checkoutId", "state");

-- AddForeignKey
ALTER TABLE "CommerceEvent" ADD CONSTRAINT "CommerceEvent_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CatalogRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutOffer" ADD CONSTRAINT "CheckoutOffer_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "CheckoutAccess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutAccess" ADD CONSTRAINT "CheckoutAccess_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutOperation" ADD CONSTRAINT "CheckoutOperation_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutEvent" ADD CONSTRAINT "CheckoutEvent_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutCancellation" ADD CONSTRAINT "CheckoutCancellation_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommerceEvent" ADD CONSTRAINT "CommerceEvent_checkout_author_check" CHECK (
 ("authorKind"='ADMIN' AND "actorId" IS NOT NULL AND "checkoutId" IS NULL) OR
 ("authorKind"='CHECKOUT' AND "actorId" IS NULL AND "checkoutId" IS NOT NULL)
);
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_state_check" CHECK ("state" IN ('REVIEW','OFFERED','CONFIRMED','CLOSED'));
CREATE UNIQUE INDEX "CheckoutOffer_one_active" ON "CheckoutOffer" ("checkoutId") WHERE "active";
CREATE UNIQUE INDEX "CheckoutCancellation_one_pending" ON "CheckoutCancellation" ("checkoutId") WHERE "state"='PENDING';
