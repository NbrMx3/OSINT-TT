CREATE TABLE "SavedDashboard" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "layout" JSONB NOT NULL,
  "filters" JSONB,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedDashboard_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavedDashboard_tenantId_userId_isPinned_idx" ON "SavedDashboard"("tenantId", "userId", "isPinned");
ALTER TABLE "SavedDashboard" ADD CONSTRAINT "SavedDashboard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedDashboard" ADD CONSTRAINT "SavedDashboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
