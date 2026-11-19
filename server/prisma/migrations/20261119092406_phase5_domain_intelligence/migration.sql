-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "domainResultId" TEXT;

-- CreateTable
CREATE TABLE "DomainIntelligenceResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sourceReferences" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainIntelligenceResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainIntelligenceResult_tenantId_domain_idx" ON "DomainIntelligenceResult"("tenantId", "domain");

-- CreateIndex
CREATE INDEX "DomainIntelligenceResult_investigationId_collectedAt_idx" ON "DomainIntelligenceResult"("investigationId", "collectedAt");

-- CreateIndex
CREATE INDEX "Evidence_domainResultId_idx" ON "Evidence"("domainResultId");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_domainResultId_fkey" FOREIGN KEY ("domainResultId") REFERENCES "DomainIntelligenceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainIntelligenceResult" ADD CONSTRAINT "DomainIntelligenceResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainIntelligenceResult" ADD CONSTRAINT "DomainIntelligenceResult_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
