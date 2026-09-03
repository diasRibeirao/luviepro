ALTER TABLE "UserNotification" ADD COLUMN "emailSentAt" TIMESTAMP(3);
CREATE INDEX "UserNotification_tenantId_userId_emailSentAt_idx" ON "UserNotification"("tenantId", "userId", "emailSentAt");
