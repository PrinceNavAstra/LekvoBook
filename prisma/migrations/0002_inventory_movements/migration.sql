-- Stock is calculated from movement records (opening stock + movements).
CREATE TYPE "MovementType" AS ENUM ('PURCHASE','SALE','RETURN','ADJUSTMENT');

CREATE TABLE "InventoryMovement" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "MovementType" NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE INDEX "InventoryMovement_businessId_productId_idx" ON "InventoryMovement"("businessId","productId");
CREATE INDEX "Product_businessId_idx" ON "Product"("businessId");
