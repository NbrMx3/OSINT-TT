import app from "./app";
import { verifyDatabaseConnection } from "./config/database";
import { env } from "./config/env";

async function startServer(): Promise<void> {
  await verifyDatabaseConnection();
  app.listen(env.port, () => {
    console.log(`OSINT-X API running at http://localhost:${env.port}`);
    console.log("PostgreSQL connection verified");
  });
}

startServer().catch((error: unknown) => {
  console.error("Unable to start OSINT-X API", error);
  process.exitCode = 1;
});
