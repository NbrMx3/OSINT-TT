import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import apiRoutes from "./routes";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
