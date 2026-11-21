ALTER TABLE "ActivityLog"
  ALTER COLUMN "tenantId" DROP NOT NULL,
  ADD COLUMN "ipAddress" TEXT,
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "chainIndex" INTEGER,
  ADD COLUMN "previousHash" TEXT,
  ADD COLUMN "integrityHash" TEXT;

CREATE UNIQUE INDEX "ActivityLog_chainIndex_key" ON "ActivityLog"("chainIndex");
CREATE INDEX "ActivityLog_chainIndex_idx" ON "ActivityLog"("chainIndex");
