import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import apiRoutes from "./routes";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.nodeEnv === "production" ? 1 : false);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed"));
  },
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: "draft-8", legacyHeaders: false }));
app.use((request, response, next) => {
  request.setTimeout(env.requestTimeoutMs);
  response.setTimeout(env.requestTimeoutMs);
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
