CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'appointment',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "status" TEXT NOT NULL DEFAULT 'active',
    "reminderMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "route" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agendaReminders" BOOLEAN NOT NULL DEFAULT true,
    "projectDeadlines" BOOLEAN NOT NULL DEFAULT true,
    "quoteExpirations" BOOLEAN NOT NULL DEFAULT true,
    "taskDeadlines" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CalendarEvent_tenantId_startAt_status_idx" ON "CalendarEvent"("tenantId", "startAt", "status");
CREATE INDEX "CalendarEvent_tenantId_projectId_idx" ON "CalendarEvent"("tenantId", "projectId");
CREATE INDEX "CalendarEvent_tenantId_clientId_idx" ON "CalendarEvent"("tenantId", "clientId");
CREATE UNIQUE INDEX "UserNotification_userId_key_key" ON "UserNotification"("userId", "key");
CREATE INDEX "UserNotification_tenantId_userId_archivedAt_createdAt_idx" ON "UserNotification"("tenantId", "userId", "archivedAt", "createdAt");
CREATE INDEX "UserNotification_tenantId_userId_readAt_idx" ON "UserNotification"("tenantId", "userId", "readAt");
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX "NotificationPreference_tenantId_userId_idx" ON "NotificationPreference"("tenantId", "userId");
