-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN "ipResultId" TEXT;

-- CreateTable
CREATE TABLE "IpIntelligenceResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sourceReferences" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpIntelligenceResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IpIntelligenceResult_tenantId_ip_idx" ON "IpIntelligenceResult"("tenantId", "ip");

-- CreateIndex
CREATE INDEX "IpIntelligenceResult_investigationId_collectedAt_idx" ON "IpIntelligenceResult"("investigationId", "collectedAt");

-- CreateIndex
CREATE INDEX "Evidence_ipResultId_idx" ON "Evidence"("ipResultId");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_ipResultId_fkey" FOREIGN KEY ("ipResultId") REFERENCES "IpIntelligenceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpIntelligenceResult" ADD CONSTRAINT "IpIntelligenceResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpIntelligenceResult" ADD CONSTRAINT "IpIntelligenceResult_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
