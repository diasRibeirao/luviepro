CREATE INDEX "Subscription_tenantId_status_startsAt_idx"
  ON "Subscription"("tenantId", "status", "startsAt");

CREATE INDEX "Subscription_createdAt_idx"
  ON "Subscription"("createdAt");

CREATE INDEX "Payment_tenantId_status_createdAt_idx"
  ON "Payment"("tenantId", "status", "createdAt");

CREATE INDEX "Payment_tenantId_plan_period_status_createdAt_idx"
  ON "Payment"("tenantId", "plan", "period", "status", "createdAt");

CREATE INDEX "Payment_createdAt_idx"
  ON "Payment"("createdAt");
