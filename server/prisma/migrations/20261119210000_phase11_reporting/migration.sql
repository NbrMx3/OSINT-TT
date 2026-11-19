ALTER TABLE "Report"
  ADD COLUMN "pdfData" BYTEA,
  ADD COLUMN "generatedAt" TIMESTAMP(3),
  ADD COLUMN "investigationDate" TIMESTAMP(3),
  ADD COLUMN "scope" JSONB,
  ADD COLUMN "searchText" TEXT;

CREATE INDEX "Report_tenantId_createdAt_idx" ON "Report"("tenantId", "createdAt");
