-- Email and username investigation results are isolated by tenant and investigation.
ALTER TABLE "Evidence"
  ADD COLUMN "emailResultId" TEXT,
  ADD COLUMN "usernameResultId" TEXT;

CREATE TABLE "EmailIntelligenceResult" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "investigationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "sourceReferences" JSONB,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailIntelligenceResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsernameIntelligenceResult" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "investigationId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "sourceReferences" JSONB,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsernameIntelligenceResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailIntelligenceResult_tenantId_email_idx" ON "EmailIntelligenceResult"("tenantId", "email");
CREATE INDEX "EmailIntelligenceResult_investigationId_collectedAt_idx" ON "EmailIntelligenceResult"("investigationId", "collectedAt");
CREATE INDEX "UsernameIntelligenceResult_tenantId_username_idx" ON "UsernameIntelligenceResult"("tenantId", "username");
CREATE INDEX "UsernameIntelligenceResult_investigationId_collectedAt_idx" ON "UsernameIntelligenceResult"("investigationId", "collectedAt");
CREATE INDEX "Evidence_emailResultId_idx" ON "Evidence"("emailResultId");
CREATE INDEX "Evidence_usernameResultId_idx" ON "Evidence"("usernameResultId");

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_emailResultId_fkey"
  FOREIGN KEY ("emailResultId") REFERENCES "EmailIntelligenceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_usernameResultId_fkey"
  FOREIGN KEY ("usernameResultId") REFERENCES "UsernameIntelligenceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailIntelligenceResult" ADD CONSTRAINT "EmailIntelligenceResult_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailIntelligenceResult" ADD CONSTRAINT "EmailIntelligenceResult_investigationId_fkey"
  FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsernameIntelligenceResult" ADD CONSTRAINT "UsernameIntelligenceResult_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsernameIntelligenceResult" ADD CONSTRAINT "UsernameIntelligenceResult_investigationId_fkey"
  FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
