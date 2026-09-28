CREATE TABLE "Product" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL,
  "paymentTerms" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "calculation" JSONB NOT NULL, "price" DECIMAL(18,2) NOT NULL,
  "materialId" TEXT, "printerId" TEXT, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Product_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Product_active_name_idx" ON "Product"("active", "name");
CREATE TABLE "ProductImage" (
  "productId" TEXT NOT NULL, "bytes" BYTEA NOT NULL, "mimeType" TEXT NOT NULL,
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("productId"),
  CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
