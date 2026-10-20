CREATE TABLE "Income" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Income_businessId_date_idx" ON "Income"("businessId", "date");
ALTER TABLE "Income" ADD CONSTRAINT "Income_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
