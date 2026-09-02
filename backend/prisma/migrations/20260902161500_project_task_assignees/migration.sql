ALTER TABLE "Project" ADD COLUMN "assigneeUserId" TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN "assigneeUserId" TEXT;

ALTER TABLE "Project" ADD CONSTRAINT "Project_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Project_tenantId_assigneeUserId_status_idx" ON "Project"("tenantId", "assigneeUserId", "status");
CREATE INDEX "ProjectTask_tenantId_assigneeUserId_status_dueDate_idx" ON "ProjectTask"("tenantId", "assigneeUserId", "status", "dueDate");
