ALTER TABLE "Evidence" ADD COLUMN "investigationId" TEXT;
ALTER TABLE "Evidence" ADD COLUMN "screenshots" JSONB;
ALTER TABLE "Evidence" ADD COLUMN "attachments" JSONB;
ALTER TABLE "Evidence" ADD COLUMN "provenance" JSONB;
ALTER TABLE "Evidence" ADD COLUMN "chainOfCustody" JSONB;

CREATE INDEX "Evidence_investigationId_idx" ON "Evidence"("investigationId");
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_investigationId_fkey"
  FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
