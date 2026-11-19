import app from "./app";
import { verifyDatabaseConnection } from "./config/database";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

async function purgeExpiredSocialResults(): Promise<void> {
  await prisma.socialIntelligenceResult.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}

async function startServer(): Promise<void> {
  await verifyDatabaseConnection();
  await purgeExpiredSocialResults();
  const retentionTimer = setInterval(() => {
    void purgeExpiredSocialResults().catch((error: unknown) => console.error("Unable to purge expired social results", error));
  }, 60 * 60 * 1000);
  retentionTimer.unref();
  app.listen(env.port, () => {
    console.log(`OSINT-X API running at http://localhost:${env.port}`);
    console.log("PostgreSQL connection verified");
  });
}

startServer().catch((error: unknown) => {
  console.error("Unable to start OSINT-X API", error);
  process.exitCode = 1;
});
