CREATE TYPE "InvestigationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Investigation"
  ADD COLUMN "priority" "InvestigationPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "deadline" TIMESTAMP(3),
  ADD COLUMN "assigneeId" TEXT;

ALTER TABLE "AnalystNote" ADD COLUMN "mentions" JSONB;

CREATE TABLE "InvestigationTask" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "investigationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" "InvestigationPriority" NOT NULL DEFAULT 'MEDIUM',
  "assigneeId" TEXT,
  "createdById" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvestigationTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvestigationTask_tenantId_investigationId_idx" ON "InvestigationTask"("tenantId", "investigationId");
CREATE INDEX "InvestigationTask_assigneeId_status_idx" ON "InvestigationTask"("assigneeId", "status");

ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvestigationTask" ADD CONSTRAINT "InvestigationTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvestigationTask" ADD CONSTRAINT "InvestigationTask_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvestigationTask" ADD CONSTRAINT "InvestigationTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvestigationTask" ADD CONSTRAINT "InvestigationTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
