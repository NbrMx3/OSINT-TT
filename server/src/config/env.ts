import "dotenv/config";

const port = Number.parseInt(process.env.PORT ?? "5000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be a valid number between 1 and 65535");
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

const bcryptRounds = Number.parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);

if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 15");
}

const encryptionKey = process.env.ENCRYPTION_KEY;

if (!encryptionKey || !/^[a-f0-9]{64}$/i.test(encryptionKey)) {
  throw new Error("ENCRYPTION_KEY must be a 64-character hex key");
}

const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const requestTimeoutMs = Number.parseInt(process.env.REQUEST_TIMEOUT_MS ?? "15000", 10);
const retentionDays = Number.parseInt(process.env.DATA_RETENTION_DAYS ?? "30", 10);

if (!clientOrigins.length || clientOrigins.some((origin) => !/^https?:\/\/[^/]+$/i.test(origin))) {
  throw new Error("CLIENT_ORIGIN must contain one or more comma-separated HTTP(S) origins");
}

if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 120000) {
  throw new Error("REQUEST_TIMEOUT_MS must be between 1000 and 120000");
}

if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
  throw new Error("DATA_RETENTION_DAYS must be between 1 and 3650");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  clientOrigins,
  databaseUrl,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  bcryptRounds,
  encryptionKey,
  requestTimeoutMs,
  retentionDays,
};
