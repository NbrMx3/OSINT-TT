ALTER TYPE "InvestigationCategory" ADD VALUE IF NOT EXISTS 'SOCIAL';

ALTER TABLE "Evidence"
  ADD COLUMN "websiteResultId" TEXT,
  ADD COLUMN "socialResultId" TEXT;

CREATE TABLE "WebsiteIntelligenceResult" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "investigationId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "sourceReferences" JSONB,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteIntelligenceResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialIntelligenceResult" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "investigationId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "sourceReferences" JSONB,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialIntelligenceResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteIntelligenceResult_tenantId_url_idx" ON "WebsiteIntelligenceResult"("tenantId", "url");
CREATE INDEX "WebsiteIntelligenceResult_investigationId_collectedAt_idx" ON "WebsiteIntelligenceResult"("investigationId", "collectedAt");
CREATE INDEX "SocialIntelligenceResult_tenantId_username_idx" ON "SocialIntelligenceResult"("tenantId", "username");
CREATE INDEX "SocialIntelligenceResult_investigationId_collectedAt_idx" ON "SocialIntelligenceResult"("investigationId", "collectedAt");
CREATE INDEX "SocialIntelligenceResult_expiresAt_idx" ON "SocialIntelligenceResult"("expiresAt");
CREATE INDEX "Evidence_websiteResultId_idx" ON "Evidence"("websiteResultId");
CREATE INDEX "Evidence_socialResultId_idx" ON "Evidence"("socialResultId");

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_websiteResultId_fkey"
  FOREIGN KEY ("websiteResultId") REFERENCES "WebsiteIntelligenceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_socialResultId_fkey"
  FOREIGN KEY ("socialResultId") REFERENCES "SocialIntelligenceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteIntelligenceResult" ADD CONSTRAINT "WebsiteIntelligenceResult_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteIntelligenceResult" ADD CONSTRAINT "WebsiteIntelligenceResult_investigationId_fkey"
  FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialIntelligenceResult" ADD CONSTRAINT "SocialIntelligenceResult_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialIntelligenceResult" ADD CONSTRAINT "SocialIntelligenceResult_investigationId_fkey"
  FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
