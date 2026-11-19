-- Investigation lifecycle and persisted asynchronous job state.
CREATE TYPE "InvestigationCategory" AS ENUM ('DOMAIN', 'IP', 'EMAIL', 'USERNAME', 'WEBSITE', 'THREAT', 'GENERAL');

CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

ALTER TABLE "Investigation" ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "category" "InvestigationCategory" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "results" JSONB,
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "selectedModules" JSONB,
ADD COLUMN "startedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TABLE "InvestigationJob" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStage" TEXT,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    CONSTRAINT "InvestigationJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvestigationJob_investigationId_status_idx" ON "InvestigationJob"("investigationId", "status");
CREATE UNIQUE INDEX "InvestigationJob_investigationId_attempt_key" ON "InvestigationJob"("investigationId", "attempt");
CREATE INDEX "Investigation_tenantId_category_idx" ON "Investigation"("tenantId", "category");
ALTER TABLE "InvestigationJob" ADD CONSTRAINT "InvestigationJob_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
