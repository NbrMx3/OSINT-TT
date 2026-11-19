ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'ASN';
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'PUBLIC_PROFILE';
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'THREAT_INDICATOR';

ALTER TABLE "Relationship"
  ADD COLUMN "sourceReferences" JSONB,
  ADD COLUMN "evidenceQuality" DOUBLE PRECISION,
  ADD COLUMN "corroborationScore" DOUBLE PRECISION,
  ADD COLUMN "freshnessScore" DOUBLE PRECISION;

ALTER TABLE "Evidence" ADD COLUMN "relationshipId" TEXT;
CREATE INDEX "Evidence_relationshipId_idx" ON "Evidence"("relationshipId");
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_relationshipId_fkey"
  FOREIGN KEY ("relationshipId") REFERENCES "Relationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GraphLayout" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "investigationId" TEXT,
  "nodes" JSONB NOT NULL,
  "edges" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GraphLayout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GraphLayout_tenantId_updatedAt_idx" ON "GraphLayout"("tenantId", "updatedAt");
CREATE INDEX "GraphLayout_investigationId_idx" ON "GraphLayout"("investigationId");
ALTER TABLE "GraphLayout" ADD CONSTRAINT "GraphLayout_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GraphLayout" ADD CONSTRAINT "GraphLayout_investigationId_fkey"
  FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
