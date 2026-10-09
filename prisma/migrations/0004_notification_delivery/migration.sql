CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'accepted',
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationDelivery_providerMessageId_key" ON "NotificationDelivery"("providerMessageId");
CREATE INDEX "NotificationDelivery_businessId_channel_createdAt_idx" ON "NotificationDelivery"("businessId", "channel", "createdAt");
CREATE INDEX "NotificationDelivery_businessId_status_createdAt_idx" ON "NotificationDelivery"("businessId", "status", "createdAt");
