ALTER TABLE "Report"
  ADD COLUMN "template" TEXT NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "branding" JSONB,
  ADD COLUMN "executiveSummary" TEXT,
  ADD COLUMN "evidenceAppendix" JSONB;

CREATE TABLE "ReportSchedule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "investigationId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "template" TEXT NOT NULL DEFAULT 'STANDARD',
  "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "titleTemplate" TEXT,
  "branding" JSONB,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportSchedule_tenantId_enabled_nextRunAt_idx" ON "ReportSchedule"("tenantId", "enabled", "nextRunAt");
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
