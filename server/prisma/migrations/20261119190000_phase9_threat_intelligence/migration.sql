ALTER TYPE "TargetType" ADD VALUE IF NOT EXISTS 'HASH';

ALTER TABLE "Evidence" ADD COLUMN "threatResultId" TEXT;
CREATE INDEX "Evidence_threatResultId_idx" ON "Evidence"("threatResultId");

CREATE TABLE "ThreatIntelligenceResult" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "investigationId" TEXT NOT NULL,
  "indicator" TEXT NOT NULL,
  "indicatorType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "sourceReferences" JSONB,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreatIntelligenceResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ThreatIntelligenceResult_tenantId_indicator_idx" ON "ThreatIntelligenceResult"("tenantId", "indicator");
CREATE INDEX "ThreatIntelligenceResult_tenantId_indicatorType_idx" ON "ThreatIntelligenceResult"("tenantId", "indicatorType");
CREATE INDEX "ThreatIntelligenceResult_investigationId_collectedAt_idx" ON "ThreatIntelligenceResult"("investigationId", "collectedAt");

ALTER TABLE "ThreatIntelligenceResult" ADD CONSTRAINT "ThreatIntelligenceResult_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThreatIntelligenceResult" ADD CONSTRAINT "ThreatIntelligenceResult_investigationId_fkey"
  FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_threatResultId_fkey"
  FOREIGN KEY ("threatResultId") REFERENCES "ThreatIntelligenceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
